"""app.py — EduRAG AI backend with JWT authentication and role-based access control.

Authentication flow
-------------------
1.  POST /api/auth/login  →  returns { token, account } on success
2.  Every subsequent request must include:
        Authorization: Bearer <token>
3.  Missing / invalid / expired token  →  401 Unauthorized
4.  Role violation  →  403 Forbidden

RBAC summary
------------
student : own profile, own materials, materials from enrolled courses
"""

from __future__ import annotations

import json
import os
import hashlib
import uuid
import threading
import base64
from datetime import datetime, timezone
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs

from rag_service import (
    extract_text_from_bytes,
    _build_material_record,
    _validate_extracted_pages,
    chunk_pages,
    extractive_answer,
    retrieve,
    warm_up_embeddings,
)

# Auth module
from auth import (
    AuthError,
    generate_token,
    verify_token,
    extract_token_payload,
    filter_courses_for_role,
    filter_materials_for_role,
    get_enrolled_course_ids,
    enroll_student,
    unenroll_student,
    list_enrollments,
    _material_matches_student,
)

try:
    from pymongo import MongoClient
except ImportError:
    MongoClient = None

try:
    from studybuddy import StudyBuddy
except ImportError:
    StudyBuddy = None

HOST = "0.0.0.0"
PORT = 8000

# ---------------------------------------------------------------------------
# .env loader
# ---------------------------------------------------------------------------

def load_env_file(path: str = ".env") -> None:
    if not os.path.exists(path):
        return
    with open(path, encoding="utf-8") as env_file:
        for raw_line in env_file:
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            os.environ.setdefault(key, value)


load_env_file()
load_env_file("backend/.env")

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
MONGODB_DB_NAME = os.getenv("MONGODB_DB_NAME", "EduRAG_AI_DB")


def sanitize_mongodb_db_name(name: str) -> str:
    sanitized = name.strip()
    for invalid_char in (" ", "/", "\\", ".", '"', "$", "\x00"):
        sanitized = sanitized.replace(invalid_char, "_")
    return sanitized or "EduRAG_AI_DB"


MONGODB_DB_NAME = sanitize_mongodb_db_name(MONGODB_DB_NAME)

if MONGODB_DB_NAME != os.getenv("MONGODB_DB_NAME", "EduRAG_AI_DB"):
    print(
        "MongoDB database name contained invalid characters; using "
        f"{MONGODB_DB_NAME} instead."
    )

# ---------------------------------------------------------------------------
# MongoDB connection
# ---------------------------------------------------------------------------

def connect_mongodb():
    if MongoClient is None:
        print("pymongo is not installed; running with in-memory fallback data.")
        return None
    try:
        client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=3000)
        client.admin.command("ping")
        print(f"MongoDB connected successfully: {MONGODB_DB_NAME}")
        print(f"MongoDB URI: {MONGODB_URI}")
        return client
    except Exception as exc:
        print(f"MongoDB connection failed, using fallback data: {exc}")
        return None


mongo_client = connect_mongodb()
mongo_db = mongo_client[MONGODB_DB_NAME] if mongo_client else None

# ---------------------------------------------------------------------------
# StudyBuddy AI
# ---------------------------------------------------------------------------

study_buddy = None
if StudyBuddy is not None:
    try:
        study_buddy = StudyBuddy()
        print("[AI] StudyBuddy initialized successfully.")
    except Exception as exc:
        print(f"[AI] StudyBuddy initialization failed: {exc}")

# ---------------------------------------------------------------------------
# In-memory fallback store
# ---------------------------------------------------------------------------

common_stats = {
    "topics": {
        "strong": ["Graph Theory", "Sorting Algorithms", "Discrete Mathematics", "Recursion"],
        "weak": ["Process Scheduling", "Normalization (BCNF)", "TCP/IP Layering", "Gradient Descent"],
    },
    "aiUsageStats": {
        "totalQueries": 142,
        "notesGenerated": 18,
        "quizzesGenerated": 6,
        "weeklyQueries": [
            {"day": "Mon", "count": 12},
            {"day": "Tue", "count": 18},
            {"day": "Wed", "count": 9},
            {"day": "Thu", "count": 22},
            {"day": "Fri", "count": 15},
            {"day": "Sat", "count": 28},
            {"day": "Sun", "count": 11},
        ],
    },
    "weeklyStudyData": [
        {"day": "Mon", "hours": 3.5}, {"day": "Tue", "hours": 4.2}, {"day": "Wed", "hours": 2.8},
        {"day": "Thu", "hours": 5.1}, {"day": "Fri", "hours": 3.9}, {"day": "Sat", "hours": 6.2}, {"day": "Sun", "hours": 4.5},
    ],
    "quizScoreData": [
        {"quiz": "Graph Alg", "score": 85}, {"quiz": "DBMS Norm", "score": 72},
        {"quiz": "Disc Math", "score": 92}, {"quiz": "OS Basics", "score": 68},
        {"quiz": "Net Intro", "score": 78}, {"quiz": "ML Found", "score": 81},
    ],
}

demo_accounts: list[dict] = []

memory_store: dict = {
    "students": [],
    "courses": [],
    "quizzes": [],
    "materials": [],
    "rag_chunks": [],
    "profiles": [],
    "stats": [dict(common_stats, name="common")],
    "accounts": [],
    "chat_history": [],
    "enrollments": [],
    "notifications": [],
    "announcements": [],
    "calendar_events": [],
    "messages": [],
    "bookmarks": [],
    "notes": [],
    "recent_activity": [],
    "quiz_questions": [],
    "quiz_results": [],
}

# ---------------------------------------------------------------------------
# Password hashing
# ---------------------------------------------------------------------------

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()

# ---------------------------------------------------------------------------
# MongoDB seed
# ---------------------------------------------------------------------------

def seed_mongodb_if_needed() -> None:
    if mongo_db is None:
        return
    try:
        if demo_accounts and mongo_db["users"].count_documents({}) == 0:
            for acc in demo_accounts:
                hashed = hash_password(acc["password"])
                user_doc = {
                    "email": acc["email"].strip().lower(),
                    "name": acc["name"],
                    "role": acc["role"],
                    "password": hashed,
                }
                mongo_db["users"].insert_one(user_doc)
                db_user = mongo_db["users"].find_one({"email": acc["email"].strip().lower()})
                user_id = str(db_user["_id"])
                mongo_db["users"].update_one({"_id": db_user["_id"]}, {"$set": {"userId": user_id}})
            print("[MongoDB Seed] Initialized 'users' collection with hashed passwords.")

        if mongo_db["stats"].count_documents({}) == 0:
            mongo_db["stats"].insert_one(dict(common_stats, name="common"))
            print("[MongoDB Seed] Initialized 'stats' collection.")

        if demo_accounts and mongo_db["accounts"].count_documents({}) == 0:
            mongo_db["accounts"].insert_many([dict(a) for a in demo_accounts])
            for acc in demo_accounts:
                sync_profile_for_account(acc)
            print("[MongoDB Seed] Initialized 'accounts' collection.")

        seed_collection(mongo_db, "notifications", [
            {"id": "n1", "title": "Welcome to EduRAG", "message": "Your AI study assistant is ready.", "time": "Just now", "type": "ai", "read": False, "userId": "all"},
            {"id": "n2", "title": "Course Material Updated", "message": "New notes uploaded for CS501.", "time": "1 hour ago", "type": "announcement", "read": False, "userId": "all"},
            {"id": "n3", "title": "Quiz Reminder", "message": "DBMS Quiz due tomorrow.", "time": "3 hours ago", "type": "quiz", "read": False, "userId": "all"},
        ])
        seed_collection(mongo_db, "announcements", [
            {"id": "an1", "title": "Mid-Semester Exam Schedule", "body": "Exams from Sep 5-12.", "author": "EduRAG Admin", "audience": "All", "date": "Aug 3, 2026", "status": "sent"},
            {"id": "an2", "title": "AI Workshop on RAG", "body": "Workshop this Saturday 10AM-1PM.", "author": "Dr. Priya Nair", "audience": "CS Students", "date": "Aug 2, 2026", "status": "sent"},
        ])
        seed_collection(mongo_db, "calendar_events", [
            {"id": "ce1", "title": "DBMS Quiz", "date": "Aug 7", "type": "quiz", "time": "2:00 PM"},
            {"id": "ce2", "title": "Mid-Sem Exam Begins", "date": "Sep 5", "type": "exam", "time": "9:00 AM"},
            {"id": "ce3", "title": "AI Workshop", "date": "Aug 9", "type": "event", "time": "10:00 AM"},
        ])
        seed_collection(mongo_db, "messages", [
            {"id": "msg1", "from": "Dr. Priya Nair", "subject": "Assignment deadline", "preview": "Submit by Friday.", "time": "1 hour ago", "unread": True, "course": "CS501"},
            {"id": "msg2", "from": "Prof. Meera Iyer", "subject": "Lab rescheduled", "preview": "Lab moved to Thursday.", "time": "4 hours ago", "unread": True, "course": "CS503"},
        ])
        seed_collection(mongo_db, "bookmarks", [
            {"id": "b1", "type": "answer", "title": "BFS vs DFS", "detail": "AI Chat · CS501", "time": "2d ago", "userId": "all"},
            {"id": "b2", "type": "note", "title": "Normalization Summary", "detail": "Notes · CS503", "time": "5d ago", "userId": "all"},
        ])
        seed_collection(mongo_db, "recent_activity", [
            {"id": "ra1", "action": "Completed Quiz", "detail": "Graph Algorithms Quiz — 85%", "time": "2 hours ago", "icon": "quiz", "userId": "all"},
            {"id": "ra2", "action": "AI Chat Session", "detail": "Asked 4 questions on Graphs", "time": "5 hours ago", "icon": "ai", "userId": "all"},
            {"id": "ra3", "action": "Generated Notes", "detail": "Chapter Summary for OS", "time": "Yesterday", "icon": "notes", "userId": "all"},
        ])
        seed_collection(mongo_db, "quiz_questions", [
            {"id": "qq1", "question": "BFS time complexity?", "options": ["O(V)", "O(V+E)", "O(V*E)", "O(V^2)"], "correct": 1},
            {"id": "qq2", "question": "DFS uses?", "options": ["Queue", "Stack", "Heap", "Hash"], "correct": 1},
            {"id": "qq3", "question": "Dijkstra finds?", "options": ["MST", "Shortest path", "Max flow", "Topo sort"], "correct": 1},
        ])
        seed_collection(mongo_db, "quiz_results", [
            {"id": "qr1", "quizId": "q1", "question": "BFS complexity?", "yourAnswer": "O(V+E)", "correct": True},
            {"id": "qr2", "quizId": "q1", "question": "DFS uses?", "yourAnswer": "Heap", "correct": False},
        ])
    except Exception as exc:
        print(f"[MongoDB Seed Error] {exc}")


def seed_collection(db, name: str, docs: list[dict]) -> None:
    if db is None:
        return
    try:
        if db[name].count_documents({}) == 0:
            db[name].insert_many(docs)
            print(f"[MongoDB Seed] Initialized '{name}' collection.")
    except Exception as exc:
        print(f"[MongoDB Seed Error] {name}: {exc}")


# ---------------------------------------------------------------------------
# Data helpers (load_one / load_many)
# ---------------------------------------------------------------------------

def load_one(collection_name: str, fallback: dict, query: dict | None = None) -> dict:
    if mongo_db is not None:
        try:
            document = mongo_db[collection_name].find_one(query or {}, {"_id": 0})
            if document:
                document.pop("_id", None)
                return document
            return fallback
        except Exception as exc:
            print(f"MongoDB read failed for {collection_name}: {exc}")
            return fallback

    if collection_name in memory_store:
        store_items = memory_store[collection_name]
        if query:
            for item in store_items:
                if all(item.get(k) == v for k, v in query.items()):
                    return item
        if store_items:
            return store_items[0]
    return fallback


def load_many(collection_name: str, fallback: list[dict], query: dict | None = None) -> list[dict]:
    if mongo_db is not None:
        try:
            items = list(mongo_db[collection_name].find(query or {}, {"_id": 0}))
            for item in items:
                item.pop("_id", None)
            return items
        except Exception as exc:
            print(f"MongoDB read failed for {collection_name}: {exc}")
            return fallback

    if collection_name in memory_store:
        store_items = memory_store[collection_name]
        if query:
            return [
                item for item in store_items
                if all(item.get(k) == v for k, v in query.items())
            ]
        return store_items
    return fallback


# ---------------------------------------------------------------------------
# Profile sync
# ---------------------------------------------------------------------------

def sync_profile_for_account(body: dict) -> None:
    role = body.get("role")
    email = body.get("email")
    if not role or not email:
        return

    if mongo_db is not None:
        try:
            existing_user = mongo_db["users"].find_one({"email": email.strip().lower()})
            if existing_user and existing_user.get("role") != role:
                print(f"[MongoDB] Conflict: Email '{email}' is already registered with role '{existing_user.get('role')}'")
                return
        except Exception as exc:
            print(f"[MongoDB] Unique check failed: {exc}")

    user_id = None
    plain_password = body.get("password") or ""
    hashed_pwd = hash_password(plain_password) if plain_password else ""

    user_doc: dict = {
        "email": email.strip().lower(),
        "name": body.get("name"),
        "role": role,
    }
    if hashed_pwd:
        user_doc["password"] = hashed_pwd

    if mongo_db is not None:
        try:
            mongo_db["users"].update_one({"email": email.strip().lower()}, {"$set": user_doc}, upsert=True)
            db_user = mongo_db["users"].find_one({"email": email.strip().lower()})
            if db_user:
                user_id = str(db_user.get("_id"))
                mongo_db["users"].update_one({"email": email.strip().lower()}, {"$set": {"userId": user_id}})
        except Exception as exc:
            print(f"[MongoDB] Users collection sync failed: {exc}")

    if not user_id:
        user_id = f"usr_{email.replace('@', '_').replace('.', '_')}"

    profile_body: dict = {
        "userId": user_id,
        "name": body.get("name"),
        "email": email,
        "role": role,
    }

    if role == "student":
        details = body.get("details") or {}
        try:
            sem_val = int(details.get("semester") or 5)
        except ValueError:
            sem_val = 5
        profile_body.update({
            "id": details.get("rollNo") or "STU-NEW",
            "program": f"B.Tech {details.get('branch') or 'CS'}",
            "semester": sem_val,
            "year": details.get("classYear") or "3rd Year",
            "avatar": None,
            "joinedAt": body.get("createdAt", "").split("T")[0] if body.get("createdAt") else "2026-08-08",
            "goalToday": "Learn something new!",
            "goalProgress": 0,
            "streak": 1,
            "credits": 0,
        })
        student_record = {
            "userId": user_id,
            "id": profile_body.get("id"),
            "name": profile_body.get("name"),
            "rollNo": profile_body.get("id"),
            "course": "CS501",
            "progress": 0,
            "avgScore": 0,
            "email": email,
            "semester": profile_body.get("semester"),
        }
        if mongo_db is not None:
            try:
                mongo_db["students"].update_one({"userId": user_id}, {"$set": student_record}, upsert=True)
                print(f"[MongoDB] Synced student record for '{email}' linked to userId '{user_id}'")
            except Exception as exc:
                print(f"[MongoDB] Student sync failed: {exc}")
        _upsert_memory(memory_store, "students", student_record, user_id, email)

    if mongo_db is not None:
        try:
            mongo_db["profiles"].update_one({"email": email, "role": role}, {"$set": profile_body}, upsert=True)
            print(f"[MongoDB] Synced profile for '{email}' ({role}) to 'profiles' collection")
        except Exception as exc:
            print(f"[MongoDB] Profile sync failed: {exc}")

    if "profiles" in memory_store:
        updated = False
        for idx, item in enumerate(memory_store["profiles"]):
            if item.get("email") == email and item.get("role") == role:
                memory_store["profiles"][idx].update(profile_body)
                updated = True
                break
        if not updated:
            memory_store["profiles"].append(profile_body)


def _upsert_memory(store: dict, collection: str, record: dict, user_id: str, email: str) -> None:
    items = store.setdefault(collection, [])
    for idx, item in enumerate(items):
        if item.get("userId") == user_id or item.get("email") == email:
            items[idx].update(record)
            return
    items.append(record)


# ---------------------------------------------------------------------------
# Chat history helpers
# ---------------------------------------------------------------------------

def save_chat_conversation(body: dict) -> dict:
    conversation_id = body.get("conversationId") or str(uuid.uuid4())
    user_id = body.get("userId") or "anonymous"
    role = body.get("role") or "student"
    title = body.get("title") or "New chat"
    messages = body.get("messages") or []
    updated_at = body.get("updatedAt") or datetime.now(timezone.utc).isoformat()

    conversation = {
        "conversationId": conversation_id,
        "userId": user_id,
        "role": role,
        "title": title,
        "messages": messages,
        "updatedAt": updated_at,
    }

    if mongo_db is not None:
        try:
            mongo_db["chat_history"].update_one(
                {"conversationId": conversation_id, "userId": user_id},
                {"$set": conversation},
                upsert=True,
            )
        except Exception as exc:
            print(f"[MongoDB] Chat history save failed: {exc}")

    if "chat_history" in memory_store:
        updated = False
        for idx, item in enumerate(memory_store["chat_history"]):
            if item.get("conversationId") == conversation_id and item.get("userId") == user_id:
                memory_store["chat_history"][idx] = conversation
                updated = True
                break
        if not updated:
            memory_store["chat_history"].append(conversation)

    return conversation


def get_chat_conversations(user_id: str, role: str = "student") -> list[dict]:
    conversations = load_many("chat_history", [], {"userId": user_id, "role": role})
    seen: dict[str, dict] = {}
    for conv in conversations:
        cid = conv.get("conversationId")
        if not cid:
            continue
        existing = seen.get(cid)
        if not existing:
            seen[cid] = conv
        else:
            existing_ts = existing.get("updatedAt", "")
            current_ts = conv.get("updatedAt", "")
            if current_ts > existing_ts:
                seen[cid] = conv
    return list(seen.values())


def delete_chat_conversation(conversation_id: str, user_id: str) -> bool:
    if mongo_db is not None:
        try:
            result = mongo_db["chat_history"].delete_one(
                {"conversationId": conversation_id, "userId": user_id}
            )
            return result.deleted_count > 0
        except Exception as exc:
            print(f"[MongoDB] Chat history delete failed: {exc}")

    if "chat_history" in memory_store:
        original_len = len(memory_store["chat_history"])
        memory_store["chat_history"] = [
            item for item in memory_store["chat_history"]
            if not (item.get("conversationId") == conversation_id and item.get("userId") == user_id)
        ]
        return original_len - len(memory_store["chat_history"]) > 0
    return False


# Seed after helpers are defined
seed_mongodb_if_needed()

_fallback_seeds = {
    "notifications": [
        {"id": "n1", "title": "Welcome to EduRAG", "message": "Your AI study assistant is ready.", "time": "Just now", "type": "ai", "read": False, "userId": "all"},
        {"id": "n2", "title": "Course Material Updated", "message": "New notes for CS501.", "time": "1 hour ago", "type": "announcement", "read": False, "userId": "all"},
        {"id": "n3", "title": "Quiz Reminder", "message": "DBMS Quiz due tomorrow.", "time": "3 hours ago", "type": "quiz", "read": False, "userId": "all"},
    ],
    "announcements": [
        {"id": "an1", "title": "Mid-Semester Exam Schedule", "body": "Exams from Sep 5-12.", "author": "EduRAG Admin", "audience": "All", "date": "Aug 3, 2026", "status": "sent"},
        {"id": "an2", "title": "AI Workshop on RAG", "body": "Workshop this Saturday 10AM-1PM.", "author": "Dr. Priya Nair", "audience": "CS Students", "date": "Aug 2, 2026", "status": "sent"},
    ],
    "calendar_events": [
        {"id": "ce1", "title": "DBMS Quiz", "date": "Aug 7", "type": "quiz", "time": "2:00 PM"},
        {"id": "ce2", "title": "Mid-Sem Exam Begins", "date": "Sep 5", "type": "exam", "time": "9:00 AM"},
        {"id": "ce3", "title": "AI Workshop", "date": "Aug 9", "type": "event", "time": "10:00 AM"},
    ],
    "messages": [
        {"id": "msg1", "from": "Dr. Priya Nair", "subject": "Assignment deadline", "preview": "Submit by Friday.", "time": "1 hour ago", "unread": True, "course": "CS501"},
        {"id": "msg2", "from": "Prof. Meera Iyer", "subject": "Lab rescheduled", "preview": "Lab moved to Thursday.", "time": "4 hours ago", "unread": True, "course": "CS503"},
    ],
    "bookmarks": [
        {"id": "b1", "type": "answer", "title": "BFS vs DFS", "detail": "AI Chat · CS501", "time": "2d ago", "userId": "all"},
        {"id": "b2", "type": "note", "title": "Normalization Summary", "detail": "Notes · CS503", "time": "5d ago", "userId": "all"},
    ],
    "recent_activity": [
        {"id": "ra1", "action": "Completed Quiz", "detail": "Graph Algorithms Quiz — 85%", "time": "2 hours ago", "icon": "quiz", "userId": "all"},
        {"id": "ra2", "action": "AI Chat Session", "detail": "Asked 4 questions on Graphs", "time": "5 hours ago", "icon": "ai", "userId": "all"},
        {"id": "ra3", "action": "Generated Notes", "detail": "Chapter Summary for OS", "time": "Yesterday", "icon": "notes", "userId": "all"},
    ],
    "quiz_questions": [
        {"id": "qq1", "question": "BFS time complexity?", "options": ["O(V)", "O(V+E)", "O(V*E)", "O(V^2)"], "correct": 1},
        {"id": "qq2", "question": "DFS uses?", "options": ["Queue", "Stack", "Heap", "Hash"], "correct": 1},
        {"id": "qq3", "question": "Dijkstra finds?", "options": ["MST", "Shortest path", "Max flow", "Topo sort"], "correct": 1},
    ],
    "quiz_results": [
        {"id": "qr1", "quizId": "q1", "question": "BFS complexity?", "yourAnswer": "O(V+E)", "correct": True},
        {"id": "qr2", "quizId": "q1", "question": "DFS uses?", "yourAnswer": "Heap", "correct": False},
    ],
}

for collection_name, docs in _fallback_seeds.items():
    if collection_name not in memory_store or not memory_store[collection_name]:
        memory_store[collection_name] = [dict(d) for d in docs]


# ---------------------------------------------------------------------------
# HTTP handler
# ---------------------------------------------------------------------------

class EduRAGHandler(BaseHTTPRequestHandler):

    # ------------------------------------------------------------------
    # Low-level helpers
    # ------------------------------------------------------------------

    def _set_headers(self, status_code: int = HTTPStatus.OK) -> None:
        # NOTE: this intentionally does NOT call end_headers() so callers can append
        # Content-Length before finalising. Always close the connection explicitly so
        # strict HTTP/1.1 clients (browsers) never hang or abort on keep-alive framing.
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.send_header("Connection", "close")

    def _write_json(self, payload: object, status_code: int = HTTPStatus.OK) -> None:
        body = json.dumps(payload, ensure_ascii=False, indent=2).encode("utf-8")
        self._set_headers(status_code)
        self.send_header("Content-Length", str(len(body)))
        try:
            self.end_headers()
            self.wfile.write(body)
            self.wfile.flush()
        except (ConnectionError, BrokenPipeError):
            print(f"Client disconnected before response was sent ({self.path}).")

    def _read_json_body(self) -> dict | list | None:
        try:
            content_length = int(self.headers.get("Content-Length", 0))
            if content_length > 0:
                raw_body = self.rfile.read(content_length).decode("utf-8")
                return json.loads(raw_body)
        except Exception as exc:
            print(f"Error reading JSON body: {exc}")
        return None

    def _require_auth(self, roles: list[str] | None = None) -> dict | None:
        """Validate Authorization header.  Returns payload dict or writes error and returns None."""
        auth_header: str = self.headers.get("Authorization", "")
        try:
            payload = verify_token(auth_header)
        except AuthError as exc:
            self._write_json({"error": str(exc)}, status_code=exc.status)
            return None

        if roles and payload.get("role") not in roles:
            self._write_json(
                {"error": "Access denied: insufficient role permissions."},
                status_code=HTTPStatus.FORBIDDEN,
            )
            return None

        return payload

    def _optional_auth(self) -> dict | None:
        """Like _require_auth but never writes a response; returns the decoded payload
        or None. Lets local/demo sessions (which have no backend-issued JWT) use the
        upload and chat endpoints by falling back to the userId/role sent in the body."""
        auth_header = self.headers.get("Authorization", "")
        try:
            return verify_token(auth_header)
        except Exception:
            return None

    def _parse_multipart(self) -> dict[str, bytes | str] | None:
        """Parse multipart/form-data uploads."""
        try:
            content_type = self.headers.get("Content-Type", "")
            if not content_type.startswith("multipart/form-data"):
                return None

            boundary = None
            for part in content_type.split(";"):
                part = part.strip()
                if part.startswith("boundary="):
                    boundary = part.split("=", 1)[1].strip('"')
                    break

            if not boundary:
                return None

            content_length = int(self.headers.get("Content-Length", 0))
            if content_length == 0:
                return None

            raw_data = self.rfile.read(content_length)
            boundary_bytes = f"--{boundary}".encode()
            end_boundary = f"--{boundary}--".encode()

            parts = raw_data.split(boundary_bytes)
            fields: dict = {}

            for part in parts:
                if not part or part == b"\r\n" or part.startswith(b"--"):
                    continue
                if b"\r\n\r\n" not in part:
                    continue

                headers_section, body = part.split(b"\r\n\r\n", 1)
                body = body.rstrip(b"\r\n")
                if body.endswith(end_boundary):
                    body = body[:-len(end_boundary)].rstrip(b"\r\n")

                headers_text = headers_section.decode("utf-8", errors="replace")
                name = None
                filename = None

                for line in headers_text.split("\r\n"):
                    if line.lower().startswith("content-disposition:"):
                        if 'name="' in line:
                            name = line.split('name="')[1].split('"')[0]
                        if 'filename="' in line:
                            filename = line.split('filename="')[1].split('"')[0]

                if name:
                    if filename:
                        fields[name] = body
                        fields[f"{name}_filename"] = filename
                    else:
                        fields[name] = body.decode("utf-8", errors="replace")

            return fields if fields else None

        except Exception as exc:
            print(f"[Multipart] Parsing failed: {exc}")
            return None

    # ------------------------------------------------------------------
    # OPTIONS (CORS pre-flight)
    # ------------------------------------------------------------------

    def do_OPTIONS(self) -> None:
        self._set_headers(HTTPStatus.NO_CONTENT)
        self.send_header("Content-Length", "0")
        self.end_headers()

    # ------------------------------------------------------------------
    # GET
    # ------------------------------------------------------------------

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        path = parsed.path.rstrip("/") or "/"
        query_params = parse_qs(parsed.query)

        # ---- public endpoints (no auth required) ----
        if path in ("/", "/api", "/api/health"):
            self._write_json(self._public_route(path))
            return

        # ---- auth accounts (public read) ----
        if path == "/api/auth":
            accounts = load_many("accounts", [])
            self._write_json(accounts)
            return

        # ---- chat history ----
        if path == "/api/chat/history":
            payload = self._optional_auth()
            token_uid = payload.get("sub", "") if payload else ""
            role = payload.get("role", "") if payload else ""
            req_uid = query_params.get("userId", [token_uid or ""])[0] or token_uid
            if role == "student" and token_uid and req_uid != token_uid:
                self._write_json({"error": "Access denied."}, status_code=HTTPStatus.FORBIDDEN)
                return
            conversations = get_chat_conversations(req_uid, role)
            self._write_json({"success": True, "conversations": conversations})
            return

        # ---- single chat conversation ----
        if path.startswith("/api/chat/history/") and path.count("/") >= 4:
            payload = self._optional_auth()
            uid = payload.get("sub", "") if payload else ""
            role = payload.get("role", "") if payload else ""
            conversation_id = path.rsplit("/", 1)[-1]
            convs = get_chat_conversations(uid, role) if uid else []
            conv = next((c for c in convs if c.get("conversationId") == conversation_id), None)
            self._write_json({"success": True, "conversation": conv})
            return

        # ---- profile endpoints ----
        if path.startswith("/api/profile"):
            payload = self._require_auth()
            if payload is None:
                return
            user_id = payload.get("sub", "")
            profile = load_one("profiles", {}, {"role": "student", "userId": user_id})
            self._write_json(profile)
            return

        # ---- courses ----
        if path in ("/api/courses/student", "/api/courses"):
            payload = self._require_auth()
            if payload is None:
                return
            user_id = payload.get("sub", "")
            # Load all courses
            all_courses = load_many("courses", [])
            enrolled_ids = get_enrolled_course_ids(user_id, mongo_db, memory_store)
            filtered = filter_courses_for_role(all_courses, payload, enrolled_ids)
            self._write_json(filtered)
            return

        # ---- materials ----
        if path == "/api/materials":
            # Optional auth: a real JWT is preferred, but local/demo sessions have no
            # backend JWT, so fall back to the userId/role supplied as query params
            # (mirrors the existing /api/chat/history behaviour).
            payload = self._optional_auth()
            user_id = (payload.get("sub") if payload else "") or query_params.get("userId", [""])[0] or ""
            role = (payload.get("role") if payload else "") or query_params.get("role", [""])[0] or ""
            all_materials = load_many("materials", [])
            if role == "student":
                enrolled_ids = get_enrolled_course_ids(user_id, mongo_db, memory_store)
                filtered = filter_materials_for_role(all_materials, {"sub": user_id, "role": role}, enrolled_ids)
            else:
                # No identity (demo / public view) — return everything.
                filtered = all_materials
            self._write_json(filtered)
            return

        # ---- material preview/download ----
        if path.startswith("/api/materials/download"):
            # Demo/local sessions do not always have a JWT. Material visibility is
            # already filtered by the materials endpoint, so allow those sessions
            # to open the stored file as well.
            material_id = path.split("/")[-1]
            material = load_one("materials", {}, {"id": material_id})
            if not material:
                self._write_json({"error": "Material not found"}, status_code=HTTPStatus.NOT_FOUND)
                return
            file_b64 = material.get("fileBase64")
            if not file_b64:
                self._write_json({"error": "No file attached to this material"}, status_code=HTTPStatus.NOT_FOUND)
                return
            try:
                file_data = base64.b64decode(file_b64)
                content_type = "application/pdf"
                ext = (material.get("type") or "").lower()
                if ext == "ppt":
                    content_type = "application/vnd.ms-powerpoint"
                elif ext == "pptx":
                    content_type = "application/vnd.openxmlformats-officedocument.presentationml.presentation"
                elif ext == "docx":
                    content_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                elif ext == "txt":
                    content_type = "text/plain"
                elif ext == "md":
                    content_type = "text/markdown"
                elif ext == "csv":
                    content_type = "text/csv"
                self.send_response(HTTPStatus.OK)
                self.send_header("Content-Type", content_type)
                disposition = "inline" if query_params.get("inline", ["0"])[0] == "1" else "attachment"
                self.send_header("Content-Disposition", f'{disposition}; filename="{material.get("name", "download")}"')
                self.send_header("Content-Length", str(len(file_data)))
                self.end_headers()
                try:
                    self.wfile.write(file_data)
                except (ConnectionError, BrokenPipeError):
                    print(f"Client disconnected during file download ({self.path}).")
            except Exception as exc:
                print(f"[Download] Failed: {exc}")
                self._write_json({"error": "Download failed"}, status_code=HTTPStatus.INTERNAL_SERVER_ERROR)
            return

        # ---- quizzes ----
        if path == "/api/quizzes":
            payload = self._require_auth()
            if payload is None:
                return
            quizzes = load_many("quizzes", [])
            self._write_json(quizzes)
            return

        # ---- notes ----
        if path == "/api/notes":
            payload = self._require_auth()
            if payload is None:
                return
            self._write_json(load_many("notes", []))
            return

        # ---- stats ----
        if path == "/api/stats":
            payload = self._require_auth()
            if payload is None:
                return
            self._write_json(load_one("stats", {}, {"name": "common"}))
            return

        # ---- enrollments ----
        if path == "/api/enrollments":
            payload = self._require_auth()
            if payload is None:
                return
            user_id = payload.get("sub", "")
            result = list_enrollments(student_id=user_id, mongo_db=mongo_db, memory_store=memory_store)
            self._write_json(result)
            return

        # ---- notifications ----
        if path == "/api/notifications":
            payload = self._require_auth()
            if payload is None:
                return
            user_id = payload.get("sub", "")
            notifications = load_many("notifications", [])
            visible = [
                item for item in notifications
                if item.get("userId") in (None, "", "all", user_id)
            ]
            self._write_json(visible)
            return

        # ---- announcements ----
        if path == "/api/announcements":
            payload = self._require_auth()
            if payload is None:
                return
            self._write_json(load_many("announcements", []))
            return

        # ---- calendar events ----
        if path == "/api/calendar":
            payload = self._require_auth()
            if payload is None:
                return
            self._write_json(load_many("calendar_events", []))
            return

        # ---- messages ----
        if path == "/api/messages":
            payload = self._require_auth()
            if payload is None:
                return
            self._write_json(load_many("messages", []))
            return

        # ---- bookmarks ----
        if path == "/api/bookmarks":
            payload = self._require_auth()
            if payload is None:
                return
            self._write_json(load_many("bookmarks", []))
            return

        # ---- recent activity ----
        if path == "/api/activity":
            payload = self._require_auth()
            if payload is None:
                return
            self._write_json(load_many("recent_activity", []))
            return

        # ---- quiz questions ----
        if path == "/api/quiz-questions":
            payload = self._require_auth()
            if payload is None:
                return
            self._write_json(load_many("quiz_questions", []))
            return

        # ---- quiz results ----
        if path == "/api/quiz-results":
            payload = self._require_auth()
            if payload is None:
                return
            self._write_json(load_many("quiz_results", []))
            return

        # ---- fallback ----
        self._write_json({"error": "Not found", "path": path}, status_code=HTTPStatus.NOT_FOUND)

    # ------------------------------------------------------------------
    # POST
    # ------------------------------------------------------------------

    def do_POST(self) -> None:
        parsed = urlparse(self.path)
        path = parsed.path.rstrip("/") or "/"

        # ---- material upload (protected) ----
        if path == "/api/materials/upload":
            try:
                print(f"[Upload] Handling upload request, Content-Type: {self.headers.get('Content-Type', 'MISSING')}")
                multipart_data = self._parse_multipart()

                # Resolve the owner id. Prefer a verified JWT; otherwise fall back to the
                # studentId supplied in the form so local/demo sessions (which have no
                # backend token) can still upload materials.
                auth_header = self.headers.get("Authorization", "")
                token_uid = ""
                try:
                    token_payload = verify_token(auth_header)
                    token_uid = token_payload.get("sub", "") or ""
                except Exception:
                    token_uid = ""

                if multipart_data:
                    file_data = multipart_data.get("file")
                    filename = multipart_data.get("file_filename", "document.pdf")
                    student_id = token_uid or str(multipart_data.get("studentId", "") or "").strip()
                    course = multipart_data.get("course", "Personal study material")

                    if not student_id:
                        self._write_json({"error": "Missing studentId for upload."}, status_code=HTTPStatus.BAD_REQUEST)
                        return

                    if not isinstance(file_data, bytes):
                        self._write_json({"error": "File is required"}, status_code=HTTPStatus.BAD_REQUEST)
                        return

                    # Validate that the file actually contains extractable text
                    # BEFORE confirming the upload. Otherwise a scanned/image PDF
                    # would be accepted (provisional 200) yet silently fail to
                    # index, leaving the client showing a false "Ready to use!" or
                    # "not added".
                    try:
                        _preflight_pages = extract_text_from_bytes(filename, file_data)
                        _validate_extracted_pages(_preflight_pages)
                    except ValueError as exc:
                        self._write_json(
                            {"success": False, "error": str(exc)},
                            status_code=HTTPStatus.BAD_REQUEST,
                        )
                        return
                    except Exception as exc:
                        print(f"[Upload] Preflight extraction failed for {filename}: {exc}")
                        self._write_json(
                            {
                                "success": False,
                                "error": "This file could not be read. Upload a valid PDF, DOCX, PPTX, TXT, MD, or CSV.",
                            },
                            status_code=HTTPStatus.BAD_REQUEST,
                        )
                        return

                    # Respond immediately with a provisional material; do the remaining
                    # heavy work (chunking, embedding/indexing) in a background
                    # thread so the upload returns quickly.
                    # Build the material record and persist it SYNCHRONOUSLY before
                    # responding. The text was already extracted + validated in the
                    # preflight above, so we reuse those pages here instead of
                    # re-reading the file inside the background thread. Re-extracting
                    # large/scanned PDFs (which fall back to OCR) in the background
                    # after persisting was the root cause of the client's
                    # "still being indexed" error: the record only became queryable
                    # once that slow re-extraction finished, which could exceed the
                    # client's confirmation-poll window.
                    material_id = str(uuid.uuid4())
                    now = datetime.now(timezone.utc).isoformat()
                    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "pdf"
                    file_base64 = base64.b64encode(file_data).decode("utf-8")
                    material = _build_material_record(
                        filename, student_id, {"course": course}, _preflight_pages, file_base64=file_base64
                    )
                    material["id"] = material_id
                    material["uploadedBy"] = token_uid or student_id
                    material["courseId"] = multipart_data.get("courseId", "")
                    material["year"] = multipart_data.get("year", "")
                    material["department"] = multipart_data.get("department", "")
                    material["status"] = "processing"

                    # Persist immediately (in-memory + MongoDB) so /api/materials
                    # returns the document on the very first confirmation poll.
                    memory_store["materials"].append(material)
                    if mongo_db is not None:
                        try:
                            mongo_db["materials"].insert_one(dict(material))
                        except Exception as exc:
                            print(f"[MongoDB] Material insert failed: {exc}")

                    response_material = {k: v for k, v in material.items() if k != "fileBase64"}
                    self._write_json({"success": True, "material": response_material, "chunks": 0, "indexing": True})
                    print(f"[Upload] Accepted {filename} ({len(_preflight_pages)} pages) — indexing in background")

                    def background_process():
                        try:
                            # Reuse the already-extracted pages; only chunk + embed here.
                            chunks = chunk_pages(_preflight_pages, material)
                            memory_store["rag_chunks"].extend(chunks)
                            print(f"[Upload] Indexed {len(chunks)} chunks for {filename}")
                            if mongo_db is not None:
                                try:
                                    for i in range(0, len(chunks), 200):
                                        mongo_db["rag_chunks"].insert_many(chunks[i:i + 200])
                                    mongo_db["materials"].update_one(
                                        {"id": material_id}, {"$set": {"status": "ready"}}
                                    )
                                except Exception as exc:
                                    print(f"[MongoDB] Background chunk insert failed: {exc}")
                            # Mark the in-memory record as fully indexed.
                            material["status"] = "ready"
                        except Exception as exc:
                            print(f"[Upload] Background processing failed for {filename}: {exc}")

                    threading.Thread(target=background_process, daemon=True).start()
                    return

                # Fallback JSON body (base64 content)
                body = self._read_json_body()
                if not isinstance(body, dict):
                    self._write_json({"error": "Invalid upload payload"}, status_code=HTTPStatus.BAD_REQUEST)
                    return
                try:
                    filename = str(body.get("name", "")).strip()
                    student_id = str(body.get("studentId", "")).strip()
                    encoded_content = str(body.get("contentBase64", ""))
                    if not filename or not student_id or not encoded_content:
                        raise ValueError("studentId, name, and file content are required.")
                    raw = base64.b64decode(encoded_content)
                    pages = extract_text_from_bytes(filename, raw)
                    _validate_extracted_pages(pages)
                    material = _build_material_record(filename, student_id, body, pages)
                    material["uploadedBy"] = token_uid or student_id
                    material["courseId"] = body.get("courseId", "")
                    material["year"] = body.get("year", "")
                    material["department"] = body.get("department", "")
                    memory_store["materials"].append(material)
                    response_material = {k: v for k, v in material.items() if k != "fileBase64"}
                    self._write_json({"success": True, "material": response_material, "chunks": 0, "indexing": True})

                    def background_index():
                        try:
                            chunks = chunk_pages(pages, material)
                            memory_store["rag_chunks"].extend(chunks)
                            if mongo_db is not None:
                                try:
                                    mongo_db["materials"].insert_one(dict(material))
                                    for i in range(0, len(chunks), 200):
                                        mongo_db["rag_chunks"].insert_many(chunks[i:i + 200])
                                except Exception as exc:
                                    print(f"[MongoDB] Background insert failed: {exc}")
                        except Exception as exc:
                            print(f"[Upload] Background indexing failed for {filename}: {exc}")

                    threading.Thread(target=background_index, daemon=True).start()
                except ValueError as exc:
                    self._write_json({"success": False, "error": str(exc)}, status_code=HTTPStatus.BAD_REQUEST)
                except Exception as exc:
                    print(f"[RAG] Document upload failed: {exc}")
                    self._write_json({"success": False, "error": "Unable to index the uploaded document."}, status_code=HTTPStatus.INTERNAL_SERVER_ERROR)
                return
            except Exception as exc:
                print(f"[Upload] Unhandled error: {exc}")
                try:
                    self._write_json({"success": False, "error": "Upload failed due to a server error."}, status_code=HTTPStatus.INTERNAL_SERVER_ERROR)
                except Exception:
                    pass
                return

        # ---- login (public) ----
        if path == "/api/auth/login":
            body = self._read_json_body()
            if not isinstance(body, dict):
                self._write_json({"error": "Invalid login payload"}, status_code=HTTPStatus.BAD_REQUEST)
                return
            self._handle_login(body)
            return

        # ---- register / create account (public) ----
        if path == "/api/auth/register" or path == "/api/auth":
            body = self._read_json_body()
            if not body:
                self._write_json({"error": "No JSON payload provided"}, status_code=HTTPStatus.BAD_REQUEST)
                return
            self._handle_register(body)
            return

        # ---- chat history save ----
        if path == "/api/chat/history":
            payload = self._optional_auth()
            body = self._read_json_body()
            if not isinstance(body, dict):
                self._write_json({"error": "Invalid chat history payload"}, status_code=HTTPStatus.BAD_REQUEST)
                return
            # Enforce userId matches token when a token is present; else trust the body
            body["userId"] = (payload.get("sub") if payload else "") or body.get("userId", "")
            conversation = save_chat_conversation(body)
            self._write_json({"success": True, "conversation": conversation}, status_code=HTTPStatus.CREATED)
            return

        # ---- AI chat ----
        if path == "/api/chat":
            body = self._read_json_body()
            if not isinstance(body, dict):
                self._write_json({"error": "Invalid chat payload"}, status_code=HTTPStatus.BAD_REQUEST)
                return
            token_payload = self._optional_auth()
            self._handle_chat(body, token_payload)
            return

        # ---- enrollment ----
        if path == "/api/enrollments":
            payload = self._require_auth(roles=["student"])
            if payload is None:
                return
            body = self._read_json_body()
            if not isinstance(body, dict):
                self._write_json({"error": "Invalid enrollment payload"}, status_code=HTTPStatus.BAD_REQUEST)
                return
            student_id = body.get("studentId", "")
            course_id = body.get("courseId", "")
            if not student_id or not course_id:
                self._write_json({"error": "studentId and courseId are required"}, status_code=HTTPStatus.BAD_REQUEST)
                return
            # Students may only enroll themselves
            if payload.get("role") == "student" and student_id != payload.get("sub"):
                self._write_json({"error": "Students can only enroll themselves."}, status_code=HTTPStatus.FORBIDDEN)
                return
            doc = enroll_student(student_id, course_id, mongo_db, memory_store)
            self._write_json({"success": True, "enrollment": doc}, status_code=HTTPStatus.CREATED)
            return

        # ---- generic collection endpoints (protected) ----
        body = self._read_json_body()
        if not body:
            self._write_json({"error": "No JSON payload provided"}, status_code=HTTPStatus.BAD_REQUEST)
            return

        collection_name = self._collection_for_path(path)
        if not collection_name:
            self._write_json({"error": "Invalid collection endpoint"}, status_code=HTTPStatus.BAD_REQUEST)
            return

        # Require auth for generic writes
        payload = self._require_auth()
        if payload is None:
            return

        if mongo_db is not None and isinstance(body, dict):
            try:
                doc_to_insert = dict(body)
                if collection_name == "accounts" and "password" in doc_to_insert:
                    doc_to_insert["password"] = hash_password(doc_to_insert["password"])
                mongo_db[collection_name].insert_one(doc_to_insert)
                doc_to_insert.pop("_id", None)
                print(f"[MongoDB] Inserted 1 document into '{collection_name}'")
            except Exception as exc:
                print(f"[MongoDB] Insert failed for {collection_name}: {exc}")

        if collection_name in memory_store and isinstance(body, dict):
            memory_store[collection_name].append(dict(body))

        if collection_name == "accounts" and isinstance(body, dict):
            sync_profile_for_account(body)

        self._write_json({"success": True, "item": body}, status_code=HTTPStatus.CREATED)

    # ------------------------------------------------------------------
    # DELETE
    # ------------------------------------------------------------------

    def do_DELETE(self) -> None:
        parsed = urlparse(self.path)
        path = parsed.path.rstrip("/") or "/"

        # ---- enrollment deletion ----
        if path == "/api/enrollments":
            payload = self._require_auth(roles=["student"])
            if payload is None:
                return
            body = self._read_json_body() or {}
            student_id = body.get("studentId", "")
            course_id = body.get("courseId", "")
            if not student_id or not course_id:
                self._write_json({"error": "studentId and courseId are required"}, status_code=HTTPStatus.BAD_REQUEST)
                return
            if payload.get("role") == "student" and student_id != payload.get("sub"):
                self._write_json({"error": "Students can only unenroll themselves."}, status_code=HTTPStatus.FORBIDDEN)
                return
            ok = unenroll_student(student_id, course_id, mongo_db, memory_store)
            self._write_json({"success": ok})
            return

        # ---- chat history deletion (per conversation) ----
        if path.startswith("/api/chat/history/") and path.count("/") >= 4:
            payload = self._optional_auth()
            uid = (payload.get("sub") if payload else "") or ""
            if not uid:
                _body = self._read_json_body() or {}
                uid = str(_body.get("userId", "") or "")
            conversation_id = path.rsplit("/", 1)[-1]
            if not conversation_id:
                self._write_json({"error": "conversationId required"}, status_code=HTTPStatus.BAD_REQUEST)
                return
            ok = delete_chat_conversation(conversation_id, uid)
            self._write_json({"success": True, "deleted": ok})
            return

        # ---- generic delete (protected) ----
        payload = self._require_auth()
        if payload is None:
            return

        body = self._read_json_body() or {}
        ids = body.get("ids", []) if isinstance(body, dict) else []

        parts = path.split("/")
        if len(parts) >= 4 and not ids:
            ids = [parts[3]]

        collection_name = self._collection_for_path(path)
        if not collection_name:
            self._write_json({"error": "Invalid collection endpoint"}, status_code=HTTPStatus.BAD_REQUEST)
            return

        deleted_count = 0
        if mongo_db is not None and ids:
            try:
                res = mongo_db[collection_name].delete_many({
                    "$or": [
                        {"id": {"$in": ids}},
                        {"rollNo": {"$in": ids}},
                        {"code": {"$in": ids}},
                        {"email": {"$in": ids}},
                    ]
                })
                deleted_count = res.deleted_count
                print(f"[MongoDB] Deleted {deleted_count} docs from '{collection_name}'")
            except Exception as exc:
                print(f"[MongoDB] Delete failed for {collection_name}: {exc}")

        if collection_name in memory_store and ids:
            original_len = len(memory_store[collection_name])
            memory_store[collection_name] = [
                item for item in memory_store[collection_name]
                if not (item.get("id") in ids or item.get("rollNo") in ids
                        or item.get("code") in ids or item.get("email") in ids)
            ]
            if mongo_db is None:
                deleted_count = original_len - len(memory_store[collection_name])

        self._write_json({
            "success": True,
            "collection": collection_name,
            "deletedCount": deleted_count,
            "ids": ids,
        })

    # ------------------------------------------------------------------
    # PUT
    # ------------------------------------------------------------------

    def do_PUT(self) -> None:
        path = urlparse(self.path).path.rstrip("/") or "/"

        payload = self._require_auth()
        if payload is None:
            return

        body = self._read_json_body()
        if not body or not isinstance(body, dict):
            self._write_json({"error": "Invalid JSON payload"}, status_code=HTTPStatus.BAD_REQUEST)
            return

        collection_name = self._collection_for_path(path)
        if not collection_name:
            self._write_json({"error": "Invalid collection endpoint"}, status_code=HTTPStatus.BAD_REQUEST)
            return

        item_id = body.get("id") or body.get("rollNo") or body.get("code") or body.get("role")
        email = body.get("email")
        role_field = body.get("role")

        if mongo_db is not None:
            try:
                if collection_name == "accounts" and email and role_field:
                    query = {"email": email, "role": role_field}
                    mongo_db[collection_name].update_one(query, {"$set": body}, upsert=True)
                    print(f"[MongoDB] Updated account '{email}' ({role_field})")
                elif item_id:
                    query = {"$or": [{"id": item_id}, {"rollNo": item_id}, {"code": item_id}, {"role": item_id}]}
                    mongo_db[collection_name].update_one(query, {"$set": body}, upsert=True)
                    print(f"[MongoDB] Updated document '{item_id}' in '{collection_name}'")
            except Exception as exc:
                print(f"[MongoDB] Update failed for {collection_name}: {exc}")

        if collection_name in memory_store and isinstance(body, dict):
            updated = False
            for idx, item in enumerate(memory_store[collection_name]):
                is_match = False
                if collection_name == "accounts":
                    is_match = item.get("email") == email and item.get("role") == role_field
                else:
                    is_match = (
                        (item.get("id") and item.get("id") == body.get("id"))
                        or (item.get("rollNo") and item.get("rollNo") == body.get("rollNo"))
                        or (item.get("code") and item.get("code") == body.get("code"))
                        or (item.get("role") and item.get("role") == body.get("role"))
                    )
                if is_match:
                    memory_store[collection_name][idx].update(body)
                    updated = True
                    break
            if not updated:
                memory_store[collection_name].append(dict(body))

        if collection_name == "accounts" and isinstance(body, dict):
            sync_profile_for_account(body)

        self._write_json({"success": True, "item": body})

    # ------------------------------------------------------------------
    # Private route helpers
    # ------------------------------------------------------------------

    def _public_route(self, path: str) -> dict:
        if path == "/":
            return {"message": "EduRAG API is running", "docs": "/api"}
        if path == "/api/health":
            return {
                "status": "ok",
                "mongoConnected": mongo_db is not None,
                "database": MONGODB_DB_NAME,
            }
        # /api
        return {
            "message": "EduRAG API",
            "database": MONGODB_DB_NAME,
            "mongoConnected": mongo_db is not None,
            "endpoints": [
                "/api/health",
                "/api/auth/login",
                "/api/auth/register",
                "/api/profile/student",
                "/api/courses",
                "/api/courses/student",
                "/api/stats",
                "/api/materials",
                "/api/materials/upload",
                "/api/enrollments",
                "/api/chat",
                "/api/chat/history",
            ],
        }

    @staticmethod
    def _collection_for_path(path: str) -> str | None:
        mapping = {
            "/api/courses": "courses",
            "/api/students": "students",
            "/api/quizzes": "quizzes",
            "/api/quiz-questions": "quiz_questions",
            "/api/quiz-results": "quiz_results",
            "/api/notes": "notes",
            "/api/notifications": "notifications",
            "/api/materials": "materials",
            "/api/profile": "profiles",
            "/api/stats": "stats",
            "/api/auth": "accounts",
        }
        for prefix, collection in mapping.items():
            if path.startswith(prefix):
                return collection
        return None

    # ------------------------------------------------------------------
    # Business logic handlers
    # ------------------------------------------------------------------

    def _handle_login(self, body: dict) -> None:
        email = str(body.get("email", "")).strip().lower()
        password = body.get("password", "")
        # The UI sends role values selected from labels.  Normalize both sides
        # so legacy records such as "Student" continue to work with "student".
        role = str(body.get("role", "")).strip().lower()

        if not email or not password or not role:
            self._write_json(
                {"error": "email, password, and role are required."},
                status_code=HTTPStatus.BAD_REQUEST,
            )
            return

        user = None
        is_legacy_account = False
        if mongo_db is not None:
            try:
                # Older deployments persisted registrations in `accounts`, while
                # the login endpoint only searched `users`.  Look up both stores
                # and compare normalized roles to avoid rejecting valid accounts.
                user = mongo_db["users"].find_one({"email": email})
                if user and str(user.get("role", "")).strip().lower() != role:
                    user = None

                if user is None:
                    legacy_account = mongo_db["accounts"].find_one({"email": email})
                    if legacy_account and str(legacy_account.get("role", "")).strip().lower() == role:
                        user = legacy_account
                        is_legacy_account = True
            except Exception as exc:
                print(f"[MongoDB] Login lookup failed: {exc}")
        else:
            user = next(
                (a for a in memory_store.get("accounts", [])
                 if a.get("email", "").lower() == email
                 and str(a.get("role", "")).strip().lower() == role),
                None,
            )

        if not user:
            self._write_json({"error": "Invalid credentials for the selected role."}, status_code=HTTPStatus.UNAUTHORIZED)
            return

        hashed_input = hash_password(password)
        if user.get("password") not in (hashed_input, password):
            self._write_json({"error": "Invalid credentials for the selected role."}, status_code=HTTPStatus.UNAUTHORIZED)
            return

        # Repair legacy account-only records after a successful login.  This
        # keeps future logins on the canonical `users` collection and stores a
        # hash instead of retaining a plaintext legacy password.
        if mongo_db is not None and is_legacy_account:
            try:
                mongo_db["users"].update_one(
                    {"email": email},
                    {"$setOnInsert": {
                        "email": email,
                        "name": user.get("name", ""),
                        "role": role,
                        "password": hashed_input,
                    }},
                    upsert=True,
                )
                user = mongo_db["users"].find_one({"email": email}) or user
            except Exception as exc:
                print(f"[MongoDB] Legacy user migration failed: {exc}")

        # Build token with optional branch/year claims for students
        user_id = user.get("userId") or str(user.get("_id", ""))
        extra: dict = {"name": user.get("name", ""), "email": email}

        # Fetch branch and classYear for students
        if role == "student" and mongo_db is not None:
            try:
                profile = mongo_db["profiles"].find_one({"userId": user_id, "role": "student"}, {"_id": 0, "program": 1, "year": 1})
                if profile:
                    if profile.get("program"):
                        extra["program"] = profile["program"]
                    if profile.get("year"):
                        extra["year"] = profile["year"]
                user_doc = mongo_db["users"].find_one({"userId": user_id}, {"_id": 0})
                if user_doc and user_doc.get("email"):
                    acc = mongo_db["accounts"].find_one({"email": user_doc["email"], "role": "student"}, {"_id": 0, "details": 1})
                    if acc and acc.get("details") and acc["details"].get("branch"):
                        extra["branch"] = acc["details"]["branch"]
            except Exception:
                pass
        elif role == "student":
            for item in memory_store.get("profiles", []):
                if item.get("userId") == user_id and item.get("role") == "student":
                    if item.get("program"):
                        extra["program"] = item["program"]
                    if item.get("year"):
                        extra["year"] = item["year"]
                    break
            for item in memory_store.get("accounts", []):
                if item.get("userId") == user_id and item.get("role") == "student":
                    details = item.get("details") or {}
                    if details.get("branch"):
                        extra["branch"] = details["branch"]
                    break

        token = generate_token(user_id, role, extra)

        self._write_json({
            "success": True,
            "token": token,
            "account": {
                "userId": user_id,
                "role": role,
                "name": user.get("name"),
                "email": email,
            },
        })

    def _handle_register(self, body: dict) -> None:
        """Register a new user and return a JWT token on success."""
        if not isinstance(body, dict):
            self._write_json({"error": "Invalid registration payload"}, status_code=HTTPStatus.BAD_REQUEST)
            return

        email = body.get("email", "").strip().lower()
        role = body.get("role", "")
        if not email or not role:
            self._write_json({"error": "email and role are required."}, status_code=HTTPStatus.BAD_REQUEST)
            return

        # Check if email already taken
        if mongo_db is not None:
            try:
                existing = mongo_db["users"].find_one({"email": email})
                if existing:
                    self._write_json({"error": "Email is already registered."}, status_code=HTTPStatus.CONFLICT)
                    return
            except Exception as exc:
                print(f"[MongoDB] Register check failed: {exc}")
        else:
            if any(a.get("email", "").lower() == email for a in memory_store.get("accounts", [])):
                self._write_json({"error": "Email is already registered."}, status_code=HTTPStatus.CONFLICT)
                return

            # Sync the new account's profile (inserts into users + students collections)
        sync_profile_for_account(body)

        # In fallback mode there is no MongoDB users collection for login to
        # query, so retain the registration in the in-memory account store too.
        if mongo_db is None:
            existing_index = next(
                (
                    index for index, account in enumerate(memory_store["accounts"])
                    if account.get("email", "").strip().lower() == email
                    and account.get("role") == role
                ),
                None,
            )
            account_record = dict(body)
            account_record["email"] = email
            if existing_index is None:
                memory_store["accounts"].append(account_record)
            else:
                memory_store["accounts"][existing_index] = account_record

        # Retrieve the user back so we have the userId
        user_id = None
        if mongo_db is not None:
            try:
                db_user = mongo_db["users"].find_one({"email": email})
                if db_user:
                    user_id = db_user.get("userId") or str(db_user.get("_id", ""))
            except Exception:
                pass
        if not user_id:
            user_id = f"usr_{email.replace('@', '_').replace('.', '_')}"

        extra = {"name": body.get("name", ""), "email": email}
        token = generate_token(user_id, role, extra)

        self._write_json({
            "success": True,
            "token": token,
            "account": {
                "userId": user_id,
                "role": role,
                "name": body.get("name"),
                "email": email,
            },
        }, status_code=HTTPStatus.CREATED)

    def _handle_chat(self, body: dict, token_payload: dict) -> None:
        question = str(body.get("question", "")).strip()
        if not question:
            self._write_json({"error": "Question is required"}, status_code=HTTPStatus.BAD_REQUEST)
            return

        token_payload = token_payload or {}
        token_uid = token_payload.get("sub", "") or str(body.get("userId", "") or "").strip()
        role = token_payload.get("role", "") or str(body.get("role", "student") or "student").strip()

        # Filter RAG chunks to those visible to this user
        all_chunks = list(memory_store.get("rag_chunks", []))
        if mongo_db is not None:
            try:
                all_chunks.extend(mongo_db["rag_chunks"].find({}, {"_id": 0}))
            except Exception as exc:
                print(f"[RAG] Chunk lookup failed: {exc}")
        seen_chunk_ids = set()
        unique_chunks = []
        for c in all_chunks:
            cid = c.get("id")
            if cid and cid not in seen_chunk_ids:
                seen_chunk_ids.add(cid)
                unique_chunks.append(c)
        all_chunks = unique_chunks

        # For students: only retrieve chunks from materials they can see
        if role == "student":
            enrolled_ids = get_enrolled_course_ids(token_uid, mongo_db, memory_store)
            all_materials = list(memory_store.get("materials", []))
            if mongo_db is not None:
                try:
                    all_materials.extend(mongo_db["materials"].find({}, {"_id": 0}))
                except Exception as exc:
                    print(f"[Materials] Lookup failed: {exc}")
            seen_mat_ids = set()
            unique_materials = []
            for m in all_materials:
                mid = m.get("id")
                if mid and mid not in seen_mat_ids:
                    seen_mat_ids.add(mid)
                    unique_materials.append(m)
            all_materials = unique_materials

            allowed_doc_names = set()
            student_dept = token_payload.get("branch") or token_payload.get("department") or ""
            student_year = token_payload.get("classYear") or token_payload.get("year") or ""
            for m in all_materials:
                name = m.get("name") or m.get("documentName", "")
                if m.get("uploadedBy") == token_uid:
                    allowed_doc_names.add(name)
                elif enrolled_ids and m.get("courseId") in enrolled_ids:
                    allowed_doc_names.add(name)
                elif _material_matches_student(m, student_dept, student_year):
                    allowed_doc_names.add(name)
            all_chunks = [c for c in all_chunks if c.get("documentName") in allowed_doc_names]

        selected_material_ids = body.get("selectedMaterialIds", [])
        if not isinstance(selected_material_ids, list):
            selected_material_ids = []
        response_mode = str(body.get("responseMode", "materials") or "materials").strip().lower()
        if response_mode not in {"materials", "ai", "both"}:
            response_mode = "materials"

        material_name_map = {}
        try:
            raw_materials = list(memory_store.get("materials", []))
            if mongo_db is not None:
                raw_materials.extend(mongo_db["materials"].find({}, {"_id": 0}))
            seen = set()
            for m in raw_materials:
                mid = m.get("id")
                if mid and mid not in seen:
                    seen.add(mid)
                    material_name_map[mid] = m.get("name") or m.get("documentName", "")
        except Exception as exc:
            print(f"[Materials] Attachment lookup failed: {exc}")

        attachments = [
            {"id": mid, "name": material_name_map.get(mid, "")}
            for mid in selected_material_ids
            if material_name_map.get(mid)
        ]

        retrieved = retrieve(question, all_chunks, selected_material_ids)
        # Build a context string for the LLM from retrieved chunk text
        rag_context = ""
        if response_mode in {"materials", "both"} and retrieved:
            chunk_lines = []
            for item in retrieved[:8]:
                doc = item.get("documentName", "document")
                page = item.get("page", "?")
                text = str(item.get("text", ""))[:500]
                chunk_lines.append(f"[Document: {doc}, page {page}]\n{text}")
            rag_context = "\n\n---\n\n".join(chunk_lines)

        material_answer = ""
        if retrieved:
            material_answer = extractive_answer(question, retrieved)
            # Only surface Source References when the answer is actually grounded in
            # the retrieved material — not when it falls back to "couldn't find".
            grounded = material_answer.startswith("Based on your study materials")
            if grounded and response_mode == "materials":
                answer = material_answer
                sources = [
                    {"doc": item["documentName"], "page": item["page"]}
                    for item in retrieved
                ]
                # NOTE: The client (frontend) is responsible for persisting the full
                # conversation via POST /api/chat/history. Saving here with only the
                # latest two messages would overwrite the entire history on every turn,
                # so we intentionally do NOT call save_chat_conversation() here.
                self._write_json({
                    "success": True,
                    "answer": answer,
                    "sources": sources,
                    "attachments": attachments,
                    "source_type": "document",
                })
                return

        if response_mode == "materials":
            self._write_json({
                "success": True,
                "answer": material_answer or "I couldn't find this information in your uploaded study materials. Please rephrase the question or upload a more relevant document.",
                "sources": [],
                "attachments": attachments,
                "source_type": "document",
            })
            return

        # For the combined mode, return both the grounded material answer and
        # the broader AI explanation in one response.
        if study_buddy is None:
            self._write_json(
                {"error": "AI service is not available. Please try again in a few moments."},
                status_code=HTTPStatus.SERVICE_UNAVAILABLE,
            )
            return

        # Load conversation history so the LLM can understand follow-up questions
        conversation_id = body.get("conversationId")
        history_messages: list[dict] = []
        if conversation_id:
            conv_uid = token_uid or str(body.get("userId", "") or "").strip()
            try:
                prior_convs = get_chat_conversations(conv_uid, role)
                prior = next(
                    (c for c in prior_convs if c.get("conversationId") == conversation_id),
                    None,
                )
                if prior:
                    history_messages = prior.get("messages", []) or []
            except Exception as exc:
                print(f"[AI] Failed to load conversation history: {exc}")

        # Also accept history sent by the client (frontend state)
        client_history = body.get("history")
        if isinstance(client_history, list):
            history_messages = client_history

        try:
            # If RAG found relevant chunks but couldn't produce a grounded
            # extractive answer, pass the chunk text to the LLM so it can
            # still attempt to answer from the documents.
            llm_context = rag_context if rag_context else body.get("context", "")
            answer = study_buddy.ask(
                name=body.get("name", "Student"),
                branch=body.get("branch", "Computer Science"),
                sem=str(body.get("semester", "5")),
                topic=body.get("topic", "General"),
                difficulty=body.get("difficulty", "Medium"),
                question=question,
                context=llm_context,
                history=history_messages,
            )
            response = {
                "success": True,
                "answer": answer,
                "sources": [],
                "attachments": attachments,
                "source_type": "general",
            }
            if response_mode == "both":
                response["material_answer"] = material_answer
                response["ai_answer"] = answer
                response["sources"] = [
                    {"doc": item["documentName"], "page": item["page"]}
                    for item in retrieved
                ] if material_answer.startswith("Based on your study materials") else []
                response["source_type"] = "document" if response["sources"] else "general"
            self._write_json(response)
        except Exception as exc:
            print(f"[AI] Chat request failed: {exc}")
            self._write_json(
                {"success": False, "error": "AI request failed. Please try again in a moment."},
                status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            )

    def log_message(self, format: str, *args) -> None:  # noqa: A003
        return


# ---------------------------------------------------------------------------
# Server entry point
# ---------------------------------------------------------------------------

def create_server() -> ThreadingHTTPServer:
    return ThreadingHTTPServer((HOST, PORT), EduRAGHandler)


def main() -> None:
    server = create_server()
    print(f"EduRAG backend running at http://{HOST}:{PORT}")
    print(f"Using MongoDB database: {MONGODB_DB_NAME}")
    print(f"MongoDB status: {'connected' if mongo_db is not None else 'fallback mode'}")

    # Warm up the embedding model in the background so the first document
    # upload indexes quickly instead of paying the lazy model-load cost.
    threading.Thread(target=warm_up_embeddings, daemon=True).start()

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("Shutting down...")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()

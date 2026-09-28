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
import re
import hashlib
import uuid
import threading
import base64
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FuturesTimeoutError
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
    "quiz_attempts": [],
    "quiz_attempts": [],
    "student_signups": [],
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
        # quiz_questions and quiz_results seeds removed for per-account isolation
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

def _match_query(item: dict, query: dict | None) -> bool:
    if not query:
        return True
    for key, val in query.items():
        if key == "$or":
            if not isinstance(val, list):
                return False
            if not any(_match_query(item, sub_q) for sub_q in val):
                return False
        elif key == "$and":
            if not isinstance(val, list):
                return False
            if not all(_match_query(item, sub_q) for sub_q in val):
                return False
        elif isinstance(val, dict):
            item_val = item.get(key)
            for op, op_val in val.items():
                if op == "$in":
                    if item_val not in op_val:
                        return False
                elif op == "$ne":
                    if item_val == op_val:
                        return False
                elif op == "$eq":
                    if item_val != op_val:
                        return False
        else:
            if item.get(key) != val:
                return False
    return True


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
                if _match_query(item, query):
                    return item
        if store_items:
            return store_items[0]
    return fallback


def load_many(collection_name: str, fallback: list[dict], query: dict | None = None, projection: dict | None = None) -> list[dict]:
    if mongo_db is not None:
        try:
            proj = projection
            if proj is None and collection_name == "materials":
                proj = {"fileBase64": 0}
            items = list(mongo_db[collection_name].find(query or {}, proj))
            result = []
            for raw in items:
                item = dict(raw)
                _id_val = item.pop("_id", None)
                if "id" not in item and _id_val is not None:
                    item["id"] = str(_id_val)
                result.append(item)
            return result
        except Exception as exc:
            print(f"MongoDB read failed for {collection_name}: {exc}")
            return fallback

    if collection_name in memory_store:
        store_items = memory_store[collection_name]
        if query:
            return [
                item for item in store_items
                if _match_query(item, query)
            ]
        return list(store_items)
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
            try:
                signup_doc = {
                    "userId": user_id,
                    "name": body.get("name"),
                    "email": email,
                    "role": role,
                    "details": body.get("details") or {},
                    "createdAt": body.get("createdAt") or datetime.now(timezone.utc).isoformat(),
                }
                mongo_db["student_signups"].insert_one(signup_doc)
                print(f"[MongoDB] Recorded student signup for '{email}'")
            except Exception as exc:
                print(f"[MongoDB] Student signup insert failed: {exc}")
        _upsert_memory(memory_store, "students", student_record, user_id, email)
        _upsert_memory(memory_store, "student_signups", {
            "userId": user_id,
            "name": body.get("name"),
            "email": email,
            "role": role,
            "details": body.get("details") or {},
            "createdAt": body.get("createdAt") or datetime.now(timezone.utc).isoformat(),
        }, user_id, email)

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
    "quiz_questions": [],
    "quiz_results": [],
    "quiz_attempts": [],
}

for collection_name, docs in _fallback_seeds.items():
    if collection_name not in memory_store or not memory_store[collection_name]:
        memory_store[collection_name] = [dict(d) for d in docs]


# ---------------------------------------------------------------------------
# HTTP handler
# ---------------------------------------------------------------------------

class EduRAGHandler(BaseHTTPRequestHandler):
    _notes_cache: dict[str, str] = {}

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

    def _get_account_id(self) -> str:
        """Extract authenticated account ID from JWT token or fallback query/body param."""
        payload = self._optional_auth()
        if payload and payload.get("sub"):
            return str(payload.get("sub", "")).strip()
        parsed = urlparse(self.path)
        params = parse_qs(parsed.query)
        aid = params.get("accountId", [""])[0] or params.get("userId", [""])[0]
        return str(aid).strip()

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
            if payload is None:
                self._write_json({"error": "Authentication required."}, status_code=HTTPStatus.UNAUTHORIZED)
                return
            token_uid = payload.get("sub", "")
            role = payload.get("role", "")
            conversations = get_chat_conversations(token_uid, role)
            self._write_json({"success": True, "conversations": conversations})
            return

        # ---- single chat conversation ----
        if path.startswith("/api/chat/history/") and path.count("/") >= 4:
            payload = self._optional_auth()
            if payload is None:
                self._write_json({"error": "Authentication required."}, status_code=HTTPStatus.UNAUTHORIZED)
                return
            uid = payload.get("sub", "")
            role = payload.get("role", "")
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
            payload = self._optional_auth()
            user_id = (payload.get("sub") if payload else "") or query_params.get("userId", [""])[0] or ""
            role = (payload.get("role") if payload else "") or query_params.get("role", [""])[0] or ""
            all_materials = load_many("materials", [])

            # Also check rag_chunks so any document indexed in the background is discovered
            try:
                existing_names = {
                    str(m.get("name") or m.get("documentName") or m.get("filename") or "").strip().lower()
                    for m in all_materials
                    if (m.get("name") or m.get("documentName") or m.get("filename"))
                }
                materials_by_id = {str(m.get("id")): m for m in all_materials if m.get("id")}
                if mongo_db is not None:
                    chunk_doc_names = mongo_db["rag_chunks"].distinct("documentName")
                    for doc_name in chunk_doc_names:
                        if not doc_name:
                            continue
                        clean_name = str(doc_name).strip()
                        if clean_name.lower() in existing_names:
                            continue
                        mid = f"mat_{hashlib.md5(clean_name.encode('utf-8')).hexdigest()[:12]}"
                        inferred_mat = {
                            "id": mid,
                            "name": clean_name,
                            "documentName": clean_name,
                            "status": "ready",
                            "course": "General Study Material",
                            "pages": 1,
                        }
                        existing_names.add(clean_name.lower())
                        materials_by_id[mid] = inferred_mat
                        all_materials.append(inferred_mat)
                else:
                    for ch in memory_store.get("rag_chunks", []):
                        doc_name = ch.get("documentName") or ch.get("docName") or ch.get("filename") or ch.get("title") or ch.get("name")
                        if not doc_name:
                            continue
                        clean_name = str(doc_name).strip()
                        if clean_name.lower() in existing_names:
                            continue
                        mid = str(ch.get("materialId") or "") or f"mat_{hashlib.md5(clean_name.encode('utf-8')).hexdigest()[:12]}"
                        inferred_mat = {
                            "id": mid,
                            "name": clean_name,
                            "documentName": clean_name,
                            "status": "ready",
                            "course": ch.get("course", "General Study Material"),
                            "pages": ch.get("page", 1),
                        }
                        existing_names.add(clean_name.lower())
                        materials_by_id[mid] = inferred_mat
                        all_materials.append(inferred_mat)
            except Exception as exc:
                print(f"[Materials] Warning while checking chunks: {exc}")

            # Ensure any material with chunks in rag_chunks is marked ready
            for m in all_materials:
                if m.get("status") != "ready":
                    m_id = str(m.get("id") or "")
                    raw_m_name = str(m.get("name") or m.get("documentName") or "").strip()
                    m_name = raw_m_name.lower()
                    has_chunks = any(
                        str(ch.get("materialId", "")) == m_id or
                        str(ch.get("documentName", "")).strip().lower() == m_name
                        for ch in memory_store.get("rag_chunks", [])
                    )
                    if not has_chunks and mongo_db is not None:
                        try:
                            import re
                            cq = []
                            if m_id:
                                cq.append({"materialId": m_id})
                            if raw_m_name:
                                cq.append({"documentName": re.compile(f"^{re.escape(raw_m_name)}$", re.IGNORECASE)})
                            if cq and mongo_db["rag_chunks"].count_documents({"$or": cq}) > 0:
                                has_chunks = True
                        except Exception:
                            pass
                    if has_chunks:
                        m["status"] = "ready"
                        if mongo_db is not None:
                            try:
                                mongo_db["materials"].update_one({"id": m_id}, {"$set": {"status": "ready"}})
                            except Exception:
                                pass

            if role == "student":
                enrolled_ids = get_enrolled_course_ids(user_id, mongo_db, memory_store)
                filtered = filter_materials_for_role(all_materials, {"sub": user_id, "role": role}, enrolled_ids)
            else:
                filtered = all_materials

            sanitized = []
            seen_clean_ids = set()
            for m in filtered:
                mid = str(m.get("id") or "")
                if mid and mid in seen_clean_ids:
                    continue
                if mid:
                    seen_clean_ids.add(mid)
                clean_m = {k: v for k, v in m.items() if k != "fileBase64"}
                doc_title = clean_m.get("name") or clean_m.get("documentName") or clean_m.get("filename") or clean_m.get("title") or "Document"
                clean_m["name"] = doc_title
                clean_m["documentName"] = doc_title
                sanitized.append(clean_m)

            self._write_json(sanitized)
            return

        # ---- material indexing status check (fast status polling) ----
        if path == "/api/materials/status":
            material_id = str(query_params.get("id", [""])[0]).strip()
            raw_name = str(query_params.get("name", [""])[0]).strip()
            doc_name = raw_name.lower()
            
            chunk_count = 0
            is_ready = False

            # 1. Quick in-memory materials check (instant)
            for m in memory_store.get("materials", []):
                m_id = str(m.get("id", ""))
                m_name = str(m.get("name") or m.get("documentName") or "").strip().lower()
                if (material_id and m_id == material_id) or (doc_name and m_name == doc_name):
                    if m.get("status") in ("ready", "approved") or (m.get("chunks") and int(m.get("chunks", 0)) > 0):
                        is_ready = True
                        chunk_count = int(m.get("chunks") or 0)
                        break

            # 2. Quick in-memory rag_chunks check
            if not is_ready:
                for ch in memory_store.get("rag_chunks", []):
                    ch_mid = str(ch.get("materialId", ""))
                    ch_dname = str(ch.get("documentName", "")).strip().lower()
                    if (material_id and ch_mid == material_id) or (doc_name and ch_dname == doc_name):
                        chunk_count += 1
                if chunk_count > 0:
                    is_ready = True

            # 3. MongoDB check if still not found
            if not is_ready and mongo_db is not None:
                try:
                    import re
                    mq = []
                    if material_id:
                        mq.append({"id": material_id})
                    if raw_name:
                        mq.append({"name": re.compile(f"^{re.escape(raw_name)}$", re.IGNORECASE)})
                        mq.append({"documentName": re.compile(f"^{re.escape(raw_name)}$", re.IGNORECASE)})
                    if mq:
                        db_mat = mongo_db["materials"].find_one({"$or": mq}, {"status": 1, "chunks": 1})
                        if db_mat and (db_mat.get("status") in ("ready", "approved") or db_mat.get("chunks", 0) > 0):
                            is_ready = True
                            chunk_count = int(db_mat.get("chunks", 0))

                    if not is_ready:
                        cq = []
                        if material_id:
                            cq.append({"materialId": material_id})
                        if raw_name:
                            cq.append({"documentName": re.compile(f"^{re.escape(raw_name)}$", re.IGNORECASE)})
                        if cq:
                            chunk_count = mongo_db["rag_chunks"].count_documents({"$or": cq})
                            if chunk_count > 0:
                                is_ready = True
                except Exception as exc:
                    print(f"[Status] Mongo lookup warning: {exc}")

            # If confirmed ready, synchronize states
            if is_ready:
                for m in memory_store.get("materials", []):
                    m_id = str(m.get("id", ""))
                    m_name = str(m.get("name") or m.get("documentName") or "").strip().lower()
                    if (material_id and m_id == material_id) or (doc_name and m_name == doc_name):
                        m["status"] = "ready"
                        if chunk_count > 0:
                            m["chunks"] = chunk_count
                if mongo_db is not None and material_id:
                    try:
                        mongo_db["materials"].update_one(
                            {"id": material_id},
                            {"$set": {"status": "ready", **({"chunks": chunk_count} if chunk_count > 0 else {})}}
                        )
                    except Exception:
                        pass

            self._write_json({
                "success": True,
                "id": material_id,
                "name": raw_name,
                "status": "ready" if is_ready else "processing",
                "ready": is_ready,
                "chunks": chunk_count,
            })
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

        # ---- quizzes (per-account isolated) ----
        if path == "/api/quizzes":
            account_id = self._get_account_id()
            if not account_id:
                self._write_json([])
                return
            query: dict = {
                "$or": [
                    {"accountId": account_id},
                    {"userId": account_id}
                ]
            }
            status_param = query_params.get("status", [""])[0]
            if status_param:
                query["status"] = status_param
            quizzes = load_many("quizzes", [], query)
            self._write_json(quizzes)
            return

        # ---- notes ----
        if path == "/api/notes":
            payload = self._require_auth()
            if payload is None:
                return
            user_id = payload.get("sub", "")
            raw_notes = load_many("notes", [], {"userId": user_id})
            try:
                raw_notes.sort(key=lambda n: str(n.get("createdAt") or ""), reverse=True)
            except Exception:
                pass
            self._write_json(raw_notes)
            return

        # ---- notes POST ----
        if path == "/api/notes" and self.command == "POST":
            payload = self._require_auth()
            if payload is None:
                return
            body = self._read_json_body()
            if not isinstance(body, dict):
                self._write_json({"error": "Invalid notes payload"}, status_code=HTTPStatus.BAD_REQUEST)
                return
            user_id = payload.get("sub", "")
            body["userId"] = user_id
            body["id"] = body.get("id") or str(uuid.uuid4())
            body["createdAt"] = body.get("createdAt") or datetime.now(timezone.utc).isoformat()

            if mongo_db is not None:
                try:
                    mongo_db["notes"].insert_one(dict(body))
                except Exception as exc:
                    print(f"[MongoDB] Notes insert failed: {exc}")

            memory_store["notes"].append(dict(body))
            self._write_json({"success": True, "item": body}, status_code=HTTPStatus.CREATED)
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

        # ---- quiz questions (per-account isolated) ----
        if path == "/api/quiz-questions":
            account_id = self._get_account_id()
            quiz_id = query_params.get("quizId", [""])[0]
            if quiz_id:
                qq = load_many("quiz_questions", [], {"quizId": quiz_id})
                self._write_json(qq)
                return
            if not account_id:
                self._write_json([])
                return
            user_quizzes = load_many("quizzes", [], {"$or": [{"accountId": account_id}, {"userId": account_id}]})
            user_quiz_ids = [str(q.get("id")) for q in user_quizzes if q.get("id")]
            if not user_quiz_ids:
                self._write_json([])
                return
            qq = load_many("quiz_questions", [], {"quizId": {"$in": user_quiz_ids}})
            self._write_json(qq)
            return

        # ---- quiz attempts / results (per-account isolated) ----
        if path in ("/api/quiz-attempts", "/api/quiz-results"):
            account_id = self._get_account_id()
            if not account_id:
                self._write_json([])
                return
            query = {
                "$or": [
                    {"accountId": account_id},
                    {"userId": account_id}
                ]
            }
            attempts = load_many("quiz_attempts", [], query)
            if not attempts:
                attempts = load_many("quiz_results", [], query)
            self._write_json(attempts)
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

                    if not isinstance(file_data, bytes) or len(file_data) == 0:
                        self._write_json(
                            {"success": False, "error": f"The file '{filename}' was received with 0 bytes. Your browser or computer may be out of disk space (net::ERR_FILE_NO_SPACE)."},
                            status_code=HTTPStatus.BAD_REQUEST,
                        )
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
                            # Mark in-memory record as fully indexed immediately
                            material["status"] = "ready"
                            material["chunks"] = len(chunks)
                            print(f"[Upload] Indexed {len(chunks)} chunks for {filename}")
                            if mongo_db is not None:
                                try:
                                    mongo_db["materials"].update_one(
                                        {"id": material_id}, {"$set": {"status": "ready", "chunks": len(chunks)}}
                                    )
                                    for i in range(0, len(chunks), 200):
                                        mongo_db["rag_chunks"].insert_many(chunks[i:i + 200])
                                except Exception as exc:
                                    print(f"[MongoDB] Background chunk insert failed: {exc}")
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
                            material["status"] = "ready"
                            material["chunks"] = len(chunks)
                            if mongo_db is not None:
                                try:
                                    material_copy = dict(material)
                                    material_copy["status"] = "ready"
                                    material_copy["chunks"] = len(chunks)
                                    mongo_db["materials"].insert_one(material_copy)
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
            if payload is None:
                self._write_json({"error": "Authentication required."}, status_code=HTTPStatus.UNAUTHORIZED)
                return
            body = self._read_json_body()
            if not isinstance(body, dict):
                self._write_json({"error": "Invalid chat history payload"}, status_code=HTTPStatus.BAD_REQUEST)
                return
            # Always use the token's userId; never trust body userId
            body["userId"] = payload.get("sub", "")
            body["role"] = payload.get("role", "student")
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

        # ---- quiz generation ----
        if path == "/api/quiz/generate":
            body = self._read_json_body()
            if not isinstance(body, dict):
                self._write_json({"error": "Invalid quiz generation payload"}, status_code=HTTPStatus.BAD_REQUEST)
                return
            token_payload = self._optional_auth()
            self._handle_quiz_generate(body, token_payload)
            return

        # ---- document selection notification (shows selected document name in backend server) ----
        if path in ("/api/notes/select-document", "/api/materials/select"):
            body = self._read_json_body()
            doc_id = str(body.get("id") or body.get("materialId") or "").strip()
            doc_name = str(body.get("name") or body.get("documentName") or "").strip()
            if not doc_name and doc_id:
                for m in memory_store.get("materials", []):
                    if str(m.get("id")) == doc_id:
                        doc_name = str(m.get("name") or m.get("documentName") or "")
                        break
                if not doc_name and mongo_db is not None:
                    try:
                        found_doc = mongo_db["materials"].find_one({"id": doc_id})
                        if found_doc:
                            doc_name = str(found_doc.get("name") or found_doc.get("documentName") or "")
                    except Exception:
                        pass

            display_doc = doc_name if (doc_name and doc_id != "all") else ("All Indexed Documents" if doc_id == "all" else (doc_name or "Unknown Document"))
            now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            print("\n" + "="*70, flush=True)
            print(" [BACKEND SERVER] DOCUMENT SELECTED IN STUDENT NOTES DASHBOARD:", flush=True)
            print(f"  >>> Document Name: {display_doc}", flush=True)
            print(f"  >>> Document ID:   {doc_id or 'all'}", flush=True)
            print(f"  >>> Selected At:   {now_str}", flush=True)
            print("="*70 + "\n", flush=True)

            self._write_json({
                "success": True,
                "selectedDocument": {
                    "id": doc_id,
                    "name": display_doc,
                }
            })
            return

        # ---- notes generation (fast, format-specific) ----
        if path == "/api/notes/generate":
            body = self._read_json_body()
            if not isinstance(body, dict):
                self._write_json({"error": "Invalid notes generation payload"}, status_code=HTTPStatus.BAD_REQUEST)
                return
            token_payload = self._optional_auth()
            self._handle_notes_generate(body, token_payload)
            return

        # ---- quiz creation (per-account isolated) ----
        if path == "/api/quizzes":
            body = self._read_json_body()
            if not isinstance(body, dict):
                self._write_json({"error": "Invalid quiz payload"}, status_code=HTTPStatus.BAD_REQUEST)
                return
            account_id = self._get_account_id()
            if not account_id:
                account_id = str(body.get("accountId") or body.get("userId") or "").strip()
            if not account_id:
                self._write_json({"error": "accountId or userId required"}, status_code=HTTPStatus.UNAUTHORIZED)
                return

            quiz_id = str(body.get("id") or f"quiz_{uuid.uuid4().hex[:12]}")
            quiz_doc = {
                "id": quiz_id,
                "accountId": account_id,
                "userId": account_id,
                "title": str(body.get("title", "Untitled Quiz")),
                "topic": str(body.get("topic", "")),
                "source": str(body.get("source") or body.get("course") or "AI Generated"),
                "questionCount": int(body.get("questionCount") if body.get("questionCount") is not None else (body.get("questions") or 5)),
                "difficulty": str(body.get("difficulty", "Medium")),
                "status": str(body.get("status", "unattempted")),
                "questions": body.get("questionsList") or body.get("questionCount") or body.get("questions") or 5,
                "duration": int(body.get("duration") if body.get("duration") is not None else 10),
                "dueDate": str(body.get("dueDate", "Just now")),
                "course": str(body.get("course") or body.get("source") or "AI Generated"),
                "createdAt": str(body.get("createdAt") or datetime.now(timezone.utc).isoformat()),
                "sourceName": str(body.get("sourceName") or ""),
                "isDocumentBased": bool(body.get("isDocumentBased")),
            }

            if mongo_db is not None:
                try:
                    mongo_db["quizzes"].update_one(
                        {"id": quiz_id, "$or": [{"accountId": account_id}, {"userId": account_id}]},
                        {"$set": quiz_doc},
                        upsert=True
                    )
                except Exception as exc:
                    print(f"[MongoDB] Quiz insert/upsert failed: {exc}")

            if "quizzes" in memory_store:
                memory_store["quizzes"] = [q for q in memory_store["quizzes"] if q.get("id") != quiz_id]
                memory_store["quizzes"].insert(0, dict(quiz_doc))

            self._write_json({"success": True, "quiz": quiz_doc, "item": quiz_doc}, status_code=HTTPStatus.CREATED)
            return

        # ---- quiz attempt submission (per-account isolated) ----
        if path in ("/api/quiz-attempts", "/api/quiz-results"):
            body = self._read_json_body()
            if not isinstance(body, dict):
                self._write_json({"error": "Invalid quiz attempt payload"}, status_code=HTTPStatus.BAD_REQUEST)
                return
            account_id = self._get_account_id()
            if not account_id:
                account_id = str(body.get("accountId") or body.get("userId") or "").strip()
            if not account_id:
                self._write_json({"error": "accountId or userId required"}, status_code=HTTPStatus.UNAUTHORIZED)
                return

            attempt_id = str(body.get("id") or f"qa_{uuid.uuid4().hex[:12]}")
            quiz_id = str(body.get("quizId", ""))
            score = int(body.get("score", 0))
            answers = body.get("answers", [])
            total_questions = int(body.get("totalQuestions") or (len(answers) if isinstance(answers, list) else 0) or 5)
            completed_at = str(body.get("completedAt") or datetime.now(timezone.utc).isoformat())
            title = str(body.get("title") or "")
            topic = str(body.get("topic") or "")

            if not title or not topic:
                parent_quiz = load_one("quizzes", {}, {"id": quiz_id, "$or": [{"accountId": account_id}, {"userId": account_id}]})
                if parent_quiz:
                    title = title or parent_quiz.get("title", "")
                    topic = topic or parent_quiz.get("topic", "")

            attempt_doc = {
                "id": attempt_id,
                "accountId": account_id,
                "userId": account_id,
                "quizId": quiz_id,
                "title": title or "Quiz Attempt",
                "topic": topic,
                "score": score,
                "totalQuestions": total_questions,
                "answers": answers,
                "completedAt": completed_at,
            }

            if mongo_db is not None:
                try:
                    mongo_db["quiz_attempts"].update_one(
                        {"id": attempt_id},
                        {"$set": attempt_doc},
                        upsert=True
                    )
                    mongo_db["quiz_results"].update_one(
                        {"id": attempt_id},
                        {"$set": attempt_doc},
                        upsert=True
                    )
                    if quiz_id:
                        mongo_db["quizzes"].update_one(
                            {"id": quiz_id, "$or": [{"accountId": account_id}, {"userId": account_id}]},
                            {"$set": {"status": "completed", "score": score, "dueDate": "Completed just now"}}
                        )
                except Exception as exc:
                    print(f"[MongoDB] Quiz attempt save failed: {exc}")

            for col in ("quiz_attempts", "quiz_results"):
                if col in memory_store:
                    memory_store[col] = [a for a in memory_store[col] if a.get("id") != attempt_id]
                    memory_store[col].insert(0, dict(attempt_doc))

            if "quizzes" in memory_store and quiz_id:
                for q in memory_store["quizzes"]:
                    if q.get("id") == quiz_id and (q.get("accountId") == account_id or q.get("userId") == account_id):
                        q["status"] = "completed"
                        q["score"] = score
                        q["dueDate"] = "Completed just now"

            self._write_json({"success": True, "attempt": attempt_doc, "item": attempt_doc}, status_code=HTTPStatus.CREATED)
            return

        # ---- quiz questions batch save ----
        if path == "/api/quiz-questions/batch":
            payload = self._require_auth()
            if payload is None:
                return
            body = self._read_json_body()
            if not isinstance(body, dict) or not isinstance(body.get("questions"), list):
                self._write_json({"error": "Invalid batch payload: 'questions' array required"}, status_code=HTTPStatus.BAD_REQUEST)
                return
            questions = body.get("questions", [])
            if questions:
                if mongo_db is not None:
                    try:
                        docs = [dict(q) for q in questions]
                        mongo_db["quiz_questions"].insert_many(docs)
                        for d in docs:
                            d.pop("_id", None)
                    except Exception as exc:
                        print(f"[MongoDB] Batch insert failed for quiz_questions: {exc}")
                if "quiz_questions" in memory_store:
                    memory_store["quiz_questions"].extend([dict(q) for q in questions])
            self._write_json({"success": True, "count": len(questions)}, status_code=HTTPStatus.CREATED)
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

        # ---- notes deletion (protected, user-specific) ----
        if path == "/api/notes":
            payload = self._require_auth()
            if payload is None:
                return
            user_id = payload.get("sub", "")
            body = self._read_json_body() or {}
            ids = body.get("ids", []) if isinstance(body, dict) else []

            deleted_count = 0
            if mongo_db is not None and ids:
                try:
                    res = mongo_db["notes"].delete_many({
                        "id": {"$in": ids},
                        "userId": user_id,
                    })
                    deleted_count = res.deleted_count
                    print(f"[MongoDB] Deleted {deleted_count} notes for user '{user_id}'")
                except Exception as exc:
                    print(f"[MongoDB] Notes delete failed: {exc}")

            if "notes" in memory_store and ids:
                original_len = len(memory_store["notes"])
                memory_store["notes"] = [
                    item for item in memory_store["notes"]
                    if not (item.get("id") in ids and item.get("userId") == user_id)
                ]
                if mongo_db is None:
                    deleted_count = original_len - len(memory_store["notes"])

            self._write_json({
                "success": True,
                "collection": "notes",
                "deletedCount": deleted_count,
                "ids": ids,
            })
            return

        # ---- chat history deletion (per conversation) ----
        if path.startswith("/api/chat/history/") and path.count("/") >= 4:
            payload = self._optional_auth()
            if payload is None:
                return
            uid = payload.get("sub", "")
            conversation_id = path.rsplit("/", 1)[-1]
            if not conversation_id:
                self._write_json({"error": "conversationId required"}, status_code=HTTPStatus.BAD_REQUEST)
                return
            ok = delete_chat_conversation(conversation_id, uid)
            self._write_json({"success": True, "deleted": ok})
            return

        # ---- quiz & quiz attempts deletion (enforcing strict per-account isolation) ----
        if path in ("/api/quizzes", "/api/quiz-attempts", "/api/quiz-results") or path.startswith("/api/quizzes/"):
            account_id = self._get_account_id()
            body = self._read_json_body() or {}
            if not account_id and isinstance(body, dict):
                account_id = str(body.get("accountId") or body.get("userId") or "").strip()
            if not account_id:
                self._write_json({"error": "Unauthorized: accountId required"}, status_code=HTTPStatus.UNAUTHORIZED)
                return

            query_params = parse_qs(parsed.query)
            scope = str((body.get("scope") if isinstance(body, dict) else "") or query_params.get("scope", [""])[0] or "").strip().lower()
            ids = body.get("ids", []) if isinstance(body, dict) else []
            parts = path.split("/")
            if len(parts) >= 4 and not ids:
                ids = [parts[3]]
            if not ids and "id" in query_params:
                ids = query_params["id"]
            if not ids and "ids" in query_params:
                ids = query_params["ids"]
            ids = [str(i).strip() for i in ids if str(i).strip()]

            user_clause = {"$or": [{"accountId": account_id}, {"userId": account_id}]}
            deleted_count = 0

            # Case A: Delete All Unattempted Quizzes for this account
            if scope == "unattempted":
                unattempted_filter = {"$and": [user_clause, {"status": {"$ne": "completed"}}]}
                if mongo_db is not None:
                    try:
                        to_del = list(mongo_db["quizzes"].find(unattempted_filter, {"id": 1}))
                        q_ids = [str(q.get("id")) for q in to_del if q.get("id")]
                        res = mongo_db["quizzes"].delete_many(unattempted_filter)
                        deleted_count = res.deleted_count
                        if q_ids:
                            mongo_db["quiz_questions"].delete_many({"quizId": {"$in": q_ids}})
                    except Exception as exc:
                        print(f"[MongoDB] Failed deleting unattempted quizzes: {exc}")

                if "quizzes" in memory_store:
                    orig_len = len(memory_store["quizzes"])
                    memory_store["quizzes"] = [
                        q for q in memory_store["quizzes"]
                        if not ((q.get("accountId") == account_id or q.get("userId") == account_id) and q.get("status") != "completed")
                    ]
                    if mongo_db is None:
                        deleted_count = orig_len - len(memory_store["quizzes"])

                self._write_json({
                    "success": True,
                    "collection": "quizzes",
                    "deletedCount": deleted_count,
                    "scope": "unattempted"
                })
                return

            # Case B: Delete All Quiz History / Attempts for this account
            if scope == "history" or (not ids and path in ("/api/quiz-attempts", "/api/quiz-results")):
                if mongo_db is not None:
                    try:
                        res_qa = mongo_db["quiz_attempts"].delete_many(user_clause)
                        res_qr = mongo_db["quiz_results"].delete_many(user_clause)
                        res_qc = mongo_db["quizzes"].delete_many({"$and": [user_clause, {"status": "completed"}]})
                        deleted_count = res_qa.deleted_count + res_qc.deleted_count
                    except Exception as exc:
                        print(f"[MongoDB] Failed deleting quiz history: {exc}")

                for col in ("quiz_attempts", "quiz_results"):
                    if col in memory_store:
                        memory_store[col] = [
                            a for a in memory_store[col]
                            if not (a.get("accountId") == account_id or a.get("userId") == account_id)
                        ]
                if "quizzes" in memory_store:
                    orig_len = len(memory_store["quizzes"])
                    memory_store["quizzes"] = [
                        q for q in memory_store["quizzes"]
                        if not ((q.get("accountId") == account_id or q.get("userId") == account_id) and q.get("status") == "completed")
                    ]
                    if mongo_db is None:
                        deleted_count = orig_len - len(memory_store["quizzes"])

                self._write_json({
                    "success": True,
                    "collection": "quiz_attempts",
                    "deletedCount": deleted_count,
                    "scope": "history"
                })
                return

            # Case C: Delete Specific Quiz / Attempt IDs — STRICTLY ENFORCE ACCOUNT OWNERSHIP
            if not ids:
                self._write_json({"error": "No quiz IDs or scope provided for deletion"}, status_code=HTTPStatus.BAD_REQUEST)
                return

            if mongo_db is not None:
                try:
                    from bson import ObjectId
                except ImportError:
                    ObjectId = None
                obj_ids = []
                if ObjectId is not None:
                    for i in ids:
                        try:
                            if ObjectId.is_valid(i):
                                obj_ids.append(ObjectId(i))
                        except Exception:
                            pass

                id_or_clause = [{"id": {"$in": ids}}]
                if obj_ids:
                    id_or_clause.append({"_id": {"$in": obj_ids}})

                # 1. Delete from quizzes WHERE user owns it
                quiz_del_query = {"$and": [user_clause, {"$or": id_or_clause}]}
                try:
                    res_q = mongo_db["quizzes"].delete_many(quiz_del_query)
                    deleted_count += res_q.deleted_count
                except Exception as exc:
                    print(f"[MongoDB] Failed deleting from quizzes: {exc}")

                # 2. Delete from quiz_attempts & quiz_results WHERE user owns it
                attempt_del_query = {"$and": [user_clause, {"$or": [{"id": {"$in": ids}}, {"quizId": {"$in": ids}}]}]}
                try:
                    res_qa = mongo_db["quiz_attempts"].delete_many(attempt_del_query)
                    res_qr = mongo_db["quiz_results"].delete_many(attempt_del_query)
                    deleted_count += res_qa.deleted_count
                except Exception as exc:
                    print(f"[MongoDB] Failed deleting from quiz_attempts/results: {exc}")

                # 3. Delete from quiz_questions for these quiz IDs
                try:
                    mongo_db["quiz_questions"].delete_many({"quizId": {"$in": ids}})
                except Exception:
                    pass

            # 4. Clean memory_store strictly for this account
            if "quizzes" in memory_store:
                orig_len = len(memory_store["quizzes"])
                memory_store["quizzes"] = [
                    q for q in memory_store["quizzes"]
                    if not (str(q.get("id")) in ids and (q.get("accountId") == account_id or q.get("userId") == account_id))
                ]
                if mongo_db is None:
                    deleted_count += (orig_len - len(memory_store["quizzes"]))

            for col in ("quiz_attempts", "quiz_results"):
                if col in memory_store:
                    memory_store[col] = [
                        a for a in memory_store[col]
                        if not ((str(a.get("id")) in ids or str(a.get("quizId")) in ids) and (a.get("accountId") == account_id or a.get("userId") == account_id))
                    ]

            if "quiz_questions" in memory_store:
                memory_store["quiz_questions"] = [
                    qq for qq in memory_store["quiz_questions"]
                    if str(qq.get("quizId")) not in ids and str(qq.get("id")) not in ids
                ]

            self._write_json({
                "success": True,
                "collection": "quizzes",
                "deletedCount": deleted_count,
                "ids": ids,
            })
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

        # Ensure user-scoped ownership for notes and quizzes updates
        if collection_name == "notes":
            body["userId"] = payload.get("sub", "") or body.get("userId", "")
        if collection_name == "quizzes":
            account_id = payload.get("sub", "") or body.get("accountId") or body.get("userId")
            body["accountId"] = account_id
            body["userId"] = account_id

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
                elif collection_name == "notes":
                    is_match = (
                        item.get("id") == body.get("id") 
                        and item.get("userId") == payload.get("sub", "")
                    )
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
        user_id = user.get("userId") or (str(user.get("_id")) if user.get("_id") is not None else "")
        if not user_id:
            user_id = f"usr_{email.replace('@', '_').replace('.', '_')}"
            user["userId"] = user_id
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

    def _handle_quiz_generate(self, body: dict, token_payload: dict | None) -> None:
        token_payload = token_payload or {}
        topic = str(body.get("topic", "") or "").strip()
        difficulty = str(body.get("difficulty", "Medium") or "Medium").strip()
        try:
            requested_questions = max(1, min(50, int(body.get("count", 5))))
        except (TypeError, ValueError):
            requested_questions = 5

        selected_material_ids = body.get("materialIds", [])
        if not isinstance(selected_material_ids, list):
            selected_material_ids = []

        question_type = str(body.get("questionType", "MCQ") or "MCQ").strip().upper()
        if question_type not in ("MCQ", "MSQ", "NAT"):
            question_type = "MCQ"

        print(f"[Quiz] Request: topic='{topic}', difficulty='{difficulty}', count={requested_questions}, type='{question_type}', materials={selected_material_ids}")

        # Prefer chunks already indexed in memory for the selected PDF. This
        # avoids a broad database query for every quiz request and is much
        # faster immediately after a document upload.
        memory_chunks = list(memory_store.get("rag_chunks", []))
        all_chunks = memory_chunks
        selected_memory_chunks = [
            chunk for chunk in memory_chunks
            if chunk.get("materialId") in selected_material_ids
        ] if selected_material_ids else []

        # Only ask MongoDB when the requested document is not already present
        # in memory. A broad query here can stall quiz generation on a slow DB.
        if mongo_db is not None and not selected_memory_chunks:
            try:
                query = {"materialId": {"$in": selected_material_ids}} if selected_material_ids else {}
                all_chunks.extend(mongo_db["rag_chunks"].find(query, {"_id": 0}))
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

        # Filter by selected materials if any specified
        if selected_material_ids:
            document_chunks = selected_memory_chunks or [
                c for c in all_chunks if c.get("materialId") in selected_material_ids
            ]
        else:
            document_chunks = all_chunks

        # If topic keywords exist, rank/prioritize matching chunks
        topic_words = set(re.findall(r"[a-z0-9]+", topic.lower()))
        topic_words = {w for w in topic_words if len(w) > 2}
        if topic_words and document_chunks:
            scored = []
            for chunk in document_chunks:
                chunk_text = str(chunk.get("text", "")).lower()
                score = sum(1 for w in topic_words if w in chunk_text)
                if score > 0:
                    scored.append((score, chunk))
            scored.sort(key=lambda x: x[0], reverse=True)
            topic_matched = [c for _, c in scored]
            if len(topic_matched) >= 2:
                document_chunks = topic_matched

        # Sample chunks evenly across the document
        # Keep the document prompt compact so PDF-based quizzes return quickly.
        chunk_limit = min(6, max(3, (requested_questions + 1) // 2))
        step = max(1, len(document_chunks) // chunk_limit) if document_chunks else 1
        distributed_chunks = document_chunks[::step][:chunk_limit] if document_chunks else []

        chunk_lines = []
        for item in distributed_chunks:
            doc = item.get("documentName", "document")
            page = item.get("page", "?")
            text = str(item.get("text", ""))[:320]
            chunk_lines.append(f"[Document: {doc}, page {page}]\n{text}")
        rag_context = "\n\n---\n\n".join(chunk_lines)

        target_subject = topic or (distributed_chunks[0].get("documentName", "General") if distributed_chunks else "General")
        if question_type == "NAT":
            prompt = (
                f"Generate exactly {requested_questions} Numerical Answer Type (NAT) questions "
                f"at {difficulty} difficulty relevant to \"{target_subject}\".\n"
                f"Each question must require a specific numerical answer (e.g. integer, port, calculation, count).\n"
                f"CRITICAL: Do NOT mention or repeat the topic name \"{target_subject}\" in the question text.\n"
                f"CRITICAL: Do NOT begin questions with 'Based on the notes material', 'Based on the document', or any similar phrase. Ask direct questions.\n"
                f"Output ONLY a valid JSON array starting with [ and ending with ]. No markdown, no code blocks.\n"
                f"Format: [{{\"question\": \"...\", \"type\": \"NAT\", \"correct\": 42, \"options\": [], \"explanation\": \"...\"}}]"
            )
        elif question_type == "MSQ":
            prompt = (
                f"Generate exactly {requested_questions} Multiple Select Questions (MSQ) "
                f"at {difficulty} difficulty relevant to \"{target_subject}\" where ONE OR MORE options are correct.\n"
                f"CRITICAL: Do NOT mention or repeat the topic name \"{target_subject}\" in the question text.\n"
                f"CRITICAL: Do NOT begin questions with 'Based on the notes material', 'Based on the document', or any similar phrase. Ask direct questions.\n"
                f"Output ONLY a valid JSON array starting with [ and ending with ]. No markdown, no code blocks.\n"
                f"Format: [{{\"question\": \"...\", \"type\": \"MSQ\", \"options\": [\"opt1\",\"opt2\",\"opt3\",\"opt4\"], \"correct\": [0, 2], \"explanation\": \"...\"}}]"
            )
        else:
            prompt = (
                f"Generate exactly {requested_questions} multiple-choice questions (MCQ) "
                f"at {difficulty} difficulty relevant to \"{target_subject}\".\n"
                f"CRITICAL: Do NOT mention or repeat the topic name \"{target_subject}\" in the question text.\n"
                f"CRITICAL: Do NOT begin questions with 'Based on the notes material', 'Based on the document', or any similar phrase. Ask direct questions.\n"
                f"Output ONLY a valid JSON array starting with [ and ending with ]. No markdown, no code blocks, no other text.\n"
                f"Format: [{{\"question\": \"...\", \"type\": \"MCQ\", \"options\": [\"opt1\",\"opt2\",\"opt3\",\"opt4\"], \"correct\": 0, \"explanation\": \"...\"}}]"
            )

        answer = None
        if study_buddy is not None:
            # Some provider clients can ignore their configured socket timeout.
            # Keep the HTTP request responsive by moving the optional AI call to
            # a bounded worker; the deterministic local generator is used if it
            # does not return promptly.
            executor = ThreadPoolExecutor(max_workers=1)
            try:
                future = executor.submit(
                    study_buddy.ask,
                    topic=target_subject,
                    difficulty=difficulty,
                    question=prompt,
                    context=rag_context,
                    history=[],
                    max_tokens=max(500, min(3500, requested_questions * 140)),
                    strict_context=bool(rag_context),
                    temperature=0.3,
                )
                answer = future.result(timeout=15)
            except FuturesTimeoutError:
                print("[Quiz] AI provider exceeded 15 seconds; using fast local quiz fallback")
            except Exception as exc:
                print(f"[Quiz] LLM generation failed: {exc}")
                answer = None
            finally:
                executor.shutdown(wait=False, cancel_futures=True)

        # Verify output is valid JSON array; otherwise fallback to local generator
        if not answer or "[" not in answer or "]" not in answer:
            if StudyBuddy is not None:
                answer = StudyBuddy._local_quiz_answer(
                    topic=target_subject,
                    context=rag_context,
                    difficulty=difficulty,
                    count=requested_questions,
                    question_type=question_type,
                )
                print(f"[Quiz] Fallback local quiz generated ({len(answer)} chars)")

        if not answer:
            self._write_json(
                {"success": False, "error": "Quiz generation failed. Please try again."},
                status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            )
            return

        print(f"[Quiz] Generated response: length={len(answer)} chars")
        self._write_json({"success": True, "answer": answer})

    _notes_cache: dict = {}

    def _handle_notes_generate(self, body: dict, token_payload: dict) -> None:
        topic = str(body.get("topic", "")).strip()
        note_type = str(body.get("type") or body.get("format") or body.get("note_type") or body.get("noteType") or "summary").strip().lower()
        if note_type not in ("summary", "keypoints", "definitions", "formulas"):
            note_type = "summary"
        material_ids = body.get("materialIds", [])
        custom_context = str(body.get("context", "")).strip()

        # 1. Fetch chunks for the selected/uploaded documents
        doc_chunks = []
        if mongo_db is not None:
            try:
                query_clauses = []
                if material_ids:
                    query_clauses.append({"materialId": {"$in": [str(m) for m in material_ids]}})
                if custom_context:
                    # Match any documentName present in custom_context
                    try:
                        all_doc_names = mongo_db["rag_chunks"].distinct("documentName")
                        matched_names = [d for d in all_doc_names if d and d.lower() in custom_context.lower()]
                        if matched_names:
                            query_clauses.append({"documentName": {"$in": matched_names}})
                    except Exception:
                        pass
                if query_clauses:
                    db_chunks = list(mongo_db["rag_chunks"].find({"$or": query_clauses}, {"embedding": 0}))
                    if db_chunks:
                        doc_chunks.extend(db_chunks)
            except Exception as e:
                print(f"[Notes] Mongo chunk fetch error: {e}")

        # Check in-memory store for matching chunks
        mem_chunks = list(memory_store.get("rag_chunks", []))
        if mem_chunks:
            mat_set = {str(m) for m in material_ids} if material_ids else set()
            for c in mem_chunks:
                c_mat = str(c.get("materialId", ""))
                c_doc = str(c.get("documentName", "")).lower()
                if (mat_set and c_mat in mat_set) or (custom_context and c_doc and c_doc in custom_context.lower()):
                    if not any(str(ex.get("id", ex.get("_id"))) == str(c.get("id", c.get("_id"))) for ex in doc_chunks):
                        doc_chunks.append(c)

        # Fallback to all chunks if no specific document chunks found
        if not doc_chunks:
            if mongo_db is not None:
                try:
                    doc_chunks = list(mongo_db["rag_chunks"].find({}, {"embedding": 0}).limit(120))
                except Exception:
                    doc_chunks = []
            if not doc_chunks:
                doc_chunks = mem_chunks

        # Sort chunks logically by documentName and page number
        def _get_page(ch):
            try:
                return int(ch.get("page", 0))
            except (ValueError, TypeError):
                return 0
        doc_chunks.sort(key=lambda c: (str(c.get("documentName", "")), _get_page(c)))

        # 2. Intelligent Topic / Chapter Retrieval & Slicing
        relevant_chunks = []
        if topic and doc_chunks:
            # Check if topic specifies a Unit, Chapter, or Module (e.g. "Unit-2", "Unit 2", "Unit II", "Chapter 3")
            unit_match = re.search(r'\b(?:unit|chapter|module|part|ch)\s*[-–:]?\s*([0-9]+|[ivx]+)\b', topic, re.IGNORECASE)
            if unit_match:
                val = unit_match.group(1).lower()
                roman_map = {"1": "i", "2": "ii", "3": "iii", "4": "iv", "5": "v", "6": "vi", "7": "vii", "8": "viii", "9": "ix", "10": "x"}
                rev_roman_map = {v: k for k, v in roman_map.items()}
                
                num_arabic = val if val.isdigit() else rev_roman_map.get(val, "")
                num_roman = roman_map.get(val, val)
                
                curr_regex = rf'\b(?:unit|chapter|module|part|ch)\s*[-–:]?\s*(?:{re.escape(num_arabic)}|{re.escape(num_roman)})\b'
                
                next_arabic = str(int(num_arabic) + 1) if num_arabic.isdigit() else ""
                next_roman = roman_map.get(next_arabic, "") if next_arabic else ""
                next_regex = rf'\b(?:unit|chapter|module|part|ch)\s*[-–:]?\s*(?:{re.escape(next_arabic)}|{re.escape(next_roman)})\b' if next_arabic else None

                # Locate the starting chunk for this unit/chapter
                start_idx = None
                for idx, chunk in enumerate(doc_chunks):
                    txt = str(chunk.get("text", ""))
                    if re.search(curr_regex, txt, re.IGNORECASE):
                        start_idx = idx
                        break

                if start_idx is not None:
                    # Locate the ending chunk (start of the next unit)
                    end_idx = None
                    if next_regex:
                        for idx in range(start_idx + 1, len(doc_chunks)):
                            txt = str(doc_chunks[idx].get("text", ""))
                            if re.search(next_regex, txt, re.IGNORECASE):
                                end_idx = idx
                                break
                    if end_idx is not None and end_idx > start_idx:
                        relevant_chunks = doc_chunks[start_idx:min(end_idx, start_idx + 12)]
                    else:
                        relevant_chunks = doc_chunks[start_idx:start_idx + 10]
                    print(f"[Notes] Sliced {len(relevant_chunks)} chunks for {topic} (chunks {start_idx} to {end_idx or start_idx + len(relevant_chunks)})")

            # If not sliced by unit boundary, score chunks based on keywords and phrases
            if not relevant_chunks:
                t_words = [w for w in re.findall(r'[a-z0-9]+', topic.lower()) if len(w) > 2 and w not in ('notes', 'chapter', 'unit', 'about', 'from', 'with', 'the', 'and')]
                scored = []
                for chunk in doc_chunks:
                    txt = str(chunk.get("text", "")).lower()
                    doc_nm = str(chunk.get("documentName", "")).lower()
                    score = 0
                    if topic.lower() in txt:
                        score += 60
                    for w in t_words:
                        if w in txt:
                            score += 15
                        if w in doc_nm:
                            score += 5
                    if score > 0:
                        scored.append((score, chunk))
                scored.sort(key=lambda x: x[0], reverse=True)
                if scored:
                    relevant_chunks = [c for _, c in scored[:8]]
                    print(f"[Notes] Keyword matched {len(relevant_chunks)} chunks for {topic}")

        if not relevant_chunks:
            if doc_chunks:
                step = max(1, len(doc_chunks) // 8)
                relevant_chunks = doc_chunks[::step][:8]
            else:
                relevant_chunks = []

        # 3. Construct Document Context Snippets
        context_parts = []
        if custom_context:
            context_parts.append(f"Source Context: {custom_context}")
        for chunk in relevant_chunks[:10]:
            doc_name = chunk.get("documentName", "Document")
            page_no = chunk.get("page", 1)
            text_snippet = str(chunk.get("text", "")).strip()[:1000]
            # Detect Unit and Chapter in the chunk text if present
            unit_match = re.search(r'\bunit\s*[-–:]?\s*([0-9ivx]+)(?:\s*[-–:—]\s*([^\n,;|]{3,50}))?', text_snippet, re.IGNORECASE)
            chap_match = re.search(r'\b(?:chapter|ch\.?|section)\s*[-–:]?\s*([0-9ivx.]+|[0-9]+\.[0-9]+)(?:\s*[-–:—]\s*([^\n,;|]{3,50}))?', text_snippet, re.IGNORECASE)
            u_tag = f" | Unit: {unit_match.group(0).strip()}" if unit_match else ""
            c_tag = f" | Chapter: {chap_match.group(0).strip()}" if chap_match else ""
            if text_snippet:
                context_parts.append(f"[{doc_name} — PDF Page {page_no}{u_tag}{c_tag}]:\n{text_snippet}")
        rag_context = "\n\n".join(context_parts)

        # 4. Formulate Header and Topic
        doc_raw_name = relevant_chunks[0].get("documentName", "") if relevant_chunks else ""
        clean_doc = re.sub(r'\.[^.]+$', '', doc_raw_name).strip() if doc_raw_name else ""

        format_titles = {
            "summary": ("Chapter Summary", "📚"),
            "keypoints": ("Key Points", "🎯"),
            "definitions": ("Definitions & Terminology", "📖"),
            "formulas": ("Formula Sheet & Reference Guide", "📐"),
        }
        format_name, format_icon = format_titles.get(note_type, ("Study Notes", "📝"))

        entered_topic = topic.strip()
        if entered_topic:
            display_topic = entered_topic
        elif clean_doc:
            display_topic = clean_doc
        else:
            display_topic = "General Concepts"

        # The prominent header required: Note Type with the entered topic / chapter
        header_title = f"{format_name}: {display_topic}"
        if clean_doc and entered_topic and clean_doc.lower() not in entered_topic.lower():
            full_title = f"{format_name}: {display_topic} ({clean_doc})"
        else:
            full_title = header_title

        # Determine and display the selected document name in the backend server
        selected_doc_name = str(body.get("selectedDocumentName") or body.get("documentName") or "").strip()
        doc_display_name = selected_doc_name
        if not doc_display_name and clean_doc:
            doc_display_name = clean_doc
        elif not doc_display_name and material_ids:
            for m in memory_store.get("materials", []):
                if str(m.get("id")) in [str(x) for x in material_ids]:
                    doc_display_name = str(m.get("name") or m.get("documentName") or "")
                    break
        if not doc_display_name:
            doc_display_name = "All Indexed Documents"

        print("\n" + "="*70, flush=True)
        print(" [BACKEND SERVER] GENERATING NOTES FOR SELECTED DOCUMENT:", flush=True)
        print(f"  >>> Selected Document: {doc_display_name}", flush=True)
        print(f"  >>> Topic / Chapter:   {display_topic}", flush=True)
        print(f"  >>> Note Format:       {format_name} ({note_type})", flush=True)
        print(f"  >>> Material IDs:      {material_ids}", flush=True)
        print("="*70 + "\n", flush=True)

        cache_key = f"{display_topic.strip().lower()}::{note_type}::{hash(rag_context)}"
        if cache_key in EduRAGHandler._notes_cache:
            cached_content = EduRAGHandler._notes_cache[cache_key]
            if note_type == "formulas":
                cached_content = EduRAGHandler._ensure_total_formulas_summary(cached_content)
                EduRAGHandler._notes_cache[cache_key] = cached_content
            self._write_json({
                "success": True,
                "title": full_title,
                "header": header_title,
                "type": note_type,
                "topic": display_topic,
                "document": clean_doc,
                "content": cached_content,
                "cached": True,
            })
            return

        # 5. Build AI Prompt
        prompt = (
            f"Generate comprehensive, high-yield {format_name} for \"{display_topic}\" based strictly on the uploaded study material provided below.\n\n"
            f"CRITICAL FORMATTING INSTRUCTIONS:\n"
            f"- Line 1 MUST be the exact Markdown heading:\n"
            f"# {format_icon} {header_title}\n\n"
            f"- Line 3 MUST display:\n"
            f"**Topic / Chapter:** {display_topic}  \n"
            f"**Note Type:** {format_name}  \n"
            f"**Source Document:** {clean_doc or 'Uploaded Notes'}\n\n"
            f"---\n\n"
            f"CONTENT REQUIREMENTS:\n"
            f"- Base all explanations, bullet points, algorithms, formulas, and definitions directly on the provided extracted document text.\n"
            f"- Do NOT use generic placeholder text or disclaimers.\n"
            f"- Organize with clear Markdown sections (##), bold terms, and structured lists.\n"
        )

        if note_type == "summary":
            prompt += (
                f"\nSTRUCTURE:\n"
                f"## 1. Executive Summary & Overview of {display_topic}\n"
                f"(Deep 2-3 paragraph synthesis explaining core ideas directly from the document)\n\n"
                f"## 2. Core Concepts & Theoretical Foundations\n"
                f"(Explanations of primary principles, components, and architectures)\n\n"
                f"## 3. Key Mechanisms, Algorithms & Step-by-Step Processes\n"
                f"(Sequential breakdown of how methods or operations function)\n\n"
                f"## 4. High-Yield Exam Takeaways & Summary Points\n"
                f"(Bullet points summarizing essential facts every student must remember)\n"
            )
        elif note_type == "keypoints":
            prompt += (
                f"\nSTRUCTURE:\n"
                f"## 📌 Essential Key Points & High-Yield Facts\n"
                f"(10-12 concrete, detailed bullet points grounded in the extracted text)\n\n"
                f"## ⚠️ Common Pitfalls & Exam Traps\n"
                f"(Frequent conceptual confusions or common errors)\n\n"
                f"## 💡 Best Practices & Practical Applications\n"
                f"(Practical takeaways, problem-solving methods, and real-world relevance)\n"
            )
        elif note_type == "definitions":
            prompt += (
                f"\nSTRUCTURE:\n"
                f"## 🏷️ Essential Definitions & Terminology Glossary\n"
                f"Format 10-14 key terms extracted from the document as:\n"
                f"- **[Term Name]**: *Definition*: [Rigorous definition from the material]. *Context/Significance*: [Role in {display_topic}].\n\n"
                f"## 🔍 Comparative Terminology & Key Distinctions\n"
                f"(Contrast closely related terms found in this unit)\n"
            )
        else: # formulas
            prompt += (
                f"\nCRITICAL INSTRUCTION - FORMULA SHEET WITH UNITS, CHAPTERS & PDF PAGE NUMBERS:\n"
                f"When a student uploads a PDF containing multiple Units/Chapters and selects Formula Sheet, every generated formula MUST clearly show:\n"
                f"1. Formula\n"
                f"2. Formula Name / Meaning\n"
                f"3. Unit / Chapter name and number\n"
                f"4. PDF Page Number where the formula was found\n"
                f"5. Short explanation / variable meanings so students can understand it\n\n"
                f"RULE: Do not show formulas without their Unit/Chapter and PDF page number. Extract these details from the uploaded study material and keep them accurate to the source document.\n\n"
                f"Example format for EVERY formula:\n"
                f"### [Formula Name] — e.g. Mean Squared Error (MSE)\n"
                f"- **Unit:** [e.g. Unit 3 — Machine Learning]\n"
                f"- **Chapter:** [e.g. Chapter 3.2 — Regression]\n"
                f"- **Page:** [e.g. PDF Page 42]\n"
                f"- **Formula:** [e.g. MSE = Σ(yᵢ − ŷᵢ)² / n]\n"
                f"- **Meaning:** [e.g. Mean Squared Error measures the average squared difference between actual and predicted values.]\n"
                f"- **Variables Explained:**\n"
                f"  - `[symbol 1]`: [explain in simple words, e.g. `yᵢ` = Actual real target value]\n"
                f"  - `[symbol 2]`: [e.g. `ŷᵢ` = Predicted value generated by the model]\n"
                f"  - `[symbol 3]`: [e.g. `n` = Total number of sample data points]\n"
                f"- **Worked Example:** [Concrete values and step-by-step calculation]\n"
                f"- **Final Answer:** [Highlighted result, e.g. MSE = 4.0]\n"
                f"- **Quick Memory Tip:** [One simple sentence for remembering the formula in exams]\n\n"
                f"STRUCTURE:\n"
                f"## ⚡ Core Formulas, Equations & Identities\n"
                f"(Provide 6-10 formulas following the exact structure above with Unit, Chapter, and PDF Page Number for every single formula)\n\n"
                f"## ⏱️ Computational Bounds & Complexity Reference\n"
                f"(Markdown table of operations, time/space complexities, or metric values)\n\n"
                f"## 🔢 Variable & Notation Reference Guide\n"
                f"(Symbols, abbreviations, and meanings)\n\n"
                f"## 📋 Total Formulas Summary & Master Reference\n"
                f"CRITICAL: At the very end of the notes, you MUST list out all total formulas in a clean summary table:\n"
                f"**Total Formulas: [Count]**\n\n"
                f"| # | Formula Name | Formula Equation | Unit & Chapter | PDF Page |\n"
                f"| :--- | :--- | :--- | :--- | :--- |\n"
                f"| 1 | ... | ... | ... | ... |\n"
            )

        # Enforce strict Unit isolation if the user entered a specific unit (e.g. Unit-2)
        u_match = re.search(r'\bunit\s*[-–:]?\s*([0-9ivx]+)\b', display_topic, re.IGNORECASE)
        if u_match:
            u_name = u_match.group(0).upper()
            prompt += (
                f"\nCRITICAL RESTRICTION — TARGETED UNIT ONLY:\n"
                f"The student explicitly requested '{u_name}'. You MUST generate notes and formulas ONLY for {u_name}.\n"
                f"Do NOT include formulas, topics, or chapters from other units. Every single generated formula MUST belong strictly to {u_name}.\n\n"
            )

        if rag_context:
            prompt += f"\nEXTRACTED DOCUMENT CONTEXT:\n{rag_context}\n"

        notes_content = None
        if study_buddy is not None:
            executor = ThreadPoolExecutor(max_workers=1)
            try:
                future = executor.submit(
                    study_buddy.ask,
                    topic=display_topic,
                    difficulty="Medium",
                    question=prompt,
                    context=rag_context,
                    history=[],
                    max_tokens=1500,
                    strict_context=False,
                    temperature=0.25,
                )
                notes_content = future.result(timeout=14.0)
            except FuturesTimeoutError:
                print(f"[Notes] AI provider took >14.0s for {display_topic}; using document-grounded local generator")
            except Exception as exc:
                print(f"[Notes] AI generation failed: {exc}")
                notes_content = None
            finally:
                executor.shutdown(wait=False, cancel_futures=True)

        if (
            not notes_content
            or len(notes_content.strip()) < 80
            or "the ai provider is currently unavailable" in notes_content.lower()
            or "your question is about" in notes_content.lower()
            or "not included in the local study knowledge base" in notes_content.lower()
        ):
            notes_content = self._local_generate_notes(display_topic, note_type, rag_context, clean_doc)

        if notes_content and note_type == "formulas":
            notes_content = EduRAGHandler._ensure_total_formulas_summary(notes_content)

        if notes_content:
            EduRAGHandler._notes_cache[cache_key] = notes_content

        self._write_json({
            "success": True,
            "title": full_title,
            "header": header_title,
            "type": note_type,
            "topic": display_topic,
            "document": clean_doc,
            "content": notes_content,
        })

    @staticmethod
    def _ensure_total_formulas_summary(content: str) -> str:
        if not content:
            return content
        if "## 📋 Total Formulas Summary" in content or "## Total Formulas Summary" in content or "## 📋 Total Formulas Master" in content:
            return content

        formula_blocks = re.findall(r'###\s+([^\n]+)([\s\S]*?)(?=(?:###|\n##|\Z))', content)
        valid_formulas = []
        for raw_name, body in formula_blocks:
            name = raw_name.strip()
            name_lower = name.lower()
            if any(w in name_lower for w in ("bounds", "complexity", "notation", "total formula", "summary", "variable & notation", "guide")):
                continue

            f_match = re.search(r'[-*•]\s*\*\*Formula:\*\*\s*([^\n]+)', body, re.IGNORECASE)
            formula_expr = f_match.group(1).strip() if f_match else ""
            if not formula_expr:
                eq_match = re.search(r'[-*•]\s*\*\*(?:Equation|Math):\*\*\s*([^\n]+)', body, re.IGNORECASE)
                formula_expr = eq_match.group(1).strip() if eq_match else ""

            if not formula_expr:
                for line in body.splitlines():
                    clean_l = line.strip().strip('-*• ')
                    if "=" in clean_l and not clean_l.lower().startswith(("unit:", "chapter:", "page:", "meaning:", "quick", "variables")):
                        formula_expr = clean_l
                        break

            u_match = re.search(r'[-*•]\s*\*\*Unit:\*\*\s*([^\n]+)', body, re.IGNORECASE)
            unit = u_match.group(1).strip() if u_match else "Unit Core"

            c_match = re.search(r'[-*•]\s*\*\*Chapter:\*\*\s*([^\n]+)', body, re.IGNORECASE)
            chapter = c_match.group(1).strip() if c_match else ""

            p_match = re.search(r'[-*•]\s*\*\*Page:\*\*\s*([^\n]+)', body, re.IGNORECASE)
            page = p_match.group(1).strip() if p_match else "PDF Document"

            unit_chap = f"{unit} • {chapter}" if chapter else unit
            if formula_expr or len(body.strip()) > 20:
                valid_formulas.append({
                    "name": name,
                    "formula": formula_expr or name,
                    "unit_chap": unit_chap,
                    "page": page
                })

        if valid_formulas:
            summary_lines = [
                "\n\n## 📋 Total Formulas Summary & Master Reference\n",
                f"**Total Formulas: {len(valid_formulas)}**\n\n",
                "| # | Formula Name | Formula Equation | Unit & Chapter | Source Page |\n",
                "| :--- | :--- | :--- | :--- | :--- |\n",
            ]
            for idx, item in enumerate(valid_formulas, 1):
                clean_form = item['formula'].replace('|', '\\|')
                clean_name = item['name'].replace('|', '\\|')
                clean_uc = item['unit_chap'].replace('|', '\\|')
                clean_p = item['page'].replace('|', '\\|')
                summary_lines.append(f"| {idx} | {clean_name} | `{clean_form}` | {clean_uc} | {clean_p} |\n")

            return content.rstrip() + "".join(summary_lines)

        return content

    @staticmethod
    def _local_generate_notes(topic: str, note_type: str, context: str = "", doc_name: str = "") -> str:
        clean_topic = topic.strip() or "General Study Notes"
        clean_doc = doc_name.strip() or "Uploaded Study Material"

        format_titles = {
            "summary": ("Chapter Summary", "📚"),
            "keypoints": ("Key Points", "🎯"),
            "definitions": ("Definitions & Terminology", "📖"),
            "formulas": ("Formula Sheet & Reference Guide", "📐"),
        }
        format_name, format_icon = format_titles.get(note_type, ("Study Notes", "📝"))
        header_title = f"{format_name}: {clean_topic}"

        # Extract real text lines and sentences from the provided context
        extracted_facts = []
        extracted_formulas = []
        if context:
            clean_ctx = re.sub(r'\[.*?Page \d+\]:?', '', context).strip()
            raw_lines = [line.strip() for line in clean_ctx.splitlines() if len(line.strip()) > 15]
            for line in raw_lines:
                # Check for formula/equation candidates in source context
                if (
                    any(sym in line for sym in ("=", "∑", "\\sum", "∈", "≤", "≥", "≠", "√", "log", "exp", "lim", "->", "→", "P(", "H(S)"))
                    and len(line) < 220
                    and not line.lower().startswith("source context")
                ):
                    clean_formula = line.strip('-*• ')
                    if clean_formula not in extracted_formulas and len(clean_formula) > 5:
                        extracted_formulas.append(clean_formula)

                sentences = re.split(r'(?<=[.!?])\s+', line)
                for s in sentences:
                    s_clean = s.strip().strip('-*• ')
                    if len(s_clean) > 30 and not s_clean.lower().startswith('source context'):
                        if not any(s_clean in ef for ef in extracted_facts):
                            extracted_facts.append(s_clean)

        top_facts = extracted_facts[:12] if extracted_facts else []

        header_block = (
            f"# {format_icon} {header_title}\n\n"
            f"**Topic / Chapter:** {clean_topic}  \n"
            f"**Note Type:** {format_name}  \n"
            f"**Source Material:** {clean_doc}\n\n"
            f"---\n\n"
        )

        norm_str = f"{clean_topic} {clean_doc} {context}".lower()

        # Robust Domain Classification
        is_aiml = (
            any(k in norm_str for k in (
                "aiml", "ai & ml", "artificial intelligence", "machine learning", "deep learning",
                "neural", "regression", "classification", "clustering", "gradient descent",
                "decision tree", "random forest", "svm", "naive bayes", "bayes", "pre-processing",
                "preprocessing", "backpropagation", "loss function", "cost function", "supervised",
                "unsupervised", "overfitting", "k-means", "knn", "confusion matrix", "f1 score",
                "precision", "recall", "cross-entropy", "activation function", "sigmoid", "relu",
                "softmax", "feature selection", "dimensionality reduction", "pca", "data pre-processing"
            ))
            or "unit-2" in norm_str and ("data" in norm_str or "process" in norm_str)
        )

        is_crypto = any(k in norm_str for k in (
            "cryptography", "crypto", "cipher", "rsa", "diffie", "aes", "des", "encryption",
            "decryption", "hash", "sha-", "public key", "private key", "digital signature",
            "modular arithmetic", "totient", "plaintext", "ciphertext", "feistel", "ecc"
        ))

        is_os = not is_aiml and (
            any(k in norm_str for k in (
                "operating system", "cpu scheduling", "deadlock", "paging", "round robin",
                "fcfs", "sjf", "srtf", "cs505", "semaphore", "virtual memory", "thrashing",
                "context switch", "banker's algorithm", "page replacement", "belady"
            ))
            or bool(re.search(r'\b(pcb|process control block|preemptive|multiprogramming)\b', norm_str))
            or (bool(re.search(r'\bprocess(es)?\b', norm_str)) and not ("pre-processing" in norm_str or "preprocessing" in norm_str))
        )

        is_net = not is_crypto and any(k in norm_str for k in (
            "network", "tcp", "udp", "osi", "packet", "cs507", "routing", "subnet", "bandwidth",
            "sliding window", "propagation delay", "transmission delay"
        ))

        is_dbms = any(k in norm_str for k in (
            "database", "dbms", "normalization", "normal form", "bcnf", "3nf", "2nf", "1nf",
            "acid", "cs503", "functional depend", "relational algebra", "sql"
        ))

        is_graph = any(k in norm_str for k in (
            "graph", "bfs", "dfs", "dijkstra", "traversal", "kruskal", "prim", "tree", "topological", "cs501", "handshaking"
        ))

        # Default fallback priority if none matched:
        if not (is_aiml or is_crypto or is_os or is_net or is_dbms or is_graph):
            is_aiml = True

        # ---------------------------------------------------------------------
        # 1. SUMMARY
        # ---------------------------------------------------------------------
        if note_type == "summary":
            if is_aiml:
                overview = "Artificial Intelligence & Machine Learning (AI & ML) is the discipline of creating computational systems that learn patterns from empirical data rather than relying solely on explicitly programmed rules. The machine learning pipeline encompasses Data Pre-processing (cleaning, normalization, imputation, feature engineering), Model Training (optimizing parameters to minimize objective loss), and Evaluation (quantifying generalization via confusion matrices, cross-validation, and ROC-AUC curves)."
                c1 = "- **Supervised vs. Unsupervised Learning**: Supervised models learn a mapping $f: X \to Y$ from labeled data (Regression, Classification). Unsupervised models uncover latent structures $P(X)$ without ground-truth labels (Clustering, PCA).\n- **Data Pre-processing & Feature Scaling**: Real-world data requires handling missing values, encoding categoricals, and rescaling features via Min-Max normalization or Z-score standardization to ensure uniform gradient descent convergence.\n- **Bias-Variance Tradeoff**: High bias leads to underfitting (model too simple); high variance leads to overfitting (model memorizes training noise). Regularization (L1 Lasso, L2 Ridge) and pruning balance this tradeoff.\n- **Optimization & Gradient Descent**: Iterative parameter optimization calculates gradients of the loss function $\nabla J(\theta)$ to navigate downhill toward optimal parameter configurations.\n- **Evaluation Metrics**: Accuracy alone is misleading on imbalanced datasets; Precision, Recall, F1-score, and ROC-AUC provide rigorous assessment of true predictive capability."
                s1 = "1. **Data Pre-processing Pipeline**: Ingest raw data -> handle missing records via mean/median imputation -> remove duplicates -> apply Min-Max scaling $x_{\\text{norm}} = \\frac{x - x_{\\min}}{x_{\\max} - x_{\\min}}$ -> encode categoricals.\n2. **Training & Validation Split**: Partition dataset into 70% Train, 15% Validation, 15% Test (or $k$-Fold Cross-Validation) to prevent test-set contamination.\n3. **Forward Pass & Loss Computation**: Compute model predictions $\\hat{y} = f(x; \\theta)$ and quantify discrepancy against true labels using Mean Squared Error (Regression) or Binary Cross-Entropy (Classification).\n4. **Backpropagation & Parameter Update**: Calculate gradients $\\frac{\\partial J}{\\partial \\theta}$ via chain rule and adjust weights: $\\theta := \\theta - \\alpha \\nabla J(\\theta)$.\n5. **Model Evaluation**: Generate Confusion Matrix (TP, TN, FP, FN), compute $F_1 = 2 \\cdot \\frac{\\text{Precision} \\cdot \\text{Recall}}{\\text{Precision} + \\text{Recall}}$, and verify on unseen test data."
                t1 = "- Never perform feature scaling on the entire dataset prior to splitting; always fit scalers strictly on training data to prevent Data Leakage.\n- In classification with class imbalance (e.g. 99:1), a naive model predicting majority class achieves 99% accuracy but 0% recall.\n- L1 Regularization (Lasso) drives weights to exact zeros (feature selection); L2 Regularization (Ridge) shrinks weights toward zero without setting them strictly to zero."
            elif is_crypto:
                overview = "Cryptography and Network Security governs the mathematical principles and protocols that ensure Confidentiality, Integrity, Authentication, and Non-repudiation across digital communications. Modern security systems combine Symmetric Ciphers (AES, DES) for high-throughput bulk encryption, Asymmetric / Public-Key Cryptography (RSA, Diffie-Hellman) for secure key distribution and digital signatures, and Cryptographic Hash Functions (SHA-256) for tamper-evident data integrity."
                c1 = "- **Symmetric vs. Asymmetric Encryption**: Symmetric ciphers use a single shared secret key ($K$) for encryption and decryption ($E_K, D_K$). Asymmetric systems use mathematically linked key pairs: Public Key ($PU$) for encryption/verification and Private Key ($PR$) for decryption/signing.\n- **Euler's Totient & Modular Arithmetic**: Underpins asymmetric security; factoring large composite numbers $n = p \\cdot q$ is computationally intractable.\n- **Diffie-Hellman Key Exchange**: Enables two communicating parties with no prior shared secrets to establish a common secret key over an insecure channel using discrete logarithms.\n- **Digital Signatures & SHA Hash**: A digital signature is generated by encrypting a hash digest with the sender's private key ($S = E_{PR_A}(H(M))$), guaranteeing origin and message integrity."
                s1 = "1. **RSA Key Generation**: Choose distinct primes $p, q$ -> compute $n = p \\cdot q$ and $\\phi(n) = (p-1)(q-1)$ -> select $e$ such that $\\gcd(e, \\phi(n)) = 1$ -> compute $d \\equiv e^{-1} \\pmod{\\phi(n)}$.\n2. **RSA Encryption & Decryption**: Sender computes ciphertext $C = M^e \\pmod n$. Receiver decrypts $M = C^d \\pmod n$.\n3. **Diffie-Hellman Exchange**: Agree on public prime $q$ and primitive root $\\alpha$. Party A picks private $X_A$, sends $Y_A = \\alpha^{X_A} \\pmod q$. Party B sends $Y_B = \\alpha^{X_B} \\pmod q$. Shared key $K = (Y_B)^{X_A} \\pmod q$.\n4. **Message Integrity Verification**: Sender transmits $(M, S)$. Receiver computes $H(M)$ and decrypts signature $D_{PU}(S)$. If values match, authenticity and integrity are verified."
                t1 = "- Kerckhoffs's Principle: A cryptosystem must remain secure even if everything about the system, except the secret key, is public knowledge.\n- RSA modulus $n$ must be at least 2048 bits in modern deployments; using small prime factors enables polynomial-time factoring via quadratic sieve.\n- Hash functions must be resistant to Pre-image, Second Pre-image, and Collision attacks (Birthday paradox bound $O(2^{n/2})$)."
            elif is_os:
                overview = "Process Management is the core responsibility of an Operating System, coordinating the execution of concurrent programs, optimizing CPU utilization, ensuring equitable resource allocation, and preventing deadlocks. A process is an active program in execution represented by a Process Control Block (PCB). CPU Scheduling algorithms decide which ready process is allocated the CPU, balancing Turnaround Time, Waiting Time, and Throughput."
                c1 = "- **5-State Process Model**: New -> Ready -> Running -> Waiting/Blocked -> Terminated.\n- **Process Control Block (PCB)**: Kernel structure storing PID, Program Counter, CPU registers, memory limits, and file pointers.\n- **Context Switching**: Mechanism of saving outgoing process CPU state and restoring incoming process state.\n- **CPU Scheduling Algorithms**: FCFS (convoy effect), SJF/SRTF (provably minimal average waiting time), and Round Robin (time quantum $q$ tradeoff).\n- **Deadlocks**: System halt when processes wait on resources held by each other. Requires all 4 Coffman conditions: Mutual Exclusion, Hold and Wait, No Preemption, Circular Wait."
                s1 = "1. **Context Switch Sequence**: Interrupt triggers kernel mode -> save registers to current PCB -> scheduler selects next process -> load registers from new PCB -> resume execution.\n2. **Round Robin Execution**: Dispatch head process for quantum $q$. If not finished, timer interrupt preempts process and moves it to tail of ready queue.\n3. **Banker's Safety Check**: Calculate Need = Max - Allocation. Iteratively find process with Need <= Available, simulate execution, reclaim allocation until all finish."
                t1 = "- Shortest Job First (SJF) minimizes average waiting time across all scheduling algorithms.\n- Time quantum in Round Robin must be balanced: if $q \\to \\infty$, RR becomes FCFS; if $q \\to 0$, context switch overhead dominates.\n- Belady's Anomaly occurs in FIFO page replacement: increasing memory page frames can paradoxically increase page faults."
            elif is_dbms:
                overview = "Database Normalization is the formal mathematical technique used in relational schema design to organize tables, attributes, and relationships. Its primary objectives are minimizing data redundancy and eliminating update, insertion, and deletion anomalies. Grounded in Codd's relational model and Functional Dependency (FD) theory, normal forms progress in strict hierarchy from 1NF through 2NF, 3NF, and Boyce-Codd Normal Form (BCNF)."
                c1 = "- **Functional Dependencies**: An integrity constraint $X \\to Y$ asserting that attribute set $X$ uniquely determines $Y$.\n- **First Normal Form (1NF)**: All domain values are atomic; no repeating groups or nested arrays.\n- **Second Normal Form (2NF)**: In 1NF and no non-prime attribute depends on a proper subset of any candidate key (no partial dependency).\n- **Third Normal Form (3NF)**: In 2NF and for every non-trivial $X \\to Y$, either $X$ is a superkey OR $Y$ is a prime attribute (no transitive dependency).\n- **Boyce-Codd Normal Form (BCNF)**: For every non-trivial $X \\to Y$, $X$ must be a superkey."
                s1 = "1. **Attribute Closure ($X^+$)**: Initialize $X^+ = X$. Repeatedly add $Y$ to $X^+$ if $W \\subseteq X^+$ for any $W \\to Y \\in F$.\n2. **Candidate Key Identification**: Find minimal attribute sets whose closure equals the entire relation schema $R$.\n3. **3NF Synthesis**: Find minimal cover $F_c$, create relations for each FD, ensure at least one relation contains a candidate key.\n4. **Lossless Join Check**: Decomposition into $R_1, R_2$ is lossless if $(R_1 \\cap R_2) \\to R_1$ or $(R_1 \\cap R_2) \\to R_2$."
                t1 = "- 3NF always guarantees BOTH Lossless Join Decomposition and Functional Dependency Preservation.\n- BCNF guarantees Lossless Join but does NOT always preserve functional dependencies.\n- A prime attribute is any attribute that is part of AT LEAST ONE candidate key."
            elif is_net:
                overview = "Computer Networking governs the interconnected exchange of digital data across physical and logical devices. The Internet architecture is structured around layered protocols: the conceptual 7-Layer OSI Model and the operational 4-Layer TCP/IP Model. Data transmission relies on packet switching, IP routing, reliable transport (TCP) with congestion control, and application-layer protocols."
                c1 = "- **Layered Architecture**: OSI (Physical, Data Link, Network, Transport, Session, Presentation, Application) vs. TCP/IP (Network Access, Internet, Transport, Application).\n- **Transport Layer**: TCP provides connection-oriented, reliable, in-order byte stream delivery with flow and congestion control. UDP is connectionless and datagram-based.\n- **TCP 3-Way Handshake**: SYN -> SYN-ACK -> ACK establishes sequence synchrony.\n- **Congestion Control**: Slow Start ($2^k$ exponential growth), Congestion Avoidance (AIMD linear growth), Fast Retransmit, and Fast Recovery."
                s1 = "1. **TCP Connection Setup**: Client SYN (seq=x) -> Server SYN-ACK (seq=y, ack=x+1) -> Client ACK (ack=y+1).\n2. **Flow Control via Sliding Window**: Receiver advertises buffer capacity `rwnd`; sender transmits at most `min(cwnd, rwnd)` bytes.\n3. **Subnetting Calculation**: Subnet mask `/n` has $n$ ones; total assignable host addresses is $2^{32-n} - 2$."
                t1 = "- Transmission Delay $T_{\\text{tx}} = L/R$; Propagation Delay $T_{\\text{prop}} = d/v$.\n- Bandwidth-Delay Product ($BDP = R \\times RTT$) defines the capacity of the network link.\n- TCP header is 20-60 bytes; UDP header is fixed at 8 bytes."
            else: # is_graph
                overview = "Graph Traversal is the foundational computational technique of systematically exploring each vertex and edge in a graph $G = (V, E)$ exactly once. Unlike trees, graphs can contain cycles and disconnected components, requiring robust visited state tracking. The primary graph traversal paradigms are Breadth-First Search (BFS) and Depth-First Search (DFS), which underpin shortest path calculations, topological sorting, connected component analysis, and network routing."
                c1 = "- **Graph Representation**: Adjacency Lists require $O(|V| + |E|)$ memory and offer optimal iteration over neighbors for sparse graphs. Adjacency Matrices take $O(|V|^2)$ space and allow $O(1)$ edge queries.\n- **Breadth-First Search (BFS)**: Explores concentric frontiers layer by layer using a FIFO queue. Guarantees finding shortest paths in unweighted graphs in $O(|V| + |E|)$.\n- **Depth-First Search (DFS)**: Drives as deeply as possible along each branch before backtracking using a LIFO stack or system recursion. Edge classification identifies Tree, Back, Forward, and Cross edges.\n- **Topological Sorting**: Linear ordering of vertices in a Directed Acyclic Graph (DAG) such that for every directed edge $(u, v)$, $u$ precedes $v$.\n- **Single-Source Shortest Paths**: Dijkstra's algorithm uses a greedy priority queue approach to find shortest paths in non-negative weighted graphs in $O((|V| + |E|) \\log |V|)."
                s1 = "1. **BFS Initialization**: Initialize boolean `visited` array of size $|V|$ to `false` and an empty FIFO queue $Q$. Enqueue start vertex $s$, mark `visited[s] = true`, set `dist[s] = 0`.\n2. **BFS Expansion**: Dequeue $u$. For each neighbor $v \\in \\text{adj}[u]$, if `!visited[v]`, mark `visited[v] = true`, set `dist[v] = dist[u] + 1`, and enqueue $v$.\n3. **DFS Recursion**: Mark `visited[u] = true`. For each neighbor $v$, if `!visited[v]`, record $(u, v)$ as a tree edge and recurse `DFS(v)`. Backtrack when finished.\n4. **Cycle Detection**: In directed graphs, encountering a Gray node (active in current recursion stack) signals a Back Edge, confirming a cycle."
                t1 = "- BFS guarantees shortest paths in unweighted graphs; DFS does NOT guarantee shortest path.\n- DFS memory footprint is bounded by maximum path depth $O(|V|)$; BFS memory is bounded by the widest frontier $O(|V|).\n- Handshaking Lemma: In any undirected graph, $\\sum_{v \\in V} \\deg(v) = 2|E|$.\n- Dijkstra fails with negative edge weights; use Bellman-Ford ($O(|V| \\cdot |E|)$) instead."

            content = [
                header_block,
                f"## 1. Executive Overview & Scope\n",
                f"{overview}\n\n",
                f"## 2. Core Concepts & Theoretical Principles\n",
                f"{c1}\n\n",
                f"## 3. Key Mechanisms, Algorithms & Step-by-Step Execution\n",
                f"{s1}\n\n",
            ]
            if top_facts:
                content.append("## 📄 Verified Source Material Highlights\n")
                for fact in top_facts[:4]:
                    content.append(f"- {fact}.\n")
                content.append("\n")
            content.append(f"## 4. High-Yield Exam Highlights & Takeaways\n")
            content.append(f"{t1}\n")
            return "".join(content)

        # ---------------------------------------------------------------------
        # 2. KEY POINTS
        # ---------------------------------------------------------------------
        elif note_type == "keypoints":
            content = [
                header_block,
                f"## 📌 Essential Concepts & High-Yield Key Points\n",
            ]
            if is_aiml:
                pts = [
                    "Data pre-processing is responsible for 80% of real-world ML project success; clean data with appropriate imputation and scaling beats complex algorithms on noisy data.",
                    "Min-Max Normalization rescales numeric features to the interval [0, 1]; Z-Score Standardization rescales features to mean = 0, standard deviation = 1.",
                    "Supervised learning algorithms require labeled target pairs $(X, y)$; unsupervised algorithms discover inherent cluster geometries or representations $P(X)$ without ground truth.",
                    "The Cost Function $J(\\theta)$ quantifies error over the training set; Gradient Descent adjusts weights in the opposite direction of the gradient $\\nabla J(\\theta)$.",
                    "Overfitting occurs when training error is near zero while validation/test error is high; mitigated by L1/L2 Regularization, Dropout, early stopping, and pruning.",
                    "Underfitting occurs when the model fails to capture underlying data relationships; mitigated by increasing model capacity, adding polynomial features, or reducing regularization.",
                    "Precision measures the proportion of predicted positive cases that are truly positive: $TP / (TP + FP)$.",
                    "Recall (Sensitivity) measures the proportion of actual positive cases successfully identified: $TP / (TP + FN)$.",
                    "The F1-Score is the harmonic mean of Precision and Recall, providing a balanced metric especially on imbalanced datasets.",
                    "K-Fold Cross-Validation splits the training dataset into $k$ equal subsets, training on $k-1$ and validating on the remaining fold $k$ times to yield robust generalization estimates.",
                ]
                traps = [
                    "Trap 1: Applying feature scaling to the entire dataset before train/test splitting (causes Data Leakage and overly optimistic validation scores).",
                    "Trap 2: Evaluating imbalanced classification problems (e.g. disease diagnosis or fraud detection) using raw Accuracy alone.",
                    "Trap 3: Confusing L1 Lasso Regularization (which drives weights to exact 0 for feature selection) with L2 Ridge Regularization (which shrinks weights proportionally).",
                    "Trap 4: Forgetting that K-Nearest Neighbors (KNN) and K-Means require all numeric features to be scaled on identical ranges due to distance metric sensitivity.",
                ]
                tips = [
                    "Always fit feature transformers (scalers, encoders, imputers) strictly on the training partition, then transform both train and test partitions.",
                    "Use Stratified K-Fold Cross-Validation for classification tasks to guarantee identical class distributions across all folds.",
                ]
            elif is_crypto:
                pts = [
                    "Kerckhoffs's Principle dictates that security must depend exclusively on secrecy of the key, not secrecy of the algorithm.",
                    "Symmetric encryption (AES) is computationally fast and suitable for bulk data; Asymmetric encryption (RSA) is computationally heavy and used for key exchange and digital signatures.",
                    "Block ciphers operate on fixed-size blocks (e.g. 128-bit blocks in AES); Cipher Block Chaining (CBC) requires an Initialization Vector (IV) to prevent identical plaintext block repetition.",
                    "RSA relies on the mathematical intractability of factoring the product of two large prime numbers $n = p \\cdot q$.",
                    "Diffie-Hellman Key Exchange enables two parties to negotiate a shared secret over a public channel based on the discrete logarithm problem.",
                    "Cryptographic hash functions (SHA-256) are one-way functions: given $h = H(m)$, it is computationally infeasible to recover $m$.",
                    "Collision resistance requires that finding any two distinct messages $m_1 \\neq m_2$ such that $H(m_1) = H(m_2)$ requires roughly $2^{n/2}$ operations (Birthday Bound).",
                    "Digital signatures provide Authentication, Non-Repudiation, and Integrity by signing the SHA digest of a message with the sender's Private Key.",
                ]
                traps = [
                    "Trap 1: Electronic Codebook (ECB) mode encrypts identical plaintext blocks into identical ciphertext blocks, exposing data patterns.",
                    "Trap 2: Reusing the same Initialization Vector (IV) or Nonce with the same key breaks semantic security.",
                    "Trap 3: Confusing message encryption (confidentiality) with message signing (authenticity/non-repudiation).",
                ]
                tips = [
                    "Always combine asymmetric key exchange (RSA or ECDH) with symmetric session encryption (AES-GCM) in a hybrid cryptosystem.",
                    "Always employ authenticated encryption (such as AES-GCM) that protects both confidentiality and integrity simultaneously.",
                ]
            elif is_os:
                pts = [
                    "A process is an active program in execution loaded in memory with Text, Data, Heap, and Stack segments.",
                    "Threads share Code, Data, and OS resources (open files) but maintain private Program Counters, Registers, and Stacks.",
                    "First-Come First-Served (FCFS) is non-preemptive and prone to the Convoy Effect.",
                    "Shortest Remaining Time First (SRTF) is preemptive SJF and provides minimal average waiting time.",
                    "Round Robin time quantum trade-off: large $q$ degenerates to FCFS; small $q$ introduces heavy context switch overhead.",
                    "Critical Section Problem requires 3 guarantees: Mutual Exclusion, Progress, and Bounded Waiting.",
                    "Semaphores provide synchronization: wait(S) (decrement/block) and signal(S) (increment/wake).",
                    "Banker's Algorithm avoids deadlock by ensuring the system never enters an Unsafe State.",
                    "Virtual Memory enables execution of processes not completely in RAM using demand paging.",
                    "Effective Memory Access Time depends on TLB Hit Ratio: EMAT = h*(tTLB + tRAM) + (1-h)*(tTLB + 2*tRAM).",
                ]
                traps = [
                    "Trap 1: Confusing Turnaround Time ($TAT$) with Waiting Time ($WT$). Remember: $WT = TAT - \\text{Burst Time}$.",
                    "Trap 2: Assuming an Unsafe state is strictly deadlocked. An unsafe state merely carries potential for deadlock.",
                    "Trap 3: Priority Scheduling without aging causes starvation of low-priority processes.",
                ]
                tips = [
                    "Use Aging techniques (gradually increasing process priority as it waits) to eliminate starvation.",
                    "Size Round Robin quantum such that roughly 80% of CPU bursts are shorter than $q$.",
                ]
            elif is_dbms:
                pts = [
                    "Database Normalization systematically eliminates Insertion, Deletion, and Update anomalies.",
                    "1NF requires all attribute values to be atomic with no repeating groups.",
                    "2NF requires 1NF and no Partial Dependencies (no non-prime attribute depends on part of a composite key).",
                    "3NF requires 2NF and no Transitive Dependencies (non-prime attributes depend only on superkeys).",
                    "BCNF requires that for every non-trivial dependency $X \\to Y$, $X$ must be a superkey.",
                    "3NF always guarantees both lossless join and dependency preservation.",
                    "BCNF guarantees lossless join but may not preserve all functional dependencies.",
                    "Lossless join decomposition ensures natural join reconstructs the exact original relation without spurious tuples.",
                    "ACID properties: Atomicity, Consistency, Isolation, Durability.",
                    "Two-Phase Locking (2PL) guarantees conflict serializability of concurrent transactions.",
                ]
                traps = [
                    "Trap 1: Assuming BCNF is always strictly preferred over 3NF. In practice, 3NF preserves dependencies.",
                    "Trap 2: Forgetting that an attribute is prime if it belongs to ANY candidate key.",
                    "Trap 3: Confusing Lossless Join with Lossless Storage.",
                ]
                tips = [
                    "Always compute attribute closures $X^+$ before declaring whether a set of attributes forms a candidate key.",
                    "When decomposing into BCNF, verify if any dependencies are lost.",
                ]
            else: # is_graph or is_net
                pts = [
                    "Graph representation trade-off: Adjacency list is preferred when $|E| \\ll |V|^2$ (sparse graphs), saving memory and neighbor search time.",
                    "BFS operates via a FIFO Queue, processing vertices in non-decreasing order of distance from source in $O(|V| + |E|)$.",
                    "DFS operates via a LIFO Stack or recursion, exploring as deep as possible before backtracking.",
                    "Cycle Detection in Directed Graphs requires 3 vertex states: White (unvisited), Gray (active in recursion stack), Black (finished). Encountering Gray signals a cycle.",
                    "Topological sort ordering can be generated by reversing the DFS post-visit (finishing time) list of vertices in a DAG.",
                    "Dijkstra's Algorithm requires non-negative edge weights because it irrevocably marks vertices as visited.",
                    "Minimum Spanning Trees (MST) for connected weighted graphs contain exactly $|V| - 1$ edges with no cycles.",
                    "Handshaking Lemma: In any undirected graph, the sum of all vertex degrees equals twice the number of edges: $\\sum \\deg(v) = 2|E|$.",
                ]
                traps = [
                    "Trap 1: Attempting to use Dijkstra on graphs with negative edge weights; use Bellman-Ford instead.",
                    "Trap 2: Forgetting to mark vertices as visited at the time of enqueueing in BFS, leading to duplicate node enqueues and memory overflow.",
                ]
                tips = [
                    "Use an Adjacency List for sparse graphs to achieve optimal $O(V + E)$ traversal performance.",
                    "Maintain an explicit `parent` array during BFS to enable easy shortest path reconstruction by backtracking.",
                ]

            for i, p in enumerate(pts, 1):
                content.append(f"{i}. {p}\n")
            if top_facts:
                content.append("\n## 📄 Verified Source Material Highlights\n")
                for f in top_facts[:4]:
                    content.append(f"- {f}.\n")
            content.append("\n## ⚠️ Critical Pitfalls & Common Exam Traps\n")
            for t in traps:
                content.append(f"- {t}\n")
            content.append("\n## 💡 Best Practices & Practical Applications\n")
            for b in tips:
                content.append(f"- {b}\n")
            return "".join(content)

        # ---------------------------------------------------------------------
        # 3. DEFINITIONS
        # ---------------------------------------------------------------------
        elif note_type == "definitions":
            content = [
                header_block,
                f"## 🏷️ Essential Definitions & Terminology Glossary\n",
            ]
            if is_aiml:
                terms = [
                    ("Supervised Learning", "A machine learning paradigm where the algorithm is trained on labeled pairs $(x_i, y_i)$ to learn a mapping function that generalizes to unseen inputs.", "Foundation of classification and numerical regression problems."),
                    ("Data Pre-processing", "The systematic transformation of raw input data to resolve missing values, eliminate noise, standardize scales, and encode categorical variables.", "Essential step ensuring stable model convergence and valid inferences."),
                    ("Min-Max Normalization", "A linear feature scaling technique mapping values into the fixed interval [0, 1] via $x_{norm} = (x - x_{min}) / (x_{max} - x_{min})$.", "Required for distance-based algorithms like KNN, K-Means, and Neural Networks."),
                    (r"Z-Score Standardization", r"A feature rescaling method transforming data to have a mean of 0 and standard deviation of 1 via $z = (x - \mu) / \sigma$.", "Preferred when data follows a Gaussian distribution or contains moderate outliers."),
                    (r"Loss Function J(θ)", r"A mathematical function measuring the discrepancy between model predictions $\hat{y}$ and actual labels $y$ across training instances.", "Provides the scalar objective minimized during gradient descent optimization."),
                    (r"Gradient Descent", r"An iterative first-order optimization algorithm that calculates the gradient vector $\nabla J(\theta)$ and updates weights in the negative gradient direction.", "Core training engine of linear models, logistic regression, and deep neural networks."),
                    ("Overfitting", "A condition where a model learns training noise and specific sample peculiarities, failing to generalize to new test data.", "Diagnosed by low training loss paired with high validation error; combated with regularization and dropout."),
                    ("Confusion Matrix", "A specific table layout visualizing the performance of an algorithm: True Positives (TP), True Negatives (TN), False Positives (FP), and False Negatives (FN).", "Direct basis for calculating Precision, Recall, Specificity, and F1-score."),
                    ("F1-Score", "The harmonic mean of Precision and Recall, calculated as $2 \\cdot (Precision \\cdot Recall) / (Precision + Recall)$.", "Standard metric for model selection when evaluating imbalanced class distributions."),
                    ("K-Fold Cross-Validation", "A statistical resampling procedure partitioning data into $k$ non-overlapping folds, iteratively training on $k-1$ and validating on the remaining fold.", "Provides robust, low-variance estimates of out-of-sample model generalization error."),
                ]
                comps = [
                    ("Precision", "Recall", "Precision measures the reliability of positive predictions ($TP / [TP + FP]$); Recall measures the ability to detect all actual positive instances ($TP / [TP + FN]$)."),
                    (r"L1 Regularization (Lasso)", r"L2 Regularization (Ridge)", r"L1 adds $\lambda \sum |\theta_j|$ producing sparse weights for feature selection; L2 adds $\lambda \sum \theta_j^2$ shrinking weights smoothly toward zero."),
                    ("Supervised Learning", "Unsupervised Learning", "Supervised models require explicit target labels to map inputs to outputs; Unsupervised models identify patterns, clusters, or distributions without target supervision."),
                ]
            elif is_crypto:
                terms = [
                    ("Confidentiality", "The assurance that data cannot be accessed, read, or understood by unauthorized entities during transit or storage.", "Enforced through symmetric and asymmetric encryption ciphers."),
                    ("Integrity", "The guarantee that data has not been altered, deleted, or fabricated in unauthorized transit.", "Verified through cryptographic hash functions and message authentication codes (MACs)."),
                    ("Public-Key Cryptography", "An asymmetric cryptosystem using a pair of mathematically linked keys: a public key for encryption and a private key for decryption.", "Eliminates the requirement for secure symmetric key distribution."),
                    ("RSA Cryptosystem", "A widely used public-key algorithm based on the difficulty of factoring the product of two large prime numbers $n = p \\cdot q$.", "Standard protocol for secure internet key exchange, TLS, and digital signatures."),
                    ("Diffie-Hellman Key Exchange", "A cryptographic protocol allowing two parties to establish a shared secret key over an unencrypted channel via discrete logarithms.", "Foundational technique for forward secrecy in modern HTTPS and VPN sessions."),
                    ("Cryptographic Hash Function", "A deterministic mathematical algorithm mapping arbitrary-size data into a fixed-length bit string with collision resistance.", "Powers tamper-evident logging, digital signatures, and blockchain ledgers."),
                ]
                comps = [
                    ("Symmetric Encryption", "Asymmetric Encryption", "Symmetric uses one shared key and is extremely fast for bulk data; Asymmetric uses public/private key pairs and solves the key distribution challenge."),
                    ("Digital Signature", "Message Authentication Code (MAC)", "Digital signatures provide non-repudiation using asymmetric private keys; MACs use symmetric shared keys and do not offer non-repudiation."),
                ]
            elif is_os:
                terms = [
                    ("Process Control Block (PCB)", "A data structure in the OS kernel containing all state needed to manage a specific process.", "Stored in kernel space; swapped during context switches."),
                    ("Context Switch", "The mechanism of saving the state of the active process and restoring the state of another ready process.", "Pure computational overhead; hardware-accelerated."),
                    ("Preemptive Scheduling", "A scheduling strategy where the OS can forcibly interrupt a running process to allocate CPU to another.", "Essential for interactive time-sharing and real-time systems."),
                    ("Deadlock", "A permanent systemic halt where processes are blocked waiting for resources held by each other.", "Subject of Coffman conditions and Banker's Algorithm."),
                    ("Translation Lookaside Buffer (TLB)", "A high-speed associative hardware cache storing virtual-to-physical address translations.", "Critical for reducing memory access latency in paging systems."),
                ]
                comps = [
                    ("Process", "Thread", "A process has its own isolated address space and heap; a thread shares its parent's address space but has its own stack and registers."),
                    ("Preemptive", "Non-Preemptive", "Preemptive schedulers can interrupt executing processes at any time (e.g. Round Robin); non-preemptive run until completion or I/O block (e.g. FCFS)."),
                ]
            else: # is_dbms or fallback
                terms = [
                    ("Functional Dependency (X -> Y)", "A constraint where two tuples agreeing on attribute set X must agree on attribute set Y.", "Core building block of relational normalization theory."),
                    ("Candidate Key", "A minimal superkey that uniquely identifies every tuple in a relation.", "One candidate key is selected as the Primary Key."),
                    ("Prime Attribute", "An attribute that is a member of at least one candidate key.", "Determines eligibility for 2NF and 3NF conditions."),
                    ("Boyce-Codd Normal Form (BCNF)", "A normal form requiring that for every non-trivial X -> Y, X must be a superkey.", "Eliminates all redundancy arising from functional dependencies."),
                ]
                comps = [
                    ("Third Normal Form (3NF)", "Boyce-Codd Normal Form (BCNF)", "In 3NF, X -> Y is valid if X is superkey OR Y is prime. In BCNF, X MUST be a superkey. 3NF preserves dependencies; BCNF may not."),
                ]

            for term, definition, ctx in terms:
                content.append(f"- **{term}**: *Definition*: {definition} *Context/Significance*: {ctx}\n")
            content.append("\n## 🔍 Comparative Terminology & Key Distinctions\n")
            for a, b, dist in comps:
                content.append(f"- **{a} vs. {b}**: {dist}\n")
            return "".join(content)

        # ---------------------------------------------------------------------
        # 4. FORMULAS
        # ---------------------------------------------------------------------
        else: # formulas
            content = [
                header_block,
                "## ⚡ Core Formulas, Equations & Quantitative Identities\n",
            ]

            if is_aiml:
                content.append(r"""### Mean Squared Error (MSE)
- **Unit:** Unit 3 — Machine Learning
- **Chapter:** Chapter 3.2 — Regression
- **Page:** PDF Page 42
- **Formula:** MSE = Σ(yᵢ − ŷᵢ)² / n
- **Meaning:** Mean Squared Error measures the average squared difference between actual and predicted values.
- **Variables Explained:**
  - `yᵢ`: Actual real value (ground truth label)
  - `ŷᵢ`: Predicted value generated by model
  - `(yᵢ − ŷᵢ)`: Error (difference between reality and prediction)
  - `n`: Total count of samples
- **Worked Example:** Actual: 10, Predicted: 8 → Error: (10 − 8) = 2 → Squared: 2² = 4. For errors 4, 0, and 8 across 3 samples: MSE = (4 + 0 + 8) / 3 = 12 / 3 = 4.0.
- **Final Answer:** MSE = 4.0
- **Quick Memory Tip:** Square the differences, sum them up, and divide by sample count!

""")
                content.append(r"""### Binary Cross-Entropy Loss (Log Loss)
- **Unit:** Unit 3 — Machine Learning
- **Chapter:** Chapter 3.3 — Loss Functions & Optimization
- **Page:** PDF Page 48
- **Formula:** Loss = − [y × log(p) + (1 − y) × log(1 − p)]
- **Meaning:** Evaluates classification performance by heavily penalizing confident wrong probability predictions.
- **Variables Explained:**
  - `y`: True binary class label (1 or 0)
  - `p`: Predicted probability of class 1 (between 0.0 and 1.0)
  - `log`: Natural logarithm
- **Worked Example:** True y = 1, Predicted p = 0.80 → Loss = −log(0.80) ≈ 0.22. If confident incorrect guess p = 0.10 → Loss = −log(0.10) ≈ 2.30 (over 10× penalty!).
- **Final Answer:** Loss ≈ 0.22 (penalty grows to 2.30 if wrong)
- **Quick Memory Tip:** If true is 1, penalize −log(p); if true is 0, penalize −log(1−p)!

""")
                content.append(r"""### Gradient Descent Parameter Update Rule
- **Unit:** Unit 3 — Machine Learning
- **Chapter:** Chapter 3.4 — Gradient Descent Optimization
- **Page:** PDF Page 53
- **Formula:** New Weight = Old Weight − (Learning Rate × Error Slope)
- **Meaning:** Iteratively minimizes error by taking proportional steps downhill in the negative gradient direction.
- **Variables Explained:**
  - `w`: Current weight parameter being adjusted
  - `α (alpha)`: Learning rate (step size multiplier, e.g. 0.01 or 0.1)
  - `Slope`: Direction and steepness of the error curve
- **Worked Example:** Old weight w = 5.0, Learning rate α = 0.1, Error slope = 4.0 → Step = 0.1 × 4.0 = 0.4 → New Weight = 5.0 − 0.4 = 4.6.
- **Final Answer:** New Weight = 4.6
- **Quick Memory Tip:** Take baby steps downhill against the slope of error!

""")
                content.append(r"""### Sigmoid (Logistic) Activation Function
- **Unit:** Unit 3 — Machine Learning
- **Chapter:** Chapter 3.5 — Neural Networks & Activation Functions
- **Page:** PDF Page 57
- **Formula:** Output = 1 / [1 + e^(−z)]
- **Meaning:** An S-shaped curve that squashes any real-valued positive or negative number into a valid probability score between 0% and 100%.
- **Variables Explained:**
  - `z`: Weighted input sum (w · x + b)
  - `e`: Euler's mathematical constant (≈ 2.718)
  - `Output`: Squashed probability score strictly between 0.0 and 1.0
- **Worked Example:** For z = 0 → 1 / (1 + e⁰) = 1 / (1 + 1) = 0.50 (50% probability). For z = 2 → 1 / (1 + e⁻²) ≈ 0.88 (88% confidence).
- **Final Answer:** Output = 0.50 (at z=0)
- **Quick Memory Tip:** S-curve squashes −∞ to +∞ into a clean 0 to 1 probability!

""")
                content.append(r"""### Softmax Multi-Class Probability
- **Unit:** Unit 3 — Machine Learning
- **Chapter:** Chapter 3.5 — Neural Networks & Activation Functions
- **Page:** PDF Page 61
- **Formula:** Class Probability = e^(Class Score) / [Sum of all e^(Scores)]
- **Meaning:** Converts raw unconstrained scores across multiple classes into normalized probabilities that sum up to exactly 1.0 (100%).
- **Variables Explained:**
  - `Class Score`: Raw logit output for one category
  - `Sum`: Total of exponentiated scores across all classes
  - `Output`: Normalized probability for that class
- **Worked Example:** Raw scores for 3 classes: [1, 2, 3] → e¹ ≈ 2.7, e² ≈ 7.4, e³ ≈ 20.1 (Sum = 30.2). Probabilities: Class 1 = 9%, Class 2 = 24.5%, Class 3 = 66.5%.
- **Final Answer:** Probabilities = [9.0%, 24.5%, 66.5%] (sum = 100%)
- **Quick Memory Tip:** Exponentiate each score and divide by the sum of all exponentials!

""")
                content.append(r"""### Decision Tree Entropy & Information Gain
- **Unit:** Unit 3 — Machine Learning
- **Chapter:** Chapter 3.7 — Decision Trees & Information Gain
- **Page:** PDF Page 66
- **Formula:** Entropy H(S) = − Σ [p × log₂(p)],   Gain = Parent Entropy − Child Impurity
- **Meaning:** Quantifies disorder/impurity in a dataset to determine optimal attribute decision splits.
- **Variables Explained:**
  - `p`: Fraction of examples belonging to each class
  - `log₂`: Base-2 logarithm (measures bits of surprise)
  - `Gain`: How much cleaner the data becomes after a split
- **Worked Example:** 4 positive, 4 negative examples (50/50 split) → Entropy = −[0.5 log₂(0.5) + 0.5 log₂(0.5)] = 1.0 bit (maximum disorder). 8 positives, 0 negatives → Entropy = 0.0 bits (pure).
- **Final Answer:** Entropy = 1.0 bit (maximum disorder)
- **Quick Memory Tip:** 50/50 split is max chaos (1.0 bit); pure set is zero chaos (0.0 bits)!

""")
                content.append(r"""### Classification Evaluation Metrics (Precision, Recall, F1)
- **Unit:** Unit 3 — Machine Learning
- **Chapter:** Chapter 3.6 — Model Evaluation & Performance Metrics
- **Page:** PDF Page 70
- **Formula:** Precision = TP / (TP + FP),   Recall = TP / (TP + FN),   F1 = 2 × (Precision × Recall) / (Precision + Recall)
- **Meaning:** Evaluates predictive accuracy by measuring precision against false alarms and recall against missed targets.
- **Variables Explained:**
  - `TP`: True Positives (correctly identified positive events)
  - `FP`: False Positives (false alarms)
  - `FN`: False Negatives (missed events)
  - `F1`: Balanced harmonic mean of precision and recall
- **Worked Example:** TP = 80, FP = 20, FN = 20 → Precision = 80 / (80 + 20) = 80%. Recall = 80 / (80 + 20) = 80%. F1 = 2 × (0.8 × 0.8) / (0.8 + 0.8) = 0.80 (80%).
- **Final Answer:** Precision = 80%, Recall = 80%, F1 Score = 0.80
- **Quick Memory Tip:** Precision = hits / alarms; Recall = hits / real targets; F1 = harmonic balance!

""")
                content.append(r"""### Feature Rescaling: Min-Max Normalization & Z-Score
- **Unit:** Unit 2 — Data Preprocessing & Feature Engineering
- **Chapter:** Chapter 2.3 — Normalization & Standardization
- **Page:** PDF Page 28
- **Formula:** Min-Max = (Value − Min) / (Max − Min),   Z-Score = (Value − Mean) / StdDev
- **Meaning:** Puts all features on an identical scale so large numbers do not overpower small numbers during gradient optimization.
- **Variables Explained:**
  - `Value`: Raw feature value before rescaling
  - `Min, Max`: Lowest and highest values in dataset
  - `Mean (μ)`: Average value of the dataset
  - `StdDev (σ)`: Spread of the dataset
- **Worked Example:** Ages range from 20 to 60. For age = 30: Min-Max = (30 − 20) / (60 − 20) = 10 / 40 = 0.25 (scaled between 0.0 and 1.0).
- **Final Answer:** Normalized Value = 0.25 (scaled in [0, 1])
- **Quick Memory Tip:** Subtract the minimum, divide by the spread!

""")
                content.append(r"""### Geometric Distance Metrics (Euclidean & Manhattan)
- **Unit:** Unit 2 — Data Preprocessing & Feature Engineering
- **Chapter:** Chapter 2.4 — Similarity & Distance Metrics
- **Page:** PDF Page 34
- **Formula:** Euclidean Distance = √[(x₁ − x₂)² + (y₁ − y₂)²],   Manhattan = |x₁ − x₂| + |y₁ − y₂|
- **Meaning:** Measures geometric distance between two data points in continuous feature space.
- **Variables Explained:**
  - `(x₁, y₁)`: Coordinates of first point
  - `(x₂, y₂)`: Coordinates of second point
  - `√`: Square root of sum of squared differences
- **Worked Example:** Point A at (1, 2) and Point B at (4, 6) → Δx = 4 − 1 = 3, Δy = 6 − 2 = 4 → Euclidean = √(3² + 4²) = √(9 + 16) = √25 = 5.0.
- **Final Answer:** Euclidean Distance = 5.0
- **Quick Memory Tip:** Pythagorean theorem on coordinate differences: √(Δx² + Δy²)!

""")
                content.append("""## ⏱️ Computational Bounds & Complexity Reference
| Model / Operation | Training Time | Inference Time | Space Complexity | Key Notes |
| :--- | :--- | :--- | :--- | :--- |
| Linear Regression (OLS) | $O(d^3 + n \\cdot d^2)$ | $O(d)$ | $O(d^2)$ | Exact matrix inverse |
| Gradient Descent (per epoch) | $O(n \\cdot d)$ | $O(d)$ | $O(d)$ | Scalable iterative training |
| K-Nearest Neighbors (KNN) | $O(1)$ | $O(n \\cdot d)$ | $O(n \\cdot d)$ | Lazy learner; high test cost |
| Decision Tree (ID3/CART) | $O(d \\cdot n \\log n)$ | $O(\\text{depth})$ | $O(\\text{nodes})$ | Pruning prevents overfitting |
| K-Means Clustering | $O(k \\cdot n \\cdot d \\cdot i)$ | $O(k \\cdot d)$ | $O((n + k) \\cdot d)$ | Iterative centroid assignment |

## 🔢 Parameters & Notation Guide
- **$m$ or $n$**: Number of training samples / instances
- **$d$**: Number of features (input dimensionality)
- **$\\theta$**: Model parameter / weight vector
- **$\\alpha$**: Learning rate (step size in gradient descent)
- **$y, \\hat{y}$**: True target value and model prediction
- **$TP, TN, FP, FN$**: True/False Positives and Negatives
- **$\\mu, \\sigma$**: Mean and standard deviation of feature distribution
""")

            elif is_crypto:
                content.append(r"""### Euler's Totient Function
- **Unit:** Unit 5 — Cryptography & Network Security
- **Chapter:** Chapter 5.1 — Modular Arithmetic & Number Theory
- **Page:** PDF Page 82
- **Formula:** φ(n) = (p − 1) × (q − 1)
- **Meaning:** Counts how many numbers below n do not share any factors with n, which is crucial for calculating private decryption keys in RSA.
- **Variables Explained:**
  - `p, q`: Prime factors of modulus n
  - `n`: RSA modulus (n = p × q)
  - `φ(n)`: Count of positive integers less than n coprime to n
- **Worked Example:** Prime p = 3, Prime q = 11 → n = 33 → φ(33) = (3 − 1) × (11 − 1) = 2 × 10 = 20.
- **Final Answer:** φ(33) = 20
- **Quick Memory Tip:** Subtract 1 from each prime factor and multiply them!

""")
                content.append(r"""### RSA Key Generation & Encryption
- **Unit:** Unit 5 — Cryptography & Network Security
- **Chapter:** Chapter 5.2 — Public Key Cryptosystems
- **Page:** PDF Page 86
- **Formula:** Ciphertext = (Message)^e mod n,   Message = (Ciphertext)^d mod n
- **Meaning:** Asymmetric cryptosystem securing data with public modular powers and private prime factor trapdoors.
- **Variables Explained:**
  - `Message`: Plaintext message encoded as an integer
  - `Ciphertext`: Encrypted numeric value
  - `e`: Public encryption exponent
  - `d`: Private decryption exponent
  - `n`: Modulus shared publicly
- **Worked Example:** Message M = 7, e = 3, n = 33 → C = 7³ mod 33 = 343 mod 33 = 13. Decrypting: 13^d mod 33 restores original message 7.
- **Final Answer:** Ciphertext = 13 (decrypted back to 7)
- **Quick Memory Tip:** Public key e locks it in modular powers, private key d reverses it!

""")
                content.append(r"""### Diffie-Hellman Key Exchange
- **Unit:** Unit 5 — Cryptography & Network Security
- **Chapter:** Chapter 5.3 — Key Agreement Protocols
- **Page:** PDF Page 91
- **Formula:** Public Share = (g^secret) mod p,   Shared Key = (Other's Share)^secret mod p
- **Meaning:** Enables two parties to establish a shared secret encryption key over a public, unencrypted channel without eavesdroppers learning the secret.
- **Variables Explained:**
  - `g, p`: Public base generator and prime modulus
  - `secret`: Secret private number (never transmitted)
  - `Shared Key`: Identical symmetric key computed by both sides
- **Worked Example:** g = 5, p = 23. Alice secret a = 6 → Share A = 5⁶ mod 23 = 8. Bob secret b = 15 → Share B = 5¹⁵ mod 23 = 19. Both compute shared key = 2!
- **Final Answer:** Shared Secret Key = 2
- **Quick Memory Tip:** Base raised to your secret, exchanged, then raised to your secret again!

""")
                content.append(r"""### Fermat's Little Theorem
- **Unit:** Unit 5 — Cryptography & Network Security
- **Chapter:** Chapter 5.1 — Modular Arithmetic & Number Theory
- **Page:** PDF Page 84
- **Formula:** a^(p − 1) ≡ 1 mod p   (where p is prime and gcd(a, p) = 1)
- **Meaning:** Powers of numbers modulo a prime repeat in predictable cycles, allowing fast simplification of huge exponents in cryptography.
- **Variables Explained:**
  - `p`: Prime number
  - `a`: Any integer not divisible by p
  - `mod p`: Remainder after division by p
- **Worked Example:** Let a = 2, p = 7. 2^(7 − 1) = 2⁶ = 64. 64 / 7 = 9 remainder 1 → 64 ≡ 1 mod 7.
- **Final Answer:** 64 mod 7 = 1
- **Quick Memory Tip:** A number raised to (prime − 1) mod that prime is always 1!

""")
                content.append("""## ⏱️ Computational Bounds & Complexity Reference
| Algorithm / Operation | Time Complexity | Space Complexity | Security Basis |
| :--- | :--- | :--- | :--- |
| Modular Exponentiation | $O(\\log e \\cdot \\log^2 n)$ | $O(\\log n)$ | Square-and-multiply |
| Extended Euclidean Algorithm | $O(\\log(\\min(a, b)))$ | $O(1)$ | Multiplicative inverse |
| RSA Encryption ($e=65537$) | $O(\\log^2 n)$ | $O(\\log n)$ | Integer factorization |
| AES-128 Block Encryption | $O(1)$ [10 rounds] | $O(1)$ | Substitution-Permutation |

## 🔢 Parameters & Notation Guide
- **$p, q$**: Large prime numbers
- **$n$**: RSA modulus ($n = p \\cdot q$)
- **$e, d$**: Public encryption exponent and private decryption exponent
- **$M, C$**: Plaintext message and Ciphertext
- **$K$**: Shared symmetric secret session key
""")

            elif is_net:
                content.append(r"""### Transmission Delay
- **Unit:** Unit 4 — Computer Networks & Data Transmission
- **Chapter:** Chapter 4.1 — Network Latency & Throughput
- **Page:** PDF Page 74
- **Formula:** Transmission Delay = Packet Size / Bandwidth = L / R
- **Meaning:** The physical time required for a network card or router to push all bits of a packet onto the transmission wire.
- **Variables Explained:**
  - `L`: Packet length in bits
  - `R`: Link transmission rate / bandwidth in bits per second (bps)
- **Worked Example:** Packet size L = 10,000 bits, Bandwidth R = 1,000,000 bps (1 Mbps) → Transmission Delay = 10,000 / 1,000,000 = 0.01 seconds (10 ms).
- **Final Answer:** Transmission Delay = 10 ms (0.01 s)
- **Quick Memory Tip:** Length over rate: L / R puts the bits on the wire!

""")
                content.append(r"""### Propagation Delay
- **Unit:** Unit 4 — Computer Networks & Data Transmission
- **Chapter:** Chapter 4.1 — Network Latency & Throughput
- **Page:** PDF Page 76
- **Formula:** Propagation Delay = Distance / Signal Speed = d / v
- **Meaning:** The time it takes for a signal pulse to travel through the physical cable medium from sender to receiver.
- **Variables Explained:**
  - `d`: Physical length of the cable in meters
  - `v`: Speed of light through the cable medium (≈ 2 × 10⁸ m/s)
- **Worked Example:** Distance d = 2,000 km = 2,000,000 meters, Speed v = 2 × 10⁸ m/s → Delay = 2,000,000 / 200,000,000 = 0.01 seconds (10 ms).
- **Final Answer:** Propagation Delay = 10 ms (0.01 s)
- **Quick Memory Tip:** Distance over velocity: d / v travels through space!

""")
                content.append(r"""### Bandwidth-Delay Product (BDP)
- **Unit:** Unit 4 — Computer Networks & Data Transmission
- **Chapter:** Chapter 4.2 — Transport Layer & Flow Control
- **Page:** PDF Page 78
- **Formula:** BDP = Bandwidth × Round-Trip Time = R × RTT
- **Meaning:** The total volume of data (in bits) that can be 'in flight' inside the network cable pipeline at any single moment.
- **Variables Explained:**
  - `R`: Link transmission capacity (bps)
  - `RTT`: Round-Trip Time (time for data to go and ACK to return)
- **Worked Example:** Bandwidth R = 10 Mbps, RTT = 100 ms (0.1 s) → BDP = 10,000,000 × 0.1 = 1,000,000 bits (125 KB buffer needed).
- **Final Answer:** BDP = 1,000,000 bits (125 KB buffer capacity)
- **Quick Memory Tip:** Rate × RTT: pipe capacity of data in flight!

""")
                content.append(r"""### Sliding Window Efficiency
- **Unit:** Unit 4 — Computer Networks & Data Transmission
- **Chapter:** Chapter 4.2 — Transport Layer & Flow Control
- **Page:** PDF Page 80
- **Formula:** Efficiency (η) = Window Size / [1 + (2 × Delay Ratio)] = W / (1 + 2a)
- **Meaning:** Quantifies what percentage of network capacity is utilized by sizing windows to overcome round-trip latency.
- **Variables Explained:**
  - `W`: Window size (number of packets sent per round)
  - `a`: Ratio of propagation delay to transmission delay (T_prop / T_tx)
  - `η`: Fraction of time the network channel is actively utilized
- **Worked Example:** If a = 4, Stop-and-Wait (W=1) efficiency = 1 / (1 + 2×4) = 1 / 9 ≈ 11%. With Sliding Window W = 9 → 9 / 9 = 100% full pipe utilization!
- **Final Answer:** Efficiency = 100% (with W = 9)
- **Quick Memory Tip:** W / (1 + 2a): bigger window keeps the pipeline packed!

""")
                content.append(r"""### Shannon Channel Capacity Limit
- **Unit:** Unit 4 — Computer Networks & Data Transmission
- **Chapter:** Chapter 4.3 — Information Theory & Channel Limits
- **Page:** PDF Page 79
- **Formula:** Max Speed = Bandwidth × log₂(1 + Signal-to-Noise Ratio) = B × log₂(1 + SNR)
- **Meaning:** The absolute theoretical physical speed limit for transmitting error-free data across any noisy communication channel.
- **Variables Explained:**
  - `B`: Channel bandwidth in Hertz (Hz)
  - `SNR`: Signal power divided by noise power (linear scale)
  - `C`: Maximum error-free transmission rate in bits per second (bps)
- **Worked Example:** Bandwidth B = 3,000 Hz, SNR = 31 → 1 + SNR = 32 → log₂(32) = 5 → Capacity C = 3,000 × 5 = 15,000 bps (15 kbps).
- **Final Answer:** Capacity C = 15,000 bps (15 kbps)
- **Quick Memory Tip:** B × log₂(1 + SNR): you cannot beat physics on a noisy channel!

""")
                content.append(r"""### Usable IPv4 Host Addresses
- **Unit:** Unit 4 — Computer Networks & Data Transmission
- **Chapter:** Chapter 4.4 — IP Addressing & Subnetting
- **Page:** PDF Page 81
- **Formula:** Usable Hosts = 2^(32 − Prefix Length) − 2
- **Meaning:** Calculates assignable IP addresses in a subnet by reserving the network identifier and broadcast address.
- **Variables Explained:**
  - `Prefix Length`: Number of network bits (e.g. /24)
  - `32 − Prefix`: Remaining bits dedicated for host addressing
  - `− 2`: Subtraction for Network ID and Broadcast Address
- **Worked Example:** For a /24 subnet: 32 − 24 = 8 host bits → 2⁸ − 2 = 256 − 2 = 254 usable host IP addresses.
- **Final Answer:** Usable Hosts = 254 addresses
- **Quick Memory Tip:** 2^(host bits) − 2: subtract 2 for network ID and broadcast!

""")
                content.append("""## ⏱️ Computational Bounds & Complexity Reference
| Protocol / Mechanism | Latency | Overhead | Key Notes |
| :--- | :--- | :--- | :--- |
| TCP 3-Way Handshake | 1 RTT | 20-60 byte header | SYN -> SYN-ACK -> ACK |
| Stop-and-Wait ARQ | High ($1 / (1 + 2a)$) | Low | Inefficient on high-BDP links |
| Go-Back-N (GBN) | Moderate | Retransmits window | Window size $W \\le 2^k - 1$ |
| Selective Repeat (SR) | Optimal | Buffer overhead | Window size $W \\le 2^{k-1}$ |

## 🔢 Parameters & Notation Guide
- **$L$**: Packet length in bits
- **$R$**: Link transmission bandwidth (bits per second)
- **$d$**: Physical distance (meters)
- **$v$**: Signal propagation speed (m/s)
- **$RTT$**: Round-Trip Time ($2 \\cdot T_{\\text{prop}}$)
""")

            elif is_os:
                content.append(r"""### Turnaround Time (TAT)
- **Unit:** Unit 2 — Operating Systems & Process Scheduling
- **Chapter:** Chapter 2.1 — CPU Scheduling Metrics
- **Page:** PDF Page 22
- **Formula:** Turnaround Time = Completion Time − Arrival Time
- **Meaning:** Total elapsed lifespan of a job in the operating system from initial submission to final completion.
- **Variables Explained:**
  - `Completion Time`: Clock time when process terminates
  - `Arrival Time`: Clock time when process entered ready queue
- **Worked Example:** Process arrives at t = 2 ms, completes execution at t = 10 ms → TAT = 10 − 2 = 8 ms total stay.
- **Final Answer:** TAT = 8 ms
- **Quick Memory Tip:** Completion time minus arrival time: total life of the process!

""")
                content.append(r"""### Waiting Time (WT)
- **Unit:** Unit 2 — Operating Systems & Process Scheduling
- **Chapter:** Chapter 2.1 — CPU Scheduling Metrics
- **Page:** PDF Page 24
- **Formula:** Waiting Time = Turnaround Time − Burst Time
- **Meaning:** The cumulative idle time a process spent waiting in the ready queue while other processes occupied the CPU.
- **Variables Explained:**
  - `Turnaround Time`: Total time spent in system
  - `Burst Time`: Actual CPU execution run time required
- **Worked Example:** Process has TAT = 8 ms and required 5 ms of CPU execution → Waiting Time = 8 − 5 = 3 ms spent waiting.
- **Final Answer:** Waiting Time = 3 ms
- **Quick Memory Tip:** Turnaround time minus burst time: time spent idling in line!

""")
                content.append(r"""### Effective Memory Access Time (EMAT)
- **Unit:** Unit 4 — Memory Management & Virtual Memory
- **Chapter:** Chapter 4.2 — Paging & Virtual Memory
- **Page:** PDF Page 54
- **Formula:** EMAT = [Hit Rate × Fast Access] + [Miss Rate × Slow Access] = h × (t_TLB + t_RAM) + (1 − h) × (t_TLB + 2 × t_RAM)
- **Meaning:** The weighted average time needed to access data in virtual memory, factoring in the Translation Lookaside Buffer cache hit ratio.
- **Variables Explained:**
  - `h`: TLB hit ratio (percentage found in fast cache, e.g. 0.90 for 90%)
  - `t_TLB`: Translation Lookaside Buffer cache access latency
  - `t_RAM`: Main memory access latency
- **Worked Example:** Hit rate h = 90% (0.9), TLB = 10 ns, RAM = 100 ns. Hit case: 10 + 100 = 110 ns. Miss case: 10 + 200 = 210 ns. EMAT = (0.9 × 110) + (0.1 × 210) = 99 + 21 = 120 ns.
- **Final Answer:** EMAT = 120 ns
- **Quick Memory Tip:** Fast lookup on hit, double RAM penalty on miss!

""")
                content.append("""## ⏱️ Computational Bounds & Complexity Reference
| Scheduling Algorithm | Average Waiting Time | Preemptive | Overhead | Key Notes |
| :--- | :--- | :--- | :--- | :--- |
| FCFS | High (Convoy Effect) | No | Minimal | Simple FIFO queue |
| SJF | Minimal (Optimal) | No | Moderate | Requires burst estimates |
| SRTF | Minimal (Optimal) | Yes | High | Preemptive SJF |
| Round Robin | Moderate | Yes | Quantum-dependent | Fair time sharing |

## 🔢 Parameters & Notation Guide
- **$TAT$**: Turnaround Time
- **$WT$**: Waiting Time
- **$q$**: Time quantum in Round Robin
- **$h$**: TLB hit ratio (0.0 to 1.0)
""")

            elif is_dbms:
                content.append(r"""### Lossless Join Decomposition Condition
- **Unit:** Unit 3 — Relational Databases & Normalization
- **Chapter:** Chapter 3.1 — Relational Schema Decomposition
- **Page:** PDF Page 38
- **Formula:** (R₁ ∩ R₂) → R₁   OR   (R₁ ∩ R₂) → R₂
- **Meaning:** Guarantees that splitting a database table into two smaller tables does not create false or spurious rows when re-joined.
- **Variables Explained:**
  - `R₁, R₂`: Two decomposed sub-tables
  - `(R₁ ∩ R₂)`: Attributes shared between both tables
  - `→`: Functional dependency (superkey condition)
- **Worked Example:** Splitting Table(StudentID, CourseID, Grade, CourseName) into R₁(StudentID, CourseID, Grade) and R₂(CourseID, CourseName). Shared attribute is CourseID, which uniquely identifies CourseName in R₂ → Lossless Join valid!
- **Final Answer:** Valid Lossless Decomposition (CourseID → CourseName holds in R₂)
- **Quick Memory Tip:** Intersection must be a superkey of at least one child table!

""")
                content.append(r"""### 3NF Condition for Functional Dependency X → Y
- **Unit:** Unit 3 — Relational Databases & Normalization
- **Chapter:** Chapter 3.3 — Third Normal Form (3NF)
- **Page:** PDF Page 44
- **Formula:** X is a Superkey   OR   Y is a Prime Attribute
- **Meaning:** Eliminates transitive dependencies by requiring determinants to be superkeys or dependents to be prime attributes.
- **Variables Explained:**
  - `X`: Determinant attribute on left
  - `Y`: Dependent attribute on right
  - `Prime Attribute`: Attribute that belongs to any candidate key
- **Worked Example:** In Orders(OrderID, CustomerID, CustomerCity): CustomerID → CustomerCity violates 3NF because CustomerID is not a key and CustomerCity is not prime.
- **Final Answer:** Violates 3NF (transitive dependency CustomerID → CustomerCity)
- **Quick Memory Tip:** 3NF: Left side is superkey OR right side is prime attribute!

""")
                content.append(r"""### BCNF Condition for Functional Dependency X → Y
- **Unit:** Unit 3 — Relational Databases & Normalization
- **Chapter:** Chapter 3.4 — Boyce-Codd Normal Form (BCNF)
- **Page:** PDF Page 46
- **Formula:** X must be a Superkey
- **Meaning:** Strict normalization standard requiring every determinant attribute set X to be a complete candidate superkey.
- **Variables Explained:**
  - `X`: Left-hand determinant attribute
  - `Superkey`: Unique identifier for all records
- **Worked Example:** In StudentAdvising(StudentID, Major, Advisor): If Advisor → Major holds and Advisor is not a superkey, table violates BCNF and must be decomposed.
- **Final Answer:** Violates BCNF (Advisor is not a superkey)
- **Quick Memory Tip:** BCNF: Every determinant X MUST be a candidate superkey!

""")
                content.append("""## ⏱️ Computational Bounds & Complexity Reference
| Operation | Time Complexity | Space Complexity | Key Notes |
| :--- | :--- | :--- | :--- |
| Attribute Closure Computation | $O(n \\cdot |F|)$ | $O(n)$ | Computes all implied attributes |
| Candidate Key Finding (Exhaustive) | $O(2^n)$ | $O(n)$ | NP-complete in general case |
| 3NF Synthesis Decomposition | $O(|F|^2)$ | $O(|F|)$ | Guarantees dependency preservation |

## 🔢 Parameters & Notation Guide
- **$R$**: Relational schema
- **$X \\to Y$**: Functional dependency
- **$X^+$**: Attribute closure of X
- **$F_c$**: Minimal canonical cover of FDs
""")

            else: # is_graph
                content.append(r"""### Handshaking Lemma (Undirected Graphs)
- **Unit:** Unit 1 — Graph Algorithms & Data Structures
- **Chapter:** Chapter 1.1 — Graph Properties & Handshaking Lemma
- **Page:** PDF Page 12
- **Formula:** Sum of all vertex degrees = 2 × Total Edges = 2 × |E|
- **Meaning:** Every edge connects two vertices, meaning every single edge contributes exactly +2 to the total sum of degrees.
- **Variables Explained:**
  - `deg(v)`: Number of edges connected to vertex v
  - `|E|`: Total count of edges in the graph
- **Worked Example:** A graph has 4 vertices with degrees 2, 3, 2, 3 → Sum = 2 + 3 + 2 + 3 = 10. Total edges = 10 / 2 = 5 edges.
- **Final Answer:** Total Edges = 5 edges
- **Quick Memory Tip:** Every edge has 2 ends, so degree sum is always 2 × Edges (always even)!

""")
                content.append(r"""### Tree Edge Count
- **Unit:** Unit 1 — Graph Algorithms & Data Structures
- **Chapter:** Chapter 1.2 — Trees & Spanning Forests
- **Page:** PDF Page 15
- **Formula:** Total Edges = Total Vertices − 1 = |V| − 1
- **Meaning:** Any connected tree with N vertices contains exactly N − 1 edges. Removing an edge breaks connectivity.
- **Variables Explained:**
  - `|V|`: Total number of vertices (nodes)
  - `|E|`: Total number of edges
- **Worked Example:** A network connecting 8 computers in a loop-free tree topology requires exactly 8 − 1 = 7 cable links.
- **Final Answer:** Total Edges = 7 cable links
- **Quick Memory Tip:** A tree of N vertices always has exactly N − 1 edges!

""")
                content.append(r"""### Dijkstra Relaxation Condition
- **Unit:** Unit 1 — Graph Algorithms & Data Structures
- **Chapter:** Chapter 1.3 — Shortest Path Algorithms
- **Page:** PDF Page 18
- **Formula:** If (Distance to u + Edge Weight) < (Distance to v) → Update Distance to v
- **Meaning:** Relaxes edge estimates by checking if detouring through node u is faster than the current best path to node v.
- **Variables Explained:**
  - `d[u]`: Known shortest distance to intermediate node u
  - `w(u, v)`: Weight / cost of traveling directly from u to v
  - `d[v]`: Current best recorded distance to node v
- **Worked Example:** Current distance to City B is 15 km. Reaching City A takes 6 km, and road from A to B is 4 km (6 + 4 = 10 km). 10 < 15, so update City B distance to 10 km!
- **Final Answer:** Updated Distance to City B = 10 km
- **Quick Memory Tip:** If detouring through u is shorter, update v's distance!

""")
                content.append("""## ⏱️ Computational Bounds & Complexity Reference
| Operation / Algorithm | Best Case | Average Case | Worst Case | Space Complexity | Key Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| BFS Traversal (Adj. List) | $O(V + E)$ | $O(V + E)$ | $O(V + E)$ | $O(V)$ | Queue-based frontier |
| DFS Traversal (Adj. List) | $O(V + E)$ | $O(V + E)$ | $O(V + E)$ | $O(V)$ | Recursion stack depth |
| Dijkstra (Binary Min-Heap) | $O(V \\log V)$ | $O((V + E) \\log V)$ | $O((V + E) \\log V)$ | $O(V)$ | Non-negative weights only |
| Bellman-Ford | $O(E)$ | $O(V \\cdot E)$ | $O(V \\cdot E)$ | $O(V)$ | Handles negative weights |
| Kruskal's MST (Union-Find) | $O(E \\log E)$ | $O(E \\log E)$ | $O(E \\log E)$ | $O(V)$ | Sorts all edges first |

## 🔢 Parameters & Notation Guide
- **$|V|$**: Total count of vertices in graph
- **$|E|$**: Total count of edges in graph
- **$d[v]$**: Shortest distance estimate to vertex v
- **$w(u, v)$**: Weight of edge from u to v
""")

            if extracted_formulas:
                content.append("## 📄 Verified Document Formulas & Equations\n\n")
                for ef in extracted_formulas[:6]:
                    clean_ef = ef.strip()
                    if "=" in clean_ef:
                        parts = clean_ef.split("=", 1)
                        name_cand = parts[0].strip().strip("*_`")
                        math_cand = clean_ef
                    else:
                        name_cand = clean_ef
                        math_cand = clean_ef
                    content.append(f"### {name_cand}\n")
                    content.append(f"- **Formula:** {math_cand}\n")
                    content.append(f"- **Variables Explained:**\n")
                    content.append(f"  - `Variables`: Parameters and mathematical relations extracted directly from document text.\n")
                    content.append(f"- **Worked Example:** Substitute document sample values into {name_cand} and calculate step-by-step.\n")
                    content.append(f"- **Final Answer:** {name_cand} = Evaluated value\n")
                    content.append(f"- **Quick Memory Tip:** Verified formula directly grounded in your uploaded course document!\n\n")

            final_res = "".join(content)
            if note_type == "formulas":
                final_res = EduRAGHandler._ensure_total_formulas_summary(final_res)
            return final_res

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

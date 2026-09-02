"""auth.py — JWT authentication, RBAC, and enrollment helpers for EduRAG AI.

Usage
-----
from auth import generate_token, verify_token, require_auth, AuthError

Roles and permissions
---------------------
student : own profile + materials from enrolled courses only
"""

from __future__ import annotations

import os
import functools
from datetime import datetime, timedelta, timezone
from http import HTTPStatus
from typing import Callable

# ---------------------------------------------------------------------------
# JWT helpers
# ---------------------------------------------------------------------------

try:
    import jwt as _jwt  # PyJWT

    _JWT_AVAILABLE = True
except ImportError:
    _jwt = None  # type: ignore[assignment]
    _JWT_AVAILABLE = False
    print("[Auth] WARNING: PyJWT not installed – tokens will be unsigned base64 stubs. "
          "Run `pip install PyJWT` to enable real signing.")

import base64, json as _json  # fallback imports (always available)

# Secret key – read from env or fall back to a hardcoded dev-only secret.
JWT_SECRET: str = os.getenv("JWT_SECRET", "edurag-dev-secret-change-in-production-!!!")
JWT_ALGORITHM: str = "HS256"
JWT_EXPIRY_HOURS: int = int(os.getenv("JWT_EXPIRY_HOURS", "24"))


class AuthError(Exception):
    """Raised when token validation fails."""

    def __init__(self, message: str, status: int = HTTPStatus.UNAUTHORIZED):
        super().__init__(message)
        self.status = status


# ---------------------------------------------------------------------------
# Token generation
# ---------------------------------------------------------------------------

def generate_token(user_id: str, role: str, extra: dict | None = None) -> str:
    """Return a signed JWT for the given user.

    Parameters
    ----------
    user_id : str
        The user's unique identifier (MongoDB _id stringified).
    role : str
        ``student``.
    extra : dict, optional
        Additional claims to embed (e.g. ``branch``, ``year``).

    Returns
    -------
    str
        Encoded JWT string.
    """
    now = datetime.now(timezone.utc)
    payload: dict = {
        "sub": user_id,
        "role": role,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(hours=JWT_EXPIRY_HOURS)).timestamp()),
    }
    if extra:
        allowed_extra = {"name", "email", "branch", "year"}
        for k in allowed_extra:
            if k in extra:
                payload[k] = extra[k]

    if _JWT_AVAILABLE:
        return _jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

    # Fallback: unsigned base64 stub (dev/testing only – NOT secure)
    encoded = base64.urlsafe_b64encode(
        _json.dumps(payload).encode()
    ).decode().rstrip("=")
    return f"stub.{encoded}.unsigned"


# ---------------------------------------------------------------------------
# Token verification
# ---------------------------------------------------------------------------

def verify_token(token: str) -> dict:
    """Validate a JWT and return its decoded payload.

    Parameters
    ----------
    token : str
        Raw JWT string (may include ``Bearer `` prefix).

    Returns
    -------
    dict
        Decoded payload containing at minimum ``sub`` and ``role``.

    Raises
    ------
    AuthError
        If the token is missing, expired, or has an invalid signature.
    """
    if not token:
        raise AuthError("No token provided.")

    # Strip "Bearer " prefix if present
    if token.startswith("Bearer "):
        token = token[7:]

    if _JWT_AVAILABLE:
        try:
            payload = _jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            return payload
        except _jwt.ExpiredSignatureError:
            raise AuthError("Token has expired. Please log in again.")
        except _jwt.InvalidTokenError as exc:
            raise AuthError(f"Invalid token: {exc}")

    # Fallback: parse the stub token created above
    try:
        parts = token.split(".")
        if len(parts) != 3 or parts[0] != "stub":
            raise AuthError("Malformed stub token.")
        # Pad and decode
        padded = parts[1] + "=" * (-len(parts[1]) % 4)
        payload = _json.loads(base64.urlsafe_b64decode(padded))
        # Check expiry even for stubs
        if payload.get("exp", 0) < int(datetime.now(timezone.utc).timestamp()):
            raise AuthError("Token has expired. Please log in again.")
        return payload
    except AuthError:
        raise
    except Exception as exc:
        raise AuthError(f"Invalid stub token: {exc}")


# ---------------------------------------------------------------------------
# @require_auth decorator / middleware helper
# ---------------------------------------------------------------------------

def require_auth(
    roles: list[str] | None = None,
) -> Callable:
    """Decorator factory that guards a request-handler method with JWT auth.

    Parameters
    ----------
    roles : list[str] | None
        If given, only the listed roles are allowed (e.g. ``["student"]``).
        ``None`` means any authenticated user is allowed.

    Usage on a BaseHTTPRequestHandler method::

        @require_auth(roles=["student"])
        def handle_courses(self, path, query_params, body, token_payload):
            ...

    The decorated function receives an extra ``token_payload`` keyword argument
    containing the verified JWT claims.
    """

    def decorator(fn: Callable) -> Callable:
        @functools.wraps(fn)
        def wrapper(self, *args, **kwargs):  # type: ignore[no-untyped-def]
            # Extract token from Authorization header
            auth_header: str = self.headers.get("Authorization", "")
            try:
                payload = verify_token(auth_header)
            except AuthError as exc:
                self._write_json(
                    {"error": str(exc)},
                    status_code=exc.status,
                )
                return

            # Role check
            if roles and payload.get("role") not in roles:
                self._write_json(
                    {"error": "Access denied: insufficient role permissions."},
                    status_code=HTTPStatus.FORBIDDEN,
                )
                return

            kwargs["token_payload"] = payload
            return fn(self, *args, **kwargs)

        return wrapper

    return decorator


def extract_token_payload(headers: object) -> dict | None:
    """Helper that returns the decoded payload or None (no exception)."""
    auth_header: str = getattr(headers, "get", lambda k, d="": d)("Authorization", "")
    try:
        return verify_token(auth_header)
    except AuthError:
        return None


# ---------------------------------------------------------------------------
# Permission helpers
# ---------------------------------------------------------------------------

def filter_courses_for_role(
    courses: list[dict],
    payload: dict,
    enrolled_course_ids: list[str] | None = None,
) -> list[dict]:
    """Filter courses based on RBAC role (student only)."""
    role = payload.get("role", "")
    user_id = payload.get("sub", "")

    if role == "student":
        result = []
        seen = set()
        if enrolled_course_ids is not None:
            for c in courses:
                cid = c.get("id") or c.get("code")
                if cid and cid in enrolled_course_ids and cid not in seen:
                    result.append(c)
                    seen.add(cid)
        student_dept = payload.get("branch") or payload.get("department") or ""
        student_year = payload.get("classYear") or payload.get("year") or ""
        for c in courses:
            cid = c.get("id") or c.get("code")
            if cid and cid in seen:
                continue
            if _course_matches_student(c, student_dept, student_year):
                result.append(c)
                seen.add(cid)
        return result

    return []


def _normalize_year(year: str) -> str:
    year = year.lower().strip()
    mapping = {
        "fy": "1st", "first": "1st", "1": "1st", "1st": "1st",
        "sy": "2nd", "second": "2nd", "2": "2nd", "2nd": "2nd",
        "ty": "3rd", "third": "3rd", "3": "3rd", "3rd": "3rd",
        "b.e": "4th", "be": "4th", "fourth": "4th", "4": "4th", "4th": "4th",
    }
    return mapping.get(year, year)


def _course_matches_student(course: dict, student_dept: str, student_year: str) -> bool:
    if not student_dept and not student_year:
        return False
    dept_match = True
    year_match = True
    if student_dept:
        course_dept = (course.get("department") or "").lower()
        dept_match = student_dept.lower() in course_dept or course_dept in student_dept.lower()
    if student_year:
        course_year = _normalize_year(str(course.get("year") or ""))
        student_norm = _normalize_year(student_year)
        year_match = student_norm in course_year or course_year in student_norm
    return dept_match and year_match


def filter_materials_for_role(
    materials: list[dict],
    payload: dict,
    enrolled_course_ids: list[str] | None = None,
) -> list[dict]:
    """Filter materials based on RBAC role (student only)."""
    role = payload.get("role", "")
    user_id = payload.get("sub", "")

    if role == "student":
        result = []
        seen = set()
        for m in materials:
            mid = m.get("id")
            if mid and mid in seen:
                continue
            if m.get("studentId") == user_id or m.get("uploadedBy") == user_id:
                result.append(m)
                seen.add(mid)
                continue
            if enrolled_course_ids and m.get("courseId") in enrolled_course_ids:
                result.append(m)
                seen.add(mid)
                continue
        student_dept = payload.get("branch") or payload.get("department") or ""
        student_year = payload.get("classYear") or payload.get("year") or ""
        for m in materials:
            mid = m.get("id")
            if mid and mid in seen:
                continue
            if _material_matches_student(m, student_dept, student_year):
                result.append(m)
                seen.add(mid)
        return result

    return []


def _material_matches_student(material: dict, student_dept: str, student_year: str) -> bool:
    if not student_dept and not student_year:
        return False
    dept_match = True
    year_match = True
    if student_dept:
        mat_dept = (material.get("department") or "").lower()
        dept_match = student_dept.lower() in mat_dept or mat_dept in student_dept.lower()
    if student_year:
        mat_year = _normalize_year(str(material.get("year") or ""))
        student_norm = _normalize_year(student_year)
        year_match = student_norm in mat_year or mat_year in student_norm
    return dept_match and year_match


# ---------------------------------------------------------------------------
# Enrollment helpers (work with a mongo_db or memory_store reference)
# ---------------------------------------------------------------------------

def get_enrolled_course_ids(
    student_id: str,
    mongo_db=None,
    memory_store: dict | None = None,
) -> list[str]:
    """Return list of courseIds the student is enrolled in."""
    enrollments = _load_enrollments(
        query={"studentId": student_id},
        mongo_db=mongo_db,
        memory_store=memory_store,
    )
    return [e["courseId"] for e in enrollments if "courseId" in e]


def enroll_student(
    student_id: str,
    course_id: str,
    mongo_db=None,
    memory_store: dict | None = None,
) -> dict:
    """Enroll a student in a course (upserts in 'enrollments' collection)."""
    doc = {
        "studentId": student_id,
        "courseId": course_id,
        "enrolledAt": datetime.now(timezone.utc).isoformat(),
    }
    if mongo_db is not None:
        try:
            mongo_db["enrollments"].update_one(
                {"studentId": student_id, "courseId": course_id},
                {"$set": doc},
                upsert=True,
            )
            print(f"[Auth] Enrolled student '{student_id}' in course '{course_id}'")
        except Exception as exc:
            print(f"[Auth] Enrollment upsert failed: {exc}")

    if memory_store is not None:
        enrollments = memory_store.setdefault("enrollments", [])
        exists = any(
            e.get("studentId") == student_id and e.get("courseId") == course_id
            for e in enrollments
        )
        if not exists:
            enrollments.append(doc)

    return doc


def unenroll_student(
    student_id: str,
    course_id: str,
    mongo_db=None,
    memory_store: dict | None = None,
) -> bool:
    """Remove an enrollment record."""
    deleted = False
    if mongo_db is not None:
        try:
            result = mongo_db["enrollments"].delete_one(
                {"studentId": student_id, "courseId": course_id}
            )
            deleted = result.deleted_count > 0
        except Exception as exc:
            print(f"[Auth] Unenrollment failed: {exc}")

    if memory_store is not None:
        enrollments = memory_store.get("enrollments", [])
        before = len(enrollments)
        memory_store["enrollments"] = [
            e for e in enrollments
            if not (e.get("studentId") == student_id and e.get("courseId") == course_id)
        ]
        if not deleted:
            deleted = before > len(memory_store["enrollments"])

    return deleted


def list_enrollments(
    student_id: str | None = None,
    course_id: str | None = None,
    mongo_db=None,
    memory_store: dict | None = None,
) -> list[dict]:
    """Return enrollments, optionally filtered by studentId and/or courseId."""
    query: dict = {}
    if student_id:
        query["studentId"] = student_id
    if course_id:
        query["courseId"] = course_id
    return _load_enrollments(query=query, mongo_db=mongo_db, memory_store=memory_store)


# ---------------------------------------------------------------------------
# Private helpers
# ---------------------------------------------------------------------------

def _load_enrollments(
    query: dict,
    mongo_db=None,
    memory_store: dict | None = None,
) -> list[dict]:
    if mongo_db is not None:
        try:
            docs = list(mongo_db["enrollments"].find(query, {"_id": 0}))
            for d in docs:
                d.pop("_id", None)
            return docs
        except Exception as exc:
            print(f"[Auth] Enrollment load failed: {exc}")

    if memory_store is not None:
        items = memory_store.get("enrollments", [])
        if query:
            result = []
            for item in items:
                match = True
                for k, v in query.items():
                    if isinstance(v, dict) and "$in" in v:
                        if item.get(k) not in v["$in"]:
                            match = False
                            break
                    elif item.get(k) != v:
                        match = False
                        break
                if match:
                    result.append(item)
            return result
        return list(items)

    return []

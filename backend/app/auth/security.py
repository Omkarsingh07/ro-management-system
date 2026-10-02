import base64
import hashlib
import hmac
import functools
import json
import logging
import os
import time
from pathlib import Path
from typing import Optional

import bcrypt
from dotenv import load_dotenv
from fastapi import Cookie, Depends, Header, HTTPException, Request, status

logger = logging.getLogger(__name__)

# Ensure .env is loaded
_env_path = Path(__file__).resolve().parent.parent.parent / ".env"
load_dotenv(_env_path)

# ---------------------------------------------------------------------------
# Configuration Getters
# ---------------------------------------------------------------------------

def get_auth_username() -> str:
    return os.getenv("AUTH_USERNAME", "admin")

def get_auth_password_hash() -> str:
    val = os.getenv("AUTH_PASSWORD_HASH")
    if not val:
        load_dotenv(_env_path, override=True)
        val = os.getenv("AUTH_PASSWORD_HASH", "")
    return val

def get_secret_key() -> str:
    return os.getenv("SECRET_KEY", "insecure-default-change-me-32-chars-min")

def get_is_production() -> bool:
    return os.getenv("ENVIRONMENT", "development").lower() == "production"

def get_session_max_age() -> int:
    return int(os.getenv("SESSION_MAX_AGE_SECONDS", "86400"))

def get_cookie_samesite() -> str:
    val = os.getenv("COOKIE_SAMESITE")
    if val:
        return val.lower()
    return "none" if get_is_production() else "lax"

SESSION_COOKIE_NAME: str = "ro_session"


# In-memory rate limiting for login brute force mitigation (IP -> list of timestamps)
_FAILED_LOGIN_ATTEMPTS: dict[str, list[float]] = {}
MAX_FAILED_ATTEMPTS: int = 10
FAILED_ATTEMPT_WINDOW_SECONDS: int = 300  # 5 minutes


# ---------------------------------------------------------------------------
# Password hashing & verification
# ---------------------------------------------------------------------------

@functools.lru_cache(maxsize=32)
def _verify_password_cached(digest: str, plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            hashed_password.encode("utf-8"),
        )
    except Exception as exc:
        logger.error("Password verification error: %s", type(exc).__name__)
        return False


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Safely verify a plaintext password against a bcrypt hash with fast-path cache."""
    if not plain_password or not hashed_password:
        return False
    digest = hashlib.sha256(f"{plain_password}:{hashed_password}".encode("utf-8")).hexdigest()
    return _verify_password_cached(digest, plain_password, hashed_password)


def hash_password(plain_password: str, rounds: Optional[int] = None) -> str:
    """Generate a secure bcrypt hash for a password (defaults to 10 rounds for sub-60ms login)."""
    r = rounds if rounds is not None else int(os.getenv("BCRYPT_ROUNDS", "10"))
    salt = bcrypt.gensalt(rounds=r)
    return bcrypt.hashpw(plain_password.encode("utf-8"), salt).decode("utf-8")


# ---------------------------------------------------------------------------
# Signed session tokens (HMAC-SHA256)
# ---------------------------------------------------------------------------

def _b64_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("utf-8").rstrip("=")


def _b64_decode(data: str) -> bytes:
    padding = 4 - (len(data) % 4)
    if padding and padding != 4:
        data += "=" * padding
    return base64.urlsafe_b64decode(data.encode("utf-8"))


def create_session_token(username: str, expires_in: Optional[int] = None) -> str:
    """Create a tamper-proof HMAC-SHA256 signed session token."""
    now = int(time.time())
    ttl = expires_in if expires_in is not None else get_session_max_age()
    exp = now + ttl

    header = {"alg": "HS256", "typ": "JWT"}
    payload = {"sub": username, "iat": now, "exp": exp}

    header_b64 = _b64_encode(json.dumps(header, separators=(",", ":")).encode("utf-8"))
    payload_b64 = _b64_encode(json.dumps(payload, separators=(",", ":")).encode("utf-8"))

    signing_input = f"{header_b64}.{payload_b64}".encode("utf-8")
    signature = hmac.new(
        get_secret_key().encode("utf-8"),
        signing_input,
        hashlib.sha256,
    ).digest()
    sig_b64 = _b64_encode(signature)

    return f"{header_b64}.{payload_b64}.{sig_b64}"


def verify_session_token(token: str) -> str:
    """
    Verify signature, expiration, and identity.
    Returns the authenticated username or raises 401.
    """
    if not token or not isinstance(token, str):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )

    parts = token.split(".")
    if len(parts) != 3:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
        )

    header_b64, payload_b64, sig_b64 = parts
    signing_input = f"{header_b64}.{payload_b64}".encode("utf-8")
    expected_sig = hmac.new(
        get_secret_key().encode("utf-8"),
        signing_input,
        hashlib.sha256,
    ).digest()

    try:
        actual_sig = _b64_decode(sig_b64)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token signature",
        )

    if not hmac.compare_digest(expected_sig, actual_sig):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token signature",
        )

    try:
        payload_bytes = _b64_decode(payload_b64)
        payload = json.loads(payload_bytes.decode("utf-8"))
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Malformed authentication payload",
        )

    exp = payload.get("exp")
    if not exp or int(time.time()) > int(exp):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication session expired",
        )

    sub = payload.get("sub")
    # Verify the user matches the configured single-business admin
    if not sub or sub != get_auth_username():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid session subject",
        )

    return sub


# ---------------------------------------------------------------------------
# Rate limiting (In-memory IP tracking)
# ---------------------------------------------------------------------------

def check_login_rate_limit(client_ip: str) -> None:
    """Enforce rate limits on login attempts to mitigate brute-force attacks."""
    now = time.time()
    cutoff = now - FAILED_ATTEMPT_WINDOW_SECONDS

    # Clean old records
    attempts = [t for t in _FAILED_LOGIN_ATTEMPTS.get(client_ip, []) if t > cutoff]
    _FAILED_LOGIN_ATTEMPTS[client_ip] = attempts

    if len(attempts) >= MAX_FAILED_ATTEMPTS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many failed login attempts. Please try again in a few minutes.",
        )


def record_failed_login(client_ip: str) -> None:
    now = time.time()
    cutoff = now - FAILED_ATTEMPT_WINDOW_SECONDS
    attempts = [t for t in _FAILED_LOGIN_ATTEMPTS.get(client_ip, []) if t > cutoff]
    attempts.append(now)
    _FAILED_LOGIN_ATTEMPTS[client_ip] = attempts


def record_successful_login(client_ip: str) -> None:
    _FAILED_LOGIN_ATTEMPTS.pop(client_ip, None)


# ---------------------------------------------------------------------------
# FastAPI Dependency: Require Authentication
# ---------------------------------------------------------------------------

def require_auth(
    request: Request,
    authorization: Optional[str] = Header(None),
) -> str:
    """
    Dependency that enforces authentication for protected endpoints.
    Reads token from HTTP-only session cookie (primary) or Authorization header (fallback).
    """
    token: Optional[str] = request.cookies.get(SESSION_COOKIE_NAME)

    if not token and authorization:
        parts = authorization.split()
        if len(parts) == 2 and parts[0].lower() == "bearer":
            token = parts[1]

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )

    return verify_session_token(token)

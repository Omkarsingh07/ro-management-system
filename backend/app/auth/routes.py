import logging
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status

from app.auth.models import LoginRequest, MessageResponse, UserOut
from app.auth.security import (
    SESSION_COOKIE_NAME,
    check_login_rate_limit,
    create_session_token,
    get_auth_password_hash,
    get_auth_username,
    get_cookie_samesite,
    get_is_production,
    get_session_max_age,
    record_failed_login,
    record_successful_login,
    require_auth,
    verify_password,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Authentication"])

# Dummy hash used to mitigate timing attacks when an invalid username is tested
_DUMMY_HASH = "$2b$12$e80yqVb/a9Lp3M6u7e9P.exkLpU39s7YjU6zQv4i4d4f8h9j1k2l3"


@router.post(
    "/login",
    response_model=UserOut,
    summary="Authenticate admin credentials and establish session",
)
def login(request: Request, response: Response, payload: LoginRequest) -> UserOut:
    client_ip = request.client.host if request.client else "127.0.0.1"

    # Enforce brute-force rate limit
    check_login_rate_limit(client_ip)

    submitted_username = payload.username.strip()
    submitted_password = payload.password

    expected_username = get_auth_username()
    expected_password_hash = get_auth_password_hash()

    # Validate against configured admin credentials with constant-time characteristics
    is_valid_user = submitted_username == expected_username
    target_hash = expected_password_hash if is_valid_user else _DUMMY_HASH

    is_valid_password = verify_password(submitted_password, target_hash)

    if not (is_valid_user and is_valid_password):
        record_failed_login(client_ip)
        logger.warning("Failed login attempt from IP: %s", client_ip)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password.",
        )

    # Login successful
    record_successful_login(client_ip)
    token = create_session_token(expected_username)

    samesite_val = get_cookie_samesite()
    secure_val = True if samesite_val == "none" else get_is_production()

    # Establish HTTP-only session cookie
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=token,
        max_age=get_session_max_age(),
        httponly=True,
        samesite=samesite_val,
        secure=secure_val,
        path="/",
    )

    return UserOut(authenticated=True, username=expected_username, token=token)


@router.post(
    "/logout",
    response_model=MessageResponse,
    summary="Invalidate session and clear session cookie",
)
def logout(response: Response) -> MessageResponse:
    samesite_val = get_cookie_samesite()
    secure_val = True if samesite_val == "none" else get_is_production()

    response.delete_cookie(
        key=SESSION_COOKIE_NAME,
        path="/",
        httponly=True,
        samesite=samesite_val,
        secure=secure_val,
    )
    return MessageResponse(message="Logged out successfully")


@router.get(
    "/me",
    response_model=UserOut,
    summary="Get current authenticated user info",
)
def get_current_user(username: str = Depends(require_auth)) -> UserOut:
    return UserOut(authenticated=True, username=username)

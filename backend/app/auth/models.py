from typing import Optional
from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    username: str = Field(..., min_length=1, max_length=128, description="Username or email")
    password: str = Field(..., min_length=1, max_length=128, description="Plaintext password to authenticate")


class UserOut(BaseModel):
    authenticated: bool = True
    username: str
    token: Optional[str] = None


class MessageResponse(BaseModel):
    message: str

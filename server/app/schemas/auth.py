from pydantic import BaseModel, EmailStr, Field

class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)

class TokenPayload(BaseModel):
    userId: int
    email: str
    role: str
    stationId: int | None = None

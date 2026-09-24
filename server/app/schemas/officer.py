from typing import Optional
from pydantic import BaseModel, EmailStr, Field

class CreateOfficerRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    fullName: str = Field(..., min_length=2, max_length=150)
    employeeId: str = Field(..., min_length=3, max_length=50)
    phone: str = Field(..., min_length=10, max_length=20)
    pollingStationId: Optional[int] = None

class UpdateOfficerRequest(BaseModel):
    fullName: Optional[str] = Field(None, min_length=2, max_length=150)
    phone: Optional[str] = Field(None, min_length=10, max_length=20)
    pollingStationId: Optional[int] = None

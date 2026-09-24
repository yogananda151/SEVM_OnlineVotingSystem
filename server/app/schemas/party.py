from typing import Optional
from pydantic import BaseModel, Field

class CreatePartyRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=200)
    abbreviation: str = Field(..., min_length=1, max_length=20)
    symbol: Optional[str] = None
    color: Optional[str] = "#1a73e8"
    foundedYear: Optional[int] = None

class UpdatePartyRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=200)
    abbreviation: Optional[str] = Field(None, min_length=1, max_length=20)
    symbol: Optional[str] = None
    color: Optional[str] = None
    foundedYear: Optional[int] = None
    isActive: Optional[bool] = None

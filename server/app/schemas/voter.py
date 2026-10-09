from typing import Optional, List, Any, Union
from datetime import datetime
from pydantic import BaseModel, Field

class CreateVoterRequest(BaseModel):
    constituencyId: int
    pollingStationId: int
    fullName: str = Field(..., min_length=2, max_length=150)
    voterId: str = Field(..., min_length=5, max_length=50)
    aadhaarNumber: Optional[str] = None
    dateOfBirth: Union[str, datetime]
    gender: str = Field(..., pattern="^(Male|Female|Other)$")
    address: str = Field(..., min_length=5)
    phone: Optional[str] = None
    serialNumber: int = Field(..., gt=0)

class UpdateVoterRequest(BaseModel):
    constituencyId: Optional[int] = None
    pollingStationId: Optional[int] = None
    fullName: Optional[str] = Field(None, min_length=2, max_length=150)
    voterId: Optional[str] = Field(None, min_length=5, max_length=50)
    dateOfBirth: Optional[Union[str, datetime]] = None
    gender: Optional[str] = Field(None, pattern="^(Male|Female|Other)$")
    address: Optional[str] = Field(None, min_length=5)
    phone: Optional[str] = None
    serialNumber: Optional[int] = Field(None, gt=0)
    photoUrl: Optional[str] = None
    isActive: Optional[bool] = None

class BulkVotersRequest(BaseModel):
    voters: List[dict[str, Any]]

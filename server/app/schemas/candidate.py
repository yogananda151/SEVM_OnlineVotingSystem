from typing import Optional, List
from pydantic import BaseModel, Field

class CreateCandidateRequest(BaseModel):
    electionId: int
    constituencyId: int
    partyId: Optional[int] = None
    fullName: str = Field(..., min_length=2, max_length=150)
    age: int = Field(..., ge=18, le=120)
    qualification: Optional[str] = None
    serialNumber: int = Field(..., gt=0)
    isIndependent: Optional[bool] = False

class UpdateCandidateRequest(BaseModel):
    partyId: Optional[int] = None
    fullName: Optional[str] = Field(None, min_length=2, max_length=150)
    age: Optional[int] = Field(None, ge=18, le=120)
    qualification: Optional[str] = None
    serialNumber: Optional[int] = Field(None, gt=0)
    isIndependent: Optional[bool] = None
    photoUrl: Optional[str] = None
    isActive: Optional[bool] = None

class BulkCandidatesRequest(BaseModel):
    candidates: List[CreateCandidateRequest]

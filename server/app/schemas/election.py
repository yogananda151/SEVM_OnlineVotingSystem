from typing import Optional, List, Union
from datetime import datetime
from pydantic import BaseModel, Field
from app.models.enums import ElectionStatus

class CreateElectionRequest(BaseModel):
    name: str = Field(..., min_length=3, max_length=200)
    description: Optional[str] = None
    electionType: str = Field(..., min_length=1)
    scheduledDate: Union[str, datetime]

class UpdateElectionRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=3, max_length=200)
    description: Optional[str] = None
    electionType: Optional[str] = None
    scheduledDate: Optional[Union[str, datetime]] = None

class UpdateElectionStatusRequest(BaseModel):
    status: ElectionStatus

class SetElectionConstituenciesRequest(BaseModel):
    constituencyIds: List[int] = Field(default_factory=list)

class SetElectionOfficerRequest(BaseModel):
    officerId: Optional[int] = None

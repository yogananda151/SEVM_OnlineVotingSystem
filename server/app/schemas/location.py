from typing import Optional
from pydantic import BaseModel, Field
from app.models.enums import MachineStatus

class CreateRegionRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=150)
    code: str = Field(..., min_length=2, max_length=50)
    description: Optional[str] = None

class UpdateRegionRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=150)
    code: Optional[str] = Field(None, min_length=2, max_length=50)
    description: Optional[str] = None
    isActive: Optional[bool] = None

class CreateConstituencyRequest(BaseModel):
    regionId: int
    name: str = Field(..., min_length=2, max_length=200)
    code: str = Field(..., min_length=2, max_length=50)
    description: Optional[str] = None

class UpdateConstituencyRequest(BaseModel):
    regionId: Optional[int] = None
    name: Optional[str] = Field(None, min_length=2, max_length=200)
    code: Optional[str] = Field(None, min_length=2, max_length=50)
    description: Optional[str] = None
    isActive: Optional[bool] = None

class CreatePollingStationRequest(BaseModel):
    constituencyId: int
    name: str = Field(..., min_length=3, max_length=200)
    code: str = Field(..., min_length=2, max_length=50)
    address: str = Field(..., min_length=5)
    capacity: Optional[int] = 1000
    totalBooths: Optional[int] = 1

class UpdatePollingStationRequest(BaseModel):
    constituencyId: Optional[int] = None
    name: Optional[str] = Field(None, min_length=3, max_length=200)
    code: Optional[str] = Field(None, min_length=2, max_length=50)
    address: Optional[str] = Field(None, min_length=5)
    capacity: Optional[int] = None
    totalBooths: Optional[int] = None
    isActive: Optional[bool] = None

class UpdateMachineStatusRequest(BaseModel):
    status: MachineStatus
    isPollingActive: Optional[bool] = None

from typing import Optional
from pydantic import BaseModel, Field
from app.models.enums import VerificationMethod

class InitiateVerificationRequest(BaseModel):
    method: VerificationMethod
    voterId: Optional[str] = None
    aadhaarNumber: Optional[str] = None
    pollingStationId: int

class VerifyOTPRequest(BaseModel):
    voterId: int
    otp: str = Field(..., min_length=6, max_length=6)

class SimulateBiometricRequest(BaseModel):
    voterId: int
    type: str = "FINGERPRINT"

class CastVoteRequest(BaseModel):
    voterId: int
    candidateId: int
    pollingStationId: int

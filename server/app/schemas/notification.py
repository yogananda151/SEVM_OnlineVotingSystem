from typing import Optional, List
from pydantic import BaseModel, Field

class CreateNotificationRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    message: str = Field(..., min_length=1)
    type: Optional[str] = "info"
    electionId: Optional[int] = None

class SettingUpdateRequest(BaseModel):
    value: str

class SettingBulkItem(BaseModel):
    key: str
    value: str

class BulkSettingsRequest(BaseModel):
    updates: List[SettingBulkItem]

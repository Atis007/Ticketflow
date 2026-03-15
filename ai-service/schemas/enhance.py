from pydantic import BaseModel, Field


class EnhanceRequest(BaseModel):
    title: str = Field(..., description="Event title to enhance")
    description: str = Field(..., description="Event description to enhance")


class EnhancedContent(BaseModel):
    title: str
    description: str


class EnhanceResponse(BaseModel):
    original: EnhancedContent
    enhanced: EnhancedContent
    model: str

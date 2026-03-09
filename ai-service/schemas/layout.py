from pydantic import BaseModel, Field


class RowSchema(BaseModel):
    label: str = Field(..., description="Row label, e.g. 'A', 'B', 'GA'")
    seat_count: int = Field(..., gt=0, description="Number of seats in this row")


class SectionSchema(BaseModel):
    name: str = Field(..., description="Section name, e.g. 'VIP', 'Parter', 'Balkon'")
    type: str = Field(
        default="standard",
        description="Section type: standard, vip, standing, balcony",
    )
    rows: list[RowSchema] = Field(..., min_length=1)


class LayoutSchema(BaseModel):
    venue_name: str = Field(..., description="Venue name")
    sections: list[SectionSchema] = Field(..., min_length=1)
    metadata: dict = Field(default_factory=dict)


class LayoutRequest(BaseModel):
    venue_name: str = Field(..., description="Name of the venue")
    venue_type: str = Field(
        default="concert_hall",
        description="Type: concert_hall, theater, stadium, arena, club",
    )
    total_capacity: int = Field(..., gt=0, le=100000)
    additional_instructions: str = Field(
        default="", description="Extra instructions for layout generation"
    )


class LayoutResponse(BaseModel):
    layout: LayoutSchema
    model: str
    attempts: int

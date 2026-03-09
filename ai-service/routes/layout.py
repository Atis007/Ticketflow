import json
import logging

from fastapi import APIRouter, HTTPException

from schemas.layout import LayoutRequest, LayoutResponse, LayoutSchema
from services.layout_normalizer import LayoutNormalizationError, validate_and_normalize
from services.ollama_client import OllamaClient

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/layout", tags=["layout"])

LAYOUT_SYSTEM_PROMPT = """You are a venue seating layout designer. Generate a realistic seating layout JSON for the given venue.

Rules:
- Each section should have a name and type (standard, vip, standing, balcony)
- Each section has rows, each row has a label (A, B, C... or numbered) and seat_count
- Row labels must be unique within each section
- Total seats across all sections should approximate the requested capacity
- Use realistic section names for the venue type (e.g., "Parter", "Balkon", "VIP" for theaters)

Output ONLY valid JSON matching this schema:
{
  "venue_name": "string",
  "sections": [
    {
      "name": "string",
      "type": "standard|vip|standing|balcony",
      "rows": [
        {"label": "string", "seat_count": integer}
      ]
    }
  ],
  "metadata": {}
}"""


@router.post("/generate", response_model=LayoutResponse)
async def generate_layout(req: LayoutRequest) -> LayoutResponse:
    client = OllamaClient()
    max_attempts = 3
    last_error = None

    prompt = (
        f"{LAYOUT_SYSTEM_PROMPT}\n\n"
        f"Venue: {req.venue_name}\n"
        f"Type: {req.venue_type}\n"
        f"Target capacity: {req.total_capacity}\n"
    )
    if req.additional_instructions:
        prompt += f"Additional instructions: {req.additional_instructions}\n"

    format_schema = LayoutSchema.model_json_schema()

    for attempt in range(1, max_attempts + 1):
        try:
            raw = client.generate_structured(
                prompt=prompt,
                format_schema=format_schema,
            )
            layout = validate_and_normalize(raw)
            return LayoutResponse(
                layout=layout,
                model=client.structured_model,
                attempts=attempt,
            )
        except LayoutNormalizationError as e:
            last_error = str(e)
            logger.warning("Layout validation failed (attempt %d): %s", attempt, e)
            prompt += f"\n\nYour previous output had validation errors: {e}. Please fix them."
        except Exception as e:
            last_error = str(e)
            logger.warning("Layout generation failed (attempt %d): %s", attempt, e)

    raise HTTPException(
        status_code=502,
        detail=f"Layout generation failed after {max_attempts} attempts: {last_error}",
    )

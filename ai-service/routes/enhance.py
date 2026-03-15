import json
import logging

from fastapi import APIRouter, HTTPException

from schemas.enhance import EnhanceRequest, EnhanceResponse, EnhancedContent
from services.ollama_client import OllamaClient

logger = logging.getLogger(__name__)
router = APIRouter(tags=["enhance"])

ENHANCE_SYSTEM_PROMPT = """You are a professional copywriter for an event ticketing platform. Improve the given event title and description to be more engaging, clear, and compelling.

Rules:
- Keep the same language as the original (if Serbian, respond in Serbian; if English, respond in English)
- Make the title concise but attention-grabbing
- Make the description informative and exciting for potential attendees
- Preserve all factual details from the original
- Do not add fictional details

Output ONLY valid JSON matching this schema:
{
  "title": "improved title string",
  "description": "improved description string"
}"""


@router.post("/enhance-content", response_model=EnhanceResponse)
async def enhance_content(req: EnhanceRequest) -> EnhanceResponse:
    client = OllamaClient()

    prompt = (
        f"{ENHANCE_SYSTEM_PROMPT}\n\n"
        f"Original title: {req.title}\n"
        f"Original description: {req.description}\n"
    )

    format_schema = EnhancedContent.model_json_schema()

    try:
        result = client.generate_structured(
            prompt=prompt,
            format_schema=format_schema,
        )

        enhanced_title = result.get("title", req.title)
        enhanced_description = result.get("description", req.description)

        return EnhanceResponse(
            original=EnhancedContent(title=req.title, description=req.description),
            enhanced=EnhancedContent(title=enhanced_title, description=enhanced_description),
            model=client.structured_model,
        )
    except Exception as e:
        logger.error("Content enhancement failed: %s", str(e))
        raise HTTPException(
            status_code=502,
            detail=f"Content enhancement failed: {str(e)}",
        )

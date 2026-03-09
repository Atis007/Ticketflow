"""Tool executor — each tool calls back to PHP backend via HTTP."""

import logging
import os
import time
from typing import Any

import httpx

logger = logging.getLogger(__name__)

PHP_BACKEND_URL = os.getenv("PHP_BACKEND_URL", "http://localhost:8000")


async def execute_tool(
    tool_name: str,
    arguments: dict[str, Any],
    admin_token: str | None = None,
) -> dict[str, Any]:
    """Execute a tool by calling the PHP backend and return the result."""
    start = time.monotonic()
    headers = {"Content-Type": "application/json", "Accept": "application/json"}
    if admin_token:
        headers["Authorization"] = f"Bearer {admin_token}"

    try:
        result = await _dispatch(tool_name, arguments, headers)
        duration_ms = int((time.monotonic() - start) * 1000)
        return {
            "tool": tool_name,
            "status": "success",
            "result": result,
            "duration_ms": duration_ms,
        }
    except Exception as e:
        duration_ms = int((time.monotonic() - start) * 1000)
        logger.error("Tool %s execution failed: %s", tool_name, str(e))
        return {
            "tool": tool_name,
            "status": "error",
            "error": str(e),
            "duration_ms": duration_ms,
        }


async def _dispatch(
    tool_name: str,
    args: dict[str, Any],
    headers: dict[str, str],
) -> Any:
    async with httpx.AsyncClient(base_url=PHP_BACKEND_URL, timeout=30.0) as client:
        if tool_name == "createEvent":
            payload = {
                "title": args.get("title", ""),
                "startsAt": args.get("startsAt", ""),
                "categoryId": args.get("categoryId", 1),
                "subcategoryId": args.get("subcategoryId", 1),
                "capacity": args.get("capacity", 100),
                "isFree": args.get("price", 0) == 0,
                "price": args.get("price"),
                "city": args.get("city"),
                "venue": args.get("venue"),
                "description": args.get("description"),
                "endsAt": args.get("endsAt"),
            }
            resp = await client.post("/api/events", json=payload, headers=headers)
            return resp.json()

        elif tool_name == "generateDescription":
            # Handled locally — no backend call needed
            title = args.get("eventTitle", "Event")
            tone = args.get("tone", "professional")
            return {
                "description": f"[AI-generated {tone} description for '{title}' — "
                f"replace with actual Ollama generation in production]"
            }

        elif tool_name == "analyzeSales":
            days = args.get("days", 30)
            resp = await client.get(
                f"/api/admin/analytics/sales",
                params={"days": days},
                headers=headers,
            )
            return resp.json()

        elif tool_name == "updateTickets":
            event_id = args.get("eventId")
            payload = {}
            if "price" in args:
                payload["price"] = args["price"]
                payload["isFree"] = args["price"] == 0
            if "capacity" in args:
                payload["capacity"] = args["capacity"]
            resp = await client.patch(
                f"/api/events/{event_id}",
                json=payload,
                headers=headers,
            )
            return resp.json()

        elif tool_name == "sendMarketingEmail":
            payload = {
                "subject": args.get("subject", ""),
                "body": args.get("body", ""),
                "targetAudience": args.get("targetAudience", "all"),
            }
            resp = await client.post(
                "/api/admin/email/marketing",
                json=payload,
                headers=headers,
            )
            return resp.json()

        else:
            return {"error": f"Unknown tool: {tool_name}"}

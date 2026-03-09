import json
import logging
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from services.ollama_client import OllamaClient
from tools.definitions import TOOLS, DEMO_PROMPTS
from tools.executor import execute_tool

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/chat", tags=["chat"])

MAX_TOOL_ITERATIONS = 5

SYSTEM_PROMPT = """You are the Ticketflow AI Admin Assistant. You help event organizers manage their events, analyze sales, and create marketing content.

You have access to tools that let you:
- Create events
- Generate event descriptions
- Analyze ticket sales
- Update ticket prices and capacity
- Send marketing emails

When the user asks you to perform an action, use the appropriate tool. When they ask a question, answer directly if you can, or use a tool to get the data you need.

Always be helpful, concise, and professional."""


class ChatMessage(BaseModel):
    role: str = Field(..., description="Message role: user, assistant, system, tool")
    content: str = Field(..., description="Message content")


class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    admin_token: str | None = Field(default=None, description="Admin auth token for backend calls")


class ChatResponse(BaseModel):
    response: str
    tool_calls: list[dict[str, Any]] = Field(default_factory=list)
    tool_results: list[dict[str, Any]] = Field(default_factory=list)
    model: str
    demo_prompts: list[str] = Field(default_factory=lambda: DEMO_PROMPTS)


@router.post("", response_model=ChatResponse)
async def chat(req: ChatRequest) -> ChatResponse:
    client = OllamaClient()

    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    for msg in req.messages:
        messages.append({"role": msg.role, "content": msg.content})

    all_tool_calls: list[dict[str, Any]] = []
    all_tool_results: list[dict[str, Any]] = []

    for iteration in range(MAX_TOOL_ITERATIONS):
        try:
            result = client.chat(messages=messages, tools=TOOLS)
        except Exception as e:
            logger.error("Chat inference failed: %s", str(e))
            raise HTTPException(status_code=502, detail=f"AI inference failed: {str(e)}")

        tool_calls = result.get("tool_calls", [])

        if not tool_calls:
            # No more tool calls — return the text response
            return ChatResponse(
                response=result.get("content", ""),
                tool_calls=all_tool_calls,
                tool_results=all_tool_results,
                model=result.get("model", client.chat_model),
            )

        # Execute each tool call
        for tc in tool_calls:
            func = tc.get("function", {})
            tool_name = func.get("name", "")
            tool_args = func.get("arguments", {})

            all_tool_calls.append({"name": tool_name, "arguments": tool_args})

            tool_result = await execute_tool(tool_name, tool_args, req.admin_token)
            all_tool_results.append(tool_result)

            # Feed tool result back into conversation
            messages.append({
                "role": "assistant",
                "content": "",
            })
            messages.append({
                "role": "tool",
                "content": json.dumps(tool_result),
            })

    # Exhausted iterations — return whatever we have
    return ChatResponse(
        response="I completed the requested actions. Please check the results above.",
        tool_calls=all_tool_calls,
        tool_results=all_tool_results,
        model=client.chat_model,
    )


@router.get("/demo-prompts")
async def demo_prompts() -> dict[str, list[str]]:
    return {"prompts": DEMO_PROMPTS}

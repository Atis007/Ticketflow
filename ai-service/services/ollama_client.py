import os
import time
import logging
from typing import Any

import ollama

logger = logging.getLogger(__name__)


class OllamaClient:
    def __init__(self) -> None:
        self.host = os.getenv("OLLAMA_HOST", "http://localhost:11434")
        self.structured_model = os.getenv("OLLAMA_STRUCTURED_MODEL", "qwen2.5")
        self.chat_model = os.getenv("OLLAMA_CHAT_MODEL", "llama3.1")
        self.client = ollama.Client(host=self.host)

    def generate_structured(
        self,
        prompt: str,
        format_schema: dict[str, Any] | None = None,
        max_retries: int = 3,
        timeout: float = 60.0,
    ) -> dict[str, Any]:
        """Generate structured JSON output using the structured model (qwen2.5)."""
        last_error = None

        for attempt in range(1, max_retries + 1):
            try:
                backoff = 2 ** (attempt - 1) if attempt > 1 else 0
                if backoff > 0:
                    time.sleep(backoff)

                kwargs: dict[str, Any] = {
                    "model": self.structured_model,
                    "messages": [{"role": "user", "content": prompt}],
                    "options": {"timeout": timeout},
                }
                if format_schema is not None:
                    kwargs["format"] = format_schema

                response = self.client.chat(**kwargs)
                content = response.message.content or ""

                import json
                parsed = json.loads(content)
                return parsed

            except Exception as e:
                last_error = e
                logger.warning(
                    "Ollama structured attempt %d/%d failed: %s",
                    attempt, max_retries, str(e),
                )
                if attempt < max_retries:
                    prompt += f"\n\nPrevious attempt failed with error: {str(e)}. Please fix and try again."

        raise RuntimeError(
            f"Ollama structured generation failed after {max_retries} attempts: {last_error}"
        )

    def chat(
        self,
        messages: list[dict[str, str]],
        tools: list[dict[str, Any]] | None = None,
        max_retries: int = 3,
        timeout: float = 60.0,
    ) -> dict[str, Any]:
        """Chat completion using the conversational model (llama3.1)."""
        last_error = None

        for attempt in range(1, max_retries + 1):
            try:
                backoff = 2 ** (attempt - 1) if attempt > 1 else 0
                if backoff > 0:
                    time.sleep(backoff)

                kwargs: dict[str, Any] = {
                    "model": self.chat_model,
                    "messages": messages,
                    "options": {"timeout": timeout},
                }
                if tools:
                    kwargs["tools"] = tools

                response = self.client.chat(**kwargs)
                return {
                    "content": response.message.content or "",
                    "tool_calls": [
                        {
                            "function": {
                                "name": tc.function.name,
                                "arguments": tc.function.arguments,
                            }
                        }
                        for tc in (response.message.tool_calls or [])
                    ],
                    "model": self.chat_model,
                }

            except Exception as e:
                last_error = e
                logger.warning(
                    "Ollama chat attempt %d/%d failed: %s",
                    attempt, max_retries, str(e),
                )

        raise RuntimeError(
            f"Ollama chat failed after {max_retries} attempts: {last_error}"
        )

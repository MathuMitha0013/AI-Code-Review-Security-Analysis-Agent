"""
LLM Client Manager with Multi-API Key Pooling, Automatic Failover,
and Model Tiering.

Provides high-availability LLM execution:
1. Rotates across multiple Groq API keys if configured.
2. Automatically fails over to the next key on HTTP 429 (Rate Limit),
   HTTP 503, or connection timeouts.
3. Automatically falls back to fast high-throughput models
   (e.g., llama-3.1-8b-instant) if the primary 70B model times out.
"""

import logging
import json
from typing import List, Optional, Dict, Any
from openai import OpenAI
from app.core.config import settings

logger = logging.getLogger(__name__)

_GROQ_BASE_URL = "https://api.groq.com/openai/v1"

_DEFAULT_MODELS = [
    "qwen/qwen3.6-27b",
    "qwen/qwen3.8-27b",
    "openai/gpt-oss-20b",
    "openai/gpt-oss-120b",
    "groq/compound",
    "groq/compound-mini",
]


class LLMKeyManager:
    def __init__(self):
        self._current_index = 0

    def get_api_keys(self) -> List[str]:
        """Collects all configured API keys from environment."""
        keys = []
        # Check comma-separated list
        if getattr(settings, "GROQ_API_KEYS", None):
            for k in settings.GROQ_API_KEYS.split(","):
                k_clean = k.strip()
                if k_clean and k_clean not in keys:
                    keys.append(k_clean)

        # Check individual key fields
        for field in ["GROQ_API_KEY", "GROQ_API_KEY_2", "GROQ_API_KEY_3"]:
            val = getattr(settings, field, "")
            if val and val.strip() and val.strip() not in keys:
                keys.append(val.strip())

        return keys

    def get_models(self) -> List[str]:
        """Returns deduplicated list of active candidate models."""
        primary = getattr(settings, "GROQ_MODEL", "")
        models = [primary] if primary else []
        for m in _DEFAULT_MODELS:
            if m not in models:
                models.append(m)
        return models

    def execute_chat_completion(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.2,
        response_format: Optional[Dict[str, str]] = None,
        timeout: float = 40.0,
    ) -> str:
        """
        Executes a chat completion across available API keys and model cascade.
        Automatically retries on 429 rate limits, timeouts, and server errors.
        """
        keys = self.get_api_keys()
        if not keys:
            raise RuntimeError(
                "GROQ_API_KEY is not configured. Add one or more keys to backend/.env."
            )

        models = self.get_models()
        last_error = None

        # Try across all keys
        for key_attempt in range(len(keys)):
            key_idx = (self._current_index + key_attempt) % len(keys)
            active_key = keys[key_idx]
            masked_key = active_key[:8] + "..." + active_key[-4:] if len(active_key) > 12 else "key"

            client = OpenAI(
                api_key=active_key,
                base_url=_GROQ_BASE_URL,
                timeout=timeout,
                max_retries=1,
            )

            # Try models in cascade
            for model_name in models:
                try:
                    logger.info("Attempting LLM call with Key %s on model '%s'", masked_key, model_name)

                    kwargs = {
                        "model": model_name,
                        "messages": messages,
                        "temperature": temperature,
                    }
                    if response_format:
                        kwargs["response_format"] = response_format

                    try:
                        response = client.chat.completions.create(**kwargs)
                    except Exception as call_exc:
                        if response_format and ("json_validate_failed" in str(call_exc) or "400" in str(call_exc)):
                            kwargs_no_rf = dict(kwargs)
                            kwargs_no_rf.pop("response_format", None)
                            response = client.chat.completions.create(**kwargs_no_rf)
                        else:
                            raise call_exc

                    # If successful, remember this working key
                    self._current_index = key_idx
                    return response.choices[0].message.content

                except Exception as exc:
                    err_str = str(exc)
                    last_error = exc
                    logger.warning(
                        "LLM call failed with Key %s on model '%s': %s",
                        masked_key,
                        model_name,
                        err_str,
                    )
                    # Continue to next model in cascade

        # If all keys and models failed, raise clear aggregated error
        raise RuntimeError(f"All configured LLM API keys/models exhausted or timed out: {last_error}")


llm_manager = LLMKeyManager()

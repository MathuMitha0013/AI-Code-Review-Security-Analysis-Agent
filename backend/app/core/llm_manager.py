"""
Multi-Provider LLM Client Manager with Automatic Provider Fallback,
API Key Pooling, and Model Tiering.

Provides high-availability enterprise LLM execution across:
1. Google Gemini (Gemini 1.5 Flash / 2.0 Flash via OpenAI-compatible endpoint)
2. Groq Cloud (Llama 3.3, Qwen 3.6/3.8, GPT-OSS with key rotation)
3. Local Ollama (Local offline execution at localhost:11434)
"""

import logging
import json
from typing import List, Optional, Dict, Any
from openai import OpenAI
from app.core.config import settings

logger = logging.getLogger(__name__)

_GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai/"
_GROQ_BASE_URL = "https://api.groq.com/openai/v1"

_GROQ_DEFAULT_MODELS = [
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
    "llama3-70b-8192",
    "gemma2-9b-it",
]

_GEMINI_DEFAULT_MODELS = [
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-1.5-flash",
]

_OLLAMA_DEFAULT_MODELS = [
    "qwen2.5-coder",
    "llama3",
    "mistral",
    "deepseek-r1",
]


class MultiProviderLLMManager:
    def __init__(self):
        self._groq_key_index = 0

    def get_api_keys(self) -> List[str]:
        """Backwards-compatible alias returning all active keys."""
        keys = self.get_groq_keys()
        gemini_key = getattr(settings, "GEMINI_API_KEY", "").strip()
        if gemini_key and gemini_key not in keys:
            keys.append(gemini_key)
        return keys

    def get_groq_keys(self) -> List[str]:
        """Collects all configured Groq API keys from environment."""
        keys = []
        if getattr(settings, "GROQ_API_KEYS", None):
            for k in settings.GROQ_API_KEYS.split(","):
                k_clean = k.strip()
                if k_clean and k_clean not in keys:
                    keys.append(k_clean)

        for field in ["GROQ_API_KEY", "GROQ_API_KEY_2", "GROQ_API_KEY_3"]:
            val = getattr(settings, field, "")
            if val and val.strip() and val.strip() not in keys:
                keys.append(val.strip())

        return keys

    def _call_gemini(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.2,
        response_format: Optional[Dict[str, str]] = None,
        timeout: float = 25.0,
    ) -> Optional[str]:
        """Executes LLM completion via Google Gemini."""
        gemini_key = getattr(settings, "GEMINI_API_KEY", "").strip()
        if not gemini_key:
            return None

        client = OpenAI(
            api_key=gemini_key,
            base_url=_GEMINI_BASE_URL,
            timeout=timeout,
            max_retries=1,
        )

        models = [getattr(settings, "GEMINI_MODEL", "gemini-1.5-flash")] + _GEMINI_DEFAULT_MODELS
        for model_name in dict.fromkeys(models):
            try:
                logger.info("[Provider: Gemini] Attempting call with model '%s'", model_name)
                kwargs = {
                    "model": model_name,
                    "messages": messages,
                    "temperature": temperature,
                }
                if response_format:
                    kwargs["response_format"] = response_format

                response = client.chat.completions.create(**kwargs)
                content = response.choices[0].message.content
                if content:
                    logger.info("[Provider: Gemini] Success with model '%s'", model_name)
                    return content
            except Exception as exc:
                logger.warning("[Provider: Gemini] Model '%s' failed: %s", model_name, exc)

        return None

    def _call_groq(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.2,
        response_format: Optional[Dict[str, str]] = None,
        timeout: float = 35.0,
    ) -> Optional[str]:
        """Executes LLM completion via Groq Cloud with key rotation and model cascade."""
        keys = self.get_groq_keys()
        if not keys:
            return None

        primary = getattr(settings, "GROQ_MODEL", "")
        models = ([primary] if primary else []) + _GROQ_DEFAULT_MODELS
        models = list(dict.fromkeys(models))

        for key_attempt in range(len(keys)):
            key_idx = (self._groq_key_index + key_attempt) % len(keys)
            active_key = keys[key_idx]
            masked_key = active_key[:8] + "..." + active_key[-4:] if len(active_key) > 12 else "key"

            client = OpenAI(
                api_key=active_key,
                base_url=_GROQ_BASE_URL,
                timeout=timeout,
                max_retries=1,
            )

            for model_name in models:
                try:
                    logger.info("[Provider: Groq] Attempting key %s with model '%s'", masked_key, model_name)
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

                    self._groq_key_index = key_idx
                    content = response.choices[0].message.content
                    if content:
                        logger.info("[Provider: Groq] Success with key %s and model '%s'", masked_key, model_name)
                        return content

                except Exception as exc:
                    logger.warning("[Provider: Groq] Key %s model '%s' failed: %s", masked_key, model_name, exc)

        return None

    def _call_ollama(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.2,
        response_format: Optional[Dict[str, str]] = None,
        timeout: float = 45.0,
    ) -> Optional[str]:
        """Executes LLM completion via Local Ollama offline instance."""
        ollama_base = getattr(settings, "OLLAMA_BASE_URL", "http://localhost:11434/v1")
        client = OpenAI(
            api_key="ollama",
            base_url=ollama_base,
            timeout=timeout,
            max_retries=1,
        )

        models = [getattr(settings, "OLLAMA_MODEL", "qwen2.5-coder")] + _OLLAMA_DEFAULT_MODELS
        for model_name in dict.fromkeys(models):
            try:
                logger.info("[Provider: Ollama] Attempting local model '%s' at %s", model_name, ollama_base)
                kwargs = {
                    "model": model_name,
                    "messages": messages,
                    "temperature": temperature,
                }
                if response_format:
                    kwargs["response_format"] = response_format

                response = client.chat.completions.create(**kwargs)
                content = response.choices[0].message.content
                if content:
                    logger.info("[Provider: Ollama] Success with model '%s'", model_name)
                    return content
            except Exception as exc:
                logger.debug("[Provider: Ollama] Local model '%s' unreachable or failed: %s", model_name, exc)

        return None

    def execute_chat_completion(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.2,
        response_format: Optional[Dict[str, str]] = None,
        timeout: float = 40.0,
    ) -> str:
        """
        Executes chat completion with Multi-Provider Fallback Chain:
        Gemini -> Groq -> Ollama (or custom order configured in settings.LLM_PROVIDER_ORDER).
        """
        order_str = getattr(settings, "LLM_PROVIDER_ORDER", "gemini,groq,ollama")
        providers = [p.strip().lower() for p in order_str.split(",") if p.strip()]

        has_gemini = bool(getattr(settings, "GEMINI_API_KEY", "").strip())
        has_groq = bool(self.get_groq_keys())
        has_keys = has_gemini or has_groq

        for provider in providers:
            try:
                if provider == "gemini":
                    res = self._call_gemini(messages, temperature, response_format, timeout=timeout)
                    if res:
                        return res
                elif provider == "groq":
                    res = self._call_groq(messages, temperature, response_format, timeout=timeout)
                    if res:
                        return res
                elif provider == "ollama":
                    res = self._call_ollama(messages, temperature, response_format, timeout=timeout)
                    if res:
                        return res
            except Exception as e:
                logger.warning("Provider '%s' execution raised unexpected error: %s", provider, e)

        if not has_keys:
            raise RuntimeError(
                "LLM API keys are not configured. Please set GEMINI_API_KEY or GROQ_API_KEY in backend/.env."
            )

        raise RuntimeError(
            "LLM provider execution failed (all configured upstream providers returned errors or rate limits)."
        )


llm_manager = MultiProviderLLMManager()


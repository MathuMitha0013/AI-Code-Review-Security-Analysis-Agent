"""
Remediation Agent — Milestone 3.

Generates a fix recommendation (explanation, corrected code, best-practice
guidance) for a single flagged finding, using an LLM (via Groq).

WHY LLM-BASED, UNLIKE EVERY PRIOR AGENT?
    Code Analysis and Security agents are deliberately rule-based static
    analysis (see Decision Log) -- detecting a KNOWN pattern is a good fit
    for deterministic rules. Generating a NATURAL, CONTEXT-AWARE fix
    suggestion is a fundamentally different problem: the "right" fix
    depends on the surrounding code's intent, which a fixed rule can't
    infer. This is the first genuinely LLM-appropriate task in the
    project -- a deliberate scope boundary, not a default reached for
    casually.

WHY ON-DEMAND (PER FINDING), NOT AUTOMATIC FOR EVERY FINDING ON EVERY
REVIEW?
    LLM calls have real latency (seconds, not milliseconds) and rate
    limits even on a free tier. Auto-generating remediation for every
    finding on every review would be slow and often wasteful -- most
    users only want a fix suggestion for the 2-3 findings they actually
    plan to act on. This keeps the existing fast review flow (Code
    Analysis + Security, sub-second) completely untouched; remediation
    is an explicit, separate action.

WHY GROQ, NOT GOOGLE GEMINI (the original choice)?
    Gemini keys generated via Google Cloud Console can end up with a
    provisioned quota of literally 0 requests until billing is linked
    to that specific Cloud project -- confirmed via direct API testing
    during development (`ListModels` succeeded, but `generateContent`
    returned `429 RESOURCE_EXHAUSTED` with `limit: 0` for every model,
    on multiple regenerated keys and multiple Google accounts). Groq's
    free tier requires no billing/card linkage at all. Its API is
    OpenAI-compatible, so we use the mature, stable `openai` Python
    package pointed at Groq's servers rather than a Google-specific SDK
    -- one less proprietary dependency, and a well-documented, widely
    used client library.

WHY MANUAL JSON PARSING, NOT A NATIVE response_schema LIKE GEMINI OFFERED?
    Groq's OpenAI-compatible API supports JSON MODE (guarantees valid
    JSON syntax) via `response_format={"type": "json_object"}`, but not
    full schema-enforced structured output the way Gemini's SDK did.
    We ask for the exact shape in the system prompt and validate the
    parsed JSON against our Pydantic model ourselves -- slightly more
    code than Gemini's approach, but still fully type-checked before it
    ever reaches the API response.
"""

import json
import logging

from openai import OpenAI

from app.core.config import settings
from app.models.remediation_schema import RemediationRequest, RemediationResult

logger = logging.getLogger(__name__)

_GROQ_BASE_URL = "https://api.groq.com/openai/v1"

_SYSTEM_INSTRUCTION = (
    "You are a senior secure-coding reviewer. Given a single flagged code "
    "finding, respond with ONLY a JSON object (no markdown fences, no "
    "extra text) with exactly these three keys:\n"
    '  "explanation": plain-language explanation of why this is a problem\n'
    '  "fixed_code": a corrected version of the exact flagged code snippet\n'
    '  "best_practice_notes": brief best-practice guidance for this class of issue\n'
    "Be specific and concise. Do not invent findings beyond what is given, "
    "and do not change unrelated parts of the code."
)


def generate_remediation(request: RemediationRequest) -> RemediationResult:
    """
    Calls Groq (via the OpenAI-compatible client) to generate a structured
    remediation for one finding.

    Raises:
        RuntimeError: if GROQ_API_KEY is not configured, the API call
        fails, or the response can't be parsed into the expected schema --
        the caller (API route) converts this into an appropriate HTTP
        error response.
    """
    if not settings.GROQ_API_KEY:
        raise RuntimeError(
            "GROQ_API_KEY is not configured. Add it to backend/.env — see README."
        )

    client = OpenAI(api_key=settings.GROQ_API_KEY, base_url=_GROQ_BASE_URL)

    prompt = (
        f"Finding: {request.finding_title}\n"
        f"Description: {request.finding_description}\n"
        f"Language: {request.language}\n"
        f"Flagged code:\n```{request.language}\n{request.code_snippet}\n```\n"
    )
    if request.full_code:
        prompt += (
            f"\nFull submitted code, for context only — do not rewrite all "
            f"of it, only fix the flagged snippet above:\n"
            f"```{request.language}\n{request.full_code}\n```\n"
        )

    logger.info("Requesting remediation from Groq for finding: %s", request.finding_title)

    try:
        response = client.chat.completions.create(
            model=settings.GROQ_MODEL,
            messages=[
                {"role": "system", "content": _SYSTEM_INSTRUCTION},
                {"role": "user", "content": prompt},
            ],
            response_format={"type": "json_object"},
            # Low temperature: we want a consistent, focused fix grounded
            # in the actual finding, not creative variation.
            temperature=0.2,
        )
    except Exception as exc:
        logger.error("Groq API call failed: %s", exc)
        raise RuntimeError(f"Remediation generation failed: {exc}") from exc

    raw_content = response.choices[0].message.content
    try:
        parsed_json = json.loads(raw_content)
        return RemediationResult(**parsed_json)
    except (json.JSONDecodeError, TypeError, ValueError) as exc:
        logger.error("Groq response could not be parsed into the expected schema: %s", exc)
        raise RuntimeError(
            f"Groq returned a response that could not be parsed into the expected schema: {exc}"
        ) from exc

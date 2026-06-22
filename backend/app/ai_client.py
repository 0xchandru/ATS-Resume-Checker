"""
Centralised AI client — NVIDIA NIM (OpenAI-compatible endpoint).

All backend features that need an LLM import get_ai_client() from here.
The same openai SDK is used; only the base_url and api_key differ.
"""
import os
import logging
import openai

logger = logging.getLogger(__name__)

# NVIDIA NIM base URL — all hosted models share this endpoint
NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1"

# Model to use across all AI features.
# Default: Llama-3.1-8B (Meta) hosted on NVIDIA NIM.
# Override at runtime by setting the NVIDIA_MODEL env var.
NVIDIA_MODEL = os.environ.get("NVIDIA_MODEL", "meta/llama-3.1-8b-instruct")

_client: openai.OpenAI | None = None


def get_ai_client() -> openai.OpenAI:
    """Return a cached OpenAI-SDK client pointed at NVIDIA NIM."""
    global _client
    if _client is None:
        api_key = os.environ.get("NVIDIA_API_KEY")
        if not api_key:
            raise RuntimeError("NVIDIA_API_KEY environment variable is not set")
        _client = openai.OpenAI(
            api_key=api_key,
            base_url=NVIDIA_BASE_URL,
        )
        logger.info("NVIDIA NIM client initialised (model=%s)", NVIDIA_MODEL)
    return _client


def ai_model() -> str:
    """Return the active model name (respects NVIDIA_MODEL env override)."""
    return os.environ.get("NVIDIA_MODEL", NVIDIA_MODEL)

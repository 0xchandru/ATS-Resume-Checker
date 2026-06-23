"""
Multi-Provider AI Client — Unified factory for all LLM backends.

Supported providers (set AI_PROVIDER env var):
  openai      — OpenAI GPT (gpt-4o, gpt-4o-mini, etc.)
  anthropic   — Anthropic Claude (OpenAI-compat endpoint)
  google      — Google Gemini (via OpenAI-compat endpoint)
  cloudflare  — Cloudflare Workers AI (GLM, Llama, Mistral, Qwen, etc.)
  mistral     — Mistral AI
  ollama      — Local Ollama server (no API key needed)
  nvidia      — NVIDIA NIM (legacy default)
  openrouter  — OpenRouter (200+ models via single endpoint)

All providers are accessed through the OpenAI SDK's base_url override
so callers just use get_ai_client() and ai_model() without knowing
which provider is active.
"""

import os
import logging
from typing import Optional

import openai

logger = logging.getLogger(__name__)

_client: Optional[openai.OpenAI] = None

# ─────────────────────────────────────────────────────────────────────────────
# Provider registry — each entry defines how to build the client
# ─────────────────────────────────────────────────────────────────────────────
_PROVIDERS: dict = {
    "openai": {
        "base_url": lambda: os.environ.get("OPENAI_BASE_URL", "https://api.openai.com/v1"),
        "api_key_env": "OPENAI_API_KEY",
        "default_model": "gpt-4o-mini",
        "model_env": "OPENAI_MODEL",
    },
    "anthropic": {
        # Anthropic exposes an OpenAI-compatible endpoint
        "base_url": lambda: "https://api.anthropic.com/v1",
        "api_key_env": "ANTHROPIC_API_KEY",
        "default_model": "claude-3-5-haiku-20241022",
        "model_env": "ANTHROPIC_MODEL",
        "extra_headers": {"anthropic-version": "2023-06-01"},
    },
    "google": {
        "base_url": lambda: "https://generativelanguage.googleapis.com/v1beta/openai/",
        "api_key_env": "GOOGLE_API_KEY",
        "default_model": "gemini-1.5-flash",
        "model_env": "GOOGLE_MODEL",
    },
    "cloudflare": {
        # Includes GLM-4, Llama, Mistral, Qwen via Cloudflare Workers AI
        "base_url": lambda: (
            f"https://api.cloudflare.com/client/v4/accounts/"
            f"{os.environ.get('CLOUDFLARE_ACCOUNT_ID', 'MISSING')}/ai/v1"
        ),
        "api_key_env": "CLOUDFLARE_API_TOKEN",
        "default_model": "@cf/meta/llama-3.1-8b-instruct",
        "model_env": "CLOUDFLARE_MODEL",
    },
    "mistral": {
        "base_url": lambda: "https://api.mistral.ai/v1",
        "api_key_env": "MISTRAL_API_KEY",
        "default_model": "mistral-small-latest",
        "model_env": "MISTRAL_MODEL",
    },
    "ollama": {
        "base_url": lambda: os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434/v1"),
        "api_key_env": None,  # Ollama requires no key
        "default_model": "llama3.2",
        "model_env": "OLLAMA_MODEL",
    },
    "nvidia": {
        "base_url": lambda: "https://integrate.api.nvidia.com/v1",
        "api_key_env": "NVIDIA_API_KEY",
        "default_model": "meta/llama-3.1-8b-instruct",
        "model_env": "NVIDIA_MODEL",
    },
    "openrouter": {
        "base_url": lambda: "https://openrouter.ai/api/v1",
        "api_key_env": "OPENROUTER_API_KEY",
        "default_model": "meta-llama/llama-3.1-8b-instruct:free",
        "model_env": "OPENROUTER_MODEL",
    },
}


def _active_provider() -> str:
    """Return the active provider name (lowercased, stripped)."""
    return os.environ.get("AI_PROVIDER", "nvidia").strip().lower()


def get_ai_client() -> openai.OpenAI:
    """
    Return a cached OpenAI-SDK client pointed at the active provider.

    Provider selection:
    1. AI_PROVIDER env var (explicit)
    2. First provider whose API key env var is set (auto-detect)
    3. Raises RuntimeError if nothing found

    All providers use the OpenAI SDK — only base_url and api_key differ.
    """
    global _client
    if _client is not None:
        return _client

    provider_name = _active_provider()

    # Auto-detect if provider name not recognised
    if provider_name not in _PROVIDERS:
        logger.warning("Unknown AI_PROVIDER='%s', attempting auto-detect", provider_name)
        for pname, pconf in _PROVIDERS.items():
            key_env = pconf.get("api_key_env")
            if key_env and os.environ.get(key_env):
                provider_name = pname
                logger.info("Auto-detected provider: %s (found %s)", pname, key_env)
                break

    if provider_name not in _PROVIDERS:
        raise RuntimeError(
            "No AI provider configured. Set AI_PROVIDER in your .env file "
            "and add the matching API key. See .env.example for all options."
        )

    conf = _PROVIDERS[provider_name]
    key_env = conf.get("api_key_env")

    # Resolve API key (Ollama needs none)
    if key_env is None:
        api_key = "ollama"  # openai SDK requires a non-empty string
    else:
        api_key = os.environ.get(key_env, "")
        if not api_key:
            raise RuntimeError(
                f"Provider '{provider_name}' requires env var '{key_env}' "
                f"but it is not set. See .env.example for configuration."
            )

    base_url = conf["base_url"]()
    extra_headers = conf.get("extra_headers", {})

    _client = openai.OpenAI(
        api_key=api_key,
        base_url=base_url,
        default_headers=extra_headers or None,
    )

    logger.info(
        "AI client initialised — provider=%s  model=%s  base_url=%s",
        provider_name, ai_model(), base_url,
    )
    return _client


def ai_model() -> str:
    """Return the active model name, respecting provider-specific env overrides."""
    provider_name = _active_provider()
    conf = _PROVIDERS.get(provider_name, _PROVIDERS["nvidia"])
    model_env = conf.get("model_env", "NVIDIA_MODEL")
    return os.environ.get(model_env, conf["default_model"])


def provider_info() -> dict:
    """Return metadata about the currently configured provider (for health checks)."""
    name = _active_provider()
    conf = _PROVIDERS.get(name, {})
    key_env = conf.get("api_key_env", "")
    return {
        "provider": name,
        "model": ai_model(),
        "base_url": conf["base_url"]() if "base_url" in conf else "unknown",
        "key_env": key_env or "N/A (no key required)",
        "key_set": bool(key_env and os.environ.get(key_env, "")),
        "supported_providers": list(_PROVIDERS.keys()),
    }


def reset_client() -> None:
    """Force re-initialisation of the client (useful in tests or after env changes)."""
    global _client
    _client = None

"""LLM Provider abstraction - supports mock, kimi, deepseek, openai, anthropic."""

import json
import os
import re
from typing import Optional
from abc import ABC, abstractmethod
from pydantic import BaseModel


class LLMConfig(BaseModel):
    provider: str = "mock"
    model: Optional[str] = None
    api_key: Optional[str] = None
    base_url: Optional[str] = None
    temperature: float = 0.7
    max_tokens: int = 2048


def get_llm_config() -> LLMConfig:
    """Load LLM configuration from environment variables."""
    provider = os.getenv("LLM_PROVIDER", "mock")

    if provider == "kimi":
        return LLMConfig(
            provider="kimi",
            model=os.getenv("KIMI_MODEL", "moonshot-v1-8k"),
            api_key=os.getenv("KIMI_API_KEY", ""),
            base_url=os.getenv("KIMI_BASE_URL", "https://api.moonshot.cn/v1"),
        )
    elif provider == "deepseek":
        return LLMConfig(
            provider="deepseek",
            model=os.getenv("DEEPSEEK_MODEL", "deepseek-chat"),
            api_key=os.getenv("DEEPSEEK_API_KEY", ""),
            base_url=os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com/v1"),
        )
    elif provider == "openai":
        return LLMConfig(
            provider="openai",
            model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
            api_key=os.getenv("OPENAI_API_KEY", ""),
            base_url=os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1"),
        )
    elif provider == "anthropic":
        return LLMConfig(
            provider="anthropic",
            model=os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-6"),
            api_key=os.getenv("ANTHROPIC_API_KEY", ""),
            base_url=os.getenv("ANTHROPIC_BASE_URL", "https://api.anthropic.com/v1"),
        )
    else:
        return LLMConfig(provider="mock")


class LLMProvider(ABC):
    """Abstract base for LLM providers."""

    @abstractmethod
    async def generate(self, system_prompt: str, user_prompt: str, **kwargs) -> str:
        """Generate a response from the LLM."""
        ...


class MockProvider(LLMProvider):
    """Mock provider that returns predefined responses."""

    async def generate(self, system_prompt: str, user_prompt: str, **kwargs) -> str:
        """Return a mock training feedback."""
        return """你已经表达了不同意见，这是很好的开始。但需要注意三点：
1. 观点要明确 - 直接说你的建议是什么
2. 理由要具体 - 用数据或事实支撑
3. 给出替代方案 - 不要说"不好"，说"可以怎么做"

试着重说一遍，先用PREP结构组织你的想法。"""


class OpenAICompatibleProvider(LLMProvider):
    """Provider for OpenAI-compatible APIs (Kimi, DeepSeek, etc.)."""

    def __init__(self, config: LLMConfig):
        self.config = config

    async def generate(self, system_prompt: str, user_prompt: str, **kwargs) -> str:
        """Call the API and return the response text."""
        try:
            from openai import AsyncOpenAI
            import httpx

            # Decide whether to use the system proxy. DeepSeek and Moonshot are
            # in-China endpoints that should NOT go through a VPN proxy.
            base_url = (self.config.base_url or "").lower()
            bypass_proxy = (
                "deepseek.com" in base_url
                or "moonshot" in base_url
                or os.getenv("LLM_DISABLE_PROXY", "").lower() in ("1", "true", "yes")
            )

            http_client_kwargs = {"timeout": 60.0}
            if bypass_proxy:
                # Explicit empty proxies disables system proxy detection.
                http_client_kwargs["proxy"] = None
                http_client_kwargs["trust_env"] = False

            http_client = httpx.AsyncClient(**http_client_kwargs)

            client = AsyncOpenAI(
                api_key=self.config.api_key,
                base_url=self.config.base_url,
                timeout=60.0,
                http_client=http_client,
            )

            response = await client.chat.completions.create(
                model=self.config.model or "gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=kwargs.get("temperature", self.config.temperature),
                max_tokens=kwargs.get("max_tokens", self.config.max_tokens),
            )

            return response.choices[0].message.content or ""

        except Exception as e:
            # Fall back to mock on error
            import logging
            logging.warning(f"LLM API error: {e}, falling back to mock")
            return await MockProvider().generate(system_prompt, user_prompt)


def get_llm_provider(config: LLMConfig | None = None) -> LLMProvider:
    """Factory: return the configured LLM provider.

    If a custom config is provided (e.g. user-supplied API key), use it.
    Otherwise fall back to the server-wide environment configuration.
    """
    if config is None:
        config = get_llm_config()

    if config.provider == "mock":
        return MockProvider()
    elif config.provider in ("kimi", "deepseek", "openai"):
        if not config.api_key:
            import logging
            logging.warning(
                f"No API key for {config.provider}, falling back to mock"
            )
            return MockProvider()
        return OpenAICompatibleProvider(config)
    elif config.provider == "anthropic":
        if not config.api_key:
            import logging
            logging.warning("No API key for anthropic, falling back to mock")
            return MockProvider()
        return AnthropicProvider(config)
    else:
        return MockProvider()


class AnthropicProvider(LLMProvider):
    """Provider for Claude (Anthropic) API."""

    def __init__(self, config: LLMConfig):
        self.config = config

    async def generate(self, system_prompt: str, user_prompt: str, **kwargs) -> str:
        try:
            import urllib.request
            import asyncio

            body = {
                "model": self.config.model or "claude-sonnet-4-6",
                "max_tokens": kwargs.get("max_tokens", self.config.max_tokens),
                "temperature": kwargs.get("temperature", self.config.temperature),
                "system": system_prompt,
                "messages": [{"role": "user", "content": user_prompt}],
            }
            data = json.dumps(body).encode("utf-8")
            req = urllib.request.Request(
                f"{self.config.base_url or 'https://api.anthropic.com/v1'}/messages",
                data=data,
                method="POST",
            )
            req.add_header("x-api-key", self.config.api_key)
            req.add_header("anthropic-version", "2023-06-01")
            req.add_header("Content-Type", "application/json")

            def _call():
                with urllib.request.urlopen(req, timeout=30) as resp:
                    return json.loads(resp.read().decode("utf-8"))

            result = await asyncio.to_thread(_call)
            blocks = result.get("content") or []
            texts = [b.get("text", "") for b in blocks if b.get("type") == "text"]
            return "".join(texts).strip() or ""
        except Exception as e:
            import logging
            logging.warning(f"Anthropic API error: {e}, falling back to mock")
            return await MockProvider().generate(system_prompt, user_prompt)


def extract_json(text: str) -> Optional[dict]:
    """Best-effort: extract a JSON object from an LLM reply.

    Handles ``` fences and finds the outermost { ... } block.
    """
    if not text:
        return None
    cleaned = text.strip()
    cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
    cleaned = re.sub(r"\s*```$", "", cleaned)
    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start == -1 or end == -1 or end < start:
        return None
    try:
        return json.loads(cleaned[start : end + 1])
    except Exception:
        return None

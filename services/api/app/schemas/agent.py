"""Pydantic schemas for request/response validation."""

from typing import Optional, Literal
from pydantic import BaseModel, Field


class AudioFeatures(BaseModel):
    duration_sec: Optional[float] = None
    speech_rate_wpm: Optional[int] = None
    pause_count: Optional[int] = None
    filler_words: Optional[list[str]] = None


class LLMConfigInput(BaseModel):
    """User-provided LLM configuration (overrides server defaults)."""

    provider: str = Field(..., description="Provider name: deepseek, openai, anthropic, kimi")
    api_key: str = Field(..., description="API key for the provider")
    model: Optional[str] = Field(default=None, description="Model name, e.g. deepseek-chat")
    base_url: Optional[str] = Field(default=None, description="Custom base URL if needed")


class AgentTurnRequest(BaseModel):
    user_id: str = Field(..., description="User identifier")
    session_id: str = Field(..., description="Training session identifier")
    mode: Literal[
        "scene_analysis",
        "expression_training",
        "roleplay",
        "etiquette_learning",
        "voice_practice",
        "feedback",
    ] = Field(default="expression_training")
    text: str = Field(..., min_length=1, max_length=5000, description="User input text")
    audio_features: Optional[AudioFeatures] = None
    user_stage: Optional[Literal["teen", "college", "new_worker", "other"]] = Field(
        default=None,
        description="User life stage for personalized coaching",
    )
    llm_config: Optional[LLMConfigInput] = Field(
        default=None,
        description="User-configured LLM settings (optional)",
    )


class Scores(BaseModel):
    clarity: int = Field(ge=1, le=10)
    logic: int = Field(ge=1, le=10)
    evidence: int = Field(ge=1, le=10)
    confidence: int = Field(ge=1, le=10)
    etiquette: int = Field(ge=1, le=10)
    boundary: int = Field(ge=1, le=10)


class Feedback(BaseModel):
    clarity: int = Field(ge=1, le=10)
    logic: int = Field(ge=1, le=10)
    evidence: int = Field(ge=1, le=10)
    confidence: int = Field(ge=1, le=10)
    etiquette: int = Field(ge=1, le=10)
    boundary: int = Field(ge=1, le=10)
    strengths: list[str]
    improvements: list[str]
    rewritten_expression: str
    next_practice: str


class SafetyCheck(BaseModel):
    risk_level: Literal["none", "low", "medium", "high", "crisis"] = "none"
    action: Optional[str] = None
    message: Optional[str] = None


class AgentTurnResponse(BaseModel):
    reply_text: str
    intent: Optional[str] = None
    scores: Feedback
    safety: SafetyCheck = Field(default_factory=SafetyCheck)
    next_action: Optional[str] = None


class TranscribeRequest(BaseModel):
    session_id: str


class TranscribeResponse(BaseModel):
    transcript: str
    audio_features: Optional[AudioFeatures] = None


class SynthesizeRequest(BaseModel):
    text: str = Field(..., min_length=1)
    voice: str = "warm_coach"


class SynthesizeResponse(BaseModel):
    audio_url: str
    duration_sec: Optional[float] = None

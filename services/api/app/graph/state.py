"""LangGraph state and node definitions."""

from typing import TypedDict, Literal, Optional


class AgentState(TypedDict):
    """State for the social coach LangGraph."""

    user_id: str
    session_id: str
    mode: Literal[
        "scene_analysis",
        "expression_training",
        "roleplay",
        "etiquette_learning",
        "voice_practice",
        "feedback",
    ]
    user_text: str
    user_stage: Optional[str]  # teen, college, new_worker, other

    # Safety
    risk_level: Literal["none", "low", "medium", "high", "crisis"]
    safety_action: Optional[str]
    safety_message: Optional[str]

    # Intent
    intent: Optional[str]

    # Coach output
    coach_reply: Optional[str]
    coach_scores: Optional[dict]
    coach_strengths: Optional[list[str]]
    coach_improvements: Optional[list[str]]
    coach_rewritten: Optional[str]
    coach_next_practice: Optional[str]

    # LLM override (user-configured API)
    llm_config: Optional[dict]

    # RAG knowledge context
    knowledge_context: Optional[str]

    # Final
    next_action: Optional[str]
    error: Optional[str]

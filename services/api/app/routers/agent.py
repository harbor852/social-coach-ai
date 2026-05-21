"""Agent router - handles training turns with mock LLM provider."""

from fastapi import APIRouter, HTTPException

from ..schemas.agent import (
    AgentTurnRequest,
    AgentTurnResponse,
    Feedback,
    SafetyCheck,
)

router = APIRouter()


# Mock feedback for MVP
MOCK_FEEDBACK = Feedback(
    clarity=5,
    logic=4,
    evidence=3,
    confidence=5,
    etiquette=8,
    boundary=7,
    strengths=["表达了不同意见", "语气温和有礼貌"],
    improvements=["观点不够明确", "缺少具体理由", "没给出替代方案"],
    rewritten_expression="我建议这次不要完全沿用上次方案。原因是上次报名转化率只有 18%，低于预期。如果我们这次把宣传重点改成用户案例，可能会更容易吸引目标人群。",
    next_practice="请用 PREP 结构重新表达：先说结论，再说两个理由，最后给一个建议。",
)

# Safety patterns for quick check
CRISIS_KEYWORDS = [
    "不想活了", "自杀", "自残", "想死", "结束生命",
    "杀", "弄死", "打死", "报复",
    "虐待", "霸凌", "被欺负",
]


def quick_safety_check(text: str) -> SafetyCheck:
    """Simple keyword-based safety check. In production, use LLM-based check."""
    text_lower = text.lower()

    # Crisis keywords
    if any(kw in text_lower for kw in ["不想活了", "自杀", "想死", "结束生命"]):
        return SafetyCheck(
            risk_level="crisis",
            action="stop_and_support",
            message="我听到了你的困扰。请立即联系你信任的人，或拨打心理援助热线。我在这里陪着你，但我不能替代专业的帮助。",
        )

    if any(kw in text_lower for kw in ["杀", "弄死", "打死"]):
        return SafetyCheck(
            risk_level="high",
            action="stop_and_support",
            message="我理解你可能很愤怒，但伤害他人不能解决问题。请和信任的人聊聊你的感受。",
        )

    # PUA / manipulation requests
    pua_keywords = ["操控", "让她离不开我", "pua", "套路", "精神控制"]
    if any(kw in text_lower for kw in pua_keywords):
        return SafetyCheck(
            risk_level="medium",
            action="refuse_manipulation",
            message="我不能提供操控或PUA类型的建议。健康的关系建立在尊重、真诚和双向沟通上。我可以帮你练习如何真诚地表达感受。",
        )

    # Minor risk
    minor_keywords = ["离家出走", "网友见面", "私奔"]
    if any(kw in text_lower for kw in minor_keywords):
        return SafetyCheck(
            risk_level="high",
            action="warn_minor_risk",
            message="如果你还未成年，请务必告诉信任的成年人。安全永远是第一位的。",
        )

    return SafetyCheck(risk_level="none")


@router.post("/turn", response_model=AgentTurnResponse)
async def agent_turn(request: AgentTurnRequest):
    """Process a training turn with the AI social coach.

    MVP: returns mock feedback with safety check.
    """
    # Safety check first
    safety = quick_safety_check(request.text)

    if safety.risk_level in ("high", "crisis"):
        return AgentTurnResponse(
            reply_text=safety.message or "我听到了你的困扰。",
            intent="safety_response",
            scores=MOCK_FEEDBACK,
            safety=safety,
            next_action="safety_support",
        )

    if safety.risk_level == "medium":
        return AgentTurnResponse(
            reply_text=safety.message or "我理解你的需求，让我换一个更好的方式来帮助你。",
            intent="safety_response",
            scores=MOCK_FEEDBACK,
            safety=safety,
            next_action="redirect_to_healthy",
        )

    # Normal training flow - return mock feedback
    reply = (
        "你已经表达了不同意见，这是很好的开始。"
        "但这句话有三个问题：观点不够明确、理由太模糊、缺少替代建议。"
    )

    return AgentTurnResponse(
        reply_text=reply,
        intent=request.mode,
        scores=MOCK_FEEDBACK,
        safety=safety,
        next_action="retry_expression",
    )

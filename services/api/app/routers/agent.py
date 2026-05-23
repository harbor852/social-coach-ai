"""Agent router - uses LangGraph for training workflow, persists to SQLite."""

from fastapi import APIRouter

from ..schemas.agent import (
    AgentTurnRequest,
    AgentTurnResponse,
    Feedback,
    SafetyCheck,
)
from ..graph.workflow import coach_graph
from ..graph.state import AgentState
from ..models.database import (
    get_engine,
    get_session_factory,
    TrainingSession,
    TrainingTurn,
    SkillAssessment,
    KnowledgeEntry,
)
from ..services.rag import retrieve_by_keywords

router = APIRouter()

# Database session
_engine = None
_Session = None


def _get_session():
    global _engine, _Session
    if _engine is None:
        _engine = get_engine()
        _Session = get_session_factory(_engine)
    return _Session()


@router.post("/turn", response_model=AgentTurnResponse)
async def agent_turn(request: AgentTurnRequest):
    """Process a training turn through the LangGraph coaching workflow."""
    # Try to resolve user_stage from profile if not provided
    resolved_stage = request.user_stage
    if not resolved_stage:
        try:
            db = _get_session()
            try:
                from ..models.database import User
                user = db.query(User).filter_by(id=request.user_id).first()
                if user and user.age_stage:
                    resolved_stage = user.age_stage
            finally:
                db.close()
        except Exception:
            resolved_stage = None

    # Retrieve knowledge context (simple keyword-based RAG for now)
    knowledge_context = None
    try:
        db = _get_session()
        try:
            entries = db.query(KnowledgeEntry).filter_by(user_id=request.user_id).all()
            all_chunks = []
            for entry in entries:
                chunks = entry.chunks or []
                all_chunks.extend(chunks)
            if all_chunks:
                relevant = retrieve_by_keywords(request.text, all_chunks, top_k=3)
                if relevant:
                    knowledge_context = "\n\n".join(relevant)
        finally:
            db.close()
    except Exception:
        knowledge_context = None

    # Build initial state
    initial_state: AgentState = {
        "user_id": request.user_id,
        "session_id": request.session_id,
        "mode": request.mode,
        "user_text": request.text,
        "user_stage": resolved_stage,
        "risk_level": "none",
        "safety_action": None,
        "safety_message": None,
        "intent": None,
        "coach_reply": None,
        "coach_scores": None,
        "coach_strengths": None,
        "coach_improvements": None,
        "coach_rewritten": None,
        "coach_next_practice": None,
        "next_action": None,
        "error": None,
        "llm_config": request.llm_config.model_dump() if request.llm_config else None,
        "knowledge_context": knowledge_context,
    }

    # Run the graph
    result = await coach_graph.ainvoke(initial_state)

    # Build response from graph result
    scores_data = result.get("coach_scores") or {}

    def _clamp(v, lo=1, hi=10, default=5):
        if v is None:
            return default
        return max(lo, min(hi, int(v)))

    feedback = Feedback(
        clarity=_clamp(scores_data.get("clarity"), default=5),
        logic=_clamp(scores_data.get("logic"), default=5),
        evidence=_clamp(scores_data.get("evidence"), default=3),
        confidence=_clamp(scores_data.get("confidence"), default=5),
        etiquette=_clamp(scores_data.get("etiquette"), default=5),
        boundary=_clamp(scores_data.get("boundary"), default=5),
        strengths=result.get("coach_strengths") or [],
        improvements=result.get("coach_improvements") or [],
        rewritten_expression=result.get("coach_rewritten") or "",
        next_practice=result.get("coach_next_practice") or "继续练习",
    )

    safety = SafetyCheck(
        risk_level=result.get("risk_level", "none"),
        action=result.get("safety_action"),
        message=result.get("safety_message"),
    )

    response = AgentTurnResponse(
        reply_text=result.get("coach_reply") or "已收到你的输入。",
        intent=result.get("intent"),
        scores=feedback,
        safety=safety,
        next_action=result.get("next_action"),
    )

    # Persist to database
    try:
        _save_turn(request, response, result)
    except Exception:
        pass  # Don't fail the request if DB save fails

    return response


def _save_turn(request: AgentTurnRequest, response: AgentTurnResponse, graph_result: dict):
    """Save training turn and session to SQLite."""
    db = _get_session()
    try:
        # Ensure session exists
        session = db.query(TrainingSession).filter_by(id=request.session_id).first()
        if not session:
            session = TrainingSession(
                id=request.session_id,
                user_id=request.user_id,
                mode=request.mode,
                status="active",
            )
            db.add(session)

        # Save user turn
        user_turn = TrainingTurn(
            session_id=request.session_id,
            role="user",
            text=request.text,
        )
        db.add(user_turn)

        # Save AI turn
        ai_turn = TrainingTurn(
            session_id=request.session_id,
            role="assistant",
            text=response.reply_text,
            feedback=response.scores.model_dump(),
        )
        db.add(ai_turn)

        # Save skill assessment if scores available
        scores = response.scores
        if any(
            getattr(scores, f, 0) > 0
            for f in ["clarity", "logic", "confidence", "etiquette"]
        ):
            assessment = SkillAssessment(
                user_id=request.user_id,
                session_id=request.session_id,
                clarity=scores.clarity,
                logic=scores.logic,
                evidence=scores.evidence,
                confidence=scores.confidence,
                etiquette=scores.etiquette,
                boundary=scores.boundary,
            )
            db.add(assessment)

        db.commit()
    except Exception as e:
        db.rollback()
        raise
    finally:
        db.close()

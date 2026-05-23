"""Training router - session history, progress, training plans."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

from ..models.database import (
    get_engine,
    get_session_factory,
    TrainingSession,
    TrainingTurn,
    SkillAssessment,
)

router = APIRouter()

_engine = None
_Session = None


def _get_session():
    global _engine, _Session
    if _engine is None:
        _engine = get_engine()
        _Session = get_session_factory(_engine)
    return _Session()


# --- Schemas ---

class SessionSummary(BaseModel):
    session_id: str
    mode: Optional[str]
    scene_type: Optional[str]
    status: Optional[str]
    started_at: Optional[datetime]
    ended_at: Optional[datetime]
    turn_count: int
    avg_score: Optional[float]


class TurnDetail(BaseModel):
    id: str
    role: str
    text: Optional[str]
    created_at: Optional[datetime]
    feedback: Optional[dict]


class SessionDetail(BaseModel):
    session_id: str
    mode: Optional[str]
    scene_type: Optional[str]
    status: Optional[str]
    started_at: Optional[datetime]
    turns: List[TurnDetail]


class ProgressResponse(BaseModel):
    user_id: str
    total_sessions: int
    total_turns: int
    avg_score: float
    recent_sessions: List[SessionSummary]
    score_trends: dict
    recommendations: List[str]


class TrainingPlanItem(BaseModel):
    day: int
    title: str
    description: str
    mode: str
    duration_min: int


class TrainingPlan(BaseModel):
    plan_id: str
    title: str
    description: str
    duration_days: int
    items: List[TrainingPlanItem]
    target_skills: List[str]


# --- Routes ---

@router.get("/{user_id}/sessions", response_model=List[SessionSummary])
async def list_sessions(user_id: str, limit: int = 20, offset: int = 0):
    """List user's training sessions."""
    db = _get_session()
    try:
        sessions = (
            db.query(TrainingSession)
            .filter_by(user_id=user_id)
            .order_by(TrainingSession.started_at.desc())
            .offset(offset)
            .limit(limit)
            .all()
        )

        result = []
        for s in sessions:
            turn_count = db.query(TrainingTurn).filter_by(session_id=s.id).count()
            assessments = db.query(SkillAssessment).filter_by(session_id=s.id).all()
            avg_score = None
            if assessments:
                scores = [
                    (a.clarity or 0) + (a.logic or 0) + (a.confidence or 0) + (a.etiquette or 0)
                    for a in assessments
                ]
                avg_score = round(sum(scores) / len(scores) / 4, 1) if scores else None

            result.append(SessionSummary(
                session_id=s.id,
                mode=s.mode,
                scene_type=s.scene_type,
                status=s.status,
                started_at=s.started_at,
                ended_at=s.ended_at,
                turn_count=turn_count,
                avg_score=avg_score,
            ))

        return result
    finally:
        db.close()


@router.get("/{user_id}/sessions/{session_id}", response_model=SessionDetail)
async def get_session_detail(user_id: str, session_id: str):
    """Get detailed view of a training session."""
    db = _get_session()
    try:
        session = db.query(TrainingSession).filter_by(id=session_id, user_id=user_id).first()
        if not session:
            raise HTTPException(status_code=404, detail="训练会话未找到")

        turns = (
            db.query(TrainingTurn)
            .filter_by(session_id=session_id)
            .order_by(TrainingTurn.created_at.asc())
            .all()
        )

        return SessionDetail(
            session_id=session.id,
            mode=session.mode,
            scene_type=session.scene_type,
            status=session.status,
            started_at=session.started_at,
            turns=[
                TurnDetail(
                    id=t.id,
                    role=t.role,
                    text=t.text,
                    created_at=t.created_at,
                    feedback=t.feedback,
                )
                for t in turns
            ],
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()


@router.get("/{user_id}/progress", response_model=ProgressResponse)
async def get_progress(user_id: str):
    """Get user's training progress."""
    db = _get_session()
    try:
        total_sessions = db.query(TrainingSession).filter_by(user_id=user_id).count()
        total_turns = db.query(TrainingTurn).filter(
            TrainingTurn.session_id.in_(
                db.query(TrainingSession.id).filter_by(user_id=user_id)
            )
        ).count()

        # Get all assessments for score calculation
        assessments = db.query(SkillAssessment).filter_by(user_id=user_id).all()

        avg_score = 0.0
        if assessments:
            all_scores = []
            for a in assessments:
                scores = [a.clarity or 0, a.logic or 0, a.confidence or 0, a.etiquette or 0]
                all_scores.extend(scores)
            avg_score = round(sum(all_scores) / len(all_scores), 1) if all_scores else 0.0

        # Get recent sessions
        recent = (
            db.query(TrainingSession)
            .filter_by(user_id=user_id)
            .order_by(TrainingSession.started_at.desc())
            .limit(5)
            .all()
        )

        recent_sessions = []
        for s in recent:
            turn_count = db.query(TrainingTurn).filter_by(session_id=s.id).count()
            recent_sessions.append(SessionSummary(
                session_id=s.id,
                mode=s.mode,
                scene_type=s.scene_type,
                status=s.status,
                started_at=s.started_at,
                ended_at=s.ended_at,
                turn_count=turn_count,
                avg_score=None,
            ))

        # Calculate score trends (last 6 sessions)
        score_trends = {"clarity": [], "logic": [], "confidence": [], "etiquette": []}
        session_ids = [s.id for s in recent[:6]]
        for sid in reversed(session_ids):
            a = db.query(SkillAssessment).filter_by(session_id=sid).first()
            if a:
                score_trends["clarity"].append(a.clarity or 5)
                score_trends["logic"].append(a.logic or 5)
                score_trends["confidence"].append(a.confidence or 5)
                score_trends["etiquette"].append(a.etiquette or 5)

        # Recommendations
        recommendations = []
        if total_sessions < 3:
            recommendations.append("建议每天完成至少一次训练，逐步建立习惯")
        if avg_score < 6:
            recommendations.append("当前综合评分还有提升空间，建议多练习基础场景")
        if not any(s.mode == "roleplay" for s in recent):
            recommendations.append("建议尝试角色扮演训练，提升实战能力")
        if not any(s.mode == "expression_training" for s in recent):
            recommendations.append("建议练习观点表达训练，提升逻辑表达能力")
        if not recommendations:
            recommendations.append("你的训练很全面！可以尝试更高难度的场景")

        return ProgressResponse(
            user_id=user_id,
            total_sessions=total_sessions,
            total_turns=total_turns,
            avg_score=avg_score,
            recent_sessions=recent_sessions,
            score_trends=score_trends,
            recommendations=recommendations,
        )
    finally:
        db.close()


@router.get("/plans/recommended", response_model=List[TrainingPlan])
async def get_recommended_plans():
    """Get recommended training plans."""
    plans = [
        TrainingPlan(
            plan_id="7_day_confidence",
            title="7天表达勇气训练营",
            description="专为不敢表达的用户设计，每天一个小任务，逐步建立表达自信",
            duration_days=7,
            items=[
                TrainingPlanItem(day=1, title="自我介绍", description="练习1分钟自我介绍", mode="expression_training", duration_min=5),
                TrainingPlanItem(day=2, title="提出小请求", description="练习礼貌地提出一个小请求", mode="scene_analysis", duration_min=5),
                TrainingPlanItem(day=3, title="表达不同意见", description="练习用温和的方式表达不同看法", mode="expression_training", duration_min=8),
                TrainingPlanItem(day=4, title="拒绝别人", description="练习有边界感地拒绝不合理请求", mode="roleplay", duration_min=8),
                TrainingPlanItem(day=5, title="会议发言", description="练习在会议中简短发言", mode="expression_training", duration_min=10),
                TrainingPlanItem(day=6, title="冲突沟通", description="练习处理意见分歧的场景", mode="roleplay", duration_min=10),
                TrainingPlanItem(day=7, title="综合模拟", description="完成一次完整的场景模拟与复盘", mode="feedback", duration_min=15),
            ],
            target_skills=["自信度", "清晰度", "边界感"],
        ),
        TrainingPlan(
            plan_id="14_day_workplace",
            title="14天职场表达训练营",
            description="针对职场新人，覆盖汇报、会议、沟通等核心场景",
            duration_days=14,
            items=[
                TrainingPlanItem(day=1, title="汇报结构", description="学习STAR汇报法", mode="expression_training", duration_min=8),
                TrainingPlanItem(day=2, title="电梯演讲", description="30秒说清工作价值", mode="expression_training", duration_min=5),
                TrainingPlanItem(day=3, title="会议发言", description="练习在会议中提出观点", mode="roleplay", duration_min=10),
                TrainingPlanItem(day=4, title="向上沟通", description="练习与领导的日常沟通", mode="roleplay", duration_min=8),
                TrainingPlanItem(day=5, title="邮件礼仪", description="学习职场邮件/消息规范", mode="etiquette_learning", duration_min=5),
                TrainingPlanItem(day=6, title="争取资源", description="练习有理有据地争取支持", mode="expression_training", duration_min=10),
                TrainingPlanItem(day=7, title="周中复盘", description="回顾前半周练习，调整策略", mode="feedback", duration_min=10),
                TrainingPlanItem(day=8, title="接受反馈", description="练习积极接受并回应反馈", mode="roleplay", duration_min=8),
                TrainingPlanItem(day=9, title="处理质疑", description="练习应对质疑和挑战", mode="roleplay", duration_min=10),
                TrainingPlanItem(day=10, title="跨部门沟通", description="练习与不同部门的协作沟通", mode="roleplay", duration_min=10),
                TrainingPlanItem(day=11, title="拒绝加班", description="练习有边界感地表达工作安排", mode="roleplay", duration_min=8),
                TrainingPlanItem(day=12, title="年会发言", description="练习简短的公开场合表达", mode="expression_training", duration_min=8),
                TrainingPlanItem(day=13, title="离职谈话", description="练习专业的离职沟通", mode="roleplay", duration_min=10),
                TrainingPlanItem(day=14, title="综合复盘", description="完整回顾14天成长，制定下一步计划", mode="feedback", duration_min=15),
            ],
            target_skills=["逻辑性", "自信度", "职场礼仪"],
        ),
    ]
    return plans


@router.post("/{user_id}/sessions/{session_id}/end")
async def end_session(user_id: str, session_id: str):
    """End a training session and generate summary."""
    db = _get_session()
    try:
        session = db.query(TrainingSession).filter_by(id=session_id, user_id=user_id).first()
        if not session:
            raise HTTPException(status_code=404, detail="训练会话未找到")

        session.status = "completed"
        session.ended_at = datetime.now()

        # Generate summary from turns
        turns = db.query(TrainingTurn).filter_by(session_id=session_id).all()
        user_turns = [t for t in turns if t.role == "user"]
        ai_turns = [t for t in turns if t.role == "assistant"]

        session.summary = {
            "total_turns": len(turns),
            "user_turns": len(user_turns),
            "ai_turns": len(ai_turns),
            "duration_min": len(turns) * 2,  # rough estimate
        }

        db.commit()
        return {
            "message": "训练会话已结束",
            "session_id": session_id,
            "summary": session.summary,
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()

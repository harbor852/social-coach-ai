"""User profile router - onboarding, profile CRUD."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, Literal, List
import uuid

from ..models.database import (
    init_db,
    get_engine,
    get_session_factory,
    User,
    UserProfile,
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

class OnboardingRequest(BaseModel):
    nickname: str = Field(..., min_length=1, max_length=50)
    age_stage: Literal["teen", "college", "new_worker", "other"] = "other"
    challenges: List[str] = Field(default_factory=list)
    goals: List[str] = Field(default_factory=list)
    preferred_tone: Literal["gentle", "direct", "warm", "formal", "natural"] = "natural"


class OnboardingResponse(BaseModel):
    user_id: str
    nickname: str
    age_stage: str
    message: str
    recommended_first_training: str


class UserProfileResponse(BaseModel):
    user_id: str
    nickname: Optional[str]
    age_stage: Optional[str]
    goals: List[str]
    common_challenges: List[str]
    preferred_tone: Optional[str]
    skill_scores: dict
    total_sessions: int
    streak_days: int


class UpdateProfileRequest(BaseModel):
    nickname: Optional[str] = None
    age_stage: Optional[Literal["teen", "college", "new_worker", "other"]] = None
    goals: Optional[List[str]] = None
    challenges: Optional[List[str]] = None
    preferred_tone: Optional[Literal["gentle", "direct", "warm", "formal", "natural"]] = None


class QuickAssessmentRequest(BaseModel):
    user_id: str
    clarity: int = Field(ge=1, le=10)
    logic: int = Field(ge=1, le=10)
    confidence: int = Field(ge=1, le=10)
    etiquette: int = Field(ge=1, le=10)
    boundary: int = Field(ge=1, le=10)


class QuickAssessmentResponse(BaseModel):
    user_id: str
    scores: dict
    summary: str
    recommendations: List[str]


# --- Routes ---

@router.post("/onboarding", response_model=OnboardingResponse)
async def create_user(request: OnboardingRequest):
    """Create a new user during onboarding."""
    db = _get_session()
    try:
        user_id = str(uuid.uuid4())

        user = User(
            id=user_id,
            nickname=request.nickname,
            age_stage=request.age_stage,
        )
        db.add(user)

        # Initialize profile with default scores
        default_scores = {"clarity": 5, "logic": 5, "confidence": 5, "etiquette": 5, "boundary": 5}
        profile = UserProfile(
            user_id=user_id,
            stage=request.age_stage,
            goals=request.challenges if request.challenges else [],
            common_challenges=request.challenges if request.challenges else [],
            preferred_tone=request.preferred_tone,
            skill_scores=default_scores,
        )
        db.add(profile)
        db.commit()

        # Recommend first training based on profile
        recommendation = _recommend_first_training(request.age_stage, request.challenges)

        return OnboardingResponse(
            user_id=user_id,
            nickname=request.nickname,
            age_stage=request.age_stage,
            message=f"欢迎加入 SpeakUp AI，{request.nickname}！你的专属训练计划已生成。",
            recommended_first_training=recommendation,
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()


@router.get("/{user_id}/profile", response_model=UserProfileResponse)
async def get_profile(user_id: str):
    """Get user profile with training stats."""
    db = _get_session()
    try:
        user = db.query(User).filter_by(id=user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="用户不存在")

        profile = db.query(UserProfile).filter_by(user_id=user_id).first()
        if not profile:
            raise HTTPException(status_code=404, detail="用户画像未找到")

        # Count sessions
        from ..models.database import TrainingSession
        total_sessions = db.query(TrainingSession).filter_by(user_id=user_id).count()

        return UserProfileResponse(
            user_id=user_id,
            nickname=user.nickname,
            age_stage=user.age_stage,
            goals=profile.goals or [],
            common_challenges=profile.common_challenges or [],
            preferred_tone=profile.preferred_tone,
            skill_scores=profile.skill_scores or {},
            total_sessions=total_sessions,
            streak_days=_calculate_streak(db, user_id),
        )
    finally:
        db.close()


@router.patch("/{user_id}/profile")
async def update_profile(user_id: str, request: UpdateProfileRequest):
    """Update user profile."""
    db = _get_session()
    try:
        user = db.query(User).filter_by(id=user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="用户不存在")

        profile = db.query(UserProfile).filter_by(user_id=user_id).first()
        if not profile:
            raise HTTPException(status_code=404, detail="用户画像未找到")

        if request.nickname is not None:
            user.nickname = request.nickname
        if request.age_stage is not None:
            user.age_stage = request.age_stage
            profile.stage = request.age_stage
        if request.goals is not None:
            profile.goals = request.goals
        if request.challenges is not None:
            profile.common_challenges = request.challenges
        if request.preferred_tone is not None:
            profile.preferred_tone = request.preferred_tone

        db.commit()
        return {"message": "用户画像已更新"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()


@router.post("/{user_id}/assessment", response_model=QuickAssessmentResponse)
async def save_assessment(user_id: str, request: QuickAssessmentRequest):
    """Save a quick skill assessment."""
    db = _get_session()
    try:
        user = db.query(User).filter_by(id=user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="用户不存在")

        profile = db.query(UserProfile).filter_by(user_id=user_id).first()
        if not profile:
            raise HTTPException(status_code=404, detail="用户画像未找到")

        # Update skill scores
        scores = {
            "clarity": request.clarity,
            "logic": request.logic,
            "confidence": request.confidence,
            "etiquette": request.etiquette,
            "boundary": request.boundary,
        }
        profile.skill_scores = scores
        db.commit()

        # Generate summary
        avg = sum(scores.values()) / len(scores)
        summary = f"你的综合评分为 {avg:.1f}/10。"
        if avg >= 7:
            summary += "表现优秀！继续保持。"
        elif avg >= 5:
            summary += "基础不错，还有提升空间。"
        else:
            summary += "建议多练习基础场景，逐步建立信心。"

        # Generate recommendations
        recommendations = []
        if request.clarity < 6:
            recommendations.append("建议练习'观点表达训练'，提升表达清晰度")
        if request.confidence < 6:
            recommendations.append("建议练习'角色扮演'，在模拟场景中建立自信")
        if request.etiquette < 6:
            recommendations.append("建议学习'社交礼仪'模块")
        if request.boundary < 6:
            recommendations.append("建议练习'边界表达'场景")
        if not recommendations:
            recommendations.append("你已经很棒了！建议挑战更高难度的场景")

        return QuickAssessmentResponse(
            user_id=user_id,
            scores=scores,
            summary=summary,
            recommendations=recommendations,
        )
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()


# --- Helpers ---

def _recommend_first_training(age_stage: str, challenges: List[str]) -> str:
    """Recommend the first training based on user profile."""
    challenge_map = {
        "不敢说话": "自信表达训练",
        "表达混乱": "观点表达训练",
        "不会聊天": "破冰场景训练",
        "不会拒绝": "边界表达训练",
        "职场沟通困难": "会议发言训练",
    }

    for challenge in challenges:
        for key, value in challenge_map.items():
            if key in challenge:
                return value

    age_recommendations = {
        "teen": "校园社交破冰训练",
        "college": "面试表达训练",
        "new_worker": "会议发言训练",
    }

    return age_recommendations.get(age_stage, "观点表达训练")


def _calculate_streak(db, user_id: str) -> int:
    """Calculate training streak in days."""
    from ..models.database import TrainingSession
    from datetime import date, timedelta

    sessions = (
        db.query(TrainingSession)
        .filter_by(user_id=user_id)
        .order_by(TrainingSession.started_at.desc())
        .all()
    )

    if not sessions:
        return 0

    streak = 0
    check_date = date.today()

    for session in sessions:
        session_date = session.started_at.date() if session.started_at else None
        if session_date == check_date or session_date == check_date - timedelta(days=1):
            if session_date == check_date:
                streak += 1
                check_date -= timedelta(days=1)
            elif session_date == check_date:
                streak += 1
                check_date -= timedelta(days=1)
        else:
            break

    return max(streak, 0)

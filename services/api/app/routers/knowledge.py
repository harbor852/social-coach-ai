"""Knowledge base router - RAG entries for personalized coaching."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional

from ..models.database import (
    get_engine,
    get_session_factory,
    KnowledgeEntry,
)
from ..services.rag import chunk_text, embed_chunks

router = APIRouter()

_engine = None
_Session = None


def _get_session():
    global _engine, _Session
    if _engine is None:
        _engine = get_engine()
        _Session = get_session_factory(_engine)
    return _Session()


class KnowledgeCreate(BaseModel):
    user_id: str = Field(..., description="User identifier")
    title: str = Field(..., min_length=1, max_length=200)
    content: str = Field(..., min_length=10, max_length=20000)


class KnowledgeItem(BaseModel):
    id: str
    user_id: str
    title: str
    content: str
    source_type: str
    created_at: str

    class Config:
        from_attributes = True


@router.post("", response_model=KnowledgeItem)
async def create_knowledge(body: KnowledgeCreate):
    """Create a knowledge entry, chunk it, and compute embeddings."""
    db = _get_session()
    try:
        chunks = chunk_text(body.content)
        embeddings: list[list[float]] = []

        # Try to embed if user has configured an API key via env (server default)
        # For now we embed at query time; storing raw chunks is enough for Phase 1.
        # Phase 2: pre-compute embeddings here using user's LLM config.

        entry = KnowledgeEntry(
            user_id=body.user_id,
            title=body.title,
            content=body.content,
            chunks=chunks,
            embeddings=embeddings,
            source_type="text",
        )
        db.add(entry)
        db.commit()
        db.refresh(entry)

        return {
            "id": entry.id,
            "user_id": entry.user_id,
            "title": entry.title,
            "content": entry.content,
            "source_type": entry.source_type,
            "created_at": entry.created_at.isoformat() if entry.created_at else "",
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()


@router.get("", response_model=List[KnowledgeItem])
async def list_knowledge(user_id: str):
    """List all knowledge entries for a user."""
    db = _get_session()
    try:
        entries = db.query(KnowledgeEntry).filter_by(user_id=user_id).order_by(KnowledgeEntry.created_at.desc()).all()
        return [
            {
                "id": e.id,
                "user_id": e.user_id,
                "title": e.title,
                "content": e.content,
                "source_type": e.source_type,
                "created_at": e.created_at.isoformat() if e.created_at else "",
            }
            for e in entries
        ]
    finally:
        db.close()


@router.delete("/{entry_id}")
async def delete_knowledge(entry_id: str, user_id: str):
    """Delete a knowledge entry."""
    db = _get_session()
    try:
        entry = db.query(KnowledgeEntry).filter_by(id=entry_id, user_id=user_id).first()
        if not entry:
            raise HTTPException(status_code=404, detail="Entry not found")
        db.delete(entry)
        db.commit()
        return {"ok": True}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()

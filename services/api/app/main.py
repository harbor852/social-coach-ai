"""
SpeakUp AI - Social Coach API

FastAPI backend for the AI social growth coach.
"""

import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception:
    pass

from .models.database import init_db
from .routers import agent, voice, profile, training, content, knowledge


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    init_db()
    yield


app = FastAPI(
    title="SpeakUp AI - Social Coach API",
    description="AI 社交成长教练后端服务",
    version="0.2.0",
    lifespan=lifespan,
)

# CORS for Next.js dev server. Accept both localhost and 127.0.0.1 origins.
_default_origins = "http://localhost:3000,http://127.0.0.1:3000"
_cors_origins = os.getenv("CORS_ORIGINS", _default_origins).split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in _cors_origins if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(agent.router, prefix="/agent", tags=["agent"])
app.include_router(voice.router, prefix="/voice", tags=["voice"])
app.include_router(profile.router, prefix="/users", tags=["users"])
app.include_router(training.router, prefix="/training", tags=["training"])
app.include_router(content.router, prefix="/content", tags=["content"])
app.include_router(knowledge.router, prefix="/knowledge", tags=["knowledge"])


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "ok",
        "version": "0.2.0",
        "llm_provider": os.getenv("LLM_PROVIDER", "mock"),
    }

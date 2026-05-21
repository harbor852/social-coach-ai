"""
SpeakUp AI - Social Coach API

FastAPI backend for the AI social growth coach.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routers import agent, voice

app = FastAPI(
    title="SpeakUp AI - Social Coach API",
    description="AI 社交成长教练后端服务",
    version="0.1.0",
)

# CORS for Next.js dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(agent.router, prefix="/agent", tags=["agent"])
app.include_router(voice.router, prefix="/voice", tags=["voice"])


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok", "version": "0.1.0"}

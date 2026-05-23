"""Voice router - STT via Web Speech API fallback, TTS via Alibaba CosyVoice."""

import os
import io
import base64
import asyncio
from typing import Optional

from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel, Field

from ..schemas.agent import AudioFeatures

router = APIRouter()


# --- Schemas ---


class TranscribeResponse(BaseModel):
    transcript: str
    audio_features: Optional[AudioFeatures] = None


class SynthesizeRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=3000)
    voice: str = Field(default="longxiaochun", description="CosyVoice voice ID")
    speed: float = Field(default=1.0, ge=0.5, le=2.0)


class TTSConfigInput(BaseModel):
    """User-provided TTS configuration (overrides server defaults)."""

    provider: str = Field(default="alibaba", description="tts provider: alibaba, openai, mock")
    api_key: str = Field(..., description="API key")
    model: Optional[str] = Field(default="cosyvoice-v1", description="Model name")
    base_url: Optional[str] = Field(
        default="https://dashscope.aliyuncs.com/compatible-mode/v1",
        description="Base URL for TTS API",
    )
    voice: Optional[str] = Field(default="longxiaochun", description="Voice ID")


# --- TTS Provider ---


def _get_tts_config(user_config: Optional[dict] = None) -> dict:
    """Resolve TTS config: user override > env > mock fallback."""
    if user_config and user_config.get("api_key"):
        return {
            "provider": user_config.get("provider", "alibaba"),
            "api_key": user_config["api_key"],
            "model": user_config.get("model", "cosyvoice-v1"),
            "base_url": user_config.get("base_url", "https://dashscope.aliyuncs.com/compatible-mode/v1"),
            "voice": user_config.get("voice", "longxiaochun"),
        }

    provider = os.getenv("TTS_PROVIDER", "mock")
    api_key = os.getenv("TTS_API_KEY", "")

    if provider == "alibaba" and api_key:
        return {
            "provider": "alibaba",
            "api_key": api_key,
            "model": os.getenv("TTS_MODEL", "cosyvoice-v1"),
            "base_url": os.getenv("TTS_BASE_URL", "https://dashscope.aliyuncs.com/compatible-mode/v1"),
            "voice": os.getenv("TTS_VOICE", "longxiaochun"),
        }

    if provider == "openai" and api_key:
        return {
            "provider": "openai",
            "api_key": api_key,
            "model": os.getenv("TTS_MODEL", "tts-1"),
            "base_url": os.getenv("TTS_BASE_URL", "https://api.openai.com/v1"),
            "voice": os.getenv("TTS_VOICE", "nova"),
        }

    return {"provider": "mock"}


async def _synthesize_with_openai_compatible(
    text: str,
    voice: str,
    api_key: str,
    base_url: str,
    model: str,
    speed: float = 1.0,
) -> bytes:
    """Call OpenAI-compatible TTS API (works for Alibaba, OpenAI, etc.)."""
    try:
        import httpx

        # Build request body - OpenAI audio speech API format
        body = {
            "model": model,
            "input": text,
            "voice": voice,
        }

        # Some providers support speed parameter
        if speed != 1.0:
            body["speed"] = speed

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }

        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                f"{base_url}/audio/speech",
                headers=headers,
                json=body,
            )

        if resp.status_code != 200:
            error_text = resp.text[:500]
            raise RuntimeError(f"TTS API error {resp.status_code}: {error_text}")

        return resp.content

    except Exception as e:
        import logging
        logging.warning(f"TTS synthesis failed: {e}")
        raise


def _generate_mock_audio(text: str) -> bytes:
    """Generate a silent/mock MP3 for testing when TTS is not configured."""
    # Return a minimal valid MP3 file (silent, 1 second)
    # This is a base64-encoded 1-second silent MP3
    silent_mp3 = (
        "//uQxAAAAANIAUAAAN4JfUFiQAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqq"
        "qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq"
        "qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq"
    )
    return base64.b64decode(silent_mp3)


# --- Routes ---


@router.post("/transcribe", response_model=TranscribeResponse)
async def transcribe_audio(
    file: UploadFile = File(...),
    session_id: str = Form(...),
):
    """Transcribe audio to text.

    MVP: We primarily rely on browser Web Speech API for STT.
    This endpoint accepts audio but currently returns a mock response
    with estimated features. For production, integrate Whisper API here.
    """
    # Read file to estimate duration (rough heuristic)
    content = await file.read()
    # Rough estimate: ~16KB per second for 16kHz mono WAV
    duration = max(1.0, len(content) / 16000)

    return TranscribeResponse(
        transcript="（请使用浏览器语音识别功能，或直接在输入框中编辑文字）",
        audio_features=AudioFeatures(
            duration_sec=round(duration, 1),
            speech_rate_wpm=120,
            pause_count=int(duration / 3),
            filler_words=["嗯", "那个"],
        ),
    )


@router.post("/synthesize")
async def synthesize_speech(
    text: str = Form(...),
    voice: str = Form(default="longxiaochun"),
    speed: float = Form(default=1.0),
    tts_config: Optional[str] = Form(default=None),
):
    """Convert text to speech using configured TTS provider.

    Supports:
    - Alibaba CosyVoice (default, via DashScope compatible API)
    - OpenAI TTS
    - Mock (silent audio for testing)

    Returns audio as streaming MP3 response.
    """
    import json as json_mod

    user_tts_config = None
    if tts_config:
        try:
            user_tts_config = json_mod.loads(tts_config)
        except Exception:
            pass

    config = _get_tts_config(user_tts_config)

    if config["provider"] == "mock":
        # Return a small JSON indicating mock mode, frontend can handle gracefully
        mock_audio = _generate_mock_audio(text)
        return StreamingResponse(
            io.BytesIO(mock_audio),
            media_type="audio/mpeg",
            headers={
                "X-TTS-Mode": "mock",
                "X-TTS-Message": "TTS not configured. Set TTS_API_KEY env var or provide tts_config.",
            },
        )

    try:
        audio_bytes = await _synthesize_with_openai_compatible(
            text=text,
            voice=voice if voice else config.get("voice", "longxiaochun"),
            api_key=config["api_key"],
            base_url=config["base_url"],
            model=config.get("model", "cosyvoice-v1"),
            speed=speed,
        )

        return StreamingResponse(
            io.BytesIO(audio_bytes),
            media_type="audio/mpeg",
            headers={"X-TTS-Mode": config["provider"]},
        )

    except Exception as e:
        # Fallback to mock audio on error so UX isn't broken
        import logging
        logging.error(f"TTS error: {e}")
        mock_audio = _generate_mock_audio(text)
        return StreamingResponse(
            io.BytesIO(mock_audio),
            media_type="audio/mpeg",
            headers={
                "X-TTS-Mode": "mock",
                "X-TTS-Error": str(e)[:200],
            },
        )


@router.post("/synthesize/base64")
async def synthesize_speech_base64(
    request: SynthesizeRequest,
    tts_config: Optional[str] = Form(default=None),
):
    """Synthesize and return base64-encoded audio (for environments that prefer data URLs)."""
    import json as json_mod

    user_tts_config = None
    if tts_config:
        try:
            user_tts_config = json_mod.loads(tts_config)
        except Exception:
            pass

    config = _get_tts_config(user_tts_config)

    if config["provider"] == "mock":
        mock_audio = _generate_mock_audio(request.text)
        return {
            "audio_base64": base64.b64encode(mock_audio).decode("utf-8"),
            "mime_type": "audio/mpeg",
            "mode": "mock",
            "message": "TTS not configured. Set TTS_API_KEY env var or provide tts_config.",
        }

    try:
        audio_bytes = await _synthesize_with_openai_compatible(
            text=request.text,
            voice=request.voice,
            api_key=config["api_key"],
            base_url=config["base_url"],
            model=config.get("model", "cosyvoice-v1"),
            speed=request.speed,
        )

        return {
            "audio_base64": base64.b64encode(audio_bytes).decode("utf-8"),
            "mime_type": "audio/mpeg",
            "mode": config["provider"],
            "message": None,
        }

    except Exception as e:
        mock_audio = _generate_mock_audio(request.text)
        return {
            "audio_base64": base64.b64encode(mock_audio).decode("utf-8"),
            "mime_type": "audio/mpeg",
            "mode": "mock",
            "message": f"TTS error: {str(e)[:200]}",
        }


@router.get("/voices")
async def list_voices():
    """List available voice presets."""
    return {
        "alibaba": [
            {"id": "longxiaochun", "name": "龙小淳", "gender": "female", "style": "温柔知性", "locale": "zh-CN"},
            {"id": "longchen", "name": "龙辰", "gender": "male", "style": "稳重沉稳", "locale": "zh-CN"},
            {"id": "longhua", "name": "龙华", "gender": "male", "style": "活泼阳光", "locale": "zh-CN"},
            {"id": "longshu", "name": "龙舒", "gender": "female", "style": "亲切自然", "locale": "zh-CN"},
            {"id": "yunjian", "name": "云健", "gender": "male", "style": "磁性播音", "locale": "zh-CN"},
            {"id": "yunxi", "name": "云溪", "gender": "female", "style": "甜美清新", "locale": "zh-CN"},
            {"id": "yunyang", "name": "云扬", "gender": "male", "style": "年轻活力", "locale": "zh-CN"},
        ],
        "openai": [
            {"id": "alloy", "name": "Alloy", "gender": "neutral", "style": "均衡", "locale": "zh-CN"},
            {"id": "echo", "name": "Echo", "gender": "male", "style": "沉稳", "locale": "zh-CN"},
            {"id": "fable", "name": "Fable", "gender": "neutral", "style": "英式", "locale": "zh-CN"},
            {"id": "onyx", "name": "Onyx", "gender": "male", "style": "深沉", "locale": "zh-CN"},
            {"id": "nova", "name": "Nova", "gender": "female", "style": "温柔", "locale": "zh-CN"},
            {"id": "shimmer", "name": "Shimmer", "gender": "female", "style": "明亮", "locale": "zh-CN"},
        ],
    }

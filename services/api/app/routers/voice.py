"""Voice router - mock STT/TTS endpoints for MVP."""

from fastapi import APIRouter, UploadFile, File, Form

from ..schemas.agent import SynthesizeRequest, SynthesizeResponse, TranscribeResponse

router = APIRouter()


@router.post("/transcribe", response_model=TranscribeResponse)
async def transcribe_audio(
    file: UploadFile = File(...),
    session_id: str = Form(...),
):
    """Transcribe audio to text. MVP: returns mock transcript."""
    return TranscribeResponse(
        transcript="我觉得这个方案可能不太好，但我不知道怎么说",
        audio_features={
            "duration_sec": 8.2,
            "speech_rate_wpm": 118,
            "pause_count": 5,
            "filler_words": ["嗯", "就是", "可能"],
        },
    )


@router.post("/synthesize", response_model=SynthesizeResponse)
async def synthesize_speech(request: SynthesizeRequest):
    """Convert text to speech. MVP: returns mock audio URL."""
    return SynthesizeResponse(
        audio_url="https://cdn.example.com/audio/mock_reply.mp3",
        duration_sec=len(request.text) * 0.05,
    )

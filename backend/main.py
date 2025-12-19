"""ConvoWeave backend.

FastAPI + WebSocket server that:
- Manages sessions/participants
- Receives multimodal signals over WebSocket
- Aggregates engagement/emotion metrics in-memory (firebase optional later)
"""

from __future__ import annotations

import asyncio
import json
import time
import uuid
from typing import Dict, List, Optional

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from firebase_store import FirebaseStore
from analysis_router import router as analysis_router
from groq_ai import GroqAI
from tts_module import text_to_speech


app = FastAPI(title="ConvoWeave Backend", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # lock down in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Firebase store (optional)
firebase_store = FirebaseStore()

# Initialize Groq AI
groq_ai = GroqAI()

# Include analysis router
app.include_router(analysis_router)


# ----------------------------
# Models
# ----------------------------


class SessionCreateRequest(BaseModel):
    name: str = Field(default="Untitled session", max_length=128)
    host_id: Optional[str] = Field(default=None, description="ID of the host creating the session")
    host_display_name: Optional[str] = Field(default=None, max_length=64)


class ParticipantJoinRequest(BaseModel):
    participant_id: Optional[str] = Field(default=None, description="Client-generated or server-provided")
    display_name: str = Field(max_length=64)


class SignalPayload(BaseModel):
    engagement: float = Field(ge=0.0, le=1.0)
    confusion: float = Field(ge=0.0, le=1.0)
    stress: float = Field(ge=0.0, le=1.0)
    tone: Optional[str] = Field(default=None, description="e.g., calm, excited")
    energy: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    sentiment: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    timestamp: float = Field(default_factory=lambda: time.time())


class ChatPayload(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    timestamp: float = Field(default_factory=lambda: time.time())


class WsEnvelope(BaseModel):
    type: str
    payload: dict


class ParticipantState(BaseModel):
    participant_id: str
    display_name: str
    latest_signal: Optional[SignalPayload] = None
    chat_history: List[ChatPayload] = []


class SessionState(BaseModel):
    session_id: str
    name: str
    created_at: float
    participants: Dict[str, ParticipantState] = {}
    ended_at: Optional[float] = None
    host_id: Optional[str] = None
    host_display_name: Optional[str] = None
    transcript: List[dict] = Field(default_factory=list)
    stt_enabled: bool = False


# ----------------------------
# In-memory stores (replaceable by Firebase/Redis later)
# ----------------------------

sessions: Dict[str, SessionState] = {}
session_connections: Dict[str, List[WebSocket]] = {}


def _ensure_session(session_id: str) -> SessionState:
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    return sessions[session_id]


def _compute_session_summary(session: SessionState) -> dict:
    signals = [p.latest_signal for p in session.participants.values() if p.latest_signal]
    if not signals:
        return {"participants": len(session.participants), "status": "waiting"}

    def avg(field: str) -> float:
        values = [getattr(s, field) for s in signals if getattr(s, field) is not None]
        return sum(values) / len(values) if values else 0.0

    confusion = avg("confusion")
    stress = avg("stress")
    engagement = avg("engagement")

    if confusion > 0.6:
        note = "High confusion detected"
    elif stress > 0.6:
        note = "Participants look stressed"
    elif engagement > 0.7:
        note = "Strong engagement"
    else:
        note = "Session steady"

    return {
        "participants": len(session.participants),
        "engagement": round(engagement, 3),
        "confusion": round(confusion, 3),
        "stress": round(stress, 3),
        "note": note,
        "updated_at": time.time(),
    }


# ----------------------------
# REST API
# ----------------------------


@app.get("/")
def root():
    return {"service": "ConvoWeave backend", "status": "ok"}


@app.get("/health")
def health():
    return {"status": "healthy", "sessions": len(sessions)}


@app.post("/sessions")
def create_session(body: SessionCreateRequest):
    session_id = str(uuid.uuid4())
    sessions[session_id] = SessionState(
        session_id=session_id,
        name=body.name,
        created_at=time.time(),
        participants={},
        host_id=body.host_id,
        host_display_name=body.host_display_name,
    )
    session_connections[session_id] = []
    firebase_store.save_session(session_id, sessions[session_id].model_dump())
    print(f"✓ Created session: {session_id}")
    return {"session_id": session_id, "name": body.name, "host_id": body.host_id}


@app.get("/sessions/{session_id}")
def get_session(session_id: str):
    """Check if a session exists and is active."""
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found or expired")
    return {
        "session_id": session_id,
        "name": sessions[session_id].name,
        "participants": len(sessions[session_id].participants),
        "active": True,
        "host_id": sessions[session_id].host_id,
        "host_display_name": sessions[session_id].host_display_name,
    }


@app.post("/sessions/{session_id}/participants")
def join_session(session_id: str, body: ParticipantJoinRequest):
    if session_id not in sessions:
        # Try to restore from Firebase if not in memory
        print(f"Session {session_id} not in memory, attempting restore...")
        raise HTTPException(status_code=404, detail=f"Session not found. Please create a new session.")
    
    session = sessions[session_id]
    participant_id = body.participant_id or str(uuid.uuid4())
    state = ParticipantState(participant_id=participant_id, display_name=body.display_name)
    session.participants[participant_id] = state
    print(f"✓ Participant {participant_id[:8]} joined session {session_id[:8]}")
    # Notify existing clients
    try:
        asyncio.create_task(_broadcast(session_id, {
            "type": "participant_joined",
            "payload": {"participant_id": participant_id, "display_name": body.display_name},
        }))
    except RuntimeError:
        pass
    return {"participant_id": participant_id, "session_id": session_id}


@app.get("/sessions/{session_id}/summary")
def get_summary(session_id: str):
    session = _ensure_session(session_id)
    return _compute_session_summary(session)


def _simple_sentiment(text: str) -> float:
    """Simple sentiment: 0.5 neutral, >0.5 positive, <0.5 negative."""
    text_lower = text.lower()
    positive_words = ["good", "great", "excellent", "happy", "love", "best", "awesome", "perfect"]
    negative_words = ["bad", "terrible", "hate", "worst", "sad", "angry", "fail", "problem"]
    
    pos_count = sum(1 for w in positive_words if w in text_lower)
    neg_count = sum(1 for w in negative_words if w in text_lower)
    
    if pos_count + neg_count == 0:
        return 0.5
    return 0.5 + (pos_count - neg_count) / (pos_count + neg_count) * 0.5


@app.post("/sessions/{session_id}/end")
def end_session(session_id: str):
    """End a session and prepare summary."""
    session = _ensure_session(session_id)
    session.ended_at = time.time()
    firebase_store.save_session(session_id, session.model_dump())
    summary = _compute_session_summary(session)
    # Broadcast session ended
    try:
        asyncio.run_coroutine_threadsafe(_broadcast(session_id, {
            "type": "session_ended",
            "payload": {
                "session_id": session_id,
                "host_id": session.host_id,
                "summary": summary,
            },
        }), asyncio.get_event_loop())
    except Exception:
        pass

    # Close all websockets for this session
    for ws in session_connections.get(session_id, [])[:]:
        try:
            asyncio.create_task(ws.close())
        except RuntimeError:
            pass

    # Destroy session
    if session_id in session_connections:
        del session_connections[session_id]
    if session_id in sessions:
        del sessions[session_id]
    return summary


@app.post("/sessions/{session_id}/generate-summary")
def generate_meeting_summary(session_id: str):
    """Generate AI-powered meeting summary."""
    session = _ensure_session(session_id)
    
    # Calculate average metrics
    summary_stats = _compute_session_summary(session)
    
    # Collect session data
    session_data = {
        "name": session.name,
        "duration": (session.ended_at or time.time()) - session.created_at,
        "participants": len(session.participants),
        "engagement": summary_stats.get("engagement", 0),
        "confusion": summary_stats.get("confusion", 0),
        "stress": summary_stats.get("stress", 0),
        "chat": [],
    }
    
    # Compile chat history
    for pid, pstate in session.participants.items():
        for chat in pstate.chat_history:
            session_data["chat"].append({
                "participant_id": pstate.display_name or pid[:8],
                "message": chat.message,
                "timestamp": chat.timestamp,
            })
    
    # Generate Groq summary
    summary_text = groq_ai.generate_meeting_summary(session_data)
    
    # Generate audio for summary (optional TTS)
    audio_result = text_to_speech(summary_text)
    
    return {
        "summary": summary_text,
        "audio": audio_result.get("audio"),
        "duration": audio_result.get("duration"),
    }


@app.post("/sessions/{session_id}/transcribe-audio")
async def transcribe_audio(session_id: str, file: UploadFile = File(...), participant_id: Optional[str] = Form(default=None)):
    """Transcribe audio and analyze tone/emotion."""
    session = _ensure_session(session_id)
    
    # Save temp audio file
    import tempfile
    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name
    
    try:
        # Transcribe
        transcription_result = groq_ai.transcribe_audio(tmp_path)
        
        # Analyze tone
        if transcription_result.get("text"):
            tone_result = groq_ai.analyze_speech_tone(transcription_result["text"])
            result_payload = {
                "text": transcription_result.get("text"),
                "confidence": transcription_result.get("confidence"),
                "tone": tone_result.get("tone"),
                "energy": tone_result.get("energy"),
                "stress_level": tone_result.get("stress_level"),
                "engagement": tone_result.get("engagement"),
            }
            # Append to transcript and broadcast
            entry = {
                "participant_id": participant_id or "unknown",
                "display_name": (session.participants.get(participant_id).display_name if participant_id and participant_id in session.participants else None),
                "timestamp": time.time(),
                "text": result_payload["text"],
                "tone": result_payload.get("tone"),
                "energy": result_payload.get("energy"),
                "stress_level": result_payload.get("stress_level"),
            }
            session.transcript.append(entry)
            await _broadcast(session_id, {"type": "transcript", "payload": entry})
            return result_payload
        else:
            return {"error": "Could not transcribe audio"}
    finally:
        # Cleanup temp file
        import os
        try:
            os.remove(tmp_path)
        except:
            pass


# ----------------------------
# WebSocket signaling + metrics
# ----------------------------


async def _broadcast(session_id: str, message: dict):
    """Send message to all clients in a session; drop closed connections."""
    dead = []
    for ws in session_connections.get(session_id, []):
        try:
            await ws.send_text(json.dumps(message))
        except Exception:
            dead.append(ws)
    if dead:
        session_connections[session_id] = [ws for ws in session_connections[session_id] if ws not in dead]


@app.websocket("/ws/{session_id}/{participant_id}")
async def websocket_endpoint(ws: WebSocket, session_id: str, participant_id: str):
    session = _ensure_session(session_id)
    await ws.accept()

    # Track connection for broadcast
    session_connections[session_id].append(ws)

    # Ensure participant exists
    if participant_id not in session.participants:
        session.participants[participant_id] = ParticipantState(participant_id=participant_id, display_name="Guest")

    # Send initial snapshot
    await ws.send_text(json.dumps({
        "type": "session_init",
        "payload": {
            "session": {
                "id": session.session_id,
                "name": session.name,
                "host_id": session.host_id,
                "host_display_name": session.host_display_name,
            },
            "participants": {pid: p.display_name for pid, p in session.participants.items()},
            "summary": _compute_session_summary(session),
            "stt_enabled": session.stt_enabled,
            "transcript": session.transcript[-50:],
        },
    }))

    try:
        while True:
            raw = await ws.receive_text()
            data = WsEnvelope.model_validate_json(raw)

            if data.type == "signal":
                signal = SignalPayload(**data.payload)
                session.participants[participant_id].latest_signal = signal
                summary = _compute_session_summary(session)
                await _broadcast(session_id, {
                    "type": "session_update",
                    "payload": {
                        "participant_id": participant_id,
                        "display_name": session.participants[participant_id].display_name,
                        "signal": signal.model_dump(),
                        "summary": summary,
                    },
                })

            elif data.type == "chat":
                chat = ChatPayload(**data.payload)
                session.participants[participant_id].chat_history.append(chat)
                
                # Use Groq AI for sentiment analysis
                sentiment_result = groq_ai.analyze_chat_sentiment(chat.message)
                sentiment = sentiment_result.get("sentiment", 0.5)
                emotion = sentiment_result.get("emotion", "neutral")
                
                firebase_store.save_chat(session_id, participant_id, chat.message, chat.timestamp)
                await _broadcast(session_id, {
                    "type": "chat",
                    "payload": {
                        "participant_id": participant_id,
                        "message": chat.message,
                        "timestamp": chat.timestamp,
                        "sentiment": round(sentiment, 3),
                        "emotion": emotion,
                        "confidence": round(sentiment_result.get("confidence", 0.7), 3),
                    },
                })

            elif data.type == "stt_toggle":
                enabled = bool(data.payload.get("enabled", False))
                session.stt_enabled = enabled
                await _broadcast(session_id, {
                    "type": "stt_toggle",
                    "payload": {"enabled": enabled},
                })

            else:
                await ws.send_text(json.dumps({"type": "error", "payload": {"message": "Unknown event type"}}))

    except WebSocketDisconnect:
        # Remove connection and participant from session
        if ws in session_connections.get(session_id, []):
            session_connections[session_id].remove(ws)
        
        # Remove participant from session
        if participant_id in session.participants:
            del session.participants[participant_id]
            print(f"✓ Participant {participant_id[:8]} disconnected from session {session_id[:8]}")
            # Broadcast participant left
            await _broadcast(session_id, {
                "type": "participant_left",
                "payload": {"participant_id": participant_id},
            })
        
        # Clean up empty sessions
        if len(session.participants) == 0:
            print(f"✓ Session {session_id[:8]} ended (no participants)")
            if session_id in sessions:
                del sessions[session_id]
            if session_id in session_connections:
                del session_connections[session_id]
                
    except Exception as exc:
        await ws.send_text(json.dumps({"type": "error", "payload": {"message": str(exc)}}))
    finally:
        pass

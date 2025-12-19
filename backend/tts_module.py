"""
Text-to-Speech module for ConvoWeave.
Uses gTTS for speech synthesis.
"""

import os
from io import BytesIO
import base64

try:
    from gtts import gTTS
    TTS_AVAILABLE = True
except ImportError:
    print("⚠ gTTS not installed. TTS disabled.")
    TTS_AVAILABLE = False


def text_to_speech(text: str, lang: str = "en") -> dict:
    """
    Convert text to speech and return as base64 audio.
    
    Returns: {
        "audio": "base64-encoded-audio",
        "duration": seconds (approximate),
        "format": "mp3"
    }
    """
    if not TTS_AVAILABLE:
        return {
            "audio": None,
            "duration": 0,
            "format": "mp3",
            "error": "TTS not available",
        }

    try:
        # Limit text length for API
        text = text[:500]
        
        # Generate speech
        tts = gTTS(text=text, lang=lang, slow=False)
        
        # Convert to bytes
        audio_bytes = BytesIO()
        tts.write_to_fp(audio_bytes)
        audio_bytes.seek(0)
        
        # Encode to base64
        audio_b64 = base64.b64encode(audio_bytes.read()).decode("utf-8")
        
        # Approximate duration (rough estimate: ~150 words per minute = 2.5 chars/sec)
        duration = len(text) / 2.5
        
        return {
            "audio": f"data:audio/mp3;base64,{audio_b64}",
            "duration": duration,
            "format": "mp3",
        }
    except Exception as e:
        print(f"TTS error: {e}")
        return {
            "audio": None,
            "duration": 0,
            "format": "mp3",
            "error": str(e),
        }


def summarize_and_speak(summary_text: str) -> dict:
    """
    Generate summary audio.
    """
    return text_to_speech(summary_text, lang="en")

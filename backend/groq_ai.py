"""
Groq AI Integration for ConvoWeave.
- Whisper: Speech-to-text + tone/energy analysis
- LLM: Chat sentiment + emotion classification
"""

import os
from dotenv import load_dotenv
from groq import Groq

# Load environment variables from .env file
load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")

if not GROQ_API_KEY:
    print("⚠ Warning: GROQ_API_KEY not set. AI features will be limited.")
    GROQ_ENABLED = False
else:
    print(f"✓ Groq AI initialized (API key: {GROQ_API_KEY[:10]}...)")
    GROQ_ENABLED = True


class GroqAI:
    def __init__(self):
        self.enabled = GROQ_ENABLED
        if self.enabled:
            self.client = Groq(api_key=GROQ_API_KEY)

    def analyze_chat_sentiment(self, message: str) -> dict:
        """
        Use Groq LLM to analyze chat message sentiment and emotion.
        Returns: {
            "sentiment": -1 to 1 (negative to positive),
            "emotion": "angry|sad|neutral|happy|excited",
            "confidence": 0-1,
            "summary": "brief analysis"
        }
        """
        if not self.enabled:
            return {
                "sentiment": 0.5,
                "emotion": "neutral",
                "confidence": 0.5,
                "summary": "Analysis unavailable",
            }

        try:
            prompt = f"""Analyze this chat message for sentiment and emotion.
Message: "{message}"

Respond with ONLY a JSON object (no markdown):
{{
  "sentiment": <-1 to 1 float>,
  "emotion": "<angry|sad|neutral|happy|excited>",
  "confidence": <0-1 float>,
  "summary": "<one-line analysis>"
}}"""

            response = self.client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3,
                max_tokens=200,
            )

            import json
            result_text = response.choices[0].message.content.strip()
            result = json.loads(result_text)
            return result
        except Exception as e:
            print(f"Groq sentiment analysis error: {e}")
            return {
                "sentiment": 0.5,
                "emotion": "neutral",
                "confidence": 0.3,
                "summary": "Analysis failed",
            }

    def transcribe_audio(self, audio_path: str) -> dict:
        """
        Transcribe audio using Groq Whisper.
        Returns: {
            "text": "transcription",
            "confidence": 0-1,
            "language": "en",
            "duration": seconds
        }
        """
        if not self.enabled:
            return {
                "text": "Transcription unavailable",
                "confidence": 0.0,
                "language": "en",
                "duration": 0,
            }

        try:
            with open(audio_path, "rb") as audio_file:
                translation = self.client.audio.transcriptions.create(
                    file=(audio_path, audio_file, "audio/wav"),
                    model="whisper-large-v3",
                    language="en",
                )
            
            return {
                "text": translation.text,
                "confidence": 0.9,  # Groq doesn't return confidence
                "language": "en",
                "duration": 0,
            }
        except Exception as e:
            print(f"Groq transcription error: {e}")
            return {
                "text": "Transcription failed",
                "confidence": 0.0,
                "language": "en",
                "duration": 0,
            }

    def analyze_speech_tone(self, transcription: str) -> dict:
        """
        Analyze speech tone/energy/stress from transcription.
        Returns: {
            "tone": "calm|neutral|excited|stressed",
            "energy": 0-1,
            "stress_level": 0-1,
            "engagement": 0-1
        }
        """
        if not self.enabled:
            return {
                "tone": "neutral",
                "energy": 0.5,
                "stress_level": 0.3,
                "engagement": 0.6,
            }

        try:
            prompt = f"""Analyze the tone and energy level from this speech transcription.
Transcription: "{transcription}"

Respond with ONLY a JSON object (no markdown):
{{
  "tone": "<calm|neutral|excited|stressed>",
  "energy": <0-1 float>,
  "stress_level": <0-1 float>,
  "engagement": <0-1 float>
}}"""

            response = self.client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3,
                max_tokens=200,
            )

            import json
            result_text = response.choices[0].message.content.strip()
            result = json.loads(result_text)
            return result
        except Exception as e:
            print(f"Groq tone analysis error: {e}")
            return {
                "tone": "neutral",
                "energy": 0.5,
                "stress_level": 0.3,
                "engagement": 0.6,
            }

    def generate_meeting_summary(self, session_data: dict) -> str:
        """
        Generate a comprehensive meeting summary using Groq LLM.
        """
        if not self.enabled:
            return "AI summary unavailable (Groq API key not configured). Meeting had " + \
                   f"{session_data.get('participants', 0)} participants with " + \
                   f"{len(session_data.get('chat', []))} chat messages."

        try:
            chat_messages = session_data.get("chat", [])
            chat_summary = "\n".join(
                [f"- {msg.get('participant_id', 'anon')}: {msg.get('message', '')}" 
                 for msg in chat_messages[-20:]]
            ) if chat_messages else "No chat messages"
            
            duration_min = session_data.get('duration', 0) / 60
            
            prompt = f"""Generate a concise meeting summary (3-5 sentences) based on:

Participants: {session_data.get('participants', 0)}
Duration: {duration_min:.1f} minutes
Avg Engagement: {session_data.get('engagement', 0):.2f} (0-1 scale)
Avg Confusion: {session_data.get('confusion', 0):.2f} (0-1 scale)
Avg Stress: {session_data.get('stress', 0):.2f} (0-1 scale)

Recent chat messages:
{chat_summary}

Provide actionable insights and overall meeting sentiment."""

            response = self.client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.5,
                max_tokens=300,
            )

            return response.choices[0].message.content.strip()
        except Exception as e:
            print(f"Groq summary generation error: {e}")
            import traceback
            traceback.print_exc()
            return f"Summary generation failed: {str(e)}"


# Global instance
groq_ai = GroqAI()

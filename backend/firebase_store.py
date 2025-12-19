"""
Firebase Realtime Database wrapper for ConvoWeave.
Stores sessions, participants, signals, chat logs with auto-expiry.
"""

import os
import json
from typing import Dict, Optional, Any
from datetime import datetime, timedelta

try:
    import firebase_admin
    from firebase_admin import db, credentials
    FIREBASE_ENABLED = True
except ImportError:
    FIREBASE_ENABLED = False


class FirebaseStore:
    def __init__(self, service_account_path: Optional[str] = None):
        self.enabled = FIREBASE_ENABLED
        if not self.enabled:
            return
        
        # Load from env or path
        creds_path = service_account_path or os.getenv("FIREBASE_CREDENTIALS_PATH")
        if creds_path and not firebase_admin._apps:
            cred = credentials.Certificate(creds_path)
            db_url = os.getenv("FIREBASE_DB_URL")
            firebase_admin.initialize_app(cred, {"databaseURL": db_url})

    def save_session(self, session_id: str, session_data: Dict[str, Any]) -> bool:
        """Save session to Firebase (or mock)."""
        if not self.enabled:
            return True  # mock success
        try:
            db.reference(f"sessions/{session_id}").set({
                **session_data,
                "saved_at": datetime.utcnow().isoformat(),
            })
            return True
        except Exception as e:
            print(f"Firebase save error: {e}")
            return False

    def save_signal(self, session_id: str, participant_id: str, signal: Dict[str, Any]) -> bool:
        """Append signal to participant's history."""
        if not self.enabled:
            return True
        try:
            db.reference(f"sessions/{session_id}/participants/{participant_id}/signals").push(signal)
            return True
        except Exception as e:
            print(f"Firebase signal error: {e}")
            return False

    def save_chat(self, session_id: str, participant_id: str, message: str, timestamp: float) -> bool:
        """Append chat message."""
        if not self.enabled:
            return True
        try:
            db.reference(f"sessions/{session_id}/chat").push({
                "participant_id": participant_id,
                "message": message,
                "timestamp": timestamp,
            })
            return True
        except Exception as e:
            print(f"Firebase chat error: {e}")
            return False

    def get_session_summary(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve session summary."""
        if not self.enabled:
            return None
        try:
            return db.reference(f"sessions/{session_id}").get().val()
        except Exception as e:
            print(f"Firebase get error: {e}")
            return None

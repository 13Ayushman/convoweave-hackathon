"""
Real-time frame processing endpoint.
Receives video frames from frontend, runs MediaPipe emotion detection, returns scores.
"""

import base64
import cv2
import numpy as np
from io import BytesIO
from fastapi import APIRouter, HTTPException
from emotion_detector import EmotionDetector

router = APIRouter(prefix="/api", tags=["analysis"])

try:
    detector = EmotionDetector()
    print("✓ EmotionDetector initialized")
except Exception as e:
    print(f"⚠ EmotionDetector init warning: {e}")
    detector = EmotionDetector()


@router.post("/analyze-frame")
async def analyze_frame(data: dict):
    """
    Analyze a single video frame for emotions.
    
    Request:
    {
        "frame": "base64-encoded-image",
        "participant_id": "uuid"
    }
    
    Response:
    {
        "engagement": 0.8,
        "confusion": 0.1,
        "stress": 0.05,
        "detected_face": true
    }
    """
    try:
        # Decode base64 frame
        frame_data = data.get("frame", "")
        if not frame_data:
            return {"engagement": 0.5, "confusion": 0.2, "stress": 0.1, "detected_face": False}
        
        # Remove data URL prefix if present
        if frame_data.startswith("data:image"):
            frame_data = frame_data.split(",")[1]
        
        # Decode to numpy array
        try:
            nparr = np.frombuffer(base64.b64decode(frame_data), np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        except Exception as e:
            print(f"Frame decode error: {e}")
            return {"engagement": 0.5, "confusion": 0.2, "stress": 0.1, "detected_face": False}
        
        if frame is None:
            return {"engagement": 0.5, "confusion": 0.2, "stress": 0.1, "detected_face": False}
        
        # Run emotion detection
        result = detector.detect(frame)
        result["detected_face"] = result.get("engagement", 0) > 0.1
        
        return result
    except Exception as e:
        print(f"Analysis error: {e}")
        # Return safe defaults on any error
        return {"engagement": 0.5, "confusion": 0.2, "stress": 0.1, "detected_face": False}


@router.post("/analyze-batch")
async def analyze_batch(data: dict):
    """
    Analyze multiple frames in batch (for batch processing).
    """
    frames = data.get("frames", [])
    results = []
    for frame_b64 in frames:
        try:
            nparr = np.frombuffer(base64.b64decode(frame_b64), np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            result = detector.detect(frame)
            results.append(result)
        except Exception as e:
            results.append({"error": str(e)})
    
    return {"results": results}

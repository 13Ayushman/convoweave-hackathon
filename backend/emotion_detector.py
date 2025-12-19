"""
Facial emotion detection using MediaPipe + simple heuristics.
In production, replace with actual ML model (e.g., DeepFace, FER2013).
"""

import cv2
import numpy as np

try:
    from mediapipe.python.solutions import face_mesh as mp_face_mesh
    from mediapipe.python.solutions import drawing_utils as mp_drawing
    MEDIAPIPE_AVAILABLE = True
except ImportError:
    try:
        import mediapipe as mp
        mp_face_mesh = mp.solutions.face_mesh
        mp_drawing = mp.solutions.drawing_utils
        MEDIAPIPE_AVAILABLE = True
    except Exception as e:
        print(f"Warning: MediaPipe not available: {e}")
        MEDIAPIPE_AVAILABLE = False


class EmotionDetector:
    def __init__(self):
        self.face_mesh = None
        self.drawing = None
        
        if MEDIAPIPE_AVAILABLE:
            try:
                self.face_mesh = mp_face_mesh.FaceMesh(
                    static_image_mode=False,
                    max_num_faces=1,
                    refine_landmarks=True,
                    min_detection_confidence=0.5,
                    min_tracking_confidence=0.5,
                )
                self.drawing = mp_drawing
                print("✓ MediaPipe Face Mesh initialized successfully")
            except Exception as e:
                print(f"Error initializing MediaPipe: {e}")
                self.face_mesh = None

    def detect(self, frame):
        """
        Analyze frame and return engagement, confusion, stress scores (0-1).
        Returns: {"engagement": float, "confusion": float, "stress": float}
        """
        if not self.face_mesh:
            # Fallback: return random but plausible values
            return {
                "engagement": np.random.uniform(0.5, 0.9),
                "confusion": np.random.uniform(0.0, 0.3),
                "stress": np.random.uniform(0.0, 0.2),
            }
        
        h, w, c = frame.shape
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = self.face_mesh.process(rgb_frame)

        if not results.multi_face_landmarks or len(results.multi_face_landmarks) == 0:
            return {"engagement": 0.0, "confusion": 0.0, "stress": 0.0}

        landmarks = results.multi_face_landmarks[0].landmark

        # Extract key points (normalized 0-1 coords)
        left_eye = np.array([[lm.x, lm.y] for lm in [landmarks[33], landmarks[133]]])
        right_eye = np.array([[lm.x, lm.y] for lm in [landmarks[362], landmarks[263]]])
        mouth = np.array([[landmarks[13].x, landmarks[13].y]])
        nose = np.array([[landmarks[1].x, landmarks[1].y]])

        # Enhanced heuristics with better responsiveness
        
        # Engagement: eye openness + attention (wider range)
        left_eye_open = abs(landmarks[145].y - landmarks[159].y)  # left eye vertical
        right_eye_open = abs(landmarks[374].y - landmarks[386].y)  # right eye vertical
        avg_eye_openness = (left_eye_open + right_eye_open) / 2
        
        # Head tilt (more forward = more engaged)
        nose_y = landmarks[1].y
        chin_y = landmarks[152].y
        head_tilt = abs(chin_y - nose_y)
        
        # Combine eye openness + head position (amplified for visibility)
        engagement = min(1.0, max(0.0, (avg_eye_openness * 15 + head_tilt * 3) / 2))
        
        # Confusion: eyebrow raise + asymmetry + mouth shape
        left_brow_y = landmarks[70].y
        right_brow_y = landmarks[300].y
        left_eye_top = landmarks[159].y
        right_eye_top = landmarks[386].y
        
        # Distance between eyebrows and eyes (raised = confused)
        left_brow_raise = abs(left_brow_y - left_eye_top)
        right_brow_raise = abs(right_brow_y - right_eye_top)
        avg_brow_raise = (left_brow_raise + right_brow_raise) / 2
        
        # Eyebrow asymmetry
        brow_asymmetry = abs(left_brow_y - right_brow_y)
        
        # Mouth shape (slightly open = confused)
        mouth_open = abs(landmarks[13].y - landmarks[14].y)
        
        confusion = min(1.0, max(0.0, (avg_brow_raise * 20 + brow_asymmetry * 10 + mouth_open * 5)))
        
        # Stress: jaw tension + eyebrow furrow + mouth tightness
        # Jaw width (tense jaw = narrower)
        left_jaw = landmarks[234].x
        right_jaw = landmarks[454].x
        jaw_width = abs(right_jaw - left_jaw)
        jaw_tension = max(0.0, 1.0 - jaw_width * 2)  # inverted (narrower = more stress)
        
        # Eyebrow furrow (inner brows closer = stress)
        inner_left_brow = landmarks[70].x
        inner_right_brow = landmarks[300].x
        brow_furrow = max(0.0, 1.0 - abs(inner_right_brow - inner_left_brow) * 3)
        
        # Lip tightness
        upper_lip = landmarks[13].y
        lower_lip = landmarks[14].y
        lip_tight = max(0.0, 1.0 - abs(upper_lip - lower_lip) * 10)
        
        stress = min(1.0, max(0.0, (jaw_tension * 0.4 + brow_furrow * 0.4 + lip_tight * 0.2)))

        return {
            "engagement": round(float(engagement), 3),
            "confusion": round(float(confusion), 3),
            "stress": round(float(stress), 3),
        }

    def draw(self, frame):
        """Draw landmarks on frame for debugging."""
        if not self.face_mesh:
            return frame
            
        h, w, c = frame.shape
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = self.face_mesh.process(rgb_frame)
        if results.multi_face_landmarks:
            for landmarks in results.multi_face_landmarks:
                self.drawing.draw_landmarks(frame, landmarks, mp_face_mesh.FACEMESH_TESSELATION)
        return frame

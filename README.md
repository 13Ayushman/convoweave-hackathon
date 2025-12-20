Convo-Weave 🧬
Real‑Time Biometric Intelligence Platform

Convo‑Weave is a real‑time biometric intelligence platform that bridges the gap between digital communication and human emotion. By leveraging computer vision, facial landmark analysis, and AI‑driven interpretation, Convo‑Weave provides a live feed of engagement, confusion, and stress metrics during virtual interactions.

Built for the Cosmos Hackathon 🚀

🚀 Key Features
🧠 Biometric Intelligence Feed
Real‑time facial expression analysis using MediaPipe

Continuous inference of engagement, confusion, and stress signals

🛡️ System Standby Interface
Privacy‑first design

Camera and microphone remain inactive until the user explicitly initializes the system

📊 Dynamic Metrics Dashboard
Live visual indicators for:

Engagement

Confusion

Stress

AI Confidence

Smooth, low‑latency real‑time updates

📡 Signal Broadcasting
Synchronized signal + chat feed

Broadcasts session metadata and emotional state updates across the system

☁️ Cloud Persistence
Firebase Realtime Database integration

Stores session history, biometric signals, and interaction metadata

🧾 Session Summarization
Automated AI‑generated summaries

Produced at the end of every session to capture key emotional trends and insights

🏗️ System Architecture
Frontend
React + Tailwind CSS

Hooks‑Based Architecture
useWebRTC
Manages camera and microphone hardware streams

useFacialAnalysis
Interfaces with backend AI services to process video frames

useSignals
Manages real‑time biometric state locally and in the cloud

UI / UX
Dark‑mode Glassmorphism design

Built with Lucide‑React icons

Premium, minimal, privacy‑aware interface

Backend
FastAPI + Python

main.py
Central API entry point and WebSocket manager

analysis_router.py
Handles high‑frequency frame analysis requests

emotion_detector.py
Core intelligence engine using MediaPipe + custom heuristics

firebase_store.py
Cloud persistence layer (Firebase Realtime Database)

groq_ai.py
AI / LLM integration for session summarization

tts_module.py
Text‑to‑speech and audio response logic (future‑ready)

🛠️ Installation & Setup
1️⃣ Prerequisites
Python 3.9+

Node.js & npm

Firebase account (Realtime Database enabled)

2️⃣ Backend Setup
# Clone repository
git clone <your-repo-url>
cd backend

# Install dependencies
pip install fastapi uvicorn mediapipe opencv-python numpy firebase-admin python-dotenv

# Initialize environment variables
python init_env.py
📌 Important Notes

Update the generated .env file with:

FIREBASE_DB_URL

Place your Firebase service-account.json file in the backend root directory

Do NOT commit .env or service account credentials

3️⃣ Frontend Setup
cd frontend
npm install
npm run dev
📡 API Endpoints
Method	Endpoint	Description
POST	/api/analyze-frame	Receives base64 video frame, returns biometric scores
POST	/api/chat	Persists chat messages and signals to Firebase
POST	/sessions/create	Initializes a new UUID‑based session
GET	/health	Returns system & AI engine status
🧪 Development Workflow
Initialize
User clicks “Initialize System” to grant camera & mic access

Analysis
Frontend captures video frames (~1 FPS) and sends them to the backend

Storage
Significant biometric changes and signals are pushed to Firebase Realtime Database

Summary
User clicks “End Session”, triggering AI‑generated session summary

🌍 Deployment
Frontend: Vercel (React + Tailwind)

Backend: Render (FastAPI + WebSockets)

Database: Firebase Realtime Database

The system is fully cloud‑deployed and accessible from anywhere.

🚀 Future Scope
Multi‑participant sessions

Advanced emotion trend analytics

Speaker feedback scoring

Persistent dashboards & session replay

Enterprise‑grade privacy controls

👥 Team
Backend & AI: Ayushman Saha

Frontend: Debanjan Mondal

⚖️ License
MIT License
Developed by the Convo‑Weave Team

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel


import json

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # allow all for 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Store latest emotion data (in-memory)
latest_emotion_state = {}
class EmotionData(BaseModel):
    engagement: float
    confusion: float
    stress: float
    timestamp: int

@app.get("/")
def root():
    return {"message": "Backend is running"}

@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await ws.accept()
    print("WebSocket connected")

    try:
        while True:
            # 1. Receive message from frontend
            message = await ws.receive_text()

            # 2. Convert JSON string -> Python dict
            raw_data = json.loads(message)

            # 3. Validate and store latest state
            emotion = EmotionData(**raw_data)
            global latest_emotion_state
            latest_emotion_state = emotion.dict()

            print("Received:", latest_emotion_state)

            # 4. Send confirmation back
            await ws.send_text(json.dumps({
                "status": "received",
                "data": latest_emotion_state
            }))

            # 4. Send confirmation back
            await ws.send_text(json.dumps({
                "status": "received",
                "data": latest_emotion_state
            }))

    except WebSocketDisconnect:
        print("WebSocket disconnected")

@app.get("/summary")
def summary():
    if not latest_emotion_state:
        return {
            "status": "no data",
            "message": "No emotion data received yet"
        }

    engagement = latest_emotion_state.get("engagement", 0)
    confusion = latest_emotion_state.get("confusion", 0)
    stress = latest_emotion_state.get("stress", 0)

    if confusion > 0.5:
        note = "High confusion detected"
    elif stress > 0.5:
        note = "High stress detected"
    else:
        note = "Meeting looks normal"

    return {
        "engagement": engagement,
        "confusion": confusion,
        "stress": stress,
        "summary": note
    }

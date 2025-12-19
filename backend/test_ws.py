import asyncio
import websockets
import json

async def test():
    WS_URL = "wss://convoweave-backend.onrender.com/ws"


    async with websockets.connect(WS_URL) as websocket:
        data = {
            "engagement": 0.9,
            "confusion": 0.1,
            "stress": 0.2,
            "timestamp": 123456
        }

        await websocket.send(json.dumps(data))
        print("Sent:", data)

        response = await websocket.recv()
        print("Received:", response)

asyncio.run(test())

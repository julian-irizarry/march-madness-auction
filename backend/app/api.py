from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from typing import List
from pydantic import BaseModel

class NumberModel(BaseModel):
    number: int


app = FastAPI()

origins = [
    "http://localhost:3000",
    "localhost:3000"
]


app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# Placeholder for storing the latest number
latest_number = None

# A list to keep track of connected WebSocket clients
connected_clients: List[WebSocket] = []

@app.get("/", tags=["root"])
async def read_root() -> dict:
    return {"message": "Welcome to your todo list."}

@app.post("/number/")
async def post_number(number_model: NumberModel):
    global latest_number
    latest_number = number_model.number
    # Broadcast the latest number to all connected clients
    for client in connected_clients:
        await client.send_text(str(latest_number))
    return {"number": latest_number}

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    connected_clients.append(websocket)
    try:
        # Keep the connection alive until it's closed by the client
        while True:
            # You can modify this part to send messages to the client if needed
            await websocket.receive_text()
    except WebSocketDisconnect:
        # Remove the client from the list of connected clients if they disconnect
        connected_clients.remove(websocket)
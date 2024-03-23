from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from typing import List
from pydantic import BaseModel
import string
import random

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

# Placeholder for storing participants per game id
participants = {}

# A list to keep track of connected WebSocket clients
connected_clients: List[WebSocket] = []

@app.get("/", tags=["root"])
async def read_root() -> dict:
    return {"message": "Welcome to your todo list."}

@app.post("/create-game/")
async def read_root() -> dict:
    N = 6 # number of characters for random game ID
    new_game_id = ''.join(random.choices(string.ascii_uppercase + string.digits, k=N))
    participants[new_game_id] = [''.join(random.choices(string.ascii_uppercase + string.digits, k=N))] * 6
    return {"id": new_game_id}

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
            # Send the participants list to the client
            await websocket.send_json({"participants": participants})
            # randomly update participants to test update
            for game_id in participants:
                participants[game_id] = [''.join(random.choices(string.ascii_uppercase + string.digits, k=N))] * 6

            # You can modify this part to send messages to the client if needed
            await websocket.receive_text()
    except WebSocketDisconnect:
        # Remove the client from the list of connected clients if they disconnect
        connected_clients.remove(websocket)
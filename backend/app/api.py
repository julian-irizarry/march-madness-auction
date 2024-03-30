from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List
from pydantic import BaseModel
import string
import random

class CreateModel(BaseModel):
    player: str

class JoinModel(BaseModel):
    id: str
    player: str

class GameInfo(BaseModel):
    creator: str
    participants: List[str] = []

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


# Dictionary to store game information, including participants
games: dict[str, GameInfo] = {}

# Dictionary to keep track of WebSocket connections for each game
game_connections: dict[str, List[WebSocket]] = {}

@app.post("/create-game/")
async def create_game(create_model: CreateModel) -> dict:
    N: int = 6  # number of characters for random game ID
    new_game_id: str = ''.join(random.choices(string.ascii_uppercase + string.digits, k=N))
    games[new_game_id] = GameInfo(creator=create_model.player, participants=[create_model.player])
    game_connections[new_game_id] = []  # Initialize the list of WebSocket connections for this game
    return {"id": new_game_id}

@app.post("/join-game/")
async def join_game(join_model: JoinModel):
    if join_model.id not in games:
        raise HTTPException(status_code=404, detail="Game ID not found")
    if join_model.player in games[join_model.id].participants:
        raise HTTPException(status_code=400, detail="Player name already taken in this game")
    
    games[join_model.id].participants.append(join_model.player)
    if join_model.id in game_connections:
        updated_participants = games[join_model.id].participants
        for ws in game_connections[join_model.id]:
            await ws.send_json({"participants": updated_participants})

    return {"detail": "Joined game successfully"}

@app.websocket("/ws/{game_id}")
async def websocket_endpoint(websocket: WebSocket, game_id: str):
    await websocket.accept()
    
    # Check if the game_id is valid
    if game_id not in game_connections:
        await websocket.close(code=4000, reason="Invalid game ID")
        return
    
    game_connections[game_id].append(websocket)
    
    try:
        while True:
            # Here, you can handle incoming messages if needed
            # For example, listening for a 'startGame' event from the game creator
            message: str = await websocket.receive_text()
            if message == "startGame" and websocket in game_connections[game_id][:1]: # Simplistic check for the game creator
                # Broadcast to all participants that the game is starting
                for participant_ws in game_connections[game_id]:
                    await participant_ws.send_text("gameStarted")
            # Regularly (or based on certain actions), send updated participant list
            await websocket.send_json({"participants": games[game_id].participants})
    except WebSocketDisconnect:
        # Remove the client from the list of connected clients for the game if they disconnect
        game_connections[game_id].remove(websocket)

# @app.post("/number/")
# async def post_number(number_model: NumberModel):
#     global latest_number
#     latest_number = number_model.number
#     # Broadcast the latest number to all connected clients
#     for client in connected_clients:
#         await client.send_text(str(latest_number))
#     return {"number": latest_number}

# @app.websocket("/ws-bid")
# async def websocket_endpoint_bid(websocket: WebSocket):
#     await websocket.accept()
#     connected_clients.append(websocket)
#     try:
#         # Keep the connection alive until it's closed by the client
#         while True:
#             # You can modify this part to send messages to the client if needed
#             await websocket.receive_text()
#     except WebSocketDisconnect:
#         # Remove the client from the list of connected clients if they disconnect
#         connected_clients.remove(websocket)
import asyncio
import random
import string
from typing import List, Dict, Set
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from starlette.websockets import WebSocketState
from dotenv import load_dotenv
import os

from app import GameTracker, GAME_ID_NUM_CHAR, CreateModel, JoinModel, ViewModel, BidModel
from app.types.types import jsonify_dict, jsonify_list

# ================== SETUP APP ==================

load_dotenv()

FRONTEND_HOST = os.getenv("FRONTEND_HOST", "127.0.0.1")
FRONTEND_PORT = int(os.getenv("FRONTEND_PORT", 3000))
REACT_APP_BACKEND_HOST = os.getenv("REACT_APP_BACKEND_HOST", "127.0.0.1")
REACT_APP_BACKEND_PORT = int(os.getenv("REACT_APP_BACKEND_PORT", 8000))

origins = [f"http://{FRONTEND_HOST}:{FRONTEND_PORT}", f"{FRONTEND_HOST}:{FRONTEND_PORT}", f"http://localhost:{FRONTEND_PORT}"]
app = FastAPI()
app.add_middleware(
    CORSMiddleware, allow_origins=origins, allow_credentials=True, allow_methods=["*"], allow_headers=["*"]
)

# Track Player Teams and Balance. Will turn into a database maybe
gameTracker: GameTracker = GameTracker(year=2024, month="03", day=("21", "22"))

# Dictionary to store countdown timer tasks
countdown_tasks: dict[str, asyncio.Task] = {}

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}
        self.active_games: Set[str] = set()

    async def connect(self, websocket: WebSocket, game_id: str) -> bool:
        if game_id not in self.active_games:
            await websocket.close(code=4000, reason="Invalid game ID")
            return False
        await websocket.accept()
        if game_id not in self.active_connections:
            self.active_connections[game_id] = []
        self.active_connections[game_id].append(websocket)
        return True

    async def disconnect(self, websocket: WebSocket, game_id: str):
        if game_id in self.active_connections:
            if websocket in self.active_connections[game_id]:
                self.active_connections[game_id].remove(websocket)
            if not self.active_connections[game_id]:
                del self.active_connections[game_id]
                self.active_games.remove(game_id)

    async def broadcast(self, game_id: str, message: dict):
        if game_id in self.active_connections:
            dead_connections = []
            for connection in self.active_connections[game_id]:
                try:
                    await connection.send_json(message)
                except WebSocketDisconnect:
                    dead_connections.append(connection)
            
            # Cleanup any dead connections
            for dead_connection in dead_connections:
                await self.disconnect(dead_connection, game_id)

    def add_game(self, game_id: str):
        self.active_games.add(game_id)

# Initialize the connection manager
manager = ConnectionManager()

# ================== URL PATHS ==================

@app.post("/create-game/")
async def create_game(create_model: CreateModel) -> dict:
    new_game_id: str = "".join(random.choices(string.ascii_uppercase + string.digits, k=GAME_ID_NUM_CHAR))
    gameTracker.add_game(gameId=new_game_id, creator=create_model.player)
    manager.add_game(new_game_id)
    return {"id": new_game_id}


@app.post("/join-game/")
async def join_game(join_model: JoinModel):
    if join_model.gameId not in gameTracker.games:
        raise HTTPException(status_code=404, detail="Game ID not found")
    if join_model.player in gameTracker.get_all_players(join_model.gameId):
        raise HTTPException(status_code=400, detail="Player name already taken in this game")

    gameTracker.add_player(gameId=join_model.gameId, player=join_model.player)
    
    # Broadcast updated player list to all connected clients
    await manager.broadcast(join_model.gameId, {
        "players": jsonify_dict(gameTracker.get_all_players(join_model.gameId))
    })

    return {"detail": "Joined game successfully"}


@app.post("/view-game/")
async def join_game(join_model: ViewModel):
    if join_model.gameId not in gameTracker.games:
        raise HTTPException(status_code=404, detail="Game ID not found")
    
    # Broadcast updated player list to all connected clients
    await manager.broadcast(join_model.gameId, {
        "players": jsonify_dict(gameTracker.get_all_players(join_model.gameId))
    })

    return {"detail": "Viewed game successfully"}


async def start_countdown(game_id: str):
    while True:
        gameTracker.decrement_countdown(game_id)
        await manager.broadcast(game_id, {
            "countdown": gameTracker.games[game_id].countdown
        })
        await asyncio.sleep(1)  # Wait for 1 second between each decrement
        if gameTracker.get_current_countdown(game_id) == 0:
            await finalize_bid(game_id)
            break


async def finalize_bid(game_id: str):
    # give team to last bidder
    winner: BidModel = gameTracker.finalize_bid(game_id)
    purchase_msg = f"No one bought {winner.team}!" if not winner.player else f"{winner.player} bought {winner.team} for ${winner.bid:.2f}!"

    await manager.broadcast(game_id, {
        "log": purchase_msg,
        "team": gameTracker.get_current_team(game_id).model_dump(),
        "bid": gameTracker.get_current_bid(game_id),
        "countdown": gameTracker.get_current_countdown(game_id),
        "players": jsonify_dict(gameTracker.get_all_players(game_id)),
        "remaining": jsonify_list(gameTracker.get_remaining_teams(game_id))
    })


@app.websocket("/ws/{game_id}")
async def websocket_endpoint(websocket: WebSocket, game_id: str):
    if not await manager.connect(websocket, game_id):
        return

    try:
        # Initial state broadcast
        await websocket.send_json({
            "players": jsonify_dict(gameTracker.get_all_players(game_id)),
            "bid": gameTracker.get_current_bid(game_id),
            "team": None if not gameTracker.get_current_team(game_id) else gameTracker.get_current_team(game_id).model_dump(),
            "remaining": jsonify_list(gameTracker.get_remaining_teams(game_id)),
            "all_teams": jsonify_list(gameTracker.get_all_teams()),
            "match_results": jsonify_list(gameTracker.match_results)
        })

        while True:
            try:
                message = await websocket.receive_text()
                if message == "startGame" and websocket == manager.active_connections[game_id][0]:
                    await manager.broadcast(game_id, {"type": "gameStarted"})
                    break
            except WebSocketDisconnect:
                await manager.disconnect(websocket, game_id)
                return

    except Exception as e:
        print(f"Error in websocket connection: {str(e)}")
        await manager.disconnect(websocket, game_id)
        return


@app.post("/bid/")
async def bid(bid_model: BidModel):
    if bid_model.gameId not in gameTracker.games:
        raise HTTPException(status_code=404, detail="Game ID not found")

    gameTracker.place_bid(bid_model)

    # Broadcast bid updates
    await manager.broadcast(bid_model.gameId, {
        "bid": gameTracker.get_current_bid(bid_model.gameId),
        "log": f"{bid_model.player} bid on {bid_model.team} for ${bid_model.bid:.2f}"
    })

    # Ensure there's no running countdown task or cancel if there is one
    if bid_model.gameId in countdown_tasks and not countdown_tasks[bid_model.gameId].cancelled():
        countdown_tasks[bid_model.gameId].cancel()

    countdown_tasks[bid_model.gameId] = asyncio.create_task(start_countdown(bid_model.gameId))

    return {"detail": "Bid placed successfully"}

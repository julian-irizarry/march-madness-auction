import asyncio
import os
import random
import string
from typing import List

from app import (
    GAME_ID_NUM_CHAR,
    BidModel,
    CreateModel,
    GameTracker,
    JoinModel,
    ViewModel,
)
from app.types.types import jsonify_dict, jsonify_list
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from starlette.websockets import WebSocketState

# ================== SETUP APP ==================

load_dotenv()

FRONTEND_HOST = os.getenv("FRONTEND_HOST", "127.0.0.1")
FRONTEND_PORT = int(os.getenv("FRONTEND_PORT", 3000))
REACT_APP_BACKEND_HOST = os.getenv("REACT_APP_BACKEND_HOST", "127.0.0.1")
REACT_APP_BACKEND_PORT = int(os.getenv("REACT_APP_BACKEND_PORT", 8000))

origins = [
    f"http://{FRONTEND_HOST}:{FRONTEND_PORT}",  # Local frontend
    f"{FRONTEND_HOST}:{FRONTEND_PORT}",  # Local frontend without protocol
    f"http://localhost:{FRONTEND_PORT}",  # Localhost for testing
    "http://mmauctiongame.com",  # Production frontend
]

app = FastAPI()
app.add_middleware(
    CORSMiddleware, allow_origins=origins, allow_credentials=True, allow_methods=["*"], allow_headers=["*"]
)

# Dictionary to keep track of WebSocket connections for each game
game_connections: dict[str, List[WebSocket]] = {}

# Track Player Teams and Balance. Will turn into a database maybe
gameTracker: GameTracker = GameTracker(year=2024, month="03", day=("21", "22"))

# Dictionary to store countdown timer tasks
countdown_tasks: dict[str, asyncio.Task] = {}

# ================== URL PATHS ==================


@app.post("/create-game/")
async def create_game(create_model: CreateModel) -> dict:
    new_game_id: str = "".join(random.choices(string.ascii_uppercase + string.digits, k=GAME_ID_NUM_CHAR))
    gameTracker.add_game(gameId=new_game_id, creator=create_model.player)
    game_connections[new_game_id] = []  # Initialize the list of WebSocket connections for this game
    return {"id": new_game_id}


@app.post("/join-game/")
async def join_game(join_model: JoinModel):
    if join_model.gameId not in gameTracker.games:
        raise HTTPException(status_code=404, detail="Game ID not found")
    if join_model.player in gameTracker.get_all_players(join_model.gameId):
        raise HTTPException(status_code=400, detail="Player name already taken in this game")

    gameTracker.add_player(gameId=join_model.gameId, player=join_model.player)

    if join_model.gameId in game_connections:
        for ws in game_connections[join_model.gameId]:
            await ws.send_json({"players": jsonify_dict(gameTracker.get_all_players(join_model.gameId))})

    return {"detail": "Joined game successfully"}


@app.post("/view-game/")
async def view_game(join_model: ViewModel):
    if join_model.gameId not in gameTracker.games:
        raise HTTPException(status_code=404, detail="Game ID not found")

    if join_model.gameId in game_connections:
        for ws in game_connections[join_model.gameId]:
            await ws.send_json({"players": jsonify_dict(gameTracker.get_all_players(join_model.gameId))})

    return {"detail": "Viewed game successfully"}


async def start_countdown(game_id: str):
    while True:
        gameTracker.decrement_countdown(game_id)
        for ws in game_connections[game_id]:
            await ws.send_json({"countdown": gameTracker.games[game_id].countdown})
        await asyncio.sleep(1)  # Wait for 1 second between each decrement
        if gameTracker.get_current_countdown(game_id) == 0:
            await finalize_bid(game_id)
            break


async def finalize_bid(game_id: str):
    # give team to last bidder
    winner: BidModel = gameTracker.finalize_bid(game_id)
    purchase_msg = (
        f"No one bought {winner.team}!"
        if not winner.player
        else f"{winner.player} bought {winner.team} for ${winner.bid:.2f}!"
    )

    for ws in game_connections[game_id]:
        await ws.send_json({"log": purchase_msg})
        await ws.send_json({"team": gameTracker.get_current_team(game_id).model_dump()})
        await ws.send_json({"bid": gameTracker.get_current_bid(game_id)})
        await ws.send_json({"countdown": gameTracker.get_current_countdown(game_id)})
        await ws.send_json({"players": jsonify_dict(gameTracker.get_all_players(game_id))})
        await ws.send_json({"remaining": jsonify_list(gameTracker.get_remaining_teams(game_id))})


@app.websocket("/ws/{game_id}")
async def websocket_endpoint(websocket: WebSocket, game_id: str):
    await websocket.accept()
    if game_id not in game_connections:
        await websocket.close(code=4000, reason="Invalid game ID")
        return
    game_connections[game_id].append(websocket)

    async def send_participant_updates():
        try:
            while True:
                if websocket.application_state == WebSocketState.CONNECTED:
                    await websocket.send_json({"players": jsonify_dict(gameTracker.get_all_players(game_id))})
                else:
                    break  # Stop sending if the connection is no longer active
                await asyncio.sleep(10)
        except WebSocketDisconnect:
            # Handle the WebSocket disconnection
            if websocket in game_connections[game_id]:
                game_connections[game_id].remove(websocket)
                print(f"WebSocket disconnected: {websocket}")

    async def send_bid_updates():
        try:
            while True:
                if websocket.application_state == WebSocketState.CONNECTED:
                    await websocket.send_json({"bid": gameTracker.get_current_bid(game_id)})
                else:
                    break  # Stop sending if the connection is no longer active
                await asyncio.sleep(10)
        except WebSocketDisconnect:
            # Handle the WebSocket disconnection
            if websocket in game_connections[game_id]:
                game_connections[game_id].remove(websocket)
                print(f"WebSocket disconnected: {websocket}")

    async def send_team():
        try:
            while True:
                if websocket.application_state == WebSocketState.CONNECTED:
                    await websocket.send_json(
                        {
                            "team": (
                                None
                                if not gameTracker.get_current_team(game_id)
                                else gameTracker.get_current_team(game_id).model_dump()
                            )
                        }
                    )
                else:
                    break  # Stop sending if the connection is no longer active
                await asyncio.sleep(10)
        except WebSocketDisconnect:
            # Handle the WebSocket disconnection
            if websocket in game_connections[game_id]:
                game_connections[game_id].remove(websocket)
                print(f"WebSocket disconnected: {websocket}")

    async def send_remaining():
        try:
            while True:
                if websocket.application_state == WebSocketState.CONNECTED:
                    await websocket.send_json({"remaining": jsonify_list(gameTracker.get_remaining_teams(game_id))})
                else:
                    break  # Stop sending if the connection is no longer active
                await asyncio.sleep(10)
        except WebSocketDisconnect:
            # Handle the WebSocket disconnection
            if websocket in game_connections[game_id]:
                game_connections[game_id].remove(websocket)
                print(f"WebSocket disconnected: {websocket}")

    async def send_all_teams():
        try:
            while True:
                if websocket.application_state == WebSocketState.CONNECTED:
                    await websocket.send_json({"all_teams": jsonify_list(gameTracker.get_all_teams())})
                else:
                    break  # Stop sending if the connection is no longer active
                await asyncio.sleep(10)
        except WebSocketDisconnect:
            # Handle the WebSocket disconnection
            if websocket in game_connections[game_id]:
                game_connections[game_id].remove(websocket)
                print(f"WebSocket disconnected: {websocket}")

    async def send_match_results():
        try:
            while True:
                if websocket.application_state == WebSocketState.CONNECTED:
                    await websocket.send_json({"match_results": jsonify_list(gameTracker.match_results)})
                else:
                    break  # Stop sending if the connection is no longer active
                await asyncio.sleep(10)
        except WebSocketDisconnect:
            # Handle the WebSocket disconnection
            if websocket in game_connections[game_id]:
                game_connections[game_id].remove(websocket)
                print(f"WebSocket disconnected: {websocket}")

    async def listen_for_messages():
        try:
            while True:
                message = await websocket.receive_text()
                if message == "startGame" and websocket in game_connections[game_id][:1]:
                    for participant_ws in game_connections[game_id]:
                        await participant_ws.send_text("gameStarted")
                    break  # Exit the loop if the game starts
        except WebSocketDisconnect:
            # Handle the WebSocket disconnection
            if websocket in game_connections[game_id]:
                game_connections[game_id].remove(websocket)
                print(f"WebSocket disconnected: {websocket}")

    send_participant_task = asyncio.create_task(send_participant_updates())
    send_bid_task = asyncio.create_task(send_bid_updates())
    send_team_task = asyncio.create_task(send_team())
    send_remaining_task = asyncio.create_task(send_remaining())
    send_all_teams_task = asyncio.create_task(send_all_teams())
    send_match_results_task = asyncio.create_task(send_match_results())
    listen_task = asyncio.create_task(listen_for_messages())

    # Wait for either task to complete
    done, pending = await asyncio.wait(
        [
            send_participant_task,
            send_bid_task,
            listen_task,
            send_team_task,
            send_remaining_task,
            send_all_teams_task,
            send_match_results_task,
        ],
        return_when=asyncio.FIRST_COMPLETED,
    )

    # Cancel any pending tasks if one task completes
    for task in pending:
        task.cancel()

    # Cleanup after tasks complete
    if game_id in game_connections and websocket in game_connections[game_id]:
        game_connections[game_id].remove(websocket)


@app.post("/bid/")
async def bid(bid_model: BidModel):
    if bid_model.gameId not in gameTracker.games:
        raise HTTPException(status_code=404, detail="Game ID not found")

    gameTracker.place_bid(bid_model)

    if bid_model.gameId in game_connections:
        for ws in game_connections[bid_model.gameId]:
            await ws.send_json({"bid": gameTracker.get_current_bid(bid_model.gameId)})
            await ws.send_json({"log": f"{bid_model.player} bid on {bid_model.team} for ${bid_model.bid:.2f}"})

    # Ensure there's no running countdown task or cancel if there is one
    if bid_model.gameId in countdown_tasks and not countdown_tasks[bid_model.gameId].cancelled():
        countdown_tasks[bid_model.gameId].cancel()

    countdown_tasks[bid_model.gameId] = asyncio.create_task(start_countdown(bid_model.gameId))

    return {"detail": "Bid placed successfully"}

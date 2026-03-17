import asyncio
import random
import string
import pickle
import os
import uuid
from typing import List
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from starlette.websockets import WebSocketState
from dotenv import load_dotenv

from app import GameTracker, GAME_ID_NUM_CHAR, CreateModel, JoinModel, ViewModel, BidModel
from app.types.types import GamePhase, INITIAL_BALANCE, jsonify_dict, jsonify_list

# Define path for saving state
STATE_FILE = f"app/game_state.pkl"

# Helper functions to save and load state
def save_state() -> None:
    with open(STATE_FILE, "wb") as f:
        pickle.dump(gameTracker.games, f)

def load_state() -> None:
    if os.path.exists(STATE_FILE):
        with open(STATE_FILE, "rb") as f:
            gameTracker.games = pickle.load(f)

# ================== SETUP APP ==================

load_dotenv()

FRONTEND_HOST = os.getenv("FRONTEND_HOST", "127.0.0.1")
FRONTEND_PORT = int(os.getenv("FRONTEND_PORT", 3000))
BACKEND_HOST = os.getenv("VITE_BACKEND_HOST", "127.0.0.1")
BACKEND_PORT = int(os.getenv("VITE_BACKEND_PORT", 8000))

origins = [
    f"http://{FRONTEND_HOST}:{FRONTEND_PORT}",
    f"http://localhost:{FRONTEND_PORT}",
    f"http://127.0.0.1:{FRONTEND_PORT}",
]
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dictionary to keep track of WebSocket connections for each game
game_connections: dict[str, List[WebSocket]] = {}

# Track Player Teams and Balance. Will turn into a database maybe
gameTracker: GameTracker = GameTracker(year=2025, month="03", day=("20", "21"))

# Dictionary to store countdown timer tasks
countdown_tasks: dict[str, asyncio.Task] = {}

# Session store: session_id -> {gameId, playerName, isCreator}
SESSION_COOKIE_NAME = "session_id"
SESSION_COOKIE_MAX_AGE = 60 * 60 * 24 * 7  # 7 days
sessions: dict[str, dict] = {}

SESSION_FILE = "app/session_state.pkl"

def save_sessions() -> None:
    with open(SESSION_FILE, "wb") as f:
        pickle.dump(sessions, f)

def load_sessions() -> None:
    global sessions
    if os.path.exists(SESSION_FILE):
        with open(SESSION_FILE, "rb") as f:
            sessions = pickle.load(f)

def set_session_cookie(response: Response, session_id: str) -> None:
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=session_id,
        max_age=SESSION_COOKIE_MAX_AGE,
        httponly=True,
        samesite="lax",
    )

# ================== STARTUP ==================

@app.on_event("startup")
async def startup():
    load_state()
    load_sessions()

# ================== URL PATHS ==================

@app.post("/create-game/")
async def create_game(create_model: CreateModel, response: Response) -> dict:
    new_game_id: str = "".join(random.choices(string.ascii_uppercase + string.digits, k=GAME_ID_NUM_CHAR))
    gameTracker.add_game(gameId=new_game_id, creator=create_model.player)
    game_connections[new_game_id] = []  # Initialize the list of WebSocket connections for this game

    # Create session
    session_id = str(uuid.uuid4())
    sessions[session_id] = {"gameId": new_game_id, "playerName": create_model.player, "isCreator": True}
    set_session_cookie(response, session_id)

    save_state()
    save_sessions()
    return {"id": new_game_id}


@app.post("/join-game/")
async def join_game(join_model: JoinModel, request: Request, response: Response):
    if join_model.gameId not in gameTracker.games:
        raise HTTPException(status_code=404, detail="Game ID not found")

    # Check if player name already exists — allow rejoin if cookie matches
    if join_model.player in gameTracker.get_all_players(join_model.gameId):
        session_id = request.cookies.get(SESSION_COOKIE_NAME)
        if session_id and session_id in sessions:
            session = sessions[session_id]
            if session["gameId"] == join_model.gameId and session["playerName"] == join_model.player:
                # Valid rejoin — refresh the cookie and let them back in
                set_session_cookie(response, session_id)
                return {"detail": "Rejoined game successfully"}
        raise HTTPException(status_code=400, detail="Player name already taken in this game")

    gameTracker.add_player(gameId=join_model.gameId, player=join_model.player)

    # Create session
    session_id = str(uuid.uuid4())
    sessions[session_id] = {"gameId": join_model.gameId, "playerName": join_model.player, "isCreator": False}
    set_session_cookie(response, session_id)

    save_state()
    save_sessions()

    if join_model.gameId in game_connections:
        for ws in game_connections[join_model.gameId]:
            await ws.send_json({"players": jsonify_dict(gameTracker.get_all_players(join_model.gameId))})

    return {"detail": "Joined game successfully"}


@app.get("/rejoin/")
async def rejoin(request: Request):
    session_id = request.cookies.get(SESSION_COOKIE_NAME)
    if not session_id or session_id not in sessions:
        raise HTTPException(status_code=401, detail="No active session")

    session = sessions[session_id]
    game_id = session["gameId"]

    # Verify the game still exists
    if game_id not in gameTracker.games:
        # Clean up stale session
        del sessions[session_id]
        save_sessions()
        raise HTTPException(status_code=404, detail="Game no longer exists")

    game = gameTracker.games[game_id]
    return {
        "gameId": session["gameId"],
        "playerName": session["playerName"],
        "isCreator": session["isCreator"],
        "phase": game.phase.value,
    }


@app.post("/view-game/")
async def view_game(view_model: ViewModel):
    if view_model.gameId not in gameTracker.games:
        raise HTTPException(status_code=404, detail="Game ID not found")

    gameTracker.calculate_player_points(view_model.gameId)

    if view_model.gameId in game_connections:
        for ws in game_connections[view_model.gameId]:
            await ws.send_json({"players": jsonify_dict(gameTracker.get_all_players(view_model.gameId))})

    return {"detail": "Viewed game successfully"}


@app.get("/game/{game_id}/stats")
async def game_stats(game_id: str):
    if game_id not in gameTracker.games:
        raise HTTPException(status_code=404, detail="Game ID not found")

    game = gameTracker.games[game_id]
    gameTracker.calculate_player_points(game_id)

    players = game.players
    history = game.auctionHistory

    # Build leaderboard
    leaderboard = []
    for name, player in players.items():
        teams_owned = [
            {
                "name": t.shortName,
                "seed": t.seed,
                "region": t.region,
                "purchasePrice": t.purchasePrice,
                "points": t.points or 0,
            }
            for t in player.teams.values()
        ]
        leaderboard.append({
            "name": name,
            "points": player.points,
            "balance": player.balance,
            "spent": INITIAL_BALANCE - player.balance,
            "teamsOwned": len(player.teams),
            "teams": teams_owned,
        })
    leaderboard.sort(key=lambda p: p["points"], reverse=True)

    # Average cost per seed
    seed_costs: dict[int, list[int]] = {}
    for sale in history:
        if sale.price > 0:
            seed_costs.setdefault(sale.seed, []).append(sale.price)
    avg_cost_per_seed = [
        {
            "seed": seed,
            "avgCost": round(sum(prices) / len(prices), 2),
            "totalSpent": sum(prices),
            "teamsSold": len(prices),
        }
        for seed, prices in sorted(seed_costs.items())
    ]

    # Full auction history
    sale_log = [sale.model_dump() for sale in history]

    return {
        "gameId": game_id,
        "phase": game.phase.value,
        "leaderboard": leaderboard,
        "avgCostPerSeed": avg_cost_per_seed,
        "auctionHistory": sale_log,
        "totalTeamsSold": sum(1 for s in history if s.buyer),
        "totalTeamsUnsold": sum(1 for s in history if not s.buyer),
    }


@app.post("/game/{game_id}/refresh-scores")
async def refresh_scores(game_id: str):
    if game_id not in gameTracker.games:
        raise HTTPException(status_code=404, detail="Game ID not found")

    count = gameTracker.refresh_match_results()
    gameTracker.calculate_player_points(game_id)
    save_state()

    # Broadcast updated data to any connected clients
    if game_id in game_connections:
        for ws in game_connections[game_id]:
            await ws.send_json({"players": jsonify_dict(gameTracker.get_all_players(game_id))})
            await ws.send_json({"match_results": jsonify_list(gameTracker.match_results)})

    return {"detail": f"Refreshed {count} match results"}


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
    winner:BidModel = gameTracker.finalize_bid(game_id)
    purchase_msg = f"No one bought {winner.team}!" if not winner.player else f"{winner.player} bought {winner.team} for ${winner.bid:.2f}!"

    gameTracker.calculate_player_points(game_id)
    save_state()

    current_team = gameTracker.get_current_team(game_id)
    game = gameTracker.games[game_id]

    for ws in game_connections[game_id]:
        await ws.send_json({"log": purchase_msg})
        await ws.send_json({"team": current_team.model_dump() if current_team else None})
        await ws.send_json({"bid": gameTracker.get_current_bid(game_id)})
        await ws.send_json({"current_bidder": gameTracker.get_current_bidder(game_id)})
        await ws.send_json({"countdown": gameTracker.get_current_countdown(game_id)})
        await ws.send_json({"players": jsonify_dict(gameTracker.get_all_players(game_id))})
        await ws.send_json({"remaining": jsonify_list(gameTracker.get_remaining_teams(game_id))})
        if game.phase == GamePhase.ENDED:
            await ws.send_json({"phase": "ended"})


@app.websocket("/ws/{game_id}")
async def websocket_endpoint(websocket: WebSocket, game_id: str):
    await websocket.accept()
    if game_id not in gameTracker.games:
        await websocket.close(code=4000, reason="Invalid game ID")
        return
    if game_id not in game_connections:
        game_connections[game_id] = []
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
                    await websocket.send_json({"current_bidder": gameTracker.get_current_bidder(game_id)})
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
                    await websocket.send_json({"team": None if not gameTracker.get_current_team(game_id) else gameTracker.get_current_team(game_id).model_dump()})
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
                if websocket.application_state == WebSocketState.CONNECTED:
                    message = await websocket.receive_text()
                    if message == "startGame" and websocket in game_connections[game_id][:1]:
                        gameTracker.games[game_id].phase = GamePhase.AUCTION
                        save_state()
                        for participant_ws in game_connections[game_id]:
                            await participant_ws.send_text("gameStarted")
                        break  # Exit the loop if the game starts
                else:
                    break  # Stop sending if the connection is no longer active
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
        [send_participant_task, send_bid_task, listen_task, send_team_task, send_remaining_task, send_all_teams_task, send_match_results_task],
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
    save_state()  # Save state after placing a bid

    if bid_model.gameId in game_connections:
        for ws in game_connections[bid_model.gameId]:
            await ws.send_json({"bid": gameTracker.get_current_bid(bid_model.gameId)})
            await ws.send_json({"current_bidder": gameTracker.get_current_bidder(bid_model.gameId)})
            await ws.send_json({"log": f"{bid_model.player} bid on {bid_model.team} for ${bid_model.bid:.2f}"})

    # Ensure there's no running countdown task or cancel if there is one
    if bid_model.gameId in countdown_tasks and not countdown_tasks[bid_model.gameId].cancelled():
        countdown_tasks[bid_model.gameId].cancel()

    countdown_tasks[bid_model.gameId] = asyncio.create_task(start_countdown(bid_model.gameId))

    return {"detail": "Bid placed successfully"}

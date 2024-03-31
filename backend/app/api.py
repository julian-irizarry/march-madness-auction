from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List
import string
import random
import asyncio

from .types.types import JoinModel, GameInfo, BidModel, CreateModel, GAME_ID_NUM_CHAR, INITIAL_COUNTDOWN, INITIAL_BID
from .bid import GameTracker

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

# Track Player Teams and Balance. Will turn into a database maybe
gameInfo: GameTracker = GameTracker(year=2024, month="03", day=('21', '22'))

# Dictionary to store countdown timer tasks
countdown_tasks: dict[str, asyncio.Task] = {}

# Dictionary to store finalize bid tasks
finalize_bid_tasks: dict[str, asyncio.Task] = {}

@app.post("/create-game/")
async def create_game(create_model: CreateModel) -> dict:
    new_game_id: str = ''.join(random.choices(string.ascii_uppercase + string.digits, k=GAME_ID_NUM_CHAR))
    games[new_game_id] = GameInfo(creator=create_model.player, participants=[create_model.player], currentTeam=gameInfo.get_random_team())
    game_connections[new_game_id] = []  # Initialize the list of WebSocket connections for this game
    gameInfo.add_game(gameId=new_game_id)
    gameInfo.add_player(gameId=new_game_id, player=create_model.player)
    return {"id": new_game_id}

@app.post("/join-game/")
async def join_game(join_model: JoinModel):
    if join_model.gameId not in games:
        raise HTTPException(status_code=404, detail="Game ID not found")
    if join_model.player in games[join_model.gameId].participants:
        raise HTTPException(status_code=400, detail="Player name already taken in this game")
    
    gameInfo.add_player(gameId=join_model.gameId, player=join_model.player)

    games[join_model.gameId].participants.append(join_model.player)
    if join_model.gameId in game_connections:
        participants = {k: v.dict() for k, v in gameInfo.get_all_players(join_model.gameId).items()}
        for ws in game_connections[join_model.gameId]:
            await ws.send_json({"participants": participants})

    return {"detail": "Joined game successfully"}

async def start_countdown(game_id: str):
    while True:
        games[game_id].countdown -= 1
        for ws in game_connections[game_id]:
            await ws.send_json({"countdown": games[game_id].countdown})
        await asyncio.sleep(1)  # Wait for 1 second between each decrement
        if games[game_id].countdown-1 == -1:
            for ws in game_connections[game_id]:
                # Ensure there's no running countdown task or cancel if there is one
                if game_id in finalize_bid_tasks and not finalize_bid_tasks[game_id].cancelled():
                    finalize_bid_tasks[game_id].cancel()
                    
                finalize_bid_tasks[game_id] = asyncio.create_task(finalize_bid(game_id))
            break

async def finalize_bid(game_id: str):
    for ws in game_connections[game_id]:
        # give team to last bidder
        if len(games[game_id].log) > 0:
            winner: BidModel = games[game_id].log[-1]
            gameInfo.update_player(game_id, winner.player, winner.bid, winner.team)

            log_s: list[str] = [f"{l.player} bid on {l.team} for ${l.bid}!" for l in games[game_id].log]
            await ws.send_json({"log": log_s})
            purchase_msg:str = f"{winner.player} bought {winner.team} for ${winner.bid}!"
            await ws.send_json({"purchase": purchase_msg})
        else:
            purchase_msg:str = f""
            await ws.send_json({"purchase": purchase_msg})
        
        # pick random new team to auction
        games[game_id].currentTeam = gameInfo.get_random_team()
        games[game_id].currentBid = INITIAL_BID # reset bid
        games[game_id].countdown = INITIAL_COUNTDOWN  # reset countdown
        games[game_id].log = []  # reset log

        # Ensure there's no running countdown task or cancel if there is one
        if game_id in countdown_tasks and not countdown_tasks[game_id].cancelled():
            countdown_tasks[game_id].cancel()

        countdown_tasks[game_id] = asyncio.create_task(start_countdown(game_id))

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
                participants = {k: v.model_dump() for k, v in gameInfo.get_all_players(game_id).items()}
                await websocket.send_json({"participants": participants})
                await asyncio.sleep(10)  # Adjust the sleep duration as needed
        except WebSocketDisconnect:
            # Handle the WebSocket disconnection
            game_connections[game_id].remove(websocket)
            print(f"WebSocket disconnected: {websocket}")

    async def send_bid_updates():
        try:
            while True:
                await websocket.send_json({"bid": games[game_id].currentBid})
                await asyncio.sleep(10)  # Adjust the sleep duration as needed
        except WebSocketDisconnect:
            # Handle the WebSocket disconnection
            game_connections[game_id].remove(websocket)
            print(f"WebSocket disconnected: {websocket}")

    async def send_team():
        try:
            while True:
                await websocket.send_json({"team": games[game_id].currentTeam})
                await asyncio.sleep(10)  # Adjust the sleep duration as needed
        except WebSocketDisconnect:
            # Handle the WebSocket disconnection
            game_connections[game_id].remove(websocket)
            print(f"WebSocket disconnected: {websocket}")

    async def send_log():
        try:
            while True:
                log_s: list[str] = [f"{l.player} bid on {l.team} for ${l.bid}!" for l in games[game_id].log]
                await websocket.send_json({"log": log_s})
                await asyncio.sleep(10)  # Adjust the sleep duration as needed
        except WebSocketDisconnect:
            # Handle the WebSocket disconnection
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
            game_connections[game_id].remove(websocket)
            print(f"WebSocket disconnected: {websocket}")

    send_participant_task = asyncio.create_task(send_participant_updates())
    send_bid_task = asyncio.create_task(send_bid_updates())
    send_team_task = asyncio.create_task(send_team())
    send_log_task = asyncio.create_task(send_log())
    listen_task = asyncio.create_task(listen_for_messages())

    # Wait for either task to complete
    done, pending = await asyncio.wait(
        [send_participant_task, send_bid_task, listen_task, send_team_task, send_log_task],
        return_when=asyncio.FIRST_COMPLETED,
    )

    # Cancel any pending tasks if one task completes
    for task in pending:
        task.cancel()

    # Cleanup after tasks complete
    if game_id in game_connections:
        game_connections[game_id].remove(websocket)

@app.post("/bid/")
async def bid(bid_model: BidModel):
    if bid_model.gameId not in games:
        raise HTTPException(status_code=404, detail="Game ID not found")
    
    games[bid_model.gameId].log.append(bid_model)
    games[bid_model.gameId].currentBid = bid_model.bid
    games[bid_model.gameId].countdown = INITIAL_COUNTDOWN  # reset countdown
    log_s: list[str] = [f"{l.player} bid on {l.team} for ${l.bid}!" for l in games[bid_model.gameId].log]

    if bid_model.gameId in game_connections:
        updated_bid = games[bid_model.gameId].currentBid 
        for ws in game_connections[bid_model.gameId]:
            await ws.send_json({"bid": updated_bid})
            await ws.send_json({"log": log_s})

    # Ensure there's no running countdown task or cancel if there is one
    if bid_model.gameId in countdown_tasks and not countdown_tasks[bid_model.gameId].cancelled():
        countdown_tasks[bid_model.gameId].cancel()
        
    countdown_tasks[bid_model.gameId] = asyncio.create_task(start_countdown(bid_model.gameId))

    return {"detail": "Bid placed successfully"}
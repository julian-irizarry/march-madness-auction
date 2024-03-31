from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List
from pydantic import BaseModel
import string
import random
import asyncio

from .types.types import JoinModel, GameInfo, BidModel, CreateModel, GAME_ID_NUM_CHAR, INITIAL_COUNTDOWN, INITIAL_BID, INITIAL_BALANCE
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

@app.post("/create-game/")
async def create_game(create_model: CreateModel) -> dict:
    new_game_id: str = ''.join(random.choices(string.ascii_uppercase + string.digits, k=GAME_ID_NUM_CHAR))
    games[new_game_id] = GameInfo(creator=create_model.player, participants=[create_model.player])
    game_connections[new_game_id] = []  # Initialize the list of WebSocket connections for this game
    gameInfo.addGame(gameId=new_game_id)
    gameInfo.addPlayer(id=create_model.player, gameId=new_game_id)
    return {"id": new_game_id}

@app.post("/join-game/")
async def join_game(join_model: JoinModel):
    if join_model.id not in games:
        raise HTTPException(status_code=404, detail="Game ID not found")
    if join_model.player in games[join_model.id].participants:
        raise HTTPException(status_code=400, detail="Player name already taken in this game")
    
    gameInfo.addPlayer(join_model.player, gameId=join_model.id)

    games[join_model.id].participants.append(join_model.player)
    if join_model.id in game_connections:
        updated_participants = games[join_model.id].participants
        for ws in game_connections[join_model.id]:
            await ws.send_json({"participants": updated_participants})

    return {"detail": "Joined game successfully"}

async def start_countdown(game_id: str):
    print("STARTING COUNTDOWN")
    while games[game_id].countdown > 0:
        for ws in game_connections[game_id]:
            await ws.send_json({"countdown": games[game_id].countdown})
        games[game_id].countdown -= 1
        await asyncio.sleep(1)  # Wait for 1 second between each decrement
        
        if games[game_id].countdown == 0:
            for ws in game_connections[game_id]:
                await ws.send_json({"countdown": games[game_id].countdown})

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
                await websocket.send_json({"participants": games[game_id].participants})
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

    async def listen_for_messages():
        try: 
            while True:
                message = await websocket.receive_text()
                if message == "startGame" and websocket in game_connections[game_id][:1]:
                    # Reset the countdown
                    games[game_id].countdown = INITIAL_COUNTDOWN
                    
                    for participant_ws in game_connections[game_id]:
                        await participant_ws.send_text("gameStarted")

                    # Ensure there's no running countdown task or cancel if there is one
                    if game_id in countdown_tasks and not countdown_tasks[game_id].cancelled():
                        countdown_tasks[game_id].cancel()
                        
                    countdown_tasks[game_id] = asyncio.create_task(start_countdown(game_id))

                    break  # Exit the loop if the game starts
        except WebSocketDisconnect:
            # Handle the WebSocket disconnection
            game_connections[game_id].remove(websocket)
            print(f"WebSocket disconnected: {websocket}")

    send_participant_task = asyncio.create_task(send_participant_updates())
    send_bid_task = asyncio.create_task(send_bid_updates())
    listen_task = asyncio.create_task(listen_for_messages())

    # Wait for either task to complete
    done, pending = await asyncio.wait(
        [send_participant_task, send_bid_task, listen_task],
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
    if bid_model.id not in games:
        raise HTTPException(status_code=404, detail="Game ID not found")
    
    games[bid_model.id].currentBid = bid_model.bid
    games[bid_model.id].countdown = INITIAL_COUNTDOWN  # reset countdown

    if bid_model.id in game_connections:
        updated_bid = games[bid_model.id].currentBid 
        for ws in game_connections[bid_model.id]:
            await ws.send_json({"bid": updated_bid})

    # Ensure there's no running countdown task or cancel if there is one
    if bid_model.id in countdown_tasks and not countdown_tasks[bid_model.id].cancelled():
        countdown_tasks[bid_model.id].cancel()
        
    countdown_tasks[bid_model.id] = asyncio.create_task(start_countdown(bid_model.id))

    return {"detail": "Bid placed successfully"}
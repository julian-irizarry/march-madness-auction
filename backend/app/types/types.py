from pydantic import BaseModel
from typing import List

GAME_ID_NUM_CHAR = 6
INITIAL_COUNTDOWN = 10
INITIAL_BID = 1
INITIAL_BALANCE = 100

class CreateModel(BaseModel):
    player: str

class JoinModel(BaseModel):
    id: str
    player: str

class BidModel(BaseModel):
    id: str
    bid: float
    team: str

class GameInfo(BaseModel):
    creator: str
    participants: List[str] = []
    currentBid: float = INITIAL_BID
    countdown: float = INITIAL_COUNTDOWN

class PlayerInfo(BaseModel):
    gameId: str
    balance: int = INITIAL_BALANCE
    teams: List[str] = []

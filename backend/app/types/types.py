from pydantic import BaseModel
from typing import List

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
    currentBid: float = 1

class PlayerInfo(BaseModel):
    gameId: str
    balance: int = 100
    teams: List[str] = []

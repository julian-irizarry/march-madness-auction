from enum import Enum
from typing import List
from pydantic import BaseModel


class GamePhase(str, Enum):
    LOBBY = "lobby"
    AUCTION = "auction"
    ENDED = "ended"

GAME_ID_NUM_CHAR = 6
INITIAL_COUNTDOWN = 10
INITIAL_BID = 0
INITIAL_BALANCE = 100


def jsonify_dict(input: dict[str, BaseModel]) -> dict:
    return {k: v.model_dump() for k, v in input.items()}


def jsonify_list(input: list[BaseModel]) -> list:
    return [v.model_dump() for v in input]


class CreateModel(BaseModel):
    player: str


class JoinModel(BaseModel):
    gameId: str
    player: str


class ViewModel(BaseModel):
    gameId: str


class BidModel(BaseModel):
    gameId: str
    player: str
    bid: int
    team: str


class TeamInfo(BaseModel):
    shortName: str
    urlName: str
    seed: int
    region: str
    purchasePrice: float|None = None
    points: int|None = None


class SaleRecord(BaseModel):
    team: str
    seed: int
    region: str
    buyer: str          # empty string if nobody bought
    price: int          # 0 if nobody bought
    numBids: int        # how many bids were placed on this team

class PlayerInfo(BaseModel):
    name: str
    gameId: str
    balance: int = INITIAL_BALANCE
    points: int = 0
    teams: dict[str, TeamInfo] = {}


class GameInfo(BaseModel):
    creator: str
    players: dict[str, PlayerInfo] = {}
    currentBid: float = INITIAL_BID
    countdown: float = INITIAL_COUNTDOWN
    currentTeam: TeamInfo = None
    teams: dict[str, TeamInfo] = {}
    log: List[BidModel] = []
    auctionHistory: List[SaleRecord] = []
    phase: GamePhase = GamePhase.LOBBY


class MatchInfo(BaseModel):
    id: int
    nextMatchId: int|None
    roundName: str
    participants: List[TeamInfo]
    winner: str
    startDate: str
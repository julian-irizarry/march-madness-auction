import random

from .types.types import PlayerInfo
from .bracket import getTeams

class GameTracker():
    def __init__(self, year: int, month: str, day: tuple[str, str]):
        self.games: dict[str, dict[str, PlayerInfo]] = {}
        self.teams = getTeams(year, month, day)

    def addGame(self, gameId: str) -> None:
        self.games[gameId] = {}
    
    def addPlayer(self, id: str, gameId: str) -> None:
        self.games[gameId][id] = PlayerInfo(gameId=gameId)

    def updatePlayer(self, gameId:str, id: str, bidAmount: int, purchasedTeam: str) -> None:
        self.games[gameId][id].balance -= bidAmount
        self.games[gameId][id].teams.append(purchasedTeam)
    
    def getPlayerInfo(self, gameId: str, id: str) -> PlayerInfo:
        return self.games[gameId][id]

    def getAllPlayers(self, gameId: str) -> dict[str,PlayerInfo]:
        return self.games[gameId]
    
    def getRandomTeam(self) -> list[str]:
        team: list[str] = random.choice(self.teams)
        self.teams.remove(team)
        return team
    
    def getRemainingTeams(self) -> list[list[str]]:
        return self.teams
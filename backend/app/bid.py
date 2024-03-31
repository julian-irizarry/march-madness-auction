from .types.types import PlayerInfo

class GameTracker():
    def __init__(self):
        self.games: dict[str, dict[str, PlayerInfo]] = {}

    def addGame(self, gameId: str):
        self.games[gameId] = {}
    
    def addPlayer(self, id: str, gameId: str):
        self.games[gameId][id] = PlayerInfo(gameId=gameId)

    def updatePlayer(self, gameId:str, id: str, bidAmount: int, purchasedTeam: str):
        self.games[gameId][id].balance -= bidAmount
        self.games[gameId][id].teams.append(purchasedTeam)
    
    def getPlayerInfo(self, gameId: str, id: str) -> PlayerInfo:
        return self.games[gameId][id]

    def getAll(self, gameId: str, id: str) -> dict[str,PlayerInfo]:
        return self.games[gameId]
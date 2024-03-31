import random

from .types.types import PlayerInfo
from .bracket import get_teams

class GameTracker():
    def __init__(self, year: int, month: str, day: tuple[str, str]):
        self.games: dict[str, dict[str, PlayerInfo]] = {}
        self.teams = get_teams(year, month, day)

    def add_game(self, gameId: str) -> None:
        self.games[gameId] = {}
    
    def add_player(self, id: str, gameId: str) -> None:
        self.games[gameId][id] = PlayerInfo(gameId=gameId)

    def update_player(self, gameId:str, id: str, bidAmount: int, purchasedTeam: str) -> None:
        self.games[gameId][id].balance -= bidAmount
        self.games[gameId][id].teams.append(purchasedTeam)
    
    def get_player_info(self, gameId: str, id: str) -> PlayerInfo:
        return self.games[gameId][id]

    def get_all_players(self, gameId: str) -> dict[str,PlayerInfo]:
        return self.games[gameId]
    
    def get_random_team(self) -> list[str]:
        team: list[str] = random.choice(self.teams)
        self.teams.remove(team)
        return team
    
    def get_remaining_teams(self) -> list[list[str]]:
        return self.teams
import random

from .bracket import get_teams
from .types.types import PlayerInfo


class GameTracker:
    def __init__(self, year: int, month: str, day: tuple[str, str]):
        self.games: dict[str, dict[str, PlayerInfo]] = {}
        self.teams = get_teams(year, month, day)
        self.teams.sort(key=lambda x: int(x[1]))

    def add_game(self, gameId: str) -> None:
        self.games[gameId] = {}

    def add_player(self, gameId: str, player: str) -> None:
        self.games[gameId][player] = PlayerInfo(gameId=gameId)

    def update_player(self, gameId: str, player: str, bidAmount: int, purchasedTeam: str) -> None:
        self.games[gameId][player].balance -= bidAmount
        self.games[gameId][player].teams.append(purchasedTeam)

    def get_player_info(self, gameId: str, player: str) -> PlayerInfo:
        return self.games[gameId][player]

    def get_all_players(self, gameId: str) -> dict[str, PlayerInfo]:
        return self.games[gameId]

    def get_random_team(self) -> list[str]:
        team: list[str] = random.choice(self.teams)
        self.teams.remove(team)
        return team

    def get_remaining_teams(self) -> list[list[str]]:
        return self.teams

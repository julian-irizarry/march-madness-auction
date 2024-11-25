import random

from app.bracket import get_matches, get_teams
from app.types.types import (
    INITIAL_BID,
    INITIAL_COUNTDOWN,
    BidModel,
    GameInfo,
    PlayerInfo,
    TeamInfo,
)


class GameTracker:
    def __init__(self, year: int, month: str, day: tuple[str, str]):
        self.games: dict[str, GameInfo] = {}
        self.teams_master = get_teams(year, month, day)
        self.teams_master.sort(key=lambda x: int(x.seed))
        self.match_results = get_matches(year, month, day)

    def add_game(self, gameId: str, creator: str) -> None:
        creator_info = PlayerInfo(name=creator, gameId=gameId)
        self.games[gameId] = GameInfo(
            creator=creator,
            players={creator: creator_info},
            teams=self.teams_master.copy(),
        )
        self.games[gameId].currentTeam = self.get_random_team(gameId)

    def add_player(self, gameId: str, player: str) -> None:
        self.games[gameId].players[player] = PlayerInfo(name=player, gameId=gameId)

    def update_player(self, gameId: str, player: str, bidAmount: int, purchasedTeam: str) -> None:
        self.games[gameId].players[player].balance -= bidAmount
        self.games[gameId].players[player].teams.append(purchasedTeam)

    def get_player_info(self, gameId: str, player: str) -> PlayerInfo:
        return self.games[gameId].players[player]

    def get_all_players(self, gameId: str) -> dict[str, PlayerInfo]:
        return self.games[gameId].players

    def get_random_team(self, gameId: str) -> TeamInfo:
        team: TeamInfo = random.choice(self.games[gameId].teams)
        self.games[gameId].teams.remove(team)
        return team

    def get_remaining_teams(self, gameId: str) -> list[TeamInfo]:
        return self.games[gameId].teams

    def get_all_teams(self) -> list[TeamInfo]:
        return self.teams_master

    def place_bid(self, bid_model: BidModel) -> None:
        self.games[bid_model.gameId].log.append(bid_model)
        self.games[bid_model.gameId].currentBid = bid_model.bid
        self.games[bid_model.gameId].countdown = INITIAL_COUNTDOWN  # reset countdown

    def finalize_bid(self, gameId: str) -> BidModel:
        winner: BidModel

        if len(self.games[gameId].log) > 0:
            winner = self.games[gameId].log[-1]
            self.update_player(gameId, winner.player, winner.bid, f"{winner.team} : ${winner.bid:.2f}")
        else:
            winner = BidModel(
                gameId="",
                player="",
                bid=-1,
                team=self.get_current_team(gameId).shortName,
            )

        # pick random new team to auction
        self.games[gameId].currentTeam = self.get_random_team(gameId)
        self.games[gameId].currentBid = INITIAL_BID  # reset bid
        self.games[gameId].countdown = INITIAL_COUNTDOWN  # reset countdown
        self.games[gameId].log = []  # reset log

        return winner

    def get_current_team(self, gameId: str) -> TeamInfo:
        current_team = self.games[gameId].currentTeam
        if current_team is not None:
            return current_team

        raise ValueError(f"game id {gameId} does not have a current team")

    def get_current_bid(self, gameId: str) -> float:
        return self.games[gameId].currentBid

    def get_current_countdown(self, gameId: str) -> float:
        return self.games[gameId].countdown

    def decrement_countdown(self, gameId: str) -> None:
        self.games[gameId].countdown -= 1

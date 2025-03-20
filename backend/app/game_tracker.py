import random

from app.types.types import (
    PlayerInfo,
    TeamInfo,
    GameInfo,
    BidModel,
    INITIAL_BID,
    INITIAL_COUNTDOWN,
)
from app.bracket import get_teams, get_matches


def missingPlayInPostProcess(teams: dict[str, TeamInfo]):
    teams["Xavier/Texas"] = TeamInfo(
        shortName="Xavier/Texas", urlName="", seed=11, region="Midwest"
    )
    return teams


class GameTracker:
    def __init__(self, year: int, month: str, day: tuple[str, str]):
        self.games: dict[str, GameInfo] = {}
        self.teams_master = get_teams(year, month, day)
        missingPlayInPostProcess(self.teams_master)
        teams_list = list(self.teams_master.items())
        teams_list.sort(key=lambda x: int(x[1].seed))
        self.teams_master = {key: value for key, value in teams_list}
        self.match_results = []

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

    def update_player(
        self, gameId: str, player: str, bidAmount: int, purchasedTeam: str
    ) -> None:
        self.games[gameId].players[player].balance -= bidAmount
        team = self.games[gameId].currentTeam.model_copy()
        if team.shortName != purchasedTeam:
            for temp_team in self.games[gameId].teams.values():
                if temp_team.shortName == purchasedTeam:
                    team = temp_team.model_copy()
                    break
        team.purchasePrice = bidAmount
        self.games[gameId].players[player].teams[team.shortName] = team

    def get_player_info(self, gameId: str, player: str) -> PlayerInfo:
        return self.games[gameId].players[player]

    def get_all_players(self, gameId: str) -> dict[str, PlayerInfo]:
        return self.games[gameId].players

    def get_random_team(self, gameId: str) -> TeamInfo:
        team: TeamInfo = random.choice(list(self.games[gameId].teams.values()))

        # bundle seeds 15 and 16
        bundle: list[TeamInfo] = []
        if team.seed == 15 or team.seed == 16:
            team = TeamInfo(
                shortName=f"{team.seed} seed bundle",
                urlName=f"{team.seed} seed bundle",
                seed=team.seed,
                region="bundle",
            )
            for temp_team in self.games[gameId].teams.values():
                if temp_team.seed == team.seed:
                    bundle.append(temp_team)

        if bundle:
            for temp_team in bundle:
                del self.games[gameId].teams[temp_team.shortName]
        else:
            del self.games[gameId].teams[team.shortName]

        return team

    def get_remaining_teams(self, gameId: str) -> list[TeamInfo]:
        return list(self.games[gameId].teams.values())

    def get_all_teams(self) -> list[TeamInfo]:
        return list(self.teams_master.values())

    def place_bid(self, bid_model: BidModel) -> None:
        self.games[bid_model.gameId].log.append(bid_model)
        self.games[bid_model.gameId].currentBid = bid_model.bid
        self.games[bid_model.gameId].countdown = INITIAL_COUNTDOWN  # reset countdown

    def finalize_bid(self, gameId: str) -> BidModel:
        winner: BidModel

        if len(self.games[gameId].log) > 0:
            winner = self.games[gameId].log[-1]
            self.update_player(gameId, winner.player, winner.bid, winner.team)
        else:
            winner = BidModel(
                gameId="",
                player="",
                bid=-1,
                team=self.games[gameId].currentTeam.shortName,
            )

        # pick random new team to auction
        self.games[gameId].currentTeam = self.get_random_team(gameId)
        self.games[gameId].currentBid = INITIAL_BID  # reset bid
        self.games[gameId].countdown = INITIAL_COUNTDOWN  # reset countdown
        self.games[gameId].log = []  # reset log

        return winner

    def get_current_team(self, gameId: str) -> TeamInfo:
        return self.games[gameId].currentTeam

    def get_current_bid(self, gameId: str) -> float:
        return self.games[gameId].currentBid

    def get_current_countdown(self, gameId: str) -> float:
        return self.games[gameId].countdown

    def decrement_countdown(self, gameId: str) -> None:
        self.games[gameId].countdown -= 1

    def calculate_player_points(self, gameId: str) -> None:
        """
        Using very naive point system here. +1 for each team wins.
        """

        # { player_name : { team_name: points, team_name:points... } }
        score_map = {
            player.name: {team: 0 for team in player.teams.keys()}
            for player in self.games[gameId].players.values()
        }

        for match in self.match_results:
            winner = (
                match.participants[0]
                if match.winner == match.participants[0].shortName
                else match.participants[1]
            )
            for player in score_map.keys():
                if winner.shortName in score_map[player].keys():
                    score_map[player][winner.shortName] += 1

        for player, teams in score_map.items():
            final_score = 0
            for team_name, score in teams.items():
                final_score += score
                self.games[gameId].players[player].teams[team_name].points = score

            self.games[gameId].players[player].points = final_score

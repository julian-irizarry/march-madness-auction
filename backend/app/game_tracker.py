import random
import time
from typing import List, Optional
from sqlalchemy.orm import Session

from app.types.types import PlayerInfo, TeamInfo, BidModel, INITIAL_BID, INITIAL_COUNTDOWN
from app.bracket import get_teams, get_matches
from app.models.database import Game, Player, Team, GameTeam, PlayerTeam, BidLog, init_db

class GameTracker:
    def __init__(self, year: int, month: str, day: tuple[str, str]):
        self.db = init_db()()  # Create a session
        self.teams_master = get_teams(year, month, day)
        self.match_results = get_matches(year, month, day)
        
        # Initialize teams in database if not exists
        self._init_teams()

    def _init_teams(self) -> None:
        """Initialize teams in the database if they don't exist"""
        for team_info in self.teams_master:
            existing = self.db.query(Team).filter_by(name=team_info.urlName).first()
            if not existing:
                team = Team(
                    name=team_info.urlName,
                    short_name=team_info.shortName,
                    seed=int(team_info.seed),
                    region=team_info.region,
                    eliminated=False
                )
                self.db.add(team)
        self.db.commit()

    def add_game(self, gameId: str, creator: str) -> None:
        """Create a new game in the database"""
        game = Game(id=gameId, creator=creator, current_bid=INITIAL_BID, countdown=INITIAL_COUNTDOWN)
        self.db.add(game)
        
        # Add creator as first player
        player = Player(game_id=gameId, name=creator)
        self.db.add(player)
        
        # Add all teams as available for this game
        teams = self.db.query(Team).all()
        for team in teams:
            game_team = GameTeam(game_id=gameId, team_id=team.id)
            self.db.add(game_team)
            
        self.db.commit()
        
        # Set initial random team
        self.get_random_team(gameId)

    def add_player(self, gameId: str, player: str) -> None:
        """Add a new player to an existing game"""
        new_player = Player(game_id=gameId, name=player)
        self.db.add(new_player)
        self.db.commit()

    def update_player(self, gameId: str, player: str, bidAmount: float, purchasedTeam: str) -> None:
        """Update player's balance and add purchased team"""
        player_record = self.db.query(Player).filter_by(game_id=gameId, name=player).first()
        team = self.db.query(Team).filter_by(short_name=purchasedTeam.split(" : ")[0]).first()
        
        if player_record and team:
            player_record.balance -= bidAmount
            player_team = PlayerTeam(
                player_id=player_record.id,
                team_id=team.id,
                purchase_price=bidAmount
            )
            self.db.add(player_team)
            self.db.commit()

    def get_player_info(self, gameId: str, player: str) -> PlayerInfo:
        """Get player information including their purchased teams"""
        player_record = self.db.query(Player).filter_by(game_id=gameId, name=player).first()
        if not player_record:
            return None
        
        purchased_teams = [
            f"{pt.team.short_name} : ${pt.purchase_price:.2f}"
            for pt in player_record.purchased_teams
        ]
        
        return PlayerInfo(
            name=player_record.name,
            gameId=gameId,
            balance=player_record.balance,
            teams=purchased_teams
        )

    def get_all_players(self, gameId: str) -> dict[str, PlayerInfo]:
        """Get all players in a game"""
        players = self.db.query(Player).filter_by(game_id=gameId).all()
        return {
            p.name: self.get_player_info(gameId, p.name)
            for p in players
        }

    def get_random_team(self, gameId: str) -> TeamInfo:
        """Get a random team from remaining teams and remove it from available teams"""
        game = self.db.query(Game).filter_by(id=gameId).first()
        remaining_teams = self.db.query(GameTeam).filter_by(game_id=gameId).all()
        
        if not remaining_teams:
            return None
            
        random_game_team = random.choice(remaining_teams)
        team = random_game_team.team
        
        # Remove team from available teams
        self.db.delete(random_game_team)
        
        # Update current team
        game.current_team_id = team.id
        self.db.commit()
        
        return TeamInfo(
            urlName=team.name,
            shortName=team.short_name,
            seed=str(team.seed),
            region=team.region
        )

    def get_remaining_teams(self, gameId: str) -> list[TeamInfo]:
        """Get list of remaining teams in the game"""
        remaining = self.db.query(GameTeam).filter_by(game_id=gameId).all()
        return [
            TeamInfo(
                urlName=gt.team.name,
                shortName=gt.team.short_name,
                seed=str(gt.team.seed),
                region=gt.team.region
            )
            for gt in remaining
        ]
    
    def get_all_teams(self) -> list[TeamInfo]:
        """Get master list of all teams"""
        return self.teams_master

    def place_bid(self, bid_model: BidModel) -> None:
        """Place a new bid in the game"""
        game = self.db.query(Game).filter_by(id=bid_model.gameId).first()
        player = self.db.query(Player).filter_by(game_id=bid_model.gameId, name=bid_model.player).first()
        team = self.db.query(Team).filter_by(short_name=bid_model.team).first()
        
        if game and player and team:
            bid_log = BidLog(
                game_id=game.id,
                player_id=player.id,
                team_id=team.id,
                bid_amount=bid_model.bid,
                timestamp=time.time()
            )
            self.db.add(bid_log)
            game.current_bid = bid_model.bid
            game.countdown = INITIAL_COUNTDOWN
            self.db.commit()

    def finalize_bid(self, gameId: str) -> BidModel:
        """Finalize the current auction and prepare the next one"""
        game = self.db.query(Game).filter_by(id=gameId).first()
        last_bid = self.db.query(BidLog).filter_by(game_id=gameId).order_by(BidLog.timestamp.desc()).first()
        
        winner = None
        if last_bid:
            winner = BidModel(
                gameId=gameId,
                player=last_bid.player.name,
                bid=last_bid.bid_amount,
                team=last_bid.team.short_name
            )
            self.update_player(gameId, last_bid.player.name, last_bid.bid_amount, f"{last_bid.team.short_name} : ${last_bid.bid_amount:.2f}")
        else:
            current_team = game.current_team
            winner = BidModel(
                gameId="",
                player="",
                bid=-1,
                team=current_team.short_name if current_team else ""
            )

        # Clear bid log
        self.db.query(BidLog).filter_by(game_id=gameId).delete()
        
        # Get new random team
        self.get_random_team(gameId)
        
        # Reset auction state
        game.current_bid = INITIAL_BID
        game.countdown = INITIAL_COUNTDOWN
        self.db.commit()
        
        return winner

    def get_current_team(self, gameId: str) -> Optional[TeamInfo]:
        """Get the current team being auctioned"""
        game = self.db.query(Game).filter_by(id=gameId).first()
        if not game or not game.current_team:
            return None
            
        team = game.current_team
        return TeamInfo(
            urlName=team.name,
            shortName=team.short_name,
            seed=str(team.seed),
            region=team.region
        )

    def get_current_bid(self, gameId: str) -> float:
        """Get the current bid amount"""
        game = self.db.query(Game).filter_by(id=gameId).first()
        return game.current_bid if game else INITIAL_BID
    
    def get_current_countdown(self, gameId: str) -> int:
        """Get the current countdown value"""
        game = self.db.query(Game).filter_by(id=gameId).first()
        return game.countdown if game else INITIAL_COUNTDOWN

    def decrement_countdown(self, gameId: str) -> None:
        """Decrement the countdown timer"""
        game = self.db.query(Game).filter_by(id=gameId).first()
        if game:
            game.countdown -= 1
            self.db.commit()
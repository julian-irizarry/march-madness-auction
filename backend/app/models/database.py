from sqlalchemy import create_engine, Column, Integer, String, Float, ForeignKey, JSON, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, sessionmaker

Base = declarative_base()

class Game(Base):
    __tablename__ = 'games'
    
    id = Column(String, primary_key=True)
    creator = Column(String, nullable=False)
    current_team_id = Column(Integer, ForeignKey('teams.id'), nullable=True)
    current_bid = Column(Float, default=0.0)
    countdown = Column(Integer, default=30)
    
    # Relationships
    players = relationship("Player", back_populates="game", cascade="all, delete-orphan")
    current_team = relationship("Team", foreign_keys=[current_team_id])
    remaining_teams = relationship("GameTeam", back_populates="game")
    bid_log = relationship("BidLog", back_populates="game", cascade="all, delete-orphan")

class Player(Base):
    __tablename__ = 'players'
    
    id = Column(Integer, primary_key=True)
    game_id = Column(String, ForeignKey('games.id'), nullable=False)
    name = Column(String, nullable=False)
    balance = Column(Float, default=200.0)  # Default starting balance
    
    # Relationships
    game = relationship("Game", back_populates="players")
    purchased_teams = relationship("PlayerTeam", back_populates="player")

class Team(Base):
    __tablename__ = 'teams'
    
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    short_name = Column(String, nullable=False)
    seed = Column(Integer, nullable=False)
    region = Column(String, nullable=False)
    eliminated = Column(Boolean, default=False)

class GameTeam(Base):
    __tablename__ = 'game_teams'
    
    id = Column(Integer, primary_key=True)
    game_id = Column(String, ForeignKey('games.id'), nullable=False)
    team_id = Column(Integer, ForeignKey('teams.id'), nullable=False)
    
    # Relationships
    game = relationship("Game", back_populates="remaining_teams")
    team = relationship("Team")

class PlayerTeam(Base):
    __tablename__ = 'player_teams'
    
    id = Column(Integer, primary_key=True)
    player_id = Column(Integer, ForeignKey('players.id'), nullable=False)
    team_id = Column(Integer, ForeignKey('teams.id'), nullable=False)
    purchase_price = Column(Float, nullable=False)
    
    # Relationships
    player = relationship("Player", back_populates="purchased_teams")
    team = relationship("Team")

class BidLog(Base):
    __tablename__ = 'bid_logs'
    
    id = Column(Integer, primary_key=True)
    game_id = Column(String, ForeignKey('games.id'), nullable=False)
    player_id = Column(Integer, ForeignKey('players.id'), nullable=False)
    team_id = Column(Integer, ForeignKey('teams.id'), nullable=False)
    bid_amount = Column(Float, nullable=False)
    timestamp = Column(Float, nullable=False)
    
    # Relationships
    game = relationship("Game", back_populates="bid_log")
    player = relationship("Player")
    team = relationship("Team")

# Database connection setup
def init_db(database_url="sqlite:///march_madness.db"):
    engine = create_engine(database_url)
    Base.metadata.create_all(engine)
    SessionLocal = sessionmaker(bind=engine)
    return SessionLocal 
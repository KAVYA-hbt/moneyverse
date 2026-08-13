from datetime import datetime, date

from sqlalchemy import (
    Column, Integer, String, DateTime, Date, ForeignKey, UniqueConstraint
)
from sqlalchemy.orm import relationship

from app.db import Base


class Player(Base):
    """One row per unique player, keyed by their email (matches the
    frontend's existing user_profile.email identifier)."""
    __tablename__ = "players"

    id = Column(Integer, primary_key=True)
    email = Column(String, unique=True, nullable=False, index=True)
    name = Column(String, nullable=False, default="Player")
    scenario = Column(String, nullable=False, default="student")
    state = Column(String, nullable=True)
    district = Column(String, nullable=True)
    avatar_name = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    stats = relationship("PlayerStats", back_populates="player", uselist=False, cascade="all, delete-orphan")
    quest_completions = relationship("QuestCompletion", back_populates="player", cascade="all, delete-orphan")
    treasure_collections = relationship("TreasureCollection", back_populates="player", cascade="all, delete-orphan")


class PlayerStats(Base):
    """Everything that used to live only in localStorage: coins, streak,
    freezers, hint scrolls. One row per player."""
    __tablename__ = "player_stats"

    id = Column(Integer, primary_key=True)
    player_id = Column(Integer, ForeignKey("players.id"), unique=True, nullable=False)

    coins = Column(Integer, nullable=False, default=0)
    streak_count = Column(Integer, nullable=False, default=0)
    streak_freezers = Column(Integer, nullable=False, default=0)
    hint_scrolls = Column(Integer, nullable=False, default=1)
    last_played = Column(Date, nullable=True)

    player = relationship("Player", back_populates="stats")


class QuestCompletion(Base):
    """One row per (player, quest_id) — mirrors the old
    `sbi_questcraft_completed_<user>` localStorage set."""
    __tablename__ = "quest_completions"
    __table_args__ = (UniqueConstraint("player_id", "quest_id", name="uq_player_quest"),)

    id = Column(Integer, primary_key=True)
    player_id = Column(Integer, ForeignKey("players.id"), nullable=False)
    quest_id = Column(String, nullable=False)
    reward_coins = Column(Integer, nullable=False, default=0)
    completed_at = Column(DateTime, default=datetime.utcnow)

    player = relationship("Player", back_populates="quest_completions")


class TreasureCollection(Base):
    """One row per (player, treasure_id) — mirrors the old
    `sbi_questcraft_treasures_<user>` localStorage set."""
    __tablename__ = "treasure_collections"
    __table_args__ = (UniqueConstraint("player_id", "treasure_id", name="uq_player_treasure"),)

    id = Column(Integer, primary_key=True)
    player_id = Column(Integer, ForeignKey("players.id"), nullable=False)
    treasure_id = Column(String, nullable=False)
    reward_type = Column(String, nullable=False)  # "hint_scroll" | "streak_freezer"
    collected_at = Column(DateTime, default=datetime.utcnow)

    player = relationship("Player", back_populates="treasure_collections")


class ScenarioSelectionLog(Base):
    """Every time a player picks or changes their scenario (student vs
    employee), not just the current value."""
    __tablename__ = "scenario_selection_log"

    id = Column(Integer, primary_key=True)
    player_id = Column(Integer, ForeignKey("players.id"), nullable=False)
    scenario = Column(String, nullable=False)
    selected_at = Column(DateTime, default=datetime.utcnow)

    player = relationship("Player")


class CoinTransaction(Base):
    """Ledger of every coin change — quest rewards, treasure bonuses, coin
    pickups — so totals are auditable, not just a running number."""
    __tablename__ = "coin_transactions"

    id = Column(Integer, primary_key=True)
    player_id = Column(Integer, ForeignKey("players.id"), nullable=False)
    amount = Column(Integer, nullable=False)
    reason = Column(String, nullable=False)            # "quest_complete" | "treasure" | "coin_pickup"
    reference_id = Column(String, nullable=True)       # quest_id / treasure_id / coin_id, if applicable
    balance_after = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    player = relationship("Player")


class QuizAttempt(Base):
    """Every quiz question shown to the player and what they answered —
    the actual raw input/output history, not just pass/fail."""
    __tablename__ = "quiz_attempts"

    id = Column(Integer, primary_key=True)
    player_id = Column(Integer, ForeignKey("players.id"), nullable=False)
    request_type = Column(String, nullable=False)       # "MAIN_QUEST" | "ROAD_TREASURE" | "HINT_SCROLL"
    quest_or_treasure_id = Column(String, nullable=True)
    topic = Column(String, nullable=True)
    question_text = Column(String, nullable=True)
    options_json = Column(String, nullable=True)        # JSON-encoded list of option strings
    correct_index = Column(Integer, nullable=True)
    selected_index = Column(Integer, nullable=True)
    is_correct = Column(Integer, nullable=True)          # 1/0/NULL (NULL = not yet answered, e.g. hint request)
    difficulty = Column(String, nullable=True)
    attempt_number = Column(Integer, nullable=False, default=1)
    decision_latency_ms = Column(Integer, nullable=True)  # time from question-shown to selection
    suspicious_latency = Column(Integer, nullable=True)   # 1/0 — flagged, not filtered; see audit notes
    created_at = Column(DateTime, default=datetime.utcnow)

    player = relationship("Player")

class SavingsHabitSelfReport(Base):
    """A player's own short self-report on whether/how they save money,
    captured by the robot companion right after an NPC advisory chat —
    NOT part of a product pitch (see companionDialogue.js's
    savings_habit_checkin beat and its docstring). Feeds the psychometric
    signal layer alongside quiz_attempts; kept as its own table rather
    than overloading QuizAttempt, since this isn't a graded question —
    there's no correct_index/is_correct concept here at all."""
    __tablename__ = "savings_habit_selfreports"

    id = Column(Integer, primary_key=True)
    player_id = Column(Integer, ForeignKey("players.id"), nullable=False)
    source_npc_id = Column(String, nullable=True)   # which advisory NPC preceded this check-in
    saves_money = Column(Integer, nullable=True)     # 1/0 — the Yes/No answer
    savings_method = Column(String, nullable=True)   # 'bank' | 'home' | NULL (only asked if saves_money=1)
    created_at = Column(DateTime, default=datetime.utcnow)

    player = relationship("Player")
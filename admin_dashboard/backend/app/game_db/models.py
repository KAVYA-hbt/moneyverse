"""Read-only mirror of the subset of the game backend's own SQLAlchemy models
(moneyverse/backend/app/models.py) needed to compute player profiles directly from its
Postgres DB, instead of going through the game's /api/admin/export-profiles HTTP endpoint.

Deliberately a separate DeclarativeBase from this app's own app.models.models.Base -- these
map onto the GAME's database (a different physical Postgres instance/schema than this app's
own DB) and are never migrated or written to from here, only SELECTed. Classic
Column()-without-Mapped[] style to match the real source file's own style exactly.

Column set is trimmed to what app/game_db/profile_builder.py actually reads; kept in sync by
hand against the real schema in moneyverse/backend/app/models.py.
"""

from sqlalchemy import Column, Date, DateTime, Integer, String
from sqlalchemy.orm import DeclarativeBase


class GameBase(DeclarativeBase):
    pass


class GamePlayer(GameBase):
    __tablename__ = "players"

    id = Column(Integer, primary_key=True)
    email = Column(String)
    name = Column(String)
    scenario = Column(String)


class GamePlayerStats(GameBase):
    __tablename__ = "player_stats"

    id = Column(Integer, primary_key=True)
    player_id = Column(Integer)
    last_played = Column(Date)


class GameQuestCompletion(GameBase):
    __tablename__ = "quest_completions"

    id = Column(Integer, primary_key=True)
    player_id = Column(Integer)
    quest_id = Column(String)
    quest_type = Column(String)
    completed_at = Column(DateTime)


class GameQuizAttempt(GameBase):
    __tablename__ = "quiz_attempts"

    id = Column(Integer, primary_key=True)
    player_id = Column(Integer)
    quest_or_treasure_id = Column(String)
    topic_category = Column(String)
    correct_index = Column(Integer)
    selected_index = Column(Integer)
    is_correct = Column(Integer)
    decision_latency_ms = Column(Integer)


class GameAdvisoryChoice(GameBase):
    __tablename__ = "advisory_choices"

    id = Column(Integer, primary_key=True)
    player_id = Column(Integer)
    npc_id = Column(String)
    choice_value = Column(String)
    reversed_count = Column(Integer)
    robot_hint_used = Column(Integer)
    decision_time_ms = Column(Integer)

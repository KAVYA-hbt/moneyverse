from datetime import date
from typing import Optional, List

from pydantic import BaseModel


class PlayerSyncRequest(BaseModel):
    email: str
    name: str = "Player"
    scenario: str = "student"
    state: Optional[str] = None
    district: Optional[str] = None
    avatar_name: Optional[str] = None


class PlayerStateResponse(BaseModel):
    email: str
    name: str
    scenario: str
    state: Optional[str] = None
    district: Optional[str] = None
    avatar_name: Optional[str] = None
    coins: int
    streak_count: int
    streak_freezers: int
    hint_scrolls: int
    last_played: Optional[date] = None
    completed_quest_ids: List[str] = []
    collected_treasure_ids: List[str] = []

    class Config:
        from_attributes = True


class CompleteQuestRequest(BaseModel):
    quest_id: str
    reward_coins: int = 20


class CollectTreasureRequest(BaseModel):
    treasure_id: str
    reward_type: str  # "hint_scroll" | "streak_freezer"
    bonus_coins: int = 5


class LeaderboardEntry(BaseModel):
    name: str
    email: str
    coins: int

    class Config:
        from_attributes = True


class ScenarioSelectRequest(BaseModel):
    scenario: str


class QuizAttemptLogRequest(BaseModel):
    request_type: str
    quest_or_treasure_id: Optional[str] = None
    topic: Optional[str] = None
    question_text: Optional[str] = None
    options: List[str] = []
    correct_index: Optional[int] = None
    selected_index: Optional[int] = None
    is_correct: Optional[bool] = None
    difficulty: Optional[str] = None
    attempt_number: int = 1
    decision_latency_ms: Optional[int] = None
    suspicious_latency: Optional[bool] = None


class TelemetryEvent(BaseModel):
    email: str
    type: str
    payload: dict
    client_ts: int  # ms since epoch, from the client — for clock-skew analysis, never trusted as ordering truth


class TelemetryBatchRequest(BaseModel):
    events: List[TelemetryEvent]


class CoinTransactionResponse(BaseModel):
    amount: int
    reason: str
    reference_id: Optional[str] = None
    balance_after: int
    created_at: date

    class Config:
        from_attributes = True
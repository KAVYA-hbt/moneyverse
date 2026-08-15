from datetime import datetime, date

from sqlalchemy import (
    Column, Integer, String, DateTime, Date, ForeignKey, UniqueConstraint
)
from sqlalchemy.orm import relationship

from app.db import Base


# Maps every quest id in the 26-id catalog (frontend's questCatalog.js
# QUEST_META, mirrored here since the backend has no JS import path to it)
# to one of the six literacy categories used by the financial_literacy
# scoring schema (budgeting/savings/credit_debt/investment/insurance/tax).
#
# Worth knowing: roughly 40% of quests (identity docs, digital-safety
# topics like OTP/phishing/ATM safety, general banking mechanics like
# passbooks/net banking setup) don't cleanly fit any of those six —
# they're mapped to 'general' rather than forced into a category they'd
# misrepresent. A financial_literacy sub-score built off this mapping
# will only ever reflect the ~60% of quests that DO fall into one of the
# six; the 'general' bucket has no corresponding sub-score by design.
QUEST_CATEGORY_MAP = {
    # Level 1
    "aadhaar": "general",
    "pan": "general",
    "bank": "savings",
    "store": "budgeting",
    "hospital": "insurance",
    "salary_slip": "general",
    # Level 2
    "atm_pin": "general",
    "upi_payment": "general",
    "passbook": "savings",
    "cheque_book": "general",
    "net_banking": "general",
    # Level 3
    "fixed_deposit": "savings",
    "recurring_deposit": "savings",
    "credit_score": "credit_debt",
    "loan_basics": "credit_debt",
    "insurance": "insurance",
    # Level 4
    "otp_safety": "general",
    "phishing_awareness": "general",
    "upi_fraud": "general",
    "mobile_banking": "general",
    "atm_safety": "general",
    # Level 5
    "tax_filing": "tax",
    "mutual_funds": "investment",
    "retirement_planning": "investment",
    "credit_card_usage": "credit_debt",
    "budgeting": "budgeting",
}


def quest_category_for(quest_id):
    """Best-effort category lookup -- returns None (not 'general') for an
    id this map doesn't recognize at all, so an unmapped/unexpected id is
    distinguishable from a deliberately-categorized 'general' one."""
    if not quest_id:
        return None
    return QUEST_CATEGORY_MAP.get(quest_id)


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
    # Derived server-side from QUEST_CATEGORY_MAP at write time (see
    # complete_quest in main.py) rather than trusted from the client --
    # one of budgeting/savings/credit_debt/investment/insurance/tax/
    # general, or NULL for a quest_id this map doesn't recognize at all.
    quest_type = Column(String, nullable=True)
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
    # Derived server-side from quest_or_treasure_id via the same
    # QUEST_CATEGORY_MAP as QuestCompletion.quest_type -- `topic` above
    # stays as the free-text LLM-generated label (e.g. "PAN Card"),
    # this is the constrained six-category-or-general version needed for
    # any per-category literacy score. NULL when quest_or_treasure_id
    # isn't a recognized quest id (e.g. some ROAD_TREASURE/HINT_SCROLL
    # attempts).
    topic_category = Column(String, nullable=True)
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


class OnboardCtaClick(Base):
    """One row per tap of the post-level-up "Continue to Onboarding"
    button (GamePage.jsx's handleOnboardClick) -- was already being sent
    to /api/telemetry/batch as an 'onboard_cta_click' event, but had no
    matching branch in log_telemetry_batch, so every one of these was
    silently accepted and dropped. This is real product-funnel signal
    (who actually said yes to the savings-account pitch and followed
    through to the click), not just a UI event."""
    __tablename__ = "onboard_cta_clicks"

    id = Column(Integer, primary_key=True)
    player_id = Column(Integer, ForeignKey("players.id"), nullable=False)
    level = Column(Integer, nullable=True)
    clicked_at = Column(DateTime, default=datetime.utcnow)

    player = relationship("Player")


class BadgePublished(Base):
    """One row per badge the player actually shared/downloaded (BadgeModal's
    onPublished -> handleBadgePublished) -- same story as OnboardCtaClick,
    already emitted as a 'badge_published' telemetry event but previously
    dropped for lack of a matching branch."""
    __tablename__ = "badge_published"

    id = Column(Integer, primary_key=True)
    player_id = Column(Integer, ForeignKey("players.id"), nullable=False)
    badge_id = Column(String, nullable=True)
    name_on_badge = Column(String, nullable=True)
    level = Column(Integer, nullable=True)
    published_at = Column(DateTime, default=datetime.utcnow)

    player = relationship("Player")


class AdvisoryChoice(Base):
    """One row per finished NPC advisory conversation (Arjun/Riya/Meera/
    Vikram/Aahan's spend-vs-save dilemmas) -- the actual simulated
    financial DECISION the player made, plus the behavioral-timing signal
    around it. This is the real source for money_management_style and
    decision_style in the financial/psychometric profiles; previously
    this whole conversation only lived in React state (useAdvisoryConversation.js)
    and was discarded the moment the modal closed."""
    __tablename__ = "advisory_choices"

    id = Column(Integer, primary_key=True)
    player_id = Column(Integer, ForeignKey("players.id"), nullable=False)
    npc_id = Column(String, nullable=False)          # 'arjun' | 'riya' | 'meera' | 'vikram' | 'aahan'
    choice_value = Column(String, nullable=False)      # the actual option picked, e.g. 'spend' | 'compromise' | 'save'
    reversed_count = Column(Integer, nullable=False, default=0)  # times they hit "No, let me think again"
    robot_hint_used = Column(Integer, nullable=False, default=0)  # 1/0 -- asked the companion for help mid-decision
    decision_time_ms = Column(Integer, nullable=True)   # conversation start -> first option picked
    total_conversation_ms = Column(Integer, nullable=True)  # conversation start -> goodbye
    level = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    player = relationship("Player")


class PageTaskTiming(Base):
    """One row per timed unit of engagement -- a mini-game session, an
    advisory conversation, a notice-board open, a full game session, etc.
    Generic on purpose (task_type + task_id) rather than one table per
    screen, since this list of trackable surfaces will keep growing."""
    __tablename__ = "page_task_timing"

    id = Column(Integer, primary_key=True)
    player_id = Column(Integer, ForeignKey("players.id"), nullable=False)
    task_type = Column(String, nullable=False)   # 'minigame' | 'advisory_conversation' | 'notice_board' | 'session' | 'quiz'
    task_id = Column(String, nullable=True)       # e.g. 'memory_match', 'arjun', null for session-level
    duration_ms = Column(Integer, nullable=False)
    level = Column(Integer, nullable=True)
    started_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    player = relationship("Player")


class LoginEvent(Base):
    """One row per game-load / player-sync call. IP + user agent are
    captured here for INTERNAL/TEST use only right now -- this is not yet
    covered by the player-facing consent doc (questcraft_data_usage_agreement.pdf),
    so this data must not be exposed outside internal tooling or shipped
    to any external system until that's updated. See main.py's sync_player
    docstring for the same note at the capture site."""
    __tablename__ = "login_events"

    id = Column(Integer, primary_key=True)
    player_id = Column(Integer, ForeignKey("players.id"), nullable=False)
    ip_address = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    player = relationship("Player")
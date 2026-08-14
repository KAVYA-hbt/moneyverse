import os
import json
from datetime import date
from dotenv import load_dotenv
from fastapi import FastAPI, Query, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from openai import OpenAI

# Import your city builder module
from app.city_builder.generate_layout import generate_full_layout
from app.db import Base, engine, get_db
from app import models, schemas

load_dotenv()

# Switched from Groq's cloud API to a local Ollama server, which exposes an
# OpenAI-compatible endpoint — this is why the client below is OpenAI's
# SDK, not a separate Ollama-specific one. No API key is needed since
# Ollama runs locally; the SDK just requires SOME non-empty string.
#
# Requires, on the machine running this backend:
#   1. Ollama installed and running (`ollama serve`, or the desktop app)
#   2. The target model pulled: `ollama pull llama3.1` (or whichever
#      OLLAMA_MODEL you set below)
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434/v1")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.1")
llm_client = OpenAI(
    base_url=OLLAMA_BASE_URL,
    api_key="ollama",
    # Required when OLLAMA_BASE_URL points through an ngrok free-tier
    # tunnel — without this header, ngrok returns an HTML interstitial
    # warning page instead of proxying the request through, which would
    # break json.loads() below on every call. Harmless no-op against a
    # plain localhost Ollama server.
    default_headers={"ngrok-skip-browser-warning": "true"},
)

app = FastAPI(title="SBI QuestCraft API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    # Creates tables if they don't exist yet. Fine for local dev; for real
    # migrations on an existing DB, use the alembic setup already in
    # requirements.txt instead of relying on this.
    Base.metadata.create_all(bind=engine)


# ===============================================================================
# 1. WORLD GENERATION ENDPOINT
# ===============================================================================
@app.get("/api/world")
def get_user_world(
    email: str = Query(..., description="User email identifier"),
    scenario: str = Query("student", description="Active user scenario (student or employee)")
):
    """
    Generates a unique world layout and randomized quest chain 
    deterministically based on the user's email seed and scenario.
    """
    layout_data = generate_full_layout(user_identifier=email, scenario=scenario)
    return layout_data


# ===============================================================================
# 2. GROQ QUIZ GENERATION ENDPOINT
# ===============================================================================
SYSTEM_PROMPT = """
You are the AI Knowledge Engine for "SBI QuestCraft", a banking-literacy game.
You will receive a JSON object describing request_type, user_profile, quest_context,
and performance_state.

If quest_context.topic is present, write the quiz question about EXACTLY that topic —
do not substitute a different subject. If quest_context.topic is absent, infer the topic
from quest_context.quest_id (e.g. "pan" -> PAN card, "aadhaar" -> Aadhaar/identity documents).
Tailor tone to user_profile.scenario ('student' vs 'employee') where relevant, but always
stay on the given topic.

You MUST return ONLY raw JSON (no markdown, no code fences, no extra commentary) that matches
EXACTLY ONE of the following three shapes, chosen by request_type. Do not rename any key. Do not
nest fields inside another object. Do not turn "options" into a list of objects — it must be a
flat list of plain strings.

If request_type == "MAIN_QUEST" or request_type == "ROAD_TREASURE", return exactly this shape:
{
  "question": "<the quiz question as a single string>",
  "options": ["<option A>", "<option B>", "<option C>", "<option D>"],
  "correctIndex": <integer 0-3, the zero-based index into "options" of the correct answer>,
  "reward": <integer coin reward, 20 for MAIN_QUEST, 10 for ROAD_TREASURE>,
  "hint": "<one short sentence that hints at the answer without giving it away>",
  "concept_tag": "<a short 1-3 word topic label, e.g. 'PAN Card'>"
}
If performance_state.last_question_attempts == 3, make the question and options noticeably EASIER
than a normal question on the same topic, but keep the exact same JSON shape above.
If performance_state.current_difficulty == "medium" or "hard", make the question meaningfully
harder (less obvious distractors, more specific detail) than an "easy" question on the same topic.

If request_type == "HINT_SCROLL", return exactly this shape:
{
  "hint_text": "<a two-sentence plain-language explanation of the concept in quest_context.current_question_text, without revealing which option is correct>"
}

Example of a correct MAIN_QUEST response for topic "PAN card basics and why it is needed":
{"question": "Which document is mandatory for filing taxes and opening a bank account?", "options": ["Library Card", "PAN Card", "Bus Pass", "Ration Card"], "correctIndex": 1, "reward": 20, "hint": "It's issued by the Income Tax Department.", "concept_tag": "PAN Card"}

Return ONLY the JSON object. No other text.
"""

class UserProfile(BaseModel):
    email: str = "kavya@example.com"
    name: str = "Kavya"
    scenario: str = "student"

class QuestContext(BaseModel):
    quest_id: Optional[str] = "pan_kendra"
    topic: Optional[str] = None
    current_question_text: Optional[str] = ""

class PerformanceState(BaseModel):
    current_difficulty: Optional[str] = "easy"
    last_question_attempts: Optional[int] = 1

class AgentRequest(BaseModel):
    request_type: str
    user_profile: UserProfile
    quest_context: Optional[QuestContext] = Field(default_factory=QuestContext)
    performance_state: Optional[PerformanceState] = Field(default_factory=PerformanceState)

@app.post("/api/agent/quiz")
async def generate_quiz(payload: AgentRequest):
    try:
        user_prompt = json.dumps(payload.model_dump())
        chat_completion = llm_client.chat.completions.create(
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt}
            ],
            model=OLLAMA_MODEL,
            response_format={"type": "json_object"},
            temperature=0.6,
            max_tokens=1024
        )
        return json.loads(chat_completion.choices[0].message.content)
    except Exception as e:
        # Covers both "Ollama isn't running" and "model not pulled" —
        # GamePage.jsx already falls back to its own hardcoded quiz content
        # whenever this endpoint fails, so this stays a clean 500 rather
        # than a crash either way.
        raise HTTPException(status_code=500, detail=f"Ollama request failed: {e}")


# ===============================================================================
# 3. PLAYER PERSISTENCE (PostgreSQL) — replaces/backs the frontend's
#    localStorage-only state (coins, streak, freezers, hint scrolls, completed
#    quests, collected treasure, scenario, quiz attempt history, coin ledger).
# ===============================================================================

def _get_or_create_player(db: Session, req: schemas.PlayerSyncRequest) -> models.Player:
    player = db.query(models.Player).filter(models.Player.email == req.email).first()
    if not player:
        player = models.Player(
            email=req.email,
            name=req.name,
            scenario=req.scenario,
            state=req.state,
            district=req.district,
            avatar_name=req.avatar_name,
        )
        db.add(player)
        db.flush()  # get player.id before creating stats row
        db.add(models.PlayerStats(player_id=player.id, coins=0, streak_count=0, streak_freezers=0, hint_scrolls=1))
        db.commit()
        db.refresh(player)
    else:
        # Keep profile fields fresh in case the player updated them
        player.name = req.name
        player.scenario = req.scenario
        if req.state:
            player.state = req.state
        if req.district:
            player.district = req.district
        if req.avatar_name:
            player.avatar_name = req.avatar_name
        db.commit()
    return player


def _sync_daily_streak(db: Session, stats: models.PlayerStats) -> None:
    """Server-side mirror of frontend/src/utils/streakStorage.js's logic, so
    the streak is correct even if the game is played from a fresh device
    with no localStorage history."""
    today = date.today()

    if stats.last_played is None:
        stats.streak_count = 1
        stats.last_played = today
        db.commit()
        return

    gap = (today - stats.last_played).days

    if gap <= 0:
        return
    if gap == 1:
        stats.streak_count += 1
        stats.last_played = today
        db.commit()
        return

    # gap > 1: streak breaks unless a freezer covers it
    if stats.streak_freezers > 0:
        stats.streak_freezers -= 1
        stats.last_played = today
    else:
        stats.streak_count = 1
        stats.last_played = today
    db.commit()


def _player_state_response(player: models.Player) -> schemas.PlayerStateResponse:
    return schemas.PlayerStateResponse(
        email=player.email,
        name=player.name,
        scenario=player.scenario,
        state=player.state,
        district=player.district,
        avatar_name=player.avatar_name,
        coins=player.stats.coins,
        streak_count=player.stats.streak_count,
        streak_freezers=player.stats.streak_freezers,
        hint_scrolls=player.stats.hint_scrolls,
        last_played=player.stats.last_played,
        completed_quest_ids=[q.quest_id for q in player.quest_completions],
        collected_treasure_ids=[t.treasure_id for t in player.treasure_collections],
    )


@app.post("/api/player/sync", response_model=schemas.PlayerStateResponse)
def sync_player(payload: schemas.PlayerSyncRequest, db: Session = Depends(get_db)):
    """Call once when the game loads. Creates the player row on first ever
    visit, syncs the daily login streak, and returns their full saved state."""
    player = _get_or_create_player(db, payload)
    _sync_daily_streak(db, player.stats)
    db.refresh(player)
    return _player_state_response(player)


@app.get("/api/player/{email}/state", response_model=schemas.PlayerStateResponse)
def get_player_state(email: str, db: Session = Depends(get_db)):
    player = db.query(models.Player).filter(models.Player.email == email).first()
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    return _player_state_response(player)


@app.post("/api/player/{email}/complete-quest", response_model=schemas.PlayerStateResponse)
def complete_quest(email: str, payload: schemas.CompleteQuestRequest, db: Session = Depends(get_db)):
    player = db.query(models.Player).filter(models.Player.email == email).first()
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")

    already_done = db.query(models.QuestCompletion).filter(
        models.QuestCompletion.player_id == player.id,
        models.QuestCompletion.quest_id == payload.quest_id,
    ).first()

    if not already_done:
        db.add(models.QuestCompletion(
            player_id=player.id,
            quest_id=payload.quest_id,
            reward_coins=payload.reward_coins,
        ))
        player.stats.coins += payload.reward_coins
        db.add(models.CoinTransaction(
            player_id=player.id,
            amount=payload.reward_coins,
            reason="quest_complete",
            reference_id=payload.quest_id,
            balance_after=player.stats.coins,
        ))
        try:
            db.commit()
            db.refresh(player)
        except IntegrityError:
            # Two completion requests for the same quest landed close
            # enough together that both passed the already_done check
            # above before either committed -- the DB's own unique
            # constraint (uq_player_quest) is what actually caught the
            # duplicate. That's it working as intended, not a failure:
            # roll back this request's half-applied insert/coin-add and
            # just return the player's current (already-correct) state,
            # instead of crashing with a 500 on a request that's really
            # asking for something that already happened.
            db.rollback()
            db.refresh(player)

    return _player_state_response(player)


@app.post("/api/player/{email}/collect-treasure", response_model=schemas.PlayerStateResponse)
def collect_treasure(email: str, payload: schemas.CollectTreasureRequest, db: Session = Depends(get_db)):
    player = db.query(models.Player).filter(models.Player.email == email).first()
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")

    already_done = db.query(models.TreasureCollection).filter(
        models.TreasureCollection.player_id == player.id,
        models.TreasureCollection.treasure_id == payload.treasure_id,
    ).first()

    if not already_done:
        db.add(models.TreasureCollection(
            player_id=player.id,
            treasure_id=payload.treasure_id,
            reward_type=payload.reward_type,
        ))
        player.stats.coins += payload.bonus_coins
        db.add(models.CoinTransaction(
            player_id=player.id,
            amount=payload.bonus_coins,
            reason="treasure",
            reference_id=payload.treasure_id,
            balance_after=player.stats.coins,
        ))
        if payload.reward_type == "streak_freezer":
            player.stats.streak_freezers += 1
        elif payload.reward_type == "hint_scroll":
            player.stats.hint_scrolls += 1
        try:
            db.commit()
            db.refresh(player)
        except IntegrityError:
            # Same race as complete_quest above -- a duplicate collection
            # request for the same treasure_id landed before the first one
            # committed. The unique constraint on treasure collections
            # caught it correctly; roll back and return current state
            # instead of a 500.
            db.rollback()
            db.refresh(player)

    return _player_state_response(player)


@app.get("/api/leaderboard", response_model=List[schemas.LeaderboardEntry])
def get_leaderboard(limit: int = 10, db: Session = Depends(get_db)):
    rows = (
        db.query(models.Player.name, models.Player.email, models.PlayerStats.coins)
        .join(models.PlayerStats, models.PlayerStats.player_id == models.Player.id)
        .order_by(models.PlayerStats.coins.desc())
        .limit(limit)
        .all()
    )
    return [schemas.LeaderboardEntry(name=r[0], email=r[1], coins=r[2]) for r in rows]


@app.post("/api/player/{email}/scenario")
def select_scenario(email: str, payload: schemas.ScenarioSelectRequest, db: Session = Depends(get_db)):
    player = db.query(models.Player).filter(models.Player.email == email).first()
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")

    player.scenario = payload.scenario
    db.add(models.ScenarioSelectionLog(player_id=player.id, scenario=payload.scenario))
    db.commit()
    return {"scenario": player.scenario}


@app.post("/api/player/{email}/quiz-attempt")
def log_quiz_attempt(email: str, payload: schemas.QuizAttemptLogRequest, db: Session = Depends(get_db)):
    player = db.query(models.Player).filter(models.Player.email == email).first()
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")

    db.add(models.QuizAttempt(
        player_id=player.id,
        request_type=payload.request_type,
        quest_or_treasure_id=payload.quest_or_treasure_id,
        topic=payload.topic,
        question_text=payload.question_text,
        options_json=json.dumps(payload.options),
        correct_index=payload.correct_index,
        selected_index=payload.selected_index,
        is_correct=None if payload.is_correct is None else int(payload.is_correct),
        difficulty=payload.difficulty,
        attempt_number=payload.attempt_number,
        decision_latency_ms=payload.decision_latency_ms,
        suspicious_latency=None if payload.suspicious_latency is None else int(payload.suspicious_latency),
    ))
    db.commit()
    return {"logged": True}


@app.post("/api/telemetry/batch")
def log_telemetry_batch(payload: schemas.TelemetryBatchRequest, db: Session = Depends(get_db)):
    """
    Decoupled ingestion endpoint — accepts a batch of behavioral events
    from telemetryBus.js. Deliberately tolerant: an unknown player email
    or an event type this handler doesn't recognize yet is SKIPPED, not
    a 400 — a malformed or ahead-of-schema event should never surface as
    a client-visible error or block the rest of the batch from landing.
    Extend the `if event.type == ...` chain below as new event types are
    added; each type maps to its own table the same way quiz_attempt does.
    """
    written = 0
    for event in payload.events:
        player = db.query(models.Player).filter(models.Player.email == event.email).first()
        if not player:
            continue

        if event.type == "quiz_attempt":
            p = event.payload
            db.add(models.QuizAttempt(
                player_id=player.id,
                request_type=p.get("request_type", "UNKNOWN"),
                quest_or_treasure_id=p.get("quest_or_treasure_id"),
                topic=p.get("topic"),
                question_text=p.get("question_text"),
                options_json=json.dumps(p.get("options", [])),
                correct_index=p.get("correct_index"),
                selected_index=p.get("selected_index"),
                is_correct=None if p.get("is_correct") is None else int(p["is_correct"]),
                difficulty=p.get("difficulty"),
                attempt_number=p.get("attempt_number", 1),
                decision_latency_ms=p.get("decision_latency_ms"),
                suspicious_latency=None if p.get("suspicious_latency") is None else int(p["suspicious_latency"]),
            ))
            written += 1
        elif event.type == "savings_habit_selfreport":
            p = event.payload
            db.add(models.SavingsHabitSelfReport(
                player_id=player.id,
                source_npc_id=p.get("source_npc_id"),
                saves_money=None if p.get("saves_money") is None else int(p["saves_money"]),
                savings_method=p.get("savings_method"),
            ))
            written += 1
        # else: unrecognized event type — silently skipped, see docstring.

    db.commit()
    return {"logged": written, "received": len(payload.events)}


@app.get("/api/player/{email}/coin-history", response_model=List[schemas.CoinTransactionResponse])
def get_coin_history(email: str, limit: int = 50, db: Session = Depends(get_db)):
    player = db.query(models.Player).filter(models.Player.email == email).first()
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")

    rows = (
        db.query(models.CoinTransaction)
        .filter(models.CoinTransaction.player_id == player.id)
        .order_by(models.CoinTransaction.created_at.desc())
        .limit(limit)
        .all()
    )
    return rows
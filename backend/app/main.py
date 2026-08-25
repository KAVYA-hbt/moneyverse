import os
import json
from pathlib import Path
from datetime import date, datetime
from dotenv import load_dotenv
from fastapi import FastAPI, Query, HTTPException, Depends, Request, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from openai import OpenAI

# Import your city builder module
from app.city_builder.generate_layout import generate_full_layout
from app.db import Base, engine, get_db, SessionLocal
from app import models, schemas, profile_builder, mock_profiles

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

Write every player-facing text field ("question", "options", "hint", "concept_tag",
"hint_text") in the language given by user_profile.language: "en" = English, "hi" = Hindi
(Devanagari script), "ta" = Tamil (Tamil script). If user_profile.language is missing or
unrecognized, default to English. JSON keys themselves always stay in English regardless of
this setting — only the text values inside them are translated.

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
    language: str = "en"  # "en" | "hi" | "ta" -- see SYSTEM_PROMPT's language instruction

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
def sync_player(payload: schemas.PlayerSyncRequest, request: Request, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """Call once when the game loads. Creates the player row on first ever
    visit, syncs the daily login streak, and returns their full saved state.

    Also logs a LoginEvent (IP + user agent) -- INTERNAL/TEST USE ONLY.
    This is not yet covered by the player-facing consent doc
    (questcraft_data_usage_agreement.pdf lists name/avatar, progress, quiz
    responses, and basic usage events -- not IP address or behavioral
    profiling). Do not expose this data outside internal tooling, and do
    not wire it into any external export (e.g. the digital-twin site)
    until the consent doc is updated to cover it."""
    player = _get_or_create_player(db, payload)
    _sync_daily_streak(db, player.stats)
    # X-Forwarded-For first, since this typically sits behind a proxy/LB in
    # any real deployment -- falls back to the direct connection otherwise.
    forwarded = request.headers.get("x-forwarded-for")
    client_ip = forwarded.split(",")[0].strip() if forwarded else (request.client.host if request.client else None)
    db.add(models.LoginEvent(
        player_id=player.id,
        ip_address=client_ip,
        user_agent=request.headers.get("user-agent"),
    ))
    db.commit()
    db.refresh(player)
    background_tasks.add_task(_write_profiles_export_to_disk)
    return _player_state_response(player)


@app.get("/api/player/{email}/state", response_model=schemas.PlayerStateResponse)
def get_player_state(email: str, db: Session = Depends(get_db)):
    player = db.query(models.Player).filter(models.Player.email == email).first()
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    return _player_state_response(player)


@app.post("/api/player/{email}/complete-quest", response_model=schemas.PlayerStateResponse)
def complete_quest(email: str, payload: schemas.CompleteQuestRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
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
            quest_type=models.quest_category_for(payload.quest_id),
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
            background_tasks.add_task(_write_profiles_export_to_disk)
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
def collect_treasure(email: str, payload: schemas.CollectTreasureRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
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
            background_tasks.add_task(_write_profiles_export_to_disk)
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


# ===============================================================================
# 8. FINANCIAL / PSYCHOMETRIC PROFILE EXPORT — for the external Digital Twin
#    site and the admin dashboard. See profile_builder.py for how each field
#    is computed and mock_profiles.py for synthetic test data.
#
#    INTERNAL/TEST USE ONLY for now — not yet covered by the player consent
#    doc (questcraft_data_usage_agreement.pdf). Do not point this at real
#    players' data from an external system until that's updated.
# ===============================================================================

def _get_player_or_404(email: str, db: Session) -> models.Player:
    player = db.query(models.Player).filter(models.Player.email == email).first()
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    return player


@app.get("/api/player/{email}/financial-profile")
def get_financial_profile(email: str, db: Session = Depends(get_db)):
    player = _get_player_or_404(email, db)
    profile = profile_builder.build_financial_profile(player, db)
    profile["last_updated"] = datetime.utcnow().isoformat()
    return profile


@app.get("/api/player/{email}/behavioral-profile")
def get_behavioral_profile(email: str, db: Session = Depends(get_db)):
    player = _get_player_or_404(email, db)
    profile = profile_builder.build_behavioral_profile(player, db)
    profile["last_updated"] = datetime.utcnow().isoformat()
    return profile


# Written to disk after every profile-relevant write (see the background-task calls
# throughout this file) so the admin dashboard can pick up new data by reading a local
# file instead of opening a direct DB connection -- needed in sandbox deployments where
# the admin dashboard's process can't reach this backend's Postgres instance. Read by
# admin_dashboard/backend/app/services/game_sync.py's json_file sync mode.
SHARED_EXPORT_PATH = Path(__file__).resolve().parents[2] / "shared_data" / "exported_profiles.json"


def _build_profiles_export(db: Session) -> dict:
    players = db.query(models.Player).all()
    out = []
    for player in players:
        fin = profile_builder.build_financial_profile(player, db)
        beh = profile_builder.build_behavioral_profile(player, db)
        fin["last_updated"] = beh["last_updated"] = datetime.utcnow().isoformat()
        out.append({"email": player.email, "financial_behavior": fin, "psychometric": beh})
    return {"count": len(out), "players": out}


def _write_profiles_export_to_disk() -> None:
    """Background-task target -- runs after the response is sent, on its own DB session
    (the request's session may already be closed by then)."""
    db = SessionLocal()
    try:
        data = _build_profiles_export(db)
        SHARED_EXPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
        SHARED_EXPORT_PATH.write_text(json.dumps(data, default=str), encoding="utf-8")
    finally:
        db.close()


@app.get("/api/admin/export-profiles")
def export_all_profiles(db: Session = Depends(get_db)):
    """Batch dump, all players, REAL data. One entry per player with both
    profile JSONs side by side."""
    return _build_profiles_export(db)


@app.get("/api/admin/mock-profiles")
def get_mock_profiles(count: int = 10):
    """Synthetic data for testing the admin dashboard UI right now, before
    enough real players exist. Every record carries "synthetic": true —
    the dashboard must never render these without that flag visible."""
    count = max(1, min(count, 200))
    players = []
    for i in range(count):
        first, last = mock_profiles.mock_indian_name(i)
        players.append({
            "email": f"{first.lower()}.{last.lower()}{i}@example.test",
            "name": f"{first} {last}",
            "financial_behavior": mock_profiles.mock_financial_profile(),
            "psychometric": mock_profiles.mock_behavioral_profile(),
        })
    return {"count": count, "players": players}


@app.post("/api/player/{email}/scenario")
def select_scenario(email: str, payload: schemas.ScenarioSelectRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    player = db.query(models.Player).filter(models.Player.email == email).first()
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")

    player.scenario = payload.scenario
    db.add(models.ScenarioSelectionLog(player_id=player.id, scenario=payload.scenario))
    db.commit()
    background_tasks.add_task(_write_profiles_export_to_disk)
    return {"scenario": player.scenario}


@app.post("/api/player/{email}/quiz-attempt")
def log_quiz_attempt(email: str, payload: schemas.QuizAttemptLogRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    player = db.query(models.Player).filter(models.Player.email == email).first()
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")

    db.add(models.QuizAttempt(
        player_id=player.id,
        request_type=payload.request_type,
        quest_or_treasure_id=payload.quest_or_treasure_id,
        topic=payload.topic,
        topic_category=models.quest_category_for(payload.quest_or_treasure_id),
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
    background_tasks.add_task(_write_profiles_export_to_disk)
    return {"logged": True}


@app.post("/api/telemetry/batch")
def log_telemetry_batch(payload: schemas.TelemetryBatchRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
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
                topic_category=models.quest_category_for(p.get("quest_or_treasure_id")),
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
        elif event.type == "onboard_cta_click":
            p = event.payload
            db.add(models.OnboardCtaClick(
                player_id=player.id,
                level=p.get("level"),
            ))
            written += 1
        elif event.type == "badge_published":
            p = event.payload
            db.add(models.BadgePublished(
                player_id=player.id,
                badge_id=p.get("badge_id"),
                name_on_badge=p.get("name_on_badge"),
                level=p.get("level"),
            ))
            written += 1
        elif event.type == "advisory_choice":
            p = event.payload
            db.add(models.AdvisoryChoice(
                player_id=player.id,
                npc_id=p.get("npc_id", "unknown"),
                choice_value=p.get("choice_value") or "unknown",
                reversed_count=p.get("reversed_count", 0) or 0,
                robot_hint_used=int(bool(p.get("robot_hint_used"))),
                decision_time_ms=p.get("decision_time_ms"),
                total_conversation_ms=p.get("total_conversation_ms"),
                level=p.get("level"),
            ))
            written += 1
        elif event.type == "task_timing":
            p = event.payload
            db.add(models.PageTaskTiming(
                player_id=player.id,
                task_type=p.get("task_type", "unknown"),
                task_id=p.get("task_id"),
                duration_ms=p.get("duration_ms", 0) or 0,
                level=p.get("level"),
            ))
            written += 1
        # else: unrecognized event type — silently skipped, see docstring.

    db.commit()
    if written:
        background_tasks.add_task(_write_profiles_export_to_disk)
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
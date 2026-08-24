# Admin Dashboard — API Contract

This is the source of truth for request/response shapes shared between the FastAPI backend
(`backend/`) and the React frontend (`frontend/`). Both sides must conform to this exactly —
if either side needs to deviate, update this file first.

Base URL (dev): `http://localhost:8000`
WebSocket (dev): `ws://localhost:8000/ws/handoffs`

All authenticated requests send `Authorization: Bearer <jwt>`.

## Enums

```
Role = "tier1_admin" | "tier2_admin" | "product_analyst"
TriggerReason = "bot_confusion" | "distress_language" | "dpdp_request" | "high_value_decision" | "explicit_human_request"
HandoffStatus = "open" | "claimed" | "resolved"
EscalationSource = "auto" | "manual"
InteractionType = "recommendation" | "chat" | "advisory_session"
FlagKind = "mismatch" | "distress" | "compliance"   // frontend FlagBadge kind -> color: mismatch=amber, distress=red, compliance=purple
```

## Auth

### POST /api/auth/login
Request: `{ email: string, password: string }`
Response 200:
```json
{ "access_token": "string", "token_type": "bearer", "role": "tier1_admin", "admin_id": "uuid", "name": "string" }
```

### GET /api/auth/me
Response 200:
```json
{ "id": "uuid", "name": "string", "email": "string", "role": "tier1_admin" }
```

## Profiles

### GET /api/profiles?segment=&min_score=&max_score=&page=&page_size=
Response 200:
```json
{
  "items": [
    { "player_id": "uuid", "name": "string", "segment_tags": ["string"], "current_game_level": 1,
      "last_active_at": "iso8601", "confidence_level": "low|medium|high", "open_mismatch_count": 0 }
  ],
  "total": 0, "page": 1, "page_size": 20
}
```

### GET /api/profiles/{player_id}
Response 200:
```json
{
  "player": { "id": "uuid", "external_game_id": "string", "name": "string", "signup_date": "iso8601",
              "last_active_at": "iso8601", "current_game_level": 1, "minor_flag": false,
              "consent_status": {} },
  "financial_profile": { /* profile_json verbatim: financial_literacy, money_management_style,
                            savings_behavior, risk_and_investment, debt_and_credit,
                            product_affinity, segment_tags */ },
  "psychometric_profile": { /* profile_json verbatim: decision_style, risk_psychology,
                               time_preference, cognitive_biases_detected,
                               personality_traits_lite, social_and_influence,
                               stress_response, trait_summary_tags, sample_size */ },
  "segment_tags": ["string"],
  "confidence_level": "low|medium|high",
  "confidence_score": 0.0,
  "open_mismatches": [
    { "id": "uuid", "mismatch_type": "string", "description": "string", "detected_at": "iso8601", "resolved": false }
  ]
}
```
confidence_level derived from quest_history count vs psychometric sample_size: low <5 quests, medium 5-14, high >=15.

### GET /api/profiles/{player_id}/summary
Response 200:
```json
{
  "player_id": "uuid", "name": "string", "segment_tags": ["string"],
  "top_quests": [ { "quest_id": "string", "quest_type": "string", "completed_at": "iso8601", "outcome_score": 0.0 } ],
  "top_interactions": [ { "interaction_type": "chat", "product_discussed": "string", "occurred_at": "iso8601", "summary_text": "string" } ],
  "active_flags": [ { "kind": "mismatch|distress|compliance", "label": "string", "detail": "string" } ]
}
```

### GET /api/profiles/{player_id}/summary/ai
Response 200:
```json
{ "summary_text": "string", "based_on": ["string", "..."], "generated_at": "iso8601", "is_cached": true }
```

### GET /api/profiles/analytics
Cohort-wide aggregates across every profile the caller can see (no pagination — same "up to
page_size=100" scale as the rest of this app). Registered before `/{player_id}` in the router so
`analytics` is never swallowed as a UUID path param.
Response 200:
```json
{
  "total_players": 0,
  "confidence_breakdown": { "low": 0, "medium": 0, "high": 0 },
  "segment_tag_counts": [ { "tag": "string", "count": 0 } ],
  "trait_tag_counts": [ { "tag": "string", "count": 0 } ],
  "product_interest_counts": [ { "tag": "string", "count": 0 } ]
}
```
`segment_tag_counts`/`trait_tag_counts`/`product_interest_counts` are all sorted descending by
count. `segment_tags` and `trait_summary_tags` are safe to aggregate across every data source
(mock/seeded/real) as-is since their *shape* (list of strings) is identical everywhere.
`product_interest_counts` is different: it pools two genuinely different shapes of signal (see
`app/routers/profiles.py::_accumulate_product_interest`) rather than mapping one onto the other —
real telemetry's `product_affinity.*_engagement`/`_comfort` category counts, and synthetic/seed
data's `product_affinity.top_products` / `risk_and_investment.preferred_instruments` specific
product names — so entries in this one list are a mix of category labels ("insurance") and
product names ("SIP-Mutual-Fund") depending on which players contributed to each.

### POST /api/profiles/{player_id}/override
Requires role in {product_analyst, tier1_admin, tier2_admin} (product_analyst or higher — all three qualify; enforced via dependency).
Request: `{ "field_path": "financial_profile.segment_tags", "new_value": any, "reason": "string" }`
Response 200: `{ "success": true, "audit_log_id": "uuid" }`

### GET /api/profiles/{player_id}/export?format=json|pdf
Response 200: `application/json` snapshot or `application/pdf` binary.

## Handoffs

### GET /api/handoffs?status=&trigger_reason=&assigned_admin_id=&page=&page_size=
Tier-filtered server-side per role (see Row-Level Rule below).
Response 200:
```json
{
  "items": [
    { "id": "uuid", "player_id": "uuid", "player_name": "string", "trigger_reason": "distress_language",
      "tier_required": 1, "status": "open", "assigned_admin_id": null, "created_at": "iso8601",
      "active_flags": [ { "kind": "distress", "label": "string" } ] }
  ],
  "total": 0, "page": 1, "page_size": 20
}
```

### GET /api/handoffs/{case_id}
Response 200:
```json
{
  "case": { "id": "uuid", "player_id": "uuid", "trigger_reason": "string", "tier_required": 1,
             "status": "open", "assigned_admin_id": null, "created_at": "iso8601",
             "claimed_at": null, "resolved_at": null, "bot_reasoning_text": "string",
             "escalation_source": null, "escalated_by_admin_id": null, "escalation_reason_text": null },
  "transcript": [ { "id": "uuid", "sender": "player|bot", "message_text": "string", "sent_at": "iso8601", "is_trigger_message": false } ],
  "profile_summary": { /* same shape as GET /api/profiles/{id}/summary */ },
  "resolution": null
}
```
403 if requester is tier1_admin and case.tier_required == 2 and not escalated_by them.

### POST /api/handoffs/{case_id}/claim
Response 200: updated case object (same shape as `case` above).

### POST /api/handoffs/{case_id}/resolve
Request: `{ "outcome": "string", "notes": "string" }`
Response 200: `{ "success": true }`

### POST /api/handoffs/{case_id}/escalate
tier1_admin only. Request: `{ "escalation_reason_text": "string" }`
Response 200: updated case object. Sets tier_required=2, escalation_source="manual", escalated_by_admin_id=<self>.
Broadcasts a `handoff_updated` event over pub/sub + WS.

### POST /api/handoffs/{case_id}/send-back
Request: `{ "note": "string" }`
Response 200: `{ "success": true }`

## WebSocket /ws/handoffs
Auth via `?token=<jwt>` query param (dev-simple; documented as such).
Server -> client messages:
```json
{ "type": "case_created", "case": { ...same shape as queue row... } }
{ "type": "case_claimed", "case_id": "uuid", "assigned_admin_id": "uuid" }
{ "type": "case_updated", "case_id": "uuid" }
```
Frontend must fall back to polling (refetchInterval: 15000) if the socket is closed/unavailable —
this fallback is REQUIRED, implement both, comment clearly which path is active.

## Row-Level Rule (enforced in backend query layer, not just UI)
For any query touching `handoff_cases` / `handoff_transcripts` made by a `tier1_admin`:
filter to `tier_required = 1 OR escalated_by_admin_id = <current_admin_id>`.
tier2_admin and product_analyst see everything (product_analyst read-only, no claim/resolve/escalate actions).

## Error shape
```json
{ "detail": "human readable message" }
```

## Mock data mode (backend config)
`backend/.env` (and `.env.example`) has a `DATA_SOURCE` setting: `db` (default) or `mock`.
When `DATA_SOURCE=mock`, `/api/profiles*` endpoints serve deterministic, in-memory generated
"digital twin" data (see `backend/app/services/mock_data.py`) instead of querying the database —
useful for previewing the Player Profiles screens without a seeded DB. Response shapes are
identical to `db` mode; only the data source changes. Scoped to `/api/profiles` only — auth and
`/api/handoffs` always use the real database regardless of this setting. The frontend does not
need to know which mode is active; it just calls the same endpoints.

## Live sync from the game's Postgres DB
When `DATA_SOURCE=db` and `ENABLE_GAME_SYNC=true` (both default), this backend runs a background
loop (`backend/app/services/game_sync.py`, started from `app/main.py`'s lifespan) that queries
`GAME_DATABASE_URL` directly every `PROFILE_SYNC_INTERVAL_SECONDS` (default 25s) — via
`backend/app/game_db/`, a read-only mirror of the game's `players` / `quiz_attempts` /
`advisory_choices` / `quest_completions` tables plus `game_db/profile_builder.py`, a
**hand-maintained async port** of the game backend's own `app/profile_builder.py` scoring logic
— and upserts into `Player` / `FinancialProfile` / `PsychometricProfile` / `QuestHistory`,
matching players by `external_game_id = "REAL-<game player_id>"`. Same matching key as the
one-off `app/import_profiles.py` script, just re-run forever and updating existing players in
place instead of skipping them.

**This means there are now two copies of the profile-scoring logic** (the game's own
`backend/app/profile_builder.py`, and this admin backend's `game_db/profile_builder.py`) that
must be kept in sync by hand — if the game's scoring formulas ever change, `game_db/profile_builder.py`
needs the same change made here, or the two will silently drift apart. This was a deliberate
choice to query the game's DB directly rather than go through its `GET /api/admin/export-profiles`
HTTP endpoint (the simpler, single-source-of-truth alternative — see git history for that
version); pick that back if the duplication becomes a maintenance burden.

It's tolerant of the game's DB being unreachable (logs a warning, retries next tick).

Because the game frontend hardcodes its backend to `http://<host>:8000`
(`moneyverse/frontend/src/utils/apiBase.js`), this admin backend defaults to a different port
(`BACKEND_PORT` in `.env` — 8001 in `.env.example`, though pick whatever's actually free on your
machine) so both can run at once locally. `GAME_DATABASE_URL` in `.env.example` points at the
same Postgres instance as the game backend's own `DATABASE_URL` (`moneyverse/backend/.env`) —
same host/user/password/db, just the `asyncpg` driver instead of `psycopg2`.

Not yet wired: handoff cases (bot escalations) — the game backend has no trigger logic or call
to create a `HandoffCase` today, so `/api/handoffs` only shows what `app/seed.py` fabricated.

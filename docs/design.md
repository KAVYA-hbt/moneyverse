# SBI QuestCraft — Build Progress Log

Personal reference doc — everything done so far, in order, with the *why*
behind each step and exact commands used. Not part of the project's own
`docs/` folder (that one lives in your repo and you maintain it) — this is
your own resume/checkpoint file.

**Current status:** Backend scaffolded + config working. Frontend scaffolded
+ R3F installed. Next: first test render (rotating cube) before touching
real GLB assets.

---

## Repo state right now

```
sbi-questcraft/
├── .gitignore
├── backend/
│   ├── .venv/                  (not committed - local only)
│   ├── .env                    (not committed - real secrets, placeholders for now)
│   ├── .env.example            (committed)
│   ├── requirements.txt        (committed)
│   └── app/
│       └── config.py           (committed - Settings loader, tested working)
├── frontend/
│   ├── node_modules/           (not committed)
│   ├── package.json            (committed - now includes three, @react-three/fiber, @react-three/drei)
│   ├── src/                    (still Vite's default starter content, not yet ours)
│   └── ...standard Vite scaffold files
└── docs/                       (created but not yet populated on your machine - see note below)
```

**Note on `docs/`:** the folder structure step (creating `docs/design.md`,
`audit.md`, `DAILY_LOG.md`) happened in my earlier sandbox build, before
you told me to stop generating files. Since we restarted clean, **you
likely don't have these three files on your machine yet** — worth
creating them for real if you want the design-decision logging habit
(rule 13/14 from your original mentor prompt) to actually exist going
forward. Flagging this as a gap, not assuming it's done.

---

## Commit history so far

```
7bc6722 chore: scaffold Vite + React frontend
0c04e13 feat: add backend Settings loader (config.py)
f32dd2d chore: add backend requirements.txt and .env.example
85f5852 chore: add .gitignore
```

*(one more commit pending — the design.md decision entry about skipping
@react-three/cannon, from the step right before this one)*

---

## Step-by-step log

### Step 1 — Git init
```powershell
mkdir sbi-questcraft
cd sbi-questcraft
git init
```
**Why:** start tracking history from the very first file, not after code
already exists.

**Issue hit:** `git` not recognized — Git wasn't installed. Installed via
git-scm.com/download/win, had to fully restart terminal (later, fully
restart machine) for PATH to pick it up reliably.

---

### Step 2 — `.gitignore`
Created at repo root, covering: `.env`/`*.env` (with `!.env.example`
exception), Python `__pycache__`/`.venv`, Node `node_modules`/`dist`,
OS/editor noise, and later `.claude/` (local tool config, added after
being caught in a staged commit).

**Why before any real files:** once a secret is committed to git, deleting
it later doesn't remove it from history — prevention beats cleanup.

---

### Step 3 — First commit
```powershell
git commit -m "chore: add .gitignore"
```
**Why standalone:** one coherent unit of change per commit, not bundled
with unrelated future work.

---

### Step 4 — Top-level folders
```powershell
mkdir backend
mkdir frontend
mkdir docs
```
**Why separate:** two different language ecosystems (Python/Node) need
separate dependency files and tooling — mixing them in one folder invites
config conflicts.

---

### Step 5 — `backend/requirements.txt`
Pinned 12 packages: fastapi, uvicorn[standard], sqlalchemy, psycopg2-binary,
pydantic, pydantic-settings, httpx, langchain, langchain-anthropic,
langgraph, python-dotenv, alembic — each with an exact version.

**Why pin versions:** reproducibility — same versions today and on any
future machine, not whatever's "latest" at install time.

---

### Step 6 — venv + install
```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```
**Issue hit:** PowerShell execution policy blocked the activation script
initially — fixed with `Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned`.

**Verified:** `pip list` showed all 12 pinned packages plus sub-dependencies.

---

### Step 7 — `.env.example` + real `.env`
```
DATABASE_URL=postgresql+psycopg2://questcraft:questcraft@localhost:5432/questcraft
FRONTEND_ORIGIN=http://localhost:5173
MESHY_API_KEY=your_meshy_api_key_here
ANTHROPIC_API_KEY=your_anthropic_key_here
LLM_MODEL=claude-sonnet-4-6
```
Copied to real `.env` (still placeholder values, no real keys yet).

**Verified with the definitive command, not just `git status`:**
```powershell
git check-ignore -v .env
```
→ confirmed matched by `.gitignore:3:*.env` — genuinely ignored, not just
absent from a possibly-misleading collapsed status line.

**Lesson learned here:** `git status` collapses whole untracked folders
into one line (e.g. `./`) when nothing inside is tracked yet — not
reliable for verifying a *specific* file is ignored. `git check-ignore -v <file>`
is the actual definitive check.

---

### Step 8 — `backend/app/config.py`
Pydantic `BaseSettings` class reading all `.env` values into a typed,
validated object, wrapped in `@lru_cache` so the file is only read/parsed
once per process, not on every call.

**Tested:**
```powershell
python -c "from app.config import get_settings; print(get_settings())"
```
→ printed real values pulled from `.env`, confirming it actually reads
the file, not just returning hardcoded defaults.

**Committed:** `feat: add backend Settings loader (config.py)`

---

### Step 9 — Conceptual: the frontend stack
No commands — just made sure the mental model was solid before installing
anything:
- **Vite** = dev server/build tool (transforms JSX, live-reloads on save)
- **React** = UI framework (describe desired state, React updates the DOM)
- **Three.js** = the actual 3D engine (built on WebGL)
- **React Three Fiber (R3F)** = lets you write Three.js scenes declaratively,
  as React components, instead of imperative step-by-step Three.js code

---

### Step 10 — Scaffold Vite + React
```powershell
cd C:\Users\Kavya.K\Documents\sbi-questcraft
npm create vite@latest frontend -- --template react
```
Chose **ESLint** over Oxlint (more documentation/community coverage, worth
it for a learning project even though Oxlint is faster).

**Verified:** dev server started automatically at `http://localhost:5173`,
confirmed the default counter button actually worked (proves React itself
is running, not just that a page loads).

**Issue hit again:** stale PATH cache for `git` in the new window — same
root cause as Step 1, fixed by finally doing a full machine restart
(previous fixes were per-window workarounds only).

**Verified no nested git repo:**
```powershell
Test-Path .git   # from inside frontend/ → returned False, correct
```

**Committed:** `chore: scaffold Vite + React frontend`

---

### Step 11 — Install React Three Fiber + Three.js + drei
```powershell
npm install three @react-three/fiber @react-three/drei
```
**Verified:**
```powershell
npm list three @react-three/fiber @react-three/drei
```
→ `three@0.185.1`, `@react-three/fiber@9.6.1`, `@react-three/drei@10.7.7`

**Important discovery:** these are much newer major versions than
originally assumed (R3F v9, not v8). This meant `@react-three/cannon`
(originally planned physics library) is not reliably compatible.

**Decision made:** skip physics entirely — the locked interaction design
(walk near a building, tap to interact) only needs distance math, which
was already built and tested (`utils/cityGrid.js`, `flatDistance`), not
real rigid-body physics. No `@react-three/cannon` or `@react-three/rapier`
needed for now.

**Pending:** you still need to add this decision to your own
`docs/design.md` and commit it — see note above about `docs/` not being
populated on your machine yet.

---

## Recurring issues worth remembering

1. **PATH caching after installing something new (git, node)** — a
   per-window manual fix works temporarily
   (`$env:Path = [System.Environment]::GetEnvironmentVariable(...)`), but
   a full machine restart is the only fix that persists across all future
   windows. Do the restart early, not repeatedly patch around it.

2. **`git status` can lie by omission** — it collapses untracked folders
   with nothing tracked inside them into one line. For anything
   security-sensitive (verifying a file is ignored), use
   `git check-ignore -v <file>` instead — it gives a definitive yes/no
   with the exact rule that matched.

3. **Always confirm your current directory** (`pwd`) before running a
   command with a relative path (`..\something`) — several errors so far
   traced back to running a command from an unexpected folder.

4. **LF/CRLF warnings on Windows are harmless** — expected behavior, not
   an error, given you're solo on Windows for now.

---

## What's next (Step 12)

First real R3F render: a rotating test cube, replacing Vite's default
starter page — proving the rendering pipeline works before we load any
of your actual GLB city assets on top of it.
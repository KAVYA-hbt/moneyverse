import os
import random
import hashlib
import json
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any
from groq import Groq

router = APIRouter()

# Safely initialize Groq client only if key exists
GROQ_API_KEY = os.environ.get("GROQ_API_KEY")
client = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None

class UserProfile(BaseModel):
    email: Optional[str] = None
    name: Optional[str] = None
    scenario: Optional[str] = None
    state: Optional[str] = None
    district: Optional[str] = None

class QuizRequest(BaseModel):
    request_type: str  # 'MAIN_QUEST' | 'ROAD_TREASURE' | 'HINT_SCROLL'
    user_profile: Optional[UserProfile] = None
    quest_context: Optional[Dict[str, Any]] = {}
    performance_state: Optional[Dict[str, Any]] = {}

def get_user_seed(email: str) -> int:
    """Generates a deterministic integer seed from a user's email."""
    return int(hashlib.md5(email.lower().strip().encode('utf-8')).hexdigest(), 16) % (10 ** 8)

def generate_user_world(email: str, scenario: str, layout_buildings: list):
    seed = get_user_seed(email)
    rng = random.Random(seed)
    
    num_quests = 4 if scenario == 'employee' else 3
    valid_pool = [b for b in layout_buildings if b.get('category') != 'road']
    rng.shuffle(valid_pool)
    
    selected_buildings = []
    for b in valid_pool:
        bx, bz = b.get('render_x', 0), b.get('render_z', 0)
        too_close = any(
            ((bx - s.get('render_x', 0)) ** 2 + (bz - s.get('render_z', 0)) ** 2) ** 0.5 < 40.0
            for s in selected_buildings
        )
        if not too_close:
            selected_buildings.append(b)
        if len(selected_buildings) == num_quests:
            break

    return {
        "email": email,
        "scenario": scenario,
        "seed": seed,
        "assigned_buildings": selected_buildings
    }

@router.post("/quiz")
async def generate_quiz_endpoint(payload: QuizRequest):
    if not client:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY is not set in .env")

    try:
        req_type = payload.request_type
        profile = payload.user_profile
        context = payload.quest_context or {}
        perf = payload.performance_state or {}

        if req_type == "HINT_SCROLL":
            question_text = context.get("question", "SBI banking verification rules")
            prompt = f"Provide a short, concise, and helpful hint (max 2 sentences) for this banking/technical quiz question: '{question_text}'."
            
            completion = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.7,
            )
            hint_text = completion.choices[0].message.content.strip()
            return {"hint_text": hint_text}

        is_easy_retry = perf.get("last_question_attempts") == 3 or context.get("difficulty") == "easy"
        difficulty_str = "very easy (easier retry level)" if is_easy_retry else "standard challenge level"

        # 🚨 EXCLUSION RULE: Prevent repeating the previous question on retry
        previous_q = context.get("previous_question", "")
        exclusion_rule = f" CRITICAL: Do NOT generate or repeat this previous question under any circumstances: '{previous_q}'." if previous_q else ""

        system_prompt = (
            "You are an expert game master and AI backend for an interactive educational banking & tech world. "
            "Return ONLY valid JSON with no markdown formatting blocks, adhering strictly to this format: "
            '{"question": "string", "options": ["string", "string", "string", "string"], "correctIndex": integer (0-3), "concept_tag": "string", "reward": integer, "hint": "string"}'
        )

        user_prompt = (
            f"Generate a {difficulty_str} quiz question for user {profile.name} "
            f"who is a {profile.scenario} from {profile.district}, {profile.state}. "
            f"Context: {context}.{exclusion_rule} Make it related to professional banking verification, data science, or technical protocols."
        )

        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.9, # Higher temperature ensures fresh variation on retry
        )

        response_data = json.loads(completion.choices[0].message.content)
        return response_data

    except Exception as e:
        print(f"Error generating quiz from Groq: {e}")
        raise HTTPException(status_code=500, detail=str(e))
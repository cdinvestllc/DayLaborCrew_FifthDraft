import os
import uuid
import json
import logging
from emergentintegrations.llm.chat import LlmChat, UserMessage
from math import radians, cos, sin, asin, sqrt

logger = logging.getLogger(__name__)
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")


def haversine_distance(lat1, lon1, lat2, lon2) -> float:
    """Return distance in miles between two lat/lng points."""
    R = 3956
    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
    dlat, dlon = lat2 - lat1, lon2 - lon1
    a = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlon / 2) ** 2
    return R * 2 * asin(sqrt(a))


async def ai_match_crew_for_job(job: dict, crew_candidates: list) -> list:
    """
    Use Gemini Flash to rank crew candidates for a job.
    Returns list of dicts: [{crew_id, score, reason, notify}]
    """
    if not crew_candidates:
        return []

    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=str(uuid.uuid4()),
            system_message=(
                "You are a workforce matching engine for a blue collar job marketplace. "
                "Given a job and list of workers, rank workers by match quality. "
                "Consider: trade match (most important), rating, distance, availability. "
                "Return ONLY valid JSON array: "
                '[{"crew_id":"id","score":0.0-1.0,"reason":"brief reason","notify":true/false}] '
                "Include ALL workers. Set notify=true for score >= 0.7."
            )
        ).with_model("gemini", "gemini-3-flash-preview")

        job_info = {
            "title": job.get("title"),
            "trade": job.get("trade"),
            "description": job.get("description", "")[:150],
            "pay_rate": job.get("pay_rate"),
            "location": job.get("location", {}).get("city", "Unknown"),
            "crew_needed": job.get("crew_needed", 1),
        }

        crew_info = []
        for c in crew_candidates[:20]:  # limit to 20 for token efficiency
            loc = c.get("location") or {}
            job_loc = job.get("location") or {}
            dist = None
            if loc.get("lat") and job_loc.get("lat"):
                dist = round(haversine_distance(
                    loc["lat"], loc["lng"],
                    job_loc["lat"], job_loc["lng"]
                ), 1)
            crew_info.append({
                "crew_id": c["id"],
                "name": c.get("name"),
                "trade": c.get("trade", ""),
                "skills": c.get("skills", [])[:5],
                "rating": c.get("rating", 0),
                "distance_miles": dist,
                "availability": c.get("availability", True),
            })

        prompt = f"Job: {json.dumps(job_info)}\nWorkers: {json.dumps(crew_info)}\nRank and score all workers:"
        msg = UserMessage(text=prompt)
        response = await chat.send_message(msg)

        # Extract JSON from response
        raw = response.strip()
        if "```" in raw:
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        matches = json.loads(raw.strip())
        return sorted(matches, key=lambda x: x.get("score", 0), reverse=True)

    except Exception as e:
        logger.error(f"AI matching error: {e}")
        # Fallback: basic scoring without AI
        results = []
        for c in crew_candidates:
            score = 0.5
            if c.get("trade", "").lower() == job.get("trade", "").lower():
                score += 0.3
            if c.get("availability"):
                score += 0.1
            score += min(c.get("rating", 0) / 10, 0.1)
            results.append({
                "crew_id": c["id"],
                "score": round(min(score, 1.0), 2),
                "reason": "Trade and availability match",
                "notify": score >= 0.7
            })
        return sorted(results, key=lambda x: x["score"], reverse=True)


async def generate_smart_job_matches(jobs: list, crew_member: dict) -> list:
    """Sort jobs by AI-predicted match score for a crew member (crew perspective)."""
    if not jobs:
        return jobs
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=str(uuid.uuid4()),
            system_message=(
                "You are a job matching assistant. Given a worker profile and jobs list, "
                "return job IDs sorted best to worst match. "
                "Return ONLY a valid JSON array of IDs like: [\"id1\",\"id2\"]"
            )
        ).with_model("gemini", "gemini-3-flash-preview")

        jobs_summary = [{"id": j["id"], "title": j["title"], "trade": j["trade"], "pay": j.get("pay_rate")} for j in jobs[:15]]
        worker_info = {
            "trade": crew_member.get("trade", ""),
            "skills": crew_member.get("skills", [])[:5],
            "rating": crew_member.get("rating", 0)
        }
        msg = UserMessage(text=f"Worker: {json.dumps(worker_info)}\nJobs: {json.dumps(jobs_summary)}\nReturn ordered IDs array:")
        response = await chat.send_message(msg)
        raw = response.strip().replace("```json", "").replace("```", "").strip()
        ordered_ids = json.loads(raw)
        id_order = {id_: i for i, id_ in enumerate(ordered_ids)}
        return sorted(jobs, key=lambda j: id_order.get(j["id"], 999))
    except Exception as e:
        logger.error(f"Smart matching error: {e}")
        return jobs

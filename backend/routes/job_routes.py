import uuid
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException, Depends, Query, Request
from database import db
from auth import get_current_user, user_to_response
from models import JobCreate, JobUpdate, RatingCreate
from utils.geocoding import geocode_address, haversine_distance
from utils.email_utils import send_job_completion_email
from utils.ai_utils import generate_smart_job_matches
from typing import Optional
import logging

logger = logging.getLogger(__name__)

def now_str():
    return datetime.now(timezone.utc).isoformat()

router = APIRouter()


@router.post("/", status_code=201)
async def create_job(data: JobCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "contractor":
        raise HTTPException(status_code=403, detail="Only contractors can post jobs")

    # Geocode the address
    location = await geocode_address(data.address)

    job_doc = {
        "id": str(uuid.uuid4()),
        "contractor_id": current_user["id"],
        "contractor_name": current_user.get("company_name") or current_user["name"],
        "contractor_photo": current_user.get("logo") or current_user.get("profile_photo"),
        "title": data.title,
        "description": data.description,
        "trade": data.trade,
        "crew_needed": data.crew_needed,
        "crew_accepted": [],
        "start_time": data.start_time,
        "end_time": data.end_time,
        "pay_rate": data.pay_rate,
        "location": location,
        "status": "open",
        "is_emergency": data.is_emergency,
        "created_at": now_str(),
        "completed_at": None,
        "rated_crew": [],
        "rated_by_crew": [],
    }

    await db.jobs.insert_one(job_doc)

    # Broadcast via WebSocket
    try:
        from routes.ws_routes import manager
        await manager.broadcast_new_job(job_doc)
    except Exception as e:
        logger.warning(f"WS broadcast failed: {e}")

    # Trigger AI matching in background (non-blocking)
    import asyncio
    asyncio.create_task(_run_ai_match(job_doc))

    return {k: v for k, v in job_doc.items() if k != "_id"}


@router.get("/")
async def list_jobs(
    status: Optional[str] = None,
    trade: Optional[str] = None,
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    radius: Optional[float] = 25,
    smart_match: Optional[bool] = False,
    current_user: dict = Depends(get_current_user)
):
    query = {}

    if current_user["role"] == "contractor":
        # Contractors only see their own jobs
        query["contractor_id"] = current_user["id"]
    else:
        # Crew sees all open/fulfilled jobs
        if status:
            query["status"] = status
        else:
            query["status"] = {"$in": ["open", "fulfilled"]}

    if trade:
        query["trade"] = trade

    jobs = await db.jobs.find(query, {"_id": 0}).sort("created_at", -1).to_list(200)

    # Filter by radius if location provided
    if lat and lng:
        jobs = [j for j in jobs if haversine_distance(
            lat, lng, j["location"]["lat"], j["location"]["lng"]
        ) <= radius]

    # AI smart matching for crew
    if smart_match and current_user["role"] == "crew" and jobs:
        try:
            jobs = await generate_smart_job_matches(jobs, current_user)
        except Exception:
            pass

    return jobs


@router.get("/my-jobs")
async def my_jobs(current_user: dict = Depends(get_current_user)):
    if current_user["role"] == "contractor":
        jobs = await db.jobs.find({"contractor_id": current_user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    else:
        jobs = await db.jobs.find(
            {"crew_accepted": current_user["id"]},
            {"_id": 0}
        ).sort("created_at", -1).to_list(100)
    return jobs


@router.get("/{job_id}")
async def get_job(job_id: str, current_user: dict = Depends(get_current_user)):
    job = await db.jobs.find_one({"id": job_id}, {"_id": 0})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.put("/{job_id}")
async def update_job(job_id: str, data: JobUpdate, current_user: dict = Depends(get_current_user)):
    job = await db.jobs.find_one({"id": job_id})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job["contractor_id"] != current_user["id"] and current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")

    update = {k: v for k, v in data.model_dump().items() if v is not None}
    if update:
        await db.jobs.update_one({"id": job_id}, {"$set": update})
    return {"message": "Job updated"}


@router.delete("/{job_id}")
async def delete_job(job_id: str, current_user: dict = Depends(get_current_user)):
    job = await db.jobs.find_one({"id": job_id})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job["contractor_id"] != current_user["id"] and current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    await db.jobs.delete_one({"id": job_id})
    return {"message": "Job deleted"}


@router.post("/{job_id}/accept")
async def accept_job(job_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "crew":
        raise HTTPException(status_code=403, detail="Only crew members can accept jobs")

    job = await db.jobs.find_one({"id": job_id}, {"_id": 0})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job["status"] not in ("open", "fulfilled"):
        raise HTTPException(status_code=400, detail=f"Job is {job['status']}, cannot accept")
    if current_user["id"] in job["crew_accepted"]:
        raise HTTPException(status_code=400, detail="Already accepted this job")

    new_crew = job["crew_accepted"] + [current_user["id"]]
    new_status = "fulfilled" if len(new_crew) >= job["crew_needed"] else "open"

    await db.jobs.update_one(
        {"id": job_id},
        {"$set": {"crew_accepted": new_crew, "status": new_status}}
    )

    # Notify contractor via WebSocket
    try:
        from routes.ws_routes import manager
        await manager.send_to_user(job["contractor_id"], {
            "type": "job_accepted",
            "job_id": job_id,
            "crew_name": current_user["name"],
            "crew_count": len(new_crew),
            "crew_needed": job["crew_needed"]
        })
    except Exception:
        pass

    return {"message": "Job accepted", "status": new_status}


@router.post("/{job_id}/start")
async def start_job(job_id: str, current_user: dict = Depends(get_current_user)):
    job = await db.jobs.find_one({"id": job_id}, {"_id": 0})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job["contractor_id"] != current_user["id"] and current_user["id"] not in job.get("crew_accepted", []):
        raise HTTPException(status_code=403, detail="Not authorized")
    if job["status"] not in ("open", "fulfilled"):
        raise HTTPException(status_code=400, detail="Job cannot be started in current status")

    await db.jobs.update_one({"id": job_id}, {"$set": {"status": "in_progress"}})
    return {"message": "Job started"}


@router.post("/{job_id}/complete")
async def complete_job(job_id: str, current_user: dict = Depends(get_current_user)):
    job = await db.jobs.find_one({"id": job_id}, {"_id": 0})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if current_user["id"] not in job.get("crew_accepted", []):
        raise HTTPException(status_code=403, detail="Not a crew member on this job")
    if job["status"] != "in_progress":
        raise HTTPException(status_code=400, detail="Job must be in_progress to complete")

    await db.jobs.update_one(
        {"id": job_id},
        {"$set": {"status": "completed_pending_review"}}
    )

    # Notify contractor
    contractor = await db.users.find_one({"id": job["contractor_id"]}, {"_id": 0})
    if contractor:
        await send_job_completion_email(contractor["email"], contractor["name"], job["title"])
        try:
            from routes.ws_routes import manager
            await manager.send_to_user(job["contractor_id"], {
                "type": "job_completed",
                "job_id": job_id,
                "job_title": job["title"]
            })
        except Exception:
            pass

    return {"message": "Job marked complete, awaiting contractor review"}


@router.post("/{job_id}/verify")
async def verify_job(job_id: str, current_user: dict = Depends(get_current_user)):
    job = await db.jobs.find_one({"id": job_id}, {"_id": 0})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job["contractor_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Only the contractor can verify")
    if job["status"] != "completed_pending_review":
        raise HTTPException(status_code=400, detail="Job not pending review")

    now = now_str()
    await db.jobs.update_one(
        {"id": job_id},
        {"$set": {"status": "completed", "completed_at": now}}
    )

    # Award points to crew members
    for crew_id in job.get("crew_accepted", []):
        await db.users.update_one(
            {"id": crew_id},
            {"$inc": {"points": 50, "jobs_completed": 1}}
        )

    return {"message": "Job verified and completed"}


@router.post("/{job_id}/rate")
async def rate_user(job_id: str, data: RatingCreate, current_user: dict = Depends(get_current_user)):
    job = await db.jobs.find_one({"id": job_id}, {"_id": 0})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job["status"] not in ("completed", "completed_pending_review"):
        raise HTTPException(status_code=400, detail="Can only rate after job completion")

    # Verify rater was part of this job
    is_contractor = job["contractor_id"] == current_user["id"]
    is_crew = current_user["id"] in job.get("crew_accepted", [])
    if not (is_contractor or is_crew):
        raise HTTPException(status_code=403, detail="Not part of this job")

    # Check no duplicate rating
    existing = await db.ratings.find_one({
        "job_id": job_id,
        "rater_id": current_user["id"],
        "rated_id": data.rated_id
    })
    if existing:
        raise HTTPException(status_code=400, detail="Already rated this person for this job")

    if not 1 <= data.stars <= 5:
        raise HTTPException(status_code=400, detail="Stars must be 1-5")

    rating_doc = {
        "id": str(uuid.uuid4()),
        "rater_id": current_user["id"],
        "rated_id": data.rated_id,
        "job_id": job_id,
        "stars": data.stars,
        "review": data.review,
        "created_at": now_str()
    }
    await db.ratings.insert_one(rating_doc)

    # Update average rating
    all_ratings = await db.ratings.find({"rated_id": data.rated_id}, {"_id": 0}).to_list(1000)
    avg = sum(r["stars"] for r in all_ratings) / len(all_ratings)
    await db.users.update_one(
        {"id": data.rated_id},
        {"$set": {"rating": round(avg, 1), "rating_count": len(all_ratings)}}
    )

    return {"message": "Rating submitted", "rating": {k: v for k, v in rating_doc.items() if k != "_id"}}


@router.get("/{job_id}/ratings")
async def get_job_ratings(job_id: str, current_user: dict = Depends(get_current_user)):
    ratings = await db.ratings.find({"job_id": job_id}, {"_id": 0}).to_list(100)
    return ratings


# ─── Contractor: Cancel / Suspend Job ─────────────────────────────────────────

@router.post("/{job_id}/cancel")
async def cancel_job(job_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    from pydantic import BaseModel
    from typing import Optional

    body = await request.json() if request.headers.get("content-type") == "application/json" else {}
    reason = body.get("reason", "") if isinstance(body, dict) else ""

    job = await db.jobs.find_one({"id": job_id}, {"_id": 0})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    is_contractor = job["contractor_id"] == current_user["id"]
    is_admin = current_user.get("role") in ("admin", "super_admin")
    if not (is_contractor or is_admin):
        raise HTTPException(status_code=403, detail="Only the contractor can cancel this job")

    if job["status"] in ("completed", "cancelled"):
        raise HTTPException(status_code=400, detail=f"Cannot cancel a {job['status']} job")

    # Keep job visible for 12h after cancel (admin-defined)
    settings = await db.settings.find_one({}, {"_id": 0}) or {}
    visibility_hours = settings.get("job_visibility_hours", 12)
    expires_at = (datetime.now(timezone.utc) + timedelta(hours=visibility_hours)).isoformat()

    await db.jobs.update_one(
        {"id": job_id},
        {"$set": {"status": "cancelled", "cancelled_at": now_str(), "cancel_reason": reason, "expires_at": expires_at}}
    )

    # Notify all accepted crew via in-app notification + email
    crew_ids = job.get("crew_accepted", [])
    for crew_id in crew_ids:
        crew = await db.users.find_one({"id": crew_id}, {"_id": 0, "email": 1, "name": 1})
        if crew:
            # In-app notification
            await db.notifications.insert_one({
                "id": str(uuid.uuid4()),
                "user_id": crew_id,
                "type": "job_cancelled",
                "title": "Job Cancelled",
                "message": f'"{job["title"]}" has been cancelled by the contractor. {reason}',
                "job_id": job_id,
                "read": False,
                "created_at": now_str()
            })
            # Email notification
            from utils.email_utils import send_job_cancelled_email
            await send_job_cancelled_email(crew["email"], crew["name"], job["title"], reason)

    return {"message": "Job cancelled. Crew has been notified.", "crew_notified": len(crew_ids)}


@router.post("/{job_id}/suspend")
async def suspend_job(job_id: str, current_user: dict = Depends(get_current_user)):
    job = await db.jobs.find_one({"id": job_id}, {"_id": 0})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    is_contractor = job["contractor_id"] == current_user["id"]
    is_admin = current_user.get("role") in ("admin", "super_admin")
    if not (is_contractor or is_admin):
        raise HTTPException(status_code=403, detail="Only the contractor can suspend this job")

    if job["status"] in ("completed", "cancelled", "suspended"):
        raise HTTPException(status_code=400, detail=f"Cannot suspend a {job['status']} job")

    await db.jobs.update_one(
        {"id": job_id},
        {"$set": {"status": "suspended", "suspended_at": now_str(), "previous_status": job["status"]}}
    )

    # Notify crew
    crew_ids = job.get("crew_accepted", [])
    for crew_id in crew_ids:
        await db.notifications.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": crew_id,
            "type": "job_suspended",
            "title": "Job Paused",
            "message": f'"{job["title"]}" has been temporarily paused by the contractor.',
            "job_id": job_id,
            "read": False,
            "created_at": now_str()
        })

    return {"message": "Job suspended. Crew has been notified.", "crew_notified": len(crew_ids)}


@router.post("/{job_id}/resume")
async def resume_job(job_id: str, current_user: dict = Depends(get_current_user)):
    job = await db.jobs.find_one({"id": job_id}, {"_id": 0})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if job["contractor_id"] != current_user["id"] and current_user.get("role") not in ("admin", "super_admin"):
        raise HTTPException(status_code=403, detail="Not authorized")

    if job["status"] != "suspended":
        raise HTTPException(status_code=400, detail="Job is not suspended")

    prev_status = job.get("previous_status", "open")
    await db.jobs.update_one({"id": job_id}, {"$set": {"status": prev_status}})
    return {"message": "Job resumed", "status": prev_status}


# ─── Notifications ─────────────────────────────────────────────────────────────

@router.get("/notifications/me")
async def get_notifications(current_user: dict = Depends(get_current_user)):
    notifs = await db.notifications.find(
        {"user_id": current_user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).limit(50).to_list(50)
    unread = sum(1 for n in notifs if not n.get("read"))
    return {"notifications": notifs, "unread": unread}


@router.post("/notifications/read-all")
async def mark_all_read(current_user: dict = Depends(get_current_user)):
    await db.notifications.update_many(
        {"user_id": current_user["id"], "read": False},
        {"$set": {"read": True}}
    )
    return {"message": "All notifications marked as read"}


@router.post("/notifications/{notif_id}/read")
async def mark_one_read(notif_id: str, current_user: dict = Depends(get_current_user)):
    await db.notifications.update_one(
        {"id": notif_id, "user_id": current_user["id"]},
        {"$set": {"read": True}}
    )
    return {"message": "Marked as read"}


# ─── AI Matching trigger ───────────────────────────────────────────────────────

@router.post("/{job_id}/ai-match")
async def trigger_ai_match(job_id: str, current_user: dict = Depends(get_current_user)):
    """Manually trigger AI matching for a job (contractors and admins)."""
    job = await db.jobs.find_one({"id": job_id}, {"_id": 0})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if job["contractor_id"] != current_user["id"] and current_user.get("role") not in ("admin", "super_admin"):
        raise HTTPException(status_code=403, detail="Not authorized")

    matched = await _run_ai_match(job)
    return {"message": f"AI matching complete. {matched} crew notified.", "notified": matched}


async def _run_ai_match(job: dict) -> int:
    """Background task: AI match crew for job, send notifications."""
    try:
        from utils.ai_utils import ai_match_crew_for_job
        crew = await db.users.find(
            {"role": "crew", "is_active": True, "availability": True},
            {"_id": 0, "id": 1, "name": 1, "trade": 1, "skills": 1, "rating": 1, "location": 1, "availability": 1}
        ).to_list(100)

        if not crew:
            return 0

        matches = await ai_match_crew_for_job(job, crew)
        notified = 0
        for m in matches:
            if not m.get("notify"):
                continue
            crew_id = m.get("crew_id")
            if not crew_id:
                continue
            existing = await db.notifications.find_one({"user_id": crew_id, "job_id": job["id"], "type": "job_match"})
            if existing:
                continue
            score_pct = int(m.get("score", 0) * 100)
            await db.notifications.insert_one({
                "id": str(uuid.uuid4()),
                "user_id": crew_id,
                "type": "job_match",
                "title": "New Job Match",
                "message": f'"{job["title"]}" — {score_pct}% match. {m.get("reason", "")}',
                "job_id": job["id"],
                "score": m.get("score", 0),
                "read": False,
                "created_at": now_str()
            })
            notified += 1
        return notified
    except Exception as e:
        logger.error(f"AI match background error: {e}")
        return 0


# ─── Crew Invites ─────────────────────────────────────────────────────────────

@router.post("/{job_id}/invite")
async def invite_crew(job_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    """Contractor invites specific crew members to a job."""
    job = await db.jobs.find_one({"id": job_id}, {"_id": 0})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job["contractor_id"] != current_user["id"] and current_user.get("role") not in ("admin", "super_admin"):
        raise HTTPException(status_code=403, detail="Not your job")

    body = await request.json()
    crew_ids = body.get("crew_ids", [])
    if not crew_ids or not isinstance(crew_ids, list):
        raise HTTPException(status_code=400, detail="crew_ids array required")
    crew_ids = crew_ids[:10]  # max 10 invites at once

    sent = 0
    for crew_id in crew_ids:
        crew_member = await db.users.find_one({"id": crew_id, "role": "crew"}, {"_id": 0, "id": 1, "name": 1})
        if not crew_member:
            continue
        existing = await db.notifications.find_one({"user_id": crew_id, "job_id": job_id, "type": "job_invite"})
        if existing:
            continue
        await db.notifications.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": crew_id,
            "type": "job_invite",
            "title": "You've Been Invited",
            "message": f'{current_user.get("company_name") or current_user["name"]} invited you to "{job["title"]}"',
            "job_id": job_id,
            "read": False,
            "created_at": now_str()
        })
        sent += 1

    return {"message": f"Invites sent to {sent} crew members", "sent": sent}

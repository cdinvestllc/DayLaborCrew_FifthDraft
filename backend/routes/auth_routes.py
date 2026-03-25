import uuid
import random
import string
import secrets
import httpx
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException, status, Request, Response
from database import db
from models import UserCreate, UserLogin, ForgotPasswordRequest, ResetPasswordRequest
from auth import hash_password, verify_password, create_token, user_to_response
from utils.email_utils import send_welcome_email, send_password_reset_email
import os
import logging

router = APIRouter()
logger = logging.getLogger(__name__)


def generate_referral_code(length: int = 8) -> str:
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))


def trial_end(days: int = 30) -> str:
    return (datetime.now(timezone.utc) + timedelta(days=days)).isoformat()


@router.post("/register", status_code=201)
async def register(data: UserCreate):
    existing = await db.users.find_one({"email": data.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    if data.role not in ("crew", "contractor"):
        raise HTTPException(status_code=400, detail="Role must be crew or contractor")

    code = generate_referral_code()
    while await db.users.find_one({"referral_code": code}):
        code = generate_referral_code()

    trial_days = int(os.environ.get("TRIAL_DAYS", 30))
    if data.role == "contractor":
        trial_days = int(os.environ.get("CONTRACTOR_TRIAL_DAYS", 14))
    now = datetime.now(timezone.utc).isoformat()

    user_doc = {
        "id": str(uuid.uuid4()),
        "email": data.email.lower(),
        "password_hash": hash_password(data.password),
        "role": data.role,
        "name": data.name,
        "phone": data.phone,
        "is_active": True,
        "is_verified": False,
        "agreed_to_terms": data.agreed_to_terms,
        "created_at": now,
        "trial_start_date": now,
        "trial_end_date": trial_end(trial_days),
        "trial_type": data.role,  # "crew" or "contractor"
        "subscription_status": "trial",
        "subscription_plan": None,
        "subscription_end": None,
        "points": 50,
        "referral_code": code,
        "referred_by": None,
        "bio": "",
        "trade": "",
        "skills": [],
        "profile_photo": None,
        "availability": True,
        "transportation": None,
        "location": None,
        "rating": 0.0,
        "rating_count": 0,
        "jobs_completed": 0,
        "company_name": data.company_name or "",
        "logo": None,
        "hide_location": False,
        "favorite_crew": [],
        "auth_provider": "email",
    }

    if data.referral_code_used:
        referrer = await db.users.find_one({"referral_code": data.referral_code_used})
        if referrer:
            user_doc["referred_by"] = referrer["id"]
            await db.users.update_one({"id": referrer["id"]}, {"$inc": {"points": 100}})
            await db.referrals.insert_one({
                "id": str(uuid.uuid4()),
                "referrer_id": referrer["id"],
                "referred_id": user_doc["id"],
                "points_awarded": 100,
                "created_at": now
            })

    await db.users.insert_one(user_doc)
    token = create_token({"sub": user_doc["id"], "role": user_doc["role"]})
    await send_welcome_email(data.name, data.email, data.role)

    return {"access_token": token, "token_type": "bearer", "user": user_to_response(user_doc)}


@router.post("/login")
async def login(data: UserLogin):
    user = await db.users.find_one({"email": data.email.lower()}, {"_id": 0})
    if not user or not verify_password(data.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.get("is_active", True):
        raise HTTPException(status_code=403, detail="Account suspended. Contact support.")

    token = create_token({"sub": user["id"], "role": user["role"]})
    return {"access_token": token, "token_type": "bearer", "user": user_to_response(user)}


# ─── Forgot Password ─────────────────────────────────────────────────────────

@router.post("/forgot-password")
async def forgot_password(data: ForgotPasswordRequest):
    # Case-insensitive email lookup
    user = await db.users.find_one({"email": data.email.lower()}, {"_id": 0})
    # Always return 200 to prevent email enumeration
    if not user:
        return {"message": "If that email is registered, a reset link has been sent."}

    # Generate secure reset token
    token = secrets.token_urlsafe(32)
    expires = (datetime.now(timezone.utc) + timedelta(hours=2)).isoformat()

    await db.password_resets.update_one(
        {"email": data.email.lower()},
        {"$set": {"token": token, "expires_at": expires, "used": False}},
        upsert=True
    )

    await send_password_reset_email(user["email"], user.get("name", "User"), token)

    return {"message": "If that email is registered, a reset link has been sent."}


@router.post("/reset-password")
async def reset_password(data: ResetPasswordRequest):
    reset_doc = await db.password_resets.find_one({"token": data.token})
    if not reset_doc:
        raise HTTPException(status_code=400, detail="Invalid or expired reset link")
    if reset_doc.get("used"):
        raise HTTPException(status_code=400, detail="Reset link already used")

    expires = reset_doc.get("expires_at", "")
    try:
        exp_dt = datetime.fromisoformat(expires)
        if exp_dt.tzinfo is None:
            exp_dt = exp_dt.replace(tzinfo=timezone.utc)
        if exp_dt < datetime.now(timezone.utc):
            raise HTTPException(status_code=400, detail="Reset link has expired")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid reset link")

    if len(data.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    await db.users.update_one(
        {"email": reset_doc["email"]},
        {"$set": {"password_hash": hash_password(data.new_password)}}
    )
    await db.password_resets.update_one({"token": data.token}, {"$set": {"used": True}})

    return {"message": "Password reset successfully. You can now log in."}


# ─── Google OAuth ─────────────────────────────────────────────────────────────

@router.post("/google/callback")
async def google_oauth_callback(request: Request):
    body = await request.json()
    session_id = body.get("session_id")
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")

    # Exchange session_id with Emergent Auth (must be called from backend)
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            res = await client.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": session_id}
            )
        if res.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid OAuth session")
        oauth_data = res.json()
    except httpx.RequestError as e:
        logger.error(f"OAuth session exchange failed: {e}")
        raise HTTPException(status_code=503, detail="OAuth service unavailable")

    email = oauth_data.get("email", "").lower()
    name = oauth_data.get("name", "")
    picture = oauth_data.get("picture", "")

    if not email:
        raise HTTPException(status_code=400, detail="No email from OAuth provider")

    # Find or create user (email is case-insensitive)
    user = await db.users.find_one({"email": email}, {"_id": 0})

    now = datetime.now(timezone.utc).isoformat()
    trial_days = int(os.environ.get("TRIAL_DAYS", 30))

    if not user:
        code = generate_referral_code()
        while await db.users.find_one({"referral_code": code}):
            code = generate_referral_code()

        user_doc = {
            "id": str(uuid.uuid4()),
            "email": email,
            "password_hash": None,
            "role": "crew",  # Default role for Google OAuth users
            "name": name,
            "phone": None,
            "is_active": True,
            "is_verified": True,  # Google already verified email
            "agreed_to_terms": True,
            "created_at": now,
            "trial_start_date": now,
            "trial_end_date": trial_end(trial_days),
            "subscription_status": "trial",
            "subscription_plan": None,
            "subscription_end": None,
            "points": 50,
            "referral_code": code,
            "referred_by": None,
            "bio": "",
            "trade": "",
            "skills": [],
            "profile_photo": picture,
            "availability": True,
            "transportation": None,
            "location": None,
            "rating": 0.0,
            "rating_count": 0,
            "jobs_completed": 0,
            "company_name": "",
            "logo": None,
            "hide_location": False,
            "favorite_crew": [],
            "auth_provider": "google",
        }
        await db.users.insert_one(user_doc)
        user = user_doc
        await send_welcome_email(name, email, "crew")
    else:
        # Update profile photo if not set
        if picture and not user.get("profile_photo"):
            await db.users.update_one({"email": email}, {"$set": {"profile_photo": picture}})
            user["profile_photo"] = picture

    if not user.get("is_active", True):
        raise HTTPException(status_code=403, detail="Account suspended")

    token = create_token({"sub": user["id"], "role": user["role"]})
    return {"access_token": token, "token_type": "bearer", "user": user_to_response(user)}

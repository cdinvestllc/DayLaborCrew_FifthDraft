from fastapi import FastAPI, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
import uuid
from auth import hash_password
from database import db

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

app = FastAPI(title="TheDayLaborers API", version="2.0.0", redirect_slashes=False)

api_router = APIRouter(prefix="/api")

# Import routers
from routes.auth_routes import router as auth_router
from routes.job_routes import router as job_router
from routes.user_routes import router as user_router
from routes.admin_routes import router as admin_router
from routes.payment_routes import router as payment_router
from routes.ws_routes import router as ws_router
from routes.public_routes import router as public_router
from routes.advertiser_routes import router as advertiser_router

# Register routes
api_router.include_router(auth_router, prefix="/auth", tags=["auth"])
api_router.include_router(job_router, prefix="/jobs", tags=["jobs"])
api_router.include_router(user_router, prefix="/users", tags=["users"])
api_router.include_router(admin_router, prefix="/admin", tags=["admin"])
api_router.include_router(payment_router, prefix="/payments", tags=["payments"])
api_router.include_router(public_router, prefix="/public", tags=["public"])
api_router.include_router(advertiser_router, prefix="/advertisers", tags=["advertisers"])
api_router.include_router(ws_router)

@api_router.get("/")
async def root():
    return {"message": "TheDayLaborers API v2", "status": "operational"}

app.include_router(api_router)

# Static files
uploads_dir = ROOT_DIR / "uploads"
uploads_dir.mkdir(exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(uploads_dir)), name="uploads")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@app.on_event("startup")
async def startup_event():
    # Indexes
    try:
        await db.users.create_index("email", unique=True)
        await db.users.create_index("referral_code", sparse=True)
        await db.users.create_index("role")
        await db.jobs.create_index("status")
        await db.jobs.create_index("contractor_id")
        await db.jobs.create_index("created_at")
        await db.admin_activity_log.create_index("timestamp")
        await db.admin_activity_log.create_index("admin_id")
        logger.info("Database indexes created")
    except Exception as e:
        logger.warning(f"Index creation: {e}")

    # Create default Super Admin if not exists
    from datetime import datetime, timezone, timedelta
    import random, string

    super_admin_email = os.environ.get("SUPER_ADMIN_EMAIL", "superadmin@thedaylaborers.com")
    super_admin_password = os.environ.get("SUPER_ADMIN_PASSWORD", "SuperAdmin@123")
    existing_super = await db.users.find_one({"role": "super_admin"})
    if not existing_super:
        code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
        now = datetime.now(timezone.utc).isoformat()
        super_doc = {
            "id": str(uuid.uuid4()),
            "email": super_admin_email.lower(),
            "password_hash": hash_password(super_admin_password),
            "role": "super_admin",
            "name": "Super Administrator",
            "phone": None,
            "is_active": True,
            "is_verified": True,
            "created_at": now,
            "trial_start_date": now,
            "trial_end_date": (datetime.now(timezone.utc) + timedelta(days=36500)).isoformat(),
            "subscription_status": "active",
            "subscription_plan": "lifetime",
            "subscription_end": (datetime.now(timezone.utc) + timedelta(days=36500)).isoformat(),
            "points": 0,
            "referral_code": code,
            "referred_by": None,
            "bio": "", "trade": "", "skills": [], "profile_photo": None,
            "availability": True, "location": None,
            "rating": 0.0, "rating_count": 0, "jobs_completed": 0,
            "company_name": "", "logo": None, "hide_location": False, "favorite_crew": []
        }
        await db.users.insert_one(super_doc)
        logger.info(f"Super Admin created: {super_admin_email}")

    # Create default Admin if not exists
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@thedaylaborers.com")
    admin_password = os.environ.get("ADMIN_PASSWORD", "Admin@123")
    existing_admin = await db.users.find_one({"role": "admin"})
    if not existing_admin:
        code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
        now = datetime.now(timezone.utc).isoformat()
        admin_doc = {
            "id": str(uuid.uuid4()),
            "email": admin_email.lower(),
            "password_hash": hash_password(admin_password),
            "role": "admin",
            "name": "Platform Admin",
            "phone": None,
            "is_active": True,
            "is_verified": True,
            "created_at": now,
            "trial_start_date": now,
            "trial_end_date": (datetime.now(timezone.utc) + timedelta(days=36500)).isoformat(),
            "subscription_status": "active",
            "subscription_plan": "lifetime",
            "subscription_end": (datetime.now(timezone.utc) + timedelta(days=36500)).isoformat(),
            "points": 0,
            "referral_code": code,
            "referred_by": None,
            "bio": "", "trade": "", "skills": [], "profile_photo": None,
            "availability": True, "location": None,
            "rating": 0.0, "rating_count": 0, "jobs_completed": 0,
            "company_name": "", "logo": None, "hide_location": False, "favorite_crew": []
        }
        await db.users.insert_one(admin_doc)
        logger.info(f"Admin created: {admin_email}")

    # Init default settings
    existing_settings = await db.settings.find_one({})
    if not existing_settings:
        await db.settings.insert_one({
            "daily_price": 4.99,
            "weekly_price": 24.99,
            "monthly_price": 79.99,
            "trial_days": 30,
            "job_visibility_hours": 12,
            "site_name": "TheDayLaborers",
            "site_tagline": "A Blue Collar ME Company",
            "site_logo": None,
            "site_favicon": None
        })
        logger.info("Default settings created")

    # Init default trades
    existing_trades = await db.trades.count_documents({})
    if existing_trades == 0:
        default_trades = [
            "General Labor", "Carpentry", "Electrical", "Plumbing", "HVAC",
            "Painting", "Roofing", "Landscaping", "Concrete/Masonry", "Welding",
            "Flooring", "Drywall", "Demolition", "Moving/Hauling", "Cleaning",
            "Fencing", "Tile Work", "Insulation", "Glass/Windows", "Other"
        ]
        now = datetime.now(timezone.utc).isoformat()
        trade_docs = [
            {"id": str(uuid.uuid4()), "name": t, "is_active": True, "created_at": now}
            for t in default_trades
        ]
        await db.trades.insert_many(trade_docs)
        logger.info(f"Default trades created: {len(trade_docs)}")

    # Init CMS content
    cms_pages = ["terms", "privacy", "guidelines"]
    for page in cms_pages:
        existing = await db.cms.find_one({"page": page})
        if not existing:
            await db.cms.insert_one({
                "page": page,
                "title": {"terms": "Terms & Conditions", "privacy": "Privacy Policy", "guidelines": "Community Guidelines"}[page],
                "content": f"Default {page} content. Edit this in the Admin CMS.",
                "version": 1,
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "published": True
            })

    logger.info("TheDayLaborers API v2 started successfully")


@app.on_event("shutdown")
async def shutdown_db_client():
    from database import client
    client.close()

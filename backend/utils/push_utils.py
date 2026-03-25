"""Push notification sender using pywebpush / VAPID."""
import os
import json
import logging
from pywebpush import webpush, WebPushException

logger = logging.getLogger(__name__)

VAPID_PRIVATE_KEY = os.environ.get("VAPID_PRIVATE_KEY", "")
VAPID_PUBLIC_KEY = os.environ.get("VAPID_PUBLIC_KEY", "")
VAPID_SUBJECT = os.environ.get("VAPID_SUBJECT", "mailto:admin@thedaylaborers.com")


async def send_push_to_user(db, user_id: str, title: str, body: str, url: str = "/", icon: str = "/logo192.png"):
    """Send a push notification to all subscriptions belonging to user_id."""
    if not VAPID_PRIVATE_KEY or not VAPID_PUBLIC_KEY:
        logger.debug("VAPID keys not configured, skipping push")
        return

    subscriptions = await db.push_subscriptions.find({"user_id": user_id}, {"_id": 0}).to_list(20)
    if not subscriptions:
        return

    payload = json.dumps({"title": title, "body": body, "url": url, "icon": icon})
    failed = []

    for sub in subscriptions:
        try:
            webpush(
                subscription_info={
                    "endpoint": sub["endpoint"],
                    "keys": sub.get("keys", {})
                },
                data=payload,
                vapid_private_key=VAPID_PRIVATE_KEY,
                vapid_claims={"sub": VAPID_SUBJECT},
            )
        except WebPushException as e:
            status = e.response.status_code if e.response is not None else 0
            # 410 Gone or 404 = subscription expired, remove it
            if status in (404, 410):
                failed.append(sub["endpoint"])
            else:
                logger.warning(f"Push failed for {sub['endpoint'][:40]}: {e}")
        except Exception as e:
            logger.warning(f"Push error: {e}")

    # Clean up expired subscriptions
    for endpoint in failed:
        await db.push_subscriptions.delete_one({"endpoint": endpoint})


async def send_push_notification(db, user_id: str, event_type: str, job_title: str = "", crew_name: str = ""):
    """High-level helper that maps event types to human-readable messages."""
    messages = {
        "job_accepted": ("Job Accepted!", f"{crew_name or 'A crew member'} accepted your job '{job_title}'", "/contractor/dashboard"),
        "job_declined": ("Job Declined", f"{crew_name or 'A crew member'} declined job '{job_title}'", "/contractor/dashboard"),
        "job_completed": ("Job Complete!", f"Crew marked '{job_title}' as complete. Please verify.", "/contractor/dashboard"),
        "job_available": ("New Job Available!", f"A new job has been posted: {job_title}", "/crew/dashboard"),
    }
    if event_type not in messages:
        return
    title, body, url = messages[event_type]
    await send_push_to_user(db, user_id, title, body, url)

from fastapi import APIRouter, Depends, HTTPException
from prisma.prisma_client import Prisma
from datetime import datetime, timedelta, timezone
from dependencies import get_db
from security_deps import get_current_user_email

router = APIRouter(prefix="/notifications", tags=["notifications"])

@router.get("")
async def list_notifications(
    db: Prisma = Depends(get_db),
    user_email: str = Depends(get_current_user_email)
):
    user = await db.user.find_unique(where={"email": user_email})

    notifs = await db.notification.find_many(
        where={"userId": user.id},
        order={"createdAt": "desc"},
        take=50,
        include={"event": True},
    )

    return {"notifications": notifs}


@router.post("/{notif_id}/read")
async def mark_notification_read(
    notif_id: int,
    db: Prisma = Depends(get_db),
    user_email: str = Depends(get_current_user_email)
):
    user = await db.user.find_unique(where={"email": user_email})

    notif = await db.notification.find_unique(where={"id": notif_id})
    if not notif or notif.userId != user.id:
        raise HTTPException(status_code=404, detail="Notification not found")

    await db.notification.update(
        where={"id": notif_id},
        data={"readAt": datetime.now(timezone.utc)},
    )

    return {"ok": True}

async def generate_upcoming_notifications(db: Prisma) -> None:
    now = datetime.now(timezone.utc)
    today = now.date()

    targets = {
        14: "EVENT_UPCOMING_14",
        7: "EVENT_UPCOMING_7",
        1: "EVENT_UPCOMING_1",
    }

    for days_ahead, notif_type in targets.items():
        target_date = today + timedelta(days=days_ahead)

        start_dt = datetime.combine(
            target_date, datetime.min.time(), tzinfo=timezone.utc
        )
        end_dt = start_dt + timedelta(days=1)

        saved_events = await db.savedevent.find_many(
            where={
                "event": {
                    "startTime": {
                        "gte": start_dt,
                        "lt": end_dt,
                    }
                }
            },
            include={"event": True},
        )

        for saved in saved_events:
            exists = await db.notification.find_first(
                where={
                    "userId": saved.userId,
                    "eventId": saved.eventId,
                    "type": notif_type,
                }
            )
            if exists:
                continue

            # Format message
            if days_ahead == 14:
                msg = "in 2 weeks"
            elif days_ahead == 7:
                msg = "in 7 days"
            else:
                msg = "in 1 day"

            await db.notification.create(
                data={
                    "userId": saved.userId,
                    "eventId": saved.eventId,
                    "type": notif_type,
                    "message": f"Reminder: '{saved.event.title}' is {msg}.",
                }
            )
    yesterday = today - timedelta(days=1)
    y_start = datetime.combine(
        yesterday, datetime.min.time(), tzinfo=timezone.utc
    )
    y_end = y_start + timedelta(days=1)

    past_saved = await db.savedevent.find_many(
        where={
            "event": {
                "startTime": {
                    "gte": y_start,
                    "lt": y_end,
                }
            }
        },
        include={"event": True},
    )

    for saved in past_saved:
        exists = await db.notification.find_first(
            where={
                "userId": saved.userId,
                "eventId": saved.eventId,
                "type": "EVENT_PAST",
            }
        )
        if exists:
            continue

        await db.notification.create(
            data={
                "userId": saved.userId,
                "eventId": saved.eventId,
                "type": "EVENT_PAST",
                "message": f"'{saved.event.title}' has already passed.",
            }
        )

@router.post("/run-daily")
async def run_daily_notifications(
    db: Prisma = Depends(get_db)
):
    await generate_upcoming_notifications(db)
    return {"ok": True}

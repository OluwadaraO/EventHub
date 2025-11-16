from fastapi import APIRouter, Depends, HTTPException
from prisma.prisma_client import Prisma
from datetime import datetime, timezone
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

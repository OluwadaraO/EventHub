from fastapi import APIRouter, Depends, HTTPException
from prisma.prisma_client import Prisma
from typing import List
from dependencies import get_db
from security_deps import get_current_user_email

from models_events import ScrapeIn, EventOut, SaveEventIn
from scraping import scrape_event


router = APIRouter(prefix="/events", tags=["events"])


# ------------------------------------------------------
# 1) SCRAPE + UPSERT EVENT
# ------------------------------------------------------
@router.post("/scrape", response_model=EventOut)
async def scrape_and_upsert(
    payload: ScrapeIn,
    db: Prisma = Depends(get_db),
    user_email: str = Depends(get_current_user_email)
):
    # -------------------------------------------
    # 1) Find user
    # -------------------------------------------
    user = await db.user.find_unique(where={"email": user_email})

    # -------------------------------------------
    # 2) Check if event exists BEFORE upsert
    #    (Used later to decide if it's new)
    # -------------------------------------------
    existing = await db.event.find_unique(where={"url": str(payload.url)})

    # -------------------------------------------
    # 3) Scrape the website
    # -------------------------------------------
    data = await scrape_event(str(payload.url))

    if not data:
        raise HTTPException(500, "Scraper returned no data")

    # -------------------------------------------
    # 4) Upsert source + venue + event
    # (your existing code here...)
    # -------------------------------------------

    source = await db.eventsource.upsert(
        where={"domain": data["source"]},
        data={
            "create": {"domain": data["source"], "label": data["source"]},
            "update": {},
        }
    )

    v = data.get("venue") or {}
    venue_id = None

    if any(v.values()):
        venue = await db.venue.create(
            data={
                "name": v.get("name"),
                "street": v.get("street"),
                "city": v.get("city"),
                "state": v.get("state"),
                "country": v.get("country"),
                "lat": v.get("lat"),
                "lng": v.get("lng"),
            }
        )
        venue_id = venue.id

    ev = await db.event.upsert(
        where={"url": str(payload.url)},
        data={
            "create": {
                "title": data["title"],
                "description": data.get("description"),
                "url": str(payload.url),
                "imageUrl": data.get("imageUrl"),
                "startTime": data.get("startTime"),
                "endTime": data.get("endTime"),
                "timezone": data.get("timezone"),
                "price": data.get("price"),
                "isFree": data.get("isFree"),
                "venueId": venue_id,
                "sourceId": source.id,
            },
            "update": {
                "title": data["title"],
                "description": data.get("description"),
                "imageUrl": data.get("imageUrl"),
                "startTime": data.get("startTime"),
                "endTime": data.get("endTime"),
                "timezone": data.get("timezone"),
                "price": data.get("price"),
                "isFree": data.get("isFree"),
                "venueId": venue_id,
                "sourceId": source.id,
            }
        },
        include={"venue": True}
    )

    # ----------------------------------------------------------
    # ⭐ 5) USE `existing` HERE
    # Create a notification **ONLY IF** this event is new
    # ----------------------------------------------------------
    if existing is None:
        await db.notification.create(
            data={
                "userId": user.id,
                "eventId": ev.id,
                "type": "EVENT_CREATED",
                "message": f"You added a new event: '{ev.title}'."
            }
        )

    # ----------------------------------------------------------
    # 6) Check if user saved it before (your normal logic)
    # ----------------------------------------------------------
    saved = await db.savedevent.find_first(
        where={"userId": user.id, "eventId": ev.id}
    )

    return EventOut(
        id=ev.id,
        title=ev.title,
        url=ev.url,
        imageUrl=ev.imageUrl,
        startTime=ev.startTime,
        endTime=ev.endTime,
        venue=(
            ev.venue and {
                "id": ev.venue.id,
                "name": ev.venue.name,
                "city": ev.venue.city,
                "state": ev.venue.state
            }
        ),
        saved=bool(saved)
    )


# ------------------------------------------------------
# 2) LIST ALL EVENTS
# ------------------------------------------------------
@router.get("", response_model=List[EventOut])
async def list_events(
    db: Prisma = Depends(get_db),
    user_email: str = Depends(get_current_user_email)
):

    user = await db.user.find_unique(where={"email": user_email})
    rows = await db.event.find_many(
        include={"venue": True},
        order={"startTime": "asc"}
    )

    saved_ids = set([
        s.eventId for s in await db.savedevent.find_many(
            where={"userId": user.id}
        )
    ])

    out = []
    for ev in rows:
        out.append(
            EventOut(
                id=ev.id,
                title=ev.title,
                url=ev.url,
                imageUrl=ev.imageUrl,
                startTime=ev.startTime,
                endTime=ev.endTime,
                venue=(
                    ev.venue and {
                        "id": ev.venue.id,
                        "name": ev.venue.name,
                        "city": ev.venue.city,
                        "state": ev.venue.state
                    }
                ),
                saved=(ev.id in saved_ids)
            )
        )

    return out


# ------------------------------------------------------
# 3) SAVE EVENT
# ------------------------------------------------------
@router.post("/save")
async def save_event(
    payload: SaveEventIn,
    db: Prisma = Depends(get_db),
    user_email: str = Depends(get_current_user_email)
):

    user = await db.user.find_unique(where={"email": user_email})

    ev = await db.event.find_unique(where={"id": payload.eventId})
    if not ev:
        raise HTTPException(404, "Event not found")
    
    already_saved = await db.savedevent.find_first(
        where={"userId": user.id, "eventId": ev.id}
    )
    await db.savedevent.upsert(
        where={"userId_eventId": {"userId": user.id, "eventId": ev.id}},
        data={
            "create": {"userId": user.id, "eventId": ev.id},
            "update": {}
        }
    )
    if not already_saved:
        await db.notification.create(
            data={
                "userId": user.id,
                "eventId": ev.id,
                "type": "EVENT_SAVED",
                "message": f"You saved '{ev.title}'."
            }
        )
    return {"ok": True}


# ------------------------------------------------------
# 4) UNSAVE EVENT
# ------------------------------------------------------
@router.delete("/save/{event_id}")
async def unsave_event(
    event_id: int,
    db: Prisma = Depends(get_db),
    user_email: str = Depends(get_current_user_email)
):

    user = await db.user.find_unique(where={"email": user_email})

    row = await db.savedevent.find_first(
        where={"userId": user.id, "eventId": event_id}
    )

    if row:
        await db.savedevent.delete(where={"id": row.id})

    return {"ok": True}


# ------------------------------------------------------
# 5) LIST SAVED EVENTS BY USER
# ------------------------------------------------------
@router.get("/saved", response_model=List[EventOut])
async def list_saved(
    db: Prisma = Depends(get_db),
    user_email: str = Depends(get_current_user_email)
):

    user = await db.user.find_unique(where={"email": user_email})

    saved = await db.savedevent.find_many(
        where={"userId": user.id},
        include={"event": {"include": {"venue": True}}}
    )

    return [
        EventOut(
            id=s.event.id,
            title=s.event.title,
            url=s.event.url,
            imageUrl=s.event.imageUrl,
            startTime=s.event.startTime,
            endTime=s.event.endTime,
            venue=(
                s.event.venue and {
                    "id": s.event.venue.id,
                    "name": s.event.venue.name,
                    "city": s.event.venue.city,
                    "state": s.event.venue.state
                }
            ),
            saved=True
        )
        for s in saved
    ]

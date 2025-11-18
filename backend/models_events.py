from pydantic import BaseModel, HttpUrl
from typing import Optional
from datetime import datetime


class ScrapeIn(BaseModel):
    url: HttpUrl


class VenueOut(BaseModel):
    id: int
    name: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None


class EventOut(BaseModel):
    id: int
    title: str
    url: str
    imageUrl: Optional[str] = None
    startTime: Optional[datetime] = None
    endTime: Optional[datetime] = None
    venue: Optional[VenueOut] = None
    saved: bool = False


class SaveEventIn(BaseModel):
    eventId: int

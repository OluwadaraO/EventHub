import re, json, datetime, urllib.parse
from typing import Optional, Dict, Any, List
from bs4 import BeautifulSoup
from dateutil import parser as dtparse
import httpx

def _first(obj, *keys):
    for k in keys:
        v = obj.get(k)
        if v:
            return v
    return None

def _parse_when(v: Any) -> Optional[datetime.datetime]:
    if not v:
        return None
    try:
        return dtparse.parse(v)
    except Exception:
        return None

def _extract_jsonld_events(soup: BeautifulSoup) -> List[Dict[str, Any]]:
    events = []
    for tag in soup.find_all("script", type="application/ld+json"):
        try:
            data = json.loads(tag.string or "")
            blobs = data if isinstance(data, list) else [data]
            for b in blobs:
                typ = b.get("@type") or b.get("@type".lower())
                if isinstance(typ, list):
                    is_event = any(t.lower() == "event" for t in typ if isinstance(t, str))
                else:
                    is_event = isinstance(typ, str) and typ.lower() == "event"
                if is_event:
                    events.append(b)
        except Exception:
            continue
    return events

async def scrape_event(url: str) -> Dict[str, Any]:
    async with httpx.AsyncClient(follow_redirects=True, timeout=20) as client:
        resp = await client.get(url, headers={"User-Agent":"Mozilla/5.0 EventHubBot"})
        resp.raise_for_status()
        html = resp.text

    soup = BeautifulSoup(html, "lxml")

    jsonld_events = _extract_jsonld_events(soup)
    if jsonld_events:
        e = jsonld_events[0]
        offers = e.get("offers") or {}
        loc = e.get("location") or {}
        if isinstance(loc, list): loc = loc[0] or {}
        addr = loc.get("address") or {}
        if isinstance(addr, list): addr = addr[0] or {}

        return {
            "title": _first(e, "name"),
            "description": _first(e, "description"),
            "imageUrl": _first(e, "image"),
            "startTime": _parse_when(_first(e, "startDate", "startTime")),
            "endTime": _parse_when(_first(e, "endDate", "endTime")),
            "timezone": None,  # JSON-LD often encodes TZ in ISO string
            "price": _first(offers, "price", "priceCurrency", "url"),
            "isFree": str(offers.get("price", "")).strip() in ("0", "", "0.0"),
            "venue": {
                "name": _first(loc, "name"),
                "street": _first(addr, "streetAddress"),
                "city": _first(addr, "addressLocality"),
                "state": _first(addr, "addressRegion"),
                "country": _first(addr, "addressCountry"),
                "lat": float(loc.get("geo", {}).get("latitude")) if loc.get("geo") else None,
                "lng": float(loc.get("geo", {}).get("longitude")) if loc.get("geo") else None,
            },
            "tags": [t for t in (e.get("eventAttendanceMode"), e.get("eventStatus")) if t],
            "source": urllib.parse.urlparse(url).hostname or "",
        }

    def get_meta(p):
        el = soup.find("meta", property=p) or soup.find("meta", attrs={"name": p})
        return el["content"].strip() if el and el.get("content") else None

    title = get_meta("og:title") or (soup.title.string.strip() if soup.title else None)
    desc = get_meta("og:description") or get_meta("description")
    img = get_meta("og:image")
    text = soup.get_text(" ", strip=True)
    candidates = re.findall(r"\b(?:\w{3,9}\s+\d{1,2},\s+\d{4}|\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2})\b", text)
    start = _parse_when(candidates[0]) if candidates else None
    end = _parse_when(candidates[1]) if len(candidates) > 1 else None

    venue_name = None
    for label in ["Venue", "Location", "Where"]:
        m = re.search(rf"{label}[:\-]\s*(.+?)\s{1,3}(\||\n|$)", text)
        if m:
            venue_name = m.group(1)[:120]
            break

    return {
        "title": title or "Untitled Event",
        "description": desc,
        "imageUrl": img,
        "startTime": start,
        "endTime": end,
        "timezone": None,
        "price": None,
        "isFree": None,
        "venue": {"name": venue_name},
        "tags": [],
        "source": urllib.parse.urlparse(url).hostname or "",
    }

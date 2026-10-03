from datetime import date, datetime
from zoneinfo import ZoneInfo

import httpx
from fastapi import Depends, FastAPI, HTTPException, status

from backend import altegio
from backend.auth import check_password, create_token, require_auth
from backend.config import Settings, get_settings
from backend.schemas import BookingsResponse, ClientResponse, LoginRequest, LoginResponse

MAX_RANGE_DAYS = 366

app = FastAPI(title="Altegio Admin", docs_url="/api/docs", openapi_url="/api/openapi.json")


def today(settings: Settings) -> date:
    return datetime.now(ZoneInfo(settings.timezone)).date()


def commission(total: int, settings: Settings) -> int | None:
    return round(total * settings.commission_percent / 100) if settings.commission_percent else None


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/api/auth/login")
def login(body: LoginRequest, settings: Settings = Depends(get_settings)) -> LoginResponse:
    if not settings.auth_secret or not check_password(body.password, settings):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Wrong password")
    return LoginResponse(token=create_token(settings.auth_secret))


@app.get("/api/bookings", dependencies=[Depends(require_auth)])
def bookings(
    date_from: date | None = None,
    date_to: date | None = None,
    settings: Settings = Depends(get_settings),
    client: httpx.Client = Depends(altegio.get_client),
) -> BookingsResponse:
    date_from = date_from or today(settings)
    date_to = date_to or date_from
    if date_to < date_from:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "date_to is before date_from")
    if (date_to - date_from).days >= MAX_RANGE_DAYS:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Date range is limited to one year")

    try:
        items = altegio.get_bookings(client, settings, date_from, date_to)
    except altegio.AltegioError as e:
        raise HTTPException(e.status, str(e)) from e

    total = sum(b.price for b in items)
    return BookingsResponse(
        date_from=date_from,
        date_to=date_to,
        total_amd=total,
        count=len(items),
        commission_percent=settings.commission_percent,
        commission_amd=commission(total, settings),
        bookings=items,
    )


@app.get("/api/clients/{client_id}", dependencies=[Depends(require_auth)])
def client_details(
    client_id: int,
    settings: Settings = Depends(get_settings),
    client: httpx.Client = Depends(altegio.get_client),
) -> ClientResponse:
    now = today(settings)
    try:
        info, items = altegio.get_client_history(client, settings, client_id, now)
    except altegio.AltegioError as e:
        raise HTTPException(e.status, str(e)) from e

    past = [b.date for b in items if b.date <= now]
    upcoming = [b.date for b in items if b.date > now]
    total = sum(b.price for b in items)
    return ClientResponse(
        client=info,
        total_amd=total,
        count=len(items),
        commission_percent=settings.commission_percent,
        commission_amd=commission(total, settings),
        first_visit=items[0].date if items else None,
        last_visit=max(past) if past else None,
        next_visit=min(upcoming) if upcoming else None,
        bookings=list(reversed(items)),
    )

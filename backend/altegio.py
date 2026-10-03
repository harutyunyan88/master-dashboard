"""Altegio API client: fetches her records and maps them to dashboard bookings."""

import ssl
from collections.abc import Iterator
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

import certifi
import httpx

from backend.config import Settings
from backend.schemas import Booking, ClientInfo, Service

BASE_URL = "https://api.alteg.io/api/v1"
PAGE_SIZE = 200
CLIENT_HISTORY_START = date(2015, 1, 1)
# Cloudflare in front of the API rejects default client user agents (error 1010).
USER_AGENT = "AltegioAdminDashboard/1.0"

# Altegio `attendance`: 1 = client came, 2 = confirmed, 0 = waiting, -1 = no-show
STATUS_BY_ATTENDANCE = {1: "completed", 2: "confirmed", 0: "pending"}


class AltegioError(Exception):
    def __init__(self, status: int, message: str):
        super().__init__(message)
        self.status = status


def get_client() -> Iterator[httpx.Client]:
    """FastAPI dependency; tests override it with a mock transport."""
    # Trust both the OS certificate store (so machines whose antivirus/proxy re-signs HTTPS still
    # connect) and certifi's bundle (so minimal Linux hosts like Vercel have a full CA list).
    ssl_context = ssl.create_default_context()
    ssl_context.load_verify_locations(certifi.where())
    with httpx.Client(base_url=BASE_URL, timeout=20, headers={"User-Agent": USER_AGENT}, verify=ssl_context) as client:
        yield client


def fetch_records(
    client: httpx.Client, settings: Settings, date_from: date, date_to: date, client_id: int | None = None
) -> list[dict]:
    company = settings.altegio_company_id
    path = f"/records/{company}" if settings.altegio_api_style == "classic" else f"/locations/{company}/appointments"
    headers = {
        "Authorization": f"Bearer {settings.altegio_partner_token}, User {settings.altegio_user_token}",
        "Accept": "application/vnd.api.v2+json",
    }
    records: list[dict] = []
    page = 1
    while True:
        params = {
            "staff_id": settings.altegio_staff_id,
            "start_date": date_from.isoformat(),
            "end_date": date_to.isoformat(),
            "page": page,
            "count": PAGE_SIZE,
        }
        if client_id is not None:
            params["client_id"] = client_id
        try:
            response = client.get(path, params=params, headers=headers)
        except httpx.HTTPError as e:
            raise AltegioError(502, f"Altegio is unreachable: {e}") from e
        if response.status_code in (401, 403):
            raise AltegioError(502, "Altegio rejected the tokens or the account lacks permission to read records")
        if response.status_code >= 400:
            raise AltegioError(502, f"Altegio error {response.status_code}")
        batch = response.json().get("data") or []
        records.extend(batch)
        if len(batch) < PAGE_SIZE:
            return records
        page += 1


def map_record(raw: dict, tz: ZoneInfo) -> Booking | None:
    """Returns None for bookings that don't count (cancelled, no-show, or a calendar block)."""
    attendance = raw.get("attendance")
    if raw.get("deleted") or attendance == -1:
        return None
    # Blocked time (meetings, breaks) is stored as a record with no client and no services.
    if not raw.get("client") and not raw.get("services"):
        return None
    services = [
        Service(
            name=s.get("title") or "—",
            price=int(s["cost_to_pay"] if s.get("cost_to_pay") is not None else s.get("cost") or 0),
        )
        for s in raw.get("services") or []
    ]
    client = raw.get("client") or {}
    local = datetime.fromisoformat(raw["datetime"]).astimezone(tz)
    return Booking(
        id=raw["id"],
        datetime=raw["datetime"],
        date=local.date(),
        time=local.strftime("%H:%M"),
        client_id=client.get("id"),
        client_name=client.get("display_name") or client.get("name") or "—",
        client_phone=format_phone(client.get("phone")),
        services=services,
        price=sum(s.price for s in services),
        status=STATUS_BY_ATTENDANCE.get(attendance, "pending"),
    )


def format_phone(phone: str | None) -> str | None:
    """Altegio stores numbers as bare digits ("37498..."); show them in international form."""
    if not phone:
        return None
    phone = phone.strip()
    return phone if phone.startswith("+") else f"+{phone}"


def map_client(raw: dict) -> ClientInfo:
    tags = [t.get("title") or t.get("name") for t in raw.get("client_tags") or [] if isinstance(t, dict)]
    return ClientInfo(
        id=raw["id"],
        name=raw.get("display_name") or raw.get("name") or "—",
        phone=format_phone(raw.get("phone")),
        email=raw.get("email") or None,
        card=raw.get("card") or None,
        discount=raw.get("discount") or 0,
        success_visits_count=raw.get("success_visits_count") or 0,
        fail_visits_count=raw.get("fail_visits_count") or 0,
        is_new=bool(raw.get("is_new")),
        tags=[t for t in tags if t],
    )


def _map_all(raws: list[dict], settings: Settings) -> list[Booking]:
    tz = ZoneInfo(settings.timezone)
    return sorted((b for raw in raws if (b := map_record(raw, tz))), key=lambda b: b.datetime)


def get_bookings(client: httpx.Client, settings: Settings, date_from: date, date_to: date) -> list[Booking]:
    return _map_all(fetch_records(client, settings, date_from, date_to), settings)


def get_client_history(
    client: httpx.Client, settings: Settings, client_id: int, today: date
) -> tuple[ClientInfo, list[Booking]]:
    """Her bookings with one client (all time up to a year ahead), plus the client's details.

    A staff account can't open the Altegio client card (403), so details come from the
    client object embedded in the newest booking.
    """
    raws = fetch_records(client, settings, CLIENT_HISTORY_START, today + timedelta(days=365), client_id=client_id)
    with_client = [r for r in raws if (r.get("client") or {}).get("id") == client_id]
    if not with_client:
        raise AltegioError(404, "Client not found")
    newest = max(with_client, key=lambda r: r["datetime"])
    return map_client(newest["client"]), _map_all(with_client, settings)

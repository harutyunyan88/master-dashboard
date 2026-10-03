from datetime import date
from zoneinfo import ZoneInfo

import httpx
import pytest
from fastapi.testclient import TestClient

from backend import altegio, main
from backend.auth import create_token, verify_token
from backend.config import Settings, get_settings

SETTINGS = Settings(
    _env_file=None,
    altegio_partner_token="p",
    altegio_user_token="u",
    altegio_company_id="1269031",
    altegio_staff_id="2830221",
    app_password="secret-pass",
    auth_secret="s" * 32,
    commission_percent=None,
)
YEREVAN = ZoneInfo("Asia/Yerevan")


def record(id_, dt, services, attendance=2, deleted=False, client_name="Anna", client_id=7):
    return {
        "id": id_,
        "datetime": dt,
        "attendance": attendance,
        "deleted": deleted,
        "client": {"id": client_id, "name": client_name, "display_name": client_name, "phone": "37498000000"},
        "services": [{"title": t, "cost": c, "cost_to_pay": c} for t, c in services],
    }


@pytest.fixture
def api():
    """Returns (TestClient, list of captured Altegio requests, setter for fake Altegio pages)."""
    pages: list[list[dict]] = [[]]
    calls: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        calls.append(request)
        page = int(request.url.params.get("page", "1"))
        data = pages[page - 1] if page <= len(pages) else []
        return httpx.Response(200, json={"success": True, "data": data})

    def fake_client():
        with httpx.Client(base_url=altegio.BASE_URL, transport=httpx.MockTransport(handler)) as c:
            yield c

    def set_pages(*new_pages):
        pages[:] = list(new_pages)

    main.app.dependency_overrides[get_settings] = lambda: SETTINGS
    main.app.dependency_overrides[altegio.get_client] = fake_client
    client = TestClient(main.app)
    client.headers["Authorization"] = f"Bearer {create_token(SETTINGS.auth_secret)}"
    yield client, calls, set_pages
    main.app.dependency_overrides.clear()


def test_totals_exclude_cancelled_and_no_shows(api):
    client, calls, set_pages = api
    set_pages([
        record(1, "2026-10-04T16:00:00+04:00", [("Manicure", 8000), ("Pedicure", 17000)]),
        record(2, "2026-10-04T09:00:00+04:00", [("Pedicure", 13000)], attendance=1),
        record(3, "2026-10-04T11:00:00+04:00", [("Manicure", 5000)], attendance=-1),
        record(4, "2026-10-04T12:00:00+04:00", [("Manicure", 7000)], deleted=True),
    ])
    body = client.get("/api/bookings", params={"date_from": "2026-10-04"}).json()

    assert body["total_amd"] == 38000
    assert body["count"] == 2
    assert body["commission_amd"] is None
    first, second = body["bookings"]
    assert (first["time"], first["status"], first["price"]) == ("09:00", "completed", 13000)
    assert (second["time"], second["status"], second["price"]) == ("16:00", "confirmed", 25000)
    assert (second["client_id"], second["client_phone"]) == (7, "+37498000000")
    assert second["services"] == [{"name": "Manicure", "price": 8000}, {"name": "Pedicure", "price": 17000}]

    params = calls[0].url.params
    assert calls[0].url.path == "/api/v1/records/1269031"
    assert (params["staff_id"], params["start_date"], params["end_date"]) == ("2830221", "2026-10-04", "2026-10-04")
    assert calls[0].headers["Authorization"] == "Bearer p, User u"


def test_paginates_until_short_page(api):
    client, calls, set_pages = api
    full = [record(i, "2026-10-01T10:00:00+04:00", [("X", 1000)]) for i in range(altegio.PAGE_SIZE)]
    set_pages(full, [record(999, "2026-10-02T10:00:00+04:00", [("X", 500)])])
    body = client.get("/api/bookings", params={"date_from": "2026-10-01", "date_to": "2026-10-31"}).json()

    assert body["count"] == altegio.PAGE_SIZE + 1
    assert body["total_amd"] == altegio.PAGE_SIZE * 1000 + 500
    assert len(calls) == 2


def test_commission_when_configured(api):
    client, _, set_pages = api
    main.app.dependency_overrides[get_settings] = lambda: SETTINGS.model_copy(update={"commission_percent": 40})
    set_pages([record(1, "2026-10-04T10:00:00+04:00", [("X", 10000)])])
    body = client.get("/api/bookings", params={"date_from": "2026-10-04"}).json()
    assert (body["commission_percent"], body["commission_amd"]) == (40, 4000)


def test_phone_format():
    assert altegio.format_phone("37498989898") == "+37498989898"
    assert altegio.format_phone("+37498989898") == "+37498989898"
    assert altegio.format_phone("") is None


def test_client_details(api, monkeypatch):
    client, calls, set_pages = api
    monkeypatch.setattr(main, "today", lambda settings: date(2026, 10, 4))
    set_pages([
        record(1, "2026-08-01T10:00:00+04:00", [("Manicure", 10000)], attendance=1),
        record(2, "2026-10-01T10:00:00+04:00", [("Pedicure", 15000)], attendance=1),
        record(3, "2026-10-10T10:00:00+04:00", [("Manicure", 12000)]),
        record(4, "2026-09-01T10:00:00+04:00", [("Manicure", 9000)], attendance=-1),
    ])
    body = client.get("/api/clients/7").json()

    assert calls[0].url.params["client_id"] == "7"
    assert calls[0].url.params["staff_id"] == "2830221"
    assert body["client"]["name"] == "Anna"
    assert body["client"]["phone"] == "+37498000000"
    assert (body["count"], body["total_amd"]) == (3, 37000)
    assert (body["first_visit"], body["last_visit"], body["next_visit"]) == ("2026-08-01", "2026-10-01", "2026-10-10")
    assert [b["id"] for b in body["bookings"]] == [3, 2, 1]


def test_client_not_found(api):
    client, _, set_pages = api
    set_pages([])
    assert client.get("/api/clients/999").status_code == 404


def test_calendar_blocks_are_skipped():
    block = record(1, "2026-10-03T20:30:00+04:00", [], attendance=0)
    block["client"] = None
    assert altegio.map_record(block, YEREVAN) is None


def test_cost_falls_back_when_cost_to_pay_missing():
    raw = record(1, "2026-10-04T10:00:00+04:00", [])
    raw["services"] = [{"title": "X", "cost": 9000}]
    assert altegio.map_record(raw, YEREVAN).price == 9000


def test_local_date_uses_salon_timezone():
    # 22:30 UTC on Oct 3 is already Oct 4 in Yerevan
    booking = altegio.map_record(record(1, "2026-10-03T22:30:00+00:00", [("X", 1)]), YEREVAN)
    assert (booking.date, booking.time) == (date(2026, 10, 4), "02:30")


def test_default_date_is_today_in_yerevan(api, monkeypatch):
    client, calls, _ = api
    monkeypatch.setattr(main, "today", lambda settings: date(2026, 10, 4))
    body = client.get("/api/bookings").json()
    assert body["date_from"] == body["date_to"] == "2026-10-04"
    assert calls[0].url.params["start_date"] == "2026-10-04"


def test_invalid_ranges(api):
    client, _, _ = api
    assert client.get("/api/bookings", params={"date_from": "2026-10-05", "date_to": "2026-10-01"}).status_code == 400
    assert client.get("/api/bookings", params={"date_from": "2025-01-01", "date_to": "2026-10-01"}).status_code == 400


def test_altegio_permission_error_becomes_502(api):
    client, _, _ = api

    def denied():
        transport = httpx.MockTransport(lambda r: httpx.Response(403, json={"success": False}))
        with httpx.Client(base_url=altegio.BASE_URL, transport=transport) as c:
            yield c

    main.app.dependency_overrides[altegio.get_client] = denied
    response = client.get("/api/bookings", params={"date_from": "2026-10-04"})
    assert response.status_code == 502
    assert "permission" in response.json()["detail"]


def test_requires_auth(api):
    client, calls, _ = api
    assert client.get("/api/bookings", headers={"Authorization": ""}).status_code == 401
    assert client.get("/api/bookings", headers={"Authorization": "Bearer forged.token"}).status_code == 401
    assert calls == []


def test_login(api):
    client, _, _ = api
    assert client.post("/api/auth/login", json={"password": "wrong"}).status_code == 401
    token = client.post("/api/auth/login", json={"password": "secret-pass"}).json()["token"]
    assert verify_token(token, SETTINGS.auth_secret)


def test_token_expires():
    token = create_token("k", now=1000)
    assert verify_token(token, "k", now=1001)
    assert not verify_token(token, "k", now=1000 + 31 * 24 * 3600)
    assert not verify_token(token, "other-key", now=1001)

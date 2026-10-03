"""Interactive Altegio setup: gets the user token, company id and staff id, checks record access,
and writes everything to .env. Run with `npm run altegio:setup`.

Her Altegio password is only used for one POST /auth call and is never stored.
Uses only the standard library so it runs before any dependencies are installed.
"""

import json
import secrets
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import date, timedelta
from getpass import getpass
from pathlib import Path

BASE_URL = "https://api.alteg.io/api/v1"
ROOT = Path(__file__).resolve().parent.parent
ENV_PATH = ROOT / ".env"
SAMPLE_PATH = ROOT / "altegio_sample.json"


class ApiError(Exception):
    def __init__(self, status: int, message: str):
        super().__init__(f"HTTP {status}: {message}")
        self.status = status


def read_env() -> dict[str, str]:
    env: dict[str, str] = {}
    if ENV_PATH.exists():
        for line in ENV_PATH.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, value = line.split("=", 1)
                env[key.strip()] = value.strip()
    return env


def write_env(env: dict[str, str]) -> None:
    ENV_PATH.write_text("".join(f"{k}={v}\n" for k, v in env.items()), encoding="utf-8")


def request(method: str, path: str, partner: str, user: str | None = None,
            params: dict | None = None, body: dict | None = None):
    url = f"{BASE_URL}{path}"
    if params:
        url += "?" + urllib.parse.urlencode(params)
    auth = f"Bearer {partner}" + (f", User {user}" if user else "")
    headers = {
        "Authorization": auth,
        "Accept": "application/vnd.api.v2+json",
        "Content-Type": "application/json",
        # Cloudflare in front of the API blocks the default "Python-urllib" user agent (error 1010).
        "User-Agent": "AltegioAdminDashboard/1.0",
    }
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            payload = json.loads(resp.read().decode() or "{}")
    except urllib.error.HTTPError as e:
        raw = e.read().decode(errors="replace")
        try:
            message = json.loads(raw).get("meta", {}).get("message") or raw
        except (ValueError, AttributeError):
            message = raw
        raise ApiError(e.code, message[:300]) from None
    if isinstance(payload, dict) and payload.get("success") is False:
        raise ApiError(200, str(payload.get("meta", {}).get("message", payload))[:300])
    return payload.get("data", payload) if isinstance(payload, dict) else payload


def try_paths(label: str, attempts: list[tuple[str, str, dict | None]], partner: str, user: str):
    """Tries each (style, path, params) in order; returns (style, data) from the first that works."""
    last_error: ApiError | None = None
    for style, path, params in attempts:
        try:
            return style, request("GET", path, partner, user, params=params)
        except ApiError as e:
            print(f"  {label}: {path} -> {e}")
            last_error = e
    raise last_error or ApiError(0, "no attempts")


def choose(items: list[dict], label: str, name_key) -> dict:
    for i, item in enumerate(items, 1):
        print(f"  {i}. {name_key(item)}  (id {item.get('id')})")
    if len(items) == 1:
        print(f"  Only one {label}, using it.")
        return items[0]
    while True:
        answer = input(f"Pick {label} number: ").strip()
        if answer.isdigit() and 1 <= int(answer) <= len(items):
            return items[int(answer) - 1]


def redact(record: dict) -> dict:
    record = json.loads(json.dumps(record))
    client = record.get("client")
    if isinstance(client, dict):
        for key in ("phone", "email"):
            if client.get(key):
                client[key] = "***"
        # Salons store extra contacts (e.g. WhatsApp numbers) in custom fields.
        if client.get("custom_fields"):
            client["custom_fields"] = "***"
    return record


def main() -> int:
    env = read_env()
    print("=== Altegio setup ===\n")

    partner = env.get("ALTEGIO_PARTNER_TOKEN") or input("Partner token (from Altegio developer account): ").strip()
    if not partner:
        print("Partner token is required. See PLAN.md -> 'Getting the tokens and IDs'.")
        return 1
    env["ALTEGIO_PARTNER_TOKEN"] = partner

    user = env.get("ALTEGIO_USER_TOKEN")
    user_name = ""
    if user and input("User token already in .env. Reuse it? [Y/n]: ").strip().lower() != "n":
        pass
    else:
        login = input("Her Altegio login (phone or email): ").strip()
        password = getpass("Her Altegio password (hidden): ")
        try:
            data = request("POST", "/auth", partner, body={"login": login, "password": password})
        except ApiError as e:
            print(f"Login failed: {e}")
            return 1
        user = data.get("user_token")
        user_name = data.get("name") or ""
        if not user:
            print(f"Login response had no user_token: {data}")
            return 1
        print(f"Logged in as {user_name or login}.")
    env["ALTEGIO_USER_TOKEN"] = user

    print("\nFinding locations...")
    try:
        style, companies = try_paths("locations", [
            ("classic", "/companies", {"my": 1}),
            ("v2", "/locations", None),
        ], partner, user)
    except ApiError:
        print("Could not list locations. Find the number in the web app URL (app.alteg.io/timetable/<id>).")
        company_id = input("Company id: ").strip()
        style = "classic"
    else:
        company = choose(companies, "location", lambda c: c.get("title") or c.get("name"))
        company_id = str(company["id"])
    env["ALTEGIO_COMPANY_ID"] = company_id

    print("\nFinding staff...")
    try:
        _, staff = try_paths("staff", [
            ("classic", f"/company/{company_id}/staff", None),
            ("v2", f"/locations/{company_id}/team_members", None),
        ], partner, user)
    except ApiError:
        staff_id = input("Could not list staff. Enter her staff id manually: ").strip()
    else:
        match = [s for s in staff if user_name and user_name.lower() in str(s.get("name", "")).lower()]
        if len(match) == 1 and input(f"Is she '{match[0].get('name')}'? [Y/n]: ").strip().lower() != "n":
            staff_id = str(match[0]["id"])
        else:
            staff_id = str(choose(staff, "staff member", lambda s: f"{s.get('name')} - {s.get('specialization', '')}")["id"])
    env["ALTEGIO_STAFF_ID"] = staff_id

    print("\nChecking access to her bookings (last 7 days)...")
    params = {
        "staff_id": staff_id,
        "start_date": (date.today() - timedelta(days=7)).isoformat(),
        "end_date": date.today().isoformat(),
        "count": 50,
    }
    try:
        style, records = try_paths("bookings", [
            ("classic", f"/records/{company_id}", params),
            ("v2", f"/locations/{company_id}/appointments", params),
        ], partner, user)
    except ApiError as e:
        print(f"\nCannot read bookings ({e}).")
        if e.status in (401, 403):
            print("Her account lacks permission. Ask the Luxio admin to allow her role to view her own records.")
        write_env(env)
        print(f"Saved what we have to {ENV_PATH.name}.")
        return 1
    env["ALTEGIO_API_STYLE"] = style
    sample = [redact(r) for r in records[:3]]
    SAMPLE_PATH.write_text(json.dumps(sample, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"OK: {len(records)} bookings found. Sample saved to {SAMPLE_PATH.name} (phones/emails hidden).")

    if not env.get("APP_PASSWORD"):
        env["APP_PASSWORD"] = getpass("\nChoose the dashboard app password (hidden): ") or secrets.token_urlsafe(8)
    env.setdefault("AUTH_SECRET", secrets.token_hex(32))
    env.setdefault("TIMEZONE", "Asia/Yerevan")

    write_env(env)
    print(f"\nDone. Everything saved to {ENV_PATH.name}.")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print("\nCancelled.")
        sys.exit(1)

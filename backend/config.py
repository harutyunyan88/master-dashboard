from functools import lru_cache
from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    """Read from environment variables (Vercel) or the project-root .env file (local)."""

    model_config = SettingsConfigDict(env_file=ROOT / ".env", extra="ignore")

    altegio_partner_token: str = ""
    altegio_user_token: str = ""
    altegio_company_id: str = ""
    altegio_staff_id: str = ""
    # "classic" = /records/{id}; "v2" = /locations/{id}/appointments (set by scripts/check_altegio.py)
    altegio_api_style: str = "classic"

    app_password: str = ""
    auth_secret: str = ""
    timezone: str = "Asia/Yerevan"
    # Her share of each booking in percent. Set COMMISSION_PERCENT= (empty) to hide it.
    commission_percent: float | None = 40

    @field_validator("commission_percent", mode="before")
    @classmethod
    def empty_as_none(cls, value):
        return None if value == "" else value


@lru_cache
def get_settings() -> Settings:
    return Settings()

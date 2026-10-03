from datetime import date

from pydantic import BaseModel


class LoginRequest(BaseModel):
    password: str


class LoginResponse(BaseModel):
    token: str


class Service(BaseModel):
    name: str
    price: int


class Booking(BaseModel):
    id: int
    datetime: str  # ISO 8601 with offset, as Altegio returns it
    date: date  # local (salon timezone) day, for grouping
    time: str  # local "HH:MM"
    client_id: int | None
    client_name: str
    client_phone: str | None
    services: list[Service]
    price: int
    status: str  # "completed" | "confirmed" | "pending"


class BookingsResponse(BaseModel):
    date_from: date
    date_to: date
    total_amd: int
    count: int
    commission_percent: float | None
    commission_amd: int | None
    bookings: list[Booking]


class ClientInfo(BaseModel):
    id: int
    name: str
    phone: str | None
    email: str | None
    card: str | None
    discount: float
    success_visits_count: int  # salon-wide, from Altegio
    fail_visits_count: int  # salon-wide no-shows
    is_new: bool
    tags: list[str]


class ClientResponse(BaseModel):
    client: ClientInfo
    total_amd: int  # with her only, past and upcoming
    count: int
    commission_percent: float | None
    commission_amd: int | None
    first_visit: date | None
    last_visit: date | None  # latest visit up to today
    next_visit: date | None
    bookings: list[Booking]  # newest first

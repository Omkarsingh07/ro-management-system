"""
Pydantic models for the Service domain.
"""

from datetime import date, datetime
from decimal import Decimal
from typing import Literal, Optional

from pydantic import BaseModel, field_validator, model_validator

# ---------------------------------------------------------------------------
# Timezone
#
# The application is intended for India (IST = UTC+05:30).
# We use a fixed offset rather than a tz database dependency so we keep the
# install surface minimal.
# ---------------------------------------------------------------------------

from datetime import timezone, timedelta

IST = timezone(timedelta(hours=5, minutes=30))


def today_ist() -> date:
    """Return today's date in Indian Standard Time."""
    return datetime.now(tz=IST).date()


# ---------------------------------------------------------------------------
# Column order — must match the Services worksheet header row
# ---------------------------------------------------------------------------

SERVICE_COLUMNS = [
    "service_id",
    "customer_id",
    "service_date",
    "service_type",
    "technician",
    "complaint",
    "work_done",
    "next_service_date",
    "labour_charge",
    "material_charge",
    "total_amount",
    "payment_status",
    "notes",
]

SERVICE_MATERIALS_COLUMNS = [
    "service_id",
    "material_id",
    "quantity",
]


# ---------------------------------------------------------------------------
# Status helpers (calculated, never stored)
# ---------------------------------------------------------------------------

ServiceStatus = Literal["UPCOMING", "DUE_TODAY", "OVERDUE"]
CompletionStatus = Literal["COMPLETED", "PENDING"]

VALID_PAYMENT_STATUSES = {"Pending", "Paid", "Partial"}


def _calc_status(service_date: Optional[date]) -> Optional[ServiceStatus]:
    if service_date is None:
        return None
    today = today_ist()
    if service_date < today:
        return "OVERDUE"
    if service_date == today:
        return "DUE_TODAY"
    return "UPCOMING"


def _calc_completion(work_done: str) -> CompletionStatus:
    return "COMPLETED" if work_done.strip() else "PENDING"


# ---------------------------------------------------------------------------
# Request body — used for POST (create)
# ---------------------------------------------------------------------------

class ServiceIn(BaseModel):
    customer_id: str
    service_date: date
    service_type: str
    technician: Optional[str] = ""
    complaint: Optional[str] = ""
    work_done: Optional[str] = ""
    next_service_date: Optional[date] = None
    labour_charge: Optional[Decimal] = Decimal("0")
    material_charge: Optional[Decimal] = Decimal("0")
    # total_amount intentionally omitted — backend always calculates it
    payment_status: Optional[str] = "Pending"
    notes: Optional[str] = ""

    @field_validator("customer_id")
    @classmethod
    def customer_id_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("customer_id must not be empty.")
        return v

    @field_validator("service_type")
    @classmethod
    def service_type_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("service_type must not be empty.")
        return v

    @field_validator("payment_status")
    @classmethod
    def validate_payment_status(cls, v: Optional[str]) -> str:
        if not v:
            return "Pending"
        if v not in VALID_PAYMENT_STATUSES:
            raise ValueError(
                f"payment_status must be one of: {', '.join(sorted(VALID_PAYMENT_STATUSES))}"
            )
        return v

    @field_validator("labour_charge", "material_charge", mode="before")
    @classmethod
    def coerce_to_decimal(cls, v) -> Decimal:
        if v is None:
            return Decimal("0")
        try:
            return Decimal(str(v))
        except Exception:
            raise ValueError("Charge values must be numeric.")


# ---------------------------------------------------------------------------
# Request body — used for PUT (update)
# Excludes customer_id (must not change after creation).
# ---------------------------------------------------------------------------

class ServiceUpdate(BaseModel):
    service_date: date
    service_type: str
    technician: Optional[str] = ""
    complaint: Optional[str] = ""
    work_done: Optional[str] = ""
    next_service_date: Optional[date] = None
    labour_charge: Optional[Decimal] = Decimal("0")
    material_charge: Optional[Decimal] = Decimal("0")
    payment_status: Optional[str] = "Pending"
    notes: Optional[str] = ""

    @field_validator("service_type")
    @classmethod
    def service_type_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("service_type must not be empty.")
        return v

    @field_validator("payment_status")
    @classmethod
    def validate_payment_status(cls, v: Optional[str]) -> str:
        if not v:
            return "Pending"
        if v not in VALID_PAYMENT_STATUSES:
            raise ValueError(
                f"payment_status must be one of: {', '.join(sorted(VALID_PAYMENT_STATUSES))}"
            )
        return v

    @field_validator("labour_charge", "material_charge", mode="before")
    @classmethod
    def coerce_to_decimal(cls, v) -> Decimal:
        if v is None:
            return Decimal("0")
        try:
            return Decimal(str(v))
        except Exception:
            raise ValueError("Charge values must be numeric.")


# ---------------------------------------------------------------------------
# Service Completion Request
# ---------------------------------------------------------------------------

class ServiceMaterialUsageItem(BaseModel):
    material_id: str
    quantity: Decimal

    @field_validator("material_id")
    @classmethod
    def validate_material_id(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("material_id must not be empty.")
        return v

    @field_validator("quantity", mode="before")
    @classmethod
    def validate_quantity(cls, v) -> Decimal:
        if v is None:
            raise ValueError("quantity is required.")
        try:
            val = Decimal(str(v))
        except Exception:
            raise ValueError("quantity must be a valid number.")
        if val <= 0:
            raise ValueError("quantity must be greater than zero.")
        return val


class ServiceCompletionRequest(BaseModel):
    work_done: str
    next_service_date: Optional[date] = None
    materials: Optional[list[ServiceMaterialUsageItem]] = []
    notes: Optional[str] = ""

    @field_validator("work_done")
    @classmethod
    def validate_work_done(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("work_done must not be empty when completing a service.")
        return v


class ServiceMaterialUsedOut(BaseModel):
    material_id: str
    material_name: str
    quantity: float
    unit_price: float
    total: float


# ---------------------------------------------------------------------------
# Full service record — returned by the API
# ---------------------------------------------------------------------------

class ServiceOut(BaseModel):
    service_id: str
    customer_id: str
    service_date: Optional[str]          # "YYYY-MM-DD"
    service_type: str
    technician: str
    complaint: str
    work_done: str
    next_service_date: Optional[str]     # "YYYY-MM-DD" or None
    labour_charge: float
    material_charge: float
    total_amount: float
    payment_status: str
    notes: str
    # Calculated fields — not stored in Excel
    status: Optional[ServiceStatus]
    completion_status: CompletionStatus
    materials: list[ServiceMaterialUsedOut] = []

    @classmethod
    def from_excel_row(
        cls,
        row: dict,
        materials: Optional[list[ServiceMaterialUsedOut]] = None,
    ) -> "ServiceOut":
        """Convert a raw Excel row dict to a ServiceOut instance."""

        def _str(val) -> str:
            return str(val).strip() if val is not None else ""

        def _date_str(val) -> Optional[str]:
            if val is None:
                return None
            if isinstance(val, (date, datetime)):
                return val.strftime("%Y-%m-%d")
            s = str(val).strip()
            return s if s else None

        def _date_obj(val) -> Optional[date]:
            if val is None:
                return None
            if isinstance(val, datetime):
                return val.date()
            if isinstance(val, date):
                return val
            s = str(val).strip()
            if not s:
                return None
            try:
                return date.fromisoformat(s)
            except ValueError:
                return None

        def _float(val) -> float:
            if val is None:
                return 0.0
            try:
                return float(val)
            except (ValueError, TypeError):
                return 0.0

        svc_date = _date_obj(row.get("service_date"))
        work_done = _str(row.get("work_done"))

        return cls(
            service_id=_str(row.get("service_id")),
            customer_id=_str(row.get("customer_id")),
            service_date=_date_str(row.get("service_date")),
            service_type=_str(row.get("service_type")),
            technician=_str(row.get("technician")),
            complaint=_str(row.get("complaint")),
            work_done=work_done,
            next_service_date=_date_str(row.get("next_service_date")),
            labour_charge=_float(row.get("labour_charge")),
            material_charge=_float(row.get("material_charge")),
            total_amount=_float(row.get("total_amount")),
            payment_status=_str(row.get("payment_status")) or "Pending",
            notes=_str(row.get("notes")),
            status=_calc_status(svc_date),
            completion_status=_calc_completion(work_done),
            materials=materials or [],
        )


"""
Pydantic models for the Customer domain.
"""

import re
from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, field_validator, model_validator

# ---------------------------------------------------------------------------
# Column order as stored in the Excel worksheet
# (must match the header row written during Step 1 initialisation)
# ---------------------------------------------------------------------------

CUSTOMER_COLUMNS = [
    "customer_id",
    "name",
    "mobile",
    "alternate_mobile",
    "address",
    "area",
    "ro_brand",
    "ro_model",
    "installation_date",
    "technician",
    "notes",
    "created_at",
]

# ---------------------------------------------------------------------------
# Mobile number helpers
# ---------------------------------------------------------------------------

_MOBILE_RE = re.compile(r"^\d{10}$")


def _normalise_mobile(raw: str) -> str:
    """
    Strip whitespace, leading '+91' or '91', and return a 10-digit string.
    Raises ValueError for obviously invalid values.
    """
    v = raw.strip().replace(" ", "").replace("-", "")
    if v.startswith("+91"):
        v = v[3:]
    elif v.startswith("91") and len(v) == 12:
        v = v[2:]
    if not _MOBILE_RE.match(v):
        raise ValueError(
            f"'{raw}' is not a valid Indian mobile number. "
            "Expected 10 digits (optionally prefixed with +91 or 91)."
        )
    return v


# ---------------------------------------------------------------------------
# Request body — used for both POST and PUT
# ---------------------------------------------------------------------------

class CustomerIn(BaseModel):
    name: str
    mobile: str
    alternate_mobile: Optional[str] = ""
    address: Optional[str] = ""
    area: Optional[str] = ""
    ro_brand: Optional[str] = ""
    ro_model: Optional[str] = ""
    installation_date: Optional[date] = None
    technician: Optional[str] = ""
    notes: Optional[str] = ""

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("name must not be empty.")
        return v

    @field_validator("mobile")
    @classmethod
    def validate_mobile(cls, v: str) -> str:
        return _normalise_mobile(v)

    @field_validator("alternate_mobile")
    @classmethod
    def validate_alternate_mobile(cls, v: Optional[str]) -> str:
        if not v or not v.strip():
            return ""
        return _normalise_mobile(v)


# ---------------------------------------------------------------------------
# Full customer record — returned by the API
# ---------------------------------------------------------------------------

class CustomerOut(BaseModel):
    customer_id: str
    name: str
    mobile: str
    alternate_mobile: str
    address: str
    area: str
    ro_brand: str
    ro_model: str
    installation_date: Optional[str]   # "YYYY-MM-DD" or None
    technician: str
    notes: str
    created_at: str                    # ISO datetime string

    @classmethod
    def from_excel_row(cls, row: dict) -> "CustomerOut":
        """Convert a raw Excel row dict to a CustomerOut instance."""

        def _str(val) -> str:
            return str(val).strip() if val is not None else ""

        def _date_str(val) -> Optional[str]:
            if val is None:
                return None
            if isinstance(val, (date, datetime)):
                return val.strftime("%Y-%m-%d")
            s = str(val).strip()
            return s if s else None

        def _datetime_str(val) -> str:
            if val is None:
                return ""
            if isinstance(val, datetime):
                return val.strftime("%Y-%m-%dT%H:%M:%S")
            if isinstance(val, date):
                return datetime(val.year, val.month, val.day).strftime(
                    "%Y-%m-%dT%H:%M:%S"
                )
            return str(val).strip()

        return cls(
            customer_id=_str(row.get("customer_id")),
            name=_str(row.get("name")),
            mobile=_str(row.get("mobile")),
            alternate_mobile=_str(row.get("alternate_mobile")),
            address=_str(row.get("address")),
            area=_str(row.get("area")),
            ro_brand=_str(row.get("ro_brand")),
            ro_model=_str(row.get("ro_model")),
            installation_date=_date_str(row.get("installation_date")),
            technician=_str(row.get("technician")),
            notes=_str(row.get("notes")),
            created_at=_datetime_str(row.get("created_at")),
        )

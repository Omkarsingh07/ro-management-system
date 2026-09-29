"""
Pydantic models and schemas for Material & Inventory domain.
"""

from datetime import date as dt_date, datetime, timedelta, timezone
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, field_validator

# ---------------------------------------------------------------------------
# Timezone (IST = UTC+05:30)
# ---------------------------------------------------------------------------

IST = timezone(timedelta(hours=5, minutes=30))


def today_ist() -> dt_date:
    """Return today's date in Indian Standard Time."""
    return datetime.now(tz=IST).date()


# ---------------------------------------------------------------------------
# Excel column definitions
# ---------------------------------------------------------------------------

MATERIAL_COLUMNS = [
    "material_id",
    "material_name",
    "category",
    "unit",
    "current_stock",
    "minimum_stock",
    "purchase_price",
    "selling_price",
    "supplier",
]

STOCK_TRANSACTION_COLUMNS = [
    "transaction_id",
    "material_id",
    "transaction_type",
    "quantity",
    "date",
    "reference_id",
    "notes",
]


# ---------------------------------------------------------------------------
# Request Schemas
# ---------------------------------------------------------------------------

class MaterialIn(BaseModel):
    material_name: str
    category: Optional[str] = ""
    unit: str
    current_stock: Optional[Decimal] = Decimal("0")
    minimum_stock: Optional[Decimal] = Decimal("0")
    purchase_price: Optional[Decimal] = Decimal("0")
    selling_price: Optional[Decimal] = Decimal("0")
    supplier: Optional[str] = ""

    @field_validator("material_name")
    @classmethod
    def validate_material_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("material_name must not be empty.")
        return v

    @field_validator("unit")
    @classmethod
    def validate_unit(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("unit must not be empty.")
        return v

    @field_validator("current_stock", "minimum_stock", mode="before")
    @classmethod
    def validate_non_negative_qty(cls, v) -> Decimal:
        if v is None:
            return Decimal("0")
        try:
            val = Decimal(str(v))
        except Exception:
            raise ValueError("Quantity must be a valid number.")
        if val < 0:
            raise ValueError("Stock quantities cannot be negative.")
        return val

    @field_validator("purchase_price", "selling_price", mode="before")
    @classmethod
    def validate_non_negative_price(cls, v) -> Decimal:
        if v is None:
            return Decimal("0")
        try:
            val = Decimal(str(v))
        except Exception:
            raise ValueError("Price must be a valid number.")
        if val < 0:
            raise ValueError("Prices cannot be negative.")
        return val


class MaterialUpdate(BaseModel):
    """
    Schema for updating material details.
    current_stock and material_id are excluded by design to prevent
    bypassing inventory audit history.
    """
    material_name: str
    category: Optional[str] = ""
    unit: str
    minimum_stock: Optional[Decimal] = Decimal("0")
    purchase_price: Optional[Decimal] = Decimal("0")
    selling_price: Optional[Decimal] = Decimal("0")
    supplier: Optional[str] = ""

    @field_validator("material_name")
    @classmethod
    def validate_material_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("material_name must not be empty.")
        return v

    @field_validator("unit")
    @classmethod
    def validate_unit(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("unit must not be empty.")
        return v

    @field_validator("minimum_stock", mode="before")
    @classmethod
    def validate_non_negative_qty(cls, v) -> Decimal:
        if v is None:
            return Decimal("0")
        try:
            val = Decimal(str(v))
        except Exception:
            raise ValueError("Quantity must be a valid number.")
        if val < 0:
            raise ValueError("Stock quantities cannot be negative.")
        return val

    @field_validator("purchase_price", "selling_price", mode="before")
    @classmethod
    def validate_non_negative_price(cls, v) -> Decimal:
        if v is None:
            return Decimal("0")
        try:
            val = Decimal(str(v))
        except Exception:
            raise ValueError("Price must be a valid number.")
        if val < 0:
            raise ValueError("Prices cannot be negative.")
        return val


class PurchaseIn(BaseModel):
    material_id: str
    quantity: Decimal
    purchase_price: Optional[Decimal] = None
    date: Optional[dt_date] = None
    reference_id: Optional[str] = ""
    notes: Optional[str] = ""

    @field_validator("material_id")
    @classmethod
    def validate_material_id(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("material_id must not be empty.")
        return v

    @field_validator("quantity", mode="before")
    @classmethod
    def validate_positive_quantity(cls, v) -> Decimal:
        if v is None:
            raise ValueError("quantity is required.")
        try:
            val = Decimal(str(v))
        except Exception:
            raise ValueError("quantity must be a valid number.")
        if val <= 0:
            raise ValueError("Purchase quantity must be greater than zero.")
        return val

    @field_validator("purchase_price", mode="before")
    @classmethod
    def validate_optional_price(cls, v) -> Optional[Decimal]:
        if v is None or v == "":
            return None
        try:
            val = Decimal(str(v))
        except Exception:
            raise ValueError("purchase_price must be a valid number.")
        if val < 0:
            raise ValueError("purchase_price cannot be negative.")
        return val


class AdjustIn(BaseModel):
    material_id: str
    quantity: Decimal
    date: Optional[dt_date] = None
    reference_id: Optional[str] = ""
    notes: Optional[str] = ""

    @field_validator("material_id")
    @classmethod
    def validate_material_id(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("material_id must not be empty.")
        return v

    @field_validator("quantity", mode="before")
    @classmethod
    def validate_non_zero_quantity(cls, v) -> Decimal:
        if v is None:
            raise ValueError("quantity is required.")
        try:
            val = Decimal(str(v))
        except Exception:
            raise ValueError("quantity must be a valid number.")
        if val == 0:
            raise ValueError("Adjustment quantity cannot be zero.")
        return val


# ---------------------------------------------------------------------------
# Response Schemas
# ---------------------------------------------------------------------------

class MaterialOut(BaseModel):
    material_id: str
    material_name: str
    category: str
    unit: str
    current_stock: float
    minimum_stock: float
    purchase_price: float
    selling_price: float
    supplier: str
    is_low_stock: bool = False
    is_out_of_stock: bool = False

    @classmethod
    def from_excel_row(cls, row: dict) -> "MaterialOut":
        current_stock = float(row.get("current_stock") or 0)
        minimum_stock = float(row.get("minimum_stock") or 0)
        purchase_price = float(row.get("purchase_price") or 0)
        selling_price = float(row.get("selling_price") or 0)

        return cls(
            material_id=str(row.get("material_id") or "").strip(),
            material_name=str(row.get("material_name") or "").strip(),
            category=str(row.get("category") or "").strip(),
            unit=str(row.get("unit") or "").strip(),
            current_stock=current_stock,
            minimum_stock=minimum_stock,
            purchase_price=purchase_price,
            selling_price=selling_price,
            supplier=str(row.get("supplier") or "").strip(),
            is_low_stock=(current_stock <= minimum_stock),
            is_out_of_stock=(current_stock == 0),
        )


class StockTransactionOut(BaseModel):
    transaction_id: str
    material_id: str
    transaction_type: str
    quantity: float
    date: str
    reference_id: str
    notes: str
    current_stock: Optional[float] = None

    @classmethod
    def from_excel_row(cls, row: dict, current_stock: Optional[float] = None) -> "StockTransactionOut":
        raw_date = row.get("date")
        if isinstance(raw_date, datetime):
            date_str = raw_date.strftime("%Y-%m-%d")
        elif isinstance(raw_date, dt_date):
            date_str = raw_date.isoformat()
        else:
            date_str = str(raw_date or "").strip()

        return cls(
            transaction_id=str(row.get("transaction_id") or "").strip(),
            material_id=str(row.get("material_id") or "").strip(),
            transaction_type=str(row.get("transaction_type") or "").strip(),
            quantity=float(row.get("quantity") or 0),
            date=date_str,
            reference_id=str(row.get("reference_id") or "").strip(),
            notes=str(row.get("notes") or "").strip(),
            current_stock=current_stock,
        )

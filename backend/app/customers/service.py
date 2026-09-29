"""
Customer business logic.

All Excel read/write operations go through excel_store so that the
concurrency handling and file-path management remain centralised.
"""

from datetime import datetime
from typing import Optional

from app.excel_store import (
    CUSTOMERS_FILE,
    append_sheet_row,
    read_sheet,
    write_sheet_rows,
)
from app.customers.models import CUSTOMER_COLUMNS, CustomerIn, CustomerOut

_SHEET = "Customers"


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _read_all_rows() -> list[dict]:
    return read_sheet(CUSTOMERS_FILE, _SHEET)


def _next_customer_id(rows: list[dict]) -> str:
    """
    Generate the next sequential customer ID.

    Strategy:
      - Parse every existing customer_id of the form 'C<digits>'.
      - Take the maximum numeric value found.
      - Return 'C<max+1>' zero-padded to at least 3 digits.

    This is safe even after deletions because it never relies on row count.
    """
    max_num = 0
    for row in rows:
        cid = str(row.get("customer_id") or "").strip()
        if cid.startswith("C") and cid[1:].isdigit():
            max_num = max(max_num, int(cid[1:]))
    return f"C{max_num + 1:03d}"


def _row_to_excel_dict(customer_id: str, data: CustomerIn, created_at: str) -> dict:
    """Build an Excel-column-keyed dict from validated input + generated fields."""
    return {
        "customer_id": customer_id,
        "name": data.name,
        "mobile": data.mobile,
        "alternate_mobile": data.alternate_mobile or "",
        "address": data.address or "",
        "area": data.area or "",
        "ro_brand": data.ro_brand or "",
        "ro_model": data.ro_model or "",
        "installation_date": (
            data.installation_date.strftime("%Y-%m-%d")
            if data.installation_date
            else None
        ),
        "technician": data.technician or "",
        "notes": data.notes or "",
        "created_at": created_at,
    }


# ---------------------------------------------------------------------------
# Public service functions
# ---------------------------------------------------------------------------

def get_all_customers() -> list[CustomerOut]:
    rows = _read_all_rows()
    return [CustomerOut.from_excel_row(r) for r in rows]


def get_customer_by_id(customer_id: str) -> Optional[CustomerOut]:
    rows = _read_all_rows()
    for row in rows:
        if str(row.get("customer_id") or "").strip() == customer_id:
            return CustomerOut.from_excel_row(row)
    return None


def search_customers(query: str) -> list[CustomerOut]:
    """
    Case-insensitive partial match across:
      customer_id, name, mobile, area, ro_brand, ro_model
    """
    q = query.strip().lower()
    if not q:
        return get_all_customers()

    search_fields = ["customer_id", "name", "mobile", "area", "ro_brand", "ro_model"]
    results = []
    for row in _read_all_rows():
        for field in search_fields:
            val = str(row.get(field) or "").lower()
            if q in val:
                results.append(CustomerOut.from_excel_row(row))
                break
    return results


def create_customer(data: CustomerIn) -> CustomerOut:
    rows = _read_all_rows()
    customer_id = _next_customer_id(rows)
    created_at = datetime.now().strftime("%Y-%m-%dT%H:%M:%S")
    excel_row = _row_to_excel_dict(customer_id, data, created_at)

    append_sheet_row(CUSTOMERS_FILE, _SHEET, excel_row, CUSTOMER_COLUMNS)
    return CustomerOut.from_excel_row(excel_row)


def update_customer(customer_id: str, data: CustomerIn) -> Optional[CustomerOut]:
    rows = _read_all_rows()
    updated = None
    new_rows = []

    for row in rows:
        if str(row.get("customer_id") or "").strip() == customer_id:
            # Preserve customer_id and created_at; update everything else
            excel_row = _row_to_excel_dict(
                customer_id, data, str(row.get("created_at") or "")
            )
            new_rows.append(excel_row)
            updated = CustomerOut.from_excel_row(excel_row)
        else:
            new_rows.append(row)

    if updated is None:
        return None

    write_sheet_rows(CUSTOMERS_FILE, _SHEET, new_rows, CUSTOMER_COLUMNS)
    return updated


def delete_customer(customer_id: str) -> bool:
    """
    Remove the customer row from the worksheet.

    Returns True if a row was deleted, False if the customer was not found.

    NOTE: At this stage there is no service-history enforcement. This
    function is intentionally kept as a thin delete so that a future step
    can wrap it with service-history checks before calling it.
    """
    rows = _read_all_rows()
    new_rows = [r for r in rows if str(r.get("customer_id") or "").strip() != customer_id]

    if len(new_rows) == len(rows):
        return False  # nothing was removed

    write_sheet_rows(CUSTOMERS_FILE, _SHEET, new_rows, CUSTOMER_COLUMNS)
    return True

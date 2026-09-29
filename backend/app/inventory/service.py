"""
Inventory and Material business logic.

All Excel read/write operations go through excel_store so that concurrency
handling and file locking remain centralised.
"""

from decimal import Decimal
from typing import Optional

from app.excel_store import (
    MATERIALS_FILE,
    atomic_create_material,
    atomic_update_material_stock,
    read_sheet,
    write_sheet_rows,
)
from app.inventory.models import (
    MATERIAL_COLUMNS,
    STOCK_TRANSACTION_COLUMNS,
    AdjustIn,
    MaterialIn,
    MaterialOut,
    MaterialUpdate,
    PurchaseIn,
    StockTransactionOut,
    today_ist,
)

_MATERIALS_SHEET = "Materials"
_TRANSACTIONS_SHEET = "Stock_Transactions"


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _read_materials_rows() -> list[dict]:
    return read_sheet(MATERIALS_FILE, _MATERIALS_SHEET)


def _read_transactions_rows() -> list[dict]:
    return read_sheet(MATERIALS_FILE, _TRANSACTIONS_SHEET)


def _next_material_id(rows: list[dict]) -> str:
    """
    Generate next material ID (M001, M002, ...).
    Reads the highest numeric suffix in existing IDs and returns max+1.
    Never relies on row count.
    """
    max_num = 0
    for row in rows:
        mid = str(row.get("material_id") or "").strip()
        if mid.startswith("M") and mid[1:].isdigit():
            max_num = max(max_num, int(mid[1:]))
    return f"M{max_num + 1:03d}"


def _next_transaction_id(rows: list[dict]) -> str:
    """
    Generate next transaction ID (T001, T002, ...).
    Reads the highest numeric suffix in existing IDs and returns max+1.
    Never relies on row count.
    """
    max_num = 0
    for row in rows:
        tid = str(row.get("transaction_id") or "").strip()
        if tid.startswith("T") and tid[1:].isdigit():
            max_num = max(max_num, int(tid[1:]))
    return f"T{max_num + 1:03d}"


# ---------------------------------------------------------------------------
# Public Material service functions
# ---------------------------------------------------------------------------

def get_all_materials() -> list[MaterialOut]:
    """Return all materials currently in the system."""
    rows = _read_materials_rows()
    return [
        MaterialOut.from_excel_row(r)
        for r in rows
        if str(r.get("material_id") or "").strip()
    ]


def get_material_by_id(material_id: str) -> Optional[MaterialOut]:
    """Return a single material by ID, or None if not found."""
    rows = _read_materials_rows()
    for row in rows:
        if str(row.get("material_id") or "").strip() == material_id:
            return MaterialOut.from_excel_row(row)
    return None


def search_materials(query: str) -> list[MaterialOut]:
    """
    Case-insensitive partial match across:
      material_id, material_name, category, supplier
    """
    q = query.strip().lower()
    if not q:
        return get_all_materials()

    search_fields = ["material_id", "material_name", "category", "supplier"]
    results = []
    for row in _read_materials_rows():
        if not str(row.get("material_id") or "").strip():
            continue
        for field in search_fields:
            val = str(row.get(field) or "").lower()
            if q in val:
                results.append(MaterialOut.from_excel_row(row))
                break
    return results


def create_material(data: MaterialIn) -> MaterialOut:
    """
    Create a new material with an auto-generated material_id.
    If current_stock > 0, an initial stock transaction is atomically recorded.
    """
    mat_rows = _read_materials_rows()
    material_id = _next_material_id(mat_rows)

    stock_val = float(data.current_stock or 0)
    current_stock = int(stock_val) if stock_val.is_integer() else stock_val

    min_val = float(data.minimum_stock or 0)
    minimum_stock = int(min_val) if min_val.is_integer() else min_val

    p_val = float(data.purchase_price or 0)
    purchase_price = int(p_val) if p_val.is_integer() else p_val

    s_val = float(data.selling_price or 0)
    selling_price = int(s_val) if s_val.is_integer() else s_val

    material_row = {
        "material_id": material_id,
        "material_name": data.material_name,
        "category": data.category or "",
        "unit": data.unit,
        "current_stock": current_stock,
        "minimum_stock": minimum_stock,
        "purchase_price": purchase_price,
        "selling_price": selling_price,
        "supplier": data.supplier or "",
    }

    transaction_row = None
    if current_stock > 0:
        tx_rows = _read_transactions_rows()
        transaction_id = _next_transaction_id(tx_rows)
        transaction_row = {
            "transaction_id": transaction_id,
            "material_id": material_id,
            "transaction_type": "OPENING_STOCK",
            "quantity": current_stock,
            "date": today_ist().isoformat(),
            "reference_id": "OPENING",
            "notes": "Initial opening stock",
        }

    atomic_create_material(
        material_row=material_row,
        material_headers=MATERIAL_COLUMNS,
        transaction_row=transaction_row,
        transaction_headers=STOCK_TRANSACTION_COLUMNS,
    )

    return MaterialOut.from_excel_row(material_row)


def update_material(material_id: str, data: MaterialUpdate) -> Optional[MaterialOut]:
    """
    Update material metadata.
    IMPORTANT: current_stock and material_id are NOT modified here.
    """
    rows = _read_materials_rows()
    found = False
    updated_rows = []

    min_val = float(data.minimum_stock or 0)
    minimum_stock = int(min_val) if min_val.is_integer() else min_val

    p_val = float(data.purchase_price or 0)
    purchase_price = int(p_val) if p_val.is_integer() else p_val

    s_val = float(data.selling_price or 0)
    selling_price = int(s_val) if s_val.is_integer() else s_val

    target_out = None
    for row in rows:
        if str(row.get("material_id") or "").strip() == material_id:
            found = True
            # Keep original material_id and current_stock
            updated_row = {
                "material_id": material_id,
                "material_name": data.material_name,
                "category": data.category or "",
                "unit": data.unit,
                "current_stock": row.get("current_stock"),
                "minimum_stock": minimum_stock,
                "purchase_price": purchase_price,
                "selling_price": selling_price,
                "supplier": data.supplier or "",
            }
            updated_rows.append(updated_row)
            target_out = MaterialOut.from_excel_row(updated_row)
        else:
            updated_rows.append(row)

    if not found:
        return None

    write_sheet_rows(MATERIALS_FILE, _MATERIALS_SHEET, updated_rows, MATERIAL_COLUMNS)
    return target_out


# ---------------------------------------------------------------------------
# Public Inventory & Stock service functions
# ---------------------------------------------------------------------------

def purchase_stock(data: PurchaseIn) -> StockTransactionOut:
    """
    Record a stock purchase:
      1. Validates material exists.
      2. Atomically increments current_stock and writes PURCHASE transaction.
      3. If purchase_price is provided, updates material's purchase_price.
    """
    material = get_material_by_id(data.material_id)
    if material is None:
        raise KeyError(f"Material '{data.material_id}' not found.")

    tx_rows = _read_transactions_rows()
    transaction_id = _next_transaction_id(tx_rows)

    tx_date = data.date.isoformat() if data.date else today_ist().isoformat()
    qty_val = float(data.quantity)
    qty = int(qty_val) if qty_val.is_integer() else qty_val

    price_val = float(data.purchase_price) if data.purchase_price is not None else None

    transaction_row = {
        "transaction_id": transaction_id,
        "material_id": data.material_id,
        "transaction_type": "PURCHASE",
        "quantity": qty,
        "date": tx_date,
        "reference_id": data.reference_id or "",
        "notes": data.notes or "",
    }

    updated_mat, logged_tx = atomic_update_material_stock(
        material_id=data.material_id,
        stock_delta=float(data.quantity),
        transaction_row=transaction_row,
        material_headers=MATERIAL_COLUMNS,
        transaction_headers=STOCK_TRANSACTION_COLUMNS,
        new_purchase_price=price_val,
    )

    return StockTransactionOut.from_excel_row(
        logged_tx,
        current_stock=float(updated_mat.get("current_stock") or 0),
    )


def adjust_stock(data: AdjustIn) -> StockTransactionOut:
    """
    Perform a manual stock adjustment (+ or -):
      1. Validates material exists.
      2. Atomically applies delta and ensures current_stock >= 0.
      3. Records ADJUSTMENT transaction.
    """
    material = get_material_by_id(data.material_id)
    if material is None:
        raise KeyError(f"Material '{data.material_id}' not found.")

    tx_rows = _read_transactions_rows()
    transaction_id = _next_transaction_id(tx_rows)

    tx_date = data.date.isoformat() if data.date else today_ist().isoformat()
    qty_val = float(data.quantity)
    qty = int(qty_val) if qty_val.is_integer() else qty_val

    transaction_row = {
        "transaction_id": transaction_id,
        "material_id": data.material_id,
        "transaction_type": "ADJUSTMENT",
        "quantity": qty,
        "date": tx_date,
        "reference_id": data.reference_id or "",
        "notes": data.notes or "",
    }

    updated_mat, logged_tx = atomic_update_material_stock(
        material_id=data.material_id,
        stock_delta=float(data.quantity),
        transaction_row=transaction_row,
        material_headers=MATERIAL_COLUMNS,
        transaction_headers=STOCK_TRANSACTION_COLUMNS,
    )

    return StockTransactionOut.from_excel_row(
        logged_tx,
        current_stock=float(updated_mat.get("current_stock") or 0),
    )


def get_low_stock_materials() -> list[MaterialOut]:
    """Return materials where current_stock <= minimum_stock."""
    all_materials = get_all_materials()
    return [m for m in all_materials if m.current_stock <= m.minimum_stock]


def get_stock_transactions(
    material_id: Optional[str] = None,
    transaction_type: Optional[str] = None,
) -> list[StockTransactionOut]:
    """
    Return stock transactions with optional filtering by material_id and/or transaction_type.
    """
    rows = _read_transactions_rows()
    results = []

    for r in rows:
        if not str(r.get("transaction_id") or "").strip():
            continue

        if material_id:
            row_mid = str(r.get("material_id") or "").strip()
            if row_mid != material_id.strip():
                continue

        if transaction_type:
            row_ttype = str(r.get("transaction_type") or "").strip().upper()
            if row_ttype != transaction_type.strip().upper():
                continue

        results.append(StockTransactionOut.from_excel_row(r))

    return results


# ---------------------------------------------------------------------------
# Test Cleanup helpers
# ---------------------------------------------------------------------------

def delete_material_for_cleanup(material_id: str) -> None:
    """Remove a material row by ID for testing cleanup."""
    rows = _read_materials_rows()
    kept = [
        r for r in rows
        if str(r.get("material_id") or "").strip() != material_id
    ]
    write_sheet_rows(MATERIALS_FILE, _MATERIALS_SHEET, kept, MATERIAL_COLUMNS)


def delete_transactions_for_cleanup(material_id: str) -> None:
    """Remove transaction rows for a material ID for testing cleanup."""
    rows = _read_transactions_rows()
    kept = [
        r for r in rows
        if str(r.get("material_id") or "").strip() != material_id
    ]
    write_sheet_rows(MATERIALS_FILE, _TRANSACTIONS_SHEET, kept, STOCK_TRANSACTION_COLUMNS)

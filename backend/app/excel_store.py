"""
Centralised Excel access layer.

All read/write access to the Excel workbooks goes through this module.
This makes it straightforward to improve concurrency handling later
without touching business-logic code.

NOTE on concurrency:
  Excel files are not designed for concurrent writes. For this MVP we
  assume a small number of users. Every public helper opens the workbook,
  performs its operation, saves, and closes — minimising the window in
  which the file is held open. A threading.Lock per file is applied to
  serialise writes within a single process.
"""

import threading
from pathlib import Path

from openpyxl import load_workbook

# ---------------------------------------------------------------------------
# File paths  (single source of truth; imported by other modules)
# ---------------------------------------------------------------------------

import os

DATA_DIR_ENV = os.getenv("DATA_DIR")
DATA_DIR = Path(DATA_DIR_ENV).resolve() if DATA_DIR_ENV else Path(__file__).parent.parent / "data"
CUSTOMERS_FILE = DATA_DIR / "customers.xlsx"
MATERIALS_FILE = DATA_DIR / "materials.xlsx"

# ---------------------------------------------------------------------------
# Per-file write locks (RLock allows re-entrant nested acquisitions within the same thread)
# ---------------------------------------------------------------------------

_locks: dict[Path, threading.RLock] = {
    CUSTOMERS_FILE: threading.RLock(),
    MATERIALS_FILE: threading.RLock(),
}



# ---------------------------------------------------------------------------
# Public helpers
# ---------------------------------------------------------------------------

def read_sheet(file_path: Path, sheet_name: str) -> list[dict]:
    """
    Return all rows from *sheet_name* as a list of dicts keyed by the
    header row values. The header row itself is NOT included in the result.
    """
    wb = load_workbook(file_path, read_only=True, data_only=True)
    try:
        ws = wb[sheet_name]
        rows = list(ws.iter_rows(values_only=True))
        if not rows:
            return []
        headers = [str(h) for h in rows[0]]
        return [dict(zip(headers, row)) for row in rows[1:]]
    finally:
        wb.close()


def write_sheet_rows(
    file_path: Path,
    sheet_name: str,
    rows: list[dict],
    headers: list[str],
) -> None:
    """
    Overwrite *sheet_name* completely with *rows*.

    The header row is written first, then every dict in *rows* is written
    in *headers* column order.  Any key present in a dict but absent from
    *headers* is silently ignored.

    A per-file lock serialises concurrent writes within the same process.
    """
    lock = _locks[file_path]
    with lock:
        wb = load_workbook(file_path)
        ws = wb[sheet_name]

        # Clear existing content (keep the sheet object itself)
        ws.delete_rows(1, ws.max_row)

        # Write header
        ws.append(headers)

        # Write data rows
        for row in rows:
            ws.append([row.get(h) for h in headers])

        wb.save(file_path)
        wb.close()


def append_sheet_row(
    file_path: Path,
    sheet_name: str,
    row: dict,
    headers: list[str],
) -> None:
    """
    Append a single row to *sheet_name*.

    A per-file lock serialises concurrent writes within the same process.
    """
    lock = _locks[file_path]
    with lock:
        wb = load_workbook(file_path)
        ws = wb[sheet_name]
        ws.append([row.get(h) for h in headers])
        wb.save(file_path)
        wb.close()


def get_file_lock(file_path: Path) -> threading.RLock:
    """Return the threading.RLock for the specified file_path."""
    return _locks[file_path]


def atomic_create_material(
    material_row: dict,
    material_headers: list[str],
    transaction_row: dict | None = None,
    transaction_headers: list[str] | None = None,
) -> None:
    """
    Atomically append a new material row to 'Materials', and if opening stock > 0,
    append the corresponding opening stock transaction row to 'Stock_Transactions'.
    Both writes are committed together under the file lock.
    """
    lock = _locks[MATERIALS_FILE]
    with lock:
        wb = load_workbook(MATERIALS_FILE)
        mat_ws = wb["Materials"]
        mat_ws.append([material_row.get(h) for h in material_headers])

        if transaction_row and transaction_headers:
            trans_ws = wb["Stock_Transactions"]
            trans_ws.append([transaction_row.get(h) for h in transaction_headers])

        wb.save(MATERIALS_FILE)
        wb.close()


def atomic_update_material_stock(
    material_id: str,
    stock_delta: float,
    transaction_row: dict,
    material_headers: list[str],
    transaction_headers: list[str],
    new_purchase_price: float | None = None,
) -> tuple[dict, dict]:
    """
    Atomically:
      1. Find the material in the Materials sheet.
      2. Verify current_stock + stock_delta >= 0.
      3. Update current_stock (and optionally purchase_price) in Materials.
      4. Append transaction_row to Stock_Transactions.
      5. Save workbook in a single transaction under the file lock.

    Raises:
      KeyError if material_id not found.
      ValueError if stock would become negative.
    Returns:
      (updated_material_dict, appended_transaction_dict)
    """
    lock = _locks[MATERIALS_FILE]
    with lock:
        wb = load_workbook(MATERIALS_FILE)
        mat_ws = wb["Materials"]

        # Read header row
        rows = list(mat_ws.iter_rows(values_only=False))
        if not rows:
            wb.close()
            raise KeyError(f"Materials sheet is empty.")

        header_names = [str(cell.value) for cell in rows[0]]
        mid_idx = header_names.index("material_id")
        stock_idx = header_names.index("current_stock")
        price_idx = header_names.index("purchase_price") if "purchase_price" in header_names else None

        target_row_cells = None
        for row_cells in rows[1:]:
            val = str(row_cells[mid_idx].value or "").strip()
            if val == material_id:
                target_row_cells = row_cells
                break

        if target_row_cells is None:
            wb.close()
            raise KeyError(f"Material '{material_id}' not found.")

        # Read current stock
        raw_stock = target_row_cells[stock_idx].value
        current_stock = float(raw_stock or 0)
        new_stock = current_stock + stock_delta
        if new_stock < 0:
            wb.close()
            raise ValueError(
                f"Insufficient stock. Current stock is {current_stock}, cannot adjust by {stock_delta}."
            )

        # Update current_stock cell
        # Keep as int if it's a whole number
        target_row_cells[stock_idx].value = int(new_stock) if new_stock.is_integer() else new_stock

        # Update purchase_price cell if provided
        if new_purchase_price is not None and price_idx is not None:
            target_row_cells[price_idx].value = (
                int(new_purchase_price) if float(new_purchase_price).is_integer() else float(new_purchase_price)
            )

        # Build updated material dict
        updated_material = {}
        for h, cell in zip(header_names, target_row_cells):
            updated_material[h] = cell.value

        # Append transaction
        trans_ws = wb["Stock_Transactions"]
        trans_ws.append([transaction_row.get(h) for h in transaction_headers])

        wb.save(MATERIALS_FILE)
        wb.close()

        return updated_material, transaction_row


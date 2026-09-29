"""
Service business logic.

All Excel I/O goes through excel_store. Customer existence checks reuse
the customer service layer — no duplicate Excel reads.
"""
from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import Optional

from openpyxl import load_workbook

from app.excel_store import (
    CUSTOMERS_FILE,
    MATERIALS_FILE,
    append_sheet_row,
    get_file_lock,
    read_sheet,
    write_sheet_rows,
)
from app.inventory.models import (
    MATERIAL_COLUMNS,
    STOCK_TRANSACTION_COLUMNS,
)
from app.inventory.service import _next_transaction_id
from app.services.models import (
    SERVICE_COLUMNS,
    SERVICE_MATERIALS_COLUMNS,
    ServiceCompletionRequest,
    ServiceIn,
    ServiceMaterialUsedOut,
    ServiceOut,
    ServiceUpdate,
    today_ist,
)

_SHEET = "Services"
_CUSTOMER_SHEET = "Customers"
_SERVICE_MATERIALS_SHEET = "Service_Materials"



# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _read_all_rows() -> list[dict]:
    return read_sheet(CUSTOMERS_FILE, _SHEET)


def _customer_exists(customer_id: str) -> bool:
    """Return True if a matching customer row exists in the Customers sheet."""
    rows = read_sheet(CUSTOMERS_FILE, _CUSTOMER_SHEET)
    return any(
        str(r.get("customer_id") or "").strip() == customer_id for r in rows
    )


def _next_service_id(rows: list[dict]) -> str:
    """
    Generate the next sequential service ID (S001, S002, …).

    Reads the maximum existing numeric suffix and returns max+1.
    Safe after deletions — never relies on row count.
    """
    max_num = 0
    for row in rows:
        sid = str(row.get("service_id") or "").strip()
        if sid.startswith("S") and sid[1:].isdigit():
            max_num = max(max_num, int(sid[1:]))
    return f"S{max_num + 1:03d}"


def _compute_total(labour: Decimal, material: Decimal) -> Decimal:
    """Return labour + material, both treated as Decimal for exactness."""
    return (labour or Decimal("0")) + (material or Decimal("0"))


def _build_excel_row(service_id: str, customer_id: str, data: ServiceIn | ServiceUpdate) -> dict:
    labour = data.labour_charge or Decimal("0")
    material = data.material_charge or Decimal("0")
    total = _compute_total(labour, material)

    # Resolve customer_id — ServiceUpdate does not carry it; use the passed arg
    return {
        "service_id": service_id,
        "customer_id": customer_id,
        "service_date": (
            data.service_date.strftime("%Y-%m-%d") if data.service_date else None
        ),
        "service_type": data.service_type,
        "technician": data.technician or "",
        "complaint": data.complaint or "",
        "work_done": data.work_done or "",
        "next_service_date": (
            data.next_service_date.strftime("%Y-%m-%d")
            if data.next_service_date
            else None
        ),
        "labour_charge": float(labour),
        "material_charge": float(material),
        "total_amount": float(total),
        "payment_status": data.payment_status or "Pending",
        "notes": data.notes or "",
    }


# ---------------------------------------------------------------------------
# Public service functions
# ---------------------------------------------------------------------------

def _read_service_materials() -> list[dict]:
    return read_sheet(CUSTOMERS_FILE, _SERVICE_MATERIALS_SHEET)


def _get_materials_for_service(service_id: str) -> list[ServiceMaterialUsedOut]:
    """Return all materials used for a specific service, joined dynamically with materials.xlsx."""
    sm_rows = _read_service_materials()
    matching_sm = [
        r for r in sm_rows
        if str(r.get("service_id") or "").strip() == service_id
    ]
    if not matching_sm:
        return []

    mat_rows = read_sheet(MATERIALS_FILE, "Materials")
    mat_by_id = {
        str(m.get("material_id") or "").strip(): m
        for m in mat_rows
        if str(m.get("material_id") or "").strip()
    }

    result = []
    for sm in matching_sm:
        mid = str(sm.get("material_id") or "").strip()
        qty = float(sm.get("quantity") or 0)
        m_info = mat_by_id.get(mid, {})
        m_name = str(m_info.get("material_name") or mid)
        u_price = float(m_info.get("purchase_price") or 0)
        total = round(qty * u_price, 2)
        result.append(
            ServiceMaterialUsedOut(
                material_id=mid,
                material_name=m_name,
                quantity=qty,
                unit_price=u_price,
                total=total,
            )
        )
    return result


def get_all_services() -> list[ServiceOut]:
    rows = _read_all_rows()
    return [ServiceOut.from_excel_row(r) for r in rows]


def get_service_by_id(service_id: str) -> Optional[ServiceOut]:
    rows = _read_all_rows()
    for row in rows:
        if str(row.get("service_id") or "").strip() == service_id:
            materials = _get_materials_for_service(service_id)
            return ServiceOut.from_excel_row(row, materials)
    return None


def get_services_for_customer(customer_id: str) -> Optional[list[ServiceOut]]:
    """
    Return all services for *customer_id*, sorted newest-first.
    Returns None if the customer does not exist.
    """
    if not _customer_exists(customer_id):
        return None

    rows = _read_all_rows()
    matched = []
    for r in rows:
        if str(r.get("customer_id") or "").strip() == customer_id:
            sid = str(r.get("service_id") or "").strip()
            materials = _get_materials_for_service(sid)
            matched.append(ServiceOut.from_excel_row(r, materials))

    # Sort by service_date descending (None dates go last)
    def _sort_key(s: ServiceOut):
        if s.service_date is None:
            return ""
        return s.service_date  # ISO string sorts correctly

    matched.sort(key=_sort_key, reverse=True)
    return matched


def get_services_today() -> list[ServiceOut]:
    today = today_ist()
    today_str = today.strftime("%Y-%m-%d")
    rows = _read_all_rows()
    result = []
    for row in rows:
        svc = ServiceOut.from_excel_row(row)
        if svc.service_date == today_str:
            result.append(svc)
    return result


def get_services_upcoming(days: int = 7) -> list[ServiceOut]:
    """Return services scheduled from tomorrow through today+days (inclusive)."""
    today = today_ist()
    cutoff = today + timedelta(days=days)
    rows = _read_all_rows()
    result = []
    for row in rows:
        svc = ServiceOut.from_excel_row(row)
        if svc.service_date is None:
            continue
        try:
            svc_date = date.fromisoformat(svc.service_date)
        except ValueError:
            continue
        if today < svc_date <= cutoff:
            result.append(svc)
    result.sort(key=lambda s: s.service_date or "")
    return result


def get_services_overdue() -> list[ServiceOut]:
    """Return services whose service_date is strictly before today."""
    today = today_ist()
    rows = _read_all_rows()
    result = []
    for row in rows:
        svc = ServiceOut.from_excel_row(row)
        if svc.service_date is None:
            continue
        try:
            svc_date = date.fromisoformat(svc.service_date)
        except ValueError:
            continue
        if svc_date < today:
            result.append(svc)
    result.sort(key=lambda s: s.service_date or "")
    return result


def create_service(data: ServiceIn) -> Optional[ServiceOut]:
    """
    Create a service record.
    Returns None if the referenced customer does not exist.
    """
    if not _customer_exists(data.customer_id):
        return None

    rows = _read_all_rows()
    service_id = _next_service_id(rows)
    excel_row = _build_excel_row(service_id, data.customer_id, data)

    append_sheet_row(CUSTOMERS_FILE, _SHEET, excel_row, SERVICE_COLUMNS)
    return ServiceOut.from_excel_row(excel_row)


def update_service(service_id: str, data: ServiceUpdate) -> Optional[ServiceOut]:
    """
    Update an existing service. Returns None if not found.
    customer_id and service_id are immutable.
    total_amount is always recalculated from labour + material.
    """
    rows = _read_all_rows()
    updated: Optional[ServiceOut] = None
    new_rows: list[dict] = []

    for row in rows:
        if str(row.get("service_id") or "").strip() == service_id:
            # Preserve the original customer_id
            original_customer_id = str(row.get("customer_id") or "").strip()
            excel_row = _build_excel_row(service_id, original_customer_id, data)
            new_rows.append(excel_row)
            materials = _get_materials_for_service(service_id)
            updated = ServiceOut.from_excel_row(excel_row, materials)
        else:
            new_rows.append(row)

    if updated is None:
        return None

    write_sheet_rows(CUSTOMERS_FILE, _SHEET, new_rows, SERVICE_COLUMNS)
    return updated


def complete_service(service_id: str, data: ServiceCompletionRequest) -> ServiceOut:
    """
    Complete a service:
      1. Verify service exists and is not already completed.
      2. Normalize and validate requested materials and check stock availability.
      3. Calculate material cost from materials.purchase_price.
      4. Atomically update materials.xlsx (deduct stock, record SERVICE_USAGE transactions).
      5. Atomically update customers.xlsx (record Service_Materials, update Services row).
    """
    # 1. Verify service exists
    rows = _read_all_rows()
    target_service_row = None
    for r in rows:
        if str(r.get("service_id") or "").strip() == service_id:
            target_service_row = r
            break

    if target_service_row is None:
        raise KeyError(f"Service '{service_id}' not found.")

    # 2. Check if already completed
    existing_work = str(target_service_row.get("work_done") or "").strip()
    if existing_work:
        raise ValueError(f"Service {service_id} has already been completed.")

    # 3. Normalize requested materials (merge duplicate material IDs)
    requested_map: dict[str, Decimal] = {}
    for item in (data.materials or []):
        mid = item.material_id.strip()
        requested_map[mid] = requested_map.get(mid, Decimal("0")) + Decimal(str(item.quantity))

    # 4. Stock validation across ALL materials before ANY write
    mat_rows = read_sheet(MATERIALS_FILE, "Materials")
    mat_by_id = {
        str(m.get("material_id") or "").strip(): m
        for m in mat_rows
        if str(m.get("material_id") or "").strip()
    }

    for mid, qty in requested_map.items():
        if mid not in mat_by_id:
            raise KeyError(f"Material '{mid}' not found.")
        mat_data = mat_by_id[mid]
        avail = Decimal(str(mat_data.get("current_stock") or 0))
        if avail < qty:
            mat_name = mat_data.get("material_name") or mid
            raise ValueError(
                f"Insufficient stock for {mat_name}. Available: {avail}, requested: {qty}."
            )

    # 5. Calculate material cost using purchase price
    total_material_cost = Decimal("0")
    materials_used_out: list[ServiceMaterialUsedOut] = []
    for mid, qty in requested_map.items():
        m_info = mat_by_id[mid]
        p_price = Decimal(str(m_info.get("purchase_price") or 0))
        line_cost = qty * p_price
        total_material_cost += line_cost
        materials_used_out.append(
            ServiceMaterialUsedOut(
                material_id=mid,
                material_name=str(m_info.get("material_name") or mid),
                quantity=float(qty),
                unit_price=float(p_price),
                total=float(line_cost),
            )
        )

    labour = Decimal(str(target_service_row.get("labour_charge") or 0))
    total_amount = labour + total_material_cost

    # 6. Coordinated atomic write under file locks
    lock_cust = get_file_lock(CUSTOMERS_FILE)
    lock_mat = get_file_lock(MATERIALS_FILE)

    svc_date_str = str(target_service_row.get("service_date") or "").strip() or today_ist().isoformat()

    with lock_cust:
        with lock_mat:
            # 6A. Update materials.xlsx
            if requested_map:
                wb_mat = load_workbook(MATERIALS_FILE)
                ws_materials = wb_mat["Materials"]
                ws_transactions = wb_mat["Stock_Transactions"]

                mat_cells = list(ws_materials.iter_rows(values_only=False))
                headers_mat = [str(c.value) for c in mat_cells[0]]
                mid_col = headers_mat.index("material_id")
                stock_col = headers_mat.index("current_stock")

                mat_row_cells_by_id = {}
                for r in mat_cells[1:]:
                    mid_val = str(r[mid_col].value or "").strip()
                    if mid_val:
                        mat_row_cells_by_id[mid_val] = r

                tx_data_rows = list(ws_transactions.iter_rows(values_only=True))
                headers_tx = [str(h) for h in tx_data_rows[0]]
                existing_txs = [dict(zip(headers_tx, r)) for r in tx_data_rows[1:]]

                for mid, qty in requested_map.items():
                    r_cells = mat_row_cells_by_id[mid]
                    cur_stk = float(r_cells[stock_col].value or 0)
                    new_stk = cur_stk - float(qty)
                    r_cells[stock_col].value = int(new_stk) if float(new_stk).is_integer() else new_stk

                    tid = _next_transaction_id(existing_txs)
                    tx_dict = {
                        "transaction_id": tid,
                        "material_id": mid,
                        "transaction_type": "SERVICE_USAGE",
                        "quantity": -float(qty),  # Negative as required
                        "date": svc_date_str,
                        "reference_id": service_id,
                        "notes": f"Used during service {service_id}",
                    }
                    existing_txs.append(tx_dict)
                    ws_transactions.append([tx_dict.get(h) for h in STOCK_TRANSACTION_COLUMNS])

                wb_mat.save(MATERIALS_FILE)
                wb_mat.close()

            # 6B. Update customers.xlsx
            wb_cust = load_workbook(CUSTOMERS_FILE)
            ws_services = wb_cust["Services"]
            ws_svc_mat = wb_cust["Service_Materials"]

            svc_cells = list(ws_services.iter_rows(values_only=False))
            headers_svc = [str(c.value) for c in svc_cells[0]]
            svc_id_col = headers_svc.index("service_id")
            work_done_col = headers_svc.index("work_done")
            mat_charge_col = headers_svc.index("material_charge")
            tot_amount_col = headers_svc.index("total_amount")
            next_date_col = headers_svc.index("next_service_date")
            notes_col = headers_svc.index("notes")

            target_r = None
            for r in svc_cells[1:]:
                if str(r[svc_id_col].value or "").strip() == service_id:
                    target_r = r
                    break

            if target_r is not None:
                target_r[work_done_col].value = data.work_done.strip()
                target_r[mat_charge_col].value = float(total_material_cost)
                target_r[tot_amount_col].value = float(total_amount)
                if data.next_service_date:
                    target_r[next_date_col].value = data.next_service_date.isoformat()
                if data.notes:
                    target_r[notes_col].value = data.notes.strip()

            # Append to Service_Materials
            for mid, qty in requested_map.items():
                ws_svc_mat.append([service_id, mid, float(qty)])

            wb_cust.save(CUSTOMERS_FILE)
            wb_cust.close()

    # 7. Construct completed ServiceOut
    updated_dict = dict(target_service_row)
    updated_dict["work_done"] = data.work_done.strip()
    updated_dict["material_charge"] = float(total_material_cost)
    updated_dict["total_amount"] = float(total_amount)
    if data.next_service_date:
        updated_dict["next_service_date"] = data.next_service_date.isoformat()
    if data.notes:
        updated_dict["notes"] = data.notes.strip()

    return ServiceOut.from_excel_row(updated_dict, materials_used_out)


def delete_service(service_id: str) -> bool:
    """
    Hard-delete a service record and clean up associated Service_Materials rows.
    Returns True if deleted, False if not found.
    """
    rows = _read_all_rows()
    new_rows = [
        r for r in rows
        if str(r.get("service_id") or "").strip() != service_id
    ]
    if len(new_rows) == len(rows):
        return False

    lock_cust = get_file_lock(CUSTOMERS_FILE)
    with lock_cust:
        write_sheet_rows(CUSTOMERS_FILE, _SHEET, new_rows, SERVICE_COLUMNS)
        # Clean up associated Service_Materials records
        sm_rows = _read_service_materials()
        new_sm_rows = [
            r for r in sm_rows
            if str(r.get("service_id") or "").strip() != service_id
        ]
        write_sheet_rows(CUSTOMERS_FILE, _SERVICE_MATERIALS_SHEET, new_sm_rows, SERVICE_MATERIALS_COLUMNS)

    return True


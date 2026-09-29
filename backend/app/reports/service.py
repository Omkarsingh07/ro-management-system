"""
Business logic and analytics calculations for Reports domain.

Reads from customers.xlsx and materials.xlsx in a strictly read-only manner.
Never modifies Excel files or persists report cache.
"""

from collections import defaultdict
from datetime import date, datetime, timedelta
from typing import Any, Optional

from app.excel_store import (
    CUSTOMERS_FILE,
    MATERIALS_FILE,
    read_sheet,
)
from app.reports.models import (
    BusinessSummary,
    ComprehensiveReportOut,
    CustomerActivityReportItem,
    DailyServiceReportItem,
    InventoryMovementReportItem,
    InventoryStatusSnapshot,
    MaterialUsageReportItem,
    PaymentStatusSummary,
    ReportPeriod,
    ServiceTypeReportItem,
    TechnicianReportItem,
)
from app.services.models import today_ist

_CUSTOMERS_SHEET = "Customers"
_SERVICES_SHEET = "Services"
_SERVICE_MATERIALS_SHEET = "Service_Materials"
_MATERIALS_SHEET = "Materials"
_STOCK_TRANSACTIONS_SHEET = "Stock_Transactions"


def _parse_date(val: Any) -> Optional[date]:
    """Safely parse a date value from Excel/string into datetime.date."""
    if val is None:
        return None
    if isinstance(val, datetime):
        return val.date()
    if isinstance(val, date):
        return val
    s = str(val).strip()
    if not s:
        return None
    clean_s = s.split(" ")[0].split("T")[0]
    try:
        return date.fromisoformat(clean_s)
    except Exception:
        pass
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y"):
        try:
            return datetime.strptime(clean_s, fmt).date()
        except Exception:
            pass
    return None


def get_default_date_range() -> tuple[date, date]:
    """Return the start and end dates of the current month in IST."""
    today = today_ist()
    start_date = today.replace(day=1)
    if today.month == 12:
        next_month = today.replace(year=today.year + 1, month=1, day=1)
    else:
        next_month = today.replace(month=today.month + 1, day=1)
    end_date = next_month - timedelta(days=1)
    return start_date, end_date


def generate_comprehensive_report(
    from_date: date,
    to_date: date,
) -> ComprehensiveReportOut:
    """
    Generate complete business report for the given date range.

    All metrics are calculated dynamically in memory.
    """
    today = today_ist()

    # 1. Read Excel sheets once
    customer_rows = read_sheet(CUSTOMERS_FILE, _CUSTOMERS_SHEET)
    service_rows = read_sheet(CUSTOMERS_FILE, _SERVICES_SHEET)
    service_materials_rows = read_sheet(CUSTOMERS_FILE, _SERVICE_MATERIALS_SHEET)

    material_rows = read_sheet(MATERIALS_FILE, _MATERIALS_SHEET)
    stock_trans_rows = read_sheet(MATERIALS_FILE, _STOCK_TRANSACTIONS_SHEET)

    # 2. Build lookup maps
    customer_map: dict[str, dict] = {}
    for c in customer_rows:
        cid = str(c.get("customer_id") or "").strip()
        if cid:
            customer_map[cid] = c

    material_map: dict[str, dict] = {}
    for m in material_rows:
        mid = str(m.get("material_id") or "").strip()
        if mid:
            material_map[mid] = m

    # 3. Filter services by date range
    services_in_range: list[dict] = []
    service_ids_in_range: set[str] = set()

    for s in service_rows:
        svc_date = _parse_date(s.get("service_date"))
        if not svc_date:
            continue
        if from_date <= svc_date <= to_date:
            services_in_range.append(s)
            sid = str(s.get("service_id") or "").strip()
            if sid:
                service_ids_in_range.add(sid)

    # 4. Service counts & Revenue calculation
    total_services = len(services_in_range)
    completed_services = 0
    pending_services = 0
    overdue_services = 0
    total_revenue = 0.0
    highest_service_value = 0.0

    # Payment tracking
    payment_counts: dict[str, int] = defaultdict(int)
    payment_amounts: dict[str, float] = defaultdict(float)

    # Grouping trackers
    service_type_counts: dict[str, int] = defaultdict(int)
    service_type_completed: dict[str, int] = defaultdict(int)
    service_type_value: dict[str, float] = defaultdict(float)

    technician_counts: dict[str, int] = defaultdict(int)
    technician_completed: dict[str, int] = defaultdict(int)
    technician_pending: dict[str, int] = defaultdict(int)
    technician_value: dict[str, float] = defaultdict(float)

    # Customer activity in range
    # customer_id -> {service_count, completed_count, total_value, last_service_date}
    cust_activity_map: dict[str, dict] = defaultdict(
        lambda: {"service_count": 0, "completed_count": 0, "total_value": 0.0, "last_date": None}
    )

    # Daily breakdown: date_str -> {services_count, completed_count, revenue}
    daily_map: dict[str, dict] = defaultdict(
        lambda: {"services_count": 0, "completed_count": 0, "revenue": 0.0}
    )

    for s in services_in_range:
        work_done = str(s.get("work_done") or "").strip()
        is_completed = bool(work_done)
        svc_date = _parse_date(s.get("service_date"))
        date_str = svc_date.isoformat() if svc_date else ""

        try:
            total_amt = float(s.get("total_amount") or 0.0)
        except (ValueError, TypeError):
            total_amt = 0.0

        # Raw payment status normalized
        raw_pay = str(s.get("payment_status") or "").strip().lower()
        if raw_pay == "paid":
            norm_pay = "Paid"
        elif raw_pay == "partial":
            norm_pay = "Partial"
        else:
            norm_pay = "Pending"

        payment_counts[norm_pay] += 1
        payment_amounts[norm_pay] += total_amt

        # Service status classification
        if is_completed:
            completed_services += 1
            total_revenue += total_amt
            if total_amt > highest_service_value:
                highest_service_value = total_amt
        else:
            if svc_date and svc_date < today:
                overdue_services += 1
            else:
                pending_services += 1

        # Service type analysis
        stype = str(s.get("service_type") or "Regular Service").strip() or "Regular Service"
        service_type_counts[stype] += 1
        if is_completed:
            service_type_completed[stype] += 1
            service_type_value[stype] += total_amt

        # Technician analysis
        tech = str(s.get("technician") or "Unassigned").strip() or "Unassigned"
        technician_counts[tech] += 1
        if is_completed:
            technician_completed[tech] += 1
            technician_value[tech] += total_amt
        else:
            technician_pending[tech] += 1

        # Customer activity
        cid = str(s.get("customer_id") or "").strip()
        if cid:
            c_data = cust_activity_map[cid]
            c_data["service_count"] += 1
            if is_completed:
                c_data["completed_count"] += 1
                c_data["total_value"] += total_amt
            if svc_date:
                if c_data["last_date"] is None or svc_date > c_data["last_date"]:
                    c_data["last_date"] = svc_date

        # Daily timeline
        if date_str:
            d_entry = daily_map[date_str]
            d_entry["services_count"] += 1
            if is_completed:
                d_entry["completed_count"] += 1
                d_entry["revenue"] += total_amt

    # Averages
    average_service_value = (
        round(total_revenue / completed_services, 2) if completed_services > 0 else 0.0
    )

    paid_amount = payment_amounts.get("Paid", 0.0)
    pending_payment_amount = payment_amounts.get("Pending", 0.0)
    partial_payment_amount = payment_amounts.get("Partial", 0.0)
    uncollected_amount = max(0.0, total_revenue - paid_amount)

    # 5. New customers in range
    new_customers = 0
    for c in customer_rows:
        cat = _parse_date(c.get("created_at"))
        if cat and (from_date <= cat <= to_date):
            new_customers += 1

    customers_with_services = len(cust_activity_map)

    # 6. Customer activity items
    customer_activity_list: list[CustomerActivityReportItem] = []
    for cid, act in cust_activity_map.items():
        cust = customer_map.get(cid, {})
        customer_activity_list.append(
            CustomerActivityReportItem(
                customer_id=cid,
                customer_name=str(cust.get("name") or cid),
                mobile=str(cust.get("mobile") or ""),
                service_count=act["service_count"],
                completed_count=act["completed_count"],
                total_value=round(act["total_value"], 2),
                last_service_date=act["last_date"].isoformat() if act["last_date"] else None,
            )
        )
    customer_activity_list.sort(key=lambda x: (x.service_count, x.total_value), reverse=True)

    # 7. Service types report list
    service_type_list: list[ServiceTypeReportItem] = [
        ServiceTypeReportItem(
            service_type=st,
            count=service_type_counts[st],
            completed_count=service_type_completed[st],
            total_value=round(service_type_value[st], 2),
        )
        for st in sorted(service_type_counts.keys(), key=lambda k: service_type_counts[k], reverse=True)
    ]

    # 8. Technician report list
    technician_list: list[TechnicianReportItem] = [
        TechnicianReportItem(
            technician=tech,
            total_services=technician_counts[tech],
            completed_services=technician_completed[tech],
            pending_services=technician_pending[tech],
            total_value=round(technician_value[tech], 2),
        )
        for tech in sorted(technician_counts.keys(), key=lambda k: technician_counts[k], reverse=True)
    ]

    # 9. Payments report list
    payment_list: list[PaymentStatusSummary] = [
        PaymentStatusSummary(
            payment_status=st,
            count=payment_counts[st],
            total_amount=round(payment_amounts[st], 2),
        )
        for st in ["Paid", "Pending", "Partial"]
        if payment_counts[st] > 0
    ]

    # 10. Material usage for services in range
    material_usage_quantities: dict[str, float] = defaultdict(float)
    for sm in service_materials_rows:
        sid = str(sm.get("service_id") or "").strip()
        if sid in service_ids_in_range:
            mid = str(sm.get("material_id") or "").strip()
            try:
                qty = float(sm.get("quantity") or 0.0)
            except (ValueError, TypeError):
                qty = 0.0
            if mid and qty > 0:
                material_usage_quantities[mid] += qty

    material_usage_list: list[MaterialUsageReportItem] = []
    total_material_cost = 0.0

    for mid, qty in sorted(material_usage_quantities.items(), key=lambda x: x[1], reverse=True):
        mat = material_map.get(mid, {})
        mname = str(mat.get("material_name") or mid)
        unit = str(mat.get("unit") or "pcs")
        try:
            buy_price = float(mat.get("purchase_price") or 0.0)
        except (ValueError, TypeError):
            buy_price = 0.0
        cost = qty * buy_price
        total_material_cost += cost

        material_usage_list.append(
            MaterialUsageReportItem(
                material_id=mid,
                material_name=mname,
                quantity_used=qty,
                unit=unit,
                estimated_cost=round(cost, 2),
            )
        )

    # 11. Inventory Movement in range
    trans_type_counts: dict[str, int] = defaultdict(int)
    trans_type_qty: dict[str, float] = defaultdict(float)

    for tx in stock_trans_rows:
        tx_date = _parse_date(tx.get("date"))
        if tx_date and (from_date <= tx_date <= to_date):
            ttype = str(tx.get("transaction_type") or "ADJUSTMENT").strip()
            try:
                tqty = float(tx.get("quantity") or 0.0)
            except (ValueError, TypeError):
                tqty = 0.0
            trans_type_counts[ttype] += 1
            trans_type_qty[ttype] += tqty

    inventory_movement_list: list[InventoryMovementReportItem] = [
        InventoryMovementReportItem(
            transaction_type=tt,
            count=trans_type_counts[tt],
            total_quantity=round(trans_type_qty[tt], 2),
        )
        for tt in sorted(trans_type_counts.keys())
    ]

    # 12. Current Inventory Status Snapshot
    total_mats = len(material_rows)
    out_of_stock = 0
    low_stock = 0
    healthy_stock = 0

    for m in material_rows:
        try:
            cstock = float(m.get("current_stock") or 0.0)
        except (ValueError, TypeError):
            cstock = 0.0
        try:
            mstock = float(m.get("minimum_stock") or 0.0)
        except (ValueError, TypeError):
            mstock = 0.0

        if cstock <= 0:
            out_of_stock += 1
        elif cstock <= mstock:
            low_stock += 1
        else:
            healthy_stock += 1

    inv_snapshot = InventoryStatusSnapshot(
        total_materials=total_mats,
        out_of_stock_count=out_of_stock,
        low_stock_count=low_stock,
        healthy_stock_count=healthy_stock,
    )

    # 13. Daily timeline sorted ascending
    daily_timeline: list[DailyServiceReportItem] = [
        DailyServiceReportItem(
            date=d_str,
            services_count=vals["services_count"],
            completed_count=vals["completed_count"],
            revenue=round(vals["revenue"], 2),
        )
        for d_str, vals in sorted(daily_map.items(), key=lambda x: x[0])
    ]

    summary = BusinessSummary(
        total_services=total_services,
        completed_services=completed_services,
        pending_services=pending_services,
        overdue_services=overdue_services,
        total_revenue=round(total_revenue, 2),
        paid_amount=round(paid_amount, 2),
        pending_payment_amount=round(pending_payment_amount, 2),
        partial_payment_amount=round(partial_payment_amount, 2),
        uncollected_amount=round(uncollected_amount, 2),
        new_customers=new_customers,
        customers_with_services=customers_with_services,
        average_service_value=average_service_value,
        highest_service_value=round(highest_service_value, 2),
    )

    return ComprehensiveReportOut(
        period=ReportPeriod(from_date=from_date.isoformat(), to_date=to_date.isoformat()),
        summary=summary,
        payments=payment_list,
        service_types=service_type_list,
        technicians=technician_list,
        customer_activity=customer_activity_list,
        material_usage=material_usage_list,
        total_material_cost=round(total_material_cost, 2),
        inventory_movements=inventory_movement_list,
        inventory_snapshot=inv_snapshot,
        daily_timeline=daily_timeline,
    )

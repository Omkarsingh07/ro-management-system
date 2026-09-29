"""
Service layer for dynamic in-app reminders.

Calculates reminders dynamically from Services and Customers sheets in customers.xlsx.
No reminder records or reminder sheets are persisted in Excel.
"""

from datetime import date, datetime, timedelta
from typing import Any, Optional

from app.excel_store import CUSTOMERS_FILE, read_sheet
from app.reminders.models import (
    ReminderOut,
    ReminderStatus,
    ReminderSummaryOut,
    ReminderType,
)
from app.services.models import today_ist

_SERVICES_SHEET = "Services"
_CUSTOMERS_SHEET = "Customers"


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
    # Strip any time component
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


def get_all_reminders(
    status_filter: Optional[str] = None,
    reminder_type_filter: Optional[str] = None,
    days: int = 7,
) -> list[ReminderOut]:
    """
    Calculate and return all dynamic reminders.

    Sources:
      1. SCHEDULED_SERVICE: Incomplete service records (work_done is empty).
      2. NEXT_SERVICE_DUE: Completed service records (work_done is non-empty)
         that have a valid next_service_date.

    Deduplication:
      - For NEXT_SERVICE_DUE, uses the latest completed service per customer.
      - If a SCHEDULED_SERVICE and NEXT_SERVICE_DUE exist for the same customer
        on the same date, the SCHEDULED_SERVICE takes precedence.
    """
    today = today_ist()
    tomorrow = today + timedelta(days=1)
    upcoming_limit = today + timedelta(days=days)

    customer_rows = read_sheet(CUSTOMERS_FILE, _CUSTOMERS_SHEET)
    service_rows = read_sheet(CUSTOMERS_FILE, _SERVICES_SHEET)

    customer_map: dict[str, dict] = {}
    for c in customer_rows:
        cid = str(c.get("customer_id") or "").strip()
        if cid:
            customer_map[cid] = c

    # Group completed services with next_service_date by customer_id
    # to select only the latest completed service per customer.
    latest_completed_by_customer: dict[str, dict] = {}
    incomplete_services: list[dict] = []

    for s in service_rows:
        work_done = str(s.get("work_done") or "").strip()
        is_completed = bool(work_done)
        cid = str(s.get("customer_id") or "").strip()

        if is_completed:
            next_date = _parse_date(s.get("next_service_date"))
            if next_date and cid:
                # Compare completed service date to keep the latest completed service
                curr_svc_date = _parse_date(s.get("service_date")) or date.min
                existing = latest_completed_by_customer.get(cid)
                if existing is None:
                    latest_completed_by_customer[cid] = s
                else:
                    existing_svc_date = _parse_date(existing.get("service_date")) or date.min
                    if curr_svc_date >= existing_svc_date:
                        latest_completed_by_customer[cid] = s
        else:
            incomplete_services.append(s)

    scheduled_reminders: list[ReminderOut] = []
    scheduled_keys: set[tuple[str, str]] = set()  # (customer_id, date_str)

    # 1. Process SCHEDULED_SERVICE reminders (incomplete services)
    for s in incomplete_services:
        svc_date = _parse_date(s.get("service_date"))
        if not svc_date:
            continue

        cid = str(s.get("customer_id") or "").strip()
        sid = str(s.get("service_id") or "").strip()
        cust = customer_map.get(cid, {})

        date_str = svc_date.isoformat()
        diff = (svc_date - today).days

        if svc_date < today:
            rem_status: ReminderStatus = "OVERDUE"
            overdue_days: Optional[int] = (today - svc_date).days
        elif svc_date == today:
            rem_status = "DUE_TODAY"
            overdue_days = None
        elif svc_date == tomorrow:
            rem_status = "TOMORROW"
            overdue_days = None
        else:
            rem_status = "UPCOMING"
            overdue_days = None

        reminder = ReminderOut(
            reminder_id=f"{sid}-{date_str}",
            reminder_type="SCHEDULED_SERVICE",
            status=rem_status,
            date=date_str,
            days_diff=diff,
            days_overdue=overdue_days,
            service_id=sid,
            customer_id=cid,
            customer_name=str(cust.get("name") or cid),
            mobile=str(cust.get("mobile") or ""),
            address=str(cust.get("address") or ""),
            area=str(cust.get("area") or ""),
            ro_brand=str(cust.get("ro_brand") or ""),
            ro_model=str(cust.get("ro_model") or ""),
            service_type=str(s.get("service_type") or "Regular Service"),
            technician=str(s.get("technician") or ""),
            complaint=str(s.get("complaint") or ""),
            notes=str(s.get("notes") or ""),
        )
        scheduled_reminders.append(reminder)
        scheduled_keys.add((cid, date_str))

    # 2. Process NEXT_SERVICE_DUE reminders (latest completed service per customer)
    next_service_reminders: list[ReminderOut] = []
    for cid, s in latest_completed_by_customer.items():
        next_date = _parse_date(s.get("next_service_date"))
        if not next_date:
            continue

        date_str = next_date.isoformat()
        # Deduplication: If this customer already has a SCHEDULED_SERVICE on this exact date, skip
        if (cid, date_str) in scheduled_keys:
            continue

        sid = str(s.get("service_id") or "").strip()
        cust = customer_map.get(cid, {})
        diff = (next_date - today).days

        if next_date < today:
            rem_status = "OVERDUE"
            overdue_days = (today - next_date).days
        elif next_date == today:
            rem_status = "DUE_TODAY"
            overdue_days = None
        elif next_date == tomorrow:
            rem_status = "TOMORROW"
            overdue_days = None
        else:
            rem_status = "UPCOMING"
            overdue_days = None

        reminder = ReminderOut(
            reminder_id=f"{sid}-NEXT-{date_str}",
            reminder_type="NEXT_SERVICE_DUE",
            status=rem_status,
            date=date_str,
            days_diff=diff,
            days_overdue=overdue_days,
            service_id=sid,
            customer_id=cid,
            customer_name=str(cust.get("name") or cid),
            mobile=str(cust.get("mobile") or ""),
            address=str(cust.get("address") or ""),
            area=str(cust.get("area") or ""),
            ro_brand=str(cust.get("ro_brand") or ""),
            ro_model=str(cust.get("ro_model") or ""),
            service_type=str(s.get("service_type") or "Regular Service"),
            technician=str(s.get("technician") or ""),
            complaint=str(s.get("complaint") or ""),
            notes=str(s.get("notes") or ""),
        )
        next_service_reminders.append(reminder)

    all_reminders = scheduled_reminders + next_service_reminders

    # Sort reminders chronologically:
    # Overdue first (oldest first, so most overdue is top),
    # then Today, Tomorrow, Upcoming
    all_reminders.sort(key=lambda r: (r.date, r.customer_name))

    # Apply filters
    filtered = []
    for r in all_reminders:
        # Reminder Type Filter
        if reminder_type_filter and r.reminder_type.upper() != reminder_type_filter.upper():
            continue

        # Status Filter
        if status_filter:
            sf = status_filter.upper()
            if sf in ("DUE_TODAY", "TODAY") and r.status != "DUE_TODAY":
                continue
            elif sf == "TOMORROW" and r.status != "TOMORROW":
                continue
            elif sf == "OVERDUE" and r.status != "OVERDUE":
                continue
            elif sf == "UPCOMING":
                if r.status != "UPCOMING":
                    continue
                # For upcoming, enforce the days window
                r_date = _parse_date(r.date)
                if r_date and (r_date > upcoming_limit):
                    continue

        # If no specific status filter was given, filter out UPCOMING beyond the window
        elif r.status == "UPCOMING":
            r_date = _parse_date(r.date)
            if r_date and (r_date > upcoming_limit):
                continue

        filtered.append(r)

    return filtered


def get_reminders_summary(days: int = 7) -> ReminderSummaryOut:
    """Return summary counts for all active reminder categories."""
    reminders = get_all_reminders(days=days)

    today_cnt = sum(1 for r in reminders if r.status == "DUE_TODAY")
    tomorrow_cnt = sum(1 for r in reminders if r.status == "TOMORROW")
    upcoming_cnt = sum(1 for r in reminders if r.status == "UPCOMING")
    overdue_cnt = sum(1 for r in reminders if r.status == "OVERDUE")

    return ReminderSummaryOut(
        today_count=today_cnt,
        tomorrow_count=tomorrow_cnt,
        upcoming_count=upcoming_cnt,
        overdue_count=overdue_cnt,
        total_active=len(reminders),
    )

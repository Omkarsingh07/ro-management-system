"""
FastAPI router for Reminders endpoints.
"""

from typing import Optional
from fastapi import APIRouter, Query

from app.reminders.models import ReminderOut, ReminderSummaryOut
from app.reminders import service

router = APIRouter(prefix="/reminders", tags=["Reminders"])


@router.get("/summary", response_model=ReminderSummaryOut)
def get_reminders_summary(
    days: int = Query(default=7, ge=1, le=365, description="Number of days ahead for upcoming window")
):
    """Return count summary for today, tomorrow, upcoming, and overdue reminders."""
    return service.get_reminders_summary(days=days)


@router.get("/today", response_model=list[ReminderOut])
def get_today_reminders():
    """Return reminders due today."""
    return service.get_all_reminders(status_filter="DUE_TODAY")


@router.get("/tomorrow", response_model=list[ReminderOut])
def get_tomorrow_reminders():
    """Return reminders due tomorrow."""
    return service.get_all_reminders(status_filter="TOMORROW")


@router.get("/upcoming", response_model=list[ReminderOut])
def get_upcoming_reminders(
    days: int = Query(default=7, ge=1, le=365, description="Number of days ahead to look")
):
    """Return upcoming reminders within the specified window (default 7 days)."""
    return service.get_all_reminders(status_filter="UPCOMING", days=days)


@router.get("/overdue", response_model=list[ReminderOut])
def get_overdue_reminders():
    """Return overdue reminders."""
    return service.get_all_reminders(status_filter="OVERDUE")


@router.get("", response_model=list[ReminderOut])
def get_reminders(
    status: Optional[str] = Query(None, description="Filter by status: DUE_TODAY, TOMORROW, UPCOMING, OVERDUE"),
    reminder_type: Optional[str] = Query(None, description="Filter by type: SCHEDULED_SERVICE, NEXT_SERVICE_DUE"),
    days: int = Query(default=7, ge=1, le=365, description="Upcoming window in days"),
):
    """
    Return all reminders with optional status and reminder_type filters.
    """
    return service.get_all_reminders(
        status_filter=status,
        reminder_type_filter=reminder_type,
        days=days,
    )

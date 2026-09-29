"""
Pydantic models for the Reminders domain.
"""

from typing import Literal, Optional
from pydantic import BaseModel

ReminderType = Literal["SCHEDULED_SERVICE", "NEXT_SERVICE_DUE"]
ReminderStatus = Literal["DUE_TODAY", "TOMORROW", "UPCOMING", "OVERDUE"]


class ReminderOut(BaseModel):
    reminder_id: str
    reminder_type: ReminderType
    status: ReminderStatus
    date: str  # YYYY-MM-DD
    days_diff: int  # 0 for today, 1 for tomorrow, >1 upcoming, <0 overdue
    days_overdue: Optional[int] = None
    service_id: str
    customer_id: str
    customer_name: str
    mobile: str
    address: str
    area: Optional[str] = ""
    ro_brand: Optional[str] = ""
    ro_model: Optional[str] = ""
    service_type: str
    technician: Optional[str] = ""
    complaint: Optional[str] = ""
    notes: Optional[str] = ""


class ReminderSummaryOut(BaseModel):
    today_count: int
    tomorrow_count: int
    upcoming_count: int
    overdue_count: int
    total_active: int

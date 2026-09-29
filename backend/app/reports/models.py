"""
Pydantic models for the Reports & Business Analytics domain.
"""

from typing import Optional
from pydantic import BaseModel


class ReportPeriod(BaseModel):
    from_date: str
    to_date: str


class BusinessSummary(BaseModel):
    total_services: int
    completed_services: int
    pending_services: int
    overdue_services: int
    total_revenue: float
    paid_amount: float
    pending_payment_amount: float
    partial_payment_amount: float
    uncollected_amount: float
    new_customers: int
    customers_with_services: int
    average_service_value: float
    highest_service_value: float


class PaymentStatusSummary(BaseModel):
    payment_status: str
    count: int
    total_amount: float


class CustomerActivityReportItem(BaseModel):
    customer_id: str
    customer_name: str
    mobile: str
    service_count: int
    completed_count: int
    total_value: float
    last_service_date: Optional[str] = None


class ServiceTypeReportItem(BaseModel):
    service_type: str
    count: int
    completed_count: int
    total_value: float


class TechnicianReportItem(BaseModel):
    technician: str
    total_services: int
    completed_services: int
    pending_services: int
    total_value: float


class MaterialUsageReportItem(BaseModel):
    material_id: str
    material_name: str
    quantity_used: float
    unit: str
    estimated_cost: float


class InventoryMovementReportItem(BaseModel):
    transaction_type: str
    count: int
    total_quantity: float


class InventoryStatusSnapshot(BaseModel):
    total_materials: int
    out_of_stock_count: int
    low_stock_count: int
    healthy_stock_count: int


class DailyServiceReportItem(BaseModel):
    date: str
    services_count: int
    completed_count: int
    revenue: float


class ComprehensiveReportOut(BaseModel):
    period: ReportPeriod
    summary: BusinessSummary
    payments: list[PaymentStatusSummary]
    service_types: list[ServiceTypeReportItem]
    technicians: list[TechnicianReportItem]
    customer_activity: list[CustomerActivityReportItem]
    material_usage: list[MaterialUsageReportItem]
    total_material_cost: float
    inventory_movements: list[InventoryMovementReportItem]
    inventory_snapshot: InventoryStatusSnapshot
    daily_timeline: list[DailyServiceReportItem]

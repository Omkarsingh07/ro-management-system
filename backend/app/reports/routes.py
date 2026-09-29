"""
FastAPI router for Reports & Business Analytics endpoints.
"""

import csv
import io
from datetime import date
from typing import Optional
from fastapi import APIRouter, HTTPException, Query, Response

from app.reports.models import ComprehensiveReportOut
from app.reports import service

router = APIRouter(prefix="/reports", tags=["Reports"])


def _validate_dates(from_date: Optional[date], to_date: Optional[date]) -> tuple[date, date]:
    """Validate and default the date range."""
    def_from, def_to = service.get_default_date_range()
    f_date = from_date or def_from
    t_date = to_date or def_to

    if f_date > t_date:
        raise HTTPException(
            status_code=400,
            detail=f"from_date ({f_date}) cannot be after to_date ({t_date}).",
        )
    return f_date, t_date


@router.get("/summary", response_model=ComprehensiveReportOut)
def get_comprehensive_report(
    from_date: Optional[date] = Query(None, description="Start date (YYYY-MM-DD)"),
    to_date: Optional[date] = Query(None, description="End date (YYYY-MM-DD)"),
):
    """
    Return comprehensive business analytics and metrics for the specified period.
    Defaults to the current calendar month.
    """
    f_date, t_date = _validate_dates(from_date, to_date)
    return service.generate_comprehensive_report(f_date, t_date)


@router.get("/export/csv")
def export_report_csv(
    from_date: Optional[date] = Query(None, description="Start date (YYYY-MM-DD)"),
    to_date: Optional[date] = Query(None, description="End date (YYYY-MM-DD)"),
    report_type: str = Query("daily", description="Report section to export: daily, services, materials, customers"),
):
    """
    Export specified report section as a downloadable CSV stream.
    """
    f_date, t_date = _validate_dates(from_date, to_date)
    report = service.generate_comprehensive_report(f_date, t_date)

    output = io.StringIO()
    writer = csv.writer(output)

    rtype = report_type.lower()
    if rtype == "materials":
        writer.writerow(["Material ID", "Material Name", "Quantity Used", "Unit", "Estimated Cost (INR)"])
        for m in report.material_usage:
            writer.writerow([m.material_id, m.material_name, m.quantity_used, m.unit, m.estimated_cost])
        filename = f"material_usage_{f_date}_to_{t_date}.csv"

    elif rtype == "customers":
        writer.writerow(["Customer ID", "Customer Name", "Mobile", "Service Count", "Completed Count", "Total Value (INR)", "Last Service Date"])
        for c in report.customer_activity:
            writer.writerow([c.customer_id, c.customer_name, c.mobile, c.service_count, c.completed_count, c.total_value, c.last_service_date or ""])
        filename = f"customer_activity_{f_date}_to_{t_date}.csv"

    elif rtype == "services":
        writer.writerow(["Service Type", "Total Count", "Completed Count", "Total Revenue (INR)"])
        for s in report.service_types:
            writer.writerow([s.service_type, s.count, s.completed_count, s.total_value])
        filename = f"service_types_{f_date}_to_{t_date}.csv"

    else:
        # Default: daily breakdown
        writer.writerow(["Date", "Total Services", "Completed Services", "Revenue (INR)"])
        for d in report.daily_timeline:
            writer.writerow([d.date, d.services_count, d.completed_count, d.revenue])
        filename = f"daily_report_{f_date}_to_{t_date}.csv"

    csv_data = output.getvalue()
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )

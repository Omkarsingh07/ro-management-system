"""
FastAPI router for service endpoints.

Route declaration order matters for FastAPI — fixed literal paths
(/today, /upcoming, /overdue) must be declared before parameterised
paths (/{service_id}) to avoid them being swallowed.
"""

from fastapi import APIRouter, HTTPException, Query

from app.services.models import (
    ServiceCompletionRequest,
    ServiceIn,
    ServiceOut,
    ServiceUpdate,
)
from app.services import service as svc_service

router = APIRouter(tags=["Services"])

# ---------------------------------------------------------------------------
# Fixed-path routes — must come before /{service_id}
# ---------------------------------------------------------------------------

@router.get("/services/today", response_model=list[ServiceOut])
def get_today_services():
    """Return all services scheduled for today (IST)."""
    return svc_service.get_services_today()


@router.get("/services/upcoming", response_model=list[ServiceOut])
def get_upcoming_services(
    days: int = Query(default=7, ge=1, le=365, description="Number of days ahead to look")
):
    """Return services scheduled from tomorrow through today+days (inclusive)."""
    return svc_service.get_services_upcoming(days)


@router.get("/services/overdue", response_model=list[ServiceOut])
def get_overdue_services():
    """Return services whose service_date is strictly before today (IST)."""
    return svc_service.get_services_overdue()


# ---------------------------------------------------------------------------
# Collection routes
# ---------------------------------------------------------------------------

@router.get("/services", response_model=list[ServiceOut])
def get_all_services():
    """Return all service records."""
    return svc_service.get_all_services()


@router.post("/services", response_model=ServiceOut, status_code=201)
def create_service(data: ServiceIn):
    """
    Create a new service record.
    service_id is auto-generated. total_amount is calculated server-side.
    Returns 404 if the referenced customer does not exist.
    """
    result = svc_service.create_service(data)
    if result is None:
        raise HTTPException(
            status_code=404,
            detail=f"Customer '{data.customer_id}' not found.",
        )
    return result


# ---------------------------------------------------------------------------
# Single-resource routes
# ---------------------------------------------------------------------------

@router.get("/services/{service_id}", response_model=ServiceOut)
def get_service(service_id: str):
    """Return a single service record by ID."""
    result = svc_service.get_service_by_id(service_id)
    if result is None:
        raise HTTPException(
            status_code=404,
            detail=f"Service '{service_id}' not found.",
        )
    return result


@router.put("/services/{service_id}", response_model=ServiceOut)
def update_service(service_id: str, data: ServiceUpdate):
    """
    Update a service record.
    service_id and customer_id are immutable.
    total_amount is recalculated from labour_charge + material_charge.
    """
    result = svc_service.update_service(service_id, data)
    if result is None:
        raise HTTPException(
            status_code=404,
            detail=f"Service '{service_id}' not found.",
        )
@router.post("/services/{service_id}/complete", response_model=ServiceOut)
@router.put("/services/{service_id}/complete", response_model=ServiceOut)
def complete_service(service_id: str, data: ServiceCompletionRequest):
    """
    Complete a service:
      1. Validates service exists and is not already completed (409 Conflict if completed).
      2. Validates materials stock across all requested items (400 if insufficient stock).
      3. Deducts stock from materials.xlsx and logs SERVICE_USAGE transactions.
      4. Records materials used in Service_Materials sheet in customers.xlsx.
      5. Calculates material_charge (from purchase_price) and total_amount.
      6. Marks service COMPLETED by writing work_done.
    """
    try:
        result = svc_service.complete_service(service_id, data)
        return result
    except KeyError as e:
        detail = str(e).strip("'\"")
        raise HTTPException(status_code=404, detail=detail)
    except ValueError as e:
        detail = str(e).strip("'\"")
        if "already been completed" in detail:
            raise HTTPException(status_code=409, detail=detail)
        raise HTTPException(status_code=400, detail=detail)


@router.delete("/services/{service_id}", status_code=204)

def delete_service(service_id: str):
    """
    Delete a service record.
    Returns 404 if not found.
    """
    deleted = svc_service.delete_service(service_id)
    if not deleted:
        raise HTTPException(
            status_code=404,
            detail=f"Service '{service_id}' not found.",
        )


# ---------------------------------------------------------------------------
# Customer sub-resource route
# ---------------------------------------------------------------------------

@router.get("/customers/{customer_id}/services", response_model=list[ServiceOut])
def get_customer_services(customer_id: str):
    """
    Return all service records for a given customer, sorted newest-first.
    Returns 404 if the customer does not exist.
    """
    result = svc_service.get_services_for_customer(customer_id)
    if result is None:
        raise HTTPException(
            status_code=404,
            detail=f"Customer '{customer_id}' not found.",
        )
    return result

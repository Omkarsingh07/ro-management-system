"""
FastAPI router for customer endpoints.
"""

from fastapi import APIRouter, HTTPException, Query

from app.customers.models import CustomerIn, CustomerOut
from app.customers import service

router = APIRouter(prefix="/customers", tags=["Customers"])


@router.get("/search", response_model=list[CustomerOut])
def search_customers(q: str = Query(..., min_length=1, description="Search query")):
    """
    Search customers by name, mobile, area, customer_id, ro_brand, or ro_model.
    Case-insensitive partial match.
    """
    return service.search_customers(q)


@router.get("", response_model=list[CustomerOut])
def get_all_customers():
    """Return all customers."""
    return service.get_all_customers()


@router.get("/{customer_id}", response_model=CustomerOut)
def get_customer(customer_id: str):
    """Return a single customer by ID."""
    customer = service.get_customer_by_id(customer_id)
    if customer is None:
        raise HTTPException(
            status_code=404,
            detail=f"Customer '{customer_id}' not found.",
        )
    return customer


@router.post("", response_model=CustomerOut, status_code=201)
def create_customer(data: CustomerIn):
    """Create a new customer. customer_id and created_at are auto-generated."""
    return service.create_customer(data)


@router.put("/{customer_id}", response_model=CustomerOut)
def update_customer(customer_id: str, data: CustomerIn):
    """Update an existing customer. customer_id and created_at are preserved."""
    customer = service.update_customer(customer_id, data)
    if customer is None:
        raise HTTPException(
            status_code=404,
            detail=f"Customer '{customer_id}' not found.",
        )
    return customer


@router.delete("/{customer_id}", status_code=204)
def delete_customer(customer_id: str):
    """
    Delete a customer by ID.

    Returns 204 on success, 404 if the customer does not exist.
    Note: In a future step, deletion may be blocked when service history exists.
    """
    deleted = service.delete_customer(customer_id)
    if not deleted:
        raise HTTPException(
            status_code=404,
            detail=f"Customer '{customer_id}' not found.",
        )

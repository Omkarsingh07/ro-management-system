"""
FastAPI routers for Materials and Inventory endpoints.
"""

from typing import Optional
from fastapi import APIRouter, HTTPException, Query, status

from app.inventory.models import (
    AdjustIn,
    MaterialIn,
    MaterialOut,
    MaterialUpdate,
    PurchaseIn,
    StockTransactionOut,
)
from app.inventory import service

materials_router = APIRouter(prefix="/materials", tags=["Materials"])
inventory_router = APIRouter(prefix="/inventory", tags=["Inventory"])


# ===========================================================================
# Materials Endpoints
# ===========================================================================

@materials_router.get("/search", response_model=list[MaterialOut])
def search_materials(q: str = Query(..., min_length=1, description="Search query")):
    """
    Search materials case-insensitively by:
    material_id, material_name, category, supplier.
    """
    return service.search_materials(q)


@materials_router.get("", response_model=list[MaterialOut])
def get_all_materials():
    """Return all materials."""
    return service.get_all_materials()


@materials_router.get("/{material_id}", response_model=MaterialOut)
def get_material(material_id: str):
    """Return a single material by ID."""
    material = service.get_material_by_id(material_id)
    if material is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Material '{material_id}' not found.",
        )
    return material


@materials_router.post("", response_model=MaterialOut, status_code=status.HTTP_201_CREATED)
def create_material(data: MaterialIn):
    """
    Create a new material.
    material_id is auto-generated.
    If current_stock > 0, an initial opening stock transaction is recorded.
    """
    return service.create_material(data)


@materials_router.put("/{material_id}", response_model=MaterialOut)
def update_material(material_id: str, data: MaterialUpdate):
    """
    Update material metadata.
    current_stock and material_id cannot be modified via this endpoint.
    """
    updated = service.update_material(material_id, data)
    if updated is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Material '{material_id}' not found.",
        )
    return updated


# ===========================================================================
# Inventory & Stock Endpoints
# ===========================================================================

@inventory_router.post(
    "/purchase",
    response_model=StockTransactionOut,
    status_code=status.HTTP_201_CREATED,
)
def purchase_stock(data: PurchaseIn):
    """
    Record stock purchase:
    Increases current_stock and writes a PURCHASE transaction.
    Updates material's purchase_price if provided.
    """
    try:
        return service.purchase_stock(data)
    except KeyError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e).strip("'\""))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@inventory_router.post(
    "/adjust",
    response_model=StockTransactionOut,
    status_code=status.HTTP_201_CREATED,
)
def adjust_stock(data: AdjustIn):
    """
    Record stock adjustment (+ or -):
    Prevents negative stock and logs an ADJUSTMENT transaction.
    """
    try:
        return service.adjust_stock(data)
    except KeyError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e).strip("'\""))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@inventory_router.get("/low-stock", response_model=list[MaterialOut])
def get_low_stock():
    """Return materials where current_stock <= minimum_stock."""
    return service.get_low_stock_materials()


@inventory_router.get("/transactions", response_model=list[StockTransactionOut])
def get_transactions(
    material_id: Optional[str] = Query(None, description="Filter by material_id"),
    transaction_type: Optional[str] = Query(None, description="Filter by transaction_type"),
):
    """Return stock transactions with optional material_id and transaction_type filters."""
    return service.get_stock_transactions(
        material_id=material_id,
        transaction_type=transaction_type,
    )

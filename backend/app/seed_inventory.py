"""
Seed script to populate dummy inventory materials and initial stock transactions in materials.xlsx.
"""

import sys
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from decimal import Decimal
from app.inventory.models import MaterialIn
from app.inventory.service import create_material, get_all_materials
from app.excel_store import MATERIALS_FILE, _locks
from openpyxl import load_workbook

DUMMY_MATERIALS = [
    {
        "material_name": "Sediment Filter 10\" (Spun 5 Micron)",
        "category": "Filter",
        "unit": "pcs",
        "current_stock": Decimal("45"),
        "minimum_stock": Decimal("15"),
        "purchase_price": Decimal("40"),
        "selling_price": Decimal("120"),
        "supplier": "AquaPure Spares",
    },
    {
        "material_name": "Pre-Carbon Filter 10\" (Activated Block)",
        "category": "Filter",
        "unit": "pcs",
        "current_stock": Decimal("28"),
        "minimum_stock": Decimal("10"),
        "purchase_price": Decimal("85"),
        "selling_price": Decimal("220"),
        "supplier": "AquaPure Spares",
    },
    {
        "material_name": "Post-Carbon / Silver Carbon Filter",
        "category": "Filter",
        "unit": "pcs",
        "current_stock": Decimal("18"),
        "minimum_stock": Decimal("8"),
        "purchase_price": Decimal("110"),
        "selling_price": Decimal("280"),
        "supplier": "Pentair India",
    },
    {
        "material_name": "RO Membrane 75 GPD (Vontron / Dow)",
        "category": "Membrane",
        "unit": "pcs",
        "current_stock": Decimal("4"),  # Low stock
        "minimum_stock": Decimal("8"),
        "purchase_price": Decimal("650"),
        "selling_price": Decimal("1450"),
        "supplier": "Hi-Tech Components",
    },
    {
        "material_name": "RO Membrane 100 GPD (CSM Korea)",
        "category": "Membrane",
        "unit": "pcs",
        "current_stock": Decimal("2"),  # Low stock
        "minimum_stock": Decimal("5"),
        "purchase_price": Decimal("850"),
        "selling_price": Decimal("1750"),
        "supplier": "Hi-Tech Components",
    },
    {
        "material_name": "RO Booster Pump 75 GPD (24V DC)",
        "category": "Electricals",
        "unit": "pcs",
        "current_stock": Decimal("3"),  # Low stock
        "minimum_stock": Decimal("6"),
        "purchase_price": Decimal("950"),
        "selling_price": Decimal("1800"),
        "supplier": "Kemflo India",
    },
    {
        "material_name": "RO Booster Pump 100 GPD (Copper Windings)",
        "category": "Electricals",
        "unit": "pcs",
        "current_stock": Decimal("7"),
        "minimum_stock": Decimal("4"),
        "purchase_price": Decimal("1150"),
        "selling_price": Decimal("2200"),
        "supplier": "Kemflo India",
    },
    {
        "material_name": "SMPS Power Adapter 24V 2.5A",
        "category": "Electricals",
        "unit": "pcs",
        "current_stock": Decimal("14"),
        "minimum_stock": Decimal("6"),
        "purchase_price": Decimal("240"),
        "selling_price": Decimal("500"),
        "supplier": "Kemflo India",
    },
    {
        "material_name": "Solenoid Valve (SV) 24V DC Push-Fit",
        "category": "Electricals",
        "unit": "pcs",
        "current_stock": Decimal("19"),
        "minimum_stock": Decimal("8"),
        "purchase_price": Decimal("130"),
        "selling_price": Decimal("320"),
        "supplier": "Kemflo India",
    },
    {
        "material_name": "Low Pressure Switch (LPS)",
        "category": "Electricals",
        "unit": "pcs",
        "current_stock": Decimal("12"),
        "minimum_stock": Decimal("5"),
        "purchase_price": Decimal("75"),
        "selling_price": Decimal("180"),
        "supplier": "Star Spares",
    },
    {
        "material_name": "High Pressure Switch (HPS) with Auto Cut-off",
        "category": "Electricals",
        "unit": "pcs",
        "current_stock": Decimal("15"),
        "minimum_stock": Decimal("5"),
        "purchase_price": Decimal("95"),
        "selling_price": Decimal("220"),
        "supplier": "Star Spares",
    },
    {
        "material_name": "Flow Restrictor (FR-450)",
        "category": "Spares",
        "unit": "pcs",
        "current_stock": Decimal("35"),
        "minimum_stock": Decimal("15"),
        "purchase_price": Decimal("30"),
        "selling_price": Decimal("90"),
        "supplier": "Star Spares",
    },
    {
        "material_name": "Flow Restrictor (FR-300)",
        "category": "Spares",
        "unit": "pcs",
        "current_stock": Decimal("0"),  # Out of stock
        "minimum_stock": Decimal("10"),
        "purchase_price": Decimal("28"),
        "selling_price": Decimal("85"),
        "supplier": "Star Spares",
    },
    {
        "material_name": "Food-Grade 1/4\" Blue PU Tubing",
        "category": "Pipes & Fittings",
        "unit": "meter",
        "current_stock": Decimal("150"),
        "minimum_stock": Decimal("50"),
        "purchase_price": Decimal("8"),
        "selling_price": Decimal("20"),
        "supplier": "Nexus Plastics",
    },
    {
        "material_name": "Food-Grade 1/4\" White PU Tubing",
        "category": "Pipes & Fittings",
        "unit": "meter",
        "current_stock": Decimal("120"),
        "minimum_stock": Decimal("50"),
        "purchase_price": Decimal("8"),
        "selling_price": Decimal("20"),
        "supplier": "Nexus Plastics",
    },
    {
        "material_name": "1/4\" Equal Elbow Push-Fit Connector",
        "category": "Pipes & Fittings",
        "unit": "pcs",
        "current_stock": Decimal("65"),
        "minimum_stock": Decimal("25"),
        "purchase_price": Decimal("6"),
        "selling_price": Decimal("18"),
        "supplier": "Nexus Plastics",
    },
    {
        "material_name": "1/4\" Equal Tee Push-Fit Connector",
        "category": "Pipes & Fittings",
        "unit": "pcs",
        "current_stock": Decimal("42"),
        "minimum_stock": Decimal("20"),
        "purchase_price": Decimal("9"),
        "selling_price": Decimal("25"),
        "supplier": "Nexus Plastics",
    },
    {
        "material_name": "Mineral / Alkaline Cartridge (Bio+ Mineralizer)",
        "category": "Filter",
        "unit": "pcs",
        "current_stock": Decimal("5"),  # Low stock
        "minimum_stock": Decimal("8"),
        "purchase_price": Decimal("220"),
        "selling_price": Decimal("480"),
        "supplier": "AquaPure Spares",
    },
    {
        "material_name": "UV Disinfection Lamp 11W (Philips / Osram 4-pin)",
        "category": "UV & Disinfection",
        "unit": "pcs",
        "current_stock": Decimal("8"),
        "minimum_stock": Decimal("4"),
        "purchase_price": Decimal("160"),
        "selling_price": Decimal("380"),
        "supplier": "Philips Healthcare",
    },
    {
        "material_name": "UV Chamber / Stainless Steel Barrel (11W)",
        "category": "UV & Disinfection",
        "unit": "pcs",
        "current_stock": Decimal("6"),
        "minimum_stock": Decimal("3"),
        "purchase_price": Decimal("310"),
        "selling_price": Decimal("650"),
        "supplier": "Philips Healthcare",
    },
    {
        "material_name": "Pre-Filter Housing Bowl 10\" (Heavy Duty)",
        "category": "Housings",
        "unit": "pcs",
        "current_stock": Decimal("11"),
        "minimum_stock": Decimal("5"),
        "purchase_price": Decimal("180"),
        "selling_price": Decimal("380"),
        "supplier": "AquaPure Spares",
    },
    {
        "material_name": "Membrane Housing (White Leak-Proof 1812/2012)",
        "category": "Housings",
        "unit": "pcs",
        "current_stock": Decimal("9"),
        "minimum_stock": Decimal("5"),
        "purchase_price": Decimal("140"),
        "selling_price": Decimal("300"),
        "supplier": "AquaPure Spares",
    },
    {
        "material_name": "TDS Adjuster Valve (Brass Needle Controller)",
        "category": "Spares",
        "unit": "pcs",
        "current_stock": Decimal("14"),
        "minimum_stock": Decimal("6"),
        "purchase_price": Decimal("65"),
        "selling_price": Decimal("160"),
        "supplier": "Star Spares",
    },
    {
        "material_name": "TDS Digital Meter (Tester Pen 0-9990 ppm)",
        "category": "Tools & Testing",
        "unit": "pcs",
        "current_stock": Decimal("6"),
        "minimum_stock": Decimal("3"),
        "purchase_price": Decimal("120"),
        "selling_price": Decimal("290"),
        "supplier": "Hi-Tech Components",
    },
    {
        "material_name": "RO Spanner / Housing Wrench 10\"",
        "category": "Tools & Testing",
        "unit": "pcs",
        "current_stock": Decimal("16"),
        "minimum_stock": Decimal("5"),
        "purchase_price": Decimal("35"),
        "selling_price": Decimal("80"),
        "supplier": "AquaPure Spares",
    },
]


def seed():
    existing = get_all_materials()
    print(f"Existing materials: {len(existing)}")

    count = 0
    for item in DUMMY_MATERIALS:
        # Check if already exists by name
        if any(e.material_name.lower() == item["material_name"].lower() for e in existing):
            continue
        mat_in = MaterialIn(**item)
        res = create_material(mat_in)
        print(f"Created {res.material_id}: {res.material_name} (Stock: {res.current_stock}, Min: {res.minimum_stock})")
        count += 1

    print(f"\nSuccessfully added {count} inventory materials.")
    total = get_all_materials()
    low_stock = [m for m in total if m.is_low_stock]
    out_of_stock = [m for m in total if m.is_out_of_stock]
    print(f"Total Materials: {len(total)}")
    print(f"Low Stock: {len(low_stock)}")
    print(f"Out of Stock: {len(out_of_stock)}")


if __name__ == "__main__":
    seed()

# 🚿 Maruti Enterprises — RO Service Management System

> **Ek complete business management application** jo RO (Water Purifier) service business ke liye banaya gaya hai.
> Customers, services, inventory, reminders aur reports — sab ek jagah manage hote hain.

---

## 📁 Project Structure

```
Ro management system/
├── backend/                  ← FastAPI (Python) Server
│   ├── app/
│   │   ├── main.py           ← Application entry point & Excel initialization
│   │   ├── excel_store.py    ← All Excel read/write logic (single source of truth)
│   │   ├── auth/             ← Login, Logout, Session management
│   │   ├── customers/        ← Customer CRUD
│   │   ├── services/         ← Service CRUD + Complete workflow
│   │   ├── inventory/        ← Materials + Stock transactions
│   │   ├── reminders/        ← Dynamic reminder engine
│   │   └── reports/          ← Business analytics + CSV export
│   ├── data/
│   │   ├── customers.xlsx    ← Customer + Service data
│   │   └── materials.xlsx    ← Inventory data
│   └── requirements.txt
│
└── frontend/                 ← Next.js 16 (React + TypeScript)
    └── app/
        ├── login/            ← Login page
        ├── dashboard/        ← Main dashboard
        ├── customers/        ← Customer list + detail + new
        ├── services/         ← Service list + detail + new + edit
        ├── inventory/        ← Material list + detail + new + transactions
        ├── reminders/        ← Service reminder alerts
        ├── reports/          ← Business analytics + CSV export
        ├── components/       ← Shared components (Navbar, Pagination, DateFilter)
        └── lib/              ← API helpers + TypeScript types
```

---

## 🗄️ Data Storage

**Database nahi hai** — data directly **Excel files** mein save hota hai.

| File | Sheet | Kya Stored Hai |
|---|---|---|
| `customers.xlsx` | Customers | Customer name, mobile, address, RO brand/model, installation date |
| `customers.xlsx` | Services | Service date, type, technician, work done, next service date, amount, payment |
| `customers.xlsx` | Service_Materials | Service mein use hue materials (service_id + material_id + quantity) |
| `materials.xlsx` | Materials | Material name, category, stock level, buy/sell price, supplier |
| `materials.xlsx` | Stock_Transactions | Purchases, adjustments — pura stock audit trail |

> ⚠️ **Note:** Reminders ka koi alag storage nahi hai — woh real-time pe calculate hote hain.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS v4 |
| Backend | FastAPI (Python), Uvicorn |
| Storage | Excel (.xlsx via openpyxl library) |
| Auth | HTTP-only session cookie, bcrypt password hashing |
| Time Zone | IST (Asia/Kolkata) — sab dates IST mein calculate |

---

## 🔐 Page 1 — Login Page (/login)

### Kya Kaam Karta Hai?
Application mein sirf authorized user hi enter kar sake — yeh page authentication ke liye hai.

### UI Elements
- Username aur Password field
- "Sign In" button
- Error message on wrong credentials

### Logic (Backend — app/auth/routes.py)
```
User → username + password submit karta hai
         ↓
   Backend verify karta hai:
   1. Username .env file se match hota hai?
   2. Password bcrypt hash se verify hota hai?
         ↓
   Sahi  → HTTP-only session cookie set hota hai → Dashboard pe redirect
   Galat → "Invalid username or password" error
```

### Security Features
- **Brute-force protection:** Bahut zyada failed attempts pe IP temporarily block
- **Constant-time comparison:** Timing attacks se bachne ke liye dummy hash use hota hai
- **HTTP-only cookie:** JavaScript se cookie access nahi ho sakta (XSS protection)
- **Session expiry:** Cookie ek fixed time baad automatically expire hoti hai

### Credentials (.env file)
```
AUTH_USERNAME=admin
AUTH_PASSWORD_HASH=<bcrypt hash of password>
```

---

## 🏠 Page 2 — Dashboard (/dashboard)

### Kya Kaam Karta Hai?
**Business ka complete snapshot ek nazar mein** — aaj kya ho raha hai, revenue kaisi hai,
reminders kaun se hain, sab ek jagah.

### Sections

#### A — Quick Business Actions (Top Bar)
3 shortcut buttons:
- `+ Book Service` → Seedha service booking page
- `+ Add Customer` → Naya customer add karo
- `+ Add Material` → Naya inventory item add karo

#### B — Today's KPI Cards
| Card | Data Source | Logic |
|---|---|---|
| Today's Services | Services sheet | Aaj ki date ke services count |
| Today's Revenue | Services sheet | Aaj ke completed services ka total amount |
| Upcoming (7d) | Services sheet | Agle 7 din mein scheduled services |
| Overdue | Services sheet | Past date ki incomplete services |
| Total Customers | Customers sheet | Database mein registered customers |
| Low Stock Alerts | Materials sheet | current_stock < minimum_stock |

#### C — Recent Customers (Last 5)
- Naye se purane order mein
- Naam, Mobile, Area, RO Brand dikhta hai
- "View All" link

#### D — Today's Services Table
- Aaj ki date ke sab services
- Status badge: Completed (green) / Pending (amber)

#### E — Upcoming Services
- Agle 7 din ke scheduled services

#### F — Overdue Services (Alert)
- Red highlighting, kitne din overdue dikhta hai

#### G — Reminders Summary
4 count tiles (Today / Tomorrow / Upcoming / Overdue)

#### H — Inventory Health
- Low stock aur out of stock materials

### Data Fetching Logic
```javascript
// Dashboard ek saath 8 API calls karta hai (Promise.allSettled)
// Agar koi ek fail ho toh bhi baaki data show hota hai
Promise.allSettled([
  fetchComprehensiveReport(),  // Reports summary
  fetchCustomers(),            // Customer list
  fetchServicesToday(),        // Aaj ke services
  fetchServicesUpcoming(7),    // Agle 7 din
  fetchServicesOverdue(),      // Overdue
  fetchServices(),             // Sab services
  fetchMaterials(),            // Inventory
  fetchRemindersSummary(7),    // Reminder counts
])
```

---

## 👥 Page 3 — Customers List (/customers)

### Kya Kaam Karta Hai?
Maruti Enterprises ke **sab registered customers ki list** — search, filter, aur manage karo.

### Features
- **Search:** Naam, mobile, area, RO brand se real-time filter
- **Date Filter:** Registration date range se filter (created_at field)
- **Pagination:** 10 customers per page
- **Sort:** Naye se purane order mein

### Table Columns
| Column | Description |
|---|---|
| # | Avatar with first letter of name |
| Customer Name | Naam + unique Customer ID |
| Mobile | Primary mobile number |
| Area | Customer ka area/locality |
| RO Brand | Purifier brand |
| Installed | Installation date |
| Actions | View button → Customer detail page |

### Logic
```
Frontend search → locally filter karke paginate karta hai
(No API call on every search keystroke — sab data ek baar load hota hai)
Date filter → registration date range se filter
```

---

## 👤 Page 4 — Customer Detail (/customers/[customer_id])

### Kya Kaam Karta Hai?
Ek specific customer ki **poori profile** aur unka service history.

### Sections
1. **Header:** Customer naam, ID, actions (Edit / Delete)
2. **Info Cards:**
   - Contact: Mobile, Alternate mobile, Address, Area
   - RO Details: Brand, Model, Installation date, Technician
   - Notes
3. **Service History Table:**
   - Is customer ke sab services (latest pehle)
   - Date, Type, Technician, Status, Amount, Payment columns
4. **Quick Actions:** `+ Book New Service` button

### Delete Logic
```
Delete Customer → Confirmation dialog
   ↓
Backend: Customer row customers.xlsx se remove
         Related services bhi delete ho jaate hain
   ↓
Redirect to /customers list
```

---

## ➕ Page 5 — Add New Customer (/customers/new)

### Form Fields
| Field | Required | Notes |
|---|---|---|
| Full Name | Yes | Customer ka naam |
| Mobile Number | Yes | 10-digit primary number |
| Alternate Mobile | No | Optional second number |
| Address | Yes | Full address |
| Area / Locality | No | Area for area-wise filtering |
| RO Brand | No | Purifier company |
| RO Model | No | Purifier model |
| Installation Date | No | Jab RO lagaya tha |
| Technician | No | Jisne install kiya |
| Notes | No | Any extra info |

### Logic
```
Form Submit → POST /customers
   ↓
Backend:
  - Auto-generate unique Customer ID
  - created_at = current IST date/time
  - Row append to customers.xlsx Customers sheet
   ↓
Redirect to new customer's detail page
```

---

## 🔧 Page 6 — Services List (/services)

### Kya Kaam Karta Hai?
**Sab service records** ek jagah — khoje, filter karo, aur manage karo.

### Features
- **Search:** Customer naam, mobile, technician, service type se filter
- **Date Filter:** Service date range se filter
- **Pagination:** 10 services per page
- **Sort:** Naye service pehle

### Table Columns
| Column | Description |
|---|---|
| Date | Service ki date |
| Customer | Naam + Customer ID |
| Type | Service type (Regular, Filter Change, AMC, etc.) |
| Technician | Assigned technician |
| Status | Completed / Pending / Overdue badge |
| Amount | Total amount billed |
| Payment | Paid / Pending / Partial badge |
| Actions | View button |

### Status Logic
```
service.work_done filled?
  Yes → "COMPLETED" (green badge)
  No  → service_date check:
            Past date → "OVERDUE" (red, blinking)
            Today     → "DUE TODAY" (amber, blinking)
            Future    → "UPCOMING" (blue)
```

---

## 🔧 Page 7 — Service Detail (/services/[service_id])

### Kya Kaam Karta Hai?
Ek specific service ki **poori details** — kya kaam hua, kaunse parts lage, payment status.

### Sections
1. **Header:** Service ID, date, status badge, Edit / Delete buttons
2. **Service Info:** Customer link, date, type, technician, complaint, work done, next service date
3. **Financials:** Labour charge, material charge, total amount, payment status
4. **Materials Used Table:** Parts used in this service
5. **Actions:** Mark as Complete / Edit / Delete

---

## ➕ Page 8 — Book New Service (/services/new)

### Form Fields
| Field | Required | Notes |
|---|---|---|
| Customer | Yes | Search & select from dropdown |
| Service Date | Yes | Date picker (default: today) |
| Service Type | Yes | Regular Service, Filter Change, AMC, Emergency, etc. |
| Technician | No | Assign a technician |
| Complaint | No | Customer ka complaint description |
| Work Done | No | Agar complete ho toh fill karo |
| Next Service Date | No | Agle service ki expected date |
| Labour Charge | No | Rs. mein |
| Material Charge | No | Rs. mein |
| Total Amount | No | Auto-calculate (labour + material) |
| Payment Status | No | Paid / Pending / Partial |
| Materials Used | No | Multi-select inventory items + quantity |
| Notes | No | Extra information |

### Logic
```
Customer search → dropdown mein live search
   ↓
Materials select → stock availability check hota hai
   ↓
Form Submit → POST /services
   ↓
Backend:
  1. Service row → customers.xlsx Services sheet append
  2. Materials selected → Service_Materials sheet append
  3. work_done filled → Service automatically COMPLETED
   ↓
Redirect to new service detail page
```

---

## 📦 Page 9 — Inventory / Materials List (/inventory)

### Kya Kaam Karta Hai?
Dukaan ke sab **RO parts aur materials ka stock manage** karo.

### Top KPI Cards (4 tiles)
| Tile | Logic |
|---|---|
| Total Materials | Materials sheet ki row count |
| Low Stock | current_stock < minimum_stock |
| Out of Stock | current_stock <= 0 |
| Total Stock Value | Sum of (current_stock × purchase_price) |

### Features
- Search by material naam ya category
- Category Filter dropdown
- Stock Status Filter: All / Low Stock / Out of Stock
- Pagination: 10 per page

### Stock Status Logic
```
current_stock <= 0             → "Out of Stock" (red)
current_stock < minimum_stock  → "Low Stock" (amber)
current_stock >= minimum_stock → "Healthy" (green)
```

---

## 📦 Page 10 — Material Detail (/inventory/[material_id])

### Kya Kaam Karta Hai?
Ek specific material ki **poori profile** — stock, pricing, aur full transaction history.

### Sections
1. **Header:** Material naam, ID, Stock status badge
2. **Info Cards:**
   - Stock Overview: Current stock, minimum threshold, unit
   - Pricing & Margin: Selling price, purchase price, profit margin
   - Classification: Category, supplier
3. **Stock Transactions Table:** Full audit trail — Date, Type, Quantity, Reference

### Quick Actions
- `Purchase Stock` → Modal
- `Adjust Stock` → Manual adjustment modal

---

## 📦 Page 11 — Add New Material (/inventory/new)

### Form Fields
| Field | Required | Notes |
|---|---|---|
| Material Name | Yes | Part ka naam |
| Category | Yes | Filters, Membranes, UV Lamps, etc. |
| Unit | Yes | pcs, litre, meters, etc. |
| Current Stock | Yes | Opening stock quantity |
| Minimum Stock | Yes | Low stock alert threshold |
| Purchase Price | Yes | Cost price per unit (Rs.) |
| Selling Price | Yes | Customer price per unit (Rs.) |
| Supplier | No | Preferred supplier name |

### Logic (Atomic Operation)
```
Form Submit → POST /materials
   ↓
Backend (single file lock):
  1. Material row → materials.xlsx Materials sheet append
  2. Opening stock > 0 → OPENING_STOCK transaction → Stock_Transactions sheet
   ↓
Redirect to new material detail page
```

---

## 📦 Page 12 — Stock Transactions (/inventory/transactions)

### Kya Kaam Karta Hai?
**Pura stock movement history** — kab kya purchase kiya, kab kya adjust hua.

### Filters
- Material Filter (specific material ka history)
- Transaction Type Filter: PURCHASE / ADJUSTMENT / OPENING_STOCK
- Date Filter: Date range se filter
- Pagination: 10 per page

### Table Columns
| Column | Description |
|---|---|
| Transaction ID | Unique ID |
| Date | Transaction date |
| Material | Material naam + ID |
| Type | PURCHASE / ADJUSTMENT / OPENING_STOCK |
| Quantity | +5 pcs (green) ya -2 pcs (amber) |
| Reference | Related service ID ya purchase bill no. |
| Notes | Extra info |

---

## 🔔 Page 13 — Reminders (/reminders)

### Kya Kaam Karta Hai?
Automatically pata lagata hai ki **kaun se customers ka service due hai** —
aaj, kal, agle 7 din mein, ya overdue.

> IMPORTANT: Koi alag reminder data nahi save hota.
> Yeh page Excel ke Services aur Customers data se real-time calculate karta hai.

### 2 Types ke Reminders
| Type | Source | Condition |
|---|---|---|
| SCHEDULED_SERVICE | Services sheet | work_done empty → service incomplete |
| NEXT_SERVICE_DUE | Services sheet | work_done filled + next_service_date set |

### 4 Status Categories
| Status | Color | Condition |
|---|---|---|
| Due Today | Amber (blinking) | service_date == today |
| Tomorrow | Indigo | service_date == today + 1 |
| Upcoming | Blue | today < service_date <= today + 7 |
| Overdue | Rose (blinking) | service_date < today |

### Summary KPI Cards (Clickable Filters)
```
[ Due Today: 3 ] [ Tomorrow: 1 ] [ Upcoming: 7 ] [ Overdue: 2 ]
       ↓ click on any card → table filters automatically
```

### Table Columns
| Column | Description |
|---|---|
| Service Date | Kis date ka reminder |
| Status | Due Today / Tomorrow / Upcoming / Overdue badge |
| Source | Scheduled (blue) / Next Service Due (purple) |
| Customer | Naam + link to profile |
| Mobile | Direct contact number |
| RO Brand | Purifier model info |
| Overdue By | Kitne din ho gaye (only for OVERDUE) |
| Actions | View Service + Complete / Book Service button |

### Deduplication Logic
```
Agar ek hi customer ka same date pe
SCHEDULED_SERVICE bhi ho aur NEXT_SERVICE_DUE bhi:
   → SCHEDULED_SERVICE priority pe rahta hai
   → NEXT_SERVICE_DUE skip hota hai (duplicate nahi dikhta)
```

### Sorting Order
```
Overdue (oldest first — most urgent upar)
→ Due Today
→ Tomorrow
→ Upcoming (nearest first)
```

### Action Buttons Logic
```
SCHEDULED_SERVICE reminder:
  [View]     → Service detail page
  [Complete] → Service complete karo

NEXT_SERVICE_DUE reminder:
  [View]     → Last completed service detail
  [Book Svc] → Naya service book karo (customer pre-filled)
```

---

## 📊 Page 14 — Reports & Analytics (/reports)

### Kya Kaam Karta Hai?
**Business ki complete financial aur operational picture** — date range select karo,
sab automatically calculate ho jaata hai.

### Date Range Controls
```
[From Date] → [To Date] → [Apply Range]

Quick Presets: [Today] [This Week] [This Month] [Last Month]

Default: Current calendar month automatically load hota hai (IST)
```

### 9 Report Sections

#### Section 1 — Business Summary Cards (6 KPI tiles)
| Card | Logic |
|---|---|
| Total Services | Selected period mein kitne services |
| Completed | work_done filled wale services |
| Pending | Incomplete services |
| Overdue | Past date + incomplete |
| Revenue | Completed services ka total amount |
| New Clients | created_at us period mein aane wale customers |

#### Section 2 — Revenue Metrics
```
Total Billed Revenue   = Sum of total_amount (completed services)
Avg Service Value      = Total Revenue / Completed Count
Highest Job Value      = Max(total_amount)
Collected (Paid)       = Sum of total_amount WHERE payment_status = Paid
Outstanding            = Total Revenue - Collected
```

#### Section 3 — Payment Breakdown Table
```
Payment Status  | Service Count  | Total Amount
Paid            |      8         | Rs.4,000
Pending         |      3         | Rs.1,500
Partial         |      1         |   Rs.500
```

#### Section 4 — Service Type Analysis
```
Service Type    | Total | Completed | Revenue
Regular Service    8        6        Rs.3,000
Filter Change      4        4        Rs.2,000
AMC Service        2        1        Rs.1,500
```

#### Section 5 — Technician Activity
```
Technician | Total | Completed | Pending | Value
Ramesh        10       8           2      Rs.4,000
Suresh         5       4           1      Rs.2,500
```

#### Section 6 — Customer Activity Table
```
Customer    | Mobile  | Services | Completed | Revenue  | Last Visit
Ramesh V.   9876xxxx      3          2       Rs.1,500   2026-09-15
```
→ Customer naam click karo → Customer detail page

#### Section 7 — Material Consumption
```
Material       | Qty Used | Est. Cost
RO Membrane       5 pcs   Rs.2,500
Carbon Filter     8 pcs    Rs.960
Total Material Cost: Rs.4,210
```
Cost = quantity_used × purchase_price

#### Section 8 — Inventory Snapshot (Sidebar)
```
Total Materials → 12
Healthy Stock   → 8   (green)
Low Stock       → 3   (amber)
Out of Stock    → 1   (red)
```

#### Section 9 — Daily Timeline Table
```
Date        | Total Services | Completed | Revenue
2026-09-01        4              3        Rs.1,200
2026-09-02        2              2          Rs.900
```

### CSV Export Feature
```
Export Dropdown:
  Daily Timeline CSV      → date-wise data
  Service Types CSV       → service type breakdown
  Material Usage CSV      → parts used
  Customer Activity CSV   → customer-wise data

[Download CSV] → .csv file download hoti hai directly
```

---

## 🔩 Shared Components

### Navbar (app/components/Navbar.tsx)
- Brand Logo: "M" icon (blue) + "Maruti Enterprises" text
- Center Navigation: Dashboard | Customers | Services | Inventory | Reminders | Reports
- Right Side: Theme Toggle (Light/Dark) + Logout button
- Active page link bold/blue highlighted

### Pagination (app/components/Pagination.tsx)
- Used on all list pages
- Page Size: 10 items per page
- Shows: "Showing X–Y of Z items"

### DateFilter (app/components/DateFilter.tsx)
- From Date → To Date date pickers with Clear button
- Used on: Customers, Services pages

---

## ⚙️ Backend API Summary

### Authentication (/auth)
| Endpoint | Method | Description |
|---|---|---|
| /auth/login | POST | Login karo → session cookie milti hai |
| /auth/logout | POST | Session destroy + cookie delete |
| /auth/me | GET | Current user info |

### Customers (/customers)
| Endpoint | Method | Description |
|---|---|---|
| /customers | GET | Sab customers list |
| /customers | POST | Naya customer create |
| /customers/{id} | GET | Ek customer ki detail |
| /customers/{id} | PUT | Customer update karo |
| /customers/{id} | DELETE | Customer delete karo |

### Services (/services)
| Endpoint | Method | Description |
|---|---|---|
| /services | GET | Sab services (date/status filter) |
| /services | POST | Naya service book karo |
| /services/today | GET | Aaj ke services |
| /services/upcoming | GET | Upcoming services |
| /services/overdue | GET | Overdue services |
| /services/{id} | GET | Ek service ki detail |
| /services/{id} | PUT | Service update karo |
| /services/{id}/complete | PUT | Service complete mark karo |
| /services/{id} | DELETE | Service delete karo |

### Inventory (/materials, /inventory)
| Endpoint | Method | Description |
|---|---|---|
| /materials | GET | Sab materials |
| /materials | POST | Naya material add karo |
| /materials/{id} | GET | Material detail |
| /materials/{id} | PUT | Material update karo |
| /inventory/purchase | POST | Stock purchase karo |
| /inventory/adjust | POST | Stock manually adjust karo |
| /inventory/transactions | GET | Sab stock transactions |
| /inventory/low-stock | GET | Low stock materials |

### Reminders (/reminders)
| Endpoint | Method | Description |
|---|---|---|
| /reminders | GET | Sab reminders (dynamic) |
| /reminders/summary | GET | Count summary |
| /reminders/today | GET | Aaj ke reminders |
| /reminders/overdue | GET | Overdue reminders |

### Reports (/reports)
| Endpoint | Method | Description |
|---|---|---|
| /reports/summary | GET | Comprehensive analytics (date range) |
| /reports/export/csv | GET | CSV download |

---

## 🚀 Application Run Karne ke Steps

### Backend (FastAPI)
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
./venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

### Frontend (Next.js)
```bash
cd frontend
npm install
npm run dev
```

### Access
- Frontend:  http://localhost:3000
- API Docs:  http://localhost:8000/docs  (Interactive Swagger UI)
- Login:     username: admin  |  password: admin123 (default)

---

## 📱 Local Network Deployment (Office Use)

Sab team members ek hi WiFi pe use kar sakein:

```bash
# Backend — 0.0.0.0 pe chalao
uvicorn app.main:app --host 0.0.0.0 --port 8000

# Frontend .env.local
NEXT_PUBLIC_API_URL=http://192.168.1.X:8000

# Frontend build
npm run build
npm start -- --hostname 0.0.0.0
```

Sab devices http://192.168.1.X:3000 se access kar sakte hain.

---

## 🎨 Design System

- Max Width: max-w-7xl (1280px) — balanced professional layout
- Theme: Light + Dark mode (toggle in navbar)
- Table Padding: px-4 py-3 headers, px-4 py-3.5 cells
- Card Radius: rounded-xl standard, rounded-2xl large cards
- Colors:
  - Blue: Primary actions, links
  - Green/Emerald: Completed, healthy, success
  - Amber: Pending, warning, low stock
  - Rose/Red: Overdue, error, out of stock
  - Purple: Next service due reminders

---

## 🛡️ Security Features

1. Authentication: HTTP-only session cookie (JS se access nahi)
2. Password Hashing: bcrypt (industry standard)
3. Brute Force Protection: IP-based rate limiting on login
4. Timing Attack Prevention: Dummy hash comparison
5. CORS: Sirf localhost:3000 se requests allow
6. Security Headers: X-Content-Type-Options, X-Frame-Options, Referrer-Policy
7. Protected Routes: Sab business routes auth require karte hain

---

Developed for Maruti Enterprises — RO Service Management System
Stack: Next.js 16 + FastAPI + Excel Storage

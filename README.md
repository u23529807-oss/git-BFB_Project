# BFB Supply Portal

[![Live Demo](https://img.shields.io/badge/🔗_View-Live_Demo-blue?style=for-the-badge)](https://u23529807-oss.github.io/git-BFB_Project/)

A simple web-based **construction materials and supply management system** built with HTML, Bootstrap, and JavaScript (using LocalStorage for persistence).

This project forms part of the **BFB321 Web Application Development module** and demonstrates how data-driven dashboards can be created to track materials, deliveries, and inventory activity across construction sites.

---

## 🚀 Features

### 🏠 Dashboard

- Displays live KPIs: **Active Orders**, **Deliveries in Transit**, and **Low-Stock Items**.  
- Shows all current orders as cards with material name, supplier, ETA, and delivery status.  
- Includes a **Bootstrap Add Order Modal** to quickly log new orders, instantly updating all pages.

### 🚚 Orders (Supplier Portal)

- View and update delivery information for all orders.  
- Mark orders as **Delivered** or update **ETAs** with one click.  
- Automatically refreshes dashboard and reports when changes occur.  
- Visual status badges indicate order progress:
  - 🟢 Scheduled  
  - 🟡 In Transit  
  - 🔴 Delayed  
  - ⚫ Delivered  

### 📦 Inventory Management

- Displays all materials with stock quantities and alert thresholds.  
- Color-coded badges:
  - 🟢 OK — stock sufficient  
  - 🟡 Low — near reorder threshold  
  - 🔴 Reorder — stock depleted  
- Data automatically updates when quantities are changed or reset.

### 📊 Reports & Analytics

- Dynamic visual dashboards powered by **Chart.js**.  
- Automatically updates charts when orders or inventory data changes.  
- Three key charts:
  1. **Buildings (Working vs WIP)** — active project sites  
  2. **Inventory Health** — stock distribution  
  3. **Deliveries by Status** — real-time order tracking

### 💾 Local Storage Persistence

- All data stored in browser **LocalStorage** (`bfb_supply_data_v1`) for offline access.  
- Automatically syncs across all pages.  
- Self-healing migration if schema changes or storage resets.

---

## ⚙️ Project Setup

### Using Local Files

1. Download or clone the project folder to your computer.  
2. Open `index.html` directly in your web browser.  
3. Use the navigation bar to switch between:
   - **Dashboard**
   - **Orders**
   - **Inventory**
   - **Reports**
4. Add or update orders to see instant changes across the dashboard and charts.

> 💡 The project runs entirely in the browser — no backend or server setup required.

---

## 🧩 Data Model

All app data is stored in LocalStorage in this structure:

```json
{
  "buildings": [
    { "id": 1, "name": "Site Alpha", "status": "Working" },
    { "id": 2, "name": "Site Bravo", "status": "WIP" }
  ],
  "orders": [
    { "id": 12, "material": "Cement Bags", "supplier": "BuildPro", "eta": "2025-10-25", "status": "In Transit" },
    { "id": 13, "material": "Bricks Pallets", "supplier": "BrickWorks", "eta": "2025-10-27", "status": "Scheduled" }
  ],
  "inventory": [
    { "name": "Cement Bags", "qty": 80, "low_threshold": 30 },
    { "name": "Bricks", "qty": 0, "low_threshold": 50 },
    { "name": "Paint (20L)", "qty": 14, "low_threshold": 20 }
  ]
}
```

Data Relationships
Buildings → Used in the Buildings (Working vs WIP) chart.

Orders → Drives KPIs, Supplier table, and Delivery Status chart.

Inventory → Used for stock levels and Inventory Health chart.

If data becomes corrupted or blank, delete the key bfb_supply_data_v1 in your browser’s LocalStorage and refresh the page to reset.

## File Structure


```
│
├── index.html           # Dashboard with KPIs and Add Order Modal
├── supplier.html        # Supplier Portal (order updates)
├── manager.html         # Inventory View (stock statuses)
├── reports.html         # Reports Page (Chart.js analytics)
│
├── app.js               # Core logic: data handling, rendering, charts
├── style.css            # Custom CSS styling
└── README.md            # Project documentation
All pages share a single navigation bar and connect to one data source (app.js).
```
## Usage Flow
  1.Add a New Order – Click “+ Add Order” on the dashboard to create an order.
  2.View & Update Orders – In the Supplier page, mark orders as delivered or change ETAs.
  3.Check Inventory – The Inventory page shows stock levels and alerts.
  4.View Reports – The Reports page shows updated analytics using Chart.js.

## Technologies Used

  - **HTML5** – Structure and markup
  - **Bootstrap 5.3** – Responsive layout and modals
  - **CSS3** – Custom styles and theme adjustments
  - **JavaScript (ES6)** – App logic, data management, dynamic updates
  - **Chart.js** – Reports and visual analytics
  - **LocalStorage API** – Browser-based data persistence


## Browser Compatibility
The BFB Supply Portal runs on all modern browsers that support HTML5 and CSS3:

- Google Chrome 90+
- Microsoft Edge 90+
- Mozilla Firefox 88+
- Apple Safari 14+

If charts don’t appear on the Reports page, ensure you’re connected to the internet so Chart.js can load from the CDN.
To work offline, download Chart.js and update the script path in reports.html.

## Optional Backend (Future Expansion)
While this version runs purely in the browser, it can easily connect to a small backend (e.g., Flask + SQLite) for long-term data storage.

Example Tables
Table Description
sites Construction sites and their statuses (Working / WIP)
suppliers Supplier info and contact details
materials Material catalog with SKU and category
inventory Tracks stock quantities and thresholds
orders Links suppliers, materials, ETAs, and delivery statuses


```mermaid

CREATE TABLE sites (
  site_id INTEGER PRIMARY KEY,
  site_name TEXT NOT NULL,
  status TEXT CHECK(status IN ('Working','WIP')) DEFAULT 'WIP'
);

CREATE TABLE suppliers (
  supplier_id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT
);

CREATE TABLE materials (
  material_id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  sku TEXT UNIQUE,
  category TEXT
);

CREATE TABLE inventory (
  inventory_id INTEGER PRIMARY KEY,
  material_id INTEGER REFERENCES materials(material_id),
  qty INTEGER DEFAULT 0,
  low_threshold INTEGER DEFAULT 10
);

CREATE TABLE orders (
  order_id INTEGER PRIMARY KEY,
  material_id INTEGER REFERENCES materials(material_id),
  supplier_id INTEGER REFERENCES suppliers(supplier_id),
  eta DATE,
  status TEXT CHECK(status IN ('Scheduled','In Transit','Delayed','Delivered')) DEFAULT 'Scheduled'
);

```

## Reports Integration (SQL → Charts)
Once connected to a backend, the reports can automatically visualize data such as:

Building Overview:

SELECT status, COUNT(*) AS total FROM sites GROUP BY status;
Inventory Health:
Bucket inventory items by stock vs threshold.
Deliveries by Status:
SELECT status, COUNT(*) AS total FROM orders GROUP BY status;

## Future Enhancements
Add Flask + SQLite backend for real persistence.
Include user authentication for suppliers and managers.
Export reports as CSV or PDF.
Add filters for site, supplier, or material category.
Integrate email notifications for delayed deliveries.
Custom DeWalt Construction theme with brand colors and logo.

## Entity Relationship Diagram (ERD)
```mermaid
Copy code
erDiagram
    buildings {
        INTEGER id PK
        TEXT name
        TEXT status
    }

    orders {
        INTEGER id PK
        TEXT material
        TEXT supplier
        TEXT eta
        TEXT status
    }

    inventory {
        INTEGER id PK
        TEXT name
        INTEGER qty
        INTEGER low_threshold
    }

    buildings ||--o{ orders : "receives"
    orders ||--o{ inventory : "uses"
```



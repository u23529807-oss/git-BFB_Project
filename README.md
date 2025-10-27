<h1 align="center"> BFB321 Supply Chain Management Web Application</h1>

<p align="center">
  <strong>University of Pretoria • Module BFB321 — Web App Development</strong><br>
  <em>Lightweight browser-based construction supply chain platform</em>
</p>

---

## Overview

The BFB321 Supply Chain Management Web App streamlines coordination across construction projects by giving managers real-time visibility into:

- Material orders and suppliers  
- Inventory health (OK / Low / Reorder)  
- Delivery progress and ETAs  
- Building sites (Working / WIP)

Built entirely with HTML, Bootstrap, JavaScript, and Chart.js, the app stores data locally using LocalStorage for instant, persistent demo use.

---

## Technologies Used

| Category | Technology |
|-----------|-------------|
| Front-End | HTML5, CSS3, Bootstrap 5.3 |
| Logic / Data | JavaScript (ES6), LocalStorage |
| Charts & Reports | Chart.js v4.4.1 |
| Backend Option | SQLite / MySQL (schema included) |

---

## Key Features

- Add, update, and track orders  
- Monitor inventory with low-stock alerts  
- View delivery statuses and KPIs  
- Manage multiple building sites  
- Visualize live analytics with Chart.js  
- One-click Reset / Export / Import data  

---

## File Structure

```text
git-BFB_Project
 ┣  index.html         → Dashboard
 ┣  supplier.html      → Orders
 ┣  manager.html       → Inventory
 ┣  reports.html       → Charts & Reports
 ┣  app.js             → App logic
 ┣  style.css          → Custom dark theme styling
 ┣  schema.sql         → Database schema (optional backend)
 ┗  README.md          → Documentation

 ```

## Impact & Sustainability

This web application shows how a nimble, browser-based application can improve visibility and coordination in a construction supply chain. By concentrating orders, stock signals (OK/Low/Reorder), and delivery status into a single interface, it reduces delays due to miscommunication and manual follow-ups, while preventing stockouts or excess holdings. The design has excellent scalability;  a small SQLite/MySQL backend is provided (schema included) to allow multi-site and role-based access, but the front-end is responsive and device-friendly for on-site use. Over time, the same structure supports IoT integration (sensor-based stock), ETA risk alerts, and scheduled notifications for proactive, sustainable operations.

## Data Model (ERD)

```mermaid
erDiagram
    SITES ||--o{ ORDERS : receives
    SUPPLIERS ||--o{ ORDERS : fulfills
    MATERIALS ||--o{ ORDERS : item
    MATERIALS ||--o{ INVENTORY : stocked_as

    SITES {
      INT site_id PK
      STRING site_name
      STRING status
    }

    SUPPLIERS {
      INT supplier_id PK
      STRING name
      STRING email
      STRING phone
    }

    MATERIALS {
      INT material_id PK
      STRING name
      STRING sku
      STRING category
    }

    INVENTORY {
      INT inventory_id PK
      INT material_id FK
      INT qty
      INT low_threshold
    }

    ORDERS {
      INT order_id PK
      INT material_id FK
      INT supplier_id FK
      DATE eta
      STRING status
      DATE delivered_at
    }
 




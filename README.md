<h1 align="center">🏗️ BFB321 Supply Chain Management Web Application</h1>

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
-- ==========================================================
-- BFB321 Supply Chain Management Database Schema
-- University of Pretoria | Web App Development Project
-- ==========================================================

PRAGMA foreign_keys = ON;

-- =============================
-- 1. Sites
-- =============================
CREATE TABLE IF NOT EXISTS sites (
    site_id       INTEGER PRIMARY KEY AUTOINCREMENT,
    site_name     TEXT NOT NULL,
    status        TEXT CHECK(status IN ('Working', 'WIP')) DEFAULT 'Working',
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================
-- 2. Suppliers
-- =============================
CREATE TABLE IF NOT EXISTS suppliers (
    supplier_id   INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT NOT NULL,
    email         TEXT,
    phone         TEXT,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast lookup by name or phone
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name);
CREATE INDEX IF NOT EXISTS idx_suppliers_phone ON suppliers(phone);

-- =============================
-- 3. Materials
-- =============================
CREATE TABLE IF NOT EXISTS materials (
    material_id   INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT NOT NULL,
    sku           TEXT UNIQUE,
    category      TEXT,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Fast SKU and category searches
CREATE INDEX IF NOT EXISTS idx_materials_sku ON materials(sku);
CREATE INDEX IF NOT EXISTS idx_materials_category ON materials(category);

-- =============================
-- 4. Inventory
-- =============================
CREATE TABLE IF NOT EXISTS inventory (
    inventory_id  INTEGER PRIMARY KEY AUTOINCREMENT,
    material_id   INTEGER NOT NULL,
    qty           INTEGER DEFAULT 0,
    low_threshold INTEGER DEFAULT 10,
    site_id       INTEGER,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(material_id) REFERENCES materials(material_id) ON DELETE CASCADE,
    FOREIGN KEY(site_id) REFERENCES sites(site_id) ON DELETE SET NULL
);

-- Common query optimization
CREATE INDEX IF NOT EXISTS idx_inventory_material_id ON inventory(material_id);
CREATE INDEX IF NOT EXISTS idx_inventory_qty_threshold ON inventory(qty, low_threshold);

-- =============================
-- 5. Orders
-- =============================
CREATE TABLE IF NOT EXISTS orders (
    order_id      INTEGER PRIMARY KEY AUTOINCREMENT,
    material_id   INTEGER NOT NULL,
    supplier_id   INTEGER NOT NULL,
    site_id       INTEGER,
    eta           DATE NOT NULL,
    status        TEXT CHECK(status IN ('Scheduled', 'In Transit', 'Delayed', 'Delivered')) DEFAULT 'Scheduled',
    delivered_at  DATE,
    delay_reason  TEXT,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(material_id) REFERENCES materials(material_id) ON DELETE CASCADE,
    FOREIGN KEY(supplier_id) REFERENCES suppliers(supplier_id) ON DELETE CASCADE,
    FOREIGN KEY(site_id) REFERENCES sites(site_id) ON DELETE SET NULL
);

-- Composite and status-based indexes
CREATE INDEX IF NOT EXISTS idx_orders_status_eta ON orders(status, eta);
CREATE INDEX IF NOT EXISTS idx_orders_supplier ON orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_orders_material ON orders(material_id);

-- ==========================================================
-- Seed Data
-- ==========================================================
INSERT INTO sites (site_name, status)
VALUES ('Site Alpha', 'Working'),
       ('Site Bravo', 'WIP'),
       ('Site Charlie', 'Working'),
       ('Site Delta', 'WIP');

INSERT INTO suppliers (name, email, phone)
VALUES ('BuildPro', 'info@buildpro.co.za', '+27 11 456 7890'),
       ('BrickWorks', 'sales@brickworks.co.za', '+27 21 987 6543'),
       ('Timber SA', 'orders@timbersa.co.za', '+27 12 345 6789');

INSERT INTO materials (name, sku, category)
VALUES ('Cement Bags', 'CEM-001', 'Building'),
       ('Bricks Pallet', 'BRK-001', 'Building'),
       ('Timber Trusses', 'TIM-001', 'Roofing'),
       ('Paint (20L)', 'PNT-001', 'Finishing');

INSERT INTO inventory (material_id, qty, low_threshold, site_id)
VALUES (1, 80, 30, 1),
       (2, 0, 50, 1),
       (3, 14, 20, 2);

INSERT INTO orders (material_id, supplier_id, site_id, eta, status, delay_reason)
VALUES (1, 1, 1, '2025-10-25', 'In Transit', NULL),
       (2, 2, 1, '2025-10-27', 'Scheduled', NULL),
       (3, 3, 2, '2025-10-24', 'Delayed', 'Supplier backlog');
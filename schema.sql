-- schema.sql — BFB Supply Portal (SQLite/MySQL compatible)

-- Sites (buildings)
CREATE TABLE IF NOT EXISTS sites (
  site_id      INTEGER PRIMARY KEY,
  site_name    TEXT NOT NULL,
  status       TEXT CHECK(status IN ('Working','WIP')) DEFAULT 'WIP'
);

-- Suppliers
CREATE TABLE IF NOT EXISTS suppliers (
  supplier_id  INTEGER PRIMARY KEY,
  name         TEXT NOT NULL,
  email        TEXT,
  phone        TEXT
);

-- Materials
CREATE TABLE IF NOT EXISTS materials (
  material_id  INTEGER PRIMARY KEY,
  name         TEXT NOT NULL,
  sku          TEXT UNIQUE,
  category     TEXT
);

-- Inventory (by material; extend with site_id for multi-site later)
CREATE TABLE IF NOT EXISTS inventory (
  inventory_id   INTEGER PRIMARY KEY,
  material_id    INTEGER NOT NULL REFERENCES materials(material_id),
  qty            INTEGER DEFAULT 0,
  low_threshold  INTEGER DEFAULT 10
);

-- Orders: link material + supplier (extend with site_id for routing)
CREATE TABLE IF NOT EXISTS orders (
  order_id     INTEGER PRIMARY KEY,
  material_id  INTEGER NOT NULL REFERENCES materials(material_id),
  supplier_id  INTEGER NOT NULL REFERENCES suppliers(supplier_id),
  eta          DATE,
  status       TEXT CHECK(status IN ('Scheduled','In Transit','Delayed','Delivered')) DEFAULT 'Scheduled',
  delivered_at DATE
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_sites_status      ON sites(status);
CREATE INDEX IF NOT EXISTS idx_inventory_q_low   ON inventory(qty, low_threshold);
CREATE INDEX IF NOT EXISTS idx_orders_status     ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_eta        ON orders(eta);

-- ----- Seed demo data -----
INSERT INTO sites (site_id, site_name, status) VALUES
  (1,'Site Alpha','Working'),
  (2,'Site Bravo','WIP'),
  (3,'Site Charlie','Working'),
  (4,'Site Delta','WIP');

INSERT INTO suppliers (supplier_id, name, email, phone) VALUES
  (1,'BuildPro','dispatch@buildpro.co.za','+27 10 555 001'),
  (2,'BrickWorks','bookings@brickworks.co.za','+27 11 555 002'),
  (3,'Timber SA','orders@timbersa.co.za','+27 12 555 003');

INSERT INTO materials (material_id, name, sku, category) VALUES
  (1,'Cement Bags','CEM-50KG','Cement'),
  (2,'Bricks Pallet','BRK-PAL','Masonry'),
  (3,'Paint (20L)','PNT-20L','Finishes');

INSERT INTO inventory (inventory_id, material_id, qty, low_threshold) VALUES
  (1,1,80,30),
  (2,2,0,50),
  (3,3,14,20);

INSERT INTO orders (order_id, material_id, supplier_id, eta, status) VALUES
  (12,1,1,'2025-10-25','In Transit'),
  (13,2,2,'2025-10-27','Scheduled'),
  (14,3,3,'2025-10-24','Delayed');
// app.js — robust data, migration, rendering (Dashboard, Orders, Inventory, Reports)
// + Utilities: Reset seed data, Export/Import JSON, Orders search
(() => {
  const STORE_KEY = "bfb_supply_data_v1";

  const defaultData = {
    buildings: [
      { id: 1, name: "Site Alpha", status: "Working" },
      { id: 2, name: "Site Bravo", status: "WIP" },
      { id: 3, name: "Site Charlie", status: "Working" },
      { id: 4, name: "Site Delta", status: "WIP" }
    ],
    orders: [
      { id: 12, material: "Cement Bags", supplier: "BuildPro", eta: "2025-10-25", status: "In Transit" },
      { id: 13, material: "Bricks Pallets", supplier: "BrickWorks", eta: "2025-10-27", status: "Scheduled" },
      { id: 14, material: "Trusses", supplier: "Timber SA", eta: "2025-10-24", status: "Delayed" }
    ],
    inventory: [
      { name: "Cement Bags", qty: 80, low_threshold: 30 },
      { name: "Bricks", qty: 0, low_threshold: 50 },
      { name: "Paint (20L)", qty: 14, low_threshold: 20 }
    ]
  };

  // ---------- Persistence + MIGRATION ----------
  function loadData() {
    const raw = localStorage.getItem(STORE_KEY);
    let data;
    if (!raw) {
      data = structuredClone(defaultData);
      localStorage.setItem(STORE_KEY, JSON.stringify(data));
      return data;
    }
    try { data = JSON.parse(raw); }
    catch {
      data = structuredClone(defaultData);
      localStorage.setItem(STORE_KEY, JSON.stringify(data));
      return data;
    }
    return migrate(data);
  }

  function migrate(data) {
    // Add any missing top-level arrays
    let changed = false;
    if (!Array.isArray(data.buildings)) { data.buildings = structuredClone(defaultData.buildings); changed = true; }
    if (!Array.isArray(data.orders)) { data.orders = []; changed = true; }
    if (!Array.isArray(data.inventory)) { data.inventory = []; changed = true; }
    if (changed) saveData(data);
    return data;
  }

  function saveData(data) {
    localStorage.setItem(STORE_KEY, JSON.stringify(data));
  }

  // ---------- Utilities ----------
  const fmt = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short" }); // 25 Oct
  const todayISO = () => new Date().toISOString().slice(0, 10);
  const clsForStatus = (s) =>
    s === "Delivered" ? "bg-secondary"
    : s === "Scheduled" ? "bg-success"
    : s === "In Transit" ? "bg-warning text-dark"
    : s === "Delayed" ? "bg-danger"
    : "bg-light text-dark";

  function computeKPIs(data) {
    const active = data.orders.filter(o => o.status !== "Delivered");
    const inTransit = data.orders.filter(o => o.status === "In Transit").length;
    const low = data.inventory.filter(i => i.qty <= 0 || i.qty <= i.low_threshold).length;
    return { totalOrders: active.length, inTransit, lowStock: low };
  }

  function nextOrderId(data) {
    const ids = data.orders.map(o => o.id);
    return ids.length ? Math.max(...ids) + 1 : 1;
  }

  // ---------- Dashboard ----------
  function renderDashboard(data) {
    const k = computeKPIs(data);
    const kOrders = document.getElementById("kpi-orders");
    const kTransit = document.getElementById("kpi-transit");
    const kLow = document.getElementById("kpi-low");
    if (kOrders) kOrders.textContent = k.totalOrders;
    if (kTransit) kTransit.textContent = k.inTransit;
    if (kLow) kLow.textContent = k.lowStock;

    const grid = document.getElementById("orders-grid");
    if (!grid) return;
    grid.innerHTML = "";
    data.orders
      .sort((a, b) => a.id - b.id)
      .forEach(o => {
        const card = document.createElement("div");
        card.className = "col";
        card.innerHTML = `
          <div class="card h-100 shadow-sm">
            <div class="card-body">
              <h6 class="card-title">Order #${o.id} – ${o.material}</h6>
              <p class="mb-1 small text-muted">Supplier: ${o.supplier}</p>
              <p class="mb-1 small text-muted">ETA: ${fmt.format(new Date(o.eta))}</p>
              <span class="badge ${clsForStatus(o.status)}">${o.status}</span>
            </div>
          </div>`;
        grid.appendChild(card);
      });
  }

  // ---------- Supplier (with search) ----------
  function renderSupplier(data, filter = "") {
    const tbody = document.getElementById("orders-tbody");
    if (!tbody) return;

    const term = filter.trim().toLowerCase();
    const rows = data.orders
      .slice()
      .sort((a, b) => a.id - b.id)
      .filter(o => {
        if (!term) return true;
        return (
          String(o.id).includes(term) ||
          o.material.toLowerCase().includes(term) ||
          o.supplier.toLowerCase().includes(term) ||
          o.status.toLowerCase().includes(term)
        );
      });

    tbody.innerHTML = "";
    rows.forEach(o => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${o.id}</td>
        <td>${o.material}</td>
        <td>${o.supplier}</td>
        <td>${fmt.format(new Date(o.eta))}</td>
        <td><span class="badge ${clsForStatus(o.status)}">${o.status}</span></td>
        <td class="text-nowrap">
          <button class="btn btn-sm btn-outline-success me-2" data-action="deliver" data-id="${o.id}" ${o.status==="Delivered"?"disabled":""}>Mark Delivered</button>
          <button class="btn btn-sm btn-outline-primary" data-action="eta" data-id="${o.id}">Update ETA</button>
        </td>`;
      tbody.appendChild(tr);
    });

    tbody.onclick = (e) => {
      const btn = e.target.closest("button[data-action]");
      if (!btn) return;
      const id = Number(btn.dataset.id);
      const action = btn.dataset.action;
      if (action === "deliver") {
        data.orders = data.orders.map(o => o.id === id ? { ...o, status: "Delivered", delivered_at: todayISO() } : o);
        saveData(data);
        renderSupplier(data, document.getElementById("orders-search")?.value || "");
        renderDashboard(data);
        renderReports(data);
      }
      if (action === "eta") {
        const current = data.orders.find(o => o.id === id);
        const next = prompt(`Enter new ETA for Order #${id} (YYYY-MM-DD)`, current?.eta || todayISO());
        if (!next) return;
        const d = new Date(next);
        if (Number.isNaN(d.getTime())) { alert("Invalid date. Please use YYYY-MM-DD."); return; }
        data.orders = data.orders.map(o => o.id === id ? { ...o, eta: next, status: o.status==="Delivered" ? "Delivered" : "Scheduled" } : o);
        saveData(data);
        renderSupplier(data, document.getElementById("orders-search")?.value || "");
        renderDashboard(data);
        renderReports(data);
      }
    };

    const search = document.getElementById("orders-search");
    if (search && !search._wired) {
      search._wired = true;
      search.addEventListener("input", () => renderSupplier(loadData(), search.value));
    }
  }

  // ---------- Manager ----------
  function renderManager(data) {
    const grid = document.getElementById("inventory-grid");
    if (!grid) return;

    grid.innerHTML = "";
    data.inventory.forEach(item => {
      const status =
        item.qty <= 0 ? { label: "Reorder", cls: "bg-danger" } :
        item.qty <= item.low_threshold ? { label: "Low", cls: "bg-warning text-dark" } :
        { label: "OK", cls: "bg-success" };

      const col = document.createElement("div");
      col.className = "col-md-4";
      col.innerHTML = `
        <div class="card shadow-sm h-100">
          <div class="card-body">
            <h6 class="card-title">${item.name}</h6>
            <p class="mb-1">In stock: <strong>${item.qty}</strong></p>
            <span class="badge ${status.cls}">${status.label}</span>
          </div>
        </div>`;
      grid.appendChild(col);
    });
  }

  // ---------- Reports (Chart.js with guards) ----------
  let charts = {};

  function ensureChartThen(drawFn, retries = 12) {
    if (window.Chart && typeof window.Chart === "function") return drawFn();
    if (retries <= 0) {
      // Friendly fallback text if Chart.js failed to load
      ["chart-buildings","chart-inventory","chart-deliveries"].forEach(id => {
        const c = document.getElementById(id);
        if (c) {
          const msg = document.createElement("div");
          msg.className = "text-muted small";
          msg.textContent = "Chart library unavailable. Connect to the internet or add Chart.js locally.";
          c.replaceWith(msg);
        }
      });
      return;
    }
    setTimeout(() => ensureChartThen(drawFn, retries - 1), 250);
  }

  // --- Chart.js dark defaults (call once) ---
function setChartDarkDefaults() {
  if (!window.Chart) return;
  // text / ticks / tooltip
  Chart.defaults.color = '#e5e7eb';           // light text
  Chart.defaults.borderColor = 'rgba(255,255,255,.12)'; // grid/border lines
  Chart.defaults.plugins.legend.labels.color = '#cbd5e1';
  Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(17,24,39,.95)';
  Chart.defaults.plugins.tooltip.titleColor = '#fff';
  Chart.defaults.plugins.tooltip.bodyColor = '#e5e7eb';
}

  function renderReports(data) {
    const buildings = Array.isArray(data.buildings) ? data.buildings : [];
    const inventory = Array.isArray(data.inventory) ? data.inventory : [];
    const orders = Array.isArray(data.orders) ? data.orders : [];

    const bWorking = buildings.filter(b => b.status === "Working").length;
    const bWip = buildings.filter(b => b.status === "WIP").length;

    let invOK = 0, invLow = 0, invReorder = 0;
    inventory.forEach(i => {
      if (i.qty <= 0) invReorder++;
      else if (i.qty <= i.low_threshold) invLow++;
      else invOK++;
    });

    const dScheduled = orders.filter(o => o.status === "Scheduled").length;
    const dTransit   = orders.filter(o => o.status === "In Transit").length;
    const dDelayed   = orders.filter(o => o.status === "Delayed").length;
    const dDelivered = orders.filter(o => o.status === "Delivered").length;

    ensureChartThen(() => {
        setChartDarkDefaults();
      const ctxBuild = document.getElementById("chart-buildings");
      if (ctxBuild) {
        charts.buildings?.destroy?.();
        charts.buildings = new Chart(ctxBuild, {
          type: "bar",
          data: { labels: ["Working", "WIP"], datasets: [{ label: "Sites", data: [bWorking, bWip] }] },
          options: { responsive: true, plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } }
        });
      }

      const ctxInv = document.getElementById("chart-inventory");
      if (ctxInv) {
        charts.inventory?.destroy?.();
        charts.inventory = new Chart(ctxInv, {
          type: "bar",
          data: { labels: ["OK", "Low", "Reorder"], datasets: [{ label: "Items", data: [invOK, invLow, invReorder] }] },
          options: { responsive: true, plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } }
        });
      }

      const ctxDel = document.getElementById("chart-deliveries");
      if (ctxDel) {
        charts.deliveries?.destroy?.();
        charts.deliveries = new Chart(ctxDel, {
          type: "bar",
          data: { labels: ["Scheduled", "In Transit", "Delayed", "Delivered"], datasets: [{ label: "Orders", data: [dScheduled, dTransit, dDelayed, dDelivered] }] },
          options: { responsive: true, plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } }
        });
      }
    });
  }

  // ---------- Nav active state ----------
  function fixActiveNav() {
    const path = location.pathname.split("/").pop() || "index.html";
    document.querySelectorAll(".navbar .nav-link").forEach(a => {
      const href = a.getAttribute("href");
      a.classList.toggle("active", href === path);
      if (a.classList.contains("active")) a.setAttribute("aria-current", "page");
    });
  }

  // ---------- Add Order wiring ----------
  function wireAddOrder(data) {
    const form = document.getElementById("add-order-form");
    if (!form) return;

    const etaInput = document.getElementById("order-eta");
    if (etaInput) etaInput.setAttribute("min", todayISO());

    form.addEventListener("submit", (e) => {
      e.preventDefault(); e.stopPropagation();
      form.classList.add("was-validated");

      const material = document.getElementById("order-material").value.trim();
      const supplier = document.getElementById("order-supplier").value.trim();
      const eta = document.getElementById("order-eta").value;
      const status = document.getElementById("order-status").value;

      if (!material || !supplier || !eta || !status) return;
      const d = new Date(eta); if (Number.isNaN(d.getTime())) return;

      const newOrder = { id: nextOrderId(data), material, supplier, eta, status };
      data.orders.push(newOrder);
      saveData(data);

      form.reset(); form.classList.remove("was-validated");

      const modalEl = document.getElementById("addOrderModal");
      const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
      modal.hide();

      renderDashboard(data);
      renderReports(data);
    });
  }

  // ---------- Utilities panel on Dashboard: Reset / Export / Import ----------
  function wireUtilities() {
    const btnReset = document.getElementById("btn-reset-data");
    const btnExport = document.getElementById("btn-export");
    const inputImport = document.getElementById("input-import");

    if (btnReset && !btnReset._wired) {
      btnReset._wired = true;
      btnReset.addEventListener("click", () => {
        if (!confirm("Reset demo data to defaults? This will overwrite current data.")) return;
        const seed = structuredClone(defaultData);
        saveData(seed);
        // Re-render visible parts
        renderDashboard(seed);
        renderReports(seed);
        // If supplier or manager pages are open, refresh them as well
        renderSupplier(seed, document.getElementById("orders-search")?.value || "");
        renderManager(seed);
      });
    }

    if (btnExport && !btnExport._wired) {
      btnExport._wired = true;
      btnExport.addEventListener("click", () => {
        const data = loadData();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `bfb_supply_export_${new Date().toISOString().slice(0,10)}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      });
    }

    if (inputImport && !inputImport._wired) {
      inputImport._wired = true;
      inputImport.addEventListener("change", async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
          const text = await file.text();
          const json = JSON.parse(text);
          // Minimal validation
          if (!json || !Array.isArray(json.buildings) || !Array.isArray(json.orders) || !Array.isArray(json.inventory)) {
            alert("Invalid JSON structure. Expect { buildings:[], orders:[], inventory:[] }");
            return;
          }
          saveData(json);
          renderDashboard(json);
          renderReports(json);
          renderSupplier(json, document.getElementById("orders-search")?.value || "");
          renderManager(json);
          alert("Import successful.");
        } catch (err) {
          console.error(err);
          alert("Failed to import JSON.");
        } finally {
          e.target.value = "";
        }
      });
    }
  }

  // ---------- Boot ----------
  document.addEventListener("DOMContentLoaded", () => {
    const data = loadData();
    fixActiveNav();
    renderDashboard(data);
    renderSupplier(data);
    renderManager(data);
    renderReports(data);
    wireAddOrder(data);
    wireUtilities();

    // Light polling for cross-tab updates (dashboard & reports)
    if (document.getElementById("kpi-orders") || document.getElementById("chart-deliveries")) {
      setInterval(() => {
        const fresh = loadData();
        renderDashboard(fresh);
        renderReports(fresh);
      }, 1000);
    }
  });
})();
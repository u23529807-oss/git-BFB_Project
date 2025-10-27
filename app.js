// app.js — BFB Supply Portal
// Features:
// - Seed + persistence (localStorage)
// - Dashboard KPIs & order cards
// - Supplier page: search, sortable columns, Mark Delivered, Update ETA, Report Delay (modal)
// - Manager page: inventory cards (+/- qty if you use manager.html with controls)
// - Reports: Chart.js with dark theme defaults and robust loading guard
// - Utilities on Dashboard: Reset / Export / Import
(() => {
  const STORE_KEY = "bfb_supply_data_v1";

  // -------------------- Seed Data --------------------
  const defaultData = {
    buildings: [
      { id: 1, name: "Site Alpha", status: "Working" },
      { id: 2, name: "Site Bravo", status: "WIP" },
      { id: 3, name: "Site Charlie", status: "Working" },
      { id: 4, name: "Site Delta", status: "WIP" }
    ],
    orders: [
      { id: 12, material: "Cement Bags", supplier: "BuildPro", eta: "2025-10-25", status: "In Transit", created_at: nowISO() },
      { id: 13, material: "Bricks Pallets", supplier: "BrickWorks", eta: "2025-10-27", status: "Scheduled", created_at: nowISO() },
      { id: 14, material: "Trusses", supplier: "Timber SA", eta: "2025-10-24", status: "Delayed", created_at: nowISO(), delay_reason: "Supplier backlog" }
    ],
    inventory: [
      { name: "Cement Bags", qty: 80, low_threshold: 30, created_at: nowISO() },
      { name: "Bricks", qty: 0, low_threshold: 50, created_at: nowISO() },
      { name: "Paint (20L)", qty: 14, low_threshold: 20, created_at: nowISO() }
    ]
  };

  // -------------------- Helpers --------------------
  function nowISO() { return new Date().toISOString(); }
  function todayISO() { return new Date().toISOString().slice(0, 10); }
  const fmtDMo = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short" }); // 25 Oct

  function clsForStatus(s) {
    return s === "Delivered" ? "bg-secondary"
      : s === "Scheduled" ? "bg-success"
      : s === "In Transit" ? "bg-warning text-dark"
      : s === "Delayed" ? "bg-danger"
      : "bg-light text-dark";
  }

  // -------------------- Storage & Migration --------------------
  function loadData() {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) {
      const seed = structuredClone(defaultData);
      localStorage.setItem(STORE_KEY, JSON.stringify(seed));
      return seed;
    }
    let data;
    try { data = JSON.parse(raw); } catch { data = structuredClone(defaultData); }
    return migrate(data);
  }

  function saveData(data) {
    localStorage.setItem(STORE_KEY, JSON.stringify(data));
  }

  function migrate(data) {
    let changed = false;
    if (!Array.isArray(data.buildings)) { data.buildings = structuredClone(defaultData.buildings); changed = true; }
    if (!Array.isArray(data.orders)) { data.orders = []; changed = true; }
    if (!Array.isArray(data.inventory)) { data.inventory = []; changed = true; }

    // Ensure audit fields exist
    data.orders.forEach(o => { if (!o.created_at) o.created_at = nowISO(); });
    data.inventory.forEach(i => { if (!i.created_at) i.created_at = nowISO(); });

    if (changed) saveData(data);
    return data;
  }

  // -------------------- KPIs --------------------
  function computeKPIs(data) {
    const active = data.orders.filter(o => o.status !== "Delivered").length;
    const inTransit = data.orders.filter(o => o.status === "In Transit").length;
    const low = data.inventory.filter(i => i.qty <= 0 || i.qty <= i.low_threshold).length;
    return { totalOrders: active, inTransit, lowStock: low };
  }

  function nextOrderId(data) {
    const ids = data.orders.map(o => o.id);
    return ids.length ? Math.max(...ids) + 1 : 1;
  }

  // -------------------- Dashboard --------------------
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
      .slice()
      .sort((a, b) => a.id - b.id)
      .forEach(o => {
        const card = document.createElement("div");
        card.className = "col";
        card.innerHTML = `
          <div class="card h-100 shadow-sm">
            <div class="card-body">
              <h6 class="card-title">Order #${o.id} – ${o.material}</h6>
              <p class="mb-1 small text-muted">Supplier: ${o.supplier}</p>
              <p class="mb-1 small text-muted">ETA: ${fmtDMo.format(new Date(o.eta))}</p>
              <span class="badge ${clsForStatus(o.status)}">${o.status}</span>
              ${o.delay_reason ? `<div class="small text-muted mt-2">Reason: ${o.delay_reason}</div>` : ""}
            </div>
          </div>`;
        grid.appendChild(card);
      });
  }

  // -------------------- Supplier: Sorting + Search --------------------
  // Sorting state & helpers
  let orderSort = { key: null, dir: 1 }; // dir: 1=asc, -1=desc

  function compareOrders(a, b, key) {
    const va = a[key] ?? "", vb = b[key] ?? "";
    if (key === "eta") return (new Date(va) - new Date(vb)) * orderSort.dir;
    if (typeof va === "number" || /^\d+$/.test(String(va))) return (Number(va) - Number(vb)) * orderSort.dir;
    return String(va).localeCompare(String(vb)) * orderSort.dir;
  }

  function wireOrderSort() {
    document.querySelectorAll('thead [data-sort]')?.forEach(th => {
      if (th._wired) return; th._wired = true;
      th.style.cursor = "pointer";
      th.title = "Click to sort";
      th.addEventListener("click", () => {
        const key = th.getAttribute("data-sort");
        orderSort.dir = (orderSort.key === key) ? -orderSort.dir : 1;
        orderSort.key = key;
        renderSupplier(loadData(), document.getElementById("orders-search")?.value || "");
      });
    });
  }

  function renderSupplier(data, filter = "") {
    const tbody = document.getElementById("orders-tbody");
    if (!tbody) return;

    const term = filter.trim().toLowerCase();
    const rows = data.orders
      .slice()
      .filter(o => {
        if (!term) return true;
        return (
          String(o.id).includes(term) ||
          o.material.toLowerCase().includes(term) ||
          o.supplier.toLowerCase().includes(term) ||
          o.status.toLowerCase().includes(term)
        );
      })
      .sort((a, b) => orderSort.key ? compareOrders(a, b, orderSort.key) : a.id - b.id);

    tbody.innerHTML = "";
    rows.forEach(o => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${o.id}</td>
        <td>${o.material}</td>
        <td>${o.supplier}</td>
        <td>${fmtDMo.format(new Date(o.eta))}</td>
        <td><span class="badge ${clsForStatus(o.status)}">${o.status}</span></td>
        <td class="text-nowrap">
          <button class="btn btn-sm btn-outline-danger me-2" data-action="delay" data-id="${o.id}">Report Delay</button>
          <button class="btn btn-sm btn-outline-success me-2" data-action="deliver" data-id="${o.id}" ${o.status==="Delivered"?"disabled":""}>Mark Delivered</button>
          <button class="btn btn-sm btn-outline-primary" data-action="eta" data-id="${o.id}">Update ETA</button>
        </td>`;
      tbody.appendChild(tr);
    });

    // Event delegation for row actions
    tbody.onclick = (e) => {
      const btn = e.target.closest("button[data-action]");
      if (!btn) return;
      const id = Number(btn.dataset.id);
      const action = btn.dataset.action;
      const state = loadData();

      if (action === "deliver") {
        state.orders = state.orders.map(o => o.id === id
          ? { ...o, status: "Delivered", delivered_at: todayISO(), updated_at: nowISO() }
          : o);
        saveData(state);
        renderSupplier(state, document.getElementById("orders-search")?.value || "");
        renderDashboard(state);
        renderReports(state);
      }

      if (action === "eta") {
        const current = state.orders.find(o => o.id === id);
        const next = prompt(`Enter new ETA for Order #${id} (YYYY-MM-DD)`, current?.eta || todayISO());
        if (!next) return;
        const d = new Date(next);
        if (Number.isNaN(d.getTime())) { alert("Invalid date. Please use YYYY-MM-DD."); return; }
        state.orders = state.orders.map(o => o.id === id
          ? { ...o, eta: next, status: o.status === "Delivered" ? "Delivered" : "Scheduled", updated_at: nowISO() }
          : o);
        saveData(state);
        renderSupplier(state, document.getElementById("orders-search")?.value || "");
        renderDashboard(state);
        renderReports(state);
      }

      if (action === "delay") {
        // Open modal and prefill hidden field
        const idEl = document.getElementById("delay-order-id");
        const reasonEl = document.getElementById("delay-reason");
        const etaEl = document.getElementById("delay-new-eta");
        if (idEl) idEl.value = id;
        if (reasonEl) reasonEl.value = "";
        if (etaEl) etaEl.value = "";
        const modal = new bootstrap.Modal(document.getElementById("delayModal"));
        modal.show();
      }
    };

    // Wire search once
    const search = document.getElementById("orders-search");
    if (search && !search._wired) {
      search._wired = true;
      search.addEventListener("input", () => renderSupplier(loadData(), search.value));
    }

    // Wire column sorting (once per page load)
    wireOrderSort();
  }

  // -------------------- Manager --------------------
  function renderManager(data) {
    const grid = document.getElementById("inventory-grid");
    if (!grid) return;
    grid.innerHTML = "";
    data.inventory.forEach((item, idx) => {
      const status =
        item.qty <= 0 ? { label: "Reorder", cls: "bg-danger" } :
        item.qty <= item.low_threshold ? { label: "Low", cls: "bg-warning text-dark" } :
        { label: "OK", cls: "bg-success" };

      const col = document.createElement("div");
      col.className = "col-md-4";
      col.innerHTML = `
        <div class="card shadow-sm h-100">
          <div class="card-body">
            <h6 class="card-title d-flex justify-content-between align-items-center">
              ${item.name}
              <span class="badge ${status.cls}">${status.label}</span>
            </h6>
            <p class="mb-2">In stock: <strong>${item.qty}</strong></p>
            <div class="btn-group btn-group-sm">
              <button class="btn btn-outline-secondary" data-action="dec" data-idx="${idx}">
                <i class="bi bi-dash-lg"></i>
              </button>
              <button class="btn btn-outline-secondary" data-action="inc" data-idx="${idx}">
                <i class="bi bi-plus-lg"></i>
              </button>
            </div>
          </div>
        </div>`;
      grid.appendChild(col);
    });

    // +/- quantity handler if this page exists
    grid.onclick = (e) => {
      const btn = e.target.closest("button[data-action]");
      if (!btn) return;
      const idx = Number(btn.dataset.idx);
      const state = loadData();
      if (!state.inventory?.[idx]) return;
      const item = state.inventory[idx];
      item.qty += btn.dataset.action === "inc" ? 1 : -1;
      if (item.qty < 0) item.qty = 0;
      item.updated_at = nowISO();
      saveData(state);
      renderManager(state);
      renderDashboard(state);
      renderReports(state);
    };
  }

  // -------------------- Reports (Chart.js) --------------------
  let charts = {};

  function setChartDarkDefaults() {
    if (!window.Chart) return;
    Chart.defaults.color = '#e5e7eb';
    Chart.defaults.borderColor = 'rgba(255,255,255,.12)';
    Chart.defaults.plugins.legend.labels.color = '#cbd5e1';
    Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(17,24,39,.95)';
    Chart.defaults.plugins.tooltip.titleColor = '#fff';
    Chart.defaults.plugins.tooltip.bodyColor = '#e5e7eb';
  }

  function ensureChartThen(drawFn, retries = 12) {
    if (window.Chart && typeof window.Chart === "function") return drawFn();
    if (retries <= 0) {
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

  // -------------------- Navbar active state --------------------
  function fixActiveNav() {
    const path = location.pathname.split("/").pop() || "index.html";
    document.querySelectorAll(".navbar .nav-link").forEach(a => {
      const href = a.getAttribute("href");
      a.classList.toggle("active", href === path);
      if (a.classList.contains("active")) a.setAttribute("aria-current", "page");
    });
  }

  // -------------------- Add Order Modal (Dashboard) --------------------
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

      const newOrder = { id: nextOrderId(data), material, supplier, eta, status, created_at: nowISO() };
      data.orders.push(newOrder);
      saveData(data);

      form.reset(); form.classList.remove("was-validated");

      const modalEl = document.getElementById("addOrderModal");
      const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
      modal.hide();

      renderDashboard(data);
      renderReports(data);
      renderSupplier(data, document.getElementById("orders-search")?.value || "");
    });
  }

  // -------------------- Utilities: Reset / Export / Import --------------------
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
        renderDashboard(seed);
        renderReports(seed);
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
        a.download = `bfb_supply_export_${todayISO()}.json`;
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

  // -------------------- Delay modal handler (Supplier page) --------------------
  function wireDelayModal() {
    const form = document.getElementById("delay-form");
    if (!form || form._wired) return;
    form._wired = true;

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const id = Number(document.getElementById("delay-order-id").value);
      const reason = document.getElementById("delay-reason").value.trim();
      const newEta = document.getElementById("delay-new-eta").value.trim();

      const state = loadData();
      state.orders = state.orders.map(o => {
        if (o.id !== id) return o;
        return {
          ...o,
          status: "Delayed",
          delay_reason: reason || "Unspecified",
          eta: newEta || o.eta,
          updated_at: nowISO()
        };
      });

      saveData(state);
      bootstrap.Modal.getInstance(document.getElementById("delayModal"))?.hide();
      renderSupplier(state, document.getElementById("orders-search")?.value || "");
      renderDashboard(state);
      renderReports(state);
    });
  }

  // -------------------- Boot --------------------
  function boot() {
    const data = loadData();
    fixActiveNav();

    // Initial renders (only run on pages where the containers exist)
    renderDashboard(data);
    renderSupplier(data);
    renderManager(data);
    renderReports(data);

    // Wire interactions
    wireAddOrder(data);
    wireUtilities();
    wireDelayModal();

    // Light polling to keep KPIs / charts fresh across tabs
    if (document.getElementById("kpi-orders") || document.getElementById("chart-deliveries")) {
      setInterval(() => {
        const fresh = loadData();
        renderDashboard(fresh);
        renderReports(fresh);
      }, 1000);
    }
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
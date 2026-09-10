if (sessionStorage.getItem("ownerLoggedIn") !== "1") {
  alert("Khusus Owner! Silakan login dulu.");
  window.location.href = "../index.html";
}

function formatPrice(p) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(p);
}

function updateStats() {
  const pending = JSON.parse(localStorage.getItem("pendingOrders") || "[]");
  const history = JSON.parse(localStorage.getItem("salesHistory") || "[]");
  const approved = history.filter(o => o.status === "approved");

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  const todayTotal = approved.reduce((sum, o) => {
    return new Date(o.createdAt).getTime() >= startOfDay ? sum + o.total : sum;
  }, 0);

  const grandTotal = approved.reduce((sum, o) => sum + o.total, 0);

  document.getElementById("statToday").textContent = formatPrice(todayTotal);
  document.getElementById("statTotal").textContent = formatPrice(grandTotal);
  document.getElementById("statPending").textContent = pending.length;
}

function renderPendingOrders() {
  const el = document.getElementById("pendingOrders");
  const pending = JSON.parse(localStorage.getItem("pendingOrders") || "[]");
  if (!pending.length) { el.innerHTML = "<p style='color:#999;font-size:12px'>Tidak ada pesanan menunggu.</p>"; return; }
  el.innerHTML = pending.map(o => `
    <div class="pending-order">
      <div class="pending-order-info">
        <strong>#${o.id.slice(-6)} — ${formatPrice(o.total)}</strong>
        <span>${o.items.map(i => `${i.name} x${i.quantity}`).join(", ")}</span>
        ${o.proof ? `<img src="${o.proof.dataUrl}" style="width:50px;height:50px;object-fit:cover;border-radius:6px;margin-top:4px;cursor:pointer" onclick="window.open(this.src,'_blank')" />` : "<span style='font-size:10px;color:#999'>tanpa bukti</span>"}
      </div>
      <div class="pending-order-actions">
        <button class="approve-btn" onclick="approve('${o.id}')">ACC</button>
        <button class="reject-btn" onclick="reject('${o.id}')">Tolak</button>
      </div>
    </div>
  `).join("");
}

function renderHistory() {
  const el = document.getElementById("salesHistoryList");
  const history = JSON.parse(localStorage.getItem("salesHistory") || "[]");
  if (!history.length) { el.innerHTML = "<p style='color:#999;font-size:12px'>Belum ada riwayat.</p>"; return; }
  el.innerHTML = history.slice().reverse().map(o => `
    <div class="history-item">
      <div class="history-order-info">
        <strong>#${o.id.slice(-6)} — ${formatPrice(o.total)}</strong>
        <span>${new Date(o.createdAt).toLocaleString("id-ID")}</span>
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        ${o.proof ? `<img src="${o.proof.dataUrl}" class="history-proof" onclick="window.open(this.src,'_blank')" />` : ""}
        <span class="history-status ${o.status}">${o.status.toUpperCase()}</span>
      </div>
    </div>
  `).join("");
}

window.approve = function(id) {
  const pending = JSON.parse(localStorage.getItem("pendingOrders") || "[]");
  const order = pending.find(o => o.id === id);
  if (!order) return;
  order.status = "approved";
  order.approvedAt = new Date().toISOString();
  localStorage.setItem("pendingOrders", JSON.stringify(pending.filter(o => o.id !== id)));
  const history = JSON.parse(localStorage.getItem("salesHistory") || "[]");
  history.push(order);
  localStorage.setItem("salesHistory", JSON.stringify(history));
  refresh();
};

window.reject = function(id) {
  const pending = JSON.parse(localStorage.getItem("pendingOrders") || "[]");
  const order = pending.find(o => o.id === id);
  if (!order) return;
  order.status = "rejected";
  localStorage.setItem("pendingOrders", JSON.stringify(pending.filter(o => o.id !== id)));
  const history = JSON.parse(localStorage.getItem("salesHistory") || "[]");
  history.push(order);
  localStorage.setItem("salesHistory", JSON.stringify(history));
  refresh();
};

window.logout = function() {
  sessionStorage.removeItem("ownerLoggedIn");
  window.location.href = "../index.html";
};

let currentPeriod = "hari_ini";
const canvas = document.getElementById("salesChartCanvas");
const ctx = canvas.getContext("2d");

function drawChart() {
  const history = JSON.parse(localStorage.getItem("salesHistory") || "[]").filter(o => o.status === "approved");
  const now = new Date();
  let labels = [], values = [];

  if (currentPeriod === "hari_ini") {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    labels = ["Hari Ini"];
    values = [history.reduce((sum, o) => new Date(o.createdAt).getTime() >= start ? sum + o.total : sum, 0)];
  } else if (currentPeriod === "7_hari") {
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now); d.setDate(now.getDate() - i);
      const s = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      const e = s + 86400000;
      labels.push(d.toLocaleDateString("id-ID", { day: "numeric", month: "short" }));
      values.push(history.reduce((sum, o) => {
        const t = new Date(o.createdAt).getTime();
        return t >= s && t < e ? sum + o.total : sum;
      }, 0));
    }
  } else {
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now); d.setDate(now.getDate() - i);
      const s = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      const e = s + 86400000;
      labels.push(d.getDate());
      values.push(history.reduce((sum, o) => {
        const t = new Date(o.createdAt).getTime();
        return t >= s && t < e ? sum + o.total : sum;
      }, 0));
    }
  }

  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  const max = Math.max(...values, 10000);
  const pad = 40;
  const bw = Math.min(40, (w - pad * 2) / labels.length - 10);

  values.forEach((v, idx) => {
    const bh = (v / max) * (h - 80);
    const x = pad + idx * ((w - pad * 2) / labels.length) + 10;
    const y = h - 40 - bh;
    ctx.fillStyle = "#16804b";
    ctx.fillRect(x, y, bw, Math.max(bh, 2));
    ctx.fillStyle = "#555";
    ctx.font = "10px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(labels[idx], x + bw / 2, h - 20);
    if (v > 0) {
      ctx.fillText(v >= 1000 ? `${Math.round(v/1000)}k` : v, x + bw / 2, y - 5);
    }
  });
}

window.changeSalesPeriod = function(p, btn) {
  document.querySelectorAll(".chart-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  currentPeriod = p;
  drawChart();
};

function refresh() {
  updateStats();
  renderPendingOrders();
  renderHistory();
  drawChart();
}

refresh();

if (sessionStorage.getItem("ownerLoggedIn") !== "1") {
  alert("Silakan login terlebih dahulu!");
  window.location.href = "index.html";
}

function formatPrice(price) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(price);
}

function formatShort(value) {
  if (value >= 1000000) return `Rp${Math.round(value / 1000000)}jt`;
  if (value >= 1000) return `Rp${Math.round(value / 1000)}k`;
  return formatPrice(value);
}

function getPeriodData(period) {
  const history = JSON.parse(localStorage.getItem("salesHistory") || "[]");
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  const startOf7 = new Date(now);
  startOf7.setDate(now.getDate() - 7);
  startOf7.setHours(0, 0, 0, 0);

  const startOf30 = new Date(now);
  startOf30.setDate(now.getDate() - 30);
  startOf30.setHours(0, 0, 0, 0);

  const startOfYear = new Date(now);
  startOfYear.setMonth(now.getMonth() - 12);
  startOfYear.setHours(0, 0, 0, 0);

  const orders = history.filter((order) => order.status === "approved");

  if (period === "hari_ini") {
    const total = orders.reduce((sum, order) => {
      const date = new Date(order.createdAt);
      return date >= startOfDay && date <= now ? sum + order.total : sum;
    }, 0);
    return { labels: ["Hari Ini"], values: [total], total };
  }

  if (period === "7_hari") {
    const labels = [];
    const values = [];
    let total = 0;
    for (let i = 6; i >= 0; i--) {
      const day = new Date(now);
      day.setDate(now.getDate() - i);
      day.setHours(0, 0, 0, 0);
      const nextDay = new Date(day);
      nextDay.setDate(day.getDate() + 1);
      const label = day.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
      const value = orders.reduce((sum, order) => {
        const date = new Date(order.createdAt);
        return date >= day && date < nextDay ? sum + order.total : sum;
      }, 0);
      labels.push(label);
      values.push(value);
      total += value;
    }
    return { labels, values, total };
  }

  if (period === "30_hari") {
    const labels = [];
    const values = [];
    let total = 0;
    for (let i = 29; i >= 0; i--) {
      const day = new Date(now);
      day.setDate(now.getDate() - i);
      day.setHours(0, 0, 0, 0);
      const nextDay = new Date(day);
      nextDay.setDate(day.getDate() + 1);
      const label = day.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
      const value = orders.reduce((sum, order) => {
        const date = new Date(order.createdAt);
        return date >= day && date < nextDay ? sum + order.total : sum;
      }, 0);
      labels.push(label);
      values.push(value);
      total += value;
    }
    return { labels, values, total };
  }

  const labels = [];
  const values = [];
  let total = 0;
  for (let i = 11; i >= 0; i--) {
    const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    const label = month.toLocaleDateString("id-ID", { month: "short" });
    const value = orders.reduce((sum, order) => {
      const date = new Date(order.createdAt);
      return date >= month && date < nextMonth ? sum + order.total : sum;
    }, 0);
    labels.push(label);
    values.push(value);
    total += value;
  }
  return { labels, values, total };
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

let currentPeriod = "hari_ini";
const chartCanvas = document.getElementById("salesChartCanvas");
const chartTotal = document.getElementById("chartTotal");
const ctx = chartCanvas.getContext("2d");

function renderSalesChart(period) {
  currentPeriod = period;
  const data = getPeriodData(period);
  chartTotal.textContent = `Total ${formatPrice(data.total)}`;

  if (!chartCanvas) return;

  const containerWidth = chartCanvas.parentElement.clientWidth || 700;
  const logicalWidth = Math.max(300, containerWidth);
  const logicalHeight = 300;
  const dpr = window.devicePixelRatio || 1;

  chartCanvas.width = logicalWidth * dpr;
  chartCanvas.height = logicalHeight * dpr;
  chartCanvas.style.width = `${logicalWidth}px`;
  chartCanvas.style.height = `${logicalHeight}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, logicalWidth, logicalHeight);

  const margins = { top: 35, right: 20, bottom: 45, left: 55 };
  const chartWidth = logicalWidth - margins.left - margins.right;
  const chartHeight = logicalHeight - margins.top - margins.bottom;
  const maxValue = Math.max(...data.values, 1);

  ctx.font = "10px Poppins, sans-serif";
  ctx.textBaseline = "middle";

  for (let i = 0; i <= 4; i++) {
    const y = margins.top + (chartHeight / 4) * i;
    const value = Math.round(maxValue * (1 - i / 4));
    ctx.strokeStyle = "#e8eee9";
    ctx.beginPath();
    ctx.moveTo(margins.left, y);
    ctx.lineTo(logicalWidth - margins.right, y);
    ctx.stroke();
    ctx.fillStyle = "#5d6b64";
    ctx.textAlign = "right";
    ctx.fillText(formatShort(value), margins.left - 8, y);
  }

  if (data.values.every((value) => value === 0)) {
    ctx.fillStyle = "#5d6b64";
    ctx.textAlign = "center";
    ctx.font = "12px Poppins, sans-serif";
    ctx.fillText("Belum ada data penjualan pada periode ini", logicalWidth / 2, logicalHeight / 2);
    return;
  }

  const barGap = 8;
  const barWidth = Math.min(48, (chartWidth - (data.labels.length - 1) * barGap) / data.labels.length);
  const startX = margins.left + (chartWidth - (data.labels.length * barWidth + (data.labels.length - 1) * barGap)) / 2;

  data.values.forEach((value, index) => {
    const barHeight = (value / maxValue) * chartHeight;
    const x = startX + index * (barWidth + barGap);
    const y = margins.top + chartHeight - barHeight;

    ctx.fillStyle = "#16804b";
    roundRect(ctx, x, y, barWidth, Math.max(barHeight, 2), 6);
    ctx.fill();

    ctx.fillStyle = "#18352a";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillText(formatShort(value), x + barWidth / 2, y - 6);

    ctx.fillStyle = "#5d6b64";
    ctx.textBaseline = "top";
    if (data.labels.length > 7) {
      ctx.save();
      ctx.translate(x + barWidth / 2, margins.top + chartHeight + 8);
      ctx.rotate(-Math.PI / 4);
      ctx.textAlign = "right";
      ctx.fillText(data.labels[index], 0, 0);
      ctx.restore();
    } else {
      ctx.fillText(data.labels[index], x + barWidth / 2, margins.top + chartHeight + 8);
    }
  });
}

window.changeSalesPeriod = function(period, btn) {
  document.querySelectorAll(".chart-btn").forEach((button) => button.classList.remove("active"));
  btn.classList.add("active");
  renderSalesChart(period);
};

function renderPendingOrders() {
  const pendingOrdersEl = document.getElementById("pendingOrders");
  const pending = JSON.parse(localStorage.getItem("pendingOrders") || "[]");
  if (pending.length === 0) { pendingOrdersEl.innerHTML = "<p>Tidak ada pesanan pending.</p>"; return; }
  pendingOrdersEl.innerHTML = pending.map((order) => `
    <div class="pending-order">
      <div class="pending-order-info">
        <strong>#${order.id.slice(-6)} — ${formatPrice(order.total)}</strong>
        <span>${order.items.length} item — ${new Date(order.createdAt).toLocaleString("id-ID")}</span>
        ${order.proof ? `<img src="${order.proof.dataUrl}" style="width:50px;height:50px;object-fit:cover;border-radius:4px;margin-top:4px;cursor:pointer" onclick="window.open(this.src,'_blank')" />` : "<span style=\"font-size:11px;color:#999\">tanpa bukti</span>"}
      </div>
      <div class="pending-order-actions">
        <button class="approve-btn" onclick="approveOrder('${order.id}')">ACC</button>
        <button class="reject-btn" onclick="rejectOrder('${order.id}')">Tolak</button>
      </div>
    </div>
  `).join("");
}

function renderHistory() {
  const salesHistoryList = document.getElementById("salesHistoryList");
  const history = JSON.parse(localStorage.getItem("salesHistory") || "[]");
  if (history.length === 0) { salesHistoryList.innerHTML = "<p>Belum ada riwayat penjualan.</p>"; return; }
  salesHistoryList.innerHTML = history.slice().reverse().map((order) => `
    <div class="history-item">
      <div class="history-order-info">
        <strong>#${order.id.slice(-6)} — ${formatPrice(order.total)}</strong>
        <span>${new Date(order.createdAt).toLocaleString("id-ID")}</span>
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        ${order.proof ? `<img src="${order.proof.dataUrl}" class="history-proof" onclick="window.open(this.src,'_blank')" />` : ""}
        <span class="history-status ${order.status}">${order.status.toUpperCase()}</span>
      </div>
    </div>
  `).join("");
}

window.approveOrder = function(id) {
  const pending = JSON.parse(localStorage.getItem("pendingOrders") || "[]");
  const order = pending.find((o) => o.id === id);
  if (!order) return;
  order.status = "approved";
  order.approvedAt = new Date().toISOString();
  const updated = pending.filter((o) => o.id !== id);
  localStorage.setItem("pendingOrders", JSON.stringify(updated));
  const history = JSON.parse(localStorage.getItem("salesHistory") || "[]");
  history.push(order);
  localStorage.setItem("salesHistory", JSON.stringify(history));
  renderPendingOrders();
  renderHistory();
  renderSalesChart(currentPeriod);
};

window.rejectOrder = function(id) {
  const pending = JSON.parse(localStorage.getItem("pendingOrders") || "[]");
  const order = pending.find((o) => o.id === id);
  if (!order) return;
  order.status = "rejected";
  order.rejectedAt = new Date().toISOString();
  const updated = pending.filter((o) => o.id !== id);
  localStorage.setItem("pendingOrders", JSON.stringify(updated));
  const history = JSON.parse(localStorage.getItem("salesHistory") || "[]");
  history.push(order);
  localStorage.setItem("salesHistory", JSON.stringify(history));
  renderPendingOrders();
  renderHistory();
  renderSalesChart(currentPeriod);
};

window.logout = function() {
  sessionStorage.removeItem("ownerLoggedIn");
  window.location.href = "index.html";
};

renderPendingOrders();
renderHistory();
renderSalesChart(currentPeriod);

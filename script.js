const OWNER_PASS_HASH = "43a0d17178a9d26c9e0fe9a74b0b45e38d32f27aed887a008a54bf6e033bf7b9";
const SESSION_TTL_MS = 30 * 60 * 1000;
const LOCKOUT_KEY = "ownerLockout";
const MAX_ATTEMPT = 5;
const LOCKOUT_MS = 5 * 60 * 1000;

function sha256Hex(text) {
  const msg = new TextEncoder().encode(text);
  return crypto.subtle.digest("SHA-256", msg).then((buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join(""));
}

function sanitize(str) {
  const d = document.createElement("div");
  d.textContent = str;
  return d.innerHTML;
}

function escAttr(s) { return String(s).replace(/'/g, "&#39;").replace(/"/g, "&quot;"); }

function isSessionValid() {
  const ts = parseInt(sessionStorage.getItem("ownerSessionTs") || "0", 10);
  const flag = sessionStorage.getItem("ownerLoggedIn") === "1";
  if (!flag || !ts) return false;
  if (Date.now() - ts > SESSION_TTL_MS) { sessionStorage.removeItem("ownerLoggedIn"); sessionStorage.removeItem("ownerSessionTs"); return false; }
  return true;
}

function touchSession() { if (isSessionValid()) sessionStorage.setItem("ownerSessionTs", String(Date.now())); }

function getLockout() { try { return JSON.parse(localStorage.getItem(LOCKOUT_KEY) || "null"); } catch { return null; } }

function isLockedOut() {
  const d = getLockout();
  if (!d) return false;
  if (Date.now() - d.since < LOCKOUT_MS) return true;
  localStorage.removeItem(LOCKOUT_KEY);
  return false;
}

function recordFail() {
  const cur = getLockout() || { count: 0, since: 0 };
  if (Date.now() - cur.since > LOCKOUT_MS) { localStorage.setItem(LOCKOUT_KEY, JSON.stringify({ count: 1, since: Date.now() })); }
  else { cur.count += 1; localStorage.setItem(LOCKOUT_KEY, JSON.stringify(cur)); }
  const after = getLockout();
  if (after.count >= MAX_ATTEMPT) showToast(`Terlalu banyak salah. Coba lagi ${Math.ceil(LOCKOUT_MS / 60000)} menit.`);
}

function clearLockout() { localStorage.removeItem(LOCKOUT_KEY); }

const PRODUCTS_CATALOG = [
  { id: 1, name: "Santan Kelapa", variants: [8000, 10000] },
  { id: 2, name: "Kelapa Parut", variants: [7000, 9000] }
];

function validateProduct(productId, price) {
  const p = PRODUCTS_CATALOG.find((x) => x.id === productId);
  if (!p) return false;
  return p.variants.includes(price);
}

function sanitizeCart(items) {
  if (!Array.isArray(items)) return [];
  const out = [];
  for (const it of items) {
    if (!it || typeof it.price !== "number" || typeof it.quantity !== "number") continue;
    const pid = Number(it.id);
    const qty = Math.floor(it.quantity);
    if (!validateProduct(pid, it.price) || qty < 1 || qty > 99) continue;
    out.push({ key: String(it.key || `${pid}-${it.price}`), id: pid, name: `${PRODUCTS_CATALOG.find((x) => x.id === pid).name} - ${formatPrice(it.price)}`, image: "🥥", price: it.price, quantity: Math.min(qty, 99) });
  }
  return out;
}

const products = [
  { id: 1, name: "Santan Kelapa", description: "Santan murni segar, gurih dan kental.", image: "🥥", variants: [8000, 10000] },
  { id: 2, name: "Kelapa Parut", description: "Kelapa parut segar siap pakai untuk masakan & kue.", image: "🥥", variants: [7000, 9000] }
];

let cart = sanitizeCart(JSON.parse(localStorage.getItem("santanCart") || "[]"));

const productGrid = document.getElementById("productGrid");
const cartButton = document.getElementById("cartButton");
const cartSidebar = document.getElementById("cartSidebar");
const cartOverlay = document.getElementById("cartOverlay");
const closeCart = document.getElementById("closeCart");
const cartItems = document.getElementById("cartItems");
const cartCount = document.getElementById("cartCount");
const cartTotal = document.getElementById("cartTotal");
const checkoutButton = document.getElementById("checkoutButton");
const qrisPayButton = document.getElementById("qrisPayButton");
const qrisLoading = document.getElementById("qrisLoading");
const orderOverlay = document.getElementById("orderOverlay");
const orderModal = document.getElementById("orderModal");
const orderList = document.getElementById("orderList");
const orderTotal = document.getElementById("orderTotal");
const closeOrder = document.getElementById("closeOrder");
const confirmOrderBtn = document.getElementById("confirmOrderBtn");
const toast = document.getElementById("toast");
const menuToggle = document.getElementById("menuToggle");
const navMenu = document.getElementById("navMenu");
const ownerOverlay = document.getElementById("ownerOverlay");
const ownerModal = document.getElementById("ownerModal");
const ownerPass = document.getElementById("ownerPass");
const ownerLoginBtn = document.getElementById("ownerLoginBtn");
const closeOwner = document.getElementById("closeOwner");
const ownerError = document.getElementById("ownerError");
const ownerPendingList = document.getElementById("ownerPendingList");
const pendingOrdersEl = document.getElementById("pendingOrders");
const ownerHistoryList = document.getElementById("ownerHistoryList");
const salesHistoryList = document.getElementById("salesHistoryList");
const ownerMenuBtn = document.getElementById("ownerMenuBtn");
const ownerStatus = document.getElementById("ownerStatus");
const ownerLoginSection = document.getElementById("ownerLoginSection");
const logoutOwnerBtn = document.getElementById("logoutOwner");
const proofFile = document.getElementById("proofFile");
const proofPreview = document.getElementById("proofPreview");
const proofImage = document.getElementById("proofImage");
const proofName = document.getElementById("proofName");
const removeProofBtn = document.getElementById("removeProof");

const API_BASE = "http://localhost:3000";

let ownerLoggedIn = isSessionValid();
let proofData = null;

function formatPrice(price) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(price);
}

function renderProducts() {
  if (!productGrid) return;
  productGrid.innerHTML = products.map((product) => `
    <article class="product-card">
      <div class="product-image"><span>${sanitize(product.image)}</span></div>
      <div class="product-content">
        <h3>${sanitize(product.name)}</h3>
        <p>${sanitize(product.description)}</p>
        <div class="variant-group">
          ${product.variants.map((v) => `<button class="add-cart variant-btn" onclick="addToCart(${product.id}, ${v})">${sanitize(formatPrice(v))}</button>`).join("")}
        </div>
      </div>
    </article>
  `).join("");
}

function saveCart() { localStorage.setItem("santanCart", JSON.stringify(cart)); }

window.addToCart = function(productId, price) {
  if (!validateProduct(productId, price)) return showToast("Varian tidak valid");
  const selectedPrice = price;
  const product = products.find((item) => item.id === productId);
  const key = `${productId}-${selectedPrice}`;
  const existingItem = cart.find((item) => item.key === key);
  if (existingItem) {
    if (existingItem.quantity >= 99) return showToast("Maksimal 99 per item");
    existingItem.quantity += 1;
  } else {
    cart.push({ key, id: product.id, name: `${product.name} - ${formatPrice(selectedPrice)}`, image: product.image, price: selectedPrice, quantity: 1 });
  }
  saveCart(); renderCart(); showToast(`${sanitize(product.name)} ${sanitize(formatPrice(selectedPrice))} ditambahkan`);
};

window.changeQuantity = function(key, amount) {
  const item = cart.find((product) => product.key === key || String(product.id) === String(key));
  if (!item) return;
  const next = item.quantity + amount;
  if (next > 99) return showToast("Maksimal 99");
  item.quantity = next;
  if (item.quantity <= 0) { cart = cart.filter((product) => product !== item); }
  saveCart(); renderCart();
};

window.removeFromCart = function(key) {
  cart = cart.filter((product) => product.key !== key && String(product.id) !== String(key));
  saveCart(); renderCart();
};

function renderCart() {
  if (!cartCount || !cartTotal || !cartItems) return;
  cart = sanitizeCart(cart);
  saveCart();
  const totalQuantity = cart.reduce((total, item) => total + item.quantity, 0);
  const totalPrice = cart.reduce((total, item) => total + item.price * item.quantity, 0);
  cartCount.textContent = totalQuantity;
  cartTotal.textContent = formatPrice(totalPrice);
  if (cart.length === 0) {
    cartItems.innerHTML = `<div class="empty-cart"><span>🛒</span><p>Keranjang masih kosong</p></div>`;
    return;
  }
  cartItems.innerHTML = cart.map((item) => `
    <div class="cart-item">
      <div class="cart-item-image">${sanitize(item.image)}</div>
      <div class="cart-item-info">
        <h4>${sanitize(item.name)}</h4>
        <p>${sanitize(formatPrice(item.price * item.quantity))}</p>
        <div class="quantity-control">
          <button onclick="changeQuantity('${escAttr(item.key || item.id)}', -1)">−</button>
          <span>${sanitize(String(item.quantity))}</span>
          <button onclick="changeQuantity('${escAttr(item.key || item.id)}', 1)">+</button>
        </div>
      </div>
      <button class="remove-item" onclick="removeFromCart('${escAttr(item.key || item.id)}')">Hapus</button>
    </div>
  `).join("");
}

function openCart() { cartSidebar.classList.add("active"); cartOverlay.classList.add("active"); document.body.style.overflow = "hidden"; }
function closeCartSidebar() { cartSidebar.classList.remove("active"); cartOverlay.classList.remove("active"); document.body.style.overflow = ""; }
function showToast(message) { if(!toast)return; toast.textContent = String(message); toast.classList.add("show"); setTimeout(() => toast.classList.remove("show"), 2200); }

function showOrderList(items, total, proof) {
  orderList.innerHTML = items.map((item) => `<div class="order-item"><span>${sanitize(item.name)} x${sanitize(String(item.quantity))}</span><strong>${sanitize(formatPrice(item.price * item.quantity))}</strong></div>`).join("") + (proof ? `<div style="margin-top:10px"><img src="${sanitize(proof.dataUrl)}" style="width:100%;max-width:200px;border-radius:8px" /></div>` : "");
  orderTotal.textContent = formatPrice(total);
  orderOverlay.classList.add("active");
  orderModal.classList.add("active");
}

const puzzleInstruction = document.getElementById("puzzleInstruction");
const puzzleOptions = document.getElementById("puzzleOptions");
const humanToken = document.getElementById("humanToken");
let puzzleId = "";
let puzzleOpts = [];

async function refreshPuzzle() {
  const res = await fetch(`${API_BASE}/api/captcha`);
  const data = await res.json();
  puzzleId = data.id;
  puzzleOpts = data.options;
  puzzleInstruction.textContent = `Pilih gambar: ${data.targetName}`;
  puzzleOptions.innerHTML = data.options.map((emoji, idx) => 
    `<button class="puzzle-opt" onclick="verifyPuzzle(${idx})">${emoji}</button>`
  ).join("");
  humanToken.value = "";
}

window.verifyPuzzle = async function(idx) {
  const res = await fetch(`${API_BASE}/api/captcha/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: puzzleId, choiceIndex: idx, options: puzzleOpts })
  });
  const data = await res.json();
  if (data.ok) {
    humanToken.value = data.humanToken;
    showToast("Puzzle benar! Silakan checkout");
    puzzleInstruction.textContent = "✅ Terverifikasi - Silakan checkout";
  } else {
    showToast(data.error || "Puzzle salah");
    refreshPuzzle();
  }
};

function simulateQRISDetection() {
  if (cart.length === 0) return showToast("Keranjang kosong");
  if (!proofFile.files[0]) return showToast("Upload bukti pembayaran dulu");
  if (!humanToken.value) return showToast("Verifikasi manusia belum selesai!");

  const sanitizedCart = sanitizeCart(cart);
  if (sanitizedCart.length === 0) return showToast("Keranjang tidak valid");

  qrisPayButton.disabled = true;
  qrisLoading.style.display = "flex";

  const formData = new FormData();
  formData.append("items", JSON.stringify(sanitizedCart.map(i => ({ name: i.name, quantity: i.quantity, price: i.price }))));
  formData.append("total", String(sanitizedCart.reduce((s, i) => s + i.price * i.quantity, 0)));
  formData.append("proof", proofFile.files[0]);
  formData.append("humanToken", humanToken.value);

  fetch(`${API_BASE}/api/orders`, { method: "POST", body: formData })
    .then(async (res) => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      return data;
    })
    .then(() => {
      qrisLoading.style.display = "none";
      qrisPayButton.disabled = false;
      proofData = null; proofFile.value = ""; proofPreview.style.display = "none";
      humanToken.value = "";
      refreshPuzzle();
      showToast("Bukti terkirim — menunggu ACC Owner");
      closeCartSidebar();
    })
    .catch((e) => {
      qrisLoading.style.display = "none";
      qrisPayButton.disabled = false;
      showToast(e.message);
    });
}
refreshPuzzle();

function checkoutViaWhatsApp() {
  const history = JSON.parse(localStorage.getItem("salesHistory") || "[]");
  const approved = history.filter((o) => o.status === "approved");
  const phoneNumber = "6289516353968";
  if (approved.length > 0) {
    const last = approved[approved.length - 1];
    let message = `Halo KelapaTuaBangCut, pesanan #${last.id.slice(-6)} sudah ACC Owner:%0A%0A`;
    last.items.forEach((item) => { message += `- ${sanitize(item.name)} x${sanitize(String(item.quantity))} = ${sanitize(formatPrice(item.price * item.quantity))}%0A`; });
    message += `%0ATotal: ${sanitize(formatPrice(last.total))}%0A%0ANama:%0AAlamat pengiriman:%0ACatatan:`;
    window.open(`https://wa.me/${phoneNumber}?text=${message}`, "_blank");
    return;
  }
  const clean = sanitizeCart(cart);
  if (clean.length === 0) return showToast("Keranjang masih kosong");
  let message = "Halo KelapaTuaBangCut, saya ingin memesan:%0A%0A";
  clean.forEach((item) => { message += `- ${sanitize(item.name)} x${sanitize(String(item.quantity))} = ${sanitize(formatPrice(item.price * item.quantity))}%0A`; });
  const total = clean.reduce((sum, item) => sum + item.price * item.quantity, 0);
  message += `%0ATotal: ${sanitize(formatPrice(total))}%0A%0ANama:%0AAlamat pengiriman:%0ACatatan:`;
  window.open(`https://wa.me/${phoneNumber}?text=${message}`, "_blank");
}

function openOwnerPanel() {
  ownerOverlay.classList.add("active");
  ownerModal.classList.add("active");
  ownerLoggedIn = isSessionValid();
  if (ownerLoggedIn) {
    touchSession();
    ownerLoginSection.style.display = "none";
    logoutOwnerBtn.style.display = "inline-flex";
    ownerStatus.textContent = "Login sebagai owner";
    ownerPendingList.style.display = "block";
    ownerHistoryList.style.display = "block";
    renderPendingOrders();
    renderHistory();
  } else {
    ownerLoginSection.style.display = "block";
    logoutOwnerBtn.style.display = "none";
    ownerStatus.textContent = "";
    ownerPendingList.style.display = "none";
    ownerHistoryList.style.display = "none";
  }
}

window.checkOwnerLogin = async function() {
  if (isLockedOut()) return showToast("Akun terkunci 5 menit. Coba lagi nanti.");
  const entered = ownerPass.value.trim();
  if (!entered) return (ownerError.textContent = "Kata sandi wajib diisi");

  try {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: entered })
    });
    const data = await res.json();

    if (!res.ok) {
      recordFail();
      const cur = getLockout();
      const left = cur ? Math.max(0, MAX_ATTEMPT - cur.count) : MAX_ATTEMPT;
      ownerError.textContent = data.error || (left > 0 ? `Kata sandi salah. Sisa percobaan: ${left}` : "Akun terkunci 5 menit.");
      return;
    }

    clearLockout();
    sessionStorage.setItem("token", data.token);
    sessionStorage.setItem("ownerLoggedIn", "1");
    sessionStorage.setItem("ownerSessionTs", String(Date.now()));
    window.location.href = "owner-dashboard.html";
  } catch (e) {
    return showToast("Gagal terhubung ke server backend. Pastikan backend berjalan.");
  }
};

window.logoutOwner = function() {
  ownerLoggedIn = false;
  sessionStorage.removeItem("ownerLoggedIn");
  sessionStorage.removeItem("ownerSessionTs");
  openOwnerPanel();
  showToast("Owner logout");
};

window.approveOrder = async function(id) {
  if (!isSessionValid()) return showToast("Sesi habis — login ulang");
  touchSession();
  const token = sessionStorage.getItem("token");

  const res = await fetch(`${API_BASE}/api/orders/${id}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({ status: "approved" })
  });

  const data = await res.json();
  if (!res.ok) return showToast(data.error || "Gagal menyetujui pesanan");

  await renderPendingOrders();
  await renderHistory();
  showToast("Pembayaran #"+String(id).slice(-6)+" disetujui");
  cart = [];
  saveCart();
  renderCart();
};

window.rejectOrder = async function(id) {
  if (!isSessionValid()) return showToast("Sesi habis — login ulang");
  touchSession();
  const token = sessionStorage.getItem("token");

  const res = await fetch(`${API_BASE}/api/orders/${id}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({ status: "rejected" })
  });

  const data = await res.json();
  if (!res.ok) return showToast(data.error || "Gagal menolak pesanan");

  await renderPendingOrders();
  await renderHistory();
  showToast("Pembayaran #"+String(id).slice(-6)+" ditolak");
};

async function renderPendingOrders() {
  const token = sessionStorage.getItem("token");
  if (!token || !isSessionValid()) return;

  try {
    const res = await fetch(`${API_BASE}/api/orders`, {
      headers: { "Authorization": `Bearer ${token}` }
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    const pending = data.filter((o) => o.status === "pending");
    if (pending.length === 0) {
      pendingOrdersEl.innerHTML = "<p>Tidak ada pesanan pending.</p>";
      return;
    }

    pendingOrdersEl.innerHTML = pending.map((order) => `
      <div class="pending-order">
        <div class="pending-order-info">
          <strong>#${sanitize(String(order.id).slice(-6))} — ${sanitize(formatPrice(order.total))}</strong>
          <span>${sanitize(String(order.items.length))} item — ${sanitize(new Date(order.created_at || order.createdAt).toLocaleString("id-ID"))}</span>
          ${order.proof_path ? `<img src="${API_BASE}${sanitize(order.proof_path)}" style="width:50px;height:50px;object-fit:cover;border-radius:4px;margin-top:4px;cursor:pointer" onclick="window.open(this.src,'_blank')" />` : "<span style=\"font-size:11px;color:#999\">tanpa bukti</span>"}
        </div>
        <div class="pending-order-actions">
          <button class="approve-btn" onclick="approveOrder('${escAttr(order.id)}')">ACC</button>
          <button class="reject-btn" onclick="rejectOrder('${escAttr(order.id)}')">Tolak</button>
        </div>
      </div>
    `).join("");
  } catch (e) {
    pendingOrdersEl.innerHTML = `<p style="color:red">${sanitize(e.message)}</p>`;
  }
}

async function renderHistory() {
  const token = sessionStorage.getItem("token");
  if (!token || !isSessionValid()) return;

  try {
    const res = await fetch(`${API_BASE}/api/orders`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    const history = data.filter((o) => o.status !== "pending");
    if (history.length === 0) {
      salesHistoryList.innerHTML = "<p>Belum ada riwayat penjualan.</p>";
      return;
    }

    salesHistoryList.innerHTML = history.slice().reverse().map((order) => `
      <div class="history-item">
        <div class="history-order-info">
          <strong>#${sanitize(String(order.id).slice(-6))} — ${sanitize(formatPrice(order.total))}</strong>
          <span>${sanitize(new Date(order.created_at || order.createdAt).toLocaleString("id-ID"))}</span>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          ${order.proof_path ? `<img src="${API_BASE}${sanitize(order.proof_path)}" class="history-proof" onclick="window.open(this.src,'_blank')" />` : ""}
          <span class="history-status ${sanitize(order.status)}">${sanitize(String(order.status).toUpperCase())}</span>
        </div>
      </div>
    `).join("");
  } catch (e) {
    salesHistoryList.innerHTML = `<p style="color:red">${sanitize(e.message)}</p>`;
  }
}

if(proofFile) proofFile.addEventListener("change", () => {
  const file = proofFile.files[0];
  if (!file) return;
  const allowed = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
  if (!allowed.includes(file.type)) return showToast("Hanya JPG/PNG/WebP");
  if (file.size > 2 * 1024 * 1024) return showToast("Maksimal 2MB");
  const reader = new FileReader();
  reader.onload = (e) => {
    const dataUrl = e.target.result;
    if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:image/")) return showToast("File tidak valid");
    proofData = { name: sanitize(file.name).slice(0, 60), dataUrl };
    proofImage.src = proofData.dataUrl;
    proofName.textContent = proofData.name;
    proofPreview.style.display = "flex";
  };
  reader.readAsDataURL(file);
});

if(removeProofBtn) removeProofBtn.addEventListener("click", () => { proofData = null; proofFile.value = ""; proofPreview.style.display = "none"; });
if(qrisPayButton) qrisPayButton.addEventListener("click", simulateQRISDetection);
if(closeOrder) closeOrder.addEventListener("click", () => { orderOverlay.classList.remove("active"); orderModal.classList.remove("active"); });
if(orderOverlay) orderOverlay.addEventListener("click", () => { orderOverlay.classList.remove("active"); orderModal.classList.remove("active"); });
if(confirmOrderBtn) confirmOrderBtn.addEventListener("click", () => { checkoutViaWhatsApp(); orderOverlay.classList.remove("active"); orderModal.classList.remove("active"); cart = []; saveCart(); renderCart(); });
if(ownerLoginBtn) ownerLoginBtn.addEventListener("click", () => { checkOwnerLogin(); });
if(ownerPass) ownerPass.addEventListener("keydown", (e) => { if (e.key === "Enter") checkOwnerLogin(); });
if(logoutOwnerBtn) logoutOwnerBtn.addEventListener("click", logoutOwner);
if(closeOwner) closeOwner.addEventListener("click", () => { ownerOverlay.classList.remove("active"); ownerModal.classList.remove("active"); });
if(ownerOverlay) ownerOverlay.addEventListener("click", () => { ownerOverlay.classList.remove("active"); ownerModal.classList.remove("active"); });
if(ownerMenuBtn) ownerMenuBtn.addEventListener("click", (e) => { e.preventDefault(); openOwnerPanel(); });
if(cartButton) cartButton.addEventListener("click", openCart);
if(closeCart) closeCart.addEventListener("click", closeCartSidebar);
if(cartOverlay) cartOverlay.addEventListener("click", closeCartSidebar);
if(checkoutButton) checkoutButton.addEventListener("click", checkoutViaWhatsApp);
if(menuToggle) menuToggle.addEventListener("click", () => { navMenu.classList.toggle("active"); });

document.querySelectorAll(".nav-menu a").forEach((link) => {
  link.addEventListener("click", () => { if (link.id !== "ownerMenuBtn") navMenu.classList.remove("active"); });
});

renderProducts();
renderCart();
setInterval(() => { if (ownerLoggedIn && !isSessionValid()) { ownerLoggedIn = false; if (ownerOverlay.classList.contains("active")) openOwnerPanel(); showToast("Sesi owner habis"); } }, 30000);

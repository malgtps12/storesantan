const products = [
  { id: 1, name: "Santan Kelapa", description: "Santan murni segar, gurih dan kental.", image: "🥥", variants: [8000, 10000] },
  { id: 2, name: "Kelapa Parut", description: "Kelapa parut segar siap pakai untuk masakan & kue.", image: "🥥", variants: [7000, 9000] }
];

let cart = JSON.parse(localStorage.getItem("santanCart")) || [];

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

let ownerLoggedIn = sessionStorage.getItem("ownerLoggedIn") === "1";
let proofData = null;

function formatPrice(price) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(price);
}

function renderProducts() {
  if (!productGrid) return;
  productGrid.innerHTML = products.map((product) => `
    <article class="product-card">
      <div class="product-image"><span>${product.image}</span></div>
      <div class="product-content">
        <h3>${product.name}</h3>
        <p>${product.description}</p>
        <div class="variant-group">
          ${product.variants.map((v) => `<button class="add-cart variant-btn" onclick="addToCart(${product.id}, ${v})">${formatPrice(v)}</button>`).join("")}
        </div>
      </div>
    </article>
  `).join("");
}

function saveCart() { localStorage.setItem("santanCart", JSON.stringify(cart)); }

window.addToCart = function(productId, price) {
  const product = products.find((item) => item.id === productId);
  if (!product) return;
  const selectedPrice = price || product.variants[0];
  const key = `${productId}-${selectedPrice}`;
  const existingItem = cart.find((item) => item.key === key);
  if (existingItem) { existingItem.quantity += 1; }
  else { cart.push({ key, id: product.id, name: `${product.name} - ${formatPrice(selectedPrice)}`, image: product.image, price: selectedPrice, quantity: 1 }); }
  saveCart(); renderCart(); showToast(`${product.name} ${formatPrice(selectedPrice)} ditambahkan`);
};

window.changeQuantity = function(key, amount) {
  const item = cart.find((product) => product.key === key || String(product.id) === String(key));
  if (!item) return;
  item.quantity += amount;
  if (item.quantity <= 0) { cart = cart.filter((product) => product !== item); }
  saveCart(); renderCart();
};

window.removeFromCart = function(key) {
  cart = cart.filter((product) => product.key !== key && String(product.id) !== String(key));
  saveCart(); renderCart();
};

function renderCart() {
  if (!cartCount || !cartTotal || !cartItems) return;
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
      <div class="cart-item-image">${item.image}</div>
      <div class="cart-item-info">
        <h4>${item.name}</h4>
        <p>${formatPrice(item.price * item.quantity)}</p>
        <div class="quantity-control">
          <button onclick="changeQuantity('${item.key || item.id}', -1)">−</button>
          <span>${item.quantity}</span>
          <button onclick="changeQuantity('${item.key || item.id}', 1)">+</button>
        </div>
      </div>
      <button class="remove-item" onclick="removeFromCart('${item.key || item.id}')">Hapus</button>
    </div>
  `).join("");
}

function openCart() { cartSidebar.classList.add("active"); cartOverlay.classList.add("active"); document.body.style.overflow = "hidden"; }
function closeCartSidebar() { cartSidebar.classList.remove("active"); cartOverlay.classList.remove("active"); document.body.style.overflow = ""; }
function showToast(message) { if(!toast)return; toast.textContent = message; toast.classList.add("show"); setTimeout(() => toast.classList.remove("show"), 2200); }

function showOrderList(items, total, proof) {
  orderList.innerHTML = items.map((item) => `<div class="order-item"><span>${item.name} x${item.quantity}</span><strong>${formatPrice(item.price * item.quantity)}</strong></div>`).join("") + (proof ? `<div style="margin-top:10px"><img src="${proof.dataUrl}" style="width:100%;max-width:200px;border-radius:8px" /></div>` : "");
  orderTotal.textContent = formatPrice(total);
  orderOverlay.classList.add("active");
  orderModal.classList.add("active");
}

function simulateQRISDetection() {
  if (cart.length === 0) return showToast("Keranjang kosong");
  if (!proofData) return showToast("Upload bukti pembayaran dulu");
  qrisPayButton.disabled = true;
  qrisLoading.style.display = "flex";
  setTimeout(() => {
    qrisLoading.style.display = "none";
    qrisPayButton.disabled = false;
    const order = { id: Date.now().toString(), items: cart.map((i) => ({ name: i.name, quantity: i.quantity, price: i.price })), total: cart.reduce((s, i) => s + i.price * i.quantity, 0), createdAt: new Date().toISOString(), status: "pending", proof: proofData };
    const pending = JSON.parse(localStorage.getItem("pendingOrders") || "[]");
    pending.push(order);
    localStorage.setItem("pendingOrders", JSON.stringify(pending));
    proofData = null; proofFile.value = ""; proofPreview.style.display = "none";
    showToast("Bukti terkirim — menunggu ACC Owner");
    closeCartSidebar();
  }, 2500);
}

function checkoutViaWhatsApp() {
  const history = JSON.parse(localStorage.getItem("salesHistory") || "[]");
  const approved = history.filter((o) => o.status === "approved");
  const phoneNumber = "6289516353968";
  if (approved.length > 0) {
    const last = approved[approved.length - 1];
    let message = `Halo KelapaTuaBangCut, pesanan #${last.id.slice(-6)} sudah ACC Owner:%0A%0A`;
    last.items.forEach((item) => { message += `- ${item.name} x${item.quantity} = ${formatPrice(item.price * item.quantity)}%0A`; });
    message += `%0ATotal: ${formatPrice(last.total)}%0A%0ANama:%0AAlamat pengiriman:%0ACatatan:`;
    window.open(`https://wa.me/${phoneNumber}?text=${message}`, "_blank");
    return;
  }
  if (cart.length === 0) return showToast("Keranjang masih kosong");
  let message = "Halo KelapaTuaBangCut, saya ingin memesan:%0A%0A";
  cart.forEach((item) => { message += `- ${item.name} x${item.quantity} = ${formatPrice(item.price * item.quantity)}%0A`; });
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  message += `%0ATotal: ${formatPrice(total)}%0A%0ANama:%0AAlamat pengiriman:%0ACatatan:`;
  window.open(`https://wa.me/${phoneNumber}?text=${message}`, "_blank");
}

function openOwnerPanel() {
  ownerOverlay.classList.add("active");
  ownerModal.classList.add("active");
  if (ownerLoggedIn) {
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

window.checkOwnerLogin = function() {
  if (ownerPass.value === "owner123") {
    sessionStorage.setItem("ownerLoggedIn", "1");
    window.location.href = "owner-dashboard.html";
  } else { ownerError.textContent = "Kata sandi salah"; }
};

window.logoutOwner = function() {
  ownerLoggedIn = false;
  sessionStorage.removeItem("ownerLoggedIn");
  openOwnerPanel();
  showToast("Owner logout");
};

window.approveOrder = function(id) {
  if (!ownerLoggedIn) return showToast("Akses ditolak — login owner dulu");
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
  showToast("Pembayaran #"+id.slice(-6)+" disetujui");
  showOrderList(order.items, order.total, order.proof);
  cart = []; saveCart(); renderCart();
};

window.rejectOrder = function(id) {
  if (!ownerLoggedIn) return showToast("Akses ditolak — login owner dulu");
  const pending = JSON.parse(localStorage.getItem("pendingOrders") || "[]");
  const order = pending.find((o) => o.id === id);
  if (!order) return;
  order.status = "rejected";
  const updated = pending.filter((o) => o.id !== id);
  localStorage.setItem("pendingOrders", JSON.stringify(updated));
  const history = JSON.parse(localStorage.getItem("salesHistory") || "[]");
  history.push(order);
  localStorage.setItem("salesHistory", JSON.stringify(history));
  renderPendingOrders();
  renderHistory();
  showToast("Pembayaran #"+id.slice(-6)+" ditolak");
};

function renderPendingOrders() {
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

// Listeners
if(proofFile) proofFile.addEventListener("change", () => {
  const file = proofFile.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    proofData = { name: file.name, dataUrl: e.target.result };
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
if(ownerLoginBtn) ownerLoginBtn.addEventListener("click", checkOwnerLogin);
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

function sanitize(s){ const d=document.createElement("div"); d.textContent=s; return d.innerHTML; }
function escAttr(s){ return String(s).replace(/'/g,"&#39;").replace(/"/g,"&quot;"); }
function token(){ return sessionStorage.getItem("token"); }
function isSessionValid(){
  const ts=parseInt(sessionStorage.getItem("ownerSessionTs")||"0",10);
  const flag=!!token();
  if(!flag||!ts) return false;
  if(Date.now()-ts > 30*60*1000){ sessionStorage.removeItem("token"); sessionStorage.removeItem("ownerLoggedIn"); sessionStorage.removeItem("ownerSessionTs"); return false; }
  return true;
}
function touchSession(){ if(isSessionValid()) sessionStorage.setItem("ownerSessionTs", String(Date.now())); }

if (!isSessionValid()) { alert("Khusus Owner! Silakan login dulu."); window.location.href="../index.html"; }

const API_BASE = "http://localhost:3000";

function formatPrice(p){ return new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(p); }

async function fetchOrders(){
  const res=await fetch(`${API_BASE}/api/orders`,{ headers:{ Authorization:`Bearer ${token()}` }});
  if(!res.ok) throw new Error("Unauthorized");
  const data=await res.json();
  return data.map(o=> ({...o, proof_path: o.proof_path ? `${API_BASE}${o.proof_path}` : null}));
}
async function fetchStats(period){
  const res=await fetch(`${API_BASE}/api/stats/summary?period=${period}`,{ headers:{ Authorization:`Bearer ${token()}` }});
  if(!res.ok) throw new Error("Unauthorized");
  return res.json();
}

async function updateStats(){
  try{
    const orders=await fetchOrders();
    const approved=orders.filter(o=>o.status==="approved");
    const pending=orders.filter(o=>o.status==="pending");
    const now=new Date(); const start=new Date(now.getFullYear(),now.getMonth(),now.getDate()).getTime();
    const todayTotal=approved.reduce((sum,o)=> new Date(o.created_at||o.createdAt).getTime()>=start ? sum+o.total : sum,0);
    const grandTotal=approved.reduce((sum,o)=> sum+o.total,0);
    document.getElementById("statToday").textContent=formatPrice(todayTotal);
    document.getElementById("statTotal").textContent=formatPrice(grandTotal);
    document.getElementById("statPending").textContent=String(pending.length);
  }catch{ }
}

async function renderPendingOrders(){
  const el=document.getElementById("pendingOrders");
  try{
    const orders=await fetchOrders();
    const pending=orders.filter(o=>o.status==="pending");
    if(!pending.length){ el.innerHTML="<p style='color:#999;font-size:12px'>Tidak ada pesanan menunggu.</p>"; return; }
    el.innerHTML=pending.map(o=>`
      <div class="pending-order">
        <div class="pending-order-info">
          <strong>#${sanitize(String(o.id).slice(-6))} — ${sanitize(formatPrice(o.total))}</strong>
          <span>${sanitize(o.items.map(i=>`${i.name} x${i.quantity}`).join(", "))}</span>
          ${o.proof_path? `<img src="${sanitize(o.proof_path)}" style="width:50px;height:50px;object-fit:cover;border-radius:6px;margin-top:4px;cursor:pointer" onclick="window.open(this.src,'_blank')" />` : "<span style='font-size:10px;color:#999'>tanpa bukti</span>"}
        </div>
        <div class="pending-order-actions">
          <button class="approve-btn" onclick="approve('${escAttr(o.id)}')">ACC</button>
          <button class="reject-btn" onclick="reject('${escAttr(o.id)}')">Tolak</button>
        </div>
      </div>`).join("");
  }catch{ el.innerHTML="<p style='color:red;font-size:12px'>Gagal memuat</p>"; }
}

async function renderHistory(){
  const el=document.getElementById("salesHistoryList");
  try{
    const orders=await fetchOrders();
    const history=orders.filter(o=>o.status!=="pending");
    if(!history.length){ el.innerHTML="<p style='color:#999;font-size:12px'>Belum ada riwayat.</p>"; return; }
    el.innerHTML=history.slice().reverse().map(o=>`
      <div class="history-item">
        <div class="history-order-info">
          <strong>#${sanitize(String(o.id).slice(-6))} — ${sanitize(formatPrice(o.total))}</strong>
          <span>${sanitize(new Date(o.created_at||o.createdAt).toLocaleString("id-ID"))}</span>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          ${o.proof_path? `<img src="${sanitize(o.proof_path)}" class="history-proof" onclick="window.open(this.src,'_blank')" />` : ""}
          <span class="history-status ${sanitize(o.status)}">${sanitize(String(o.status).toUpperCase())}</span>
        </div>
      </div>`).join("");
  }catch{ el.innerHTML="<p style='color:red;font-size:12px'>Gagal memuat</p>"; }
}

window.approve=async function(id){
  if(!isSessionValid()){ alert("Sesi habis"); window.location.href="../index.html"; return; }
  touchSession();
  const res=await fetch(`${API_BASE}/api/orders/${id}/status`,{method:"PATCH",headers:{Authorization:`Bearer ${token()}`, "Content-Type":"application/json"},body:JSON.stringify({status:"approved"})});
  if(!res.ok){ const d=await res.json().catch(()=>({})); return alert(d.error||"Gagal ACC"); }
  await refresh();
};
window.reject=async function(id){
  if(!isSessionValid()){ alert("Sesi habis"); window.location.href="../index.html"; return; }
  touchSession();
  const res=await fetch(`${API_BASE}/api/orders/${id}/status`,{method:"PATCH",headers:{Authorization:`Bearer ${token()}`, "Content-Type":"application/json"},body:JSON.stringify({status:"rejected"})});
  if(!res.ok){ const d=await res.json().catch(()=>({})); return alert(d.error||"Gagal Tolak"); }
  await refresh();
};
window.logout=function(){ sessionStorage.removeItem("token"); sessionStorage.removeItem("ownerLoggedIn"); sessionStorage.removeItem("ownerSessionTs"); window.location.href="../index.html"; };

let currentPeriod="hari_ini";
const canvas=document.getElementById("salesChartCanvas");
const ctx=canvas ? canvas.getContext("2d") : null;

async function drawChart(){
  touchSession();
  let data; try{ data=await fetchStats(currentPeriod); } catch{ data={labels:[],values:[],total:0} }
  if(!canvas||!ctx) return;
  const w=canvas.width,h=canvas.height; ctx.clearRect(0,0,w,h);
  const max=Math.max(...data.values,10000); const pad=40; const bw=Math.min(40,(w-pad*2)/data.labels.length-10);
  data.values.forEach((v,idx)=>{
    const bh=(v/max)*(h-80); const x=pad+idx*((w-pad*2)/data.labels.length)+10; const y=h-40-bh;
    ctx.fillStyle="#16804b"; ctx.fillRect(x,y,bw,Math.max(bh,2));
    ctx.fillStyle="#555"; ctx.font="10px sans-serif"; ctx.textAlign="center"; ctx.fillText(data.labels[idx]||"",x+bw/2,h-20);
    if(v>0) ctx.fillText(v>=1000? `${Math.round(v/1000)}k`: v, x+bw/2, y-5);
  });
}

window.changeSalesPeriod=function(p,btn){
  if(!isSessionValid()){ alert("Sesi habis"); window.location.href="../index.html"; return; }
  touchSession(); document.querySelectorAll(".chart-btn").forEach(b=>b.classList.remove("active")); btn.classList.add("active"); currentPeriod=p; drawChart();
};

async function refresh(){ touchSession(); await updateStats(); await renderPendingOrders(); await renderHistory(); await drawChart(); }
refresh();
setInterval(()=>{ if(!isSessionValid()){ alert("Sesi habis"); window.location.href="../index.html"; } },60000);

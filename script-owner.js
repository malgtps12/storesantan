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

if (!isSessionValid()) { alert("Silakan login terlebih dahulu!"); window.location.href="index.html"; }

function formatPrice(price){ return new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(price); }
function formatShort(value){ if(value>=1000000) return `Rp${Math.round(value/1000000)}jt`; if(value>=1000) return `Rp${Math.round(value/1000)}k`; return formatPrice(value); }

const API_BASE = "https://storesantan.vercel.app/";

async function fetchOrders(){
  const res = await fetch(`${API_BASE}/api/orders`,{ headers:{ Authorization:`Bearer ${token()}` }});
  if(!res.ok) throw new Error("Unauthorized");
  const data = await res.json();
  return data.map(o=> ({...o, proof_path: o.proof_path ? `${API_BASE}${o.proof_path}` : null}));
}

async function fetchStats(period){
  const res = await fetch(`${API_BASE}/api/stats/summary?period=${period}`,{ headers:{ Authorization:`Bearer ${token()}` }});
  if(!res.ok) throw new Error("Unauthorized");
  return res.json();
}

function roundRect(ctx,x,y,w,h,r){ ctx.beginPath(); ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r); ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h); ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r); ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath(); }

let currentPeriod="hari_ini";
const chartCanvas=document.getElementById("salesChartCanvas");
const chartTotal=document.getElementById("chartTotal");
const ctx = chartCanvas ? chartCanvas.getContext("2d") : null;

async function renderSalesChart(period){
  touchSession(); currentPeriod=period;
  let data;
  try { data = await fetchStats(period); } catch { data={labels:["Hari Ini"],values:[0],total:0} }
  if(chartTotal) chartTotal.textContent=`Total ${formatPrice(data.total)}`;
  if(!chartCanvas||!ctx) return;
  const containerWidth=chartCanvas.parentElement.clientWidth||700;
  const logicalWidth=Math.max(300,containerWidth); const logicalHeight=300; const dpr=window.devicePixelRatio||1;
  chartCanvas.width=logicalWidth*dpr; chartCanvas.height=logicalHeight*dpr;
  chartCanvas.style.width=`${logicalWidth}px`; chartCanvas.style.height=`${logicalHeight}px`;
  ctx.setTransform(dpr,0,0,dpr,0,0); ctx.clearRect(0,0,logicalWidth,logicalHeight);
  const margins={top:35,right:20,bottom:45,left:55};
  const chartWidth=logicalWidth-margins.left-margins.right;
  const chartHeight=logicalHeight-margins.top-margins.bottom;
  const maxValue=Math.max(...data.values,1);
  ctx.font="10px Poppins, sans-serif"; ctx.textBaseline="middle";
  for(let i=0;i<=4;i++){ const y=margins.top+(chartHeight/4)*i; const value=Math.round(maxValue*(1-i/4)); ctx.strokeStyle="#e8eee9"; ctx.beginPath(); ctx.moveTo(margins.left,y); ctx.lineTo(logicalWidth-margins.right,y); ctx.stroke(); ctx.fillStyle="#5d6b64"; ctx.textAlign="right"; ctx.fillText(formatShort(value),margins.left-8,y); }
  if(data.values.every(v=>v===0)){ ctx.fillStyle="#5d6b64"; ctx.textAlign="center"; ctx.font="12px Poppins, sans-serif"; ctx.fillText("Belum ada data penjualan pada periode ini",logicalWidth/2,logicalHeight/2); return; }
  const barGap=8; const barWidth=Math.min(48,(chartWidth-(data.labels.length-1)*barGap)/data.labels.length);
  const startX=margins.left+(chartWidth-(data.labels.length*barWidth+(data.labels.length-1)*barGap))/2;
  data.values.forEach((value,index)=>{
    const barHeight=(value/maxValue)*chartHeight; const x=startX+index*(barWidth+barGap); const y=margins.top+chartHeight-barHeight;
    ctx.fillStyle="#16804b"; roundRect(ctx,x,y,barWidth,Math.max(barHeight,2),6); ctx.fill();
    ctx.fillStyle="#18352a"; ctx.textAlign="center"; ctx.textBaseline="bottom"; ctx.fillText(formatShort(value),x+barWidth/2,y-6);
    ctx.fillStyle="#5d6b64"; ctx.textBaseline="top";
    if(data.labels.length>7){ ctx.save(); ctx.translate(x+barWidth/2,margins.top+chartHeight+8); ctx.rotate(-Math.PI/4); ctx.textAlign="right"; ctx.fillText(data.labels[index],0,0); ctx.restore(); } else { ctx.fillText(data.labels[index],x+barWidth/2,margins.top+chartHeight+8); }
  });
}

window.changeSalesPeriod=function(period,btn){
  if(!isSessionValid()){ alert("Sesi habis"); window.location.href="index.html"; return; }
  touchSession(); document.querySelectorAll(".chart-btn").forEach(b=>b.classList.remove("active")); btn.classList.add("active"); renderSalesChart(period);
};

async function renderPendingOrders(){
  const el=document.getElementById("pendingOrders");
  try{
    const data=await fetchOrders();
    const pending=data.filter(o=>o.status==="pending");
    if(!pending.length){ el.innerHTML="<p>Tidak ada pesanan pending.</p>"; return; }
    el.innerHTML=pending.map(order=>`
      <div class="pending-order">
        <div class="pending-order-info">
          <strong>#${sanitize(String(order.id).slice(-6))} — ${sanitize(formatPrice(order.total))}</strong>
          <span>${sanitize(String((order.items||[]).length))} item — ${sanitize(new Date(order.created_at||order.createdAt).toLocaleString("id-ID"))}</span>
          ${order.proof_path? `<img src="${sanitize(order.proof_path)}" style="width:50px;height:50px;object-fit:cover;border-radius:4px;margin-top:4px;cursor:pointer" onclick="window.open(this.src,'_blank')" />` : "<span style=\"font-size:11px;color:#999\">tanpa bukti</span>"}
        </div>
        <div class="pending-order-actions">
          <button class="approve-btn" onclick="approveOrder('${escAttr(order.id)}')">ACC</button>
          <button class="reject-btn" onclick="rejectOrder('${escAttr(order.id)}')">Tolak</button>
        </div>
      </div>`).join("");
  } catch{ el.innerHTML="<p style=\"color:red\">Gagal memuat pesanan</p>"; }
}

async function renderHistory(){
  const el=document.getElementById("salesHistoryList");
  try{
    const data=await fetchOrders();
    const history=data.filter(o=>o.status!=="pending");
    if(!history.length){ el.innerHTML="<p>Belum ada riwayat penjualan.</p>"; return; }
    el.innerHTML=history.slice().reverse().map(order=>`
      <div class="history-item">
        <div class="history-order-info">
          <strong>#${sanitize(String(order.id).slice(-6))} — ${sanitize(formatPrice(order.total))}</strong>
          <span>${sanitize(new Date(order.created_at||order.createdAt).toLocaleString("id-ID"))}</span>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          ${order.proof_path? `<img src="${sanitize(order.proof_path)}" class="history-proof" onclick="window.open(this.src,'_blank')" />` : ""}
          <span class="history-status ${sanitize(order.status)}">${sanitize(String(order.status).toUpperCase())}</span>
        </div>
      </div>`).join("");
  } catch{ el.innerHTML="<p style=\"color:red\">Gagal memuat riwayat</p>"; }
}

window.approveOrder=async function(id){
  if(!isSessionValid()){ alert("Sesi habis"); window.location.href="index.html"; return; }
  touchSession();
  const res=await fetch(`${API_BASE}/api/orders/${id}/status`,{method:"PATCH",headers:{Authorization:`Bearer ${token()}`, "Content-Type":"application/json"},body:JSON.stringify({status:"approved"})});
  if(!res.ok){ const d=await res.json().catch(()=>({})); return alert(d.error||"Gagal ACC"); }
  await renderPendingOrders(); await renderHistory(); await renderSalesChart(currentPeriod);
};

window.rejectOrder=async function(id){
  if(!isSessionValid()){ alert("Sesi habis"); window.location.href="index.html"; return; }
  touchSession();
  const res=await fetch(`${API_BASE}/api/orders/${id}/status`,{method:"PATCH",headers:{Authorization:`Bearer ${token()}`, "Content-Type":"application/json"},body:JSON.stringify({status:"rejected"})});
  if(!res.ok){ const d=await res.json().catch(()=>({})); return alert(d.error||"Gagal Tolak"); }
  await renderPendingOrders(); await renderHistory(); await renderSalesChart(currentPeriod);
};

window.logout=function(){
  sessionStorage.removeItem("token"); sessionStorage.removeItem("ownerLoggedIn"); sessionStorage.removeItem("ownerSessionTs");
  window.location.href="index.html";
};

renderPendingOrders(); renderHistory(); renderSalesChart(currentPeriod);
setInterval(()=>{ if(!isSessionValid()){ alert("Sesi habis"); window.location.href="index.html"; } }, 60000);

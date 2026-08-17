import{initializeApp}from"https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import{getFirestore,collection,getDocs,query,where}from"https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import{firebaseConfig}from"/firebase-config.js";
import{SITE_CONFIG}from"/site-config.js";

const app=initializeApp(firebaseConfig),db=getFirestore(app);
const $=id=>document.getElementById(id);
const rupiah=n=>new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(Number(n)||0);
const normalizeCategory=value=>{
  const v=String(value??"").trim().toLowerCase().replace(/[_-]/g," ");
  if(v==="cpm1"||v==="cpm 1"||v==="mobil cpm 1"||v==="mobil cpm1")return"cpm1";
  if(v==="cpm2"||v==="cpm 2"||v==="mobil cpm 2"||v==="mobil cpm2")return"cpm2";
  if(v==="jasa"||v==="jasa cpm")return"jasa";
  return v;
};
let products=[],category="all";

function escapeHtml(value){return String(value??"").replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
function showPopup(title,message,type="info",action=null){
  $("popupTitle").textContent=title;
  $("popupMessage").textContent=message;
  $("popupIcon").textContent=type==="error"?"!":type==="success"?"✓":"i";
  $("popupEyebrow").textContent=type==="error"?"ERROR":type==="success"?"SUCCESS":"NOTICE";
  const btn=$("popupAction");
  btn.classList.toggle("hidden",!action);
  if(action){btn.textContent=action.text;btn.onclick=()=>{hidePopup();action.fn?.();};}
  $("sitePopup").classList.remove("hidden");
}
function hidePopup(){$("sitePopup").classList.add("hidden");}
$("popupClose").onclick=hidePopup;
$("sitePopup").addEventListener("click",e=>{if(e.target===$("sitePopup"))hidePopup();});

document.title="Luxury CPM Store";
if(SITE_CONFIG.logoUrl){$("brandLogo").src=SITE_CONFIG.logoUrl;$("brandLogo").classList.remove("hidden");}
if(SITE_CONFIG.backgroundUrl){document.documentElement.style.setProperty("--site-bg-image",`url("${SITE_CONFIG.backgroundUrl.replace(/"/g,'\\"')}")`);document.body.classList.add("custom-bg");}

async function loadProducts(){
  try{
    const snap=await getDocs(query(collection(db,"products"),where("active","==",true)));
    products=snap.docs.map(d=>{const data=d.data();return{id:d.id,...data,normalizedCategory:normalizeCategory(data.category)};});
    render();
  }catch(e){console.error(e);$("grid").innerHTML="<p class='empty-state'>Gagal memuat produk. Periksa konfigurasi Firebase.</p>";}
}

function render(){
  const q=$("search").value.trim().toLowerCase();
  const list=products.filter(p=>(category==="all"||p.normalizedCategory===category)&&(`${p.name||""} ${p.specification||""} ${p.description||""}`).toLowerCase().includes(q));
  $("grid").innerHTML=list.map(p=>{
    const image=escapeHtml(p.image||"https://placehold.co/900x700?text=Luxury+CPM");
    const name=escapeHtml(p.name||"");
    const catLabel=p.normalizedCategory==="jasa"?"JASA CPM":p.normalizedCategory==="cpm1"?"CPM 1":"CPM 2";
    const watermark=SITE_CONFIG.logoUrl?`<img class="card-watermark" src="${escapeHtml(SITE_CONFIG.logoUrl)}" alt="">`:"";
    if(p.normalizedCategory==="jasa")return `<article class="product-card service-card"><div class="image-wrap"><img src="${image}" alt="${name}" loading="lazy"></div><div class="body"><div class="meta-row"><span class="tag">${catLabel}</span>${watermark}</div><h3>${name||"Jasa CPM"}</h3><p class="description">${escapeHtml(p.description||"")}</p>${p.price?`<p class="price">${rupiah(p.price)}</p>`:""}<button class="add" data-order="${escapeHtml(p.id)}">Pesan Jasa</button></div></article>`;
    return `<article class="product-card card"><div class="image-wrap"><img src="${image}" alt="${name}" loading="lazy"></div><div class="body"><div class="meta-row"><span class="tag">${catLabel}</span>${watermark}</div><h3>${name}</h3><p class="spec">${escapeHtml(p.specification||"Specification belum tersedia.")}</p><p class="price">${rupiah(p.price)}</p><p class="stock">${Number(p.stock)>0?"Tersedia":"Stok habis"}</p><button class="add" data-order="${escapeHtml(p.id)}" ${Number(p.stock)>0?"":"disabled"}>Pesan</button></div></article>`;
  }).join("")||"<p class='empty-state'>Belum ada produk di kategori ini.</p>";
  document.querySelectorAll("[data-order]").forEach(btn=>btn.onclick=()=>orderWhatsApp(btn.dataset.order));
}

function orderWhatsApp(id){
  const p=products.find(x=>x.id===id);if(!p)return;
  const number=String(SITE_CONFIG.whatsappNumber||"").replace(/\D/g,"");
  if(!number){showPopup("WhatsApp belum diatur","Masukkan nomor WhatsApp toko di site-config.js terlebih dahulu.","error");return;}
  const message=`permisi mau order "${p.name||"Produk"}", apakah masih ready?`;
  window.open(`https://wa.me/${number}?text=${encodeURIComponent(message)}`,"_blank","noopener,noreferrer");
}

document.querySelectorAll("[data-cat]").forEach(btn=>btn.onclick=()=>{category=btn.dataset.cat;document.querySelectorAll("[data-cat]").forEach(x=>x.classList.toggle("active",x===btn));render();});
const search=$("search"),shell=$("searchShell"),clear=$("clearSearch");
search.onfocus=()=>shell.classList.add("expanded");
search.oninput=()=>{clear.classList.toggle("hidden",!search.value);render();};
clear.onclick=()=>{search.value="";clear.classList.add("hidden");search.focus();render();};
search.addEventListener("keydown",e=>{if(e.key==="Escape"){search.value="";clear.classList.add("hidden");render();search.blur();}});

document.addEventListener("click",e=>{if(!shell.contains(e.target)&&!search.value)shell.classList.remove("expanded");});
loadProducts();

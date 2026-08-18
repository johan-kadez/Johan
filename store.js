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

document.title="Johan Abrakadabraw";
if(SITE_CONFIG.logoUrl){$("brandLogo").src=SITE_CONFIG.logoUrl;$("brandLogo").classList.remove("hidden");}
if(SITE_CONFIG.backgroundUrl){document.documentElement.style.setProperty("--site-bg-image",`url("${SITE_CONFIG.backgroundUrl.replace(/"/g,'\\"')}")`);document.body.classList.add("custom-bg");}
const waSocial=$("waSocial");
if(waSocial){const n=String(SITE_CONFIG.whatsappNumber||"").replace(/\D/g,"");if(n)waSocial.href=`https://wa.me/${n}`;}

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
    const image=escapeHtml(p.image||"https://placehold.co/900x700?text=Johan+Service");
    const name=escapeHtml(p.name||"");
    const catLabel=p.normalizedCategory==="jasa"?"JASA CPM":p.normalizedCategory==="cpm1"?"CPM 1":"CPM 2";
    const watermark=SITE_CONFIG.logoUrl?`<img class="card-watermark" src="${escapeHtml(SITE_CONFIG.logoUrl)}" alt="">`:"";
    const normalPrice=Number(p.price)||0,discountPrice=Number(p.discountPrice)||0;
    const displayPrice=(discountPrice>0&&normalPrice>0&&discountPrice<normalPrice)?`<span class="price-old">${rupiah(normalPrice)}</span><span class="price-new">${rupiah(discountPrice)}</span>`:(normalPrice?`<span class="price-new">${rupiah(normalPrice)}</span>`:"");
    if(p.normalizedCategory==="jasa")return `<article class="product-card service-card"><div class="image-wrap"><img src="${image}" alt="${name}" loading="lazy"></div><div class="body"><div class="meta-row"><span class="tag">${catLabel}</span>${watermark}</div><h3>${name||"Jasa CPM"}</h3><p class="description">${escapeHtml(p.description||"")}</p>${displayPrice?`<p class="price">${displayPrice}</p>`:""}<button class="add" data-order="${escapeHtml(p.id)}">Lihat</button></div></article>`;
    return `<article class="product-card card"><div class="image-wrap"><img src="${image}" alt="${name}" loading="lazy"></div><div class="body"><div class="meta-row"><span class="tag">${catLabel}</span>${watermark}</div><h3>${name}</h3><p class="spec">${escapeHtml(p.specification||"Specification belum tersedia.")}</p><p class="price">${displayPrice}</p><p class="stock">${Number(p.stock)>0?"Tersedia":"Stok habis"}</p><button class="add" data-order="${escapeHtml(p.id)}">Lihat</button></div></article>`;
  }).join("")||"<p class='empty-state'>Belum ada produk di kategori ini.</p>";
  document.querySelectorAll("[data-order]").forEach(btn=>btn.onclick=()=>openProductDetail(btn.dataset.order));
}

function ensureDetailPopup(){
  if($('productDetailPopup'))return;
  const style=document.createElement('style');
  style.textContent=`
    #productDetailPopup{position:fixed;inset:0;z-index:1200;display:flex;align-items:flex-end;justify-content:center;background:#000b;backdrop-filter:blur(10px);padding:0;opacity:0;pointer-events:none;transition:opacity .22s ease}
    #productDetailPopup.open{opacity:1;pointer-events:auto}
    #productDetailSheet{width:min(760px,100%);max-height:92vh;overflow:auto;background:#11110f;border:1px solid #29251e;border-bottom:0;border-radius:28px 28px 0 0;box-shadow:0 -18px 45px #000c;padding:16px 18px 24px;transform:translateY(100%);transition:transform .3s cubic-bezier(.2,.8,.2,1)}
    #productDetailPopup.open #productDetailSheet{transform:translateY(0)}
    #productDetailHandle{width:48px;height:5px;border-radius:99px;background:#555;margin:0 auto 15px}
    #productDetailClose{position:absolute;right:14px;top:12px;width:38px;height:38px;border:0;border-radius:12px;background:#171511;color:#eee;font-size:25px;cursor:pointer}
    #productDetailGallery{position:relative;overflow:hidden;border-radius:20px;background:#151513;box-shadow:inset 5px 5px 12px #080808,inset -5px -5px 12px #22211d}
    #productDetailTrack{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none;overscroll-behavior-x:contain;touch-action:pan-x}
    #productDetailTrack::-webkit-scrollbar{display:none}
    #productDetailTrack img{flex:0 0 100%;width:100%;height:min(58vh,520px);object-fit:cover;scroll-snap-align:center;display:block}
    .detail-arrow{position:absolute;top:50%;transform:translateY(-50%);width:42px;height:42px;border:0;border-radius:50%;background:#11110fcc;color:#fff;font-size:25px;cursor:pointer;z-index:2}
    #detailPrev{left:10px}#detailNext{right:10px}
    #productDetailDots{display:flex;justify-content:center;gap:6px;margin:10px 0 16px}
    #productDetailDots button{width:7px;height:7px;padding:0;border:0;border-radius:50%;background:#555;cursor:pointer}
    #productDetailDots button.active{background:var(--gold,#c9a45b);transform:scale(1.25)}
    #productDetailSheet .detail-tag{color:var(--gold,#c9a45b);font-size:11px;font-weight:800;letter-spacing:3px}
    #productDetailSheet h2{font:700 32px Georgia,serif;margin:8px 0 12px}
    #productDetailSheet .detail-text{color:#aaa;line-height:1.7;white-space:pre-line;margin:0 0 12px}
    #productDetailSheet .detail-price{margin:12px 0 6px;font-size:20px;font-weight:800}
    #productDetailSheet .price-old{color:#777;text-decoration:line-through;margin-right:9px;font-size:16px}
    #productDetailSheet .price-new{color:#eee}
    #productDetailSheet .detail-stock{color:#888;font-size:13px;margin:0 0 18px}
    #productDetailOrder{width:100%;margin-top:8px}
    @media(max-width:700px){#productDetailSheet{padding:12px 12px 20px;border-radius:23px 23px 0 0}#productDetailTrack img{height:55vh;max-height:430px}#productDetailSheet h2{font-size:27px}.detail-arrow{width:38px;height:38px}}
  `;
  document.head.appendChild(style);
  const wrap=document.createElement('div');
  wrap.id='productDetailPopup';
  wrap.innerHTML=`<div id="productDetailSheet" role="dialog" aria-modal="true" aria-label="Detail produk">
    <div id="productDetailHandle"></div>
    <button id="productDetailClose" type="button" aria-label="Tutup">×</button>
    <div id="productDetailGallery"><div id="productDetailTrack"></div><button id="detailPrev" class="detail-arrow" type="button">‹</button><button id="detailNext" class="detail-arrow" type="button">›</button></div>
    <div id="productDetailDots"></div>
    <div id="productDetailContent"></div>
    <button id="productDetailOrder" class="gold-btn" type="button">Pesan via WhatsApp</button>
  </div>`;
  document.body.appendChild(wrap);
  $('productDetailClose').onclick=closeProductDetail;
  wrap.addEventListener('click',e=>{if(e.target===wrap)closeProductDetail();});
  $('detailPrev').onclick=()=>moveDetail(-1);
  $('detailNext').onclick=()=>moveDetail(1);
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&wrap.classList.contains('open'))closeProductDetail();});
}
let detailProduct=null,detailIndex=0;
function getProductImages(p){
  const raw=Array.isArray(p.images)?p.images:[];
  const list=[p.image,...raw].map(x=>String(x||'').trim()).filter(Boolean);
  return [...new Set(list)];
}
function openProductDetail(id){
  ensureDetailPopup();
  const p=products.find(x=>x.id===id); if(!p)return;
  detailProduct=p;detailIndex=0;
  const images=getProductImages(p);
  const track=$('productDetailTrack');
  track.innerHTML=images.map((url,i)=>`<img src="${escapeHtml(url)}" alt="${escapeHtml(p.name||'Produk')} ${i+1}" loading="lazy">`).join('');
  $('productDetailDots').innerHTML=images.map((_,i)=>`<button type="button" data-detail-dot="${i}" aria-label="Foto ${i+1}"></button>`).join('');
  document.querySelectorAll('[data-detail-dot]').forEach(b=>b.onclick=()=>{detailIndex=Number(b.dataset.detailDot);scrollDetailToIndex();});
  const normal=Number(p.price)||0,discount=Number(p.discountPrice)||0;
  const price=(discount>0&&normal>0&&discount<normal)?`<span class="price-old">${rupiah(normal)}</span><span class="price-new">${rupiah(discount)}</span>`:(normal?`<span class="price-new">${rupiah(normal)}</span>`:'');
  const cat=p.normalizedCategory==='jasa'?'JASA CPM':p.normalizedCategory==='cpm1'?'CPM 1':'CPM 2';
  const text=p.normalizedCategory==='jasa'?(p.description||'Deskripsi belum tersedia.'):(p.specification||'Specification belum tersedia.');
  $('productDetailContent').innerHTML=`<span class="detail-tag">${escapeHtml(cat)}</span><h2>${escapeHtml(p.name||'Produk')}</h2><p class="detail-text">${escapeHtml(text)}</p>${price?`<div class="detail-price">${price}</div>`:''}<p class="detail-stock">${p.normalizedCategory==='jasa'?'':'Stok: '+(Number(p.stock)>0?'Tersedia':'Stok habis')}</p>`;
  $('productDetailOrder').onclick=()=>orderWhatsApp(p.id);
  updateDetailControls();
  $('productDetailPopup').classList.add('open');
  document.body.style.overflow='hidden';
}
function closeProductDetail(){const x=$('productDetailPopup');if(!x)return;x.classList.remove('open');document.body.style.overflow='';}
function scrollDetailToIndex(){const track=$('productDetailTrack');track.scrollTo({left:track.clientWidth*detailIndex,behavior:'smooth'});updateDetailControls();}
function moveDetail(step){const count=$('productDetailTrack').children.length;detailIndex=Math.max(0,Math.min(count-1,detailIndex+step));scrollDetailToIndex();}
function updateDetailControls(){
  const count=$('productDetailTrack').children.length;
  $('detailPrev').style.display=count>1?'block':'none';$('detailNext').style.display=count>1?'block':'none';
  document.querySelectorAll('[data-detail-dot]').forEach((b,i)=>b.classList.toggle('active',i===detailIndex));
}
function orderWhatsApp(id){
  const p=products.find(x=>x.id===id);
  if(!p)return;

  const number="6283129582374";

  const finalPrice=(Number(p.discountPrice)>0&&Number(p.price)>0&&Number(p.discountPrice)<Number(p.price))?p.discountPrice:p.price;
  const message=`permisi mau order "${p.name||"Produk"}", harga ${rupiah(finalPrice)}, apakah masih ready?`;

  window.open(
    `https://wa.me/${number}?text=${encodeURIComponent(message)}`,
    "_blank",
    "noopener,noreferrer"
  );
}

document.querySelectorAll("[data-cat]").forEach(btn=>btn.onclick=()=>{category=btn.dataset.cat;document.querySelectorAll("[data-cat]").forEach(x=>x.classList.toggle("active",x===btn));render();});
const search=$("search"),shell=$("searchShell"),clear=$("clearSearch"),searchToggle=$("searchToggle");
function openSearch(){
  shell.classList.add("expanded");
  searchToggle.setAttribute("aria-expanded","true");
  searchToggle.setAttribute("aria-label","Tutup pencarian");
  requestAnimationFrame(()=>search.focus({preventScroll:true}));
}
function closeSearch(force=false){
  if(force||!search.value){
    shell.classList.remove("expanded");
    searchToggle.setAttribute("aria-expanded","false");
    searchToggle.setAttribute("aria-label","Buka pencarian");
    if(force)search.blur();
  }
}
searchToggle.onclick=()=>shell.classList.contains("expanded")?closeSearch(true):openSearch();
search.onfocus=()=>{shell.classList.add("expanded");searchToggle.setAttribute("aria-expanded","true");};
search.oninput=()=>{clear.classList.toggle("hidden",!search.value);render();};
clear.onclick=()=>{search.value="";clear.classList.add("hidden");openSearch();render();};
search.addEventListener("keydown",e=>{
  if(e.key==="Escape"){
    if(search.value){search.value="";clear.classList.add("hidden");render();}
    closeSearch(true);
  }
});

const detailTrackObserver=()=>{const track=$('productDetailTrack');if(!track)return;const w=track.clientWidth;if(!w)return;const idx=Math.round(track.scrollLeft/w);if(idx!==detailIndex){detailIndex=idx;updateDetailControls();}};

document.addEventListener("click",e=>{
  if(!shell.contains(e.target)&&!search.value)closeSearch();
});
document.addEventListener("scroll",detailTrackObserver,true);
loadProducts();

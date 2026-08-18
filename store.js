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

function productImages(p){
  const list=[];
  if(p.image) list.push(String(p.image));
  if(Array.isArray(p.images)) p.images.forEach(x=>{if(x&&!list.includes(String(x)))list.push(String(x));});
  return list.length?list:["https://placehold.co/900x700?text=Johan+Service"];
}
function priceMarkup(p){
  const normal=Number(p.price)||0, sale=Number(p.discountPrice)||0;
  if(sale>0&&normal>0&&sale<normal)return `<span class="price-old">${rupiah(normal)}</span><span class="price-new">${rupiah(sale)}</span>`;
  return normal?`<span class="price-new">${rupiah(normal)}</span>`:"";
}
function render(){
  const q=$("search").value.trim().toLowerCase();
  const list=products.filter(p=>(category==="all"||p.normalizedCategory===category)&&(`${p.name||""} ${p.specification||""} ${p.description||""}`).toLowerCase().includes(q));
  $("grid").innerHTML=list.map(p=>{
    const image=escapeHtml(p.image||"https://placehold.co/900x700?text=Johan+Service");
    const name=escapeHtml(p.name||"");
    const catLabel=p.normalizedCategory==="jasa"?"JASA CPM":p.normalizedCategory==="cpm1"?"CPM 1":"CPM 2";
    const watermark=SITE_CONFIG.logoUrl?`<img class="card-watermark" src="${escapeHtml(SITE_CONFIG.logoUrl)}" alt="">`:"";
    const displayPrice=priceMarkup(p);
    return `<article class="product-card ${p.normalizedCategory==="jasa"?"service-card":"card"}"><div class="image-wrap"><img src="${image}" alt="${name}" loading="lazy"></div><div class="body"><div class="meta-row"><span class="tag">${catLabel}</span>${watermark}</div><h3>${name||"Jasa CPM"}</h3>${p.normalizedCategory==="jasa"?`<p class="description">${escapeHtml(p.description||"")}</p>`:`<p class="spec">${escapeHtml(p.specification||"Specification belum tersedia.")}</p>`}${displayPrice?`<p class="price">${displayPrice}</p>`:""}${p.normalizedCategory!=="jasa"?`<p class="stock">${Number(p.stock)>0?"Tersedia":"Stok habis"}</p>`:""}<button class="add" data-view="${escapeHtml(p.id)}" type="button">Lihat</button></div></article>`;
  }).join("")||"<p class='empty-state'>Belum ada produk di kategori ini.</p>";
  document.querySelectorAll("[data-view]").forEach(btn=>btn.onclick=()=>openProductDetail(btn.dataset.view));
}

let detailProduct=null,detailIndex=0;
function openProductDetail(id){
  const p=products.find(x=>x.id===id); if(!p)return;
  detailProduct=p; detailIndex=0; renderProductDetail();
  $("productDetailPopup").classList.remove("hidden");
  document.body.classList.add("product-detail-open");
}
function closeProductDetail(){ $("productDetailPopup").classList.add("hidden"); document.body.classList.remove("product-detail-open"); detailProduct=null; }
function renderProductDetail(){
  if(!detailProduct)return;
  const p=detailProduct, imgs=productImages(p);
  detailIndex=Math.max(0,Math.min(detailIndex,imgs.length-1));
  $("detailImage").src=imgs[detailIndex];
  $("detailImage").alt=p.name||"Foto produk";
  $("detailCategory").textContent=p.normalizedCategory==="jasa"?"JASA CPM":p.normalizedCategory==="cpm1"?"CPM 1":"CPM 2";
  $("detailName").textContent=p.name||"Produk";
  $("detailSpec").textContent=p.specification||"";
  $("detailSpec").classList.toggle("hidden",!p.specification);
  $("detailDescription").textContent=p.description||"";
  $("detailDescription").classList.toggle("hidden",!p.description);
  $("detailPrice").innerHTML=priceMarkup(p);
  $("detailPrice").classList.toggle("hidden",!(Number(p.price)||Number(p.discountPrice)));
  $("detailStock").textContent=p.normalizedCategory==="jasa"?"":"Stok: "+(Number(p.stock)>0?"Tersedia":"Habis");
  $("detailOrder").textContent=p.normalizedCategory==="jasa"?"Pesan Jasa":"Pesan";
  $("detailOrder").disabled=p.normalizedCategory!=="jasa"&&Number(p.stock)<=0;
  $("galleryDots").innerHTML=imgs.map((_,i)=>`<button type="button" class="gallery-dot${i===detailIndex?" active":""}" data-dot="${i}" aria-label="Foto ${i+1}"></button>`).join("");
  $("galleryPrev").classList.toggle("hidden",imgs.length<2); $("galleryNext").classList.toggle("hidden",imgs.length<2);
  document.querySelectorAll("[data-dot]").forEach(b=>b.onclick=()=>{detailIndex=Number(b.dataset.dot);renderProductDetail()});
}
function changeGallery(dir){if(!detailProduct)return;const imgs=productImages(detailProduct);if(imgs.length<2)return;detailIndex=(detailIndex+dir+imgs.length)%imgs.length;renderProductDetail();}
$("productDetailClose").onclick=closeProductDetail;
$("galleryPrev").onclick=()=>changeGallery(-1); $("galleryNext").onclick=()=>changeGallery(1);
$("detailOrder").onclick=()=>{if(detailProduct)orderWhatsApp(detailProduct.id)};
$("productDetailPopup").addEventListener("click",e=>{if(e.target===$("productDetailPopup"))closeProductDetail()});
let touchX=0;
$("detailImage").addEventListener("touchstart",e=>{touchX=e.touches[0].clientX},{passive:true});
$("detailImage").addEventListener("touchend",e=>{const dx=e.changedTouches[0].clientX-touchX;if(Math.abs(dx)>45)changeGallery(dx<0?1:-1)},{passive:true});
document.addEventListener("keydown",e=>{if($("productDetailPopup")&&!$("productDetailPopup").classList.contains("hidden")){if(e.key==="Escape")closeProductDetail();if(e.key==="ArrowLeft")changeGallery(-1);if(e.key==="ArrowRight")changeGallery(1)}});

function orderWhatsApp(id){
  const p=products.find(x=>x.id===id); if(!p)return;
  const number="6283129582374";
  const finalPrice=(Number(p.discountPrice)>0&&Number(p.price)>0&&Number(p.discountPrice)<Number(p.price))?p.discountPrice:p.price;
  const message=`permisi mau order "${p.name||"Produk"}", harga ${rupiah(finalPrice)}, apakah masih ready?`;
  window.open(`https://wa.me/${number}?text=${encodeURIComponent(message)}`,"_blank","noopener,noreferrer");
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

document.addEventListener("click",e=>{
  if(!shell.contains(e.target)&&!search.value)closeSearch();
});
loadProducts();

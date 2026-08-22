import{initializeApp}from"https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import{getFirestore,collection,getDocs,query,where}from"https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import{firebaseConfig}from"/firebase-config.js";
import{SITE_CONFIG}from"/site-config.js";

const app=initializeApp(firebaseConfig),db=getFirestore(app),$=id=>document.getElementById(id);
const rupiah=n=>new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(Number(n)||0);
const normalizeCategory=value=>{const v=String(value??"").trim().toLowerCase().replace(/[_-]/g," ");if(v==="cpm1"||v==="cpm 1"||v==="mobil cpm 1"||v==="mobil cpm1")return"cpm1";if(v==="cpm2"||v==="cpm 2"||v==="mobil cpm 2"||v==="mobil cpm2")return"cpm2";if(v==="jasa"||v==="jasa cpm")return"jasa";return v};
const makeSlug=value=>String(value??"").trim().toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,80);
const productUrl=p=>`/product/${encodeURIComponent(p.slug||makeSlug(p.productId||p.name||p.id))}`;
let products=[],category="all";

function escapeHtml(value){return String(value??"").replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]))}
function showPopup(title,message,type="info",action=null){$("popupTitle").textContent=title;$("popupMessage").textContent=message;$("popupIcon").textContent=type==="error"?"!":type==="success"?"✓":"i";$("popupEyebrow").textContent=type==="error"?"ERROR":type==="success"?"SUCCESS":"NOTICE";const b=$("popupAction");b.classList.toggle("hidden",!action);if(action){b.textContent=action.text;b.onclick=()=>{hidePopup();action.fn?.()}}$("sitePopup").classList.remove("hidden")}
function hidePopup(){$("sitePopup").classList.add("hidden")}
$("popupClose").onclick=hidePopup;$("sitePopup").addEventListener("click",e=>{if(e.target===$("sitePopup"))hidePopup()});

document.title="Johan Abrakadabraw";
if(SITE_CONFIG.logoUrl){$("brandLogo").src=SITE_CONFIG.logoUrl;$("brandLogo").classList.remove("hidden")}
if(SITE_CONFIG.backgroundUrl){document.documentElement.style.setProperty("--site-bg-image",`url("${SITE_CONFIG.backgroundUrl.replace(/"/g,'\\"')}")`);document.body.classList.add("custom-bg")}
const waSocial=$("waSocial");if(waSocial){const n=String(SITE_CONFIG.whatsappNumber||"").replace(/\D/g,"");if(n)waSocial.href=`https://wa.me/${n}`}

async function loadProducts(){try{const snap=await getDocs(query(collection(db,"products"),where("active","==",true)));products=snap.docs.map(d=>{const data=d.data();return{id:d.id,...data,normalizedCategory:normalizeCategory(data.category)}});render()}catch(e){console.error(e);$("grid").innerHTML="<p class='empty-state'>Gagal memuat produk. Periksa konfigurasi Firebase.</p>"}}

function render(){
  const q=$("search").value.trim().toLowerCase();
  const list=products.filter(p=>(category==="all"||p.normalizedCategory===category)&&(`${p.name||""} ${p.productId||""} ${p.specification||""} ${p.description||""}`).toLowerCase().includes(q));
  $("grid").innerHTML=list.map(p=>{
    const image=escapeHtml((Array.isArray(p.images)&&p.images[0])||p.image||"https://placehold.co/900x700?text=Johan+Service");
    const name=escapeHtml(p.name||"");
    const catLabel=p.normalizedCategory==="jasa"?"JASA CPM":p.normalizedCategory==="cpm1"?"CPM 1":"CPM 2";
    const watermark=SITE_CONFIG.logoUrl?`<img class="card-watermark" src="${escapeHtml(SITE_CONFIG.logoUrl)}" alt="">`:"";
    const normal=Number(p.price)||0,disc=Number(p.discountPrice)||0;
    const displayPrice=disc>0&&normal>0&&disc<normal?`<span class="price-old">${rupiah(normal)}</span><span class="price-new">${rupiah(disc)}</span>`:(normal?`<span class="price-new">${rupiah(normal)}</span>`:"");
    const url=productUrl(p);
    if(p.normalizedCategory==="jasa")return `<article class="product-card service-card"><a href="${url}" class="image-wrap" aria-label="Lihat ${name}"><img src="${image}" alt="${name}" loading="lazy"></a><div class="body"><div class="meta-row"><span class="tag">${catLabel}</span>${watermark}</div><h3><a href="${url}">${name||"Jasa CPM"}</a></h3><p class="description">${escapeHtml(p.description||"")}</p>${displayPrice?`<p class="price">${displayPrice}</p>`:""}<a class="add" href="${url}">Lihat</a></div></article>`;
    return `<article class="product-card card"><a href="${url}" class="image-wrap" aria-label="Lihat ${name}"><img src="${image}" alt="${name}" loading="lazy"></a><div class="body"><div class="meta-row"><span class="tag">${catLabel}</span>${watermark}</div><h3><a href="${url}">${name}</a></h3><p class="spec">${escapeHtml(p.specification||"Specification belum tersedia.")}</p><p class="price">${displayPrice}</p><p class="stock">${Number(p.stock)>0?"Tersedia":"Stok habis"}</p><a class="add" href="${url}">Lihat</a></div></article>`
  }).join("")||"<p class='empty-state'>Belum ada produk di kategori ini.</p>"
}

document.querySelectorAll("[data-cat]").forEach(btn=>btn.onclick=()=>{category=btn.dataset.cat;document.querySelectorAll("[data-cat]").forEach(x=>x.classList.toggle("active",x===btn));render()});
const search=$("search"),shell=$("searchShell"),clear=$("clearSearch"),searchToggle=$("searchToggle");
function openSearch(){shell.classList.add("expanded");searchToggle.setAttribute("aria-expanded","true");searchToggle.setAttribute("aria-label","Tutup pencarian");requestAnimationFrame(()=>search.focus({preventScroll:true}))}
function closeSearch(force=false){if(force||!search.value){shell.classList.remove("expanded");searchToggle.setAttribute("aria-expanded","false");searchToggle.setAttribute("aria-label","Buka pencarian");if(force)search.blur()}}
searchToggle.onclick=()=>shell.classList.contains("expanded")?closeSearch(true):openSearch();
search.onfocus=()=>{shell.classList.add("expanded");searchToggle.setAttribute("aria-expanded","true")};
search.oninput=()=>{clear.classList.toggle("hidden",!search.value);render()};
clear.onclick=()=>{search.value="";clear.classList.add("hidden");openSearch();render()};
search.addEventListener("keydown",e=>{if(e.key==="Escape"){if(search.value){search.value="";clear.classList.add("hidden");render()}closeSearch(true)}});
document.addEventListener("click",e=>{if(!shell.contains(e.target)&&!search.value)closeSearch()});
loadProducts();

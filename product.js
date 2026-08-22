import{initializeApp}from"https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import{getFirestore,collection,getDocs,query,where}from"https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import{firebaseConfig}from"/firebase-config.js";
import{SITE_CONFIG}from"/site-config.js";

const app=initializeApp(firebaseConfig),db=getFirestore(app);
const $=id=>document.getElementById(id);
const rupiah=n=>new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(Number(n)||0);
const makeSlug=v=>String(v??"").trim().toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,80);
const escapeHtml=v=>String(v??"").replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
const getImages=p=>[...new Set([p.image,...(Array.isArray(p.images)?p.images:[])].map(x=>String(x||"").trim()).filter(Boolean))];
const getSlug=p=>p.slug||makeSlug(p.productId||p.name||p.id);
const currentSlug=decodeURIComponent(location.pathname.split("/").filter(Boolean).pop()||"");

function categoryLabel(p){
  return p.category==="jasa"?"JASA":p.category==="cpm1"?"CPM 1":"CPM 2";
}

function priceHtml(p){
  const normal=Number(p.price)||0,disc=Number(p.discountPrice)||0;
  if(disc>0&&normal>0&&disc<normal){
    return `<span class="old">${rupiah(normal)}</span>${rupiah(disc)}`;
  }
  return normal?rupiah(normal):"";
}

function setMeta(p){
  const name=p.name||"Produk Johan Service";
  const desc=(p.description||p.specification||`Beli ${name} di Johan Service.`).slice(0,160);
  document.title=`${name} - Johan Service`;
  let m=document.querySelector('meta[name="description"]');
  if(!m){m=document.createElement("meta");m.name="description";document.head.appendChild(m)}
  m.content=desc;
  let c=document.querySelector('link[rel="canonical"]');
  if(!c){c=document.createElement("link");c.rel="canonical";document.head.appendChild(c)}
  c.href=location.origin+location.pathname;
}

function renderCatalog(products,currentId){
  const list=products.filter(p=>p.id!==currentId&&p.active!==false).slice(0,8);
  if(!list.length){
    return `<div class="catalog-empty">Belum ada produk lain di etalase.</div>`;
  }
  return list.map(p=>{
    const imgs=getImages(p);
    const img=escapeHtml(imgs[0]||"https://placehold.co/700x700?text=Johan+Service");
    const name=escapeHtml(p.name||"Produk");
    const slug=encodeURIComponent(getSlug(p));
    return `<a class="catalog-card" href="/product/${slug}">
      <div class="catalog-card-image"><img src="${img}" alt="${name}" loading="lazy"></div>
      <div class="catalog-card-body">
        <p class="catalog-card-category">${escapeHtml(categoryLabel(p))}</p>
        <h3 class="catalog-card-title">${name}</h3>
        <p class="catalog-card-price">${priceHtml(p)}</p>
      </div>
    </a>`;
  }).join("");
}

function renderProduct(p,allProducts){
  const images=getImages(p);
  const main=images[0]||"https://placehold.co/1000x750?text=Johan+Service";
  const available=p.category==="jasa"||Number(p.stock)>0;
  const number=String(SITE_CONFIG.whatsappNumber||"6283129582374").replace(/\D/g,"");
  const normal=Number(p.price)||0,disc=Number(p.discountPrice)||0;
  const finalPrice=disc>0&&normal>0&&disc<normal?disc:normal;
  const wa=`https://wa.me/${number}?text=${encodeURIComponent(`Yo B*tch, I Wanna Order ${p.productId||p.name||"produk"} Price Like a ${rupiah(finalPrice)}.`)}`;

  const thumbs=images.map((src,i)=>`<button type="button" class="${i===0?"active":""}" data-thumb="${i}" aria-label="Foto ${i+1}">
    <img src="${escapeHtml(src)}" alt="" loading="lazy">
  </button>`).join("");

  $("app").innerHTML=`
    <main class="product-page-wrap">
      <section class="product-detail-rebuild">
        <div class="product-gallery-rebuild">
          <div class="product-main-image-wrap">
            <img id="mainProductImage" class="product-main-image" src="${escapeHtml(main)}" alt="${escapeHtml(p.name||"Produk")}">
          </div>
          ${images.length>1?`<div class="product-thumbs">${thumbs}</div>`:""}
        </div>

        <article class="product-info-rebuild">
          <p class="eyebrow">${escapeHtml(categoryLabel(p))}</p>
          <h1>${escapeHtml(p.name||"Produk")}</h1>
          ${p.productId?`<p class="product-id-rebuild">ID Produk: ${escapeHtml(p.productId)}</p>`:""}
          ${normal?`<div class="product-price-rebuild">${priceHtml(p)}</div>`:""}
          ${p.category!=="jasa"?`<p class="product-stock-rebuild">${available?"Tersedia":"Stok habis"}</p>`:""}
          ${p.description?`<p class="product-description-rebuild">${escapeHtml(p.description)}</p>`:""}
          ${p.specification?`<div class="product-spec-rebuild"><strong>Specification</strong><p>${escapeHtml(p.specification)}</p></div>`:""}
          ${available?`<a class="product-order-rebuild" href="${wa}" target="_blank" rel="noopener">Pesan via WhatsApp</a>`:`<span class="product-order-rebuild disabled">Stok habis</span>`}
        </article>
      </section>

      <section class="product-catalog-section">
        <div class="product-catalog-heading">
          <p class="eyebrow">ETALASE PRODUK</p>
          <h2>Produk Lainnya</h2>
        </div>
        <div class="product-catalog-grid">${renderCatalog(allProducts,p.id)}</div>
      </section>
    </main>`;

  document.querySelectorAll("[data-thumb]").forEach(btn=>{
    btn.addEventListener("click",()=>{
      const i=Number(btn.dataset.thumb);
      const src=images[i];
      if(src) $("mainProductImage").src=src;
      document.querySelectorAll("[data-thumb]").forEach(x=>x.classList.remove("active"));
      btn.classList.add("active");
    });
  });

  setMeta(p);
}

async function load(){
  try{
    const snap=await getDocs(query(collection(db,"products"),where("active","==",true)));
    const products=snap.docs.map(d=>({id:d.id,...d.data()}));
    const found=products.find(p=>getSlug(p)===currentSlug);

    if(!found){
      $("app").innerHTML=`<main class="product-page-wrap">
        <section class="product-info-rebuild">
          <p class="eyebrow">JOHAN SERVICE</p>
          <h1>Produk tidak ditemukan</h1>
          <a class="product-order-rebuild" href="/">Kembali ke Store</a>
        </section>
      </main>`;
      document.title="Produk tidak ditemukan - Johan Service";
      return;
    }

    renderProduct(found,products);
  }catch(e){
    console.error(e);
    $("app").innerHTML=`<main class="product-page-wrap">
      <section class="product-info-rebuild">
        <p class="eyebrow">JOHAN SERVICE</p>
        <h1>Gagal memuat produk</h1>
        <p class="product-description-rebuild">Periksa koneksi Firebase dan pastikan file <b>product.js</b> berada di root website.</p>
        <a class="product-order-rebuild" href="/">Kembali ke Store</a>
      </section>
    </main>`;
  }
}

load();

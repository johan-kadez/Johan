import{initializeApp}from"https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import{getFirestore,collection,getDocs,query,where}from"https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import{firebaseConfig}from"/firebase-config.js";
import{SITE_CONFIG}from"/site-config.js";

const app=initializeApp(firebaseConfig),db=getFirestore(app),$=id=>document.getElementById(id);
const rupiah=n=>new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(Number(n)||0);
const makeSlug=v=>String(v??"").trim().toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,80);
const escapeHtml=v=>String(v??"").replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
const slug=decodeURIComponent(location.pathname.split("/").filter(Boolean).pop()||"");

function getImages(p){const raw=Array.isArray(p.images)?p.images:[];return[...new Set([p.image,...raw].map(x=>String(x||"").trim()).filter(Boolean))]}

function setMeta(p){
  const name=p.name||"Produk Johan Service",desc=p.description||p.specification||`Beli ${name} di Johan Service.`;
  document.title=`${name} - Johan Service`;
  let m=document.querySelector('meta[name="description"]');if(!m){m=document.createElement("meta");m.name="description";document.head.appendChild(m)}m.content=desc.slice(0,160);
  let c=document.querySelector('link[rel="canonical"]');if(!c){c=document.createElement("link");c.rel="canonical";document.head.appendChild(c)}c.href=location.origin+`/product/${encodeURIComponent(p.slug||makeSlug(p.productId||p.name||p.id))}`;
}

function render(p){
  const images=getImages(p),main=images[0]||"https://placehold.co/900x700?text=Johan+Service";
  const normal=Number(p.price)||0,disc=Number(p.discountPrice)||0;
  const price=disc>0&&normal>0&&disc<normal?`<span class="price-old">${rupiah(normal)}</span><span class="price-new">${rupiah(disc)}</span>`:(normal?`<span class="price-new">${rupiah(normal)}</span>`:"");
  const category=p.category==="jasa"?"JASA CPM":p.category==="cpm1"?"CPM 1":"CPM 2";
  const available=p.category==="jasa"||Number(p.stock)>0;
  const number=String(SITE_CONFIG.whatsappNumber||"6283129582374").replace(/\D/g,"");
  const finalPrice=disc>0&&normal>0&&disc<normal?disc:normal;
  const wa=`https://wa.me/${number}?text=${encodeURIComponent(`yo bitch i wanna order ${p.productId||"ID Produk"}, price : ${rupiah(finalPrice)}, still ready??`)}`;

  $("app").innerHTML=`
    <button class="product-back-x" id="productBackX" type="button" aria-label="Kembali ke Store">×</button>
    <main class="product-page">
      <article class="product-detail">
        <div class="product-gallery">
          <img id="mainImage" src="${escapeHtml(main)}" alt="${escapeHtml(p.name||"Produk")}">
          ${images.length>1?`<div class="thumbs">${images.map(src=>`<img src="${escapeHtml(src)}" alt="">`).join("")}</div>`:""}
        </div>
        <div class="product-info">
          <p class="eyebrow">${category}</p>
          <h1>${escapeHtml(p.name||"Produk")}</h1>
          ${p.productId?`<p class="product-id">ID Produk: ${escapeHtml(p.productId)}</p>`:""}
          ${price?`<div class="product-price">${price}</div>`:""}
          ${p.category!=="jasa"?`<p class="stock">${available?"Tersedia":"Stok habis"}</p>`:""}
          ${p.description?`<p class="description">${escapeHtml(p.description)}</p>`:""}
          ${p.specification?`<div class="spec"><strong>Specification</strong><p>${escapeHtml(p.specification)}</p></div>`:""}
          ${available?`<a class="gold-btn order-btn" href="${wa}" target="_blank" rel="noopener">Pesan via WhatsApp</a>`:`<button class="gold-btn order-btn" disabled>Stok habis</button>`}
        </div>
      </article>
    </main>`;

  $("productBackX").onclick=()=>{
    if(document.referrer && new URL(document.referrer).origin===location.origin){
      history.back();
    }else{
      location.href="/";
    }
  };

  document.querySelectorAll(".thumbs img").forEach(t=>t.onclick=()=>{$("mainImage").src=t.src});
  setMeta(p);
}
  document.querySelectorAll(".thumbs img").forEach(t=>t.onclick=()=>{$("mainImage").src=t.src});
  setMeta(p);
}

async function load(){
  try{
    const snap=await getDocs(query(collection(db,"products"),where("active","==",true)));
    const found=snap.docs.map(d=>({id:d.id,...d.data()})).find(p=>(p.slug||makeSlug(p.productId||p.name||p.id))===slug);
    if(!found){$("app").innerHTML=`<main class="product-page"><h1>Produk tidak ditemukan</h1><a class="gold-btn" href="/">Kembali ke Store</a></main>`;document.title="Produk tidak ditemukan - Johan Service";return}
    render(found);
  }catch(e){console.error(e);$("app").innerHTML=`<main class="product-page"><h1>Gagal memuat produk</h1><p>Periksa koneksi dan konfigurasi Firebase.</p><a class="gold-btn" href="/">Kembali ke Store</a></main>`}
}
load();

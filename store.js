import{initializeApp}from"https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import{getFirestore,collection,getDocs,query,where}from"https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import{firebaseConfig}from"/firebase-config.js";
import{SITE_CONFIG}from"/site-config.js";

const app=initializeApp(firebaseConfig),db=getFirestore(app);
const $=id=>document.getElementById(id);

const rupiah=n=>new Intl.NumberFormat("id-ID",{
  style:"currency",
  currency:"IDR",
  maximumFractionDigits:0
}).format(Number(n)||0);

const normalizeCategory=value=>{
  const v=String(value??"").trim().toLowerCase().replace(/[_-]/g," ");

  if(v==="cpm1"||v==="cpm 1"||v==="mobil cpm 1"||v==="mobil cpm1")return"cpm1";
  if(v==="cpm2"||v==="cpm 2"||v==="mobil cpm 2"||v==="mobil cpm2")return"cpm2";
  if(v==="jasa"||v==="jasa cpm")return"jasa";

  return v;
};

let products=[],category="all",detailIndex=0,detailImages=[];

function escapeHtml(value){
  return String(value??"").replace(/[&<>'"]/g,c=>({
    "&":"&amp;",
    "<":"&lt;",
    ">":"&gt;",
    "'":"&#39;",
    '"':"&quot;"
  }[c]));
}

function showPopup(title,message,type="info",action=null){
  $("popupTitle").textContent=title;
  $("popupMessage").textContent=message;

  $("popupIcon").textContent=
    type==="error"?"!":
    type==="success"?"✓":"i";

  $("popupEyebrow").textContent=
    type==="error"?"ERROR":
    type==="success"?"SUCCESS":"NOTICE";

  const b=$("popupAction");

  b.classList.toggle("hidden",!action);

  if(action){
    b.textContent=action.text;
    b.onclick=()=>{
      hidePopup();
      action.fn?.();
    };
  }

  $("sitePopup").classList.remove("hidden");
}

function hidePopup(){
  $("sitePopup").classList.add("hidden");
}

$("popupClose").onclick=hidePopup;

$("sitePopup").addEventListener("click",e=>{
  if(e.target===$("sitePopup"))hidePopup();
});

document.title="Johan Abrakadabraw";

if(SITE_CONFIG.logoUrl){
  $("brandLogo").src=SITE_CONFIG.logoUrl;
  $("brandLogo").classList.remove("hidden");
}

if(SITE_CONFIG.backgroundUrl){
  document.documentElement.style.setProperty(
    "--site-bg-image",
    `url("${SITE_CONFIG.backgroundUrl.replace(/"/g,'\\"')}")`
  );

  document.body.classList.add("custom-bg");
}

const waSocial=$("waSocial");

if(waSocial){
  const n=String(SITE_CONFIG.whatsappNumber||"").replace(/\D/g,"");

  if(n)waSocial.href=`https://wa.me/${n}`;
}


/* =========================
   DETAIL POPUP
========================= */

function ensureDetailPopup(){

  if($("productDetailPopup"))return;

  const el=document.createElement("div");

  el.id="productDetailPopup";
  el.className="product-detail-popup hidden";

  el.innerHTML=`
    <div
      class="product-detail-sheet"
      role="dialog"
      aria-modal="true"
      aria-label="Detail produk"
    >

      <button
        type="button"
        class="detail-close"
        id="detailClose"
      >×</button>

      <div class="detail-gallery">

        <div
          class="detail-track"
          id="detailTrack"
        ></div>

        <button
          type="button"
          class="gallery-arrow gallery-prev"
          id="galleryPrev"
        >‹</button>

        <button
          type="button"
          class="gallery-arrow gallery-next"
          id="galleryNext"
        >›</button>

        <div
          class="gallery-counter"
          id="galleryCounter"
        >1 / 1</div>

      </div>

      <div class="detail-content">

        <p
          class="eyebrow"
          id="detailCategory"
        ></p>

        <h2 id="detailName"></h2>

        <div
          class="detail-price"
          id="detailPrice"
        ></div>

        <p
          class="detail-stock"
          id="detailStock"
        ></p>

        <p
          class="detail-description"
          id="detailDescription"
        ></p>

        <p
          class="detail-spec"
          id="detailSpec"
        ></p>

        <button
          type="button"
          class="gold-btn detail-order"
          id="detailOrder"
        >
          Pesan via WhatsApp
        </button>

      </div>

    </div>
  `;

  document.body.appendChild(el);

  $("detailClose").onclick=closeDetail;

  el.addEventListener("click",e=>{
    if(e.target===el)closeDetail();
  });

  $("galleryPrev").onclick=()=>moveGallery(-1);
  $("galleryNext").onclick=()=>moveGallery(1);

  let sx=0;

  $("detailTrack").addEventListener(
    "touchstart",
    e=>{
      sx=e.changedTouches[0].clientX;
    },
    {passive:true}
  );

  $("detailTrack").addEventListener(
    "touchend",
    e=>{
      const dx=e.changedTouches[0].clientX-sx;

      if(Math.abs(dx)>45){
        moveGallery(dx<0?1:-1);
      }
    },
    {passive:true}
  );
}


/* =========================
   MULTIPLE FOTO
========================= */

function getImages(p){

  const raw=Array.isArray(p.images)
    ?p.images
    :[];

  const all=[
    p.image,
    ...raw
  ]
  .map(x=>String(x||"").trim())
  .filter(Boolean);

  return[...new Set(all)];
}


/* =========================
   OPEN DETAIL
========================= */

function openDetail(id){

  const p=products.find(x=>x.id===id);

  if(!p)return;

  ensureDetailPopup();

  detailImages=getImages(p);

  if(!detailImages.length){
    detailImages=[
      "https://placehold.co/900x700?text=Johan+Service"
    ];
  }

  detailIndex=0;

  $("detailCategory").textContent=
    p.normalizedCategory==="jasa"
      ?"JASA CPM"
      :p.normalizedCategory==="cpm1"
        ?"CPM 1"
        :"CPM 2";

  $("detailName").textContent=p.name||"Produk";

  const normal=Number(p.price)||0;
  const disc=Number(p.discountPrice)||0;

  $("detailPrice").innerHTML=
    disc>0&&normal>0&&disc<normal
      ?`
        <span class="price-old">
          ${rupiah(normal)}
        </span>
        <span class="price-new">
          ${rupiah(disc)}
        </span>
      `
      :
      normal
        ?`
          <span class="price-new">
            ${rupiah(normal)}
          </span>
        `
        :"";

  $("detailStock").textContent=
    p.normalizedCategory==="jasa"
      ?""
      :
      Number(p.stock)>0
        ?"Tersedia"
        :"Stok habis";

  /* POPUP TETAP MENAMPILKAN FULL */
  $("detailDescription").textContent=
    p.description||"";

  $("detailSpec").textContent=
    p.specification||"";

  $("detailOrder").disabled=
    p.normalizedCategory!=="jasa"&&
    Number(p.stock)<=0;

  $("detailOrder").onclick=
    ()=>orderWhatsApp(p.id);

  renderGallery();

  $("productDetailPopup").classList.remove("hidden");

  document.body.classList.add("detail-open");
}

function closeDetail(){

  $("productDetailPopup")?.classList.add("hidden");

  document.body.classList.remove("detail-open");
}


/* =========================
   GALLERY
========================= */

function renderGallery(){

  const track=$("detailTrack");

  track.innerHTML=
    detailImages
      .map(src=>`
        <div class="detail-slide">
          <img
            src="${escapeHtml(src)}"
            alt="Produk"
          >
        </div>
      `)
      .join("");

  track.style.transform=
    `translateX(-${detailIndex*100}%)`;

  $("galleryCounter").textContent=
    `${detailIndex+1} / ${detailImages.length}`;

  $("galleryPrev").classList.toggle(
    "hidden",
    detailImages.length<2
  );

  $("galleryNext").classList.toggle(
    "hidden",
    detailImages.length<2
  );
}

function moveGallery(step){

  if(detailImages.length<2)return;

  detailIndex=
    (detailIndex+step+detailImages.length)
    %detailImages.length;

  renderGallery();
}


/* =========================
   LOAD PRODUCTS
========================= */

async function loadProducts(){

  try{

    const snap=await getDocs(
      query(
        collection(db,"products"),
        where("active","==",true)
      )
    );

    products=snap.docs.map(d=>{
      const data=d.data();

      return{
        id:d.id,
        ...data,
        normalizedCategory:
          normalizeCategory(data.category)
      };
    });

    render();

  }catch(e){

    console.error(e);

    $("grid").innerHTML=
      "<p class='empty-state'>Gagal memuat produk. Periksa konfigurasi Firebase.</p>";
  }
}


/* =========================
   RENDER ETALASE
========================= */

function render(){

  const q=$("search").value.trim().toLowerCase();

  const list=products.filter(p=>
    (
      category==="all"||
      p.normalizedCategory===category
    )&&
    (
     

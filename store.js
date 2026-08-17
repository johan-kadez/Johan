import{initializeApp}from"https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import{getFirestore,collection,getDocs,addDoc,query,where}from"https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import{firebaseConfig}from"/firebase-config.js";

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

async function loadProducts(){
  try{
    const snap=await getDocs(query(collection(db,"products"),where("active","==",true)));
    products=snap.docs.map(d=>{
      const data=d.data();
      return{id:d.id,...data,normalizedCategory:normalizeCategory(data.category)};
    });
    render();
  }catch(e){
    console.error(e);
    $("grid").innerHTML="<p>Gagal memuat produk. Periksa konfigurasi Firebase.</p>";
  }
}

function render(){
  const q=$("search").value.trim().toLowerCase();
  const list=products.filter(p=>
    (category==="all"||p.normalizedCategory===category)&&
    String(p.name||"").toLowerCase().includes(q)
  );

  $("grid").innerHTML=list.map(p=>{
    if(p.normalizedCategory==="jasa"){
      return `<article class="service-card">
        <img src="${p.image||"https://placehold.co/900x600?text=Jasa"}" alt="">
        <div class="body">
          <span class="tag">JASA CPM</span>
          <h3>${p.name||"Jasa CPM"}</h3>
          <p class="description">${p.description||""}</p>
          ${p.price?`<p class="price">${rupiah(p.price)}</p>`:""}
          <button class="add" data-order="${p.id}">Pesan Jasa</button>
        </div>
      </article>`;
    }
    return `<article class="card">
      <img src="${p.image||"https://placehold.co/700x700?text=CPM"}" alt="">
      <div class="body">
        <span class="tag">${p.normalizedCategory==="cpm1"?"CPM 1":"CPM 2"}</span>
        <h3>${p.name||""}</h3>
        <p class="spec">${p.specification||"Specification belum tersedia."}</p>
        <p class="price">${rupiah(p.price)}</p>
        <p class="stock">${Number(p.stock)>0?"Tersedia":"Stok habis"}</p>
        <button class="add" data-order="${p.id}" ${Number(p.stock)>0?"":"disabled"}>Pesan</button>
      </div>
    </article>`;
  }).join("")||"<p>Belum ada produk di kategori ini.</p>";

  document.querySelectorAll("[data-order]").forEach(btn=>{
    btn.onclick=()=>openOrder(btn.dataset.order);
  });
}

function openOrder(id){
  const p=products.find(x=>x.id===id);
  if(!p)return;
  $("selectedProduct").value=p.id;
  $("orderTitle").textContent=`Pesan: ${p.name}`;
  $("modal").classList.remove("hidden");
}

document.querySelectorAll("[data-cat]").forEach(btn=>{
  btn.onclick=()=>{
    category=btn.dataset.cat;
    document.querySelectorAll("[data-cat]").forEach(x=>x.classList.toggle("active",x===btn));
    render();
  };
});
$("search").oninput=render;
$("closeModal").onclick=()=>$("modal").classList.add("hidden");

$("orderForm").onsubmit=async e=>{
  e.preventDefault();
  const p=products.find(x=>x.id===$("selectedProduct").value);
  if(!p)return;
  try{
    await addDoc(collection(db,"orders"),{
      customerName:$("customerName").value,
      phone:$("phone").value,
      address:$("address").value,
      items:[{productId:p.id,name:p.name,category:p.normalizedCategory,price:Number(p.price)||0,qty:1}],
      total:Number(p.price)||0,
      status:"Baru",
      createdAt:new Date().toISOString()
    });
    alert("Pesanan berhasil dibuat.");
    e.target.reset();
    $("modal").classList.add("hidden");
  }catch(err){
    console.error(err);
    alert("Pesanan gagal. Periksa Firebase dan Firestore Rules.");
  }
};

loadProducts();
import{initializeApp}from"https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import{getAuth,signInWithEmailAndPassword,onAuthStateChanged,signOut}from"https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import{getFirestore,collection,getDocs,addDoc,deleteDoc,doc,query,orderBy,updateDoc,updateDoc}from"https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import{firebaseConfig}from"/firebase-config.js";
import{SITE_CONFIG}from"/site-config.js";

const app=initializeApp(firebaseConfig),auth=getAuth(app),db=getFirestore(app);
const $=id=>document.getElementById(id);
const rupiah=n=>new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(Number(n)||0);
const escapeHtml=value=>String(value??"").replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
let editingId=null,editingType=null;

function priceHtml(p){
  const normal=Number(p.price)||0, discounted=Number(p.discountPrice)||0;
  if(discounted>0&&normal>0&&discounted<normal)
    return `<span class="old-price">${rupiah(normal)}</span><strong class="sale-price">${rupiah(discounted)}</strong>`;
  return rupiah(normal);
}
function showPopup(title,message,type="info",action=null){
  $("popupTitle").textContent=title;$("popupMessage").textContent=message;
  $("popupIcon").textContent=type==="error"?"!":type==="success"?"✓":"i";
  $("popupEyebrow").textContent=type==="error"?"ERROR":type==="success"?"SUCCESS":"NOTICE";
  const b=$("popupAction");b.classList.toggle("hidden",!action);
  if(action){b.textContent=action.text;b.onclick=()=>{hidePopup();action.fn?.();}}
  $("sitePopup").classList.remove("hidden");
}
function hidePopup(){$("sitePopup").classList.add("hidden")}
$("popupClose").onclick=hidePopup;
$("sitePopup").addEventListener("click",e=>{if(e.target===$("sitePopup"))hidePopup()});

if(SITE_CONFIG.logoUrl){$("brandLogo").src=SITE_CONFIG.logoUrl;$("brandLogo").classList.remove("hidden")}
if(SITE_CONFIG.backgroundUrl){document.documentElement.style.setProperty("--site-bg-image",`url("${SITE_CONFIG.backgroundUrl.replace(/"/g,'\\"')}")`);document.body.classList.add("custom-bg")}

function resetCar(){
  editingId=null;editingType=null;$("carForm").reset();$("carSubmit").textContent="Simpan Mobil";$("carCancelEdit").classList.add("hidden");
}
function resetService(){
  editingId=null;editingType=null;$("serviceForm").reset();$("serviceSubmit").textContent="Simpan Jasa";$("serviceCancelEdit").classList.add("hidden");
}
function startEdit(p){
  editingId=p.id;editingType=p.category==="jasa"?"service":"car";
  if(editingType==="car"){
    $("carForm").classList.remove("hidden");$("serviceForm").classList.add("hidden");
    document.querySelectorAll(".admin-tab").forEach(x=>x.classList.toggle("active",x.dataset.form==="carForm"));
    $("carName").value=p.name||"";$("carCategory").value=p.category||"cpm1";$("carCategory").dispatchEvent(new Event("change"));
    $("carSpec").value=p.specification||"";$("carPrice").value=p.price??"";$("carDiscountPrice").value=p.discountPrice??"";
    $("carStock").value=p.stock??0;$("carImage").value=p.image||"";$("carActive").value=String(!!p.active);$("carActive").dispatchEvent(new Event("change"));
    $("carSubmit").textContent="Update Mobil";$("carCancelEdit").classList.remove("hidden");
  }else{
    $("serviceForm").classList.remove("hidden");$("carForm").classList.add("hidden");
    document.querySelectorAll(".admin-tab").forEach(x=>x.classList.toggle("active",x.dataset.form==="serviceForm"));
    $("serviceName").value=p.name||"";$("serviceImage").value=p.image||"";$("serviceDescription").value=p.description||"";
    $("servicePrice").value=p.price??"";$("serviceDiscountPrice").value=p.discountPrice??"";$("serviceActive").value=String(!!p.active);$("serviceActive").dispatchEvent(new Event("change"));
    $("serviceSubmit").textContent="Update Jasa";$("serviceCancelEdit").classList.remove("hidden");
  }
  window.scrollTo({top:0,behavior:"smooth"});
}

$("loginForm").onsubmit=async e=>{e.preventDefault();try{await signInWithEmailAndPassword(auth,$("email").value,$("password").value)}catch(err){console.error(err);showPopup("Login gagal","Email atau password admin salah, atau Firebase Authentication belum dikonfigurasi.","error")}};
$("logout").onclick=()=>signOut(auth);
$("carCancelEdit").onclick=resetCar;
$("serviceCancelEdit").onclick=resetService;
document.querySelectorAll(".admin-tab").forEach(tab=>tab.onclick=()=>{if(tab.dataset.form){resetCar();resetService();document.querySelectorAll(".admin-tab").forEach(x=>x.classList.toggle("active",x===tab));$("carForm").classList.toggle("hidden",tab.dataset.form!=="carForm");$("serviceForm").classList.toggle("hidden",tab.dataset.form!=="serviceForm")}});

onAuthStateChanged(auth,user=>{$("login").classList.toggle("hidden",!!user);$("adminPanel").classList.toggle("hidden",!user);$("logout").classList.toggle("hidden",!user);if(user)loadAdmin()});

async function loadAdmin(){
  try{
    const snap=await getDocs(collection(db,"products")),cars=[],services=[];
    snap.docs.forEach(d=>{const p={id:d.id,...d.data()};if(p.category==="jasa")services.push(p);else cars.push(p)});
    $("cars").innerHTML=cars.map(p=>`<tr><td>${escapeHtml(p.name)}</td><td>${p.category==="cpm1"?"CPM 1":"CPM 2"}</td><td>${escapeHtml(p.specification||"-")}</td><td>${priceHtml(p)}</td><td>${p.stock??0}</td><td>${p.active?"Aktif":"Nonaktif"}</td><td class="admin-actions"><button class="admin-edit" data-edit="${escapeHtml(p.id)}">Edit</button><button type="button" class="admin-edit" data-edit="${escapeHtml(p.id)}">Edit</button><button class="danger" data-delete="${escapeHtml(p.id)}">Hapus</button></td></tr>`).join("")||"<tr><td colspan='7'>Belum ada mobil.</td></tr>";
    $("services").innerHTML=services.map(p=>`<tr><td>${escapeHtml(p.name)}</td><td>${escapeHtml(p.description||"-")}</td><td>${priceHtml(p)}</td><td>${p.active?"Aktif":"Nonaktif"}</td><td class="admin-actions"><button class="admin-edit" data-edit="${escapeHtml(p.id)}">Edit</button><button type="button" class="admin-edit" data-edit="${escapeHtml(p.id)}">Edit</button><button class="danger" data-delete="${escapeHtml(p.id)}">Hapus</button></td></tr>`).join("")||"<tr><td colspan='5'>Belum ada jasa.</td></tr>";

    document.querySelectorAll("[data-edit]").forEach(btn=>btn.onclick=()=>{
      const p=[...cars,...services].find(x=>x.id===btn.dataset.edit);
      if(p)startEdit(p);
    });
    document.querySelectorAll("[data-edit]").forEach(btn=>btn.onclick=()=>{
 const p=[...cars,...services].find(x=>x.id===btn.dataset.edit); if(!p)return;
 if(p.category==="jasa"){
  $("serviceForm").classList.remove("hidden");$("carForm").classList.add("hidden");
  $("serviceName").value=p.name||"";$("serviceImage").value=p.image||"";$("serviceDescription").value=p.description||"";
  $("servicePrice").value=p.price??"";$("serviceActive").value=String(!!p.active);
  $("serviceForm").dataset.editId=p.id;$("serviceForm").querySelector("button.gold-btn").textContent="Update Jasa";
 }else{
  $("carForm").classList.remove("hidden");$("serviceForm").classList.add("hidden");
  $("carName").value=p.name||"";$("carCategory").value=p.category||"cpm1";$("carSpec").value=p.specification||"";
  $("carPrice").value=p.price??"";$("carStock").value=p.stock??0;$("carImage").value=p.image||"";
  $("carActive").value=String(!!p.active);$("carForm").dataset.editId=p.id;$("carForm").querySelector("button.gold-btn").textContent="Update Mobil";
 }
 window.scrollTo({top:0,behavior:"smooth"});
});
document.querySelectorAll("[data-delete]").forEach(btn=>btn.onclick=()=>showPopup("Hapus produk?","Produk ini akan dihapus dari katalog.","error",{text:"Hapus",fn:async()=>{try{await deleteDoc(doc(db,"products",btn.dataset.delete));showPopup("Berhasil","Produk telah dihapus.","success");loadAdmin()}catch(err){console.error(err);showPopup("Gagal menghapus","Periksa Firestore Rules lalu coba lagi.","error")}}}));
    const orderSnap=await getDocs(query(collection(db,"orders"),orderBy("createdAt","desc")));
    $("orders").innerHTML=orderSnap.docs.map(d=>{const o=d.data(),item=o.items?.[0];return `<tr><td>${escapeHtml(o.customerName)}</td><td>${escapeHtml(o.phone)}</td><td>${escapeHtml(item?.name||"-")}</td><td>${escapeHtml(o.status||"Baru")}</td></tr>`}).join("")||"<tr><td colspan='4'>Belum ada pesanan.</td></tr>";
  }catch(err){console.error(err);showPopup("Gagal memuat data","Periksa Firestore Rules dan konfigurasi Firebase.","error")}
}

$("carForm").onsubmit=async e=>{e.preventDefault();try{const id=e.target.dataset.editId;const data={name:$("carName").value,category:$("carCategory").value,specification:$("carSpec").value,price:Number($("carPrice").value),stock:Number($("carStock").value),image:$("carImage").value.trim(),active:$("carActive").value==="true",type:"car"};if(id)await updateDoc(doc(db,"products",id),data);else await addDoc(collection(db,"products"),{...data,createdAt:new Date().toISOString()});delete e.target.dataset.editId;e.target.reset();e.target.querySelector("button.gold-btn").textContent="Simpan Mobil";await loadAdmin();showPopup("Berhasil",id?"Mobil berhasil diperbarui":"Mobil berhasil ditambahkan","success")}catch(err){console.error(err);showPopup("Gagal menyimpan mobil","Periksa Firestore Rules.","error")}};
    if(data.discountPrice>0&&data.discountPrice>=data.price)throw new Error("Harga diskon harus lebih kecil dari harga normal.");
    const wasEdit=!!editingId&&editingType==="car"; if(wasEdit)await updateDoc(doc(db,"products",editingId),data); else await addDoc(collection(db,"products"),{...data,createdAt:new Date().toISOString()});
    resetCar();await loadAdmin();showPopup("Berhasil",wasEdit?"Mobil berhasil diperbarui":"Mobil berhasil ditambahkan","success");
  }catch(err){console.error(err);showPopup("Gagal menyimpan mobil",err.message||"Periksa Firestore Rules.","error")}
};

$("serviceForm").onsubmit=async e=>{e.preventDefault();try{const id=e.target.dataset.editId;const data={name:$("serviceName").value,category:"jasa",description:$("serviceDescription").value,price:$("servicePrice").value?Number($("servicePrice").value):0,image:$("serviceImage").value.trim(),active:$("serviceActive").value==="true",type:"service"};if(id)await updateDoc(doc(db,"products",id),data);else await addDoc(collection(db,"products"),{...data,createdAt:new Date().toISOString()});delete e.target.dataset.editId;e.target.reset();e.target.querySelector("button.gold-btn").textContent="Simpan Jasa";await loadAdmin();showPopup("Berhasil",id?"Jasa berhasil diperbarui":"Jasa berhasil ditambahkan","success")}catch(err){console.error(err);showPopup("Gagal menyimpan jasa","Periksa Firestore Rules.","error")}};
    if(data.discountPrice>0&&data.price>0&&data.discountPrice>=data.price)throw new Error("Harga diskon harus lebih kecil dari harga normal.");
    const wasEdit=!!editingId&&editingType==="service"; if(wasEdit)await updateDoc(doc(db,"products",editingId),data); else await addDoc(collection(db,"products"),{...data,createdAt:new Date().toISOString()});
    resetService();await loadAdmin();showPopup("Berhasil",wasEdit?"Jasa berhasil diperbarui":"Jasa berhasil ditambahkan","success");
  }catch(err){console.error(err);showPopup("Gagal menyimpan jasa",err.message||"Periksa Firestore Rules.","error")}
};

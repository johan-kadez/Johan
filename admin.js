import{initializeApp}from"https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import{getAuth,signInWithEmailAndPassword,onAuthStateChanged,signOut}from"https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import{getFirestore,collection,getDocs,addDoc,deleteDoc,doc,query,orderBy}from"https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import{firebaseConfig}from"/firebase-config.js";

const app=initializeApp(firebaseConfig),auth=getAuth(app),db=getFirestore(app);
const $=id=>document.getElementById(id);
const rupiah=n=>new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(Number(n)||0);

$("loginForm").onsubmit=async e=>{
  e.preventDefault();
  try{await signInWithEmailAndPassword(auth,$("email").value,$("password").value)}
  catch(err){console.error(err);alert("Login gagal. Pastikan Email/Password admin sudah dibuat di Firebase Authentication.")}
};
$("logout").onclick=()=>signOut(auth);

document.querySelectorAll(".admin-tab").forEach(tab=>{
  tab.onclick=()=>{
    document.querySelectorAll(".admin-tab").forEach(x=>x.classList.toggle("active",x===tab));
    $("carForm").classList.toggle("hidden",tab.dataset.form!=="carForm");
    $("serviceForm").classList.toggle("hidden",tab.dataset.form!=="serviceForm");
  };
});

onAuthStateChanged(auth,user=>{
  $("login").classList.toggle("hidden",!!user);
  $("adminPanel").classList.toggle("hidden",!user);
  $("logout").classList.toggle("hidden",!user);
  if(user)loadAdmin();
});

async function loadAdmin(){
  try{
    const snap=await getDocs(collection(db,"products"));
    const cars=[],services=[];
    snap.docs.forEach(d=>{
      const p={id:d.id,...d.data()};
      if(p.category==="jasa")services.push(p);else cars.push(p);
    });

    $("cars").innerHTML=cars.map(p=>`
      <tr>
        <td>${p.name||""}</td>
        <td>${p.category==="cpm1"?"CPM 1":"CPM 2"}</td>
        <td>${p.specification||"-"}</td>
        <td>${rupiah(p.price)}</td>
        <td>${p.stock??0}</td>
        <td>${p.active?"Aktif":"Nonaktif"}</td>
        <td><button class="danger" data-delete="${p.id}">Hapus</button></td>
      </tr>`).join("")||"<tr><td colspan='7'>Belum ada mobil.</td></tr>";

    $("services").innerHTML=services.map(p=>`
      <tr>
        <td>${p.name||""}</td>
        <td>${p.description||"-"}</td>
        <td>${p.price?rupiah(p.price):"-"}</td>
        <td>${p.active?"Aktif":"Nonaktif"}</td>
        <td><button class="danger" data-delete="${p.id}">Hapus</button></td>
      </tr>`).join("")||"<tr><td colspan='5'>Belum ada jasa.</td></tr>";

    document.querySelectorAll("[data-delete]").forEach(btn=>{
      btn.onclick=async()=>{
        if(!confirm("Hapus item ini?"))return;
        await deleteDoc(doc(db,"products",btn.dataset.delete));
        loadAdmin();
      };
    });

    const orderSnap=await getDocs(query(collection(db,"orders"),orderBy("createdAt","desc")));
    $("orders").innerHTML=orderSnap.docs.map(d=>{
      const o=d.data(), item=o.items?.[0];
      return `<tr><td>${o.customerName||""}</td><td>${o.phone||""}</td><td>${item?.name||"-"}</td><td>${o.status||"Baru"}</td></tr>`;
    }).join("")||"<tr><td colspan='4'>Belum ada pesanan.</td></tr>";
  }catch(err){
    console.error(err);
    alert("Gagal memuat data admin. Periksa Firestore Rules.");
  }
}

$("carForm").onsubmit=async e=>{
  e.preventDefault();
  try{
    await addDoc(collection(db,"products"),{
      name:$("carName").value,
      category:$("carCategory").value,
      specification:$("carSpec").value,
      price:Number($("carPrice").value),
      stock:Number($("carStock").value),
      image:$("carImage").value,
      active:$("carActive").value==="true",
      type:"car",
      createdAt:new Date().toISOString()
    });
    e.target.reset();await loadAdmin();alert("Mobil berhasil ditambahkan.");
  }catch(err){console.error(err);alert("Gagal menambahkan mobil.")}
};

$("serviceForm").onsubmit=async e=>{
  e.preventDefault();
  try{
    await addDoc(collection(db,"products"),{
      name:$("serviceName").value,
      category:"jasa",
      description:$("serviceDescription").value,
      price:$("servicePrice").value?Number($("servicePrice").value):0,
      image:$("serviceImage").value,
      active:$("serviceActive").value==="true",
      type:"service",
      createdAt:new Date().toISOString()
    });
    e.target.reset();await loadAdmin();alert("Jasa berhasil ditambahkan.");
  }catch(err){console.error(err);alert("Gagal menambahkan jasa.")}
};
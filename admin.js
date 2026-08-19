import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { firebaseConfig } from "/firebase-config.js";
import { SITE_CONFIG } from "/site-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const $ = id => document.getElementById(id);

const rupiah = n =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(Number(n) || 0);

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;"
  }[c]));
}

function priceHtml(p) {
  const normal = Number(p.price) || 0;
  const discount = Number(p.discountPrice) || 0;

  if (discount > 0 && normal > 0 && discount < normal) {
    return `<span class="price-old">${rupiah(normal)}</span><span class="price-new">${rupiah(discount)}</span>`;
  }
  return normal ? `<span class="price-new">${rupiah(normal)}</span>` : "-";
}


function showPopup(title, message, type = "info", action = null) {
  $("popupTitle").textContent = title;
  $("popupMessage").textContent = message;
  $("popupIcon").textContent = type === "error" ? "!" : type === "success" ? "✓" : "i";
  $("popupEyebrow").textContent = type === "error" ? "ERROR" : type === "success" ? "SUCCESS" : "NOTICE";

  const button = $("popupAction");
  button.classList.toggle("hidden", !action);
  if (action) {
    button.textContent = action.text;
    button.onclick = () => {
      hidePopup();
      action.fn?.();
    };
  }
  $("sitePopup").classList.remove("hidden");
}

function hidePopup() {
  $("sitePopup").classList.add("hidden");
}

$("popupClose").onclick = hidePopup;
$("sitePopup").addEventListener("click", e => {
  if (e.target === $("sitePopup")) hidePopup();
});


if (SITE_CONFIG.logoUrl) {
  $("brandLogo").src = SITE_CONFIG.logoUrl;
  $("brandLogo").classList.remove("hidden");
}

if (SITE_CONFIG.backgroundUrl) {
  document.documentElement.style.setProperty(
    "--site-bg-image",
    `url("${SITE_CONFIG.backgroundUrl.replace(/"/g, '\\"')}")`
  );
  document.body.classList.add("custom-bg");
}


function getImageInputs(containerId) {
  const container = $(containerId);
  if (!container) return [];
  return [...container.querySelectorAll("input")].map(input => input.value.trim()).filter(Boolean);
}

function createImageInput(containerId, value = "", focus = false) {
  const container = $(containerId);
  if (!container) return null;

  const input = document.createElement("input");
  input.type = "url";
  input.placeholder = "URL/path gambar dari imgur";
  input.value = value;
  input.style.display = "block";
  input.style.width = "100%";
  input.style.boxSizing = "border-box";
  input.style.marginBottom = "12px";
  container.appendChild(input);

  input.addEventListener("keydown", e => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (input.value.trim()) createImageInput(containerId, "", true);
    }
  });

  return input;
}

function ensureImageInput(containerId) {
  const container = $(containerId);
  if (!container) return;
  if (!container.querySelector("input")) createImageInput(containerId);
}

function setImageInputs(containerId, images) {
  const container = $(containerId);
  if (!container) return;

  container.innerHTML = "";
  const list = Array.isArray(images) ? images.filter(x => String(x).trim()) : [];

  if (list.length === 0) {
    createImageInput(containerId);
    return;
  }
  list.forEach(url => createImageInput(containerId, String(url)));
}

function resetImageInputs(containerId) {
  const container = $(containerId);
  if (!container) return;
  container.innerHTML = "";
  createImageInput(containerId);
}

document.querySelectorAll("[data-add-images]").forEach(button => {
  button.addEventListener("click", () => {
    const containerId = button.dataset.addImages;
    const input = createImageInput(containerId, "", true);
    if (input) input.focus();
  });
});

ensureImageInput("carImages");
ensureImageInput("serviceImages");


let editingId = null;
let editingType = null;

function resetCar() {
  editingId = null;
  editingType = null;
  $("carForm").reset();
  resetImageInputs("carImages");
  $("carSubmit").textContent = "Simpan Mobil";
  $("carCancelEdit").classList.add("hidden");
}

function resetService() {
  editingId = null;
  editingType = null;
  $("serviceForm").reset();
  resetImageInputs("serviceImages");
  $("serviceSubmit").textContent = "Simpan Jasa";
  $("serviceCancelEdit").classList.add("hidden");
}

function startEdit(p) {
  editingId = p.id;
  editingType = p.category === "jasa" ? "service" : "car";

  const images = Array.isArray(p.images) ? p.images : p.image ? [p.image] : [];

  if (editingType === "car") {
    $("carForm").classList.remove("hidden");
    $("serviceForm").classList.add("hidden");
    document.querySelectorAll(".admin-tab").forEach(x => {
      x.classList.toggle("active", x.dataset.form === "carForm");
    });

    $("carName").value = p.name || "";
    $("carCategory").value = p.category || "cpm1";
    $("carSpec").value = p.specification || "";
    $("carPrice").value = p.price ?? "";
    $("carDiscountPrice").value = p.discountPrice ?? "";
    $("carStock").value = p.stock ?? 0;
    $("carActive").value = String(!!p.active);
    setImageInputs("carImages", images);

    $("carSubmit").textContent = "Update Mobil";
    $("carCancelEdit").classList.remove("hidden");
  } else {
    $("serviceForm").classList.remove("hidden");
    $("carForm").classList.add("hidden");
    document.querySelectorAll(".admin-tab").forEach(x => {
      x.classList.toggle("active", x.dataset.form === "serviceForm");
    });

    $("serviceName").value = p.name || "";
    $("serviceDescription").value = p.description || "";
    $("servicePrice").value = p.price ?? "";
    $("serviceDiscountPrice").value = p.discountPrice ?? "";
    $("serviceActive").value = String(!!p.active);
    setImageInputs("serviceImages", images);

    $("serviceSubmit").textContent = "Update Jasa";
    $("serviceCancelEdit").classList.remove("hidden");
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}


$("loginForm").addEventListener("submit", async e => {
  e.preventDefault();
  e.stopPropagation();

  const email = $("email").value.trim();
  const password = $("password").value;

  if (!email || !password) {
    showPopup("Login gagal", "Email dan password wajib diisi.", "error");
    return;
  }

  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (err) {
    console.error(err);
    showPopup(
      "Login gagal",
      "Email atau password admin salah, atau Firebase Authentication belum dikonfigurasi.",
      "error"
    );
  }
});

$("logout").onclick = () => signOut(auth);


document.querySelectorAll(".admin-tab").forEach(tab => {
  tab.addEventListener("click", () => {
    if (!tab.dataset.form) return;

    document.querySelectorAll(".admin-tab").forEach(x => x.classList.toggle("active", x === tab));
    $("carForm").classList.toggle("hidden", tab.dataset.form !== "carForm");
    $("serviceForm").classList.toggle("hidden", tab.dataset.form !== "serviceForm");
  });
});


async function loadAdmin() {
  try {
    const snap = await getDocs(collection(db, "products"));
    const cars = [];
    const services = [];

    snap.docs.forEach(d => {
      const p = { id: d.id, ...d.data() };
      if (p.category === "jasa") services.push(p);
      else cars.push(p);
    });

    $("cars").innerHTML = cars.map(p => `
      <tr>
        <td>${escapeHtml(p.name)}</td>
        <td>${p.category === "cpm1" ? "CPM 1" : "CPM 2"}</td>
        <td>${escapeHtml(p.specification || "-")}</td>
        <td>${priceHtml(p)}</td>
        <td>${p.stock ?? 0}</td>
        <td>${p.active ? "Aktif" : "Nonaktif"}</td>
        <td class="admin-actions">
          <button type="button" class="admin-edit" data-edit="${escapeHtml(p.id)}">Edit</button>
          <button type="button" class="danger" data-delete="${escapeHtml(p.id)}">Hapus</button>
        </td>
      </tr>
    `).join("") || "<tr><td colspan='7'>Belum ada mobil.</td></tr>";

    $("services").innerHTML = services.map(p => `
      <tr>
        <td>${escapeHtml(p.name)}</td>
        <td>${escapeHtml(p.description || "-")}</td>
        <td>${priceHtml(p)}</td>
        <td>${p.active ? "Aktif" : "Nonaktif"}</td>
        <td class="admin-actions">
          <button type="button" class="admin-edit" data-edit="${escapeHtml(p.id)}">Edit</button>
          <button type="button" class="danger" data-delete="${escapeHtml(p.id)}">Hapus</button>
        </td>
      </tr>
    `).join("") || "<tr><td colspan='5'>Belum ada jasa.</td></tr>";

    document.querySelectorAll("[data-edit]").forEach(button => {
      button.onclick = async () => {
        try {
          const product = await getDocs(collection(db, "products"));
          const found = product.docs.find(d => d.id === button.dataset.edit);
          if (found) startEdit({ id: found.id, ...found.data() });
        } catch (err) {
          console.error(err);
          showPopup("Gagal membuka edit", "Produk tidak dapat dibaca dari Firestore.", "error");
        }
      };
    });

    document.querySelectorAll("[data-delete]").forEach(button => {
      button.onclick = () => {
        showPopup("Hapus produk?", "Produk ini akan dihapus dari katalog.", "error", {
          text: "Hapus",
          fn: async () => {
            try {
              await deleteDoc(doc(db, "products", button.dataset.delete));
              showPopup("Berhasil", "Produk telah dihapus.", "success");
              await loadAdmin();
            } catch (err) {
              console.error(err);
              showPopup("Gagal menghapus", "Periksa Firestore Rules lalu coba lagi.", "error");
            }
          }
        });
      };
    });

    const orderSnap = await getDocs(query(collection(db, "orders"), orderBy("createdAt", "desc")));

    $("orders").innerHTML = orderSnap.docs.map(d => {
      const o = d.data();
      const item = o.items?.[0];
      return `
        <tr>
          <td>${escapeHtml(o.customerName)}</td>
          <td>${escapeHtml(o.phone)}</td>
          <td>${escapeHtml(item?.name || "-")}</td>
          <td>${escapeHtml(o.status || "Baru")}</td>
        </tr>
      `;
    }).join("") || "<tr><td colspan='4'>Belum ada pesanan.</td></tr>";
  } catch (err) {
    console.error(err);
    showPopup("Gagal memuat data", "Periksa Firestore Rules dan konfigurasi Firebase.", "error");
  }
}


async function saveProduct(form, type) {
  const isCar = type === "car";
  const images = isCar ? getImageInputs("carImages") : getImageInputs("serviceImages");

  if (images.length === 0) {
    showPopup("Foto belum diisi", "Masukkan minimal satu URL foto.", "error");
    return;
  }

  const normalPrice = isCar
    ? Number($("carPrice").value)
    : $("servicePrice").value ? Number($("servicePrice").value) : 0;

  const discountPrice = isCar
    ? ($("carDiscountPrice").value ? Number($("carDiscountPrice").value) : 0)
    : ($("serviceDiscountPrice").value ? Number($("serviceDiscountPrice").value) : 0);

  if (discountPrice && normalPrice && discountPrice >= normalPrice) {
    showPopup("Harga diskon tidak valid", "Harga setelah diskon harus lebih kecil dari harga normal.", "error");
    return;
  }

  const data = isCar
    ? {
        name: $("carName").value.trim(),
        category: $("carCategory").value,
        specification: $("carSpec").value,
        price: normalPrice,
        discountPrice: discountPrice,
        stock: Number($("carStock").value),
        images: images,
        image: images[0],
        active: $("carActive").value === "true",
        type: "car"
      }
    : {
        name: $("serviceName").value.trim(),
        category: "jasa",
        description: $("serviceDescription").value,
        price: normalPrice,
        discountPrice: discountPrice,
        images: images,
        image: images[0],
        active: $("serviceActive").value === "true",
        type: "service"
      };

  try {
    if (editingId) {
      await updateDoc(doc(db, "products", editingId), data);
      isCar ? resetCar() : resetService();
      await loadAdmin();
      showPopup(isCar ? "Mobil berhasil diupdate" : "Jasa berhasil diupdate", "Perubahan sudah disimpan.", "success");
    } else {
      await addDoc(collection(db, "products"), { ...data, createdAt: new Date().toISOString() });
      isCar ? resetCar() : resetService();
      await loadAdmin();
      showPopup(
        isCar ? "Mobil berhasil ditambahkan" : "Jasa berhasil ditambahkan",
        "Produk sudah masuk ke katalog.",
        "success"
      );
    }
  } catch (err) {
    console.error(err);
    showPopup(
      editingId ? "Gagal mengupdate produk" : (isCar ? "Gagal menambahkan mobil" : "Gagal menambahkan jasa"),
      "Periksa Firestore Rules.",
      "error"
    );
  }
}


$("carForm").onsubmit = e => {
  e.preventDefault();
  saveProduct(e.target, "car");
};

$("serviceForm").onsubmit = e => {
  e.preventDefault();
  saveProduct(e.target, "service");
};

$("carCancelEdit").onclick = resetCar;
$("serviceCancelEdit").onclick = resetService;


onAuthStateChanged(auth, user => {
  $("login").classList.toggle("hidden", !!user);
  $("adminPanel").classList.toggle("hidden", !user);
  $("logout").classList.toggle("hidden", !user);
  if (user) loadAdmin();
});

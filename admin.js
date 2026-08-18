import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";

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
  return String(value ?? "").replace(
    /[&<>'"]/g,
    c => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;"
    }[c])
  );
}

/* =========================================================
   POPUP
========================================================= */

function showPopup(title, message, type = "info", action = null) {
  const titleEl = $("popupTitle");
  const messageEl = $("popupMessage");
  const iconEl = $("popupIcon");
  const eyebrowEl = $("popupEyebrow");
  const actionEl = $("popupAction");
  const popup = $("sitePopup");

  if (!popup) {
    alert(`${title}\n\n${message}`);
    return;
  }

  if (titleEl) titleEl.textContent = title;
  if (messageEl) messageEl.textContent = message;

  if (iconEl) {
    iconEl.textContent =
      type === "error" ? "!" :
      type === "success" ? "✓" : "i";
  }

  if (eyebrowEl) {
    eyebrowEl.textContent =
      type === "error" ? "ERROR" :
      type === "success" ? "SUCCESS" : "NOTICE";
  }

  if (actionEl) {
    actionEl.classList.toggle("hidden", !action);

    if (action) {
      actionEl.textContent = action.text;
      actionEl.onclick = () => {
        hidePopup();
        if (typeof action.fn === "function") action.fn();
      };
    } else {
      actionEl.onclick = null;
    }
  }

  popup.classList.remove("hidden");
}

function hidePopup() {
  $("sitePopup")?.classList.add("hidden");
}

$("popupClose")?.addEventListener("click", hidePopup);

$("sitePopup")?.addEventListener("click", e => {
  if (e.target === $("sitePopup")) {
    hidePopup();
  }
});

/* =========================================================
   LOGO + BACKGROUND
========================================================= */

if (SITE_CONFIG.logoUrl && $("brandLogo")) {
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

/* =========================================================
   STATE
========================================================= */

let editingId = null;
let editingType = null;

/* =========================================================
   DYNAMIC DISCOUNT FIELDS
   HTML LU BELUM PUNYA FIELD DISKON,
   JADI JS MEMBUATNYA SENDIRI.
========================================================= */

function ensureDiscountField(formId, priceId, discountId, label) {
  const form = $(formId);
  const price = $(priceId);

  if (!form || !price) return null;

  let input = $(discountId);

  if (input) return input;

  input = document.createElement("input");
  input.id = discountId;
  input.type = "number";
  input.min = "0";
  input.placeholder = label;

  price.insertAdjacentElement("afterend", input);

  return input;
}

/* =========================================================
   MULTIPLE IMAGE URL MANAGER
   ========================================================= */

function setupImageManager(formId, firstInputId, managerId) {
  const form = document.getElementById(formId);
  const original = document.getElementById(firstInputId);

  if (!form || !original) return null;

  // Jangan pindahkan input asli.
  // Sembunyikan saja dan buat input URL baru yang benar-benar terlihat.
  original.style.display = "none";

  let manager = document.getElementById(managerId);

  if (!manager) {
    manager = document.createElement("div");
    manager.id = managerId;
    manager.className = "multi-image-manager";

    original.insertAdjacentElement("afterend", manager);
  }

  manager.innerHTML = "";

  const title = document.createElement("div");
  title.textContent = "Foto produk";
  title.style.cssText =
    "font-weight:800;color:#c9a45b;font-size:16px;margin:8px 0 12px";

  const hint = document.createElement("div");
  hint.textContent =
    "Foto pertama menjadi foto utama. Tekan Enter/Done untuk membuat kolom berikutnya. Tidak ada batas jumlah foto.";
  hint.style.cssText =
    "color:#888;line-height:1.7;margin:10px 0 18px";

  const inputsBox = document.createElement("div");
  inputsBox.className = "image-inputs";

  const addButton = document.createElement("button");
  addButton.type = "button";
  addButton.textContent = "+ Tambah URL foto";
  addButton.style.cssText =
    "width:100%;padding:14px;border:0;border-radius:12px;background:#11110f;color:#c9a45b;font-weight:700;font-size:15px;cursor:pointer;margin-top:8px";

  manager.appendChild(title);
  manager.appendChild(inputsBox);
  manager.appendChild(addButton);
  manager.appendChild(hint);

  function createInput(value = "") {
    const input = document.createElement("input");

    input.type = "url";
    input.value = value;
    input.placeholder = "URL/path gambar dari imgur";

    // Paksa tampil meskipun CSS lama bermasalah.
    input.style.cssText =
      "display:block!important;width:100%!important;box-sizing:border-box!important;margin:0 0 12px!important;padding:13px!important;background:#11110f!important;color:#fff!important;border:1px solid #302c24!important;border-radius:11px!important;font:inherit!important;min-height:48px!important;opacity:1!important;visibility:visible!important;";

    inputsBox.appendChild(input);

    input.addEventListener("keydown", e => {
      if (e.key === "Enter") {
        e.preventDefault();

        if (input.value.trim()) {
          createInput();
        }
      }
    });

    return input;
  }

  function getImages() {
    return [...inputsBox.querySelectorAll("input")]
      .map(input => input.value.trim())
      .filter(Boolean);
  }

  function setImages(images) {
    inputsBox.innerHTML = "";

    const list = Array.isArray(images)
      ? images.filter(x => String(x).trim())
      : [];

    if (list.length === 0) {
      createInput();
      return;
    }

    list.forEach(url => createInput(String(url)));
  }

  function resetImages() {
    inputsBox.innerHTML = "";
    original.value = "";
    createInput();
  }

  addButton.addEventListener("click", () => {
    const input = createInput();
    input.focus();
  });

  // Selalu mulai dengan minimal 1 kolom URL.
  createInput();

  return {
    getImages,
    setImages,
    resetImages,
    addInput: createInput
  };
}

/* =========================================================
   SETUP FORM FEATURES
========================================================= */

const carImages = setupImageManager(
  "carForm",
  "carImage",
  "carImageManager"
);

const serviceImages = setupImageManager(
  "serviceForm",
  "serviceImage",
  "serviceImageManager"
);

const carDiscount = ensureDiscountField(
  "carForm",
  "carPrice",
  "carDiscountPrice",
  "Harga Diskon (opsional)"
);

const serviceDiscount = ensureDiscountField(
  "serviceForm",
  "servicePrice",
  "serviceDiscountPrice",
  "Harga Diskon (opsional)"
);

/* =========================================================
   RESET FORM
========================================================= */

function resetCar() {
  editingId = null;
  editingType = null;

  $("carForm")?.reset();

  carImages?.resetImages();

  if (carDiscount) {
    carDiscount.value = "";
  }

  const button = $("carForm")?.querySelector(
    'button[type="submit"], .gold-btn'
  );

  if (button) {
    button.textContent = "Simpan Mobil";
  }

  hideCancelButton("carForm");
}

function resetService() {
  editingId = null;
  editingType = null;

  $("serviceForm")?.reset();

  serviceImages?.resetImages();

  if (serviceDiscount) {
    serviceDiscount.value = "";
  }

  const button = $("serviceForm")?.querySelector(
    'button[type="submit"], .gold-btn'
  );

  if (button) {
    button.textContent = "Simpan Jasa";
  }

  hideCancelButton("serviceForm");
}

function hideCancelButton(formId) {
  const form = $(formId);

  if (!form) return;

  const btn = form.querySelector(".cancel-edit-button");

  if (btn) {
    btn.classList.add("hidden");
  }
}

function showCancelButton(formId, resetFunction) {
  const form = $(formId);

  if (!form) return;

  let btn = form.querySelector(".cancel-edit-button");

  if (!btn) {
    btn = document.createElement("button");
    btn.type = "button";
    btn.className = "cancel-edit-button";
    btn.textContent = "Batal Edit";

    const submit = form.querySelector(
      'button[type="submit"], .gold-btn'
    );

    if (submit) {
      submit.insertAdjacentElement("afterend", btn);
    } else {
      form.appendChild(btn);
    }
  }

  btn.classList.remove("hidden");
  btn.onclick = resetFunction;
}

/* =========================================================
   EDIT
========================================================= */

function startEdit(p) {
  editingId = p.id;
  editingType = p.category === "jasa" ? "service" : "car";

  if (editingType === "car") {
    $("carForm")?.classList.remove("hidden");
    $("serviceForm")?.classList.add("hidden");

    document.querySelectorAll(".admin-tab").forEach(tab => {
      tab.classList.toggle(
        "active",
        tab.dataset.form === "carForm"
      );
    });

    $("carName").value = p.name || "";
    $("carCategory").value = p.category || "cpm1";
    $("carCategory").dispatchEvent(new Event("change", { bubbles: true }));

    $("carSpec").value = p.specification || "";
    $("carPrice").value = p.price ?? "";
    $("carStock").value = p.stock ?? 0;
    $("carActive").value = String(!!p.active);

    if (carDiscount) {
      carDiscount.value = p.discountPrice ?? "";
    }

    const images = Array.isArray(p.images)
      ? p.images
      : p.image
        ? [p.image]
        : [];

    carImages?.setImages(images);

    const submit = $("carForm")?.querySelector(
      'button[type="submit"], .gold-btn'
    );

    if (submit) {
      submit.textContent = "Update Mobil";
    }

    showCancelButton("carForm", resetCar);

  } else {
    $("serviceForm")?.classList.remove("hidden");
    $("carForm")?.classList.add("hidden");

    document.querySelectorAll(".admin-tab").forEach(tab => {
      tab.classList.toggle(
        "active",
        tab.dataset.form === "serviceForm"
      );
    });

    $("serviceName").value = p.name || "";
    $("serviceDescription").value = p.description || "";
    $("servicePrice").value = p.price ?? "";
    $("serviceActive").value = String(!!p.active);

    if (serviceDiscount) {
      serviceDiscount.value = p.discountPrice ?? "";
    }

    const images = Array.isArray(p.images)
      ? p.images
      : p.image
        ? [p.image]
        : [];

    serviceImages?.setImages(images);

    const submit = $("serviceForm")?.querySelector(
      'button[type="submit"], .gold-btn'
    );

    if (submit) {
      submit.textContent = "Update Jasa";
    }

    showCancelButton("serviceForm", resetService);
  }

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

/* =========================================================
   LOGIN
========================================================= */

$("loginForm")?.addEventListener("submit", async e => {
  e.preventDefault();
  e.stopPropagation();

  const email = $("email")?.value.trim() || "";
  const password = $("password")?.value || "";

  if (!email || !password) {
    showPopup(
      "Login gagal",
      "Email dan password wajib diisi.",
      "error"
    );
    return;
  }

  try {
    await signInWithEmailAndPassword(
      auth,
      email,
      password
    );
  } catch (err) {
    console.error("LOGIN ERROR:", err);

    showPopup(
      "Login gagal",
      "Email atau password salah, atau Firebase Authentication belum dikonfigurasi.",
      "error"
    );
  }
});

$("logout")?.addEventListener("click", async () => {
  try {
    await signOut(auth);
  } catch (err) {
    console.error(err);
  }
});

/* =========================================================
   TABS
========================================================= */

document.querySelectorAll(".admin-tab").forEach(tab => {
  tab.addEventListener("click", () => {
    const target = tab.dataset.form;

    if (!target) return;

    document.querySelectorAll(".admin-tab").forEach(x => {
      x.classList.toggle("active", x === tab);
    });

    $("carForm")?.classList.toggle(
      "hidden",
      target !== "carForm"
    );

    $("serviceForm")?.classList.toggle(
      "hidden",
      target !== "serviceForm"
    );
  });
});

/* =========================================================
   PRICE VALIDATION
========================================================= */

function validateDiscount(price, discount) {
  const normal = Number(price) || 0;
  const disc = Number(discount) || 0;

  if (!disc) {
    return true;
  }

  if (!normal) {
    showPopup(
      "Harga tidak valid",
      "Isi harga normal terlebih dahulu jika ingin memakai diskon.",
      "error"
    );
    return false;
  }

  if (disc >= normal) {
    showPopup(
      "Diskon tidak valid",
      "Harga diskon harus lebih kecil dari harga normal.",
      "error"
    );
    return false;
  }

  return true;
}

/* =========================================================
   SAVE / UPDATE PRODUCT
========================================================= */

async function saveProduct(form, type) {
  const isCar = type === "car";

  const images = isCar
    ? (carImages?.getImages() || [])
    : (serviceImages?.getImages() || []);

  const mainImage = images[0] || "";

  const price = isCar
    ? Number($("carPrice").value) || 0
    : Number($("servicePrice").value) || 0;

  const discountPrice = isCar
    ? Number($("carDiscountPrice")?.value) || 0
    : Number($("serviceDiscountPrice")?.value) || 0;

  if (!validateDiscount(price, discountPrice)) {
    return;
  }

  const data = isCar
    ? {
        name: $("carName").value.trim(),
        category: $("carCategory").value,
        specification: $("carSpec").value.trim(),

        price: price,
        discountPrice: discountPrice,

        stock: Number($("carStock").value) || 0,

        image: mainImage,
        images: images,

        active: $("carActive").value === "true",
        type: "car"
      }
    : {
        name: $("serviceName").value.trim(),
        category: "jasa",

        description: $("serviceDescription").value.trim(),

        price: price,
        discountPrice: discountPrice,

        image: mainImage,
        images: images,

        active: $("serviceActive").value === "true",
        type: "service"
      };

  try {
    if (editingId) {
      await updateDoc(
        doc(db, "products", editingId),
        data
      );

      const wasCar = isCar;

      if (wasCar) {
        resetCar();
      } else {
        resetService();
      }

      await loadAdmin();

      showPopup(
        "Berhasil",
        wasCar
          ? "Produk mobil berhasil diperbarui."
          : "Jasa berhasil diperbarui.",
        "success"
      );

    } else {
      await addDoc(
        collection(db, "products"),
        {
          ...data,
          createdAt: new Date().toISOString()
        }
      );

      if (isCar) {
        resetCar();
      } else {
        resetService();
      }

      await loadAdmin();

      showPopup(
        "Berhasil",
        isCar
          ? "Mobil berhasil ditambahkan."
          : "Jasa berhasil ditambahkan.",
        "success"
      );
    }

  } catch (err) {
    console.error("SAVE PRODUCT ERROR:", err);

    showPopup(
      "Gagal menyimpan",
      "Periksa Firestore Rules dan koneksi Firebase.",
      "error"
    );
  }
}

/* =========================================================
   FORM SUBMIT
========================================================= */

$("carForm")?.addEventListener("submit", e => {
  e.preventDefault();
  e.stopPropagation();

  saveProduct(e.target, "car");
});

$("serviceForm")?.addEventListener("submit", e => {
  e.preventDefault();
  e.stopPropagation();

  saveProduct(e.target, "service");
});

/* =========================================================
   LOAD ADMIN DATA
========================================================= */

async function loadAdmin() {
  try {
    const snap = await getDocs(
      collection(db, "products")
    );

    const cars = [];
    const services = [];

    snap.docs.forEach(d => {
      const p = {
        id: d.id,
        ...d.data()
      };

      if (p.category === "jasa") {
        services.push(p);
      } else {
        cars.push(p);
      }
    });

    /* -------------------------
       MOBIL
    ------------------------- */

    $("cars").innerHTML =
      cars.map(p => {
        const normal = Number(p.price) || 0;
        const discount = Number(p.discountPrice) || 0;

        const price =
          discount > 0 &&
          normal > 0 &&
          discount < normal
            ? `<span class="price-old">${rupiah(normal)}</span> <span class="price-new">${rupiah(discount)}</span>`
            : normal
              ? `<span class="price-new">${rupiah(normal)}</span>`
              : "-";

        return `
          <tr>
            <td>${escapeHtml(p.name)}</td>
            <td>${p.category === "cpm1" ? "CPM 1" : "CPM 2"}</td>
            <td>${escapeHtml(p.specification || "-")}</td>
            <td>${price}</td>
            <td>${p.stock ?? 0}</td>
            <td>${p.active ? "Aktif" : "Nonaktif"}</td>
            <td>
              <button
                type="button"
                class="admin-edit"
                data-edit="${escapeHtml(p.id)}"
              >Edit</button>

              <button
                type="button"
                class="danger"
                data-delete="${escapeHtml(p.id)}"
              >Hapus</button>
            </td>
          </tr>
        `;
      }).join("") ||
      "<tr><td colspan='7'>Belum ada mobil.</td></tr>";

    /* -------------------------
       JASA
    ------------------------- */

    $("services").innerHTML =
      services.map(p => {
        const normal = Number(p.price) || 0;
        const discount = Number(p.discountPrice) || 0;

        const price =
          discount > 0 &&
          normal > 0 &&
          discount < normal
            ? `<span class="price-old">${rupiah(normal)}</span> <span class="price-new">${rupiah(discount)}</span>`
            : normal
              ? `<span class="price-new">${rupiah(normal)}</span>`
              : "-";

        return `
          <tr>
            <td>${escapeHtml(p.name)}</td>
            <td>${escapeHtml(p.description || "-")}</td>
            <td>${price}</td>
            <td>${p.active ? "Aktif" : "Nonaktif"}</td>
            <td>
              <button
                type="button"
                class="admin-edit"
                data-edit="${escapeHtml(p.id)}"
              >Edit</button>

              <button
                type="button"
                class="danger"
                data-delete="${escapeHtml(p.id)}"
              >Hapus</button>
            </td>
          </tr>
        `;
      }).join("") ||
      "<tr><td colspan='5'>Belum ada jasa.</td></tr>";

    /* -------------------------
       EDIT BUTTON
    ------------------------- */

    document.querySelectorAll("[data-edit]").forEach(btn => {
      btn.onclick = async () => {
        const id = btn.dataset.edit;

        try {
          const snap = await getDocs(
            collection(db, "products")
          );

          const found = snap.docs.find(
            d => d.id === id
          );

          if (!found) {
            showPopup(
              "Gagal",
              "Produk tidak ditemukan.",
              "error"
            );
            return;
          }

          startEdit({
            id: found.id,
            ...found.data()
          });

        } catch (err) {
          console.error(err);

          showPopup(
            "Gagal",
            "Tidak bisa mengambil data produk.",
            "error"
          );
        }
      };
    });

    /* -------------------------
       DELETE BUTTON
    ------------------------- */

    document.querySelectorAll("[data-delete]").forEach(btn => {
      btn.onclick = () => {
        showPopup(
          "Hapus produk?",
          "Produk ini akan dihapus dari katalog.",
          "error",
          {
            text: "Hapus",
            fn: async () => {
              try {
                await deleteDoc(
                  doc(db, "products", btn.dataset.delete)
                );

                await loadAdmin();

                showPopup(
                  "Berhasil",
                  "Produk telah dihapus.",
                  "success"
                );

              } catch (err) {
                console.error(err);

                showPopup(
                  "Gagal menghapus",
                  "Periksa Firestore Rules lalu coba lagi.",
                  "error"
                );
              }
            }
          }
        );
      };
    });

    /* -------------------------
       ORDERS
    ------------------------- */

    try {
      const orderSnap = await getDocs(
        query(
          collection(db, "orders"),
          orderBy("createdAt", "desc")
        )
      );

      $("orders").innerHTML =
        orderSnap.docs.map(d => {
          const o = d.data();
          const item = o.items?.[0];

          return `
            <tr>
              <td>${escapeHtml(o.customerName || "-")}</td>
              <td>${escapeHtml(o.phone || "-")}</td>
              <td>${escapeHtml(item?.name || "-")}</td>
              <td>${escapeHtml(o.status || "Baru")}</td>
            </tr>
          `;
        }).join("") ||
        "<tr><td colspan='4'>Belum ada pesanan.</td></tr>";

    } catch (orderError) {
      console.error("ORDERS ERROR:", orderError);

      if ($("orders")) {
        $("orders").innerHTML =
          "<tr><td colspan='4'>Pesanan belum tersedia.</td></tr>";
      }
    }

  } catch (err) {
    console.error("LOAD ADMIN ERROR:", err);

    showPopup(
      "Gagal memuat data",
      "Periksa Firestore Rules dan konfigurasi Firebase.",
      "error"
    );
  }
}

/* =========================================================
   AUTH STATE
========================================================= */

onAuthStateChanged(auth, user => {
  const login = $("login");
  const panel = $("adminPanel");
  const logout = $("logout");

  login?.classList.toggle("hidden", !!user);
  panel?.classList.toggle("hidden", !user);
  logout?.classList.toggle("hidden", !user);

  if (user) {
    loadAdmin();
  }
});

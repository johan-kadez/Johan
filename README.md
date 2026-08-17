# LUXURY CPM STORE V2

Struktur:
- `index.html` = public store saja.
- `admin.html` = admin panel.
- `store.js` = sistem public store.
- `admin.js` = sistem admin.
- `style.css` = tampilan.
- `firebase-config.js` = Firebase config.

URL:
- `/` = public store
- `/admin/` = admin panel

Vercel memakai rewrite `/admin/` ke `/admin.html`.

Public store:
- Tidak ada tulisan/link Admin.
- Tidak ada keranjang.
- Kategori 4 kolom: Semua, CPM 1, CPM 2, Jasa.
- Kartu kategori kecil, rounded, dan responsif 4 kolom di HP.
- Mobil: gambar, nama, specification, harga, stok.
- Jasa: satu kartu berisi gambar + nama + deskripsi + tombol pesan.

Admin:
- Login Firebase Email/Password.
- Tambah mobil: kategori CPM 1/CPM 2, specification, harga, nama mobil, stok, gambar, status.
- Tambah jasa: gambar, nama jasa, deskripsi, harga opsional, status.
- Hapus mobil/jasa.
- Lihat pesanan.

Firebase:
1. Isi `firebase-config.js`.
2. Aktifkan Authentication > Email/Password.
3. Buat akun admin.
4. Buat Firestore.
5. Atur Security Rules dengan benar untuk produksi.


## Bugfix terbaru
- `/admin/` memakai absolute asset paths sehingga `style.css`, `admin.js`, dan Firebase config tidak 404 saat Vercel melakukan rewrite ke `admin.html`.
- Filter kategori store menormalisasi `cpm1`, `CPM 1`, `cpm 1`, `Mobil CPM 1`, dan variasi setara; hal yang sama untuk CPM 2 dan Jasa. Jadi data lama tetap bisa muncul pada filter yang benar.
- Link Admin tidak ditampilkan di public store.

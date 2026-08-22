SETUP JOHANCPM.MY.ID — SITEMAP OTOMATIS

1. Upload/replace file ini ke ROOT repository store:
   - admin.js
   - store.js
   - product.html
   - product.js
   - vercel.json
   - robots.txt
   - folder api/
       sitemap.js

2. JANGAN buat sitemap.xml sebagai file biasa.
   /sitemap.xml akan dibuat otomatis oleh api/sitemap.js.

3. Pastikan firebase-config.js tetap ada di root seperti project lu sekarang.
   sitemap.js membaca projectId dari file itu.

4. Deploy ke Vercel.

5. Buka:
   https://johancpm.my.id/sitemap.xml

   Kalau berhasil, akan terlihat XML berisi:
   - homepage
   - semua produk yang active == true
   - URL /product/... masing-masing produk

6. Di Google Search Console:
   Indexing > Sitemaps
   masukkan:
   sitemap.xml
   lalu Submit.

7. Setelah itu setiap kali lu Add Product dari Admin Panel:
   Firebase menyimpan produk -> sitemap otomatis mengambil produk aktif.
   Lu TIDAK perlu edit sitemap.xml manual.

CATATAN:
- Firestore harus mengizinkan pembacaan collection products karena store.js juga
  mengambil produk dari browser.
- Sitemap hanya memasukkan produk dengan active == true.
- Produk lama yang belum punya slug tetap dibuatkan slug dari productId/nama.

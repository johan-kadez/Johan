export default async function handler(req, res) {
  try {
    const DOMAIN = "https://johancpm.my.id";

    // Ambil Firebase config dari website
    const configRes = await fetch(
      `${DOMAIN}/firebase-config.js`,
      {
        redirect: "follow"
      }
    );

    if (!configRes.ok) {
      throw new Error("Firebase config tidak bisa dibaca");
    }

    const configText = await configRes.text();

    const match = configText.match(
      /projectId\s*:\s*["']([^"']+)["']/
    );

    if (!match) {
      throw new Error("projectId Firebase tidak ditemukan");
    }

    const projectId = match[1];

    // Ambil produk dari Firestore
    const firestoreUrl =
      "https://firestore.googleapis.com/v1/projects/" +
      encodeURIComponent(projectId) +
      "/databases/(default)/documents/products";

    const firestoreRes = await fetch(firestoreUrl);

    if (!firestoreRes.ok) {
      throw new Error(
        "Firestore error: " + firestoreRes.status
      );
    }

    const data = await firestoreRes.json();

    const urls = [
      `${DOMAIN}/`
    ];

    for (const doc of data.documents || []) {
      const fields = doc.fields || {};

      if (fields.active?.booleanValue !== true) {
        continue;
      }

      const name =
        fields.slug?.stringValue ||
        fields.productId?.stringValue ||
        fields.name?.stringValue;

      if (!name) continue;

      const slug = String(name)
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

      if (slug) {
        urls.push(
          `${DOMAIN}/product/${encodeURIComponent(slug)}`
        );
      }
    }

    const uniqueUrls = [...new Set(urls)];

    const xml =
`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${uniqueUrls
  .map(url => `  <url><loc>${url}</loc></url>`)
  .join("\n")}
</urlset>`;

    res.status(200);
    res.setHeader(
      "Content-Type",
      "application/xml; charset=utf-8"
    );
    res.setHeader(
      "Cache-Control",
      "public, max-age=300"
    );

    return res.end(xml);

  } catch (error) {

    console.error("SITEMAP ERROR:", error);

    const xml =
`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://johancpm.my.id/</loc>
  </url>
</urlset>`;

    res.status(200);
    res.setHeader(
      "Content-Type",
      "application/xml; charset=utf-8"
    );

    return res.end(xml);
  }
}

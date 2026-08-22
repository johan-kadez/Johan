function makeSlug(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function xmlEscape(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function extractProjectId(configJs) {
  const match = String(configJs).match(
    /projectId\s*:\s*["']([^"']+)["']/
  );
  return match?.[1] || "";
}

export default async function handler(req, res) {
  try {
    const origin =
      `${req.headers["x-forwarded-proto"] || "https"}://${req.headers.host}`;

    const configResponse =
      await fetch(`${origin}/firebase-config.js`);

    if (!configResponse.ok) {
      throw new Error("firebase-config.js tidak bisa dibaca.");
    }

    const configJs = await configResponse.text();
    const projectId = extractProjectId(configJs);

    if (!projectId) {
      throw new Error("projectId tidak ditemukan.");
    }

    const firestoreUrl =
      `https://firestore.googleapis.com/v1/projects/` +
      `${encodeURIComponent(projectId)}` +
      `/databases/(default)/documents/products?pageSize=1000`;

    const response = await fetch(firestoreUrl);

    if (!response.ok) {
      throw new Error(
        `Firestore HTTP ${response.status}`
      );
    }

    const data = await response.json();

    const urls = [
      `${origin}/`
    ];

    for (const doc of data.documents || []) {
      const fields = doc.fields || {};

      // Hanya produk aktif
      if (fields.active?.booleanValue !== true) {
        continue;
      }

      const slug =
        fields.slug?.stringValue ||
        makeSlug(
          fields.productId?.stringValue ||
          fields.name?.stringValue ||
          doc.name?.split("/").pop()
        );

      if (slug) {
        urls.push(
          `${origin}/product/${encodeURIComponent(slug)}`
        );
      }
    }

    const uniqueUrls = [...new Set(urls)];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${uniqueUrls
  .map(url => `  <url><loc>${xmlEscape(url)}</loc></url>`)
  .join("\n")}
</urlset>`;

    res.setHeader(
      "Content-Type",
      "application/xml; charset=utf-8"
    );

    res.setHeader(
      "Cache-Control",
      "public, s-maxage=300

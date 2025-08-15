// netlify/functions/upload.js
// Route remains /api/upload
export const config = { path: "/api/upload" };

// Uses Node 18+ native fetch/FormData/Blob.
// Ensure Netlify site has environment variable: PINATA_JWT

const PINATA_API = "https://api.pinata.cloud/pinning";
const PINATA_GATEWAY_BASE = "https://gateway.pinata.cloud/ipfs/"; // or your dedicated gateway

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function badRequest(msg) { return json({ error: msg }, 400); }
function serverError(msg, code = 500) { return json({ error: msg }, code); }

async function fetchWithTimeout(url, opts = {}, ms = 20000) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal });
  } finally {
    clearTimeout(id);
  }
}

export default async function handler(req) {
  try {
    const url = new URL(req.url);

    // Optional warm-up to reduce cold starts
    if (req.method === "HEAD" && url.searchParams.get("warm") === "1") {
      return new Response(null, { status: 204 });
    }

    if (req.method !== "POST") {
      return badRequest("Use POST with JSON: { image: 'data:image/png;base64,...' }");
    }

    const jwt = process.env.PINATA_JWT;
    if (!jwt) return serverError("Missing PINATA_JWT", 500);

    let payload;
    try {
      payload = await req.json();
    } catch {
      return badRequest("Invalid JSON");
    }

    const dataUrl = payload?.image;
    if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:image/png;base64,")) {
      return badRequest("Expected data:image/png;base64,... (PNG only)");
    }

    // size sanity (tune as you like)
    if (dataUrl.length > 5_000_000) {
      return badRequest("Image too large");
    }

    // Decode PNG
    const base64 = dataUrl.split(",")[1] || "";
    let pngBytes;
    try {
      pngBytes = Buffer.from(base64, "base64");
    } catch {
      return badRequest("Invalid base64");
    }

    // 1) Pin PNG to IPFS
    const fd = new FormData();
    fd.append("file", new Blob([pngBytes], { type: "image/png" }), "snapshot.png");

    const pinFileRes = await fetchWithTimeout(`${PINATA_API}/pinFileToIPFS`, {
      method: "POST",
      headers: { Authorization: `Bearer ${jwt}` },
      body: fd,
    }, 25000);

    if (!pinFileRes.ok) {
      const text = await pinFileRes.text().catch(() => "");
      return serverError(`Pin file failed: ${pinFileRes.status} ${text || pinFileRes.statusText}`);
    }

    const pinFileJson = await pinFileRes.json();
    const imageCid = pinFileJson?.IpfsHash;
    if (!imageCid) return serverError("Pin file did not return IpfsHash");

    // Build image URL (keeps PNG; keeps metadata expectations)
    const imageUrl = `${PINATA_GATEWAY_BASE}${imageCid}`;

    // 2) Build metadata JSON (unchanged structure/fields)
    const meta = {
      name: "Match & Mint",
      description: "A timed puzzle snapshot minted as-is.",
      image: imageUrl,
      // add any other fields you already return (attributes, external_url, etc.)
    };

    // 3) Pin metadata JSON
    const pinJsonRes = await fetchWithTimeout(`${PINATA_API}/pinJSONToIPFS`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwt}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        pinataContent: meta,
        pinataMetadata: { name: "match-and-mint-metadata" },
      }),
    }, 20000);

    if (!pinJsonRes.ok) {
      const text = await pinJsonRes.text().catch(() => "");
      return serverError(`Pin JSON failed: ${pinJsonRes.status} ${text || pinJsonRes.statusText}`);
    }

    const pinJson = await pinJsonRes.json();
    const metaCid = pinJson?.IpfsHash;
    if (!metaCid) return serverError("Pin JSON did not return IpfsHash");

    // 4) Respond with the same fields your frontend expects
    const tokenUri = `ipfs://${metaCid}`;
    const metaGateway = `${PINATA_GATEWAY_BASE}${metaCid}`;

    return json({ uri: tokenUri, imageGateway: imageUrl, metadataGateway: metaGateway }, 200);
  } catch (err) {
    return serverError(`Unexpected error: ${err?.message || String(err)}`);
  }
}

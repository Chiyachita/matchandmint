// Netlify Function: /api/upload  (Node 18+)
import fetch from "node-fetch";
import FormData from "form-data";

export const handler = async (event) => {
  try {
    const PINATA_JWT = process.env.PINATA_JWT;
    if (!PINATA_JWT) {
      return resp(500, { error: "Missing PINATA_JWT env on Netlify" });
    }

    if (event.httpMethod !== "POST") {
      return resp(405, { error: "Method Not Allowed" });
    }

    const body = JSON.parse(event.body || "{}");
    const image = body.image;
    if (!image || !image.startsWith("data:image/png;base64,")) {
      return resp(400, { error: "Invalid image data" });
    }

    // 1) upload image
    const base64 = image.replace(/^data:image\/png;base64,/, "");
    const buffer = Buffer.from(base64, "base64");

    const imgForm = new FormData();
    imgForm.append("file", buffer, { filename: "snapshot.png", contentType: "image/png" });

    const imgRes = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
      method: "POST",
      headers: { Authorization: `Bearer ${PINATA_JWT}` },
      body: imgForm
    });

    if (!imgRes.ok) {
      const t = await imgRes.text();
      return resp(401, { error: `Image upload failed: ${t}` });
    }
    const imgJson = await imgRes.json();
    const imageCid = imgJson.IpfsHash;

    // 2) upload metadata
    const metadata = {
      name: "Match & Mint Snapshot",
      description: "A snapshot from the puzzle game",
      image: `https://gateway.pinata.cloud/ipfs/${imageCid}`
    };

    const metaRes = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PINATA_JWT}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(metadata)
    });

    if (!metaRes.ok) {
      const t = await metaRes.text();
      return resp(401, { error: `Metadata upload failed: ${t}` });
    }
    const metaJson = await metaRes.json();
    const metadataCid = metaJson.IpfsHash;

    return resp(200, { uri: `ipfs://${metadataCid}` });
  } catch (err) {
    return resp(500, { error: "Unexpected: " + (err?.message || String(err)) });
  }
};

function resp(statusCode, obj) {
  return {
    statusCode,
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": "*"
    },
    body: JSON.stringify(obj)
  };
}

const fetch    = require("node-fetch");
const FormData = require("form-data");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }
  const jwt = process.env.PINATA_JWT;
  if (!jwt) {
    return { statusCode: 500, body: JSON.stringify({ error: "Missing PINATA_JWT" }) };
  }
  try {
    const base64 = event.body.split(",")[1];
    const buffer = Buffer.from(base64, "base64");
    const form = new FormData();
    form.append("file", buffer, {
      filename: `snapshot-${Date.now()}.png`,
      contentType: "image/png"
    });
    const response = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
      method: "POST",
      headers: { Authorization: `Bearer ${jwt}` },
      body: form
    });
    const result = await response.json();
    return { statusCode: 200, body: JSON.stringify({ IpfsHash: result.IpfsHash }) };
  } catch (err) {
    console.error("Upload error", err);
    return { statusCode: 500, body: JSON.stringify({ error: "Upload failed" }) };
  }
};
// netlify/functions/uploadToPinata.js
const fetch = require("node-fetch");
const FormData = require("form-data");

exports.handler = async function(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const jwt = process.env.PINATA_JWT;
  if (!jwt) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Missing PINATA_JWT env var" }),
    };
  }

  try {
    // event.body is a base64 data‑URI string: "data:image/png;base64,...."
    const base64 = event.body.split(",")[1];
    const buf = Buffer.from(base64, "base64");

    const form = new FormData();
    form.append("file", buf, {
      filename: `snapshot-${Date.now()}.png`,
      contentType: "image/png",
    });

    const resp = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
      method: "POST",
      headers: { Authorization: `Bearer ${jwt}` },
      body: form,
    });

    if (!resp.ok) {
      const err = await resp.text();
      console.error("Pinata error:", err);
      throw new Error("Pinata upload failed");
    }

    const { IpfsHash } = await resp.json();
    return { statusCode: 200, body: JSON.stringify({ IpfsHash }) };

  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};

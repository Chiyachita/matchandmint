// netlify/functions/uploadToPinata.js
const fetch = require("node-fetch");
const FormData = require("form-data");

exports.handler = async function(event) {
  try {
    const jwt = process.env.PINATA_JWT;
    const base64img = event.body;
    const imgBuffer = Buffer.from(base64img.split(",")[1], "base64");

    // 1) Pin the PNG
    const form = new FormData();
    form.append("file", imgBuffer, {
      filename: `snapshot-${Date.now()}.png`,
      contentType: "image/png",
    });
    const pinImg = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
      method: "POST",
      headers: { Authorization: `Bearer ${jwt}` },
      body: form,
    }).then(r => r.json());
    const imgCID = pinImg.IpfsHash;

    // 2) Build metadata JSON
    const metadata = {
      name: `Match & Mint Snapshot`,
      description: "A snapshot of my puzzle",
      image: `ipfs://${imgCID}`,
    };

    // 3) Pin the JSON
    const pinJSON = await fetch(
      "https://api.pinata.cloud/pinning/pinJSONToIPFS",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({
          pinataContent: metadata,
          // optional pinataMetadata: { name: "match-mint-metadata" }
        }),
      }
    ).then(r => r.json());

    // Return the metadata CID
    return {
      statusCode: 200,
      body: JSON.stringify({ metadataCID: pinJSON.IpfsHash }),
    };
  } catch (err) {
    console.error("Pinata error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};

// netlify/functions/upload.js

const fetch = require('node-fetch');
const FormData = require('form-data');

exports.handler = async (event) => {
  try {
    const { imageBase64, metadata } = JSON.parse(event.body);
    const jwt = process.env.PINATA_JWT;

    if (!jwt) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Missing JWT in server environment' }),
      };
    }

    // 1. Upload image to Pinata
    const buffer = Buffer.from(imageBase64, 'base64');
    const formData = new FormData();
    formData.append('file', buffer, 'puzzle.png');

    const imageRes = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: { Authorization: jwt },
      body: formData,
    });

    if (!imageRes.ok) {
      const error = await imageRes.text();
      return {
        statusCode: 500,
        body: JSON.stringify({ error: `Image upload failed: ${error}` }),
      };
    }

    const imageData = await imageRes.json();
    const imageCid = imageData.IpfsHash;

    // 2. Add CID to metadata & upload metadata to Pinata
    metadata.image = `ipfs://${imageCid}`;
    const metadataRes = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
      method: 'POST',
      headers: {
        Authorization: jwt,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(metadata),
    });

    if (!metadataRes.ok) {
      const error = await metadataRes.text();
      return {
        statusCode: 500,
        body: JSON.stringify({ error: `Metadata upload failed: ${error}` }),
      };
    }

    const metadataData = await metadataRes.json();
    const metadataCid = metadataData.IpfsHash;

    return {
      statusCode: 200,
      body: JSON.stringify({ cid: metadataCid }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};

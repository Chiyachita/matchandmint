// netlify/functions/upload.js

const fetch = require('node-fetch');
const FormData = require('form-data');

// Get JWT from Netlify environment variable
const PINATA_JWT = process.env.PINATA_JWT;

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    // Parse snapshot image from body (base64)
    const { snapshot, metadata } = JSON.parse(event.body);
    if (!snapshot || !metadata) {
      return { statusCode: 400, body: 'Missing snapshot or metadata' };
    }

    // Convert base64 to buffer
    const base64 = snapshot.split(',')[1];
    const buffer = Buffer.from(base64, 'base64');

    // Step 1: Upload image to Pinata
    const imageForm = new FormData();
    imageForm.append('file', buffer, { filename: 'puzzle.png', contentType: 'image/png' });

    const imageRes = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: { Authorization: `Bearer ${PINATA_JWT}` },
      body: imageForm,
    });

    if (!imageRes.ok) {
      const error = await imageRes.text();
      return { statusCode: 500, body: `Image upload failed: ${error}` };
    }

    const imageResult = await imageRes.json();
    const imageCid = imageResult.IpfsHash;

    // Step 2: Upload metadata
    metadata.image = `ipfs://${imageCid}`;
    const metaRes = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PINATA_JWT}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(metadata),
    });

    if (!metaRes.ok) {
      const error = await metaRes.text();
      return { statusCode: 500, body: `Metadata upload failed: ${error}` };
    }

    const metaResult = await metaRes.json();
    const metadataCid = metaResult.IpfsHash;

    return {
      statusCode: 200,
      body: JSON.stringify({ cid: metadataCid }),
    };
  } catch (err) {
    console.error('Upload error:', err);
    return {
      statusCode: 500,
      body: 'Unexpected server error: ' + err.message,
    };
  }
};

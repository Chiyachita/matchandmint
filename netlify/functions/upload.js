const FormData = require('form-data');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

exports.handler = async (event) => {
  // Preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const PINATA_JWT = process.env.PINATA_JWT;
    if (!PINATA_JWT) {
      return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: 'PINATA_JWT not configured' }) };
    }

    const { image } = JSON.parse(event.body || '{}');
    if (!image) {
      return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Missing image data' }) };
    }

    // base64 → Buffer
    const base64 = image.split(',')[1] || image;
    const buffer = Buffer.from(base64, 'base64');

    // Step 1: upload file to Pinata
    const imageForm = new FormData();
    imageForm.append('file', buffer, { filename: 'puzzle.png', contentType: 'image/png' });

    const imageRes = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: { Authorization: `Bearer ${PINATA_JWT}` },
      body: imageForm
    });

    if (!imageRes.ok) {
      const error = await imageRes.text();
      return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: `Image upload failed: ${error}` }) };
    }

    const imageResult = await imageRes.json();
    const imageCid = imageResult.IpfsHash;

    // Step 2: upload metadata
    const metadata = {
      name: "Match and Mint Puzzle NFT",
      description: "A unique puzzle arrangement created in the Match and Mint game",
      image: `ipfs://${imageCid}`,
      attributes: [
        { trait_type: "Game", value: "Match and Mint" },
        { trait_type: "Creation Date", value: new Date().toISOString() }
      ]
    };

    const metaRes = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PINATA_JWT}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(metadata)
    });

    if (!metaRes.ok) {
      const error = await metaRes.text();
      return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: `Metadata upload failed: ${error}` }) };
    }

    const metaResult = await metaRes.json();
    const metadataCid = metaResult.IpfsHash;

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ uri: `ipfs://${metadataCid}` })
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Unexpected server error: ' + err.message })
    };
  }
};

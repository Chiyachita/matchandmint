// Netlify Function: POST /api/upload
// Requires env: PINATA_JWT  (a real JWT from Pinata, starts with "eyJ...")
// package.json deps: "node-fetch": "^2.6.7", "form-data": "^4.0.0"

const fetch = require('node-fetch');
const FormData = require('form-data');

exports.handler = async (event) => {
  try {
    // --- CORS / preflight
    if (event.httpMethod === 'OPTIONS') {
      return resp(204, null);
    }
    if (event.httpMethod !== 'POST') {
      return resp(405, { error: 'Method Not Allowed' });
    }

    const PINATA_JWT = process.env.PINATA_JWT;
    if (!PINATA_JWT) {
      return resp(500, { error: 'Missing PINATA_JWT env on Netlify' });
    }

    // --- Parse body
    let body;
    try { body = JSON.parse(event.body || '{}'); }
    catch { return resp(400, { error: 'Invalid JSON body' }); }

    const imageDataUrl = body.image;
    if (!imageDataUrl || !/^data:image\/png;base64,/.test(imageDataUrl)) {
      return resp(400, { error: 'Invalid image data (expect data:image/png;base64,...)' });
    }

    // --- 1) Upload PNG to IPFS via Pinata
    const base64 = imageDataUrl.replace(/^data:image\/png;base64,/, '');
    const buffer = Buffer.from(base64, 'base64');

    const imgForm = new FormData();
    imgForm.append('file', buffer, { filename: 'snapshot.png', contentType: 'image/png' });

    const imgRes = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: { Authorization: `Bearer ${PINATA_JWT}` },
      body: imgForm,
    });

    if (!imgRes.ok) {
      const t = await imgRes.text();
      return resp(401, { error: `Image upload failed: ${t}` });
    }
    const imgJson = await imgRes.json();
    const imageCid = imgJson?.IpfsHash;
    if (!imageCid) return resp(500, { error: 'Pinata did not return image CID' });

    // --- 2) Upload metadata (use HTTP gateway in "image" so explorers can render)
    const imageGateway = `https://gateway.pinata.cloud/ipfs/${imageCid}`;

    const metadata = {
      name: 'Match & Mint Snapshot',
      description: 'A snapshot from the Match & Mint puzzle game',
      image: imageGateway, // <-- important: HTTP gateway (not ipfs://)
    };

    const metaRes = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PINATA_JWT}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(metadata),
    });

    if (!metaRes.ok) {
      const t = await metaRes.text();
      return resp(401, { error: `Metadata upload failed: ${t}` });
    }
    const metaJson = await metaRes.json();
    const metadataCid = metaJson?.IpfsHash;
    if (!metadataCid) return resp(500, { error: 'Pinata did not return metadata CID' });

    // Return BOTH: gateway URL (use this for tokenURI) and the raw ipfs:// for reference
    const gatewayUri = `https://gateway.pinata.cloud/ipfs/${metadataCid}`;
    const ipfsUri = `ipfs://${metadataCid}`;

    return resp(200, { uri: gatewayUri, ipfsUri, imageGateway });
  } catch (err) {
    return resp(500, { error: 'Unexpected: ' + (err?.message || String(err)) });
  }
};

// Utility: JSON + CORS
function resp(statusCode, obj) {
  return {
    statusCode,
    headers: {
      'content-type': 'application/json',
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'POST,OPTIONS',
      'access-control-allow-headers': 'Content-Type,Authorization',
    },
    body: obj ? JSON.stringify(obj) : '',
  };
}

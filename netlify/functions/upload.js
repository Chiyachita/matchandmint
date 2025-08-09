// Netlify Function: POST /api/upload
// Env: PINATA_JWT (Pinata JWT starting with "eyJ...")
// package.json deps: "node-fetch": "^2.6.7", "form-data": "^4.0.0"

const fetch = require('node-fetch');
const FormData = require('form-data');

exports.handler = async (event) => {
  try {
    // CORS / preflight
    if (event.httpMethod === 'OPTIONS') return resp(204, null);
    if (event.httpMethod !== 'POST') return resp(405, { error: 'Method Not Allowed' });

    const PINATA_JWT = process.env.PINATA_JWT;
    if (!PINATA_JWT) return resp(500, { error: 'Missing PINATA_JWT env on Netlify' });

    // Parse body
    let body;
    try { body = JSON.parse(event.body || '{}'); }
    catch { return resp(400, { error: 'Invalid JSON body' }); }

    const imageDataUrl = body.image;
    if (!imageDataUrl || !/^data:image\/png;base64,/.test(imageDataUrl)) {
      return resp(400, { error: 'Invalid image data (expect data:image/png;base64,...)' });
    }

    // 1) Upload PNG
    const base64 = imageDataUrl.replace(/^data:image\/png;base64,/, '');
    const buffer = Buffer.from(base64, 'base64');

    const imgForm = new FormData();
    imgForm.append('file', buffer, { filename: 'snapshot.png', contentType: 'image/png' });
    // helpful metadata/options
    imgForm.append('pinataMetadata', JSON.stringify({ name: `matchmint-snapshot-${Date.now()}.png` }));
    imgForm.append('pinataOptions', JSON.stringify({ cidVersion: 1 }));

    const imgRes = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: { Authorization: `Bearer ${PINATA_JWT}` },
      body: imgForm,
    });

    if (!imgRes.ok) {
      const t = await imgRes.text().catch(() => '');
      return resp(502, { error: `Image upload failed: ${t}` });
    }
    const imgJson = await imgRes.json();
    const imageCid = imgJson?.IpfsHash;
    if (!imageCid) return resp(500, { error: 'Pinata did not return image CID' });

    const imageGateway = `https://gateway.pinata.cloud/ipfs/${imageCid}?filename=snapshot.png`;

    // 2) Upload metadata JSON
    const metadata = {
      name: 'Match & Mint Snapshot',
      description: 'A snapshot from the Match & Mint puzzle game',
      image: imageGateway,
      attributes: [
        { trait_type: 'Game', value: 'Match & Mint' },
        { trait_type: 'Timestamp', value: new Date().toISOString() }
      ]
    };

    const metaRes = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PINATA_JWT}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        pinataMetadata: { name: `matchmint-metadata-${Date.now()}.json` },
        pinataOptions: { cidVersion: 1 },
        pinataContent: metadata,
      }),
    });

    if (!metaRes.ok) {
      const t = await metaRes.text().catch(() => '');
      return resp(502, { error: `Metadata upload failed: ${t}` });
    }

    const metaJson = await metaRes.json();
    const metadataCid = metaJson?.IpfsHash;
    if (!metadataCid) return resp(500, { error: 'Pinata did not return metadata CID' });

    const gatewayUri = `https://gateway.pinata.cloud/ipfs/${metadataCid}?filename=metadata.json`;
    const ipfsUri = `ipfs://${metadataCid}`;

    // 3) Warm the gateway (best-effort)
    try { await fetch(gatewayUri, { method: 'GET' }); } catch (_) {}
    try { await fetch(imageGateway, { method: 'GET' }); } catch (_) {}

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

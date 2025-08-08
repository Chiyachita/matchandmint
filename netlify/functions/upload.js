// netlify/functions/upload.js
exports.handler = async function(event) {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: 'Method Not Allowed' };
    }
    const { snapshot, name = 'Match and Mint Puzzle', description = 'A puzzle NFT created by matching pieces in the Match and Mint game', attributes = [] } = JSON.parse(event.body || '{}');
    if (!snapshot) {
      return { statusCode: 400, body: 'Missing snapshot' };
    }
    const base64 = snapshot.slice(snapshot.indexOf(',') + 1);
    const imageBuffer = Buffer.from(base64, 'base64');
    const apiKey = process.env.NFT_STORAGE_KEY;
    if (!apiKey) {
      return { statusCode: 500, body: 'NFT_STORAGE_KEY is not configured' };
    }
    // upload image
    const imgResp = await fetch('https://api.nft.storage/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: imageBuffer
    });
    if (!imgResp.ok) {
      return { statusCode: imgResp.status, body: await imgResp.text() };
    }
    const { value: { cid: imageCid } } = await imgResp.json();
    // build metadata
    const metadata = { name, description, image: `ipfs://${imageCid}`, attributes };
    const metaResp = await fetch('https://api.nft.storage/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: Buffer.from(JSON.stringify(metadata))
    });
    if (!metaResp.ok) {
      return { statusCode: metaResp.status, body: await metaResp.text() };
    }
    const { value: { cid: metadataCid } } = await metaResp.json();
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cid: metadataCid })
    };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: 'Internal server error' };
  }
};

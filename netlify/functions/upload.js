// netlify/functions/upload.js

exports.handler = async function (event) {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: 'Method Not Allowed' };
    }

    // Parse body; require a "snapshot" data URL
    const { snapshot, name = 'Match and Mint Puzzle', description = 'A puzzle NFT created by matching pieces in the Match and Mint game', attributes = [] } =
      JSON.parse(event.body || '{}');
    if (!snapshot || typeof snapshot !== 'string') {
      return { statusCode: 400, body: 'Missing or invalid snapshot' };
    }

    // Extract base64 and turn into a Buffer
    const base64 = snapshot.slice(snapshot.indexOf(',') + 1);
    const imageBuffer = Buffer.from(base64, 'base64');

    const apiKey = process.env.NFT_STORAGE_KEY;
    if (!apiKey) {
      return { statusCode: 500, body: 'NFT_STORAGE_KEY is not configured' };
    }

    // Upload image
    const uploadImageResp = await fetch('https://api.nft.storage/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: imageBuffer,
    });
    if (!uploadImageResp.ok) {
      return { statusCode: uploadImageResp.status, body: `Image upload failed: ${await uploadImageResp.text()}` };
    }
    const imageResult = await uploadImageResp.json();
    const imageCid = imageResult.value.cid;

    // Build metadata and upload it
    const metadata = {
      name,
      description,
      image: `ipfs://${imageCid}`,
      attributes,
    };
    const metadataBuffer = Buffer.from(JSON.stringify(metadata));
    const uploadMetadataResp = await fetch('https://api.nft.storage/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: metadataBuffer,
    });
    if (!uploadMetadataResp.ok) {
      return { statusCode: uploadMetadataResp.status, body: `Metadata upload failed: ${await uploadMetadataResp.text()}` };
    }
    const metadataResult = await uploadMetadataResp.json();
    const metadataCid = metadataResult.value.cid;

    // Return metadata CID
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cid: metadataCid }),
    };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: 'Internal server error' };
  }
};


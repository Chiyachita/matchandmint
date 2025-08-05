// netlify/functions/nftstorage.js
const { NFTStorage, File } = require('nft.storage');
const { Buffer }           = require('buffer');

if (!process.env.NFT_STORAGE_KEY) {
  console.error('❌ Missing NFT_STORAGE_KEY env var');
}

const client = new NFTStorage({ token: process.env.NFT_STORAGE_KEY });

exports.handler = async function (event) {
  try {
    const { snapshot } = JSON.parse(event.body);
    if (!snapshot.startsWith('data:image/png;base64,')) {
      throw new Error('Invalid snapshot format');
    }

    // Decode base64 data
    const b64 = snapshot.split(',')[1];
    const imageBuffer = Buffer.from(b64, 'base64');

    // 1) Pin the PNG
    console.log('📌 Pinning PNG...');
    const pngCid = await client.storeBlob(
      new File([imageBuffer], 'snapshot.png', { type: 'image/png' })
    );
    console.log('✅ PNG CID:', pngCid);

    // 2) Build & pin metadata JSON
    const metadata = {
      name:        'Puzzle Snapshot',
      description: 'Your custom 4×4 puzzle arrangement.',
      image:       `ipfs://${pngCid}`,
      properties: {
        files: [{ uri: `ipfs://${pngCid}`, type: 'image/png' }]
      }
    };

    console.log('📌 Pinning metadata JSON...');
    const metadataCid = await client.storeBlob(
      new File(
        [Buffer.from(JSON.stringify(metadata))],
        'metadata.json',
        { type: 'application/json' }
      )
    );
    console.log('✅ Metadata CID:', metadataCid);

    return {
      statusCode: 200,
      body: JSON.stringify({ pngCid, metadataCid })
    };

  } catch (err) {
    console.error('🔥 Function error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};

// netlify/functions/nftstorage.js

const { NFTStorage, File } = require('nft.storage');
const { Buffer }           = require('buffer');

exports.handler = async (event) => {
  try {
    // 1) grab the base64 snapshot from your front end
    const { snapshot } = JSON.parse(event.body);
    const base64Data   = snapshot.split(',')[1];
    const imgBuffer    = Buffer.from(base64Data, 'base64');

    // 2) init nft.storage client
    const client = new NFTStorage({ token: process.env.NFT_STORAGE_KEY });

    // 3) pin the PNG
    const pngFile = new File([imgBuffer], `puzzle-${Date.now()}.png`, {
      type: 'image/png'
    });
    const cidPng = await client.storeBlob(pngFile);

    // 4) build metadata JSON with HTTPS gateway URLs
    const gatewayBase = `https://ipfs.io/ipfs/${cidPng}`;
    const metadata = {
      name:        `Puzzle Snapshot #${Date.now()}`,
      description: 'Your custom puzzle arrangement!',
      image:       gatewayBase,
      properties: {
        files: [{ uri: gatewayBase, type: 'image/png' }]
      }
    };

    // 5) pin the JSON itself
    const metaFile = new File(
      [JSON.stringify(metadata)],
      `meta-${Date.now()}.json`,
      { type: 'application/json' }
    );
    const cidMeta = await client.storeBlob(metaFile);

    // 6) return the metadata CID
    return {
      statusCode: 200,
      body: JSON.stringify({ metadataCid: cidMeta })
    };

  } catch (err) {
    console.error('nft.storage error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};

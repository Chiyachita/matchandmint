// netlify/functions/nftstorage.js

const { NFTStorage, File } = require('nft.storage');
const { Buffer }           = require('buffer');

exports.handler = async (event) => {
  try {
    // 1) parse the base64 snapshot from the request
    const { snapshot } = JSON.parse(event.body);
    const base64Data   = snapshot.split(',')[1];
    const imgBuffer    = Buffer.from(base64Data, 'base64');

    // 2) init the client
    const client = new NFTStorage({ token: process.env.NFT_STORAGE_KEY });

    // 3) upload the PNG snapshot as a File
    const pngFile = new File(
      [imgBuffer],
      `puzzle-${Date.now()}.png`,
      { type: 'image/png' }
    );
    const cidPng = await client.storeBlob(pngFile);

    // 4) build your metadata JSON
    const metadata = {
      name:        `Puzzle Snapshot #${Date.now()}`,
      description: 'Your custom puzzle arrangement!',
      image:       `ipfs://${cidPng}`,
      properties: {
        files: [{ uri: `ipfs://${cidPng}`, type: 'image/png' }],
        category: 'image'
      }
    };

    // 5) upload that JSON as a File
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

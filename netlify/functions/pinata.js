// netlify/functions/pinata.js

const pinataSDK = require('@pinata/sdk');
const { Buffer } = require('buffer');

const pinata = pinataSDK({ pinataJWT: process.env.PINATA_JWT }); 

exports.handler = async (event) => {
  try {
    const { snapshot } = JSON.parse(event.body);
    // snapshot is a data URL: "data:image/png;base64,AAA..."
    const base64Data = snapshot.split(',')[1];
    const imgBuffer   = Buffer.from(base64Data, 'base64');

    // 1) Pin the image file
    const imgResult = await pinata.pinFileToIPFS(
      // wrap the buffer in a form-data stream
      require('streamifier').createReadStream(imgBuffer),
      {
        pinataMetadata: { name: `puzzle-${Date.now()}.png` },
        pinataOptions: { cidVersion: 1 }
      }
    );
    const imageCID = imgResult.IpfsHash;  // e.g. Qm...

    // 2) Build metadata JSON
    const metadata = {
      name: `Puzzle Snapshot #${Date.now()}`,
      symbol: 'MMP',
      description: 'Your custom puzzle arrangement!',
      image: `ipfs://${imageCID}`,
      properties: {
        files: [
          {
            uri: `ipfs://${imageCID}`,
            type: 'image/png'
          }
        ],
        category: 'image'
      }
    };

    // 3) Pin the metadata
    const metaResult = await pinata.pinJSONToIPFS(metadata, {
      pinataMetadata: { name: `meta-${Date.now()}.json` },
      pinataOptions: { cidVersion: 1 }
    });
    const metadataCid = metaResult.IpfsHash;

    return {
      statusCode: 200,
      body: JSON.stringify({ metadataCid })
    };

  } catch (err) {
    console.error('Pinata error', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};

// netlify/functions/pinata.js

const pinataSDK    = require('@pinata/sdk');
const streamifier  = require('streamifier');
const { Buffer }   = require('buffer');

const pinata = pinataSDK({ pinataJWT: process.env.PINATA_JWT });

exports.handler = async (event) => {
  try {
    // 1) Parse the snapshot data URL from the request body
    const { snapshot } = JSON.parse(event.body);
    const base64Data   = snapshot.split(',')[1];
    const imgBuffer    = Buffer.from(base64Data, 'base64');

    // 2) Pin the image file to IPFS
    const imgResult = await pinata.pinFileToIPFS(
      streamifier.createReadStream(imgBuffer),
      {
        pinataMetadata: { name: `puzzle-${Date.now()}.png` },
        pinataOptions:  { cidVersion: 1 }
      }
    );
    const imageCID = imgResult.IpfsHash;  // e.g. Qm...

    // 3) Build the metadata JSON, including image and properties.files
    const metadata = {
      name:        `Puzzle Snapshot #${Date.now()}`,
      symbol:      'MMP',
      description: 'Your custom puzzle arrangement!',
      image:       `ipfs://${imageCID}`,
      properties: {
        files: [
          {
            uri:  `ipfs://${imageCID}`,
            type: 'image/png'
          }
        ],
        category: 'image'
      }
    };

    // 4) Pin the metadata JSON to IPFS
    const metaResult = await pinata.pinJSONToIPFS(
      metadata,
      {
        pinataMetadata: { name: `meta-${Date.now()}.json` },
        pinataOptions:  { cidVersion: 1 }
      }
    );
    const metadataCid = metaResult.IpfsHash;

    // 5) Return the metadata CID for your front-end to mint against
    return {
      statusCode: 200,
      body: JSON.stringify({ metadataCid })
    };

  } catch (err) {
    console.error('Pinata function error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};

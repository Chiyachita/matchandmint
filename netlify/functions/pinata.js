// netlify/functions/pinata.js
const FormData = require('form-data');
const fetch    = require('node-fetch');

exports.handler = async (event) => {
  try {
    const { snapshot } = JSON.parse(event.body);
    const b64 = snapshot.split(',')[1];
    const buffer = Buffer.from(b64, 'base64');

    // pin the image
    const fileForm = new FormData();
    fileForm.append('file', buffer, {
      filename: 'snapshot.png', contentType: 'image/png'
    });
    const pfRes = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.PINATA_JWT}` },
      body: fileForm
    });
    if (!pfRes.ok) throw new Error('pinFileToIPFS failed');
    const { IpfsHash: imageCid } = await pfRes.json();

    // pin the metadata JSON
    const meta = {
      name: `Puzzle Snapshot #${Date.now()}`,
      description: 'Your custom puzzle arrangement—immortalized on-chain!',
      image: `ipfs://${imageCid}`
    };
    const pjRes = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.PINATA_JWT}`
      },
      body: JSON.stringify(meta)
    });
    if (!pjRes.ok) throw new Error('pinJSONToIPFS failed');
    const { IpfsHash: metadataCid } = await pjRes.json();

    return {
      statusCode: 200,
      body: JSON.stringify({ imageCid, metadataCid })
    };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: err.message };
  }
};

const FormData = require('form-data');
const fetch    = require('node-fetch');

exports.handler = async (event) => {
  try {
    const { snapshot } = JSON.parse(event.body);
    const b64 = snapshot.split(',')[1];
    const buffer = Buffer.from(b64, 'base64');

    // Pin image
    const form = new FormData();
    form.append('file', buffer, { filename:'snapshot.png', contentType:'image/png' });
    const res1 = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.PINATA_JWT}` },
      body: form
    });
    const { IpfsHash: imageCid } = await res1.json();

    // Pin metadata
    const meta = {
  name: `Puzzle Snapshot #${Date.now()}`,
  symbol: 'MMP',
  description: 'Your custom puzzle arrangement!',
  image: `ipfs://${imageCid}`,
  properties: {
    files: [{ uri: `ipfs://${imageCid}`, type: 'image/png' }],
    category: 'image'
  }
};

    const res2 = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.PINATA_JWT}`
      },
      body: JSON.stringify(meta)
    });
    const { IpfsHash: metadataCid } = await res2.json();

    return { statusCode: 200, body: JSON.stringify({ imageCid, metadataCid }) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: err.message };
  }
};

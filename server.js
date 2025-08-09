
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const FormData = require('form-data');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// You'll need to set this as an environment variable in Replit Secrets
const PINATA_JWT = process.env.PINATA_JWT;

app.post('/api/upload', async (req, res) => {
  try {
    if (!PINATA_JWT) {
      return res.status(500).json({ error: 'PINATA_JWT not configured' });
    }

    const { image } = req.body;
    if (!image) {
      return res.status(400).json({ error: 'Missing image data' });
    }

    // Convert base64 to buffer
    const base64 = image.split(',')[1];
    const buffer = Buffer.from(base64, 'base64');

    // Step 1: Upload image to Pinata
    const imageForm = new FormData();
    imageForm.append('file', buffer, { filename: 'puzzle.png', contentType: 'image/png' });

    const imageRes = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: { Authorization: `Bearer ${PINATA_JWT}` },
      body: imageForm,
    });

    if (!imageRes.ok) {
      const error = await imageRes.text();
      return res.status(500).json({ error: `Image upload failed: ${error}` });
    }

    const imageResult = await imageRes.json();
    const imageCid = imageResult.IpfsHash;

    // Step 2: Create and upload metadata
    const metadata = {
      name: "Match and Mint Puzzle NFT",
      description: "A unique puzzle arrangement created in the Match and Mint game",
      image: `ipfs://${imageCid}`,
      attributes: [
        {
          trait_type: "Game",
          value: "Match and Mint"
        },
        {
          trait_type: "Creation Date",
          value: new Date().toISOString()
        }
      ]
    };

    const metaRes = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PINATA_JWT}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(metadata),
    });

    if (!metaRes.ok) {
      const error = await metaRes.text();
      return res.status(500).json({ error: `Metadata upload failed: ${error}` });
    }

    const metaResult = await metaRes.json();
    const metadataCid = metaResult.IpfsHash;

    res.json({ uri: `ipfs://${metadataCid}` });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Unexpected server error: ' + err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});

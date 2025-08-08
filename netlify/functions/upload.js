const fetch = require('node-fetch');

exports.handler = async function (event) {
  const { snapshot } = JSON.parse(event.body || '{}');
  if (!snapshot) return { statusCode: 400, body: 'No snapshot provided' };

  const PINATA_JWT = process.env.PINATA_JWT;
  const body = {
    pinataContent: snapshot,
    pinataMetadata: {
      name: "match-and-mint-snapshot",
    },
  };

  const response = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${PINATA_JWT}`,
    },
    body: JSON.stringify(body),
  });

  const result = await response.json();
  if (!response.ok) {
    return {
      statusCode: response.status,
      body: JSON.stringify(result),
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ cid: result.IpfsHash }),
  };
};

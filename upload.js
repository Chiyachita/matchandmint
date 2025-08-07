// netlify/functions/upload.js
const { NFTStorage, Blob } = require('nft.storage')
const fetch = require('node-fetch')

exports.handler = async (event) => {
  try {
    const { snapshot } = JSON.parse(event.body)
    // parse data URL
    const [ , mime, b64 ] = snapshot.match(/^data:(.+);base64,(.+)$/)
    const buffer = Buffer.from(b64, 'base64')

    // instantiate NFT.Storage client with your secret key
    const client = new NFTStorage({ token: process.env.NFT_STORAGE_KEY })

    // pin the PNG blob
    const cid = await client.storeBlob(new Blob([buffer], { type: mime }))

    return {
      statusCode: 200,
      body: JSON.stringify({ metadataCid: cid })
    }
  } catch (err) {
    console.error(err)
    return { statusCode: 500, body: err.toString() }
  }
}

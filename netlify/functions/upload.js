// netlify/functions/upload.js
import { NFTStorage, File } from 'nft.storage'

// NOTE: you must set this in Netlify UI under Site Settings → Environment → New variable
// Key: NFT_STORAGE_KEY (mark “Secret”)
// Value: <your NFT.Storage API key>
const TOKEN = process.env.NFT_STORAGE_KEY

export const handler = async (event) => {
  try {
    if (!TOKEN) throw new Error('Missing NFT_STORAGE_KEY')
    const client = new NFTStorage({ token: TOKEN })

    // we expect the browser to POST JSON: { snapshot: "data:image/png;base64,..." }
    const { snapshot } = JSON.parse(event.body)
    const base64Data = snapshot.split(',')[1]
    const buffer     = Buffer.from(base64Data, 'base64')

    // store just the PNG blob
    const cid = await client.storeBlob(
      new File([buffer], 'snapshot.png', { type: 'image/png' })
    )

    return {
      statusCode: 200,
      body: JSON.stringify({ cid })
    }
  } catch (err) {
    console.error(err)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    }
  }
}

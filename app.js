// app.js

// ── CONTRACT CONFIG ───────────────────────────────────────
const CONTRACT_ADDRESS = '0x259C1Da2586295881C18B733Cb738fe1151bD2e5';
const ABI = [
  "function mintNFT(address to, string uri) external returns (uint256)"
];

// ── ELEMENTS ──────────────────────────────────────────────
const btnMint = document.getElementById('mintBtn');
const grid    = document.getElementById('puzzleGrid');
const preview = document.querySelector('.preview img');

// ── PLACEHOLDER PROVIDER/SIGNER SETUP ─────────────────────
// Replace these with your actual provider/signer initialization:
let provider  = new ethers.providers.Web3Provider(window.ethereum, 'any');
let signer    = provider.getSigner();
let contract  = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);

// ── MINT SNAPSHOT → NFT.STORAGE → ON-CHAIN ─────────────────
btnMint.onclick = async () => {
  try {
    // 1) Render puzzleGrid to a canvas, with CORS support
    const canvas = await html2canvas(grid, {
      useCORS: true,
      allowTaint: false,
      backgroundColor: null
    });

    // 2) Convert to data URL
    const snapshot = canvas.toDataURL('image/png');
    console.log('SNAPSHOT DATA URI:', snapshot.slice(0, 100), '…');

    // 3) Update preview so you see exactly what’s being pinned
    preview.src = snapshot;

    // 4) POST to your Netlify function to pin PNG + metadata JSON
    const res = await fetch('/.netlify/functions/nftstorage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ snapshot })
    });
    if (!res.ok) throw new Error(`Function failed: ${res.status}`);
    const { metadataCid, pngCid } = await res.json();
    console.log('PNG CID:', pngCid);
    console.log('METADATA CID:', metadataCid);

    // 5) Form the HTTPS gateway URI and mint on-chain
    const metadataUri = `https://ipfs.io/ipfs/${metadataCid}`;
    const tx = await contract.mintNFT(await signer.getAddress(), metadataUri);
    await tx.wait();
    alert('🎉 Mint complete!');

  } catch (err) {
    console.error('MintSnapshot error:', err);
    alert('Error during snapshot mint: ' + err.message);
  }
};

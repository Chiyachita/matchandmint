// app.js

// ── CHAIN CONFIG ──────────────────────────────────────────
const CHAIN_ID     = 10143;
const CHAIN_ID_HEX = '0x279F';

// ── CONTRACT CONFIG ───────────────────────────────────────
const CONTRACT_ADDRESS = '0x259C1Da2586295881C18B733Cb738fe1151bD2e5';
const ABI = [
  "function mintNFT(address to, string uri) external returns (uint256)",
  "function tokenURI(uint256 tokenId) view returns (string)"
];

// ── UI ELEMENTS ────────────────────────────────────────────
const btnConnect = document.getElementById('connectInjectedBtn');
const btnStart   = document.getElementById('startBtn');
const btnMint    = document.getElementById('mintBtn');
const btnRestart = document.getElementById('restartBtn');
const walletStatus = document.getElementById('walletStatus');
const timerEl    = document.getElementById('timeLeft');
const grid       = document.getElementById('puzzleGrid');
const preview    = document.querySelector('.preview img');

let provider, signer, contract;
let timerHandle, timeLeft = 45;
let dragged = null;
const ROWS = 4, COLS = 4;

// ── CONNECT WALLET (injected → WalletConnect fallback) ────
btnConnect.onclick = async () => {
  // try injected first
  if (window.ethereum && window.ethereum.request) {
    try {
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      provider = new ethers.providers.Web3Provider(window.ethereum, 'any');
      await provider.send('wallet_switchEthereumChain', [{ chainId: CHAIN_ID_HEX }]);
      console.log('✅ Injected wallet connected');
    } catch (e) {
      console.warn('Injected connect failed, will try WalletConnect', e);
    }
  }
  // fallback to WalletConnect
  if (!provider) {
    const WalletConnectProvider = window.WalletConnectProvider.default;
    const wc = new WalletConnectProvider({
      rpc: { [CHAIN_ID]: 'https://testnet-rpc.monad.xyz' },
      chainId: CHAIN_ID
    });
    await wc.enable();
    provider = new ethers.providers.Web3Provider(wc, 'any');
    console.log('✅ WalletConnect connected');
  }
  // finalize signer & contract
  signer   = provider.getSigner();
  contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
  const addr = await signer.getAddress();
  walletStatus.textContent = `Connected: ${addr.slice(0,6)}…${addr.slice(-4)}`;
  btnStart.disabled = false;
};

// ── BUILD PUZZLE ───────────────────────────────────────────
function buildPuzzle(imgUrl) {
  grid.innerHTML = '';
  for (let i = 0; i < ROWS * COLS; i++) {
    const cell = document.createElement('div');
    cell.className     = 'cell';
    cell.dataset.index = i;
    const x = (i % COLS) * 100, y = Math.floor(i / COLS) * 100;
    Object.assign(cell.style, {
      backgroundImage: `url(${imgUrl})`,
      backgroundSize:  `${COLS*100}px ${ROWS*100}px`,
      backgroundPosition: `-${x}px -${y}px`
    });
    cell.draggable = true;
    cell.addEventListener('dragstart', e => dragged = e.target);
    cell.addEventListener('dragover',  e => e.preventDefault());
    cell.addEventListener('drop',      onDrop);
    grid.appendChild(cell);
  }
}

function onDrop(e) {
  e.preventDefault();
  if (!dragged) return;
  const kids = [...grid.children];
  const i1   = kids.indexOf(dragged);
  const i2   = kids.indexOf(e.target);
  grid.insertBefore(dragged, i2 > i1 ? e.target.nextSibling : e.target);
}

// ── TIMER & RESTART ────────────────────────────────────────
function startTimer() {
  clearInterval(timerHandle);
  timeLeft = 45;
  timerEl.textContent = timeLeft;
  timerHandle = setInterval(() => {
    timerEl.textContent = --timeLeft;
    if (timeLeft <= 0) {
      clearInterval(timerHandle);
      alert('⏳ Time’s up! You can Mint or Restart.');
      btnStart.disabled   = false;
      btnRestart.disabled = false;
    }
  }, 1000);
}

btnRestart.onclick = () => {
  clearInterval(timerHandle);
  grid.innerHTML      = '';
  timerEl.textContent = '45';
  btnStart.disabled   = false;
  btnMint.disabled    = true;
  btnRestart.disabled = true;
};

// ── START GAME ────────────────────────────────────────────
btnStart.onclick = () => {
  preview.src = preview.src || 'preview.png';  // set your image source logic here
  buildPuzzle(preview.src);
  btnStart.disabled   = true;
  btnMint.disabled    = false;
  btnRestart.disabled = true;
  startTimer();
};

// ── MINT: SNAPSHOT → NFT.STORAGE → MINT ON-CHAIN ─────────
btnMint.onclick = async () => {
  try {
    // 1) snapshot grid
    const canvas = await html2canvas(grid, { useCORS: true, backgroundColor: null });
    const snapshot = canvas.toDataURL('image/png');
    console.log('SNAPSHOT URI:', snapshot.slice(0,80), '…');

    // 2) show it immediately
    preview.src = snapshot;

    // 3) pin to nft.storage via Netlify fn
    const res = await fetch('/.netlify/functions/nftstorage', {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({ snapshot })
    });
    if (!res.ok) throw new Error(`Storage fn failed: ${res.status}`);
    const { metadataCid } = await res.json();
    console.log('metadataCid:', metadataCid);

    // 4) mint using HTTPS gateway
    const metadataUri = `https://ipfs.io/ipfs/${metadataCid}`;
    const tx = await contract.mintNFT(await signer.getAddress(), metadataUri);
    await tx.wait();

    alert('🎉 Minted! Check the metadata tab in the explorer.');
    btnMint.disabled    = true;
    btnStart.disabled   = false;
    btnRestart.disabled = false;

  } catch (err) {
    console.error('Mint error:', err);
    alert('Error during mint: ' + err.message);
  }
};

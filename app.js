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
const status     = document.getElementById('walletStatus');
const timerEl    = document.getElementById('timeLeft');
const grid       = document.getElementById('puzzleGrid');
const preview    = document.querySelector('.preview img');

let provider, signer, contract;
let timerHandle, timeLeft = 45;
let dragged = null;
const ROWS = 4, COLS = 4;

// ── CONNECT WALLET ─────────────────────────────────────────
btnConnect.onclick = async () => {
  if (!window.ethereum) return alert('Install a wallet!');
  await window.ethereum.request({ method: 'eth_requestAccounts' });
  provider = new ethers.providers.Web3Provider(window.ethereum, 'any');
  await provider.send('wallet_switchEthereumChain', [{ chainId: CHAIN_ID_HEX }]);
  signer   = provider.getSigner();
  contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);

  const addr = await signer.getAddress();
  status.textContent = `Connected: ${addr.slice(0,6)}...${addr.slice(-4)}`;
  btnStart.disabled = false;
};

// ── BUILD PUZZLE ───────────────────────────────────────────
function buildPuzzle(imgUrl) {
  grid.innerHTML = '';
  for (let i = 0; i < ROWS * COLS; i++) {
    const cell = document.createElement('div');
    cell.className     = 'cell';
    cell.dataset.index = i;
    const x = (i % COLS) * 100;
    const y = Math.floor(i / COLS) * 100;
    Object.assign(cell.style, {
      backgroundImage: `url(${imgUrl})`,
      backgroundSize:  `${COLS * 100}px ${ROWS * 100}px`,
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
  if (i1 > -1 && i2 > -1) {
    grid.insertBefore(dragged, i2 > i1 ? e.target.nextSibling : e.target);
  }
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
      alert('⏳ Time’s up! Mint or Restart');
      btnStart.disabled   = false;
      btnRestart.disabled = false;
    }
  }, 1000);
}

btnRestart.onclick = () => {
  clearInterval(timerHandle);
  grid.innerHTML = '';
  timerEl.textContent = '45';
  btnStart.disabled   = false;
  btnMint.disabled    = true;
  btnRestart.disabled = true;
};

// ── START GAME ────────────────────────────────────────────
btnStart.onclick = () => {
  preview.src = preview.src || 'preview.png';
  buildPuzzle(preview.src);
  btnStart.disabled   = true;
  btnMint.disabled    = false;
  btnRestart.disabled = true;
  startTimer();
};

// ── MINT VIA ipfs.io GATEWAY ──────────────────────────────
btnMint.onclick = async () => {
  try {
    // 1) snapshot puzzle as base64 PNG
    const canvas   = await html2canvas(grid);
    const snapshot = canvas.toDataURL('image/png');

    // 2) pin via nft.storage or Pinata function as before
    const res = await fetch('/.netlify/functions/nftstorage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ snapshot })
    });
    if (!res.ok) throw new Error('Storage function failed');
    const { metadataCid } = await res.json();

    // 3) mint using ipfs.io gateway URL
    const uri = `https://ipfs.io/ipfs/${metadataCid}`;
    const tx  = await contract.mintNFT(await signer.getAddress(), uri);
    await tx.wait();

    alert('🎉 Minted!');
  } catch (err) {
    console.error('Mint error:', err);
    alert('Mint failed: ' + err.message);
  }
};

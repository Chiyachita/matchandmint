// app.js

// ── CONFIG ────────────────────────────────────────────────
const IMAGE_FILES = [
  "puzzle1.svg","puzzle2.svg","puzzle3.svg","puzzle4.svg",
  "puzzle5.svg","puzzle6.svg","puzzle7.svg","puzzle8.svg"
];
const GITHUB_OWNER  = 'Chiyachita';
const ASSETS_REPO   = 'match-and-mint-assets';
const GITHUB_BRANCH = 'main';
const IMAGES_PATH   = 'images';

const CHAIN_ID      = 10143;
const CHAIN_ID_HEX  = '0x279F';
const CONTRACT_ADDR = '0x259C1Da2586295881C18B733Cb738fe1151bD2e5';
const ABI = [
  "function mintNFT(address to, string uri) external returns (uint256)"
];

const ROWS = 4, COLS = 4;

// ── UI ELEMENTS ────────────────────────────────────────────
const btnConnect   = document.getElementById('connectInjectedBtn');
const btnStart     = document.getElementById('startBtn');
const btnMint      = document.getElementById('mintBtn');
const btnRestart   = document.getElementById('restartBtn');
const walletStatus = document.getElementById('walletStatus');
const timeLeftEl   = document.getElementById('timeLeft');
const puzzleGrid   = document.getElementById('puzzleGrid');
const referenceImg = document.getElementById('referenceImg');

let provider, signer, contract;
let timer, timeLeft = 45;
let draggedPiece = null;

// ── HELPERS ────────────────────────────────────────────────
function resolveURL(file) {
  return `https://cdn.jsdelivr.net/gh/${GITHUB_OWNER}/${ASSETS_REPO}@${GITHUB_BRANCH}/${IMAGES_PATH}/${file}`;
}
function pickRandom() {
  return resolveURL(IMAGE_FILES[Math.floor(Math.random() * IMAGE_FILES.length)]);
}
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

// ── CONNECT WALLET ─────────────────────────────────────────
btnConnect.onclick = async () => {
  console.log('🔍 Connecting injected wallet…');
  try {
    let eth = window.ethereum;
    if (!eth) throw new Error('No injected wallet found');
    if (Array.isArray(eth.providers)) {
      eth = eth.providers.find(p => p.isMetaMask) || eth.providers[0];
      console.log('→ picked provider:', eth.isMetaMask ? 'MetaMask' : eth);
    }
    await eth.request({ method: 'eth_requestAccounts' });
    provider = new ethers.providers.Web3Provider(eth, 'any');

    const net = await provider.getNetwork();
    console.log('Chain ID:', net.chainId);
    if (net.chainId !== CHAIN_ID) {
      await provider.send('wallet_switchEthereumChain', [{ chainId: CHAIN_ID_HEX }]);
    }

    signer   = provider.getSigner();
    contract = new ethers.Contract(CONTRACT_ADDR, ABI, signer);

    const addr = await signer.getAddress();
    walletStatus.textContent = `Connected: ${addr.slice(0,6)}…${addr.slice(-4)}`;
    btnStart.disabled = false;
    console.log('✅ Wallet connected:', addr);
  } catch (e) {
    console.error('🔌 connect error:', e);
    alert('Wallet connection failed:\n' + e.message);
  }
};

// ── BUILD PUZZLE & DRAG/DROP ───────────────────────────────
function buildPuzzle(imgUrl) {
  puzzleGrid.innerHTML = '';
  const cells = [];
  for (let i = 0; i < ROWS * COLS; i++) {
    const div = document.createElement('div');
    div.className     = 'cell';
    div.dataset.index = i;
    const x = (i % COLS) * 100, y = Math.floor(i / COLS) * 100;
    Object.assign(div.style, {
      backgroundImage:   `url(${imgUrl})`,
      backgroundSize:    `${COLS * 100}px ${ROWS * 100}px`,
      backgroundPosition:`-${x}px -${y}px`
    });
    div.draggable = true;
    div.addEventListener('dragstart', e => draggedPiece = e.target);
    div.addEventListener('dragover',  e => e.preventDefault());
    div.addEventListener('drop',      onDrop);
    cells.push(div);
  }
  shuffle(cells);
  cells.forEach(c => puzzleGrid.appendChild(c));
  referenceImg.src = imgUrl;
}
function onDrop(e) {
  e.preventDefault();
  if (!draggedPiece) return;
  const kids = Array.from(puzzleGrid.children);
  const i1 = kids.indexOf(draggedPiece), i2 = kids.indexOf(e.target);
  puzzleGrid.insertBefore(
    draggedPiece,
    i2 > i1 ? e.target.nextSibling : e.target
  );
}

// ── TIMER & RESTART ────────────────────────────────────────
function startTimer() {
  clearInterval(timer);
  timeLeft = 45;
  timeLeftEl.textContent = timeLeft;
  timer = setInterval(() => {
    timeLeftEl.textContent = --timeLeft;
    if (timeLeft <= 0) {
      clearInterval(timer);
      alert('⏳ Time’s up! You may Mint or Restart.');
      btnStart.disabled   = false;
      btnRestart.disabled = false;
    }
  }, 1000);
}
btnRestart.onclick = () => {
  clearInterval(timer);
  puzzleGrid.innerHTML = '';
  timeLeftEl.textContent = '45';
  btnStart.disabled   = false;
  btnMint.disabled    = true;
  btnRestart.disabled = true;
};

// ── START GAME ────────────────────────────────────────────
btnStart.onclick = () => {
  btnStart.disabled   = true;
  btnMint.disabled    = false;
  btnRestart.disabled = true;
  const imageUrl = pickRandom();
  buildPuzzle(imageUrl);
  startTimer();
};

// ── MINT: html2canvas → NFT.Storage REST → on-chain ───────
btnMint.onclick = async () => {
  try {
    console.log('📸 Capturing snapshot…');
    const canvas = await html2canvas(puzzleGrid, { useCORS: true });
    const dataUrl = canvas.toDataURL('image/png');
    const blob = await (await fetch(dataUrl)).blob();

    // debug & sanitize key
    const rawKey = window.NFT_STORAGE_KEY || '';
    for (let i = 0; i < rawKey.length; i++) {
      if (rawKey.charCodeAt(i) > 255) {
        console.error('❗️ Non-ASCII char at', i, rawKey[i]);
      }
    }
    const token = rawKey.trim();
    if (token.length < 10) throw new Error('Invalid NFT_STORAGE_KEY');
    const authHeader = `Bearer ${token}`;
    console.log('📋 Auth header start:', authHeader.slice(0,20) + '…');

    // pin snapshot
    console.log('📡 Pinning snapshot…');
    const form = new FormData();
    form.append('file', blob, 'snapshot.png');
    const pinRes = await fetch('https://api.nft.storage/upload', {
      method: 'POST',
      headers: { Authorization: authHeader },
      body: form
    });
    if (!pinRes.ok) throw new Error(`NFT.Storage returned ${pinRes.status}`);
    const { value } = await pinRes.json();
    console.log('✅ PNG CID:', value.cid);

    // build metadata inline
    const metadata = {
      name: 'Puzzle Snapshot',
      description: 'Your custom 4×4 puzzle arrangement.',
      image: `ipfs://${value.cid}`,
      properties: {
        files: [{ uri: `ipfs://${value.cid}`, type: 'image/png' }]
      }
    };
    const metadataUri = 'data:application/json,' + encodeURIComponent(JSON.stringify(metadata));
    console.log('⛓️ Minting with URI:', metadataUri.slice(0,60) + '…');

    // mint on-chain
    const tx = await contract.mintNFT(await signer.getAddress(), metadataUri);
    await tx.wait();
    alert('🎉 Mint successful!');
  } catch (err) {
    console.error('🔴 Mint error:', err);
    alert('Mint failed:\n' + (err.message || err));
  }
};

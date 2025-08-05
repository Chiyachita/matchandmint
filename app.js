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

const CHAIN_ID_HEX     = '0x279F';      // 10143
const CONTRACT_ADDRESS = '0x259C1Da2586295881C18B733Cb738fe1151bD2e5';
const ABI = [
  "function mintNFT(address to, string uri) external returns (uint256)"
];

const ROWS = 4, COLS = 4;

// ── UI ELEMENTS ────────────────────────────────────────────
const connectBtn   = document.getElementById('connectInjectedBtn');
const startBtn     = document.getElementById('startBtn');
const mintBtn      = document.getElementById('mintBtn');
const restartBtn   = document.getElementById('restartBtn');
const walletStatus = document.getElementById('walletStatus');
const timeLeftEl   = document.getElementById('timeLeft');
const puzzleGrid   = document.getElementById('puzzleGrid');
const referenceImg = document.getElementById('referenceImg');

let provider, signer, contract;
let timer, timeLeft = 45;
let draggedPiece = null;

// ── UTILS ─────────────────────────────────────────────────
function resolveURL(file) {
  return `https://cdn.jsdelivr.net/gh/${GITHUB_OWNER}/${ASSETS_REPO}@${GITHUB_BRANCH}/${IMAGES_PATH}/${file}`;
}

function pickRandom() {
  const idx = Math.floor(Math.random() * IMAGE_FILES.length);
  return resolveURL(IMAGE_FILES[idx]);
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

// ── CONNECT MULTI-BRAND INJECTED WALLET ────────────────────
async function connectInjected() {
  try {
    // Pick a provider if multiple are injected
    let eth = window.ethereum;
    if (eth?.providers && Array.isArray(eth.providers)) {
      // prefer MetaMask
      eth = eth.providers.find(p => p.isMetaMask) || eth.providers[0];
      console.log('⚙️ Using injected provider:', eth.isMetaMask ? 'MetaMask' : eth);
    }
    if (!eth) throw new Error('No injected wallet found');

    // Request accounts
    await eth.request({ method: 'eth_requestAccounts' });

    // Wrap with ethers
    provider = new ethers.providers.Web3Provider(eth,'any');

    // Switch to Monad Testnet if needed
    const { chainId } = await provider.getNetwork();
    if (chainId !== parseInt(CHAIN_ID_HEX,16)) {
      try {
        await provider.send('wallet_switchEthereumChain', [{ chainId: CHAIN_ID_HEX }]);
      } catch (switchErr) {
        console.warn('Chain switch failed:', switchErr);
      }
    }

    // Finalize
    signer   = provider.getSigner();
    contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
    const addr = await signer.getAddress();
    walletStatus.textContent = `Connected: ${addr.slice(0,6)}…${addr.slice(-4)}`;
    startBtn.disabled = false;
    console.log('✅ Wallet connected:', addr);

  } catch (err) {
    console.error('🔌 connectInjected error:', err);
    alert('Failed to connect wallet:\n' + err.message);
  }
}

connectBtn.addEventListener('click', connectInjected);

// ── BUILD PUZZLE GRID + REFERENCE ─────────────────────────
function buildPuzzle(imgUrl) {
  puzzleGrid.innerHTML = '';
  const cells = [];
  for (let i = 0; i < ROWS * COLS; i++) {
    const div = document.createElement('div');
    div.className     = 'cell';
    div.dataset.index = i;
    const x = (i % COLS) * 100, y = Math.floor(i / COLS) * 100;
    Object.assign(div.style, {
      backgroundImage:    `url(${imgUrl})`,
      backgroundSize:     `${COLS * 100}px ${ROWS * 100}px`,
      backgroundPosition: `-${x}px -${y}px`
    });
    div.draggable = true;
    div.addEventListener('dragstart', e => (draggedPiece = e.target));
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
      startBtn.disabled   = false;
      restartBtn.disabled = false;
    }
  }, 1000);
}

restartBtn.onclick = () => {
  clearInterval(timer);
  puzzleGrid.innerHTML = '';
  timeLeftEl.textContent = '45';
  startBtn.disabled   = false;
  mintBtn.disabled    = true;
  restartBtn.disabled = true;
};

// ── START GAME ────────────────────────────────────────────
startBtn.onclick = () => {
  startBtn.disabled    = true;
  mintBtn.disabled     = false;
  restartBtn.disabled  = true;
  const imageUrl = pickRandom();
  buildPuzzle(imageUrl);
  startTimer();
};

// ── MINT SNAPSHOT → PIN → ON-CHAIN ────────────────────────
mintBtn.onclick = async () => {
  try {
    // 1) Snapshot
    console.log('📸 Capturing snapshot…');
    const canvas   = await html2canvas(puzzleGrid, { useCORS: true });
    const snapshot = canvas.toDataURL('image/png');

    // 2) Pin via your Netlify fn (or NFT.Storage directly)
    console.log('📡 Pinning snapshot…');
    const res = await fetch('/.netlify/functions/nftstorage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ snapshot })
    });
    if (!res.ok) throw new Error(`Storage fn returned ${res.status}`);
    const { metadataCid } = await res.json();
    console.log('✅ metadataCid:', metadataCid);

    // 3) Mint on-chain
    const uri = `https://ipfs.io/ipfs/${metadataCid}`;
    console.log('⛓️ Minting with URI:', uri);
    const tx = await contract.mintNFT(await signer.getAddress(), uri);
    await tx.wait();
    alert('🎉 Mint successful!');
  } catch (err) {
    console.error('🔥 Mint error:', err);
    alert('Mint failed:\n' + (err.message||err));
  }
};

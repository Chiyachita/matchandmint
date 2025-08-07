// ─── UMD IMPORTS ─────────────────────────────────────────────
// window.ethers
// window.html2canvas
// window.NFTStorage      (from bundle.umd.min.js)
// window.Web3Modal      (from web3modal iife)
// window.WalletConnectProvider.default

// ─── YOUR NFT.Storage KEY ────────────────────────────────────
const NFT_STORAGE_KEY = window.NFT_STORAGE_KEY;
if (!NFT_STORAGE_KEY) {
  alert('❌ Missing NFT_STORAGE_KEY! Please set it via <script> before loading app.js');
  throw new Error('NFT_STORAGE_KEY is undefined');
}

// ─── CHAIN & CONTRACT CONFIG ────────────────────────────────
const CHAIN_ID_HEX     = '0x279F'; // 10143 decimal
const CHAIN_ID         = 10143;
const CONTRACT_ADDRESS = '0x259C1Da2586295881C18B733Cb738fe1151bD2e5';
const ABI = [
  "function mintNFT(address to, string uri) external returns (uint256)"
];

// ─── ASSET PREVIEW CONFIG ──────────────────────────────────
const GITHUB_OWNER  = 'Chiyachita';
const ASSETS_REPO   = 'match-and-mint-assets';
const GITHUB_BRANCH = 'main';
const IMAGES_PATH   = 'images';

// ─── UI ELEMENTS ────────────────────────────────────────────
const btnConnect = document.getElementById('connectInjectedBtn');
const btnStart   = document.getElementById('startBtn');
const btnMint    = document.getElementById('mintBtn');
const btnRestart = document.getElementById('restartBtn');
const walletStatus = document.getElementById('walletStatus');
const timeLeftEl   = document.getElementById('timeLeft');
const puzzleGrid   = document.getElementById('puzzleGrid');
const previewImg   = document.getElementById('previewImg');

// ─── STATE ──────────────────────────────────────────────────
let provider, signer, contract;
let imageList = [];
let timerHandle, timeLeft = 45;
let dragged = null;
const ROWS = 4, COLS = 4;

// ─── WEB3MODAL SETUP ───────────────────────────────────────
const web3Modal = new Web3Modal({
  cacheProvider: false,
  providerOptions: {
    walletconnect: {
      package: window.WalletConnectProvider.default,
      options: {
        rpc: { [CHAIN_ID]: 'https://testnet-rpc.monad.xyz' }
      }
    }
  }
});

async function connectWallet() {
  try {
    const raw = await web3Modal.connect();
    provider = new ethers.providers.Web3Provider(raw, 'any');
    await switchToChain();
    signer   = provider.getSigner();
    contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);

    const addr = await signer.getAddress();
    walletStatus.textContent = `Connected: ${addr.slice(0,6)}…${addr.slice(-4)}`;
    btnStart.disabled = false;

    raw.on('chainChanged', cid => {
      if (cid !== CHAIN_ID_HEX) window.location.reload();
    });
  } catch (err) {
    console.error(err);
    alert('Failed to connect wallet');
  }
}

async function switchToChain() {
  const { chainId } = await provider.getNetwork();
  if (chainId !== CHAIN_ID) {
    await provider.send('wallet_switchEthereumChain', [{ chainId: CHAIN_ID_HEX }]);
  }
}

// ─── IMAGE LIST LOADER ─────────────────────────────────────
async function loadImageList() {
  try {
    const url = `https://cdn.jsdelivr.net/gh/${GITHUB_OWNER}/${ASSETS_REPO}@${GITHUB_BRANCH}/list.json`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(res.status);
    imageList = await res.json();
  } catch (e) {
    console.warn('Could not load list.json', e);
    imageList = [];
  }
}

function pickRandomImage() {
  if (!imageList.length) return 'preview.png';
  const fn = imageList[Math.floor(Math.random() * imageList.length)];
  return `https://cdn.jsdelivr.net/gh/${GITHUB_OWNER}/${ASSETS_REPO}@${GITHUB_BRANCH}/${IMAGES_PATH}/${fn}`;
}

// ─── PUZZLE GENERATION ────────────────────────────────────
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function buildPuzzle(imgUrl) {
  puzzleGrid.innerHTML = '';
  const cells = [];
  for (let i = 0; i < ROWS * COLS; i++) {
    const cell = document.createElement('div');
    cell.className     = 'cell';
    cell.dataset.index = i;
    const x = (i % COLS) * 100, y = Math.floor(i / COLS) * 100;
    Object.assign(cell.style, {
      backgroundImage:   `url(${imgUrl})`,
      backgroundSize:    `${COLS*100}px ${ROWS*100}px`,
      backgroundPosition:`-${x}px -${y}px`
    });
    cell.draggable = true;
    cell.addEventListener('dragstart', e => dragged = e.target);
    cell.addEventListener('dragover',  e => e.preventDefault());
    cell.addEventListener('drop',      onDrop);
    cells.push(cell);
  }
  shuffle(cells);
  cells.forEach(c => puzzleGrid.appendChild(c));
}

function onDrop(e) {
  e.preventDefault();
  if (!dragged) return;
  const kids = Array.from(puzzleGrid.children);
  const i1 = kids.indexOf(dragged), i2 = kids.indexOf(e.target);
  if (i1 > -1 && i2 > -1) {
    puzzleGrid.insertBefore(dragged, i2 > i1 ? e.target.nextSibling : e.target);
  }
}

function isPuzzleSolved() {
  return Array.from(puzzleGrid.children)
    .every((c,i) => +c.dataset.index === i);
}

// ─── TIMER ─────────────────────────────────────────────────
function startTimer() {
  clearInterval(timerHandle);
  timeLeft = 45;
  timeLeftEl.textContent = timeLeft;
  timerHandle = setInterval(() => {
    timeLeftEl.textContent = --timeLeft;
    if (timeLeft <= 0) {
      clearInterval(timerHandle);
      alert(isPuzzleSolved()
        ? '⏰ Solved! Mint your masterpiece.'
        : '⏳ Time’s up! Mint what you have.'
      );
      btnStart.disabled   = false;
      btnRestart.disabled = false;
    }
  }, 1000);
}

// ─── WIRE UP “Restart” ─────────────────────────────────────
btnRestart.addEventListener('click', () => {
  clearInterval(timerHandle);
  puzzleGrid.innerHTML = '';
  timeLeftEl.textContent = '45';
  btnStart.disabled   = false;
  btnMint.disabled    = true;
  btnRestart.disabled = true;
});

// ─── START GAME ────────────────────────────────────────────
btnStart.addEventListener('click', async () => {
  btnStart.disabled   = true;
  btnMint.disabled    = false;
  btnRestart.disabled = true;

  if (!imageList.length) await loadImageList();
  const img = pickRandomImage();
  previewImg.src = img;
  buildPuzzle(img);
  startTimer();
});

// ─── MINT via NFT.Storage + ON-CHAIN ───────────────────────
btnMint.addEventListener('click', async () => {
  try {
    // 1) snapshot → PNG blob
    const canvas = await html2canvas(puzzleGrid);
    const blob   = await new Promise(r => canvas.toBlob(r, 'image/png'));

    // 2) pin & metadata via NFT.Storage
    const client = new NFTStorage({ token: NFT_STORAGE_KEY });
    const meta   = await client.store({
      name: `MatchAndMintPuzzle #${Date.now()}`,
      description: 'Puzzle snapshot on Monad Testnet',
      image: new File([blob], 'snapshot.png', { type: 'image/png' })
    });

    // 3) convert ipfs:// → gateway URI
    const uri = meta.url.replace('ipfs://', 'https://ipfs.io/ipfs/');

    // 4) mint on-chain
    const tx = await contract.mintNFT(await signer.getAddress(), uri);
    await tx.wait();

    alert('🎉 Minted! Your NFT is live.');
    clearInterval(timerHandle);
    btnMint.disabled    = true;
    btnStart.disabled   = false;
    btnRestart.disabled = false;
    previewImg.src      = canvas.toDataURL();

  } catch (err) {
    console.error(err);
    alert('Mint failed: ' + err.message);
  }
});

// ─── BOOTSTRAP: Hook “Connect” + initial preview ───────────
btnConnect.addEventListener('click', connectWallet);

(async () => {
  await loadImageList();
  if (imageList.length) previewImg.src = pickRandomImage();
})();

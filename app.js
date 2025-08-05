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

// ── ASSET SOURCES ─────────────────────────────────────────
const GITHUB_OWNER  = 'Chiyachita';
const ASSETS_REPO   = 'match-and-mint-assets';
const GITHUB_BRANCH = 'main';
const IMAGES_PATH   = 'images';

// ── UI ELEMENTS ────────────────────────────────────────────
const connectInjectedBtn      = document.getElementById('connectInjectedBtn');
const connectWalletConnectBtn = document.getElementById('connectWalletConnectBtn');
const walletStatus            = document.getElementById('walletStatus');
const startBtn                = document.getElementById('startBtn');
const mintBtn                 = document.getElementById('mintBtn');
const restartBtn              = document.getElementById('restartBtn');
const timeLeftEl              = document.getElementById('timeLeft');
const puzzleGrid              = document.getElementById('puzzleGrid');
const previewImg              = document.querySelector('.preview img');

let provider, signer, contract;
let imageList = [];
let timerHandle, timeLeft = 45;
let dragged = null;
const ROWS = 4, COLS = 4;

// ── HELPERS ────────────────────────────────────────────────
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

async function loadImageList() {
  const url = `https://cdn.jsdelivr.net/gh/${GITHUB_OWNER}/${ASSETS_REPO}@${GITHUB_BRANCH}/list.json`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(res.status);
    imageList = await res.json();
  } catch (e) {
    console.error('Could not load list.json', e);
    imageList = [];
  }
}

function pickRandomImage() {
  if (!imageList.length) return 'preview.png';
  const file = imageList[Math.floor(Math.random() * imageList.length)];
  return `https://cdn.jsdelivr.net/gh/${GITHUB_OWNER}/${ASSETS_REPO}@${GITHUB_BRANCH}/${IMAGES_PATH}/${file}`;
}

function isPuzzleSolved() {
  return Array.from(puzzleGrid.children)
    .every((c, i) => parseInt(c.dataset.index, 10) === i);
}

async function switchToMonad(ep) {
  const { chainId } = await ep.getNetwork();
  if (chainId !== CHAIN_ID) {
    await ep.send('wallet_switchEthereumChain', [{ chainId: CHAIN_ID_HEX }]);
  }
}

// ── CONNECT INJECTED WALLET ─────────────────────────────────
async function connectInjected() {
  if (!window.ethereum) {
    alert('No injected wallet found! Try WalletConnect.');
    return;
  }
  try {
    await window.ethereum.request({ method: 'eth_requestAccounts' });
    const ep = new ethers.providers.Web3Provider(window.ethereum, 'any');
    await switchToMonad(ep);
    finishConnect(ep);
  } catch (err) {
    console.error('Injected connect failed', err);
    alert('Failed to connect injected wallet.');
  }
}

// ── CONNECT WALLETCONNECT ──────────────────────────────────
async function connectWalletConnect() {
  try {
    const wc = new WalletConnectProvider.default({
      rpc: { [CHAIN_ID]: 'https://testnet-rpc.monad.xyz' },
      chainId: CHAIN_ID
    });
    await wc.enable();
    const ep = new ethers.providers.Web3Provider(wc, 'any');
    await switchToMonad(ep);
    finishConnect(ep);
  } catch (err) {
    console.error('WalletConnect failed', err);
    alert('Failed to connect via WalletConnect.');
  }
}

// ── POST-CONNECT SETUP ─────────────────────────────────────
async function finishConnect(ep) {
  provider = ep;
  signer   = provider.getSigner();
  contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);

  const addr = await signer.getAddress();
  walletStatus.textContent = `Connected: ${addr.slice(0,6)}...${addr.slice(-4)}`;
  startBtn.disabled = false;
}

// ── BUILD & DRAG-DROP PUZZLE ───────────────────────────────
function buildPuzzle(imgUrl) {
  puzzleGrid.innerHTML = '';
  const cells = [];
  for (let i = 0; i < ROWS * COLS; i++) {
    const c = document.createElement('div');
    c.className     = 'cell';
    c.dataset.index = i;
    const x = (i % COLS)*100, y = Math.floor(i / COLS)*100;
    Object.assign(c.style, {
      backgroundImage: `url(${imgUrl})`,
      backgroundSize:  `${COLS*100}px ${ROWS*100}px`,
      backgroundPosition: `-${x}px -${y}px`
    });
    c.draggable = true;
    c.addEventListener('dragstart', e => dragged = e.target);
    c.addEventListener('dragover', e => e.preventDefault());
    c.addEventListener('drop', onDrop);
    cells.push(c);
  }
  shuffle(cells);
  cells.forEach(c => puzzleGrid.appendChild(c));
}

function onDrop(e) {
  e.preventDefault();
  if (!dragged) return;
  const kids = Array.from(puzzleGrid.children);
  const i1 = kids.indexOf(dragged), i2 = kids.indexOf(e.target);
  grid.insertBefore(dragged, i2 > i1 ? e.target.nextSibling : e.target);
}

// ── TIMER & RESTART ────────────────────────────────────────
function startTimer() {
  clearInterval(timerHandle);
  timeLeft = 45;
  timeLeftEl.textContent = timeLeft;
  timerHandle = setInterval(() => {
    timeLeftEl.textContent = --timeLeft;
    if (timeLeft <= 0) {
      clearInterval(timerHandle);
      alert(isPuzzleSolved() ? '⏰ You nailed it!' : '⏳ Time’s up!');
      startBtn.disabled   = false;
      restartBtn.disabled = false;
    }
  }, 1000);
}

restartBtn.addEventListener('click', () => {
  clearInterval(timerHandle);
  puzzleGrid.innerHTML   = '';
  timeLeftEl.textContent = '45';
  startBtn.disabled      = false;
  mintBtn.disabled       = true;
  restartBtn.disabled    = true;
});

// ── START GAME ───────────────────────────────────────────
startBtn.addEventListener('click', async () => {
  startBtn.disabled    = true;
  mintBtn.disabled     = false;
  restartBtn.disabled  = true;
  if (!imageList.length) await loadImageList();
  const img = pickRandomImage();
  buildPuzzle(img);
  previewImg.src = img;
  startTimer();
});

// ── MINT VIA nft.storage & ON-CHAIN ───────────────────────
async function mintSnapshot() {
  try {
    // 1) snapshot to base64 PNG
    const canvas   = await html2canvas(puzzleGrid);
    const snapshot = canvas.toDataURL('image/png');

    // 2) send to nftstorage function
    const res = await fetch('/.netlify/functions/nftstorage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ snapshot })
    });
    if (!res.ok) throw new Error('nft.storage function failed');
    const { metadataCid } = await res.json();

    // 3) mint using nftstorage gateway
    const uri = `https://nftstorage.link/ipfs/${metadataCid}`;
    const tx  = await contract.mintNFT(await signer.getAddress(), uri);
    await tx.wait();

    // 4) show snapshot preview
    previewImg.src      = snapshot;
    alert('🎉 Minted!');
    clearInterval(timerHandle);
    mintBtn.disabled    = true;
    startBtn.disabled   = false;
    restartBtn.disabled = false;

  } catch (err) {
    console.error('Mint error:', err);
    alert('Error minting: ' + err.message);
  }
}

mintBtn.addEventListener('click', mintSnapshot);
connectInjectedBtn.addEventListener('click', connectInjected);
connectWalletConnectBtn.addEventListener('click', connectWalletConnect);

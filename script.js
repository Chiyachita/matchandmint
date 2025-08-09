// ✅ Match & Mint — script.js (full, drop-in replacement)

// ── CONFIG ────────────────────────────────────────────
const CONTRACT_ADDRESS = '0x259C1Da2586295881C18B733Cb738fe1151bD2e5';
const CHAIN_ID = 10143;
const CHAIN_ID_HEX = '0x279F';

const ABI = [
  { "inputs": [], "stateMutability": "nonpayable", "type": "constructor" },
  {
    "anonymous": false, "inputs": [
      { "indexed": true, "internalType": "address", "name": "owner", "type": "address" },
      { "indexed": true, "internalType": "address", "name": "approved", "type": "address" },
      { "indexed": true, "internalType": "uint256", "name": "tokenId", "type": "uint256" }
    ], "name": "Approval", "type": "event"
  },
  {
    "anonymous": false, "inputs": [
      { "indexed": true, "internalType": "address", "name": "owner", "type": "address" },
      { "indexed": true, "internalType": "address", "name": "operator", "type": "address" },
      { "indexed": false, "internalType": "bool", "name": "approved", "type": "bool" }
    ], "name": "ApprovalForAll", "type": "event"
  },
  { "inputs": [{ "internalType": "address", "name": "to", "type": "address" }, { "internalType": "uint256", "name": "tokenId", "type": "uint256" }], "name": "approve", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "anonymous": false, "inputs": [{ "indexed": false, "internalType": "uint256", "name": "_fromTokenId", "type": "uint256" }, { "indexed": false, "internalType": "uint256", "name": "_toTokenId", "type": "uint256" }], "name": "BatchMetadataUpdate", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": false, "internalType": "uint256", "name": "_tokenId", "type": "uint256" }], "name": "MetadataUpdate", "type": "event" },
  { "inputs": [{ "internalType": "address", "name": "to", "type": "address" }, { "internalType": "string", "name": "uri", "type": "string" }], "name": "mintNFT", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "from", "type": "address" }, { "internalType": "address", "name": "to", "type": "address" }, { "internalType": "uint256", "name": "tokenId", "type": "uint256" }], "name": "safeTransferFrom", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "from", "type": "address" }, { "internalType": "address", "name": "to", "type": "address" }, { "internalType": "uint256", "name": "tokenId", "type": "uint256" }, { "internalType": "bytes", "name": "data", "type": "bytes" }], "name": "safeTransferFrom", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "operator", "type": "address" }, { "internalType": "bool", "name": "approved", "type": "bool" }], "name": "setApprovalForAll", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "from", "type": "address" }, { "indexed": true, "internalType": "address", "name": "to", "type": "address" }, { "indexed": true, "internalType": "uint256", "name": "tokenId", "type": "uint256" }], "name": "Transfer", "type": "event" },
  { "inputs": [{ "internalType": "address", "name": "from", "type": "address" }, { "internalType": "address", "name": "to", "type": "address" }, { "internalType": "uint256", "name": "tokenId", "type": "uint256" }], "name": "transferFrom", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "owner", "type": "address" }], "name": "balanceOf", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "uint256", "name": "tokenId", "type": "uint256" }], "name": "getApproved", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "owner", "type": "address" }, { "internalType": "address", "name": "operator", "type": "address" }], "name": "isApprovedForAll", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "name", "outputs": [{ "internalType": "string", "name": "", "type": "string" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "nextTokenId", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "uint256", "name": "tokenId", "type": "uint256" }], "name": "ownerOf", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "bytes4", "name": "interfaceId", "type": "bytes4" }], "name": "supportsInterface", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "symbol", "outputs": [{ "internalType": "string", "name": "", "type": "string" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "uint256", "name": "tokenId", "type": "uint256" }], "name": "tokenURI", "outputs": [{ "internalType": "string", "name": "", "type": "string" }], "stateMutability": "view", "type": "function" }
];

// ── ASSETS CONFIG ─────────────────────────────────────
const GITHUB_OWNER  = 'Chiyachita';
const ASSETS_REPO   = 'match-and-mint-assets';
const GITHUB_BRANCH = 'main';
const IMAGES_PATH   = 'images';

// ── UI ELEMENTS ───────────────────────────────────────
const connectInjectedBtn      = document.getElementById('connectInjectedBtn');
const connectWalletConnectBtn = document.getElementById('connectWalletConnectBtn');
const walletStatus            = document.getElementById('walletStatus');
const startBtn                = document.getElementById('startBtn');
const mintBtn                 = document.getElementById('mintBtn');
const restartBtn              = document.getElementById('restartBtn');
const timeLeftEl              = document.getElementById('timeLeft');
const puzzleGrid              = document.getElementById('puzzleGrid');
const previewImg              = document.getElementById('previewImg');

// ── STATE ─────────────────────────────────────────────
let provider, signer, contract;
let imageList = [];
let timerHandle, timeLeft = 45;
let draggedPiece = null;        // <— piece element
let sourceSlot = null;          // <— its current slot
const ROWS = 4, COLS = 4;

// ── HELPERS: Providers ────────────────────────────────
function brandName(p) {
  if (!p) return 'Unknown';
  if (p.isMetaMask) return 'MetaMask';
  if (p.isRabby) return 'Rabby';
  if (p.isBackpack) return 'Backpack';
  if (p.isCoinbaseWallet) return 'Coinbase Wallet';
  if (p.isBraveWallet) return 'Brave Wallet';
  if (p.isOKExWallet || p.isOKXWallet) return 'OKX Wallet';
  if (p.isTrust) return 'Trust Wallet';
  if (p.isFrame) return 'Frame';
  if (p.isPhantom || p.isPhantomEthereum) return 'Phantom (EVM)';
  return 'Injected';
}

// 🔇 NO PROMPT — pick a provider deterministically (MetaMask first)
function getInjectedProvider() {
  const pool = [];
  const eth = window.ethereum;
  if (eth?.providers && Array.isArray(eth.providers)) pool.push(...eth.providers);
  if (eth && !pool.includes(eth)) pool.push(eth);
  if (window.phantom?.ethereum && !pool.includes(window.phantom.ethereum)) pool.push(window.phantom.ethereum);
  if (!pool.length) return null;

  const rank = ["MetaMask","Rabby","Backpack","Coinbase Wallet","Brave Wallet","Phantom (EVM)","OKX Wallet","Trust Wallet","Frame","Injected"];
  pool.sort((a,b)=> rank.indexOf(brandName(a)) - rank.indexOf(brandName(b)));
  const chosen = pool[0];
  console.log('[wallet] selected:', brandName(chosen));
  return chosen;
}

async function switchToMonad(ethersProvider) {
  try {
    const chainIdHex = await ethersProvider.send('eth_chainId', []);
    if (chainIdHex?.toLowerCase() === CHAIN_ID_HEX.toLowerCase()) return;

    try {
      await ethersProvider.send('wallet_switchEthereumChain', [{ chainId: CHAIN_ID_HEX }]);
    } catch (e) {
      if (e?.code === 4902 || /Unrecognized chain ID/i.test(e?.message || '')) {
        await ethersProvider.send('wallet_addEthereumChain', [{
          chainId: CHAIN_ID_HEX,
          chainName: 'Monad Testnet',
          nativeCurrency: { name: 'MON', symbol: 'MON', decimals: 18 },
          rpcUrls: ['https://testnet-rpc.monad.xyz'],
          blockExplorerUrls: ['https://testnet.monadexplorer.com']
        }]);
      } else {
        throw e;
      }
    }
  } catch (err) {
    console.error('[wallet] switchToMonad error:', err);
    throw new Error('Failed to switch to Monad Testnet: ' + (err.message || err));
  }
}

async function finishConnect(ethersProvider) {
  provider = ethersProvider;
  signer   = provider.getSigner();
  contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);

  const addr = await signer.getAddress();
  if (walletStatus) walletStatus.textContent = `Connected: ${addr.slice(0,6)}...${addr.slice(-4)} (Monad)`;
  if (startBtn) startBtn.disabled = false;
  if (mintBtn) mintBtn.disabled = false;
}

// ── CONNECT FLOWS ─────────────────────────────────────
async function connectInjected() {
  const injected = getInjectedProvider();
  if (!injected) {
    alert('No injected wallet found. Install MetaMask / Rabby / Backpack etc.');
    return;
  }

  try {
    await injected.request({ method: 'eth_requestAccounts' });
    const ethersProvider = new ethers.providers.Web3Provider(injected, 'any');
    await switchToMonad(ethersProvider);
    await finishConnect(ethersProvider);
  } catch (err) {
    console.error('[wallet] connectInjected failed:', err);
    const code = err?.code;
    if (code === 4001) alert('Connection rejected in wallet.');
    else if (code === -32002) alert('A connection request is already pending—open your wallet popup.');
    else alert('Wallet connection failed: ' + (err?.message || err));
  }
}

// keep global for the HTML safety net
window.connectInjected = connectInjected;

// Placeholder
function connectWalletConnect() { alert('WalletConnect coming soon 🤝'); }

// ── ASSET HELPERS ─────────────────────────────────────
function shuffle(arr) { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } }
function pickRandomImage() { if (!imageList.length) return 'preview.png'; const file = imageList[Math.floor(Math.random() * imageList.length)]; return `https://cdn.jsdelivr.net/gh/${GITHUB_OWNER}/${ASSETS_REPO}@${GITHUB_BRANCH}/${IMAGES_PATH}/${file}`; }
async function loadImageList() {
  const url = `https://cdn.jsdelivr.net/gh/${GITHUB_OWNER}/${ASSETS_REPO}@${GITHUB_BRANCH}/list.json`;
  try { const res = await fetch(url); if (!res.ok) throw new Error(res.status); imageList = await res.json(); }
  catch { alert('⚠️ Could not load asset list.'); }
}
async function preloadImage(url) {
  await new Promise((resolve, reject) => {
    const img = new Image(); img.crossOrigin = 'anonymous';
    img.onload = resolve; img.onerror = reject;
    img.src = url + (url.includes('?') ? '&' : '?') + 'cachebust=' + Date.now();
  });
}

// ── PUZZLE WITH FIXED SLOTS (true lock) ───────────────
// We create 16 fixed "slots". Each piece sits inside a slot.
// Locking = lock the slot, so its piece can never be displaced by later moves.
function makeSlot(i) {
  const slot = document.createElement('div');
  slot.className = 'slot';         // container for a piece
  slot.dataset.slot = i;           // the index this slot represents
  // allow drops on the slot itself
  slot.addEventListener('dragover', (e) => { e.preventDefault(); });
  slot.addEventListener('dragenter', (e) => { e.preventDefault(); });
  slot.addEventListener('drop', (e) => handleDropOnSlot(e, slot));
  return slot;
}

function makePiece(i, imageUrl) {
  const cell = document.createElement('div');
  cell.className = 'cell';
  cell.dataset.piece = i;           // which piece image this is (0..15)
  cell.style.width = '100%';
  cell.style.height = '100%';

  const x = (i % COLS) * 100, y = Math.floor(i / COLS) * 100;
  Object.assign(cell.style, {
    backgroundImage: `url(${imageUrl})`,
    backgroundSize: `${COLS*100}px ${ROWS*100}px`,
    backgroundPosition: `-${x}px -${y}px`
  });

  cell.draggable = true;

  cell.addEventListener('dragstart', (e) => {
    const parentSlot = cell.parentElement;
    if (parentSlot?.classList.contains('locked')) { e.preventDefault(); return; }
    draggedPiece = cell;
    sourceSlot = parentSlot;
    cell.classList.add('dragging');
    e.dataTransfer.setData('text/plain', cell.dataset.piece);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.dropEffect = 'move';
    const ghost = document.createElement('div'); ghost.style.width='1px'; ghost.style.height='1px';
    document.body.appendChild(ghost); e.dataTransfer.setDragImage(ghost,0,0); setTimeout(()=>ghost.remove(),0);
  });

  cell.addEventListener('dragend', () => {
    cell.classList.remove('dragging');
    draggedPiece = null; sourceSlot = null;
  });

  return cell;
}

function handleDropOnSlot(e, targetSlot) {
  e.preventDefault();
  if (!draggedPiece) return;
  if (targetSlot.classList.contains('locked')) return;        // can't drop into locked slot
  if (sourceSlot?.classList.contains('locked')) return;       // can't move out of locked slot

  const occupant = targetSlot.firstElementChild;

  // move dragged piece into targetSlot
  targetSlot.appendChild(draggedPiece);

  // if target had a piece, send it to the sourceSlot (swap)
  if (occupant) sourceSlot.appendChild(occupant);

  // re-evaluate locks for both involved slots
  checkAndLockSlot(targetSlot);
  if (sourceSlot) checkAndLockSlot(sourceSlot);
}

function checkAndLockSlot(slot) {
  const piece = slot.firstElementChild;
  if (!piece) return;
  const correct = Number(slot.dataset.slot) === Number(piece.dataset.piece);
  if (correct) {
    slot.classList.add('locked');
    piece.classList.add('locked');
    piece.draggable = false;
  } else {
    slot.classList.remove('locked');
    piece.classList.remove('locked');
    piece.draggable = true;
  }
}

function checkSolved() {
  const slots = Array.from(puzzleGrid.children);
  return slots.every(s => s.classList.contains('locked'));
}

function buildPuzzle(imageUrl) {
  puzzleGrid.innerHTML = '';

  // 1) create all slots (fixed positions)
  const slots = [];
  for (let i = 0; i < ROWS * COLS; i++) {
    const slot = makeSlot(i);
    slots.push(slot);
    puzzleGrid.appendChild(slot);
  }

  // 2) create all pieces
  const pieces = [];
  for (let i = 0; i < ROWS * COLS; i++) pieces.push(makePiece(i, imageUrl));
  shuffle(pieces);

  // 3) place pieces into slots randomly
  for (let i = 0; i < slots.length; i++) {
    slots[i].appendChild(pieces[i]);
    checkAndLockSlot(slots[i]); // lock if by chance correct initially
  }
}

function startTimer() {
  clearInterval(timerHandle);
  timeLeft = 45;
  timeLeftEl.textContent = timeLeft;
  timerHandle = setInterval(() => {
    timeLeftEl.textContent = --timeLeft;
    if (timeLeft <= 0) {
      clearInterval(timerHandle);
      alert('⏳ Time’s up! This is your masterpiece — mint it or restart.');
      startBtn.disabled = false;
      restartBtn.disabled = false;
    }
  }, 1000);
}

// ── GAME CONTROLS ─────────────────────────────────────
if (restartBtn) {
  restartBtn.addEventListener('click', () => {
    clearInterval(timerHandle);
    puzzleGrid.innerHTML = '';
    timeLeftEl.textContent = '45';
    startBtn.disabled = false;
    mintBtn.disabled = true;
    restartBtn.disabled = true;
  });
}

if (startBtn) {
  startBtn.addEventListener('click', async () => {
    startBtn.disabled = true;
    mintBtn.disabled = false;
    restartBtn.disabled = true;
    if (!imageList.length) await loadImageList();
    const imageUrl = pickRandomImage();
    await preloadImage(imageUrl);
    previewImg.src = imageUrl;
    buildPuzzle(imageUrl);
    startTimer();
  });
}

// ── MINT SNAPSHOT via SERVER API ──────────────────────
async function mintSnapshot() {
  try {
    if (!puzzleGrid.children.length) throw new Error('No puzzle to mint');

    // ensure the image is loaded before snapshot
    const firstSlot = puzzleGrid.firstElementChild;
    const firstPiece = firstSlot?.firstElementChild;
    const bg = firstPiece?.style?.backgroundImage;
    const match = bg && bg.match(/url\("(.*)"\)/);
    const imgUrl = match && match[1];
    if (imgUrl) await preloadImage(imgUrl);

    const canvas = await html2canvas(puzzleGrid, {
      width: 420, height: 420, backgroundColor: '#ffffff',
      useCORS: true, allowTaint: false, imageTimeout: 0, scale: 1, logging: false
    });

    const snapshot = canvas.toDataURL('image/png');
    const apiBase = (location.hostname === 'localhost' || location.hostname === '127.0.0.1') ? 'http://localhost:3000' : '';

    const res = await fetch(`${apiBase}/api/upload`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: snapshot })
    });
    if (!res.ok) { let msg='Upload failed'; try{const j=await res.json(); msg=j.error||msg;}catch{} throw new Error(msg); }

    const upload = await res.json();
    const metaUri = upload.uri;
    if (!metaUri) throw new Error('No metadata URI returned');

    mintBtn.disabled = true;
    const tx = await contract.mintNFT(await signer.getAddress(), metaUri);
    await tx.wait();

    previewImg.src = snapshot;
    alert('🎉 Minted successfully!');
    clearInterval(timerHandle);
    startBtn.disabled = false;
    restartBtn.disabled = false;
  } catch (err) {
    alert('Mint failed: ' + (err?.message || err));
  } finally {
    mintBtn.disabled = false;
  }
}

// ── WIRE UP BUTTONS ───────────────────────────────────
if (mintBtn) mintBtn.addEventListener('click', mintSnapshot);
if (connectInjectedBtn) connectInjectedBtn.addEventListener('click', connectInjected);
if (connectWalletConnectBtn) connectWalletConnectBtn.addEventListener('click', connectWalletConnect);

// ── INIT ──────────────────────────────────────────────
(async function init() {
  await loadImageList();
  if (imageList.length) previewImg.src = pickRandomImage();
})();

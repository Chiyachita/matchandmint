// app.js

// ─── IMPORT NFT.Storage SDK ────────────────────────────────
import { NFTStorage, File } from 'https://cdn.jsdelivr.net/npm/nft.storage/dist/bundle.esm.min.js';

// ─── YOUR NFT.Storage API KEY ──────────────────────────────
// Make sure this is set via your <script> in index.html:
//   <script>window.NFT_STORAGE_KEY = 'YOUR_KEY_HERE';</script>
const NFT_STORAGE_KEY = window.NFT_STORAGE_KEY;
if (!NFT_STORAGE_KEY) {
  alert('❌ Missing NFT_STORAGE_KEY! Please set it in index.html.');
  throw new Error('Missing NFT_STORAGE_KEY');
}

// ─── PICK AN INJECTED WALLET PROVIDER ───────────────────────
function getInjectedProvider() {
  const { ethereum } = window;
  if (!ethereum) return null;
  if (ethereum.providers && Array.isArray(ethereum.providers)) {
    const available = ethereum.providers.map(p => ({
      provider: p,
      name: p.isMetaMask          ? 'MetaMask'
           : p.isCoinbaseWallet    ? 'Coinbase Wallet'
           : p.isBackpack          ? 'Backpack'
           : p.isPhantom           ? 'Phantom'
           : p.isBraveWallet       ? 'Brave Wallet'
           : p.isRabby             ? 'Rabby'
           : p.isTrust             ? 'Trust Wallet'
           : p.isOKExWallet        ? 'OKX Wallet'
           : 'Unknown'
    }));
    const opts = available.map((w,i) => `${i+1}: ${w.name}`).join('\n');
    const choice = prompt(
      `Multiple wallets detected. Choose one:\n${opts}\n\nEnter number or Cancel:`
    );
    const idx = parseInt(choice, 10) - 1;
    return available[idx]?.provider || ethereum.providers[0];
  }
  return ethereum;
}

// ─── CHAIN & CONTRACT CONFIG ───────────────────────────────
const CHAIN_ID        = 10143;
const CHAIN_ID_HEX    = '0x279F';
const CONTRACT_ADDRESS = '0x259C1Da2586295881C18B733Cb738fe1151bD2e5';
const ABI = [
  "function mintNFT(address to, string uri) external returns (uint256)"
];

// ─── ASSET CONFIG (jsDelivr) ───────────────────────────────
const GITHUB_OWNER  = 'Chiyachita';
const ASSETS_REPO   = 'match-and-mint-assets';
const GITHUB_BRANCH = 'main';
const IMAGES_PATH   = 'images';

// ─── UI ELEMENTS ────────────────────────────────────────────
const connectInjectedBtn      = document.getElementById('connectInjectedBtn');
const connectWalletConnectBtn = document.getElementById('connectWalletConnectBtn');
const walletStatus            = document.getElementById('walletStatus');
const startBtn                = document.getElementById('startBtn');
const mintBtn                 = document.getElementById('mintBtn');
const restartBtn              = document.getElementById('restartBtn');
const timeLeftEl              = document.getElementById('timeLeft');
const puzzleGrid              = document.getElementById('puzzleGrid');
const previewImg              = document.getElementById('previewImg');

let provider, signer, contract;
let imageList = [];
let timerHandle, timeLeft = 45;
let dragged = null;
const ROWS = 4, COLS = 4;

// ─── HELPERS ────────────────────────────────────────────────
async function loadImageList() {
  try {
    const url = `https://cdn.jsdelivr.net/gh/${GITHUB_OWNER}/${ASSETS_REPO}@${GITHUB_BRANCH}/list.json`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(res.status);
    imageList = await res.json();
  } catch {
    console.warn('Could not load list.json');
    imageList = [];
  }
}

function pickRandomImage() {
  if (!imageList.length) return 'preview.png';
  const file = imageList[Math.floor(Math.random() * imageList.length)];
  return `https://cdn.jsdelivr.net/gh/${GITHUB_OWNER}/${ASSETS_REPO}@${GITHUB_BRANCH}/${IMAGES_PATH}/${file}`;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function isPuzzleSolved() {
  return Array.from(puzzleGrid.children)
    .every((cell, idx) => +cell.dataset.index === idx);
}

async function switchToMonad(p) {
  const { chainId } = await p.getNetwork();
  if (chainId !== CHAIN_ID) {
    await p.send('wallet_switchEthereumChain', [{ chainId: CHAIN_ID_HEX }]);
  }
}

// ─── CONNECT INJECTED WALLET ────────────────────────────────
async function connectInjected() {
  const injected = getInjectedProvider();
  if (!injected) {
    alert('No injected wallet found.');
    return;
  }
  try {
    await injected.request({ method: 'eth_requestAccounts' });
    const ethProv = new ethers.providers.Web3Provider(injected, 'any');
    await switchToMonad(ethProv);
    finishConnect(ethProv);
  } catch (e) {
    console.error(e);
    alert(e.code === 4001
      ? 'Connection rejected.'
      : 'Failed to connect injected wallet.'
    );
  }
}

// ─── CONNECT WALLETCONNECT ──────────────────────────────────
async function connectWalletConnect() {
  try {
    const wcProv = new WalletConnectProvider.default({
      rpc: { [CHAIN_ID]: 'https://testnet-rpc.monad.xyz' },
      chainId: CHAIN_ID
    });
    await wcProv.enable();
    const ethProv = new ethers.providers.Web3Provider(wcProv, 'any');
    await switchToMonad(ethProv);
    finishConnect(ethProv);
  } catch (e) {
    console.error(e);
    alert('WalletConnect failed.');
  }
}

// ─── POST-CONNECT SETUP ─────────────────────────────────────
async function finishConnect(ethProv) {
  provider = ethProv;
  signer   = provider.getSigner();
  contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);

  const addr = await signer.getAddress();
  walletStatus.textContent = `Connected: ${addr.slice(0,6)}…${addr.slice(-4)} (Monad)`;
  startBtn.disabled = false;

  const raw = provider.provider;
  raw.on('accountsChanged', ([a]) => {
    walletStatus.textContent = `Connected: ${a.slice(0,6)}…${a.slice(-4)} (Monad)`;
  });
  raw.on('chainChanged', cid => {
    if (cid !== CHAIN_ID_HEX) window.location.reload();
  });
  raw.on('disconnect', () => window.location.reload());
}

// ─── BUILD & DRAG PUZZLE ───────────────────────────────────
function buildPuzzle(imgUrl) {
  puzzleGrid.innerHTML = '';
  const cells = [];
  for (let i = 0; i < ROWS*COLS; i++) {
    const c = document.createElement('div');
    c.className     = 'cell';
    c.dataset.index = i;
    const x = (i % COLS)*100, y = Math.floor(i/COLS)*100;
    Object.assign(c.style, {
      backgroundImage:  `url(${imgUrl})`,
      backgroundSize:   `${COLS*100}px ${ROWS*100}px`,
      backgroundPosition:`-${x}px -${y}px`
    });
    c.draggable = true;
    c.addEventListener('dragstart', e => (dragged = e.target));
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
  if (i1 > -1 && i2 > -1) {
    puzzleGrid.insertBefore(dragged, i2 > i1 ? e.target.nextSibling : e.target);
  }
}

// ─── TIMER & RESTART ───────────────────────────────────────
function startTimer() {
  clearInterval(timerHandle);
  timeLeft = 45;
  timeLeftEl.textContent = timeLeft;
  timerHandle = setInterval(() => {
    timeLeftEl.textContent = --timeLeft;
    if (timeLeft <= 0) {
      clearInterval(timerHandle);
      alert(isPuzzleSolved()
        ? '⏰ Solved! Mint your masterpiece!'
        : '⏳ Time’s up! Mint what you have.'
      );
      startBtn.disabled   = false;
      restartBtn.disabled = false;
    }
  }, 1000);
}
restartBtn.addEventListener('click', () => {
  clearInterval(timerHandle);
  puzzleGrid.innerHTML    = '';
  timeLeftEl.textContent  = '45';
  startBtn.disabled       = false;
  mintBtn.disabled        = true;
  restartBtn.disabled     = true;
});

// ─── START GAME ───────────────────────────────────────────
startBtn.addEventListener('click', async () => {
  startBtn.disabled     = true;
  mintBtn.disabled      = false;
  restartBtn.disabled   = true;
  if (!imageList.length) await loadImageList();
  const img = pickRandomImage();
  previewImg.src = img;
  buildPuzzle(img);
  startTimer();
});

// ─── MINT SNAPSHOT → NFT.Storage → ON-CHAIN ───────────────
mintBtn.addEventListener('click', async () => {
  try {
    // 1) snapshot
    const canvas = await html2canvas(puzzleGrid);
    const blob   = await new Promise(r => canvas.toBlob(r,'image/png'));

    // 2) pin & store via SDK
    const client   = new NFTStorage({ token: NFT_STORAGE_KEY });
    const metadata = await client.store({
      name: `MatchAndMintPuzzle #${Date.now()}`,
      description: 'Puzzle snapshot on Monad Testnet',
      image: new File([blob], 'snapshot.png', { type: 'image/png' })
    });

    // 3) mint on-chain
    const uri = metadata.url.replace('ipfs://', 'https://ipfs.io/ipfs/');
    const tx  = await contract.mintNFT(await signer.getAddress(), uri);
    await tx.wait();

    // 4) feedback
    previewImg.src   = canvas.toDataURL();
    alert('🎉 Minted! NFT is live.');
    clearInterval(timerHandle);
    mintBtn.disabled    = true;
    startBtn.disabled   = false;
    restartBtn.disabled = false;
  } catch (err) {
    console.error('Mint error:', err);
    alert('Mint failed: ' + err.message);
  }
});

// ─── HOOKUP & INIT ─────────────────────────────────────────
connectInjectedBtn.addEventListener('click', connectInjected);
connectWalletConnectBtn.addEventListener('click', connectWalletConnect);

(async function init() {
  await loadImageList();
  if (imageList.length) previewImg.src = pickRandomImage();
})();

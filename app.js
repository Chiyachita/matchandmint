// ── CONFIG ─────────────────────────────────────────────────
const CHAIN_ID     = 10143;
const CHAIN_ID_HEX = '0x279F';
const CONTRACT_ADDRESS = '0x259C1Da2586295881C18B733Cb738fe1151bD2e5';
const ABI = [
  "function mintNFT(address to, string uri) external returns (uint256)",
];

// GitHub CDN for puzzle pieces
const GITHUB_OWNER  = 'Chiyachita';
const ASSETS_REPO   = 'match-and-mint-assets';
const GITHUB_BRANCH = 'main';
const IMAGES_PATH   = 'images';

// NFT.Storage client
const NFT_STORAGE_KEY = window.NFT_STORAGE_KEY;  // from inline <script> in HTML
if (!NFT_STORAGE_KEY) throw new Error('Missing window.NFT_STORAGE_KEY');

// ── UI ──────────────────────────────────────────────────────
const connectInjectedBtn      = document.getElementById('connectInjectedBtn');
const connectWalletConnectBtn = document.getElementById('connectWalletConnectBtn');
const walletStatus            = document.getElementById('walletStatus');
const startBtn                = document.getElementById('startBtn');
const mintBtn                 = document.getElementById('mintBtn');
const restartBtn              = document.getElementById('restartBtn');
const timeLeftEl              = document.getElementById('timeLeft');
const puzzleGrid              = document.getElementById('puzzleGrid');
const previewImg              = document.querySelector('.preview img');

// ── STATE ───────────────────────────────────────────────────
let provider, signer, contract;
let imageList = [];
let timerHandle, timeLeft = 45;
let dragged = null;
const ROWS = 4, COLS = 4;

// ── HELPERS ─────────────────────────────────────────────────
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

async function loadImageList() {
  const url = `https://cdn.jsdelivr.net/gh/${GITHUB_OWNER}/${ASSETS_REPO}@${GITHUB_BRANCH}/list.json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Couldn’t fetch list.json');
  imageList = await res.json();
}

function pickRandomImage() {
  if (!imageList.length) return 'preview.png';
  const file = imageList[Math.floor(Math.random() * imageList.length)];
  return `https://cdn.jsdelivr.net/gh/${GITHUB_OWNER}/${ASSETS_REPO}@${GITHUB_BRANCH}/${IMAGES_PATH}/${file}`;
}

function isPuzzleSolved() {
  return Array.from(puzzleGrid.children)
    .every((c,i) => +c.dataset.index === i);
}

async function switchToMonad(eVendor) {
  const { chainId } = await eVendor.getNetwork();
  if (chainId !== CHAIN_ID) {
    await eVendor.send('wallet_switchEthereumChain', [{ chainId: CHAIN_ID_HEX }]);
  }
}

// ── CONNECT INJECTED ───────────────────────────────────────
async function connectInjected() {
  const winEth = window.ethereum;
  if (!winEth) {
    alert('No injected wallet found');
    return;
  }

  // handle multiple injected providers
  const chosen = Array.isArray(winEth.providers)
    ? (winEth.providers.find(p=>p.isMetaMask)||winEth.providers[0])
    : winEth;

  await chosen.request({ method: 'eth_requestAccounts' });
  const eProv = new ethers.providers.Web3Provider(chosen, 'any');
  await switchToMonad(eProv);
  finishConnect(eProv);
}

// ── CONNECT WC ─────────────────────────────────────────────
async function connectWalletConnect() {
  const wc = new WalletConnectProvider.default({
    rpc: { [CHAIN_ID]: 'https://testnet-rpc.monad.xyz' },
    chainId: CHAIN_ID
  });
  await wc.enable();
  const eProv = new ethers.providers.Web3Provider(wc, 'any');
  await switchToMonad(eProv);
  finishConnect(eProv);
}

// ── AFTER CONNECT ──────────────────────────────────────────
async function finishConnect(eProv) {
  provider = eProv;
  signer   = provider.getSigner();
  contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);

  const addr = await signer.getAddress();
  walletStatus.textContent = `Connected: ${addr.slice(0,6)}…${addr.slice(-4)}`;
  startBtn.disabled = false;

  provider.provider.on('accountsChanged', ([a]) => {
    walletStatus.textContent = `Connected: ${a.slice(0,6)}…${a.slice(-4)}`;
  });
  provider.provider.on('chainChanged', c=>{
    if (c!==CHAIN_ID_HEX) location.reload();
  });
  provider.provider.on('disconnect', ()=>location.reload());
}

// ── BUILD GRID ──────────────────────────────────────────────
function buildPuzzle(url) {
  puzzleGrid.innerHTML = '';
  const cells = [];
  for (let i=0; i<ROWS*COLS; i++) {
    const c = document.createElement('div');
    c.className     = 'cell';
    c.dataset.index = i;
    const x = (i%COLS)*100, y = Math.floor(i/COLS)*100;
    Object.assign(c.style, {
      backgroundImage: `url(${url})`,
      backgroundSize:  `${COLS*100}px ${ROWS*100}px`,
      backgroundPosition: `-${x}px -${y}px`
    });
    c.draggable = true;
    c.addEventListener('dragstart', e=> dragged = e.target);
    c.addEventListener('dragover', e=> e.preventDefault());
    c.addEventListener('drop', onDrop);
    cells.push(c);
  }
  shuffle(cells);
  cells.forEach(c=> puzzleGrid.appendChild(c));
}

function onDrop(e) {
  e.preventDefault();
  if (!dragged) return;
  const kids = Array.from(puzzleGrid.children);
  const i1 = kids.indexOf(dragged), i2 = kids.indexOf(e.target);
  if (i1>-1 && i2>-1) {
    puzzleGrid.insertBefore(dragged, i2>i1? e.target.nextSibling : e.target);
  }
}

// ── TIMER & RESTART ────────────────────────────────────────
function startTimer() {
  clearInterval(timerHandle);
  timeLeft = 45;
  timeLeftEl.textContent = 45;
  timerHandle = setInterval(()=>{
    timeLeftEl.textContent = --timeLeft;
    if (timeLeft<=0) {
      clearInterval(timerHandle);
      alert(isPuzzleSolved()
        ? 'Time’s up—but you solved it! Mint away 🌟'
        : 'Time’s up—you can still mint your masterpiece or restart.'
      );
      startBtn.disabled   = false;
      restartBtn.disabled = false;
    }
  },1000);
}

restartBtn.onclick = ()=>{
  clearInterval(timerHandle);
  puzzleGrid.innerHTML = '';
  timeLeftEl.textContent = 45;
  startBtn.disabled   = false;
  mintBtn.disabled    = true;
  restartBtn.disabled = true;
};

// ── GAME FLOW ──────────────────────────────────────────────
startBtn.onclick = async ()=>{
  startBtn.disabled = true;
  mintBtn.disabled  = false;
  restartBtn.disabled = true;
  if (!imageList.length) await loadImageList();
  const img = pickRandomImage();
  buildPuzzle(img);
  previewImg.src = img;
  startTimer();
};

// ── MINT → NFT.STORAGE → CHAIN ────────────────────────────
async function mintSnapshot() {
  try {
    // 1) Snapshot
    const canvas   = await html2canvas(puzzleGrid);
    const dataUrl  = canvas.toDataURL('image/png');
    const blob     = await (await fetch(dataUrl)).blob();

    // 2) Upload via NFT.Storage
    const form    = new FormData();
    form.append('file', blob);
    const pinRes  = await fetch('https://api.nft.storage/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${NFT_STORAGE_KEY}` },
      body: form
    });
    if (!pinRes.ok) throw new Error(`NFT.Storage failed ${pinRes.status}`);
    const { value } = await pinRes.json();
    const cid       = value.cid;

    // 3) Mint on chain
    const uri = `ipfs://${cid}`;
    const tx  = await contract.mintNFT(await signer.getAddress(), uri);
    await tx.wait();

    // 4) Done
    previewImg.src   = dataUrl;
    alert('🎉 Minted! See it on-chain in a minute.');
    clearInterval(timerHandle);
    mintBtn.disabled = true;
    startBtn.disabled = false;
    restartBtn.disabled = false;

  } catch (err) {
    console.error(err);
    alert('Mint failed: ' + err.message);
  }
}

mintBtn.onclick               = mintSnapshot;
connectInjectedBtn.onclick    = connectInjected;
connectWalletConnectBtn.onclick = connectWalletConnect;

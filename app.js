// app.js

// ── HOOK BACKPACK (and similar) INTO window.ethereum ───────────
// Some wallets (e.g. Backpack) inject as window.injected.ethereum
// We alias it onto window.ethereum so our existing EIP-1193 code just works.
if (window.injected?.ethereum && !window.ethereum) {
  window.ethereum = window.injected.ethereum;
}

// ── CHAIN CONFIG ──────────────────────────────────────────
const CHAIN_ID     = 10143;
const CHAIN_ID_HEX = '0x279F';

// ── CONTRACT & ASSETS CONFIG ──────────────────────────────
const CONTRACT_ADDRESS = '0x259C1Da2586295881C18B733Cb738fe1151bD2e5';
const ABI = [
  "function mintNFT(address to, string uri) external returns (uint256)",
  "function ownerOf(uint256 tokenId) view returns (address)"
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
    .every((cell, idx) => parseInt(cell.dataset.index, 10) === idx);
}

async function switchToMonad(ethersProvider) {
  const { chainId } = await ethersProvider.getNetwork();
  if (chainId !== CHAIN_ID) {
    await ethersProvider.send('wallet_switchEthereumChain', [{ chainId: CHAIN_ID_HEX }]);
  }
}

// ── CONNECT INJECTED WALLET ───────────────────────────────
async function connectInjected() {
  if (!window.ethereum) {
    alert('No injected wallet found! Try WalletConnect.');
    return;
  }
  try {
    await window.ethereum.request({ method: 'eth_requestAccounts' });
    const ethersProvider = new ethers.providers.Web3Provider(window.ethereum, 'any');
    await switchToMonad(ethersProvider);
    finishConnect(ethersProvider);
  } catch (err) {
    console.error('Injected connect failed', err);
    alert('Failed to connect injected wallet.');
  }
}

// ── CONNECT WALLETCONNECT ──────────────────────────────────
async function connectWalletConnect() {
  try {
    const wcProvider = new WalletConnectProvider.default({
      rpc: { [CHAIN_ID]: 'https://testnet-rpc.monad.xyz' },
      chainId: CHAIN_ID
    });
    await wcProvider.enable();
    const ethersProvider = new ethers.providers.Web3Provider(wcProvider, 'any');
    await switchToMonad(ethersProvider);
    finishConnect(ethersProvider);
  } catch (err) {
    console.error('WalletConnect failed', err);
    alert('Failed to connect via WalletConnect.');
  }
}

// ── POST-CONNECT SETUP ─────────────────────────────────────
async function finishConnect(ethersProvider) {
  provider = ethersProvider;
  signer   = provider.getSigner();
  contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);

  const addr = await signer.getAddress();
  walletStatus.textContent = `Connected: ${addr.slice(0,6)}...${addr.slice(-4)} (Monad)`;
  startBtn.disabled = false;

  provider.provider.on('accountsChanged', ([a]) => {
    walletStatus.textContent = `Connected: ${a.slice(0,6)}...${a.slice(-4)} (Monad)`;
  });
  provider.provider.on('chainChanged', cid => {
    if (cid !== CHAIN_ID_HEX) window.location.reload();
  });
  provider.provider.on('disconnect', () => window.location.reload());
}

// ── BUILD & DRAG-DROP PUZZLE ──────────────────────────────
function buildPuzzle(imageUrl) {
  puzzleGrid.innerHTML = '';
  const cells = [];
  for (let i = 0; i < ROWS * COLS; i++) {
    const cell = document.createElement('div');
    cell.className     = 'cell';
    cell.dataset.index = i;
    const x = (i % COLS) * 100, y = Math.floor(i / COLS) * 100;
    Object.assign(cell.style, {
      backgroundImage: `url(${imageUrl})`,
      backgroundSize: `${COLS*100}px ${ROWS*100}px`,
      backgroundPosition: `-${x}px -${y}px`
    });
    cell.draggable    = true;
    cell.addEventListener('dragstart', e => (dragged = e.target));
    cell.addEventListener('dragover', e => e.preventDefault());
    cell.addEventListener('drop', onDrop);
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

// ── TIMER & RESTART ────────────────────────────────────────
function startTimer() {
  clearInterval(timerHandle);
  timeLeft = 45;
  timeLeftEl.textContent = timeLeft;
  timerHandle = setInterval(() => {
    timeLeftEl.textContent = --timeLeft;
    if (timeLeft <= 0) {
      clearInterval(timerHandle);
      alert(
        isPuzzleSolved()
          ? '⏰ Time’s up—but you nailed it! Mint your perfect masterpiece 🌟'
          : '⏳ Time’s up! This is your masterpiece—feel free to mint or Restart.'
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

// ── START GAME ────────────────────────────────────────────
startBtn.addEventListener('click', async () => {
  startBtn.disabled     = true;
  mintBtn.disabled      = false;
  restartBtn.disabled   = true;
  if (!imageList.length) await loadImageList();
  const imageUrl = pickRandomImage();
  buildPuzzle(imageUrl);
  previewImg.src = imageUrl;
  startTimer();
});

// ── MINT SNAPSHOT → NFT.STORAGE → ON-CHAIN ────────────────
async function mintSnapshot() {
  try {
    // 1) snapshot
    const canvas   = await html2canvas(puzzleGrid);
    const snapshot = canvas.toDataURL('image/png');

    // 2) pin to NFT.Storage
    const key = process.env.PUBLIC_NFT_STORAGE_KEY;
    if (!key) throw new Error('Missing PUBLIC_NFT_STORAGE_KEY');
    const uploadResp = await fetch('https://api.nft.storage/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Authorization': `Bearer ${key}`
      },
      body: await (await fetch(snapshot)).arrayBuffer()
    });
    if (!uploadResp.ok) throw new Error(`NFT.Storage returned ${uploadResp.status}`);
    const { value: { cid, data } } = await uploadResp.json();

    // 3) assemble metadata JSON and on-chain URI
    const metadata = {
      name: `MatchAndMintPuzzle #${await contract.nextTokenId()}`,
      description: 'Your puzzle snapshot.',
      image: `ipfs://${cid}`,
      properties: {
        files: [{ uri: `ipfs://${cid}`, type: 'image/png' }]
      }
    };
    const metaBlob = new Blob([JSON.stringify(metadata)], { type: 'application/json' });
    const metaUpload = await fetch('https://api.nft.storage/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`
      },
      body: metaBlob
    });
    if (!metaUpload.ok) throw new Error(`NFT.Storage returned ${metaUpload.status} on metadata`);
    const { value: { cid: metaCid } } = await metaUpload.json();
    const uri = `https://ipfs.io/ipfs/${metaCid}`;

    // 4) mint on-chain
    const tx  = await contract.mintNFT(await signer.getAddress(), uri);
    await tx.wait();

    // 5) show preview & reset
    previewImg.src      = snapshot;
    alert('🎉 Minted! Your NFT is live.');
    clearInterval(timerHandle);
    mintBtn.disabled    = true;
    startBtn.disabled   = false;
    restartBtn.disabled = false;

  } catch (err) {
    console.error('Mint error:', err);
    alert('Mint failed: ' + err.message);
  }
}

mintBtn.addEventListener('click', mintSnapshot);
connectInjectedBtn.addEventListener('click', connectInjected);
connectWalletConnectBtn.addEventListener('click', connectWalletConnect);

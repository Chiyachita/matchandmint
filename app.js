// app.js

// ── CONFIG ──────────────────────────────────────────────────
const CONTRACT_ADDRESS = '0xCd9926fc1A944262c213Cc1c4c03844D7A842892';
const ABI = [ /* paste your FULL ABI here, including mintNFT() */ ];

// your Assets repo info
const GITHUB_OWNER  = 'Chiyachita';
const ASSETS_REPO   = 'match-and-mint-assets';
const GITHUB_BRANCH = 'main';
const IMAGES_PATH   = 'images';

// ── UI ELEMENTS & STATE ─────────────────────────────────────
const connectBtn   = document.getElementById('connectBtn');
const walletStatus = document.getElementById('walletStatus');
const startBtn     = document.getElementById('startBtn');
const mintBtn      = document.getElementById('mintBtn');
const timeLeftEl   = document.getElementById('timeLeft');
const puzzleGrid   = document.getElementById('puzzleGrid');
const previewImg   = document.querySelector('.preview img');

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
  const url = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${ASSETS_REPO}/${GITHUB_BRANCH}/${IMAGES_PATH}/list.json`;
  console.log('⏳ Fetching list.json →', url);
  const res = await fetch(url);
  imageList = await res.json();
  console.log('✅ imageList =', imageList);
}

function pickRandomImage() {
  if (!imageList.length) return 'preview.png';
  const file = imageList[Math.floor(Math.random() * imageList.length)];
  const imageUrl = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${ASSETS_REPO}/${GITHUB_BRANCH}/${IMAGES_PATH}/${file}`;
  console.log('🧩 pickRandomImage →', imageUrl);
  return imageUrl;
}

// ── WALLET & CONTRACT ─────────────────────────────────────
async function connectWallet() {
  if (!window.ethereum) {
    alert('No Web3 wallet found—install MetaMask!');
    return;
  }
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: '0x279F' }], // 10143 in hex
    });
  } catch (err) {
    if (err.code === 4902) {
      try {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: '0x279F',
            chainName: 'Monad Testnet',
            nativeCurrency: { name: 'Monad Testnet', symbol: 'MON', decimals: 18 },
            rpcUrls: ['https://testnet-rpc.monad.xyz'],
            blockExplorerUrls: ['https://testnet.monadexplorer.com'],
          }],
        });
      } catch (addErr) {
        console.error('Add chain error:', addErr);
        alert('Cannot add Monad Testnet to wallet.');
        return;
      }
    } else {
      console.error('Switch chain error:', err);
      alert('Failed to switch to Monad Testnet.');
      return;
    }
  }

  await window.ethereum.request({ method: 'eth_requestAccounts' });
  provider = new ethers.providers.Web3Provider(window.ethereum);
  signer   = provider.getSigner();
  contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);

  const addr = await signer.getAddress();
  walletStatus.textContent = `Connected: ${addr.slice(0,6)}...${addr.slice(-4)}`;
  startBtn.disabled = false;
}
connectBtn.addEventListener('click', connectWallet);

// ── PUZZLE BUILD & DRAG‐DROP ──────────────────────────────
function buildPuzzle(imageUrl) {
  console.log('🧩 Building puzzle with', imageUrl);
  puzzleGrid.innerHTML = '';
  const cells = [];
  for (let i = 0; i < ROWS * COLS; i++) {
    const cell = document.createElement('div');
    cell.className = 'cell';
    const x = (i % COLS) * 100;
    const y = Math.floor(i / COLS) * 100;
    Object.assign(cell.style, {
      backgroundImage: `url(${imageUrl})`,
      backgroundSize: `${COLS*100}px ${ROWS*100}px`,
      backgroundPosition: `-${x}px -${y}px`
    });
    cell.draggable = true;
    cell.addEventListener('dragstart', e => dragged = e.target);
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

// ── TIMER ─────────────────────────────────────────────────
function startTimer() {
  clearInterval(timerHandle);
  timeLeft = 45;
  timeLeftEl.textContent = timeLeft;
  timerHandle = setInterval(() => {
    timeLeftEl.textContent = --timeLeft;
    if (timeLeft <= 0) {
      clearInterval(timerHandle);
      alert('Time’s up! Hit Mint to finalize 🌟');
    }
  }, 1000);
}

// ── START GAME ───────────────────────────────────────────
startBtn.addEventListener('click', async () => {
  startBtn.disabled = true;
  mintBtn.disabled  = false;
  if (!imageList.length) await loadImageList();
  buildPuzzle(pickRandomImage());
  startTimer();
});

// ── MINT SNAPSHOT → NETLIFY FN → ON‐CHAIN ─────────────────
async function mintSnapshot() {
  try {
    const canvas   = await html2canvas(puzzleGrid);
    const snapshot = canvas.toDataURL('image/png');

    // secure pin via our Netlify Function
    const pinRes = await fetch('/.netlify/functions/pinata', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ snapshot })
    });
    if (!pinRes.ok) throw new Error('Pinata function failed');
    const { metadataCid } = await pinRes.json();

    // mint on‐chain
    const uri = `ipfs://${metadataCid}`;
    const tx  = await contract.mintNFT(await signer.getAddress(), uri);
    await tx.wait();

    // show preview & reset
    previewImg.src = snapshot;
    alert('Minted! 🎉 Your NFT is live.');
    clearInterval(timerHandle);
    mintBtn.disabled = true;
    startBtn.disabled = false;

  } catch (err) {
    console.error(err);
    alert('Error: ' + err.message);
  }
}
mintBtn.addEventListener('click', mintSnapshot);

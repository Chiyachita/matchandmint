// app.js

// ── CONFIG ──────────────────────────────────────────────────
const CONTRACT_ADDRESS = '0xCd9926fc1A944262c213Cc1c4c03844D7A842892';
const ABI = [ /* your FULL ABI here, including mintNFT() */ ];

// Assets repo info
const GITHUB_OWNER  = 'Chiyachita';
const ASSETS_REPO   = 'match-and-mint-assets';
const GITHUB_BRANCH = 'main';
const IMAGES_PATH   = 'images';

// UI elements + state
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

// Web3Modal setup
const providerOptions = {
  walletconnect: {
    package: WalletConnectProvider,
    options: {
      rpc: { 10143: 'https://testnet-rpc.monad.xyz' },
      chainId: 10143
    }
  }
};

const web3Modal = new Web3Modal({
  cacheProvider: false,
  providerOptions
});

// Helpers
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

async function loadImageList() {
  const url = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${ASSETS_REPO}/${GITHUB_BRANCH}/${IMAGES_PATH}/list.json`;
  console.log('Fetching list.json →', url);
  const res = await fetch(url);
  imageList = await res.json();
  console.log('imageList =', imageList);
}

function pickRandomImage() {
  if (!imageList.length) return 'preview.png';
  const file = imageList[Math.floor(Math.random() * imageList.length)];
  const url = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${ASSETS_REPO}/${GITHUB_BRANCH}/${IMAGES_PATH}/${file}`;
  console.log('pickRandomImage →', url);
  return url;
}

// Connect Wallet
async function connectWallet() {
  try {
    const instance = await web3Modal.connect();
    provider = new ethers.providers.Web3Provider(instance);
    const net = await provider.getNetwork();
    if (net.chainId !== 10143) {
      await provider.send('wallet_switchEthereumChain', [{ chainId: '0x279F' }]);
    }
    signer = provider.getSigner();
    contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
    const addr = await signer.getAddress();
    walletStatus.textContent = `Connected: ${addr.slice(0,6)}...${addr.slice(-4)}`;
    startBtn.disabled = false;
    instance.on('accountsChanged', ([a]) => walletStatus.textContent = `Connected: ${a.slice(0,6)}...${a.slice(-4)}`);
    instance.on('chainChanged', () => location.reload());
    instance.on('disconnect', () => location.reload());
  } catch (err) {
    console.error('Connection failed', err);
    alert('Could not connect wallet');
  }
}

connectBtn.addEventListener('click', connectWallet);

// Build Puzzle
function buildPuzzle(imageUrl) {
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
    cell.addEventListener('drop', swapCells);
    cells.push(cell);
  }
  shuffle(cells);
  cells.forEach(c => puzzleGrid.appendChild(c));
}

function swapCells(e) {
  e.preventDefault();
  if (!dragged) return;
  const kids = Array.from(puzzleGrid.children);
  const i1 = kids.indexOf(dragged), i2 = kids.indexOf(e.target);
  if (i1 > -1 && i2 > -1) {
    puzzleGrid.insertBefore(dragged, i2 > i1 ? e.target.nextSibling : e.target);
  }
}

// Timer
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

// Start Game
startBtn.addEventListener('click', async () => {
  startBtn.disabled = true;
  mintBtn.disabled  = false;
  if (!imageList.length) await loadImageList();
  buildPuzzle(pickRandomImage());
  startTimer();
});

// Mint Snapshot
async function mintSnapshot() {
  try:
    const canvas = await html2canvas(puzzleGrid)
    const snapshot = canvas.toDataURL("image/png")
    const resp = await fetch("/.netlify/functions/pinata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ snapshot })
    })
    if (!resp.ok) throw new Error("Pinata function failed")
    const {metadataCid} = await resp.json()
    const uri = `ipfs://${metadataCid}`
    const tx = await contract.mintNFT(await signer.getAddress(), uri)
    await tx.wait()
    previewImg.src = snapshot
    alert("Minted! 🎉 Your NFT is live.")
    clearInterval(timerHandle)
    mintBtn.disabled = true
    startBtn.disabled = false
  except (err) {
    console.error(err)
    alert("Error: " + err.message)
  }
}

mintBtn.addEventListener("click", mintSnapshot)

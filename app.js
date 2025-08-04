// app.js

// ── CHAIN CONFIG ──────────────────────────────────────────
const CHAIN_ID     = 10143;      // decimal
const CHAIN_ID_HEX = '0x279F';   // hex for wallet_switch

// ── CONTRACT & ASSETS CONFIG ──────────────────────────────
const CONTRACT_ADDRESS = '0x259C1Da2586295881C18B733Cb738fe1151bD2e5';
const ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function nextTokenId() view returns (uint256)",
  "function mintNFT(address to, string uri) external returns (uint256)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "function ownerOf(uint256 tokenId) view returns (address)"
];

const GITHUB_OWNER  = 'Chiyachita';
const ASSETS_REPO   = 'match-and-mint-assets';
const GITHUB_BRANCH = 'main';
const IMAGES_PATH   = 'images';

// ── UI ELEMENTS & STATE ─────────────────────────────────────
const connectBtn   = document.getElementById('connectBtn');
const walletStatus = document.getElementById('walletStatus');
const startBtn     = document.getElementById('startBtn');
const mintBtn      = document.getElementById('mintBtn');
const restartBtn   = document.getElementById('restartBtn');
const timeLeftEl   = document.getElementById('timeLeft');
const puzzleGrid   = document.getElementById('puzzleGrid');
const previewImg   = document.querySelector('.preview img');

let provider, signer, contract, web3Modal;
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

// ── WEB3MODAL INIT ─────────────────────────────────────────
async function initWeb3Modal() {
  const providerOptions = {
    walletconnect: {
      package: WalletConnectProvider,
      options: {
        rpc: { [CHAIN_ID]: 'https://testnet-rpc.monad.xyz' },
        chainId: CHAIN_ID
      }
    }
  };
  web3Modal = new Web3Modal({
    cacheProvider: false,
    providerOptions
  });
}

// ── CONNECT MULTI-WALLET + FORCE MONAD TESTNET ─────────────
async function connectWallet() {
  try {
    const instance = await web3Modal.connect();
    const ethersProvider = new ethers.providers.Web3Provider(instance, 'any');
    const network = await ethersProvider.getNetwork();

    if (network.chainId !== CHAIN_ID) {
      await ethersProvider.send('wallet_switchEthereumChain',
        [{ chainId: CHAIN_ID_HEX }]);
    }

    provider = ethersProvider;
    signer   = provider.getSigner();
    contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);

    const addr = await signer.getAddress();
    walletStatus.textContent = `Connected: ${addr.slice(0,6)}...${addr.slice(-4)} (Monad)`;
    startBtn.disabled = false;

    instance.on('accountsChanged', ([a]) => {
      walletStatus.textContent = `Connected: ${a.slice(0,6)}...${a.slice(-4)} (Monad)`;
    });
    instance.on('chainChanged', cid => {
      if (cid !== CHAIN_ID_HEX) window.location.reload();
    });
    instance.on('disconnect', () => window.location.reload());

  } catch (err) {
    console.error('Connection failed', err);
    alert('Could not connect wallet.');
  }
}

// ── BUILD & DRAG-DROP PUZZLE ───────────────────────────────
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
    puzzleGrid.insertBefore(dragged,
      i2 > i1 ? e.target.nextSibling : e.target);
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
      if (isPuzzleSolved()) {
        alert('⏰ Time’s up—but you nailed it! Mint your perfect masterpiece 🌟');
      } else {
        alert(
          '⏳ Time’s up! This is your masterpiece—an arrangement uniquely yours. ' +
          'Feel free to mint it or hit “Restart” to try again.'
        );
      }
      startBtn.disabled   = false;
      restartBtn.disabled = false;
    }
  }, 1000);
}

restartBtn.addEventListener('click', () => {
  clearInterval(timerHandle);
  puzzleGrid.innerHTML  = '';
  timeLeftEl.textContent = '45';
  startBtn.disabled     = false;
  mintBtn.disabled      = true;
  restartBtn.disabled   = true;
});

// ── START GAME ───────────────────────────────────────────
startBtn.addEventListener('click', async () => {
  startBtn.disabled     = true;
  mintBtn.disabled      = false;
  restartBtn.disabled   = true;
  if (!imageList.length) await loadImageList();
  buildPuzzle(pickRandomImage());
  startTimer();
});

// ── MINT SNAPSHOT → PINATA → ON-CHAIN ─────────────────────
async function mintSnapshot() {
  try {
    const canvas   = await html2canvas(puzzleGrid);
    const snapshot = canvas.toDataURL('image/png');
    const resp     = await fetch('/.netlify/functions/pinata', {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({ snapshot })
    });
    if (!resp.ok) throw new Error('Pinata function failed');
    const { metadataCid } = await resp.json();

    const uri = `ipfs://${metadataCid}`;
    const tx  = await contract.mintNFT(
      await signer.getAddress(),
      uri
    );
    await tx.wait();

    previewImg.src      = snapshot;
    alert('Minted! 🎉 Your NFT is live.');
    clearInterval(timerHandle);
    mintBtn.disabled    = true;
    startBtn.disabled   = false;
    restartBtn.disabled = false;

  } catch (err) {
    console.error(err);
    alert('Error: ' + err.message);
  }
}
mintBtn.addEventListener('click', mintSnapshot);

// ── INIT ───────────────────────────────────────────────────
window.addEventListener('load', async () => {
  await initWeb3Modal();
  connectBtn.addEventListener('click', connectWallet);
});

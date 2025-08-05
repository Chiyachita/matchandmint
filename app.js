// ── CONFIG ────────────────────────────────────────────────
// GitHub assets
const GITHUB_OWNER  = 'Chiyachita';
const ASSETS_REPO   = 'match-and-mint-assets';
const GITHUB_BRANCH = 'main';
const IMAGES_PATH   = 'images';

// Ethers / chain
const CHAIN_ID     = 10143;
const CHAIN_ID_HEX = '0x279F';
const CONTRACT_ADDRESS = '0x259C1Da2586295881C18B733Cb738fe1151bD2e5';
const ABI = [
  "function mintNFT(address to, string uri) external returns (uint256)"
];

// ── UI ELEMENTS ───────────────────────────────────────────
const connectBtn   = document.getElementById('connectInjectedBtn');
const startBtn     = document.getElementById('startBtn');
const mintBtn      = document.getElementById('mintBtn');
const restartBtn   = document.getElementById('restartBtn');
const walletStatus = document.getElementById('walletStatus');
const timeLeftEl   = document.getElementById('timeLeft');
const puzzleGrid   = document.getElementById('puzzleGrid');
const referenceImg = document.getElementById('referenceImg');

let imageList = [];
let provider, signer, contract;
let timerHandle, timeLeft = 45;
let dragged = null;
const ROWS = 4, COLS = 4;

// ── LOAD IMAGE LIST ───────────────────────────────────────
async function loadImageList() {
  const url = `https://cdn.jsdelivr.net/gh/${GITHUB_OWNER}/${ASSETS_REPO}@${GITHUB_BRANCH}/list.json`;
  try {
    const res = await fetch(url);
    imageList = await res.json();
  } catch (e) {
    console.error('Failed to load list.json:', e);
    imageList = [];
  }
}

// ── PICK RANDOM IMAGE URL ─────────────────────────────────
function pickRandomImage() {
  if (!imageList.length) return 'preview.png';
  const file = imageList[Math.floor(Math.random() * imageList.length)];
  return `https://cdn.jsdelivr.net/gh/${GITHUB_OWNER}/${ASSETS_REPO}@${GITHUB_BRANCH}/${IMAGES_PATH}/${file}`;
}

// ── CONNECT WALLET ─────────────────────────────────────────
connectBtn.onclick = async () => {
  if (!window.ethereum) return alert('Install a Web3 wallet!');
  await window.ethereum.request({ method: 'eth_requestAccounts' });
  provider = new ethers.providers.Web3Provider(window.ethereum, 'any');
  await provider.send('wallet_switchEthereumChain', [{ chainId: CHAIN_ID_HEX }]);
  signer   = provider.getSigner();
  contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
  const addr = await signer.getAddress();
  walletStatus.textContent = `Connected: ${addr.slice(0,6)}…${addr.slice(-4)}`;
  startBtn.disabled = false;
};

// ── SHUFFLE HELPER ─────────────────────────────────────────
function shuffle(arr) {
  for (let i = arr.length-1; i>0; i--) {
    const j = Math.floor(Math.random()*(i+1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

// ── BUILD THE 4×4 GRID ────────────────────────────────────
function buildPuzzle(imageUrl) {
  puzzleGrid.innerHTML = '';
  const cells = [];
  for (let i = 0; i < ROWS*COLS; i++) {
    const cell = document.createElement('div');
    cell.className     = 'cell';
    cell.dataset.index = i;
    const x = (i % COLS)*100, y = Math.floor(i / COLS)*100;
    Object.assign(cell.style, {
      backgroundImage: `url(${imageUrl})`,
      backgroundSize:  `${COLS*100}px ${ROWS*100}px`,
      backgroundPosition: `-${x}px -${y}px`
    });
    cell.draggable = true;
    cell.addEventListener('dragstart', e => (dragged = e.target));
    cell.addEventListener('dragover',  e => e.preventDefault());
    cell.addEventListener('drop',      onDrop);
    cells.push(cell);
  }
  shuffle(cells);
  cells.forEach(c => puzzleGrid.appendChild(c));

  // show reference image uncut
  referenceImg.src = imageUrl;
}

// ── DROP HANDLER ──────────────────────────────────────────
function onDrop(e) {
  e.preventDefault();
  if (!dragged) return;
  const kids = Array.from(puzzleGrid.children);
  const i1 = kids.indexOf(dragged), i2 = kids.indexOf(e.target);
  puzzleGrid.insertBefore(dragged, i2 > i1 ? e.target.nextSibling : e.target);
}

// ── TIMER LOGIC ───────────────────────────────────────────
function startTimer() {
  clearInterval(timerHandle);
  timeLeft = 45;
  timeLeftEl.textContent = timeLeft;
  timerHandle = setInterval(() => {
    timeLeftEl.textContent = --timeLeft;
    if (timeLeft <= 0) {
      clearInterval(timerHandle);
      alert('🕒 Time’s up! Mint or Restart.');
      startBtn.disabled   = false;
      restartBtn.disabled = false;
    }
  }, 1000);
}

restartBtn.onclick = () => {
  clearInterval(timerHandle);
  puzzleGrid.innerHTML = '';
  timeLeftEl.textContent = '45';
  startBtn.disabled   = false;
  mintBtn.disabled    = true;
  restartBtn.disabled = true;
};

// ── START EVENT ───────────────────────────────────────────
startBtn.onclick = async () => {
  startBtn.disabled = true;
  mintBtn.disabled  = false;
  restartBtn.disabled = true;
  if (!imageList.length) await loadImageList();
  const img = pickRandomImage();
  buildPuzzle(img);
  startTimer();
};

// ── MINT SNAPSHOT ON-CHAIN ─────────────────────────────────
mintBtn.onclick = async () => {
  try {
    // snapshot grid
    const canvas   = await html2canvas(puzzleGrid, { useCORS:true });
    const snapshot = canvas.toDataURL('image/png');

    // send to NFT.storage function
    const res = await fetch('/.netlify/functions/nftstorage', {
      method:'POST',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify({ snapshot })
    });
    if (!res.ok) throw new Error(res.statusText);
    const { metadataCid } = await res.json();

    // mint
    const uri = `https://ipfs.io/ipfs/${metadataCid}`;
    const tx = await contract.mintNFT(await signer.getAddress(), uri);
    await tx.wait();

    alert('🎉 Your puzzle NFT is now live!');
  } catch (err) {
    console.error(err);
    alert('Oops! ' + err.message);
  }
};

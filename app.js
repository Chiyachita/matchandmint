// app.js

// ── CONFIG ────────────────────────────────────────────────
// Hard-coded list of your SVG filenames (from match-and-mint-assets/images)
const imageFiles = [
  "puzzle1.svg","puzzle2.svg","puzzle3.svg","puzzle4.svg",
  "puzzle5.svg","puzzle6.svg","puzzle7.svg","puzzle8.svg"
];
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

let provider, signer, contract;
let timerHandle, timeLeft = 45;
let dragged = null;
const ROWS = 4, COLS = 4;

// ── HELPER TO BUILD A RAW URL ─────────────────────────────
function resolveImageUrl(filename) {
  return `https://cdn.jsdelivr.net/gh/${GITHUB_OWNER}/${ASSETS_REPO}@${GITHUB_BRANCH}/${IMAGES_PATH}/${filename}`;
}

// ── PICK AND RETURN A RANDOM IMAGE URL ────────────────────
function pickRandomImage() {
  const file = imageFiles[Math.floor(Math.random() * imageFiles.length)];
  return resolveImageUrl(file);
}

// ── CONNECT WALLET ─────────────────────────────────────────
connectBtn.onclick = async () => {
  try {
    if (!window.ethereum) throw new Error('No injected wallet found');
    await window.ethereum.request({ method: 'eth_requestAccounts' });
    provider = new ethers.providers.Web3Provider(window.ethereum,'any');
    await provider.send('wallet_switchEthereumChain',[{ chainId:CHAIN_ID_HEX }]);
    signer   = provider.getSigner();
    contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
    const addr = await signer.getAddress();
    walletStatus.textContent = `Connected: ${addr.slice(0,6)}…${addr.slice(-4)}`;
    startBtn.disabled = false;
  } catch (e) {
    console.error(e);
    alert('🔌 Wallet connect failed: '+e.message);
  }
};

// ── SHUFFLE UTILITY ───────────────────────────────────────
function shuffle(arr) {
  for (let i = arr.length-1; i>0; i--) {
    const j = Math.floor(Math.random()*(i+1));
    [arr[i],arr[j]] = [arr[j],arr[i]];
  }
}

// ── BUILD 4×4 PUZZLE GRID & SHOW REFERENCE ─────────────────
function buildPuzzle(imgUrl) {
  puzzleGrid.innerHTML = '';
  const cells = [];
  for (let i = 0; i < ROWS*COLS; i++) {
    const cell = document.createElement('div');
    cell.className     = 'cell';
    cell.dataset.index = i;
    const x = (i % COLS)*100, y = Math.floor(i / COLS)*100;
    Object.assign(cell.style, {
      backgroundImage: `url(${imgUrl})`,
      backgroundSize:  `${COLS*100}px ${ROWS*100}px`,
      backgroundPosition: `-${x}px -${y}px`
    });
    cell.draggable = true;
    cell.addEventListener('dragstart', e=>dragged=e.target);
    cell.addEventListener('dragover',  e=>e.preventDefault());
    cell.addEventListener('drop',      onDrop);
    cells.push(cell);
  }
  shuffle(cells);
  cells.forEach(c=>puzzleGrid.appendChild(c));

  // Show the full image below as reference
  referenceImg.src = imgUrl;
}

function onDrop(e) {
  e.preventDefault();
  if (!dragged) return;
  const kids = Array.from(puzzleGrid.children);
  const i1 = kids.indexOf(dragged), i2 = kids.indexOf(e.target);
  puzzleGrid.insertBefore(dragged, i2 > i1 ? e.target.nextSibling : e.target);
}

// ── TIMER & RESTART ────────────────────────────────────────
function startTimer() {
  clearInterval(timerHandle);
  timeLeft = 45; timeLeftEl.textContent = timeLeft;
  timerHandle = setInterval(()=>{
    timeLeftEl.textContent = --timeLeft;
    if (timeLeft <= 0) {
      clearInterval(timerHandle);
      alert('⏳ Time’s up! You can Mint or Restart.');
      startBtn.disabled   = false;
      restartBtn.disabled = false;
    }
  },1000);
}

restartBtn.onclick = () => {
  clearInterval(timerHandle);
  puzzleGrid.innerHTML = '';
  timeLeftEl.textContent = '45';
  startBtn.disabled   = false;
  mintBtn.disabled    = true;
  restartBtn.disabled = true;
};

// ── START GAME ────────────────────────────────────────────
startBtn.onclick = () => {
  startBtn.disabled   = true;
  mintBtn.disabled    = false;
  restartBtn.disabled = true;
  const img = pickRandomImage();
  buildPuzzle(img);
  startTimer();
};

// ── MINT: SNAPSHOT → Pinata/nft.storage Fn → ON-CHAIN ─────
mintBtn.onclick = async() => {
  try {
    // 1) snapshot
    const canvas   = await html2canvas(puzzleGrid,{useCORS:true});
    const snapshot = canvas.toDataURL('image/png');

    // 2) pin via Netlify fn
    const res = await fetch('/.netlify/functions/nftstorage', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({snapshot})
    });
    if (!res.ok) throw new Error(res.statusText);
    const { metadataCid } = await res.json();

    // 3) mint
    const uri = `https://ipfs.io/ipfs/${metadataCid}`;
    await (await contract.mintNFT(await signer.getAddress(), uri)).wait();
    alert('🎉 Minted! Check the explorer.');
  } catch (e) {
    console.error(e);
    alert('Oops: '+e.message);
  }
};

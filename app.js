// app.js

// ── CONSTANTS ─────────────────────────────────────────────
const IMAGE_FILES = [
  "puzzle1.svg","puzzle2.svg","puzzle3.svg","puzzle4.svg",
  "puzzle5.svg","puzzle6.svg","puzzle7.svg","puzzle8.svg"
];
const GITHUB_OWNER  = 'Chiyachita';
const ASSETS_REPO   = 'match-and-mint-assets';
const GITHUB_BRANCH = 'main';
const IMAGES_PATH   = 'images';

const CHAIN_ID       = 10143;
const CHAIN_ID_HEX   = '0x279F';
const CONTRACT_ADDR  = '0x259C1Da2586295881C18B733Cb738fe1151bD2e5';
const ABI = [
  "function mintNFT(address to, string uri) external returns (uint256)"
];

const ROWS = 4, COLS = 4;

// ── UI NODES ──────────────────────────────────────────────
const btnConnect   = document.getElementById('connectInjectedBtn');
const btnStart     = document.getElementById('startBtn');
const btnMint      = document.getElementById('mintBtn');
const btnRestart   = document.getElementById('restartBtn');
const walletStatus = document.getElementById('walletStatus');
const timeLeftEl   = document.getElementById('timeLeft');
const puzzleGrid   = document.getElementById('puzzleGrid');
const referenceImg = document.getElementById('referenceImg');

let provider, signer, contract;
let timer, timeLeft = 45;
let draggedPiece = null;

// ── UTILS ─────────────────────────────────────────────────
function resolveURL(file) {
  return `https://cdn.jsdelivr.net/gh/${GITHUB_OWNER}/${ASSETS_REPO}@${GITHUB_BRANCH}/${IMAGES_PATH}/${file}`;
}

function pickRandom() {
  const f = IMAGE_FILES[Math.floor(Math.random()*IMAGE_FILES.length)];
  return resolveURL(f);
}

function shuffle(arr) {
  for (let i = arr.length-1; i>0; i--) {
    const j = Math.floor(Math.random()*(i+1));
    [arr[i],arr[j]] = [arr[j],arr[i]];
  }
}

// ── CONNECT WALLET ─────────────────────────────────────────
btnConnect.onclick = async () => {
  try {
    if (!window.ethereum) throw new Error('No Web3 wallet detected');
    await window.ethereum.request({ method:'eth_requestAccounts' });
    provider = new ethers.providers.Web3Provider(window.ethereum,'any');
    await provider.send('wallet_switchEthereumChain',[{ chainId:CHAIN_ID_HEX }]);
    signer   = provider.getSigner();
    contract = new ethers.Contract(CONTRACT_ADDR, ABI, signer);

    const addr = await signer.getAddress();
    walletStatus.textContent = `Connected: ${addr.slice(0,6)}…${addr.slice(-4)}`;
    btnStart.disabled = false;
  } catch (e) {
    console.error(e);
    alert('Failed to connect wallet:\n' + e.message);
  }
};

// ── BUILD PUZZLE ───────────────────────────────────────────
function buildPuzzle(imgUrl) {
  puzzleGrid.innerHTML = '';
  const cells = [];
  for (let i=0; i<ROWS*COLS; i++) {
    const div = document.createElement('div');
    div.className     = 'cell';
    div.dataset.index = i;
    const x = (i%COLS)*100, y = Math.floor(i/COLS)*100;
    Object.assign(div.style, {
      backgroundImage:   `url(${imgUrl})`,
      backgroundSize:    `${COLS*100}px ${ROWS*100}px`,
      backgroundPosition:`-${x}px -${y}px`
    });
    div.draggable = true;
    div.addEventListener('dragstart', e=>draggedPiece=e.target);
    div.addEventListener('dragover',  e=>e.preventDefault());
    div.addEventListener('drop',      onDrop);
    cells.push(div);
  }
  shuffle(cells);
  cells.forEach(c=>puzzleGrid.appendChild(c));
  referenceImg.src = imgUrl;
}

function onDrop(e) {
  e.preventDefault();
  if (!draggedPiece) return;
  const kids = Array.from(puzzleGrid.children);
  const i1 = kids.indexOf(draggedPiece), i2 = kids.indexOf(e.target);
  puzzleGrid.insertBefore(
    draggedPiece,
    i2>i1? e.target.nextSibling : e.target
  );
}

// ── TIMER & RESTART ────────────────────────────────────────
function startTimer() {
  clearInterval(timer);
  timeLeft = 45; timeLeftEl.textContent = timeLeft;
  timer = setInterval(()=>{
    timeLeftEl.textContent = --timeLeft;
    if (timeLeft<=0) {
      clearInterval(timer);
      alert('⏳ Time’s up! You may Mint or Restart.');
      btnStart.disabled   = false;
      btnRestart.disabled = false;
    }
  },1000);
}

btnRestart.onclick = ()=>{
  clearInterval(timer);
  puzzleGrid.innerHTML = '';
  timeLeftEl.textContent = '45';
  btnStart.disabled = false;
  btnMint.disabled  = true;
  btnRestart.disabled = true;
};

// ── START GAME ────────────────────────────────────────────
btnStart.onclick = ()=>{
  btnStart.disabled = true;
  btnMint.disabled  = false;
  btnRestart.disabled = true;
  const img = pickRandom();
  buildPuzzle(img);
  startTimer();
};

// ── MINT → SNAPSHOT → PIN → ON-CHAIN (with detailed error) ─
btnMint.onclick = async () => {
  try {
    // 1) Capture the snapshot PNG
    console.log('📸 Capturing snapshot…');
    const canvas = await html2canvas(puzzleGrid, { useCORS: true });
    const dataUrl = canvas.toDataURL('image/png');
    // convert dataURL → Blob
    const resData = await fetch(dataUrl);
    const pngBlob = await resData.blob();

    // 2) Build a FormData and POST to NFT.Storage REST endpoint
    console.log('📡 Pinning snapshot via NFT.Storage REST API…');
    const form = new FormData();
    form.append('file', pngBlob, 'snapshot.png');

    const pinRes = await fetch('https://api.nft.storage/upload', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${window.NFT_STORAGE_KEY}`
      },
      body: form
    });
    if (!pinRes.ok) throw new Error(`NFT.Storage returned ${pinRes.status}`);
    const pinJSON = await pinRes.json();
    const pngCid = pinJSON.value.cid;
    console.log('✅ PNG CID:', pngCid);

    // 3) Mint on-chain using that CID
    const metadata = {
      name:        'Puzzle Snapshot',
      description: 'Your custom 4×4 puzzle arrangement.',
      image:       `ipfs://${pngCid}`,
      properties: {
        files: [{ uri: `ipfs://${pngCid}`, type: 'image/png' }]
      }
    };
    // (Optionally you could pin metadata too, but many explorers read raw NFT metadata from your URI)
    // For now we’ll embed metadata JSON directly on-chain via a data URI:
    const metadataUri = `data:application/json,${encodeURIComponent(JSON.stringify(metadata))}`;

    console.log('⛓️ Minting with URI:', metadataUri);
    const tx = await contract.mintNFT(await signer.getAddress(), metadataUri);
    await tx.wait();

    alert('🎉 Mint successful—check your wallet!');

  } catch (err) {
    console.error('🔥 Mint error:', err);
    alert('Mint failed:\n' + err.message);
  }
};


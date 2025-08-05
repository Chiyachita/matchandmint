// app.js

// ── CHAIN CONFIG ──────────────────────────────────────────
const CHAIN_ID     = 10143;
const CHAIN_ID_HEX = '0x279F';

// ── CONTRACT CONFIG ───────────────────────────────────────
const CONTRACT_ADDRESS = '0x259C1Da2586295881C18B733Cb738fe1151bD2e5';
const ABI = [
  "function mintNFT(address to, string uri) external returns (uint256)",
  "function tokenURI(uint256 tokenId) view returns (string)"
];

// ── UI ELEMENTS ────────────────────────────────────────────
const btnConnect = document.getElementById('connectInjectedBtn');
const btnStart   = document.getElementById('startBtn');
const btnMint    = document.getElementById('mintBtn');
const btnRestart = document.getElementById('restartBtn');
const status     = document.getElementById('walletStatus');
const timerEl    = document.getElementById('timeLeft');
const grid       = document.getElementById('puzzleGrid');
const preview    = document.querySelector('.preview img');

let provider, signer, contract;
let timerHandle, timeLeft = 45;
let dragged = null;
const ROWS = 4, COLS = 4;

// ── CONNECT WALLET ─────────────────────────────────────────
btnConnect.onclick = async () => {
  if (!window.ethereum) return alert('Please install a Web3 wallet!');
  await window.ethereum.request({ method: 'eth_requestAccounts' });
  provider = new ethers.providers.Web3Provider(window.ethereum, 'any');
  await provider.send('wallet_switchEthereumChain', [{ chainId: CHAIN_ID_HEX }]);
  signer   = provider.getSigner();
  contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);

  const addr = await signer.getAddress();
  status.textContent = `Connected: ${addr.slice(0,6)}…${addr.slice(-4)}`;
  btnStart.disabled = false;
};

// ── BUILD PUZZLE ───────────────────────────────────────────
function buildPuzzle() {
  grid.innerHTML = '';
  const imgUrl = preview.src;  // you set preview.src manually or via random list.json
  for (let i = 0; i < ROWS * COLS; i++) {
    const cell = document.createElement('div');
    cell.className     = 'cell';
    cell.dataset.index = i;
    const x = (i % COLS) * 100, y = Math.floor(i / COLS) * 100;
    Object.assign(cell.style, {
      backgroundImage: `url(${imgUrl})`,
      backgroundSize:  `${COLS*100}px ${ROWS*100}px`,
      backgroundPosition: `-${x}px -${y}px`
    });
    cell.draggable = true;
    cell.addEventListener('dragstart', e => dragged = e.target);
    cell.addEventListener('dragover',  e => e.preventDefault());
    cell.addEventListener('drop',      onDrop);
    grid.appendChild(cell);
  }
}

function onDrop(e) {
  e.preventDefault();
  if (!dragged) return;
  const kids = [...grid.children];
  const i1   = kids.indexOf(dragged);
  const i2   = kids.indexOf(e.target);
  grid.insertBefore(dragged, i2 > i1 ? e.target.nextSibling : e.target);
}

// ── TIMER & RESTART ────────────────────────────────────────
function startTimer() {
  clearInterval(timerHandle);
  timeLeft = 45;
  timerEl.textContent = timeLeft;
  timerHandle = setInterval(() => {
    timerEl.textContent = --timeLeft;
    if (timeLeft <= 0) {
      clearInterval(timerHandle);
      alert('⏳ Time’s up! You can Mint or Restart.');
      btnStart.disabled   = false;
      btnRestart.disabled = false;
    }
  }, 1000);
}

btnRestart.onclick = () => {
  clearInterval(timerHandle);
  grid.innerHTML       = '';
  timerEl.textContent  = '45';
  btnStart.disabled    = false;
  btnMint.disabled     = true;
  btnRestart.disabled  = true;
};

// ── START GAME ────────────────────────────────────────────
btnStart.onclick = () => {
  // set preview.src however you like (random or fixed)
  preview.src = preview.src || 'preview.png';
  buildPuzzle();
  btnStart.disabled   = true;
  btnMint.disabled    = false;
  btnRestart.disabled = true;
  startTimer();
};

// ── MINT AS ON-CHAIN DATA-URI ──────────────────────────────
btnMint.onclick = async () => {
  try {
    // 1) Render puzzle grid to a base64 PNG
    const canvas   = await html2canvas(grid);
    const snapshot = canvas.toDataURL('image/png');

    // 2) Build a compliant ERC-721 metadata JSON in-app
    const metadata = {
      name:        `Puzzle #${Date.now()}`,
      description: 'A snapshot of my 4×4 puzzle!',
      image:       snapshot,
      properties: {
        files: [{ uri: snapshot, type: 'image/png' }],
        category: 'image'
      }
    };

    // 3) Base64-encode that JSON
    const b64     = btoa(JSON.stringify(metadata));
    const dataURI = `data:application/json;base64,${b64}`;

    // 4) Mint on-chain with the data URI
    const tx = await contract.mintNFT(
      await signer.getAddress(),
      dataURI
    );
    await tx.wait();

    alert('🎉 Minted! Check Metadata tab—image shows up immediately.');
    btnMint.disabled   = true;
    btnStart.disabled  = false;
    btnRestart.disabled = false;
  } catch (err) {
    console.error('Mint failed:', err);
    alert('Error minting: ' + err.message);
  }
};

// ── CONFIG ────────────────────────────────────────────────────
const CHAIN_ID     = 10143;
const CHAIN_ID_HEX = '0x279F';

const GITHUB_OWNER  = 'YourUser';             // ← your GitHub username
const ASSETS_REPO   = 'match-and-mint-assets';
const GITHUB_BRANCH = 'main';
const LIST_URL      = `https://cdn.jsdelivr.net/gh/${GITHUB_OWNER}/${ASSETS_REPO}@${GITHUB_BRANCH}/list.json`;
const IMAGES_BASE   = `https://cdn.jsdelivr.net/gh/${GITHUB_OWNER}/${ASSETS_REPO}@${GITHUB_BRANCH}/images`;

// ── UI ELEMENTS ───────────────────────────────────────────────
const btnConnect = document.getElementById('btnConnect');
const btnStart   = document.getElementById('btnStart');
const btnMint    = document.getElementById('btnMint');
const btnRestart = document.getElementById('btnRestart');
const timerEl    = document.getElementById('timer');
const grid       = document.getElementById('puzzleGrid');
const preview    = document.getElementById('previewImg');

// ── STATE ─────────────────────────────────────────────────────
let provider, signer, imageList = [];
let timeLeft = 45, timerId = null, dragged = null;
const ROWS = 4, COLS = 4;

// ── HELPERS ───────────────────────────────────────────────────
function shuffle(a) {
  for (let i=a.length-1; i>0; i--) {
    const j = Math.floor(Math.random()*(i+1));
    [a[i],a[j]] = [a[j],a[i]];
  }
}

async function loadImageList() {
  const res = await fetch(LIST_URL);
  imageList = await res.json().catch(_=>[]);
}

function pickRandomImage() {
  if (!imageList.length) return `${IMAGES_BASE}/preview.png`;
  const fn = imageList[Math.floor(Math.random()*imageList.length)];
  return `${IMAGES_BASE}/${fn}`;
}

function isSolved() {
  return [...grid.children].every((c,i)=>+c.dataset.index===i);
}

// ── CONNECT ───────────────────────────────────────────────────
async function connect() {
  if (!window.ethereum) {
    alert('No injected wallet found!');
    return;
  }
  await window.ethereum.request({ method:'eth_requestAccounts' });
  provider = new ethers.providers.Web3Provider(window.ethereum, 'any');
  const net = await provider.getNetwork();
  if (net.chainId !== CHAIN_ID) {
    await provider.send('wallet_switchEthereumChain',[{chainId:CHAIN_ID_HEX}]);
  }
  signer = provider.getSigner();
  btnConnect.textContent = '✅ Connected';
  btnStart.disabled = false;
}

// ── PUZZLE SETUP ─────────────────────────────────────────────
function buildPuzzle(imgUrl) {
  grid.innerHTML = '';
  const cells = [];
  for (let i=0; i<ROWS*COLS; i++) {
    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.dataset.index = i;
    const x = (i%COLS)*100, y = Math.floor(i/COLS)*100;
    Object.assign(cell.style, {
      backgroundImage:`url(${imgUrl})`,
      backgroundPosition:`-${x}px -${y}px`
    });
    cell.draggable = true;
    cell.addEventListener('dragstart', e=>dragged=e.target);
    cell.addEventListener('dragover', e=>e.preventDefault());
    cell.addEventListener('drop', onDrop);
    cells.push(cell);
  }
  shuffle(cells);
  cells.forEach(c=>grid.append(c));
}

// swap on drop
function onDrop(e) {
  e.preventDefault();
  if (!dragged) return;
  const kids = [...grid.children];
  const i1 = kids.indexOf(dragged), i2 = kids.indexOf(e.target);
  if (i1>=0 && i2>=0) {
    grid.insertBefore(dragged, i2>i1? e.target.nextSibling : e.target);
  }
}

// ── TIMER & BUTTON LOGIC ────────────────────────────────────
function startTimer() {
  clearInterval(timerId);
  timeLeft = 45;
  timerEl.textContent = `⏱ Time Left: ${timeLeft}s`;
  timerId = setInterval(()=>{
    timerEl.textContent = `⏱ Time Left: ${--timeLeft}s`;
    if (timeLeft<=0) {
      clearInterval(timerId);
      alert(
        isSolved()
          ? '⏰ Time’s up—but you nailed it! Mint your perfect masterpiece 🌟'
          : '⏳ Time’s up! This is your masterpiece—feel free to mint or Restart.'
      );
      btnStart.disabled = false;
      btnRestart.disabled = false;
      btnMint.disabled = false;
    }
  },1000);
}

// ── EVENT BINDINGS ───────────────────────────────────────────
btnConnect.addEventListener('click', connect);

btnStart.addEventListener('click', async()=>{
  btnStart.disabled = true;
  btnMint.disabled  = false;
  btnRestart.disabled = true;

  if (!imageList.length) await loadImageList();
  const img = pickRandomImage();
  buildPuzzle(img);
  preview.src = img;
  startTimer();
});

btnRestart.addEventListener('click', ()=>{
  clearInterval(timerId);
  grid.innerHTML = '';
  timerEl.textContent = '⏱ Time Left: 45s';
  btnStart.disabled = false;
  btnMint.disabled  = true;
  btnRestart.disabled = true;
});

// ── (PLACEHOLDER) MINT HANDLER ──────────────────────────────
btnMint.addEventListener('click', ()=>{
  // ← hook your NFT minting here (Pinata / NFT.Storage + on-chain)
  alert('✨ Mint code goes here! ✨');
});

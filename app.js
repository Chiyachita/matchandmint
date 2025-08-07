// app.js

// ── CHAIN & CONTRACT CONFIG ────────────────────────────────
const CHAIN_ID           = 10143;
const CHAIN_ID_HEX       = '0x279F';
const CONTRACT_ADDRESS   = '0x259C1Da2586295881C18B733Cb738fe1151bD2e5';
const ABI = [
  "function mintNFT(address to, string uri) external returns (uint256)",
  "function ownerOf(uint256 tokenId) view returns (address)"
];

// ── ASSET CONFIG (jsDelivr) ────────────────────────────────
const GITHUB_OWNER   = 'Chiyachita';
const ASSETS_REPO    = 'match-and-mint-assets';
const GITHUB_BRANCH  = 'main';
const LIST_JSON_URL  = `https://cdn.jsdelivr.net/gh/${GITHUB_OWNER}/${ASSETS_REPO}@${GITHUB_BRANCH}/list.json`;
const IMAGE_BASE_URL = `https://cdn.jsdelivr.net/gh/${GITHUB_OWNER}/${ASSETS_REPO}@${GITHUB_BRANCH}/images`;

// ── UI ELEMENTS ────────────────────────────────────────────
const connectInjectedBtn      = document.getElementById('connectInjectedBtn');
const connectWalletConnectBtn = document.getElementById('connectWalletConnectBtn');
const walletStatus            = document.getElementById('walletStatus');
const startBtn                = document.getElementById('startBtn');
const mintBtn                 = document.getElementById('mintBtn');
const restartBtn              = document.getElementById('restartBtn');
const timeLeftEl              = document.getElementById('timeLeft');
const puzzleGrid              = document.getElementById('puzzleGrid');
const previewImg              = document.getElementById('preview');

let provider, signer, contract;
let imageList = [];
let timerHandle, timeLeft = 45;
const ROWS = 4, COLS = 4;

// ── UTILITIES ───────────────────────────────────────────────
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random()*(i+1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}
async function loadImageList() {
  try {
    const res = await fetch(LIST_JSON_URL);
    imageList = res.ok ? await res.json() : [];
  } catch (e) {
    console.error('Failed to load list.json', e);
    imageList = [];
  }
}
function pickRandomImage() {
  if (!imageList.length) return '';
  const fn = imageList[Math.floor(Math.random()*imageList.length)];
  return `${IMAGE_BASE_URL}/${fn}`;
}
function isPuzzleSolved() {
  return Array.from(puzzleGrid.children)
    .every((c,i) => +c.dataset.index === i);
}
async function switchToMonad(ethProvider) {
  const { chainId } = await ethProvider.getNetwork();
  if (chainId !== CHAIN_ID) {
    await ethProvider.send('wallet_addEthereumChain', [{
      chainId: CHAIN_ID_HEX,
      chainName: 'Monad Testnet',
      rpcUrls: ['https://testnet-rpc.monad.xyz'],
      nativeCurrency: { name: 'Monad', symbol: 'MON', decimals: 18 },
      blockExplorerUrls: ['https://testnet.monadexplorer.com']
    }]).catch(()=>{});
    await ethProvider.send('wallet_switchEthereumChain', [{ chainId: CHAIN_ID_HEX }]);
  }
}

// ── MULTI‐BRAND INJECTED CONNECT ────────────────────────────
function getInjectedProvider() {
  const { ethereum } = window;
  if (!ethereum) return null;
  if (Array.isArray(ethereum.providers)) {
    return ethereum.providers.find(p => p.isMetaMask) || ethereum.providers[0];
  }
  return ethereum;
}

async function connectInjected() {
  const injected = getInjectedProvider();
  if (!injected) {
    alert('No injected wallet found! Try WalletConnect.');
    return;
  }
  try {
    await injected.request({ method: 'eth_requestAccounts' });
    const ethProvider = new ethers.providers.Web3Provider(injected, 'any');
    await switchToMonad(ethProvider);
    finishConnect(ethProvider);
  } catch (err) {
    console.error('Injected connect failed', err);
    alert('Failed to connect injected wallet.');
  }
}

// ── WALLETCONNECT CONNECT ──────────────────────────────────
async function connectWalletConnect() {
  try {
    const wc = new WalletConnectProvider.default({
      rpc: { [CHAIN_ID]: 'https://testnet-rpc.monad.xyz' },
      chainId: CHAIN_ID
    });
    await wc.enable();
    const ethProvider = new ethers.providers.Web3Provider(wc, 'any');
    await switchToMonad(ethProvider);
    finishConnect(ethProvider);
  } catch (err) {
    console.error('WalletConnect failed', err);
    alert('Failed to connect via WalletConnect.');
  }
}

// ── AFTER CONNECT SETUP ────────────────────────────────────
async function finishConnect(ethProvider) {
  provider = ethProvider;
  signer   = provider.getSigner();
  contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);

  const addr = await signer.getAddress();
  walletStatus.textContent = `Connected: ${addr.slice(0,6)}…${addr.slice(-4)}`;
  startBtn.disabled = false;

  ethProvider.provider.on('accountsChanged', ([a]) => {
    walletStatus.textContent = `Connected: ${a.slice(0,6)}…${a.slice(-4)}`;
  });
  ethProvider.provider.on('chainChanged', cid => {
    if (cid !== CHAIN_ID_HEX) location.reload();
  });
  ethProvider.provider.on('disconnect', () => location.reload());
}

// ── BUILD & DRAG PUZZLE ────────────────────────────────────
function buildPuzzle(url) {
  puzzleGrid.innerHTML = '';
  const cells = [];
  for (let i = 0; i < ROWS*COLS; i++) {
    const cell = document.createElement('div');
    cell.className     = 'cell';
    cell.dataset.index = i;
    const x = (i%COLS)*100, y = Math.floor(i/COLS)*100;
    Object.assign(cell.style, {
      backgroundImage:   `url(${url})`,
      backgroundSize:    `${COLS*100}px ${ROWS*100}px`,
      backgroundPosition:`-${x}px -${y}px`
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
let dragged = null;
function onDrop(e) {
  e.preventDefault();
  if (!dragged) return;
  const kids = Array.from(puzzleGrid.children);
  const i1 = kids.indexOf(dragged), i2 = kids.indexOf(e.target);
  if (i1 > -1 && i2 > -1) {
    puzzleGrid.insertBefore(
      dragged,
      i2 > i1 ? e.target.nextSibling : e.target
    );
  }
}

// ── TIMER & RESTART ────────────────────────────────────────
function startTimer() {
  clearInterval(timerHandle);
  timeLeft = 45;
  timeLeftEl.textContent = `⏱ Time Left: ${timeLeft}s`;
  timerHandle = setInterval(() => {
    timeLeftEl.textContent = `⏱ Time Left: ${--timeLeft}s`;
    if (timeLeft <= 0) {
      clearInterval(timerHandle);
      alert(
        isPuzzleSolved()
          ? '⏰ Time’s up—but you nailed it! Mint your perfect masterpiece 🌟'
          : '⏳ Time’s up! Mint or Restart.'
      );
      startBtn.disabled   = false;
      restartBtn.disabled = false;
      mintBtn.disabled    = false;
    }
  }, 1000);
}

restartBtn.addEventListener('click', () => {
  clearInterval(timerHandle);
  puzzleGrid.innerHTML = '';
  timeLeftEl.textContent = '⏱ Time Left: 45s';
  startBtn.disabled   = false;
  mintBtn.disabled    = true;
  restartBtn.disabled = true;
});

// ── START GAME ────────────────────────────────────────────
startBtn.addEventListener('click', async () => {
  startBtn.disabled   = true;
  mintBtn.disabled    = false;
  restartBtn.disabled = true;
  if (!imageList.length) await loadImageList();
  const url = pickRandomImage();
  buildPuzzle(url);
  previewImg.src = url;
  startTimer();
});

// ── MINT SNAPSHOT → UPLOAD → ON‐CHAIN ──────────────────────
mintBtn.addEventListener('click', async () => {
  try {
    // 1) take snapshot
    const canvas   = await html2canvas(puzzleGrid);
    const snapshot = canvas.toDataURL('image/png');

    // 2) send to Netlify fn
    const resp = await fetch('/.netlify/functions/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ snapshot })
    });
    if (!resp.ok) throw new Error('Upload failed');
    const { cid } = await resp.json();

    // 3) mint on‐chain
    const uri = `https://ipfs.io/ipfs/${cid}`;
    const tx  = await contract.mintNFT(
      await signer.getAddress(),
      uri
    );
    await tx.wait();

    // done
    previewImg.src      = snapshot;
    alert('🎉 Minted! CID: ' + cid);
    clearInterval(timerHandle);
    mintBtn.disabled    = true;
    startBtn.disabled   = false;
    restartBtn.disabled = false;
  } catch (err) {
    console.error(err);
    alert('Mint failed: ' + err.message);
  }
});

// ── HOOK UP BUTTONS ────────────────────────────────────────
connectInjectedBtn.addEventListener('click', connectInjected);
connectWalletConnectBtn.addEventListener('click', connectWalletConnect);

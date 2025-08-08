// app.js

// ── CONFIG ───────────────────────────────────────────────
const NFT_STORAGE_KEY = window.NFT_STORAGE_KEY;
const CHAIN_ID     = 10143;
const CHAIN_ID_HEX = '0x279F';
const CONTRACT_ADDRESS = '0x259C1Da2586295881C18B733Cb738fe1151bD2e5';

// ── DOM ELEMENTS ─────────────────────────────────────────
const connectInjectedBtn      = document.getElementById('connectInjectedBtn');
const connectWalletConnectBtn = document.getElementById('connectWalletConnectBtn');
const walletStatus            = document.getElementById('walletStatus');
const startBtn                = document.getElementById('startBtn');
const mintBtn                 = document.getElementById('mintBtn');
const restartBtn              = document.getElementById('restartBtn');
const timeLeftEl              = document.getElementById('timeLeft');
const puzzleGrid              = document.getElementById('puzzleGrid');
const previewImg              = document.getElementById('previewImg');

let provider, signer, contract;
let imageList = [];
let timerHandle, timeLeft = 45;
let dragged = null;
const ROWS = 4, COLS = 4;

// ── HELPERS ───────────────────────────────────────────────
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

async function loadImageList() {
  const url = `https://cdn.jsdelivr.net/gh/Chiyachita/match-and-mint-assets@main/list.json`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(res.status);
    imageList = await res.json();
  } catch (e) {
    console.error('Could not load list.json', e);
    alert('⚠️ Oops: Could not load asset list.');
    imageList = [];
  }
}

function pickRandomImage() {
  if (!imageList.length) return 'preview.png';
  const file = imageList[Math.floor(Math.random() * imageList.length)];
  return `https://cdn.jsdelivr.net/gh/Chiyachita/match-and-mint-assets@main/images/${file}`;
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

function getInjectedProvider() {
  const { ethereum } = window;
  if (ethereum?.providers && Array.isArray(ethereum.providers)) {
    const options = ethereum.providers.map((provider, index) => {
      let name = provider.isMetaMask ? 'MetaMask' : 'Wallet';
      return { provider, name, index };
    });
    const input = prompt(`Select wallet:\n${options.map((w, i) => `${i + 1}: ${w.name}`).join('\n')}`);
    const idx = parseInt(input) - 1;
    return options[idx]?.provider || ethereum.providers[0];
  }
  return ethereum;
}

async function connectInjected() {
  const injected = getInjectedProvider();
  if (!injected) return alert('No wallet found.');

  try {
    const accounts = await injected.request({ method: 'eth_requestAccounts' });
    if (!accounts.length) throw new Error('No accounts');
    const ethersProvider = new ethers.providers.Web3Provider(injected, 'any');
    await switchToMonad(ethersProvider);
    finishConnect(ethersProvider);
  } catch (err) {
    console.error('Connect error', err);
    alert('Wallet connection failed: ' + err.message);
  }
}

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
    console.error('WalletConnect error', err);
    alert('WalletConnect failed.');
  }
}

async function finishConnect(ethersProvider) {
  provider = ethersProvider;
  signer   = provider.getSigner();
  contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
  const addr = await signer.getAddress();
  walletStatus.textContent = `Connected: ${addr.slice(0,6)}...${addr.slice(-4)} (Monad)`;
  startBtn.disabled = false;
  const raw = provider.provider;
  raw.on('accountsChanged', ([a]) => walletStatus.textContent = `Connected: ${a.slice(0,6)}...${a.slice(-4)} (Monad)`);
  raw.on('chainChanged', cid => { if (cid !== CHAIN_ID_HEX) location.reload(); });
  raw.on('disconnect', () => location.reload());
}

function buildPuzzle(imageUrl) {
  puzzleGrid.innerHTML = '';
  const cells = [];
  for (let i = 0; i < ROWS * COLS; i++) {
    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.dataset.index = i;
    const x = (i % COLS) * 100, y = Math.floor(i / COLS) * 100;
    Object.assign(cell.style, {
      backgroundImage: `url(${imageUrl})`,
      backgroundSize: `${COLS*100}px ${ROWS*100}px`,
      backgroundPosition: `-${x}px -${y}px`
    });
    cell.draggable = true;
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
  const kids = [...puzzleGrid.children];
  const i1 = kids.indexOf(dragged), i2 = kids.indexOf(e.target);
  if (i1 > -1 && i2 > -1) {
    puzzleGrid.insertBefore(dragged, i2 > i1 ? e.target.nextSibling : e.target);
  }
}

function startTimer() {
  clearInterval(timerHandle);
  timeLeft = 45;
  timeLeftEl.textContent = timeLeft;
  timerHandle = setInterval(() => {
    timeLeftEl.textContent = --timeLeft;
    if (timeLeft <= 0) {
      clearInterval(timerHandle);
      alert(isPuzzleSolved() ? '⏰ Time’s up—but you nailed it!' : '⏳ Time’s up! Mint or restart.');
      startBtn.disabled = false;
      restartBtn.disabled = false;
    }
  }, 1000);
}

restartBtn.addEventListener('click', () => {
  clearInterval(timerHandle);
  puzzleGrid.innerHTML = '';
  timeLeftEl.textContent = '45';
  startBtn.disabled = false;
  mintBtn.disabled = true;
  restartBtn.disabled = true;
});

startBtn.addEventListener('click', async () => {
  startBtn.disabled = true;
  mintBtn.disabled = false;
  restartBtn.disabled = true;
  if (!imageList.length) await loadImageList();
  const imageUrl = pickRandomImage();
  previewImg.src = imageUrl;
  buildPuzzle(imageUrl);
  startTimer();
});

// ── MINT NFT ───────────────────────────────────────────────
async function mintSnapshot() {
  try {
    if (!puzzleGrid.children.length) throw new Error('No puzzle to mint');

    const canvas = await html2canvas(puzzleGrid, {
      width: 420,
      height: 420,
      backgroundColor: '#ffffff'
    });

    const snapshot = canvas.toDataURL('image/png');
    const metadata = {
      name: "Match and Mint Puzzle",
      description: "A puzzle NFT created by matching pieces in the Match and Mint game",
      image: "",
      attributes: [
        { trait_type: "Game Type", value: "Puzzle" },
        { trait_type: "Grid", value: "4x4" },
        { trait_type: "Created", value: new Date().toISOString() }
      ]
    };

    const res = await fetch('/.netlify/functions/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64: snapshot, metadata })
    });

    const { cid } = await res.json();
    if (!cid) throw new Error('Upload failed');

    const uri = `ipfs://${cid}`;
    const tx = await contract.mintNFT(await signer.getAddress(), uri);
    await tx.wait();

    previewImg.src = snapshot;
    alert('🎉 Minted successfully!');
    clearInterval(timerHandle);
    mintBtn.disabled = true;
    startBtn.disabled = false;
    restartBtn.disabled = false;
  } catch (err) {
    console.error('Mint error', err);
    alert('Mint failed: ' + err.message);
  }
}

mintBtn.addEventListener('click', mintSnapshot);
connectInjectedBtn.addEventListener('click', connectInjected);
connectWalletConnectBtn.addEventListener('click', connectWalletConnect);

(async function initializePreview() {
  await loadImageList();
  if (imageList.length > 0) previewImg.src = pickRandomImage();
})();


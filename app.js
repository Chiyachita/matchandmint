// ── CHAIN CONFIG ──────────────────────────────────────────
const CHAIN_ID     = 10143;
const CHAIN_ID_HEX = '0x279F';

// ── CONTRACT & ASSETS CONFIG ──────────────────────────────
const CONTRACT_ADDRESS = '0x259C1Da2586295881C18B733Cb738fe1151bD2e5';
const ABI = [
  "function mintNFT(address to, string uri) external returns (uint256)"
];

// ── UI ELEMENTS ────────────────────────────────────────────
const connectInjectedBtn      = document.getElementById('connectInjectedBtn');
const connectWalletConnectBtn = document.getElementById('connectWalletConnectBtn');
const walletStatus            = document.getElementById('walletStatus');
const startBtn                = document.getElementById('startBtn');
const mintBtn                 = document.getElementById('mintBtn');
const restartBtn              = document.getElementById('restartBtn');
const timeLeftEl              = document.getElementById('timeLeft');
const puzzleGrid              = document.getElementById('puzzleGrid');
const previewImg              = document.querySelector('.preview');

let provider, signer, contract;
let timerHandle, timeLeft = 45;
let dragged = null;
const ROWS = 4, COLS = 4;

// ── SHUFFLE ────────────────────────────────────────────────
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

// ── SWITCH NETWORK ─────────────────────────────────────────
async function switchToMonad(ethersProvider) {
  const { chainId } = await ethersProvider.getNetwork();
  if (chainId !== CHAIN_ID) {
    await ethersProvider.send('wallet_switchEthereumChain', [{ chainId: CHAIN_ID_HEX }]);
  }
}

// ── CONNECT INJECTED ───────────────────────────────────────
async function connectInjected() {
  if (!window.ethereum) {
    alert('No injected wallet found! Try WalletConnect.');
    return;
  }
  try {
    await window.ethereum.request({ method: 'eth_requestAccounts' });
    const eps = new ethers.providers.Web3Provider(window.ethereum, 'any');
    await switchToMonad(eps);
    finishConnect(eps);
  } catch (err) {
    console.error(err);
    alert('Failed to connect injected wallet.');
  }
}

// ── CONNECT WALLETCONNECT ──────────────────────────────────
async function connectWalletConnect() {
  try {
    const wc = new WalletConnectProvider.default({
      rpc: { [CHAIN_ID]: 'https://testnet-rpc.monad.xyz' },
      chainId: CHAIN_ID
    });
    await wc.enable();
    const eps = new ethers.providers.Web3Provider(wc, 'any');
    await switchToMonad(eps);
    finishConnect(eps);
  } catch (err) {
    console.error(err);
    alert('Failed to connect via WalletConnect.');
  }
}

// ── AFTER CONNECT ──────────────────────────────────────────
async function finishConnect(eps) {
  provider = eps;
  signer   = provider.getSigner();
  contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);

  const addr = await signer.getAddress();
  walletStatus.textContent = `Connected: ${addr.slice(0,6)}…${addr.slice(-4)}`;
  startBtn.disabled = false;

  provider.provider.on('accountsChanged', ([a]) => {
    walletStatus.textContent = `Connected: ${a.slice(0,6)}…${a.slice(-4)}`;
  });
  provider.provider.on('chainChanged', c => {
    if (c !== CHAIN_ID_HEX) window.location.reload();
  });
  provider.provider.on('disconnect', () => window.location.reload());
}

// ── BUILD & DRAG ───────────────────────────────────────────
function buildPuzzle(url) {
  puzzleGrid.innerHTML = '';
  const cells = [];
  for (let i = 0; i < ROWS*COLS; i++) {
    const x = (i % COLS)*100, y = Math.floor(i/COLS)*100;
    const c = document.createElement('div');
    c.className     = 'cell';
    c.dataset.index = i;
    Object.assign(c.style, {
      backgroundImage: `url(${url})`,
      backgroundSize: `${COLS*100}px ${ROWS*100}px`,
      backgroundPosition: `-${x}px -${y}px`
    });
    c.draggable = true;
    c.addEventListener('dragstart', e => dragged = e.target);
    c.addEventListener('dragover', e => e.preventDefault());
    c.addEventListener('drop', onDrop);
    cells.push(c);
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
    puzzleGrid.insertBefore(
      dragged,
      i2 > i1 ? e.target.nextSibling : e.target
    );
  }
}

function isSolved() {
  return Array.from(puzzleGrid.children)
    .every((c,i) => +c.dataset.index === i);
}

// ── TIMER ──────────────────────────────────────────────────
function startTimer() {
  clearInterval(timerHandle);
  timeLeft = 45;
  timeLeftEl.textContent = timeLeft;
  timerHandle = setInterval(()=>{
    timeLeftEl.textContent = --timeLeft;
    if (timeLeft <= 0) {
      clearInterval(timerHandle);
      alert(
        isSolved()
          ? '⏰ Time’s up—and it’s perfect! 🎉'
          : '⏳ Time’s up! Mint your masterpiece or Restart.'
      );
      restartBtn.disabled = false;
      startBtn.disabled   = false;
      mintBtn.disabled    = false;
    }
  }, 1000);
}

restartBtn.addEventListener('click', ()=>{
  clearInterval(timerHandle);
  puzzleGrid.innerHTML = '';
  timeLeftEl.textContent = '45';
  startBtn.disabled = false;
  mintBtn.disabled  = true;
  restartBtn.disabled = true;
});

// ── START GAME ─────────────────────────────────────────────
startBtn.addEventListener('click', async ()=>{
  startBtn.disabled = true;
  mintBtn.disabled  = false;
  restartBtn.disabled = true;

  // load & pick a random image
  const indexUrl = `https://cdn.jsdelivr.net/gh/Chiyachita/match-and-mint-assets@main/list.json`;
  const list = await fetch(indexUrl).then(r=>r.json());
  const file = list[Math.floor(Math.random()*list.length)];
  const imgUrl = `https://cdn.jsdelivr.net/gh/Chiyachita/match-and-mint-assets@main/images/${file}`;

  buildPuzzle(imgUrl);
  previewImg.src = imgUrl;
  startTimer();
});

// ── MINT via NFT.Storage ───────────────────────────────────
mintBtn.addEventListener('click', async ()=>{
  mintBtn.disabled = true;
  try {
    // 1) Snapshot
    const canvas = await html2canvas(puzzleGrid);
    const blob   = await new Promise(r=>canvas.toBlob(r,'image/png'));

    // 2) Upload via NFT.Storage
    const client = new NFTStorage.NFTStorage({ token: window.NFT_STORAGE_KEY });
    const metadata = await client.store({
      name:    `Puzzle Snapshot`,
      description: `My 4×4 puzzle snapshot`,
      image: new File([blob], 'snapshot.png', { type: 'image/png' }),
    });

    // 3) On-chain mint
    const uri = metadata.url; // ipfs://...
    const tx  = await contract.mintNFT(
      await signer.getAddress(),
      uri
    );
    await tx.wait();

    // 4) Show result
    previewImg.src = URL.createObjectURL(blob);
    alert(`🎉 Minted! TokenURI = ${uri}`);
  } catch (e) {
    console.error(e);
    alert(`Mint failed:\n${e.message}`);
  } finally {
    restartBtn.disabled = false;
    startBtn.disabled   = false;
  }
});

// ── HOOK UP CONNECT BUTTONS ────────────────────────────────
connectInjectedBtn.addEventListener('click', connectInjected);
connectWalletConnectBtn.addEventListener('click', connectWalletConnect);

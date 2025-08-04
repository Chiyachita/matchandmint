// app.js

// ── CONFIG ──────────────────────────────────────────────────
const CONTRACT_ADDRESS = '0xCd9926fc1A944262c213Cc1c4c03844D7A842892';
const ABI = [ /* your full ABI here */ ];

// Assets repo info
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

let provider, signer, contract;
let imageList = [];
let timerHandle, timeLeft = 45;
let dragged = null;
const ROWS = 4, COLS = 4;

// ── HELPERS ────────────────────────────────────────────────

// shuffle array in-place
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

// load list.json from your GitHub Assets repo
async function loadImageList() {
  const url = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${ASSETS_REPO}/${GITHUB_BRANCH}/${IMAGES_PATH}/list.json`;
  try {
    const res = await fetch(url);
    imageList = await res.json();
  } catch (e) {
    console.error('Failed to load list.json', e);
    imageList = [];
  }
}

// pick a random image URL
function pickRandomImage() {
  if (!imageList.length) return 'preview.png';
  const file = imageList[Math.floor(Math.random() * imageList.length)];
  return `https://raw.githubusercontent.com/${GITHUB_OWNER}/${ASSETS_REPO}/${GITHUB_BRANCH}/${IMAGES_PATH}/${file}`;
}

// check if the puzzle is fully solved
function isPuzzleSolved() {
  const kids = Array.from(puzzleGrid.children);
  return kids.every((cell, idx) => parseInt(cell.dataset.index, 10) === idx);
}

// ── METAMASK-ONLY CONNECT ───────────────────────────────────
async function connectWallet() {
  if (!window.ethereum || !window.ethereum.isMetaMask) {
    walletStatus.textContent = '🔒 MetaMask not found—please install it!';
    return;
  }
  try {
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    const addr     = accounts[0];
    walletStatus.textContent = `Connected: ${addr.slice(0,6)}...${addr.slice(-4)}`;

    let chainId = await window.ethereum.request({ method: 'eth_chainId' });
    if (chainId !== '0x279F') {
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x279F' }]
        });
      } catch (switchErr) {
        if (switchErr.code === 4902) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0x279F',
              chainName: 'Monad Testnet',
              nativeCurrency: { name: 'Monad Testnet', symbol: 'MON', decimals: 18 },
              rpcUrls: ['https://testnet-rpc.monad.xyz'],
              blockExplorerUrls: ['https://testnet.monadexplorer.com']
            }]
          });
        } else throw switchErr;
      }
    }

    provider = new ethers.providers.Web3Provider(window.ethereum);
    signer   = provider.getSigner();
    contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);

    walletStatus.textContent += ' ✅';
    startBtn.disabled = false;

    window.ethereum.on('accountsChanged', ([newAddr]) => {
      walletStatus.textContent = `Connected: ${newAddr.slice(0,6)}...${newAddr.slice(-4)}`;
    });
    window.ethereum.on('chainChanged', () => location.reload());

  } catch (err) {
    console.error('MetaMask connect error', err);
    walletStatus.textContent = '⚠️ Connection failed—check console';
  }
}
connectBtn.addEventListener('click', connectWallet);

// ── BUILD & DRAG-DROP PUZZLE ───────────────────────────────
function buildPuzzle(imageUrl) {
  puzzleGrid.innerHTML = '';
  const cells = [];
  for (let i = 0; i < ROWS * COLS; i++) {
    const cell = document.createElement('div');
    cell.className     = 'cell';
    cell.dataset.index = i;               // tag original position
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
    puzzleGrid.insertBefore(dragged, i2 > i1 ? e.target.nextSibling : e.target);
  }
}

// ── TIMER ─────────────────────────────────────────────────
function startTimer() {
  clearInterval(timerHandle);
  timeLeft = 45;
  timeLeftEl.textContent = timeLeft;
  timerHandle = setInterval(() => {
    timeLeftEl.textContent = --timeLeft;

    if (timeLeft <= 0) {
      clearInterval(timerHandle);

      // show different message if not solved
      if (isPuzzleSolved()) {
        alert('⏰ Time’s up—but you nailed it! Mint your perfect masterpiece 🌟');
      } else {
        alert(
          '⏳ Time’s up! This is your masterpiece—an arrangement uniquely yours. ' +
          'Feel free to mint it for keeps or hit “Restart” to try again.'
        );
      }

      mintBtn.disabled   = false;
      startBtn.disabled  = false;
      restartBtn.disabled= false;
    }
  }, 1000);
}

// ── RESTART HANDLER ────────────────────────────────────────
restartBtn.addEventListener('click', () => {
  clearInterval(timerHandle);
  puzzleGrid.innerHTML = '';
  timeLeftEl.textContent = '45';
  startBtn.disabled    = false;
  mintBtn.disabled     = true;
  restartBtn.disabled  = true;
});

// ── START GAME ───────────────────────────────────────────
startBtn.addEventListener('click', async () => {
  startBtn.disabled    = true;
  mintBtn.disabled     = true;
  restartBtn.disabled  = true;
  await loadImageList();
  buildPuzzle(pickRandomImage());
  startTimer();
});

// ── MINT SNAPSHOT → NETLIFY FN → ON-CHAIN ─────────────────
async function mintSnapshot() {
  try {
    const canvas   = await html2canvas(puzzleGrid);
    const snapshot = canvas.toDataURL('image/png');
    const resp     = await fetch('/.netlify/functions/pinata',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ snapshot })
    });
    if (!resp.ok) throw new Error('Pinata function failed');
    const { metadataCid } = await resp.json();

    const uri = `ipfs://${metadataCid}`;
    const tx  = await contract.mintNFT(await signer.getAddress(), uri);
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

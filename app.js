// ── CONFIG ──────────────────────────────────────────────────
const PINATA_JWT       = '<YOUR_PINATA_JWT>';
const CONTRACT_ADDRESS = '0xCd9926fc1A944262c213Cc1c4c03844D7A842892';
const ABI = [ /* paste full ABI here */ ];

// GitHub Assets Repo
const GITHUB_OWNER     = 'your-github-username';
const ASSETS_REPO      = 'match-and-mint-assets';
const GITHUB_BRANCH    = 'main';
const IMAGES_PATH      = 'images';

// ── UI ELEMENTS & STATE ─────────────────────────────────────
const connectBtn  = document.getElementById('connectBtn');
const walletStatus= document.getElementById('walletStatus');
const startBtn    = document.getElementById('startBtn');
const mintBtn     = document.getElementById('mintBtn');
const timeLeftEl  = document.getElementById('timeLeft');
const puzzleGrid  = document.getElementById('puzzleGrid');
const previewImg  = document.querySelector('.preview img');

let provider, signer, contract;
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
  const url = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${ASSETS_REPO}/${GITHUB_BRANCH}/list.json`;
  try {
    const res = await fetch(url);
    imageList = await res.json();
  } catch (e) {
    console.error('Failed to load list.json', e);
  }
}

function pickRandomImage() {
  if (!imageList.length) return 'preview.png';
  const file = imageList[Math.floor(Math.random() * imageList.length)];
  return `https://raw.githubusercontent.com/${GITHUB_OWNER}/${ASSETS_REPO}/${GITHUB_BRANCH}/${IMAGES_PATH}/${file}`;
}

// ── WALLET & CONTRACT ─────────────────────────────────────
async function connectWallet() {
  if (!window.ethereum) {
    return alert('No Web3 wallet found—install MetaMask!');
  }
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: '0x279F' }], // 10143 in hex (corrected)
    });
  } catch (err) {
    if (err.code === 4902) {
      try {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: '0x279F',
            chainName: 'Monad Testnet',
            nativeCurrency: {
              name: 'Monad Testnet',
              symbol: 'MON',
              decimals: 18
            },
            rpcUrls: ['https://testnet-rpc.monad.xyz'],
            blockExplorerUrls: ['https://testnet.monadexplorer.com']
          }],
        });
      } catch (addErr) {
        console.error('Add chain error:', addErr);
        return alert('Cannot add Monad Testnet to wallet.');
      }
    } else {
      console.error('Switch chain error:', err);
      return alert('Failed to switch to Monad Testnet.');
    }
  }

  // Now request accounts
  await window.ethereum.request({ method: 'eth_requestAccounts' });
  provider = new ethers.providers.Web3Provider(window.ethereum);
  signer   = provider.getSigner();
  contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);

  const addr = await signer.getAddress();
  const short = addr.slice(0, 6) + '...' + addr.slice(-4);
  walletStatus.textContent = `Connected: ${short}`;
  startBtn.disabled = false;
}
connectBtn.addEventListener('click', connectWallet);

// ── PUZZLE BUILD & DRAGDROP ──────────────────────────────
function buildPuzzle(imageUrl) {
  puzzleGrid.innerHTML = '';
  const cells = [];
  for (let i = 0; i < ROWS * COLS; i++) {
    const cell = document.createElement('div');
    cell.className = 'cell';
    const x = (i % COLS) * 100;
    const y = Math.floor(i / COLS) * 100;
    Object.assign(cell.style, {
      backgroundImage: `url(${imageUrl})`,
      backgroundSize: `${COLS * 100}px ${ROWS * 100}px`,
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
      alert('Time’s up! Hit Mint to finalize 🌟');
    }
  }, 1000);
}

// ── START GAME ───────────────────────────────────────────
startBtn.addEventListener('click', async () => {
  startBtn.disabled = true;
  mintBtn.disabled = false;

  if (!imageList.length) await loadImageList();
  const imgUrl = pickRandomImage();
  buildPuzzle(imgUrl);
  startTimer();
});

// ── MINT SNAPSHOT → PINATA → ON-CHAIN ─────────────────────
async function mintSnapshot() {
  try {
    const canvas = await html2canvas(puzzleGrid);
    const blob = await new Promise(res => canvas.toBlob(res, 'image/png'));

    const fd = new FormData();
    fd.append('file', blob, 'snapshot.png');
    let res = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: { Authorization: `Bearer ${PINATA_JWT}` },
      body: fd
    });
    if (!res.ok) throw new Error('Pin file failed');
    const { IpfsHash: imageCid } = await res.json();

    const meta = {
      name: `Puzzle Snapshot #${Date.now()}`,
      description: 'Your custom puzzle arrangement, immortalized on-chain!',
      image: `ipfs://${imageCid}`
    };
    res = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${PINATA_JWT}` },
      body: JSON.stringify(meta)
    });
    if (!res.ok) throw new Error('Pin JSON failed');
    const { IpfsHash: metadataCid } = await res.json();

    const uri = `ipfs://${metadataCid}`;
    const tx = await contract.mintNFT(await signer.getAddress(), uri);
    await tx.wait();

    previewImg.src = canvas.toDataURL('image/png');
    alert('Minted! 🎉 Your NFT is live.');
    clearInterval(timerHandle);
    mintBtn.disabled = true;
    startBtn.disabled = false;
  } catch (err) {
    console.error(err);
    alert('Error: ' + err.message);
  }
}
mintBtn.addEventListener('click', mintSnapshot);

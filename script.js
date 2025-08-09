<script>
// ✅ Updated app.js with Pinata JWT upload using Netlify Function

// ── CONFIG ────────────────────────────────────────────
const CONTRACT_ADDRESS = '0x259C1Da2586295881C18B733Cb738fe1151bD2e5';
const CHAIN_ID = 10143;
const CHAIN_ID_HEX = '0x279F';

const ABI = [
  {
    "inputs": [],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "approved",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      }
    ],
    "name": "Approval",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "operator",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "bool",
        "name": "approved",
        "type": "bool"
      }
    ],
    "name": "ApprovalForAll",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "to",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      }
    ],
    "name": "approve",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "_fromTokenId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "_toTokenId",
        "type": "uint256"
      }
    ],
    "name": "BatchMetadataUpdate",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "_tokenId",
        "type": "uint256"
      }
    ],
    "name": "MetadataUpdate",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "to",
        "type": "address"
      },
      {
        "internalType": "string",
        "name": "uri",
        "type": "string"
      }
    ],
    "name": "mintNFT",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "from",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "to",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      }
    ],
    "name": "safeTransferFrom",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "from",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "to",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      },
      {
        "internalType": "bytes",
        "name": "data",
        "type": "bytes"
      }
    ],
    "name": "safeTransferFrom",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "operator",
        "type": "address"
      },
      {
        "internalType": "bool",
        "name": "approved",
        "type": "bool"
      }
    ],
    "name": "setApprovalForAll",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "from",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "to",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      }
    ],
    "name": "Transfer",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "from",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "to",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      }
    ],
    "name": "transferFrom",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "owner",
        "type": "address"
      }
    ],
    "name": "balanceOf",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      }
    ],
    "name": "getApproved",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "operator",
        "type": "address"
      }
    ],
    "name": "isApprovedForAll",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "name",
    "outputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "nextTokenId",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      }
    ],
    "name": "ownerOf",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes4",
        "name": "interfaceId",
        "type": "bytes4"
      }
    ],
    "name": "supportsInterface",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "symbol",
    "outputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      }
    ],
    "name": "tokenURI",
    "outputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
]


// ── ASSETS CONFIG ─────────────────────────────────────
const GITHUB_OWNER = 'Chiyachita';
const ASSETS_REPO = 'match-and-mint-assets';
const GITHUB_BRANCH = 'main';
const IMAGES_PATH = 'images';

// ── UI ELEMENTS ───────────────────────────────────────
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

function getInjectedProvider() {
  const { ethereum } = window;
  if (ethereum?.providers && Array.isArray(ethereum.providers)) {
    const availableWallets = ethereum.providers.map((provider, index) => {
      let name = 'Unknown Wallet';
      if (provider.isMetaMask) name = 'MetaMask';
      else if (provider.isCoinbaseWallet) name = 'Coinbase Wallet';
      else if (provider.isBackpack) name = 'Backpack';
      else if (provider.isPhantom) name = 'Phantom';
      else if (provider.isBraveWallet) name = 'Brave Wallet';
      else if (provider.isRabby) name = 'Rabby';
      else if (provider.isTrust) name = 'Trust Wallet';
      else if (provider.isOKExWallet) name = 'OKX Wallet';
      return { provider, name, index };
    });

    const walletOptions = availableWallets.map((w, i) => `${i + 1}: ${w.name}`).join('\n');
    const selection = prompt(`Multiple wallets detected:\n${walletOptions}\n\nEnter number:`);
    if (selection && !isNaN(selection)) {
      const index = parseInt(selection) - 1;
      if (index >= 0 && index < availableWallets.length) {
        return availableWallets[index].provider;
      }
    }
    return ethereum.providers[0];
  }
  return ethereum;
}

// ✅ Robust chain switch (ใช้ eth_chainId + explorer URL ที่ถูก)
async function switchToMonad(ethersProvider) {
  try {
    const chainIdHex = await ethersProvider.send('eth_chainId', []);
    if (chainIdHex?.toLowerCase() === CHAIN_ID_HEX.toLowerCase()) return;

    try {
      await ethersProvider.send('wallet_switchEthereumChain', [{ chainId: CHAIN_ID_HEX }]);
    } catch (e) {
      if (e?.code === 4902 || /Unrecognized chain ID/i.test(e?.message || '')) {
        await ethersProvider.send('wallet_addEthereumChain', [{
          chainId: CHAIN_ID_HEX,
          chainName: 'Monad Testnet',
          nativeCurrency: { name: 'MON', symbol: 'MON', decimals: 18 },
          rpcUrls: ['https://testnet-rpc.monad.xyz'],
          blockExplorerUrls: ['https://testnet.monadexplorer.com']
        }]);
      } else {
        throw e;
      }
    }
  } catch (err) {
    console.error('Network switch failed:', err);
    throw new Error('Failed to switch to Monad Testnet: ' + (err.message || err));
  }
}

// ✅ Connect (multi-provider-friendly) + อัปเดตสถานะ + ปลดล็อกปุ่ม mint
async function connectInjected() {
  const injected = getInjectedProvider();
  if (!injected) {
    alert('No injected wallet found! Please install MetaMask, Backpack, or another Web3 wallet.');
    return;
  }

  try {
    // Try existing accounts first to avoid -32002
    let accounts = await injected.request({ method: 'eth_accounts' }).catch(() => []);
    if (!accounts || accounts.length === 0) {
      accounts = await injected.request({ method: 'eth_requestAccounts' });
    }
    if (!accounts || accounts.length === 0) {
      throw new Error('No accounts returned from wallet');
    }

    const ethersProvider = new ethers.providers.Web3Provider(injected, 'any');
    await switchToMonad(ethersProvider);
    await finishConnect(ethersProvider);

    walletStatus.textContent = `Connected: ${accounts[0].slice(0,6)}...${accounts[0].slice(-4)} (Monad)`;
    mintBtn.disabled = false;
  } catch (err) {
    console.error('Injected connect failed', err);
    if (err.code === 4001) {
      alert('Wallet connection was rejected by user.');
    } else if (err.code === -32002) {
      alert('Wallet connection request is already pending. Please open your wallet.');
    } else {
      alert('Failed to connect wallet: ' + (err.message || err));
    }
  }
}

async function finishConnect(ethersProvider) {
  provider = ethersProvider;
  signer   = provider.getSigner();
  contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);

  const addr = await signer.getAddress();
  walletStatus.textContent = `Connected: ${addr.slice(0,6)}...${addr.slice(-4)} (Monad)`;
  startBtn.disabled = false;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function pickRandomImage() {
  if (!imageList.length) return 'preview.png';
  const file = imageList[Math.floor(Math.random() * imageList.length)];
  return `https://cdn.jsdelivr.net/gh/${GITHUB_OWNER}/${ASSETS_REPO}@${GITHUB_BRANCH}/${IMAGES_PATH}/${file}`;
}

async function loadImageList() {
  const url = `https://cdn.jsdelivr.net/gh/${GITHUB_OWNER}/${ASSETS_REPO}@${GITHUB_BRANCH}/list.json`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(res.status);
    imageList = await res.json();
  } catch (e) {
    alert('⚠️ Could not load asset list.');
  }
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
  const kids = Array.from(puzzleGrid.children);
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
      alert('⏳ Time’s up! This is your masterpiece — mint it or restart.');
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

// ── MINT SNAPSHOT via SERVERLESS FUNCTION ────────────────
async function mintSnapshot() {
  try {
    if (!puzzleGrid.children.length) throw new Error('No puzzle to mint');

    const canvas = await html2canvas(puzzleGrid, {
      width: 420,
      height: 420,
      backgroundColor: '#ffffff'
    });

    const snapshot = canvas.toDataURL('image/png');

    // dev = localhost:3000, prod = origin เดียวกัน
    const apiBase = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
      ? 'http://localhost:3000'
      : '';

    const res = await fetch(`${apiBase}/api/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: snapshot })
    });

    if (!res.ok) {
      let msg = 'Upload failed';
      try { const j = await res.json(); msg = j.error || msg; } catch {}
      throw new Error(msg);
    }

    const upload = await res.json();
    const metaUri = upload.uri;
    if (!metaUri) throw new Error('No metadata URI returned');

    const tx = await contract.mintNFT(await signer.getAddress(), metaUri);
    await tx.wait();

    previewImg.src = snapshot;
    alert('🎉 Minted successfully!');
    clearInterval(timerHandle);
    mintBtn.disabled = true;
    startBtn.disabled = false;
    restartBtn.disabled = false;
  } catch (err) {
    alert('Mint failed: ' + err.message);
  }
}

mintBtn.addEventListener('click', mintSnapshot);
connectInjectedBtn.addEventListener('click', connectInjected);
connectWalletConnectBtn.addEventListener('click', connectWalletConnect);

// preload list + preview
(async function init() {
  await loadImageList();
  if (imageList.length) previewImg.src = pickRandomImage();
})();
</script>

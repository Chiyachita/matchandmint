// app.js

// ── PICK AN INJECTED WALLET PROVIDER ────────────────────────
function getInjectedProvider() {
  const { ethereum } = window;

  // If multiple wallets injected
  if (ethereum?.providers && Array.isArray(ethereum.providers)) {
    // Show wallet selection dialog
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

    // Create selection prompt
    const walletOptions = availableWallets
      .map((w, i) => `${i + 1}: ${w.name}`)
      .join('\n');

    const selection = prompt(
      `Multiple wallets detected. Choose one:\n${walletOptions}\n\nEnter number (or press Cancel for first available):`
    );

    if (selection && !isNaN(selection)) {
      const index = parseInt(selection) - 1;
      if (index >= 0 && index < availableWallets.length) {
        return availableWallets[index].provider;
      }
    }

    // Default to first provider if cancelled or invalid selection
    return ethereum.providers[0];
  }

  // Single wallet or standard ethereum object
  return ethereum;
}

// ── CHAIN CONFIG ──────────────────────────────────────────
const CHAIN_ID     = 10143;
const CHAIN_ID_HEX = '0x279F';

// ── CONTRACT & ASSETS CONFIG ──────────────────────────────
const CONTRACT_ADDRESS = '0x259C1Da2586295881C18B733Cb738fe1151bD2e5';
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
];

// ── ASSET SOURCES ─────────────────────────────────────────
const GITHUB_OWNER  = 'Chiyachita';
const ASSETS_REPO   = 'match-and-mint-assets';
const GITHUB_BRANCH = 'main';
const IMAGES_PATH   = 'images';

// ── UI ELEMENTS ────────────────────────────────────────────
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

// ── HELPERS ────────────────────────────────────────────────
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

async function loadImageList() {
  const url = `https://cdn.jsdelivr.net/gh/${GITHUB_OWNER}/${ASSETS_REPO}@${GITHUB_BRANCH}/list.json`;
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
  return `https://cdn.jsdelivr.net/gh/${GITHUB_OWNER}/${ASSETS_REPO}@${GITHUB_BRANCH}/${IMAGES_PATH}/${file}`;
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

// ── CONNECT INJECTED WALLET ────────────────────────────────
async function connectInjected() {
  const injected = getInjectedProvider();
  if (!injected) {
    alert('No injected wallet found! Please install a wallet like MetaMask, Coinbase Wallet, or Backpack, then try again.');
    return;
  }

  try {
    // Request account access
    const accounts = await injected.request({ method: 'eth_requestAccounts' });
    if (!accounts || accounts.length === 0) {
      throw new Error('No accounts available');
    }

    const ethersProvider = new ethers.providers.Web3Provider(injected, 'any');
    await switchToMonad(ethersProvider);
    finishConnect(ethersProvider);
  } catch (err) {
    console.error('Injected connect failed', err);
    let errorMsg = 'Failed to connect wallet.';

    if (err.code === 4001) {
      errorMsg = 'Connection rejected by user.';
    } else if (err.code === -32002) {
      errorMsg = 'Connection request already pending. Please check your wallet.';
    } else if (err.message.includes('accounts')) {
      errorMsg = 'No accounts found. Please unlock your wallet.';
    }

    alert(errorMsg);
  }
}

// ── CONNECT WALLETCONNECT ──────────────────────────────────
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
    console.error('WalletConnect failed', err);
    alert('Failed to connect via WalletConnect.');
  }
}

// ── POST-CONNECT SETUP ─────────────────────────────────────
async function finishConnect(ethersProvider) {
  provider = ethersProvider;
  signer   = provider.getSigner();
  contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);

  const addr = await signer.getAddress();
  walletStatus.textContent = `Connected: ${addr.slice(0,6)}...${addr.slice(-4)} (Monad)`;
  startBtn.disabled = false;

  // Listen on the *raw* provider for account/chain changes
  const raw = provider.provider;
  raw.on('accountsChanged', ([a]) => {
    walletStatus.textContent = `Connected: ${a.slice(0,6)}...${a.slice(-4)} (Monad)`;
  });
  raw.on('chainChanged', cid => {
    if (cid !== CHAIN_ID_HEX) window.location.reload();
  });
  raw.on('disconnect', () => window.location.reload());
}

// ── BUILD & DRAG-DROP PUZZLE ───────────────────────────────
function buildPuzzle(imageUrl) {
  puzzleGrid.innerHTML = '';
  const cells = [];
  for (let i = 0; i < ROWS * COLS; i++) {
    const cell = document.createElement('div');
    cell.className     = 'cell';
    cell.dataset.index = i;
    const x = (i % COLS) * 100, y = Math.floor(i / COLS) * 100;
    Object.assign(cell.style, {
      backgroundImage: `url(${imageUrl})`,
      backgroundSize: `${COLS*100}px ${ROWS*100}px`,
      backgroundPosition: `-${x}px -${y}px`
    });
    cell.draggable    = true;
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

// ── TIMER & RESTART ────────────────────────────────────────
function startTimer() {
  clearInterval(timerHandle);
  timeLeft = 45;
  timeLeftEl.textContent = timeLeft;
  timerHandle = setInterval(() => {
    timeLeftEl.textContent = --timeLeft;
    if (timeLeft <= 0) {
      clearInterval(timerHandle);
      alert(
        isPuzzleSolved()
          ? '⏰ Time’s up—but you nailed it! Mint your perfect masterpiece 🌟'
          : '⏳ Time’s up! This is your masterpiece—feel free to mint or Restart.'
      );
      startBtn.disabled   = false;
      restartBtn.disabled = false;
    }
  }, 1000);
}

restartBtn.addEventListener('click', () => {
  clearInterval(timerHandle);
  puzzleGrid.innerHTML    = '';
  timeLeftEl.textContent  = '45';
  startBtn.disabled       = false;
  mintBtn.disabled        = true;
  restartBtn.disabled     = true;
});

// ── START GAME ───────────────────────────────────────────
startBtn.addEventListener('click', async () => {
  startBtn.disabled     = true;
  mintBtn.disabled      = false;
  restartBtn.disabled   = true;
  if (!imageList.length) await loadImageList();
  const imageUrl = pickRandomImage();

  // Set preview image first, then build puzzle
  previewImg.src = imageUrl;

  // Build puzzle immediately, don't wait for image load
  buildPuzzle(imageUrl);

  // Handle image loading for preview
  previewImg.onload = () => {
    console.log('Reference image loaded successfully');
  };

  // Fallback if image fails to load
  previewImg.onerror = () => {
    console.warn('Failed to load reference image from GitHub, using fallback');
    previewImg.src = 'preview.png';
  };

  startTimer();
});

// ── MINT SNAPSHOT → NFT.STORAGE → ON-CHAIN ─────────────────
async function mintSnapshot() {
  try {
    // 1) snapshot - ensure grid is visible and has content
    if (!puzzleGrid.children.length) {
      throw new Error('No puzzle pieces to mint');
    }

    console.log('Capturing puzzle grid:', puzzleGrid.offsetWidth, 'x', puzzleGrid.offsetHeight);
    const canvas = await html2canvas(puzzleGrid, {
      width: 420,
      height: 420,
      backgroundColor: '#ffffff'
    });
    const snapshot = canvas.toDataURL('image/png');
    console.log('Canvas size:', canvas.width, 'x', canvas.height);

    // 2) Convert base64 to blob for NFT.Storage
    const base64Data = snapshot.split(',')[1];
    const byteArray = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
    const blob = new Blob([byteArray], { type: 'image/png' });

    // 3) Upload to NFT.Storage directly
    if (!NFT_STORAGE_KEY || NFT_STORAGE_KEY === 'YOUR_NFT_STORAGE_API_KEY_HERE') {
      throw new Error('Please update NFT_STORAGE_KEY with your valid API key from https://nft.storage/');
    }

    // Upload image
    const imageFormData = new FormData();
    imageFormData.append('file', blob, 'puzzle.png');

    const imageResponse = await fetch('https://api.nft.storage/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NFT_STORAGE_KEY}`
      },
      body: imageFormData
    });

    if (!imageResponse.ok) {
      const errorText = await imageResponse.text();
      console.error('Image upload error:', errorText);
      throw new Error(`Image upload failed: ${imageResponse.status} - ${errorText}`);
    }
    const imageResult = await imageResponse.json();
    const imageCid = imageResult.value.cid;

    // 4) Create metadata
    const metadata = {
      name: "Match and Mint Puzzle",
      description: "A puzzle NFT created by matching pieces in the Match and Mint game",
      image: `https://ipfs.io/ipfs/${imageCid}`,
      attributes: [
        {
          trait_type: "Game Type",
          value: "Puzzle"
        },
        {
          trait_type: "Difficulty",
          value: "4x4 Grid"
        },
        {
          trait_type: "Created",
          value: new Date().toISOString()
        }
      ]
    };

    // Upload metadata
    const metadataBlob = new Blob([JSON.stringify(metadata)], { type: 'application/json' });
    const metadataFormData = new FormData();
    metadataFormData.append('file', metadataBlob, 'metadata.json');

    const metadataResponse = await fetch('https://api.nft.storage/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NFT_STORAGE_KEY}`
      },
      body: metadataFormData
    });

    if (!metadataResponse.ok) {
      const errorText = await metadataResponse.text();
      console.error('Metadata upload error:', errorText);
      throw new Error(`Metadata upload failed: ${metadataResponse.status} - ${errorText}`);
    }
    const metadataResult = await metadataResponse.json();
    const metadataCid = metadataResult.value.cid;

    // 5) mint on-chain
    const uri = `https://ipfs.io/ipfs/${metadataCid}`;
    const tx  = await contract.mintNFT(await signer.getAddress(), uri);
    await tx.wait();

    // 6) feedback
    previewImg.src      = snapshot;
    alert('🎉 Minted! Your NFT is live.');
    clearInterval(timerHandle);
    mintBtn.disabled    = true;
    startBtn.disabled   = false;
    restartBtn.disabled = false;
  } catch (err) {
    console.error('Mint error:', err);
    alert('Mint failed: ' + err.message);
  }
}

mintBtn.addEventListener('click', mintSnapshot);
connectInjectedBtn.addEventListener('click', connectInjected);
connectWalletConnectBtn.addEventListener('click', connectWalletConnect);

// Initialize preview image from GitHub on page load
(async function initializePreview() {
  await loadImageList();
  if (imageList.length > 0) {
    previewImg.src = pickRandomImage();
  }
})();

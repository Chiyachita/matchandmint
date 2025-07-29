// script.js

// ——— Contract & ABI ———
const contractAddress = "0xCd9926fc1A944262c213Cc1c4c03844D7A842892";
const contractABI = [
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
		"inputs": [],
		"stateMutability": "nonpayable",
		"type": "constructor"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "sender",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "tokenId",
				"type": "uint256"
			},
			{
				"internalType": "address",
				"name": "owner",
				"type": "address"
			}
		],
		"name": "ERC721IncorrectOwner",
		"type": "error"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "operator",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "tokenId",
				"type": "uint256"
			}
		],
		"name": "ERC721InsufficientApproval",
		"type": "error"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "approver",
				"type": "address"
			}
		],
		"name": "ERC721InvalidApprover",
		"type": "error"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "operator",
				"type": "address"
			}
		],
		"name": "ERC721InvalidOperator",
		"type": "error"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "owner",
				"type": "address"
			}
		],
		"name": "ERC721InvalidOwner",
		"type": "error"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "receiver",
				"type": "address"
			}
		],
		"name": "ERC721InvalidReceiver",
		"type": "error"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "sender",
				"type": "address"
			}
		],
		"name": "ERC721InvalidSender",
		"type": "error"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "tokenId",
				"type": "uint256"
			}
		],
		"name": "ERC721NonexistentToken",
		"type": "error"
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

// ——— Image assets ———
const imageBaseURL = "https://cdn.jsdelivr.net/gh/Chiyachita/match-and-mint-assets/images/";
let imageList = [];

// ——— App state ———
let provider, signer, userAddress;
let timerID, timeLeft = 45;
let hasMinted = true;
let selectedName, selectedURL;

// ——— DOM refs ———
const connectBtn  = document.getElementById("connect-btn");
const walletDisp  = document.getElementById("wallet-address");
const startBtn    = document.getElementById("start-btn");
const mintBtn     = document.getElementById("mint-btn");
const timerSpan   = document.getElementById("timer");
const board       = document.getElementById("puzzle-board");
const sampleImage = document.getElementById("sample-image");

// ——— Load list.json on startup ———
async function loadImageList() {
  try {
    const res = await fetch(
      "https://cdn.jsdelivr.net/gh/Chiyachita/match-and-mint-assets/list.json"
    );
    imageList = await res.json();
  } catch (e) {
    console.error(e);
    alert("❌ Failed to load images");
  }
}
window.addEventListener("DOMContentLoaded", loadImageList);

// ——— Connect wallet & chain check ———
connectBtn.onclick = async () => {
  if (!window.ethereum) return alert("Please install a Web3 wallet!");
  provider = new ethers.providers.Web3Provider(window.ethereum, "any");
  await provider.send("eth_requestAccounts", []);
  const { chainId } = await provider.getNetwork();
  if (chainId !== 10143) {
    return alert("Switch to Monad Testnet (10143)");
  }
  signer = provider.getSigner();
  userAddress = await signer.getAddress();
  walletDisp.innerText = `Connected: ${userAddress.slice(0,6)}…${userAddress.slice(-4)}`;
  startBtn.disabled = false;
};

// ——— Start / Mint buttons ———
startBtn.onclick = () => {
  if (!hasMinted) return alert("Please mint your last puzzle first.");
  initPuzzle();
  startCountdown();
  mintBtn.disabled = false;
};

mintBtn.onclick = () => {
  clearInterval(timerID);
  if (confirm("Keep your masterpiece as an NFT?")) {
    mintBtn.disabled = true;
    doMint();
  } else {
    mintBtn.disabled = true;
  }
};

// ——— Puzzle logic ———
function initPuzzle() {
  board.innerHTML = "";
  timeLeft = 45;
  timerSpan.textContent = timeLeft;
  sampleImage.classList.remove("hidden");

  selectedName = imageList[
    Math.floor(Math.random() * imageList.length)
  ];
  selectedURL = imageBaseURL + selectedName;
  sampleImage.src = selectedURL;
  hasMinted = false;

  const positions = [];
  for (let y=0; y<4; y++)
    for (let x=0; x<4; x++)
      positions.push({ x: -x*100, y: -y*100 });

  shuffle(positions);

  positions.forEach(p => {
    const d = document.createElement("div");
    d.className = "piece";
    d.draggable = true;
    d.style.backgroundImage = `url(${selectedURL})`;
    d.style.backgroundPosition = `${p.x}px ${p.y}px`;
    board.appendChild(d);
  });

  // drag & swap
  let dragged;
  board.addEventListener("dragstart", e => {
    if (e.target.classList.contains("piece")) dragged = e.target;
  });
  board.addEventListener("dragover", e => e.preventDefault());
  board.addEventListener("drop", e => {
    if (e.target.classList.contains("piece") && dragged !== e.target) {
      const placeholder = document.createElement("div");
      board.replaceChild(placeholder, dragged);
      board.replaceChild(dragged, e.target);
      board.replaceChild(e.target, placeholder);
    }
  });
}

// ——— Countdown ———
function startCountdown() {
  timerSpan.textContent = timeLeft;
  timerID = setInterval(() => {
    timeLeft--;
    timerSpan.textContent = timeLeft;
    if (timeLeft <= 0) {
      clearInterval(timerID);
      mintBtn.disabled = true;
      if (confirm("Time’s up! Mint your masterpiece?")) {
        doMint();
      }
    }
  }, 1000);
}

// ——— Mint / Pinata upload ———
async function doMint() {
  try {
    // 1) snapshot
    const canvas = await html2canvas(board, { backgroundColor: null });
    const blob = await new Promise(r => canvas.toBlob(r, "image/png"));
    const dataURL = await new Promise(r => {
      const fr = new FileReader();
      fr.onload = () => r(fr.result);
      fr.readAsDataURL(blob);
    });

    // 2) upload via Netlify Fn
    const pinRes = await fetch("/.netlify/functions/uploadToPinata", {
      method: "POST",
      body: dataURL
    });
    if (!pinRes.ok) throw new Error("Pinata upload failed");
    const { IpfsHash } = await pinRes.json();
    const tokenURI = `ipfs://${IpfsHash}`;

    // 3) mint on chain
    const contract = new ethers.Contract(contractAddress, contractABI, signer);
    const tx = await contract.mintNFT(userAddress, tokenURI);
    await tx.wait();

    alert("✅ NFT minted!");
    hasMinted = true;
  } catch (err) {
    console.error(err);
    alert("❌ Mint failed—check console");
  }
}

// ——— Utility ———
function shuffle(a) {
  for (let i=a.length-1; i>0; i--) {
    const j = Math.floor(Math.random()*(i+1));
    [a[i], a[j]] = [a[j], a[i]];
  }
}


let userAddress = null, provider, signer;
let draggedPiece = null, timer, timeLeft = 45, selectedName = "", hasMinted = true;
const contractAddress = "0x3A800029F5E76683b2664A70CF984fBC6c9D0Db1";
const contractABI = [
  {
    "inputs": [
      { "internalType": "address", "name": "to", "type": "address" },
      { "internalType": "string", "name": "tokenURI", "type": "string" }
    ],
    "name": "mintNFT",
    "outputs": [ { "internalType": "uint256", "name": "", "type": "uint256" } ],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

const imageBaseURL = "https://cdn.jsdelivr.net/gh/Chiyachita/match-and-mint-assets/images/";
let imageList = [];

async function loadImageList() {
  try {
    const res = await fetch("https://cdn.jsdelivr.net/gh/Chiyachita/match-and-mint-assets/list.json");
    imageList = await res.json();
  } catch (e) {
    alert("❌ Failed to load puzzle list");
    console.error(e);
  }
}
window.addEventListener("DOMContentLoaded", loadImageList);

const connectBtn   = document.getElementById("connect-btn"),
      walletDisplay= document.getElementById("wallet-address"),
      startBtn     = document.getElementById("start-btn"),
      mintBtn      = document.getElementById("mint-btn"),
      board        = document.getElementById("puzzle-board"),
      timerDisplay = document.getElementById("timer"),
      sampleImage  = document.getElementById("sample-image");

// Connect Wallet
connectBtn.addEventListener("click", async () => {
  if (!window.ethereum) return alert("Install a Web3 wallet!");
  provider = new ethers.providers.Web3Provider(window.ethereum, "any");
  await provider.send("eth_requestAccounts", []);
  const net = await provider.getNetwork();
  if (net.chainId !== 10143) {
    alert("Switch to Monad Testnet (Chain ID 10143)");
    return;
  }
  signer = provider.getSigner();
  userAddress = await signer.getAddress();
  walletDisplay.textContent = userAddress.slice(0,6) + "…" + userAddress.slice(-4);
  startBtn.disabled = false;
});

// Start Game
startBtn.addEventListener("click", () => {
  if (!hasMinted) {
    alert("Mint your last snapshot first!");
    return;
  }
  beginPuzzle();
});

// Manual Mint
mintBtn.addEventListener("click", () => {
  if (hasMinted) return;
  mintSnapshot();
});

// Puzzle Logic
function beginPuzzle() {
  hasMinted = false;
  startBtn.disabled = true;
  mintBtn.disabled = true;
  board.innerHTML = "";
  timeLeft = 45;
  timerDisplay.textContent = timeLeft;

  selectedName = imageList[Math.floor(Math.random() * imageList.length)];
  const imgUrl = imageBaseURL + selectedName;
  sampleImage.src = imgUrl;

  let positions = [];
  for (let y=0; y<4; y++) {
    for (let x=0; x<4; x++) {
      positions.push({ x: -x*100, y: -y*100 });
    }
  }
  shuffle(positions);

  positions.forEach(pos => {
    const piece = document.createElement("div");
    piece.className = "piece";
    piece.style.backgroundImage = `url('${imgUrl}')`;
    piece.style.backgroundPosition = `${pos.x}px ${pos.y}px`;
    piece.draggable = true;
    board.appendChild(piece);
  });

  board.addEventListener("dragstart", e => {
    if (e.target.classList.contains("piece")) draggedPiece = e.target;
  });
  board.addEventListener("dragover", e => e.preventDefault());
  board.addEventListener("drop", e => {
    if (e.target.classList.contains("piece") && draggedPiece !== e.target) {
      const tmp = document.createElement("div");
      board.replaceChild(tmp, draggedPiece);
      board.replaceChild(draggedPiece, e.target);
      board.replaceChild(e.target, tmp);
    }
  });

  timer = setInterval(() => {
    timerDisplay.textContent = --timeLeft;
    if (timeLeft <= 0) {
      clearInterval(timer);
      promptMint();
    }
  }, 1000);
}

function promptMint() {
  [...board.querySelectorAll(".piece")].forEach(p=>p.draggable = false);
  if (confirm("Time’s up! This is your masterpiece—mint it as an NFT?")) {
    mintSnapshot();
  }
  startBtn.disabled = false;
}

async function mintSnapshot() {
  try {
    const canvas = await html2canvas(board, { backgroundColor: null });
    const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onloadend = async () => {
      const res = await fetch("/.netlify/functions/uploadToPinata", {
        method: "POST",
        body: reader.result
      });
      const { IpfsHash } = await res.json();
      const tokenURI = `ipfs://${IpfsHash}`;
      const contract = new ethers.Contract(contractAddress, contractABI, signer);
      await (await contract.mintNFT(userAddress, tokenURI)).wait();
      alert("✅ NFT minted!");
      hasMinted = true;
      mintBtn.disabled = true;
    };
  } catch (err) {
    console.error(err);
    alert("❌ Mint failed");
  }
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

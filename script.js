// script.js
let userAddress = null,
    provider, signer,
    draggedPiece = null,
    timer,
    timeLeft = 45,
    selectedName = "",
    hasMinted = false;

const contractAddress = "0x4d8C6eE695D2d4c65b9a6622c66b20d156D32bc1";
const contractABI = [
  {
    inputs: [{ internalType: "string", name: "uri", type: "string" }],
    name: "mintNFT",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function"
  }
];

const imageBaseURL = 
  "https://cdn.jsdelivr.net/gh/Chiyachita/match-and-mint-assets/images/";
let imageList = [];

async function loadImageList() {
  try {
    const res = await fetch(
      "https://cdn.jsdelivr.net/gh/Chiyachita/match-and-mint-assets/list.json"
    );
    imageList = await res.json();
  } catch (e) {
    console.error("Failed to load image list:", e);
    alert("❌ Could not load puzzle images.");
  }
}
window.addEventListener("DOMContentLoaded", loadImageList);

const connectBtn   = document.getElementById("connect-btn"),
      walletDisplay= document.getElementById("wallet-address"),
      startBtn     = document.getElementById("start-btn"),
      mintBtn      = document.getElementById("mint-btn"),
      timerDisplay = document.getElementById("timer"),
      board        = document.getElementById("puzzle-board"),
      sampleImage  = document.getElementById("sample-image");

// → Connect wallet + ensure Monad Testnet
connectBtn.addEventListener("click", async () => {
  if (!window.ethereum) return alert("⚠️ Install MetaMask or similar.");
  try {
    provider = new ethers.providers.Web3Provider(window.ethereum, "any");
    await provider.send("eth_requestAccounts", []);
    const network = await provider.getNetwork();
    if (network.chainId !== 10143) {
      return alert("⚠️ Switch to Monad Testnet (Chain ID 10143).");
    }
    signer = provider.getSigner();
    userAddress = await signer.getAddress();
    // show 0x1234…abcd
    const display = userAddress.slice(0,6) + "…" + userAddress.slice(-4);
    walletDisplay.textContent = `Connected: ${display}`;
    startBtn.disabled = false;
    mintBtn.disabled  = false;
  } catch (err) {
    console.error("Wallet connect failed:", err);
    alert("❌ Wallet connection error.");
  }
});

// → Start game
startBtn.addEventListener("click", () => {
  if (!userAddress) return alert("⚠️ Connect first.");
  startGame();
});

// → Manual mint
mintBtn.addEventListener("click", () => {
  if (!selectedName) return alert("⚠️ Start a game first.");
  if (hasMinted)    return alert("✅ Already minted.");
  endGame(); // will snapshot + mint
});

function startGame() {
  // reset state
  board.innerHTML = "";
  timeLeft        = 45;
  timerDisplay.textContent = timeLeft;
  hasMinted       = false;

  // pick random image
  selectedName = imageList[
    Math.floor(Math.random() * imageList.length)
  ];
  const imgURL = `${imageBaseURL}${selectedName}`;
  sampleImage.src = imgURL;

  // slice into 4×4
  const positions = [];
  for (let y=0; y<4; y++){
    for (let x=0; x<4; x++){
      positions.push({ x:-x*100, y:-y*100 });
    }
  }
  shuffle(positions);
  positions.forEach(pos => {
    const piece = document.createElement("div");
    piece.classList.add("piece");
    piece.style.backgroundImage     = `url('${imgURL}')`;
    piece.style.backgroundPosition  = `${pos.x}px ${pos.y}px`;
    piece.draggable = true;
    board.appendChild(piece);
  });
  board.addEventListener("dragstart", e => {
    if (e.target.classList.contains("piece")) 
      draggedPiece = e.target;
  });
  board.addEventListener("dragover", e => e.preventDefault());
  board.addEventListener("drop", e => {
    if (
      e.target.classList.contains("piece") && 
      draggedPiece !== e.target
    ) {
      const tmp = document.createElement("div");
      board.replaceChild(tmp, draggedPiece);
      board.replaceChild(draggedPiece, e.target);
      board.replaceChild(e.target, tmp);
    }
  });

  // start countdown
  clearInterval(timer);
  timer = setInterval(() => {
    timeLeft--;
    timerDisplay.textContent = timeLeft;
    if (timeLeft <= 0) {
      clearInterval(timer);
      if (!hasMinted && confirm(
        "⏰ Time’s up! This is your masterpiece—do you want to keep it?"
      )) {
        endGame();
      }
    }
  }, 1000);
}

async function endGame() {
  // lock pieces
  document.querySelectorAll(".piece")
    .forEach(p => p.draggable = false);

  try {
    // snapshot
    const canvas = await html2canvas(board,{backgroundColor:null});
    const blob   = await new Promise(r => canvas.toBlob(r,"image/png"));
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onloadend = async () => {
      // upload to Pinata via your Netlify fn
      const resp = await fetch(
        "/.netlify/functions/uploadToPinata",
        { method:"POST", body: reader.result }
      );
      const { IpfsHash } = await resp.json();
      const uri = `ipfs://${IpfsHash}`;

      // mint on-chain
      const contract = new ethers.Contract(
        contractAddress, contractABI, signer
      );
      const tx = await contract.mintNFT(uri);
      await tx.wait();

      alert("✅ NFT minted!");
      hasMinted = true;
      mintBtn.disabled = true;
    };
  } catch (err) {
    console.error("Mint failed:", err);
    alert("❌ Mint failed—check console.");
  }
}

function shuffle(array) {
  for (let i=array.length-1; i>0; i--){
    const j = Math.floor(Math.random()*(i+1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

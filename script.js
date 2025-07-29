// --- State ---
let provider, signer, userAddress;
let timer, timeLeft = 45;
let draggedPiece = null;
let hasMinted = true;
let selectedName = "";
const contractAddress = "0x3A800029F5E76683b2664A70CF984fBC6c9D0Db1";
const contractABI = [ /* …your ABI… */ ];
const imageBaseURL =
  "https://cdn.jsdelivr.net/gh/Chiyachita/match-and-mint-assets/images/";
let imageList = [];

// --- DOM refs ---
const connectBtn = document.getElementById("connect-btn");
const walletDisplay = document.getElementById("wallet-address");
const startBtn      = document.getElementById("start-btn");
const mintBtn       = document.getElementById("mint-btn");
const timerDisplay  = document.getElementById("timer");
const board         = document.getElementById("puzzle-board");
const sampleImage   = document.getElementById("sample-image");

// --- Load image list from your assets repo ---
async function loadImageList() {
  try {
    const res = await fetch(
      "https://cdn.jsdelivr.net/gh/Chiyachita/match-and-mint-assets/list.json"
    );
    imageList = await res.json();
  } catch (err) {
    console.error(err);
    alert("❌ Couldn't load image list.");
  }
}
window.addEventListener("DOMContentLoaded", loadImageList);

// --- Wallet connection ---
connectBtn.addEventListener("click", async () => {
  if (!window.ethereum) {
    return alert("Install MetaMask or another EVM wallet!");
  }
  try {
    provider = new ethers.providers.Web3Provider(window.ethereum, "any");
    await provider.send("eth_requestAccounts", []);
    const net = await provider.getNetwork();
    if (net.chainId !== 10143) {
      alert("Switch to Monad Testnet (chain ID 10143)");
      return;
    }
    signer = provider.getSigner();
    userAddress = await signer.getAddress();
    walletDisplay.innerText = `Hi, ${userAddress.slice(0,6)}…${userAddress.slice(-4)}`;
    startBtn.disabled = false;
  } catch (err) {
    console.error(err);
    alert("❌ Wallet connection failed.");
  }
});

// --- Start & Mint button wiring ---
startBtn.addEventListener("click", () => {
  if (!hasMinted) {
    return alert("You must mint your last puzzle first.");
  }
  beginGame();
});
mintBtn.addEventListener("click", () => {
  if (!hasMinted) {
    clearInterval(timer);
    mintNFT();
  }
});

// --- Game logic ---
function beginGame() {
  // reset
  hasMinted = false;
  startBtn.disabled = true;
  mintBtn.disabled  = false;
  board.innerHTML   = "";
  timeLeft = 45;
  timerDisplay.innerText = timeLeft;

  // pick random image
  selectedName = imageList[Math.floor(Math.random()*imageList.length)];
  const imgURL = imageBaseURL + selectedName;
  sampleImage.src = imgURL;

  // slice–and–shuffle into 4×4 pieces
  const positions = [];
  for (let y=0;y<4;y++)for(let x=0;x<4;x++){
    positions.push({ x:-x*100, y:-y*100 });
  }
  shuffle(positions);
  positions.forEach(pos=>{
    const p = document.createElement("div");
    p.className = "piece";
    p.style.backgroundImage    = `url('${imgURL}')`;
    p.style.backgroundPosition = `${pos.x}px ${pos.y}px`;
    p.draggable = true;
    board.appendChild(p);
  });

  // drag/drop
  board.addEventListener("dragstart", e=>{
    if(e.target.classList.contains("piece")) draggedPiece = e.target;
  });
  board.addEventListener("dragover", e=>e.preventDefault());
  board.addEventListener("drop", e=>{
    if(e.target.classList.contains("piece") && draggedPiece!==e.target){
      const a = document.createElement("div");
      board.replaceChild(a, draggedPiece);
      board.replaceChild(draggedPiece, e.target);
      board.replaceChild(e.target, a);
    }
  });

  // countdown
  timer = setInterval(()=>{
    timeLeft--;
    timerDisplay.innerText = timeLeft;
    if(timeLeft<=0){
      clearInterval(timer);
      onTimeout();
    }
  },1000);
}

function onTimeout() {
  // disable further rearranging
  document.querySelectorAll(".piece")
    .forEach(p=>p.draggable=false);

  // ask before mint
  if(!hasMinted) {
    if ( confirm("⏰ Time's up! This is your masterpiece—keep it?") ) {
      mintNFT();
    }
  }
  startBtn.disabled = false;
  mintBtn.disabled  = true;
}

// --- Minting via Netlify Function ---
async function mintNFT() {
  hasMinted = true;
  mintBtn.disabled = true;

  try {
    const canvas = await html2canvas(board, { backgroundColor: null });
    const blob   = await new Promise(r=>canvas.toBlob(r,'image/png'));
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onloadend = async ()=> {
      const res = await fetch("/.netlify/functions/uploadToPinata", {
        method: "POST",
        body: reader.result
      });
      if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
      const { IpfsHash } = await res.json();

      const tokenURI = `ipfs://${IpfsHash}`;
      const contract = new ethers.Contract(contractAddress,contractABI,signer);
      const tx = await contract.mintNFT(userAddress, tokenURI);
      await tx.wait();
      alert("✅ NFT minted! Tx: " + tx.hash);
      startBtn.disabled = false;
    };
  } catch (err) {
    console.error(err);
    alert("❌ Mint failed. See console.");
    mintBtn.disabled = false;
  }
}

// --- Helpers ---
function shuffle(a){
  for(let i=a.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [a[i],a[j]] = [a[j],a[i]];
  }
}


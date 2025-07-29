// ── CONFIG ──
const CONTRACT_ADDRESS = "0x3A800029F5E76683b2664A70CF984fBC6c9D0Db1";
const CONTRACT_ABI = [ /* your ABI here */ ];
const NFT_STORAGE_KEY = "YOUR_NFT_STORAGE_KEY";  // from nft.storage

const imageBaseURL = 
  "https://cdn.jsdelivr.net/gh/Chiyachita/match-and-mint-assets/images/";
let imageList = [];

// ── STATE ──
let provider, signer, userAddress;
let timer, timeLeft=45, hasMinted=true, draggedPiece=null, selectedName="";

// ── UI REFS ──
const connectBtn  = document.getElementById("connect-btn");
const walletDisp  = document.getElementById("wallet-address");
const startBtn    = document.getElementById("start-btn");
const mintBtn     = document.getElementById("mint-btn");
const timerDisp   = document.getElementById("timer");
const board       = document.getElementById("puzzle-board");
const sampleImage = document.getElementById("sample-image");

// ── LOAD IMAGES LIST ──
window.addEventListener("DOMContentLoaded", async()=>{
  try {
    const res = await fetch(
      "https://cdn.jsdelivr.net/gh/Chiyachita/match-and-mint-assets/list.json"
    );
    imageList = await res.json();
  } catch(e) {
    console.error(e);
    alert("❌ Could not load puzzle images.");
  }
});

// ── CONNECT WALLET ──
connectBtn.addEventListener("click", async()=>{
  if(!window.ethereum) return alert("Install MetaMask!");
  provider = new ethers.providers.Web3Provider(window.ethereum, "any");
  await provider.send("eth_requestAccounts", []);
  const { chainId } = await provider.getNetwork();
  if(chainId !== 10143)
    return alert("Switch to Monad Testnet (10143).");
  signer = provider.getSigner();
  userAddress = await signer.getAddress();
  walletDisp.textContent = 
    userAddress.slice(0,4) + "…" + userAddress.slice(-4);
  startBtn.disabled = false;
});

// ── START GAME ──
startBtn.addEventListener("click", ()=>{
  if(!hasMinted)
    return alert("Mint your last snapshot first!");
  beginPuzzle();
});

function beginPuzzle(){
  hasMinted = false;
  startBtn.disabled = true;
  mintBtn.disabled = true;
  board.innerHTML = "";
  timeLeft = 45;
  timerDisp.textContent = timeLeft;

  selectedName = 
    imageList[Math.floor(Math.random()*imageList.length)];
  const imgURL = imageBaseURL + selectedName;
  sampleImage.src = imgURL;

  const positions = [];
  for(let y=0;y<4;y++) for(let x=0;x<4;x++)
    positions.push({x:-x*100,y:-y*100});
  positions.sort(()=>Math.random()-.5);

  positions.forEach(pos=>{
    const d=document.createElement("div");
    d.className = "piece";
    d.style.backgroundImage = `url('${imgURL}')`;
    d.style.backgroundPosition = `${pos.x}px ${pos.y}px`;
    d.draggable = true;
    board.appendChild(d);
  });

  board.ondragstart = e=>{
    if(e.target.classList.contains("piece"))
      draggedPiece = e.target;
  };
  board.ondragover = e=>e.preventDefault();
  board.ondrop = e=>{
    if(!e.target.classList.contains("piece") ||
       e.target===draggedPiece) return;
    const tmp = document.createElement("div");
    board.replaceChild(tmp, draggedPiece);
    board.replaceChild(draggedPiece, e.target);
    board.replaceChild(e.target, tmp);
  };

  timer = setInterval(()=>{
    timeLeft--;
    timerDisp.textContent = timeLeft;
    if(timeLeft<=0){
      clearInterval(timer);
      mintBtn.disabled = false;
      alert("⏰ Time's up! Click Mint to keep your art.");
    }
  },1000);
}

// ── MINT NFT ──
mintBtn.addEventListener("click", async()=>{
  if(hasMinted) return alert("Already minted!");
  const ok = confirm(
    "This is your masterpiece—mint it as an NFT?"
  );
  if(!ok) return;

  mintBtn.disabled = true;
  try {
    // snapshot board only
    const canvas = await html2canvas(board,{backgroundColor:null});
    const blob   = await new Promise(r=>canvas.toBlob(r,"image/png"));

    // pin via nft.storage
    const client = new NFTStorage({ token: NFT_STORAGE_KEY });
    const metadata = await client.store({
      image: new File([blob],`snapshot-${Date.now()}.png`,
                      { type:"image/png" }),
      name: `Puzzle: ${selectedName}`,
      description: "Match & Mint snapshot"
    });

    // on‑chain mint
    const contract = new ethers.Contract(
      CONTRACT_ADDRESS, CONTRACT_ABI, signer
    );
    const tx = await contract.mintNFT(
      userAddress, metadata.url
    );
    await tx.wait();

    alert("✅ Minted! " + metadata.url);
    hasMinted = true;
  } catch(err){
    console.error(err);
    alert("❌ Mint failed—see console.");
  }
});

// ── UTILS ──
function shuffle(a){for(let i=a.length-1;i>0;i--){
  const j=Math.floor(Math.random()*(i+1));
  [a[i],a[j]]=[a[j],a[i]];
}}

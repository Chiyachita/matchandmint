// script.js
let userAddress, provider, signer;
let dragged, timer, timeLeft, selectedName, hasMinted;

const contractAddress = "0x3A800029F5E76683b2664A70CF984fBC6c9D0Db1";
// 🔥 *** UPDATE THIS ABI to match your on‑chain contract *** 🔥
const contractABI = [{
  inputs: [
    { internalType: "address", name: "to", type: "address" },
    { internalType: "string", name: "tokenURI", type: "string" }
  ],
  name: "mintNFT",
  outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
  stateMutability: "nonpayable",
  type: "function"
}];

const imageBaseURL = "https://cdn.jsdelivr.net/gh/Chiyachita/match-and-mint-assets/images/";
let imageList = [];

async function loadImageList() {
  try {
    const res = await fetch(
      "https://cdn.jsdelivr.net/gh/Chiyachita/match-and-mint-assets/list.json"
    );
    imageList = await res.json();
  } catch (e) {
    alert("❌ Could not load image list from GitHub");
    console.error(e);
  }
}

window.addEventListener("DOMContentLoaded", loadImageList);

const connectBtn = document.getElementById("connect-btn");
const walletDisplay = document.getElementById("wallet-address");
const startBtn = document.getElementById("start-btn");
const mintBtn = document.getElementById("mint-btn");
const timerDisplay = document.getElementById("timer");
const board = document.getElementById("puzzle-board");
const sampleImage = document.getElementById("sample-image");

connectBtn.onclick = async () => {
  try {
    if (!window.ethereum) throw new Error("No web3 wallet found");
    provider = new ethers.providers.Web3Provider(window.ethereum, "any");
    await provider.send("eth_requestAccounts", []);
    const net = await provider.getNetwork();
    if (net.chainId !== 10143) {
      return alert("Switch to Monad Testnet (chainId 10143)");
    }
    signer = provider.getSigner();
    userAddress = await signer.getAddress();
    walletDisplay.innerText = `0x${userAddress.slice(-4)}`;
    startBtn.disabled = false;
  } catch (err) {
    console.error(err);
    alert("❌ Wallet connect failed");
  }
};

startBtn.onclick = () => {
  if (!hasMinted) return alert("🔒 Mint your last game first");
  begin();
};

mintBtn.onclick = () => {
  if (!hasMinted) mintNFT();
};

function begin() {
  hasMinted = false;
  startBtn.disabled = true;
  mintBtn.disabled = false;
  board.innerHTML = "";
  timeLeft = 45;
  timerDisplay.innerText = timeLeft;

  selectedName = imageList[
    Math.floor(Math.random() * imageList.length)
  ];
  const url = imageBaseURL + selectedName;
  sampleImage.src = url;

  const pos = [];
  for (let y = 0; y < 4; y++)
    for (let x = 0; x < 4; x++)
      pos.push({ x: -x * 100, y: -y * 100 });
  shuffle(pos).forEach(p => {
    const d = document.createElement("div");
    d.className = "piece";
    d.draggable = true;
    d.style.backgroundImage = `url(${url})`;
    d.style.backgroundPosition = `${p.x}px ${p.y}px`;
    board.appendChild(d);
  });

  board.ondragstart = e => { if(e.target.classList.contains("piece")) dragged = e.target; };
  board.ondragover  = e => e.preventDefault();
  board.ondrop      = e => {
    if (e.target.classList.contains("piece") && dragged !== e.target) {
      const tmp = board.replaceChild(dragged, e.target);
      board.replaceChild(e.target, tmp);
    }
  };

  timer = setInterval(() => {
    timerDisplay.innerText = --timeLeft;
    if (timeLeft <= 0) {
      clearInterval(timer);
      if (!hasMinted) {
        if (confirm("⏰ Time’s up! Mint your masterpiece?")) {
          mintNFT();
        }
      }
      startBtn.disabled = false;
    }
  }, 1000);
}

async function mintNFT() {
  mintBtn.disabled = true;
  try {
    const canvas = await html2canvas(board, { backgroundColor: null });
    const blob   = await new Promise(r => canvas.toBlob(r, "image/png"));
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onloadend = async () => {
      const data = reader.result;
      const res  = await fetch("/.netlify/functions/uploadToPinata", {
        method: "POST",
        body: data
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Upload failed");

      const uri      = "ipfs://" + json.IpfsHash;
      const contract = new ethers.Contract(contractAddress, contractABI, signer);
      const tx       = await contract.mintNFT(userAddress, uri);
      await tx.wait();
      alert("✅ Minted!");
      hasMinted = true;
    };
  } catch (err) {
    console.error(err);
    alert("❌ Mint failed: " + err.message);
    mintBtn.disabled = false;
  }
}

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

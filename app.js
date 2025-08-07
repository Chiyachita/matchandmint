import { ethers } from "https://cdn.jsdelivr.net/npm/ethers@6.8.4/dist/ethers.esm.min.js";

// ── CHAIN & CONTRACT CONFIG ─────────────────────────────────
const CHAIN_ID     = 10143;
const CHAIN_ID_HEX = "0x279F";
const CONTRACT_ADDRESS = "0x259C1Da2586295881C18B733Cb738fe1151bD2e5";
const ABI = [
  "function mintNFT(address to, string uri) external returns (uint256)",
  "function ownerOf(uint256 tokenId) view returns (address)"
];

// ── ASSETS CONFIG ───────────────────────────────────────────
const GITHUB_OWNER  = "Chiyachita";
const ASSETS_REPO   = "match-and-mint-assets";
const GITHUB_BRANCH = "main";
const IMAGES_PATH   = "images";

// ── UI ELEMENTS ─────────────────────────────────────────────
const connectInjectedBtn      = document.getElementById("connectInjectedBtn");
const walletStatus            = document.getElementById("walletStatus");
const startBtn                = document.getElementById("startBtn");
const mintBtn                 = document.getElementById("mintBtn");
const restartBtn              = document.getElementById("restartBtn");
const timeLeftEl              = document.getElementById("timeLeft");
const puzzleGrid              = document.getElementById("puzzleGrid");
const previewImg              = document.querySelector(".preview img");

let provider, signer, contract;
let imageList = [];
let timerHandle, timeLeft = 45;
const ROWS = 4, COLS = 4;

// ── UTILS ────────────────────────────────────────────────────
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
    if (!res.ok) throw new Error(res.statusText);
    imageList = await res.json();
  } catch (err) {
    console.error("Could not load list.json:", err);
    alert("❌ Error loading puzzle assets.");
    imageList = [];
  }
}

function pickRandomImage() {
  if (!imageList.length) return "preview.png";
  const file = imageList[Math.floor(Math.random() * imageList.length)];
  return `https://cdn.jsdelivr.net/gh/${GITHUB_OWNER}/${ASSETS_REPO}@${GITHUB_BRANCH}/${IMAGES_PATH}/${file}`;
}

function isPuzzleSolved() {
  return Array.from(puzzleGrid.children)
    .every((cell, idx) => +cell.dataset.index === idx);
}

// ── CONNECT INJECTED WALLET ─────────────────────────────────
async function connectInjected() {
  if (!window.ethereum) {
    alert("🚨 No injected wallet found! Please install MetaMask, Backpack, etc.");
    return;
  }
  try {
    await window.ethereum.request({ method: "eth_requestAccounts" });

    // wrap in Ethers v6 BrowserProvider
    provider = new ethers.BrowserProvider(window.ethereum, "any");
    signer   = await provider.getSigner();

    // switch to Monad testnet if needed
    const net = await provider.getNetwork();
    if (net.chainId !== CHAIN_ID) {
      await provider.send("wallet_switchEthereumChain", [{ chainId: CHAIN_ID_HEX }]);
    }

    // ready!
    contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
    finishConnect();
  } catch (err) {
    console.error("Injected connect failed:", err);
    alert("❌ Failed to connect wallet.");
  }
}

function finishConnect() {
  signer.getAddress().then(addr => {
    walletStatus.textContent = `Connected: ${addr.slice(0,6)}…${addr.slice(-4)}`;
    startBtn.disabled = false;
  });

  window.ethereum.on("accountsChanged", ([newAddr]) => {
    walletStatus.textContent = `Connected: ${newAddr.slice(0,6)}…${newAddr.slice(-4)}`;
  });
  window.ethereum.on("chainChanged", () => location.reload());
}

// ── PUZZLE SETUP ────────────────────────────────────────────
function buildPuzzle(imageUrl) {
  puzzleGrid.innerHTML = "";
  const cells = [];
  for (let i = 0; i < ROWS*COLS; i++) {
    const cell = document.createElement("div");
    cell.className     = "cell";
    cell.dataset.index = i;
    const x = (i % COLS)*100, y = Math.floor(i/COLS)*100;
    Object.assign(cell.style, {
      backgroundImage: `url(${imageUrl})`,
      backgroundSize: `${COLS*100}px ${ROWS*100}px`,
      backgroundPosition: `-${x}px -${y}px`
    });
    cell.draggable = true;
    cell.addEventListener("dragstart", e => dragged = e.target);
    cell.addEventListener("dragover", e => e.preventDefault());
    cell.addEventListener("drop", onDrop);
    cells.push(cell);
  }
  shuffle(cells);
  cells.forEach(c => puzzleGrid.appendChild(c));
}

let dragged = null;
function onDrop(e) {
  e.preventDefault();
  if (!dragged) return;
  const kids = Array.from(puzzleGrid.children);
  const i1 = kids.indexOf(dragged), i2 = kids.indexOf(e.target);
  if (i1 > -1 && i2 > -1) {
    puzzleGrid.insertBefore(
      dragged,
      i2 > i1 ? e.target.nextSibling : e.target
    );
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
      mintBtn.disabled = false;
      restartBtn.disabled = false;
      alert(
        isPuzzleSolved()
          ? "⏰ Time’s up—but you nailed it! Mint your perfect masterpiece."
          : "⏳ Time’s up! Here’s your masterpiece—mint or Restart."
      );
    }
  }, 1000);
}

restartBtn.onclick = () => {
  clearInterval(timerHandle);
  puzzleGrid.innerHTML = "";
  timeLeftEl.textContent = "45";
  startBtn.disabled   = false;
  mintBtn.disabled    = true;
  restartBtn.disabled = true;
};

// ── START GAME ────────────────────────────────────────────
startBtn.onclick = async () => {
  startBtn.disabled = true;
  mintBtn.disabled  = false;
  restartBtn.disabled = true;

  if (!imageList.length) await loadImageList();
  const url = pickRandomImage();
  buildPuzzle(url);
  previewImg.src = url;
  startTimer();
};

// ── MINT SNAPSHOT (placeholder pin flow) ───────────────────
mintBtn.onclick = async () => {
  try {
    // 1) snapshot
    const canvas = await html2canvas(puzzleGrid);
    const snapshot = canvas.toDataURL("image/png");
    console.log("✔️ Snapshot captured");

    // 2) (you’ll swap this with your pinata/nft.storage fn)
    // const pinResp = await fetch("/.netlify/functions/pinata", { … });
    // const { metadataCid } = await pinResp.json();
    // const uri = `https://gateway.pinata.cloud/ipfs/${metadataCid}`;

    // for now: just mint the data URL itself:
    const uri = snapshot;

    // 3) on-chain mint
    const tx = await contract.mintNFT(
      await signer.getAddress(),
      uri
    );
    await tx.wait();

    alert("🎉 Minted! Check your wallet.");
    mintBtn.disabled    = true;
    restartBtn.disabled = false;
  } catch (err) {
    console.error("Mint error:", err);
    alert("❌ Mint failed: " + err.message);
  }
};

// wire up the wallet button
connectInjectedBtn.onclick = connectInjected;

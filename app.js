// app.js

// ── CHAIN CONFIG ──────────────────────────────────────────
const CHAIN_ID     = 10143;
const CHAIN_ID_HEX = '0x279F';

// ── CONTRACT CONFIG ───────────────────────────────────────
const CONTRACT_ADDRESS = '0x259C1Da2586295881C18B733Cb738fe1151bD2e5';
const ABI = [
  \"function mintNFT(address to, string uri) external returns (uint256)\",
  \"function tokenURI(uint256 tokenId) view returns (string)\"
];

// ── UI ELEMENTS ────────────────────────────────────────────
const connectBtn = document.getElementById('connectInjectedBtn');
const startBtn   = document.getElementById('startBtn');
const mintBtn    = document.getElementById('mintBtn');
const grid       = document.getElementById('puzzleGrid');
const preview    = document.querySelector('.preview img');

let provider, signer, contract;
let dragged=null;
const ROWS=4, COLS=4;

// ── CONNECT & SETUP ────────────────────────────────────────
async function connect() {
  if(!window.ethereum) return alert('Install a wallet!');
  await window.ethereum.request({method:'eth_requestAccounts'});
  provider = new ethers.providers.Web3Provider(window.ethereum,'any');
  await provider.send('wallet_switchEthereumChain',[{chainId:CHAIN_ID_HEX}]);
  signer   = provider.getSigner();
  contract = new ethers.Contract(CONTRACT_ADDRESS,ABI,signer);
  startBtn.disabled = false;
}
connectBtn.onclick = connect;

// ── BUILD PUZZLE ───────────────────────────────────────────
function buildPuzzle() {
  grid.innerHTML='';
  const imgUrl = preview.src;  // or random—but preview must be set earlier
  for(let i=0;i<ROWS*COLS;i++){
    const c=document.createElement('div');
    c.className='cell';
    c.dataset.index=i;
    const x=(i%COLS)*100, y=Math.floor(i/COLS)*100;
    Object.assign(c.style,{
      backgroundImage:`url(${imgUrl})`,
      backgroundSize:`${COLS*100}px ${ROWS*100}px`,
      backgroundPosition:`-${x}px -${y}px`
    });
    c.draggable=true;
    c.addEventListener('dragstart',e=>dragged=e.target);
    c.addEventListener('dragover',e=>e.preventDefault());
    c.addEventListener('drop',onDrop);
    grid.appendChild(c);
  }
}

function onDrop(e){
  e.preventDefault();
  if(!dragged) return;
  const kids=[...grid.children];
  const i1=kids.indexOf(dragged), i2=kids.indexOf(e.target);
  grid.insertBefore(dragged, i2>i1? e.target.nextSibling: e.target);
}

// ── START GAME ────────────────────────────────────────────
startBtn.onclick = () => {
  // pick a random image into preview, or use fixed:
  preview.src = preview.src || 'preview.png';  
  buildPuzzle();
  mintBtn.disabled=false;
};

// ── MINT AS ON-CHAIN DATA URI ──────────────────────────────
mintBtn.onclick = async () => {
  try {
    // 1) snapshot to base64 PNG
    const canvas   = await html2canvas(grid);
    const snap     = canvas.toDataURL('image/png');

    // 2) build metadata JSON right in-app
    const metadata = {
      name:        `Puzzle #${Date.now()}`,
      description: 'My custom 4×4 puzzle',
      image:       snap,
      properties: {
        files: [{ uri: snap, type: 'image/png' }],
        category: 'image'
      }
    };

    // 3) encode JSON to base64
    const b64     = btoa(JSON.stringify(metadata));
    const dataURI = `data:application/json;base64,${b64}`;

    // 4) mint on-chain
    const tx = await contract.mintNFT(
      await signer.getAddress(),
      dataURI
    );
    await tx.wait();

    alert('🎉 Minted! Check Metadata tab—image should appear.');
  } catch(err) {
    console.error(err);
    alert('Mint failed: '+err.message);
  }
};

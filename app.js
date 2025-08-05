// app.js

// ── CHAIN CONFIG ──────────────────────────────────────────
const CHAIN_ID     = 10143;
const CHAIN_ID_HEX = '0x279F';

// ── CONTRACT CONFIG ───────────────────────────────────────
const CONTRACT_ADDRESS = '0x259C1Da2586295881C18B733Cb738fe1151bD2e5';
const ABI = [
  "function mintNFT(address to, string uri) external returns (uint256)",
  "function tokenURI(uint256 tokenId) view returns (string)"
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
const previewImg              = document.querySelector('.preview img');

let provider, signer, contract;
let imageList = [];
let timerHandle, timeLeft = 45;
let dragged = null;
const ROWS = 4, COLS = 4;

// ── HELPERS ────────────────────────────────────────────────
function shuffle(arr) {
  for (let i=arr.length-1; i>0; i--){
    const j = Math.floor(Math.random()*(i+1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

async function loadImageList(){
  const url = `https://cdn.jsdelivr.net/gh/${GITHUB_OWNER}/${ASSETS_REPO}@${GITHUB_BRANCH}/list.json`;
  try{
    const r = await fetch(url);
    if(!r.ok) throw new Error(r.status);
    imageList = await r.json();
  }catch(e){
    console.error('load list.json failed', e);
    imageList = [];
  }
}

function pickRandomImage(){
  if(!imageList.length) return 'preview.png';
  const f = imageList[Math.floor(Math.random()*imageList.length)];
  return `https://cdn.jsdelivr.net/gh/${GITHUB_OWNER}/${ASSETS_REPO}@${GITHUB_BRANCH}/${IMAGES_PATH}/${f}`;
}

function isPuzzleSolved(){
  return Array.from(puzzleGrid.children)
    .every((c,i)=> parseInt(c.dataset.index,10)===i);
}

// ── NETWORK SWITCH ─────────────────────────────────────────
async function switchToMonad(ep){
  const { chainId } = await ep.getNetwork();
  if(chainId!==CHAIN_ID){
    await ep.send('wallet_switchEthereumChain',[{chainId:CHAIN_ID_HEX}]);
  }
}

// ── CONNECT INJECTED ───────────────────────────────────────
async function connectInjected(){
  if(!window.ethereum){
    alert('No injected wallet found.');
    return;
  }
  try{
    await window.ethereum.request({method:'eth_requestAccounts'});
    const ep = new ethers.providers.Web3Provider(window.ethereum,'any');
    await switchToMonad(ep);
    finishConnect(ep);
  }catch(e){
    console.error(e);
    alert('Injected connect error');
  }
}

// ── CONNECT WALLETCONNECT ──────────────────────────────────
async function connectWalletConnect(){
  try{
    const wc = new WalletConnectProvider.default({
      rpc:{ [CHAIN_ID]:'https://testnet-rpc.monad.xyz' },
      chainId:CHAIN_ID
    });
    await wc.enable();
    const ep = new ethers.providers.Web3Provider(wc,'any');
    await switchToMonad(ep);
    finishConnect(ep);
  }catch(e){
    console.error(e);
    alert('WalletConnect error');
  }
}

// ── POST-CONNECT SETUP ─────────────────────────────────────
async function finishConnect(ep){
  provider = ep;
  signer   = ep.getSigner();
  contract = new ethers.Contract(CONTRACT_ADDRESS,ABI,signer);

  const addr = await signer.getAddress();
  walletStatus.textContent = `Connected: ${addr.slice(0,6)}...${addr.slice(-4)}`;
  startBtn.disabled = false;
}

// ── BUILD PUZZLE ───────────────────────────────────────────
function buildPuzzle(imgUrl){
  puzzleGrid.innerHTML = '';
  const cells = [];
  for(let i=0;i<ROWS*COLS;i++){
    const c = document.createElement('div');
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
    cells.push(c);
  }
  shuffle(cells);
  cells.forEach(c=>puzzleGrid.appendChild(c));
}

function onDrop(e){
  e.preventDefault();
  if(!dragged) return;
  const kids = [...puzzleGrid.children];
  const [i1,i2] = [kids.indexOf(dragged),kids.indexOf(e.target)];
  if(i1>-1 && i2>-1){
    puzzleGrid.insertBefore(dragged, i2>i1? e.target.nextSibling: e.target);
  }
}

// ── TIMER & RESTART ────────────────────────────────────────
function startTimer(){
  clearInterval(timerHandle);
  timeLeft=45; timeLeftEl.textContent=timeLeft;
  timerHandle = setInterval(()=>{
    timeLeftEl.textContent=--timeLeft;
    if(timeLeft<=0){
      clearInterval(timerHandle);
      alert(isPuzzleSolved()
        ? '⏰ Time’s up—but you nailed it!'
        : '⏳ Time’s up! Mint or Restart.');
      startBtn.disabled=false;
      restartBtn.disabled=false;
    }
  },1000);
}

restartBtn.addEventListener('click',()=>{
  clearInterval(timerHandle);
  puzzleGrid.innerHTML='';
  timeLeftEl.textContent='45';
  startBtn.disabled=false;
  mintBtn.disabled=true;
  restartBtn.disabled=true;
});

// ── START GAME ───────────────────────────────────────────
startBtn.addEventListener('click',async()=>{
  startBtn.disabled=true;
  mintBtn.disabled=false;
  restartBtn.disabled=true;
  if(!imageList.length) await loadImageList();
  const img=pickRandomImage();
  buildPuzzle(img);
  previewImg.src=img;
  startTimer();
});

// ── MINT SNAPSHOT → PINATA → ON-CHAIN ─────────────────────
async function mintSnapshot(){
  try{
    // snapshot
    const canvas   = await html2canvas(puzzleGrid);
    const snap     = canvas.toDataURL('image/png');

    // pin via Netlify fn
    const r = await fetch('/.netlify/functions/pinata',{
      method:'POST',
      headers: {'Content-Type':'application/json'},
      body:JSON.stringify({snapshot: snap})
    });
    if(!r.ok) throw new Error('pinata failed');
    const { metadataCid } = await r.json();

    // MINT using public gateway URL
    const uri = `https://gateway.pinata.cloud/ipfs/${metadataCid}`;
    const tx  = await contract.mintNFT(await signer.getAddress(), uri);
    await tx.wait();

    // show preview
    previewImg.src=snap;
    alert('🎉 Minted!');
    mintBtn.disabled=true;
    startBtn.disabled=false;
    restartBtn.disabled=false;

  }catch(err){
    console.error(err);
    alert('Mint error: '+err.message);
  }
}

mintBtn.addEventListener('click',mintSnapshot);
connectInjectedBtn.addEventListener('click',connectInjected);
connectWalletConnectBtn.addEventListener('click',connectWalletConnect);

// app.js

// ─── YOUR NFT.STORAGE JWT ───────────────────────────────────
// Replace with the API Key you generated on nft.storage
const NFT_STORAGE_KEY = '04be0e42.406dcb3178d8478585acd3b2f22ddfdf';
if (!NFT_STORAGE_KEY) {
  alert('❌ Missing NFT_STORAGE_KEY! Please set it at the top of app.js.');
  throw new Error('Missing NFT_STORAGE_KEY');
}

// ─── PICK AN INJECTED WALLET PROVIDER ───────────────────────
function getInjectedProvider() {
  const { ethereum } = window;
  if (!ethereum) return null;
  if (ethereum.providers && Array.isArray(ethereum.providers)) {
    const available = ethereum.providers.map(p => ({
      provider: p,
      name: p.isMetaMask ? 'MetaMask'
           : p.isCoinbaseWallet ? 'Coinbase Wallet'
           : p.isBackpack ? 'Backpack'
           : p.isPhantom ? 'Phantom'
           : p.isBraveWallet ? 'Brave Wallet'
           : p.isRabby ? 'Rabby'
           : p.isTrust ? 'Trust Wallet'
           : p.isOKExWallet ? 'OKX Wallet'
           : 'Unknown'
    }));
    const opts = available.map((w,i) => `${i+1}: ${w.name}`).join('\n');
    const choice = prompt(`Multiple wallets detected. Choose one:\n${opts}\nEnter number (or Cancel):`);
    const idx = parseInt(choice)-1;
    return available[idx]?.provider || ethereum.providers[0];
  }
  return ethereum;
}

// ─── CHAIN CONFIG ──────────────────────────────────────────
const CHAIN_ID     = 10143;
const CHAIN_ID_HEX = '0x279F';

// ─── CONTRACT & ASSETS CONFIG ──────────────────────────────
const CONTRACT_ADDRESS = '0x259C1Da2586295881C18B733Cb738fe1151bD2e5';
const ABI = [
  "function mintNFT(address to, string uri) external returns (uint256)",
  "function ownerOf(uint256 tokenId) view returns (address)"
];

// ─── ASSET SOURCES ─────────────────────────────────────────
const GITHUB_OWNER  = 'Chiyachita';
const ASSETS_REPO   = 'match-and-mint-assets';
const GITHUB_BRANCH = 'main';
const IMAGES_PATH   = 'images';

// ─── UI ELEMENTS ────────────────────────────────────────────
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

// ─── HELPERS ────────────────────────────────────────────────
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i+1));
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
    alert('⚠️ Unable to load assets.');
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
    .every((cell, idx) => parseInt(cell.dataset.index,10) === idx);
}

async function switchToMonad(ethersProvider) {
  const { chainId } = await ethersProvider.getNetwork();
  if (chainId !== CHAIN_ID) {
    await ethersProvider.send('wallet_switchEthereumChain',[{ chainId: CHAIN_ID_HEX }]);
  }
}

// ─── CONNECT INJECTED WALLET ────────────────────────────────
async function connectInjected() {
  const injected = getInjectedProvider();
  if (!injected) {
    alert('No injected wallet found! Install MetaMask/Backpack/etc.');
    return;
  }
  try {
    await injected.request({ method: 'eth_requestAccounts' });
    const ethProv = new ethers.providers.Web3Provider(injected,'any');
    await switchToMonad(ethProv);
    finishConnect(ethProv);
  } catch (err) {
    console.error('Injected connect failed',err);
    alert(err.code===4001
      ? 'Connection rejected.'
      : err.code===-32002
        ? 'Request pending—check your wallet.'
        : 'Failed to connect wallet.'
    );
  }
}

// ─── CONNECT WALLETCONNECT ──────────────────────────────────
async function connectWalletConnect() {
  try {
    const wc = new WalletConnectProvider.default({
      rpc:{ [CHAIN_ID]:'https://testnet-rpc.monad.xyz' },
      chainId: CHAIN_ID
    });
    await wc.enable();
    const ethProv = new ethers.providers.Web3Provider(wc,'any');
    await switchToMonad(ethProv);
    finishConnect(ethProv);
  } catch (err) {
    console.error('WalletConnect failed',err);
    alert('WalletConnect failed.');
  }
}

// ─── POST-CONNECT SETUP ─────────────────────────────────────
async function finishConnect(ethProv) {
  provider = ethProv;
  signer   = provider.getSigner();
  contract = new ethers.Contract(CONTRACT_ADDRESS,ABI,signer);
  const addr = await signer.getAddress();
  walletStatus.textContent = `Connected: ${addr.slice(0,6)}…${addr.slice(-4)} (Monad)`;
  startBtn.disabled = false;
  const raw = provider.provider;
  raw.on('accountsChanged',([a])=>
    walletStatus.textContent=`Connected: ${a.slice(0,6)}…${a.slice(-4)} (Monad)`
  );
  raw.on('chainChanged',cid=>cid!==CHAIN_ID_HEX&&location.reload());
  raw.on('disconnect',()=>location.reload());
}

// ─── BUILD & DRAG PUZZLE ───────────────────────────────────
function buildPuzzle(imgUrl) {
  puzzleGrid.innerHTML='';
  const cells=[];
  for(let i=0;i<ROWS*COLS;i++){
    const c=document.createElement('div');
    c.className='cell';
    c.dataset.index=i;
    const x=(i%COLS)*100,y=Math.floor(i/COLS)*100;
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
  const kids=Array.from(puzzleGrid.children);
  const i1=kids.indexOf(dragged),i2=kids.indexOf(e.target);
  if(i1>-1&&i2>-1){
    puzzleGrid.insertBefore(dragged,i2>i1?e.target.nextSibling:e.target);
  }
}

// ─── TIMER & RESTART ───────────────────────────────────────
function startTimer(){
  clearInterval(timerHandle);
  timeLeft=45;
  timeLeftEl.textContent=timeLeft;
  timerHandle=setInterval(()=>{
    timeLeftEl.textContent=--timeLeft;
    if(timeLeft<=0){
      clearInterval(timerHandle);
      alert(isPuzzleSolved()
        ? '⏰ Time’s up but solved! Mint now.'
        : '⏳ Time’s up! Mint what you have.'
      );
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

// ─── START GAME ───────────────────────────────────────────
startBtn.addEventListener('click',async()=>{
  startBtn.disabled=true;
  mintBtn.disabled=false;
  restartBtn.disabled=true;
  if(!imageList.length) await loadImageList();
  const img=pickRandomImage();
  previewImg.src=img;
  buildPuzzle(img);
  startTimer();
});

// ─── MINT SNAPSHOT → NFT.STORAGE → ON-CHAIN ───────────────
mintBtn.addEventListener('click',async()=>{
  try{
    // snapshot
    const canvas=await html2canvas(puzzleGrid);
    const dataUrl=canvas.toDataURL('image/png');
    const b64=dataUrl.split(',')[1];
    const bin=Uint8Array.from(atob(b64),c=>c.charCodeAt(0));
    const blob=new Blob([bin],{type:'image/png'});

    // upload image
    const imgForm=new FormData();
    imgForm.append('file',blob,'snapshot.png');
    let res=await fetch('https://api.nft.storage/upload',{
      method:'POST',
      headers:{Authorization:`Bearer ${NFT_STORAGE_KEY}`},
      body:imgForm
    });
    if(!res.ok)throw new Error('Image upload failed');
    let {value:{cid:imgCid}}=await res.json();

    // upload metadata
    const meta={name:'MatchAndMintPuzzle',description:'Snapshot',image:`ipfs://${imgCid}`};
    const metaBlob=new Blob([JSON.stringify(meta)],{type:'application/json'});
    const metaForm=new FormData();
    metaForm.append('file',metaBlob,'metadata.json');
    res=await fetch('https://api.nft.storage/upload',{
      method:'POST',
      headers:{Authorization:`Bearer ${NFT_STORAGE_KEY}`},
      body:metaForm
    });
    if(!res.ok)throw new Error('Metadata upload failed');
    let {value:{cid:metaCid}}=await res.json();

    // mint
    const uri=`https://ipfs.io/ipfs/${metaCid}`;
    const tx=await contract.mintNFT(await signer.getAddress(),uri);
    await tx.wait();

    previewImg.src=dataUrl;
    alert('🎉 Minted!');
    clearInterval(timerHandle);
    mintBtn.disabled=true;
    startBtn.disabled=false;
    restartBtn.disabled=false;
  }catch(e){
    console.error(e);
    alert('Mint failed: '+e.message);
  }
});

// ─── INIT HOOKS ────────────────────────────────────────────
connectInjectedBtn.addEventListener('click',connectInjected);
connectWalletConnectBtn.addEventListener('click',connectWalletConnect);

// load initial preview
(async()=>{await loadImageList();if(imageList.length)previewImg.src=pickRandomImage();})();

import { NFTStorage, File } from 'https://cdn.jsdelivr.net/npm/nft.storage/dist/bundle.esm.min.js';
import html2canvas from 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
import { ethers }        from 'https://cdn.jsdelivr.net/npm/ethers@6.8.4/dist/ethers.esm.min.js';

// ── CONFIG ──────────────────
const CHAIN_ID_HEX      = '0x279F';                    // 10143 decimal
const CONTRACT_ADDRESS  = '0x259C1Da2586295881C18B733Cb738fe1151bD2e5';
const ABI = [
  "function mintNFT(address to, string uri) external returns (uint256)",
  "function ownerOf(uint256) view returns (address)"
];

// ── UI ELEMENTS ─────────────
const connectBtn = document.getElementById('connectInjectedBtn');
const walletStatus = document.getElementById('walletStatus');
const puzzleGrid = document.getElementById('puzzleGrid');
const previewImg = document.querySelector('.preview');
const timeLeftEl = document.getElementById('timeLeft');
const startBtn = document.getElementById('startBtn');
const mintBtn  = document.getElementById('mintBtn');
const restartBtn = document.getElementById('restartBtn');

// ── STATE ───────────────────
let provider, signer, contract;
let timerHandle, timeLeft=45;
let dragged=null;
const ROWS=4, COLS=4;

// ── HELPERS ─────────────────
function shuffle(arr){
  for(let i=arr.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [arr[i],arr[j]]=[arr[j],arr[i]];
  }
}

// ── SWITCH TO MONAD TESTNET ─
async function switchToMonad(p){
  const { chainId } = await p.getNetwork();
  if(chainId !== 10143){
    await p.send('wallet_switchEthereumChain',[{chainId:CHAIN_ID_HEX}]);
  }
}

// ── CONNECT WALLET ──────────
async function connectInjected(){
  if(!window.ethereum){
    return alert('No injected wallet found!');
  }
  await window.ethereum.request({ method:'eth_requestAccounts' });
  provider = new ethers.providers.Web3Provider(window.ethereum,'any');
  await switchToMonad(provider);
  signer = provider.getSigner();
  contract = new ethers.Contract(CONTRACT_ADDRESS,ABI,signer);

  const addr = await signer.getAddress();
  walletStatus.textContent = `Connected: ${addr.slice(0,6)}…${addr.slice(-4)}`;
  startBtn.disabled = false;

  provider.provider.on('chainChanged',()=>window.location.reload());
  provider.provider.on('accountsChanged',()=>window.location.reload());
}

connectBtn.addEventListener('click',connectInjected);

// ── BUILD PUZZLE ───────────
function buildPuzzle(imageUrl){
  puzzleGrid.innerHTML='';
  const cells=[];
  for(let i=0;i<ROWS*COLS;i++){
    const cell = document.createElement('div');
    cell.className='cell';
    cell.dataset.index=i;
    const x=(i%COLS)*100, y=Math.floor(i/COLS)*100;
    Object.assign(cell.style,{
      backgroundImage:`url(${imageUrl})`,
      backgroundSize:`${COLS*100}px ${ROWS*100}px`,
      backgroundPosition:`-${x}px -${y}px`
    });
    cell.draggable=true;
    cell.addEventListener('dragstart',e=>dragged=e.target);
    cell.addEventListener('dragover',e=>e.preventDefault());
    cell.addEventListener('drop',onDrop);
    cells.push(cell);
  }
  shuffle(cells);
  cells.forEach(c=>puzzleGrid.append(c));
}

function onDrop(e){
  e.preventDefault();
  if(!dragged)return;
  const kids=Array.from(puzzleGrid.children);
  const i1=kids.indexOf(dragged), i2=kids.indexOf(e.target);
  if(i1>-1&&i2>-1){
    puzzleGrid.insertBefore(dragged, i2>i1? e.target.nextSibling : e.target);
  }
}

// ── TIMER ───────────────────
function startTimer(){
  clearInterval(timerHandle);
  timeLeft=45;
  timeLeftEl.textContent=`⏱ Time Left: ${timeLeft}s`;
  timerHandle = setInterval(()=>{
    timeLeftEl.textContent=`⏱ Time Left: ${--timeLeft}s`;
    if(timeLeft<=0){
      clearInterval(timerHandle);
      alert(
        Array.from(puzzleGrid.children).every((c,i)=>+c.dataset.index===i)
          ? '⏰ Done—and solved! Mint your masterpiece!'
          : '⏰ Time’s up! Mint your snapshot or Restart.'
      );
      mintBtn.disabled=false;
      restartBtn.disabled=false;
    }
  },1000);
}

// ── BUTTON HANDLERS ─────────
startBtn.onclick = ()=>{
  startBtn.disabled=true;
  mintBtn.disabled=false;
  restartBtn.disabled=true;
  // pick a random preview from your GitHub assets:
  const list = [
    'https://cdn.jsdelivr.net/gh/Chiyachita/match-and-mint-assets@main/images/puzzle1.svg',
    'https://cdn.jsdelivr.net/gh/Chiyachita/match-and-mint-assets@main/images/puzzle2.svg',
    // … add all 8 here …
  ];
  const imageUrl = list[Math.floor(Math.random()*list.length)];
  buildPuzzle(imageUrl);
  previewImg.src=imageUrl;
  startTimer();
};

restartBtn.onclick = ()=>{
  clearInterval(timerHandle);
  puzzleGrid.innerHTML='';
  timeLeftEl.textContent='⏱ Time Left: 45s';
  startBtn.disabled=false;
  mintBtn.disabled=true;
  restartBtn.disabled=true;
};

// ── MINT → NFT.STORAGE → CHAIN ─
mintBtn.onclick = async ()=>{
  try {
    mintBtn.disabled=true;
    // 1) snapshot
    const canvas = await html2canvas(puzzleGrid);
    const dataUrl = canvas.toDataURL('image/png');
    const blob = await (await fetch(dataUrl)).blob();

    // 2) pin + metadata via NFT.Storage
    const client = new NFTStorage({ token: window.NFT_STORAGE_KEY });
    const metadata = await client.store({
      name: `MatchAndMintPuzzle #${await contract.nextTokenId()}`,
      description: 'My 4×4 puzzle snapshot',
      image: new File([blob], 'snapshot.png', { type:'image/png' }),
      properties: { files:[{ uri:'snapshot.png', type:'image/png' }] }
    });

    // 3) mint on-chain
    const uri = metadata.url; // e.g. ipfs://bafy…/metadata.json
    const tx  = await contract.mintNFT(await signer.getAddress(), uri);
    await tx.wait();

    alert('🎉 Minted successfully!');
  } catch (err) {
    console.error(err);
    alert('❌ Mint failed:\n'+err.message);
    mintBtn.disabled=false;
  }
};

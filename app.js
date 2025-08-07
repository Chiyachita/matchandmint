// app.js
import { ethers } from 'ethers'
import html2canvas from 'html2canvas'

// ── CONFIG ────────────────────────────────────────────────
const CHAIN_ID        = 10143
const CHAIN_ID_HEX    = '0x279F'
const CONTRACT_ADDR   = '0x259C1Da2586295881C18B733Cb738fe1151bD2e5'
const CONTRACT_ABI    = [
  'function mintNFT(address to, string uri) external returns (uint256)'
]
const GITHUB_OWNER    = 'Chiyachita'
const GITHUB_REPO     = 'match-and-mint-assets'
const GITHUB_BRANCH   = 'main'
const ROWS = 4, COLS = 4

// ── UI ──────────────────────────────────────────────────
const connectBtn = document.getElementById('connectBtn')
const walletStatus = document.getElementById('walletStatus')
const startBtn = document.getElementById('startBtn')
const mintBtn = document.getElementById('mintBtn')
const restartBtn = document.getElementById('restartBtn')
const timeLeftEl = document.getElementById('timeLeft')
const puzzleGrid = document.getElementById('puzzleGrid')
const previewImg = document.querySelector('.preview')

// ── STATE ────────────────────────────────────────────────
let provider, signer, contract
let imageList = [], timer, timeLeft = 45

// ── HELPERS ─────────────────────────────────────────────
function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]] } }
async function loadImageList(){
  const url = `https://cdn.jsdelivr.net/gh/${GITHUB_OWNER}/${GITHUB_REPO}@${GITHUB_BRANCH}/list.json`
  const res = await fetch(url)
  if (!res.ok) throw new Error('list.json load failed')
  imageList = await res.json()
}
function pickRandomImage(){
  if (!imageList.length) return 'preview.png'
  const file = imageList[Math.floor(Math.random()*imageList.length)]
  return `https://cdn.jsdelivr.net/gh/${GITHUB_OWNER}/${GITHUB_REPO}@${GITHUB_BRANCH}/images/${file}`
}
function isSolved(){
  return Array.from(puzzleGrid.children)
    .every((c,i)=> +c.dataset.index===i)
}

// ── PUZZLE ──────────────────────────────────────────────
function buildPuzzle(url){
  puzzleGrid.innerHTML=''
  const cells=[]
  for(let i=0;i<ROWS*COLS;i++){
    const cell=document.createElement('div')
    cell.className='cell'
    cell.dataset.index=i
    const x=(i%COLS)*100, y=Math.floor(i/COLS)*100
    Object.assign(cell.style,{
      backgroundImage:`url(${url})`,
      backgroundSize:`${COLS*100}px ${ROWS*100}px`,
      backgroundPosition:`-${x}px -${y}px`
    })
    cell.draggable=true
    cell.addEventListener('dragstart',e=>dragStart=e.target)
    cell.addEventListener('dragover',e=>e.preventDefault())
    cell.addEventListener('drop', drop)
    cells.push(cell)
  }
  shuffle(cells)
  cells.forEach(c=>puzzleGrid.appendChild(c))
}
let dragStart=null
function drop(e){
  e.preventDefault()
  if(!dragStart) return
  const kids=Array.from(puzzleGrid.children)
  const i1=kids.indexOf(dragStart)
  const i2=kids.indexOf(e.target)
  puzzleGrid.insertBefore(dragStart, i2>i1?e.target.nextSibling:e.target)
}

// ── TIMER ───────────────────────────────────────────────
function startTimer(){
  clearInterval(timer)
  timeLeft=45
  timeLeftEl.textContent=timeLeft
  timer=setInterval(()=>{
    timeLeftEl.textContent=--timeLeft
    if(timeLeft<=0){
      clearInterval(timer)
      alert(
        isSolved()
          ? '⏰ Done! Mint your masterpiece.'
          : '⏳ Time’s up! Mint your creation or Restart.'
      )
      mintBtn.disabled=false
      restartBtn.disabled=false
    }
  },1000)
}

// ── CONNECT ─────────────────────────────────────────────
async function connect() {
  if (!window.ethereum) return alert('No injected wallet.')
  await window.ethereum.request({ method: 'eth_requestAccounts' })
  provider = new ethers.Web3Provider(window.ethereum, 'any')
  const net = await provider.getNetwork()
  if (net.chainId !== CHAIN_ID)
    await provider.send('wallet_switchEthereumChain',[{ chainId: CHAIN_ID_HEX }])
  signer = provider.getSigner()
  contract = new ethers.Contract(CONTRACT_ADDR, CONTRACT_ABI, signer)
  const addr = await signer.getAddress()
  walletStatus.textContent = `Connected: ${addr.slice(0,6)}…${addr.slice(-4)}`
  startBtn.disabled = false
}

// ── START GAME ──────────────────────────────────────────
startBtn.addEventListener('click', async()=>{
  startBtn.disabled=true
  mintBtn.disabled=false
  restartBtn.disabled=true
  if (!imageList.length) await loadImageList()
  const img = pickRandomImage()
  buildPuzzle(img)
  previewImg.src=img
  startTimer()
})

// ── RESTART ─────────────────────────────────────────────
restartBtn.addEventListener('click',()=>{
  clearInterval(timer)
  puzzleGrid.innerHTML=''
  timeLeftEl.textContent='45'
  startBtn.disabled=false
  mintBtn.disabled=true
  restartBtn.disabled=true
})

// ── MINT ────────────────────────────────────────────────
mintBtn.addEventListener('click', async()=>{
  try {
    // snapshot
    const cnv = await html2canvas(puzzleGrid)
    const snapshot = cnv.toDataURL('image/png')

    // pin via our Function
    const resp = await fetch('/.netlify/functions/upload',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ snapshot })
    })
    if (!resp.ok) throw new Error(`Storage fn ${resp.status}`)
    const { metadataCid } = await resp.json()

    // mint on-chain
    const uri = `https://ipfs.io/ipfs/${metadataCid}`
    const tx = await contract.mintNFT(await signer.getAddress(), uri)
    await tx.wait()

    alert('🎉 Minted!')
    mintBtn.disabled=true
    restartBtn.disabled=false
  } catch (e) {
    console.error(e)
    alert('Mint failed: '+e.message)
  }
})

// ── HOOKUPS ─────────────────────────────────────────────
connectBtn.addEventListener('click', connect)

// app.js
import html2canvas from 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js'

const CHAIN_ID     = 10143
const CHAIN_ID_HEX = '0x279F'
const CONTRACT_ADDRESS = '0x259C1Da2586295881C18B733Cb738fe1151bD2e5'
const ABI = [
  "function mintNFT(address to, string uri) external returns (uint256)",
  "function ownerOf(uint256 tokenId) view returns (address)"
]

// UI refs
const connectBtn = document.getElementById('connectBtn')
const walletStatus = document.getElementById('walletStatus')
const startBtn = document.getElementById('startBtn')
const mintBtn = document.getElementById('mintBtn')
const restartBtn = document.getElementById('restartBtn')
const timeLeftEl = document.getElementById('timeLeft')
const puzzleGrid = document.getElementById('puzzleGrid')
const previewImg = document.getElementById('preview')

let provider, signer, contract
let imageList = []
let timerHandle, timeLeft = 45
const ROWS = 4, COLS = 4

// fetch list.json from your assets repo on jsDelivr
async function loadImageList() {
  const res = await fetch('https://cdn.jsdelivr.net/gh/Chiyachita/match-and-mint-assets@main/list.json')
  imageList = res.ok ? await res.json() : []
}

function pickRandomImage() {
  if (!imageList.length) return 'preview.png'
  const f = imageList[Math.floor(Math.random() * imageList.length)]
  return `https://cdn.jsdelivr.net/gh/Chiyachita/match-and-mint-assets@main/images/${f}`
}

function shuffle(arr) { /* Fisher–Yates */ 
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random()*(i+1))
    [arr[i], arr[j]] = [arr[j], arr[i]]
  }
}

// build puzzle pieces
function buildPuzzle(url) {
  puzzleGrid.innerHTML = ''
  const cells = []
  for (let i = 0; i < ROWS*COLS; i++) {
    const cell = document.createElement('div')
    cell.className = 'cell'
    cell.dataset.index = i
    const x = (i%COLS)*100, y = Math.floor(i/COLS)*100
    Object.assign(cell.style, {
      backgroundImage: `url(${url})`,
      backgroundSize: `${COLS*100}px ${ROWS*100}px`,
      backgroundPosition: `-${x}px -${y}px`
    })
    cell.draggable = true
    cell.addEventListener('dragstart', e=> dragged = e.target)
    cell.addEventListener('dragover', e=> e.preventDefault())
    cell.addEventListener('drop', onDrop)
    cells.push(cell)
  }
  shuffle(cells)
  cells.forEach(c=> puzzleGrid.appendChild(c))
}

let dragged = null
function onDrop(e) {
  e.preventDefault()
  if (!dragged) return
  const kids = Array.from(puzzleGrid.children)
  const i1 = kids.indexOf(dragged), i2 = kids.indexOf(e.target)
  if (i1>-1 && i2>-1) {
    puzzleGrid.insertBefore(dragged, i2>i1 ? e.target.nextSibling : e.target)
  }
}

function isSolved() {
  return Array.from(puzzleGrid.children)
    .every((c, i)=> +c.dataset.index === i)
}

// timing
function startTimer() {
  clearInterval(timerHandle)
  timeLeft = 45
  timeLeftEl.textContent = `⏱ Time Left: ${timeLeft}s`
  timerHandle = setInterval(()=>{
    timeLeft--
    timeLeftEl.textContent = `⏱ Time Left: ${timeLeft}s`
    if (timeLeft<=0) {
      clearInterval(timerHandle)
      alert(
        isSolved()
          ? '⏰ Done — perfect! Mint your masterpiece now.'
          : '⏳ Time’s up! Mint what you have or restart.'
      )
      mintBtn.disabled = false
      restartBtn.disabled = false
    }
  },1000)
}

// wallet
async function switchToChain(p) {
  const { chainId } = await p.getNetwork()
  if (chainId !== CHAIN_ID) {
    await p.send('wallet_switchEthereumChain',[{ chainId: CHAIN_ID_HEX }])
  }
}

async function connectWallet() {
  if (!window.ethereum) {
    return alert('No injected wallet found')
  }
  await window.ethereum.request({ method: 'eth_requestAccounts' })
  const p = new ethers.providers.Web3Provider(window.ethereum, 'any')
  await switchToChain(p)
  provider = p
  signer   = p.getSigner()
  contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer)
  const addr = await signer.getAddress()
  walletStatus.textContent = `Connected: ${addr.slice(0,6)}…${addr.slice(-4)}`
  startBtn.disabled = false
}

connectBtn.onclick = connectWallet

// game controls
startBtn.onclick = async () => {
  startBtn.disabled = true
  mintBtn.disabled = false
  restartBtn.disabled = true
  if (!imageList.length) await loadImageList()
  const img = pickRandomImage()
  buildPuzzle(img)
  previewImg.src = img
  startTimer()
}

restartBtn.onclick = () => {
  clearInterval(timerHandle)
  puzzleGrid.innerHTML = ''
  timeLeftEl.textContent = `⏱ Time Left: 45s`
  startBtn.disabled = false
  mintBtn.disabled = true
  restartBtn.disabled = true
}

// mint
mintBtn.onclick = async () => {
  try {
    // snapshot grid
    const canvas = await html2canvas(puzzleGrid)
    const dataUrl = canvas.toDataURL('image/png')

    // upload via our Netlify function
    const res = await fetch('/.netlify/functions/upload', {
      method: 'POST',
      body: JSON.stringify({ snapshot: dataUrl })
    })
    const { cid, error } = await res.json()
    if (!cid) throw new Error(error||'Upload failed')

    const metadataURL = `https://ipfs.io/ipfs/${cid}`
    const tx = await contract.mintNFT(await signer.getAddress(), metadataURL)
    await tx.wait()

    alert('🎉 Minted — check it out onchain!')
    clearInterval(timerHandle)
    mintBtn.disabled = true
    restartBtn.disabled = false
    startBtn.disabled = false
  } catch (e) {
    console.error(e)
    alert('Mint failed: '+e.message)
  }
}

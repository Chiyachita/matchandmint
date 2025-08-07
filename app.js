// app.js

(async()=> {
  // ── CONFIG ─────────────────────────────────────────────────
  const CHAIN_ID       = 10143, CHAIN_ID_HEX = '0x279F';
  const RPC_URL        = 'https://testnet-rpc.monad.xyz';
  const EXPLORER_URL   = 'https://testnet.monadexplorer.com';
  const CONTRACT_ADDR  = '0x259C1Da2586295881C18B733Cb738fe1151bD2e5';
  const ABI            = [
    "function mintNFT(address to, string uri) external returns (uint256)",
    "function ownerOf(uint256 tokenId) view returns (address)"
  ];

  const GITHUB_OWNER   = 'Chiyachita';
  const ASSETS_REPO    = 'match-and-mint-assets';
  const BRANCH         = 'main';
  const LIST_JSON_URL  = `https://cdn.jsdelivr.net/gh/${GITHUB_OWNER}/${ASSETS_REPO}@${BRANCH}/list.json`;
  const IMAGE_BASE_URL = `https://cdn.jsdelivr.net/gh/${GITHUB_OWNER}/${ASSETS_REPO}@${BRANCH}/images`;

  // ── UI ELTS ─────────────────────────────────────────────────
  const connectInjectedBtn      = document.getElementById('connectInjectedBtn');
  const connectWalletConnectBtn = document.getElementById('connectWalletConnectBtn');
  const walletStatus            = document.getElementById('walletStatus');
  const startBtn                = document.getElementById('startBtn');
  const mintBtn                 = document.getElementById('mintBtn');
  const restartBtn              = document.getElementById('restartBtn');
  const timeLeftEl              = document.getElementById('timeLeft');
  const puzzleGrid              = document.getElementById('puzzleGrid');
  const previewImg              = document.getElementById('preview');

  // ── STATE ──────────────────────────────────────────────────
  let provider, signer, contract;
  let imageList = [], timerId, timeLeft = 45;
  const ROWS = 4, COLS = 4;
  let dragged = null;

  // ── HELPERS ────────────────────────────────────────────────
  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random()*(i+1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }
  async function loadImageList() {
    try {
      const res = await fetch(LIST_JSON_URL);
      imageList = res.ok ? await res.json() : [];
    } catch (e) {
      console.error('loadImageList error', e);
      imageList = [];
    }
  }
  function pickRandomImage() {
    if (!imageList.length) return '';
    const fn = imageList[Math.floor(Math.random()*imageList.length)];
    return `${IMAGE_BASE_URL}/${fn}`;
  }
  function isSolved() {
    return Array.from(puzzleGrid.children)
      .every((cell, idx) => +cell.dataset.index === idx);
  }
  async function switchToTestnet(ethProvider) {
    const net = await ethProvider.getNetwork();
    if (net.chainId !== CHAIN_ID) {
      await ethProvider.send('wallet_addEthereumChain',[{
        chainId: CHAIN_ID_HEX,
        chainName: 'Monad Testnet',
        rpcUrls: [RPC_URL],
        nativeCurrency: { name:'Monad', symbol:'MON', decimals:18 },
        blockExplorerUrls: [EXPLORER_URL]
      }]).catch(()=>{});
      await ethProvider.send('wallet_switchEthereumChain',[{chainId:CHAIN_ID_HEX}]);
    }
  }

  // ── INJECTED & WC CONNECT ──────────────────────────────────
  function getInjectedProvider() {
    const {ethereum, web3} = window;
    if (ethereum) {
      if (Array.isArray(ethereum.providers)) {
        return ethereum.providers.find(p=>p.isMetaMask) || ethereum.providers[0];
      }
      return ethereum;
    }
    if (web3 && web3.currentProvider) return web3.currentProvider;
    return null;
  }

  async function connectInjected() {
    const injected = getInjectedProvider();
    if (!injected) {
      return alert('No injected wallet found!');
    }
    try {
      if (injected.request) await injected.request({method:'eth_requestAccounts'});
      else await injected.enable();

      const ethersLib   = window.ethers;
      const ethProvider = new ethersLib.providers.Web3Provider(injected, 'any');
      await switchToTestnet(ethProvider);
      finalizeConnect(ethProvider);
    } catch (e) {
      console.error('Injected connect failed', e);
      alert('Connect failed: '+e.message);
    }
  }

  async function connectWalletConnect() {
    try {
      const wc = new window.WalletConnectProvider.default({
        rpc:{[CHAIN_ID]:RPC_URL}, chainId:CHAIN_ID
      });
      await wc.enable();
      const ethersLib   = window.ethers;
      const ethProvider = new ethersLib.providers.Web3Provider(wc, 'any');
      await switchToTestnet(ethProvider);
      finalizeConnect(ethProvider);
    } catch (e) {
      console.error('WC connect failed', e);
      alert('WC failed: '+e.message);
    }
  }

  // ── AFTER CONNECT ──────────────────────────────────────────
  async function finalizeConnect(ethProvider) {
    provider = ethProvider;
    signer   = provider.getSigner();
    contract = new window.ethers.Contract(CONTRACT_ADDR, ABI, signer);

    const addr = await signer.getAddress();
    walletStatus.textContent = `Connected: ${addr.slice(0,6)}…${addr.slice(-4)}`;
    startBtn.disabled = false;

    ethProvider.provider.on('accountsChanged', ([a]) => {
      walletStatus.textContent = `Connected: ${a.slice(0,6)}…${a.slice(-4)}`;
    });
    ethProvider.provider.on('chainChanged', cid => {
      if (cid !== CHAIN_ID_HEX) location.reload();
    });
    ethProvider.provider.on('disconnect', () => location.reload());
  }

  // ── BUILD & DRAG PUZZLE ────────────────────────────────────
  function buildPuzzle(imgUrl) {
    puzzleGrid.innerHTML = '';
    const cells = [];
    for (let i = 0; i < ROWS*COLS; i++) {
      const cell = document.createElement('div');
      cell.className     = 'cell';
      cell.dataset.index = i;
      const x = (i%COLS)*100, y = Math.floor(i/COLS)*100;
      Object.assign(cell.style, {
        backgroundImage:    `url(${imgUrl})`,
        backgroundSize:     `${COLS*100}px ${ROWS*100}px`,
        backgroundPosition: `-${x}px -${y}px`
      });
      cell.draggable = true;
      cell.addEventListener('dragstart', e=>dragged=e.target);
      cell.addEventListener('dragover',  e=>e.preventDefault());
      cell.addEventListener('drop',     onDrop);
      cells.push(cell);
    }
    shuffle(cells);
    cells.forEach(c=>puzzleGrid.appendChild(c));
  }

  function onDrop(e) {
    e.preventDefault();
    if (!dragged) return;
    const kids = Array.from(puzzleGrid.children);
    const i1 = kids.indexOf(dragged), i2 = kids.indexOf(e.target);
    if (i1>-1 && i2>-1) {
      puzzleGrid.insertBefore(
        dragged,
        i2>i1 ? e.target.nextSibling : e.target
      );
    }
  }

  // ── TIMER & CONTROLS ───────────────────────────────────────
  function startTimer() {
    clearInterval(timerId);
    timeLeft = 45;
    timeLeftEl.textContent = `⏱ Time Left: ${timeLeft}s`;
    timerId = setInterval(()=>{
      timeLeftEl.textContent = `⏱ Time Left: ${--timeLeft}s`;
      if (timeLeft<=0) {
        clearInterval(timerId);
        const msg = isSolved()
          ? '⏰ Time’s up—but you nailed it! Mint away 🌟'
          : '⏳ Time’s up! Mint or Restart.';
        alert(msg);
        startBtn.disabled   = false;
        restartBtn.disabled = false;
        mintBtn.disabled    = false;
      }
    },1000);
  }

  restartBtn.addEventListener('click', ()=>{
    clearInterval(timerId);
    puzzleGrid.innerHTML = '';
    timeLeftEl.textContent = '⏱ Time Left: 45s';
    startBtn.disabled   = false;
    mintBtn.disabled    = true;
    restartBtn.disabled = true;
  });

  // ── START & MINT ──────────────────────────────────────────
  startBtn.addEventListener('click', async()=>{
    startBtn.disabled   = true;
    mintBtn.disabled    = false;
    restartBtn.disabled = true;
    if (!imageList.length) await loadImageList();
    const url = pickRandomImage();
    previewImg.src = url;
    buildPuzzle(url);
    startTimer();
  });

  mintBtn.addEventListener('click', async()=>{
    try {
      const canvas   = await html2canvas(puzzleGrid);
      const snapshot = canvas.toDataURL('image/png');
      const resp = await fetch('/.netlify/functions/upload',{ 
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({snapshot})
      });
      if(!resp.ok) throw new Error('Upload failed');
      const {cid} = await resp.json();
      const uri = `https://ipfs.io/ipfs/${cid}`;
      const tx  = await contract.mintNFT(await signer.getAddress(),uri);
      await tx.wait();
      alert('🎉 Minted! CID: '+cid);
      clearInterval(timerId);
      mintBtn.disabled    = true;
      startBtn.disabled   = false;
      restartBtn.disabled = false;
    } catch(e) {
      console.error('mint error',e);
      alert('Mint failed: '+e.message);
    }
  });

  // ── HOOK BUTTONS ──────────────────────────────────────────
  connectInjectedBtn.addEventListener('click', connectInjected);
  connectWalletConnectBtn.addEventListener('click', connectWalletConnect);

})(); // <-- ปิด IIFE ให้ครบ

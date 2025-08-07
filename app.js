(async()=>{
  // --- CONFIG ---
  const GITHUB_JSON = 'https://raw.githubusercontent.com/Chiyachita/match-and-mint-assets/main/list.json';
  const TIMER_SEC = 45;
  const NFTSTORAGE_KEY = '04be0e42.406dcb3178d8478585acd3b2f22ddfdf';
  const CONTRACT_ADDR = '0x259C1Da2586295881C18B733Cb738fe1151bD2e5';
  const CONTRACT_ABI = [
    {"inputs":[],"stateMutability":"nonpayable","type":"constructor"},
    {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"owner","type":"address"},{"indexed":true,"internalType":"address","name":"approved","type":"address"},{"indexed":true,"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"Approval","type":"event"},
    {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"owner","type":"address"},{"indexed":true,"internalType":"address","name":"operator","type":"address"},{"indexed":false,"internalType":"bool","name":"approved","type":"bool"}],"name":"ApprovalForAll","type":"event"},
    {"inputs":[{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"approve","outputs":[],"stateMutability":"nonpayable","type":"function"},
    {"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"_fromTokenId","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"_toTokenId","type":"uint256"}],"name":"BatchMetadataUpdate","type":"event"},
    {"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"_tokenId","type":"uint256"}],"name":"MetadataUpdate","type":"event"},
    {"inputs":[{"internalType":"address","name":"to","type":"address"},{"internalType":"string","name":"uri","type":"string"}],"name":"mintNFT","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[{"internalType":"address","name":"from","type":"address"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"safeTransferFrom","outputs":[],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[{"internalType":"address","name":"from","type":"address"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"tokenId","type":"uint256"},{"internalType":"bytes","name":"data","type":"bytes"}],"name":"safeTransferFrom","outputs":[],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[{"internalType":"address","name":"operator","type":"address"},{"internalType":"bool","name":"approved","type":"bool"}],"name":"setApprovalForAll","outputs":[],"stateMutability":"nonpayable","type":"function"},
    {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"from","type":"address"},{"indexed":true,"internalType":"address","name":"to","type":"address"},{"indexed":true,"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"Transfer","type":"event"},
    {"inputs":[{"internalType":"address","name":"from","type":"address"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"transferFrom","outputs":[],"stateMutability":"nonpayable","type":"function"},
    {"inputs":[{"internalType":"address","name":"owner","type":"address"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"getApproved","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"address","name":"operator","type":"address"}],"name":"isApprovedForAll","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"name","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"nextTokenId","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"ownerOf","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"bytes4","name":"interfaceId","type":"bytes4"}],"name":"supportsInterface","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"symbol","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},
    {"inputs":[{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"tokenURI","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"}
  ];

  let provider, signer, contract;
  let pick = [], solved=false, interval, time=TIMER_SEC;

  const web3Modal = new window.Web3Modal.default({ cacheProvider:false, providerOptions:{} });
  document.getElementById('connect').onclick = async ()=>{
    try {
      const inst = await web3Modal.connect();
      provider = new ethers.providers.Web3Provider(inst);
      await provider.send('wallet_addEthereumChain',[{
        chainId:'0x279F',
        chainName:'Monad Testnet',
        rpcUrls:['https://testnet-rpc.monad.xyz'],
        nativeCurrency:{ name:'Monad', symbol:'MON', decimals:18 }
      }]).catch(()=>{});
      signer = provider.getSigner();
      contract = new ethers.Contract(CONTRACT_ADDR, CONTRACT_ABI, signer);
      document.getElementById('connect').innerText='Wallet Connected';
    } catch(e) {
      console.error(e);
      alert('เชื่อม Wallet ไม่ติด ลองใหม่');
    }
  };

  document.getElementById('start').onclick = () => {
    if(!signer) return alert('ต้องเชื่อม Wallet ก่อนนะ!');
    initPuzzle();
    document.getElementById('mint').disabled = false;
  };

  async function initPuzzle() {
    clearInterval(interval);
    solved=false;
    time=TIMER_SEC;
    document.getElementById('timer').innerText = time;
    const data = await fetch(GITHUB_JSON).then(r=>r.json());
    pick = data.sort(()=>0.5-Math.random()).slice(0,16);
    document.getElementById('ref').src = pick[0];
    const puzzle = document.getElementById('puzzle');
    puzzle.innerHTML = '';
    pick.forEach(url=>{
      const d = document.createElement('div');
      d.className='piece';
      d.style.backgroundImage = `url(${url})`;
      d.draggable = true;
      puzzle.appendChild(d);
    });
    addDragDrop();
    interval = setInterval(()=>{
      time--; document.getElementById('timer').innerText = time;
      if(time<=0) {
        clearInterval(interval);
        if(!solved){ mintIt(); }
      }
    },1000);
  }

  function addDragDrop(){
    const puzzle = document.getElementById('puzzle');
    let dragSrc=null;
    puzzle.addEventListener('dragstart',e=>{ if(e.target.classList.contains('piece')) dragSrc=e.target; });
    puzzle.addEventListener('dragover',e=>e.preventDefault());
    puzzle.addEventListener('drop',e=>{
      e.preventDefault();
      const tgt=e.target;
      if(tgt.classList.contains('piece') && dragSrc!==tgt){
        [dragSrc.style.backgroundImage, tgt.style.backgroundImage] =
          [tgt.style.backgroundImage, dragSrc.style.backgroundImage];
        checkSolved();
      }
    });
  }

  function checkSolved(){
    const pieces = Array.from(document.querySelectorAll('.piece'));
    const ok = pieces.every((el,i)=>{
      const url = el.style.backgroundImage.slice(5,-2);
      return url === pick[i];
    });
    if(ok && !solved){
      solved = true;
      clearInterval(interval);
      document.getElementById('timer').innerText = '🎉';
      alert('สุดยอด! จัดเรียงครบแล้ว กด Mint Snapshot ได้เลย!');
    }
  }

  async function mintIt(){
    document.getElementById('mint').disabled = true;
    const canvas = await html2canvas(document.getElementById('puzzle'));
    const blob = await new Promise(r=>canvas.toBlob(r,'image/png'));
    const client = new window.NFTStorage.NFTStorage({ token: NFTSTORAGE_KEY });
    const cid = (await client.store({
      image: blob,
      name: 'Puzzle Snapshot',
      description: 'Snapshot from Match & Mint 4×4'
    })).url;
    const tx = await contract.mintNFT(await signer.getAddress(), cid);
    await tx.wait();
    alert('Minted! CID: '+cid);
  }
  document.getElementById('mint').onclick = mintIt;
})();

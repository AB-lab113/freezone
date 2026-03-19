import './App.css';
import { useState, useEffect } from "react";
import { ethers } from "ethers";
import ForumAboABI from "./ForumAbo.json";
import { useAppKit, useAppKitProvider, useAppKitAccount } from '@reown/appkit/react';

const CONTRACT_ADDRESS  = "0x0cB2704923F4f3AdD852A087374366C030a7905c";
const CHAINLINK_FEED    = "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419"; // ETH/USD mainnet
const CHAINLINK_ABI     = ["function latestRoundData() view returns (uint80, int256, uint256, uint256, uint80)"];
const TOPICS_PAR_PAGE   = 5;

const FORUMS_INIT = [
  { id:"general", emoji:"💬", name:"Général", description:"Discussions libres, actualités du jour",
    topics:[
      { id:1, title:"Bienvenue sur Zone Free ! Présentez-vous 👋", author:"Admin", pinned:true, replies:[{id:1,author:"0xA1B2...C3D4",content:"Bonjour tout le monde !",date:"01/03/2026"}], date:"01/03/2026" },
      { id:2, title:"Les règles de la communauté Zone Free", author:"Admin", pinned:true, replies:[], date:"01/03/2026" },
      { id:3, title:"Que pensez-vous de la liberté d'expression en 2026 ?", author:"0xA1B2...C3D4", replies:[], date:"01/03/2026" },
    ]},
  { id:"crypto", emoji:"₿", name:"Crypto", description:"Bitcoin, Ethereum, DeFi, Web3",
    topics:[
      { id:1, title:"Bitcoin à 100k$ — Analyse technique du marché", author:"0xF3E2...1A2B", replies:[], date:"28/02/2026" },
      { id:2, title:"DeFi vs Finance traditionnelle : Le débat", author:"0xC9D8...5E6F", replies:[], date:"27/02/2026" },
      { id:3, title:"Monero vs Zcash : Quelle crypto la plus privée ?", author:"0xB7A6...9C0D", replies:[], date:"01/03/2026" },
    ]},
  { id:"tech", emoji:"💻", name:"Tech", description:"Technologie, IA, logiciels, hardware",
    topics:[
      { id:1, title:"Les meilleures IA open-source en 2026", author:"0xD3C2...7I8J", replies:[], date:"01/03/2026" },
      { id:2, title:"Linux vs Windows : Quel OS pour la vie privée ?", author:"0xH1G0...5K6L", replies:[], date:"28/02/2026" },
    ]},
  { id:"politique", emoji:"🏛️", name:"Politique", description:"Débats politiques, géopolitique mondiale",
    topics:[
      { id:1, title:"Censure d'internet : Tour du monde des restrictions", author:"0xL7K6...1O2P", replies:[], date:"01/03/2026" },
      { id:2, title:"CBDC : monnaie numérique d'état, bonne ou mauvaise idée ?", author:"0xN5M4...9Q0R", replies:[], date:"27/02/2026" },
    ]},
  { id:"journaliste", emoji:"📰", name:"Journaliste", description:"Médias libres, investigations, presse indépendante",
    topics:[
      { id:1, title:"Comment publier anonymement en 2026 : Guide complet", author:"0xR1Q0...5U6V", replies:[], date:"01/03/2026" },
      { id:2, title:"Les outils du journaliste indépendant : Tor, Signal, etc.", author:"0xT9S8...3W4X", replies:[], date:"28/02/2026" },
    ]},
];

function App() {
  // ── AppKit ──
  const { open } = useAppKit();
  const { address, isConnected } = useAppKitAccount();
  const { walletProvider } = useAppKitProvider('eip155');

  // ── State ──
  const [dark, setDark] = useState(() => { const s=localStorage.getItem("zf_dark"); return s!==null?JSON.parse(s):true; });
  const [pseudo, setPseudo] = useState(() => localStorage.getItem("zf_pseudo")||"");
  const [showPseudoModal, setShowPseudoModal] = useState(false);
  const [pseudoInput, setPseudoInput] = useState("");
  const [estAbonne, setEstAbonne] = useState(false);
  const [loadingAbo, setLoadingAbo] = useState(false);
  const [expiration, setExpiration] = useState(null);
  const [prixETH, setPrixETH] = useState(null);
  const [page, setPage] = useState("home");
  const [activeForum, setActiveForum] = useState(null);
  const [activeTopic, setActiveTopic] = useState(null);
  const [forums, setForums] = useState(() => { const s=localStorage.getItem("zf_forums"); return s?JSON.parse(s):FORUMS_INIT; });
  const [showNewSalon, setShowNewSalon] = useState(false);
  const [showNewTopic, setShowNewTopic] = useState(false);
  const [newSalon, setNewSalon] = useState({emoji:"",name:"",description:""});
  const [newTopic, setNewTopic] = useState({title:"",content:""});
  const [newReply, setNewReply] = useState("");
  const [recherche, setRecherche] = useState("");
  const [rechercheTopic, setRechercheTopic] = useState("");
  const [sortBy, setSortBy] = useState("date");
  const [currentPage, setCurrentPage] = useState(1);
  const [likes, setLikes] = useState(() => { const s=localStorage.getItem("zf_likes"); return s?JSON.parse(s):{}; });
  const [messages, setMessages] = useState(() => { const s=localStorage.getItem("zf_messages"); return s?JSON.parse(s):[]; });
  const [activeConv, setActiveConv] = useState(null);
  const [newMessage, setNewMessage] = useState("");
  const [newMessageTo, setNewMessageTo] = useState("");
  const [showNewConv, setShowNewConv] = useState(false);
  const [toasts, setToasts] = useState([]);

  // ── Effects ──
  useEffect(() => { localStorage.setItem("zf_forums", JSON.stringify(forums)); }, [forums]);
  useEffect(() => { localStorage.setItem("zf_dark", JSON.stringify(dark)); document.body.className=dark?"dark":"light"; }, [dark]);
  useEffect(() => { localStorage.setItem("zf_likes", JSON.stringify(likes)); }, [likes]);
  useEffect(() => { localStorage.setItem("zf_messages", JSON.stringify(messages)); }, [messages]);

  useEffect(() => {
    if (address && isConnected) {
      verifierAbonnement(address);
      if (!localStorage.getItem("zf_pseudo")) setShowPseudoModal(true);
    } else {
      setEstAbonne(false); setExpiration(null);
    }
  // eslint-disable-next-line
  }, [address, isConnected]);

  // ── Toasts ──
  const showToast = (type, title, msg="") => {
    const id = Date.now()+Math.random();
    setToasts(p=>[...p,{id,type,title,msg}]);
    setTimeout(()=>{ setToasts(p=>p.map(t=>t.id===id?{...t,closing:true}:t)); setTimeout(()=>setToasts(p=>p.filter(t=>t.id!==id)),350); },3500);
  };
  const removeToast = id => { setToasts(p=>p.map(t=>t.id===id?{...t,closing:true}:t)); setTimeout(()=>setToasts(p=>p.filter(t=>t.id!==id)),350); };

  // ── Provider helper ──
  const getProvider = async () => {
    if (walletProvider) return new ethers.BrowserProvider(walletProvider);
    if (window.ethereum) return new ethers.BrowserProvider(window.ethereum);
    throw new Error("Aucun wallet connecté");
  };

  // ── Blockchain ──
  const fetchPrix = async () => {
    try {
      const provider = await getProvider();
      // 1) Essai via le contrat
      try {
        const contract = new ethers.Contract(CONTRACT_ADDRESS, ForumAboABI, provider);
        const prix = await contract.getPrixEnWei();
        setPrixETH(prix); return prix;
      } catch {
        // 2) Appel direct au feed Chainlink mainnet ETH/USD
        const feed = new ethers.Contract(CHAINLINK_FEED, CHAINLINK_ABI, provider);
        const [,answer] = await feed.latestRoundData();
        const ethUsd = Number(answer) / 1e8;          // ex: 1800.00
        const targetEth = 2.16 / ethUsd;              // 2€ ≈ 2.16$ / prix ETH
        const prix = ethers.parseEther(targetEth.toFixed(18).slice(0,20));
        setPrixETH(prix); return prix;
      }
    } catch {
      const fallback = ethers.parseEther("0.00112");
      setPrixETH(fallback); return fallback;
    }
  };

  const verifierAbonnement = async (addr) => {
    try {
      const provider = await getProvider();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, ForumAboABI, provider);
      const abonne = await contract.estAbonne(addr);
      setEstAbonne(abonne);
      const exp = await contract.abonnements(addr);
      if (exp > 0) setExpiration(new Date(Number(exp)*1000));
      await fetchPrix();
    } catch(e) { console.error("Erreur abonnement", e); await fetchPrix(); }
  };

  const sAbonner = async () => {
    if (!address) { open(); return; }
    try {
      setLoadingAbo(true);
      const provider = await getProvider();
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, ForumAboABI, signer);
      const prixWei = await fetchPrix();
      const tx = await contract.sAbonner({ value: prixWei });
      showToast("info","Transaction envoyée","En attente de confirmation...");
      await tx.wait();
      setEstAbonne(true);
      await verifierAbonnement(address);
      showToast("success","Abonnement activé !","Bienvenue sur Zone Free 30 jours 🎉");
    } catch(e) {
      showToast("error","Transaction échouée", e.message?.slice(0,80)||"Erreur inconnue");
    } finally { setLoadingAbo(false); }
  };

  // ── Navigation ──
  const shortAddr = a => a?`${a.slice(0,6)}...${a.slice(-4)}`:"";
  const displayName = a => { if(!a)return""; if(pseudo&&a.toLowerCase()===address?.toLowerCase())return pseudo; return shortAddr(a); };
  const openForum = f => { setActiveForum(f); setRechercheTopic(""); setCurrentPage(1); setSortBy("date"); setPage("forum"); };
  const openTopic = t => { setActiveTopic(t); setPage("topic"); };
  const goHome = () => { setPage("home"); setActiveForum(null); setActiveTopic(null); setRecherche(""); };
  const goForum = () => { setPage("forum"); setActiveTopic(null); };
  const prixEnETH = prixETH ? parseFloat(ethers.formatEther(prixETH)).toFixed(6) : "...";

  // ── Likes ──
  const toggleLike = key => {
    if (!address) { showToast("error","Non connecté","Connectez votre wallet !"); return; }
    if (!estAbonne) { showToast("error","Abonnement requis","Abonnez-vous pour liker."); return; }
    const c = likes[key]||{count:0,likedBy:[]};
    const has = c.likedBy.includes(address);
    setLikes({...likes,[key]:{count:has?c.count-1:c.count+1,likedBy:has?c.likedBy.filter(a=>a!==address):[...c.likedBy,address]}});
  };
  const getLike = key => { const l=likes[key]||{count:0,likedBy:[]}; return {count:l.count,hasLiked:l.likedBy.includes(address)}; };

  // ── Sort ──
  const sortTopics = (topics, fid) => {
    const s=[...topics];
    if(sortBy==="popular") return s.sort((a,b)=>(likes[`${fid}${b.id}`]?.count||0)-(likes[`${fid}${a.id}`]?.count||0));
    if(sortBy==="replies") return s.sort((a,b)=>b.replies.length-a.replies.length);
    return s.sort((a,b)=>b.id-a.id);
  };

  // ── Messagerie ──
  const getConvKey = (a,b)=>[a,b].sort().join("_");
  const demarrerConversation = () => {
    if(!newMessageTo.trim()){showToast("error","Erreur","Entrez une adresse !");return;}
    const addr=newMessageTo.trim();
    const key=getConvKey(shortAddr(address),addr);
    const existing=messages.find(m=>m.key===key);
    if(existing){setActiveConv(existing);}
    else{const nc={id:Date.now(),key,participants:[shortAddr(address),addr],msgs:[]};setMessages(p=>[...p,nc]);setActiveConv(nc);}
    setShowNewConv(false);setNewMessageTo("");setPage("conversation");
  };
  const envoyerMessage = () => {
    if(!address||!estAbonne||!newMessage.trim()||!activeConv)return;
    const msg={id:Date.now(),from:shortAddr(address),to:activeConv.participants.find(p=>p!==shortAddr(address)),content:newMessage,date:new Date().toLocaleDateString("fr-FR"),timestamp:Date.now(),read:false};
    const upd={...activeConv,msgs:[...activeConv.msgs,msg]};
    setMessages(p=>p.some(c=>c.key===activeConv.key)?p.map(c=>c.key===activeConv.key?upd:c):[...p,upd]);
    setActiveConv(upd);setNewMessage("");
  };
  const ouvrirConversation = conv => {
    const upd=messages.map(c=>c.key===conv.key?{...c,msgs:c.msgs.map(m=>m.to===shortAddr(address)?{...m,read:true}:m)}:c);
    setMessages(upd);setActiveConv(upd.find(c=>c.key===conv.key));setPage("conversation");
  };
  const unreadCount = address?messages.reduce((t,c)=>t+c.msgs.filter(m=>m.to===shortAddr(address)&&!m.read).length,0):0;

  // ── Forum actions ──
  const creerSalon = () => {
    if(!address){showToast("error","Non connecté","Connectez votre wallet !");return;}
    if(!estAbonne){showToast("error","Abonnement requis","Abonnez-vous pour créer un salon.");return;}
    if(!newSalon.name.trim()){showToast("error","Erreur","Donnez un nom au salon.");return;}
    const s={id:newSalon.name.toLowerCase().replace(/\s+/g,"-")+Date.now(),emoji:newSalon.emoji||"💬",name:newSalon.name,description:newSalon.description||"Nouveau salon",topics:[]};
    setForums([...forums,s]);setShowNewSalon(false);setNewSalon({emoji:"",name:"",description:""});
    showToast("success","Salon créé !",`${s.emoji} ${s.name}`);
  };
  const creerTopic = () => {
    if(!address){showToast("error","Non connecté","Connectez votre wallet !");return;}
    if(!estAbonne){showToast("error","Abonnement requis","Abonnez-vous pour poster.");return;}
    if(!newTopic.title.trim()){showToast("error","Erreur","Donnez un titre.");return;}
    const t={id:Date.now(),title:newTopic.title,content:newTopic.content,author:displayName(address),replies:[],date:new Date().toLocaleDateString("fr-FR")};
    const upd=forums.map(f=>f.id===activeForum.id?{...f,topics:[t,...f.topics]}:f);
    setForums(upd);setActiveForum(upd.find(f=>f.id===activeForum.id));setShowNewTopic(false);setNewTopic({title:"",content:""});
    showToast("success","Topic publié !",t.title.slice(0,50));
  };
  const posterReponse = () => {
    if(!address){showToast("error","Non connecté","Connectez votre wallet !");return;}
    if(!estAbonne){showToast("error","Abonnement requis","Abonnez-vous pour répondre.");return;}
    if(!newReply.trim()){showToast("error","Erreur","Écrivez un message.");return;}
    const r={id:Date.now(),author:displayName(address),content:newReply,date:new Date().toLocaleDateString("fr-FR")};
    const updT={...activeTopic,replies:[...activeTopic.replies,r]};
    const upd=forums.map(f=>f.id===activeForum.id?{...f,topics:f.topics.map(t=>t.id===activeTopic.id?updT:t)}:f);
    setForums(upd);setActiveForum(upd.find(f=>f.id===activeForum.id));setActiveTopic(updT);setNewReply("");
    showToast("success","Réponse publiée !","");
  };

  // ── Calculs ──
  const joursRestants = expiration?Math.max(0,Math.ceil((expiration-new Date())/(1000*60*60*24))):0;
  const topicsBase = (activeForum?.topics||[]).filter(t=>t.title.toLowerCase().includes(rechercheTopic.toLowerCase())||t.author.toLowerCase().includes(rechercheTopic.toLowerCase()));
  const topicsSorted = sortTopics(topicsBase,activeForum?.id);
  const totalPages = Math.ceil(topicsSorted.length/TOPICS_PAR_PAGE);
  const topicsPaginated = topicsSorted.slice((currentPage-1)*TOPICS_PAR_PAGE,currentPage*TOPICS_PAR_PAGE);
  const forumsFiltered = forums.filter(f=>f.name.toLowerCase().includes(recherche.toLowerCase())||f.description.toLowerCase().includes(recherche.toLowerCase()));
  const inp = {display:"block",width:"100%",padding:"10px 14px",borderRadius:8,border:"1.5px solid #30363d",background:dark?"#0d1117":"#f8f9ff",color:dark?"#e6edf3":"#1a1a2e",fontSize:15,marginBottom:16,marginTop:6,boxSizing:"border-box",fontFamily:"inherit",outline:"none"};
  const TI = {success:"✅",error:"❌",info:"ℹ️"};

  return (
    <div>
      {/* HEADER */}
      <header className="header">
        <div className="logo" onClick={goHome} style={{cursor:"pointer"}}>Zone<span>Free</span></div>
        <div className="header-actions">
          <button className="btn btn-ghost" onClick={()=>setDark(!dark)}>{dark?"☀️":"🌙"}</button>
          {address&&(
            <>
              <button className="btn btn-ghost" onClick={()=>setPage("messages")} style={{position:"relative",fontSize:13}}>
                📩 Messages
                {unreadCount>0&&<span style={{position:"absolute",top:-4,right:-4,background:"#ef4444",color:"white",borderRadius:"50%",width:18,height:18,fontSize:10,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700}}>{unreadCount}</span>}
              </button>
              <button className="btn btn-ghost" onClick={()=>setPage("profil")} style={{fontSize:13}}>👤 Profil</button>
            </>
          )}
          {address?(
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <span className="wallet-addr">{pseudo||shortAddr(address)}</span>
              {estAbonne
                ?<span className="badge-abonne">✓ Abonné</span>
                :<button className="btn btn-primary" onClick={sAbonner} disabled={loadingAbo} style={{fontSize:13,padding:"6px 14px"}}>
                  {loadingAbo?<><span className="spinner"/>Transaction...</>:`S'abonner ${prixEnETH} ETH`}
                </button>
              }
            </div>
          ):(
            <button className="btn btn-primary" onClick={()=>open()}>🔗 Connecter</button>
          )}
        </div>
      </header>

      {/* BANNIÈRE */}
      {address&&!estAbonne&&!["profil","messages","conversation"].includes(page)&&(
        <div style={{background:"linear-gradient(90deg,#f59e0b22,#6366f122)",border:"1.5px solid #f59e0b",borderRadius:12,margin:"16px auto",maxWidth:860,padding:"14px 24px",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12}}>
          <p style={{margin:0,fontSize:14}}><strong>Vous n'êtes pas abonné.</strong> Accédez à tout pour 2€/mois en ETH.</p>
          <button className="btn btn-primary" onClick={sAbonner} disabled={loadingAbo} style={{fontSize:13,padding:"8px 20px"}}>
            {loadingAbo?<><span className="spinner"/>Transaction...</>:`S'abonner ${prixEnETH} ETH · 2€/30j`}
          </button>
        </div>
      )}

      {/* PAGE HOME */}
      {page==="home"&&(
        <div>
          <div className="hero">
            <div className="badge">🔒 Décentralisé • Libre • Privé</div>
            <h1>Bienvenue sur <span>Zone Free</span></h1>
            <p>Le forum décentralisé où la parole est libre. Abonnement sécurisé par Ethereum.</p>
          </div>
          <div className="search-container">
            <span className="search-icon">🔍</span>
            <input className="search-input" placeholder="Rechercher un salon..." value={recherche} onChange={e=>setRecherche(e.target.value)}/>
            {recherche&&<button className="search-clear" onClick={()=>setRecherche("")}>✕</button>}
          </div>
          <div style={{textAlign:"center",marginBottom:24}}>
            <button className="btn btn-primary" onClick={()=>setShowNewSalon(true)} style={{fontSize:16,padding:"12px 28px"}}>＋ Créer un nouveau salon</button>
          </div>
          {forumsFiltered.length===0
            ?<div className="no-results"><span>🔍</span><p>Aucun salon pour <strong>{recherche}</strong></p></div>
            :<div className="forums-grid">
              {forumsFiltered.map(f=>(
                <div key={f.id} className="forum-card" onClick={()=>openForum(f)}>
                  <div className="forum-emoji">{f.emoji}</div>
                  <div className="forum-name">{f.name}</div>
                  <div className="forum-desc">{f.description}</div>
                  <div className="forum-meta">
                    <span>{f.topics.length} topics</span>
                    <span>{f.topics.reduce((a,t)=>a+t.replies.length,0)} réponses</span>
                  </div>
                </div>
              ))}
            </div>
          }
        </div>
      )}

      {/* PAGE FORUM */}
      {page==="forum"&&activeForum&&(
        <div className="forum-page">
          <button className="back-btn" onClick={goHome}>← Retour aux forums</button>
          <div className="forum-header">
            <h2>{activeForum.emoji} {activeForum.name}</h2>
            <p style={{opacity:0.6,marginTop:6}}>{activeForum.description}</p>
          </div>
          <button className="new-topic-btn" onClick={()=>setShowNewTopic(true)}>✏️ Nouveau topic</button>
          <div className="search-container" style={{margin:"0 0 16px"}}>
            <span className="search-icon">🔍</span>
            <input className="search-input" placeholder="Rechercher un topic..." value={rechercheTopic} onChange={e=>{setRechercheTopic(e.target.value);setCurrentPage(1);}}/>
            {rechercheTopic&&<button className="search-clear" onClick={()=>setRechercheTopic("")}>✕</button>}
          </div>
          <div className="sort-bar">
            <span style={{fontSize:13,opacity:0.6}}>Trier par</span>
            {[["date","Plus récents"],["popular","Populaires"],["replies","Plus de réponses"]].map(([v,l])=>(
              <button key={v} className={`sort-btn${sortBy===v?" active":""}`} onClick={()=>{setSortBy(v);setCurrentPage(1);}}>{l}</button>
            ))}
          </div>
          {topicsPaginated.length===0
            ?<div className="no-results"><span>📭</span><p>Aucun topic trouvé.</p></div>
            :topicsPaginated.map(t=>{
              const lk=`${activeForum.id}${t.id}`;
              const {count,hasLiked}=getLike(lk);
              return(
                <div key={t.id} className={`topic-card${t.pinned?" pinned":""}`} onClick={()=>openTopic(t)}>
                  <div style={{flex:1}}>
                    <div className="topic-title">{t.pinned&&<span className="pin-badge">📌 Épinglé</span>}{t.title}</div>
                    <div className="topic-meta">par {t.author} · {t.date}</div>
                    <div style={{marginTop:8}} onClick={e=>e.stopPropagation()}>
                      <button className={`like-btn${hasLiked?" liked":""}`} onClick={()=>toggleLike(lk)}>❤️{count>0?` ${count}`:""} J'aime</button>
                    </div>
                  </div>
                  <div className="topic-replies">{t.replies.length} 💬</div>
                </div>
              );
            })
          }
          {totalPages>1&&(
            <div className="pagination">
              <button className="page-btn" disabled={currentPage===1} onClick={()=>setCurrentPage(p=>p-1)}>‹</button>
              {Array.from({length:totalPages},(_,i)=>i+1).map(n=>(
                <button key={n} className={`page-btn${currentPage===n?" active":""}`} onClick={()=>setCurrentPage(n)}>{n}</button>
              ))}
              <button className="page-btn" disabled={currentPage===totalPages} onClick={()=>setCurrentPage(p=>p+1)}>›</button>
            </div>
          )}
        </div>
      )}

      {/* PAGE TOPIC */}
      {page==="topic"&&activeTopic&&(
        <div className="forum-page">
          <button className="back-btn" onClick={goForum}>← Retour {activeForum?.emoji} {activeForum?.name}</button>
          <div style={{borderRadius:14,padding:28,marginBottom:24,background:dark?"#161b22":"#ffffff",border:"1.5px solid #6366f1"}}>
            <h2 style={{fontSize:22,marginBottom:12}}>{activeTopic.title}</h2>
            <p style={{opacity:0.5,fontSize:13,marginBottom:16}}>par <strong>{activeTopic.author}</strong> · {activeTopic.date}</p>
            {activeTopic.content&&<p style={{fontSize:15,lineHeight:1.7}}>{activeTopic.content}</p>}
            <div style={{marginTop:16}}>
              <button className={`like-btn${getLike(`${activeForum?.id}${activeTopic.id}`).hasLiked?" liked":""}`} onClick={()=>toggleLike(`${activeForum?.id}${activeTopic.id}`)}>
                ❤️{getLike(`${activeForum?.id}${activeTopic.id}`).count>0?` ${getLike(`${activeForum?.id}${activeTopic.id}`).count}`:""} J'aime
              </button>
            </div>
          </div>
          <h3 style={{marginBottom:16,opacity:0.7}}>{activeTopic.replies.length} réponse{activeTopic.replies.length!==1?"s":""}</h3>
          {activeTopic.replies.map(r=>(
            <div key={r.id} style={{borderRadius:12,padding:"16px 20px",marginBottom:12,background:dark?"#161b22":"#ffffff",border:`1.5px solid ${dark?"#30363d":"#e2e8f0"}`}}>
              <p style={{fontSize:13,opacity:0.5,marginBottom:8}}><strong>{r.author}</strong> · {r.date}</p>
              <p style={{fontSize:15,lineHeight:1.6}}>{r.content}</p>
              <button className={`like-btn${getLike(`reply${r.id}`).hasLiked?" liked":""}`} style={{marginTop:8}} onClick={()=>toggleLike(`reply${r.id}`)}>
                ❤️{getLike(`reply${r.id}`).count>0?` ${getLike(`reply${r.id}`).count}`:""} J'aime
              </button>
            </div>
          ))}
          <div style={{borderRadius:14,padding:24,marginTop:24,background:dark?"#161b22":"#ffffff",border:`1.5px solid ${dark?"#30363d":"#e2e8f0"}`}}>
            <h3 style={{marginBottom:16}}>Votre réponse</h3>
            {!address&&<p style={{opacity:0.6,marginBottom:12,fontSize:14}}>Connectez votre wallet pour répondre.</p>}
            {address&&!estAbonne&&<p style={{color:"#f59e0b",marginBottom:12,fontSize:14}}>Abonnez-vous pour répondre.</p>}
            <textarea value={newReply} onChange={e=>setNewReply(e.target.value)} placeholder="Écrivez votre réponse..." rows={4} style={{...inp,resize:"vertical"}} disabled={!estAbonne||!address}/>
            <button className="btn btn-primary" onClick={posterReponse} style={{padding:"12px 28px"}} disabled={!estAbonne||!address}>Poster la réponse</button>
          </div>
        </div>
      )}

      {/* PAGE MESSAGES */}
      {page==="messages"&&address&&(
        <div className="forum-page">
          <button className="back-btn" onClick={goHome}>← Retour à l'accueil</button>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
            <h2 style={{fontSize:22}}>💬 Messagerie</h2>
            <button className="btn btn-primary" onClick={()=>setShowNewConv(true)}>✉️ Nouveau message</button>
          </div>
          <div style={{background:"#6366f111",border:"1.5px solid #6366f133",borderRadius:10,padding:"10px 16px",marginBottom:20,fontSize:13}}>🔒 Messages chiffrés localement · Stockage on-chain à venir</div>
          {messages.length===0
            ?<div className="no-results"><span>📭</span><p>Aucun message. Démarrez une conversation !</p></div>
            :<div className="messages-list">
              {messages.map(conv=>{
                const other=conv.participants.find(p=>p!==shortAddr(address))||conv.participants[0];
                const lastMsg=conv.msgs[conv.msgs.length-1];
                const unread=conv.msgs.filter(m=>m.to===shortAddr(address)&&!m.read).length;
                return(
                  <div key={conv.id} className="conversation-item" onClick={()=>ouvrirConversation(conv)}>
                    <div className="conv-avatar">👤</div>
                    <div className="conv-info">
                      <div className="conv-addr">{other}</div>
                      <div className="conv-preview">{lastMsg?lastMsg.content:"Démarrer la conversation..."}</div>
                    </div>
                    {unread>0&&<div className="unread-badge">{unread}</div>}
                  </div>
                );
              })}
            </div>
          }
        </div>
      )}

      {/* PAGE CONVERSATION */}
      {page==="conversation"&&activeConv&&address&&(
        <div className="forum-page" style={{padding:0}}>
          <div style={{padding:"16px 24px",borderBottom:`1.5px solid ${dark?"#30363d":"#e2e8f0"}`,display:"flex",alignItems:"center",gap:16}}>
            <button className="back-btn" style={{margin:0}} onClick={()=>setPage("messages")}>←</button>
            <div className="conv-avatar" style={{width:36,height:36,fontSize:14}}>👤</div>
            <div style={{fontWeight:700}}>{activeConv.participants.find(p=>p!==shortAddr(address))}</div>
            <div style={{marginLeft:"auto",fontSize:12,opacity:0.5}}>🔒 Chiffré</div>
          </div>
          <div className="chat-container" style={{minHeight:400,maxHeight:500,overflowY:"auto"}}>
            {activeConv.msgs.length===0
              ?<div style={{textAlign:"center",opacity:0.4,marginTop:40}}>Aucun message · Dites bonjour ! 👋</div>
              :activeConv.msgs.map(m=>{
                const isSent=m.from===shortAddr(address);
                return(
                  <div key={m.id} className={`bubble-wrapper ${isSent?"sent":"received"}`}>
                    <div className={`bubble ${isSent?"sent":"received"}`}>{m.content}</div>
                    <div className="bubble-time">{m.date}</div>
                  </div>
                );
              })
            }
          </div>
          <div className="message-input-bar">
            {!estAbonne
              ?<p style={{color:"#f59e0b",fontSize:14,margin:0}}>Abonnement requis pour envoyer des messages.</p>
              :<>
                <textarea className="message-input" rows={1} value={newMessage} onChange={e=>setNewMessage(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();envoyerMessage();}}} placeholder="Écrire un message... (Entrée pour envoyer)"/>
                <button className="send-btn" onClick={envoyerMessage} disabled={!newMessage.trim()}>➤</button>
              </>
            }
          </div>
        </div>
      )}

      {/* PAGE PROFIL */}
      {page==="profil"&&address&&(
        <div className="forum-page">
          <button className="back-btn" onClick={goHome}>← Retour à l'accueil</button>
          <div style={{borderRadius:20,padding:36,marginBottom:24,background:dark?"#161b22":"#ffffff",border:"1.5px solid #6366f1",textAlign:"center"}}>
            <div style={{fontSize:64,marginBottom:12}}>🦊</div>
            <div style={{fontSize:20,fontWeight:700,marginBottom:4}}>{pseudo||shortAddr(address)}</div>
            <div style={{fontSize:13,opacity:0.5,marginBottom:16,fontFamily:"monospace"}}>{address}</div>
            <button className="btn btn-ghost" style={{fontSize:12,marginBottom:20}} onClick={()=>{setPseudoInput(pseudo);setShowPseudoModal(true);}}>✏️ Modifier le pseudo</button>
            <br/>
            {estAbonne
              ?<div style={{display:"inline-flex",alignItems:"center",gap:8,background:"#22c55e22",border:"1.5px solid #22c55e",borderRadius:20,padding:"8px 20px"}}><span style={{color:"#22c55e",fontWeight:700}}>✓ Abonné actif</span></div>
              :<div style={{display:"inline-flex",alignItems:"center",gap:8,background:"#f59e0b22",border:"1.5px solid #f59e0b",borderRadius:20,padding:"8px 20px"}}><span style={{color:"#f59e0b",fontWeight:700}}>⚠️ Non abonné</span></div>
            }
          </div>
          <div style={{borderRadius:16,padding:20,marginBottom:24,background:dark?"#161b22":"#ffffff",border:"1.5px solid #6366f1",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div>
              <div style={{fontSize:12,opacity:0.5,marginBottom:4}}>PRIX ABONNEMENT (Chainlink mainnet)</div>
              <div style={{fontSize:22,fontWeight:800,color:"#6366f1"}}>{prixEnETH} ETH</div>
              <div style={{fontSize:13,opacity:0.6}}>≈ 2,00 EUR / 30 jours</div>
            </div>
            <div style={{fontSize:40}}>⛓️</div>
          </div>
          {estAbonne&&(
            <div style={{borderRadius:16,padding:28,marginBottom:24,background:dark?"#161b22":"#ffffff",border:`1.5px solid ${dark?"#30363d":"#e2e8f0"}`}}>
              <h3 style={{marginBottom:20}}>Détails abonnement</h3>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
                {[
                  {label:"STATUT",value:"✓ Actif",color:"#22c55e"},
                  {label:"JOURS RESTANTS",value:`${joursRestants} jours`,color:joursRestants>7?"#22c55e":"#f59e0b"},
                  {label:"EXPIRATION",value:expiration?expiration.toLocaleDateString("fr-FR"):"—",color:null},
                  {label:"PRIX",value:`${prixEnETH} ETH ≈ 2€`,color:"#6366f1"},
                ].map((item,i)=>(
                  <div key={i} style={{borderRadius:12,padding:20,background:dark?"#0d1117":"#f8f9ff",border:`1.5px solid ${dark?"#30363d":"#e2e8f0"}`}}>
                    <div style={{fontSize:12,opacity:0.5,marginBottom:6}}>{item.label}</div>
                    <div style={{fontSize:16,fontWeight:700,color:item.color||"inherit"}}>{item.value}</div>
                  </div>
                ))}
              </div>
              <div style={{marginTop:24}}>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:12,opacity:0.6,marginBottom:8}}>
                  <span>Progression</span><span>{joursRestants}/30 jours</span>
                </div>
                <div style={{background:dark?"#0d1117":"#e2e8f0",borderRadius:8,height:10,overflow:"hidden"}}>
                  <div style={{height:"100%",borderRadius:8,width:`${(joursRestants/30)*100}%`,background:joursRestants>7?"linear-gradient(90deg,#6366f1,#22c55e)":"linear-gradient(90deg,#f59e0b,#ef4444)",transition:"width 0.5s ease"}}/>
                </div>
              </div>
            </div>
          )}
          <div style={{borderRadius:16,padding:28,marginBottom:24,background:dark?"#161b22":"#ffffff",border:`1.5px solid ${dark?"#30363d":"#e2e8f0"}`}}>
            <h3 style={{marginBottom:20}}>Mes statistiques</h3>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:16}}>
              {[
                {label:"Topics créés",value:forums.reduce((a,f)=>a+f.topics.filter(t=>t.author===displayName(address)).length,0),icon:"✍️"},
                {label:"Réponses",value:forums.reduce((a,f)=>a+f.topics.reduce((b,t)=>b+t.replies.filter(r=>r.author===displayName(address)).length,0),0),icon:"💬"},
                {label:"Messages",value:messages.reduce((a,c)=>a+c.msgs.filter(m=>m.from===shortAddr(address)).length,0),icon:"📩"},
              ].map((stat,i)=>(
                <div key={i} style={{borderRadius:12,padding:20,textAlign:"center",background:dark?"#0d1117":"#f8f9ff",border:`1.5px solid ${dark?"#30363d":"#e2e8f0"}`}}>
                  <div style={{fontSize:28,marginBottom:8}}>{stat.icon}</div>
                  <div style={{fontSize:28,fontWeight:800,color:"#6366f1"}}>{stat.value}</div>
                  <div style={{fontSize:12,opacity:0.6,marginTop:4}}>{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
          {!estAbonne&&(
            <div style={{textAlign:"center",marginBottom:24}}>
              <button className="btn btn-primary" onClick={sAbonner} disabled={loadingAbo} style={{fontSize:16,padding:"14px 36px"}}>
                {loadingAbo?<><span className="spinner"/>Transaction...</>:`S'abonner ${prixEnETH} ETH ≈ 2€/mois`}
              </button>
            </div>
          )}
          <div style={{textAlign:"center",opacity:0.5,fontSize:13}}>
            <a href={`https://etherscan.io/address/${address}`} target="_blank" rel="noreferrer" style={{color:"#6366f1"}}>Voir sur Etherscan</a>
          </div>
        </div>
      )}

      {/* MODAL PSEUDO */}
      {showPseudoModal&&(
        <div className="pseudo-modal-overlay">
          <div className="pseudo-modal">
            <h2>Choisissez votre pseudo</h2>
            <p>Affiché à la place de votre adresse wallet.</p>
            <input className="pseudo-input" value={pseudoInput} onChange={e=>setPseudoInput(e.target.value)} placeholder="MonPseudo" maxLength={20} autoFocus onKeyDown={e=>{if(e.key==="Enter"&&pseudoInput.trim()){setPseudo(pseudoInput.trim());localStorage.setItem("zf_pseudo",pseudoInput.trim());setShowPseudoModal(false);showToast("success","Pseudo enregistré !",pseudoInput.trim());}}}/>
            <button className="btn btn-primary" style={{width:"100%",padding:12}} onClick={()=>{if(pseudoInput.trim()){setPseudo(pseudoInput.trim());localStorage.setItem("zf_pseudo",pseudoInput.trim());}setShowPseudoModal(false);if(pseudoInput.trim())showToast("success","Pseudo enregistré !",pseudoInput.trim());}}>Confirmer</button>
            <button className="btn btn-ghost" style={{width:"100%",padding:10,marginTop:8}} onClick={()=>setShowPseudoModal(false)}>Passer</button>
          </div>
        </div>
      )}

      {/* MODAL NOUVEAU SALON */}
      {showNewSalon&&(
        <div style={{position:"fixed",inset:0,background:"#0008",display:"flex",alignItems:"center",justifyContent:"center",zIndex:999}}>
          <div style={{background:dark?"#161b22":"white",borderRadius:16,padding:32,width:420,border:"1.5px solid #6366f1"}}>
            <h2 style={{marginBottom:24,color:"#6366f1"}}>Nouveau salon</h2>
            <label style={{fontSize:13,opacity:0.7}}>Emoji</label>
            <input value={newSalon.emoji} onChange={e=>setNewSalon({...newSalon,emoji:e.target.value})} style={inp} placeholder="🌐" maxLength={2}/>
            <label style={{fontSize:13,opacity:0.7}}>Nom</label>
            <input value={newSalon.name} onChange={e=>setNewSalon({...newSalon,name:e.target.value})} style={inp} placeholder="Ex : Sciences, Art..."/>
            <label style={{fontSize:13,opacity:0.7}}>Description</label>
            <input value={newSalon.description} onChange={e=>setNewSalon({...newSalon,description:e.target.value})} style={inp} placeholder="Description courte"/>
            <div style={{display:"flex",gap:12}}>
              <button className="btn btn-primary" onClick={creerSalon} style={{flex:1}}>Créer</button>
              <button className="btn btn-ghost" onClick={()=>setShowNewSalon(false)} style={{flex:1}}>Annuler</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL NOUVEAU TOPIC */}
      {showNewTopic&&(
        <div style={{position:"fixed",inset:0,background:"#0008",display:"flex",alignItems:"center",justifyContent:"center",zIndex:999}}>
          <div style={{background:dark?"#161b22":"white",borderRadius:16,padding:32,width:500,border:"1.5px solid #6366f1"}}>
            <h2 style={{marginBottom:24,color:"#6366f1"}}>Nouveau topic</h2>
            <label style={{fontSize:13,opacity:0.7}}>Titre</label>
            <input value={newTopic.title} onChange={e=>setNewTopic({...newTopic,title:e.target.value})} style={inp} placeholder="Titre du topic..."/>
            <label style={{fontSize:13,opacity:0.7}}>Contenu</label>
            <textarea value={newTopic.content} onChange={e=>setNewTopic({...newTopic,content:e.target.value})} style={{...inp,resize:"vertical"}} rows={4} placeholder="Développez votre sujet..."/>
            <div style={{display:"flex",gap:12}}>
              <button className="btn btn-primary" onClick={creerTopic} style={{flex:1}}>Publier</button>
              <button className="btn btn-ghost" onClick={()=>setShowNewTopic(false)} style={{flex:1}}>Annuler</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL NOUVEAU MESSAGE */}
      {showNewConv&&(
        <div style={{position:"fixed",inset:0,background:"#0008",display:"flex",alignItems:"center",justifyContent:"center",zIndex:999}}>
          <div style={{background:dark?"#161b22":"white",borderRadius:16,padding:32,width:420,border:"1.5px solid #6366f1"}}>
            <h2 style={{marginBottom:24,color:"#6366f1"}}>Nouveau message</h2>
            <label style={{fontSize:13,opacity:0.7}}>Adresse ou pseudo du destinataire</label>
            <input value={newMessageTo} onChange={e=>setNewMessageTo(e.target.value)} style={inp} placeholder="0x... ou pseudo"/>
            <div style={{display:"flex",gap:12}}>
              <button className="btn btn-primary" onClick={demarrerConversation} style={{flex:1}}>Démarrer</button>
              <button className="btn btn-ghost" onClick={()=>setShowNewConv(false)} style={{flex:1}}>Annuler</button>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="footer">
        Zone Free © 2026 · <a href={`https://etherscan.io/address/${CONTRACT_ADDRESS}`} target="_blank" rel="noreferrer">Contrat Etherscan</a>
      </footer>

      {/* TOASTS */}
      <div className="toast-container">
        {toasts.map(t=>(
          <div key={t.id} className={`toast ${t.type}${t.closing?" closing":""}`}>
            <span className="toast-icon">{TI[t.type]}</span>
            <div className="toast-content">
              <div className="toast-title">{t.title}</div>
              {t.msg&&<div className="toast-msg">{t.msg}</div>}
            </div>
            <button className="toast-close" onClick={()=>removeToast(t.id)}>✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;

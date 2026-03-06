import './App.css';
import { useState, useEffect } from "react";
import { ethers } from "ethers";
import ForumAboABI from "./ForumAbo.json";

const CONTRACT_ADDRESS = "0x0cB2704923F4f3AdD852A087374366C030a7905c";
const TOPICS_PAR_PAGE = 5;

const FORUMS_INIT = [
  {
    id: "general", emoji: "💬", name: "Général",
    description: "Discussions libres, actualités du jour",
    topics: [
      { id: 1, title: "Bienvenue sur Free Zone ! Présentez-vous 👋", author: "Admin", replies: [{ id:1, author:"0xA1B2...C3D4", content:"Bonjour tout le monde !", date:"01/03/2026" },{ id:2, author:"0xE5F6...G7H8", content:"Ravi d'être ici !", date:"01/03/2026" }], date: "01/03/2026" },
      { id: 2, title: "Les règles de la communauté Free Zone", author: "Admin", replies: [], date: "01/03/2026" },
      { id: 3, title: "Que pensez-vous de la liberté d'expression en 2026 ?", author: "0xA1B2...C3D4", replies: [], date: "01/03/2026" },
    ]
  },
  {
    id: "crypto", emoji: "₿", name: "Crypto",
    description: "Bitcoin, Ethereum, DeFi, Web3",
    topics: [
      { id: 1, title: "Bitcoin à 100k$ — Analyse technique du marché", author: "0xF3E2...1A2B", replies: [], date: "28/02/2026" },
      { id: 2, title: "DeFi vs Finance traditionnelle — Le débat", author: "0xC9D8...5E6F", replies: [], date: "27/02/2026" },
      { id: 3, title: "Monero vs Zcash — Quelle crypto la plus privée ?", author: "0xB7A6...9C0D", replies: [], date: "01/03/2026" },
      { id: 4, title: "Est-ce que l'Ethereum mainnet est toujours pertinent ?", author: "0xE5F4...3G4H", replies: [], date: "01/03/2026" },
    ]
  },
  {
    id: "tech", emoji: "💻", name: "Tech",
    description: "Technologie, IA, logiciels, hardware",
    topics: [
      { id: 1, title: "Les meilleures IA open-source en 2026", author: "0xD3C2...7I8J", replies: [], date: "01/03/2026" },
      { id: 2, title: "Linux vs Windows — Quel OS pour la vie privée ?", author: "0xH1G0...5K6L", replies: [], date: "28/02/2026" },
      { id: 3, title: "Projet : construire son propre nœud Ethereum", author: "0xJ9I8...3M4N", replies: [], date: "01/03/2026" },
    ]
  },
  {
    id: "politique", emoji: "🏛️", name: "Politique",
    description: "Débats politiques, géopolitique mondiale",
    topics: [
      { id: 1, title: "Censure d'internet — Tour du monde des restrictions", author: "0xL7K6...1O2P", replies: [], date: "01/03/2026" },
      { id: 2, title: "CBDC : monnaie numérique d'État, bonne ou mauvaise idée ?", author: "0xN5M4...9Q0R", replies: [], date: "27/02/2026" },
      { id: 3, title: "Élections et réseaux sociaux : manipulation de l'opinion ?", author: "0xP3O2...7S8T", replies: [], date: "28/02/2026" },
    ]
  },
  {
    id: "journaliste", emoji: "📰", name: "Journaliste",
    description: "Médias libres, investigations, presse indépendante",
    topics: [
      { id: 1, title: "Comment publier anonymement en 2026 — Guide complet", author: "0xR1Q0...5U6V", replies: [], date: "01/03/2026" },
      { id: 2, title: "Les outils du journaliste indépendant (Tor, Signal, etc.)", author: "0xT9S8...3W4X", replies: [], date: "28/02/2026" },
    ]
  },
];

function App() {
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem("freezone_dark");
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [account, setAccount] = useState(null);
  const [estAbonne, setEstAbonne] = useState(false);
  const [loadingAbo, setLoadingAbo] = useState(false);
  const [expiration, setExpiration] = useState(null);
  const [prixETH, setPrixETH] = useState(null);
  const [page, setPage] = useState("home");
  const [forums, setForums] = useState(() => {
    const saved = localStorage.getItem("freezone_forums");
    return saved ? JSON.parse(saved) : FORUMS_INIT;
  });
  const [activeForum, setActiveForum] = useState(null);
  const [activeTopic, setActiveTopic] = useState(null);
  const [showTranslate, setShowTranslate] = useState(false);
  const [showNewSalon, setShowNewSalon] = useState(false);
  const [showNewTopic, setShowNewTopic] = useState(false);
  const [newSalon, setNewSalon] = useState({ emoji: "💬", name: "", description: "" });
  const [newTopic, setNewTopic] = useState({ title: "", content: "" });
  const [newReply, setNewReply] = useState("");
  const [recherche, setRecherche] = useState("");
  const [rechercheTopic, setRechercheTopic] = useState("");

  // Nouveaux états
  const [sortBy, setSortBy] = useState("date");
  const [currentPage, setCurrentPage] = useState(1);
  const [likes, setLikes] = useState(() => {
    const saved = localStorage.getItem("freezone_likes");
    return saved ? JSON.parse(saved) : {};
  });
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem("freezone_messages");
    return saved ? JSON.parse(saved) : [];
  });
  const [activeConversation, setActiveConversation] = useState(null);
  const [newMessage, setNewMessage] = useState("");
  const [newMessageTo, setNewMessageTo] = useState("");
  const [showNewConversation, setShowNewConversation] = useState(false);

  useEffect(() => { localStorage.setItem("freezone_forums", JSON.stringify(forums)); }, [forums]);
  useEffect(() => {
    localStorage.setItem("freezone_dark", JSON.stringify(dark));
    document.body.className = dark ? "dark" : "light";
  }, [dark]);
  useEffect(() => { localStorage.setItem("freezone_likes", JSON.stringify(likes)); }, [likes]);
  useEffect(() => { localStorage.setItem("freezone_messages", JSON.stringify(messages)); }, [messages]);

  // ===== LIKES =====
  const toggleLike = (key) => {
    if (!account) { alert("Connectez MetaMask pour liker !"); return; }
    if (!estAbonne) { alert("⚠️ Abonnement requis pour liker !"); return; }
    const current = likes[key] || { count: 0, likedBy: [] };
    const hasLiked = current.likedBy.includes(account);
    setLikes({
      ...likes,
      [key]: {
        count: hasLiked ? current.count - 1 : current.count + 1,
        likedBy: hasLiked ? current.likedBy.filter(a => a !== account) : [...current.likedBy, account]
      }
    });
  };
  const getLike = (key) => {
    const l = likes[key] || { count: 0, likedBy: [] };
    return { count: l.count, hasLiked: l.likedBy.includes(account) };
  };

  // ===== TRI =====
  const sortTopics = (topics, forumId) => {
    const sorted = [...topics];
    if (sortBy === "popular") return sorted.sort((a, b) => (likes[`${forumId}_${b.id}`]?.count || 0) - (likes[`${forumId}_${a.id}`]?.count || 0));
    if (sortBy === "replies") return sorted.sort((a, b) => b.replies.length - a.replies.length);
    return sorted.sort((a, b) => b.id - a.id);
  };

  // ===== MESSAGERIE =====
  const getConvKey = (a, b) => [a, b].sort().join("___");

  const demarrerConversation = () => {
    if (!newMessageTo.trim()) { alert("Entrez une adresse !"); return; }
    const addr = newMessageTo.trim();
    const key = getConvKey(shortAddr(account), addr);
    const existing = messages.find(m => m.key === key);
    if (existing) {
      setActiveConversation(existing);
    } else {
      const newConv = { id: Date.now(), key, participants: [shortAddr(account), addr], msgs: [] };
      setMessages(prev => [...prev, newConv]);
      setActiveConversation(newConv);
    }
    setShowNewConversation(false);
    setNewMessageTo("");
    setPage("conversation");
  };

  const envoyerMessage = () => {
    if (!account || !estAbonne || !newMessage.trim() || !activeConversation) return;
    const msg = {
      id: Date.now(),
      from: shortAddr(account),
      to: activeConversation.participants.find(p => p !== shortAddr(account)),
      content: newMessage,
      date: new Date().toLocaleDateString("fr-FR"),
      timestamp: Date.now(),
      read: false
    };
    const updatedConv = { ...activeConversation, msgs: [...activeConversation.msgs, msg] };
    setMessages(prev => {
      const exists = prev.find(c => c.key === activeConversation.key);
      if (exists) return prev.map(c => c.key === activeConversation.key ? updatedConv : c);
      return [...prev, updatedConv];
    });
    setActiveConversation(updatedConv);
    setNewMessage("");
  };

  const ouvrirConversation = (conv) => {
    const updated = messages.map(c =>
      c.key === conv.key
        ? { ...c, msgs: c.msgs.map(m => m.to === shortAddr(account) ? { ...m, read: true } : m) }
        : c
    );
    setMessages(updated);
    setActiveConversation(updated.find(c => c.key === conv.key));
    setPage("conversation");
  };

  const unreadCount = account
    ? messages.reduce((total, conv) =>
        total + conv.msgs.filter(m => m.to === shortAddr(account) && !m.read).length, 0)
    : 0;

  // ===== BLOCKCHAIN =====
  const fetchPrix = async (prov) => {
    try {
      const provider = prov || new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(CONTRACT_ADDRESS, ForumAboABI, provider);
      const prix = await contract.getPrixEnWei();
      setPrixETH(prix); return prix;
    } catch (e) { console.error("Erreur prix:", e); return null; }
  };

  const verifierAbonnement = async (addr, prov) => {
    try {
      const provider = prov || new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(CONTRACT_ADDRESS, ForumAboABI, provider);
      const abonne = await contract.estAbonne(addr);
      setEstAbonne(abonne);
      const exp = await contract.abonnements(addr);
      if (exp > 0) setExpiration(new Date(Number(exp) * 1000));
      await fetchPrix(provider);
    } catch (e) { console.error("Erreur abonnement:", e); }
  };

  const connectWallet = async () => {
    if (!window.ethereum?.isMetaMask) { alert("Installez MetaMask !"); return; }
    const provider = new ethers.BrowserProvider(window.ethereum);
    const accounts = await provider.send("eth_requestAccounts", []);
    setAccount(accounts[0]);
    await verifierAbonnement(accounts[0], provider);
  };

  const sAbonner = async () => {
    if (!account) { alert("Connectez MetaMask !"); return; }
    try {
      setLoadingAbo(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, ForumAboABI, signer);
      const prixWei = await contract.getPrixEnWei();
      const tx = await contract.sAbonner({ value: prixWei });
      await tx.wait();
      setEstAbonne(true);
      await verifierAbonnement(account);
      alert("✅ Abonnement activé pour 30 jours !");
    } catch (e) {
      alert("❌ Erreur : " + e.message);
    } finally { setLoadingAbo(false); }
  };

  // ===== NAVIGATION =====
  const openForum = (forum) => { setActiveForum(forum); setRechercheTopic(""); setCurrentPage(1); setSortBy("date"); setPage("forum"); };
  const openTopic = (topic) => { setActiveTopic(topic); setPage("topic"); };
  const goHome = () => { setPage("home"); setActiveForum(null); setActiveTopic(null); setRecherche(""); };
  const goForum = () => { setPage("forum"); setActiveTopic(null); };
  const shortAddr = (addr) => addr ? `${addr.slice(0,6)}...${addr.slice(-4)}` : "";
  const prixEnETH = prixETH ? parseFloat(ethers.formatEther(prixETH)).toFixed(6) : "...";

  // ===== FORUM ACTIONS =====
  const creerSalon = () => {
    if (!account) { alert("Connectez MetaMask !"); return; }
    if (!estAbonne) { alert("⚠️ Abonnement requis !"); return; }
    if (!newSalon.name.trim()) { alert("Donnez un nom !"); return; }
    const salon = { id: newSalon.name.toLowerCase().replace(/\s+/g, "-"), emoji: newSalon.emoji, name: newSalon.name, description: newSalon.description || "Nouveau salon", topics: [] };
    setForums([...forums, salon]);
    setShowNewSalon(false);
    setNewSalon({ emoji: "💬", name: "", description: "" });
  };

  const creerTopic = () => {
    if (!account) { alert("Connectez MetaMask !"); return; }
    if (!estAbonne) { alert("⚠️ Abonnement requis !"); return; }
    if (!newTopic.title.trim()) { alert("Donnez un titre !"); return; }
    const topic = { id: Date.now(), title: newTopic.title, content: newTopic.content, author: shortAddr(account), replies: [], date: new Date().toLocaleDateString("fr-FR") };
    const updatedForums = forums.map(f => f.id === activeForum.id ? { ...f, topics: [topic, ...f.topics] } : f);
    setForums(updatedForums);
    setActiveForum(updatedForums.find(f => f.id === activeForum.id));
    setShowNewTopic(false);
    setNewTopic({ title: "", content: "" });
  };

  const posterReponse = () => {
    if (!account) { alert("Connectez MetaMask !"); return; }
    if (!estAbonne) { alert("⚠️ Abonnement requis !"); return; }
    if (!newReply.trim()) { alert("Écrivez un message !"); return; }
    const reply = { id: Date.now(), author: shortAddr(account), content: newReply, date: new Date().toLocaleDateString("fr-FR") };
    const updatedTopic = { ...activeTopic, replies: [...activeTopic.replies, reply] };
    const updatedForums = forums.map(f => f.id === activeForum.id ? { ...f, topics: f.topics.map(t => t.id === activeTopic.id ? updatedTopic : t) } : f);
    setForums(updatedForums);
    setActiveForum(updatedForums.find(f => f.id === activeForum.id));
    setActiveTopic(updatedTopic);
    setNewReply("");
  };

  const joursRestants = expiration ? Math.max(0, Math.ceil((expiration - new Date()) / (1000 * 60 * 60 * 24))) : 0;

  const inputStyle = {
    display: "block", width: "100%", padding: "10px 14px", borderRadius: 8,
    border: "1.5px solid #30363d", background: dark ? "#0d1117" : "#f8f9ff",
    color: dark ? "#e6edf3" : "#1a1a2e", fontSize: 15, marginBottom: 16, marginTop: 6,
    boxSizing: "border-box", fontFamily: "inherit"
  };

  // Topics filtrés + triés + paginés
  const topicsBase = activeForum?.topics.filter(t =>
    t.title.toLowerCase().includes(rechercheTopic.toLowerCase()) ||
    t.author.toLowerCase().includes(rechercheTopic.toLowerCase())
  ) || [];
  const topicsSorted = sortTopics(topicsBase, activeForum?.id);
  const totalPages = Math.ceil(topicsSorted.length / TOPICS_PAR_PAGE);
  const topicsPaginated = topicsSorted.slice((currentPage - 1) * TOPICS_PAR_PAGE, currentPage * TOPICS_PAR_PAGE);
  const forumsFiltered = forums.filter(f =>
    f.name.toLowerCase().includes(recherche.toLowerCase()) ||
    f.description.toLowerCase().includes(recherche.toLowerCase())
  );

  return (
    <div>
      {/* HEADER */}
      <header className="header">
        <div className="logo" onClick={goHome} style={{ cursor: "pointer" }}>Free<span>Zone</span></div>
        <div className="header-actions">
          <button className="btn btn-ghost" onClick={() => setDark(!dark)}>{dark ? "☀️" : "🌙"}</button>
          <button className="btn btn-ghost" onClick={() => setShowTranslate(!showTranslate)}>🌐</button>
          {account && (
            <>
              <button className="btn btn-ghost" onClick={() => setPage("messages")}
                style={{ position: "relative", fontSize: 13 }}>
                📩 Messages
                {unreadCount > 0 && (
                  <span style={{ position: "absolute", top: -4, right: -4, background: "#ef4444", color: "white", borderRadius: "50%", width: 18, height: 18, fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>
                    {unreadCount}
                  </span>
                )}
              </button>
              <button className="btn btn-ghost" onClick={() => setPage("profil")} style={{ fontSize: 13 }}>👤 Profil</button>
            </>
          )}
          {account ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span className="wallet-addr">🦊 {shortAddr(account)}</span>
              {estAbonne ? (
                <span className="badge-abonne">✅ Abonné</span>
              ) : (
                <button className="btn btn-primary" onClick={sAbonner} style={{ fontSize: 13, padding: "6px 14px" }} disabled={loadingAbo}>
                  {loadingAbo ? <><span className="spinner"/>Transaction...</> : `🔓 S'abonner ~${prixEnETH} ETH`}
                </button>
              )}
            </div>
          ) : (
            <button className="btn btn-wallet" onClick={connectWallet}>🦊 Connecter</button>
          )}
        </div>
      </header>

      {/* TRADUCTION */}
      {showTranslate && (
        <div className="translate-panel">
          <p>🌐 Choisir une langue :</p>
          <div id="google_translate_element"></div>
          <p style={{ marginTop: 8, fontSize: 12, opacity: 0.5 }}>Powered by Google Translate</p>
        </div>
      )}

      {/* BANNIÈRE ABONNEMENT */}
      {account && !estAbonne && !["profil","messages","conversation"].includes(page) && (
        <div style={{ background: "linear-gradient(90deg, #f59e0b22, #6366f122)", border: "1.5px solid #f59e0b", borderRadius: 12, margin: "16px auto", maxWidth: 860, padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <p style={{ margin: 0, fontSize: 14 }}>⚠️ <strong>Vous n'êtes pas abonné.</strong> Abonnez-vous pour 2€/mois en ETH.</p>
          <button className="btn btn-primary" onClick={sAbonner} disabled={loadingAbo} style={{ fontSize: 13, padding: "8px 20px" }}>
            {loadingAbo ? <><span className="spinner"/>Transaction...</> : `🔓 S'abonner — ~${prixEnETH} ETH (2€) / 30 jours`}
          </button>
        </div>
      )}

      {/* ========== PAGE MESSAGES ========== */}
      {page === "messages" && account && (
        <div className="forum-page">
          <button className="back-btn" onClick={goHome}>← Retour à l'accueil</button>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <h2 style={{ fontSize: 22 }}>📩 Messagerie chiffrée</h2>
            <button className="btn btn-primary" onClick={() => setShowNewConversation(true)}>✉️ Nouveau message</button>
          </div>
          <div style={{ background: "#6366f111", border: "1.5px solid #6366f133", borderRadius: 10, padding: "10px 16px", marginBottom: 20, fontSize: 13 }}>
            🔒 Messages chiffrés localement — Stockage IPFS/on-chain à venir
          </div>
          {messages.length === 0 ? (
            <div className="no-results

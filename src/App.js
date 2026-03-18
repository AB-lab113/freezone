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
      { id: 1, title: "Bienvenue sur Zone Free ! Présentez-vous 👋", author: "Admin", replies: [{ id:1, author:"0xA1B2...C3D4", content:"Bonjour tout le monde !", date:"01/03/2026" },{ id:2, author:"0xE5F6...G7H8", content:"Ravi d'être ici !", date:"01/03/2026" }], date: "01/03/2026" },
      { id: 2, title: "Les règles de la communauté Zone free", author: "Admin", replies: [], date: "01/03/2026" },
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
    const saved = localStorage.getItem("zonefree_dark");
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [account, setAccount] = useState(null);
  const [estAbonne, setEstAbonne] = useState(false);
  const [loadingAbo, setLoadingAbo] = useState(false);
  const [expiration, setExpiration] = useState(null);
  const [prixETH, setPrixETH] = useState(null);
  const [page, setPage] = useState("home");
  const [forums, setForums] = useState(() => {
    const saved = localStorage.getItem("zonefree_forums");
    return saved ? JSON.parse(saved) : FORUMS_INIT;
  });
  const [activeForum, setActiveForum] = useState(null);
  const [activeTopic, setActiveTopic] = useState(null);
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
    const saved = localStorage.getItem("zonefree_likes");
    return saved ? JSON.parse(saved) : {};
  });
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem("zonefree_messages");
    return saved ? JSON.parse(saved) : [];
  });
  const [activeConversation, setActiveConversation] = useState(null);
  const [newMessage, setNewMessage] = useState("");
  const [newMessageTo, setNewMessageTo] = useState("");
  const [showNewConversation, setShowNewConversation] = useState(false);

  useEffect(() => { localStorage.setItem("zonefree_forums", JSON.stringify(forums)); }, [forums]);
  useEffect(() => {
    localStorage.setItem("zonefree_dark", JSON.stringify(dark));
    document.body.className = dark ? "dark" : "light";
  }, [dark]);
  useEffect(() => { localStorage.setItem("zonefree_likes", JSON.stringify(likes)); }, [likes]);
  useEffect(() => { localStorage.setItem("zonefree_messages", JSON.stringify(messages)); }, [messages]);

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
    const network = await provider.getNetwork();
    if (network.chainId !== 1n) {
      alert("⚠️ Veuillez passer sur le réseau Ethereum Mainnet dans MetaMask !");
      return;
    }
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
        <div className="logo" onClick={goHome} style={{ cursor: "pointer" }}>Zone<span>Free</span></div>
              <div className="header-actions">
          <button className="btn btn-ghost" onClick={() => setDark(!dark)}>{dark ? "☀️" : "🌙"}</button>
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
            <div className="no-results" style={{ textAlign: "center", padding: 40 }}>
" style={{ textAlign: "center", padding: 40 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
            <p style={{ opacity: 0.5 }}>Aucun message. Démarrez une conversation !</p>
          </div>
          ) : (
            <div className="messages-list">
              {messages.map(conv => {
                const other = conv.participants.find(p => p !== shortAddr(account)) || conv.participants[0];
                const lastMsg = conv.msgs[conv.msgs.length - 1];
                const unread = conv.msgs.filter(m => m.to === shortAddr(account) && !m.read).length;
                return (
                  <div key={conv.id} className="conversation-item" onClick={() => ouvrirConversation(conv)}>
                    <div className="conv-avatar">🦊</div>
                    <div className="conv-info">
                      <div className="conv-addr">{other}</div>
                      <div className="conv-preview">{lastMsg ? lastMsg.content : "Démarrer la conversation..."}</div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                      {lastMsg && <div className="conv-time">{lastMsg.date}</div>}
                      {unread > 0 && <div className="unread-badge">{unread}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* MODAL NOUVEAU MESSAGE */}
          {showNewConversation && (
            <div style={{ position: "fixed", inset: 0, background: "#0008", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}>
              <div style={{ background: dark ? "#161b22" : "white", borderRadius: 16, padding: 32, width: 420, border: "1.5px solid #6366f1" }}>
                <h2 style={{ marginBottom: 24, color: "#6366f1" }}>✉️ Nouveau message</h2>
                <label style={{ fontSize: 13, opacity: 0.7 }}>Adresse du destinataire</label>
                <input value={newMessageTo} onChange={e => setNewMessageTo(e.target.value)}
                  style={inputStyle} placeholder="0x... ou 0xABCD...1234" />
                <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                  <button className="btn btn-primary" onClick={demarrerConversation} style={{ flex: 1 }}>✅ Démarrer</button>
                  <button className="btn btn-ghost" onClick={() => setShowNewConversation(false)} style={{ flex: 1 }}>Annuler</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========== PAGE CONVERSATION ========== */}
      {page === "conversation" && activeConversation && account && (
        <div className="forum-page" style={{ padding: 0 }}>
          <div style={{ padding: "16px 24px", borderBottom: "1.5px solid #30363d", display: "flex", alignItems: "center", gap: 16 }}>
            <button className="back-btn" style={{ margin: 0 }} onClick={() => setPage("messages")}>←</button>
            <div className="conv-avatar" style={{ width: 36, height: 36, fontSize: 14 }}>🦊</div>
            <div style={{ fontWeight: 700 }}>
              {activeConversation.participants.find(p => p !== shortAddr(account))}
            </div>
            <div style={{ marginLeft: "auto", fontSize: 12, opacity: 0.5 }}>🔒 Chiffré</div>
          </div>

          <div className="chat-container" style={{ minHeight: 400, maxHeight: 500, overflowY: "auto" }}>
            {activeConversation.msgs.length === 0 && (
              <div style={{ textAlign: "center", opacity: 0.4, marginTop: 40 }}>Aucun message — Dites bonjour ! 👋</div>
            )}
            {activeConversation.msgs.map(m => {
              const isSent = m.from === shortAddr(account);
              return (
                <div key={m.id} className={`bubble-wrapper ${isSent ? "sent" : "received"}`}>
                  <div className={`bubble ${isSent ? "sent" : "received"}`}>{m.content}</div>
                  <div className="bubble-time">{m.date}</div>
                </div>
              );
            })}
          </div>

          <div className="message-input-bar">
            {!estAbonne ? (
              <p style={{ color: "#f59e0b", fontSize: 14, margin: 0 }}>⚠️ Abonnement requis pour envoyer</p>
            ) : (
              <>
                <textarea className="message-input" rows={1} value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); envoyerMessage(); }}}
                  placeholder="Écrire un message... (Entrée pour envoyer)" />
                <button className="send-btn" onClick={envoyerMessage} disabled={!newMessage.trim()}>➤</button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ========== PAGE PROFIL ========== */}
      {page === "profil" && account && (
        <div className="forum-page">
          <button className="back-btn" onClick={goHome}>← Retour à l'accueil</button>
          <div style={{ borderRadius: 20, padding: 36, marginBottom: 24, background: dark ? "#161b22" : "#ffffff", border: "1.5px solid #6366f1", textAlign: "center" }}>
            <div style={{ fontSize: 64, marginBottom: 12 }}>🦊</div>
            <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{shortAddr(account)}</div>
            <div style={{ fontSize: 13, opacity: 0.5, marginBottom: 24, fontFamily: "monospace" }}>{account}</div>
            {estAbonne ? (
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#22c55e22", border: "1.5px solid #22c55e", borderRadius: 20, padding: "8px 20px" }}>
                <span>✅</span><span style={{ color: "#22c55e", fontWeight: 700 }}>Abonné actif</span>
              </div>
            ) : (
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#f59e0b22", border: "1.5px solid #f59e0b", borderRadius: 20, padding: "8px 20px" }}>
                <span>🔒</span><span style={{ color: "#f59e0b", fontWeight: 700 }}>Non abonné</span>
              </div>
            )}
          </div>

          <div style={{ borderRadius: 16, padding: 20, marginBottom: 24, background: dark ? "#161b22" : "#ffffff", border: "1.5px solid #6366f1", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 12, opacity: 0.5, marginBottom: 4 }}>🔗 PRIX ABONNEMENT (Chainlink)</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#6366f1" }}>~{prixEnETH} ETH</div>
              <div style={{ fontSize: 13, opacity: 0.6 }}>= 2,00 EUR / 30 jours</div>
            </div>
            <div style={{ fontSize: 40 }}>⛓️</div>
          </div>

          <div style={{ borderRadius: 16, padding: 28, marginBottom: 24, background: dark ? "#161b22" : "#ffffff", border: "1.5px solid", borderColor: dark ? "#30363d" : "#e2e8f0" }}>
            <h3 style={{ marginBottom: 20 }}>📋 Détails abonnement</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {[
                { label: "STATUT", value: estAbonne ? "✅ Actif" : "❌ Inactif", color: estAbonne ? "#22c55e" : "#f59e0b" },
                { label: "JOURS RESTANTS", value: estAbonne ? `${joursRestants} jours` : "—", color: joursRestants > 7 ? "#22c55e" : "#f59e0b" },
                { label: "EXPIRATION", value: expiration ? expiration.toLocaleDateString("fr-FR") : "—", color: null },
                { label: "PRIX", value: `~${prixEnETH} ETH (2€)`, color: "#6366f1" },
              ].map((item, i) => (
                <div key={i} style={{ borderRadius: 12, padding: 20, background: dark ? "#0d1117" : "#f8f9ff", border: "1.5px solid", borderColor: dark ? "#30363d" : "#e2e8f0" }}>
                  <div style={{ fontSize: 12, opacity: 0.5, marginBottom: 6 }}>{item.label}</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: item.color || "inherit" }}>{item.value}</div>
                </div>
              ))}
            </div>
            {estAbonne && (
              <div style={{ marginTop: 24 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, opacity: 0.6, marginBottom: 8 }}>
                  <span>Progression</span><span>{joursRestants} / 30 jours restants</span>
                </div>
                <div style={{ background: dark ? "#0d1117" : "#e2e8f0", borderRadius: 8, height: 10, overflow: "hidden" }}>
                  <div style={{ height: "100%", borderRadius: 8, width: `${(joursRestants / 30) * 100}%`, background: joursRestants > 7 ? "linear-gradient(90deg, #6366f1, #22c55e)" : "linear-gradient(90deg, #f59e0b, #ef4444)", transition: "width 0.5s ease" }} />
                </div>
              </div>
            )}
          </div>

          <div style={{ borderRadius: 16, padding: 28, marginBottom: 24, background: dark ? "#161b22" : "#ffffff", border: "1.5px solid", borderColor: dark ? "#30363d" : "#e2e8f0" }}>
            <h3 style={{ marginBottom: 20 }}>📊 Mes statistiques</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
              {[
                { label: "Topics créés", value: forums.reduce((a, f) => a + f.topics.filter(t => t.author === shortAddr(account)).length, 0), icon: "📝" },
                { label: "Réponses", value: forums.reduce((a, f) => a + f.topics.reduce((b, t) => b + t.replies.filter(r => r.author === shortAddr(account)).length, 0), 0), icon: "💬" },
                { label: "Messages", value: messages.reduce((a, c) => a + c.msgs.filter(m => m.from === shortAddr(account)).length, 0), icon: "📩" },
              ].map((stat, i) => (
                <div key={i} style={{ borderRadius: 12, padding: 20, textAlign: "center", background: dark ? "#0d1117" : "#f8f9ff", border: "1.5px solid", borderColor: dark ? "#30363d" : "#e2e8f0" }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>{stat.icon}</div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: "#6366f1" }}>{stat.value}</div>
                  <div style={{ fontSize: 12, opacity: 0.6, marginTop: 4 }}>{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          {!estAbonne && (
            <div style={{ textAlign: "center" }}>
              <button className="btn btn-primary" onClick={sAbonner} disabled={loadingAbo} style={{ fontSize: 16, padding: "14px 36px" }}>
                {loadingAbo ? "⏳..." : `🔓 S'abonner — ~${prixEnETH} ETH (2€/mois)`}
              </button>
            </div>
          )}
          <div style={{ textAlign: "center", marginTop: 24, opacity: 0.5, fontSize: 13 }}>
            <a href={`https://etherscan.io/address/${account}`} target="_blank" rel="noreferrer" style={{ color: "#6366f1" }}>Voir sur Etherscan ↗</a>
          </div>
        </div>
      )}

      {/* ========== PAGE HOME ========== */}
      {page === "home" && (
        <>
          <div className="hero">
            <div className="badge">🔓 Décentralisé • Libre • Privé</div>
            <h1>Bienvenue sur <span>Zone Free</span></h1>
            <p>Le forum décentralisé où la parole est libre. Abonnement sécurisé par Ethereum.</p>
          </div>
          <div className="search-container">
            <span className="search-icon">🔍</span>
            <input className="search-input" placeholder="Rechercher un salon..."
              value={recherche} onChange={e => setRecherche(e.target.value)} />
            {recherche && <button className="search-clear" onClick={() => setRecherche("")}>✕</button>}
          </div>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <button className="btn btn-primary" onClick={() => setShowNewSalon(true)} style={{ fontSize: 16, padding: "12px 28px" }}>➕ Créer un nouveau salon</button>
          </div>
          {forumsFiltered.length === 0 ? (
            <div className="no-results"><span>🔍</span><p>Aucun salon trouvé pour "<strong>{recherche}</strong>"</p></div>
          ) : (
            <div className="forums-grid">
              {forumsFiltered.map(f => (
                <div key={f.id} className="forum-card" onClick={() => openForum(f)}>
                  <div className="forum-emoji">{f.emoji}</div>
                  <div className="forum-name">{f.name}</div>
                  <div className="forum-desc">{f.description}</div>
                  <div className="forum-meta">
                    <span>📝 {f.topics.length} topics</span>
                    <span>💬 {f.topics.reduce((a, t) => a + t.replies.length, 0)} réponses</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="footer">
            Zone Free © 2026 —{" "}
            <a href={`https://sepolia.etherscan.io/address/${CONTRACT_ADDRESS}`} target="_blank" rel="noreferrer" style={{ color: "#6366f1" }}>Contrat Etherscan ↗</a>
          </div>
        </>
      )}

      {/* ========== PAGE FORUM ========== */}
      {page === "forum" && activeForum && (
        <div className="forum-page">
          <button className="back-btn" onClick={goHome}>← Retour aux forums</button>
          <div className="forum-header">
            <h2>{activeForum.emoji} {activeForum.name}</h2>
            <p style={{ opacity: 0.6, marginTop: 6 }}>{activeForum.description}</p>
          </div>
          <button className="new-topic-btn" onClick={() => setShowNewTopic(true)}>✏️ Nouveau topic</button>

          <div className="search-container" style={{ margin: "0 0 16px" }}>
            <span className="search-icon">🔍</span>
            <input className="search-input" placeholder="Rechercher un topic..."
              value={rechercheTopic} onChange={e => { setRechercheTopic(e.target.value); setCurrentPage(1); }} />
            {rechercheTopic && <button className="search-clear" onClick={() => setRechercheTopic("")}>✕</button>}
          </div>

          <div className="sort-bar">
            <span style={{ fontSize: 13, opacity: 0.6 }}>Trier par :</span>
            {[["date","🕐 Plus récents"],["popular","🔥 Populaires"],["replies","💬 Plus de réponses"]].map(([val, label]) => (
              <button key={val} className={`sort-btn ${sortBy === val ? "active" : ""}`}
                onClick={() => { setSortBy(val); setCurrentPage(1); }}>{label}</button>
            ))}
          </div>

          {topicsPaginated.length === 0 ? (
            <div className="no-results"><span>🔍</span><p>Aucun topic trouvé.</p></div>
          ) : (
            topicsPaginated.map(t => {
              const likeKey = `${activeForum.id}_${t.id}`;
              const { count, hasLiked } = getLike(likeKey);
              return (
                <div key={t.id} className="topic-card" onClick={() => openTopic(t)}>
                  <div style={{ flex: 1 }}>
                    <div className="topic-title">{t.title}</div>
                    <div className="topic-meta">par {t.author} · {t.date}</div>
                    <div style={{ marginTop: 8 }} onClick={e => e.stopPropagation()}>
                      <button className={`like-btn ${hasLiked ? "liked" : ""}`}
                        onClick={() => toggleLike(likeKey)}>
                        ❤️ {count > 0 ? count : "J'aime"}
                      </button>
                    </div>
                  </div>
                  <div className="topic-replies">💬 {t.replies.length}</div>
                </div>
              );
            })
          )}

          {totalPages > 1 && (
            <div className="pagination">
              <button className="page-btn" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>‹</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                <button key={n} className={`page-btn ${currentPage === n ? "active" : ""}`}
                  onClick={() => setCurrentPage(n)}>{n}</button>
              ))}
              <button className="page-btn" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>›</button>
            </div>
          )}
        </div>
      )}

      {/* ========== PAGE TOPIC ========== */}
      {page === "topic" && activeTopic && (
        <div className="forum-page">
          <button className="back-btn" onClick={goForum}>← Retour à {activeForum?.emoji} {activeForum?.name}</button>
          <div style={{ borderRadius: 14, padding: 28, marginBottom: 24, background: dark ? "#161b22" : "#ffffff", border: "1.5px solid #6366f1" }}>
            <h2 style={{ fontSize: 22, marginBottom: 12 }}>{activeTopic.title}</h2>
            <p style={{ opacity: 0.5, fontSize: 13, marginBottom: 16 }}>par <strong>{activeTopic.author}</strong> · {activeTopic.date}</p>
            {activeTopic.content && <p style={{ fontSize: 15, lineHeight: 1.7 }}>{activeTopic.content}</p>}
            <div style={{ marginTop: 16 }}>
              <button className={`like-btn ${getLike(`${activeForum?.id}_${activeTopic.id}`).hasLiked ? "liked" : ""}`}
                onClick={() => toggleLike(`${activeForum?.id}_${activeTopic.id}`)}>
                ❤️ {getLike(`${activeForum?.id}_${activeTopic.id}`).count || "J'aime"}
              </button>
            </div>
          </div>

          <h3 style={{ marginBottom: 16, opacity: 0.7 }}>💬 {activeTopic.replies.length} réponse{activeTopic.replies.length !== 1 ? "s" : ""}</h3>
          {activeTopic.replies.map(r => (
            <div key={r.id} style={{ borderRadius: 12, padding: "16px 20px", marginBottom: 12, background: dark ? "#161b22" : "#ffffff", border: "1.5px solid", borderColor: dark ? "#30363d" : "#e2e8f0" }}>
              <p style={{ fontSize: 13, opacity: 0.5, marginBottom: 8 }}><strong>{r.author}</strong> · {r.date}</p>
              <p style={{ fontSize: 15, lineHeight: 1.6 }}>{r.content}</p>
              <button className={`like-btn ${getLike(`reply_${r.id}`).hasLiked ? "liked" : ""}`}
                style={{ marginTop: 8 }} onClick={() => toggleLike(`reply_${r.id}`)}>
                ❤️ {getLike(`reply_${r.id}`).count || "J'aime"}
              </button>
            </div>
          ))}

          <div style={{ borderRadius: 14, padding: 24, marginTop: 24, background: dark ? "#161b22" : "#ffffff", border: "1.5px solid", borderColor: dark ? "#30363d" : "#e2e8f0" }}>
            <h3 style={{ marginBottom: 16 }}>✍️ Votre réponse</h3>
            {!account && <p style={{ opacity: 0.6, marginBottom: 12, fontSize: 14 }}>⚠️ Connectez MetaMask pour répondre</p>}
            {account && !estAbonne && <p style={{ color: "#f59e0b", marginBottom: 12, fontSize: 14 }}>⚠️ Abonnez-vous pour répondre</p>}
            <textarea value={newReply} onChange={e => setNewReply(e.target.value)}
              placeholder="Écrivez votre réponse..." rows={4}
              style={{ ...inputStyle, resize: "vertical" }} disabled={!estAbonne} />
            <button className="btn btn-primary" onClick={posterReponse} style={{ padding: "12px 28px" }} disabled={!estAbonne || !account}>
              📨 Poster la réponse
            </button>
          </div>
        </div>
      )}

      {/* MODAL NOUVEAU SALON */}
      {showNewSalon && (
        <div style={{ position: "fixed", inset: 0, background: "#0008", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}>
          <div style={{ background: dark ? "#161b22" : "white", borderRadius: 16, padding: 32, width: 420, border: "1.5px solid #6366f1" }}>
            <h2 style={{ marginBottom: 24, color: "#6366f1" }}>➕ Nouveau salon</h2>
            <label style={{ fontSize: 13, opacity: 0.7 }}>Emoji</label>
            <input value={newSalon.emoji} onChange={e => setNewSalon({...newSalon, emoji: e.target.value})} style={inputStyle} placeholder="💬" />
            <label style={{ fontSize: 13, opacity: 0.7 }}>Nom *</label>
            <input value={newSalon.name} onChange={e => setNewSalon({...newSalon, name: e.target.value})} style={inputStyle} placeholder="Ex: Sciences, Art..." />
            <label style={{ fontSize: 13, opacity: 0.7 }}>Description</label>
            <input value={newSalon.description} onChange={e => setNewSalon({...newSalon, description: e.target.value})} style={inputStyle} placeholder="Description courte" />
            <div style={{ display: "flex", gap: 12 }}>
              <button className="btn btn-primary" onClick={creerSalon} style={{ flex: 1 }}>✅ Créer</button>
              <button className="btn btn-ghost" onClick={() => setShowNewSalon(false)} style={{ flex: 1 }}>Annuler</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL NOUVEAU TOPIC */}
      {showNewTopic && (
        <div style={{ position: "fixed", inset: 0, background: "#0008", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}>
          <div style={{ background: dark ? "#161b22" : "white", borderRadius: 16, padding: 32, width: 500, border: "1.5px solid #6366f1" }}>
            <h2 style={{ marginBottom: 24, color: "#6366f1" }}>✏️ Nouveau topic</h2>
            <label style={{ fontSize: 13, opacity: 0.7 }}>Titre *</label>
            <input value={newTopic.title} onChange={e => setNewTopic({...newTopic, title: e.target.value})} style={inputStyle} placeholder="Titre..." />
            <label style={{ fontSize: 13, opacity: 0.7 }}>Contenu</label>
            <textarea value={newTopic.content} onChange={e => setNewTopic({...newTopic, content: e.target.value})} style={{ ...inputStyle, resize: "vertical" }} rows={4} placeholder="Développez..." />
            <div style={{ display: "flex", gap: 12 }}>
              <button className="btn btn-primary" onClick={creerTopic} style={{ flex: 1 }}>📝 Publier</button>
              <button className="btn btn-ghost" onClick={() => setShowNewTopic(false)} style={{ flex: 1 }}>Annuler</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;

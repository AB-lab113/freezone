import './App.css';
import { useState, useEffect } from "react";
import { ethers } from "ethers";
import ForumAboABI from "./ForumAbo.json";

const CONTRACT_ADDRESS = "0x9d1D9ccB580143a52992A6a8056b454c6648D3Fe";

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

  useEffect(() => {
    localStorage.setItem("freezone_forums", JSON.stringify(forums));
  }, [forums]);

  useEffect(() => {
    localStorage.setItem("freezone_dark", JSON.stringify(dark));
    document.body.className = dark ? "dark" : "light";
  }, [dark]);

  const verifierAbonnement = async (addr, prov) => {
    try {
      const provider = prov || new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(CONTRACT_ADDRESS, ForumAboABI, provider);
      const abonne = await contract.estAbonne(addr);
      setEstAbonne(abonne);
      // Récupérer la date d'expiration
      const exp = await contract.abonnements(addr);
      if (exp > 0) {
        const date = new Date(Number(exp) * 1000);
        setExpiration(date);
      }
    } catch (e) { console.error("Erreur vérif abonnement:", e); }
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
      const tx = await contract.sAbonner({ value: ethers.parseEther("0.01") });
      await tx.wait();
      setEstAbonne(true);
      await verifierAbonnement(account);
      alert("✅ Abonnement activé pour 30 jours !");
    } catch (e) {
      alert("❌ Erreur : " + e.message);
    } finally {
      setLoadingAbo(false);
    }
  };

  const openForum = (forum) => { setActiveForum(forum); setPage("forum"); };
  const openTopic = (topic) => { setActiveTopic(topic); setPage("topic"); };
  const goHome = () => { setPage("home"); setActiveForum(null); setActiveTopic(null); };
  const goForum = () => { setPage("forum"); setActiveTopic(null); };
  const shortAddr = (addr) => addr ? `${addr.slice(0,6)}...${addr.slice(-4)}` : "";

  const creerSalon = () => {
    if (!account) { alert("Connectez MetaMask pour créer un salon !"); return; }
    if (!estAbonne) { alert("⚠️ Vous devez être abonné pour créer un salon !"); return; }
    if (!newSalon.name.trim()) { alert("Donnez un nom au salon !"); return; }
    const salon = {
      id: newSalon.name.toLowerCase().replace(/\s+/g, "-"),
      emoji: newSalon.emoji, name: newSalon.name,
      description: newSalon.description || "Nouveau salon",
      topics: []
    };
    setForums([...forums, salon]);
    setShowNewSalon(false);
    setNewSalon({ emoji: "💬", name: "", description: "" });
  };

  const creerTopic = () => {
    if (!account) { alert("Connectez MetaMask pour poster !"); return; }
    if (!estAbonne) { alert("⚠️ Vous devez être abonné pour poster !"); return; }
    if (!newTopic.title.trim()) { alert("Donnez un titre au topic !"); return; }
    const topic = {
      id: Date.now(), title: newTopic.title, content: newTopic.content,
      author: shortAddr(account), replies: [],
      date: new Date().toLocaleDateString("fr-FR")
    };
    const updatedForums = forums.map(f =>
      f.id === activeForum.id ? { ...f, topics: [topic, ...f.topics] } : f
    );
    setForums(updatedForums);
    setActiveForum(updatedForums.find(f => f.id === activeForum.id));
    setShowNewTopic(false);
    setNewTopic({ title: "", content: "" });
  };

  const posterReponse = () => {
    if (!account) { alert("Connectez MetaMask pour répondre !"); return; }
    if (!estAbonne) { alert("⚠️ Vous devez être abonné pour répondre !"); return; }
    if (!newReply.trim()) { alert("Écrivez un message !"); return; }
    const reply = {
      id: Date.now(), author: shortAddr(account), content: newReply,
      date: new Date().toLocaleDateString("fr-FR")
    };
    const updatedTopic = { ...activeTopic, replies: [...activeTopic.replies, reply] };
    const updatedForums = forums.map(f =>
      f.id === activeForum.id
        ? { ...f, topics: f.topics.map(t => t.id === activeTopic.id ? updatedTopic : t) }
        : f
    );
    setForums(updatedForums);
    setActiveForum(updatedForums.find(f => f.id === activeForum.id));
    setActiveTopic(updatedTopic);
    setNewReply("");
  };

  // Jours restants avant expiration
  const joursRestants = expiration
    ? Math.max(0, Math.ceil((expiration - new Date()) / (1000 * 60 * 60 * 24)))
    : 0;

  const inputStyle = {
    display: "block", width: "100%", padding: "10px 14px",
    borderRadius: 8, border: "1.5px solid #30363d",
    background: dark ? "#0d1117" : "#f8f9ff",
    color: dark ? "#e6edf3" : "#1a1a2e",
    fontSize: 15, marginBottom: 16, marginTop: 6,
    boxSizing: "border-box", fontFamily: "inherit"
  };

  return (
    <div>
      {/* HEADER */}
      <header className="header">
        <div className="logo" onClick={goHome} style={{ cursor: "pointer" }}>Free<span>Zone</span></div>
        <div className="header-actions">
          <button className="btn btn-ghost" onClick={() => setDark(!dark)}>{dark ? "☀️" : "🌙"}</button>
          <button className="btn btn-ghost" onClick={() => setShowTranslate(!showTranslate)}>🌐</button>
          {account && (
            <button className="btn btn-ghost" onClick={() => setPage("profil")}
              style={{ fontSize: 13 }}>👤 Profil</button>
          )}
          {account ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span className="wallet-addr">🦊 {shortAddr(account)}</span>
              {estAbonne ? (
                <span style={{
                  background: "#22c55e", color: "white", borderRadius: 20,
                  padding: "4px 12px", fontSize: 13, fontWeight: 700
                }}>✅ Abonné</span>
              ) : (
                <button className="btn btn-primary" onClick={sAbonner}
                  style={{ fontSize: 13, padding: "6px 14px" }}
                  disabled={loadingAbo}>
                  {loadingAbo ? "⏳ Transaction..." : "🔓 S'abonner 0.01 ETH"}
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
      {account && !estAbonne && page !== "profil" && (
        <div style={{
          background: "linear-gradient(90deg, #f59e0b22, #6366f122)",
          border: "1.5px solid #f59e0b", borderRadius: 12,
          margin: "16px auto", maxWidth: 860,
          padding: "14px 24px", display: "flex",
          alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12
        }}>
          <p style={{ margin: 0, fontSize: 14 }}>
            ⚠️ <strong>Vous n'êtes pas abonné.</strong> Abonnez-vous pour créer des salons, poster et répondre.
          </p>
          <button className="btn btn-primary" onClick={sAbonner}
            disabled={loadingAbo} style={{ fontSize: 13, padding: "8px 20px" }}>
            {loadingAbo ? "⏳ Transaction..." : "🔓 S'abonner — 0.01 ETH / 30 jours"}
          </button>
        </div>
      )}

      {/* ========== PAGE PROFIL ========== */}
      {page === "profil" && account && (
        <div className="forum-page">
          <button className="back-btn" onClick={goHome}>← Retour à l'accueil</button>

          {/* Carte profil principale */}
          <div style={{
            borderRadius: 20, padding: 36, marginBottom: 24,
            background: dark ? "#161b22" : "#ffffff",
            border: "1.5px solid #6366f1",
            textAlign: "center"
          }}>
            <div style={{ fontSize: 64, marginBottom: 12 }}>🦊</div>
            <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{shortAddr(account)}</div>
            <div style={{ fontSize: 13, opacity: 0.5, marginBottom: 24, fontFamily: "monospace" }}>{account}</div>

            {estAbonne ? (
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                background: "#22c55e22", border: "1.5px solid #22c55e",
                borderRadius: 20, padding: "8px 20px", marginBottom: 20
              }}>
                <span style={{ fontSize: 18 }}>✅</span>
                <span style={{ color: "#22c55e", fontWeight: 700, fontSize: 16 }}>Abonné actif</span>
              </div>
            ) : (
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                background: "#f59e0b22", border: "1.5px solid #f59e0b",
                borderRadius: 20, padding: "8px 20px", marginBottom: 20
              }}>
                <span style={{ fontSize: 18 }}>🔒</span>
                <span style={{ color: "#f59e0b", fontWeight: 700, fontSize: 16 }}>Non abonné</span>
              </div>
            )}
          </div>

          {/* Infos abonnement */}
          <div style={{
            borderRadius: 16, padding: 28, marginBottom: 24,
            background: dark ? "#161b22" : "#ffffff",
            border: "1.5px solid", borderColor: dark ? "#30363d" : "#e2e8f0"
          }}>
            <h3 style={{ marginBottom: 20, fontSize: 18 }}>📋 Détails de l'abonnement</h3>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div style={{
                borderRadius: 12, padding: 20,
                background: dark ? "#0d1117" : "#f8f9ff",
                border: "1.5px solid", borderColor: dark ? "#30363d" : "#e2e8f0"
              }}>
                <div style={{ fontSize: 12, opacity: 0.5, marginBottom: 6 }}>STATUT</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: estAbonne ? "#22c55e" : "#f59e0b" }}>
                  {estAbonne ? "✅ Actif" : "❌ Inactif"}
                </div>
              </div>

              <div style={{
                borderRadius: 12, padding: 20,
                background: dark ? "#0d1117" : "#f8f9ff",
                border: "1.5px solid", borderColor: dark ? "#30363d" : "#e2e8f0"
              }}>
                <div style={{ fontSize: 12, opacity: 0.5, marginBottom: 6 }}>JOURS RESTANTS</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: joursRestants > 7 ? "#22c55e" : "#f59e0b" }}>
                  {estAbonne ? `${joursRestants} jours` : "—"}
                </div>
              </div>

              <div style={{
                borderRadius: 12, padding: 20,
                background: dark ? "#0d1117" : "#f8f9ff",
                border: "1.5px solid", borderColor: dark ? "#30363d" : "#e2e8f0"
              }}>
                <div style={{ fontSize: 12, opacity: 0.5, marginBottom: 6 }}>EXPIRATION</div>
                <div style={{ fontSize: 15, fontWeight: 600 }}>
                  {expiration ? expiration.toLocaleDateString("fr-FR") : "—"}
                </div>
              </div>

              <div style={{
                borderRadius: 12, padding: 20,
                background: dark ? "#0d1117" : "#f8f9ff",
                border: "1.5px solid", borderColor: dark ? "#30363d" : "#e2e8f0"
              }}>
                <div style={{ fontSize: 12, opacity: 0.5, marginBottom: 6 }}>PRIX</div>
                <div style={{ fontSize: 15, fontWeight: 600 }}>0.01 ETH / 30 jours</div>
              </div>
            </div>

            {/* Barre de progression */}
            {estAbonne && (
              <div style={{ marginTop: 24 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, opacity: 0.6, marginBottom: 8 }}>
                  <span>Progression de l'abonnement</span>
                  <span>{joursRestants} / 30 jours restants</span>
                </div>
                <div style={{ background: dark ? "#0d1117" : "#e2e8f0", borderRadius: 8, height: 10, overflow: "hidden" }}>
                  <div style={{
                    height: "100%", borderRadius: 8,
                    width: `${(joursRestants / 30) * 100}%`,
                    background: joursRestants > 7
                      ? "linear-gradient(90deg, #6366f1, #22c55e)"
                      : "linear-gradient(90deg, #f59e0b, #ef4444)",
                    transition: "width 0.5s ease"
                  }} />
                </div>
              </div>
            )}
          </div>

          {/* Statistiques */}
          <div style={{
            borderRadius: 16, padding: 28, marginBottom: 24,
            background: dark ? "#161b22" : "#ffffff",
            border: "1.5px solid", borderColor: dark ? "#30363d" : "#e2e8f0"
          }}>
            <h3 style={{ marginBottom: 20, fontSize: 18 }}>📊 Mes statistiques</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
              {[
                { label: "Topics créés", value: forums.reduce((a, f) => a + f.topics.filter(t => t.author === shortAddr(account)).length, 0), icon: "📝" },
                { label: "Réponses postées", value: forums.reduce((a, f) => a + f.topics.reduce((b, t) => b + t.replies.filter(r => r.author === shortAddr(account)).length, 0), 0), icon: "💬" },
                { label: "Salons rejoints", value: forums.length, icon: "🏛️" },
              ].map((stat, i) => (
                <div key={i} style={{
                  borderRadius: 12, padding: 20, textAlign: "center",
                  background: dark ? "#0d1117" : "#f8f9ff",
                  border: "1.5px solid", borderColor: dark ? "#30363d" : "#e2e8f0"
                }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>{stat.icon}</div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: "#6366f1" }}>{stat.value}</div>
                  <div style={{ fontSize: 12, opacity: 0.6, marginTop: 4 }}>{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Bouton renouveler */}
          {estAbonne && joursRestants <= 7 && (
            <div style={{
              borderRadius: 16, padding: 24, marginBottom: 24,
              background: "#f59e0b11", border: "1.5px solid #f59e0b"
            }}>
              <p style={{ margin: 0, marginBottom: 12 }}>
                ⚠️ Votre abonnement expire dans <strong>{joursRestants} jours</strong>. Renouvelez maintenant !
              </p>
              <button className="btn btn-primary" onClick={sAbonner} disabled={loadingAbo}>
                {loadingAbo ? "⏳..." : "🔄 Renouveler — 0.01 ETH"}
              </button>
            </div>
          )}

          {!estAbonne && (
            <div style={{ textAlign: "center", marginTop: 8 }}>
              <button className="btn btn-primary" onClick={sAbonner} disabled={loadingAbo}
                style={{ fontSize: 16, padding: "14px 36px" }}>
                {loadingAbo ? "⏳ Transaction..." : "🔓 S'abonner maintenant — 0.01 ETH"}
              </button>
            </div>
          )}

          {/* Lien Etherscan */}
          <div style={{ textAlign: "center", marginTop: 24, opacity: 0.5, fontSize: 13 }}>
            <a href={`https://sepolia.etherscan.io/address/${account}`}
              target="_blank" rel="noreferrer" style={{ color: "#6366f1" }}>
              Voir sur Etherscan ↗
            </a>
          </div>
        </div>
      )}

      {/* PAGE HOME */}
      {page === "home" && (
        <>
          <div className="hero">
            <div className="badge">🔓 Décentralisé • Libre • Privé</div>
            <h1>Bienvenue sur <span>Free Zone</span></h1>
            <p>Le forum décentralisé où la parole est libre. Abonnement sécurisé par Ethereum.</p>
          </div>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <button className="btn btn-primary" onClick={() => setShowNewSalon(true)}
              style={{ fontSize: 16, padding: "12px 28px" }}>➕ Créer un nouveau salon</button>
          </div>
          <div className="forums-grid">
            {forums.map(f => (
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
          <div className="footer">
            Free Zone © 2026 —{" "}
            <a href={`https://sepolia.etherscan.io/address/${CONTRACT_ADDRESS}`}
              target="_blank" rel="noreferrer" style={{ color: "#6366f1" }}>Contrat Etherscan ↗</a>
          </div>
        </>
      )}

      {/* PAGE FORUM */}
      {page === "forum" && activeForum && (
        <div className="forum-page">
          <button className="back-btn" onClick={goHome}>← Retour aux forums</button>
          <div className="forum-header">
            <h2>{activeForum.emoji} {activeForum.name}</h2>
            <p style={{ opacity: 0.6, marginTop: 6 }}>{activeForum.description}</p>
          </div>
          <button className="new-topic-btn" onClick={() => setShowNewTopic(true)}>✏️ Nouveau topic</button>
          {activeForum.topics.length === 0 && (
            <p style={{ textAlign: "center", opacity: 0.5, marginTop: 40 }}>
              Aucun topic pour l'instant. Soyez le premier à poster !
            </p>
          )}
          {activeForum.topics.map(t => (
            <div key={t.id} className="topic-card" onClick={() => openTopic(t)}>
              <div>
                <div className="topic-title">{t.title}</div>
                <div className="topic-meta">par {t.author} · {t.date}</div>
              </div>
              <div className="topic-replies">💬 {t.replies.length}</div>
            </div>
          ))}
        </div>
      )}

      {/* PAGE TOPIC */}
      {page === "topic" && activeTopic && (
        <div className="forum-page">
          <button className="back-btn" onClick={goForum}>← Retour à {activeForum?.emoji} {activeForum?.name}</button>
          <div style={{ borderRadius: 14, padding: 28, marginBottom: 24, background: dark ? "#161b22" : "#ffffff", border: "1.5px solid #6366f1" }}>
            <h2 style={{ fontSize: 22, marginBottom: 12 }}>{activeTopic.title}</h2>
            <p style={{ opacity: 0.5, fontSize: 13, marginBottom: 16 }}>par <strong>{activeTopic.author}</strong> · {activeTopic.date}</p>
            {activeTopic.content && <p style={{ fontSize: 15, lineHeight: 1.7, opacity: 0.85 }}>{activeTopic.content}</p>}
          </div>
          <h3 style={{ marginBottom: 16, opacity: 0.7 }}>💬 {activeTopic.replies.length} réponse{activeTopic.replies.length !== 1 ? "s" : ""}</h3>
          {activeTopic.replies.map(r => (
            <div key={r.id} style={{ borderRadius: 12, padding: "16px 20px", marginBottom: 12, background: dark ? "#161b22" : "#ffffff", border: "1.5px solid", borderColor: dark ? "#30363d" : "#e2e8f0" }}>
              <p style={{ fontSize: 13, opacity: 0.5, marginBottom: 8 }}><strong>{r.author}</strong> · {r.date}</p>
              <p style={{ fontSize: 15, lineHeight: 1.6 }}>{r.content}</p>
            </div>
          ))}
          <div style={{ borderRadius: 14, padding: 24, marginTop: 24, background: dark ? "#161b22" : "#ffffff", border: "1.5px solid", borderColor: dark ? "#30363d" : "#e2e8f0" }}>
            <h3 style={{ marginBottom: 16 }}>✍️ Votre réponse</h3>
            {!account && <p style={{ opacity: 0.6, marginBottom: 12, fontSize: 14 }}>⚠️ Connectez MetaMask pour répondre</p>}
            {account && !estAbonne && <p style={{ color: "#f59e0b", marginBottom: 12, fontSize: 14 }}>⚠️ Abonnez-vous pour pouvoir répondre</p>}
            <textarea value={newReply} onChange={e => setNewReply(e.target.value)}
              placeholder="Écrivez votre réponse..." rows={4}
              style={{ ...inputStyle, resize: "vertical" }}
              disabled={!estAbonne} />
            <button className="btn btn-primary" onClick={posterReponse}
              style={{ padding: "12px 28px", fontSize: 15 }}
              disabled={!estAbonne || !account}>
              📨 Poster la réponse
            </button>
          </div>
        </div>
      )}

      {/* MODAL NOUVEAU SALON */}
      {showNewSalon && (
        <div style={{ position: "fixed", inset: 0, background: "#0008", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}>
          <div style={{ background: dark ? "#161b22" : "white", borderRadius: 16, padding: 32, width: 420, boxShadow: "0 16px 48px #0004", border: "1.5px solid #6366f1" }}>
            <h2 style={{ marginBottom: 24, color: "#6366f1" }}>➕ Nouveau salon</h2>
            {!estAbonne && <p style={{ color: "#f59e0b", marginBottom: 16, fontSize: 14 }}>⚠️ Abonnement requis pour créer un salon</p>}
            <label style={{ fontSize: 13, opacity: 0.7 }}>Emoji</label>
            <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", marginTop: 6 }}>
              {["💬","🔥","🎮","🎵","📚","🌍","⚽","🍕","🚀","💡","🎨","🔐"].map(e => (
                <span key={e} onClick={() => setNewSalon({...newSalon, emoji: e})}
                  style={{ fontSize: 24, cursor: "pointer", padding: "4px 8px", borderRadius: 8, background: newSalon.emoji === e ? "#6366f1" : "transparent", border: `1.5px solid ${newSalon.emoji === e ? "#6366f1" : "#30363d"}` }}>{e}</span>
              ))}
            </div>
            <label style={{ fontSize: 13, opacity: 0.7 }}>Nom *</label>
            <input value={newSalon.name} onChange={e => setNewSalon({...newSalon, name: e.target.value})} placeholder="Ex: Gaming, Musique..." style={inputStyle} />
            <label style={{ fontSize: 13, opacity: 0.7 }}>Description</label>
            <input value={newSalon.description} onChange={e => setNewSalon({...newSalon, description: e.target.value})} placeholder="Décrivez votre salon..." style={inputStyle} />
            <div style={{ display: "flex", gap: 12 }}>
              <button className="btn btn-primary" onClick={creerSalon} style={{ flex: 1, padding: "12px" }}>✅ Créer</button>
              <button onClick={() => setShowNewSalon(false)} style={{ flex: 1, padding: "12px", borderRadius: 8, border: "1.5px solid #30363d", background: "transparent", color: dark ? "#e6edf3" : "#1a1a2e", cursor: "pointer", fontWeight: 600 }}>Annuler</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL NOUVEAU TOPIC */}
      {showNewTopic && (
        <div style={{ position: "fixed", inset: 0, background: "#0008", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}>
          <div style={{ background: dark ? "#161b22" : "white", borderRadius: 16, padding: 32, width: 500, boxShadow: "0 16px 48px #0004", border: "1.5px solid #6366f1" }}>
            <h2 style={{ marginBottom: 24, color: "#6366f1" }}>✏️ Nouveau topic — {activeForum?.emoji} {activeForum?.name}</h2>
            {!estAbonne && <p style={{ color: "#f59e0b", marginBottom: 16, fontSize: 14 }}>⚠️ Abonnement requis pour poster</p>}
            <label style={{ fontSize: 13, opacity: 0.7 }}>Titre *</label>
            <input value={newTopic.title} onChange={e => setNewTopic({...newTopic, title: e.target.value})} placeholder="Titre de votre topic..." style={inputStyle} />
            <label style={{ fontSize: 13, opacity: 0.7 }}>Message (optionnel)</label>
            <textarea value={newTopic.content} onChange={e => setNewTopic({...newTopic, content: e.target.value})} placeholder="Développez votre sujet..." rows={4} style={{ ...inputStyle, resize: "vertical" }} />
            <div style={{ display: "flex", gap: 12 }}>
              <button className="btn btn-primary" onClick={creerTopic} style={{ flex: 1, padding: "12px" }}>🚀 Publier</button>
              <button onClick={() => setShowNewTopic(false)} style={{ flex: 1, padding: "12px", borderRadius: 8, border: "1.5px solid #30363d", background: "transparent", color: dark ? "#e6edf3" : "#1a1a2e", cursor: "pointer", fontWeight: 600 }}>Annuler</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;

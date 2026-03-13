import './App.css';
import { useState, useEffect, useRef } from 'react';
import { ethers } from 'ethers';
import { createAppKit } from '@reown/appkit/react';
import { EthersAdapter } from '@reown/appkit-adapter-ethers';
import { sepolia } from '@reown/appkit/networks';
import { useAppKitAccount, useAppKitProvider } from '@reown/appkit/react';
import { Client } from '@xmtp/browser-sdk';
import ForumAboABI from './ForumAbo.json';

const CONTRACT_ADDRESS = '0x0cB2704923F4f3AdD852A087374366C030a7905c';
const TOPICS_PAR_PAGE = 5;
const AVATARS = ['🦊','🐻','🦁','🐯','🐼','🐨','🦄','🐸','🦋','🐙','🦀','🐬','🦅','🌙','⭐','🔥','💎','🎭','🎪','🌈'];
const PROJECT_ID = 'd65a475ce4a23ba152de3dc5a8e3639b';

createAppKit({
  adapters: [new EthersAdapter()],
  networks: [sepolia],
  projectId: PROJECT_ID,
  metadata: {
    name: 'ZoneFree',
    description: 'Forum décentralisé, libre et privé',
    url: 'https://freezone-kappa.vercel.app',
    icons: ['https://freezone-kappa.vercel.app/favicon.ico'],
  },
  themeMode: 'dark',
  themeVariables: {
    '--w3m-accent': '#6366f1',
    '--w3m-border-radius-master': '8px',
    '--w3m-font-family': 'Inter, sans-serif',
  },
});

const shortAddr = addr => addr ? addr.slice(0, 6) + '...' + addr.slice(-4) : '';

const FORUMS_INIT = [
  {
    id: 'general', emoji: '💬', name: 'Général', description: 'Discussions libres, actualités du jour',
    topics: [
      { id: 1, title: 'Bienvenue sur Zone Free ! Présentez-vous 👋', author: 'Admin', pinned: true, replies: [
        { id: 1, author: '0xA1B2...C3D4', content: 'Bonjour tout le monde !', date: '01/03/2026' },
        { id: 2, author: '0xE5F6...G7H8', content: "Ravi d'être ici !", date: '01/03/2026' },
      ], date: '01/03/2026' },
      { id: 2, title: 'Les règles de la communauté Zone Free', author: 'Admin', pinned: true, replies: [], date: '01/03/2026' },
      { id: 3, title: "Que pensez-vous de la liberté d'expression en 2026 ?", author: '0xA1B2...C3D4', pinned: false, replies: [], date: '01/03/2026' },
    ],
  },
  {
    id: 'crypto', emoji: '₿', name: 'Crypto', description: 'Bitcoin, Ethereum, DeFi, Web3',
    topics: [
      { id: 1, title: 'Bitcoin 100k – Analyse technique du marché', author: '0xF3E2...1A2B', pinned: false, replies: [], date: '28/02/2026' },
      { id: 2, title: 'DeFi vs Finance traditionnelle – Le débat', author: '0xC9D8...5E6F', pinned: false, replies: [], date: '27/02/2026' },
      { id: 3, title: 'Monero vs Zcash – Quelle crypto la plus privée ?', author: '0xB7A6...9C0D', pinned: false, replies: [], date: '01/03/2026' },
      { id: 4, title: "Est-ce que l'Ethereum mainnet est toujours pertinent ?", author: '0xE5F4...3G4H', pinned: false, replies: [], date: '01/03/2026' },
    ],
  },
  {
    id: 'tech', emoji: '💻', name: 'Tech', description: 'Technologie, IA, logiciels, hardware',
    topics: [
      { id: 1, title: 'Les meilleures IA open-source en 2026', author: '0xD3C2...7I8J', pinned: false, replies: [], date: '01/03/2026' },
      { id: 2, title: 'Linux vs Windows – Quel OS pour la vie privée ?', author: '0xH1G0...5K6L', pinned: false, replies: [], date: '28/02/2026' },
      { id: 3, title: 'Projet : construire son propre nœud Ethereum', author: '0xJ9I8...3M4N', pinned: false, replies: [], date: '01/03/2026' },
    ],
  },
  {
    id: 'politique', emoji: '🏛️', name: 'Politique', description: 'Débats politiques, géopolitique mondiale',
    topics: [
      { id: 1, title: "Censure d'internet – Tour du monde des restrictions", author: '0xL7K6...1O2P', pinned: false, replies: [], date: '01/03/2026' },
      { id: 2, title: "CBDC – monnaie numérique d'état, bonne ou mauvaise idée ?", author: '0xN5M4...9Q0R', pinned: false, replies: [], date: '27/02/2026' },
      { id: 3, title: "Élections et réseaux sociaux – manipulation de l'opinion ?", author: '0xP3O2...7S8T', pinned: false, replies: [], date: '28/02/2026' },
    ],
  },
  {
    id: 'journaliste', emoji: '📰', name: 'Journaliste', description: 'Médias libres, investigations, presse indépendante',
    topics: [
      { id: 1, title: 'Comment publier anonymement en 2026 – Guide complet', author: '0xR1Q0...5U6V', pinned: false, replies: [], date: '01/03/2026' },
      { id: 2, title: 'Les outils du journaliste indépendant : Tor, Signal, etc.', author: '0xT9S8...3W4X', pinned: false, replies: [], date: '28/02/2026' },
    ],
  },
];

function App() {
  const { address, isConnected } = useAppKitAccount();
  const { walletProvider } = useAppKitProvider('eip155');
  const account = isConnected ? address : null;

  const [dark, setDark] = useState(() => { const s = localStorage.getItem('zonefree-dark'); return s !== null ? JSON.parse(s) : true; });
  const [estAbonne, setEstAbonne] = useState(false);
  const [loadingAbo, setLoadingAbo] = useState(false);
  const [expiration, setExpiration] = useState(null);
  const [prixETH, setPrixETH] = useState(null);
  const [page, setPage] = useState('home');
  const [forums, setForums] = useState(() => { const s = localStorage.getItem('zonefree-forums'); return s ? JSON.parse(s) : FORUMS_INIT; });
  const [activeForum, setActiveForum] = useState(null);
  const [activeTopic, setActiveTopic] = useState(null);
  const [showTranslate, setShowTranslate] = useState(false);
  const [showNewSalon, setShowNewSalon] = useState(false);
  const [showNewTopic, setShowNewTopic] = useState(false);
  const [newSalon, setNewSalon] = useState({ emoji: '', name: '', description: '' });
  const [newTopic, setNewTopic] = useState({ title: '', content: '' });
  const [newReply, setNewReply] = useState('');
  const [replyImage, setReplyImage] = useState(null);
  const [recherche, setRecherche] = useState('');
  const [rechercheTopic, setRechercheTopic] = useState('');
  const [rechercheGlobale, setRechercheGlobale] = useState('');
  const [showRechercheGlobale, setShowRechercheGlobale] = useState(false);
  const [sortBy, setSortBy] = useState('date');
  const [currentPage, setCurrentPage] = useState(1);
  const [likes, setLikes] = useState(() => { const s = localStorage.getItem('zonefree-likes'); return s ? JSON.parse(s) : {}; });
  const [xmtpClient, setXmtpClient] = useState(null);
  const [xmtpLoading, setXmtpLoading] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [xmtpMessages, setXmtpMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [newMessageTo, setNewMessageTo] = useState('');
  const [showNewConversation, setShowNewConversation] = useState(false);
  const streamRef = useRef(null);
  const [xmtpUnread, setXmtpUnread] = useState(0);
  const imageInputRef = useRef(null);
  const replyImageRef = useRef(null);
  const [pseudo, setPseudo] = useState(() => { const s = localStorage.getItem('zonefree-pseudo'); return s ? JSON.parse(s) : {}; });
  const [avatars, setAvatars] = useState(() => { const s = localStorage.getItem('zonefree-avatars'); return s ? JSON.parse(s) : {}; });
  const [membres, setMembres] = useState(() => { const s = localStorage.getItem('zonefree-membres'); return s ? JSON.parse(s) : []; });
  const [showPseudoModal, setShowPseudoModal] = useState(false);
  const [newPseudo, setNewPseudo] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('🦊');
  const [toasts, setToasts] = useState([]);

  useEffect(() => { localStorage.setItem('zonefree-forums', JSON.stringify(forums)); }, [forums]);
  useEffect(() => { localStorage.setItem('zonefree-dark', JSON.stringify(dark)); document.body.className = dark ? 'dark' : 'light'; }, [dark]);
  useEffect(() => { localStorage.setItem('zonefree-likes', JSON.stringify(likes)); }, [likes]);
  useEffect(() => { localStorage.setItem('zonefree-pseudo', JSON.stringify(pseudo)); }, [pseudo]);
  useEffect(() => { localStorage.setItem('zonefree-avatars', JSON.stringify(avatars)); }, [avatars]);
  useEffect(() => { localStorage.setItem('zonefree-membres', JSON.stringify(membres)); }, [membres]);

  useEffect(() => {
    if (!isConnected || !address || !walletProvider) {
      if (!isConnected) { setEstAbonne(false); setExpiration(null); setXmtpClient(null); setConversations([]); setXmtpUnread(0); }
      return;
    }
    const init = async () => {
      try {
        const provider = new ethers.BrowserProvider(walletProvider);
        const contract = new ethers.Contract(CONTRACT_ADDRESS, ForumAboABI, provider);
        const abonne = await contract.estAbonne(address);
        setEstAbonne(abonne);
        const exp = await contract.abonnements(address);
        if (exp > 0) setExpiration(new Date(Number(exp) * 1000));
        const prix = await contract.getPrixEnWei();
        setPrixETH(prix);
        const shortA = shortAddr(address);
        const savedPseudos = JSON.parse(localStorage.getItem('zonefree-pseudo') || '{}');
        const savedAvatars = JSON.parse(localStorage.getItem('zonefree-avatars') || '{}');
        const savedMembres = JSON.parse(localStorage.getItem('zonefree-membres') || '[]');
        const existing = savedMembres.find(m => m.address === shortA);
        if (existing) {
          const updated = savedMembres.map(m => m.address === shortA ? { ...m, lastSeen: Date.now() } : m);
          setMembres(updated); localStorage.setItem('zonefree-membres', JSON.stringify(updated));
        } else {
          const newM = { address: shortA, pseudo: savedPseudos[shortA] || '', avatar: savedAvatars[shortA] || '🦊', lastSeen: Date.now() };
          const updated = [...savedMembres, newM];
          setMembres(updated); localStorage.setItem('zonefree-membres', JSON.stringify(updated));
        }
        if (savedAvatars[shortA]) setSelectedAvatar(savedAvatars[shortA]);
        if (!savedPseudos[shortA]) setShowPseudoModal(true);
        addToast(savedAvatars[shortA] || '👋', 'Connecté !', `Bienvenue ${savedPseudos[shortA] || shortA}`, 'success');
        try {
          setXmtpLoading(true);
          const signer = await provider.getSigner();
          const client = await Client.create(signer, { env: 'production' });
          setXmtpClient(client);
          await client.conversations.sync();
          const convList = await client.conversations.list();
          setConversations(convList);
          addToast('🔒', 'XMTP actif !', 'Messagerie E2E chiffrée', 'success');
          startXmtpStream(client);
        } catch (e) { console.error('XMTP', e); } finally { setXmtpLoading(false); }
      } catch (e) { console.error('Erreur init wallet', e); }
    };
    init();
    return () => { if (streamRef.current) streamRef.current = null; };
  }, [isConnected, address, walletProvider]); // eslint-disable-line

  const startXmtpStream = async (client) => {
    if (streamRef.current) return;
    streamRef.current = true;
    try {
      const stream = await client.conversations.streamAllMessages();
      for await (const msg of stream) {
        if (!streamRef.current) break;
        if (msg.senderInboxId !== client.inboxId) {
          setXmtpUnread(prev => prev + 1);
          const content = typeof msg.content === 'string' ? msg.content.slice(0, 50) : 'Image reçue';
          addToast('💬', 'Nouveau message !', content, 'info');
          await client.conversations.sync();
          setConversations(await client.conversations.list());
        }
      }
    } catch (e) { console.error('Stream XMTP', e); }
  };

  const addToast = (icon, title, msg, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, icon, title, msg, type }]);
    setTimeout(() => setToasts(prev => prev.map(t => t.id === id ? { ...t, closing: true } : t)), 3500);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3800);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, closing: true } : t));
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 300);
  };

  const getAvatar = (addr) => avatars[addr];
  const isOnline = (lastSeen) => lastSeen && (Date.now() - lastSeen) < 30 * 60 * 1000;

  const toggleLike = (key) => {
    if (!account) { alert('Connectez votre wallet !'); return; }
    if (!estAbonne) { alert('Abonnement requis !'); return; }
    const current = likes[key] || { count: 0, likedBy: [] };
    const hasLiked = current.likedBy.includes(account);
    setLikes({ ...likes, [key]: { count: hasLiked ? current.count - 1 : current.count + 1, likedBy: hasLiked ? current.likedBy.filter(a => a !== account) : [...current.likedBy, account] } });
  };

  const getLike = (key) => {
    const l = likes[key] || { count: 0, likedBy: [] };
    return { count: l.count, hasLiked: l.likedBy.includes(account) };
  };

  const togglePin = (forumId, topicId) => {
    if (!account) { alert('Connectez votre wallet !'); return; }
    if (!estAbonne) { alert('Abonnement requis !'); return; }
    const updatedForums = forums.map(f => f.id === forumId ? { ...f, topics: f.topics.map(t => t.id === topicId ? { ...t, pinned: !t.pinned } : t) } : f);
    setForums(updatedForums);
    setActiveForum(updatedForums.find(f => f.id === forumId));
    if (activeTopic?.id === topicId) setActiveTopic(updatedForums.find(f => f.id === forumId)?.topics.find(t => t.id === topicId));
    addToast('📌', 'Topic épinglé !', '', 'success');
  };

  const sortTopics = (topics, forumId) => {
    const pinned = topics.filter(t => t.pinned);
    const unpinned = topics.filter(t => !t.pinned);
    const sortFn = (a, b) => {
      if (sortBy === 'popular') return (likes[`${forumId}-${b.id}`]?.count || 0) - (likes[`${forumId}-${a.id}`]?.count || 0);
      if (sortBy === 'replies') return b.replies.length - a.replies.length;
      return b.id - a.id;
    };
    return [...pinned.sort(sortFn), ...unpinned.sort(sortFn)];
  };

  const resultatsGlobaux = rechercheGlobale.trim().length >= 2
    ? forums.flatMap(f => f.topics
        .filter(t =>
          t.title.toLowerCase().includes(rechercheGlobale.toLowerCase()) ||
          (t.content || '').toLowerCase().includes(rechercheGlobale.toLowerCase()) ||
          t.author.toLowerCase().includes(rechercheGlobale.toLowerCase()) ||
          t.replies.some(r => r.content.toLowerCase().includes(rechercheGlobale.toLowerCase()))
        )
        .map(t => ({ ...t, forumId: f.id, forumName: f.name, forumEmoji: f.emoji })))
    : [];

  const demarrerConversationXMTP = async () => {
    if (!xmtpClient) { alert('XMTP non connecté !'); return; }
    if (!newMessageTo.trim()) { alert('Entrez une adresse !'); return; }
    try {
      const dm = await xmtpClient.conversations.findOrCreateDm(newMessageTo.trim());
      setActiveConversation(dm);
      await dm.sync();
      setXmtpMessages(await dm.messages());
      setShowNewConversation(false);
      setNewMessageTo('');
      setPage('conversation');
    } catch (e) { alert(e.message); }
  };

  const envoyerMessageXMTP = async (imageData = null) => {
    if (!xmtpClient || !activeConversation) return;
    const content = imageData || newMessage.trim();
    if (!content) return;
    try {
      await activeConversation.send(content);
      setNewMessage('');
      await activeConversation.sync();
      setXmtpMessages(await activeConversation.messages());
    } catch (e) { alert(e.message); }
  };

  const handleXmtpImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX = 300;
      let w = img.width, h = img.height;
      if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; }
      if (h > MAX) { w = Math.round(w * MAX / h); h = MAX; }
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      const compressed = canvas.toDataURL('image/jpeg', 0.3);
      URL.revokeObjectURL(objectUrl);
      envoyerMessageXMTP(compressed);
    };
    img.src = objectUrl;
    e.target.value = '';
  };

  const handleReplyImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setReplyImage(ev.target.result);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const ouvrirConversationXMTP = async (conv) => {
    setActiveConversation(conv);
    await conv.sync();
    setXmtpMessages(await conv.messages());
    setXmtpUnread(0);
    setPage('conversation');
  };

  const sAbonner = async () => {
    if (!isConnected || !walletProvider) { alert('Connectez votre wallet !'); return; }
    try {
      setLoadingAbo(true);
      const provider = new ethers.BrowserProvider(walletProvider);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, ForumAboABI, signer);
      const prixWei = await contract.getPrixEnWei();
      const tx = await contract.sAbonner({ value: prixWei });
      await tx.wait();
      setEstAbonne(true);
      const exp = await contract.abonnements(account);
      if (exp > 0) setExpiration(new Date(Number(exp) * 1000));
      addToast('✅', 'Abonnement activé !', "30 jours d'accès complet ZoneFree", 'success');
    } catch (e) { alert('Erreur : ' + e.message); } finally { setLoadingAbo(false); }
  };

  const savePseudo = () => {
    if (!newPseudo.trim()) { alert('Entrez un pseudo !'); return; }
    const shortA = shortAddr(account);
    setPseudo({ ...pseudo, [shortA]: newPseudo.trim() });
    setAvatars({ ...avatars, [shortA]: selectedAvatar });
    setMembres(membres.map(m => m.address === shortA ? { ...m, pseudo: newPseudo.trim(), avatar: selectedAvatar } : m));
    setShowPseudoModal(false);
    setNewPseudo('');
    addToast(selectedAvatar, 'Profil enregistré !', `Vous êtes ${newPseudo.trim()}`, 'success');
  };

  const openForum = (forum) => { setActiveForum(forum); setRechercheTopic(''); setCurrentPage(1); setSortBy('date'); setPage('forum'); };
  const openTopic = (topic, forum = null) => { if (forum) setActiveForum(forum); setActiveTopic(topic); setPage('topic'); };
  const goHome = () => { setPage('home'); setActiveForum(null); setActiveTopic(null); setRecherche(''); setRechercheGlobale(''); setShowRechercheGlobale(false); };
  const goForum = () => { setPage('forum'); setActiveTopic(null); };

  const prixEnETH = prixETH ? parseFloat(ethers.formatEther(prixETH)).toFixed(6) : '...';
  const joursRestants = expiration ? Math.max(0, Math.ceil((expiration - new Date()) / (1000 * 60 * 60 * 24))) : 0;

  const creerSalon = () => {
    if (!account) { alert('Connectez votre wallet !'); return; }
    if (!estAbonne) { alert('Abonnement requis !'); return; }
    if (!newSalon.name.trim()) { alert('Donnez un nom !'); return; }
    const salon = { id: newSalon.name.toLowerCase().replace(/\s+/g, '-'), emoji: newSalon.emoji, name: newSalon.name, description: newSalon.description || 'Nouveau salon', topics: [] };
    setForums([...forums, salon]);
    setShowNewSalon(false);
    addToast('✅', 'Salon créé !', newSalon.name, 'success');
    setNewSalon({ emoji: '', name: '', description: '' });
  };

  const creerTopic = () => {
    if (!account) { alert('Connectez votre wallet !'); return; }
    if (!estAbonne) { alert('Abonnement requis !'); return; }
    if (!newTopic.title.trim()) { alert('Donnez un titre !'); return; }
    const topic = { id: Date.now(), title: newTopic.title, content: newTopic.content, author: shortAddr(account), pinned: false, replies: [], date: new Date().toLocaleDateString('fr-FR') };
    const updatedForums = forums.map(f => f.id === activeForum.id ? { ...f, topics: [topic, ...f.topics] } : f);
    setForums(updatedForums);
    setActiveForum(updatedForums.find(f => f.id === activeForum.id));
    setShowNewTopic(false);
    addToast('✅', 'Topic publié !', newTopic.title.slice(0, 40), 'success');
    setNewTopic({ title: '', content: '' });
  };

  const posterReponse = () => {
    if (!account) { alert('Connectez votre wallet !'); return; }
    if (!estAbonne) { alert('Abonnement requis !'); return; }
    if (!newReply.trim() && !replyImage) { alert('Écrivez un message ou ajoutez une image !'); return; }
    const reply = { id: Date.now(), author: shortAddr(account), content: newReply, image: replyImage || null, date: new Date().toLocaleDateString('fr-FR') };
    const updatedTopic = { ...activeTopic, replies: [...activeTopic.replies, reply] };
    const updatedForums = forums.map(f => f.id === activeForum.id ? { ...f, topics: f.topics.map(t => t.id === activeTopic.id ? updatedTopic : t) } : f);
    setForums(updatedForums);
    setActiveForum(updatedForums.find(f => f.id === activeForum.id));
    setActiveTopic(updatedTopic);
    setNewReply('');
    setReplyImage(null);
    addToast('✅', 'Réponse postée !', '', 'success');
  };

  const inputStyle = {
    display: 'block', width: '100%', padding: '10px 14px', borderRadius: 8,
    border: '1.5px solid #30363d', background: dark ? '#0d1117' : '#f8f9ff',
    color: dark ? '#e6edf3' : '#1a1a2e', fontSize: 15, marginBottom: 16,
    marginTop: 6, boxSizing: 'border-box', fontFamily: 'inherit',
  };

  const topicsBase = (activeForum?.topics || []).filter(t =>
    t.title.toLowerCase().includes(rechercheTopic.toLowerCase()) ||
    t.author.toLowerCase().includes(rechercheTopic.toLowerCase())
  );
  const topicsSorted = sortTopics(topicsBase, activeForum?.id);
  const totalPages = Math.ceil(topicsSorted.length / TOPICS_PAR_PAGE);
  const topicsPaginated = topicsSorted.slice((currentPage - 1) * TOPICS_PAR_PAGE, currentPage * TOPICS_PAR_PAGE);
  const forumsFiltered = forums.filter(f =>
    f.name.toLowerCase().includes(recherche.toLowerCase()) ||
    f.description.toLowerCase().includes(recherche.toLowerCase())
  );

  const renderBubbleContent = (content) => {
    if (typeof content === 'string' && content.startsWith('data:image'))
      return <img src={content} alt="img" style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 8, display: 'block' }} />;
    return <span>{content}</span>;
  };

  return (
    <div>

      {/* ===== HEADER ===== */}
      <header className="header">
        <div className="logo" onClick={goHome}>Zone<span>Free</span></div>
        <div className="header-actions">

          {/* Recherche globale */}
          <div style={{ position: 'relative' }}>
            <button className="btn btn-ghost" onClick={() => setShowRechercheGlobale(!showRechercheGlobale)} title="Recherche globale">🔍</button>
            {showRechercheGlobale && (
              <div style={{ position: 'absolute', top: 44, right: 0, background: dark ? '#161b22' : 'white', border: '1.5px solid #6366f1', borderRadius: 12, padding: 16, width: 360, zIndex: 999, boxShadow: '0 8px 32px #0006' }}>
                <input autoFocus value={rechercheGlobale} onChange={e => setRechercheGlobale(e.target.value)} placeholder="Rechercher dans tous les forums..." style={{ ...inputStyle, marginBottom: 8, marginTop: 0 }} />
                {rechercheGlobale.trim().length >= 2 && (
                  <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                    {resultatsGlobaux.length === 0
                      ? <p style={{ opacity: 0.5, fontSize: 13, textAlign: 'center', padding: 12 }}>Aucun résultat</p>
                      : resultatsGlobaux.map((t, i) => (
                        <div key={i} style={{ padding: '10px 12px', borderRadius: 8, cursor: 'pointer', marginBottom: 6, background: dark ? '#0d1117' : '#f8f9ff', border: '1px solid #30363d' }}
                          onClick={() => { const forum = forums.find(f => f.id === t.forumId); openTopic(t, forum); setShowRechercheGlobale(false); setRechercheGlobale(''); }}>
                          <div style={{ fontSize: 11, opacity: 0.5, marginBottom: 4 }}>{t.forumEmoji} {t.forumName}</div>
                          <div style={{ fontSize: 14, fontWeight: 600 }}>{t.pinned ? '📌 ' : ''}{t.title}</div>
                          <div style={{ fontSize: 12, opacity: 0.5 }}>par {t.author} · {t.replies.length} réponse{t.replies.length !== 1 ? 's' : ''}</div>
                        </div>
                      ))
                    }
                    <div style={{ fontSize: 12, opacity: 0.4, textAlign: 'center', marginTop: 8 }}>{resultatsGlobaux.length} résultat{resultatsGlobaux.length !== 1 ? 's' : ''}</div>
                  </div>
                )}
              </div>
            )}
          </div>

          <button className="btn btn-ghost" onClick={() => setDark(!dark)}>{dark ? '☀️' : '🌙'}</button>
          <button className="btn btn-ghost" onClick={() => setShowTranslate(!showTranslate)}>🌐</button>

          {account && (
            <button className="btn btn-ghost" onClick={() => { setXmtpUnread(0); setPage('messages'); }} style={{ position: 'relative', fontSize: 16 }}>
              💬
              {xmtpUnread > 0 && <span style={{ position: 'absolute', top: -4, right: -4, background: '#ef4444', color: 'white', borderRadius: '50%', width: 18, height: 18, fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{xmtpUnread}</span>}
            </button>
          )}
          {account && <button className="btn btn-ghost" onClick={() => setPage('annuaire')} style={{ fontSize: 16 }}>👥</button>}
          {account && <button className="btn btn-ghost" onClick={() => setPage('profil')} style={{ fontSize: 16 }}>👤</button>}

          {account
            ? <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="wallet-addr" style={{ cursor: 'pointer' }}
                  onClick={() => { setNewPseudo(pseudo[shortAddr(account)] || ''); setSelectedAvatar(avatars[shortAddr(account)] || '🦊'); setShowPseudoModal(true); }}>
                  {getAvatar(shortAddr(account))} {pseudo[shortAddr(account)] || shortAddr(account)}
                </span>
                {estAbonne
                  ? <span className="badge-abonne">✅ Abonné</span>
                  : <button className="btn btn-primary" onClick={sAbonner} style={{ fontSize: 13, padding: '6px 14px' }} disabled={loadingAbo}>
                      {loadingAbo ? <><span className="spinner"/>Transaction...</> : `S'abonner ${prixEnETH} ETH`}
                    </button>
                }
                <appkit-button size="sm" />
              </div>
            : <appkit-button label="Connecter un wallet" size="sm" />
          }
        </div>
      </header>

      {showTranslate && (
        <div className="translate-panel">
          <p>Choisir une langue</p>
          <div id="google_translate_element"></div>
          <p style={{ marginTop: 8, fontSize: 12, opacity: 0.5 }}>Powered by Google Translate</p>
        </div>
      )}

      {/* Bannière non-abonné */}
      {account && !estAbonne && !['profil','messages','conversation','annuaire'].includes(page) && (
        <div style={{ background: 'linear-gradient(90deg,#f59e0b22,#6366f122)', border: '1.5px solid #f59e0b', borderRadius: 12, margin: '16px auto', maxWidth: 860, padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <p style={{ margin: 0, fontSize: 14 }}><strong>Vous n'êtes pas abonné.</strong> Abonnez-vous pour {prixEnETH} ETH/mois.</p>
          <button className="btn btn-primary" onClick={sAbonner} disabled={loadingAbo} style={{ fontSize: 13, padding: '8px 20px' }}>
            {loadingAbo ? <><span className="spinner"/>Transaction...</> : `S'abonner ${prixEnETH} ETH · 30 jours`}
          </button>
        </div>
      )}

      {/* ===== PAGE MESSAGES ===== */}
      {page === 'messages' && account && (
        <div className="forum-page">
          <button className="back-btn" onClick={goHome}>← Retour à l'accueil</button>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <h2 style={{ fontSize: 22 }}>💬 Messagerie XMTP E2E</h2>
            <button className="btn btn-primary" onClick={() => setShowNewConversation(true)}>+ Nouveau message</button>
          </div>
          {xmtpLoading && (
            <div style={{ background: '#6366f111', border: '1.5px solid #6366f1', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 13, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="spinner"/>Connexion XMTP...
            </div>
          )}
          {xmtpClient && !xmtpLoading && (
            <div style={{ background: '#22c55e11', border: '1.5px solid #22c55e44', borderRadius: 10, padding: '10px 16px', marginBottom: 20, fontSize: 13 }}>
              🔒 MLS E2E actif · Notifications temps réel actives
            </div>
          )}
          {conversations.length === 0
            ? <div className="no-results"><span>💬</span><p>Aucun message. Démarrez une conversation !</p></div>
            : <div className="messages-list">
                {conversations.map((conv, i) => (
                  <div key={i} className="conversation-item" onClick={() => ouvrirConversationXMTP(conv)}>
                    <div className="conv-avatar"></div>
                    <div className="conv-info">
                      <div className="conv-addr" style={{ fontFamily: 'monospace', fontSize: 13 }}>{conv.peerInboxId?.slice(0, 10)}...</div>
                      <div className="conv-preview">Message chiffré E2E</div>
                    </div>
                    <div style={{ fontSize: 10, opacity: 0.4 }}>XMTP</div>
                  </div>
                ))}
              </div>
          }
          {showNewConversation && (
            <div style={{ position: 'fixed', inset: 0, background: '#0008', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
              <div style={{ background: dark ? '#161b22' : 'white', borderRadius: 16, padding: 32, width: 440, border: '1.5px solid #6366f1' }}>
                <h2 style={{ marginBottom: 8, color: '#6366f1' }}>Nouveau message XMTP</h2>
                <p style={{ fontSize: 13, opacity: 0.6, marginBottom: 20 }}>Adresse Ethereum complète du destinataire</p>
                <input value={newMessageTo} onChange={e => setNewMessageTo(e.target.value)} style={inputStyle} placeholder="0xAbCd...1234" />
                <div style={{ display: 'flex', gap: 12 }}>
                  <button className="btn btn-primary" onClick={demarrerConversationXMTP} style={{ flex: 1 }}>Démarrer</button>
                  <button className="btn btn-ghost" onClick={() => setShowNewConversation(false)} style={{ flex: 1 }}>Annuler</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== PAGE CONVERSATION ===== */}
      {page === 'conversation' && activeConversation && account && (
        <div className="forum-page" style={{ padding: 0 }}>
          <div style={{ padding: '16px 24px', borderBottom: '1.5px solid #30363d', display: 'flex', alignItems: 'center', gap: 16 }}>
            <button className="back-btn" style={{ margin: 0 }} onClick={() => setPage('messages')}>←</button>
            <div className="conv-avatar" style={{ width: 36, height: 36, fontSize: 20 }}></div>
            <div style={{ fontWeight: 700, fontSize: 13, fontFamily: 'monospace' }}>{activeConversation.peerInboxId?.slice(0, 12)}...</div>
            <div style={{ marginLeft: 'auto', fontSize: 12, background: '#22c55e22', color: '#22c55e', border: '1px solid #22c55e44', borderRadius: 20, padding: '3px 10px' }}>🔒 E2E</div>
          </div>
          <div className="chat-container" style={{ minHeight: 400, maxHeight: 500, overflowY: 'auto' }}>
            {xmtpMessages.length === 0 && (
              <div style={{ textAlign: 'center', opacity: 0.4, marginTop: 40 }}>Aucun message — Dites bonjour ! 👋</div>
            )}
            {xmtpMessages.map((msg, i) => {
              const isSent = msg.senderInboxId === xmtpClient?.inboxId;
              return (
                <div key={i} className={`bubble-wrapper ${isSent ? 'sent' : 'received'}`}>
                  <div className={`bubble ${isSent ? 'sent' : 'received'}`}>{renderBubbleContent(msg.content)}</div>
                  <div className="bubble-time">
                    {msg.sentAtNs ? new Date(Number(msg.sentAtNs / 1000000n)).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="message-input-bar" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px' }}>
            {!estAbonne && <p style={{ color: '#f59e0b', fontSize: 14, margin: 0 }}>Abonnement requis</p>}
            <input type="file" accept="image/*" ref={imageInputRef} style={{ display: 'none' }} onChange={handleXmtpImage} />
            <button
              onClick={() => imageInputRef.current?.click()}
              disabled={!estAbonne}
              title="Envoyer une image"
              style={{ background: '#6366f1', border: 'none', borderRadius: 10, fontSize: 18, cursor: estAbonne ? 'pointer' : 'not-allowed', padding: '8px 12px', opacity: estAbonne ? 1 : 0.3, transition: 'all 0.2s', flexShrink: 0, color: 'white', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}

            >📎</button>
            <textarea
              className="message-input"
              rows={1}
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); envoyerMessageXMTP(); } }}
              placeholder="✍️ Message E2E... Entrée pour envoyer"
              disabled={!estAbonne}
            />
            <button className="send-btn" onClick={() => envoyerMessageXMTP()} disabled={!newMessage.trim() || !estAbonne}>➤</button>
          </div>
        </div>
      )}

      {/* ===== PAGE ANNUAIRE ===== */}
      {page === 'annuaire' && account && (
        <div className="forum-page">
          <button className="back-btn" onClick={goHome}>← Retour à l'accueil</button>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <h2 style={{ fontSize: 22 }}>👥 Annuaire des membres</h2>
            <button className="btn btn-ghost" onClick={() => { setNewPseudo(pseudo[shortAddr(account)] || ''); setSelectedAvatar(avatars[shortAddr(account)] || '🦊'); setShowPseudoModal(true); }} style={{ fontSize: 13 }}>
              {getAvatar(shortAddr(account))} Mon profil · <strong>{pseudo[shortAddr(account)] || 'Non défini'}</strong>
            </button>
          </div>
          <div style={{ background: '#6366f111', border: '1.5px solid #6366f133', borderRadius: 10, padding: '10px 16px', marginBottom: 20, fontSize: 13 }}>
            {membres.length} membre{membres.length > 1 ? 's' : ''} enregistré{membres.length > 1 ? 's' : ''}
          </div>
          {membres.length === 0
            ? <div className="no-results"><span>👥</span><p>Aucun membre enregistré pour l'instant.</p></div>
            : <div className="annuaire-grid">
                {membres.sort((a, b) => (b.lastSeen || 0) - (a.lastSeen || 0)).map((m, i) => (
                  <div key={i} className="membre-card">
                    <div className="membre-avatar">{m.avatar || getAvatar(m.address)}</div>
                    <div className="membre-info">
                      <div className="membre-pseudo">{m.pseudo || m.address}</div>
                      <div className="membre-addr">{m.address}</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                      <span className={`badge-online ${isOnline(m.lastSeen) ? 'online' : 'offline'}`}>{isOnline(m.lastSeen) ? 'En ligne' : 'Hors ligne'}</span>
                      {m.address !== shortAddr(account) && (
                        <button className="btn btn-primary" style={{ fontSize: 12, padding: '4px 12px' }} onClick={() => setPage('messages')}>Message</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
          }
        </div>
      )}

      {/* ===== PAGE PROFIL ===== */}
      {page === 'profil' && account && (
        <div className="forum-page">
          <button className="back-btn" onClick={goHome}>← Retour à l'accueil</button>
          <div style={{ borderRadius: 20, padding: 36, marginBottom: 24, background: dark ? '#161b22' : '#ffffff', border: '1.5px solid #6366f1', textAlign: 'center' }}>
            <div style={{ fontSize: 72, marginBottom: 12 }}>{getAvatar(shortAddr(account))}</div>
            <div style={{ fontSize: 24, fontWeight: 800, marginBottom: 4, color: '#6366f1' }}>{pseudo[shortAddr(account)] || shortAddr(account)}</div>
            <div style={{ fontSize: 13, opacity: 0.5, marginBottom: 16, fontFamily: 'monospace' }}>{account}</div>
            <button className="btn btn-ghost" onClick={() => { setNewPseudo(pseudo[shortAddr(account)] || ''); setSelectedAvatar(avatars[shortAddr(account)] || '🦊'); setShowPseudoModal(true); }} style={{ fontSize: 13, marginBottom: 16 }}>✏️ Modifier le profil</button>
            <br />
            {estAbonne
              ? <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#22c55e22', border: '1.5px solid #22c55e', borderRadius: 20, padding: '8px 20px' }}><span>✅</span><span style={{ color: '#22c55e', fontWeight: 700 }}>Abonné actif</span></div>
              : <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#f59e0b22', border: '1.5px solid #f59e0b', borderRadius: 20, padding: '8px 20px' }}><span>⚠️</span><span style={{ color: '#f59e0b', fontWeight: 700 }}>Non abonné</span></div>
            }
          </div>
          <div style={{ borderRadius: 16, padding: 20, marginBottom: 24, background: dark ? '#161b22' : '#ffffff', border: '1.5px solid #6366f1', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 12, opacity: 0.5, marginBottom: 4 }}>PRIX ABONNEMENT · Chainlink</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#6366f1' }}>{prixEnETH} ETH</div>
              <div style={{ fontSize: 13, opacity: 0.6 }}>≈ 2,00 EUR · 30 jours</div>
            </div>
            <div style={{ fontSize: 40 }}>⛓️</div>
          </div>
          <div style={{ borderRadius: 16, padding: 28, marginBottom: 24, background: dark ? '#161b22' : '#ffffff', border: `1.5px solid ${dark ? '#30363d' : '#e2e8f0'}` }}>
            <h3 style={{ marginBottom: 20 }}>Détails abonnement</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {[
                { label: 'STATUT', value: estAbonne ? 'Actif' : 'Inactif', color: estAbonne ? '#22c55e' : '#f59e0b' },
                { label: 'JOURS RESTANTS', value: estAbonne ? `${joursRestants} jours` : '-', color: joursRestants > 7 ? '#22c55e' : '#f59e0b' },
                { label: 'EXPIRATION', value: expiration ? expiration.toLocaleDateString('fr-FR') : '-', color: null },
                { label: 'PRIX', value: `${prixEnETH} ETH`, color: '#6366f1' },
              ].map((item, i) => (
                <div key={i} style={{ borderRadius: 12, padding: 20, background: dark ? '#0d1117' : '#f8f9ff', border: `1.5px solid ${dark ? '#30363d' : '#e2e8f0'}` }}>
                  <div style={{ fontSize: 12, opacity: 0.5, marginBottom: 6 }}>{item.label}</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: item.color || 'inherit' }}>{item.value}</div>
                </div>
              ))}
            </div>
            {estAbonne && (
              <div style={{ marginTop: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, opacity: 0.6, marginBottom: 8 }}>
                  <span>Progression</span><span>{joursRestants}/30 jours restants</span>
                </div>
                <div style={{ background: dark ? '#0d1117' : '#e2e8f0', borderRadius: 8, height: 10, overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 8, width: `${(joursRestants / 30) * 100}%`, background: joursRestants > 7 ? 'linear-gradient(90deg,#6366f1,#22c55e)' : 'linear-gradient(90deg,#f59e0b,#ef4444)', transition: 'width 0.5s ease' }} />
                </div>
              </div>
            )}
          </div>
          <div style={{ borderRadius: 16, padding: 28, marginBottom: 24, background: dark ? '#161b22' : '#ffffff', border: `1.5px solid ${dark ? '#30363d' : '#e2e8f0'}` }}>
            <h3 style={{ marginBottom: 20 }}>Mes statistiques</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
              {[
                { label: 'Topics créés', value: forums.reduce((a, f) => a + f.topics.filter(t => t.author === shortAddr(account)).length, 0), icon: '📝' },
                { label: 'Réponses', value: forums.reduce((a, f) => a + f.topics.reduce((b, t) => b + t.replies.filter(r => r.author === shortAddr(account)).length, 0), 0), icon: '💬' },
                { label: 'Conversations', value: conversations.length, icon: '🔒' },
              ].map((stat, i) => (
                <div key={i} style={{ borderRadius: 12, padding: 20, textAlign: 'center', background: dark ? '#0d1117' : '#f8f9ff', border: `1.5px solid ${dark ? '#30363d' : '#e2e8f0'}` }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>{stat.icon}</div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: '#6366f1' }}>{stat.value}</div>
                  <div style={{ fontSize: 12, opacity: 0.6, marginTop: 4 }}>{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
          {!estAbonne && (
            <div style={{ textAlign: 'center' }}>
              <button className="btn btn-primary" onClick={sAbonner} disabled={loadingAbo} style={{ fontSize: 16, padding: '14px 36px' }}>
                {loadingAbo ? <><span className="spinner"/>Transaction...</> : `S'abonner ${prixEnETH} ETH · 2€/mois`}
              </button>
            </div>
          )}
          <div style={{ textAlign: 'center', marginTop: 24, opacity: 0.5, fontSize: 13 }}>
            <a href={`https://sepolia.etherscan.io/address/${account}`} target="_blank" rel="noreferrer" style={{ color: '#6366f1' }}>Voir sur Etherscan</a>
          </div>
        </div>
      )}

      {/* ===== PAGE HOME ===== */}
      {page === 'home' && (
        <div>
          <div className="hero">
            <div className="badge">🔒 Décentralisé · Libre · Privé</div>
            <h1>Bienvenue sur <span>Zone Free</span></h1>
            <p>Le forum décentralisé où la parole est libre. Abonnement sécurisé par Ethereum.</p>
          </div>
          <div className="search-container">
            <span className="search-icon">🔍</span>
            <input className="search-input" placeholder="Rechercher un salon..." value={recherche} onChange={e => setRecherche(e.target.value)} />
            {recherche && <button className="search-clear" onClick={() => setRecherche('')}>✕</button>}
          </div>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <button className="btn btn-primary" onClick={() => setShowNewSalon(true)} style={{ fontSize: 16, padding: '12px 28px' }}>+ Créer un nouveau salon</button>
          </div>
          {forumsFiltered.length === 0
            ? <div className="no-results"><span>🔍</span><p>Aucun salon trouvé pour <strong>{recherche}</strong></p></div>
            : <div className="forums-grid">
                {forumsFiltered.map(f => {
                  const pinnedCount = f.topics.filter(t => t.pinned).length;
                  return (
                    <div key={f.id} className="forum-card" onClick={() => openForum(f)}>
                      <div className="forum-emoji">{f.emoji}</div>
                      <div className="forum-name">{f.name}</div>
                      <div className="forum-desc">{f.description}</div>
                      <div className="forum-meta">
                        <span>{f.topics.length} topics</span>
                        <span>{f.topics.reduce((a, t) => a + t.replies.length, 0)} réponses</span>
                        {pinnedCount > 0 && <span>📌 {pinnedCount}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
          }
          <div className="footer">
            Zone Free © 2026 · <a href={`https://sepolia.etherscan.io/address/${CONTRACT_ADDRESS}`} target="_blank" rel="noreferrer">Contrat Etherscan</a>
          </div>
        </div>
      )}

      {/* ===== PAGE FORUM ===== */}
      {page === 'forum' && activeForum && (
        <div className="forum-page">
          <button className="back-btn" onClick={goHome}>← Retour aux forums</button>
          <div className="forum-header">
            <h2>{activeForum.emoji} {activeForum.name}</h2>
            <p style={{ opacity: 0.6, marginTop: 6 }}>{activeForum.description}</p>
          </div>
          <button className="new-topic-btn" onClick={() => setShowNewTopic(true)}>+ Nouveau topic</button>
          <div className="search-container" style={{ margin: '0 0 16px' }}>
            <span className="search-icon">🔍</span>
            <input className="search-input" placeholder="Rechercher un topic..." value={rechercheTopic} onChange={e => { setRechercheTopic(e.target.value); setCurrentPage(1); }} />
            {rechercheTopic && <button className="search-clear" onClick={() => setRechercheTopic('')}>✕</button>}
          </div>
          <div className="sort-bar">
            <span style={{ fontSize: 13, opacity: 0.6 }}>Trier par</span>
            {[['date','Plus récents'],['popular','Populaires'],['replies','Plus de réponses']].map(([val, label]) => (
              <button key={val} className={`sort-btn ${sortBy === val ? 'active' : ''}`} onClick={() => { setSortBy(val); setCurrentPage(1); }}>{label}</button>
            ))}
          </div>
          {topicsPaginated.length === 0
            ? <div className="no-results"><span>📭</span><p>Aucun topic trouvé.</p></div>
            : topicsPaginated.map(t => {
                const likeKey = `${activeForum.id}-${t.id}`;
                const { count, hasLiked } = getLike(likeKey);
                return (
                  <div key={t.id} className={`topic-card ${t.pinned ? 'pinned' : ''}`} onClick={() => openTopic(t)}>
                    <div style={{ flex: 1 }}>
                      <div className="topic-title">
                        {t.pinned && <span style={{ color: '#f59e0b', marginRight: 6, fontSize: 14 }}>📌</span>}
                        {t.title}
                      </div>
                      <div className="topic-meta">par {t.author} · {t.date}</div>
                      <div style={{ marginTop: 8, display: 'flex', gap: 8 }} onClick={e => e.stopPropagation()}>
                        <button className={`like-btn ${hasLiked ? 'liked' : ''}`} onClick={() => toggleLike(likeKey)}>{count > 0 ? count : ''} ❤️ J'aime</button>
                        {estAbonne && <button className="like-btn" onClick={() => togglePin(activeForum.id, t.id)} style={{ fontSize: 12 }}>{t.pinned ? '📌 Désépingler' : '📌 Épingler'}</button>}
                      </div>
                    </div>
                    <div className="topic-replies">{t.replies.length} 💬</div>
                  </div>
                );
              })
          }
          {totalPages > 1 && (
            <div className="pagination">
              <button className="page-btn" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>‹</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                <button key={n} className={`page-btn ${currentPage === n ? 'active' : ''}`} onClick={() => setCurrentPage(n)}>{n}</button>
              ))}
              <button className="page-btn" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>›</button>
            </div>
          )}
        </div>
      )}

      {/* ===== PAGE TOPIC ===== */}
      {page === 'topic' && activeTopic && (
        <div className="forum-page">
          <button className="back-btn" onClick={goForum}>← Retour {activeForum?.emoji} {activeForum?.name}</button>
          <div style={{ borderRadius: 14, padding: 28, marginBottom: 24, background: dark ? '#161b22' : '#ffffff', border: '1.5px solid #6366f1' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              {activeTopic.pinned && <span style={{ background: '#f59e0b22', color: '#f59e0b', border: '1px solid #f59e0b44', borderRadius: 20, padding: '2px 10px', fontSize: 12 }}>📌 épinglé</span>}
              <h2 style={{ fontSize: 22, margin: 0 }}>{activeTopic.title}</h2>
            </div>
            <p style={{ opacity: 0.5, fontSize: 13, marginBottom: 16 }}>par <strong>{activeTopic.author}</strong> · {activeTopic.date}</p>
            {activeTopic.content && <p style={{ fontSize: 15, lineHeight: 1.7 }}>{activeTopic.content}</p>}
            <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
              <button className={`like-btn ${getLike(`${activeForum?.id}-${activeTopic.id}`).hasLiked ? 'liked' : ''}`} onClick={() => toggleLike(`${activeForum?.id}-${activeTopic.id}`)}>
                {getLike(`${activeForum?.id}-${activeTopic.id}`).count > 0 ? getLike(`${activeForum?.id}-${activeTopic.id}`).count : ''} ❤️ J'aime
              </button>
              {estAbonne && <button className="like-btn" onClick={() => togglePin(activeForum?.id, activeTopic.id)} style={{ fontSize: 12 }}>{activeTopic.pinned ? '📌 Désépingler' : '📌 Épingler'}</button>}
            </div>
          </div>
          <h3 style={{ marginBottom: 16, opacity: 0.7 }}>{activeTopic.replies.length} réponse{activeTopic.replies.length !== 1 ? 's' : ''}</h3>
          {activeTopic.replies.map(r => (
            <div key={r.id} style={{ borderRadius: 12, padding: '16px 20px', marginBottom: 12, background: dark ? '#161b22' : '#ffffff', border: `1.5px solid ${dark ? '#30363d' : '#e2e8f0'}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 22 }}>{getAvatar(r.author)}</span>
                <p style={{ fontSize: 13, opacity: 0.5, margin: 0 }}><strong>{pseudo[r.author] || r.author}</strong> · {r.date}</p>
              </div>
              {r.content && <p style={{ fontSize: 15, lineHeight: 1.6 }}>{r.content}</p>}
              {r.image && <img src={r.image} alt="img" className="topic-image" />}
              <button className={`like-btn ${getLike(`reply-${r.id}`).hasLiked ? 'liked' : ''}`} style={{ marginTop: 8 }} onClick={() => toggleLike(`reply-${r.id}`)}>
                {getLike(`reply-${r.id}`).count > 0 ? getLike(`reply-${r.id}`).count : ''} ❤️ J'aime
              </button>
            </div>
          ))}
          <div style={{ borderRadius: 14, padding: 24, marginTop: 24, background: dark ? '#161b22' : '#ffffff', border: `1.5px solid ${dark ? '#30363d' : '#e2e8f0'}` }}>
            <h3 style={{ marginBottom: 16 }}>Votre réponse</h3>
            {!account && <p style={{ opacity: 0.6, marginBottom: 12, fontSize: 14 }}>Connectez votre wallet pour répondre</p>}
            {account && !estAbonne && <p style={{ color: '#f59e0b', marginBottom: 12, fontSize: 14 }}>Abonnez-vous pour répondre</p>}
            <textarea value={newReply} onChange={e => setNewReply(e.target.value)} placeholder="Écrivez votre réponse..." rows={4} style={{ ...inputStyle, resize: 'vertical' }} disabled={!estAbonne} />
            <input type="file" accept="image/*" ref={replyImageRef} style={{ display: 'none' }} onChange={handleReplyImage} />
            {replyImage && (
              <div style={{ position: 'relative', marginBottom: 12 }}>
                <img src={replyImage} alt="preview" style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 8 }} />
                <button onClick={() => setReplyImage(null)} style={{ position: 'absolute', top: 4, right: 4, background: '#ef4444', color: 'white', border: 'none', borderRadius: '50%', width: 24, height: 24, cursor: 'pointer', fontSize: 12 }}>✕</button>
              </div>
            )}
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <button className="btn btn-primary" onClick={posterReponse} style={{ padding: '12px 28px' }} disabled={!estAbonne || !account}>Poster la réponse</button>
              {estAbonne && <button onClick={() => replyImageRef.current?.click()} className="btn btn-ghost" style={{ fontSize: 13 }}>🖼️ Image</button>}
            </div>
          </div>
        </div>
      )}

      {/* ===== TOASTS ===== */}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast ${t.type} ${t.closing ? 'closing' : ''}`}>
            <div className="toast-icon">{t.icon}</div>
            <div className="toast-content">
              <div className="toast-title">{t.title}</div>
              <div className="toast-msg">{t.msg}</div>
            </div>
            <button className="toast-close" onClick={() => removeToast(t.id)}>✕</button>
          </div>
        ))}
      </div>

      {/* ===== MODAL PSEUDO / AVATAR ===== */}
      {showPseudoModal && (
        <div className="pseudo-modal-overlay">
          <div className="pseudo-modal" style={{ width: 480 }}>
            <div style={{ fontSize: 56, marginBottom: 12 }}>{selectedAvatar}</div>
            <h2>Votre profil</h2>
            <p>Choisissez un avatar et un pseudo visibles par tous.</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 20 }}>
              {AVATARS.map(a => (
                <button key={a} onClick={() => setSelectedAvatar(a)} style={{ fontSize: 24, padding: '6px 10px', borderRadius: 10, border: `2px solid ${selectedAvatar === a ? '#6366f1' : '#30363d'}`, background: selectedAvatar === a ? '#6366f122' : 'transparent', cursor: 'pointer', transition: 'all 0.15s', transform: selectedAvatar === a ? 'scale(1.2)' : 'scale(1)' }}>{a}</button>
              ))}
            </div>
            <input className="pseudo-input" value={newPseudo} onChange={e => setNewPseudo(e.target.value)} onKeyDown={e => e.key === 'Enter' && savePseudo()} placeholder="Votre pseudo..." maxLength={20} autoFocus />
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button className="btn btn-primary" onClick={savePseudo} style={{ padding: '10px 28px' }}>Valider</button>
              <button className="btn btn-ghost" onClick={() => setShowPseudoModal(false)}>Plus tard</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL NOUVEAU SALON ===== */}
      {showNewSalon && (
        <div style={{ position: 'fixed', inset: 0, background: '#0008', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div style={{ background: dark ? '#161b22' : 'white', borderRadius: 16, padding: 32, width: 420, border: '1.5px solid #6366f1' }}>
            <h2 style={{ marginBottom: 24, color: '#6366f1' }}>Nouveau salon</h2>
            <label style={{ fontSize: 13, opacity: 0.7 }}>Emoji</label>
            <input value={newSalon.emoji} onChange={e => setNewSalon({ ...newSalon, emoji: e.target.value })} style={inputStyle} placeholder="🚀" />
            <label style={{ fontSize: 13, opacity: 0.7 }}>Nom</label>
            <input value={newSalon.name} onChange={e => setNewSalon({ ...newSalon, name: e.target.value })} style={inputStyle} placeholder="Ex: Sciences, Art..." />
            <label style={{ fontSize: 13, opacity: 0.7 }}>Description</label>
            <input value={newSalon.description} onChange={e => setNewSalon({ ...newSalon, description: e.target.value })} style={inputStyle} placeholder="Description courte" />
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-primary" onClick={creerSalon} style={{ flex: 1 }}>Créer</button>
              <button className="btn btn-ghost" onClick={() => setShowNewSalon(false)} style={{ flex: 1 }}>Annuler</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL NOUVEAU TOPIC ===== */}
      {showNewTopic && (
        <div style={{ position: 'fixed', inset: 0, background: '#0008', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div style={{ background: dark ? '#161b22' : 'white', borderRadius: 16, padding: 32, width: 500, border: '1.5px solid #6366f1' }}>
            <h2 style={{ marginBottom: 24, color: '#6366f1' }}>Nouveau topic</h2>
            <label style={{ fontSize: 13, opacity: 0.7 }}>Titre</label>
            <input value={newTopic.title} onChange={e => setNewTopic({ ...newTopic, title: e.target.value })} style={inputStyle} placeholder="Titre..." />
            <label style={{ fontSize: 13, opacity: 0.7 }}>Contenu</label>
            <textarea value={newTopic.content} onChange={e => setNewTopic({ ...newTopic, content: e.target.value })} style={{ ...inputStyle, resize: 'vertical' }} rows={4} placeholder="Développez..." />
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-primary" onClick={creerTopic} style={{ flex: 1 }}>Publier</button>
              <button className="btn btn-ghost" onClick={() => setShowNewTopic(false)} style={{ flex: 1 }}>Annuler</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;





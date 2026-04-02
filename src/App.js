import './App.css'
import { useState, useEffect, useRef } from 'react'
import { ethers } from 'ethers'
import { Client } from '@xmtp/browser-sdk'
import ForumAboABI from './ForumAbo.json'
import { useAppKit, useAppKitAccount, useAppKitProvider, useDisconnect } from '@reown/appkit/react'

const CONTRACT_ADDRESS = '0x08789ba50be5547200e8306cea37d91deb732b5e'
const TOPICS_PAR_PAGE = 5
const IPFS_GATEWAY = 'https://ipfs.4everland.io/ipfs/'


const FORUMS_INIT = [
  {
    id: 'general', emoji: '💬', name: 'Général',
    description: 'Discussions libres, actualités du jour',
    topics: [
      { id: 1, title: 'Bienvenue sur ZoneFree ! Présentez-vous', author: 'Admin', pinned: true, replies: [{ id: 1, author: '0xA1B2...C3D4', content: 'Bonjour tout le monde !', date: '01/03/2026' }, { id: 2, author: '0xE5F6...G7H8', content: 'Ravi d\'être ici !', date: '01/03/2026' }], date: '01/03/2026' },
      { id: 2, title: 'Les règles de la communauté ZoneFree', author: 'Admin', pinned: true, replies: [], date: '01/03/2026' },
      { id: 3, title: 'Que pensez-vous de la liberté d\'expression en 2026 ?', author: '0xA1B2...C3D4', pinned: false, replies: [], date: '01/03/2026' }
    ]
  },
  {
    id: 'crypto', emoji: '₿', name: 'Crypto',
    description: 'Bitcoin, Ethereum, DeFi, Web3',
    topics: [
      { id: 1, title: 'Bitcoin 100k — Analyse technique du marché', author: '0xF3E2...1A2B', pinned: false, replies: [], date: '28/02/2026' },
      { id: 2, title: 'DeFi vs Finance traditionnelle — Le débat', author: '0xC9D8...5E6F', pinned: false, replies: [], date: '27/02/2026' },
      { id: 3, title: 'Monero vs Zcash — Quelle crypto la plus privée ?', author: '0xB7A6...9C0D', pinned: false, replies: [], date: '01/03/2026' },
      { id: 4, title: 'Est-ce que l\'Ethereum mainnet est toujours pertinent ?', author: '0xE5F4...3G4H', pinned: false, replies: [], date: '01/03/2026' }
    ]
  },
  {
    id: 'tech', emoji: '💻', name: 'Tech',
    description: 'Technologie, IA, logiciels, hardware',
    topics: [
      { id: 1, title: 'Les meilleures IA open-source en 2026', author: '0xD3C2...7I8J', pinned: false, replies: [], date: '01/03/2026' },
      { id: 2, title: 'Linux vs Windows — Quel OS pour la vie privée ?', author: '0xH1G0...5K6L', pinned: false, replies: [], date: '28/02/2026' },
      { id: 3, title: 'Projet : construire son propre nœud Ethereum', author: '0xJ9I8...3M4N', pinned: false, replies: [], date: '01/03/2026' }
    ]
  },
  {
    id: 'politique', emoji: '🏛️', name: 'Politique',
    description: 'Débats politiques, géopolitique mondiale',
    topics: [
      { id: 1, title: 'Censure d\'internet — Tour du monde des restrictions', author: '0xL7K6...1O2P', pinned: false, replies: [], date: '01/03/2026' },
      { id: 2, title: 'CBDC monnaie numérique d\'état, bonne ou mauvaise idée ?', author: '0xN5M4...9Q0R', pinned: false, replies: [], date: '27/02/2026' },
      { id: 3, title: 'Élections et réseaux sociaux — manipulation de l\'opinion ?', author: '0xP3O2...7S8T', pinned: false, replies: [], date: '28/02/2026' }
    ]
  },
  {
    id: 'journaliste', emoji: '📰', name: 'Journaliste',
    description: 'Médias libres, investigations, presse indépendante',
    topics: [
      { id: 1, title: 'Comment publier anonymement en 2026 — Guide complet', author: '0xR1Q0...5U6V', pinned: false, replies: [], date: '01/03/2026' },
      { id: 2, title: 'Les outils du journaliste indépendant : Tor, Signal, etc.', author: '0xT9S8...3W4X', pinned: false, replies: [], date: '28/02/2026' }
    ]
  }
]

// ─── MIGRATION PSEUDO ───
const getPseudoFromStorage = () => {
  // 1. Cherche d'abord dans la nouvelle clé
  let stored = localStorage.getItem('zonefree-pseudo') || ''

  // 2. Fallback sur l'ancienne clé 'pseudo' (migration)
  if (!stored) {
    const oldStored = localStorage.getItem('pseudo') || ''
    if (oldStored) {
      stored = oldStored
      // Nettoie l'ancienne clé après migration
      localStorage.removeItem('pseudo')
    }
  }

  if (!stored) return ''

  try {
    const parsed = JSON.parse(stored)
    if (typeof parsed === 'object' && parsed !== null) {
      const valeur = String(Object.values(parsed)[0] || '')
      localStorage.setItem('zonefree-pseudo', valeur)
      return valeur
    }
    return stored
  } catch (e) {
    const match = stored.match(/"([^"]+)"[:\s]*"?([^"{}]+)"?/)
    if (match && match[2]) {
      const valeur = match[2].trim()
      localStorage.setItem('zonefree-pseudo', valeur)
      return valeur
    }
    if (stored.startsWith('{') || stored.startsWith('[')) {
      localStorage.setItem('zonefree-pseudo', '')
      return ''
    }
    return stored
  }
}
function App() {
  // ─── REOWN APPKIT HOOKS ───
  const { open: openModal } = useAppKit()
  const { isConnected, address } = useAppKitAccount()
  const { walletProvider } = useAppKitProvider('eip155')
  const { disconnect } = useDisconnect()

  const disconnectAll = async () => {
    try { await disconnect() } catch(e) {}
    setAccount(null)
    setEstAbonne(false)
    setXmtpClient(null)
    setXmtpError(null)
  }

  // ─── THEME ───
  const [dark, setDark] = useState(() => {
    const s = localStorage.getItem('zonefree-dark')
    return s !== null ? JSON.parse(s) : true
  })

  // ─── WALLET / BLOCKCHAIN ───
  const [account, setAccount] = useState(null)
  const [estAbonne, setEstAbonne] = useState(false)
  const [loadingAbo, setLoadingAbo] = useState(false)
  const [expiration, setExpiration] = useState(null)
  const [prixETH, setPrixETH] = useState(null)
  const [totalAbonnes, setTotalAbonnes] = useState(null)
  const [maxGratuit, setMaxGratuit] = useState(300)
  const [udDomain, setUdDomain] = useState(null)

  // ─── NAVIGATION ───
  const [page, setPage] = useState('home')

  // ─── PROFIL ───
  const [pseudo, setPseudo] = useState(getPseudoFromStorage)
  const [editPseudo, setEditPseudo] = useState(false)
  const [newPseudo, setNewPseudo] = useState('')

  // ─── FORUMS ───
  const [forums, setForums] = useState(() => {
    const s = localStorage.getItem('zonefree-forums')
    return s ? JSON.parse(s) : FORUMS_INIT
  })
  const [activeForum, setActiveForum] = useState(null)
  const [activeTopic, setActiveTopic] = useState(null)
  const [showNewSalon, setShowNewSalon] = useState(false)
  const [showNewTopic, setShowNewTopic] = useState(false)
  const [newSalon, setNewSalon] = useState({ emoji: '', name: '', description: '' })
  const [newTopic, setNewTopic] = useState({ title: '', content: '' })
  const [newReply, setNewReply] = useState('')
  const [recherche, setRecherche] = useState('')
  const [rechercheTopic, setRechercheTopic] = useState('')
  const [sortBy, setSortBy] = useState('date')
  const [currentPage, setCurrentPage] = useState(1)

  // ─── LIKES ───
  const [likes, setLikes] = useState(() => {
    const s = localStorage.getItem('zonefree-likes')
    return s ? JSON.parse(s) : {}
  })

  // ─── MESSAGERIE LOCALE ───
  const [messages, setMessages] = useState(() => {
    const s = localStorage.getItem('zonefree-messages')
    return s ? JSON.parse(s) : []
  })
  const [activeConversation, setActiveConversation] = useState(null)
  const [newMessage, setNewMessage] = useState('')
  const [newMessageTo, setNewMessageTo] = useState('')
  const [showNewConversation, setShowNewConversation] = useState(false)
  const imageInputRef = useRef(null)

  // ─── XMTP V3 ───
  const [xmtpClient, setXmtpClient] = useState(null)
  const [xmtpLoading, setXmtpLoading] = useState(false)
  const [xmtpError, setXmtpError] = useState(null)
  const [xmtpConversations, setXmtpConversations] = useState([])
  const [xmtpActiveConv, setXmtpActiveConv] = useState(null)
  const [xmtpMessages, setXmtpMessages] = useState([])

  // ─── IPFS / 4EVERLAND ───
  const [everlandJWT, seteverlandJWT] = useState(() => localStorage.getItem('zonefree-4EVERLAND-jwt') || '')
  const [neweverlandJWT, setNeweverlandJWT] = useState('')
  const [showJWTModal, setShowJWTModal] = useState(false)
  const [ipfsSaving, setIpfsSaving] = useState(false)
  const [ipfsCID, setIpfsCID] = useState(() => localStorage.getItem('zonefree-ipfs-cid') || null)
  const [ipfsStatus, setIpfsStatus] = useState(null)

  // ─── NOTIFICATIONS ───
  const [notifPermission, setNotifPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  )

  // ═══════════════════ EFFECTS ═══════════════════
  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    if (isConnected && address && address !== account) {
      setAccount(address)
      const provider = new ethers.BrowserProvider(walletProvider)
      verifierAbonnement(address, provider)
    }
    if (!isConnected && !address && account) {
      setAccount(null)
      setEstAbonne(false)
    }
    // Fallback MetaMask direct si AppKit ne détecte pas
    if (!isConnected && window.ethereum) {
      window.ethereum.request({ method: 'eth_accounts' }).then(accounts => {
        if (accounts.length > 0 && !account) {
          setAccount(accounts[0])
          const provider = new ethers.BrowserProvider(window.ethereum)
          verifierAbonnement(accounts[0], provider)
        }
      }).catch(() => {})
    }
  }, [isConnected, address])

  useEffect(() => {
    console.log('[XMTP DEBUG] useEffect check: account=', account, 'hasProvider=', !!(walletProvider || window.ethereum), 'xmtpClient=', !!xmtpClient, 'xmtpLoading=', xmtpLoading, 'xmtpError=', xmtpError)
    const hasProvider = walletProvider || window.ethereum
    if (account && hasProvider && !xmtpClient && !xmtpLoading && !xmtpError) {
      const timer = setTimeout(() => initXMTP(), 2500)
      return () => clearTimeout(timer)
    }
  }, [account, walletProvider])
  /* eslint-enable react-hooks/exhaustive-deps */

  useEffect(() => { localStorage.setItem('zonefree-forums', JSON.stringify(forums)) }, [forums])
  useEffect(() => {
    localStorage.setItem('zonefree-dark', JSON.stringify(dark))
    document.body.className = dark ? 'dark' : 'light'
  }, [dark])
  useEffect(() => { localStorage.setItem('zonefree-likes', JSON.stringify(likes)) }, [likes])
  useEffect(() => {
    try {
      const msgsSansImages = messages.map(conv => ({
        ...conv,
        msgs: conv.msgs.map(m => m.type === 'image' ? { ...m, content: '[image]' } : m)
      }))
      localStorage.setItem('zonefree-messages', JSON.stringify(msgsSansImages))
    } catch (e) {
      console.warn('localStorage plein', e)
    }
  }, [messages])
  useEffect(() => {
    localStorage.setItem('zonefree-pseudo', pseudo)
  }, [pseudo])
  useEffect(() => {
    if (everlandJWT) localStorage.setItem('zonefree-4EVERLAND-jwt', everlandJWT)
  }, [everlandJWT])

  // ═══════════════════ NOTIFICATIONS ═══════════════════
  const demanderNotifications = async () => {
    if (typeof Notification === 'undefined') {
      alert('Votre navigateur ne supporte pas les notifications.')
      return
    }
    try {
      const p = await Notification.requestPermission()
      setNotifPermission(p)
      if (p === 'granted') {
        new Notification('🔔 ZoneFree', { body: 'Notifications activées avec succès !', icon: '/favicon.ico' })
      } else {
        alert('Notifications refusées. Autorisez-les dans les paramètres du navigateur.')
      }
    } catch (e) {
      alert('Erreur notifications : ' + e.message)
    }
  }

  const envoyerNotif = (titre, corps) => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      try { new Notification(titre, { body: corps, icon: '/favicon.ico' }) } catch (e) {}
    }
  }

  // ═══════════════════ UNSTOPPABLE DOMAINS ═══════════════════
  const resoudreUD = async (address) => {
    if (!address) return null
    const endpoints = [
      `https://resolve.unstoppabledomains.com/reverse/${address.toLowerCase()}`,
      `https://api.unstoppabledomains.com/resolve/reverse/${address.toLowerCase()}`
    ]
    for (const url of endpoints) {
      try {
        const r = await fetch(url, { headers: { 'Accept': 'application/json' } })
        if (r.ok) {
          const d = await r.json()
          const domain = d?.meta?.domain || d?.data?.domain || null
          if (domain) return domain
        }
      } catch (e) {}
    }
    return null
  }

  const detecterUD = async () => {
    const addr = account || address
    if (!addr) { alert('Connectez votre wallet d\'abord !'); return }
    const domain = await resoudreUD(addr)
    if (domain) {
      setUdDomain(domain)
      alert(`✅ Domaine trouvé : ${domain}`)
    } else {
      alert(`Aucun domaine .x trouvé pour ce wallet.\n\nCela peut être normal si le domaine est récent ou si l'API UD est indisponible temporairement.`)
    }
  }

  // ═══════════════════ IPFS / 4EVERLAND ═══════════════════
  const sauvegarderIPFS = async () => {
    if (!everlandJWT) {
      alert('Configurez d\'abord votre 4EVERLAND JWT dans les paramètres !')
      setShowJWTModal(true)
      return
    }
    setIpfsSaving(true)
    setIpfsStatus(null)
    try {
      const data = { forums, updatedAt: Date.now(), version: '1.0' }
      const r = await fetch('https://api.4EVERLAND.cloud/pinning/pinJSONToIPFS', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${everlandJWT}`
        },
        body: JSON.stringify({
          pinataContent: data,
          pinataMetadata: { name: `ZoneFree-backup-${Date.now()}` }
        })
      })
      if (!r.ok) {
        const err = await r.json()
        throw new Error(err.error?.details || `HTTP ${r.status}`)
      }
      const res = await r.json()
      const cid = res.IpfsHash
      localStorage.setItem('zonefree-ipfs-cid', cid)
      setIpfsCID(cid)
      setIpfsStatus('success')
      envoyerNotif('💾 ZoneFree IPFS', `Sauvegarde réussie ! CID: ${cid.slice(0, 12)}...`)
      alert(`✅ Sauvegarde IPFS réussie !\nCID: ${cid}`)
    } catch (e) {
      setIpfsStatus('error')
      alert(`❌ Erreur IPFS 4EVERLAND :\n${e.message}\n\nVérifiez votre JWT 4EVERLAND.`)
    } finally {
      setIpfsSaving(false)
    }
  }

  const sauvegarderIPFSAuto = async (data) => {
    if (!everlandJWT) return null
    try {
      const r = await fetch('https://api.4EVERLAND.cloud/pinning/pinJSONToIPFS', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${everlandJWT}` },
        body: JSON.stringify({ pinataContent: data, pinataMetadata: { name: 'ZoneFree-' + Date.now() } })
      })
      if (!r.ok) return null
      const res = await r.json()
      localStorage.setItem('zonefree-ipfs-cid', res.IpfsHash)
      setIpfsCID(res.IpfsHash)
      return res.IpfsHash
    } catch (e) { return null }
  }

  // ═══════════════════ LIKES ═══════════════════
  const toggleLike = (key) => {
    if (!account) { alert('Connectez MetaMask pour liker !'); return }
    if (!estAbonne) { alert('Abonnement requis pour liker !'); return }
    const cur = likes[key] || { count: 0, likedBy: [] }
    const has = cur.likedBy.includes(account)
    setLikes({
      ...likes,
      [key]: {
        count: has ? cur.count - 1 : cur.count + 1,
        likedBy: has ? cur.likedBy.filter(a => a !== account) : [...cur.likedBy, account]
      }
    })
  }
  const getLike = (key) => {
    const l = likes[key] || { count: 0, likedBy: [] }
    return { count: l.count, hasLiked: l.likedBy.includes(account) }
  }

  // ═══════════════════ TRI ═══════════════════
  const sortTopics = (topics, forumId) => {
    const s = [...topics]
    if (sortBy === 'popular') return s.sort((a, b) => (likes[`${forumId}-${b.id}`]?.count || 0) - (likes[`${forumId}-${a.id}`]?.count || 0))
    if (sortBy === 'replies') return s.sort((a, b) => b.replies.length - a.replies.length)
    return s.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1
      if (!a.pinned && b.pinned) return 1
      return b.id - a.id
    })
  }

  // ═══════════════════ MESSAGERIE LOCALE ═══════════════════
  const getConvKey = (a, b) => [a, b].sort().join('-')

  const demarrerConversation = () => {
    if (!newMessageTo.trim()) { alert('Entrez une adresse !'); return }
    const addr = newMessageTo.trim()
    const key = getConvKey(shortAddr(account), addr)
    const existing = messages.find(m => m.key === key)
    if (existing) { setActiveConversation(existing) }
    else {
      const nc = { id: Date.now(), key, participants: [shortAddr(account), addr], msgs: [] }
      setMessages(prev => [...prev, nc])
      setActiveConversation(nc)
    }
    setShowNewConversation(false); setNewMessageTo(''); setPage('conversation')
  }

  const envoyerMessage = () => {
    if (!account || !estAbonne || !newMessage.trim() || !activeConversation) return
    const msg = {
      id: Date.now(),
      from: shortAddr(account),
      to: activeConversation.participants.find(p => p !== shortAddr(account)),
      content: newMessage, type: 'text',
      date: new Date().toLocaleDateString('fr-FR'),
      timestamp: Date.now(), read: false
    }
    const updated = { ...activeConversation, msgs: [...activeConversation.msgs, msg] }
    setMessages(prev => {
      const e = prev.find(c => c.key === activeConversation.key)
      if (!e) return [...prev, updated]
      return prev.map(c => c.key === activeConversation.key ? updated : c)
    })
    setActiveConversation(updated); setNewMessage('')
    envoyerNotif('✉️ ZoneFree', `Message envoyé à ${msg.to}`)
  }

  const envoyerImage = (e) => {
    const file = e.target.files[0]
    if (!file || !account || !estAbonne || !activeConversation) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const msg = {
        id: Date.now(),
        from: shortAddr(account),
        to: activeConversation.participants.find(p => p !== shortAddr(account)),
        content: ev.target.result, type: 'image',
        date: new Date().toLocaleDateString('fr-FR'),
        timestamp: Date.now(), read: false
      }
      const updated = { ...activeConversation, msgs: [...activeConversation.msgs, msg] }
      setMessages(prev => prev.map(c => c.key === activeConversation.key ? updated : c))
      setActiveConversation(updated)
    }
    reader.readAsDataURL(file)
  }

  const ouvrirConversation = (conv) => {
    const updated = messages.map(c => c.key === conv.key
      ? { ...c, msgs: c.msgs.map(m => m.to === shortAddr(account) ? { ...m, read: true } : m) }
      : c)
    setMessages(updated)
    setActiveConversation(updated.find(c => c.key === conv.key))
    setPage('conversation')
  }

  const unreadCount = account
    ? messages.reduce((t, c) => t + c.msgs.filter(m => m.to === shortAddr(account) && !m.read).length, 0)
    : 0

   // ═══════════════════ XMTP V3 ═══════════════════
  const initXMTP = async () => {
    if (!account) { alert('Connectez votre wallet d\'abord !'); return }
    const effectiveProvider = walletProvider || window.ethereum
    if (!effectiveProvider) { alert('Provider wallet introuvable. Reconnectez votre wallet.'); return }
    setXmtpLoading(true)
    setXmtpError(null)
    console.log('[XMTP DEBUG] 1. initXMTP démarré, account=', account, 'address=', address)
    console.log('[XMTP DEBUG] 2. effectiveProvider=', effectiveProvider ? 'OK' : 'NULL')
    try {
      const signerAddress = (address || account).toLowerCase()
      console.log('[XMTP DEBUG] 3. signerAddress=', signerAddress)

      const xmtpSigner = {
        getIdentifier: () => ({
          identifier: signerAddress,
          identifierKind: 0
        }),
        signMessage: async (msg) => {
          const message = typeof msg === 'string' ? msg : new TextDecoder().decode(msg)
          console.log('[XMTP DEBUG] signMessage appelé, msg length:', message.length)

          const sig = await effectiveProvider.request({
            method: 'personal_sign',
            params: [message, signerAddress]
          })
          console.log('XMTP: sig obtained:', sig.substring(0, 20))

          const sigHex = sig.startsWith('0x') ? sig.slice(2) : sig
          const sigBytes = new Uint8Array(sigHex.match(/.{1,2}/g).map(b => parseInt(b, 16)))
          console.log('XMTP: sigBytes length:', sigBytes.length)
          return sigBytes
        }
      }

      console.log('[XMTP DEBUG] 4. Appel Client.create...')
      const client = await Client.create(xmtpSigner, {
        env: 'production',
        dbEncryptionKey: new Uint8Array(32)
      })
      console.log('[XMTP DEBUG] 5. Client créé !', client)
      setXmtpClient(client)
      await client.conversations.sync()
      const convList = await client.conversations.list()
      setXmtpConversations(convList)
      envoyerNotif('🔐 XMTP V3 actif', 'Messagerie E2E activée !')
    } catch (e) {
      console.error('[XMTP DEBUG] ERREUR:', e)
      console.error('[XMTP DEBUG] ERREUR message:', e?.message)
      console.error('[XMTP DEBUG] ERREUR stack:', e?.stack)
      const msg = e?.message || String(e) || 'Erreur inconnue'
      setXmtpError(msg)
      alert(`XMTP non disponible.\n${msg}\n\nLa messagerie locale reste active.`)
    } finally {
      setXmtpLoading(false)
    }
  }

  const demarrerConversationXMTP = async () => {
    if (!xmtpClient || !newMessageTo.trim()) return
    try {
      const dm = await xmtpClient.conversations.findOrCreateDm({
        identifier: newMessageTo.trim().toLowerCase(),
        identifierKind: 'Ethereum'
      })
      setXmtpActiveConv(dm)
      await dm.sync()
      setXmtpMessages(await dm.messages())
      setShowNewConversation(false); setNewMessageTo(''); setPage('xmtp-conversation')
    } catch (e) {
      alert('Adresse invalide ou non enregistrée sur XMTP.\n' + e.message)
    }
  }

  const envoyerMessageXMTP = async () => {
    if (!xmtpActiveConv || !newMessage.trim()) return
    try {
      await xmtpActiveConv.sendText(newMessage.trim())
      setNewMessage('')
      await xmtpActiveConv.sync()
      setXmtpMessages(await xmtpActiveConv.messages())
    } catch (e) { alert('Erreur envoi XMTP: ' + e.message) }
  }

  const ouvrirConversationXMTP = async (conv) => {
    setXmtpActiveConv(conv)
    await conv.sync()
    setXmtpMessages(await conv.messages())
    setPage('xmtp-conversation')
  }

  // ═══════════════════ BLOCKCHAIN ═══════════════════
  const fetchPrix = async (provider) => {
    try {
      const contract = new ethers.Contract(CONTRACT_ADDRESS, ForumAboABI, provider)
      const prix = await contract.getPrixEnWei()
      setPrixETH(prix)
      try { const nb = await contract.totalAbonnes(); setTotalAbonnes(Number(nb)) } catch (e) {}
      try { const max = await contract.GRATUITS(); setMaxGratuit(Number(max)) } catch (e) {}
      return prix
    } catch (e) { console.error('Prix:', e); return null }
  }

  const verifierAbonnement = async (addr, prov) => {
    try {
      const provider = prov || new ethers.BrowserProvider(walletProvider || window.ethereum)
      const contract = new ethers.Contract(CONTRACT_ADDRESS, ForumAboABI, provider)
      const abonne = await contract.estAbonne(addr)
      setEstAbonne(abonne)
      const exp = await contract.abonnements(addr)
      if (Number(exp) > 0) setExpiration(new Date(Number(exp) * 1000))
      await fetchPrix(provider)
      const domain = await resoudreUD(addr)
      if (domain) setUdDomain(domain)
    } catch (e) { console.error('Abonnement:', e) }
  }

  const estGratuit = totalAbonnes !== null && totalAbonnes < maxGratuit

  const sAbonner = async () => {
    if (!account) { alert('Connectez votre wallet !'); return }
    try {
      setLoadingAbo(true)
      const provider = new ethers.BrowserProvider(walletProvider || window.ethereum)
      const signer = await provider.getSigner()
      const contract = new ethers.Contract(CONTRACT_ADDRESS, ForumAboABI, signer)
      const prixWei = estGratuit ? 0n : await contract.getPrixEnWei()
      const tx = await contract.sAbonner({ value: prixWei })
      await tx.wait()
      setEstAbonne(true)
      await verifierAbonnement(account)
      envoyerNotif('🎉 ZoneFree', 'Abonnement activé pour 30 jours !')
      alert(estGratuit
        ? '🎁 Abonnement GRATUIT activé ! Bienvenue Early Adopter !'
        : '✅ Abonnement activé pour 30 jours !')
    } catch (e) { alert('Erreur : ' + e.message) }
    finally { setLoadingAbo(false) }
  }

  // ═══════════════════ NAVIGATION ═══════════════════
  const openForum = (f) => { setActiveForum(f); setRechercheTopic(''); setCurrentPage(1); setSortBy('date'); setPage('forum') }
  const openTopic = (t) => { setActiveTopic(t); setPage('topic') }
  const goHome = () => { setPage('home'); setActiveForum(null); setActiveTopic(null); setRecherche('') }
  const goForum = () => { setPage('forum'); setActiveTopic(null) }
  const shortAddr = (addr) => addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : ''
  const displayName = (addr) => pseudo || udDomain || shortAddr(addr)
  const prixEnETH = prixETH ? parseFloat(ethers.formatEther(prixETH)).toFixed(6) : '...'

  // ═══════════════════ FORUM ACTIONS ═══════════════════
  const creerSalon = () => {
    if (!account) { alert('Connectez MetaMask !'); return }
    if (!estAbonne) { alert('Abonnement requis !'); return }
    if (!newSalon.name.trim()) { alert('Donnez un nom !'); return }
    const salon = {
      id: newSalon.name.toLowerCase().replace(/\s+/g, '-'),
      emoji: newSalon.emoji || '💬', name: newSalon.name,
      description: newSalon.description || 'Nouveau salon', topics: [],
      creator: account
    }
    setForums([...forums, salon]); setShowNewSalon(false); setNewSalon({ emoji: '', name: '', description: '' })
  }

  const creerTopic = async () => {
    if (!account) { alert('Connectez MetaMask !'); return }
    if (!estAbonne) { alert('Abonnement requis !'); return }
    if (!newTopic.title.trim()) { alert('Donnez un titre !'); return }
    const topic = {
      id: Date.now(), title: newTopic.title, content: newTopic.content,
      author: displayName(account), pinned: false, replies: [],
      date: new Date().toLocaleDateString('fr-FR')
    }
    const upd = forums.map(f => f.id === activeForum.id ? { ...f, topics: [topic, ...f.topics] } : f)
    setForums(upd); setActiveForum(upd.find(f => f.id === activeForum.id))
    setShowNewTopic(false); setNewTopic({ title: '', content: '' })
    await sauvegarderIPFSAuto({ forums: upd, updatedAt: Date.now() })
  }

  const posterReponse = async () => {
    if (!account) { alert('Connectez MetaMask !'); return }
    if (!estAbonne) { alert('Abonnement requis !'); return }
    if (!newReply.trim()) { alert('Écrivez un message !'); return }
    const reply = { id: Date.now(), author: displayName(account), content: newReply, date: new Date().toLocaleDateString('fr-FR') }
    const updTopic = { ...activeTopic, replies: [...activeTopic.replies, reply] }
    const upd = forums.map(f => f.id === activeForum.id
      ? { ...f, topics: f.topics.map(t => t.id === activeTopic.id ? updTopic : t) }
      : f)
    setForums(upd); setActiveForum(upd.find(f => f.id === activeForum.id))
    setActiveTopic(updTopic); setNewReply('')
    envoyerNotif('💬 Nouvelle réponse', `Dans : ${activeTopic.title}`)
    await sauvegarderIPFSAuto({ forums: upd, updatedAt: Date.now() })
  }

  const togglePin = (topicId) => {
    if (!estAbonne) return
    const upd = forums.map(f => f.id === activeForum.id
      ? { ...f, topics: f.topics.map(t => t.id === topicId ? { ...t, pinned: !t.pinned } : t) }
      : f)
    setForums(upd); setActiveForum(upd.find(f => f.id === activeForum.id))
  }

  const supprimerSalon = (forumId) => {
    if (!account || !estAbonne) return
    const salon = forums.find(f => f.id === forumId)
    if (!salon) return
    if (salon.creator && salon.creator !== account) {
      alert('Vous ne pouvez supprimer que vos propres salons.')
      return
    }
    if (!window.confirm(`Supprimer le salon "${salon.name}" ?`)) return
    setForums(forums.filter(f => f.id !== forumId))
    if (activeForum?.id === forumId) goHome()
  }

  // ═══════════════════ COMPUTED ═══════════════════
  const joursRestants = expiration
    ? Math.max(0, Math.ceil((expiration - new Date()) / (1000 * 60 * 60 * 24)))
    : 0

  const inputStyle = {
    display: 'block', width: '100%', padding: '10px 14px', borderRadius: 8,
    border: '1.5px solid #30363d', background: dark ? '#0d1117' : '#f8f9ff',
    color: dark ? '#e6edf3' : '#1a1a2e', fontSize: 15, marginBottom: 16,
    marginTop: 6, boxSizing: 'border-box', fontFamily: 'inherit'
  }

  const topicsBase = activeForum?.topics.filter(t =>
    t.title.toLowerCase().includes(rechercheTopic.toLowerCase()) ||
    t.author.toLowerCase().includes(rechercheTopic.toLowerCase())
  ) || []
  const topicsSorted = sortTopics(topicsBase, activeForum?.id)
  const totalPages = Math.ceil(topicsSorted.length / TOPICS_PAR_PAGE)
  const topicsPaginated = topicsSorted.slice((currentPage - 1) * TOPICS_PAR_PAGE, currentPage * TOPICS_PAR_PAGE)
  const forumsFiltered = forums.filter(f =>
    f.name.toLowerCase().includes(recherche.toLowerCase()) ||
    f.description.toLowerCase().includes(recherche.toLowerCase())
  )

  // ═══════════════════ RENDER ═══════════════════
  return (
    <div>

      {/* ══════════════ HEADER ══════════════ */}
      <header className="header">
        <div className="logo" onClick={goHome} style={{ cursor: 'pointer' }}>
          Zone<span>Free</span>
        </div>
        <div className="header-actions">
          <button className="btn btn-ghost" onClick={() => setDark(!dark)}>{dark ? '☀️' : '🌙'}</button>
          {account && (
            <button className="btn btn-ghost" onClick={() => setPage('messages')} style={{ position: 'relative', fontSize: 16 }}>
              ✉️
              {unreadCount > 0 && (
                <span style={{ position: 'absolute', top: -4, right: -4, background: '#ef4444', color: 'white', borderRadius: '50%', width: 18, height: 18, fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                  {unreadCount}
                </span>
              )}
            </button>
          )}
          <button className="btn btn-ghost" onClick={() => setPage('profil')} style={{ fontSize: 16 }}>👤</button>
          {account ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button className="btn btn-ghost" onClick={disconnectAll} title="Déconnecter" style={{ fontSize: 14, padding: '6px 10px' }}>
                ⏏️
              </button>
              <span className="wallet-addr">{udDomain || pseudo || shortAddr(account)}</span>
              {estAbonne
                ? <span className="badge-abonne">✓ Abonné</span>
                : <button className="btn btn-primary" onClick={sAbonner} style={{ fontSize: 13, padding: '6px 14px' }} disabled={loadingAbo}>
                    {loadingAbo ? <span className="spinner">Transaction...</span> : estGratuit ? '🎁 Gratuit !' : `S'abonner ${prixEnETH} ETH`}
                  </button>
              }
            </div>
          ) : (
            <button className="btn btn-wallet" onClick={() => openModal({ view: 'Connect' })}>
              {isConnected ? shortAddr(address) : 'Connecter'}
            </button>

          )}
        </div>
      </header>

      {/* ══════════════ BANNIÈRE 300 GRATUITS ══════════════ */}
      {account && !estAbonne && estGratuit && !['profil', 'messages', 'conversation', 'xmtp-conversation'].includes(page) && (
        <div style={{ background: 'linear-gradient(90deg,#22c55e22,#6366f122)', border: '1.5px solid #22c55e', borderRadius: 12, margin: '16px auto', maxWidth: 860, padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <p style={{ margin: 0, fontSize: 14 }}>
            🎁 <strong>Early Adopter !</strong> {maxGratuit - totalAbonnes} places gratuites restantes ({totalAbonnes}/{maxGratuit})
          </p>
          <button className="btn btn-primary" onClick={sAbonner} disabled={loadingAbo} style={{ fontSize: 13, padding: '8px 20px', background: '#22c55e' }}>
            {loadingAbo ? <span className="spinner">Transaction...</span> : '🎁 Rejoindre GRATUITEMENT'}
          </button>
        </div>
      )}

      {/* ══════════════ BANNIÈRE ABONNEMENT PAYANT ══════════════ */}
      {account && !estAbonne && !estGratuit && !['profil', 'messages', 'conversation', 'xmtp-conversation'].includes(page) && (
        <div style={{ background: 'linear-gradient(90deg,#f59e0b22,#6366f122)', border: '1.5px solid #f59e0b', borderRadius: 12, margin: '16px auto', maxWidth: 860, padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <p style={{ margin: 0, fontSize: 14 }}><strong>Vous n'êtes pas abonné.</strong> Rejoignez ZoneFree pour ~2€/mois en ETH.</p>
          <button className="btn btn-primary" onClick={sAbonner} disabled={loadingAbo} style={{ fontSize: 13, padding: '8px 20px' }}>
            {loadingAbo ? <span className="spinner">Transaction...</span> : `S'abonner ${prixEnETH} ETH — 30 jours`}
          </button>
        </div>
      )}

      {/* ══════════════ PAGE MESSAGES ══════════════ */}
      {page === 'messages' && account && (
        <div className="forum-page">
          <button className="back-btn" onClick={goHome}>← Retour à l'accueil</button>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <h2 style={{ fontSize: 22 }}>✉️ Messagerie {xmtpClient ? '🔐 XMTP E2E' : 'locale'}</h2>
            <div style={{ display: 'flex', gap: 8 }}>
              {!xmtpClient && (
                <button className="btn btn-ghost" onClick={initXMTP} disabled={xmtpLoading} style={{ fontSize: 12 }}>
                  {xmtpLoading ? <span className="spinner">Connexion...</span> : '🔐 Activer XMTP'}
                </button>
              )}
              <button className="btn btn-primary" onClick={() => setShowNewConversation(true)}>+ Nouveau</button>
            </div>
          </div>

          {xmtpError && (
            <div style={{ background: '#ef444411', border: '1.5px solid #ef444444', borderRadius: 10, padding: '10px 16px', marginBottom: 16, fontSize: 13, color: '#ef4444' }}>
              ⚠️ XMTP : {xmtpError}
            </div>
          )}

          <div style={{ background: xmtpClient ? '#22c55e11' : '#6366f111', border: `1.5px solid ${xmtpClient ? '#22c55e44' : '#6366f133'}`, borderRadius: 10, padding: '10px 16px', marginBottom: 20, fontSize: 13 }}>
            {xmtpClient
              ? '🔐 Chiffrement MLS E2E actif via XMTP V3 — Messages sur réseau décentralisé'
              : '💾 Messages stockés localement — Cliquez "Activer XMTP" pour E2E réel'}
          </div>

          {xmtpClient && xmtpConversations.length > 0 && (
            <div className="messages-list">
              {xmtpConversations.map((conv, i) => (
                <div key={i} className="conversation-item" onClick={() => ouvrirConversationXMTP(conv)}>
                  <div className="conv-avatar">🔐</div>
                  <div className="conv-info">
                    <div className="conv-addr" style={{ fontFamily: 'monospace', fontSize: 13 }}>{conv.peerInboxId?.slice(0, 16)}...</div>
                    <div className="conv-preview">Message chiffré E2E</div>
                  </div>
                  <div style={{ fontSize: 10, opacity: 0.5 }}>XMTP</div>
                </div>
              ))}
            </div>
          )}

          {!xmtpClient && (
            messages.length === 0
              ? <div className="no-results" style={{ textAlign: 'center', padding: 40 }}>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>✉️</div>
                  <p style={{ opacity: 0.5 }}>Aucun message. Démarrez une conversation !</p>
                </div>
              : <div className="messages-list">
                  {messages.map(conv => {
                    const other = conv.participants.find(p => p !== shortAddr(account)) || conv.participants[0]
                    const lastMsg = conv.msgs[conv.msgs.length - 1]
                    const unread = conv.msgs.filter(m => m.to === shortAddr(account) && !m.read).length
                    return (
                      <div key={conv.id} className="conversation-item" onClick={() => ouvrirConversation(conv)}>
                        <div className="conv-avatar">💬</div>
                        <div className="conv-info">
                          <div className="conv-addr">{other}</div>
                          <div className="conv-preview">{lastMsg ? (lastMsg.type === 'image' ? '📷 Image' : lastMsg.content) : 'Démarrer la conversation...'}</div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                          {lastMsg && <div className="conv-time">{lastMsg.date}</div>}
                          {unread > 0 && <div className="unread-badge">{unread}</div>}
                        </div>
                      </div>
                    )
                  })}
                </div>
          )}

          {showNewConversation && (
            <div style={{ position: 'fixed', inset: 0, background: '#0008', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
              <div style={{ background: dark ? '#161b22' : 'white', borderRadius: 16, padding: 32, width: 440, border: '1.5px solid #6366f1' }}>
                <h2 style={{ marginBottom: 8, color: '#6366f1' }}>✉️ Nouveau message</h2>
                {xmtpClient && <p style={{ fontSize: 13, opacity: 0.6, marginBottom: 16 }}>XMTP : entrez l'adresse <strong>complète</strong> 0x... du destinataire</p>}
                <label style={{ fontSize: 13, opacity: 0.7 }}>Adresse du destinataire</label>
                <input value={newMessageTo} onChange={e => setNewMessageTo(e.target.value)} style={inputStyle} placeholder="0x... ou 0xABCD...1234" />
                <div style={{ display: 'flex', gap: 12 }}>
                  <button className="btn btn-primary" onClick={xmtpClient ? demarrerConversationXMTP : demarrerConversation} style={{ flex: 1 }}>Démarrer</button>
                  <button className="btn btn-ghost" onClick={() => setShowNewConversation(false)} style={{ flex: 1 }}>Annuler</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════ PAGE CONVERSATION LOCALE ══════════════ */}
      {page === 'conversation' && activeConversation && account && (
        <div className="forum-page" style={{ padding: 0 }}>
          <div style={{ padding: '16px 24px', borderBottom: '1.5px solid #30363d', display: 'flex', alignItems: 'center', gap: 16 }}>
            <button className="back-btn" style={{ margin: 0 }} onClick={() => setPage('messages')}>←</button>
            <div className="conv-avatar" style={{ width: 36, height: 36, fontSize: 14 }}>💬</div>
            <div style={{ fontWeight: 700 }}>{activeConversation.participants.find(p => p !== shortAddr(account))}</div>
            <div style={{ marginLeft: 'auto', fontSize: 12, opacity: 0.5 }}>🔒 Local</div>
          </div>
          <div className="chat-container" style={{ minHeight: 400, maxHeight: 500, overflowY: 'auto' }}>
            {activeConversation.msgs.length === 0 && <div style={{ textAlign: 'center', opacity: 0.4, marginTop: 40 }}>Aucun message — Dites bonjour ! 👋</div>}
            {activeConversation.msgs.map(m => {
              const isSent = m.from === shortAddr(account)
              return (
                <div key={m.id} className={`bubble-wrapper ${isSent ? 'sent' : 'received'}`}>
                  {m.type === 'image'
                    ? <img src={m.content} alt="img" style={{ maxWidth: 240, borderRadius: 12 }} />
                    : <div className={`bubble ${isSent ? 'sent' : 'received'}`}>{m.content}</div>
                  }
                  <div className="bubble-time">{m.date}</div>
                  {isSent && (
                    <button onClick={() => {
                      const updatedMsgs = activeConversation.msgs.filter(msg => msg.id !== m.id)
                      const updatedConv = { ...activeConversation, msgs: updatedMsgs }
                      setMessages(prev => prev.map(c => c.key === activeConversation.key ? updatedConv : c))
                      setActiveConversation(updatedConv)
                    }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 10, opacity: 0.5, marginTop: 2 }}>🗑️</button>
                  )}
                </div>
              )
            })}
          </div>
          <div className="message-input-bar">
            {!estAbonne
              ? <p style={{ color: '#f59e0b', fontSize: 14, margin: 0 }}>Abonnement requis pour envoyer</p>
              : <>
                  <textarea className="message-input" rows={1} value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); envoyerMessage() } }}
                    placeholder="Écrire un message... (Entrée pour envoyer)" />
                  <input type="file" accept="image/*" ref={imageInputRef} style={{ display: 'none' }} onChange={envoyerImage} />
                  <button className="btn btn-ghost" onClick={() => imageInputRef.current?.click()} style={{ fontSize: 18, padding: '8px 10px' }}>📷</button>
                  <button className="send-btn" onClick={envoyerMessage} disabled={!newMessage.trim()}>➤</button>
                </>
            }
          </div>
        </div>
      )}

      {/* ══════════════ PAGE CONVERSATION XMTP ══════════════ */}
      {page === 'xmtp-conversation' && xmtpActiveConv && (
        <div className="forum-page" style={{ padding: 0 }}>
          <div style={{ padding: '16px 24px', borderBottom: '1.5px solid #30363d', display: 'flex', alignItems: 'center', gap: 16 }}>
            <button className="back-btn" style={{ margin: 0 }} onClick={() => setPage('messages')}>←</button>
            <div className="conv-avatar" style={{ width: 36, height: 36, fontSize: 14 }}>🔐</div>
            <div style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: 13 }}>{xmtpActiveConv.peerInboxId?.slice(0, 20)}...</div>
            <div style={{ marginLeft: 'auto', fontSize: 12, background: '#22c55e22', color: '#22c55e', border: '1px solid #22c55e44', borderRadius: 20, padding: '3px 10px' }}>🔐 E2E Chiffré</div>
          </div>
          <div className="chat-container" style={{ minHeight: 400, maxHeight: 500, overflowY: 'auto' }}>
            {xmtpMessages.length === 0 && <div style={{ textAlign: 'center', opacity: 0.4, marginTop: 40 }}>Aucun message — Dites bonjour ! 👋</div>}
            {xmtpMessages.map((msg, i) => {
              const isSent = msg.senderInboxId === xmtpClient?.inboxId
              return (
                <div key={i} className={`bubble-wrapper ${isSent ? 'sent' : 'received'}`}>
                  <div className={`bubble ${isSent ? 'sent' : 'received'}`}>
                    {typeof msg.content === 'string' ? msg.content : '📎 Contenu non supporté'}
                  </div>
                  <div className="bubble-time">
                    {msg.sentAtNs ? new Date(Number(msg.sentAtNs) / 1000000).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''}
                  </div>
                </div>
              )
            })}
          </div>
          <div className="message-input-bar">
            {!estAbonne
              ? <p style={{ color: '#f59e0b', fontSize: 14, margin: 0 }}>Abonnement requis pour envoyer</p>
              : <>
                  <textarea className="message-input" rows={1} value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); envoyerMessageXMTP() } }}
                    placeholder="Message chiffré E2E... (Entrée pour envoyer)" />
                  <button className="send-btn" onClick={envoyerMessageXMTP} disabled={!newMessage.trim()}>➤</button>
                </>
            }
          </div>
        </div>
      )}

      {/* ══════════════ PAGE PROFIL ══════════════ */}
      {page === 'profil' && account && (
        <div className="forum-page">
          <button className="back-btn" onClick={goHome}>← Retour à l'accueil</button>

          {/* CARTE IDENTITÉ */}
          <div style={{ borderRadius: 20, padding: 36, marginBottom: 24, background: dark ? '#161b22' : '#ffffff', border: '1.5px solid #6366f1', textAlign: 'center' }}>
            <div style={{ fontSize: 64, marginBottom: 12 }}>🦊</div>
            {editPseudo ? (
              <div style={{ marginBottom: 16 }}>
                <input value={newPseudo} onChange={e => setNewPseudo(e.target.value)}
                  style={{ ...inputStyle, textAlign: 'center', fontWeight: 700, fontSize: 18 }}
                  placeholder="Votre pseudo..." autoFocus />
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                  <button className="btn btn-primary" onClick={() => {
                    const clean = newPseudo.trim()
                    setPseudo(clean)
                    localStorage.setItem('zonefree-pseudo', clean)
                    setEditPseudo(false)
                  }}>✓ Sauvegarder</button>
                  <button className="btn btn-ghost" onClick={() => setEditPseudo(false)}>Annuler</button>
                </div>
              </div>
            ) : (
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 22, fontWeight: 700 }}>{pseudo || udDomain || shortAddr(account)}</div>
                <button className="btn btn-ghost" onClick={() => { setNewPseudo(pseudo); setEditPseudo(true) }}
                  style={{ fontSize: 12, marginTop: 8, opacity: 0.7 }}>
                  ✏️ Modifier le pseudo
                </button>
              </div>
            )}
            {udDomain && <div style={{ fontSize: 13, color: '#6366f1', marginBottom: 8 }}>🌐 {udDomain}</div>}
            <div style={{ fontSize: 12, opacity: 0.4, marginBottom: 20, fontFamily: 'monospace' }}>{account}</div>
            {estAbonne
              ? <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#22c55e22', border: '1.5px solid #22c55e', borderRadius: 20, padding: '8px 20px' }}>
                  <span>✅</span><span style={{ color: '#22c55e', fontWeight: 700 }}>Abonné actif</span>
                </div>
              : <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#f59e0b22', border: '1.5px solid #f59e0b', borderRadius: 20, padding: '8px 20px' }}>
                  <span>⚠️</span><span style={{ color: '#f59e0b', fontWeight: 700 }}>Non abonné</span>
                </div>
            }
          </div>

          {/* PRIX */}
          <div style={{ borderRadius: 16, padding: 20, marginBottom: 24, background: dark ? '#161b22' : '#ffffff', border: '1.5px solid #6366f1', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 12, opacity: 0.5, marginBottom: 4 }}>PRIX ABONNEMENT (Chainlink)</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#6366f1' }}>{estGratuit ? '🎁 GRATUIT' : `${prixEnETH} ETH`}</div>
              <div style={{ fontSize: 13, opacity: 0.6 }}>~2,00 EUR / 30 jours</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 40 }}>{estGratuit ? '🎁' : '⟠'}</div>
              {totalAbonnes !== null && (
                <div style={{ fontSize: 12, color: estGratuit ? '#22c55e' : '#6366f1', fontWeight: 700 }}>
                  {totalAbonnes}/{maxGratuit} abonnés
                </div>
              )}
            </div>
          </div>

          {/* DÉTAILS */}
          <div style={{ borderRadius: 16, padding: 28, marginBottom: 24, background: dark ? '#161b22' : '#ffffff', border: '1.5px solid', borderColor: dark ? '#30363d' : '#e2e8f0' }}>
            <h3 style={{ marginBottom: 20 }}>📋 Détails abonnement</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {[
                { label: 'STATUT', value: estAbonne ? 'Actif' : 'Inactif', color: estAbonne ? '#22c55e' : '#f59e0b' },
                { label: 'JOURS RESTANTS', value: estAbonne ? `${joursRestants} jours` : '—', color: joursRestants > 7 ? '#22c55e' : '#f59e0b' },
                { label: 'EXPIRATION', value: expiration ? expiration.toLocaleDateString('fr-FR') : '—', color: null },
                { label: 'PRIX', value: estGratuit ? 'GRATUIT 🎁' : `${prixEnETH} ETH`, color: '#6366f1' }
              ].map((item, i) => (
                <div key={i} style={{ borderRadius: 12, padding: 20, background: dark ? '#0d1117' : '#f8f9ff', border: '1.5px solid', borderColor: dark ? '#30363d' : '#e2e8f0' }}>
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

          {/* STATISTIQUES */}
          <div style={{ borderRadius: 16, padding: 28, marginBottom: 24, background: dark ? '#161b22' : '#ffffff', border: '1.5px solid', borderColor: dark ? '#30363d' : '#e2e8f0' }}>
            <h3 style={{ marginBottom: 20 }}>📊 Mes statistiques</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
              {[
                { label: 'Topics créés', value: forums.reduce((a, f) => a + f.topics.filter(t => t.author === displayName(account)).length, 0), icon: '📝' },
                { label: 'Réponses', value: forums.reduce((a, f) => a + f.topics.reduce((b, t) => b + t.replies.filter(r => r.author === displayName(account)).length, 0), 0), icon: '💬' },
                { label: 'Messages', value: messages.reduce((a, c) => a + c.msgs.filter(m => m.from === shortAddr(account)).length, 0), icon: '✉️' }
              ].map((stat, i) => (
                <div key={i} style={{ borderRadius: 12, padding: 20, textAlign: 'center', background: dark ? '#0d1117' : '#f8f9ff', border: '1.5px solid', borderColor: dark ? '#30363d' : '#e2e8f0' }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>{stat.icon}</div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: '#6366f1' }}>{stat.value}</div>
                  <div style={{ fontSize: 12, opacity: 0.6, marginTop: 4 }}>{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* PARAMÈTRES AVANCÉS */}
          <div style={{ borderRadius: 16, padding: 28, marginBottom: 24, background: dark ? '#161b22' : '#ffffff', border: '1.5px solid', borderColor: dark ? '#30363d' : '#e2e8f0' }}>
            <h3 style={{ marginBottom: 24 }}>⚙️ Paramètres avancés</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* 🔔 NOTIFICATIONS */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderRadius: 12, background: dark ? '#0d1117' : '#f8f9ff', border: '1.5px solid', borderColor: dark ? '#30363d' : '#e2e8f0' }}>
                <div>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>🔔 Notifications</div>
                  <div style={{ fontSize: 12, opacity: 0.6 }}>Alertes réponses & messages</div>
                </div>
                {notifPermission === 'granted'
                  ? <span style={{ fontSize: 13, color: '#22c55e', fontWeight: 700, background: '#22c55e22', border: '1px solid #22c55e44', borderRadius: 20, padding: '6px 14px' }}>✅ Activées</span>
                  : notifPermission === 'denied'
                    ? <span style={{ fontSize: 12, color: '#ef4444', background: '#ef444411', border: '1px solid #ef444444', borderRadius: 20, padding: '6px 14px' }}>🚫 Bloquées (navigateur)</span>
                    : <button className="btn btn-primary" onClick={demanderNotifications} style={{ fontSize: 13, padding: '8px 18px' }}>Activer</button>
                }
              </div>

              {/* 💾 IPFS 4EVERLAND */}
              <div style={{ padding: '16px 20px', borderRadius: 12, background: dark ? '#0d1117' : '#f8f9ff', border: '1.5px solid', borderColor: dark ? '#30363d' : '#e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>💾 IPFS Backup (4EVERLAND)</div>
                    <div style={{ fontSize: 12, opacity: 0.6 }}>
                      {everlandJWT
                        ? ipfsCID ? `✅ Dernier CID : ${ipfsCID.slice(0, 14)}...` : 'JWT configuré — prêt à sauvegarder'
                        : 'Configurez votre 4EVERLAND JWT'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-ghost" onClick={() => { setNeweverlandJWT(everlandJWT); setShowJWTModal(true) }} style={{ fontSize: 12 }}>
                      {everlandJWT ? '✏️ Modifier JWT' : '🔑 Configurer'}
                    </button>
                    {everlandJWT && (
                      <button className="btn btn-primary" onClick={sauvegarderIPFS} disabled={ipfsSaving} style={{ fontSize: 12, padding: '6px 14px' }}>
                        {ipfsSaving ? '⏳ Envoi...' : '📤 Sauvegarder'}
                      </button>
                    )}
                  </div>
                </div>
                {ipfsStatus === 'success' && <div style={{ marginTop: 8, fontSize: 12, color: '#22c55e' }}>✅ Sauvegarde IPFS réussie !</div>}
                {ipfsStatus === 'error' && <div style={{ marginTop: 8, fontSize: 12, color: '#ef4444' }}>❌ Échec — vérifiez votre JWT 4EVERLAND</div>}
              </div>

              {/* 🔐 XMTP */}
              <div style={{ padding: '16px 20px', borderRadius: 12, background: dark ? '#0d1117' : '#f8f9ff', border: '1.5px solid', borderColor: dark ? '#30363d' : '#e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>🔐 XMTP V3 E2E</div>
                    <div style={{ fontSize: 12, opacity: 0.6 }}>
                      {xmtpClient ? 'Messagerie chiffrée MLS active' : xmtpError ? `Erreur : ${xmtpError.slice(0, 40)}...` : 'Messagerie chiffrée de bout en bout'}
                    </div>
                  </div>
                  {xmtpClient
                    ? <span style={{ fontSize: 13, color: '#22c55e', fontWeight: 700, background: '#22c55e22', border: '1px solid #22c55e44', borderRadius: 20, padding: '6px 14px' }}>✅ Actif</span>
                    : <button className="btn btn-primary" onClick={initXMTP} disabled={xmtpLoading} style={{ fontSize: 13, padding: '8px 18px' }}>
                        {xmtpLoading ? <span className="spinner">Connexion...</span> : 'Activer'}
                      </button>
                  }
                </div>
              </div>

              {/* 🌐 UNSTOPPABLE DOMAIN */}
              <div style={{ padding: '16px 20px', borderRadius: 12, background: dark ? '#0d1117' : '#f8f9ff', border: '1.5px solid', borderColor: dark ? '#30363d' : '#e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>🌐 Unstoppable Domain</div>
                    <div style={{ fontSize: 12, opacity: 0.6 }}>
                      {udDomain
                        ? <span style={{ color: '#6366f1', fontWeight: 700 }}>{udDomain}</span>
                        : 'Aucun domaine .x détecté pour ce wallet'}
                    </div>
                  </div>
                  <button className="btn btn-ghost" onClick={detecterUD} style={{ fontSize: 13, padding: '8px 18px' }}>
                    🔍 Détecter
                  </button>
                </div>
              </div>

            </div>
          </div>

          {!estAbonne && (
            <div style={{ textAlign: 'center', marginTop: 8 }}>
              <button className="btn btn-primary" onClick={sAbonner} disabled={loadingAbo} style={{ fontSize: 16, padding: '14px 36px' }}>
                {loadingAbo ? <span className="spinner">Transaction...</span> : estGratuit ? '🎁 Rejoindre GRATUITEMENT' : `S'abonner ${prixEnETH} ETH ~2€/mois`}
              </button>
            </div>
          )}
          <div style={{ textAlign: 'center', marginTop: 24, opacity: 0.5, fontSize: 13 }}>
            <a href={`https://etherscan.io/address/${account}`} target="_blank" rel="noreferrer" style={{ color: '#6366f1' }}>
              Voir sur Etherscan Mainnet
            </a>
          </div>
        </div>
      )}

      {/* ══════════════ PAGE HOME ══════════════ */}
      {page === 'home' && (
        <div>
          <div className="hero">
            <div className="badge">Décentralisé • Libre • Privé</div>
            <h1>Bienvenue sur <span>Zone Free</span></h1>
            <p>Le forum décentralisé où la parole est libre. Abonnement sécurisé par Ethereum.</p>
            {estGratuit && totalAbonnes !== null && (
              <div style={{ fontSize: 13, color: '#22c55e', marginTop: 8, fontWeight: 600 }}>
                🎁 {maxGratuit - totalAbonnes} places gratuites restantes !
              </div>
            )}
          </div>
          <div className="search-container">
            <span className="search-icon">🔍</span>
            <input className="search-input" placeholder="Rechercher un salon..." value={recherche} onChange={e => setRecherche(e.target.value)} />
            {recherche && <button className="search-clear" onClick={() => setRecherche('')}>✕</button>}
          </div>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <button className="btn btn-primary" onClick={() => setShowNewSalon(true)} style={{ fontSize: 16, padding: '12px 28px' }}>
              + Créer un nouveau salon
            </button>
          </div>
          {forumsFiltered.length === 0
            ? <div className="no-results"><span>🔍</span><p>Aucun salon trouvé pour <strong>{recherche}</strong></p></div>
            : <div className="forums-grid">
                {forumsFiltered.map(f => (
                  <div key={f.id} className="forum-card" onClick={() => openForum(f)}>
                    <div className="forum-emoji">{f.emoji}</div>
                    <div className="forum-name">{f.name}</div>
                    <div className="forum-desc">{f.description}</div>
                    <div className="forum-meta">
                      <span>{f.topics.length} topics</span>
                      <span>{f.topics.reduce((a, t) => a + t.replies.length, 0)} réponses</span>
                      {f.topics.some(t => t.pinned) && <span>📌</span>}
                    </div>
                    {account && estAbonne && f.creator === account && (
                      <button onClick={e => { e.stopPropagation(); supprimerSalon(f.id) }}
                        style={{ marginTop: 8, fontSize: 11, color: '#ef4444', background: 'none', border: '1px solid #ef444444', borderRadius: 6, padding: '3px 10px', cursor: 'pointer' }}>
                        🗑️ Supprimer
                      </button>
                    )}
                  </div>
                ))}
              </div>
          }
        </div>
      )}

      {/* ══════════════ PAGE FORUM ══════════════ */}
      {page === 'forum' && activeForum && (
        <div className="forum-page">
          <button className="back-btn" onClick={goHome}>← Retour aux forums</button>
          <div className="forum-header">
            <h2>{activeForum.emoji} {activeForum.name}</h2>
            <p style={{ opacity: 0.6, marginTop: 6 }}>{activeForum.description}</p>
            <button className="new-topic-btn" onClick={() => setShowNewTopic(true)}>+ Nouveau topic</button>
          </div>
          <div className="search-container" style={{ margin: '0 0 16px' }}>
            <span className="search-icon">🔍</span>
            <input className="search-input" placeholder="Rechercher un topic..." value={rechercheTopic} onChange={e => { setRechercheTopic(e.target.value); setCurrentPage(1) }} />
            {rechercheTopic && <button className="search-clear" onClick={() => setRechercheTopic('')}>✕</button>}
          </div>
          <div className="sort-bar">
            <span style={{ fontSize: 13, opacity: 0.6 }}>Trier par </span>
            {[['date', 'Plus récents'], ['popular', 'Populaires'], ['replies', 'Plus de réponses']].map(([val, label]) => (
              <button key={val} className={`sort-btn ${sortBy === val ? 'active' : ''}`} onClick={() => { setSortBy(val); setCurrentPage(1) }}>{label}</button>
            ))}
          </div>
          {topicsPaginated.length === 0
            ? <div className="no-results"><span>🔍</span><p>Aucun topic trouvé.</p></div>
            : topicsPaginated.map(t => {
                const likeKey = `${activeForum.id}-${t.id}`
                const { count, hasLiked } = getLike(likeKey)
                return (
                  <div key={t.id} className="topic-card" onClick={() => openTopic(t)}>
                    <div style={{ flex: 1 }}>
                      <div className="topic-title">
                        {t.pinned && <span style={{ marginRight: 6 }}>📌</span>}
                        {t.title}
                      </div>
                      <div className="topic-meta">par {t.author} · {t.date}</div>
                      <div style={{ marginTop: 8 }} onClick={e => e.stopPropagation()}>
                        <button className={`like-btn ${hasLiked ? 'liked' : ''}`} onClick={() => toggleLike(likeKey)}>
                          ❤️ {count > 0 ? count : ''} J'aime
                        </button>
                        {estAbonne && (
                          <button className="like-btn" onClick={e => { e.stopPropagation(); togglePin(t.id) }} style={{ marginLeft: 8, opacity: 0.7 }}>
                            {t.pinned ? '📌 Désépingler' : '📌 Épingler'}
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="topic-replies">{t.replies.length}</div>
                  </div>
                )
              })
          }
          {totalPages > 1 && (
            <div className="pagination">
              <button className="page-btn" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>←</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                <button key={n} className={`page-btn ${currentPage === n ? 'active' : ''}`} onClick={() => setCurrentPage(n)}>{n}</button>
              ))}
              <button className="page-btn" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>→</button>
            </div>
          )}
        </div>
      )}

      {/* ══════════════ PAGE TOPIC ══════════════ */}
      {page === 'topic' && activeTopic && (
        <div className="forum-page">
          <button className="back-btn" onClick={goForum}>← Retour {activeForum?.emoji} {activeForum?.name}</button>
          <div style={{ borderRadius: 14, padding: 28, marginBottom: 24, background: dark ? '#161b22' : '#ffffff', border: '1.5px solid #6366f1' }}>
            <h2 style={{ fontSize: 22, marginBottom: 12 }}>
              {activeTopic.pinned && <span style={{ marginRight: 8 }}>📌</span>}
              {activeTopic.title}
            </h2>
            <p style={{ opacity: 0.5, fontSize: 13, marginBottom: 16 }}>par <strong>{activeTopic.author}</strong> · {activeTopic.date}</p>
            {activeTopic.content && <p style={{ fontSize: 15, lineHeight: 1.7 }}>{activeTopic.content}</p>}
            <div style={{ marginTop: 16 }}>
              <button className={`like-btn ${getLike(`${activeForum?.id}-${activeTopic.id}`).hasLiked ? 'liked' : ''}`} onClick={() => toggleLike(`${activeForum?.id}-${activeTopic.id}`)}>
                ❤️ {getLike(`${activeForum?.id}-${activeTopic.id}`).count || ''} J'aime
              </button>
            </div>
          </div>
          <h3 style={{ marginBottom: 16, opacity: 0.7 }}>
            {activeTopic.replies.length} réponse{activeTopic.replies.length !== 1 ? 's' : ''}
          </h3>
          {activeTopic.replies.map(r => (
            <div key={r.id} style={{ borderRadius: 12, padding: '16px 20px', marginBottom: 12, background: dark ? '#161b22' : '#ffffff', border: '1.5px solid', borderColor: dark ? '#30363d' : '#e2e8f0' }}>
              <p style={{ fontSize: 13, opacity: 0.5, marginBottom: 8 }}><strong>{r.author}</strong> · {r.date}</p>
              <p style={{ fontSize: 15, lineHeight: 1.6 }}>{r.content}</p>
              <button className={`like-btn ${getLike(`reply-${r.id}`).hasLiked ? 'liked' : ''}`} style={{ marginTop: 8 }} onClick={() => toggleLike(`reply-${r.id}`)}>
                ❤️ {getLike(`reply-${r.id}`).count || ''} J'aime
              </button>
            </div>
          ))}
          <div style={{ borderRadius: 14, padding: 24, marginTop: 24, background: dark ? '#161b22' : '#ffffff', border: '1.5px solid', borderColor: dark ? '#30363d' : '#e2e8f0' }}>
            <h3 style={{ marginBottom: 16 }}>✍️ Votre réponse</h3>
            {!account && <p style={{ opacity: 0.6, marginBottom: 12, fontSize: 14 }}>Connectez MetaMask pour répondre</p>}
            {account && !estAbonne && <p style={{ color: '#f59e0b', marginBottom: 12, fontSize: 14 }}>Abonnez-vous pour répondre</p>}
            <textarea value={newReply} onChange={e => setNewReply(e.target.value)} placeholder="Écrivez votre réponse..." rows={4}
              style={{ ...inputStyle, resize: 'vertical' }} disabled={!estAbonne} />
            <button className="btn btn-primary" onClick={posterReponse} style={{ padding: '12px 28px' }} disabled={!estAbonne || !account}>
              Poster la réponse
            </button>
          </div>
        </div>
      )}

      {/* ══════════════ MODAL NOUVEAU SALON ══════════════ */}
      {showNewSalon && (
        <div style={{ position: 'fixed', inset: 0, background: '#0008', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div style={{ background: dark ? '#161b22' : 'white', borderRadius: 16, padding: 32, width: 420, border: '1.5px solid #6366f1' }}>
            <h2 style={{ marginBottom: 24, color: '#6366f1' }}>✨ Nouveau salon</h2>
            <label style={{ fontSize: 13, opacity: 0.7 }}>Emoji</label>
            <input value={newSalon.emoji} onChange={e => setNewSalon({ ...newSalon, emoji: e.target.value })} style={inputStyle} placeholder="💡" />
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

      {/* ══════════════ MODAL NOUVEAU TOPIC ══════════════ */}
      {showNewTopic && (
        <div style={{ position: 'fixed', inset: 0, background: '#0008', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div style={{ background: dark ? '#161b22' : 'white', borderRadius: 16, padding: 32, width: 500, border: '1.5px solid #6366f1' }}>
            <h2 style={{ marginBottom: 24, color: '#6366f1' }}>📝 Nouveau topic</h2>
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

      {/* ══════════════ MODAL JWT 4EVERLAND ══════════════ */}
      {showJWTModal && (
        <div style={{ position: 'fixed', inset: 0, background: '#0008', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div style={{ background: dark ? '#161b22' : 'white', borderRadius: 16, padding: 32, width: 460, border: '1.5px solid #6366f1' }}>
            <h2 style={{ marginBottom: 8, color: '#6366f1' }}>🔑 4EVERLAND JWT</h2>
            <p style={{ fontSize: 13, opacity: 0.6, marginBottom: 16 }}>
              Créez un JWT sur{' '}
              <a href="https://app.4everland.cloud/developers/api-keys" target="_blank" rel="noreferrer" style={{ color: '#6366f1' }}>
                app.4everland.cloud
              </a>{' '}
              → API Keys → New Key
            </p>
            <input
              value={neweverlandJWT}
              onChange={e => setNeweverlandJWT(e.target.value)}
              style={{ ...inputStyle, fontSize: 13 }}
              placeholder="eyJhbGci... (votre 4EVERLAND JWT)"
              type="password"
              autoFocus
            />
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => {
                if (!neweverlandJWT.trim()) { alert('JWT vide !'); return }
                const jwt = neweverlandJWT.trim()
                seteverlandJWT(jwt)
                localStorage.setItem('zonefree-4EVERLAND-jwt', jwt)
                setShowJWTModal(false)
                alert('✅ JWT sauvegardé !')
              }}>
                ✓ Sauvegarder
              </button>
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setShowJWTModal(false)}>
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════ FOOTER ══════════════ */}
      <div className="footer">
        Zone Free © 2026 —{' '}
        <a href={`https://etherscan.io/address/${CONTRACT_ADDRESS}`} target="_blank" rel="noreferrer" style={{ color: '#6366f1' }}>
          Contrat Etherscan
        </a>
        {ipfsCID && <> — <a href={`${IPFS_GATEWAY}${ipfsCID}`} target="_blank" rel="noreferrer" style={{ color: '#22c55e' }}>💾 IPFS</a></>}
        {' — '}
        <a href="https://zonefree.x" style={{ color: '#6366f1' }}>🌐 zonefree.x</a>
      </div>

    </div>
  )
}

export default App

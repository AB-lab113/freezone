import './App.css'
import React, { useState, useEffect, useRef } from 'react'
import { ethers } from 'ethers'
import nacl from 'tweetnacl'
import naclUtil from 'tweetnacl-util'
import ForumAboABI from './ForumAbo.json'
import { useAppKit, useAppKitAccount, useAppKitProvider, useDisconnect } from '@reown/appkit/react'

import Gun from 'gun/gun'
var gun = Gun({
  peers: [
    'https://gun-relay-production-974a.up.railway.app/gun'
  ]
})

var CONTRACT_ADDRESS = '0x08789ba50be5547200e8306cea37d91deb732b5e'
var TOPICS_PAR_PAGE = 5
var IPFS_GATEWAY = 'https://ipfs.4everland.io/ipfs/'


var FORUMS_INIT = [
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
function getPseudoFromStorage() {
  // 1. Cherche d'abord dans la nouvelle clé
  var stored = localStorage.getItem('zonefree-pseudo') || ''

  // 2. Fallback sur l'ancienne clé 'pseudo' (migration)
  if (!stored) {
    var oldStored = localStorage.getItem('pseudo') || ''
    if (oldStored) {
      stored = oldStored
      // Nettoie l'ancienne clé après migration
      localStorage.removeItem('pseudo')
    }
  }

  if (!stored) return ''

  try {
    var parsed = JSON.parse(stored)
    if (typeof parsed === 'object' && parsed !== null) {
      var valeur = String(Object.values(parsed)[0] || '')
      localStorage.setItem('zonefree-pseudo', valeur)
      return valeur
    }
    return stored
  } catch (e) {
    var match = stored.match(/"([^"]+)"[:\s]*"?([^"{}]+)"?/)
    if (match && match[2]) {
      var valeurMatch = match[2].trim()
      localStorage.setItem('zonefree-pseudo', valeurMatch)
      return valeurMatch
    }
    if (stored.startsWith('{') || stored.startsWith('[')) {
      localStorage.setItem('zonefree-pseudo', '')
      return ''
    }
    return stored
  }
}

class MessagerieErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null } }
  static getDerivedStateFromError(error) { return { hasError: true, error: error.message } }
  render() {
    if (this.state.hasError) return (
      <div style={{ padding: 20, color: '#ef4444', textAlign: 'center' }}>
        Erreur messagerie: {this.state.error}
        <br /><button onClick={() => this.setState({ hasError: false })} style={{ marginTop: 12, padding: '8px 16px', cursor: 'pointer' }}>Réessayer</button>
      </div>
    )
    return this.props.children
  }
}

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }
  static getDerivedStateFromError(err) {
    return { error: err }
  }
  render() {
    if (this.state.error) {
      return React.createElement('div', {
        style: { position:'fixed', top:0, left:0, right:0, bottom:0,
                 background:'#1a0000', color:'#ff6b6b', padding:20,
                 fontFamily:'monospace', fontSize:12, overflow:'auto', zIndex:99999 }
      },
        React.createElement('h2', null, '🔴 CRASH DÉTECTÉ'),
        React.createElement('pre', null, this.state.error && this.state.error.toString()),
        React.createElement('pre', null, this.state.error && this.state.error.stack),
        React.createElement('button', {
          onClick: function() { window.location.reload() },
          style: { marginTop:20, padding:'10px 20px', cursor:'pointer' }
        }, 'Recharger')
      )
    }
    return this.props.children
  }
}

function App() {
  // ─── REOWN APPKIT HOOKS ───
  var { open: openModal } = useAppKit()
  var { isConnected, address } = useAppKitAccount()
  var { walletProvider } = useAppKitProvider('eip155')
  var { disconnect } = useDisconnect()

  var disconnectAll = async () => {
    try { await disconnect() } catch(e) {}
    setAccount(null)
    setEstAbonne(false)
    setNaclKeyPair(null)
  }

  // ─── THEME ───
  var [dark, setDark] = useState(() => {
    var s = localStorage.getItem('zonefree-dark')
    return s !== null ? JSON.parse(s) : true
  })

  // ─── WALLET / BLOCKCHAIN ───
  var [account, setAccount] = useState(null)
  var [estAbonne, setEstAbonne] = useState(false)
  var [loadingAbo, setLoadingAbo] = useState(false)
  var [expiration, setExpiration] = useState(null)
  var [prixETH, setPrixETH] = useState(null)
  var [totalAbonnes, setTotalAbonnes] = useState(null)
  var [maxGratuit, setMaxGratuit] = useState(300)
  var [udDomain, setUdDomain] = useState(null)

  // ─── NAVIGATION ───
  var [page, setPage] = useState('home')

  // ─── PROFIL ───
  var [pseudo, setPseudo] = useState(getPseudoFromStorage)
  var [editPseudo, setEditPseudo] = useState(false)
  var [newPseudo, setNewPseudo] = useState('')

  // ─── FORUMS ───
  var [forums, setForums] = useState(() => {
    var s = localStorage.getItem('zonefree-forums')
    return s ? JSON.parse(s) : FORUMS_INIT
  })
  var [activeForum, setActiveForum] = useState(null)
  var [activeTopic, setActiveTopic] = useState(null)
  var [showNewSalon, setShowNewSalon] = useState(false)
  var [showNewTopic, setShowNewTopic] = useState(false)
  var [newSalon, setNewSalon] = useState({ emoji: '', name: '', description: '' })
  var [newTopic, setNewTopic] = useState({ title: '', content: '' })
  var [newReply, setNewReply] = useState('')
  var [recherche, setRecherche] = useState('')
  var [rechercheTopic, setRechercheTopic] = useState('')
  var [sortBy, setSortBy] = useState('date')
  var [currentPage, setCurrentPage] = useState(1)

  // ─── LIKES ───
  var [likes, setLikes] = useState(() => {
    var s = localStorage.getItem('zonefree-likes')
    return s ? JSON.parse(s) : {}
  })

  // ─── MESSAGERIE LOCALE ───
  var [messages, setMessages] = useState(() => {
    var s = localStorage.getItem('zonefree-messages')
    return s ? JSON.parse(s) : []
  })
  var [activeConversation, setActiveConversation] = useState(null)
  var [newMessage, setNewMessage] = useState('')
  var [newMessageTo, setNewMessageTo] = useState('')
  var [showNewConversation, setShowNewConversation] = useState(false)
  // eslint-disable-next-line no-unused-vars
  var imageInputRef = useRef(null)
  var gunSubscribed = useRef({})
  var activeConvKeyRef = useRef(null)

  // ─── NACL E2E ───
  var [naclKeyPair, setNaclKeyPair] = useState(null)
  var [naclLoading, setNaclLoading] = useState(false)

  // ─── IPFS / 4EVERLAND ───
  var [everlandJWT, seteverlandJWT] = useState(() => localStorage.getItem('zonefree-4EVERLAND-jwt') || '')
  var [neweverlandJWT, setNeweverlandJWT] = useState('')
  var [showJWTModal, setShowJWTModal] = useState(false)
  var [ipfsSaving, setIpfsSaving] = useState(false)
  var [ipfsCID, setIpfsCID] = useState(() => localStorage.getItem('zonefree-ipfs-cid') || null)
  var [ipfsStatus, setIpfsStatus] = useState(null)

  // ─── NOTIFICATIONS ───
  var [notifPermission, setNotifPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  )
  var [membresListe, setMembresListe] = useState(function() {
    try { return JSON.parse(localStorage.getItem('freezone-membres') || '[]') } catch (e) { return [] }
  })

  // ═══════════════════ EFFECTS ═══════════════════
  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    if (isConnected && address && address !== account) {
      setAccount(address)
      var provider = new ethers.BrowserProvider(walletProvider)
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
          var provider = new ethers.BrowserProvider(window.ethereum)
          verifierAbonnement(accounts[0], provider)
        }
      }).catch(() => {})
    }
  }, [isConnected, address])

  useEffect(() => {
    if (account && !naclKeyPair && !naclLoading) {
      var addrKeyLoad = String(account).toLowerCase()
      var stored = localStorage.getItem('zonefree-nacl-' + addrKeyLoad)
      if (stored) {
        try {
          var parsed = JSON.parse(stored)
          setNaclKeyPair({
            publicKey: naclUtil.decodeBase64(parsed.pub),
            secretKey: naclUtil.decodeBase64(parsed.sec)
          })
          if (!localStorage.getItem('zonefree-nacl-pub-' + addrKeyLoad)) {
            localStorage.setItem('zonefree-nacl-pub-' + addrKeyLoad, parsed.pub)
          }
          if (!localStorage.getItem('zonefree-nacl-sec-' + addrKeyLoad)) {
            localStorage.setItem('zonefree-nacl-sec-' + addrKeyLoad, parsed.sec)
          }
          try {
            gun.get('zonefree-nacl-keys').get(addrKeyLoad).put({
              address: addrKeyLoad,
              pubKey: parsed.pub
            })
            gun.get('zonefree-nacl-keys').get(addrKeyLoad).on(function(data) {
              if (data && data.pubKey) {
                localStorage.setItem('zonefree-nacl-pub-' + addrKeyLoad, data.pubKey)
              }
            })
          } catch (e) { console.warn('publish nacl pub error:', e) }
        } catch (e) { console.warn('NaCl: clé locale corrompue') }
      }
    }
  }, [account])

  useEffect(function() {
    if (!account) return
    try {
      setMessages(function(prev) {
        var accLow = String(account).toLowerCase()
        function isFullAddr(s) {
          return typeof s === 'string' && s.length === 42 && s.indexOf('0x') === 0
        }
        function normalizeConv(c) {
          if (!c || !c.participants) return c
          var newParts = []
          var changed = false
          for (var p = 0; p < c.participants.length; p++) {
            var part = c.participants[p]
            var partStr = String(part || '')
            if (isMe(part)) {
              if (partStr.toLowerCase() !== accLow) changed = true
              newParts.push(accLow)
            } else if (isFullAddr(partStr)) {
              if (partStr !== partStr.toLowerCase()) changed = true
              newParts.push(partStr.toLowerCase())
            } else {
              newParts.push(part)
            }
          }
          var canRebuild = newParts.length === 2 && isFullAddr(newParts[0]) && isFullAddr(newParts[1])
          if (changed || canRebuild) {
            var newKey = canRebuild ? getConvKey(newParts[0], newParts[1]) : String(c.key || '').toLowerCase()
            return Object.assign({}, c, { participants: newParts, key: newKey })
          }
          return Object.assign({}, c, { key: String(c.key || '').toLowerCase() })
        }
        function participantsKey(c) {
          if (!c || !c.participants || c.participants.length < 2) return ''
          return c.participants.slice().map(function(p) { return String(p).toLowerCase() }).sort().join('-')
        }
        function mergeInto(target, source) {
          var seenIds = {}
          for (var m = 0; m < target.msgs.length; m++) {
            if (target.msgs[m] && target.msgs[m].id != null) seenIds[String(target.msgs[m].id)] = true
          }
          var add = []
          var src = source.msgs || []
          for (var n = 0; n < src.length; n++) {
            var msg = src[n]
            if (!msg || msg.id == null) continue
            if (seenIds[String(msg.id)]) continue
            seenIds[String(msg.id)] = true
            add.push(msg)
          }
          return Object.assign({}, target, { msgs: target.msgs.concat(add) })
        }
        var byParts = {}
        for (var i = 0; i < prev.length; i++) {
          var c = normalizeConv(prev[i])
          if (!c) continue
          var pk = participantsKey(c)
          var canonKey = pk || String(c.key || '').toLowerCase()
          if (pk && c.key !== pk) {
            c = Object.assign({}, c, { key: pk })
          }
          if (!byParts[canonKey]) {
            byParts[canonKey] = Object.assign({}, c, { key: canonKey, msgs: (c.msgs || []).slice() })
          } else {
            byParts[canonKey] = mergeInto(byParts[canonKey], c)
          }
        }
        var out = []
        for (var kk in byParts) { if (Object.prototype.hasOwnProperty.call(byParts, kk)) out.push(byParts[kk]) }
        try { localStorage.setItem('zonefree-messages', JSON.stringify(out)) } catch (e) {}
        return out
      })
    } catch (e) { console.warn('merge dup convs error:', e) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account])
  /* eslint-enable react-hooks/exhaustive-deps */

  useEffect(function() {
    if (!account) return
    try {
      var moi = shortAddr(account)
      setMembresListe(function(prev) {
        var byAddr = {}
        for (var k = 0; k < prev.length; k++) {
          if (prev[k] && prev[k].address) byAddr[String(prev[k].address).toLowerCase()] = prev[k]
        }
        for (var i = 0; i < messages.length; i++) {
          var conv = messages[i]
          if (!conv || !conv.participants) continue
          var other = null
          for (var j = 0; j < conv.participants.length; j++) {
            if (conv.participants[j] !== moi) { other = conv.participants[j]; break }
          }
          if (!other) continue
          var key = String(other).toLowerCase()
          if (!byAddr[key]) {
            byAddr[key] = { address: key, pseudo: getPseudoOrAddr(other), lastSeen: 0, avatar: '' }
          }
        }
        var out = []
        for (var kk in byAddr) { if (Object.prototype.hasOwnProperty.call(byAddr, kk)) out.push(byAddr[kk]) }
        return out
      })
    } catch (e) {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account, pseudo, messages])

  useEffect(function() {
    if (!account) return
    function publishPresence() {
      try {
        gun.get('zonefree-presence').get(String(account).toLowerCase()).put({
          address: String(account).toLowerCase(),
          pseudo: pseudo || '',
          lastSeen: Date.now()
        })
      } catch (e) { console.warn('publishPresence error:', e) }
    }
    publishPresence()
    var iv = setInterval(publishPresence, 30000)
    return function() { clearInterval(iv) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account, pseudo])

  useEffect(function() {
    try {
      gun.get('zonefree-presence').map().on(function(membre) {
        if (!membre || !membre.address) return
        var addrLower = String(membre.address).toLowerCase()
        setMembresListe(function(prev) {
          var existe = prev.some(function(m) {
            return m && m.address && String(m.address).toLowerCase() === addrLower
          })
          if (existe) {
            return prev.map(function(m) {
              return (m && m.address && String(m.address).toLowerCase() === addrLower)
                ? Object.assign({}, m, { address: addrLower, pseudo: membre.pseudo, lastSeen: membre.lastSeen })
                : m
            })
          }
          return prev.concat([{
            address: addrLower,
            pseudo: membre.pseudo || (addrLower.substring(0, 6) + '...'),
            lastSeen: membre.lastSeen || 0,
            avatar: ''
          }])
        })
      })
    } catch (e) { console.warn('Gun presence subscribe error:', e) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(function() {
    try {
      gun.get('zonefree-topics').map().on(function(topic) {
        if (!topic || !topic.id || !topic.title) return
        var fid = topic.forumId || topic.forum_id || ''
        if (!fid) return
        setForums(function(prev) {
          var changed = false
          var next = prev.map(function(f) {
            if (String(f.id) !== String(fid)) return f
            var existe = (f.topics || []).some(function(t) { return String(t.id) === String(topic.id) })
            if (existe) return f
            changed = true
            var newTopic = Object.assign({}, {
              id: topic.id,
              title: topic.title,
              content: topic.content || '',
              author: topic.author || '',
              pinned: false,
              replies: [],
              date: topic.date || new Date().toLocaleDateString('fr-FR')
            })
            return Object.assign({}, f, { topics: [newTopic].concat(f.topics || []) })
          })
          return changed ? next : prev
        })
      })
    } catch (e) { console.warn('Gun topics subscribe error:', e) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(function() {
    var deletedIds = {}
    try {
      gun.get('zonefree-salons-deleted').map().once(function(item) {
        if (item && item.id) deletedIds[String(item.id)] = true
      })
    } catch (e) { console.warn('Gun salons-deleted preload error:', e) }

    var NOMS_CORROMPUS = ['P', 'p', 'Est', '8', '9', '11', '12', '13',
      'test gun3', 'test gun 3', 'test gun4', 'test gun 4', 'tg4',
      'P7', 'p7', 'G5', 'g5', 'Gun 5', 'gun 5',
      'test gun', 'Gun5', 'gun5', 'tg5']
    try {
      gun.get('zonefree-salons').map().once(function(salon) {
        if (!salon || !salon.id) return
        var nom = String(salon.name || salon.nom || '').trim()
        var estCorrompu = nom.length < 2 ||
          /^\d+$/.test(nom) ||
          NOMS_CORROMPUS.indexOf(nom) !== -1 ||
          NOMS_CORROMPUS.indexOf(nom.toLowerCase()) !== -1
        if (/^[A-Za-z]\d+$/.test(nom)) estCorrompu = true
        if (estCorrompu) {
          console.log('[CLEANUP] Blacklist salon corrompu:', nom, salon.id)
          gun.get('zonefree-salons-deleted').get(String(salon.id)).put({
            id: salon.id, deletedAt: Date.now(), reason: 'corrupted'
          })
        }
      })
    } catch (e) { console.warn('Gun salons cleanup error:', e) }

    var to = setTimeout(function() {
      try {
        gun.get('zonefree-salons').map().on(function(salon) {
          if (!salon || !salon.id) return
          if (deletedIds[String(salon.id)]) return
          var nomSalon = String(salon.name || salon.nom || '').trim()
          if (nomSalon.length < 2) return
          if (/^\d+$/.test(nomSalon)) return
          setForums(function(prev) {
            var existe = prev.some(function(f) { return String(f.id) === String(salon.id) })
            if (existe) return prev
            return prev.concat([Object.assign({}, {
              id: salon.id,
              name: nomSalon,
              emoji: salon.emoji || salon.icon || '💬',
              description: salon.description || '',
              creator: salon.creator || '',
              topics: []
            })])
          })
        })
      } catch (e) { console.warn('Gun salons subscribe error:', e) }

      try {
        gun.get('zonefree-salons-deleted').map().on(function(item) {
          if (!item || !item.id) return
          deletedIds[String(item.id)] = true
          setForums(function(prev) {
            return prev.filter(function(f) { return String(f.id) !== String(item.id) })
          })
        })
      } catch (e) { console.warn('Gun salons-deleted subscribe error:', e) }
    }, 500)

    return function() { clearTimeout(to) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(function() {
    try {
      gun.get('zonefree-reactions').map().on(function(reaction) {
        if (!reaction || !reaction.id) return
        var rid = String(reaction.id)
        if (typeof reaction.likes === 'number') {
          setLikes(function(prev) {
            var cur = prev[rid] || { count: 0, likedBy: [] }
            if (cur.count === reaction.likes) return prev
            var next = Object.assign({}, prev)
            next[rid] = Object.assign({}, cur, { count: reaction.likes })
            return next
          })
        }
        if (typeof reaction.pinned === 'boolean' && reaction.topicId != null) {
          setForums(function(prev) {
            var changed = false
            var next = prev.map(function(f) {
              if (!f.topics) return f
              var touched = false
              var newTopics = f.topics.map(function(t) {
                if (String(t.id) !== String(reaction.topicId)) return t
                if (t.pinned === reaction.pinned) return t
                touched = true
                return Object.assign({}, t, { pinned: reaction.pinned })
              })
              if (touched) { changed = true; return Object.assign({}, f, { topics: newTopics }) }
              return f
            })
            return changed ? next : prev
          })
        }
      })
    } catch (e) { console.warn('Gun reactions subscribe error:', e) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(function() {
    if (!activeConversation || !activeConversation.key) return
    var k = activeConversation.key
    setMessages(function(prev) {
      var changed = false
      var next = prev.map(function(c) {
        if (c.key !== k) return c
        var touched = false
        var newMsgs = (c.msgs || []).map(function(m) {
          if (m && !m.read && isMe(m.to)) {
            touched = true
            return Object.assign({}, m, { read: true })
          }
          return m
        })
        if (touched) { changed = true; return Object.assign({}, c, { msgs: newMsgs }) }
        return c
      })
      return changed ? next : prev
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConversation])

  useEffect(() => { localStorage.setItem('zonefree-forums', JSON.stringify(forums)) }, [forums])
  useEffect(() => {
    localStorage.setItem('zonefree-dark', JSON.stringify(dark))
    document.body.className = dark ? 'dark' : 'light'
  }, [dark])
  useEffect(() => { localStorage.setItem('zonefree-likes', JSON.stringify(likes)) }, [likes])
  useEffect(function() {
    try {
      var msgsSansImages = messages.map(function(conv) {
        var msgs2 = conv.msgs.map(function(m) {
          if (m.type === 'image') {
            return Object.assign({}, m, { content: '[image]' })
          }
          return m
        })
        return Object.assign({}, conv, { msgs: msgs2 })
      })
      localStorage.setItem('zonefree-messages', JSON.stringify(msgsSansImages))
    } catch (e) {
      console.warn('localStorage plein', e)
    }
  }, [messages])
  useEffect(function() {
    Object.keys(localStorage).forEach(function(k) {
      if (k.indexOf('zonefree-conv-cid-') === 0) {
        localStorage.removeItem(k)
      }
    })
  }, [])

  useEffect(() => {
    localStorage.setItem('zonefree-pseudo', pseudo)
  }, [pseudo])
  useEffect(() => {
    if (everlandJWT) localStorage.setItem('zonefree-4EVERLAND-jwt', everlandJWT)
  }, [everlandJWT])

  // ═══════════════════ NOTIFICATIONS ═══════════════════
  var demanderNotifications = async () => {
    if (typeof Notification === 'undefined') {
      alert('Votre navigateur ne supporte pas les notifications.')
      return
    }
    try {
      var p = await Notification.requestPermission()
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

  var envoyerNotif = (titre, corps) => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      try { new Notification(titre, { body: corps, icon: '/favicon.ico' }) } catch (e) {}
    }
  }

  // ═══════════════════ UNSTOPPABLE DOMAINS ═══════════════════
  var resoudreUD = async (address) => {
    if (!address) return null
    var endpoints = [
      `https://resolve.unstoppabledomains.com/reverse/${address.toLowerCase()}`,
      `https://api.unstoppabledomains.com/resolve/reverse/${address.toLowerCase()}`
    ]
    for (var url of endpoints) {
      try {
        var r = await fetch(url, { headers: { 'Accept': 'application/json' } })
        if (r.ok) {
          var d = await r.json()
          var domain = d?.meta?.domain || d?.data?.domain || null
          if (domain) return domain
        }
      } catch (e) {}
    }
    return null
  }

  var detecterUD = async () => {
    var addr = account || address
    if (!addr) { alert('Connectez votre wallet d\'abord !'); return }
    var domain = await resoudreUD(addr)
    if (domain) {
      setUdDomain(domain)
      alert(`✅ Domaine trouvé : ${domain}`)
    } else {
      alert(`Aucun domaine .x trouvé pour ce wallet.\n\nCela peut être normal si le domaine est récent ou si l'API UD est indisponible temporairement.`)
    }
  }

  // ═══════════════════ IPFS / 4EVERLAND ═══════════════════
  var sauvegarderIPFS = async () => {
    if (!everlandJWT) {
      alert('Configurez d\'abord votre 4EVERLAND JWT dans les paramètres !')
      setShowJWTModal(true)
      return
    }
    setIpfsSaving(true)
    setIpfsStatus(null)
    try {
      var data = { forums, updatedAt: Date.now(), version: '1.0' }
      var r = await fetch('https://api.4EVERLAND.cloud/pinning/pinJSONToIPFS', {
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
        var err = await r.json()
        throw new Error(err.error?.details || `HTTP ${r.status}`)
      }
      var res = await r.json()
      var cid = res.IpfsHash
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

  var sauvegarderIPFSAuto = async (data) => {
    if (!everlandJWT) return null
    try {
      var r = await fetch('https://api.4EVERLAND.cloud/pinning/pinJSONToIPFS', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${everlandJWT}` },
        body: JSON.stringify({ pinataContent: data, pinataMetadata: { name: 'ZoneFree-' + Date.now() } })
      })
      if (!r.ok) return null
      var res = await r.json()
      localStorage.setItem('zonefree-ipfs-cid', res.IpfsHash)
      setIpfsCID(res.IpfsHash)
      return res.IpfsHash
    } catch (e) { return null }
  }

  // ═══════════════════ LIKES ═══════════════════
  var toggleLike = (key) => {
    if (!account) { alert('Connectez MetaMask pour liker !'); return }
    if (!estAbonne) { alert('Abonnement requis pour liker !'); return }
    var cur = likes[key] || { count: 0, likedBy: [] }
    var has = cur.likedBy.includes(account)
    var newCount = has ? cur.count - 1 : cur.count + 1
    setLikes({
      ...likes,
      [key]: {
        count: newCount,
        likedBy: has ? cur.likedBy.filter(function(a) { return a !== account }) : [...cur.likedBy, account]
      }
    })
    try {
      gun.get('zonefree-reactions').get(String(key)).put({
        id: String(key),
        likes: newCount,
        pinned: false,
        forumId: activeForum ? activeForum.id : ''
      })
    } catch (e) { console.warn('publish reaction Gun error:', e) }
  }
  var getLike = (key) => {
    var l = likes[key] || { count: 0, likedBy: [] }
    return { count: l.count, hasLiked: l.likedBy.includes(account) }
  }

  // ═══════════════════ TRI ═══════════════════
  var sortTopics = (topics, forumId) => {
    var s = [...topics]
    if (sortBy === 'popular') return s.sort((a, b) => (likes[`${forumId}-${b.id}`]?.count || 0) - (likes[`${forumId}-${a.id}`]?.count || 0))
    if (sortBy === 'replies') return s.sort((a, b) => b.replies.length - a.replies.length)
    return s.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1
      if (!a.pinned && b.pinned) return 1
      return b.id - a.id
    })
  }

  // ═══════════════════ MESSAGERIE LOCALE ═══════════════════
  function getConvKey(a, b) {
    var aLow = String(a || '').toLowerCase()
    var bLow = String(b || '').toLowerCase()
    return [aLow, bLow].sort().join('-')
  }

  function hashConvKey(key) {
    var k = String(key || '')
    var hash = 0
    for (var i = 0; i < k.length; i++) {
      var c = k.charCodeAt(i)
      hash = ((hash << 5) - hash) + c
      hash = hash & hash
    }
    var h = Math.abs(hash).toString(36)
    var short = k.replace('0x', '').replace(/-/g, '').substring(0, 8) + h + k.slice(-8).replace('0x', '')
    return 'zf-' + short
  }

  function isMe(p) {
    if (!p || !account) return false
    var pLow = String(p).toLowerCase()
    var accLow = String(account).toLowerCase()
    if (pLow === accLow) return true
    var sa = shortAddr(account)
    if (p === sa) return true
    if (pLow === String(sa).toLowerCase()) return true
    return false
  }

  var demarrerConversation = () => {
    if (!newMessageTo.trim()) { alert('Entrez une adresse !'); return }
    var addrLow = String(newMessageTo.trim()).toLowerCase()
    var accLow = String(account).toLowerCase()
    var key = getConvKey(accLow, addrLow)
    var existing = messages.find(function(m) { return m.key === key })
    if (existing) { setActiveConversation(existing) }
    else {
      var nc = { id: Date.now(), key: key, participants: [accLow, addrLow], msgs: [] }
      setMessages(function(prev) { return prev.concat([nc]) })
      setActiveConversation(nc)
    }
    setShowNewConversation(false); setNewMessageTo(''); setPage('conversation')
  }

  function envoyerMessage() {
    if (!account || !estAbonne || !newMessage.trim() || !activeConversation) return
    var myAddr = String(account).toLowerCase()
    try {
      var contenu = newMessage
      var otherAddress = activeConversation.participants.find(function(p) { return !isMe(p) })
      var otherAddr = String(otherAddress || '').toLowerCase()
      // Toujours re-fetcher la clé pub du destinataire depuis Gun
      if (otherAddr) {
        try {
          gun.get('zonefree-nacl-keys').get(otherAddr).once(function(data) {
            if (data && data.pubKey) {
              localStorage.setItem('zonefree-nacl-pub-' + otherAddr, data.pubKey)
            }
          })
        } catch (e) { console.warn('lookup nacl pub error:', e) }
      }
      var otherPubB64 = localStorage.getItem('zonefree-nacl-pub-' + otherAddr)
      var mySecB64 = localStorage.getItem('zonefree-nacl-sec-' + myAddr)
      var content = contenu
      var encrypted = false
      if (otherPubB64 && mySecB64) {
        try {
          var recipientPub = new Uint8Array(atob(otherPubB64).split('').map(function(c) { return c.charCodeAt(0) }))
          var mySec = new Uint8Array(atob(mySecB64).split('').map(function(c) { return c.charCodeAt(0) }))
          var msgBytes = new TextEncoder().encode(contenu)
          var nonce = nacl.randomBytes(nacl.box.nonceLength)
          var box = nacl.box(msgBytes, nonce, recipientPub, mySec)
          content = JSON.stringify({
            enc: btoa(String.fromCharCode.apply(null, box)),
            nonce: btoa(String.fromCharCode.apply(null, nonce)),
            v: 'box1'
          })
          encrypted = true
        } catch (e) {
          console.warn('chiffrement échoué, envoi en clair', e)
        }
      }
      var msg = {
        id: Date.now(),
        from: shortAddr(account),
        fromAddr: myAddr,
        to: otherAddress,
        toAddr: otherAddr,
        content: content,
        type: 'text',
        encrypted: encrypted,
        date: new Date().toLocaleDateString('fr-FR'),
        timestamp: Date.now(),
        read: false
      }
      var newMsgs = activeConversation.msgs.concat([msg])
      var updatedConv = Object.assign({}, activeConversation, { msgs: newMsgs })
      setActiveConversation(updatedConv)
      setMessages(function(prev) {
        return prev.map(function(c) {
          return c.key === activeConversation.key ? updatedConv : c
        })
      })
      setNewMessage('')
      transporterMessage(activeConversation, msg)
    } catch (err) { console.error('envoyerMessage crash:', err) }
  }

  // eslint-disable-next-line no-unused-vars
  var envoyerImage = (e) => {
    try {
      var file = e.target.files[0]
      if (!file || !account || !estAbonne || !activeConversation) return
      var reader = new FileReader()
      reader.onload = (ev) => {
        try {
          var otherImg = activeConversation.participants.find(function(p) { return !isMe(p) })
          var msg = {
            id: Date.now(),
            from: shortAddr(account),
            fromAddr: String(account || '').toLowerCase(),
            to: otherImg,
            toAddr: String(otherImg || '').toLowerCase(),
            content: ev.target.result, type: 'image',
            date: new Date().toLocaleDateString('fr-FR'),
            timestamp: Date.now(), read: false
          }
          var updated = Object.assign({}, activeConversation, { msgs: activeConversation.msgs.concat([msg]) })
          setMessages(function(prev) { return prev.map(function(c) { return c.key === activeConversation.key ? updated : c }) })
          setActiveConversation(updated)
          transporterMessage(activeConversation, msg)
        } catch (err) {
          console.error('envoyerImage onload crash:', err)
          alert('Erreur envoi image: ' + err.message)
        }
      }
      reader.readAsDataURL(file)
    } catch (err) {
      console.error('envoyerImage crash:', err)
      alert('Erreur envoi image: ' + err.message)
    }
  }

  function ouvrirConversation(conv) {
    activeConvKeyRef.current = conv ? conv.key : null
    setActiveConversation(conv)
    setPage('conversation')
    setMessages(function(prev) {
      return prev.map(function(c) {
        if (!conv || c.key !== conv.key) return c
        var changed = false
        var newMsgs = (c.msgs || []).map(function(m) {
          if (m && !m.read && isMe(m.to)) {
            changed = true
            return Object.assign({}, m, { read: true })
          }
          return m
        })
        return changed ? Object.assign({}, c, { msgs: newMsgs }) : c
      })
    })
    setActiveConversation(function(prev) {
      if (!prev || !conv || prev.key !== conv.key) return prev
      var changed = false
      var newMsgs = (prev.msgs || []).map(function(m) {
        if (m && !m.read && isMe(m.to)) {
          changed = true
          return Object.assign({}, m, { read: true })
        }
        return m
      })
      return changed ? Object.assign({}, prev, { msgs: newMsgs }) : prev
    })
    if (!conv || !conv.key) return
    function onGunMsg(msg) {
      if (!msg || !msg.id) return
      if (!msg.content && msg.content !== '') return
      var msgId = String(msg.id)
      var convOuverte = activeConvKeyRef.current === conv.key
      var incoming = Object.assign({}, msg, convOuverte ? { read: true } : {})
      setMessages(function(prev) {
        return prev.map(function(c) {
          if (c.key !== conv.key) return c
          var existe = c.msgs && c.msgs.some(function(m) { return String(m.id) === msgId })
          if (existe) return c
          var newMsgs = (c.msgs || []).concat([incoming])
          newMsgs.sort(function(a, b) { return (a.timestamp || 0) - (b.timestamp || 0) })
          return Object.assign({}, c, { msgs: newMsgs })
        })
      })
      setActiveConversation(function(prev) {
        if (!prev || prev.key !== conv.key) return prev
        var existe = prev.msgs && prev.msgs.some(function(m) { return String(m.id) === msgId })
        if (existe) return prev
        var newMsgs = (prev.msgs || []).concat([incoming])
        newMsgs.sort(function(a, b) { return (a.timestamp || 0) - (b.timestamp || 0) })
        return Object.assign({}, prev, { msgs: newMsgs })
      })
    }
    if (!gunSubscribed.current[conv.key]) {
      gunSubscribed.current[conv.key] = true
      try {
        gun.get(hashConvKey(conv.key)).map().on(onGunMsg)
      } catch (e) { console.warn('Gun subscribe error:', e) }
    }
    if (conv.participants && conv.participants.length === 2) {
      var keyInverse = conv.participants.slice().reverse().join('-').toLowerCase()
      if (keyInverse !== conv.key && !gunSubscribed.current[keyInverse]) {
        gunSubscribed.current[keyInverse] = true
        try {
          gun.get(hashConvKey(keyInverse)).map().on(onGunMsg)
        } catch (e) { console.warn('Gun subscribe inverse error:', e) }
      }
    }
  }

  var unreadCount = account
    ? Math.min(9, messages.reduce(function(t, c) { return t + c.msgs.filter(function(m) { return isMe(m.to) && !m.read }).length }, 0))
    : 0

   // ═══════════════════ NACL E2E ═══════════════════
  var initNaclKeys = async () => {
    if (!account) { alert('Connectez votre wallet d\'abord !'); return }
    var provider = walletProvider || window.ethereum
    if (!provider) { alert('Provider wallet introuvable.'); return }
    setNaclLoading(true)
    try {
      var sig = await provider.request({
        method: 'personal_sign',
        params: [
          '0x' + Array.from(new TextEncoder().encode('ZoneFree NaCl key v1'))
            .map(function(b) { return b.toString(16).padStart(2, '0') }).join(''),
          address || account
        ]
      })
      var sigHex = sig.startsWith('0x') ? sig.slice(2) : sig
      var seed = new Uint8Array(sigHex.match(/.{1,2}/g).map(b => parseInt(b, 16))).slice(0, 32)
      var kp = nacl.box.keyPair.fromSecretKey(seed)
      setNaclKeyPair(kp)
      var pubB64 = naclUtil.encodeBase64(kp.publicKey)
      var secB64 = naclUtil.encodeBase64(kp.secretKey)
      var addrKey = String(account).toLowerCase()
      localStorage.setItem('zonefree-nacl-' + addrKey, JSON.stringify({ pub: pubB64, sec: secB64 }))
      localStorage.setItem('zonefree-nacl-pub-' + addrKey, pubB64)
      localStorage.setItem('zonefree-nacl-sec-' + addrKey, secB64)
      try {
        gun.get('zonefree-nacl-keys').get(addrKey).put({
          address: addrKey,
          pubKey: pubB64
        })
        gun.get('zonefree-nacl-keys').get(addrKey).on(function(data) {
          if (data && data.pubKey) {
            localStorage.setItem('zonefree-nacl-pub-' + addrKey, data.pubKey)
          }
        })
      } catch (e) { console.warn('publish nacl pub error:', e) }
      envoyerNotif('🔐 NaCl E2E actif', 'Chiffrement Curve25519 activé !')
    } catch (e) {
      console.error('NaCl init error:', e)
      alert('Signature refusée. Le chiffrement E2E ne sera pas activé.')
    } finally {
      setNaclLoading(false)
    }
  }

  // eslint-disable-next-line no-unused-vars
  var naclEncrypt = (text) => {
    if (!naclKeyPair) return String(text)
    try {
      var nonce = nacl.randomBytes(24)
      var msgBytes = naclUtil.decodeUTF8(String(text))
      var encrypted = nacl.secretbox(msgBytes, nonce, naclKeyPair.secretKey)
      var result = JSON.stringify({
        e: naclUtil.encodeBase64(encrypted),
        n: naclUtil.encodeBase64(nonce)
      })
      return typeof result === 'string' ? result : String(result)
    } catch (err) {
      console.error('naclEncrypt error:', err)
      return typeof text === 'string' ? text : String(text)
    }
  }

  // eslint-disable-next-line no-unused-vars
  var naclDecrypt = (data) => {
    if (!data) return '...'
    if (typeof data !== 'string') return String(data)
    if (!naclKeyPair) return data
    try {
      var parsed = JSON.parse(data)
      if (!parsed.e || !parsed.n) return data
      var decrypted = nacl.secretbox.open(
        naclUtil.decodeBase64(parsed.e),
        naclUtil.decodeBase64(parsed.n),
        naclKeyPair.secretKey
      )
      if (!decrypted) return '[message chiffre]'
      return naclUtil.encodeUTF8(decrypted)
    } catch (e) {
      return data
    }
  }

  // ═══════════════════ BLOCKCHAIN ═══════════════════
  var fetchPrix = async (provider) => {
    try {
      var contract = new ethers.Contract(CONTRACT_ADDRESS, ForumAboABI, provider)
      var prix = await contract.getPrixEnWei()
      setPrixETH(prix)
      try { var nb = await contract.totalAbonnes(); setTotalAbonnes(Number(nb)) } catch (e) {}
      try { var max = await contract.GRATUITS(); setMaxGratuit(Number(max)) } catch (e) {}
      return prix
    } catch (e) { console.error('Prix:', e); return null }
  }

  var verifierAbonnement = async (addr, prov) => {
    try {
      var provider = prov || new ethers.BrowserProvider(walletProvider || window.ethereum)
      var contract = new ethers.Contract(CONTRACT_ADDRESS, ForumAboABI, provider)
      var abonne = await contract.estAbonne(addr)
      setEstAbonne(abonne)
      var exp = await contract.abonnements(addr)
      if (Number(exp) > 0) setExpiration(new Date(Number(exp) * 1000))
      await fetchPrix(provider)
      var domain = await resoudreUD(addr)
      if (domain) setUdDomain(domain)
    } catch (e) { console.error('Abonnement:', e) }
  }

  var estGratuit = totalAbonnes !== null && totalAbonnes < maxGratuit

  var sAbonner = async () => {
    if (!account) { alert('Connectez votre wallet !'); return }
    try {
      setLoadingAbo(true)
      var provider = new ethers.BrowserProvider(walletProvider || window.ethereum)
      var signer = await provider.getSigner()
      var contract = new ethers.Contract(CONTRACT_ADDRESS, ForumAboABI, signer)
      var prixWei = estGratuit ? 0n : await contract.getPrixEnWei()
      var tx = await contract.sAbonner({ value: prixWei })
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
  var openForum = (f) => { setActiveForum(f); setRechercheTopic(''); setCurrentPage(1); setSortBy('date'); setPage('forum') }
  var openTopic = (t) => { setActiveTopic(t); setPage('topic') }
  var goHome = () => { setPage('home'); setActiveForum(null); setActiveTopic(null); setRecherche('') }
  var goForum = () => { setPage('forum'); setActiveTopic(null) }
  function shortAddr(addr) { return addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : '' }
  function displayName(addr) { return pseudo || udDomain || shortAddr(addr) }
  function getPseudoOrAddr(address) {
    if (!address) return ''
    try {
      var membres = JSON.parse(localStorage.getItem('freezone-membres') || '[]')
      var lower = String(address).toLowerCase()
      var found = membres.find(function(m) {
        if (!m || !m.address) return false
        var a = String(m.address).toLowerCase()
        return a === lower || a === lower.replace(/\.\.\..*/, '') || lower.indexOf(a.slice(0, 6)) === 0
      })
      if (found && found.pseudo && String(found.pseudo).trim()) return found.pseudo
    } catch (e) {}
    return shortAddr(address)
  }
  function demarrerConversationAvec(addr) {
    if (!addr) return
    var addrLow = String(addr).toLowerCase()
    var accLow = String(account).toLowerCase()
    var key = getConvKey(accLow, addrLow)
    var existing = messages.find(function(m) { return m.key === key })
    if (existing) {
      setActiveConversation(existing)
    } else {
      var nc = { id: Date.now(), key: key, participants: [accLow, addrLow], msgs: [] }
      setMessages(function(prev) { return prev.concat([nc]) })
      setActiveConversation(nc)
    }
    setPage('conversation')
  }
  var prixEnETH = prixETH ? parseFloat(ethers.formatEther(prixETH)).toFixed(6) : '...'

  // ═══════════════════ FORUM ACTIONS ═══════════════════
  var creerSalon = () => {
    if (!account) { alert('Connectez MetaMask !'); return }
    if (!estAbonne) { alert('Abonnement requis !'); return }
    if (!newSalon.name.trim()) { alert('Donnez un nom !'); return }
    var salon = {
      id: newSalon.name.toLowerCase().replace(/\s+/g, '-'),
      emoji: newSalon.emoji || '💬', name: newSalon.name,
      description: newSalon.description || 'Nouveau salon', topics: [],
      creator: account
    }
    setForums([...forums, salon]); setShowNewSalon(false); setNewSalon({ emoji: '', name: '', description: '' })
    var nomValide = String(salon.name || '').trim()
    if (nomValide.length < 2 || /^\d+$/.test(nomValide)) return
    try {
      gun.get('zonefree-salons').get(String(salon.id)).put({
        id: salon.id,
        name: salon.name,
        description: salon.description,
        emoji: salon.emoji,
        creator: account,
        timestamp: Date.now()
      })
    } catch (e) { console.warn('publish salon Gun error:', e) }
  }

  var creerTopic = async () => {
    if (!account) { alert('Connectez MetaMask !'); return }
    if (!estAbonne) { alert('Abonnement requis !'); return }
    if (!newTopic.title.trim()) { alert('Donnez un titre !'); return }
    var topicId = Date.now()
    var topic = {
      id: topicId, title: newTopic.title, content: newTopic.content,
      author: displayName(account), pinned: false, replies: [],
      date: new Date().toLocaleDateString('fr-FR'),
      timestamp: topicId, forumId: activeForum.id
    }
    var upd = forums.map(f => f.id === activeForum.id ? { ...f, topics: [topic, ...f.topics] } : f)
    setForums(upd); setActiveForum(upd.find(function(f) { return f.id === activeForum.id }))
    setShowNewTopic(false); setNewTopic({ title: '', content: '' })
    try {
      console.log('[GUN TOPIC] publication', topic.id, topic.title)
      gun.get('zonefree-topics').get(String(topic.id)).put({
        id: topic.id,
        title: topic.title,
        author: topic.author,
        content: topic.content || '',
        timestamp: topic.timestamp,
        forumId: topic.forumId || ''
      }, function(ack) {
        console.log('[GUN TOPIC] ack', ack)
      })
    } catch (e) { console.warn('publish topic Gun error:', e) }
    await sauvegarderIPFSAuto({ forums: upd, updatedAt: Date.now() })
  }

  var posterReponse = async () => {
    if (!account) { alert('Connectez MetaMask !'); return }
    if (!estAbonne) { alert('Abonnement requis !'); return }
    if (!newReply.trim()) { alert('Écrivez un message !'); return }
    var reply = { id: Date.now(), author: displayName(account), content: newReply, date: new Date().toLocaleDateString('fr-FR') }
    var updTopic = { ...activeTopic, replies: [...activeTopic.replies, reply] }
    var upd = forums.map(f => f.id === activeForum.id
      ? { ...f, topics: f.topics.map(t => t.id === activeTopic.id ? updTopic : t) }
      : f)
    setForums(upd); setActiveForum(upd.find(function(f) { return f.id === activeForum.id }))
    setActiveTopic(updTopic); setNewReply('')
    envoyerNotif('💬 Nouvelle réponse', `Dans : ${activeTopic.title}`)
    await sauvegarderIPFSAuto({ forums: upd, updatedAt: Date.now() })
  }

  var togglePin = (topicId) => {
    if (!estAbonne) return
    var newPinned = false
    var upd = forums.map(f => f.id === activeForum.id
      ? { ...f, topics: f.topics.map(function(t) {
          if (t.id !== topicId) return t
          newPinned = !t.pinned
          return Object.assign({}, t, { pinned: newPinned })
        }) }
      : f)
    setForums(upd); setActiveForum(upd.find(function(f) { return f.id === activeForum.id }))
    try {
      var reactionKey = activeForum.id + '-' + topicId
      gun.get('zonefree-reactions').get(String(reactionKey)).put({
        id: String(reactionKey),
        topicId: topicId,
        likes: (likes[reactionKey] && likes[reactionKey].count) || 0,
        pinned: newPinned,
        forumId: activeForum.id
      })
    } catch (e) { console.warn('publish pin Gun error:', e) }
  }

  var supprimerSalon = (forumId) => {
    if (!account || !estAbonne) return
    var salon = forums.find(function(f) { return f.id === forumId })
    if (!salon) return
    if (salon.creator && salon.creator !== account) {
      alert('Vous ne pouvez supprimer que vos propres salons.')
      return
    }
    if (!window.confirm(`Supprimer le salon "${salon.name}" ?`)) return
    setForums(forums.filter(function(f) { return f.id !== forumId }))
    if (activeForum?.id === forumId) goHome()
    try {
      gun.get('zonefree-salons-deleted').get(String(forumId)).put({
        id: forumId,
        deletedAt: Date.now()
      })
    } catch (e) { console.warn('delete salon Gun error:', e) }
  }

  // ═══════════════════ COMPUTED ═══════════════════
  var joursRestants = expiration
    ? Math.max(0, Math.ceil((expiration - new Date()) / (1000 * 60 * 60 * 24)))
    : 0

  var inputStyle = {
    display: 'block', width: '100%', padding: '10px 14px', borderRadius: 8,
    border: '1.5px solid #30363d', background: dark ? '#0d1117' : '#f8f9ff',
    color: dark ? '#e6edf3' : '#1a1a2e', fontSize: 15, marginBottom: 16,
    marginTop: 6, boxSizing: 'border-box', fontFamily: 'inherit'
  }
  var inputStyleCenter = Object.assign({}, inputStyle, { textAlign: 'center', fontWeight: 700, fontSize: 18 })
  var inputStyleResize = Object.assign({}, inputStyle, { resize: 'vertical' })
  var inputStyleSmall = Object.assign({}, inputStyle, { fontSize: 13 })

  var topicsBase = activeForum?.topics.filter(function(t) {
    return t.title.toLowerCase().includes(rechercheTopic.toLowerCase()) ||
      t.author.toLowerCase().includes(rechercheTopic.toLowerCase())
  }) || []
  var topicsSorted = sortTopics(topicsBase, activeForum?.id)
  var totalPages = Math.ceil(topicsSorted.length / TOPICS_PAR_PAGE)
  var pageNums = []
  for (var pi = 1; pi <= totalPages; pi++) { pageNums.push(pi) }
  var topicsPaginated = topicsSorted.slice((currentPage - 1) * TOPICS_PAR_PAGE, currentPage * TOPICS_PAR_PAGE)
  var forumsFiltered = forums.filter(function(f) {
    return f.name.toLowerCase().includes(recherche.toLowerCase()) ||
      f.description.toLowerCase().includes(recherche.toLowerCase())
  })

  // ═══════════════════ HELPERS RENDER ═══════════════════
  // eslint-disable-next-line no-unused-vars
  function renderContenu(msg) {
    if (!msg) return ''
    var c = msg.content || msg
    if (typeof c !== 'string') return JSON.stringify(c)
    try {
      var parsed = JSON.parse(c)
      if (parsed && parsed.e) return '[message chiffré]'
      return c
    } catch(e) { return c }
  }

  // ═══════════════════ GUN P2P TRANSPORT ═══════════════════
  function transporterMessage(conv, msg) {
    try {
      if (!conv || !conv.key || !msg || !msg.id) return
      var flat = {
        id: msg.id,
        from: msg.from || '',
        fromAddr: msg.fromAddr || '',
        to: msg.to || '',
        toAddr: msg.toAddr || '',
        content: typeof msg.content === 'string' ? msg.content : String(msg.content || ''),
        timestamp: msg.timestamp || Date.now(),
        type: msg.type || 'text',
        date: msg.date || new Date().toLocaleDateString('fr-FR')
      }
      gun.get(hashConvKey(conv.key)).get(String(msg.id)).put(flat)
    } catch (e) {
      console.warn('transporterMessage error:', e)
    }
  }

  // ═══════════════════ RENDER ═══════════════════
  return (
    <div>

      {/* ══════════════ HEADER ══════════════ */}
      <header className="header" style={{
        display: 'flex', flexWrap: 'wrap',
        alignItems: 'center', justifyContent: 'space-between',
        gap: '8px', padding: '8px 12px'
      }}>
        <div className="logo" onClick={goHome} style={{ cursor: 'pointer' }}>
          Zone<span>Free</span>
        </div>
        <div className="header-actions" style={{
          display: 'flex', alignItems: 'center',
          flexWrap: 'wrap', gap: '8px',
          padding: '8px 12px',
          position: 'relative', zIndex: 100,
          justifyContent: 'flex-end',
          maxWidth: '70vw'
        }}>
          <button className="btn btn-ghost" onClick={() => setDark(!dark)} style={{ minWidth: '36px', minHeight: '36px' }}>{dark ? '☀️' : '🌙'}</button>
          {account && (
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <button className="btn btn-ghost" onClick={function() { setPage('messages') }} style={{ fontSize: 16, minWidth: '36px', minHeight: '36px' }}>
                ✉️
              </button>
              {unreadCount > 0 && React.createElement('span', {
                style: {
                  position: 'absolute', top: '-4px', right: '-4px',
                  background: '#ef4444', color: '#fff',
                  borderRadius: '50%', width: '18px', height: '18px',
                  fontSize: '11px', fontWeight: 'bold',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  pointerEvents: 'none', zIndex: 10
                }
              }, unreadCount > 9 ? '9+' : String(unreadCount))}
            </div>
          )}
          <button className="btn btn-ghost" onClick={() => setPage('profil')} style={{ fontSize: 16, minWidth: '36px', minHeight: '36px' }}>👤</button>
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
      {account && !estAbonne && estGratuit && !['profil', 'messages', 'conversation'].includes(page) && (
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
      {account && !estAbonne && !estGratuit && !['profil', 'messages', 'conversation'].includes(page) && (
        <div style={{ background: 'linear-gradient(90deg,#f59e0b22,#6366f122)', border: '1.5px solid #f59e0b', borderRadius: 12, margin: '16px auto', maxWidth: 860, padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <p style={{ margin: 0, fontSize: 14 }}><strong>Vous n'êtes pas abonné.</strong> Rejoignez ZoneFree pour ~2€/mois en ETH.</p>
          <button className="btn btn-primary" onClick={sAbonner} disabled={loadingAbo} style={{ fontSize: 13, padding: '8px 20px' }}>
            {loadingAbo ? <span className="spinner">Transaction...</span> : `S'abonner ${prixEnETH} ETH — 30 jours`}
          </button>
        </div>
      )}

      {/* ══════════════ PAGE MESSAGES ══════════════ */}
      {page === 'messages' && account && (
        <MessagerieErrorBoundary>
        <div className="forum-page">
          {React.createElement('button', {
            className: 'back-btn',
            onClick: function(e) { e.preventDefault(); e.stopPropagation(); goHome() },
            onTouchEnd: function(e) { e.preventDefault(); goHome() },
            style: {
              minHeight: '44px', touchAction: 'manipulation',
              WebkitTapHighlightColor: 'transparent',
              position: 'relative', zIndex: 999
            }
          }, '← Retour à l\'accueil')}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <h2 style={{ fontSize: 22 }}>✉️ Messagerie {naclKeyPair ? '🔐 NaCl E2E' : 'locale'}</h2>
            <div style={{ display: 'flex', gap: 8 }}>
              {!naclKeyPair && (
                <button className="btn btn-ghost" onClick={initNaclKeys} disabled={naclLoading} style={{ fontSize: 12 }}>
                  {naclLoading ? <span className="spinner">Signature...</span> : '🔐 Activer E2E'}
                </button>
              )}
              <button className="btn btn-primary" onClick={() => setShowNewConversation(true)}>+ Nouveau</button>
            </div>
          </div>

          <div style={{ background: naclKeyPair ? '#22c55e11' : '#6366f111', border: `1.5px solid ${naclKeyPair ? '#22c55e44' : '#6366f133'}`, borderRadius: 10, padding: '10px 16px', marginBottom: 20, fontSize: 13 }}>
            {naclKeyPair
              ? '🔐 Chiffrement NaCl actif — Curve25519 + XSalsa20 + Poly1305'
              : '💾 Messages en clair — Cliquez "Activer E2E" pour chiffrer'}
          </div>

          {messages.length === 0
            ? <div className="no-results" style={{ textAlign: 'center', padding: 40 }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>✉️</div>
                <p style={{ opacity: 0.5 }}>Aucun message. Démarrez une conversation !</p>
              </div>
            : <div className="messages-list">
                {messages.map(function(conv) {
                  var other = conv.participants.find(function(p) { return !isMe(p) }) || conv.participants[0]
                  var lastMsg = conv.msgs && conv.msgs.length > 0 ? conv.msgs[conv.msgs.length - 1] : null
                  var preview = ''
                  if (lastMsg && lastMsg.content) {
                    if (typeof lastMsg.content === 'string') {
                      if (lastMsg.content.indexOf('{"enc":') === 0) {
                        preview = '🔒 Message chiffré'
                      } else {
                        preview = lastMsg.content.substring(0, 30)
                      }
                    } else {
                      preview = '[message]'
                    }
                  } else {
                    preview = 'Démarrer la conversation...'
                  }
                  return React.createElement('div', {
                    key: conv.id,
                    className: 'conversation-item',
                    onClick: function() { ouvrirConversation(conv) }
                  },
                    React.createElement('div', {className: 'conv-avatar'}, '🔐'),
                    React.createElement('div', {className: 'conv-info'},
                      React.createElement('div', {className: 'conv-name'}, getPseudoOrAddr(other)),
                      React.createElement('div', {className: 'conv-preview'}, preview)
                    )
                  )
                })}
              </div>
          }

          {(function() {
            var membres = membresListe || []
            var lowerAcc = String(account || '').toLowerCase()
            var autres = membres.filter(function(m) {
              return m && m.address && String(m.address).toLowerCase() !== lowerAcc
            })
            return React.createElement('div', { style: { marginTop: 28 } },
              React.createElement('h3', { style: { fontSize: 16, marginBottom: 12, opacity: 0.8 } }, '👥 Membres'),
              autres.length === 0
                ? React.createElement('div', { style: { opacity: 0.5, fontSize: 13, padding: 12 } }, 'Aucun membre connu pour le moment.')
                : React.createElement('div', { className: 'membres-list', style: { display: 'flex', flexDirection: 'column', gap: 8 } },
                    autres.map(function(m) {
                      var isOnline = m.lastSeen && (Date.now() - m.lastSeen) < 5 * 60 * 1000
                      var label = (m.pseudo && String(m.pseudo).trim()) ? m.pseudo : shortAddr(m.address)
                      return React.createElement('div', {
                        key: m.address,
                        style: {
                          display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                          background: dark ? '#0d1117' : '#f8f9ff',
                          border: '1.5px solid', borderColor: dark ? '#30363d' : '#e2e8f0',
                          borderRadius: 10
                        }
                      },
                        React.createElement('div', { style: { fontSize: 22 } }, m.avatar || '👤'),
                        React.createElement('div', { style: { flex: 1, fontWeight: 600 } }, label),
                        React.createElement('span', {
                          title: isOnline ? 'En ligne' : 'Hors ligne',
                          style: {
                            width: '12px', height: '12px', borderRadius: '50%',
                            background: isOnline ? '#22c55e' : '#6b7280',
                            display: 'inline-block', flexShrink: 0,
                            boxShadow: isOnline ? '0 0 6px #22c55e' : 'none'
                          }
                        }),
                        React.createElement('button', {
                          className: 'btn btn-ghost',
                          style: { fontSize: 14, padding: '6px 10px' },
                          onClick: function() { demarrerConversationAvec(m.address) }
                        }, '💬')
                      )
                    })
                  )
            )
          })()}

          {showNewConversation && (
            <div style={{ position: 'fixed', inset: 0, background: '#0008', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
              <div style={{ background: dark ? '#161b22' : 'white', borderRadius: 16, padding: 32, width: 440, border: '1.5px solid #6366f1' }}>
                <h2 style={{ marginBottom: 8, color: '#6366f1' }}>✉️ Nouveau message</h2>
                {naclKeyPair && <p style={{ fontSize: 13, opacity: 0.6, marginBottom: 16 }}>Chiffrement NaCl actif — entrez l'adresse du destinataire</p>}
                <label style={{ fontSize: 13, opacity: 0.7 }}>Adresse du destinataire</label>
                <input value={newMessageTo} onChange={e => setNewMessageTo(e.target.value)} style={inputStyle} placeholder="0x... ou 0xABCD...1234" />
                <div style={{ display: 'flex', gap: 12 }}>
                  <button className="btn btn-primary" onClick={demarrerConversation} style={{ flex: 1 }}>Démarrer</button>
                  <button className="btn btn-ghost" onClick={() => setShowNewConversation(false)} style={{ flex: 1 }}>Annuler</button>
                </div>
              </div>
            </div>
          )}
        </div>
        </MessagerieErrorBoundary>
      )}

      {/* ══════════════ PAGE CONVERSATION LOCALE ══════════════ */}
      {page === 'conversation' && activeConversation && (
        <div className="forum-page" style={{ position: 'relative', overflow: 'visible' }}>
          <div style={{ position: 'relative', zIndex: 999, overflow: 'visible', marginBottom: 12 }}>
          {React.createElement('button', {
            onClick: function(e) {
              e.preventDefault()
              e.stopPropagation()
              activeConvKeyRef.current = null
              setPage('messages')
              setActiveConversation(null)
            },
            onTouchEnd: function(e) {
              e.preventDefault()
              activeConvKeyRef.current = null
              setPage('messages')
              setActiveConversation(null)
            },
            style: {
              display: 'inline-flex', alignItems: 'center',
              padding: '12px 20px', fontSize: '16px', cursor: 'pointer',
              background: 'none', border: '2px solid #6c47ff',
              borderRadius: '8px', color: '#6c47ff',
              minHeight: '48px', minWidth: '80px',
              touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent',
              userSelect: 'none', WebkitUserSelect: 'none',
              position: 'relative', zIndex: 999
            }
          }, '← Retour')}
          </div>
          <h2>💬 {getPseudoOrAddr(activeConversation.participants.find(function(p) { return !isMe(p) }) || activeConversation.participants[0])}</h2>
          <div className="chat-container">
            {activeConversation.msgs.length === 0 && (
              <div style={{textAlign:'center', opacity:0.4, marginTop:40}}>Aucun message — Dites bonjour ! 👋</div>
            )}
            {activeConversation.msgs.map(function(m) {
              var estMoi = isMe(m.from) || (m.fromAddr && String(m.fromAddr).toLowerCase() === String(account || '').toLowerCase())
              var contenu = ''
              if (m && m.content) {
                if (typeof m.content === 'string') {
                  contenu = m.content
                } else {
                  contenu = String(m.content)
                }
              }
              var displayContent = m.content
              if (m.content && typeof m.content === 'string' && m.content.indexOf('{"enc":') === 0) {
                try {
                  var mySecB64R = localStorage.getItem('zonefree-nacl-sec-' + String(account || '').toLowerCase())
                  var parsed = JSON.parse(m.content)
                  var otherPartR = ''
                  if (activeConversation && activeConversation.participants) {
                    for (var pi = 0; pi < activeConversation.participants.length; pi++) {
                      var pp = String(activeConversation.participants[pi]).toLowerCase()
                      if (pp !== String(account || '').toLowerCase()) { otherPartR = pp; break }
                    }
                  }
                  var senderPubB64 = otherPartR ? localStorage.getItem('zonefree-nacl-pub-' + otherPartR) : null
                  if (mySecB64R && senderPubB64) {
                    var encBytes = new Uint8Array(atob(parsed.enc).split('').map(function(c) { return c.charCodeAt(0) }))
                    var nonceBytes = new Uint8Array(atob(parsed.nonce).split('').map(function(c) { return c.charCodeAt(0) }))
                    var mySecR = new Uint8Array(atob(mySecB64R).split('').map(function(c) { return c.charCodeAt(0) }))
                    var senderPub = new Uint8Array(atob(senderPubB64).split('').map(function(c) { return c.charCodeAt(0) }))
                    var decrypted = nacl.box.open(encBytes, nonceBytes, senderPub, mySecR)
                    displayContent = decrypted ? new TextDecoder().decode(decrypted) : '[clé incorrecte]'
                  } else {
                    displayContent = '[clé manquante]'
                  }
                } catch (e) {
                  displayContent = '[erreur déchiffrement]'
                }
              }
              contenu = typeof displayContent === 'string' ? displayContent : String(displayContent || '')
              var wrapperClass = estMoi ? 'bubble-wrapper sent' : 'bubble-wrapper received'
              var bubbleClass = estMoi ? 'bubble sent' : 'bubble received'
              return React.createElement('div', {key: m.id, className: wrapperClass},
                m.type === 'image'
                  ? React.createElement('img', {src: contenu, alt: 'img', style: {maxWidth:240, borderRadius:12}})
                  : React.createElement('div', {className: bubbleClass}, contenu),
                React.createElement('div', {className: 'bubble-time'}, m.date)
              )
            })}
          </div>
          {React.createElement('div', {
            style: {
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '12px 16px', width: '100%', boxSizing: 'border-box',
              borderTop: '1px solid #333', background: '#111'
            }
          },
            React.createElement('input', {
              type: 'file', accept: 'image/*',
              id: 'inputImageMsg',
              style: { display: 'none' },
              onChange: function(e) {
                if (e.target.files && e.target.files[0]) {
                  envoyerImage(e)
                }
              }
            }),
            React.createElement('button', {
              onClick: function() {
                var el = document.getElementById('inputImageMsg')
                if (el) el.click()
              },
              style: {
                background: 'none', border: '1px solid #555', borderRadius: '8px',
                color: '#fff', fontSize: '20px', cursor: 'pointer',
                padding: '6px 10px', flexShrink: '0'
              }
            }, '🖼️'),
            React.createElement('input', {
              type: 'text',
              placeholder: 'Écrire un message... (Entrée)',
              value: newMessage,
              onChange: function(e) { setNewMessage(e.target.value) },
              onKeyDown: function(e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); envoyerMessage() } },
              style: {
                flex: '1', minHeight: '44px', fontSize: '16px',
                padding: '10px 14px', boxSizing: 'border-box',
                borderRadius: '10px', border: '1px solid #444',
                background: '#222', color: '#fff', outline: 'none'
              }
            }),
            React.createElement('button', {
              onClick: function() { envoyerMessage() },
              style: {
                background: '#6c47ff', border: 'none', borderRadius: '8px',
                color: '#fff', fontSize: '18px', cursor: 'pointer',
                padding: '8px 14px', flexShrink: '0'
              }
            }, '➤')
          )}
        </div>
      )}

      {/* ══════════════ PAGE PROFIL ══════════════ */}
      {page === 'profil' && account && (
        <div className="forum-page">
          {React.createElement('button', {
            className: 'back-btn',
            onClick: function(e) { e.preventDefault(); e.stopPropagation(); goHome() },
            onTouchEnd: function(e) { e.preventDefault(); goHome() },
            style: {
              minHeight: '44px', touchAction: 'manipulation',
              WebkitTapHighlightColor: 'transparent',
              position: 'relative', zIndex: 999
            }
          }, '← Retour à l\'accueil')}

          {/* CARTE IDENTITÉ */}
          <div style={{ borderRadius: 20, padding: 36, marginBottom: 24, background: dark ? '#161b22' : '#ffffff', border: '1.5px solid #6366f1', textAlign: 'center' }}>
            <div style={{ fontSize: 64, marginBottom: 12 }}>🦊</div>
            {editPseudo ? (
              <div style={{ marginBottom: 16 }}>
                <input value={newPseudo} onChange={e => setNewPseudo(e.target.value)}
                  style={inputStyleCenter}
                  placeholder="Votre pseudo..." autoFocus />
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                  <button className="btn btn-primary" onClick={function() {
                    var clean = newPseudo.trim()
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
              ].map(function(item, i) { return (
                <div key={i} style={{ borderRadius: 12, padding: 20, background: dark ? '#0d1117' : '#f8f9ff', border: '1.5px solid', borderColor: dark ? '#30363d' : '#e2e8f0' }}>
                  <div style={{ fontSize: 12, opacity: 0.5, marginBottom: 6 }}>{item.label}</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: item.color || 'inherit' }}>{item.value}</div>
                </div>
              )})}
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
                { label: 'Topics créés', value: forums.reduce(function(a, f) { return a + f.topics.filter(function(t) { return t.author === displayName(account) }).length }, 0), icon: '📝' },
                { label: 'Réponses', value: forums.reduce(function(a, f) { return a + f.topics.reduce(function(b, t) { return b + t.replies.filter(function(r) { return r.author === displayName(account) }).length }, 0) }, 0), icon: '💬' },
                { label: 'Messages', value: messages.reduce(function(a, c) { return a + c.msgs.filter(function(m) { return m.from === shortAddr(account) }).length }, 0), icon: '✉️' }
              ].map(function(stat, i) { return (
                <div key={i} style={{ borderRadius: 12, padding: 20, textAlign: 'center', background: dark ? '#0d1117' : '#f8f9ff', border: '1.5px solid', borderColor: dark ? '#30363d' : '#e2e8f0' }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>{stat.icon}</div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: '#6366f1' }}>{stat.value}</div>
                  <div style={{ fontSize: 12, opacity: 0.6, marginTop: 4 }}>{stat.label}</div>
                </div>
              )})}
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

              {/* 🔐 NaCl E2E */}
              <div style={{ padding: '16px 20px', borderRadius: 12, background: dark ? '#0d1117' : '#f8f9ff', border: '1.5px solid', borderColor: dark ? '#30363d' : '#e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>🔐 Chiffrement NaCl</div>
                    <div style={{ fontSize: 12, opacity: 0.6 }}>
                      {naclKeyPair ? 'Curve25519 + XSalsa20 + Poly1305 actif' : 'Chiffrement de bout en bout des messages'}
                    </div>
                  </div>
                  {naclKeyPair
                    ? <span style={{ fontSize: 13, color: '#22c55e', fontWeight: 700, background: '#22c55e22', border: '1px solid #22c55e44', borderRadius: 20, padding: '6px 14px' }}>✅ Actif</span>
                    : <button className="btn btn-primary" onClick={initNaclKeys} disabled={naclLoading} style={{ fontSize: 13, padding: '8px 18px' }}>
                        {naclLoading ? <span className="spinner">Signature...</span> : 'Activer'}
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
                {forumsFiltered.map(function(f) { return (
                  <div key={f.id} className="forum-card" onClick={function() { openForum(f) }}>
                    <div className="forum-emoji">{f.emoji}</div>
                    <div className="forum-name">{f.name}</div>
                    <div className="forum-desc">{f.description}</div>
                    <div className="forum-meta">
                      <span>{f.topics.length} topics</span>
                      <span>{f.topics.reduce(function(a, t) { return a + t.replies.length }, 0)} réponses</span>
                      {f.topics.some(function(t) { return t.pinned }) && <span>📌</span>}
                    </div>
                    {account && estAbonne && (
                      f.creator === account ||
                      f.auteur === account ||
                      f.author === account ||
                      f.createur === account ||
                      String(f.creator || '').toLowerCase() === String(account).toLowerCase() ||
                      String(f.auteur || '').toLowerCase() === String(account).toLowerCase()
                    ) && (
                      <button
                        onClick={function(e) { e.preventDefault(); e.stopPropagation(); supprimerSalon(f.id) }}
                        onTouchEnd={function(e) { e.preventDefault(); e.stopPropagation(); supprimerSalon(f.id) }}
                        style={{
                          marginTop: 8, fontSize: 11, color: '#ef4444',
                          background: 'none', border: '1px solid #ef444444',
                          borderRadius: 6, padding: '8px 14px', cursor: 'pointer',
                          minHeight: '44px', touchAction: 'manipulation',
                          WebkitTapHighlightColor: 'transparent'
                        }}>
                        🗑️ Supprimer
                      </button>
                    )}
                  </div>
                )})}
              </div>
          }
        </div>
      )}

      {/* ══════════════ PAGE FORUM ══════════════ */}
      {page === 'forum' && activeForum && (
        <div className="forum-page" style={{ position: 'relative', overflow: 'visible' }}>
          <div style={{ position: 'relative', zIndex: 1000, display: 'block', overflow: 'visible' }}>
          {React.createElement('button', {
            className: 'back-btn',
            onClick: function(e) { e.preventDefault(); e.stopPropagation(); goHome() },
            onTouchEnd: function(e) { e.preventDefault(); e.stopPropagation(); goHome() },
            style: {
              minHeight: '44px', touchAction: 'manipulation',
              WebkitTapHighlightColor: 'transparent',
              position: 'relative', zIndex: 1000
            }
          }, '← Retour aux forums')}
          </div>
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
            {[['date', 'Plus récents'], ['popular', 'Populaires'], ['replies', 'Plus de réponses']].map(function(item) {
              var val = item[0]
              var label = item[1]
              return (
                <button key={val} className={'sort-btn ' + (sortBy === val ? 'active' : '')} onClick={function() { setSortBy(val); setCurrentPage(1) }}>{label}</button>
              )
            })}
          </div>
          {topicsPaginated.length === 0
            ? <div className="no-results"><span>🔍</span><p>Aucun topic trouvé.</p></div>
            : topicsPaginated.map(function(t) {
                var likeKey = activeForum.id + '-' + t.id
                var likeData = getLike(likeKey)
                var count = likeData.count
                var hasLiked = likeData.hasLiked
                return (
                  <div key={t.id} className="topic-card" onClick={function() { openTopic(t) }}>
                    <div style={{ flex: 1 }}>
                      <div className="topic-title">
                        {t.pinned && <span style={{ marginRight: 6 }}>📌</span>}
                        {t.title}
                      </div>
                      <div className="topic-meta">par {t.author} · {t.date}</div>
                      <div style={{ marginTop: 8 }} onClick={function(e) { e.stopPropagation() }}>
                        <button className={'like-btn ' + (hasLiked ? 'liked' : '')} onClick={function() { toggleLike(likeKey) }}>
                          ❤️ {count > 0 ? count : ''} J'aime
                        </button>
                        {estAbonne && (
                          <button className="like-btn" onClick={function(e) { e.stopPropagation(); togglePin(t.id) }} style={{ marginLeft: 8, opacity: 0.7 }}>
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
              <button className="page-btn" disabled={currentPage === 1} onClick={function() { setCurrentPage(function(p) { return p - 1 }) }}>←</button>
              {pageNums.map(function(n) { return (
                <button key={n} className={'page-btn ' + (currentPage === n ? 'active' : '')} onClick={function() { setCurrentPage(n) }}>{n}</button>
              )})}
              <button className="page-btn" disabled={currentPage === totalPages} onClick={function() { setCurrentPage(function(p) { return p + 1 }) }}>→</button>
            </div>
          )}
        </div>
      )}

      {/* ══════════════ PAGE TOPIC ══════════════ */}
      {page === 'topic' && activeTopic && (
        <div className="forum-page" style={{ position: 'relative', overflow: 'visible' }}>
          <div style={{ position: 'relative', zIndex: 1000, display: 'block', overflow: 'visible' }}>
          {React.createElement('button', {
            className: 'back-btn',
            onClick: function(e) { e.preventDefault(); e.stopPropagation(); goForum() },
            onTouchEnd: function(e) { e.preventDefault(); e.stopPropagation(); goForum() },
            style: {
              minHeight: '44px', touchAction: 'manipulation',
              WebkitTapHighlightColor: 'transparent',
              position: 'relative', zIndex: 1000
            }
          }, '← Retour ' + ((activeForum && activeForum.emoji) || '') + ' ' + ((activeForum && activeForum.name) || ''))}
          </div>
          <div style={{ borderRadius: 14, padding: 28, marginBottom: 24, background: dark ? '#161b22' : '#ffffff', border: '1.5px solid #6366f1' }}>
            <h2 style={{ fontSize: 22, marginBottom: 12 }}>
              {activeTopic.pinned && <span style={{ marginRight: 8 }}>📌</span>}
              {activeTopic.title}
            </h2>
            <p style={{ opacity: 0.5, fontSize: 13, marginBottom: 16 }}>par <strong>{activeTopic.author}</strong> · {activeTopic.date}</p>
            {activeTopic.content && <p style={{ fontSize: 15, lineHeight: 1.7 }}>{activeTopic.content}</p>}
            <div style={{ marginTop: 16 }}>
              <button className={'like-btn ' + (getLike((activeForum ? activeForum.id : '') + '-' + activeTopic.id).hasLiked ? 'liked' : '')} onClick={function() { toggleLike((activeForum ? activeForum.id : '') + '-' + activeTopic.id) }}>
                ❤️ {getLike((activeForum ? activeForum.id : '') + '-' + activeTopic.id).count || ''} J'aime
              </button>
            </div>
          </div>
          <h3 style={{ marginBottom: 16, opacity: 0.7 }}>
            {activeTopic.replies.length} réponse{activeTopic.replies.length !== 1 ? 's' : ''}
          </h3>
          {activeTopic.replies.map(function(r) { return (
            <div key={r.id} style={{ borderRadius: 12, padding: '16px 20px', marginBottom: 12, background: dark ? '#161b22' : '#ffffff', border: '1.5px solid', borderColor: dark ? '#30363d' : '#e2e8f0' }}>
              <p style={{ fontSize: 13, opacity: 0.5, marginBottom: 8 }}><strong>{r.author}</strong> · {r.date}</p>
              <p style={{ fontSize: 15, lineHeight: 1.6 }}>{r.content}</p>
              <button className={'like-btn ' + (getLike('reply-' + r.id).hasLiked ? 'liked' : '')} style={{ marginTop: 8 }} onClick={function() { toggleLike('reply-' + r.id) }}>
                ❤️ {getLike('reply-' + r.id).count || ''} J'aime
              </button>
            </div>
          )})}
          <div style={{ borderRadius: 14, padding: 24, marginTop: 24, background: dark ? '#161b22' : '#ffffff', border: '1.5px solid', borderColor: dark ? '#30363d' : '#e2e8f0' }}>
            <h3 style={{ marginBottom: 16 }}>✍️ Votre réponse</h3>
            {!account && <p style={{ opacity: 0.6, marginBottom: 12, fontSize: 14 }}>Connectez MetaMask pour répondre</p>}
            {account && !estAbonne && <p style={{ color: '#f59e0b', marginBottom: 12, fontSize: 14 }}>Abonnez-vous pour répondre</p>}
            <textarea value={newReply} onChange={e => setNewReply(e.target.value)} placeholder="Écrivez votre réponse..." rows={4}
              style={inputStyleResize} disabled={!estAbonne} />
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
            <textarea value={newTopic.content} onChange={e => setNewTopic({ ...newTopic, content: e.target.value })} style={inputStyleResize} rows={4} placeholder="Développez..." />
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
              style={inputStyleSmall}
              placeholder="eyJhbGci... (votre 4EVERLAND JWT)"
              type="password"
              autoFocus
            />
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={function() {
                if (!neweverlandJWT.trim()) { alert('JWT vide !'); return }
                var jwt = neweverlandJWT.trim()
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

export { AppErrorBoundary }
export default App

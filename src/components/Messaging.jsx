// components/Messaging.jsx — Messagerie admin → citoyens
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Send, Mail, MailOpen, RefreshCw, Plus, Trash2, Reply,
  User, Clock, ChevronRight, Search, Filter, X,
  MessageSquare, CheckCheck, AlertCircle, BarChart2,
} from 'lucide-react';

// ─── Hook dark mode ───────────────────────────────────────────────────────────
function useDark() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const check = () => setDark(document.documentElement.classList.contains('dark'));
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);
  return dark;
}

const TYPE_FR = {
  water_pollution:'Pollution eau', air_pollution:'Pollution air',
  soil_contamination:'Contamination sol', waste_deposit:'Dépôt déchets',
  dust:'Poussière', abandoned_site:'Site abandonné', noise_pollution:'Pollution sonore',
  other:'Autre',
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';
const af = async (path, opts = {}) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('remine_admin_token') : '';
  const res = await fetch(`${API_BASE}/${path.replace(/^\/api\//, '').replace(/^api\//, '')}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...opts.headers },
  });
  return res.json();
};

const fmtDate   = d => d ? new Date(d).toLocaleDateString('fr-FR', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '—';
const fmtAgo    = d => {
  if (!d) return '—';
  const diff = Date.now() - new Date(d);
  const m = Math.floor(diff / 60000), h = Math.floor(diff / 3600000), jj = Math.floor(diff / 86400000);
  if (m < 1)  return 'À l\'instant';
  if (m < 60) return `il y a ${m}min`;
  if (h < 24) return `il y a ${h}h`;
  return `il y a ${jj}j`;
};
const initials  = u => u ? `${(u.firstName||'')[0]||''}${(u.lastName||'')[0]||''}`.toUpperCase() || '?' : '?';
const fullName  = u => u ? `${u.firstName||''} ${u.lastName||''}`.trim() || u.email || 'Inconnu' : 'Inconnu';

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ user, size = 36, color = '#10b981' }) {
  return (
    <div style={{ width:size, height:size, borderRadius:'50%', background:`linear-gradient(135deg,${color},${color}cc)`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:size*0.38, fontWeight:800, color:'#fff', flexShrink:0, boxShadow:`0 2px 8px ${color}44` }}>
      {initials(user)}
    </div>
  );
}

// ─── Modal nouveau message ────────────────────────────────────────────────────
function NewMessageModal({ users, reports, onClose, onSent, prefillTo, prefillReport, dm }) {
  const [to,       setTo]       = useState(prefillTo     || '');
  const [subject,  setSubject]  = useState('');
  const [content,  setContent]  = useState('');
  const [reportId, setReportId] = useState(prefillReport || '');
  const [sending,  setSending]  = useState(false);
  const [error,    setError]    = useState('');
  const textRef = useRef(null);

  useEffect(() => { textRef.current?.focus(); }, []);

  const citizens = useMemo(() => (users || []).filter(u => u.role === 'citizen'), [users]);

  const handleSend = async () => {
    if (!to)             { setError('Veuillez sélectionner un destinataire'); return; }
    if (!subject.trim()) { setError('Le sujet est requis'); return; }
    if (!content.trim()) { setError('Le message ne peut pas être vide'); return; }
    setSending(true); setError('');
    try {
      const data = await af('/api/messages', {
        method: 'POST',
        body: JSON.stringify({ toUserId: to, subject: subject.trim(), content: content.trim(), reportId: reportId || undefined }),
      });
      if (data.success) { onSent(data.data); onClose(); }
      else setError(data.error || 'Erreur lors de l\'envoi');
    } catch { setError('Erreur de connexion au serveur'); }
    finally { setSending(false); }
  };

  const cardBg  = dm ? '#1e293b' : '#fff';
  const inputBg = dm ? '#0f172a' : '#f8fafc';
  const border  = dm ? '#334155' : '#e2e8f0';
  const textPri = dm ? '#f1f5f9' : '#0f172a';
  const textSec = dm ? '#94a3b8' : '#6b7280';

  return (
    <div style={{ position:'fixed', inset:0, zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.5)', backdropFilter:'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background:cardBg, borderRadius:24, width:'min(560px,95vw)', maxHeight:'92vh', overflow:'hidden', display:'flex', flexDirection:'column', boxShadow:'0 32px 80px rgba(0,0,0,0.3)', border:`1px solid ${border}`, animation:'remine-scale-in 0.2s both' }}>

        {/* En-tête */}
        <div style={{ background:'linear-gradient(135deg,#059669,#047857)', padding:'18px 24px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <Send size={18} color="#fff" />
            <h3 style={{ fontSize:15, fontWeight:800, color:'#fff', margin:0 }}>Nouveau message</h3>
          </div>
          <button onClick={onClose} style={{ width:30, height:30, borderRadius:'50%', background:'rgba(255,255,255,0.2)', border:'none', cursor:'pointer', color:'#fff', fontSize:16, display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
        </div>

        {/* Corps */}
        <div style={{ flex:1, overflowY:'auto', padding:'20px 24px', display:'flex', flexDirection:'column', gap:14 }}>
          {error && (
            <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 14px', background:'#fee2e2', border:'1px solid #fecaca', borderRadius:10, fontSize:12, color:'#dc2626', fontWeight:600 }}>
              <AlertCircle size={14} /> {error}
            </div>
          )}

          {/* Destinataire */}
          <div>
            <label style={{ fontSize:10, fontWeight:800, color:textSec, textTransform:'uppercase', letterSpacing:1, display:'block', marginBottom:6 }}>Destinataire *</label>
            <select value={to} onChange={e => setTo(e.target.value)} style={{ width:'100%', padding:'9px 12px', borderRadius:10, border:`1px solid ${border}`, background:inputBg, color:textPri, fontSize:13, outline:'none', fontFamily:'inherit', cursor:'pointer' }}>
              <option value="">— Sélectionner un citoyen —</option>
              {citizens.map(u => <option key={u._id||u.id} value={u._id||u.id}>{fullName(u)} ({u.email})</option>)}
            </select>
          </div>

          {/* Sujet */}
          <div>
            <label style={{ fontSize:10, fontWeight:800, color:textSec, textTransform:'uppercase', letterSpacing:1, display:'block', marginBottom:6 }}>Sujet *</label>
            <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Objet du message…"
              style={{ width:'100%', padding:'9px 12px', borderRadius:10, border:`1px solid ${border}`, background:inputBg, color:textPri, fontSize:13, outline:'none', fontFamily:'inherit', boxSizing:'border-box' }} />
          </div>

          {/* Signalement lié */}
          <div>
            <label style={{ fontSize:10, fontWeight:800, color:textSec, textTransform:'uppercase', letterSpacing:1, display:'block', marginBottom:6 }}>Signalement lié <span style={{ opacity:0.6, fontWeight:500 }}>(optionnel)</span></label>
            <select value={reportId} onChange={e => setReportId(e.target.value)} style={{ width:'100%', padding:'9px 12px', borderRadius:10, border:`1px solid ${border}`, background:inputBg, color:textPri, fontSize:13, outline:'none', fontFamily:'inherit', cursor:'pointer' }}>
              <option value="">— Aucun signalement —</option>
              {(reports || []).slice(0, 50).map(r => <option key={r._id||r.id} value={r._id||r.id}>#{(r._id||r.id||'').toString().slice(-6)} — {TYPE_FR[r.type]||r.type} — {r.location?.city||'—'}</option>)}
            </select>
          </div>

          {/* Contenu */}
          <div>
            <label style={{ fontSize:10, fontWeight:800, color:textSec, textTransform:'uppercase', letterSpacing:1, display:'block', marginBottom:6 }}>Message *</label>
            <textarea ref={textRef} value={content} onChange={e => setContent(e.target.value)}
              placeholder="Rédigez votre message au citoyen…" rows={6}
              style={{ width:'100%', padding:'10px 12px', borderRadius:10, border:`1px solid ${border}`, background:inputBg, color:textPri, fontSize:13, outline:'none', fontFamily:'inherit', resize:'vertical', lineHeight:1.6, boxSizing:'border-box' }} />
            <p style={{ fontSize:10, color:textSec, marginTop:4, textAlign:'right' }}>{content.length}/5000</p>
          </div>
        </div>

        {/* Pied */}
        <div style={{ padding:'14px 24px', borderTop:`1px solid ${border}`, display:'flex', gap:10, justifyContent:'flex-end' }}>
          <button onClick={onClose} style={{ padding:'9px 18px', borderRadius:10, border:`1px solid ${border}`, background:'transparent', color:textSec, fontSize:13, fontWeight:600, cursor:'pointer' }}>Annuler</button>
          <button onClick={handleSend} disabled={sending || !to || !subject.trim() || !content.trim()} style={{ padding:'9px 20px', borderRadius:10, border:'none', background: sending||!to||!subject.trim()||!content.trim() ? '#d1d5db' : 'linear-gradient(135deg,#10b981,#059669)', color:'#fff', fontSize:13, fontWeight:700, cursor: sending||!to||!subject.trim()||!content.trim() ? 'not-allowed' : 'pointer', display:'flex', alignItems:'center', gap:8, boxShadow: sending||!to||!subject.trim()||!content.trim() ? 'none' : '0 4px 12px rgba(16,185,129,0.35)' }}>
            {sending ? <><span style={{ width:13, height:13, border:'2px solid rgba(255,255,255,0.4)', borderTopColor:'#fff', borderRadius:'50%', animation:'remine-spin 0.7s linear infinite', display:'inline-block' }}/> Envoi…</> : <><Send size={13}/> Envoyer</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Vue détail message ───────────────────────────────────────────────────────
function MessageDetail({ msg, onReply, onDelete, onRefresh, dm }) {
  const [loadingDelete, setLoadingDelete] = useState(false);
  const [showReply,     setShowReply]     = useState(false);
  const [replyContent,  setReplyContent]  = useState('');
  const [sendingReply,  setSendingReply]  = useState(false);

  const border  = dm ? '#334155' : '#f1f5f9';
  const textPri = dm ? '#f1f5f9' : '#0f172a';
  const textSec = dm ? '#94a3b8' : '#6b7280';
  const bgMut   = dm ? '#0f172a' : '#f8fafc';

  const handleDelete = async () => {
    if (!window.confirm('Supprimer ce message définitivement ?')) return;
    setLoadingDelete(true);
    try { await af(`/api/messages/${msg._id}`, { method:'DELETE' }); onDelete(msg._id); }
    catch {} finally { setLoadingDelete(false); }
  };

  const handleReply = async () => {
    if (!replyContent.trim()) return;
    setSendingReply(true);
    try {
      const data = await af('/api/messages', {
        method:'POST',
        body: JSON.stringify({
          toUserId: msg.to?._id || msg.to,
          subject:  `Re: ${msg.subject}`,
          content:  replyContent.trim(),
          reportId: msg.reportId?._id || msg.reportId || undefined,
          parentId: msg._id,
        }),
      });
      if (data.success) { setReplyContent(''); setShowReply(false); onRefresh(); }
    } catch {} finally { setSendingReply(false); }
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:0, height:'100%' }}>
      {/* En-tête message */}
      <div style={{ padding:'18px 22px', borderBottom:`1px solid ${border}` }}>
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12, marginBottom:12 }}>
          <h3 style={{ fontSize:16, fontWeight:800, color:textPri, margin:0, lineHeight:1.4 }}>{msg.subject}</h3>
          <div style={{ display:'flex', gap:6, flexShrink:0 }}>
            <button onClick={() => { setShowReply(r => !r); }} style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 12px', borderRadius:8, border:`1px solid ${border}`, background:showReply?'#ecfdf5':'transparent', color:showReply?'#059669':textSec, fontSize:12, fontWeight:600, cursor:'pointer' }}>
              <Reply size={13}/> Répondre
            </button>
            <button onClick={handleDelete} disabled={loadingDelete} style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 10px', borderRadius:8, border:'1px solid #fecaca', background:dm?'rgba(239,68,68,0.08)':'#fee2e2', color:'#dc2626', fontSize:12, cursor:'pointer' }}>
              {loadingDelete ? <span style={{ width:12, height:12, border:'2px solid #dc2626', borderTopColor:'transparent', borderRadius:'50%', animation:'remine-spin 0.7s linear infinite', display:'inline-block' }}/> : <Trash2 size={13}/>}
            </button>
          </div>
        </div>

        {/* Infos expéditeur/destinataire */}
        <div style={{ display:'flex', gap:16, flexWrap:'wrap' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <Avatar user={msg.from} size={32} color="#3b82f6" />
            <div>
              <p style={{ fontSize:11, fontWeight:700, color:textPri, margin:0 }}>{fullName(msg.from)}</p>
              <p style={{ fontSize:10, color:textSec, margin:'1px 0 0' }}>{msg.from?.role === 'admin' ? '🔴 Admin' : '🟣 Modérateur'}</p>
            </div>
          </div>
          <ChevronRight size={16} color={textSec} style={{ alignSelf:'center' }} />
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <Avatar user={msg.to} size={32} color="#10b981" />
            <div>
              <p style={{ fontSize:11, fontWeight:700, color:textPri, margin:0 }}>{fullName(msg.to)}</p>
              <p style={{ fontSize:10, color:textSec, margin:'1px 0 0' }}>{msg.to?.email}</p>
              {msg.to?.community && <p style={{ fontSize:10, color:'#10b981', margin:'1px 0 0' }}>📍 {msg.to.community}</p>}
            </div>
          </div>
        </div>

        <div style={{ display:'flex', gap:10, marginTop:10, flexWrap:'wrap', alignItems:'center' }}>
          <span style={{ display:'flex', alignItems:'center', gap:4, fontSize:10, color:textSec }}><Clock size={11}/> {fmtDate(msg.createdAt)}</span>
          <span style={{ padding:'2px 8px', borderRadius:99, fontSize:10, fontWeight:700, background:msg.read?'#dcfce7':'#fef9c3', color:msg.read?'#16a34a':'#a16207', display:'flex', alignItems:'center', gap:4 }}>
            {msg.read ? <><CheckCheck size={10}/> Lu {msg.readAt ? `le ${fmtDate(msg.readAt)}` : ''}</> : <><Mail size={10}/> Non lu</>}
          </span>
          {msg.reportId && (
            <span style={{ padding:'2px 8px', borderRadius:99, fontSize:10, fontWeight:600, background:'#dbeafe', color:'#1d4ed8' }}>
              📋 {TYPE_FR[msg.reportId.type]||msg.reportId.type} — {msg.reportId.location?.city||'—'}
            </span>
          )}
        </div>
      </div>

      {/* Contenu */}
      <div style={{ flex:1, overflowY:'auto', padding:'18px 22px' }}>
        <div style={{ background:bgMut, borderRadius:14, padding:'16px 18px', border:`1px solid ${border}`, marginBottom:16 }}>
          <p style={{ fontSize:13, color:textPri, lineHeight:1.75, margin:0, whiteSpace:'pre-wrap' }}>{msg.content}</p>
        </div>

        {/* Réponses du thread */}
        {msg.replies?.length > 0 && (
          <div>
            <p style={{ fontSize:10, fontWeight:800, color:textSec, textTransform:'uppercase', letterSpacing:1, margin:'0 0 10px' }}>
              {msg.replies.length} réponse{msg.replies.length > 1 ? 's' : ''}
            </p>
            {msg.replies.map((r, i) => (
              <div key={r._id||i} style={{ display:'flex', gap:10, marginBottom:10 }}>
                <Avatar user={r.from} size={28} color="#3b82f6" />
                <div style={{ flex:1, background:bgMut, borderRadius:12, padding:'10px 14px', border:`1px solid ${border}` }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                    <span style={{ fontSize:11, fontWeight:700, color:textPri }}>{fullName(r.from)}</span>
                    <span style={{ fontSize:10, color:textSec }}>{fmtAgo(r.createdAt)}</span>
                  </div>
                  <p style={{ fontSize:12, color:textPri, margin:0, lineHeight:1.6, whiteSpace:'pre-wrap' }}>{r.content}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Zone de réponse */}
        {showReply && (
          <div style={{ background:bgMut, borderRadius:14, padding:'14px', border:`1px solid #bbf7d0`, marginTop:8 }}>
            <p style={{ fontSize:11, fontWeight:700, color:'#10b981', margin:'0 0 8px' }}>↩️ Répondre à {fullName(msg.to)}</p>
            <textarea value={replyContent} onChange={e => setReplyContent(e.target.value)}
              placeholder="Votre réponse…" rows={4}
              style={{ width:'100%', padding:'10px 12px', borderRadius:10, border:`1px solid ${border}`, background:dm?'#1e293b':'#fff', color:textPri, fontSize:13, outline:'none', fontFamily:'inherit', resize:'vertical', lineHeight:1.6, boxSizing:'border-box', marginBottom:10 }} />
            <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
              <button onClick={() => setShowReply(false)} style={{ padding:'7px 14px', borderRadius:8, border:`1px solid ${border}`, background:'transparent', color:textSec, fontSize:12, fontWeight:600, cursor:'pointer' }}>Annuler</button>
              <button onClick={handleReply} disabled={sendingReply || !replyContent.trim()} style={{ padding:'7px 14px', borderRadius:8, border:'none', background:'linear-gradient(135deg,#10b981,#059669)', color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:6 }}>
                {sendingReply ? <span style={{ width:11, height:11, border:'2px solid rgba(255,255,255,0.4)', borderTopColor:'#fff', borderRadius:'50%', animation:'remine-spin 0.7s linear infinite', display:'inline-block' }}/> : <Send size={11}/>} Envoyer
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────
export const Messaging = ({ users = [], reports = [] }) => {
  const [messages,  setMessages]  = useState([]);
  const [selected,  setSelected]  = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [showNew,   setShowNew]   = useState(false);
  const [filter,    setFilter]    = useState('all');
  const [search,    setSearch]    = useState('');
  const [stats,     setStats]     = useState(null);
  const dm = useDark();

  const cardBg  = dm ? '#1e293b' : '#fff';
  const border  = dm ? '#334155' : '#f1f5f9';
  const textPri = dm ? '#f1f5f9' : '#0f172a';
  const textSec = dm ? '#94a3b8' : '#6b7280';
  const textMut = dm ? '#64748b' : '#9ca3af';
  const bgMut   = dm ? '#0f172a' : '#f8fafc';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [msgData, statsData] = await Promise.all([
        af('/api/messages/all'),
        af('/api/messages/stats'),
      ]);
      if (msgData.success) setMessages(msgData.data || []);
      if (statsData.success) setStats(statsData.data);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { const t = setInterval(load, 30000); return () => clearInterval(t); }, [load]);

  // Marquer comme lu à la sélection
  useEffect(() => {
    if (!selected || selected.read) return;
    af(`/api/messages/${selected._id}/read`, { method:'PUT' }).then(() => {
      setMessages(prev => prev.map(m => m._id === selected._id ? { ...m, read:true, readAt:new Date() } : m));
      setSelected(prev => prev ? { ...prev, read:true, readAt:new Date() } : prev);
    }).catch(() => {});
  }, [selected]);

  const loadDetail = useCallback(async (msg) => {
    try {
      const data = await af(`/api/messages/${msg._id}`);
      if (data.success) setSelected(data.data);
      else setSelected(msg);
    } catch { setSelected(msg); }
  }, []);

  const handleDelete = (id) => {
    setMessages(prev => prev.filter(m => m._id !== id));
    setSelected(null);
  };

  const filtered = useMemo(() => {
    let list = messages;
    if (filter === 'unread') list = list.filter(m => !m.read);
    if (filter === 'read')   list = list.filter(m =>  m.read);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(m =>
        fullName(m.to).toLowerCase().includes(q) ||
        (m.subject || '').toLowerCase().includes(q) ||
        (m.content  || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [messages, filter, search]);

  const unreadCount = messages.filter(m => !m.read).length;

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

      {/* Modal nouveau message */}
      {showNew && (
        <NewMessageModal users={users} reports={reports}
          onClose={() => setShowNew(false)}
          onSent={msg => { setMessages(prev => [msg, ...prev]); setShowNew(false); load(); }}
          dm={dm} />
      )}

      {/* ── KPIs stats ── */}
      {stats && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
          {[
            { label:'Total envoyés',   val:stats.total,     icon:<Mail size={18}/>,          color:'#3b82f6', bg:dm?'rgba(59,130,246,0.1)':'#eff6ff' },
            { label:'Non lus',         val:stats.unread,    icon:<MailOpen size={18}/>,       color:stats.unread>0?'#ef4444':'#10b981', bg:stats.unread>0?(dm?'rgba(239,68,68,0.1)':'#fee2e2'):(dm?'rgba(16,185,129,0.1)':'#dcfce7') },
            { label:'Cette semaine',   val:stats.thisWeek,  icon:<BarChart2 size={18}/>,      color:'#8b5cf6', bg:dm?'rgba(139,92,246,0.1)':'#ede9fe' },
            { label:'Citoyens contactés', val:stats.topRecipients?.length||0, icon:<User size={18}/>, color:'#f59e0b', bg:dm?'rgba(245,158,11,0.1)':'#fffbeb' },
          ].map(s => (
            <div key={s.label} style={{ background:cardBg, borderRadius:16, padding:'14px 16px', border:`1px solid ${border}`, display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ width:40, height:40, borderRadius:12, background:s.bg, display:'flex', alignItems:'center', justifyContent:'center', color:s.color, flexShrink:0 }}>{s.icon}</div>
              <div>
                <p style={{ fontSize:22, fontWeight:900, color:s.color, margin:0, fontVariantNumeric:'tabular-nums' }}>{s.val}</p>
                <p style={{ fontSize:10, color:textMut, margin:'2px 0 0' }}>{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Liste + Détail ── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1.8fr', gap:14, minHeight:500 }}>

        {/* Panneau liste */}
        <div style={{ background:cardBg, borderRadius:20, border:`1px solid ${border}`, overflow:'hidden', display:'flex', flexDirection:'column' }}>
          {/* Header liste */}
          <div style={{ padding:'14px 16px', borderBottom:`1px solid ${border}`, flexShrink:0 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <MessageSquare size={16} color="#10b981" />
                <span style={{ fontSize:14, fontWeight:800, color:textPri }}>Messages</span>
                {unreadCount > 0 && <span style={{ fontSize:11, fontWeight:700, padding:'2px 7px', borderRadius:99, background:'#ef4444', color:'#fff' }}>{unreadCount}</span>}
              </div>
              <div style={{ display:'flex', gap:6 }}>
                <button onClick={load} style={{ width:30, height:30, borderRadius:8, border:`1px solid ${border}`, background:'transparent', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:textSec }}><RefreshCw size={13}/></button>
                <button onClick={() => setShowNew(true)} style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 10px', borderRadius:8, border:'none', background:'linear-gradient(135deg,#10b981,#059669)', color:'#fff', fontSize:11, fontWeight:700, cursor:'pointer' }}>
                  <Plus size={13}/> Nouveau
                </button>
              </div>
            </div>
            {/* Recherche */}
            <div style={{ position:'relative' }}>
              <Search size={12} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:textMut }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher…"
                style={{ width:'100%', paddingLeft:30, paddingRight:10, paddingTop:6, paddingBottom:6, borderRadius:8, border:`1px solid ${border}`, background:bgMut, color:textPri, fontSize:11, outline:'none', fontFamily:'inherit', boxSizing:'border-box' }} />
            </div>
            {/* Filtres */}
            <div style={{ display:'flex', gap:4, marginTop:8 }}>
              {[{v:'all',l:'Tous'},{v:'unread',l:'Non lus'},{v:'read',l:'Lus'}].map(f => (
                <button key={f.v} onClick={() => setFilter(f.v)} style={{ flex:1, padding:'4px', borderRadius:7, border:'none', cursor:'pointer', fontSize:10, fontWeight:600, background:filter===f.v?'#10b981':(dm?'#334155':'#f1f5f9'), color:filter===f.v?'#fff':textSec, transition:'all 0.15s' }}>
                  {f.l}
                </button>
              ))}
            </div>
          </div>

          {/* Liste messages */}
          <div style={{ flex:1, overflowY:'auto' }}>
            {loading ? (
              Array.from({length:4}).map((_,i) => (
                <div key={i} style={{ padding:'12px 16px', borderBottom:`1px solid ${border}`, display:'flex', gap:10 }}>
                  <div style={{ width:34, height:34, borderRadius:'50%', background:dm?'#334155':'#f1f5f9', flexShrink:0 }} />
                  <div style={{ flex:1 }}>
                    <div style={{ height:12, borderRadius:6, background:dm?'#334155':'#f1f5f9', marginBottom:6 }} />
                    <div style={{ height:10, borderRadius:6, background:dm?'#334155':'#f1f5f9', width:'60%' }} />
                  </div>
                </div>
              ))
            ) : filtered.length === 0 ? (
              <div style={{ textAlign:'center', padding:'40px 20px', color:textMut }}>
                <Mail size={32} style={{ margin:'0 auto 10px', opacity:0.3 }} />
                <p style={{ fontSize:13, margin:0 }}>{search ? 'Aucun résultat' : filter !== 'all' ? 'Aucun message' : 'Aucun message envoyé'}</p>
                {!search && filter === 'all' && <button onClick={() => setShowNew(true)} style={{ marginTop:12, fontSize:12, color:'#10b981', fontWeight:700, background:'none', border:'none', cursor:'pointer' }}>+ Envoyer le premier message</button>}
              </div>
            ) : filtered.map(msg => (
              <div key={msg._id} onClick={() => loadDetail(msg)} style={{ padding:'12px 16px', borderBottom:`1px solid ${border}`, cursor:'pointer', transition:'background 0.15s', background: selected?._id === msg._id ? (dm?'rgba(16,185,129,0.1)':'#ecfdf5') : 'transparent', borderLeft: selected?._id === msg._id ? '3px solid #10b981' : '3px solid transparent' }}
                onMouseEnter={e => { if (selected?._id !== msg._id) e.currentTarget.style.background = dm?'#0f172a':'#f8fafc'; }}
                onMouseLeave={e => { if (selected?._id !== msg._id) e.currentTarget.style.background = 'transparent'; }}>
                <div style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
                  <Avatar user={msg.to} size={34} color={msg.read ? '#64748b' : '#10b981'} />
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                      <p style={{ fontSize:12, fontWeight: msg.read?600:800, color:textPri, margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{fullName(msg.to)}</p>
                      <span style={{ fontSize:9, color:textMut, flexShrink:0, marginLeft:6 }}>{fmtAgo(msg.createdAt)}</span>
                    </div>
                    <p style={{ fontSize:11, fontWeight: msg.read?400:700, color: msg.read?textSec:textPri, margin:'0 0 2px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{msg.subject}</p>
                    <p style={{ fontSize:10, color:textMut, margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{(msg.content||'').substring(0,60)}</p>
                  </div>
                  {!msg.read && <span style={{ width:8, height:8, borderRadius:'50%', background:'#10b981', flexShrink:0, marginTop:4 }} />}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Panneau détail */}
        <div style={{ background:cardBg, borderRadius:20, border:`1px solid ${border}`, overflow:'hidden', display:'flex', flexDirection:'column' }}>
          {selected ? (
            <MessageDetail msg={selected} onDelete={handleDelete} onRefresh={() => loadDetail(selected)} onReply={() => {}} dm={dm} />
          ) : (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', padding:'40px', color:textMut, gap:12 }}>
              <Mail size={48} style={{ opacity:0.2 }} />
              <p style={{ fontSize:14, fontWeight:600, margin:0, color:textSec }}>Sélectionnez un message</p>
              <p style={{ fontSize:12, margin:0 }}>ou envoyez-en un nouveau</p>
              <button onClick={() => setShowNew(true)} style={{ marginTop:8, display:'flex', alignItems:'center', gap:8, padding:'9px 18px', borderRadius:10, border:'none', background:'linear-gradient(135deg,#10b981,#059669)', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', boxShadow:'0 4px 12px rgba(16,185,129,0.3)' }}>
                <Plus size={14}/> Nouveau message
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
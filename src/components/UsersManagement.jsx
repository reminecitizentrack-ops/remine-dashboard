// components/UsersManagement.jsx — Gestion complète des utilisateurs
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Users, UserCheck, UserX, Shield, Edit3, Trash2,
  Ban, CheckCircle, Mail, MapPin, Calendar, Clock,
  BarChart2, FileText, Save, X, AlertTriangle,
  ChevronDown, Search, RefreshCw, Eye, MessageSquare,
} from 'lucide-react';
import { dashboardAPI } from '../services/api';

// ─── Constantes ───────────────────────────────────────────────────────────────
const ROLE_CFG = {
  citizen:   { label:'Citoyen',         color:'#10b981', bg:'#dcfce7',  icon:<UserCheck size={13}/> },
  admin:     { label:'Administrateur',  color:'#3b82f6', bg:'#dbeafe',  icon:<Shield    size={13}/> },
  moderator: { label:'Modérateur',      color:'#8b5cf6', bg:'#ede9fe',  icon:<Eye       size={13}/> },
};
const STATUS_CFG = {
  active:  { label:'Actif',   color:'#10b981', bg:'#dcfce7' },
  banned:  { label:'Banni',   color:'#dc2626', bg:'#fee2e2' },
  inactive:{ label:'Inactif', color:'#6b7280', bg:'#f3f4f6' },
};
const TYPE_FR = {
  water_pollution:'Pollution eau', air_pollution:'Pollution air',
  soil_contamination:'Contamination sol', waste_deposit:'Dépôt déchets',
  dust:'Poussière', abandoned_site:'Site abandonné',
  noise_pollution:'Pollution sonore', other:'Autre',
};
const SEV_COLOR = { critical:'#dc2626', high:'#f97316', medium:'#f59e0b', low:'#22c55e' };

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';
const af  = async (path, opts = {}) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('remine_admin_token') : '';
  const res   = await fetch(`${API}/${path.replace(/^\/api\//, '')}`, {
    ...opts,
    headers: { 'Content-Type':'application/json', Authorization:`Bearer ${token}`, ...opts.headers },
  });
  return res.json();
};

const fmtDate  = d => d ? new Date(d).toLocaleDateString('fr-FR', { day:'numeric', month:'short', year:'numeric' }) : '—';
const fmtFull  = d => d ? new Date(d).toLocaleDateString('fr-FR', { day:'numeric', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '—';
const initials = u => u ? `${(u.firstName||'')[0]||''}${(u.lastName||'')[0]||''}`.toUpperCase() || '?' : '?';
const fullName = u => u ? `${u.firstName||''} ${u.lastName||''}`.trim() || u.email || 'Inconnu' : 'Inconnu';
const getUserStatus = u => u.isBanned ? 'banned' : u.isActive !== false ? 'active' : 'inactive';

// ─── Hook dark mode ───────────────────────────────────────────────────────────
function useDark() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const check = () => setDark(document.documentElement.classList.contains('dark'));
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes:true, attributeFilter:['class'] });
    return () => obs.disconnect();
  }, []);
  return dark;
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ user, size = 40 }) {
  const role  = user?.role || 'citizen';
  const color = ROLE_CFG[role]?.color || '#6b7280';
  const st    = getUserStatus(user);
  return (
    <div style={{ position:'relative', flexShrink:0 }}>
      <div style={{ width:size, height:size, borderRadius:'50%', background:`linear-gradient(135deg,${color},${color}bb)`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:size*0.38, fontWeight:800, color:'#fff', boxShadow:`0 2px 8px ${color}44` }}>
        {initials(user)}
      </div>
      <span style={{ position:'absolute', bottom:0, right:0, width:10, height:10, borderRadius:'50%', background:st==='active'?'#10b981':st==='banned'?'#dc2626':'#9ca3af', border:'2px solid #fff' }} />
    </div>
  );
}

// ─── Badge ────────────────────────────────────────────────────────────────────
function Badge({ type, value, dm }) {
  const cfg = type === 'role' ? ROLE_CFG[value] : STATUS_CFG[value];
  if (!cfg) return <span style={{ fontSize:11 }}>{value}</span>;
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'2px 9px', borderRadius:99, background:dm?`${cfg.color}20`:cfg.bg, color:cfg.color, fontSize:11, fontWeight:700, border:`1px solid ${cfg.color}30` }}>
      {type === 'role' && cfg.icon} {cfg.label}
    </span>
  );
}

// ─── Modal profil utilisateur ─────────────────────────────────────────────────
function UserProfileModal({ userId, onClose, onUpdate, onNotify, dm }) {
  const [data,     setData]     = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [tab,      setTab]      = useState('profile'); // profile | reports | ban | notes
  const [saving,   setSaving]   = useState(false);
  const [edit,     setEdit]     = useState({});
  const [banForm,  setBanForm]  = useState({ reason:'', durationDays:'' });
  const [notes,    setNotes]    = useState('');
  const [confirm,  setConfirm]  = useState(null); // 'ban' | 'unban' | 'delete'

  const cardBg  = dm ? '#1e293b' : '#fff';
  const border  = dm ? '#334155' : '#f1f5f9';
  const textPri = dm ? '#f1f5f9' : '#0f172a';
  const textSec = dm ? '#94a3b8' : '#6b7280';
  const bgMut   = dm ? '#0f172a' : '#f8fafc';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await af(`/api/admin/users/${userId}/detail`);
      if (res.success) {
        setData(res.data);
        setEdit({ firstName:res.data.firstName||'', lastName:res.data.lastName||'', email:res.data.email||'', community:res.data.community||'', phone:res.data.phone||'', role:res.data.role||'citizen' });
        setNotes(res.data.notes || '');
      }
    } catch {} finally { setLoading(false); }
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const res = await af(`/api/admin/users/${userId}/profile`, { method:'PATCH', body:JSON.stringify(edit) });
      if (res.success) { onUpdate(res.data); setData(d => ({ ...d, ...res.data })); onNotify('Profil mis à jour', 'success'); }
      else onNotify(res.error || 'Erreur', 'error');
    } catch { onNotify('Erreur réseau', 'error'); } finally { setSaving(false); }
  };

  const handleBan = async () => {
    if (!banForm.reason.trim()) { onNotify('Raison requise', 'error'); return; }
    setSaving(true);
    try {
      const res = await af(`/api/admin/users/${userId}/ban`, {
        method:'POST',
        body: JSON.stringify({ reason: banForm.reason.trim(), durationDays: banForm.durationDays ? Number(banForm.durationDays) : undefined }),
      });
      if (res.success) { onUpdate(res.data); setData(d=>({...d,...res.data})); onNotify(res.message, 'success'); setConfirm(null); }
      else onNotify(res.error || 'Erreur', 'error');
    } catch { onNotify('Erreur réseau', 'error'); } finally { setSaving(false); }
  };

  const handleUnban = async () => {
    setSaving(true);
    try {
      const res = await af(`/api/admin/users/${userId}/unban`, { method:'POST' });
      if (res.success) { onUpdate(res.data); setData(d=>({...d,...res.data})); onNotify(res.message, 'success'); setConfirm(null); }
      else onNotify(res.error || 'Erreur', 'error');
    } catch { onNotify('Erreur réseau', 'error'); } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      const res = await dashboardAPI.deleteUser(userId);
      if (res.success) { onUpdate(null, true); onNotify('Utilisateur supprimé', 'success'); onClose(); }
      else onNotify(res.error || 'Erreur', 'error');
    } catch { onNotify('Erreur réseau', 'error'); } finally { setSaving(false); }
  };

  const handleSaveNotes = async () => {
    setSaving(true);
    try {
      const res = await af(`/api/admin/users/${userId}/notes`, { method:'PATCH', body:JSON.stringify({ notes }) });
      if (res.success) { setData(d=>({...d, notes})); onNotify('Notes sauvegardées', 'success'); }
    } catch {} finally { setSaving(false); }
  };

  const TABS = [
    { id:'profile', label:'Profil',    icon:<Edit3     size={13}/> },
    { id:'reports', label:'Signalements', icon:<BarChart2 size={13}/> },
    { id:'ban',     label:'Ban/Accès', icon:<Ban       size={13}/> },
    { id:'notes',   label:'Notes',     icon:<FileText  size={13}/> },
  ];

  return (
    <div style={{ position:'fixed', top:0, left:0, right:0, bottom:0, zIndex:99999, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.5)', backdropFilter:'blur(4px)' }}
      onClick={e => { if (e.target===e.currentTarget) onClose(); }}>
      <div style={{ background:cardBg, borderRadius:24, width:'min(680px,95vw)', maxHeight:'92vh', display:'flex', flexDirection:'column', boxShadow:'0 32px 80px rgba(0,0,0,0.3)', border:`1px solid ${border}`, overflow:'hidden', animation:'remine-scale-in 0.2s both' }}>

        {loading ? (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:60 }}>
            <div style={{ width:24, height:24, border:'2px solid #10b981', borderTopColor:'transparent', borderRadius:'50%', animation:'remine-spin 0.7s linear infinite' }}/>
          </div>
        ) : !data ? (
          <div style={{ padding:40, textAlign:'center', color:textSec }}>Utilisateur non trouvé</div>
        ) : (
          <>
            {/* ── En-tête ── */}
            <div style={{ background:`linear-gradient(135deg,${ROLE_CFG[data.role]?.color||'#6b7280'}22,${bgMut})`, padding:'20px 24px', borderBottom:`1px solid ${border}`, flexShrink:0 }}>
              <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                <Avatar user={data} size={52} />
                <div style={{ flex:1 }}>
                  <h3 style={{ fontSize:17, fontWeight:900, color:textPri, margin:0 }}>{fullName(data)}</h3>
                  <p style={{ fontSize:12, color:textSec, margin:'3px 0 6px' }}>{data.email}</p>
                  <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                    <Badge type="role"   value={data.role}                dm={dm} />
                    <Badge type="status" value={getUserStatus(data)}      dm={dm} />
                    {data.community && <span style={{ fontSize:11, color:textSec }}>📍 {data.community}</span>}
                    {data.loginCount > 0 && <span style={{ fontSize:11, color:textSec }}>🔐 {data.loginCount} connexions</span>}
                  </div>
                </div>
                <button onClick={onClose} style={{ width:32, height:32, borderRadius:'50%', background:dm?'#334155':'#f1f5f9', border:'none', cursor:'pointer', color:textSec, fontSize:16, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700 }}>✕</button>
              </div>
            </div>

            {/* ── Onglets ── */}
            <div style={{ display:'flex', gap:2, padding:'10px 24px 0', flexShrink:0 }}>
              {TABS.map(t => (
                <button key={t.id} onClick={() => setTab(t.id)} style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:'8px 8px 0 0', border:`1px solid ${dm?'#334155':'#e2e8f0'}`, borderBottom:`2px solid ${tab===t.id?cardBg:(dm?'#334155':'#e2e8f0')}`, background:tab===t.id?cardBg:(dm?'#0f172a':'#f8fafc'), color:tab===t.id?textPri:textSec, fontSize:12, fontWeight:tab===t.id?700:500, cursor:'pointer', marginBottom:tab===t.id?-1:0, transition:'all 0.15s' }}>
                  {t.icon} {t.label}
                </button>
              ))}
            </div>

            {/* ── Corps ── */}
            <div style={{ flex:1, overflowY:'auto', padding:'20px 24px' }}>

              {/* ── PROFIL ── */}
              {tab === 'profile' && (
                <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                    {[
                      { key:'firstName', label:'Prénom' },
                      { key:'lastName',  label:'Nom'    },
                      { key:'email',     label:'Email'  },
                      { key:'phone',     label:'Téléphone', placeholder:'+221 XX XXX XX XX' },
                      { key:'community', label:'Communauté / Ville' },
                    ].map(f => (
                      <div key={f.key} style={{ gridColumn: f.key==='community'||f.key==='email' ? 'span 2' : 'auto' }}>
                        <label style={{ fontSize:10, fontWeight:700, color:textSec, textTransform:'uppercase', letterSpacing:0.8, display:'block', marginBottom:5 }}>{f.label}</label>
                        <input value={edit[f.key]||''} onChange={e => setEdit(p=>({...p,[f.key]:e.target.value}))} placeholder={f.placeholder||''}
                          style={{ width:'100%', padding:'8px 12px', borderRadius:10, border:`1px solid ${border}`, background:bgMut, color:textPri, fontSize:13, outline:'none', fontFamily:'inherit', boxSizing:'border-box' }} />
                      </div>
                    ))}
                    <div>
                      <label style={{ fontSize:10, fontWeight:700, color:textSec, textTransform:'uppercase', letterSpacing:0.8, display:'block', marginBottom:5 }}>Rôle</label>
                      <select value={edit.role} onChange={e=>setEdit(p=>({...p,role:e.target.value}))}
                        style={{ width:'100%', padding:'8px 12px', borderRadius:10, border:`1px solid ${border}`, background:bgMut, color:textPri, fontSize:13, outline:'none', fontFamily:'inherit', cursor:'pointer' }}>
                        <option value="citizen">Citoyen</option>
                        <option value="moderator">Modérateur</option>
                        <option value="admin">Administrateur</option>
                      </select>
                    </div>
                  </div>

                  {/* Infos lecture seule */}
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginTop:4 }}>
                    {[
                      { label:'Inscrit le',      val:fmtDate(data.createdAt)  },
                      { label:'Dernière connexion', val:fmtDate(data.lastLogin) },
                      { label:'Signalements',    val:data.stats?.totalReports||0 },
                    ].map(s => (
                      <div key={s.label} style={{ padding:'10px 12px', background:bgMut, borderRadius:10, border:`1px solid ${border}`, textAlign:'center' }}>
                        <p style={{ fontSize:16, fontWeight:900, color:textPri, margin:0 }}>{s.val}</p>
                        <p style={{ fontSize:9, color:textSec, margin:'3px 0 0', textTransform:'uppercase', letterSpacing:0.5 }}>{s.label}</p>
                      </div>
                    ))}
                  </div>

                  <button onClick={handleSaveProfile} disabled={saving} style={{ alignSelf:'flex-end', display:'flex', alignItems:'center', gap:8, padding:'9px 20px', borderRadius:10, border:'none', background:'linear-gradient(135deg,#10b981,#059669)', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', boxShadow:'0 4px 12px rgba(16,185,129,0.3)' }}>
                    {saving ? <span style={{ width:13, height:13, border:'2px solid rgba(255,255,255,0.4)', borderTopColor:'#fff', borderRadius:'50%', animation:'remine-spin 0.7s linear infinite', display:'inline-block' }}/> : <Save size={14}/>} Sauvegarder
                  </button>
                </div>
              )}

              {/* ── SIGNALEMENTS ── */}
              {tab === 'reports' && (
                <div>
                  {/* Stats globales */}
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:16 }}>
                    {[
                      { label:'Total',    val:data.stats?.totalReports||0,                                color:'#3b82f6' },
                      { label:'Résolus',  val:data.stats?.byStatus?.resolved||0,                          color:'#10b981' },
                      { label:'Nouveaux', val:data.stats?.byStatus?.new||0,                               color:'#f59e0b' },
                      { label:'En cours', val:(data.stats?.byStatus?.verified||0)+(data.stats?.byStatus?.in_progress||0), color:'#8b5cf6' },
                    ].map(s => (
                      <div key={s.label} style={{ padding:'10px', background:bgMut, borderRadius:12, border:`1px solid ${border}`, textAlign:'center' }}>
                        <p style={{ fontSize:20, fontWeight:900, color:s.color, margin:0 }}>{s.val}</p>
                        <p style={{ fontSize:10, color:textSec, margin:'2px 0 0' }}>{s.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Derniers signalements */}
                  <p style={{ fontSize:11, fontWeight:700, color:textSec, textTransform:'uppercase', letterSpacing:0.8, margin:'0 0 10px' }}>5 derniers signalements</p>
                  {!data.recentReports?.length ? (
                    <p style={{ fontSize:13, color:textSec, textAlign:'center', padding:'20px 0' }}>Aucun signalement</p>
                  ) : data.recentReports.map((r, i) => (
                    <div key={r._id||i} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 0', borderBottom:`1px solid ${border}` }}>
                      <div style={{ width:8, height:8, borderRadius:'50%', background:SEV_COLOR[r.severity]||'#6b7280', flexShrink:0 }} />
                      <div style={{ flex:1 }}>
                        <p style={{ fontSize:12, fontWeight:600, color:textPri, margin:0 }}>{TYPE_FR[r.type]||r.type}</p>
                        <p style={{ fontSize:10, color:textSec, margin:'2px 0 0' }}>📍 {r.location?.city||'—'} · {fmtDate(r.createdAt)}</p>
                      </div>
                      <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:99, background:`${SEV_COLOR[r.severity]||'#6b7280'}18`, color:SEV_COLOR[r.severity]||'#6b7280' }}>{r.severity}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* ── BAN / ACCÈS ── */}
              {tab === 'ban' && (
                <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                  {/* Statut actuel */}
                  <div style={{ padding:'14px 16px', background:data.isBanned?(dm?'rgba(239,68,68,0.08)':'#fef2f2'):(dm?'rgba(16,185,129,0.08)':'#ecfdf5'), borderRadius:14, border:`1px solid ${data.isBanned?'#fecaca':'#bbf7d0'}` }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      {data.isBanned ? <Ban size={20} color="#dc2626"/> : <CheckCircle size={20} color="#10b981"/>}
                      <div>
                        <p style={{ fontSize:13, fontWeight:800, color:data.isBanned?'#dc2626':'#10b981', margin:0 }}>
                          {data.isBanned ? 'Utilisateur banni' : 'Accès actif'}
                        </p>
                        {data.isBanned && (
                          <>
                            {data.banReason && <p style={{ fontSize:11, color:'#dc2626', margin:'3px 0 0' }}>Raison : {data.banReason}</p>}
                            {data.banExpiry && <p style={{ fontSize:11, color:'#dc2626', margin:'2px 0 0' }}>Expire le : {fmtFull(data.banExpiry)}</p>}
                            {!data.banExpiry && <p style={{ fontSize:11, color:'#dc2626', margin:'2px 0 0' }}>Ban permanent</p>}
                            {data.bannedAt  && <p style={{ fontSize:11, color:textSec, margin:'2px 0 0' }}>Banni le : {fmtFull(data.bannedAt)}</p>}
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Formulaire ban */}
                  {!data.isBanned && (
                    <div style={{ background:bgMut, borderRadius:14, padding:'16px', border:`1px solid ${border}` }}>
                      <p style={{ fontSize:12, fontWeight:800, color:'#dc2626', margin:'0 0 12px', display:'flex', alignItems:'center', gap:6 }}><Ban size={14}/> Bannir cet utilisateur</p>
                      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                        <div>
                          <label style={{ fontSize:10, fontWeight:700, color:textSec, display:'block', marginBottom:5, textTransform:'uppercase', letterSpacing:0.8 }}>Raison *</label>
                          <input value={banForm.reason} onChange={e=>setBanForm(f=>({...f,reason:e.target.value}))} placeholder="Ex: Signalements abusifs, spam…"
                            style={{ width:'100%', padding:'8px 12px', borderRadius:10, border:`1px solid ${border}`, background:dm?'#1e293b':'#fff', color:textPri, fontSize:12, outline:'none', fontFamily:'inherit', boxSizing:'border-box' }} />
                        </div>
                        <div>
                          <label style={{ fontSize:10, fontWeight:700, color:textSec, display:'block', marginBottom:5, textTransform:'uppercase', letterSpacing:0.8 }}>Durée (laisser vide = permanent)</label>
                          <select value={banForm.durationDays} onChange={e=>setBanForm(f=>({...f,durationDays:e.target.value}))}
                            style={{ width:'100%', padding:'8px 12px', borderRadius:10, border:`1px solid ${border}`, background:dm?'#1e293b':'#fff', color:textPri, fontSize:12, outline:'none', fontFamily:'inherit', cursor:'pointer' }}>
                            <option value="">Permanent</option>
                            <option value="1">1 jour</option>
                            <option value="3">3 jours</option>
                            <option value="7">7 jours</option>
                            <option value="30">30 jours</option>
                            <option value="90">90 jours</option>
                          </select>
                        </div>
                        {confirm === 'ban' ? (
                          <div style={{ display:'flex', gap:8 }}>
                            <button onClick={handleBan} disabled={saving} style={{ flex:1, padding:'9px', borderRadius:10, border:'none', background:'linear-gradient(135deg,#dc2626,#991b1b)', color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer' }}>
                              {saving ? '…' : '✓ Confirmer le ban'}
                            </button>
                            <button onClick={()=>setConfirm(null)} style={{ padding:'9px 14px', borderRadius:10, border:`1px solid ${border}`, background:'transparent', color:textSec, fontSize:12, cursor:'pointer' }}>Annuler</button>
                          </div>
                        ) : (
                          <button onClick={()=>setConfirm('ban')} disabled={!banForm.reason.trim()} style={{ padding:'9px', borderRadius:10, border:'1px solid #fecaca', background:dm?'rgba(239,68,68,0.1)':'#fee2e2', color:'#dc2626', fontSize:12, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                            <Ban size={13}/> Bannir l'utilisateur
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Débannir */}
                  {data.isBanned && (
                    <div style={{ display:'flex', gap:8 }}>
                      {confirm === 'unban' ? (
                        <>
                          <button onClick={handleUnban} disabled={saving} style={{ flex:1, padding:'9px', borderRadius:10, border:'none', background:'linear-gradient(135deg,#10b981,#059669)', color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer' }}>
                            {saving ? '…' : '✓ Confirmer le débannissement'}
                          </button>
                          <button onClick={()=>setConfirm(null)} style={{ padding:'9px 14px', borderRadius:10, border:`1px solid ${border}`, background:'transparent', color:textSec, fontSize:12, cursor:'pointer' }}>Annuler</button>
                        </>
                      ) : (
                        <button onClick={()=>setConfirm('unban')} style={{ flex:1, padding:'9px', borderRadius:10, border:'1px solid #bbf7d0', background:dm?'rgba(16,185,129,0.1)':'#ecfdf5', color:'#10b981', fontSize:12, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                          <CheckCircle size={13}/> Débannir l'utilisateur
                        </button>
                      )}
                    </div>
                  )}

                  {/* Suppression */}
                  <div style={{ marginTop:8, padding:'14px 16px', background:dm?'rgba(239,68,68,0.06)':'#fef2f2', borderRadius:14, border:'1px solid #fecaca' }}>
                    <p style={{ fontSize:11, fontWeight:800, color:'#dc2626', margin:'0 0 8px' }}>⚠️ Zone de danger</p>
                    {confirm === 'delete' ? (
                      <div style={{ display:'flex', gap:8 }}>
                        <button onClick={handleDelete} disabled={saving} style={{ flex:1, padding:'8px', borderRadius:9, border:'none', background:'#dc2626', color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer' }}>
                          {saving ? '…' : '✓ Confirmer la suppression définitive'}
                        </button>
                        <button onClick={()=>setConfirm(null)} style={{ padding:'8px 14px', borderRadius:9, border:'1px solid #fecaca', background:'transparent', color:'#dc2626', fontSize:12, cursor:'pointer' }}>Annuler</button>
                      </div>
                    ) : (
                      <button onClick={()=>setConfirm('delete')} style={{ padding:'8px 16px', borderRadius:9, border:'1px solid #fecaca', background:'transparent', color:'#dc2626', fontSize:12, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', gap:6 }}>
                        <Trash2 size={13}/> Supprimer définitivement ce compte
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* ── NOTES ── */}
              {tab === 'notes' && (
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  <p style={{ fontSize:12, color:textSec, margin:0 }}>Notes internes visibles uniquement par les administrateurs</p>
                  <textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={8} placeholder="Observations, historique, points d'attention…"
                    style={{ width:'100%', padding:'12px 14px', borderRadius:12, border:`1px solid ${border}`, background:bgMut, color:textPri, fontSize:13, outline:'none', fontFamily:'inherit', resize:'vertical', lineHeight:1.6, boxSizing:'border-box' }} />
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span style={{ fontSize:10, color:textSec }}>{notes.length} caractères</span>
                    <button onClick={handleSaveNotes} disabled={saving} style={{ display:'flex', alignItems:'center', gap:7, padding:'8px 16px', borderRadius:10, border:'none', background:'linear-gradient(135deg,#10b981,#059669)', color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer' }}>
                      {saving ? <span style={{ width:11, height:11, border:'2px solid rgba(255,255,255,0.4)', borderTopColor:'#fff', borderRadius:'50%', animation:'remine-spin 0.7s linear infinite', display:'inline-block' }}/> : <Save size={13}/>} Sauvegarder
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────
export function UsersManagement({ users: initialUsers = [], onNotify }) {
  const [users,    setUsers]    = useState(initialUsers);
  const [search,   setSearch]   = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy,   setSortBy]   = useState('createdAt');
  const [selectedId, setSelectedId] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const dm = useDark();

  useEffect(() => { setUsers(initialUsers); }, [initialUsers]);

  const filtered = useMemo(() => {
    let list = users;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(u =>
        fullName(u).toLowerCase().includes(q) ||
        (u.email||'').toLowerCase().includes(q) ||
        (u.community||'').toLowerCase().includes(q)
      );
    }
    if (roleFilter !== 'all')   list = list.filter(u => u.role === roleFilter);
    if (statusFilter === 'active')   list = list.filter(u => !u.isBanned && u.isActive !== false);
    if (statusFilter === 'banned')   list = list.filter(u => u.isBanned);
    if (statusFilter === 'inactive') list = list.filter(u => !u.isBanned && u.isActive === false);
    if (sortBy === 'createdAt') list = [...list].sort((a,b) => new Date(b.createdAt||0) - new Date(a.createdAt||0));
    if (sortBy === 'name')      list = [...list].sort((a,b) => fullName(a).localeCompare(fullName(b)));
    if (sortBy === 'lastLogin') list = [...list].sort((a,b) => new Date(b.lastLogin||0) - new Date(a.lastLogin||0));
    return list;
  }, [users, search, roleFilter, statusFilter, sortBy]);

  const stats = useMemo(() => ({
    total:    users.length,
    citizens: users.filter(u=>u.role==='citizen').length,
    admins:   users.filter(u=>u.role==='admin'||u.role==='moderator').length,
    banned:   users.filter(u=>u.isBanned).length,
    active:   users.filter(u=>!u.isBanned&&u.isActive!==false).length,
  }), [users]);

  const handleUpdate = (updated, deleted = false) => {
    if (deleted) { setUsers(prev => prev.filter(u => (u._id||u.id) !== selectedId)); setSelectedId(null); }
    else if (updated) { setUsers(prev => prev.map(u => (u._id||u.id)===(updated._id||updated.id) ? { ...u, ...updated } : u)); }
  };

  const cardBg  = dm ? '#1e293b' : '#fff';
  const border  = dm ? '#334155' : '#f1f5f9';
  const textPri = dm ? '#f1f5f9' : '#0f172a';
  const textSec = dm ? '#94a3b8' : '#6b7280';
  const textMut = dm ? '#64748b' : '#9ca3af';
  const bgMut   = dm ? '#0f172a' : '#f8fafc';

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

      {/* Modal profil */}
      {selectedId && (
        <UserProfileModal userId={selectedId} onClose={() => setSelectedId(null)}
          onUpdate={handleUpdate} onNotify={onNotify} dm={dm} />
      )}

      {/* ── KPIs ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:12 }}>
        {[
          { label:'Total',     val:stats.total,    icon:<Users    size={18}/>, color:'#3b82f6', bg:dm?'rgba(59,130,246,0.1)':'#eff6ff' },
          { label:'Citoyens',  val:stats.citizens, icon:<UserCheck size={18}/>,color:'#10b981', bg:dm?'rgba(16,185,129,0.1)':'#dcfce7' },
          { label:'Admins',    val:stats.admins,   icon:<Shield   size={18}/>, color:'#8b5cf6', bg:dm?'rgba(139,92,246,0.1)':'#ede9fe' },
          { label:'Actifs',    val:stats.active,   icon:<CheckCircle size={18}/>,color:'#f59e0b',bg:dm?'rgba(245,158,11,0.1)':'#fffbeb'},
          { label:'Bannis',    val:stats.banned,   icon:<Ban      size={18}/>, color:'#ef4444', bg:dm?'rgba(239,68,68,0.1)':'#fee2e2' },
        ].map(s => (
          <div key={s.label} style={{ background:cardBg, borderRadius:16, padding:'14px 16px', border:`1px solid ${border}`, display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:40, height:40, borderRadius:12, background:s.bg, display:'flex', alignItems:'center', justifyContent:'center', color:s.color, flexShrink:0 }}>{s.icon}</div>
            <div>
              <p style={{ fontSize:22, fontWeight:900, color:s.color, margin:0 }}>{s.val}</p>
              <p style={{ fontSize:10, color:textMut, margin:'2px 0 0' }}>{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Barre contrôles ── */}
      <div style={{ background:cardBg, borderRadius:18, border:`1px solid ${border}`, padding:'12px 16px', display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
        {/* Recherche */}
        <div style={{ position:'relative', flex:1, minWidth:180 }}>
          <Search size={13} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:textMut }} />
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher par nom, email, communauté…"
            style={{ width:'100%', paddingLeft:30, paddingRight:10, paddingTop:7, paddingBottom:7, borderRadius:10, border:`1px solid ${border}`, background:bgMut, color:textPri, fontSize:12, outline:'none', fontFamily:'inherit', boxSizing:'border-box' }} />
        </div>
        {/* Filtres */}
        <div style={{ display:'flex', gap:4, background:bgMut, padding:3, borderRadius:9 }}>
          {[{v:'all',l:'Tous'},{v:'citizen',l:'Citoyens'},{v:'moderator',l:'Modérateurs'},{v:'admin',l:'Admins'}].map(f=>(
            <button key={f.v} onClick={()=>setRoleFilter(f.v)} style={{ padding:'4px 10px', borderRadius:7, border:'none', cursor:'pointer', fontSize:11, fontWeight:600, background:roleFilter===f.v?'#10b981':'transparent', color:roleFilter===f.v?'#fff':textSec, transition:'all 0.15s' }}>{f.l}</button>
          ))}
        </div>
        <div style={{ display:'flex', gap:4, background:bgMut, padding:3, borderRadius:9 }}>
          {[{v:'all',l:'Tous statuts'},{v:'active',l:'Actifs'},{v:'banned',l:'Bannis'},{v:'inactive',l:'Inactifs'}].map(f=>(
            <button key={f.v} onClick={()=>setStatusFilter(f.v)} style={{ padding:'4px 10px', borderRadius:7, border:'none', cursor:'pointer', fontSize:11, fontWeight:600, background:statusFilter===f.v?(f.v==='banned'?'#dc2626':'#10b981'):'transparent', color:statusFilter===f.v?'#fff':textSec, transition:'all 0.15s' }}>{f.l}</button>
          ))}
        </div>
        <select value={sortBy} onChange={e=>setSortBy(e.target.value)} style={{ padding:'7px 10px', borderRadius:9, border:`1px solid ${border}`, background:bgMut, color:textPri, fontSize:11, outline:'none', cursor:'pointer' }}>
          <option value="createdAt">📅 Date inscription</option>
          <option value="name">👤 Nom</option>
          <option value="lastLogin">🔐 Dernière connexion</option>
        </select>
      </div>

      {/* ── Tableau ── */}
      <div style={{ background:cardBg, borderRadius:18, border:`1px solid ${border}`, overflow:'hidden' }}>
        {/* En-tête tableau */}
        <div style={{ padding:'10px 20px', borderBottom:`1px solid ${border}`, display:'flex', gap:10, alignItems:'center', justifyContent:'space-between' }}>
          <span style={{ fontSize:12, color:textSec, fontWeight:600 }}>{filtered.length} utilisateur{filtered.length>1?'s':''} {search||roleFilter!=='all'||statusFilter!=='all'?`(filtrés sur ${users.length})`:''}</span>
        </div>

        {filtered.length === 0 ? (
          <div style={{ textAlign:'center', padding:'40px', color:textMut }}>
            <Users size={32} style={{ margin:'0 auto 10px', opacity:0.3 }} />
            <p style={{ fontSize:13, margin:0 }}>Aucun utilisateur trouvé</p>
          </div>
        ) : filtered.map((user, i) => {
          const st    = getUserStatus(user);
          const stCfg = STATUS_CFG[st];
          const role  = ROLE_CFG[user.role] || ROLE_CFG.citizen;
          const isBanned = user.isBanned;

          return (
            <div key={user._id||user.id||i} style={{ display:'flex', alignItems:'center', gap:14, padding:'12px 20px', borderBottom:i<filtered.length-1?`1px solid ${border}`:'none', transition:'background 0.15s', cursor:'pointer', opacity:isBanned?0.75:1 }}
              onMouseEnter={e=>e.currentTarget.style.background=dm?'#0f172a':'#f8fafc'}
              onMouseLeave={e=>e.currentTarget.style.background='transparent'}
              onClick={() => setSelectedId(user._id||user.id)}>

              <Avatar user={user} size={42} />

              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3 }}>
                  <p style={{ fontSize:13, fontWeight:700, color:textPri, margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{fullName(user)}</p>
                  {isBanned && <span style={{ fontSize:10, fontWeight:700, padding:'1px 6px', borderRadius:99, background:'#fee2e2', color:'#dc2626', flexShrink:0 }}>🚫 Banni</span>}
                </div>
                <p style={{ fontSize:11, color:textMut, margin:0 }}>{user.email}</p>
                {user.community && <p style={{ fontSize:10, color:textSec, margin:'2px 0 0' }}>📍 {user.community}</p>}
              </div>

              <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:5 }}>
                <Badge type="role" value={user.role} dm={dm} />
                <span style={{ fontSize:10, color:textMut }}>{fmtDate(user.createdAt)}</span>
                {user.lastLogin && <span style={{ fontSize:9, color:textMut }}>🔐 {fmtDate(user.lastLogin)}</span>}
              </div>

              <div style={{ color:textMut, flexShrink:0 }}>
                <ChevronDown size={14} style={{ transform:'rotate(-90deg)' }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
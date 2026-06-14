// components/PushNotificationPanel.jsx
// Notifications push avec historique persistant, planification et statistiques
import React, { useState, useEffect, useCallback } from 'react';

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

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

const TEMPLATES = [
  { id: 'status_update', icon: '🔄', label: 'Mise à jour statut',  title: 'Votre signalement a été mis à jour',       body: "Le statut de votre signalement a changé. Consultez l'application pour plus de détails." },
  { id: 'resolved',      icon: '✅', label: 'Résolu',               title: 'Problème résolu !',                         body: 'Votre signalement a été traité et résolu. Merci pour votre contribution !' },
  { id: 'emergency',     icon: '🚨', label: 'Alerte urgente',       title: 'Alerte environnementale dans votre zone',  body: 'Un incident critique a été signalé près de chez vous. Prenez les précautions nécessaires.' },
  { id: 'community',     icon: '👥', label: 'Activité communauté',  title: 'Activité dans votre région',               body: 'De nouveaux signalements ont été enregistrés dans votre zone.' },
  { id: 'reminder',      icon: '💡', label: 'Rappel participation', title: 'ReMine a besoin de vous',                  body: 'Signalez les incidents environnementaux autour de vous. Chaque signalement compte !' },
  { id: 'custom',        icon: '✏️', label: 'Personnalisé',         title: '',                                          body: '' },
];

const SENEGAL_REGIONS = [
  'Dakar','Thiès','Diourbel','Fatick','Kaolack','Kaffrine',
  'Kolda','Louga','Matam','Saint-Louis','Sédhiou','Tambacounda','Kédougou','Ziguinchor',
];

const STATUS_CFG = {
  sent:      { label: 'Envoyé',    color: '#22c55e', bg: 'rgba(34,197,94,0.1)'  },
  scheduled: { label: 'Planifiée', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
  failed:    { label: 'Échouée',   color: '#ef4444', bg: 'rgba(239,68,68,0.1)'  },
  cancelled: { label: 'Annulée',   color: '#6b7280', bg: 'rgba(107,114,128,0.1)'},
};

function authHeader() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('remine_admin_token') : '';
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function PhonePreview({ title, body, targetLabel }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div style={{ width: 240, background: '#1a1a2e', borderRadius: 28, padding: 14, border: '3px solid #333' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, padding: '0 4px' }}>
          <span style={{ fontSize: 10, color: '#fff', fontWeight: 700 }}>9:41</span>
          <span style={{ fontSize: 10, color: '#fff' }}>📶 🔋</span>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 14, padding: 10 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <div style={{ width: 32, height: 32, background: 'rgba(45,212,96,0.2)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>🌿</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#fff' }}>ReMine</span>
                <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>maintenant</span>
              </div>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#fff', marginBottom: 2, lineHeight: 1.3 }}>{title || 'Titre de la notification'}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', lineHeight: 1.4 }}>{body ? body.substring(0, 70) + (body.length > 70 ? '…' : '') : 'Message…'}</div>
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'center', marginTop: 10 }}>
          <div style={{ width: 100, height: 3, background: 'rgba(255,255,255,0.2)', borderRadius: 2, margin: '0 auto' }} />
        </div>
      </div>
      <p style={{ fontSize: 11, color: '#6b7280', margin: 0 }}>→ {targetLabel}</p>
    </div>
  );
}

export function PushNotificationPanel({ users = [], reports = [] }) {
  const dark = useDark();
  const [activeTab, setActiveTab] = useState('send');

  const bg    = dark ? '#0f1f15' : '#ffffff';
  const card  = dark ? 'rgba(255,255,255,0.04)' : '#f9fafb';
  const bord  = dark ? 'rgba(255,255,255,0.08)' : '#e5e7eb';
  const txt   = dark ? '#f1f5f9' : '#111827';
  const muted = dark ? 'rgba(255,255,255,0.45)' : '#6b7280';
  const accent = '#2dd460';
  const inputStyle = { width: '100%', padding: '10px 12px', fontSize: 13, background: card, border: `1px solid ${bord}`, borderRadius: 10, color: txt, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' };

  // Send tab
  const [target,         setTarget]         = useState('broadcast');
  const [selectedUser,   setSelectedUser]   = useState('');
  const [selectedRegion, setSelectedRegion] = useState('');
  const [template,       setTemplate]       = useState(TEMPLATES[0]);
  const [title,          setTitle]          = useState(TEMPLATES[0].title);
  const [body,           setBody]           = useState(TEMPLATES[0].body);
  const [sending,        setSending]        = useState(false);
  const [sendResult,     setSendResult]     = useState(null);
  const [preview,        setPreview]        = useState(false);

  // Schedule tab
  const [schedTarget,   setSchedTarget]   = useState('broadcast');
  const [schedRegion,   setSchedRegion]   = useState('');
  const [schedUser,     setSchedUser]     = useState('');
  const [schedTitle,    setSchedTitle]    = useState('');
  const [schedBody,     setSchedBody]     = useState('');
  const [schedTemplate, setSchedTemplate] = useState(TEMPLATES[0]);
  const [schedDateTime, setSchedDateTime] = useState('');
  const [scheduling,    setScheduling]    = useState(false);
  const [schedResult,   setSchedResult]   = useState(null);

  // History tab
  const [history,        setHistory]        = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [histFilter,     setHistFilter]     = useState('');
  const [histPage,       setHistPage]       = useState(1);
  const [histTotal,      setHistTotal]      = useState(0);
  const [cancelling,     setCancelling]     = useState(null);

  // Stats tab
  const [stats,        setStats]        = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const detectedRegions = React.useMemo(() => {
    const s = new Set();
    reports.forEach(r => { const z = r.location?.region || r.location?.city; if (z) s.add(z); });
    const extra = Array.from(s).filter(r => !SENEGAL_REGIONS.includes(r));
    return [...SENEGAL_REGIONS, ...extra];
  }, [reports]);

  const targetLabel = target === 'broadcast' ? `Tous les citoyens (${users.length})`
    : target === 'region' ? (selectedRegion || '—')
    : users.find(u => u._id === selectedUser)?.email || '—';

  const loadHistory = useCallback(async (page = 1, filter = '') => {
    setHistoryLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 20, ...(filter ? { status: filter } : {}) });
      const res = await fetch(`${API_BASE}/notifications/history?${params}`, { headers: authHeader() });
      const data = await res.json();
      if (data.success) { setHistory(data.data.logs); setHistTotal(data.data.total); }
    } catch {}
    finally { setHistoryLoading(false); }
  }, []);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/notifications/stats`, { headers: authHeader() });
      const data = await res.json();
      if (data.success) setStats(data.data);
    } catch {}
    finally { setStatsLoading(false); }
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => { if (activeTab === 'history') loadHistory(histPage, histFilter); }, [activeTab, histPage, histFilter, loadHistory]);

  const handleSend = async () => {
    setSending(true); setSendResult(null); setPreview(false);
    try {
      const res = await fetch(`${API_BASE}/notifications/broadcast`, {
        method: 'POST', headers: authHeader(),
        body: JSON.stringify({
          title, body, target,
          targetValue: target === 'region' ? selectedRegion : selectedUser,
          region: target === 'region' ? selectedRegion : '',
          templateId: template.id, templateLabel: template.label,
          data: { type: template.id, source: 'admin_dashboard' },
        }),
      });
      const data = await res.json();
      setSendResult({ success: data.success, message: data.message || data.error, sent: data.data?.sent, total: data.data?.total });
      if (data.success) loadStats();
    } catch { setSendResult({ success: false, message: 'Erreur réseau' }); }
    finally { setSending(false); }
  };

  const handleSchedule = async () => {
    setScheduling(true); setSchedResult(null);
    try {
      const res = await fetch(`${API_BASE}/notifications/schedule`, {
        method: 'POST', headers: authHeader(),
        body: JSON.stringify({
          title: schedTitle, body: schedBody, scheduledAt: schedDateTime,
          target: schedTarget, targetValue: schedTarget === 'region' ? schedRegion : schedUser,
          templateId: schedTemplate.id, templateLabel: schedTemplate.label,
        }),
      });
      const data = await res.json();
      setSchedResult({ success: data.success, message: data.message || data.error });
      if (data.success) { loadStats(); if (activeTab === 'history') loadHistory(1, histFilter); }
    } catch { setSchedResult({ success: false, message: 'Erreur réseau' }); }
    finally { setScheduling(false); }
  };

  const handleCancel = async (id) => {
    setCancelling(id);
    try {
      await fetch(`${API_BASE}/notifications/schedule/${id}`, { method: 'DELETE', headers: authHeader() });
      loadHistory(histPage, histFilter); loadStats();
    } catch {}
    finally { setCancelling(null); }
  };

  const handleTemplate = (t) => { setTemplate(t); if (t.id !== 'custom') { setTitle(t.title); setBody(t.body); } };
  const handleSchedTemplate = (t) => { setSchedTemplate(t); if (t.id !== 'custom') { setSchedTitle(t.title); setSchedBody(t.body); } };

  const TABS = [
    { id: 'send',     label: '🚀 Envoyer'   },
    { id: 'schedule', label: '📅 Planifier'  },
    { id: 'history',  label: '📋 Historique' },
    { id: 'stats',    label: '📊 Stats'      },
  ];

  const TargetSelector = ({ value, onChange, showPickers, region, setRegion, user, setUser }) => (
    <div style={{ background: card, border: `1px solid ${bord}`, borderRadius: 12, padding: 16 }}>
      <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '1px' }}>Destinataires</p>
      <div style={{ display: 'flex', gap: 8, marginBottom: showPickers && value !== 'broadcast' ? 12 : 0 }}>
        {['broadcast', 'region', 'user'].map(t => (
          <button key={t} onClick={() => onChange(t)} style={{ flex: 1, padding: '9px 8px', fontSize: 12, fontWeight: 600, borderRadius: 10, border: `1px solid ${value === t ? accent : bord}`, background: value === t ? 'rgba(45,212,96,0.1)' : 'transparent', color: value === t ? accent : muted, cursor: 'pointer' }}>
            {t === 'broadcast' ? '🌍 Tous' : t === 'region' ? '📍 Région' : '👤 Citoyen'}
          </button>
        ))}
      </div>
      {showPickers && value === 'region' && (
        <select value={region} onChange={e => setRegion(e.target.value)} style={inputStyle}>
          <option value="">— Choisir une région —</option>
          {detectedRegions.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      )}
      {showPickers && value === 'user' && (
        <select value={user} onChange={e => setUser(e.target.value)} style={inputStyle}>
          <option value="">— Choisir un citoyen —</option>
          {users.map(u => <option key={u._id} value={u._id}>{u.firstName || ''} {u.lastName || ''} — {u.email}</option>)}
        </select>
      )}
      {showPickers && value === 'broadcast' && (
        <div style={{ marginTop: 10, background: 'rgba(45,212,96,0.07)', border: '1px solid rgba(45,212,96,0.2)', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: dark ? '#86efac' : '#166534' }}>
          ✅ Tous les citoyens avec l'app installée ({users.length} inscrits)
        </div>
      )}
    </div>
  );

  const ResultBanner = ({ result }) => result ? (
    <div style={{ background: result.success ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)', border: `1px solid ${result.success ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`, borderRadius: 10, padding: '12px 16px', color: result.success ? (dark ? '#86efac' : '#166534') : '#ef4444', fontSize: 13 }}>
      {result.success ? '✅' : '❌'} {result.message}
      {result.success && result.sent !== undefined && <span style={{ opacity: 0.7, marginLeft: 8 }}>({result.sent}/{result.total} appareils)</span>}
    </div>
  ) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', fontFamily: 'inherit' }}>

      {/* Header + tabs */}
      <div style={{ background: bg, border: `1px solid ${bord}`, borderRadius: '16px 16px 0 0', padding: '20px 24px 0', borderBottom: `1px solid ${bord}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{ width: 44, height: 44, background: 'rgba(45,212,96,0.1)', border: '1px solid rgba(45,212,96,0.25)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>🔔</div>
          <div>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: txt }}>Notifications Push</h2>
            <p style={{ margin: 0, fontSize: 12, color: muted }}>
              {stats ? `${stats.activeTokens} appareils · ${stats.totalSent} envoyées · ${stats.scheduled} planifiées` : 'Chargement…'}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 2 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} style={{ padding: '8px 16px', fontSize: 12, fontWeight: activeTab === t.id ? 700 : 500, border: 'none', background: 'transparent', color: activeTab === t.id ? accent : muted, borderBottom: `2px solid ${activeTab === t.id ? accent : 'transparent'}`, cursor: 'pointer', transition: 'all 0.15s' }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ background: bg, border: `1px solid ${bord}`, borderTop: 'none', borderRadius: '0 0 16px 16px', padding: 24 }}>

        {/* ── TAB ENVOYER ────────────────────────────────────────────────── */}
        {activeTab === 'send' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20, alignItems: 'start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <TargetSelector value={target} onChange={setTarget} showPickers region={selectedRegion} setRegion={setSelectedRegion} user={selectedUser} setUser={setSelectedUser} />

              {/* Templates + message */}
              <div style={{ background: card, border: `1px solid ${bord}`, borderRadius: 12, padding: 16 }}>
                <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '1px' }}>Modèle</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6, marginBottom: 14 }}>
                  {TEMPLATES.map(t => (
                    <button key={t.id} onClick={() => handleTemplate(t)} style={{ padding: '8px 4px', fontSize: 10, fontWeight: 600, borderRadius: 8, border: `1px solid ${template.id === t.id ? accent : bord}`, background: template.id === t.id ? 'rgba(45,212,96,0.1)' : 'transparent', color: template.id === t.id ? accent : muted, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                      <span style={{ fontSize: 15 }}>{t.icon}</span><span>{t.label}</span>
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: muted, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '1px' }}>Titre ({title.length}/60)</label>
                    <input value={title} onChange={e => setTitle(e.target.value)} maxLength={60} placeholder="Titre…" style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: muted, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '1px' }}>Message ({body.length}/200)</label>
                    <textarea value={body} onChange={e => setBody(e.target.value)} maxLength={200} rows={3} placeholder="Corps du message…" style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }} />
                  </div>
                </div>
              </div>

              <ResultBanner result={sendResult} />

              <button onClick={() => setPreview(true)} disabled={sending || !title.trim() || !body.trim()} style={{ padding: '14px', fontSize: 14, fontWeight: 700, borderRadius: 12, border: 'none', background: !title.trim() || !body.trim() ? 'rgba(45,212,96,0.4)' : accent, color: '#fff', cursor: 'pointer' }}>
                🚀 Prévisualiser & envoyer
              </button>
            </div>

            <div style={{ background: card, border: `1px solid ${bord}`, borderRadius: 12, padding: 20 }}>
              <p style={{ margin: '0 0 14px', fontSize: 11, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '1px' }}>Aperçu</p>
              <PhonePreview title={title} body={body} targetLabel={targetLabel} />
            </div>
          </div>
        )}

        {/* ── TAB PLANIFIER ──────────────────────────────────────────────── */}
        {activeTab === 'schedule' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20, alignItems: 'start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Date */}
              <div style={{ background: card, border: `1px solid ${bord}`, borderRadius: 12, padding: 16 }}>
                <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '1px' }}>Date et heure d'envoi</p>
                <input type="datetime-local" value={schedDateTime} onChange={e => setSchedDateTime(e.target.value)} min={new Date(Date.now() + 60000).toISOString().slice(0, 16)} style={inputStyle} />
              </div>

              <TargetSelector value={schedTarget} onChange={setSchedTarget} showPickers region={schedRegion} setRegion={setSchedRegion} user={schedUser} setUser={setSchedUser} />

              {/* Message */}
              <div style={{ background: card, border: `1px solid ${bord}`, borderRadius: 12, padding: 16 }}>
                <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '1px' }}>Message</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 5, marginBottom: 12 }}>
                  {TEMPLATES.map(t => (
                    <button key={t.id} onClick={() => handleSchedTemplate(t)} style={{ padding: '7px 4px', fontSize: 10, fontWeight: 600, borderRadius: 7, border: `1px solid ${schedTemplate.id === t.id ? accent : bord}`, background: schedTemplate.id === t.id ? 'rgba(45,212,96,0.1)' : 'transparent', color: schedTemplate.id === t.id ? accent : muted, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                      <span style={{ fontSize: 13 }}>{t.icon}</span><span>{t.label}</span>
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <input value={schedTitle} onChange={e => setSchedTitle(e.target.value)} maxLength={60} placeholder="Titre…" style={inputStyle} />
                  <textarea value={schedBody} onChange={e => setSchedBody(e.target.value)} maxLength={200} rows={3} placeholder="Corps du message…" style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }} />
                </div>
              </div>

              <ResultBanner result={schedResult} />

              <button onClick={handleSchedule} disabled={scheduling || !schedTitle.trim() || !schedBody.trim() || !schedDateTime} style={{ padding: '14px', fontSize: 14, fontWeight: 700, borderRadius: 12, border: 'none', background: !schedTitle.trim() || !schedBody.trim() || !schedDateTime ? 'rgba(45,212,96,0.4)' : accent, color: '#fff', cursor: 'pointer' }}>
                {scheduling ? '⏳ Planification…' : '📅 Planifier la notification'}
              </button>
            </div>

            <div style={{ background: card, border: `1px solid ${bord}`, borderRadius: 12, padding: 20 }}>
              <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '1px' }}>Aperçu</p>
              {schedDateTime && <p style={{ margin: '0 0 12px', fontSize: 12, color: accent, fontWeight: 700 }}>📅 {new Date(schedDateTime).toLocaleString('fr-FR')}</p>}
              <PhonePreview title={schedTitle} body={schedBody} targetLabel={schedTarget === 'broadcast' ? 'Tous' : schedTarget === 'region' ? (schedRegion || '—') : users.find(u => u._id === schedUser)?.email || '—'} />
            </div>
          </div>
        )}

        {/* ── TAB HISTORIQUE ─────────────────────────────────────────────── */}
        {activeTab === 'history' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              {['', 'sent', 'scheduled', 'failed', 'cancelled'].map(s => (
                <button key={s} onClick={() => { setHistFilter(s); setHistPage(1); }} style={{ padding: '5px 14px', fontSize: 12, fontWeight: 600, borderRadius: 20, border: `1px solid ${histFilter === s ? accent : bord}`, background: histFilter === s ? 'rgba(45,212,96,0.1)' : 'transparent', color: histFilter === s ? accent : muted, cursor: 'pointer' }}>
                  {s === '' ? 'Toutes' : STATUS_CFG[s]?.label || s}
                </button>
              ))}
              <span style={{ marginLeft: 'auto', fontSize: 12, color: muted }}>{histTotal} notification{histTotal > 1 ? 's' : ''}</span>
              <button onClick={() => loadHistory(histPage, histFilter)} style={{ padding: '5px 12px', fontSize: 12, borderRadius: 8, border: `1px solid ${bord}`, background: 'transparent', color: muted, cursor: 'pointer' }}>↻</button>
            </div>

            {historyLoading ? (
              <div style={{ textAlign: 'center', padding: '32px', color: muted }}>⏳ Chargement…</div>
            ) : history.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
                <p style={{ color: muted, fontSize: 14, margin: 0 }}>Aucune notification trouvée</p>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {history.map(log => {
                    const sc = STATUS_CFG[log.status] || STATUS_CFG.sent;
                    return (
                      <div key={log._id} style={{ background: card, border: `1px solid ${bord}`, borderLeft: `4px solid ${sc.color}`, borderRadius: 10, padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: txt }}>{log.title}</span>
                            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: sc.bg, color: sc.color }}>{sc.label}</span>
                          </div>
                          <p style={{ margin: '0 0 6px', fontSize: 12, color: muted, lineHeight: 1.5 }}>{log.body?.substring(0, 100)}{log.body?.length > 100 ? '…' : ''}</p>
                          <div style={{ display: 'flex', gap: 12, fontSize: 11, color: muted, flexWrap: 'wrap' }}>
                            <span>🎯 {log.target === 'broadcast' ? 'Tous' : log.target === 'region' ? log.targetValue : 'Citoyen'}</span>
                            {log.status === 'sent' && log.sent !== undefined && <span>📱 {log.sent}/{log.total}</span>}
                            {log.sentAt && <span>✅ {fmtDate(log.sentAt)}</span>}
                            {log.scheduledAt && log.status === 'scheduled' && <span>📅 {fmtDate(log.scheduledAt)}</span>}
                          </div>
                        </div>
                        {log.status === 'scheduled' && (
                          <button onClick={() => handleCancel(log._id)} disabled={cancelling === log._id} style={{ padding: '5px 10px', fontSize: 11, fontWeight: 700, borderRadius: 8, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', color: '#ef4444', cursor: 'pointer', flexShrink: 0 }}>
                            {cancelling === log._id ? '…' : '✕ Annuler'}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
                {histTotal > 20 && (
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
                    <button onClick={() => setHistPage(p => Math.max(1, p - 1))} disabled={histPage === 1} style={{ padding: '6px 14px', fontSize: 12, borderRadius: 8, border: `1px solid ${bord}`, background: 'transparent', color: muted, cursor: 'pointer' }}>← Précédent</button>
                    <span style={{ padding: '6px 14px', fontSize: 12, color: muted }}>Page {histPage} / {Math.ceil(histTotal / 20)}</span>
                    <button onClick={() => setHistPage(p => p + 1)} disabled={histPage >= Math.ceil(histTotal / 20)} style={{ padding: '6px 14px', fontSize: 12, borderRadius: 8, border: `1px solid ${bord}`, background: 'transparent', color: muted, cursor: 'pointer' }}>Suivant →</button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── TAB STATS ──────────────────────────────────────────────────── */}
        {activeTab === 'stats' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {statsLoading ? (
              <div style={{ textAlign: 'center', padding: '32px', color: muted }}>⏳ Chargement…</div>
            ) : stats ? (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12 }}>
                  {[
                    { icon: '📱', label: 'Appareils actifs', val: stats.activeTokens, color: accent },
                    { icon: '🍎', label: 'iOS',              val: stats.ios,          color: '#6b7280' },
                    { icon: '🤖', label: 'Android',          val: stats.android,      color: '#22c55e' },
                    { icon: '📊', label: 'Total envoyées',   val: stats.totalSent,    color: '#3b82f6' },
                    { icon: '📅', label: 'Cette semaine',    val: stats.sentThisWeek, color: '#f59e0b' },
                    { icon: '⏰', label: 'Planifiées',       val: stats.scheduled,    color: '#8b5cf6' },
                  ].map(({ icon, label, val, color }) => (
                    <div key={label} style={{ background: card, border: `1px solid ${bord}`, borderRadius: 12, padding: '14px 16px' }}>
                      <div style={{ fontSize: 20, marginBottom: 6 }}>{icon}</div>
                      <div style={{ fontSize: 24, fontWeight: 900, color, marginBottom: 2 }}>{val ?? '—'}</div>
                      <div style={{ fontSize: 11, color: muted }}>{label}</div>
                    </div>
                  ))}
                </div>

                {stats.byTarget && Object.keys(stats.byTarget).length > 0 && (
                  <div style={{ background: card, border: `1px solid ${bord}`, borderRadius: 12, padding: 20 }}>
                    <p style={{ margin: '0 0 14px', fontSize: 11, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '1px' }}>Par type de cible</p>
                    {Object.entries(stats.byTarget).map(([key, v]) => {
                      const total = Object.values(stats.byTarget).reduce((s, x) => s + x.count, 0);
                      const pct = total ? Math.round((v.count / total) * 100) : 0;
                      const clr = { broadcast: accent, region: '#3b82f6', user: '#f59e0b' }[key] || accent;
                      const lbl = { broadcast: '🌍 Broadcast', region: '📍 Région', user: '👤 Citoyen' }[key] || key;
                      return (
                        <div key={key} style={{ marginBottom: 12 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 12 }}>
                            <span style={{ color: txt, fontWeight: 600 }}>{lbl}</span>
                            <span style={{ color: muted }}>{v.count} envois · {v.sent} appareils</span>
                          </div>
                          <div style={{ height: 6, background: bord, borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ width: `${pct}%`, height: '100%', background: clr, borderRadius: 3, transition: 'width 0.6s ease' }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <button onClick={loadStats} style={{ alignSelf: 'flex-start', padding: '8px 16px', fontSize: 12, fontWeight: 600, borderRadius: 8, border: `1px solid ${bord}`, background: 'transparent', color: muted, cursor: 'pointer' }}>↻ Rafraîchir</button>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '32px', color: muted }}>Impossible de charger les statistiques</div>
            )}
          </div>
        )}
      </div>

      {/* Confirm modal */}
      {preview && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: dark ? '#0f1f15' : '#fff', border: `1px solid ${bord}`, borderRadius: 20, padding: 28, maxWidth: 440, width: '100%' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 800, color: txt }}>Confirmer l'envoi</h3>
            <p style={{ margin: '0 0 20px', fontSize: 13, color: muted }}>La notification sera envoyée immédiatement sur les téléphones.</p>
            <div style={{ background: card, border: `1px solid ${bord}`, borderRadius: 12, padding: 16, marginBottom: 20 }}>
              {[['Destinataires', targetLabel], ['Titre', title], ['Message', body]].map(([l, v]) => (
                <div key={l} style={{ display: 'flex', gap: 8, marginBottom: 8, fontSize: 13 }}>
                  <span style={{ color: muted, minWidth: 100, flexShrink: 0 }}>{l}</span>
                  <strong style={{ color: txt }}>{v}</strong>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setPreview(false)} style={{ flex: 1, padding: '12px', fontSize: 13, fontWeight: 600, borderRadius: 10, border: `1px solid ${bord}`, background: 'transparent', color: muted, cursor: 'pointer' }}>Annuler</button>
              <button onClick={handleSend} disabled={sending} style={{ flex: 2, padding: '12px', fontSize: 13, fontWeight: 700, borderRadius: 10, border: 'none', background: accent, color: '#fff', cursor: sending ? 'not-allowed' : 'pointer' }}>
                {sending ? '⏳ Envoi…' : '🚀 Envoyer maintenant'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
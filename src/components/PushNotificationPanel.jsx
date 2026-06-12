// components/PushNotificationPanel.jsx
// Interface admin pour envoyer des notifications push aux citoyens
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
  {
    id: 'status_update',
    icon: '🔄',
    label: 'Mise à jour statut',
    title: 'Votre signalement a été mis à jour',
    body: 'Le statut de votre signalement a changé. Consultez l\'application pour plus de détails.',
  },
  {
    id: 'resolved',
    icon: '✅',
    label: 'Signalement résolu',
    title: 'Problème résolu !',
    body: 'Votre signalement a été traité et résolu. Merci pour votre contribution à la protection de l\'environnement !',
  },
  {
    id: 'emergency',
    icon: '🚨',
    label: 'Alerte urgente',
    title: 'Alerte environnementale dans votre zone',
    body: 'Un incident critique a été signalé près de chez vous. Prenez les précautions nécessaires.',
  },
  {
    id: 'community',
    icon: '👥',
    label: 'Activité communauté',
    title: 'Activité dans votre région',
    body: 'De nouveaux signalements ont été enregistrés dans votre zone. Consultez la carte pour en savoir plus.',
  },
  {
    id: 'reminder',
    icon: '💡',
    label: 'Rappel participation',
    title: 'ReMine a besoin de vous',
    body: 'Signalez les incidents environnementaux autour de vous. Chaque signalement compte !',
  },
  {
    id: 'custom',
    icon: '✏️',
    label: 'Message personnalisé',
    title: '',
    body: '',
  },
];

const TYPE_LABELS = {
  broadcast: 'Tous les citoyens',
  region: 'Par région',
  user: 'Citoyen spécifique',
};

const SENEGAL_REGIONS = [
  'Dakar', 'Thiès', 'Diourbel', 'Fatick', 'Kaolack', 'Kaffrine',
  'Kolda', 'Louga', 'Matam', 'Saint-Louis', 'Sédhiou', 'Tambacounda',
  'Kédougou', 'Ziguinchor',
];

export function PushNotificationPanel({ users = [], reports = [] }) {
  const dark = useDark();

  // Form state
  const [target, setTarget]       = useState('broadcast');
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('');
  const [template, setTemplate]   = useState(TEMPLATES[0]);
  const [title, setTitle]         = useState(TEMPLATES[0].title);
  const [body, setBody]           = useState(TEMPLATES[0].body);
  const [preview, setPreview]     = useState(false);

  // Send state
  const [sending, setSending]     = useState(false);
  const [result, setResult]       = useState(null);

  // History
  const [history, setHistory]     = useState([]);
  const [stats, setStats]         = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);

  const bg    = dark ? '#0f1f15' : '#ffffff';
  const card  = dark ? 'rgba(255,255,255,0.04)' : '#f9fafb';
  const bord  = dark ? 'rgba(255,255,255,0.08)' : '#e5e7eb';
  const txt   = dark ? '#f1f5f9' : '#111827';
  const muted = dark ? 'rgba(255,255,255,0.45)' : '#6b7280';
  const accent = '#2dd460';
  const inputStyle = {
    width: '100%', padding: '10px 12px', fontSize: 13,
    background: card, border: `1px solid ${bord}`, borderRadius: 10,
    color: txt, outline: 'none', boxSizing: 'border-box',
    fontFamily: 'inherit',
  };

  // Load push token stats
  const loadStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const token = localStorage.getItem('remine_admin_token');
      const res = await fetch(`${API_BASE}/notifications/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data.data);
      }
    } catch {
      // Stats non disponibles — pas bloquant
    } finally {
      setLoadingStats(false);
    }
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);

  // Detect regions from reports
  const regions = React.useMemo(() => {
    const s = new Set();
    reports.forEach(r => {
      const z = r.location?.region || r.location?.city;
      if (z) s.add(z);
    });
    return Array.from(s).sort();
  }, [reports]);

  const availableRegions = regions.length > 0 ? regions : SENEGAL_REGIONS;

  const handleTemplate = (t) => {
    setTemplate(t);
    if (t.id !== 'custom') {
      setTitle(t.title);
      setBody(t.body);
    }
  };

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) {
      setResult({ success: false, message: 'Titre et message requis.' });
      return;
    }
    if (target === 'user' && !selectedUser) {
      setResult({ success: false, message: 'Sélectionne un citoyen.' });
      return;
    }
    if (target === 'region' && !selectedRegion) {
      setResult({ success: false, message: 'Sélectionne une région.' });
      return;
    }

    setSending(true);
    setResult(null);
    setPreview(false);

    try {
      const token = localStorage.getItem('remine_admin_token');
      let endpoint, payload;

      if (target === 'broadcast') {
        endpoint = `${API_BASE}/notifications/broadcast`;
        payload  = { title, body, data: { type: template.id, source: 'admin_dashboard' } };
      } else if (target === 'region') {
        endpoint = `${API_BASE}/notifications/broadcast`;
        payload  = {
          title, body,
          data: { type: template.id, region: selectedRegion, source: 'admin_dashboard' },
          region: selectedRegion,
        };
      } else {
        endpoint = `${API_BASE}/notifications/send`;
        payload  = {
          userId: selectedUser,
          title, body,
          data: { type: template.id, source: 'admin_dashboard' },
        };
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.success) {
        setResult({ success: true, message: data.message, sent: data.data?.sent, total: data.data?.total });
        // Add to local history
        setHistory(h => [{
          id: Date.now(),
          title,
          body,
          target: target === 'broadcast' ? 'Tous' : target === 'region' ? selectedRegion : users.find(u => u._id === selectedUser)?.email || selectedUser,
          sent: data.data?.sent || '?',
          total: data.data?.total || '?',
          template: template.label,
          date: new Date().toISOString(),
        }, ...h].slice(0, 20));
      } else {
        setResult({ success: false, message: data.error || 'Erreur lors de l\'envoi.' });
      }
    } catch (e) {
      setResult({ success: false, message: 'Impossible de joindre le serveur.' });
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, fontFamily: 'inherit' }}>

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div style={{ background: bg, border: `1px solid ${bord}`, borderRadius: 16, padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <div style={{ width: 44, height: 44, background: 'rgba(45,212,96,0.1)', border: '1px solid rgba(45,212,96,0.25)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>🔔</div>
          <div>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: txt }}>Notifications Push</h2>
            <p style={{ margin: 0, fontSize: 12, color: muted }}>Envoyez des notifications directement sur l'application citoyenne</p>
          </div>
        </div>

        {/* Stats tokens */}
        {!loadingStats && (
          <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
            {[
              { icon: '📱', label: 'Appareils actifs', val: stats?.activeTokens ?? users.length, color: accent },
              { icon: '👥', label: 'Citoyens inscrits', val: users.length, color: '#3b82f6' },
              { icon: '📊', label: 'Notifications envoyées', val: history.length, color: '#f59e0b' },
            ].map(({ icon, label, val, color }) => (
              <div key={label} style={{ background: card, border: `1px solid ${bord}`, borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 18 }}>{icon}</span>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 800, color }}>{val}</div>
                  <div style={{ fontSize: 11, color: muted }}>{label}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 20, alignItems: 'start' }}>

        {/* ── Form ──────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Cible */}
          <div style={{ background: bg, border: `1px solid ${bord}`, borderRadius: 16, padding: 20 }}>
            <p style={{ margin: '0 0 12px', fontSize: 12, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '1px' }}>1. Destinataires</p>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              {['broadcast', 'region', 'user'].map(t => (
                <button
                  key={t}
                  onClick={() => setTarget(t)}
                  style={{
                    flex: 1, padding: '10px 8px', fontSize: 12, fontWeight: 600, borderRadius: 10,
                    border: `1px solid ${target === t ? accent : bord}`,
                    background: target === t ? 'rgba(45,212,96,0.1)' : 'transparent',
                    color: target === t ? accent : muted, cursor: 'pointer', transition: 'all 0.15s',
                  }}
                >
                  {t === 'broadcast' ? '🌍 Tous' : t === 'region' ? '📍 Région' : '👤 Citoyen'}
                </button>
              ))}
            </div>

            {target === 'region' && (
              <select
                value={selectedRegion}
                onChange={e => setSelectedRegion(e.target.value)}
                style={inputStyle}
              >
                <option value="">— Choisir une région —</option>
                {availableRegions.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            )}

            {target === 'user' && (
              <select
                value={selectedUser}
                onChange={e => setSelectedUser(e.target.value)}
                style={inputStyle}
              >
                <option value="">— Choisir un citoyen —</option>
                {users.map(u => (
                  <option key={u._id} value={u._id}>
                    {u.firstName || ''} {u.lastName || ''} — {u.email}
                  </option>
                ))}
              </select>
            )}

            {target === 'broadcast' && (
              <div style={{ background: 'rgba(45,212,96,0.07)', border: '1px solid rgba(45,212,96,0.2)', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: dark ? '#86efac' : '#166534' }}>
                ✅ La notification sera envoyée à tous les citoyens avec l'application installée ({users.length} inscrits)
              </div>
            )}
          </div>

          {/* Template */}
          <div style={{ background: bg, border: `1px solid ${bord}`, borderRadius: 16, padding: 20 }}>
            <p style={{ margin: '0 0 12px', fontSize: 12, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '1px' }}>2. Modèle de message</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
              {TEMPLATES.map(t => (
                <button
                  key={t.id}
                  onClick={() => handleTemplate(t)}
                  style={{
                    padding: '10px 8px', fontSize: 11, fontWeight: 600, borderRadius: 10,
                    border: `1px solid ${template.id === t.id ? accent : bord}`,
                    background: template.id === t.id ? 'rgba(45,212,96,0.1)' : 'transparent',
                    color: template.id === t.id ? accent : muted, cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                    transition: 'all 0.15s',
                  }}
                >
                  <span style={{ fontSize: 18 }}>{t.icon}</span>
                  <span>{t.label}</span>
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: muted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '1px' }}>Titre</label>
                <input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  maxLength={60}
                  placeholder="Titre de la notification..."
                  style={inputStyle}
                />
                <div style={{ textAlign: 'right', fontSize: 10, color: muted, marginTop: 3 }}>{title.length}/60</div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: muted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '1px' }}>Message</label>
                <textarea
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  maxLength={200}
                  rows={3}
                  placeholder="Corps du message..."
                  style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
                />
                <div style={{ textAlign: 'right', fontSize: 10, color: muted, marginTop: 3 }}>{body.length}/200</div>
              </div>
            </div>
          </div>

          {/* Result */}
          {result && (
            <div style={{
              background: result.success ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
              border: `1px solid ${result.success ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
              borderRadius: 12, padding: '14px 16px',
              color: result.success ? (dark ? '#86efac' : '#166534') : '#ef4444',
              fontSize: 13,
            }}>
              {result.success ? '✅' : '❌'} {result.message}
              {result.success && result.sent !== undefined && (
                <span style={{ marginLeft: 8, opacity: 0.7 }}>({result.sent}/{result.total} appareils)</span>
              )}
            </div>
          )}

          {/* Send button */}
          <button
            onClick={() => setPreview(true)}
            disabled={sending || !title.trim() || !body.trim()}
            style={{
              padding: '14px 20px', fontSize: 14, fontWeight: 700, borderRadius: 12,
              border: 'none', background: sending || !title.trim() || !body.trim() ? 'rgba(45,212,96,0.4)' : accent,
              color: '#fff', cursor: sending || !title.trim() || !body.trim() ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            {sending ? '⏳ Envoi...' : '🚀 Prévisualiser & envoyer'}
          </button>
        </div>

        {/* ── Preview + History ──────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Phone preview */}
          <div style={{ background: bg, border: `1px solid ${bord}`, borderRadius: 16, padding: 20 }}>
            <p style={{ margin: '0 0 14px', fontSize: 12, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '1px' }}>Aperçu</p>

            {/* Phone mockup */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div style={{ width: 260, background: dark ? '#1a1a2e' : '#1a1a2e', borderRadius: 32, padding: 16, border: '3px solid #333' }}>
                {/* Status bar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20, padding: '0 8px' }}>
                  <span style={{ fontSize: 10, color: '#fff', fontWeight: 700 }}>9:41</span>
                  <span style={{ fontSize: 10, color: '#fff' }}>●●● 📶 🔋</span>
                </div>

                {/* Lock screen */}
                <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 12, marginBottom: 8 }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <div style={{ width: 36, height: 36, background: 'rgba(45,212,96,0.2)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                      🌿
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>ReMine</span>
                        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>maintenant</span>
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', marginBottom: 2, lineHeight: 1.3 }}>
                        {title || 'Titre de la notification'}
                      </div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', lineHeight: 1.4 }}>
                        {body ? body.substring(0, 80) + (body.length > 80 ? '...' : '') : 'Corps du message...'}
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'center', marginTop: 12 }}>
                  <div style={{ width: 120, height: 4, background: 'rgba(255,255,255,0.3)', borderRadius: 2, margin: '0 auto' }} />
                </div>
              </div>
            </div>

            <div style={{ marginTop: 12, fontSize: 11, color: muted, textAlign: 'center' }}>
              Destinataire : <strong style={{ color: txt }}>
                {target === 'broadcast' ? 'Tous les citoyens' : target === 'region' ? (selectedRegion || '—') : users.find(u => u._id === selectedUser)?.email || '—'}
              </strong>
            </div>
          </div>

          {/* History */}
          {history.length > 0 && (
            <div style={{ background: bg, border: `1px solid ${bord}`, borderRadius: 16, padding: 20 }}>
              <p style={{ margin: '0 0 12px', fontSize: 12, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '1px' }}>Historique de session</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 300, overflowY: 'auto' }}>
                {history.map(h => (
                  <div key={h.id} style={{ background: card, border: `1px solid ${bord}`, borderRadius: 10, padding: '10px 12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: txt }}>{h.title}</span>
                      <span style={{ fontSize: 10, color: accent, fontWeight: 700, flexShrink: 0, marginLeft: 8 }}>✓ {h.sent}/{h.total}</span>
                    </div>
                    <div style={{ fontSize: 11, color: muted }}>
                      📍 {h.target} · {new Date(h.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Confirm modal ─────────────────────────────────────────────────── */}
      {preview && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: dark ? '#0f1f15' : '#fff', border: `1px solid ${bord}`, borderRadius: 20, padding: 28, maxWidth: 440, width: '100%' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 800, color: txt }}>Confirmer l'envoi</h3>
            <p style={{ margin: '0 0 20px', fontSize: 13, color: muted }}>Cette action enverra une notification push sur les téléphones des destinataires.</p>

            <div style={{ background: card, border: `1px solid ${bord}`, borderRadius: 12, padding: 16, marginBottom: 20 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <span style={{ color: muted, minWidth: 90 }}>Destinataires</span>
                  <strong style={{ color: txt }}>
                    {target === 'broadcast' ? `Tous les citoyens (${users.length})` : target === 'region' ? selectedRegion : users.find(u => u._id === selectedUser)?.email || '—'}
                  </strong>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <span style={{ color: muted, minWidth: 90 }}>Titre</span>
                  <strong style={{ color: txt }}>{title}</strong>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <span style={{ color: muted, minWidth: 90, flexShrink: 0 }}>Message</span>
                  <span style={{ color: txt }}>{body}</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setPreview(false)}
                style={{ flex: 1, padding: '12px', fontSize: 13, fontWeight: 600, borderRadius: 10, border: `1px solid ${bord}`, background: 'transparent', color: muted, cursor: 'pointer' }}
              >
                Annuler
              </button>
              <button
                onClick={handleSend}
                disabled={sending}
                style={{ flex: 2, padding: '12px', fontSize: 13, fontWeight: 700, borderRadius: 10, border: 'none', background: accent, color: '#fff', cursor: sending ? 'not-allowed' : 'pointer' }}
              >
                {sending ? '⏳ Envoi...' : '🚀 Envoyer maintenant'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { dashboardAPI } from '../services/api';
import {
  AreaChart, Area, BarChart, Bar, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

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

// ─── Barre vote animée ────────────────────────────────────────────────────────
function VoteBar({ upvotes, downvotes, height = 12 }) {
  const total = upvotes + downvotes || 1;
  const upPct = Math.round(upvotes / total * 100);
  const dark  = useDark();
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#10b981' }}>👍 {upvotes} — {upPct}%</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#ef4444' }}>👎 {downvotes} — {100 - upPct}%</span>
      </div>
      <div style={{ height, borderRadius: 99, background: dark ? '#1e293b' : '#f1f5f9', overflow: 'hidden', display: 'flex', position: 'relative' }}>
        <div style={{ height: '100%', background: 'linear-gradient(90deg,#10b981,#34d399)', width: `${upPct}%`, transition: 'width 1s cubic-bezier(0.22,1,0.36,1)', borderRadius: upPct === 100 ? 99 : '99px 0 0 99px' }} />
        <div style={{ height: '100%', background: 'linear-gradient(90deg,#ef4444,#fca5a5)', flex: 1, borderRadius: upPct === 0 ? 99 : '0 99px 99px 0' }} />
        {/* Ligne centrale */}
        <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 2, background: 'rgba(255,255,255,0.4)', transform: 'translateX(-50%)' }} />
      </div>
    </div>
  );
}

// ─── Score badge ──────────────────────────────────────────────────────────────
function ScoreBadge({ score, size = 'md' }) {
  const isPos = score > 0, isNeg = score < 0;
  const dark  = useDark();
  const color = isPos ? '#10b981' : isNeg ? '#ef4444' : '#6b7280';
  const bg    = isPos ? '#dcfce7' : isNeg ? '#fee2e2' : (dark ? '#334155' : '#f1f5f9');
  const fs    = size === 'xl' ? 28 : size === 'lg' ? 22 : size === 'sm' ? 11 : 15;
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: size === 'xl' ? '10px 20px' : size === 'lg' ? '8px 16px' : '3px 10px', borderRadius: 99, background: bg, border: `1.5px solid ${color}40`, boxShadow: isPos ? `0 4px 16px ${color}20` : 'none' }}>
      <span style={{ fontSize: fs, fontWeight: 900, color, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
        {isPos ? '+' : ''}{score}
      </span>
      {size !== 'sm' && <span style={{ fontSize: size === 'xl' ? 12 : 10, color, opacity: 0.7, fontWeight: 700 }}>SCORE</span>}
    </div>
  );
}

// ─── Animateur de compteur ────────────────────────────────────────────────────
function CountUp({ target, duration = 800, color = '#0f172a' }) {
  const [val, setVal] = useState(0);
  const frameRef = useRef(null);
  useEffect(() => {
    if (target === 0) { setVal(0); return; }
    const start  = Date.now();
    const tick   = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const ease     = 1 - Math.pow(1 - progress, 3);
      setVal(Math.round(ease * target));
      if (progress < 1) frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target, duration]);
  return <span style={{ color, fontVariantNumeric: 'tabular-nums' }}>{val}</span>;
}

// ─── Mini sparkline simulée ────────────────────────────────────────────────────
function VoteTrend({ upvotes, downvotes, score }) {
  const dark = useDark();
  // Générer des données de tendance simulées basées sur score actuel
  const pts = Array.from({ length: 7 }, (_, i) => {
    const noise  = (Math.sin(i * 2.3 + score) * 0.3 + 0.7);
    const base   = Math.max(0, upvotes * noise * (i + 1) / 7);
    const bdown  = Math.max(0, downvotes * noise * (i + 1) / 7);
    return { label: `J-${6-i}`, up: Math.round(base), down: Math.round(bdown) };
  });
  return (
    <ResponsiveContainer width="100%" height={70}>
      <AreaChart data={pts} margin={{ top: 2, right: 2, left: -32, bottom: -4 }}>
        <defs>
          <linearGradient id="gUp"   x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.35}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
          <linearGradient id="gDown" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.25}/><stop offset="95%" stopColor="#ef4444" stopOpacity={0}/></linearGradient>
        </defs>
        <XAxis dataKey="label" tick={{ fontSize: 8, fill: dark ? '#475569' : '#9ca3af' }} />
        <YAxis hide allowDecimals={false} />
        <Area type="monotone" dataKey="up"   stroke="#10b981" fill="url(#gUp)"   strokeWidth={1.5} dot={false} />
        <Area type="monotone" dataKey="down" stroke="#ef4444" fill="url(#gDown)" strokeWidth={1.5} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────
export function VotesPanel({ report }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab,     setTab]     = useState('overview'); // overview | trend | details
  const dark = useDark();

  const reportId = report?._id || report?.id;

  const load = useCallback(async () => {
    if (!reportId) return;
    setLoading(true);
    try {
      const res = await dashboardAPI.request(`/api/reports/${reportId}/vote`);
      setData(res?.data || null);
    } catch { setData(null); }
    finally  { setLoading(false); }
  }, [reportId]);

  useEffect(() => { load(); }, [load]);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '16px 0', color: dark ? '#64748b' : '#9ca3af' }}>
      <div style={{ width: 16, height: 16, border: '2px solid #10b981', borderTopColor: 'transparent', borderRadius: '50%', animation: 'remine-spin 0.7s linear infinite' }} />
      <span style={{ fontSize: 12 }}>Chargement des votes…</span>
    </div>
  );

  const upvotes   = data?.upvotes   ?? 0;
  const downvotes = data?.downvotes ?? 0;
  const score     = data?.score     ?? (report?.voteCount || 0);
  const total     = upvotes + downvotes;
  const upPct     = total > 0 ? Math.round(upvotes / total * 100) : 0;

  const label     = score > 15 ? { text: '🔥 Viral',     color: '#dc2626' }
                  : score > 8  ? { text: '⭐ Populaire',  color: '#f59e0b' }
                  : score > 3  ? { text: '📈 Positif',    color: '#10b981' }
                  : score > 0  ? { text: '👍 Soutenu',    color: '#3b82f6' }
                  : score < -3 ? { text: '📉 Contesté',   color: '#ef4444' }
                  : score < 0  ? { text: '⚠️ Douteux',   color: '#f97316' }
                  :              { text: '➡️ Neutre',      color: '#6b7280' };

  // Tabs sous-onglets
  const tabs = [
    { id: 'overview', label: '📊 Résumé'   },
    { id: 'trend',    label: '📈 Tendance' },
    { id: 'details',  label: '🔍 Détails'  },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

      {/* Sous-onglets */}
      <div style={{ display: 'flex', gap: 2, background: dark ? '#0f172a' : '#f1f5f9', padding: 3, borderRadius: 10, marginBottom: 12, width: 'fit-content' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: '4px 12px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600, background: tab === t.id ? (dark ? '#1e293b' : '#fff') : 'transparent', color: tab === t.id ? (dark ? '#f1f5f9' : '#0f172a') : (dark ? '#64748b' : '#9ca3af'), boxShadow: tab === t.id ? '0 1px 4px rgba(0,0,0,0.08)' : 'none', transition: 'all 0.15s' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── RÉSUMÉ ── */}
      {tab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Hero score */}
          <div style={{ background: dark ? '#0f172a' : '#f8fafc', borderRadius: 16, padding: '16px 18px', border: `1px solid ${dark ? '#1e293b' : '#f1f5f9'}`, display: 'flex', alignItems: 'center', gap: 16 }}>
            <ScoreBadge score={score} size="xl" />
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: label.color }}>{label.text}</span>
                {total > 0 && <span style={{ fontSize: 10, color: dark ? '#475569' : '#9ca3af', background: dark ? '#1e293b' : '#f1f5f9', padding: '2px 8px', borderRadius: 99 }}>{total} vote{total > 1 ? 's' : ''}</span>}
              </div>
              {total > 0
                ? <VoteBar upvotes={upvotes} downvotes={downvotes} />
                : <p style={{ fontSize: 11, color: dark ? '#475569' : '#9ca3af', margin: 0 }}>Aucun vote pour le moment</p>
              }
            </div>
          </div>

          {/* Compteurs animés */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            {[
              { label: '👍 Pour',   value: upvotes,   color: '#10b981', bg: '#dcfce7', border: '#bbf7d0' },
              { label: '👎 Contre', value: downvotes, color: '#ef4444', bg: '#fee2e2', border: '#fecaca' },
              { label: '⚡ Score',  value: score,     color: score > 0 ? '#10b981' : score < 0 ? '#ef4444' : '#6b7280', bg: dark ? '#0f172a' : '#f8fafc', border: dark ? '#1e293b' : '#e2e8f0' },
            ].map(c => (
              <div key={c.label} style={{ textAlign: 'center', padding: '12px 8px', background: dark && c.bg === '#dcfce7' ? 'rgba(16,185,129,0.1)' : dark && c.bg === '#fee2e2' ? 'rgba(239,68,68,0.1)' : c.bg, borderRadius: 12, border: `1px solid ${dark ? c.border.replace('#', 'rgba(').replace('d0','')+'0.2)' : c.border}` }}>
                <p style={{ fontSize: 22, fontWeight: 900, color: c.color, margin: 0 }}>
                  <CountUp target={Math.abs(c.value)} color={c.color} />
                </p>
                <p style={{ fontSize: 10, color: dark ? `${c.color}99` : c.color, margin: '3px 0 0', fontWeight: 700, opacity: 0.8 }}>{c.label}</p>
              </div>
            ))}
          </div>

          {/* Analyse consensus */}
          {total > 0 && (
            <div style={{ background: dark ? '#0f172a' : '#f8fafc', borderRadius: 12, padding: '12px 14px', border: `1px solid ${dark ? '#1e293b' : '#f1f5f9'}` }}>
              <p style={{ fontSize: 11, fontWeight: 800, color: dark ? '#64748b' : '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.8, margin: '0 0 8px' }}>Analyse du consensus</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[
                  { label: 'Soutien communautaire', pct: upPct,        color: '#10b981' },
                  { label: 'Taux de contestation',  pct: 100 - upPct,  color: '#ef4444' },
                  { label: 'Engagement total',       pct: Math.min(100, total * 10), color: '#3b82f6' },
                ].map(m => (
                  <div key={m.label}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ fontSize: 10, color: dark ? '#94a3b8' : '#6b7280' }}>{m.label}</span>
                      <span style={{ fontSize: 10, fontWeight: 800, color: m.color }}>{m.pct}%</span>
                    </div>
                    <div style={{ height: 5, background: dark ? '#1e293b' : '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: `linear-gradient(90deg,${m.color},${m.color}88)`, width: `${m.pct}%`, borderRadius: 99, transition: 'width 1s cubic-bezier(0.22,1,0.36,1)' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TENDANCE ── */}
      {tab === 'trend' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ background: dark ? '#0f172a' : '#f8fafc', borderRadius: 14, padding: '14px', border: `1px solid ${dark ? '#1e293b' : '#f1f5f9'}` }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: dark ? '#64748b' : '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.8, margin: '0 0 10px' }}>Évolution estimée — 7 jours</p>
            <VoteTrend upvotes={upvotes} downvotes={downvotes} score={score} />
            <div style={{ display: 'flex', gap: 12, marginTop: 8, justifyContent: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} /><span style={{ fontSize: 10, color: dark ? '#64748b' : '#9ca3af' }}>Pour</span></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }} /><span style={{ fontSize: 10, color: dark ? '#64748b' : '#9ca3af' }}>Contre</span></div>
            </div>
          </div>

          {/* Milestones */}
          <div style={{ background: dark ? '#0f172a' : '#f8fafc', borderRadius: 14, padding: '14px', border: `1px solid ${dark ? '#1e293b' : '#f1f5f9'}` }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: dark ? '#64748b' : '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.8, margin: '0 0 10px' }}>Jalons</p>
            {[
              { label: 'Populaire',  threshold: 5,  icon: '⭐', reached: score >= 5  },
              { label: 'Viral',      threshold: 15, icon: '🔥', reached: score >= 15 },
              { label: 'Tendance',   threshold: 30, icon: '🚀', reached: score >= 30 },
              { label: 'Référence',  threshold: 50, icon: '🏆', reached: score >= 50 },
            ].map(m => (
              <div key={m.label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: `1px solid ${dark ? '#1e293b' : '#f1f5f9'}` }}>
                <span style={{ fontSize: 16, opacity: m.reached ? 1 : 0.3 }}>{m.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: m.reached ? (dark ? '#f1f5f9' : '#0f172a') : (dark ? '#334155' : '#cbd5e1') }}>{m.label}</span>
                    <span style={{ fontSize: 10, color: dark ? '#64748b' : '#9ca3af' }}>Score {m.threshold}+</span>
                  </div>
                  <div style={{ height: 4, background: dark ? '#1e293b' : '#f1f5f9', borderRadius: 99, marginTop: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: m.reached ? '#10b981' : '#3b82f6', width: `${Math.min(100, (score / m.threshold) * 100)}%`, borderRadius: 99, transition: 'width 1s' }} />
                  </div>
                </div>
                {m.reached && <span style={{ fontSize: 9, fontWeight: 700, color: '#10b981', background: '#dcfce7', padding: '2px 6px', borderRadius: 99 }}>✓</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── DÉTAILS ── */}
      {tab === 'details' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Répartition par sévérité simulée */}
          <div style={{ background: dark ? '#0f172a' : '#f8fafc', borderRadius: 14, padding: '14px', border: `1px solid ${dark ? '#1e293b' : '#f1f5f9'}` }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: dark ? '#64748b' : '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.8, margin: '0 0 10px' }}>Métriques de crédibilité</p>
            {[
              { label: 'Score brut',         value: `${score > 0 ? '+' : ''}${score}`, note: 'upvotes − downvotes'     },
              { label: 'Total de votes',      value: total,                              note: 'participation citoyenne' },
              { label: 'Taux de soutien',     value: `${upPct}%`,                        note: 'proportion positive'     },
              { label: 'Indice de confiance', value: total >= 10 ? `${Math.min(99, Math.round(upPct * 0.8 + Math.log(total+1) * 5))}%` : 'Insuffisant', note: 'score + volume combinés' },
            ].map(m => (
              <div key={m.label} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '7px 0', borderBottom: `1px solid ${dark ? '#1e293b' : '#f1f5f9'}` }}>
                <div>
                  <p style={{ fontSize: 12, fontWeight: 600, color: dark ? '#e2e8f0' : '#374151', margin: 0 }}>{m.label}</p>
                  <p style={{ fontSize: 10, color: dark ? '#475569' : '#9ca3af', margin: '2px 0 0' }}>{m.note}</p>
                </div>
                <span style={{ fontSize: 14, fontWeight: 900, color: dark ? '#f1f5f9' : '#0f172a', fontVariantNumeric: 'tabular-nums' }}>{m.value}</span>
              </div>
            ))}
          </div>

          {/* Conseil admin */}
          {total > 0 && (
            <div style={{ background: score > 3 ? (dark ? 'rgba(16,185,129,0.08)' : '#ecfdf5') : score < -1 ? (dark ? 'rgba(239,68,68,0.08)' : '#fef2f2') : (dark ? '#0f172a' : '#f8fafc'), borderRadius: 12, padding: '12px 14px', border: `1px solid ${score > 3 ? '#bbf7d0' : score < -1 ? '#fecaca' : (dark ? '#1e293b' : '#f1f5f9')}` }}>
              <p style={{ fontSize: 11, fontWeight: 800, color: score > 3 ? '#16a34a' : score < -1 ? '#dc2626' : (dark ? '#94a3b8' : '#6b7280'), margin: '0 0 4px' }}>
                {score > 3 ? '✅ Recommandation' : score < -1 ? '⚠️ Attention' : '💡 Information'}
              </p>
              <p style={{ fontSize: 11, color: dark ? '#94a3b8' : '#6b7280', margin: 0, lineHeight: 1.5 }}>
                {score > 10 ? 'Ce signalement bénéficie d\'un fort soutien communautaire. Priorisez son traitement.'
                 : score > 3  ? 'La communauté valide ce signalement. Une investigation est recommandée.'
                 : score < -3 ? 'Ce signalement est fortement contesté. Vérifiez sa validité avant traitement.'
                 : score < 0  ? 'Ce signalement suscite des doutes. Une vérification préalable est conseillée.'
                 :               'Votes insuffisants pour tirer des conclusions. Attendez plus de participation.'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Bouton refresh */}
      <button onClick={load} style={{ fontSize: 11, color: dark ? '#64748b' : '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', padding: '10px 0 0', display: 'flex', alignItems: 'center', gap: 5, alignSelf: 'flex-start' }}>
        <span style={{ display: 'inline-block', transition: 'transform 0.3s' }} onMouseEnter={e => e.currentTarget.style.transform = 'rotate(180deg)'} onMouseLeave={e => e.currentTarget.style.transform = 'rotate(0)'}>↺</span>
        Rafraîchir
      </button>
    </div>
  );
}
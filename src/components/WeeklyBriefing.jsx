// components/WeeklyBriefing.jsx
// Rapport hebdomadaire IA — synthèse, tendances, recommandations
import React, { useState, useCallback, useEffect } from 'react';

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

const PRIORITY_CONFIG = {
  'immédiate':    { color: '#ef4444', bg: 'rgba(239,68,68,0.1)',  border: 'rgba(239,68,68,0.3)',  label: 'IMMÉDIAT' },
  'court-terme':  { color: '#f97316', bg: 'rgba(249,115,22,0.1)', border: 'rgba(249,115,22,0.3)', label: 'COURT TERME' },
  'moyen-terme':  { color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.3)', label: 'MOYEN TERME' },
};

const SEVERITY_CONFIG = {
  critical: { color: '#ef4444', bg: 'rgba(239,68,68,0.1)',  border: 'rgba(239,68,68,0.3)' },
  warning:  { color: '#f97316', bg: 'rgba(249,115,22,0.1)', border: 'rgba(249,115,22,0.3)' },
  info:     { color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.3)' },
};

const TYPE_FR = {
  water_pollution: 'Pollution eau', air_pollution: 'Pollution air',
  soil_contamination: 'Contamination sol', waste_deposit: 'Dépôts déchets',
  dust: 'Poussière', noise_pollution: 'Bruit', other: 'Autre',
};

export function WeeklyBriefing({ reports = [], users = [] }) {
  const dark = useDark();
  const [result, setResult]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const [period, setPeriod]   = useState('7d');
  const [tab, setTab]         = useState('summary'); // summary | findings | actions | stats

  const bg    = dark ? '#0f1f15' : '#ffffff';
  const card  = dark ? 'rgba(255,255,255,0.04)' : '#f9fafb';
  const bord  = dark ? 'rgba(255,255,255,0.08)' : '#e5e7eb';
  const txt   = dark ? '#f1f5f9' : '#111827';
  const muted = dark ? 'rgba(255,255,255,0.45)' : '#6b7280';
  const accent = '#2dd460';

  const generate = useCallback(async (p = period) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/weekly-briefing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reports, users, period: p }),
      });
      const data = await res.json();
      if (data.success) { setResult(data); setTab('summary'); }
      else setError(data.error || 'Erreur lors de la génération');
    } catch {
      setError('Impossible de contacter l\'API.');
    } finally {
      setLoading(false);
    }
  }, [reports, users, period]);

  // Générer automatiquement au montage
  useEffect(() => {
    if (reports.length >= 1) generate('7d');
  }, []);  // eslint-disable-line

  const handlePeriod = (p) => {
    setPeriod(p);
    generate(p);
  };

  const TABS = [
    { id: 'summary',  label: '📋 Synthèse' },
    { id: 'findings', label: '🔍 Analyses' },
    { id: 'actions',  label: '⚡ Actions' },
    { id: 'stats',    label: '📊 Stats' },
  ];

  const formatEvolution = (pct) => {
    if (pct === null || pct === undefined) return null;
    const sign = pct >= 0 ? '+' : '';
    const color = pct > 10 ? '#ef4444' : pct < -10 ? '#22c55e' : '#eab308';
    return { label: `${sign}${pct}%`, color };
  };

  return (
    <div style={{ background: bg, border: `1px solid ${bord}`, borderRadius: 16, overflow: 'hidden', fontFamily: 'inherit' }}>

      {/* Header */}
      <div style={{ padding: '20px 24px 0', background: dark ? 'rgba(45,212,96,0.06)' : 'rgba(45,212,96,0.04)', borderBottom: `1px solid ${bord}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <span style={{ fontSize: 22 }}>📰</span>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: txt }}>Rapport Hebdomadaire IA</h3>
              {result?.model === 'claude' && (
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: accent, background: 'rgba(45,212,96,0.1)', border: '1px solid rgba(45,212,96,0.25)', borderRadius: 20, padding: '2px 8px' }}>Claude IA</span>
              )}
            </div>
            {result && (
              <p style={{ margin: 0, fontSize: 12, color: muted }}>
                Généré le {new Date(result.generatedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Period selector */}
            <div style={{ display: 'flex', background: card, border: `1px solid ${bord}`, borderRadius: 8, padding: 2 }}>
              {[{ v: '7d', l: '7j' }, { v: '14d', l: '14j' }, { v: '30d', l: '30j' }].map(({ v, l }) => (
                <button
                  key={v}
                  onClick={() => handlePeriod(v)}
                  style={{ padding: '4px 10px', fontSize: 12, fontWeight: 600, borderRadius: 6, border: 'none', background: period === v ? accent : 'transparent', color: period === v ? '#fff' : muted, cursor: 'pointer', transition: 'all 0.15s' }}
                >
                  {l}
                </button>
              ))}
            </div>
            <button
              onClick={() => generate()}
              disabled={loading}
              style={{ padding: '6px 14px', fontSize: 12, fontWeight: 600, borderRadius: 8, border: 'none', background: loading ? 'rgba(45,212,96,0.4)' : accent, color: '#fff', cursor: loading ? 'not-allowed' : 'pointer' }}
            >
              {loading ? '⏳' : '↻'} {loading ? 'Génération...' : 'Regénérer'}
            </button>
          </div>
        </div>

        {/* Tabs */}
        {result && (
          <div style={{ display: 'flex', gap: 2 }}>
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{ padding: '8px 14px', fontSize: 12, fontWeight: tab === t.id ? 700 : 500, border: 'none', background: 'transparent', color: tab === t.id ? accent : muted, borderBottom: tab === t.id ? `2px solid ${accent}` : '2px solid transparent', cursor: 'pointer', transition: 'all 0.15s' }}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: 24 }}>

        {/* Error */}
        {error && (
          <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10, padding: '12px 16px', color: '#f87171', fontSize: 13 }}>
            ⚠️ {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 16, display: 'inline-block', animation: 'pulse 1.5s ease-in-out infinite' }}>📰</div>
            <p style={{ color: muted, fontSize: 14, margin: 0 }}>Génération du rapport en cours...</p>
            <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>
          </div>
        )}

        {/* Empty state */}
        {!loading && !result && !error && (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
            <p style={{ color: txt, fontSize: 14, fontWeight: 600, margin: '0 0 8px' }}>Aucun rapport généré</p>
            <p style={{ color: muted, fontSize: 13, margin: '0 0 16px' }}>Cliquez sur "Générer" pour créer le rapport</p>
            <button onClick={() => generate()} style={{ padding: '8px 20px', fontSize: 13, fontWeight: 600, borderRadius: 8, border: 'none', background: accent, color: '#fff', cursor: 'pointer' }}>
              Générer le rapport
            </button>
          </div>
        )}

        {/* Content */}
        {result && !loading && (
          <>
            {/* ── TAB: SYNTHÈSE ─────────────────────────────────────────── */}
            {tab === 'summary' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                {/* Headline */}
                <div style={{ background: 'linear-gradient(135deg, rgba(45,212,96,0.1), rgba(45,212,96,0.05))', border: '1px solid rgba(45,212,96,0.25)', borderRadius: 12, padding: '16px 20px' }}>
                  <h4 style={{ margin: '0 0 10px', fontSize: 18, fontWeight: 800, color: txt, lineHeight: 1.3 }}>
                    {result.briefing.headline}
                  </h4>
                  <p style={{ margin: 0, fontSize: 13, color: dark ? '#86efac' : '#166534', lineHeight: 1.7 }}>
                    {result.briefing.executiveSummary}
                  </p>
                </div>

                {/* KPIs rapides */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10 }}>
                  {[
                    {
                      icon: '📋', label: 'Signalements',
                      val: result.stats.total,
                      sub: (() => { const ev = formatEvolution(result.stats.evolutionPct); return ev ? <span style={{ color: ev.color, fontSize: 11, fontWeight: 700 }}>{ev.label}</span> : null; })(),
                    },
                    { icon: '✅', label: 'Taux résolution', val: `${result.stats.resolutionRate}%`, sub: <span style={{ color: result.stats.resolutionRate >= 60 ? accent : '#f97316', fontSize: 11 }}>{result.stats.resolutionRate >= 60 ? '▲' : '▼'} objectif 60%</span> },
                    { icon: '🚨', label: 'Critiques non résolus', val: result.stats.unresolvedCritical, sub: result.stats.unresolvedCritical > 0 && <span style={{ color: '#ef4444', fontSize: 11 }}>À traiter</span> },
                    { icon: '👥', label: 'Nouveaux citoyens', val: result.stats.newUsers, sub: <span style={{ color: muted, fontSize: 11 }}>période</span> },
                    { icon: '📅', label: 'Jour de pic', val: result.stats.peakDay, sub: <span style={{ color: muted, fontSize: 11 }}>+ d'incidents</span> },
                  ].map(({ icon, label, val, sub }) => (
                    <div key={label} style={{ background: card, border: `1px solid ${bord}`, borderRadius: 10, padding: '12px 14px' }}>
                      <div style={{ fontSize: 18, marginBottom: 6 }}>{icon}</div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: txt, marginBottom: 2 }}>{val}</div>
                      <div style={{ fontSize: 11, color: muted, marginBottom: sub ? 4 : 0 }}>{label}</div>
                      {sub}
                    </div>
                  ))}
                </div>

                {/* Outlook */}
                {result.briefing.outlookNextWeek && (
                  <div style={{ background: card, border: `1px solid ${bord}`, borderRadius: 10, padding: '12px 16px', fontSize: 13, color: muted, lineHeight: 1.6 }}>
                    🔮 <strong style={{ color: txt }}>Prévision :</strong> {result.briefing.outlookNextWeek}
                  </div>
                )}

                {/* Points positifs */}
                {result.briefing.positiveHighlights?.length > 0 && (
                  <div style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 10, padding: '12px 16px' }}>
                    <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '1px' }}>Points positifs</p>
                    {result.briefing.positiveHighlights.map((h, i) => (
                      <div key={i} style={{ fontSize: 13, color: dark ? '#86efac' : '#166534', display: 'flex', gap: 8, marginBottom: 4 }}>
                        <span>✓</span> {h}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── TAB: ANALYSES ─────────────────────────────────────────── */}
            {tab === 'findings' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                {/* Key findings */}
                {result.briefing.keyFindings?.length > 0 && (
                  <div>
                    <p style={{ margin: '0 0 12px', fontSize: 11, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '1px' }}>Constats clés</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {result.briefing.keyFindings.map((f, i) => {
                        const sev = SEVERITY_CONFIG[f.severity] || SEVERITY_CONFIG.info;
                        return (
                          <div key={i} style={{ background: sev.bg, border: `1px solid ${sev.border}`, borderRadius: 10, padding: '12px 14px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                            <span style={{ fontSize: 20, flexShrink: 0 }}>{f.icon}</span>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 700, color: sev.color, marginBottom: 3 }}>{f.title}</div>
                              <div style={{ fontSize: 12, color: dark ? 'rgba(255,255,255,0.6)' : '#4b5563' }}>{f.detail}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Trend analysis */}
                {result.briefing.trendAnalysis && (
                  <div style={{ background: card, border: `1px solid ${bord}`, borderRadius: 10, padding: '14px 16px' }}>
                    <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '1px' }}>Analyse des tendances</p>
                    <p style={{ margin: 0, fontSize: 13, color: txt, lineHeight: 1.7 }}>{result.briefing.trendAnalysis}</p>
                  </div>
                )}

                {/* Critical zones */}
                {result.briefing.criticalZones?.length > 0 && (
                  <div>
                    <p style={{ margin: '0 0 12px', fontSize: 11, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '1px' }}>Zones critiques</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {result.briefing.criticalZones.map((z, i) => {
                        const urg = z.urgency === 'critical' ? SEVERITY_CONFIG.critical : SEVERITY_CONFIG.warning;
                        return (
                          <div key={i} style={{ background: urg.bg, border: `1px solid ${urg.border}`, borderRadius: 10, padding: '10px 14px', display: 'flex', gap: 10, alignItems: 'center' }}>
                            <span style={{ fontSize: 16 }}>📍</span>
                            <div style={{ flex: 1 }}>
                              <span style={{ fontSize: 13, fontWeight: 700, color: urg.color }}>{z.zone}</span>
                              <span style={{ fontSize: 12, color: dark ? 'rgba(255,255,255,0.5)' : '#6b7280', marginLeft: 8 }}>{z.reason}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── TAB: ACTIONS ──────────────────────────────────────────── */}
            {tab === 'actions' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <p style={{ margin: '0 0 12px', fontSize: 11, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '1px' }}>Plan d'actions recommandées</p>
                {result.briefing.recommendations?.map((r, i) => {
                  const pc = PRIORITY_CONFIG[r.priority] || PRIORITY_CONFIG['moyen-terme'];
                  return (
                    <div key={i} style={{ background: pc.bg, border: `1px solid ${pc.border}`, borderLeft: `4px solid ${pc.color}`, borderRadius: 10, padding: '14px 16px', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                      <div style={{ flexShrink: 0, marginTop: 2 }}>
                        <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', color: pc.color, background: `${pc.bg}`, border: `1px solid ${pc.border}`, borderRadius: 4, padding: '2px 6px' }}>
                          {pc.label}
                        </span>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: txt, marginBottom: 4 }}>{r.action}</div>
                        {r.target && (
                          <div style={{ fontSize: 11, color: muted }}>👤 {r.target}</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── TAB: STATS ────────────────────────────────────────────── */}
            {tab === 'stats' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

                {/* Top régions */}
                <div>
                  <p style={{ margin: '0 0 12px', fontSize: 11, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '1px' }}>Top régions</p>
                  {result.stats.topRegions.map((r, i) => {
                    const pct = result.stats.total ? Math.round((r.count / result.stats.total) * 100) : 0;
                    return (
                      <div key={r.region} style={{ marginBottom: 10 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          <span style={{ fontSize: 12, color: txt, fontWeight: i === 0 ? 700 : 500 }}>
                            {['🥇','🥈','🥉','4.','5.'][i] || `${i+1}.`} {r.region}
                          </span>
                          <span style={{ fontSize: 12, color: muted }}>{r.count} ({pct}%)</span>
                        </div>
                        <div style={{ height: 4, background: bord, borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: accent, borderRadius: 2, transition: 'width 0.6s ease' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Top types */}
                <div>
                  <p style={{ margin: '0 0 12px', fontSize: 11, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '1px' }}>Types d'incidents</p>
                  {result.stats.topTypes.map((t, i) => {
                    const pct = result.stats.total ? Math.round((t.count / result.stats.total) * 100) : 0;
                    return (
                      <div key={t.type} style={{ marginBottom: 10 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: 12, color: txt }}>{TYPE_FR[t.type] || t.type}</span>
                          <span style={{ fontSize: 12, color: muted }}>{t.count} ({pct}%)</span>
                        </div>
                        <div style={{ height: 4, background: bord, borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: ['#2dd460','#3b82f6','#f97316','#a855f7'][i] || accent, borderRadius: 2 }} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Statuts */}
                <div style={{ gridColumn: '1 / -1' }}>
                  <p style={{ margin: '0 0 12px', fontSize: 11, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '1px' }}>Statuts</p>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {Object.entries(result.stats.byStatus).map(([s, n]) => {
                      const colors = { resolved: '#22c55e', in_progress: '#3b82f6', new: '#eab308', verified: '#a855f7', rejected: '#6b7280' };
                      return (
                        <div key={s} style={{ background: card, border: `1px solid ${bord}`, borderRadius: 8, padding: '8px 14px', textAlign: 'center' }}>
                          <div style={{ fontSize: 18, fontWeight: 800, color: colors[s] || muted }}>{n}</div>
                          <div style={{ fontSize: 11, color: muted, textTransform: 'capitalize' }}>{s.replace('_', ' ')}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

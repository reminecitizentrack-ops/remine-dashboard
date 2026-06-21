// components/RegionDashboard.jsx — Tableau de bord par région (v2)
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, CartesianGrid,
} from 'recharts';

// ─── Dark mode hook ───────────────────────────────────────────────────────────
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

// ─── Constants ────────────────────────────────────────────────────────────────
const TYPE_LABELS = {
  water_pollution: 'Pollution eau', air_pollution: 'Pollution air',
  soil_contamination: 'Contamination sol', waste_deposit: 'Dépôt déchets',
  dust: 'Poussière', abandoned_site: 'Site abandonné',
  noise_pollution: 'Pollution sonore', mining_waste: 'Déchets miniers',
  industrial_waste: 'Déchets industriels', illegal_dumping: 'Dépôt sauvage',
  chemical_spill: 'Déversement chimique', deforestation: 'Déforestation',
  other: 'Autre',
};
const TYPE_ICONS = {
  water_pollution: '💧', air_pollution: '🌫️', soil_contamination: '🟤',
  waste_deposit: '🗑️', dust: '💨', abandoned_site: '🏚️',
  noise_pollution: '🔊', mining_waste: '⛏️', industrial_waste: '🏭',
  illegal_dumping: '🚯', chemical_spill: '☣️', deforestation: '🌲',
  other: '⚠️',
};
const STATUS_LABELS = {
  new: 'Nouveau', verified: 'Vérifié', in_progress: 'En cours',
  resolved: 'Résolu', rejected: 'Rejeté',
};
const STATUS_COLORS = {
  new: '#3b82f6', verified: '#8b5cf6', in_progress: '#f59e0b',
  resolved: '#22c55e', rejected: '#6b7280',
};
const SEVERITY_LABELS = { low: 'Faible', medium: 'Moyen', high: 'Élevé', critical: 'Critique' };
const SEVERITY_COLORS = { low: '#22c55e', medium: '#f59e0b', high: '#f97316', critical: '#ef4444' };
const PALETTE = ['#2dd460', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'];

const SENEGAL_REGIONS = [
  'Dakar','Thiès','Diourbel','Fatick','Kaolack','Kaffrine','Kolda','Louga',
  'Matam','Saint-Louis','Sédhiou','Tambacounda','Kédougou','Ziguinchor',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getRiskScore(stats) {
  if (!stats || !stats.total) return { score: 0, level: 'none', label: 'Aucune donnée', color: '#6b7280' };
  const criticalW  = (stats.bySeverity?.critical || 0) * 4;
  const highW      = (stats.bySeverity?.high || 0) * 2;
  const unresolvedW = stats.active * 1.5;
  const raw = Math.min(100, Math.round(((criticalW + highW + unresolvedW) / Math.max(stats.total, 1)) * 25));
  if (raw === 0)    return { score: 0,   level: 'none',     label: 'Sûre',    color: '#22c55e' };
  if (raw < 20)     return { score: raw, level: 'low',      label: 'Faible',  color: '#84cc16' };
  if (raw < 45)     return { score: raw, level: 'medium',   label: 'Moyen',   color: '#f59e0b' };
  if (raw < 70)     return { score: raw, level: 'high',     label: 'Élevé',   color: '#f97316' };
  return             { score: raw, level: 'critical',  label: 'Critique', color: '#ef4444' };
}

function getRegionFromReport(r) {
  return r.location?.region ||
    r.location?.city ||
    r.location?.address?.split(',').slice(-2, -1)[0]?.trim() ||
    r.location?.address?.split(',')[0]?.trim() ||
    null;
}

function computeRegionStats(reports) {
  const byType = {}, byStatus = {}, bySeverity = {};
  reports.forEach(r => {
    byType[r.type || 'other']       = (byType[r.type || 'other'] || 0) + 1;
    byStatus[r.status || 'new']     = (byStatus[r.status || 'new'] || 0) + 1;
    bySeverity[r.severity || 'low'] = (bySeverity[r.severity || 'low'] || 0) + 1;
  });
  const resolved = reports.filter(r => r.status === 'resolved').length;
  const active   = reports.filter(r => ['new', 'verified', 'in_progress'].includes(r.status)).length;
  const totalVotes = reports.reduce((sum, r) => sum + (r.voteCount || r.votes?.length || 0), 0);
  return {
    total: reports.length, resolved, active,
    resolutionRate: reports.length ? Math.round((resolved / reports.length) * 100) : 0,
    critical: bySeverity.critical || 0,
    totalVotes,
    avgVotesPerReport: reports.length ? Math.round((totalVotes / reports.length) * 10) / 10 : 0,
    byType, byStatus, bySeverity,
    recent: [...reports].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 8),
  };
}

function getTimeline(reports, days = 30) {
  const now = Date.now();
  const result = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now - i * 86400000);
    const label = d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
    const count = reports.filter(r => {
      if (!r.createdAt) return false;
      const rd = new Date(r.createdAt);
      return rd.toDateString() === d.toDateString();
    }).length;
    result.push({ label, count });
  }
  // Simplify: show only every 5th label
  return result.map((d, i) => ({ ...d, label: i % 5 === 0 ? d.label : '' }));
}

// Compare le score de risque de la période actuelle (30j) vs la précédente (30-60j)
function getTrend(reports, days = 30) {
  const now = Date.now();
  const cutoff1 = now - days * 86400000;
  const cutoff2 = now - days * 2 * 86400000;

  const current  = reports.filter(r => r.createdAt && new Date(r.createdAt).getTime() >= cutoff1);
  const previous = reports.filter(r => {
    if (!r.createdAt) return false;
    const t = new Date(r.createdAt).getTime();
    return t >= cutoff2 && t < cutoff1;
  });

  const currentRisk  = getRiskScore(computeRegionStats(current));
  const previousRisk = getRiskScore(computeRegionStats(previous));

  const diff = currentRisk.score - previousRisk.score;
  let direction = 'stable';
  if (diff >= 10) direction = 'up';
  else if (diff <= -10) direction = 'down';

  return { diff, direction, currentScore: currentRisk.score, previousScore: previousRisk.score };
}

// Export CSV des stats régionales
function exportRegionsCSV(regionRanking) {
  const headers = ['Région', 'Total', 'Résolus', 'Actifs', 'Critiques', 'Taux résolution (%)', 'Votes citoyens', 'Score de risque', 'Niveau de risque', 'Tendance'];
  const rows = regionRanking.map(r => [
    r.name, r.total, r.resolved, r.active, r.critical, r.resolutionRate, r.totalVotes || 0,
    r.risk.score, r.risk.label,
    r.trend.direction === 'up' ? 'En hausse' : r.trend.direction === 'down' ? 'En baisse' : 'Stable',
  ]);
  const csv = [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `remine_regions_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function StatCard({ label, value, icon, color, bg, border }) {
  return (
    <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 14, padding: '14px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'rgba(107,114,128,0.9)' }}>{label}</p>
          <p style={{ margin: 0, fontSize: 28, fontWeight: 900, color, lineHeight: 1 }}>{value}</p>
        </div>
        <span style={{ fontSize: 22 }}>{icon}</span>
      </div>
    </div>
  );
}

function RiskBadge({ risk, size = 'md' }) {
  const pad = size === 'sm' ? '2px 8px' : '4px 12px';
  const fs  = size === 'sm' ? 10 : 12;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      background: `${risk.color}18`, border: `1px solid ${risk.color}40`,
      color: risk.color, borderRadius: 20, padding: pad,
      fontSize: fs, fontWeight: 700, letterSpacing: '0.5px',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: risk.color, flexShrink: 0 }} />
      {risk.label}
    </span>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export const RegionDashboard = ({ reports: allReports = [] }) => {
  const dark = useDark();
  const [selected, setSelected] = useState('');
  const [compareMode, setCompareMode] = useState(false);
  const [compareA, setCompareA] = useState('');
  const [compareB, setCompareB] = useState('');
  const [timelineRange, setTimelineRange] = useState(30);

  const bg    = dark ? '#0f1f15' : '#ffffff';
  const card  = dark ? 'rgba(255,255,255,0.04)' : '#f9fafb';
  const bord  = dark ? 'rgba(255,255,255,0.08)' : '#e5e7eb';
  const txt   = dark ? '#f1f5f9' : '#111827';
  const muted = dark ? 'rgba(255,255,255,0.45)' : '#6b7280';
  const accent = '#2dd460';
  const tooltipStyle = { background: dark ? '#1a2e1f' : '#fff', border: `1px solid ${bord}`, borderRadius: 8, color: txt, fontSize: 12 };

  // ── Régions : liste officielle + toute région détectée non-listée (ex: villes étrangères)
  const regions = useMemo(() => {
    const detected = new Set();
    allReports.forEach(r => { const z = getRegionFromReport(r); if (z) detected.add(z); });
    const extra = Array.from(detected).filter(r => !SENEGAL_REGIONS.includes(r));
    return [...SENEGAL_REGIONS, ...extra.sort()];
  }, [allReports]);

  // ── Stats de la région sélectionnée
  const filteredReports = useMemo(() => {
    if (!selected) return allReports;
    return allReports.filter(r => getRegionFromReport(r) === selected);
  }, [allReports, selected]);

  const stats = useMemo(() => computeRegionStats(filteredReports), [filteredReports]);
  const risk  = useMemo(() => getRiskScore(stats), [stats]);

  // ── Comparaison
  const statsA = useMemo(() => {
    if (!compareA) return null;
    return computeRegionStats(allReports.filter(r => getRegionFromReport(r) === compareA));
  }, [allReports, compareA]);

  const statsB = useMemo(() => {
    if (!compareB) return null;
    return computeRegionStats(allReports.filter(r => getRegionFromReport(r) === compareB));
  }, [allReports, compareB]);

  // ── Classement global des régions (+ tendance)
  const regionRanking = useMemo(() => {
    return regions.map(reg => {
      const reps = allReports.filter(r => getRegionFromReport(r) === reg);
      const s = computeRegionStats(reps);
      return { name: reg, ...s, risk: getRiskScore(s), trend: getTrend(reps), hasData: reps.length > 0 };
    }).sort((a, b) => b.total - a.total);
  }, [regions, allReports]);

  // ── Timeline
  const timeline = useMemo(() => getTimeline(filteredReports, timelineRange), [filteredReports, timelineRange]);

  // ── Chart data
  const typeData = Object.entries(stats.byType || {})
    .map(([k, v]) => ({ name: TYPE_LABELS[k] || k, value: v, icon: TYPE_ICONS[k] || '⚠️' }))
    .sort((a, b) => b.value - a.value);

  const statusData = Object.entries(stats.byStatus || {})
    .map(([k, v]) => ({ name: STATUS_LABELS[k] || k, value: v, color: STATUS_COLORS[k] || '#6b7280' }));

  const severityData = Object.entries(stats.bySeverity || {})
    .map(([k, v]) => ({ name: SEVERITY_LABELS[k] || k, value: v, color: SEVERITY_COLORS[k] || '#6b7280' }));

  // ── Compare chart
  const compareChartData = compareMode && statsA && statsB ? [
    { metric: 'Total', A: statsA.total, B: statsB.total },
    { metric: 'Résolus', A: statsA.resolved, B: statsB.resolved },
    { metric: 'Actifs', A: statsA.active, B: statsB.active },
    { metric: 'Critiques', A: statsA.critical, B: statsB.critical },
  ] : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, fontFamily: 'inherit' }}>

      {/* ── Header + sélecteur ───────────────────────────────────────────── */}
      <div style={{ background: bg, border: `1px solid ${bord}`, borderRadius: 16, padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, background: 'rgba(45,212,96,0.1)', border: '1px solid rgba(45,212,96,0.25)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>🗺️</div>
            <div>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: txt }}>Tableau de bord régional</h2>
              <p style={{ margin: 0, fontSize: 12, color: muted }}>{allReports.length} signalement{allReports.length > 1 ? 's' : ''} · {regions.length} région{regions.length > 1 ? 's' : ''} ({SENEGAL_REGIONS.length} officielles)</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => exportRegionsCSV(regionRanking)}
              style={{ padding: '7px 14px', fontSize: 12, fontWeight: 600, borderRadius: 10, border: `1px solid ${bord}`, background: 'transparent', color: muted, cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              ⬇️ Exporter CSV
            </button>
            <button
              onClick={() => { setCompareMode(!compareMode); setSelected(''); }}
              style={{ padding: '7px 14px', fontSize: 12, fontWeight: 600, borderRadius: 10, border: `1px solid ${compareMode ? accent : bord}`, background: compareMode ? 'rgba(45,212,96,0.1)' : 'transparent', color: compareMode ? accent : muted, cursor: 'pointer', transition: 'all 0.2s' }}
            >
              ⚖️ {compareMode ? 'Quitter la comparaison' : 'Comparer des régions'}
            </button>
          </div>
        </div>

        {/* Boutons de région */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {!compareMode && (
            <button
              onClick={() => setSelected('')}
              style={{ padding: '7px 14px', fontSize: 12, fontWeight: 600, borderRadius: 10, border: `1px solid ${!selected ? accent : bord}`, background: !selected ? 'rgba(45,212,96,0.12)' : 'transparent', color: !selected ? accent : muted, cursor: 'pointer', transition: 'all 0.15s' }}
            >
              🌍 Toutes les régions
            </button>
          )}
          {regions.map(reg => {
            const rData = regionRanking.find(r => r.name === reg);
            const isSelected = compareMode ? (compareA === reg || compareB === reg) : selected === reg;
            const isA = compareMode && compareA === reg;
            const isB = compareMode && compareB === reg;
            const trendIcon = rData?.trend.direction === 'up' ? '↗️' : rData?.trend.direction === 'down' ? '↘️' : null;
            return (
              <button
                key={reg}
                onClick={() => {
                  if (compareMode) {
                    if (compareA === reg) setCompareA('');
                    else if (compareB === reg) setCompareB('');
                    else if (!compareA) setCompareA(reg);
                    else if (!compareB) setCompareB(reg);
                  } else {
                    setSelected(selected === reg ? '' : reg);
                  }
                }}
                style={{
                  padding: '7px 14px', fontSize: 12, fontWeight: 600, borderRadius: 10,
                  border: `1px solid ${isSelected ? (isA ? '#3b82f6' : isB ? '#f59e0b' : accent) : bord}`,
                  background: isSelected ? (isA ? 'rgba(59,130,246,0.12)' : isB ? 'rgba(245,158,11,0.12)' : 'rgba(45,212,96,0.12)') : 'transparent',
                  color: isSelected ? (isA ? '#3b82f6' : isB ? '#f59e0b' : accent) : (rData?.hasData ? muted : `${muted}80`),
                  cursor: 'pointer', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 6,
                  opacity: rData?.hasData ? 1 : 0.55,
                }}
              >
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: rData?.risk.color || '#6b7280', flexShrink: 0 }} />
                {reg}
                {rData?.hasData ? (
                  <span style={{ fontSize: 10, opacity: 0.7 }}>({rData.total})</span>
                ) : (
                  <span style={{ fontSize: 9, opacity: 0.6, fontStyle: 'italic' }}>—</span>
                )}
                {trendIcon && <span style={{ fontSize: 11 }} title={rData.trend.direction === 'up' ? 'Risque en hausse' : 'Risque en baisse'}>{trendIcon}</span>}
                {isA && <span style={{ fontSize: 10, fontWeight: 800, color: '#3b82f6' }}>A</span>}
                {isB && <span style={{ fontSize: 10, fontWeight: 800, color: '#f59e0b' }}>B</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Mode comparaison ─────────────────────────────────────────────── */}
      {compareMode && (
        <div style={{ background: bg, border: `1px solid ${bord}`, borderRadius: 16, padding: 24 }}>
          <h3 style={{ margin: '0 0 20px', fontSize: 15, fontWeight: 700, color: txt }}>⚖️ Comparaison de régions</h3>

          {(!compareA || !compareB) ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: muted, fontSize: 13 }}>
              Sélectionne deux régions ci-dessus pour les comparer
              <div style={{ marginTop: 8, display: 'flex', justifyContent: 'center', gap: 16 }}>
                <span style={{ color: '#3b82f6', fontWeight: 700 }}>■ A : {compareA || '—'}</span>
                <span style={{ color: '#f59e0b', fontWeight: 700 }}>■ B : {compareB || '—'}</span>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Heads-up cards */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {[{ label: compareA, s: statsA, color: '#3b82f6', badge: 'A' }, { label: compareB, s: statsB, color: '#f59e0b', badge: 'B' }].map(({ label, s, color, badge }) => {
                  const r = getRiskScore(s);
                  return (
                    <div key={badge} style={{ background: `${color}08`, border: `1px solid ${color}30`, borderRadius: 12, padding: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                        <span style={{ width: 24, height: 24, borderRadius: 6, background: color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800 }}>{badge}</span>
                        <span style={{ fontSize: 14, fontWeight: 700, color: txt }}>{label}</span>
                        <RiskBadge risk={r} size="sm" />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        {[
                          { l: 'Total', v: s.total },
                          { l: 'Résolus', v: s.resolved },
                          { l: 'Taux rés.', v: `${s.resolutionRate}%` },
                          { l: 'Critiques', v: s.critical },
                        ].map(({ l, v }) => (
                          <div key={l} style={{ background: card, borderRadius: 8, padding: '8px 10px' }}>
                            <div style={{ fontSize: 10, color: muted, marginBottom: 2 }}>{l}</div>
                            <div style={{ fontSize: 18, fontWeight: 800, color }}>{v}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bar chart comparaison */}
              <div style={{ background: card, border: `1px solid ${bord}`, borderRadius: 12, padding: 16 }}>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={compareChartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={bord} />
                    <XAxis dataKey="metric" tick={{ fontSize: 11, fill: muted }} />
                    <YAxis tick={{ fontSize: 11, fill: muted }} allowDecimals={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend />
                    <Bar dataKey="A" name={compareA} fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="B" name={compareB} fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Vue région sélectionnée / globale ───────────────────────────── */}
      {!compareMode && (
        <>
          {/* Bandeau "aucune donnée" pour une région sans signalement */}
          {selected && stats.total === 0 && (
            <div style={{ background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 12, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 24 }}>✅</span>
              <div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: dark ? '#86efac' : '#166534' }}>Aucun signalement pour {selected}</p>
                <p style={{ margin: 0, fontSize: 12, color: muted }}>Cette région n'a enregistré aucun incident environnemental à ce jour.</p>
              </div>
            </div>
          )}

          {/* KPIs + Risk */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
            <StatCard label="Total" value={stats.total} icon="📋" color={accent} bg={bg} border={bord} />
            <StatCard label="Résolus" value={stats.resolved} icon="✅" color="#22c55e" bg={bg} border={bord} />
            <StatCard label="Actifs" value={stats.active} icon="⏳" color="#f59e0b" bg={bg} border={bord} />
            <StatCard label="Critiques" value={stats.critical} icon="🚨" color="#ef4444" bg={bg} border={bord} />
            <StatCard label="Votes citoyens" value={stats.totalVotes} icon="🗳️" color="#8b5cf6" bg={bg} border={bord} />
            <div style={{ background: bg, border: `1px solid ${bord}`, borderRadius: 14, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: muted }}>Risque zone</p>
              <RiskBadge risk={risk} />
              <div style={{ height: 6, background: bord, borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: `${risk.score}%`, height: '100%', background: risk.color, borderRadius: 3, transition: 'width 0.6s ease' }} />
              </div>
            </div>
            <div style={{ background: bg, border: `1px solid ${bord}`, borderRadius: 14, padding: '14px 16px' }}>
              <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: muted }}>Taux résolution</p>
              <p style={{ margin: 0, fontSize: 28, fontWeight: 900, color: stats.resolutionRate >= 60 ? '#22c55e' : stats.resolutionRate >= 30 ? '#f59e0b' : '#ef4444' }}>{stats.resolutionRate}%</p>
            </div>
          </div>

          {/* Timeline */}
          <div style={{ background: bg, border: `1px solid ${bord}`, borderRadius: 16, padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: txt }}>
                📅 Évolution temporelle {selected ? `— ${selected}` : '(toutes régions)'}
              </h3>
              <div style={{ display: 'flex', background: card, border: `1px solid ${bord}`, borderRadius: 8, padding: 2 }}>
                {[7, 14, 30].map(d => (
                  <button key={d} onClick={() => setTimelineRange(d)} style={{ padding: '3px 10px', fontSize: 11, fontWeight: 600, borderRadius: 6, border: 'none', background: timelineRange === d ? accent : 'transparent', color: timelineRange === d ? '#fff' : muted, cursor: 'pointer', transition: 'all 0.15s' }}>
                    {d}j
                  </button>
                ))}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={timeline} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={bord} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: muted }} />
                <YAxis tick={{ fontSize: 10, fill: muted }} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => [v, 'Signalements']} />
                <Line type="monotone" dataKey="count" stroke={accent} strokeWidth={2} dot={false} activeDot={{ r: 4, fill: accent }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Graphiques par type + statut */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {typeData.length > 0 && (
              <div style={{ background: bg, border: `1px solid ${bord}`, borderRadius: 16, padding: 20 }}>
                <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700, color: txt }}>📊 Par type d'incident</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={typeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} innerRadius={35}>
                      {typeData.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} formatter={(v, n) => [v, n]} />
                    <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 11, color: muted }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {statusData.length > 0 && (
              <div style={{ background: bg, border: `1px solid ${bord}`, borderRadius: 16, padding: 20 }}>
                <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700, color: txt }}>📈 Par statut</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={statusData} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={bord} />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: muted }} />
                    <YAxis tick={{ fontSize: 10, fill: muted }} allowDecimals={false} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v) => [v, 'Signalements']} />
                    <Bar dataKey="value" radius={[5, 5, 0, 0]}>
                      {statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Classement global des régions */}
          {!selected && regionRanking.length > 0 && (
            <div style={{ background: bg, border: `1px solid ${bord}`, borderRadius: 16, padding: 20 }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700, color: txt }}>🏆 Classement des régions</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {regionRanking.map((reg, i) => {
                  const pct = allReports.length ? Math.round((reg.total / allReports.length) * 100) : 0;
                  return (
                    <div
                      key={reg.name}
                      onClick={() => setSelected(reg.name)}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 10, cursor: 'pointer', transition: 'background 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.background = card}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <span style={{ fontSize: 13, fontWeight: 800, color: muted, width: 22, textAlign: 'center' }}>
                        {['🥇','🥈','🥉'][i] || `#${i+1}`}
                      </span>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: txt }}>📍 {reg.name}</span>
                            <RiskBadge risk={reg.risk} size="sm" />
                            {reg.trend.direction === 'up' && (
                              <span style={{ fontSize: 10, fontWeight: 700, color: '#ef4444', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 20, padding: '1px 7px' }}>
                                ↗️ Risque en hausse
                              </span>
                            )}
                            {reg.trend.direction === 'down' && (
                              <span style={{ fontSize: 10, fontWeight: 700, color: '#22c55e', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 20, padding: '1px 7px' }}>
                                ↘️ En amélioration
                              </span>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: 12, fontSize: 12, color: muted }}>
                            {reg.hasData ? (
                              <>
                                <span><strong style={{ color: txt }}>{reg.total}</strong> signalements</span>
                                <span><strong style={{ color: reg.resolutionRate >= 60 ? '#22c55e' : '#f59e0b' }}>{reg.resolutionRate}%</strong> résolus</span>
                                <span><strong style={{ color: '#8b5cf6' }}>🗳️ {reg.totalVotes || 0}</strong> votes</span>
                              </>
                            ) : (
                              <span style={{ fontStyle: 'italic' }}>Aucun signalement</span>
                            )}
                          </div>
                        </div>
                        {reg.hasData && (
                          <div style={{ height: 5, background: bord, borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ width: `${pct}%`, height: '100%', background: PALETTE[i % PALETTE.length], borderRadius: 3, transition: 'width 0.6s ease' }} />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Signalements récents */}
          {selected && stats.recent.length > 0 && (
            <div style={{ background: bg, border: `1px solid ${bord}`, borderRadius: 16, padding: 20 }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700, color: txt }}>🕐 Signalements récents — {selected}</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {stats.recent.map(r => {
                  const sevColor = SEVERITY_COLORS[r.severity] || '#6b7280';
                  const stColor  = STATUS_COLORS[r.status] || '#6b7280';
                  return (
                    <div key={r._id || r.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: card, borderRadius: 10, border: `1px solid ${bord}` }}>
                      <span style={{ fontSize: 18, flexShrink: 0 }}>{TYPE_ICONS[r.type] || '⚠️'}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: txt, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {r.description?.substring(0, 60) || TYPE_LABELS[r.type] || 'Incident'}
                          {r.description?.length > 60 ? '...' : ''}
                        </div>
                        <div style={{ fontSize: 11, color: muted }}>
                          {r.createdAt ? new Date(r.createdAt).toLocaleDateString('fr-FR') : '—'}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: sevColor, background: `${sevColor}15`, border: `1px solid ${sevColor}30`, borderRadius: 6, padding: '2px 7px' }}>
                          {SEVERITY_LABELS[r.severity] || r.severity}
                        </span>
                        <span style={{ fontSize: 10, fontWeight: 700, color: stColor, background: `${stColor}15`, border: `1px solid ${stColor}30`, borderRadius: 6, padding: '2px 7px' }}>
                          {STATUS_LABELS[r.status] || r.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
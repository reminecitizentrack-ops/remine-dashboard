import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  ComposedChart, Scatter, ScatterChart, ZAxis,
  PieChart, Pie, Cell, RadarChart, Radar, Treemap,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine, Brush,
} from 'recharts';
import { subDays, format, startOfDay, differenceInDays } from 'date-fns';

// ─── Constantes ───────────────────────────────────────────────────────────────
const TYPE_LABELS = {
  water_pollution: 'Eau', air_pollution: 'Air', soil_contamination: 'Sol',
  waste_deposit: 'Déchets', dust: 'Poussière', abandoned_site: 'Site abandonné',
  noise_pollution: 'Sonore', other: 'Autre',
};
const TYPE_COLORS = {
  water_pollution: '#3b82f6', air_pollution: '#8b5cf6', soil_contamination: '#92400e',
  waste_deposit: '#f59e0b', dust: '#9ca3af', abandoned_site: '#6b7280',
  noise_pollution: '#ec4899', other: '#64748b',
};
const STATUS_COLORS = {
  new: '#f59e0b', verified: '#3b82f6', in_progress: '#8b5cf6',
  resolved: '#10b981', rejected: '#ef4444',
};
const STATUS_LABELS = {
  new: 'Nouveau', verified: 'Vérifié', in_progress: 'En cours',
  resolved: 'Résolu', rejected: 'Rejeté',
};
const SEV_COLORS = { critical: '#dc2626', high: '#f97316', medium: '#f59e0b', low: '#22c55e' };
const PIE_COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#06b6d4','#92400e'];
const PERIODS = [
  { value: '7d', label: '7j', days: 7 },
  { value: '30d', label: '30j', days: 30 },
  { value: '90d', label: '3M', days: 90 },
  { value: '6m', label: '6M', days: 180 },
  { value: '1y', label: '1A', days: 365 },
];
const CHART_TYPES = [
  { v: 'area',     l: '〰 Aire'    },
  { v: 'line',     l: '↗ Ligne'   },
  { v: 'bar',      l: '▮ Barres'  },
  { v: 'composed', l: '⊕ Composé' },
];

const safe = arr => Array.isArray(arr) ? arr : [];

// ─── Hook dark mode ───────────────────────────────────────────────────────────
function useDarkMode() {
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

// ─── Tooltip custom ───────────────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label, darkMode }) => {
  if (!active || !payload?.length) return null;
  const dm = darkMode;
  return (
    <div style={{
      background: dm ? '#1e293b' : '#fff',
      border: `1px solid ${dm ? '#334155' : '#e2e8f0'}`,
      borderRadius: 14, padding: '10px 14px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
      backdropFilter: 'blur(8px)',
    }}>
      {label && <p style={{ fontWeight: 700, color: dm ? '#f1f5f9' : '#0f172a', fontSize: 12, marginBottom: 8 }}>{label}</p>}
      {payload.map((e, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: e.color, flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: dm ? '#94a3b8' : '#6b7280' }}>{e.name}</span>
          <span style={{ fontSize: 12, fontWeight: 800, color: e.color, marginLeft: 'auto' }}>{e.value}</span>
        </div>
      ))}
    </div>
  );
};

// ─── KPI Card ─────────────────────────────────────────────────────────────────
const KpiCard = ({ label, value, sub, trend, icon, color = '#10b981', darkMode: dm }) => {
  const isUp   = typeof trend === 'number' && trend > 0;
  const isDown = typeof trend === 'number' && trend < 0;
  return (
    <div style={{
      background: dm ? '#1e293b' : '#fff',
      borderRadius: 18, padding: '16px 18px',
      border: `1px solid ${dm ? '#334155' : '#f1f5f9'}`,
      boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
      position: 'relative', overflow: 'hidden',
      transition: 'transform 0.2s, box-shadow 0.2s',
    }}
    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 8px 24px ${color}20`; }}
    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)'; }}
    >
      {/* Fond décoratif */}
      <div style={{ position: 'absolute', top: -8, right: -8, fontSize: 56, opacity: 0.06, userSelect: 'none' }}>{icon}</div>

      <p style={{ fontSize: 10, fontWeight: 800, color: dm ? '#64748b' : '#9ca3af', textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 8px' }}>{label}</p>
      <p style={{ fontSize: 32, fontWeight: 900, color: dm ? '#f1f5f9' : '#0f172a', margin: 0, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{value}</p>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
        {trend !== undefined && (
          <span style={{
            fontSize: 11, fontWeight: 700,
            color: isUp ? '#16a34a' : isDown ? '#dc2626' : '#6b7280',
            background: isUp ? '#dcfce7' : isDown ? '#fee2e2' : (dm ? '#1e293b' : '#f8fafc'),
            padding: '2px 8px', borderRadius: 99,
          }}>
            {isUp ? '↑' : isDown ? '↓' : '→'} {Math.abs(trend)}%
          </span>
        )}
        {sub && <p style={{ fontSize: 11, color: dm ? '#475569' : '#9ca3af', margin: 0 }}>{sub}</p>}
      </div>

      {/* Barre couleur en bas */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${color}, ${color}44)`, borderRadius: '0 0 18px 18px' }} />
    </div>
  );
};

// ─── Chart Card wrapper ───────────────────────────────────────────────────────
const ChartCard = ({ title, subtitle, icon, children, darkMode: dm, action }) => (
  <div style={{
    background: dm ? '#1e293b' : '#fff',
    borderRadius: 20, border: `1px solid ${dm ? '#334155' : '#f1f5f9'}`,
    padding: '20px 20px 12px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
  }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ width: 32, height: 32, background: dm ? '#0f172a' : '#f8fafc', borderRadius: 10, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>{icon}</span>
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 800, color: dm ? '#f1f5f9' : '#0f172a', margin: 0 }}>{title}</h3>
          {subtitle && <p style={{ fontSize: 11, color: dm ? '#64748b' : '#94a3b8', margin: '2px 0 0' }}>{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
    {children}
  </div>
);

// ─── Composant principal ──────────────────────────────────────────────────────
export function AdvancedAnalytics({ stats, reports: rawReports, analytics }) {
  const darkMode  = useDarkMode();
  const [period,    setPeriod]    = useState('30d');
  const [chartType, setChartType] = useState('area');
  const [activeViz, setActiveViz] = useState('timeline'); // timeline | types | funnel | scatter | treemap

  const reports = useMemo(() => safe(rawReports), [rawReports]);
  const days    = useMemo(() => PERIODS.find(p => p.value === period)?.days || 30, [period]);

  const inPeriod = useMemo(() => {
    const cutoff = subDays(new Date(), days);
    return reports.filter(r => r.createdAt && new Date(r.createdAt) >= cutoff);
  }, [reports, days]);

  const prevPeriod = useMemo(() => {
    const c1 = subDays(new Date(), days), c2 = subDays(new Date(), days * 2);
    return reports.filter(r => r.createdAt && new Date(r.createdAt) >= c2 && new Date(r.createdAt) < c1);
  }, [reports, days]);

  // ── Série temporelle ────────────────────────────────────────────────────────
  const timeSeries = useMemo(() => {
    const pts  = Math.min(days, 60);
    const step = Math.max(1, Math.floor(days / pts));
    const series = Array.from({ length: pts }, (_, i) => {
      const d = subDays(new Date(), (pts - 1 - i) * step);
      return { date: format(d, days <= 30 ? 'dd/MM' : 'MM/yy'), fullDate: startOfDay(d), total: 0, résolus: 0, critiques: 0, taux: 0 };
    });
    const totals = { total: 0, résolus: 0 };
    reports.forEach(r => {
      if (!r.createdAt) return;
      const rd = startOfDay(new Date(r.createdAt));
      let closest = null, minDiff = Infinity;
      series.forEach(s => { const d = Math.abs(s.fullDate - rd); if (d < minDiff) { minDiff = d; closest = s; } });
      if (closest && minDiff < step * 86400000) {
        closest.total++;
        if (r.status === 'resolved') closest.résolus++;
        if (r.severity === 'critical') closest.critiques++;
      }
    });
    return series.map(s => ({ ...s, taux: s.total > 0 ? Math.round(s.résolus / s.total * 100) : 0 }));
  }, [reports, days]);

  // ── Par type ────────────────────────────────────────────────────────────────
  const typeData = useMemo(() => {
    const map = {};
    inPeriod.forEach(r => { const t = r.type || 'other'; map[t] = (map[t] || 0) + 1; });
    return Object.entries(map)
      .map(([k, v]) => ({ name: TYPE_LABELS[k] || k, value: v, key: k, color: TYPE_COLORS[k] || '#6b7280' }))
      .sort((a, b) => b.value - a.value);
  }, [inPeriod]);

  // ── Treemap hiérarchie types × sévérité ─────────────────────────────────────
  const treemapData = useMemo(() => {
    const map = {};
    inPeriod.forEach(r => {
      const t = r.type || 'other';
      if (!map[t]) map[t] = { name: TYPE_LABELS[t] || t, children: {}, color: TYPE_COLORS[t] || '#6b7280' };
      const s = r.severity || 'low';
      map[t].children[s] = (map[t].children[s] || 0) + 1;
    });
    return Object.values(map).map(t => ({
      name: t.name, color: t.color,
      children: Object.entries(t.children).map(([s, v]) => ({
        name: `${t.name} · ${s}`, size: v, color: SEV_COLORS[s] || '#6b7280',
      })),
    })).filter(t => t.children.length > 0);
  }, [inPeriod]);

  // ── Funnel statuts ───────────────────────────────────────────────────────────
  const funnelData = useMemo(() => {
    const order = ['new', 'verified', 'in_progress', 'resolved', 'rejected'];
    const map   = {};
    inPeriod.forEach(r => { const s = r.status || 'new'; map[s] = (map[s] || 0) + 1; });
    const total = inPeriod.length || 1;
    return order.filter(k => map[k]).map(k => ({
      name: STATUS_LABELS[k], value: map[k], pct: Math.round(map[k] / total * 100), color: STATUS_COLORS[k],
    }));
  }, [inPeriod]);

  // ── Scatter : délai résolution × sévérité ───────────────────────────────────
  const scatterData = useMemo(() => {
    return inPeriod
      .filter(r => r.status === 'resolved' && r.resolvedAt && r.createdAt)
      .map(r => ({
        délai:    differenceInDays(new Date(r.resolvedAt), new Date(r.createdAt)),
        sévérité: ['low','medium','high','critical'].indexOf(r.severity || 'low'),
        votes:    r.voteCount || 0,
        type:     TYPE_LABELS[r.type] || 'Autre',
        color:    SEV_COLORS[r.severity] || '#22c55e',
      }))
      .filter(d => d.délai >= 0 && d.délai <= 90);
  }, [inPeriod]);

  // ── Radar sévérité × type ────────────────────────────────────────────────────
  const radarData = useMemo(() => {
    const types = [...new Set(reports.map(r => r.type).filter(Boolean))].slice(0, 7);
    return types.map(t => {
      const rs = inPeriod.filter(r => r.type === t);
      return { type: TYPE_LABELS[t] || t, critique: rs.filter(r => r.severity==='critical').length, élevé: rs.filter(r => r.severity==='high').length, moyen: rs.filter(r => r.severity==='medium').length };
    }).filter(d => d.critique + d.élevé + d.moyen > 0);
  }, [inPeriod, reports]);

  // ── KPIs ─────────────────────────────────────────────────────────────────────
  const trendCalc = (curr, prev) => prev === 0 ? (curr > 0 ? 100 : 0) : Math.round(((curr - prev) / prev) * 100);
  const resolved  = inPeriod.filter(r => r.status === 'resolved').length;
  const critical  = inPeriod.filter(r => r.severity === 'critical').length;
  const kpis = [
    { label: 'Signalements',    value: inPeriod.length, sub: `vs ${prevPeriod.length} préc.`, trend: trendCalc(inPeriod.length, prevPeriod.length), icon: '📋', color: '#3b82f6' },
    { label: 'Résolus',         value: resolved, sub: 'dans la période', trend: trendCalc(resolved, prevPeriod.filter(r=>r.status==='resolved').length), icon: '✅', color: '#10b981' },
    { label: 'Taux résolution', value: inPeriod.length ? `${Math.round(resolved/inPeriod.length*100)}%` : '—', sub: 'taux global', icon: '🎯', color: '#8b5cf6' },
    { label: 'Critiques',       value: critical, sub: 'priorité haute', trend: trendCalc(critical, prevPeriod.filter(r=>r.severity==='critical').length), icon: '🚨', color: '#ef4444' },
    { label: 'Temps moy. résol.', value: (() => { const resolved = inPeriod.filter(r => r.resolvedAt && r.createdAt); if (!resolved.length) return '—'; const avg = resolved.reduce((s,r) => s + differenceInDays(new Date(r.resolvedAt), new Date(r.createdAt)), 0) / resolved.length; return `${Math.round(avg)}j`; })(), sub: 'moyenne', icon: '⏱️', color: '#f59e0b' },
    { label: 'Nouveaux',        value: inPeriod.filter(r=>r.status==='new').length, sub: 'non traités', icon: '🆕', color: '#06b6d4' },
  ];

  // ── Styles ───────────────────────────────────────────────────────────────────
  const dm         = darkMode;
  const gridColor  = dm ? '#334155' : '#f1f5f9';
  const textMuted  = dm ? '#64748b' : '#94a3b8';
  const textSec    = dm ? '#94a3b8' : '#6b7280';
  const tooltipProps = { content: <ChartTooltip darkMode={dm} /> };

  // ── Sélecteur de visualisation ────────────────────────────────────────────────
  const vizTabs = [
    { id: 'timeline', label: '📈 Évolution'   },
    { id: 'types',    label: '🗂️ Types'       },
    { id: 'funnel',   label: '🔽 Entonnoir'   },
    { id: 'scatter',  label: '⚡ Résolution'  },
    { id: 'treemap',  label: '🟦 Treemap'     },
    { id: 'radar',    label: '🎯 Radar'       },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Barre de contrôles ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        {/* Période */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: textSec }}>Période</span>
          <div style={{ display: 'flex', gap: 3, background: dm ? '#0f172a' : '#f1f5f9', padding: 3, borderRadius: 10 }}>
            {PERIODS.map(p => (
              <button key={p.value} onClick={() => setPeriod(p.value)} style={{ padding: '4px 12px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, background: period===p.value ? '#10b981' : 'transparent', color: period===p.value ? '#fff' : textSec, transition: 'all 0.15s' }}>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Type graphique (seulement pour timeline) */}
        {activeViz === 'timeline' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: textSec }}>Graphique</span>
            <div style={{ display: 'flex', gap: 3, background: dm ? '#0f172a' : '#f1f5f9', padding: 3, borderRadius: 10 }}>
              {CHART_TYPES.map(c => (
                <button key={c.v} onClick={() => setChartType(c.v)} style={{ padding: '4px 11px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600, background: chartType===c.v ? '#3b82f6' : 'transparent', color: chartType===c.v ? '#fff' : textSec, transition: 'all 0.15s' }}>
                  {c.l}
                </button>
              ))}
            </div>
          </div>
        )}

        <span style={{ fontSize: 12, color: textMuted, marginLeft: 'auto' }}>
          {inPeriod.length} signalement{inPeriod.length > 1 ? 's' : ''} sur {days} jours
        </span>
      </div>

      {/* ── KPIs ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
        {kpis.map(k => <KpiCard key={k.label} {...k} darkMode={dm} />)}
      </div>

      {/* ── Onglets de visualisation ── */}
      <div style={{ display: 'flex', gap: 4, background: dm ? '#0f172a' : '#f1f5f9', padding: 4, borderRadius: 14, flexWrap: 'wrap' }}>
        {vizTabs.map(t => (
          <button key={t.id} onClick={() => setActiveViz(t.id)} style={{ flex: '0 0 auto', padding: '7px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, background: activeViz===t.id ? (dm ? '#1e293b' : '#fff') : 'transparent', color: activeViz===t.id ? (dm ? '#f1f5f9' : '#0f172a') : textSec, boxShadow: activeViz===t.id ? '0 2px 8px rgba(0,0,0,0.08)' : 'none', transition: 'all 0.2s' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ══ TIMELINE ══════════════════════════════════════════════════════════ */}
      {activeViz === 'timeline' && (
        <ChartCard title={`Évolution sur ${days} jours`} subtitle="Signalements, résolutions et cas critiques" icon="📈" darkMode={dm}>
          <ResponsiveContainer width="100%" height={260}>
            {chartType === 'area' ? (
              <AreaChart data={timeSeries} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gT" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient>
                  <linearGradient id="gR" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
                  <linearGradient id="gC" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/><stop offset="95%" stopColor="#ef4444" stopOpacity={0}/></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: textMuted }} />
                <YAxis tick={{ fontSize: 10, fill: textMuted }} allowDecimals={false} />
                <Tooltip {...tooltipProps} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: 11, color: textSec }} />
                <Area type="monotone" dataKey="total"    name="Total"    stroke="#3b82f6" fill="url(#gT)" strokeWidth={2.5} dot={false} activeDot={{ r: 5, strokeWidth: 2 }} />
                <Area type="monotone" dataKey="résolus"  name="Résolus"  stroke="#10b981" fill="url(#gR)" strokeWidth={2}   dot={false} activeDot={{ r: 4 }} />
                <Area type="monotone" dataKey="critiques" name="Critiques" stroke="#ef4444" fill="url(#gC)" strokeWidth={1.5} dot={false} strokeDasharray="5 3" />
              </AreaChart>
            ) : chartType === 'line' ? (
              <LineChart data={timeSeries} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: textMuted }} />
                <YAxis tick={{ fontSize: 10, fill: textMuted }} allowDecimals={false} />
                <Tooltip {...tooltipProps} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="total"    name="Total"    stroke="#3b82f6" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="résolus"  name="Résolus"  stroke="#10b981" strokeWidth={2}   dot={false} activeDot={{ r: 4 }} />
                <Line type="monotone" dataKey="critiques" name="Critiques" stroke="#ef4444" strokeWidth={1.5} dot={false} strokeDasharray="5 3" />
                <Line type="monotone" dataKey="taux"     name="Taux rés.%" stroke="#8b5cf6" strokeWidth={1.5} dot={false} strokeDasharray="3 2" yAxisId={1} />
                <YAxis yAxisId={1} orientation="right" tick={{ fontSize: 9, fill: textMuted }} tickFormatter={v => `${v}%`} />
              </LineChart>
            ) : chartType === 'bar' ? (
              <BarChart data={timeSeries} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: textMuted }} />
                <YAxis tick={{ fontSize: 10, fill: textMuted }} allowDecimals={false} />
                <Tooltip {...tooltipProps} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="total"    name="Total"    fill="#3b82f6" radius={[3,3,0,0]} />
                <Bar dataKey="résolus"  name="Résolus"  fill="#10b981" radius={[3,3,0,0]} />
                <Bar dataKey="critiques" name="Critiques" fill="#ef4444" radius={[3,3,0,0]} />
              </BarChart>
            ) : (
              // Composé : barres total + ligne taux
              <ComposedChart data={timeSeries} margin={{ top: 5, right: 30, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gBar" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3b82f6" stopOpacity={0.9}/><stop offset="100%" stopColor="#3b82f6" stopOpacity={0.3}/></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: textMuted }} />
                <YAxis yAxisId="left"  tick={{ fontSize: 10, fill: textMuted }} allowDecimals={false} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9, fill: '#8b5cf6' }} tickFormatter={v => `${v}%`} />
                <Tooltip {...tooltipProps} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                <Bar    yAxisId="left"  dataKey="total"   name="Total"          fill="url(#gBar)" radius={[4,4,0,0]} />
                <Bar    yAxisId="left"  dataKey="résolus" name="Résolus"         fill="#10b981"    radius={[4,4,0,0]} opacity={0.8} />
                <Line   yAxisId="right" dataKey="taux"    name="Taux rés. (%)"   stroke="#8b5cf6"  strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
                <ReferenceLine yAxisId="right" y={50} stroke="#f59e0b" strokeDasharray="4 2" label={{ value: '50%', fill: '#f59e0b', fontSize: 9 }} />
              </ComposedChart>
            )}
          </ResponsiveContainer>
          {/* Brush navigation */}
          {timeSeries.length > 20 && (
            <ResponsiveContainer width="100%" height={40} style={{ marginTop: 8 }}>
              <AreaChart data={timeSeries}>
                <Area type="monotone" dataKey="total" stroke="#3b82f6" fill="#3b82f644" strokeWidth={1} dot={false} />
                <Brush dataKey="date" height={30} stroke={dm ? '#334155' : '#e2e8f0'} fill={dm ? '#0f172a' : '#f8fafc'} travellerWidth={6} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      )}

      {/* ══ TYPES & STATUTS ══════════════════════════════════════════════════ */}
      {activeViz === 'types' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <ChartCard title="Par type de pollution" subtitle={`${typeData.length} types distincts`} icon="🗂️" darkMode={dm}>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={typeData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3}>
                  {typeData.map((entry, i) => <Cell key={i} fill={entry.color || PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v, n) => [v, n]} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: textSec }} />
              </PieChart>
            </ResponsiveContainer>
            {/* Barres horizontales par type */}
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 5 }}>
              {typeData.map((t, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 10, color: textSec, width: 70, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</span>
                  <div style={{ flex: 1, height: 6, background: dm ? '#334155' : '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: t.color, borderRadius: 99, width: `${Math.round(t.value / Math.max(...typeData.map(d=>d.value), 1) * 100)}%`, transition: 'width 0.8s cubic-bezier(0.22,1,0.36,1)' }} />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 800, color: t.color, width: 24, textAlign: 'right' }}>{t.value}</span>
                </div>
              ))}
            </div>
          </ChartCard>

          <ChartCard title="Par statut" subtitle="Distribution dans la période" icon="📊" darkMode={dm}>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={[...Object.entries(STATUS_COLORS).map(([k, color]) => {
                const count = inPeriod.filter(r => r.status === k).length;
                return count > 0 ? { name: STATUS_LABELS[k], value: count, color } : null;
              }).filter(Boolean)]} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                <XAxis type="number" tick={{ fontSize: 10, fill: textMuted }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: textSec }} width={76} />
                <Tooltip {...tooltipProps} />
                <Bar dataKey="value" name="Signalements" radius={[0, 6, 6, 0]}>
                  {Object.entries(STATUS_COLORS).filter(([k]) => inPeriod.filter(r=>r.status===k).length > 0).map(([k, color], i) => <Cell key={i} fill={color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            {/* Taux de résolution visuel */}
            {inPeriod.length > 0 && (
              <div style={{ marginTop: 16, padding: '12px 14px', background: dm ? '#0f172a' : '#f8fafc', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: textSec }}>Taux de résolution</span>
                    <span style={{ fontSize: 13, fontWeight: 900, color: '#10b981' }}>{Math.round(resolved / inPeriod.length * 100)}%</span>
                  </div>
                  <div style={{ height: 8, background: dm ? '#334155' : '#e2e8f0', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: 'linear-gradient(90deg, #10b981, #34d399)', borderRadius: 99, width: `${Math.round(resolved / inPeriod.length * 100)}%`, transition: 'width 1s cubic-bezier(0.22,1,0.36,1)' }} />
                  </div>
                </div>
              </div>
            )}
          </ChartCard>
        </div>
      )}

      {/* ══ ENTONNOIR ═════════════════════════════════════════════════════════ */}
      {activeViz === 'funnel' && (
        <ChartCard title="Entonnoir de traitement" subtitle="Pipeline complet des signalements" icon="🔽" darkMode={dm}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '8px 0' }}>
            {funnelData.map((step, i) => {
              const maxVal = Math.max(...funnelData.map(s => s.value), 1);
              const pct    = Math.round(step.value / maxVal * 100);
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 90, flexShrink: 0, textAlign: 'right' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: dm ? '#94a3b8' : '#374151' }}>{step.name}</span>
                  </div>
                  <div style={{ flex: 1, position: 'relative', height: 40, display: 'flex', alignItems: 'center' }}>
                    {/* Barre trapèze */}
                    <div style={{
                      height: 36, borderRadius: 8,
                      width: `${pct}%`, minWidth: 60,
                      background: `linear-gradient(90deg, ${step.color}, ${step.color}99)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                      paddingRight: 10, transition: 'width 1s cubic-bezier(0.22,1,0.36,1)',
                      boxShadow: `0 2px 12px ${step.color}33`,
                    }}>
                      <span style={{ fontSize: 14, fontWeight: 900, color: '#fff', fontVariantNumeric: 'tabular-nums' }}>{step.value}</span>
                    </div>
                    {/* Pourcentage */}
                    <span style={{ fontSize: 11, fontWeight: 700, color: step.color, marginLeft: 10, whiteSpace: 'nowrap' }}>
                      {step.pct}%
                    </span>
                    {/* Flèche entre étapes */}
                    {i < funnelData.length - 1 && (
                      <div style={{ position: 'absolute', bottom: -14, left: 4, fontSize: 10, color: dm ? '#334155' : '#e2e8f0' }}>▼</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </ChartCard>
      )}

      {/* ══ SCATTER : délai résolution ════════════════════════════════════════ */}
      {activeViz === 'scatter' && (
        <ChartCard title="Délai de résolution" subtitle="Jours de traitement par sévérité (signalements résolus)" icon="⚡" darkMode={dm}>
          {scatterData.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: textMuted, fontSize: 13 }}>
              Aucun signalement résolu avec des dates dans cette période
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={260}>
                <ScatterChart margin={{ top: 10, right: 30, left: -10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                  <XAxis dataKey="délai"    name="Délai (jours)"  type="number"  tick={{ fontSize: 10, fill: textMuted }} label={{ value: 'Délai (jours)', position: 'insideBottom', offset: -2, fontSize: 10, fill: textMuted }} />
                  <YAxis dataKey="sévérité" name="Sévérité"       type="number"  tick={{ fontSize: 10, fill: textMuted }} tickFormatter={v => ['Faible','Moyen','Élevé','Critique'][v] || ''} domain={[-0.5, 3.5]} ticks={[0,1,2,3]} />
                  <ZAxis dataKey="votes"    range={[40, 200]}  name="Votes" />
                  <Tooltip
                    cursor={{ strokeDasharray: '3 3', stroke: dm ? '#475569' : '#cbd5e1' }}
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      const sevLabels = ['Faible','Moyen','Élevé','Critique'];
                      return (
                        <div style={{ background: dm ? '#1e293b' : '#fff', border: `1px solid ${dm ? '#334155' : '#e2e8f0'}`, borderRadius: 12, padding: '10px 14px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}>
                          <p style={{ fontSize: 12, fontWeight: 700, color: dm ? '#f1f5f9' : '#0f172a', margin: '0 0 6px' }}>{d.type}</p>
                          <p style={{ fontSize: 11, color: textSec, margin: '2px 0' }}>⏱️ Délai : <strong style={{ color: d.color }}>{d.délai} jour{d.délai > 1 ? 's' : ''}</strong></p>
                          <p style={{ fontSize: 11, color: textSec, margin: '2px 0' }}>⚠️ Sévérité : <strong style={{ color: d.color }}>{sevLabels[d.sévérité]}</strong></p>
                          <p style={{ fontSize: 11, color: textSec, margin: '2px 0' }}>👍 Votes : <strong>{d.votes}</strong></p>
                        </div>
                      );
                    }}
                  />
                  {[0,1,2,3].map((sev) => {
                    const col = [SEV_COLORS.low, SEV_COLORS.medium, SEV_COLORS.high, SEV_COLORS.critical][sev];
                    const pts = scatterData.filter(d => d.sévérité === sev);
                    return pts.length > 0 ? (
                      <Scatter key={sev} name={['Faible','Moyen','Élevé','Critique'][sev]} data={pts} fill={col} opacity={0.75} />
                    ) : null;
                  }).filter(Boolean)}
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: textSec }} />
                </ScatterChart>
              </ResponsiveContainer>
              {/* Stats résumé */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 12 }}>
                {[0,1,2,3].map(sev => {
                  const pts = scatterData.filter(d => d.sévérité === sev);
                  const avg = pts.length ? Math.round(pts.reduce((s, d) => s + d.délai, 0) / pts.length) : null;
                  const sevLabels = ['Faible','Moyen','Élevé','Critique'];
                  const col = [SEV_COLORS.low, SEV_COLORS.medium, SEV_COLORS.high, SEV_COLORS.critical][sev];
                  return (
                    <div key={sev} style={{ padding: '10px 12px', background: dm ? '#0f172a' : '#f8fafc', borderRadius: 12, textAlign: 'center', border: `1px solid ${col}30` }}>
                      <p style={{ fontSize: 10, fontWeight: 700, color: col, margin: '0 0 4px' }}>{sevLabels[sev]}</p>
                      <p style={{ fontSize: 20, fontWeight: 900, color: avg ? col : textMuted, margin: 0 }}>{avg != null ? `${avg}j` : '—'}</p>
                      <p style={{ fontSize: 9, color: textMuted, margin: '2px 0 0' }}>{pts.length} résolu{pts.length > 1 ? 's' : ''}</p>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </ChartCard>
      )}

      {/* ══ TREEMAP ══════════════════════════════════════════════════════════ */}
      {activeViz === 'treemap' && (
        <ChartCard title="Carte de chaleur des types" subtitle="Volume par type et sévérité" icon="🟦" darkMode={dm}>
          {treemapData.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: textMuted, fontSize: 13 }}>Pas de données pour cette période</div>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <Treemap
                data={treemapData}
                dataKey="size"
                aspectRatio={4/3}
                stroke={dm ? '#1e293b' : '#fff'}
                content={({ x, y, width, height, name, color, value }) => {
                  if (width < 20 || height < 20) return null;
                  return (
                    <g>
                      <rect x={x+1} y={y+1} width={width-2} height={height-2} fill={color || '#10b981'} fillOpacity={0.85} rx={4} />
                      {width > 50 && height > 30 && (
                        <text x={x + width/2} y={y + height/2} textAnchor="middle" dominantBaseline="middle" style={{ fontSize: Math.min(11, width/6), fontWeight: 700, fill: '#fff', fontFamily: 'Inter, sans-serif' }}>
                          {name}
                        </text>
                      )}
                      {value && width > 40 && height > 44 && (
                        <text x={x + width/2} y={y + height/2 + 14} textAnchor="middle" style={{ fontSize: 10, fill: 'rgba(255,255,255,0.8)', fontFamily: 'Inter, sans-serif' }}>
                          {value}
                        </text>
                      )}
                    </g>
                  );
                }}
              />
            </ResponsiveContainer>
          )}
        </ChartCard>
      )}

      {/* ══ RADAR ════════════════════════════════════════════════════════════ */}
      {activeViz === 'radar' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <ChartCard title="Sévérité par type" subtitle="Distribution des niveaux de sévérité" icon="🎯" darkMode={dm}>
            {radarData.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: textMuted, fontSize: 13 }}>Pas de données</div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <RadarChart data={radarData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                  <PolarGrid stroke={gridColor} />
                  <PolarAngleAxis dataKey="type" tick={{ fontSize: 9, fill: textSec }} />
                  <PolarRadiusAxis tick={{ fontSize: 8, fill: textMuted }} />
                  <Radar name="Critique" dataKey="critique" stroke="#ef4444" fill="#ef4444" fillOpacity={0.2} strokeWidth={2} />
                  <Radar name="Élevé"    dataKey="élevé"    stroke="#f97316" fill="#f97316" fillOpacity={0.15} strokeWidth={1.5} />
                  <Radar name="Moyen"    dataKey="moyen"    stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.1}  strokeWidth={1} />
                  <Legend iconSize={7} wrapperStyle={{ fontSize: 11, color: textSec }} />
                  <Tooltip {...tooltipProps} />
                </RadarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard title="Top zones géographiques" subtitle="Villes les plus actives" icon="📍" darkMode={dm}>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={(() => {
                  const map = {};
                  inPeriod.forEach(r => { const c = r.location?.city || r.location?.region || 'Autre'; map[c] = (map[c] || 0) + 1; });
                  return Object.entries(map).map(([k, v]) => ({ name: k, signalements: v })).sort((a, b) => b.signalements - a.signalements).slice(0, 8);
                })()}
                margin={{ top: 5, right: 10, left: -20, bottom: 24 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: textMuted }} angle={-30} textAnchor="end" interval={0} />
                <YAxis tick={{ fontSize: 9, fill: textMuted }} allowDecimals={false} />
                <Tooltip {...tooltipProps} />
                <Bar dataKey="signalements" name="Signalements" radius={[6,6,0,0]}>
                  {Array.from({length:8},(_,i)=><Cell key={i} fill={`hsl(${152+i*14},65%,${50-i*2}%)`} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      )}
    </div>
  );
}
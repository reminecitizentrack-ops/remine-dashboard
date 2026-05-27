import React, { useMemo, useState, useEffect } from 'react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { subDays, format, startOfDay } from 'date-fns';

const TYPE_LABELS = {
  water_pollution: 'Eau', air_pollution: 'Air', soil_contamination: 'Sol',
  waste_deposit: 'Déchets', dust: 'Poussière', abandoned_site: 'Site abandonné',
  noise_pollution: 'Sonore', other: 'Autre',
};
const STATUS_COLORS = {
  new: '#f59e0b', verified: '#3b82f6', in_progress: '#8b5cf6',
  resolved: '#10b981', rejected: '#ef4444',
};
const STATUS_LABELS = { new: 'Nouveau', verified: 'Vérifié', in_progress: 'En cours', resolved: 'Résolu', rejected: 'Rejeté' };
const PIE_COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#06b6d4','#78350f'];
const PERIODS = [
  { value: '7d',  label: '7j',  days: 7   },
  { value: '30d', label: '30j', days: 30  },
  { value: '90d', label: '3M',  days: 90  },
  { value: '6m',  label: '6M',  days: 180 },
  { value: '1y',  label: '1A',  days: 365 },
];

const safe = arr => Array.isArray(arr) ? arr : [];
const dm = () => typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

const TooltipStyle = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const dark = dm();
  return (
    <div style={{ background: dark ? '#1e293b' : '#fff', border: `1px solid ${dark ? '#334155' : '#e5e7eb'}`, borderRadius: 12, padding: '10px 14px', boxShadow: '0 4px 20px rgba(0,0,0,.12)' }}>
      <p style={{ fontWeight: 700, color: dark ? '#f1f5f9' : '#0f172a', marginBottom: 6, fontSize: 12 }}>{label}</p>
      {payload.map((e, i) => (
        <p key={i} style={{ color: e.color, fontSize: 12, margin: '2px 0' }}>{e.name} : <strong>{e.value}</strong></p>
      ))}
    </div>
  );
};

const KpiCard = ({ label, value, sub, color, trend, icon, darkMode }) => {
  const dark = darkMode;
  const isUp = trend > 0;
  return (
    <div style={{
      background: dark ? '#1e293b' : '#fff', borderRadius: 16, padding: '16px 18px',
      border: `1px solid ${dark ? '#334155' : '#f1f5f9'}`, boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: -10, right: -10, fontSize: 52, opacity: 0.06 }}>{icon}</div>
      <p style={{ fontSize: 11, fontWeight: 700, color: dark ? '#64748b' : '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.8, margin: '0 0 6px' }}>{label}</p>
      <p style={{ fontSize: 30, fontWeight: 900, color: dark ? '#f1f5f9' : '#0f172a', margin: 0, fontVariantNumeric: 'tabular-nums' }}>{value}</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
        {trend !== undefined && (
          <span style={{ fontSize: 11, fontWeight: 700, color: isUp ? '#10b981' : '#ef4444', background: isUp ? '#dcfce7' : '#fee2e2', padding: '1px 7px', borderRadius: 99 }}>
            {isUp ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
        )}
        {sub && <p style={{ fontSize: 11, color: dark ? '#475569' : '#9ca3af', margin: 0 }}>{sub}</p>}
      </div>
    </div>
  );
};

export function AdvancedAnalytics({ stats, reports: rawReports, analytics }) {
  const [period, setPeriod]   = useState('30d');
  const [chartType, setChartType] = useState('area');
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const check = () => setDarkMode(document.documentElement.classList.contains('dark'));
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);

  const reports = useMemo(() => safe(rawReports), [rawReports]);
  const days    = useMemo(() => PERIODS.find(p => p.value === period)?.days || 30, [period]);

  const inPeriod = useMemo(() => {
    const cutoff = subDays(new Date(), days);
    return reports.filter(r => r.createdAt && new Date(r.createdAt) >= cutoff);
  }, [reports, days]);

  const prevPeriod = useMemo(() => {
    const c1 = subDays(new Date(), days);
    const c2 = subDays(new Date(), days * 2);
    return reports.filter(r => r.createdAt && new Date(r.createdAt) >= c2 && new Date(r.createdAt) < c1);
  }, [reports, days]);

  // Série temporelle
  const timeSeries = useMemo(() => {
    const pts  = Math.min(days, 45);
    const step = Math.max(1, Math.floor(days / pts));
    const series = Array.from({ length: pts }, (_, i) => {
      const d = subDays(new Date(), (pts - 1 - i) * step);
      return { date: format(d, days <= 30 ? 'dd/MM' : 'MM/yy'), fullDate: startOfDay(d), total: 0, résolus: 0, critiques: 0 };
    });
    reports.forEach(r => {
      if (!r.createdAt) return;
      const rd = startOfDay(new Date(r.createdAt));
      let closest = null, minDiff = Infinity;
      series.forEach(s => { const d = Math.abs(s.fullDate - rd); if (d < minDiff) { minDiff = d; closest = s; } });
      if (closest && minDiff < step * 86400000) {
        closest.total++;
        if (r.status === 'resolved')  closest.résolus++;
        if (r.severity === 'critical') closest.critiques++;
      }
    });
    return series;
  }, [reports, days]);

  // Répartition par type
  const typeData = useMemo(() => {
    const map = {};
    inPeriod.forEach(r => { const t = r.type || 'other'; map[t] = (map[t] || 0) + 1; });
    return Object.entries(map).map(([k, v]) => ({ name: TYPE_LABELS[k] || k, value: v })).sort((a, b) => b.value - a.value);
  }, [inPeriod]);

  // Répartition par statut
  const statusData = useMemo(() => {
    const map = {};
    inPeriod.forEach(r => { const s = r.status || 'new'; map[s] = (map[s] || 0) + 1; });
    return Object.entries(map).map(([k, v]) => ({ name: STATUS_LABELS[k] || k, value: v, color: STATUS_COLORS[k] || '#6b7280' }));
  }, [inPeriod]);

  // Par région
  const regionData = useMemo(() => {
    const map = {};
    inPeriod.forEach(r => { const c = r.location?.city || r.location?.region || 'Autre'; map[c] = (map[c] || 0) + 1; });
    return Object.entries(map).map(([k, v]) => ({ name: k, signalements: v })).sort((a, b) => b.signalements - a.signalements).slice(0, 8);
  }, [inPeriod]);

  // Radar sévérité × type
  const radarData = useMemo(() => {
    const types = [...new Set(reports.map(r => r.type).filter(Boolean))].slice(0, 6);
    return types.map(t => {
      const rs = inPeriod.filter(r => r.type === t);
      return {
        type: TYPE_LABELS[t] || t,
        critique: rs.filter(r => r.severity === 'critical').length,
        élevé:    rs.filter(r => r.severity === 'high').length,
        moyen:    rs.filter(r => r.severity === 'medium').length,
      };
    });
  }, [inPeriod, reports]);

  // KPIs avec tendance
  const trend = (curr, prev) => prev === 0 ? (curr > 0 ? 100 : 0) : Math.round(((curr - prev) / prev) * 100);
  const kpis = [
    { label: 'Signalements', value: inPeriod.length, sub: `vs ${prevPeriod.length} période préc.`, trend: trend(inPeriod.length, prevPeriod.length), icon: '📋' },
    { label: 'Résolus', value: inPeriod.filter(r => r.status === 'resolved').length, sub: 'dans la période', trend: trend(inPeriod.filter(r => r.status === 'resolved').length, prevPeriod.filter(r => r.status === 'resolved').length), icon: '✅' },
    { label: 'Taux résolution', value: inPeriod.length ? `${Math.round(inPeriod.filter(r => r.status === 'resolved').length / inPeriod.length * 100)}%` : '—', sub: 'de la période', icon: '📊' },
    { label: 'Critiques', value: inPeriod.filter(r => r.severity === 'critical').length, sub: 'à traiter en priorité', trend: trend(inPeriod.filter(r => r.severity === 'critical').length, prevPeriod.filter(r => r.severity === 'critical').length), icon: '🚨' },
  ];

  const cardBg = darkMode ? '#1e293b' : '#fff';
  const cardBorder = darkMode ? '#334155' : '#f1f5f9';
  const textPrimary = darkMode ? '#f1f5f9' : '#0f172a';
  const textSecondary = darkMode ? '#94a3b8' : '#6b7280';
  const gridColor = darkMode ? '#1e293b' : '#f8fafc';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Sélecteur de période ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: textSecondary }}>Période :</span>
        <div style={{ display: 'flex', gap: 4, background: darkMode ? '#0f172a' : '#f1f5f9', padding: 4, borderRadius: 12 }}>
          {PERIODS.map(p => (
            <button key={p.value} onClick={() => setPeriod(p.value)} style={{
              padding: '5px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
              background: period === p.value ? '#10b981' : 'transparent',
              color: period === p.value ? '#fff' : textSecondary, transition: 'all 0.15s',
            }}>{p.label}</button>
          ))}
        </div>
        <span style={{ fontSize: 13, fontWeight: 700, color: textSecondary, marginLeft: 12 }}>Graphique :</span>
        <div style={{ display: 'flex', gap: 4, background: darkMode ? '#0f172a' : '#f1f5f9', padding: 4, borderRadius: 12 }}>
          {[{ v: 'area', l: '〰 Aire' }, { v: 'line', l: '↗ Ligne' }, { v: 'bar', l: '▮ Barres' }].map(c => (
            <button key={c.v} onClick={() => setChartType(c.v)} style={{
              padding: '5px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
              background: chartType === c.v ? '#3b82f6' : 'transparent',
              color: chartType === c.v ? '#fff' : textSecondary, transition: 'all 0.15s',
            }}>{c.l}</button>
          ))}
        </div>
      </div>

      {/* ── KPIs ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        {kpis.map(k => <KpiCard key={k.label} {...k} darkMode={darkMode} />)}
      </div>

      {/* ── Série temporelle ── */}
      <div style={{ background: cardBg, borderRadius: 18, border: `1px solid ${cardBorder}`, padding: '20px 20px 8px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <h3 style={{ fontSize: 15, fontWeight: 800, color: textPrimary, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 28, height: 28, background: '#eff6ff', borderRadius: 8, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>📈</span>
          Évolution sur {days} jours
        </h3>
        <ResponsiveContainer width="100%" height={220}>
          {chartType === 'area' ? (
            <AreaChart data={timeSeries} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient>
                <linearGradient id="gradRes"   x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
                <linearGradient id="gradCrit"  x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.25}/><stop offset="95%" stopColor="#ef4444" stopOpacity={0}/></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: textSecondary }} />
              <YAxis tick={{ fontSize: 10, fill: textSecondary }} allowDecimals={false} />
              <Tooltip content={<TooltipStyle />} />
              <Legend iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              <Area type="monotone" dataKey="total"    name="Total"    stroke="#3b82f6" fill="url(#gradTotal)" strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="résolus"  name="Résolus"  stroke="#10b981" fill="url(#gradRes)"   strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="critiques" name="Critiques" stroke="#ef4444" fill="url(#gradCrit)"  strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
            </AreaChart>
          ) : chartType === 'line' ? (
            <LineChart data={timeSeries} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: textSecondary }} />
              <YAxis tick={{ fontSize: 10, fill: textSecondary }} allowDecimals={false} />
              <Tooltip content={<TooltipStyle />} />
              <Legend iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="total"    name="Total"    stroke="#3b82f6" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
              <Line type="monotone" dataKey="résolus"  name="Résolus"  stroke="#10b981" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              <Line type="monotone" dataKey="critiques" name="Critiques" stroke="#ef4444" strokeWidth={1.5} dot={false} strokeDasharray="5 3" />
            </LineChart>
          ) : (
            <BarChart data={timeSeries} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: textSecondary }} />
              <YAxis tick={{ fontSize: 10, fill: textSecondary }} allowDecimals={false} />
              <Tooltip content={<TooltipStyle />} />
              <Legend iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="total"    name="Total"    fill="#3b82f6" radius={[3,3,0,0]} />
              <Bar dataKey="résolus"  name="Résolus"  fill="#10b981" radius={[3,3,0,0]} />
              <Bar dataKey="critiques" name="Critiques" fill="#ef4444" radius={[3,3,0,0]} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* ── Grille : Type + Statut ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Répartition par type */}
        <div style={{ background: cardBg, borderRadius: 18, border: `1px solid ${cardBorder}`, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <h3 style={{ fontSize: 14, fontWeight: 800, color: textPrimary, margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ fontSize: 16 }}>🗂️</span> Par type
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={typeData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3}>
                {typeData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v) => [v, 'Signalements']} />
              <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Répartition par statut */}
        <div style={{ background: cardBg, borderRadius: 18, border: `1px solid ${cardBorder}`, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <h3 style={{ fontSize: 14, fontWeight: 800, color: textPrimary, margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ fontSize: 16 }}>📊</span> Par statut
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={statusData} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
              <XAxis type="number" tick={{ fontSize: 10, fill: textSecondary }} allowDecimals={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: textSecondary }} width={72} />
              <Tooltip content={<TooltipStyle />} />
              <Bar dataKey="value" name="Signalements" radius={[0, 6, 6, 0]}>
                {statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Par région + Radar ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 16 }}>
        {/* Top régions */}
        <div style={{ background: cardBg, borderRadius: 18, border: `1px solid ${cardBorder}`, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <h3 style={{ fontSize: 14, fontWeight: 800, color: textPrimary, margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ fontSize: 16 }}>📍</span> Top villes / régions
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={regionData} margin={{ top: 0, right: 10, left: -20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: textSecondary }} angle={-30} textAnchor="end" />
              <YAxis tick={{ fontSize: 10, fill: textSecondary }} allowDecimals={false} />
              <Tooltip content={<TooltipStyle />} />
              <Bar dataKey="signalements" name="Signalements" fill="#10b981" radius={[6, 6, 0, 0]}>
                {regionData.map((_, i) => <Cell key={i} fill={`hsl(${152 + i * 12}, 65%, ${50 - i * 3}%)`} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Radar sévérité × type */}
        {radarData.length > 0 && (
          <div style={{ background: cardBg, borderRadius: 18, border: `1px solid ${cardBorder}`, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <h3 style={{ fontSize: 14, fontWeight: 800, color: textPrimary, margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ fontSize: 16 }}>🎯</span> Sévérité par type
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={radarData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                <PolarGrid stroke={darkMode ? '#334155' : '#f1f5f9'} />
                <PolarAngleAxis dataKey="type" tick={{ fontSize: 9, fill: textSecondary }} />
                <Radar name="Critique" dataKey="critique" stroke="#ef4444" fill="#ef4444" fillOpacity={0.2} strokeWidth={2} />
                <Radar name="Élevé"    dataKey="élevé"    stroke="#f97316" fill="#f97316" fillOpacity={0.15} strokeWidth={1.5} />
                <Radar name="Moyen"    dataKey="moyen"    stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.1}  strokeWidth={1} />
                <Legend iconSize={7} wrapperStyle={{ fontSize: 11 }} />
                <Tooltip content={<TooltipStyle />} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
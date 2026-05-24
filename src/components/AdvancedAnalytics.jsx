import React, { useMemo, useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { subDays, startOfDay, subMonths, subYears, format } from 'date-fns';

// ─── Constantes ───────────────────────────────────────────────────────────────
const TYPE_LABELS = {
  water_pollution:    'Pollution eau',
  air_pollution:      'Pollution air',
  soil_contamination: 'Contamination sol',
  waste_deposit:      'Dépôt déchets',
  dust:               'Poussière',
  abandoned_site:     'Site abandonné',
  noise_pollution:    'Pollution sonore',
  mining_waste:       'Déchets miniers',
  other:              'Autre',
};

const STATUS_COLORS = {
  new:         { name: 'Nouveau',   color: '#f59e0b' },
  verified:    { name: 'Vérifié',   color: '#3b82f6' },
  in_progress: { name: 'En cours',  color: '#8b5cf6' },
  resolved:    { name: 'Résolu',    color: '#10b981' },
  rejected:    { name: 'Rejeté',    color: '#ef4444' },
};

const PERIOD_OPTIONS = [
  { value: '7d',  label: '7 derniers jours',  days: 7   },
  { value: '30d', label: '30 derniers jours', days: 30  },
  { value: '90d', label: '3 derniers mois',   days: 90  },
  { value: '6m',  label: '6 derniers mois',   days: 180 },
  { value: '1y',  label: 'Cette année',        days: 365 },
];

const PIE_COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#06b6d4','#78350f'];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:'#fff', border:'1px solid #e5e7eb', borderRadius:10, padding:'10px 14px', boxShadow:'0 4px 16px rgba(0,0,0,.08)' }}>
      <p style={{ fontWeight:600, color:'#111827', marginBottom:4, fontSize:13 }}>{label}</p>
      {payload.map((e, i) => (
        <p key={i} style={{ color:e.color, fontSize:12, margin:'2px 0' }}>{e.name} : <strong>{e.value}</strong></p>
      ))}
    </div>
  );
};

// ─── Utilitaires ─────────────────────────────────────────────────────────────
const safe = (arr) => Array.isArray(arr) ? arr : [];

const filterByPeriod = (reports, days) => {
  const cutoff = subDays(new Date(), days);
  return safe(reports).filter(r => r.createdAt && new Date(r.createdAt) >= cutoff);
};

const comparePeriods = (reports, days) => {
  const now      = new Date();
  const cutoff1  = subDays(now, days);
  const cutoff2  = subDays(now, days * 2);
  const current  = safe(reports).filter(r => r.createdAt && new Date(r.createdAt) >= cutoff1);
  const previous = safe(reports).filter(r => r.createdAt && new Date(r.createdAt) >= cutoff2 && new Date(r.createdAt) < cutoff1);
  return { current, previous };
};

const pctChange = (curr, prev) => {
  if (!prev) return curr > 0 ? '+100%' : '—';
  const d = Math.round(((curr - prev) / prev) * 100);
  return d >= 0 ? `+${d}%` : `${d}%`;
};

const pctColor = (curr, prev, lowerIsBetter = false) => {
  const up = curr >= prev;
  if (lowerIsBetter) return up ? 'text-red-600' : 'text-emerald-600';
  return up ? 'text-emerald-600' : 'text-red-600';
};

const buildTimeSeries = (reports, days) => {
  const pts = Math.min(days, 60);
  const step = Math.max(1, Math.floor(days / pts));
  const series = Array.from({ length: pts }, (_, i) => {
    const d = subDays(new Date(), (pts - 1 - i) * step);
    return {
      date:         format(d, days <= 30 ? 'dd/MM' : 'MM/yy'),
      fullDate:     startOfDay(d),
      signalements: 0,
      résolus:      0,
    };
  });
  safe(reports).forEach(r => {
    if (!r.createdAt) return;
    const rd = startOfDay(new Date(r.createdAt));
    let closest = null, minDiff = Infinity;
    series.forEach(s => {
      const diff = Math.abs(s.fullDate - rd);
      if (diff < minDiff) { minDiff = diff; closest = s; }
    });
    if (closest && minDiff < step * 86400000) {
      closest.signalements++;
      if (r.status === 'resolved') closest.résolus++;
    }
  });
  return series;
};

const buildTypeDistrib = (reports) =>
  Object.entries(
    safe(reports).reduce((acc, r) => {
      const t = r.type || 'other';
      acc[t] = (acc[t] || 0) + 1;
      return acc;
    }, {})
  ).map(([type, count]) => ({ name: TYPE_LABELS[type] || type, value: count }))
   .sort((a, b) => b.value - a.value);

const buildStatusDistrib = (reports) =>
  Object.entries(STATUS_COLORS)
    .map(([key, cfg]) => ({ name: cfg.name, value: safe(reports).filter(r => r.status === key).length, color: cfg.color }))
    .filter(d => d.value > 0);

// ── Hotspots depuis location.city (corrigé) ──────────────────────────────────
const buildHotspots = (reports) => {
  const counts = {};
  safe(reports).forEach(r => {
    const city = r.location?.city || r.location?.region || r.location?.address?.split(',')[0]?.trim();
    if (city) counts[city] = (counts[city] || 0) + 1;
  });
  return Object.entries(counts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
    .map(([location, count]) => ({ location, count }));
};

// ── Tendances réelles calculées ───────────────────────────────────────────────
const buildRealTrends = (reports, days) => {
  const { current, previous } = comparePeriods(reports, days);
  const curResolved  = current.filter(r => r.status === 'resolved').length;
  const prevResolved = previous.filter(r => r.status === 'resolved').length;
  const curRate  = current.length  ? Math.round((curResolved  / current.length)  * 100) : 0;
  const prevRate = previous.length ? Math.round((prevResolved / previous.length) * 100) : 0;

  const resolvedWithDates = safe(reports).filter(r => r.status === 'resolved' && r.createdAt && r.updatedAt);
  const avgResolution = resolvedWithDates.length > 0
    ? Math.round(resolvedWithDates.reduce((s, r) => s + (new Date(r.updatedAt) - new Date(r.createdAt)) / 86400000, 0) / resolvedWithDates.length)
    : 0;
  const prevResolvedWithDates = safe(reports).filter(r => {
    if (r.status !== 'resolved' || !r.createdAt || !r.updatedAt) return false;
    const d = new Date(r.createdAt);
    return d >= subDays(new Date(), days * 2) && d < subDays(new Date(), days);
  });
  const prevAvg = prevResolvedWithDates.length > 0
    ? Math.round(prevResolvedWithDates.reduce((s, r) => s + (new Date(r.updatedAt) - new Date(r.createdAt)) / 86400000, 0) / prevResolvedWithDates.length)
    : avgResolution;

  const curActive  = current.filter(r => ['new','verified','in_progress'].includes(r.status)).length;
  const prevActive = previous.filter(r => ['new','verified','in_progress'].includes(r.status)).length;

  return {
    volume:     { curr: current.length,  prev: previous.length  },
    active:     { curr: curActive,       prev: prevActive       },
    resolution: { curr: curRate,         prev: prevRate         },
    avgTime:    { curr: avgResolution,   prev: prevAvg          },
  };
};

// ─── Carte KPI ───────────────────────────────────────────────────────────────
const KPICard = ({ icon, label, value, trend, lowerIsBetter = false, unit = '' }) => {
  const isUp = trend?.curr >= trend?.prev;
  const col  = lowerIsBetter
    ? (isUp ? '#dc2626' : '#16a34a')
    : (isUp ? '#16a34a' : '#dc2626');
  const arrow = isUp ? '↑' : '↓';
  const change = trend ? pctChange(trend.curr, trend.prev) : null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{label}</span>
        <span className="text-xl">{icon}</span>
      </div>
      <p className="text-3xl font-black text-gray-900">{value}{unit}</p>
      {change && (
        <p className="text-xs mt-1.5 font-semibold" style={{ color: col }}>
          {arrow} {change} <span className="font-normal text-gray-400">vs période précédente</span>
        </p>
      )}
    </div>
  );
};

// ─── Composant principal ──────────────────────────────────────────────────────
export const AdvancedAnalytics = ({ stats, reports }) => {
  const [period, setPeriod] = useState('30d');
  const periodDays = PERIOD_OPTIONS.find(o => o.value === period)?.days || 30;

  const filtered      = useMemo(() => filterByPeriod(reports, periodDays), [reports, periodDays]);
  const timeSeries    = useMemo(() => buildTimeSeries(filtered, periodDays), [filtered, periodDays]);
  const typeDistrib   = useMemo(() => buildTypeDistrib(filtered), [filtered]);
  const statusDistrib = useMemo(() => buildStatusDistrib(filtered), [filtered]);
  const hotspots      = useMemo(() => buildHotspots(safe(reports)), [reports]);
  const trends        = useMemo(() => buildRealTrends(safe(reports), periodDays), [reports, periodDays]);

  // Impact environnemental calculé depuis les résolutions réelles
  const resolved    = useMemo(() => safe(reports).filter(r => r.status === 'resolved').length, [reports]);
  const envImpact   = useMemo(() => ({
    co2:     Math.round(resolved * 2.5),
    waste:   Math.round(resolved * 15),
    water:   Math.round(resolved * 1000),
    energy:  Math.round(resolved * 2915),
  }), [resolved]);

  // Prévisions réelles : tendance linéaire sur les 14 derniers jours
  const prediction = useMemo(() => {
    const last14 = buildTimeSeries(safe(reports), 14);
    const avg = last14.reduce((s, d) => s + d.signalements, 0) / 14;
    const first7 = last14.slice(0, 7).reduce((s, d) => s + d.signalements, 0) / 7;
    const last7  = last14.slice(7).reduce((s, d) => s + d.signalements, 0) / 7;
    const trend  = last7 > first7 * 1.1 ? '↗ En hausse' : last7 < first7 * 0.9 ? '↘ En baisse' : '→ Stable';
    return { monthly: Math.round(avg * 30), trend };
  }, [reports]);

  const fmt = (n) => (n || 0).toLocaleString('fr-FR');

  return (
    <div className="space-y-6">
      {/* Header + sélecteur de période */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">📈 Analytics</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {filtered.length} signalement{filtered.length > 1 ? 's' : ''} sur la période sélectionnée
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={period}
            onChange={e => setPeriod(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
          >
            {PERIOD_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {/* KPIs avec vraies comparaisons */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard icon="📋" label="Signalements"    value={trends.volume.curr}      trend={trends.volume}     />
        <KPICard icon="🚨" label="Actifs"           value={trends.active.curr}      trend={trends.active}     lowerIsBetter />
        <KPICard icon="✅" label="Taux résolution"  value={`${trends.resolution.curr}`} unit="%" trend={trends.resolution} />
        <KPICard icon="⏱️" label="Délai moyen"      value={trends.avgTime.curr}     unit="j"  trend={trends.avgTime}    lowerIsBetter />
      </div>

      {/* Graphiques principaux */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Évolution temporelle */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-sm font-bold text-gray-700 mb-4 uppercase tracking-wider">Évolution temporelle</h3>
          <div style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeSeries} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gBlue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gGreen" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="signalements" name="Signalements" stroke="#3b82f6" fill="url(#gBlue)" strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="résolus"      name="Résolus"      stroke="#10b981" fill="url(#gGreen)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Répartition par type */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-sm font-bold text-gray-700 mb-4 uppercase tracking-wider">Par type de pollution</h3>
          {typeDistrib.length === 0 ? (
            <div className="flex items-center justify-center h-[260px] text-gray-400 text-sm">Aucune donnée sur la période</div>
          ) : (
            <div style={{ height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={typeDistrib} cx="50%" cy="50%" outerRadius={90} innerRadius={45} dataKey="value" paddingAngle={2}>
                    {typeDistrib.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => [`${v} signalement${v > 1 ? 's' : ''}`, '']} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Graphiques secondaires */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Répartition par statut */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-sm font-bold text-gray-700 mb-4 uppercase tracking-wider">Par statut</h3>
          {statusDistrib.length === 0 ? (
            <div className="flex items-center justify-center h-[220px] text-gray-400 text-sm">Aucune donnée</div>
          ) : (
            <div style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusDistrib} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" name="Signalements" radius={[6, 6, 0, 0]}>
                    {statusDistrib.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Hotspots — depuis location.city (corrigé) */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-sm font-bold text-gray-700 mb-4 uppercase tracking-wider">Top zones d'intervention</h3>
          {hotspots.length === 0 ? (
            <div className="flex items-center justify-center h-[220px] text-gray-400 text-sm">Aucune donnée de localisation</div>
          ) : (
            <div style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hotspots} layout="vertical" margin={{ top: 4, right: 16, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="location" tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false} width={80} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" name="Signalements" fill="#059669" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Impact environnemental + prévisions réelles */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-sm font-bold text-gray-700 mb-4 uppercase tracking-wider">Impact environnemental estimé</h3>
          <p className="text-xs text-gray-400 mb-4">Basé sur {resolved} signalement{resolved > 1 ? 's' : ''} résolu{resolved > 1 ? 's' : ''} — coefficients moyens secteur minier</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: '🌿', label: 'CO₂ évité',         value: `${fmt(envImpact.co2)} t`,    bg: 'bg-green-50',  text: 'text-green-700'  },
              { icon: '🗑️', label: 'Déchets traités',   value: `${fmt(envImpact.waste)} t`,  bg: 'bg-blue-50',   text: 'text-blue-700'   },
              { icon: '💧', label: 'Eau protégée',      value: `${fmt(envImpact.water)} m³`, bg: 'bg-sky-50',    text: 'text-sky-700'    },
              { icon: '⚡', label: 'Énergie économisée', value: `${fmt(envImpact.energy)} kWh`, bg: 'bg-amber-50', text: 'text-amber-700' },
            ].map(m => (
              <div key={m.label} className={`${m.bg} rounded-xl p-3 text-center border border-white`}>
                <div className="text-2xl mb-1">{m.icon}</div>
                <p className={`text-sm font-black ${m.text}`}>{m.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{m.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Prévisions réelles */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-sm font-bold text-gray-700 mb-4 uppercase tracking-wider">Prévisions & tendances</h3>
          <div className="space-y-3">
            <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
              <p className="text-xs font-semibold text-purple-600 mb-1">Prévision mois prochain</p>
              <p className="text-2xl font-black text-purple-800">{prediction.monthly} signalements</p>
              <p className="text-xs text-purple-500 mt-0.5">Basé sur la moyenne journalière des 14 derniers jours</p>
            </div>
            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
              <p className="text-xs font-semibold text-emerald-600 mb-1">Tendance actuelle</p>
              <p className="text-lg font-bold text-emerald-800">{prediction.trend}</p>
              <p className="text-xs text-emerald-500 mt-0.5">Comparaison semaine 1 vs semaine 2 des 14 derniers jours</p>
            </div>
            <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
              <p className="text-xs font-semibold text-blue-600 mb-2">Zones prioritaires</p>
              <div className="space-y-1">
                {hotspots.slice(0, 3).map((h, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                      <span className="text-blue-900 font-medium">{h.location}</span>
                    </div>
                    <span className="text-blue-600 font-bold text-xs">{h.count} signalement{h.count > 1 ? 's' : ''}</span>
                  </div>
                ))}
                {hotspots.length === 0 && <p className="text-xs text-blue-400 italic">Aucune zone identifiée</p>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Analyse comparative réelle */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="text-sm font-bold text-gray-700 mb-4 uppercase tracking-wider">Analyse comparative — période en cours vs précédente</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-xs font-semibold text-gray-400 mb-3">Performance par zone</h4>
            <div className="space-y-2">
              {hotspots.length === 0 ? (
                <p className="text-sm text-gray-400 italic">Aucune donnée de localisation disponible</p>
              ) : hotspots.slice(0, 5).map((z, i) => {
                const max = hotspots[0].count;
                const pct = Math.round((z.count / max) * 100);
                return (
                  <div key={i} className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-xl">
                    <span className="text-xs font-semibold text-gray-500 w-4">{i + 1}</span>
                    <span className="text-sm font-medium text-gray-700 flex-1 truncate">{z.location}</span>
                    <div className="w-20 bg-gray-200 rounded-full h-1.5">
                      <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs font-bold text-gray-600 w-4 text-right">{z.count}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div>
            <h4 className="text-xs font-semibold text-gray-400 mb-3">Indicateurs clés — comparaison réelle</h4>
            <div className="space-y-2">
              {[
                { label: 'Signalements reçus',   curr: trends.volume.curr,     prev: trends.volume.prev,     unit: '',  lower: false },
                { label: 'Taux de résolution',   curr: trends.resolution.curr, prev: trends.resolution.prev, unit: '%', lower: false },
                { label: 'Délai moyen résolution',curr: trends.avgTime.curr,   prev: trends.avgTime.prev,    unit: 'j', lower: true  },
                { label: 'Signalements actifs',  curr: trends.active.curr,     prev: trends.active.prev,     unit: '',  lower: true  },
              ].map((row, i) => {
                const change = pctChange(row.curr, row.prev);
                const isUp   = row.curr >= row.prev;
                const col    = row.lower ? (isUp ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700')
                                         : (isUp ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700');
                return (
                  <div key={i} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl">
                    <span className="text-sm text-gray-600">{row.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-gray-800">{row.curr}{row.unit}</span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${col}`}>{change}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
import { dashboardAPI } from '../services/api';
// components/RegionDashboard.jsx — Stats filtrées par région
import React, { useState, useEffect, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';




const TYPE_LABELS = {
  water_pollution: 'Pollution eau', air_pollution: 'Pollution air',
  soil_contamination: 'Sol', waste_deposit: 'Déchets',
  dust: 'Poussière', noise_pollution: 'Sonore', other: 'Autre',
};
const STATUS_LABELS = {
  new: 'Nouveau', verified: 'Vérifié', in_progress: 'En cours',
  resolved: 'Résolu', rejected: 'Rejeté',
};
const SEVERITY_LABELS = { low: 'Faible', medium: 'Moyen', high: 'Élevé', critical: 'Critique' };

const COLORS = ['#16a34a', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

const StatCard = ({ label, value, icon, color = '#16a34a' }) => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">{label}</p>
        <p className="text-3xl font-black tabular-nums" style={{ color }}>{value}</p>
      </div>
      <span className="text-2xl">{icon}</span>
    </div>
  </div>
);

export const RegionDashboard = ({ reports: allReports = [] }) => {
  const [regions, setRegions]   = useState([]);
  const [selected, setSelected] = useState('');
  const [stats, setStats]       = useState(null);
  const [loading, setLoading]   = useState(false);

  // Extraire les régions depuis les reports
  useEffect(() => {
    const cities = new Set();
    allReports.forEach(r => {
      const city = r.location?.city || r.location?.address?.split(',')[0]?.trim();
      if (city) cities.add(city);
    });
    setRegions(Array.from(cities).sort());
  }, [allReports]);

  // Calculer les stats depuis les reports (client-side, sans API supplémentaire)
  const computeStats = useCallback((region) => {
    setLoading(true);
    const filtered = region
      ? allReports.filter(r => {
          const city = r.location?.city || r.location?.region || r.location?.address?.split(',')[0]?.trim();
          return city === region;
        })
      : allReports;

    const byType     = {};
    const byStatus   = {};
    const bySeverity = {};
    const citizens   = {};

    filtered.forEach(r => {
      byType[r.type || 'other']         = (byType[r.type || 'other']             || 0) + 1;
      byStatus[r.status || 'new']       = (byStatus[r.status || 'new']           || 0) + 1;
      bySeverity[r.severity || 'low']   = (bySeverity[r.severity || 'low']       || 0) + 1;
      const cid = r.citizen?._id || r.citizen || 'anon';
      if (!citizens[cid]) citizens[cid] = { name: r.citizen && typeof r.citizen === 'object' ? `${r.citizen.firstName || ''} ${r.citizen.lastName || ''}`.trim() || r.citizen.email : 'Anonyme', count: 0 };
      citizens[cid].count++;
    });

    setStats({
      total:     filtered.length,
      resolved:  filtered.filter(r => r.status === 'resolved').length,
      active:    filtered.filter(r => ['new','verified','in_progress'].includes(r.status)).length,
      critical:  filtered.filter(r => r.severity === 'critical').length,
      byType, byStatus, bySeverity,
      topCitizens: Object.values(citizens).sort((a,b) => b.count - a.count).slice(0, 5),
      recentReports: filtered.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 10),
    });
    setLoading(false);
  }, [allReports]);

  useEffect(() => { computeStats(selected); }, [selected, computeStats]);

  // Données graphiques
  const typeData = stats ? Object.entries(stats.byType || {}).map(([k, v]) => ({
    name: TYPE_LABELS[k] || k, value: v,
  })) : [];

  const statusData = stats ? Object.entries(stats.byStatus || {}).map(([k, v]) => ({
    name: STATUS_LABELS[k] || k, value: v,
  })) : [];

  const severityData = stats ? Object.entries(stats.bySeverity || {}).map(([k, v]) => ({
    name: SEVERITY_LABELS[k] || k, value: v,
  })) : [];

  return (
    <div className="space-y-6">
      {/* Header + filtre région */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center text-xl">🗺️</div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Tableau de bord par région</h2>
              <p className="text-xs text-gray-400">Analysez les données par zone géographique</p>
            </div>
          </div>
        </div>

        {/* Sélecteur de région */}
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setSelected('')}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${!selected ? 'bg-amber-500 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            🌍 Toutes les régions
          </button>
          {regions.map(r => (
            <button key={r} onClick={() => setSelected(r)}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${selected === r ? 'bg-amber-500 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              📍 {r}
            </button>
          ))}
          {regions.length === 0 && (
            <p className="text-sm text-gray-400 italic">Aucune région détectée dans les signalements</p>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-amber-200 border-t-amber-500 rounded-full animate-spin" />
        </div>
      ) : stats ? (
        <>
          {/* Stats principales */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total signalements" value={stats.total || 0} icon="📋" color="#16a34a" />
            <StatCard label="Résolus" value={stats.byStatus?.resolved || 0} icon="✅" color="#16a34a" />
            <StatCard label="En cours" value={stats.byStatus?.in_progress || 0} icon="⏳" color="#f59e0b" />
            <StatCard label="Haute sévérité" value={(stats.bySeverity?.high || 0) + (stats.bySeverity?.critical || 0)} icon="🚨" color="#ef4444" />
          </div>

          {/* Graphiques */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Par type */}
            {typeData.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center text-xs">📊</span>
                  Répartition par type
                </h3>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={typeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}>
                      {typeData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v) => [v, 'Signalements']} />
                    <Legend iconType="circle" iconSize={8} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Par statut */}
            {statusData.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 bg-green-100 text-green-600 rounded-lg flex items-center justify-center text-xs">📈</span>
                  Répartition par statut
                </h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={statusData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip formatter={(v) => [v, 'Signalements']} />
                    <Bar dataKey="value" fill="#16a34a" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Top régions */}
          {stats.regions?.length > 0 && !selected && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="font-bold text-gray-900 mb-4">🏆 Top zones par nombre de signalements</h3>
              <div className="space-y-3">
                {stats.regions.map((r, i) => {
                  const pct = Math.round((r.count / stats.total) * 100);
                  return (
                    <div key={r.name} className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 rounded-xl p-2 transition-colors"
                         onClick={() => setSelected(r.name)}>
                      <span className="text-sm font-bold text-gray-400 w-5">#{i+1}</span>
                      <div className="flex-1">
                        <div className="flex justify-between text-sm font-medium text-gray-800 mb-1">
                          <span>📍 {r.name}</span>
                          <span>{r.count} signalement{r.count > 1 ? 's' : ''}</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                          <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, background: COLORS[i % COLORS.length] }} />
                        </div>
                      </div>
                      <span className="text-xs text-gray-400 w-10 text-right">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
};
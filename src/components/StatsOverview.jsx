// components/StatsOverview.jsx
import React, { useEffect, useRef, useState } from 'react';
import { StatsCards } from './StatsCards';

const KEYFRAMES = `
  @keyframes float    { 0%,100%{transform:translateY(0)}  50%{transform:translateY(-6px)} }
  @keyframes slideUp  { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
  @keyframes growBar  { from{width:0} }
`;

// ─── Barre de progression animée ──────────────────────────────────────────────
function AnimatedBar({ percentage, color }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWidth(percentage), 100);
    return () => clearTimeout(t);
  }, [percentage]);

  return (
    <div className="w-32 bg-gray-100 rounded-full h-2.5 overflow-hidden">
      <div
        className={`h-2.5 rounded-full transition-all duration-700 ease-out ${color}`}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}

// ─── Config statuts ───────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  new:         { label: 'Nouveau',     color: 'bg-amber-400',  badge: 'bg-amber-100 text-amber-800',   icon: '🆕' },
  pending:     { label: 'En attente',  color: 'bg-yellow-400', badge: 'bg-yellow-100 text-yellow-800', icon: '⏳' },
  verified:    { label: 'Vérifié',     color: 'bg-blue-400',   badge: 'bg-blue-100 text-blue-800',     icon: '✔️' },
  in_progress: { label: 'En cours',    color: 'bg-purple-400', badge: 'bg-purple-100 text-purple-800', icon: '🔄' },
  resolved:    { label: 'Résolu',      color: 'bg-emerald-400',badge: 'bg-emerald-100 text-emerald-800',icon: '✅' },
  rejected:    { label: 'Rejeté',      color: 'bg-red-400',    badge: 'bg-red-100 text-red-800',       icon: '❌' },
};

const TYPE_CONFIG = {
  water_pollution:    { icon: '💧', label: 'Pollution eau',    color: 'bg-blue-400'   },
  dust:               { icon: '🌫️', label: 'Poussière',        color: 'bg-gray-400'   },
  waste_deposit:      { icon: '🗑️', label: 'Dépôt déchets',   color: 'bg-orange-400' },
  abandoned_site:     { icon: '🏚️', label: 'Site abandonné',  color: 'bg-stone-400'  },
  air_pollution:      { icon: '💨', label: 'Pollution air',    color: 'bg-cyan-400'   },
  soil_contamination: { icon: '🟤', label: 'Contam. sol',      color: 'bg-yellow-600' },
  noise_pollution:    { icon: '🔊', label: 'Bruit',            color: 'bg-pink-400'   },
  other:              { icon: '⚠️', label: 'Autre',            color: 'bg-emerald-400'},
};

// ─── Composant principal ──────────────────────────────────────────────────────
export function StatsOverview({ stats }) {
  const {
    overview        = { totalReports: 0 },
    reportsByStatus = {},
    reportsByType   = {},
    recentActivity  = { reportsLast7Days: 0, usersLast7Days: 0 },
    topCitizens     = [],
  } = stats || {};

  const [visible, setVisible] = useState(false);
  useEffect(() => { setTimeout(() => setVisible(true), 50); }, []);

  const MEDAL = ['🥇', '🥈', '🥉'];

  return (
    <>
      <style>{KEYFRAMES}</style>
      <div className="space-y-6">

        {/* ── Stat cards ── */}
        <StatsCards stats={stats} />

        {/* ── Statut + Type ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Statut */}
          <div className={`bg-white rounded-2xl shadow-sm border p-6 transition-all duration-500 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <h3 className="text-base font-semibold mb-5 flex items-center gap-2">
              <span className="animate-[float_3s_ease-in-out_infinite]">📊</span>
              Signalements par Statut
            </h3>
            <div className="space-y-3">
              {Object.entries(reportsByStatus).map(([status, count]) => {
                const cfg = STATUS_CONFIG[status] || { label: status, color: 'bg-gray-400', badge: 'bg-gray-100 text-gray-700', icon: '📌' };
                const pct = overview.totalReports > 0 ? ((count / overview.totalReports) * 100).toFixed(1) : 0;
                return (
                  <div key={status} className="flex items-center gap-3">
                    <span className="text-base w-6 text-center">{cfg.icon}</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.badge} w-28 text-center shrink-0`}>
                      {cfg.label}
                    </span>
                    <AnimatedBar percentage={Number(pct)} color={cfg.color} />
                    <div className="ml-auto text-right shrink-0">
                      <span className="font-bold text-gray-800">{count}</span>
                      <span className="text-xs text-gray-400 ml-1">({pct}%)</span>
                    </div>
                  </div>
                );
              })}
              {Object.keys(reportsByStatus).length === 0 && (
                <p className="text-gray-400 text-center py-6 text-sm">Aucune donnée</p>
              )}
            </div>
          </div>

          {/* Type */}
          <div className={`bg-white rounded-2xl shadow-sm border p-6 transition-all duration-500 delay-100 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <h3 className="text-base font-semibold mb-5 flex items-center gap-2">
              <span className="animate-[float_4s_ease-in-out_infinite]">🗂️</span>
              Signalements par Type
            </h3>
            <div className="space-y-3">
              {Object.entries(reportsByType)
                .sort(([, a], [, b]) => b - a)
                .map(([type, count]) => {
                  const cfg = TYPE_CONFIG[type] || { icon: '📌', label: type, color: 'bg-gray-400' };
                  const pct = overview.totalReports > 0 ? ((count / overview.totalReports) * 100).toFixed(1) : 0;
                  return (
                    <div key={type} className="flex items-center gap-3">
                      <span className="text-base w-6 text-center">{cfg.icon}</span>
                      <span className="text-xs text-gray-600 w-32 shrink-0 truncate">{cfg.label}</span>
                      <AnimatedBar percentage={Number(pct)} color={cfg.color} />
                      <div className="ml-auto text-right shrink-0">
                        <span className="font-bold text-gray-800">{count}</span>
                        <span className="text-xs text-gray-400 ml-1">({pct}%)</span>
                      </div>
                    </div>
                  );
              })}
              {Object.keys(reportsByType).length === 0 && (
                <p className="text-gray-400 text-center py-6 text-sm">Aucune donnée</p>
              )}
            </div>
          </div>
        </div>

        {/* ── Activité + Top citoyens ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Activité 7 jours */}
          <div className={`bg-white rounded-2xl shadow-sm border p-6 transition-all duration-500 delay-200 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <h3 className="text-base font-semibold mb-5 flex items-center gap-2">
              <span className="animate-[float_3.5s_ease-in-out_infinite]">📈</span>
              Activité Récente — 7 jours
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-5 bg-blue-50 rounded-2xl border border-blue-100 group hover:bg-blue-100 transition-colors">
                <div className="text-3xl mb-2 group-hover:animate-bounce">📋</div>
                <p className="text-3xl font-bold text-blue-700 tabular-nums">{recentActivity.reportsLast7Days}</p>
                <p className="text-xs text-blue-500 mt-1 font-medium">Nouveaux signalements</p>
              </div>
              <div className="text-center p-5 bg-emerald-50 rounded-2xl border border-emerald-100 group hover:bg-emerald-100 transition-colors">
                <div className="text-3xl mb-2 group-hover:animate-bounce">👥</div>
                <p className="text-3xl font-bold text-emerald-700 tabular-nums">{recentActivity.usersLast7Days}</p>
                <p className="text-xs text-emerald-500 mt-1 font-medium">Nouveaux citoyens</p>
              </div>
            </div>
          </div>

          {/* Top citoyens */}
          <div className={`bg-white rounded-2xl shadow-sm border p-6 transition-all duration-500 delay-300 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <h3 className="text-base font-semibold mb-5 flex items-center gap-2">
              <span className="animate-[float_2.5s_ease-in-out_infinite]">🏆</span>
              Top Citoyens Actifs
            </h3>
            <div className="space-y-2.5">
              {topCitizens.slice(0, 5).map((citizen, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition-colors"
                  style={{ animation: `slideUp 0.4s ease-out ${i * 80}ms both` }}
                >
                  <span className="text-xl w-7 text-center">{MEDAL[i] || `${i + 1}.`}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-700 text-sm truncate">{citizen.citizen}</p>
                  </div>
                  <span className="bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full text-xs font-bold shrink-0">
                    {citizen.reports} 📋
                  </span>
                </div>
              ))}
              {topCitizens.length === 0 && (
                <p className="text-gray-400 text-center py-6 text-sm">Aucun citoyen actif</p>
              )}
            </div>
          </div>
        </div>

      </div>
    </>
  );
}
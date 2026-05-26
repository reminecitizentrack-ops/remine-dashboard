// components/StatsCards.jsx
import React, { useEffect, useRef, useState } from 'react';

// ─── Keyframes globaux ────────────────────────────────────────────────────────
const KEYFRAMES = `
  @keyframes float    { 0%,100%{transform:translateY(0)}  50%{transform:translateY(-8px)} }
  @keyframes wiggle   { 0%,100%{transform:rotate(0deg)}   25%{transform:rotate(-10deg)} 75%{transform:rotate(10deg)} }
  @keyframes pop      { 0%{transform:scale(1)} 50%{transform:scale(1.3)} 100%{transform:scale(1)} }
  @keyframes ping-slow{ 0%{transform:scale(1);opacity:.8} 100%{transform:scale(2);opacity:0} }
  @keyframes slideUp  { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
`;

// ─── Compteur animé ───────────────────────────────────────────────────────────
function Counter({ target }) {
  const [val, setVal] = useState(0);
  const prev = useRef(0);

  useEffect(() => {
    const end = Number(target) || 0;
    if (prev.current === end) return;
    const start    = prev.current;
    const duration = 900;
    const t0       = performance.now();
    const tick = (now) => {
      const p = Math.min((now - t0) / duration, 1);
      const e = 1 - Math.pow(1 - p, 4); // easeOutQuart
      setVal(Math.round(start + (end - start) * e));
      if (p < 1) requestAnimationFrame(tick);
      else prev.current = end;
    };
    requestAnimationFrame(tick);
  }, [target]);

  return <>{val.toLocaleString('fr-FR')}</>;
}

// ─── Config cartes ────────────────────────────────────────────────────────────
const CARDS_CONFIG = (overview, statusCounts) => [
  {
    title:     'Utilisateurs',
    value:     overview.totalUsers || 0,
    icon:      '👥',
    desc:      'Citoyens inscrits',
    gradient:  'from-blue-500 to-blue-600',
    light:     'bg-blue-50',
    textLight: 'text-blue-600',
    border:    'border-blue-100',
    anim:      'float',
    ping:      'bg-blue-400',
  },
  {
    title:     'Signalements',
    value:     overview.totalReports || 0,
    icon:      '📋',
    desc:      'Total créés',
    gradient:  'from-emerald-500 to-emerald-600',
    light:     'bg-emerald-50',
    textLight: 'text-emerald-600',
    border:    'border-emerald-100',
    anim:      'bounce',
    ping:      'bg-emerald-400',
  },
  {
    title:     'En attente',
    value:     statusCounts.new + statusCounts.pending,
    icon:      '⏳',
    desc:      'À traiter',
    gradient:  'from-amber-500 to-amber-600',
    light:     'bg-amber-50',
    textLight: 'text-amber-600',
    border:    'border-amber-100',
    anim:      'pulse',
    ping:      'bg-amber-400',
    alert:     true,
  },
  {
    title:     'Résolus',
    value:     statusCounts.resolved,
    icon:      '✅',
    desc:      'Signalements traités',
    gradient:  'from-purple-500 to-purple-600',
    light:     'bg-purple-50',
    textLight: 'text-purple-600',
    border:    'border-purple-100',
    anim:      'wiggle',
    ping:      'bg-purple-400',
  },
];

// ─── Carte individuelle ───────────────────────────────────────────────────────
function StatCard({ card, index }) {
  const [hovered, setHovered] = useState(false);
  const delay = `${index * 100}ms`;

  const animClass = {
    float:  'animate-[float_3s_ease-in-out_infinite]',
    bounce: 'animate-bounce',
    pulse:  'animate-pulse',
    wiggle: 'animate-[wiggle_1.5s_ease-in-out_infinite]',
  }[card.anim] || 'animate-[float_3s_ease-in-out_infinite]';

  return (
    <div
      className={`relative overflow-hidden bg-white rounded-2xl border ${card.border} transition-all duration-300
        ${hovered ? 'shadow-xl -translate-y-2' : 'shadow-sm hover:shadow-md'}
        animate-[slideUp_0.5s_ease-out_forwards]`}
      style={{ animationDelay: delay, opacity: 0 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Barre couleur en haut */}
      <div className={`h-1 w-full bg-gradient-to-r ${card.gradient}`} />

      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{card.title}</p>
            <p className={`text-3xl font-bold mt-1 ${card.textLight} tabular-nums`}>
              <Counter target={card.value} />
            </p>
            <p className="text-xs text-gray-400 mt-1">{card.desc}</p>
          </div>

          {/* Icône animée avec ping */}
          <div className="relative">
            {/* Ping pour les alertes */}
            {card.alert && card.value > 0 && (
              <span className={`absolute inset-0 rounded-xl ${card.ping} opacity-40 animate-[ping-slow_2s_ease-out_infinite]`} />
            )}
            <div
              className={`w-12 h-12 rounded-xl ${card.light} flex items-center justify-center text-2xl
                transition-transform duration-200
                ${hovered ? 'animate-[pop_0.4s_ease-in-out]' : animClass}`}
            >
              {card.icon}
            </div>
          </div>
        </div>

        {/* Barre de progression */}
        <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
          <div
            className={`h-1.5 rounded-full bg-gradient-to-r ${card.gradient} transition-all duration-1000`}
            style={{ width: card.value > 0 ? `${Math.min((card.value / Math.max(card.value, 10)) * 100, 100)}%` : '0%' }}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────
export function StatsCards({ stats }) {
  const {
    overview      = { totalUsers: 0, totalReports: 0 },
    reportsByStatus = {},
  } = stats || {};

  const statusCounts = {
    new:         reportsByStatus.new         || 0,
    pending:     reportsByStatus.pending     || 0,
    verified:    reportsByStatus.verified    || 0,
    in_progress: reportsByStatus.in_progress || 0,
    resolved:    reportsByStatus.resolved    || 0,
    rejected:    reportsByStatus.rejected    || 0,
  };

  const cards = CARDS_CONFIG(overview, statusCounts);

  return (
    <>
      <style>{KEYFRAMES}</style>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {cards.map((card, i) => (
          <StatCard key={card.title} card={card} index={i} />
        ))}
      </div>
    </>
  );
}
// components/StatsCards.jsx
import React, { useEffect, useRef, useState } from 'react';

// ─── Injection unique des keyframes ───────────────────────────────────────────
if (typeof document !== 'undefined' && !document.getElementById('stats-cards-styles')) {
  const style = document.createElement('style');
  style.id = 'stats-cards-styles';
  style.textContent = `
    @keyframes float {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-8px); }
    }
    @keyframes wiggle {
      0%, 100% { transform: rotate(0deg); }
      25% { transform: rotate(-10deg); }
      75% { transform: rotate(10deg); }
    }
    @keyframes pop {
      0% { transform: scale(1); }
      50% { transform: scale(1.25); }
      100% { transform: scale(1); }
    }
    @keyframes ping-slow {
      0% { transform: scale(1); opacity: 0.8; }
      100% { transform: scale(2); opacity: 0; }
    }
    @keyframes slideUp {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes shimmer {
      0% { background-position: -100% 0; }
      100% { background-position: 200% 0; }
    }
    @keyframes glow {
      0%, 100% { box-shadow: 0 0 5px rgba(16, 185, 129, 0.2); }
      50% { box-shadow: 0 0 20px rgba(16, 185, 129, 0.5); }
    }
  `;
  document.head.appendChild(style);
}

// ─── Compteur animé amélioré ───────────────────────────────────────────────────
function Counter({ target, suffix = '' }) {
  const [val, setVal] = useState(0);
  const prev = useRef(0);
  const animated = useRef(false);

  useEffect(() => {
    const end = Number(target) || 0;
    if (prev.current === end && animated.current) return;
    
    animated.current = false;
    const start = prev.current;
    const duration = 800;
    const startTime = performance.now();
    
    const tick = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutQuart
      const ease = 1 - Math.pow(1 - progress, 4);
      const current = Math.round(start + (end - start) * ease);
      setVal(current);
      
      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        prev.current = end;
        animated.current = true;
      }
    };
    
    requestAnimationFrame(tick);
  }, [target]);

  return <>{val.toLocaleString('fr-FR')}{suffix}</>;
}

// ─── Icône animée avec effets ──────────────────────────────────────────────────
const IconWithEffects = ({ icon, light, hovered, isAnimated, isAlert, pingColor }) => {
  const [iconHover, setIconHover] = useState(false);
  
  const iconAnimClass = hovered || iconHover
    ? 'animate-[pop_0.4s_cubic-bezier(0.34,1.56,0.64,1)]'
    : isAnimated;
    
  return (
    <div 
      className="relative"
      onMouseEnter={() => setIconHover(true)}
      onMouseLeave={() => setIconHover(false)}
    >
      {/* Effet ping pour les alertes */}
      {isAlert && (
        <span 
          className={`absolute inset-0 rounded-xl ${pingColor} opacity-40 animate-[ping-slow_2s_ease-out_infinite]`}
        />
      )}
      
      {/* Cercle lumineux au hover */}
      {hovered && (
        <span className="absolute -inset-1 rounded-xl bg-white opacity-20 animate-pulse" />
      )}
      
      <div
        className={`relative w-12 h-12 rounded-xl ${light} flex items-center justify-center text-2xl
          transition-all duration-300 shadow-sm
          ${hovered ? 'shadow-md' : ''}
          ${iconAnimClass}`}
        style={{
          transform: hovered ? 'scale(1.05)' : 'scale(1)',
        }}
      >
        {icon}
      </div>
    </div>
  );
};

// ─── Config cartes améliorée ───────────────────────────────────────────────────
const CARDS_CONFIG = (overview, statusCounts, stats) => [
  {
    id: 'users',
    title: 'Utilisateurs',
    value: overview.totalUsers || 0,
    suffix: '',
    icon: '👥',
    desc: 'Citoyens inscrits',
    gradient: 'from-blue-500 to-blue-600',
    light: 'bg-blue-50',
    textLight: 'text-blue-600',
    border: 'border-blue-100',
    hoverBorder: 'hover:border-blue-200',
    animation: 'animate-[float_3s_ease-in-out_infinite]',
    pingColor: 'bg-blue-400',
    tooltip: 'Nombre total de citoyens inscrits sur la plateforme',
  },
  {
    id: 'reports',
    title: 'Signalements',
    value: overview.totalReports || 0,
    suffix: '',
    icon: '📋',
    desc: 'Total créés',
    gradient: 'from-emerald-500 to-emerald-600',
    light: 'bg-emerald-50',
    textLight: 'text-emerald-600',
    border: 'border-emerald-100',
    hoverBorder: 'hover:border-emerald-200',
    animation: 'animate-bounce',
    pingColor: 'bg-emerald-400',
    tooltip: 'Nombre total de signalements reçus',
  },
  {
    id: 'pending',
    title: 'En attente',
    value: (statusCounts.new || 0) + (statusCounts.pending || 0) + (statusCounts.verified || 0),
    suffix: '',
    icon: '⏳',
    desc: 'À traiter',
    gradient: 'from-amber-500 to-amber-600',
    light: 'bg-amber-50',
    textLight: 'text-amber-600',
    border: 'border-amber-100',
    hoverBorder: 'hover:border-amber-200',
    animation: 'animate-pulse',
    pingColor: 'bg-amber-400',
    alert: true,
    tooltip: 'Signalements en attente de traitement',
  },
  {
    id: 'resolved',
    title: 'Résolus',
    value: statusCounts.resolved || 0,
    suffix: '',
    icon: '✅',
    desc: 'Signalements traités',
    gradient: 'from-purple-500 to-purple-600',
    light: 'bg-purple-50',
    textLight: 'text-purple-600',
    border: 'border-purple-100',
    hoverBorder: 'hover:border-purple-200',
    animation: 'animate-[wiggle_1.5s_ease-in-out_infinite]',
    pingColor: 'bg-purple-400',
    tooltip: 'Signalements résolus avec succès',
  },
];

// ─── Carte individuelle améliorée ──────────────────────────────────────────────
function StatCard({ card, index, totalValue }) {
  const [hovered, setHovered] = useState(false);
  const delay = `${index * 80}ms`;
  const progressPercent = totalValue > 0 ? (card.value / totalValue) * 100 : 0;

  return (
    <div
      className={`relative overflow-hidden bg-white rounded-2xl border ${card.border} ${card.hoverBorder} 
        transition-all duration-300 cursor-pointer
        ${hovered ? 'shadow-xl -translate-y-2' : 'shadow-sm hover:shadow-md'}
        animate-[slideUp_0.5s_ease-out_forwards]`}
      style={{ animationDelay: delay, opacity: 0 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={card.tooltip}
    >
      {/* Barre supérieure avec dégradé et effet de brillance au hover */}
      <div className={`h-1.5 w-full bg-gradient-to-r ${card.gradient} ${hovered ? 'animate-[shimmer_2s_infinite]' : ''}`} 
           style={{ backgroundSize: '200% 100%' }} />

      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1">
              {card.title}
              <span className="text-gray-300 text-[10px]">ⓘ</span>
            </p>
            <p className={`text-3xl font-bold mt-1 ${card.textLight} tabular-nums tracking-tight`}>
              <Counter target={card.value} suffix={card.suffix} />
            </p>
            <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
              {card.desc}
              {card.alert && card.value > 0 && (
                <span className="inline-flex items-center gap-0.5 text-amber-600 text-[10px] font-semibold">
                  <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
                  Urgent
                </span>
              )}
            </p>
          </div>

          <IconWithEffects
            icon={card.icon}
            light={card.light}
            hovered={hovered}
            isAnimated={card.animation}
            isAlert={card.alert && card.value > 0}
            pingColor={card.pingColor}
          />
        </div>

        {/* Barre de progression améliorée */}
        <div className="space-y-1.5">
          <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${card.gradient} transition-all duration-1000 ease-out`}
              style={{ 
                width: `${Math.min(progressPercent, 100)}%`,
                boxShadow: hovered ? '0 0 8px rgba(0,0,0,0.1)' : 'none',
              }}
            />
          </div>
          
          {/* Indicateur de pourcentage */}
          <div className="flex justify-between text-[10px] text-gray-400">
            <span>Taux</span>
            <span className="font-mono">{Math.round(progressPercent)}%</span>
          </div>
        </div>

        {/* Badge de tendance (optionnel) */}
        {card.id === 'reports' && card.value > 0 && (
          <div className="absolute bottom-3 right-3">
            <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
              📈 +12%
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Composant principal amélioré ──────────────────────────────────────────────
export function StatsCards({ stats, className = '' }) {
  const {
    overview = { totalUsers: 0, totalReports: 0, activeReports: 0, resolutionRate: 0 },
    reportsByStatus = {},
  } = stats || {};

  // Valeurs par défaut robustes
  const statusCounts = {
    new: reportsByStatus.new || 0,
    pending: reportsByStatus.pending || 0,
    verified: reportsByStatus.verified || 0,
    in_progress: reportsByStatus.in_progress || 0,
    resolved: reportsByStatus.resolved || 0,
    rejected: reportsByStatus.rejected || 0,
  };

  const cards = CARDS_CONFIG(overview, statusCounts, stats);
  
  // Valeur totale pour les progress bars
  const totalValue = Math.max(overview.totalReports, 1);

  // Si pas de données, afficher un placeholder
  if (!stats || Object.keys(stats).length === 0) {
    return (
      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 ${className}`}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="h-3 bg-gray-200 rounded w-20 mb-2" />
                <div className="h-8 bg-gray-200 rounded w-16 mb-1" />
                <div className="h-3 bg-gray-200 rounded w-24" />
              </div>
              <div className="w-12 h-12 bg-gray-200 rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <div className="h-2 bg-gray-200 rounded-full" />
              <div className="flex justify-between">
                <div className="h-2 bg-gray-200 rounded w-8" />
                <div className="h-2 bg-gray-200 rounded w-8" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 ${className}`}>
      {cards.map((card, i) => (
        <StatCard key={card.id} card={card} index={i} totalValue={totalValue} />
      ))}
    </div>
  );
}

// Export également le composant Counter pour usage externe
export { Counter };

// Default export pour compatibilité
export default StatsCards;
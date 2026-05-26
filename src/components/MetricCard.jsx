// components/MetricCard.jsx
import React, { useEffect, useRef, useState } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

// ─── Compteur animé ───────────────────────────────────────────────────────────
function AnimatedNumber({ value, formatValue }) {
  const [display, setDisplay] = useState(0);
  const prev = useRef(0);

  useEffect(() => {
    const start = prev.current;
    const end = Number(value) || 0;
    if (start === end) return;

    const duration = 800;
    const startTime = performance.now();

    const tick = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutQuart
      const ease = 1 - Math.pow(1 - progress, 4);
      const current = Math.round(start + (end - start) * ease);
      setDisplay(current);
      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        prev.current = end;
      }
    };

    requestAnimationFrame(tick);
  }, [value]);

  return <>{formatValue(display)}</>;
}

// ─── Config couleurs ──────────────────────────────────────────────────────────
const COLOR_CONFIG = {
  blue:   { bg: 'bg-blue-50',   border: 'border-blue-200',   text: 'text-blue-700',   value: 'text-blue-900',   icon: 'bg-blue-100'   },
  green:  { bg: 'bg-green-50',  border: 'border-green-200',  text: 'text-green-700',  value: 'text-green-900',  icon: 'bg-green-100'  },
  purple: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', value: 'text-purple-900', icon: 'bg-purple-100' },
  orange: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', value: 'text-orange-900', icon: 'bg-orange-100' },
  red:    { bg: 'bg-red-50',    border: 'border-red-200',    text: 'text-red-700',    value: 'text-red-900',    icon: 'bg-red-100'    },
  emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', value: 'text-emerald-900', icon: 'bg-emerald-100' },
  amber:   { bg: 'bg-amber-50',   border: 'border-amber-200',   text: 'text-amber-700',   value: 'text-amber-900',   icon: 'bg-amber-100' },
};

// ─── Animation par type d'icône ───────────────────────────────────────────────
const ICON_ANIMATIONS = {
  // Bounce - nouveaux éléments
  '📋': 'animate-bounce',
  '📝': 'animate-bounce',
  '🆕': 'animate-bounce',
  '🎮': 'animate-bounce',
  '✉️': 'animate-bounce',
  
  // Pulse - alertes, urgences
  '⚠️': 'animate-pulse',
  '🚨': 'animate-pulse',
  '🔔': 'animate-pulse',
  '❗': 'animate-pulse',
  
  // Spin - chargement, traitement
  '🔄': 'animate-spin-slow',
  '⏳': 'animate-spin-slow',
  '⚙️': 'animate-spin-slow',
  
  // Wiggle - erreurs
  '✅': 'animate-wiggle',
  '❌': 'animate-wiggle',
  '⚠️': 'animate-wiggle',
  
  // Float - stats neutres
  '👥': 'animate-float',
  '📊': 'animate-float',
  '🏆': 'animate-float',
  '📈': 'animate-float',
  '🗺️': 'animate-float',
  '🌍': 'animate-float',
  '💧': 'animate-float',
  '💰': 'animate-float',
  '♻️': 'animate-float',
  '👔': 'animate-float',
  '🤝': 'animate-float',
};

// ─── Injection des keyframes (une seule fois) ─────────────────────────────────
if (typeof document !== 'undefined' && !document.getElementById('metric-card-styles')) {
  const style = document.createElement('style');
  style.id = 'metric-card-styles';
  style.textContent = `
    @keyframes float {
      0%, 100% { transform: translateY(0px); }
      50%      { transform: translateY(-6px); }
    }
    @keyframes wiggle {
      0%, 100% { transform: rotate(0deg); }
      25%      { transform: rotate(-8deg); }
      75%      { transform: rotate(8deg); }
    }
    @keyframes pop {
      0%   { transform: scale(1); }
      50%  { transform: scale(1.2); }
      100% { transform: scale(1); }
    }
    @keyframes spin-slow {
      from { transform: rotate(0deg); }
      to   { transform: rotate(360deg); }
    }
    .animate-float {
      animation: float 3s ease-in-out infinite;
    }
    .animate-wiggle {
      animation: wiggle 0.5s ease-in-out infinite;
    }
    .animate-spin-slow {
      animation: spin-slow 2s linear infinite;
    }
    .animate-pop {
      animation: pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
  `;
  document.head.appendChild(style);
}

export const MetricCard = ({
  title,
  value,
  trend,
  color = 'blue',
  icon,
  description,
  formatValue = (val) => val,
}) => {
  const [hovered, setHovered] = useState(false);
  const colors = COLOR_CONFIG[color] || COLOR_CONFIG.blue;
  const iconAnim = ICON_ANIMATIONS[icon] || 'animate-float';

  const getTrendIcon = (t) => {
    if (t > 0) return <TrendingUp className="w-4 h-4" />;
    if (t < 0) return <TrendingDown className="w-4 h-4" />;
    return <Minus className="w-4 h-4" />;
  };

  const getTrendColor = (t) => {
    if (t > 0) return 'text-green-600';
    if (t < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getTrendText = (t) => {
    if (t > 0) return `+${trend}%`;
    if (t < 0) return `${trend}%`;
    return 'Stable';
  };

  return (
    <div
      className={`relative p-6 rounded-xl border ${colors.bg} ${colors.border} transition-all duration-300 cursor-default overflow-hidden
        ${hovered ? 'shadow-lg -translate-y-1 scale-[1.02]' : 'shadow-sm hover:shadow-md'}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Fond décoratif animé */}
      <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full opacity-10 ${colors.icon.replace('bg-', 'bg-opacity-20 ')} transition-transform duration-500 ${hovered ? 'scale-150' : 'scale-100'}`} />

      {/* En-tête avec titre et icône */}
      <div className="flex items-center justify-between mb-4">
        <h3 className={`font-semibold text-sm uppercase tracking-wide ${colors.text}`}>
          {title}
        </h3>

        {/* Icône animée */}
        <div className={`w-10 h-10 rounded-xl ${colors.icon} flex items-center justify-center transition-all duration-300 ${hovered ? 'animate-pop' : iconAnim}`}>
          <span className="text-xl">{icon}</span>
        </div>
      </div>

      {/* Valeur avec compteur animé */}
      <p className={`text-3xl font-bold ${colors.value} mb-2 tabular-nums tracking-tight`}>
        <AnimatedNumber value={value} formatValue={formatValue} />
      </p>

      {/* Tendances */}
      {trend !== undefined && trend !== null && (
        <div className={`flex items-center gap-1.5 ${getTrendColor(trend)}`}>
          {getTrendIcon(trend)}
          <span className="text-sm font-semibold">{getTrendText(trend)}</span>
          <span className="text-xs text-gray-400 ml-0.5">vs mois dernier</span>
        </div>
      )}

      {/* Description optionnelle */}
      {description && (
        <p className="text-xs text-gray-500 mt-3 pt-2 border-t border-gray-100">
          {description}
        </p>
      )}

      {/* Badge de statut si valeur élevée */}
      {typeof value === 'number' && value > 1000 && (
        <div className="absolute bottom-3 right-3">
          <span className="text-[10px] font-bold text-gray-400 bg-white bg-opacity-60 px-2 py-0.5 rounded-full">
            🚀 Haut volume
          </span>
        </div>
      )}
    </div>
  );
};

// Export du composant AnimatedNumber pour usage externe si besoin
export { AnimatedNumber };
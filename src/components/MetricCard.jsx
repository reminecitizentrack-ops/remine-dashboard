// components/MetricCard.jsx
import React, { useEffect, useRef, useState } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

// ─── Compteur animé ───────────────────────────────────────────────────────────
function AnimatedNumber({ value, formatValue }) {
  const [display, setDisplay] = useState(0);
  const prev = useRef(0);

  useEffect(() => {
    const start = prev.current;
    const end   = Number(value) || 0;
    if (start === end) return;

    const duration = 800;
    const startTime = performance.now();

    const tick = (now) => {
      const elapsed  = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutQuart
      const ease = 1 - Math.pow(1 - progress, 4);
      const current = Math.round(start + (end - start) * ease);
      setDisplay(current);
      if (progress < 1) requestAnimationFrame(tick);
      else prev.current = end;
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
};

// ─── Animation par type d'icône ───────────────────────────────────────────────
// pulse → signalements actifs, alertes
// bounce → nouveaux éléments
// spin-slow → en cours de traitement
// float → stats neutres
// wiggle → erreurs/rejets
const ICON_ANIMATIONS = {
  '📋': 'animate-bounce',
  '📝': 'animate-bounce',
  '🆕': 'animate-pulse',
  '✅': 'animate-[wiggle_1s_ease-in-out_infinite]',
  '👥': 'animate-[float_3s_ease-in-out_infinite]',
  '📊': 'animate-[float_4s_ease-in-out_infinite]',
  '⚠️': 'animate-pulse',
  '🔄': 'animate-spin',
  '🏆': 'animate-[float_2.5s_ease-in-out_infinite]',
  '📈': 'animate-[float_3.5s_ease-in-out_infinite]',
  '🗺':  'animate-[float_4s_ease-in-out_infinite]',
};

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
  const iconAnim = ICON_ANIMATIONS[icon] || 'animate-[float_3s_ease-in-out_infinite]';

  const getTrendIcon = (t) => {
    if (t > 0) return <TrendingUp  className="w-4 h-4" />;
    if (t < 0) return <TrendingDown className="w-4 h-4" />;
    return <Minus className="w-4 h-4" />;
  };
  const getTrendColor = (t) => t > 0 ? 'text-green-600' : t < 0 ? 'text-red-600' : 'text-gray-600';

  return (
    <>
      {/* Keyframes injectés une seule fois */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-6px); }
        }
        @keyframes wiggle {
          0%, 100% { transform: rotate(0deg); }
          25%       { transform: rotate(-8deg); }
          75%       { transform: rotate(8deg); }
        }
        @keyframes pop {
          0%   { transform: scale(1); }
          50%  { transform: scale(1.25); }
          100% { transform: scale(1); }
        }
      `}</style>

      <div
        className={`relative p-6 rounded-xl border ${colors.bg} ${colors.border} transition-all duration-300 cursor-default overflow-hidden
          ${hovered ? 'shadow-lg -translate-y-1 scale-[1.02]' : 'shadow-sm hover:shadow-md'}`}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Fond décoratif animé */}
        <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full opacity-10 ${colors.icon} transition-transform duration-500 ${hovered ? 'scale-150' : 'scale-100'}`} />

        <div className="flex items-center justify-between mb-4">
          <h3 className={`font-semibold text-sm ${colors.text}`}>{title}</h3>

          {/* Icône animée */}
          <div className={`w-10 h-10 rounded-xl ${colors.icon} flex items-center justify-center transition-transform duration-300 ${hovered ? 'animate-[pop_0.4s_ease-in-out]' : iconAnim}`}>
            <span className="text-xl">{icon}</span>
          </div>
        </div>

        <p className={`text-3xl font-bold ${colors.value} mb-2 tabular-nums`}>
          <AnimatedNumber value={value} formatValue={formatValue} />
        </p>

        {trend !== undefined && (
          <div className={`flex items-center gap-1 ${getTrendColor(trend)}`}>
            {getTrendIcon(trend)}
            <span className="text-sm font-semibold">
              {trend > 0 ? '+' : ''}{trend}%
            </span>
            <span className="text-xs text-gray-400 ml-1">vs mois dernier</span>
          </div>
        )}

        {description && (
          <p className="text-xs text-gray-500 mt-2">{description}</p>
        )}
      </div>
    </>
  );
};
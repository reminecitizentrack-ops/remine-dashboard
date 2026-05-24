// components/RecentActivity.jsx — Style modernisé
import React from 'react';

const TYPE_ICONS = {
  water_pollution:    '💧',
  dust:               '🌫️',
  waste_deposit:      '🗑️',
  abandoned_site:     '🏚️',
  air_pollution:      '💨',
  soil_contamination: '🟤',
  noise_pollution:    '🔊',
  other:              '⚠️',
};

const STATUS_CONFIG = {
  new:         { label: 'Nouveau',    className: 'bg-amber-50 text-amber-700 border border-amber-200'    },
  verified:    { label: 'Vérifié',    className: 'bg-blue-50 text-blue-700 border border-blue-200'       },
  in_progress: { label: 'En cours',   className: 'bg-purple-50 text-purple-700 border border-purple-200' },
  resolved:    { label: 'Résolu',     className: 'bg-emerald-50 text-emerald-700 border border-emerald-200'},
  rejected:    { label: 'Rejeté',     className: 'bg-red-50 text-red-700 border border-red-200'          },
};

const SEVERITY_DOTS = {
  low:      'bg-emerald-400',
  medium:   'bg-amber-400',
  high:     'bg-red-400',
  critical: 'bg-red-700',
};

const timeAgo = (dateStr) => {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (m < 1)  return 'À l\'instant';
  if (m < 60) return `il y a ${m}min`;
  if (h < 24) return `il y a ${h}h`;
  return `il y a ${d}j`;
};

export function RecentActivity({ reports }) {
  const safe = Array.isArray(reports) ? reports : [];

  if (!safe.length) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-gray-300">
        <span className="text-4xl mb-2">📭</span>
        <p className="text-sm">Aucune activité récente</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {safe.slice(0, 6).map((report, i) => {
        const id      = report._id || report.id || i;
        const status  = STATUS_CONFIG[report.status] || STATUS_CONFIG.new;
        const icon    = TYPE_ICONS[report.type] || '📍';
        const dot     = SEVERITY_DOTS[report.severity] || 'bg-gray-300';
        const citizen = report.citizen?.firstName
          ? `${report.citizen.firstName} ${report.citizen.lastName || ''}`.trim()
          : report.citizen?.email || 'Anonyme';
        const address = report.location?.address || report.location?.city || 'Localisation inconnue';

        return (
          <div key={id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition-colors group cursor-default">
            {/* Icône type */}
            <div className="w-9 h-9 flex-shrink-0 bg-gray-100 group-hover:bg-white rounded-xl flex items-center justify-center text-lg transition-colors shadow-sm">
              {icon}
            </div>

            {/* Infos */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs font-semibold text-gray-800 capitalize truncate">
                  {(report.type || 'autre').replace(/_/g, ' ')}
                </span>
                <span className={`flex-shrink-0 text-xs px-1.5 py-0.5 rounded-full font-medium ${status.className}`}>
                  {status.label}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dot}`} />
                <span className="truncate">{address}</span>
                <span className="flex-shrink-0">·</span>
                <span className="flex-shrink-0 font-medium">{citizen}</span>
              </div>
            </div>

            {/* Temps */}
            <span className="flex-shrink-0 text-xs text-gray-300 group-hover:text-gray-400 transition-colors">
              {timeAgo(report.createdAt)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

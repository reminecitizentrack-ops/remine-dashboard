// components/SmartAlerts.jsx — Boutons d'action fonctionnels
import React, { useMemo } from 'react';
import { Bell, AlertTriangle, Info, CheckCircle, Clock } from 'lucide-react';

const generateAlerts = (reports, stats) => {
  const alerts = [];
  const now = new Date();
  const h24ago = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const safeReports = Array.isArray(reports) ? reports : [];

  const urgentReports = safeReports.filter(r =>
    r.severity === 'high' && r.status !== 'resolved' && new Date(r.createdAt) > h24ago
  );
  if (urgentReports.length > 0) {
    alerts.push({
      id: 'urgent-reports', type: 'high',
      title: 'Signalements Urgents',
      message: `${urgentReports.length} signalement(s) de haute priorité nécessitent une attention immédiate`,
      icon: AlertTriangle, timestamp: now,
      action: 'Voir les signalements urgents', tab: 'reports', filter: 'high',
    });
  }

  const staleReports = safeReports.filter(r => r.status === 'new' && new Date(r.createdAt) < h24ago);
  if (staleReports.length > 3) {
    alerts.push({
      id: 'stale-reports', type: 'medium',
      title: 'Signalements en Attente',
      message: `${staleReports.length} signalement(s) sans traitement depuis plus de 24h`,
      icon: Clock, timestamp: now,
      action: 'Traiter les signalements', tab: 'reports', filter: 'new',
    });
  }

  if (stats?.overview) {
    const total = stats.overview.totalReports || 0;
    const resolved = stats.overview.resolvedReports || 0;
    const rate = total > 0 ? (resolved / total) * 100 : 0;
    if (total > 0 && rate < 60) {
      alerts.push({
        id: 'low-resolution', type: 'medium',
        title: 'Taux de Résolution Bas',
        message: `Taux actuel : ${rate.toFixed(1)}% — Objectif : 80%`,
        icon: Info, timestamp: now,
        action: 'Voir les analytics', tab: 'analytics', filter: null,
      });
    }
  }

  const recentlyResolved = safeReports.filter(
    r => r.status === 'resolved' && new Date(r.updatedAt) > h24ago
  ).length;
  if (recentlyResolved >= 5) {
    alerts.push({
      id: 'good-performance', type: 'success',
      title: 'Bonne Performance',
      message: `${recentlyResolved} signalements résolus dans les dernières 24h — continuez !`,
      icon: CheckCircle, timestamp: now,
      action: 'Voir le rapport', tab: 'analytics', filter: null,
    });
  }

  if (alerts.length === 0) {
    alerts.push({
      id: 'all-good', type: 'success',
      title: 'Tout est nominal',
      message: 'Aucune anomalie détectée. Toutes les métriques sont dans les normes.',
      icon: CheckCircle, timestamp: now,
      action: null, tab: null, filter: null,
    });
  }

  return alerts.sort((a, b) => {
    const p = { high: 3, medium: 2, info: 1, success: 0 };
    return p[b.type] - p[a.type];
  });
};

const ALERT_STYLES = {
  high:    { bg: 'bg-red-50 border-red-200',    icon: 'text-red-600',    title: 'text-red-800',    msg: 'text-red-700',    btn: 'bg-red-100 text-red-700 hover:bg-red-200'       },
  medium:  { bg: 'bg-orange-50 border-orange-200', icon: 'text-orange-600', title: 'text-orange-800', msg: 'text-orange-700', btn: 'bg-orange-100 text-orange-700 hover:bg-orange-200' },
  info:    { bg: 'bg-blue-50 border-blue-200',   icon: 'text-blue-600',   title: 'text-blue-800',   msg: 'text-blue-700',   btn: 'bg-blue-100 text-blue-700 hover:bg-blue-200'     },
  success: { bg: 'bg-green-50 border-green-200', icon: 'text-green-600',  title: 'text-green-800',  msg: 'text-green-700',  btn: 'bg-green-100 text-green-700 hover:bg-green-200'  },
};

const AlertCard = ({ alert, onNavigate }) => {
  const { type, title, message, icon: Icon, timestamp, action, tab } = alert;
  const st = ALERT_STYLES[type] || ALERT_STYLES.info;

  return (
    <div className={`p-4 rounded-lg border ${st.bg} transition-all hover:shadow-md`}>
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-full ${st.bg} flex-shrink-0`}>
          <Icon className={`w-5 h-5 ${st.icon}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h4 className={`font-semibold text-sm ${st.title}`}>{title}</h4>
            <span className="text-xs text-gray-400">
              {new Date(timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <p className={`text-sm ${st.msg} mb-3`}>{message}</p>
          {action && tab && (
            <button
              onClick={() => onNavigate(tab)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${st.btn}`}
            >
              {action} →
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export const SmartAlerts = ({ reports, stats, onNavigate }) => {
  const alerts = useMemo(() => generateAlerts(reports, stats), [reports, stats]);

  const handleNavigate = (tab) => {
    if (onNavigate) onNavigate(tab);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <Bell className="w-5 h-5 text-blue-600" />
          Alertes Intelligentes
        </h3>
        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-semibold">
          {alerts.length} alerte(s)
        </span>
      </div>

      <div className="space-y-3">
        {alerts.map(alert => (
          <AlertCard key={alert.id} alert={alert} onNavigate={handleNavigate} />
        ))}
      </div>

      <p className="text-xs text-gray-400 text-center mt-4 pt-4 border-t">
        Mise à jour automatique toutes les 5 minutes
      </p>
    </div>
  );
};

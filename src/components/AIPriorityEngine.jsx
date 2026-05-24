// components/AIPriorityEngine.jsx — Bouton actualiser fonctionnel
import React, { useState, useEffect, useCallback } from 'react';
import { aiService } from '../services/aiService';

const PRIORITY_CONFIG = {
  critical: { label: 'Critique', color: 'bg-red-100 text-red-800 border-red-200', border: 'border-l-red-500 bg-red-50'    },
  high:     { label: 'Élevée',   color: 'bg-orange-100 text-orange-800 border-orange-200', border: 'border-l-orange-500 bg-orange-50' },
  medium:   { label: 'Moyenne',  color: 'bg-yellow-100 text-yellow-800 border-yellow-200', border: 'border-l-yellow-500 bg-yellow-50' },
  low:      { label: 'Basse',    color: 'bg-green-100 text-green-800 border-green-200',  border: 'border-l-green-500 bg-green-50'   },
};

export const AIPriorityEngine = ({ reports, onPriorityUpdate }) => {
  const [prioritizedReports, setPrioritizedReports] = useState([]);
  const [loading, setLoading]                       = useState(false);
  const [lastUpdated, setLastUpdated]               = useState(null);
  const [error, setError]                           = useState(null);

  const prioritize = useCallback(async () => {
    const safeReports = Array.isArray(reports) ? reports : [];
    if (!safeReports.length) {
      setPrioritizedReports([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await aiService.prioritizeReports(safeReports);
      const sorted = Array.isArray(result) ? result : [];
      setPrioritizedReports(sorted);
      onPriorityUpdate?.(sorted);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Erreur priorisation IA:', err);
      setError('Impossible d\'analyser les signalements. Vérifiez votre connexion.');
    } finally {
      setLoading(false);
    }
  }, [reports, onPriorityUpdate]);

  // Lancer automatiquement quand les reports changent
  useEffect(() => {
    if (Array.isArray(reports) && reports.length > 0) {
      prioritize();
    }
  }, [reports?.length]);

  const safeReports = Array.isArray(reports) ? reports : [];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            🧠 Moteur de Priorisation IA
          </h3>
          {lastUpdated && (
            <p className="text-xs text-gray-400 mt-0.5">
              Analysé le {lastUpdated.toLocaleTimeString('fr-FR')}
            </p>
          )}
        </div>
        <button
          onClick={prioritize}
          disabled={loading || !safeReports.length}
          className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:bg-purple-300 disabled:cursor-not-allowed transition-colors text-sm flex items-center gap-2"
        >
          {loading
            ? <><span className="animate-spin inline-block">⟳</span> Analyse...</>
            : <><span>🔄</span> Actualiser</>}
        </button>
      </div>

      {/* États */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm text-red-600">
          ⚠️ {error}
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-3 p-4 bg-purple-50 rounded-lg mb-4">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-600" />
          <div>
            <p className="font-medium text-purple-900 text-sm">Analyse IA en cours…</p>
            <p className="text-xs text-purple-600">{safeReports.length} signalement(s) en cours d'analyse</p>
          </div>
        </div>
      )}

      {!loading && safeReports.length === 0 && (
        <div className="text-center py-8">
          <div className="text-4xl mb-2">📭</div>
          <p className="text-gray-500 text-sm">Aucun signalement à analyser</p>
        </div>
      )}

      {/* Liste priorisée */}
      {!loading && prioritizedReports.length > 0 && (
        <div className="space-y-3">
          {prioritizedReports.slice(0, 10).map((report, index) => {
            const cfg = PRIORITY_CONFIG[report.priority] || PRIORITY_CONFIG.low;
            const id  = report._id || report.id || index;

            return (
              <div key={id} className={`border-l-4 p-4 rounded-r-lg ${cfg.border}`}>
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-sm font-bold text-gray-500">#{index + 1}</span>
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {report.title || report.type?.replace('_', ' ') || `Signalement`}
                      </span>
                      <span className={`px-2 py-0.5 text-xs rounded-full border flex-shrink-0 ${cfg.color}`}>
                        {cfg.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 line-clamp-2 mb-2">
                      {report.description || 'Aucune description'}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-gray-400 flex-wrap">
                      <span>Score IA : <strong>{Math.round((report.aiScore || 0) * 10) / 10}</strong></span>
                      <span>•</span>
                      <span>{report.location?.address || report.location || 'Lieu inconnu'}</span>
                      {report.createdAt && <>
                        <span>•</span>
                        <span>{new Date(report.createdAt).toLocaleDateString('fr-FR')}</span>
                      </>}
                    </div>
                  </div>
                </div>

                {/* Actions recommandées */}
                {Array.isArray(report.recommendedActions) && report.recommendedActions.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-xs font-semibold text-gray-600 mb-1.5">Actions suggérées :</p>
                    <div className="flex flex-wrap gap-1.5">
                      {report.recommendedActions.slice(0, 3).map((action, i) => (
                        <span key={i} className="bg-white bg-opacity-70 text-gray-600 px-2 py-0.5 rounded text-xs border">
                          {action}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {prioritizedReports.length > 10 && (
            <p className="text-center text-sm text-gray-400 pt-2">
              + {prioritizedReports.length - 10} autres signalements analysés
            </p>
          )}
        </div>
      )}
    </div>
  );
};

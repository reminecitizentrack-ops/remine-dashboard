// components/AIAnalysisPanel.jsx — Bouton actualiser + gestion erreurs
import React, { useState, useEffect, useCallback } from 'react';
import { aiService } from '../services/aiService';

const RISK_CONFIG = {
  critical: { label: 'Critique', color: 'text-red-600'    },
  high:     { label: 'Élevé',    color: 'text-orange-600' },
  medium:   { label: 'Moyen',    color: 'text-yellow-600' },
  low:      { label: 'Faible',   color: 'text-green-600'  },
};

const PRIORITY_CONFIG = {
  high:   { label: 'Haute',   color: 'text-red-600'    },
  medium: { label: 'Moyenne', color: 'text-orange-600' },
  low:    { label: 'Basse',   color: 'text-green-600'  },
};

const IMPACT_CONFIG = {
  high:   { label: 'Élevé',  color: 'bg-red-100 text-red-700'    },
  medium: { label: 'Moyen',  color: 'bg-yellow-100 text-yellow-700'},
  low:    { label: 'Faible', color: 'bg-green-100 text-green-700' },
};

export const AIAnalysisPanel = ({ report, onInsightsUpdate }) => {
  const [analysis, setAnalysis]     = useState(null);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const analyzeReport = useCallback(async () => {
    if (!report) return;
    setLoading(true);
    setError(null);

    try {
      const result = await aiService.analyzeReport(report);
      // Normaliser la réponse (peut venir de l'API ou du fallback local)
      const data = result?.data || result;
      setAnalysis(data);
      onInsightsUpdate?.(data);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Erreur analyse IA:', err);
      setError('Analyse indisponible. Tentative d\'analyse locale…');
      // Fallback local
      try {
        const localResult = aiService.localAnalysis(report);
        setAnalysis(localResult);
        onInsightsUpdate?.(localResult);
      } catch (_) {
        setError('Analyse impossible pour ce signalement.');
      }
    } finally {
      setLoading(false);
    }
  }, [report, onInsightsUpdate]);

  useEffect(() => {
    if (report) analyzeReport();
  }, [report?._id || report?.id]);

  if (!report) return null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            🤖 Analyse Intelligente
          </h3>
          {lastUpdated && (
            <p className="text-xs text-gray-400 mt-0.5">
              Analysé le {lastUpdated.toLocaleTimeString('fr-FR')}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {analysis && (
            <span className="bg-blue-100 text-blue-800 px-2.5 py-1 rounded-full text-xs font-semibold">
              Confiance : {Math.round((analysis.confidence || 0) * 100)}%
            </span>
          )}
          <button
            onClick={analyzeReport}
            disabled={loading}
            className="bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors text-sm flex items-center gap-1.5"
          >
            {loading
              ? <><span className="animate-spin inline-block">⟳</span> Analyse...</>
              : <><span>🔄</span> Actualiser</>}
          </button>
        </div>
      </div>

      {/* Erreur */}
      {error && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4 text-sm text-orange-600">
          ⚠️ {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg mb-4">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />
          <div>
            <p className="font-medium text-blue-900 text-sm">Analyse IA en cours…</p>
            <p className="text-xs text-blue-600">Examen du signalement en détail</p>
          </div>
        </div>
      )}

      {/* Résultats */}
      {!loading && analysis && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

          {/* Catégorisation */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-800 mb-3 text-sm flex items-center gap-1">
              🎯 Catégorisation
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Type détecté</span>
                <span className="font-medium capitalize">
                  {(analysis.category || 'Non déterminé').replace(/_/g, ' ')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Niveau de risque</span>
                <span className={`font-semibold ${(RISK_CONFIG[analysis.riskLevel] || RISK_CONFIG.medium).color}`}>
                  {(RISK_CONFIG[analysis.riskLevel] || RISK_CONFIG.medium).label}
                </span>
              </div>
            </div>
          </div>

          {/* Recommandations */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-800 mb-3 text-sm flex items-center gap-1">
              💡 Recommandations
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Priorité IA</span>
                <span className={`font-semibold ${(PRIORITY_CONFIG[analysis.recommendedPriority] || PRIORITY_CONFIG.medium).color}`}>
                  {(PRIORITY_CONFIG[analysis.recommendedPriority] || PRIORITY_CONFIG.medium).label}
                </span>
              </div>
              {analysis.summary && (
                <p className="text-gray-600 text-xs mt-1 italic">{analysis.summary}</p>
              )}
            </div>
          </div>

          {/* Impact environnemental */}
          {analysis.environmentalImpact && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-800 mb-3 text-sm">🌍 Impact environnemental</h4>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(analysis.environmentalImpact).map(([key, val]) => (
                  <div key={key} className="flex items-center justify-between gap-1">
                    <span className="text-xs text-gray-500 capitalize">{key}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${(IMPACT_CONFIG[val] || IMPACT_CONFIG.low).color}`}>
                      {(IMPACT_CONFIG[val] || IMPACT_CONFIG.low).label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          {Array.isArray(analysis.tags) && analysis.tags.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-800 mb-3 text-sm">🏷️ Mots-clés détectés</h4>
              <div className="flex flex-wrap gap-1.5">
                {analysis.tags.map((tag, i) => (
                  <span key={i} className="bg-white text-gray-600 px-2.5 py-1 rounded-full text-xs border border-gray-200">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Actions suggérées */}
          {Array.isArray(analysis.suggestedActions) && analysis.suggestedActions.length > 0 && (
            <div className="md:col-span-2 bg-green-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-800 mb-3 text-sm">🚨 Actions suggérées</h4>
              <ul className="space-y-1.5">
                {analysis.suggestedActions.map((action, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-green-500 mt-0.5 flex-shrink-0">✓</span>
                    <span className="text-gray-700">{action}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Facteurs d'urgence */}
          {Array.isArray(analysis.urgencyFactors) && analysis.urgencyFactors.length > 0 && (
            <div className="md:col-span-2 bg-orange-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-800 mb-3 text-sm">⚡ Facteurs d'urgence</h4>
              <div className="flex flex-wrap gap-2">
                {analysis.urgencyFactors.map((f, i) => (
                  <span key={i} className="bg-orange-100 text-orange-700 px-2.5 py-1 rounded-full text-xs font-medium">
                    {f.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {!loading && !analysis && !error && (
        <div className="text-center py-6">
          <div className="text-4xl mb-2">🤖</div>
          <p className="text-gray-400 text-sm">Cliquez sur Actualiser pour lancer l'analyse</p>
        </div>
      )}
    </div>
  );
};

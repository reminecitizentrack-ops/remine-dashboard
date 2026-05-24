// components/AIPatternDetector.jsx
import React from 'react';

export const AIPatternDetector = ({ patterns, loading }) => {
  if (loading) {
    return (
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
          <span className="text-gray-600">Détection des patterns en cours...</span>
        </div>
      </div>
    );
  }

  if (!patterns) return null;

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200">
      <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
        <span>🔍</span>
        <span>Détection de Patterns IA</span>
      </h3>
      
      <div className="space-y-4">
        {/* Points chauds */}
        {patterns.hotspots && patterns.hotspots.length > 0 && (
          <div>
            <h4 className="font-medium text-gray-900 mb-2">📍 Zones à Forte Activité</h4>
            <div className="space-y-2">
              {patterns.hotspots.slice(0, 3).map((hotspot, index) => (
                <div key={index} className="flex justify-between items-center p-2 bg-orange-50 rounded">
                  <span className="text-sm">{hotspot.location}</span>
                  <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded text-xs">
                    {hotspot.count} signalements
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tendances temporelles */}
        {patterns.temporal && (
          <div>
            <h4 className="font-medium text-gray-900 mb-2">📈 Tendances Temporelles</h4>
            <div className="text-sm text-gray-600">
              {patterns.temporal.trend === 'increasing' ? '↗ Augmentation' : 
               patterns.temporal.trend === 'decreasing' ? '↘ Diminution' : '➡ Stable'}
              {' '}des signalements
            </div>
          </div>
        )}

        {/* Prédictions */}
        {patterns.predictions && (
          <div>
            <h4 className="font-medium text-gray-900 mb-2">🎯 Prédictions</h4>
            <div className="text-sm text-gray-600">
              {patterns.predictions.nextHotspot && (
                <div>Prochaine zone sensible: {patterns.predictions.nextHotspot}</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
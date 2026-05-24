// components/PredictiveInsights.jsx
import React, { useMemo } from 'react';
import { TrendingUp, AlertTriangle, MapPin, Users } from 'lucide-react';

const calculateRiskZones = (reports) => {
  const zoneRisks = {};
  
  reports.forEach(report => {
    if (report.severity) {
      // Lire la localisation depuis les bons champs du schema
      const zone = report.location?.city
        || report.location?.region
        || report.location?.address?.split(',')[0]?.trim()
        || report.address?.split(',')[0]?.trim()
        || null;
      if (!zone) return; // ignorer les signalements sans localisation
      const sevScores = { critical: 5, high: 3, medium: 2, low: 1 };
      const riskScore = sevScores[report.severity] || 1;
      zoneRisks[zone] = (zoneRisks[zone] || 0) + riskScore;
    }
  });

  return Object.entries(zoneRisks)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([zone, score]) => ({
      zone,
      score,
      level: score > 15 ? 'Élevé' : score > 8 ? 'Moyen' : 'Faible'
    }));
};

const analyzeSeasonalPatterns = (reports) => {
  const monthlyData = Array.from({ length: 12 }, (_, i) => ({
    month: i,
    count: 0
  }));

  reports.forEach(report => {
    const month = new Date(report.createdAt).getMonth();
    monthlyData[month].count++;
  });

  const avg = monthlyData.reduce((sum, item) => sum + item.count, 0) / 12;
  
  return {
    peakMonth: monthlyData.reduce((max, item) => item.count > max.count ? item : max, monthlyData[0]),
    seasonalTrend: monthlyData[11].count > avg ? 'Hausse hivernale' : 'Stable',
    recommendation: monthlyData[11].count > avg ? 'Renforcer les équipes en hiver' : 'Maintenir capacité actuelle'
  };
};

const optimizeTeamDeployment = (reports) => {
  const activeReports = reports.filter(r => 
    r.status === 'new' || r.status === 'in_progress'
  );
  
  const teamsNeeded = Math.ceil(activeReports.length / 10); // 10 rapports par équipe
  const criticalZones = calculateRiskZones(activeReports).slice(0, 3);

  return {
    teamsNeeded: Math.max(1, teamsNeeded),
    criticalZones,
    priority: activeReports.length > 20 ? 'Élevée' : activeReports.length > 10 ? 'Moyenne' : 'Faible'
  };
};

export const PredictiveInsights = ({ reports }) => {
  const insights = useMemo(() => {
    const riskZones = calculateRiskZones(reports);
    const seasonalPatterns = analyzeSeasonalPatterns(reports);
    const teamOptimization = optimizeTeamDeployment(reports);

    return {
      riskZones,
      seasonalPatterns,
      teamOptimization,
      overallRisk: riskZones[0]?.score > 20 ? 'Élevé' : riskZones[0]?.score > 10 ? 'Moyen' : 'Faible'
    };
  }, [reports]);

  const getRiskColor = (level) => {
    switch (level) {
      case 'Élevé': return 'text-red-600 bg-red-100';
      case 'Moyen': return 'text-yellow-600 bg-yellow-100';
      case 'Faible': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 dark:bg-slate-800 dark:border-slate-700">
      <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
        <TrendingUp className="w-6 h-6 mr-2 text-blue-600" />
        Insights Prédictifs
      </h3>

      {/* Niveau de risque global */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-semibold text-gray-700">Niveau de Risque Global</h4>
            <p className={`text-lg font-bold ${getRiskColor(insights.overallRisk).split(' ')[0]}`}>
              {insights.overallRisk}
            </p>
          </div>
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${getRiskColor(insights.overallRisk)}`}>
            {insights.overallRisk}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Zones à Risque */}
        <div className="space-y-4">
          <h4 className="font-semibold text-gray-700 flex items-center">
            <MapPin className="w-5 h-5 mr-2 text-red-500" />
            Zones à Risque Prioritaire
          </h4>
          <div className="space-y-3">
            {insights.riskZones.map((zone, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${
                    zone.level === 'Élevé' ? 'bg-red-500' : 
                    zone.level === 'Moyen' ? 'bg-yellow-500' : 'bg-green-500'
                  }`}></div>
                  <span className="font-medium text-gray-700">{zone.zone}</span>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskColor(zone.level)}`}>
                  {zone.level} ({zone.score})
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Optimisation des Équipes */}
        <div className="space-y-4">
          <h4 className="font-semibold text-gray-700 flex items-center">
            <Users className="w-5 h-5 mr-2 text-green-500" />
            Optimisation des Ressources
          </h4>
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-700">Équipes nécessaires:</span>
              <span className="text-xl font-bold text-green-600">
                {insights.teamOptimization.teamsNeeded}
              </span>
            </div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-700">Priorité:</span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                insights.teamOptimization.priority === 'Élevée' ? 'bg-red-100 text-red-800' :
                insights.teamOptimization.priority === 'Moyenne' ? 'bg-yellow-100 text-yellow-800' :
                'bg-green-100 text-green-800'
              }`}>
                {insights.teamOptimization.priority}
              </span>
            </div>
            <div className="mt-4">
              <p className="text-sm text-gray-600 font-medium">Zones critiques:</p>
              <div className="flex flex-wrap gap-2 mt-2">
                {insights.teamOptimization.criticalZones.map((zone, index) => (
                  <span key={index} className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs">
                    {zone.zone}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Patterns Saisonniers */}
      <div className="mt-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
        <h4 className="font-semibold text-gray-700 flex items-center mb-3">
          <AlertTriangle className="w-5 h-5 mr-2 text-purple-500" />
          Analyse Saisonnière
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-600">Mois de pic</p>
            <p className="font-semibold text-gray-900">
              {insights.seasonalPatterns.peakMonth && 
                new Date(2024, insights.seasonalPatterns.peakMonth.month).toLocaleDateString('fr-FR', { month: 'long' })
              }
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Tendance actuelle</p>
            <p className="font-semibold text-gray-900">{insights.seasonalPatterns.seasonalTrend}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Recommandation</p>
            <p className="font-semibold text-gray-900">{insights.seasonalPatterns.recommendation}</p>
          </div>
        </div>
      </div>

      {/* Recommandations d'Action */}
      <div className="mt-6">
        <h4 className="font-semibold text-gray-700 mb-3">🎯 Recommandations d'Action</h4>
        <div className="space-y-2">
          {insights.riskZones[0]?.level === 'Élevé' && (
            <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
              <strong>Action immédiate:</strong> Déployer une équipe d'intervention dans la zone {insights.riskZones[0].zone}
            </p>
          )}
          {insights.teamOptimization.priority === 'Élevée' && (
            <p className="text-sm text-orange-600 bg-orange-50 p-3 rounded-lg">
              <strong>Renforcement:</strong> Augmenter la capacité des équipes de terrain
            </p>
          )}
          <p className="text-sm text-blue-600 bg-blue-50 p-3 rounded-lg">
            <strong>Surveillance:</strong> Maintenir un monitoring renforcé dans les zones critiques
          </p>
        </div>
      </div>
    </div>
  );
};
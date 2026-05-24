// src/components/StatsOverview.jsx
import React from 'react';
import { StatsCards } from './StatsCards';

export function StatsOverview({ stats }) {
  // Fournir des valeurs par défaut pour éviter les erreurs
  const { 
    overview = { totalReports: 0 }, 
    reportsByStatus = {}, 
    reportsByType = {}, 
    recentActivity = { reportsLast7Days: 0, usersLast7Days: 0 }, 
    topCitizens = [] 
  } = stats || {};

  const getStatusColor = (status) => {
    const colors = {
      new: 'bg-yellow-100 text-yellow-800',
      verified: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-purple-100 text-purple-800',
      resolved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      {/* Utilisation de votre composant StatsCards */}
      <StatsCards stats={stats} />

      {/* Graphiques en grille */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Répartition par statut */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <span className="mr-2">📊</span>
            Signalements par Statut
          </h3>
          <div className="space-y-4">
            {Object.entries(reportsByStatus).map(([status, count]) => {
              const percentage = overview.totalReports > 0 
                ? ((count / overview.totalReports) * 100).toFixed(1)
                : 0;
              
              return (
                <div key={status} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status)} capitalize`}>
                      {status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-32 bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-green-500 h-3 rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <div className="text-right w-16">
                      <span className="font-semibold">{count}</span>
                      <span className="text-xs text-gray-500 ml-1">({percentage}%)</span>
                    </div>
                  </div>
                </div>
              );
            })}
            {Object.keys(reportsByStatus).length === 0 && (
              <p className="text-gray-500 text-center py-4">Aucun signalement par statut</p>
            )}
          </div>
        </div>

        {/* Répartition par type */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <span className="mr-2">🗂️</span>
            Signalements par Type
          </h3>
          <div className="space-y-4">
            {Object.entries(reportsByType).map(([type, count]) => {
              const percentage = overview.totalReports > 0 
                ? ((count / overview.totalReports) * 100).toFixed(1)
                : 0;
              
              return (
                <div key={type} className="flex justify-between items-center py-2">
                  <span className="capitalize text-gray-700">{type.replace('_', ' ')}</span>
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-gray-900">{count}</span>
                    <span className="text-xs text-gray-500">
                      ({percentage}%)
                    </span>
                  </div>
                </div>
              );
            })}
            {Object.keys(reportsByType).length === 0 && (
              <p className="text-gray-500 text-center py-4">Aucun signalement par type</p>
            )}
          </div>
        </div>
      </div>

      {/* Activité récente et top citoyens */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activité récente */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <span className="mr-2">📈</span>
            Activité Récente (7 jours)
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-2xl font-bold text-blue-700">{recentActivity.reportsLast7Days}</p>
              <p className="text-sm text-blue-600">Nouveaux Signalements</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
              <p className="text-2xl font-bold text-green-700">{recentActivity.usersLast7Days}</p>
              <p className="text-sm text-green-600">Nouveaux Utilisateurs</p>
            </div>
          </div>
        </div>

        {/* Top citoyens */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <span className="mr-2">🏆</span>
            Top Citoyens Actifs
          </h3>
          <div className="space-y-3">
            {topCitizens.slice(0, 5).map((citizen, index) => (
              <div key={index} className="flex justify-between items-center py-2">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-green-600 font-semibold text-sm">
                      {index + 1}
                    </span>
                  </div>
                  <span className="font-medium text-gray-700">{citizen.citizen}</span>
                </div>
                <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-sm font-semibold">
                  {citizen.reports} signalement(s)
                </span>
              </div>
            ))}
            {topCitizens.length === 0 && (
              <p className="text-gray-500 text-center py-4">Aucun citoyen actif pour le moment</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
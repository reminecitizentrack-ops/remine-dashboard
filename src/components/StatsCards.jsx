// src/components/StatsCards.jsx
import React from 'react';

export function StatsCards({ stats }) {
  // Fournir des valeurs par défaut pour éviter les erreurs
  const { 
    overview = { totalUsers: 0, totalReports: 0 }, 
    reportsByStatus = {} 
  } = stats || {};

  // Valeurs par défaut pour chaque statut
  const statusCounts = {
    new: reportsByStatus.new || 0,
    verified: reportsByStatus.verified || 0,
    in_progress: reportsByStatus.in_progress || 0,
    resolved: reportsByStatus.resolved || 0,
    rejected: reportsByStatus.rejected || 0
  };

  const statCards = [
    {
      title: 'Utilisateurs Total',
      value: overview.totalUsers || 0,
      icon: '👥',
      color: 'blue',
      description: 'Citoyens inscrits',
      borderColor: 'border-blue-500'
    },
    {
      title: 'Signalements Total',
      value: overview.totalReports || 0,
      icon: '📝',
      color: 'green',
      description: 'Signalements créés',
      borderColor: 'border-green-500'
    },
    {
      title: 'En Attente',
      value: statusCounts.new,
      icon: '🆕',
      color: 'yellow',
      description: 'Nouveaux signalements',
      borderColor: 'border-yellow-500'
    },
    {
      title: 'Résolus',
      value: statusCounts.resolved,
      icon: '✅',
      color: 'purple',
      description: 'Signalements traités',
      borderColor: 'border-purple-500'
    }
  ];

  const getColorClasses = (color) => {
    const colors = {
      blue: 'bg-blue-50 text-blue-700',
      green: 'bg-green-50 text-green-700',
      yellow: 'bg-yellow-50 text-yellow-700',
      purple: 'bg-purple-50 text-purple-700'
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statCards.map((stat, index) => (
        <div
          key={index}
          className={`bg-white p-6 rounded-lg shadow-md border-l-4 ${stat.borderColor} ${getColorClasses(stat.color)}`}
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold opacity-75">{stat.title}</h3>
              <p className="text-3xl font-bold mt-2">{stat.value}</p>
              <p className="text-sm opacity-75 mt-1">{stat.description}</p>
            </div>
            <div className="text-3xl opacity-80">{stat.icon}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
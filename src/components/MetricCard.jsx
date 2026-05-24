// components/MetricCard.jsx
import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export const MetricCard = ({ 
  title, 
  value, 
  trend, 
  color = 'blue', 
  icon,
  description,
  formatValue = (val) => val 
}) => {
  const getColorClasses = (color) => {
    const colors = {
      blue: {
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        text: 'text-blue-700',
        value: 'text-blue-900',
        trend: 'text-blue-600'
      },
      green: {
        bg: 'bg-green-50',
        border: 'border-green-200',
        text: 'text-green-700',
        value: 'text-green-900',
        trend: 'text-green-600'
      },
      purple: {
        bg: 'bg-purple-50',
        border: 'border-purple-200',
        text: 'text-purple-700',
        value: 'text-purple-900',
        trend: 'text-purple-600'
      },
      orange: {
        bg: 'bg-orange-50',
        border: 'border-orange-200',
        text: 'text-orange-700',
        value: 'text-orange-900',
        trend: 'text-orange-600'
      },
      red: {
        bg: 'bg-red-50',
        border: 'border-red-200',
        text: 'text-red-700',
        value: 'text-red-900',
        trend: 'text-red-600'
      }
    };
    return colors[color] || colors.blue;
  };

  const colors = getColorClasses(color);

  const getTrendIcon = (trend) => {
    if (trend > 0) return <TrendingUp className="w-4 h-4" />;
    if (trend < 0) return <TrendingDown className="w-4 h-4" />;
    return <Minus className="w-4 h-4" />;
  };

  const getTrendColor = (trend) => {
    if (trend > 0) return 'text-green-600';
    if (trend < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  return (
    <div className={`p-6 rounded-xl border ${colors.bg} ${colors.border} hover:shadow-md transition-shadow`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className={`font-semibold text-sm ${colors.text}`}>{title}</h3>
        <div className={`p-2 rounded-lg ${colors.bg}`}>
          <span className="text-lg">{icon}</span>
        </div>
      </div>
      
      <p className={`text-3xl font-bold ${colors.value} mb-2`}>
        {formatValue(value)}
      </p>
      
      {trend !== undefined && (
        <div className="flex items-center space-x-1">
          {getTrendIcon(trend)}
          <span className={`text-sm font-medium ${getTrendColor(trend)}`}>
            {trend > 0 ? '+' : ''}{trend}%
          </span>
          <span className="text-xs text-gray-500">vs mois dernier</span>
        </div>
      )}
      
      {description && (
        <p className="text-xs text-gray-500 mt-2">{description}</p>
      )}
    </div>
  );
};
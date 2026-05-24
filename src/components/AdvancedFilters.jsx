// components/AdvancedFilters.jsx
import React, { useState, useEffect } from 'react';

export const AdvancedFilters = ({ 
  onFiltersChange, 
  initialFilters = {},
  isLoading = false 
}) => {
  const [filters, setFilters] = useState({
    dateRange: '30d',
    status: 'all',
    pollutionType: 'all',
    priority: 'all',
    location: '',
    searchQuery: '',
    ...initialFilters
  });

  // Options disponibles pour les filtres
  const filterOptions = {
    dateRange: [
      { value: '7d', label: '7 derniers jours' },
      { value: '30d', label: '30 derniers jours' },
      { value: '90d', label: '3 derniers mois' },
      { value: '365d', label: 'Cette année' },
      { value: 'all', label: 'Toute période' }
    ],
    status: [
      { value: 'all', label: 'Tous statuts' },
      { value: 'pending', label: '⏳ En attente' },
      { value: 'in_progress', label: '🔄 En cours' },
      { value: 'resolved', label: '✅ Résolu' },
      { value: 'rejected', label: '❌ Rejeté' }
    ],
    pollutionType: [
      { value: 'all', label: 'Tous types' },
      { value: 'water', label: '💧 Pollution eau' },
      { value: 'air', label: '🌫️ Pollution air' },
      { value: 'soil', label: '🌱 Pollution sol' },
      { value: 'waste', label: '🗑️ Déchets miniers' },
      { value: 'noise', label: '🔊 Pollution sonore' },
      { value: 'other', label: '📌 Autre' }
    ],
    priority: [
      { value: 'all', label: 'Toutes priorités' },
      { value: 'low', label: '🟢 Basse' },
      { value: 'medium', label: '🟡 Moyenne' },
      { value: 'high', label: '🔴 Haute' },
      { value: 'critical', label: '💥 Critique' }
    ]
  };

  // Appliquer les filtres avec un debounce pour la recherche
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      onFiltersChange(filters);
    }, filters.searchQuery ? 500 : 0); // Debounce seulement pour la recherche

    return () => clearTimeout(timeoutId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const clearAllFilters = () => {
    const clearedFilters = {
      dateRange: '30d',
      status: 'all',
      pollutionType: 'all',
      priority: 'all',
      location: '',
      searchQuery: ''
    };
    setFilters(clearedFilters);
  };

  // Compter le nombre de filtres actifs
  const activeFiltersCount = Object.keys(filters).filter(key => 
    filters[key] !== 'all' && filters[key] !== '' && key !== 'dateRange'
  ).length;

  return (
    <div className="bg-white p-6 rounded-lg shadow border border-gray-200 mb-6">
      {/* En-tête des filtres */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-4">
        <div className="flex items-center space-x-4 mb-4 lg:mb-0">
          <h3 className="text-lg font-semibold text-gray-900">🔍 Filtres Avancés</h3>
          {activeFiltersCount > 0 && (
            <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-semibold">
              {activeFiltersCount} filtre(s) actif(s)
            </span>
          )}
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={clearAllFilters}
            disabled={activeFiltersCount === 0}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeFiltersCount === 0
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            🗑️ Tout effacer
          </button>
          
          {isLoading && (
            <div className="flex items-center space-x-2 text-blue-600">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span className="text-sm">Application...</span>
            </div>
          )}
        </div>
      </div>

      {/* Barre de recherche */}
      <div className="mb-6">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="text-gray-400">🔎</span>
          </div>
          <input
            type="text"
            placeholder="Rechercher dans les signalements (titre, description, localisation...)"
            value={filters.searchQuery}
            onChange={(e) => handleFilterChange('searchQuery', e.target.value)}
            className="block w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
          />
          {filters.searchQuery && (
            <button
              onClick={() => handleFilterChange('searchQuery', '')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
            >
              <span className="text-gray-400 hover:text-gray-600">✕</span>
            </button>
          )}
        </div>
      </div>

      {/* Filtres principaux en grille */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Filtre Période */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            📅 Période
          </label>
          <select
            value={filters.dateRange}
            onChange={(e) => handleFilterChange('dateRange', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
          >
            {filterOptions.dateRange.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Filtre Statut */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            🏷️ Statut
          </label>
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
          >
            {filterOptions.status.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Filtre Type de Pollution */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            🌍 Type de Pollution
          </label>
          <select
            value={filters.pollutionType}
            onChange={(e) => handleFilterChange('pollutionType', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
          >
            {filterOptions.pollutionType.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Filtre Priorité */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            🚨 Priorité
          </label>
          <select
            value={filters.priority}
            onChange={(e) => handleFilterChange('priority', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
          >
            {filterOptions.priority.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Filtre localisation avancé */}
      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          📍 Localisation (ville, région)
        </label>
        <input
          type="text"
          placeholder="Ex: Paris, Nord, Bretagne..."
          value={filters.location}
          onChange={(e) => handleFilterChange('location', e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
        />
      </div>

      {/* Résumé des filtres actifs */}
      {activeFiltersCount > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Filtres appliqués :</h4>
          <div className="flex flex-wrap gap-2">
            {filters.dateRange !== '30d' && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                📅 {filterOptions.dateRange.find(opt => opt.value === filters.dateRange)?.label}
              </span>
            )}
            {filters.status !== 'all' && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800">
                🏷️ {filterOptions.status.find(opt => opt.value === filters.status)?.label}
              </span>
            )}
            {filters.pollutionType !== 'all' && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                🌍 {filterOptions.pollutionType.find(opt => opt.value === filters.pollutionType)?.label}
              </span>
            )}
            {filters.priority !== 'all' && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-red-100 text-red-800">
                🚨 {filterOptions.priority.find(opt => opt.value === filters.priority)?.label}
              </span>
            )}
            {filters.location && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">
                📍 {filters.location}
              </span>
            )}
            {filters.searchQuery && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800">
                🔎 "{filters.searchQuery}"
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
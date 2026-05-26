// components/ActionHistory.jsx — Journal des actions admin
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { dashboardAPI } from '../services/api';

// ==================== CONSTANTES ====================

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

const ACTION_CONFIG = {
  status_update:   { icon: '🔄', label: 'Statut modifié',    color: 'bg-blue-100 text-blue-700', order: 1 },
  note_added:      { icon: '📝', label: 'Note ajoutée',      color: 'bg-amber-100 text-amber-700', order: 2 },
  report_assigned: { icon: '👤', label: 'Assigné',           color: 'bg-purple-100 text-purple-700', order: 3 },
  report_verified: { icon: '✅', label: 'Vérifié',           color: 'bg-green-100 text-green-700', order: 4 },
  report_resolved: { icon: '🎉', label: 'Résolu',            color: 'bg-emerald-100 text-emerald-700', order: 5 },
  tags_updated:    { icon: '🏷️', label: 'Tags mis à jour',  color: 'bg-orange-100 text-orange-700', order: 6 },
  role_changed:    { icon: '⚡', label: 'Rôle modifié',      color: 'bg-red-100 text-red-700', order: 7 },
  user_deleted:    { icon: '🗑️', label: 'Utilisateur supprimé', color: 'bg-rose-100 text-rose-700', order: 8 },
  message_sent:    { icon: '✉️', label: 'Message envoyé',    color: 'bg-indigo-100 text-indigo-700', order: 9 },
  report_created:  { icon: '➕', label: 'Signalement créé',  color: 'bg-teal-100 text-teal-700', order: 10 },
  export_download: { icon: '📥', label: 'Export',            color: 'bg-slate-100 text-slate-700', order: 11 },
  login:           { icon: '🔐', label: 'Connexion',         color: 'bg-gray-100 text-gray-700', order: 12 },
  logout:          { icon: '🚪', label: 'Déconnexion',       color: 'bg-gray-100 text-gray-700', order: 13 },
};

// Types d'entités pour filtrage
const ENTITY_TYPES = {
  report: 'Signalement',
  user: 'Utilisateur',
  comment: 'Commentaire',
  tag: 'Tag',
  project: 'Projet',
};

// ==================== FONCTIONS UTILITAIRES ====================

const fmtDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const timeAgo = (d) => {
  if (!d) return '—';
  const diff = Date.now() - new Date(d).getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (seconds < 10) return 'À l\'instant';
  if (seconds < 60) return `il y a ${seconds}s`;
  if (minutes < 60) return `il y a ${minutes}min`;
  if (hours < 24) return `il y a ${hours}h`;
  if (days < 7) return `il y a ${days}j`;
  if (weeks < 4) return `il y a ${weeks}sem`;
  if (months < 12) return `il y a ${months}mois`;
  return `il y a ${years}an${years > 1 ? 's' : ''}`;
};

const getInitials = (firstName, lastName) => {
  return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase() || '?';
};

// ==================== COMPOSANT DE RECHERCHE DÉBOUNCÉE ====================

const useDebounce = (value, delay = 300) => {
  const [debounced, setDebounced] = useState(value);
  
  useEffect(() => {
    const handler = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  
  return debounced;
};

// ==================== COMPOSANT PRINCIPAL ====================

export const ActionHistory = ({ maxHeight = '600px', showFilters = true }) => {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState('all');
  const [entityFilter, setEntityFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [autoRefresh, setAutoRefresh] = useState(false);

  const debouncedSearch = useDebounce(search);
  const debouncedStartDate = useDebounce(dateRange.start);
  const debouncedEndDate = useDebounce(dateRange.end);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: 30,
        page,
      });
      
      if (filter !== 'all') params.set('action', filter);
      if (entityFilter !== 'all') params.set('entity', entityFilter);
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (debouncedStartDate) params.set('startDate', debouncedStartDate);
      if (debouncedEndDate) params.set('endDate', debouncedEndDate);

      const response = await fetch(`${API}/admin/action-logs?${params}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('remine_admin_token')}`,
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      if (data.success) {
        setLogs(data.data.logs || []);
        setTotal(data.data.total || 0);
      }
    } catch (e) {
      console.error('Erreur chargement logs:', e);
    } finally {
      setLoading(false);
    }
  }, [page, filter, entityFilter, debouncedSearch, debouncedStartDate, debouncedEndDate]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      loadLogs();
    }, 30000); // toutes les 30 secondes
    return () => clearInterval(interval);
  }, [autoRefresh, loadLogs]);

  useEffect(() => {
    setPage(1);
  }, [filter, entityFilter, debouncedSearch, debouncedStartDate, debouncedEndDate]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const uniqueActions = useMemo(() => 
    [...new Set(Object.keys(ACTION_CONFIG))].sort((a, b) => 
      (ACTION_CONFIG[a].order || 999) - (ACTION_CONFIG[b].order || 999)
    ), []
  );

  const uniqueEntities = useMemo(() => 
    [...new Set(['all', ...logs.map(l => l.entity).filter(Boolean)])], [logs]
  );

  const getEntityLabel = (entity) => ENTITY_TYPES[entity] || entity || 'Inconnu';

  // Composant de détail des changements
  const DetailsRenderer = ({ details, action }) => {
    if (!details || Object.keys(details).length === 0) return null;
    
    if (details.newStatus) {
      return (
        <div className="inline-flex items-center gap-1 text-xs bg-gray-50 rounded-lg px-2 py-1 mt-1">
          <span className="text-gray-500">Statut:</span>
          <span className="font-semibold text-gray-700">{details.oldStatus || '?'}</span>
          <span className="text-gray-400">→</span>
          <span className={`font-semibold ${
            details.newStatus === 'resolved' ? 'text-green-600' :
            details.newStatus === 'rejected' ? 'text-red-600' :
            'text-amber-600'
          }`}>{details.newStatus}</span>
        </div>
      );
    }
    
    if (details.tags) {
      return (
        <div className="inline-flex flex-wrap gap-1 text-xs bg-gray-50 rounded-lg px-2 py-1 mt-1">
          <span className="text-gray-500">Tags:</span>
          {(Array.isArray(details.tags) ? details.tags : [details.tags]).map(tag => (
            <span key={tag} className="px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded-full text-[10px]">
              {tag}
            </span>
          ))}
        </div>
      );
    }
    
    if (details.note) {
      return (
        <div className="text-xs bg-gray-50 rounded-lg px-2 py-1 mt-1 max-w-md">
          <span className="text-gray-500">Note:</span>
          <span className="text-gray-700 ml-1">"{details.note.substring(0, 100)}"</span>
        </div>
      );
    }
    
    if (details.role) {
      return (
        <div className="inline-flex items-center gap-1 text-xs bg-gray-50 rounded-lg px-2 py-1 mt-1">
          <span className="text-gray-500">Rôle:</span>
          <span className="font-semibold text-gray-700">{details.oldRole || '?'}</span>
          <span className="text-gray-400">→</span>
          <span className="font-semibold text-purple-600">{details.role}</span>
        </div>
      );
    }
    
    // Détails génériques
    return (
      <div className="text-xs bg-gray-50 rounded-lg px-2 py-1 mt-1">
        <code className="text-gray-600">
          {JSON.stringify(details, null, 0).substring(0, 100)}
        </code>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center text-xl shadow-md">
              📋
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Historique des actions</h2>
              <p className="text-xs text-gray-400">
                {total.toLocaleString('fr-FR')} action{total > 1 ? 's' : ''} enregistrée{total > 1 ? 's' : ''}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Auto-refresh toggle */}
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                autoRefresh 
                  ? 'bg-emerald-100 text-emerald-700' 
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
              title={autoRefresh ? 'Auto-refresh actif' : 'Activer auto-refresh (30s)'}
            >
              🔄 {autoRefresh && 'Auto'}
            </button>
            
            <button 
              onClick={loadLogs} 
              disabled={loading}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
            >
              <span className={loading ? 'animate-spin inline-block' : ''}>🔄</span> 
              Actualiser
            </button>
          </div>
        </div>

        {showFilters && (
          <>
            {/* Filtres par action */}
            <div className="mb-4">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
                Filtrer par action
              </label>
              <div className="flex flex-wrap gap-2">
                <button 
                  onClick={() => setFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    filter === 'all' 
                      ? 'bg-purple-600 text-white shadow-sm' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  📋 Toutes ({total})
                </button>
                {uniqueActions.map(a => {
                  const cfg = ACTION_CONFIG[a];
                  if (!cfg) return null;
                  return (
                    <button 
                      key={a} 
                      onClick={() => setFilter(filter === a ? 'all' : a)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        filter === a 
                          ? cfg.color.replace('text-', 'bg-').replace('bg-', 'bg-opacity-100 ') + ' shadow-sm'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      {cfg.icon} {cfg.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Filtre par entité et recherche */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">
                  Type d'entité
                </label>
                <select
                  value={entityFilter}
                  onChange={e => setEntityFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                >
                  <option value="all">📋 Tous les types</option>
                  {uniqueEntities.filter(e => e !== 'all').map(e => (
                    <option key={e} value={e}>{getEntityLabel(e)}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">
                  🔍 Recherche
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
                  <input 
                    value={search} 
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Email, action, entité..."
                    className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
              </div>
              
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">
                    📅 Date début
                  </label>
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">
                    📅 Date fin
                  </label>
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Badges de filtres actifs */}
            {(filter !== 'all' || entityFilter !== 'all' || search || dateRange.start || dateRange.end) && (
              <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-100">
                <span className="text-xs text-gray-400">Filtres actifs:</span>
                {filter !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs">
                    {ACTION_CONFIG[filter]?.icon} {ACTION_CONFIG[filter]?.label}
                    <button onClick={() => setFilter('all')} className="ml-1 hover:opacity-70">×</button>
                  </span>
                )}
                {entityFilter !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full text-xs">
                    📁 {getEntityLabel(entityFilter)}
                    <button onClick={() => setEntityFilter('all')} className="ml-1 hover:opacity-70">×</button>
                  </span>
                )}
                {search && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full text-xs">
                    🔍 {search}
                    <button onClick={() => setSearch('')} className="ml-1 hover:opacity-70">×</button>
                  </span>
                )}
                {(dateRange.start || dateRange.end) && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full text-xs">
                    📅 {dateRange.start || '...'} → {dateRange.end || '...'}
                    <button onClick={() => setDateRange({ start: '', end: '' })} className="ml-1 hover:opacity-70">×</button>
                  </span>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Timeline des actions */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="w-8 h-8 border-3 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
            <span className="text-sm text-gray-400">Chargement des actions...</span>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-5xl mb-3 opacity-50">📭</div>
            <p className="text-gray-500 font-medium">Aucune action enregistrée</p>
            <p className="text-gray-400 text-sm mt-1">
              {search || filter !== 'all' || entityFilter !== 'all'
                ? 'Essayez de modifier vos filtres'
                : 'Les actions apparaîtront ici au fur et à mesure'
              }
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50" style={{ maxHeight, overflowY: 'auto' }}>
            {logs.map((log, i) => {
              const cfg = ACTION_CONFIG[log.action] || { 
                icon: '⚙️', 
                label: log.action?.replace(/_/g, ' ') || 'Action', 
                color: 'bg-gray-100 text-gray-600' 
              };
              const actor = log.performedBy;
              const entityLabel = getEntityLabel(log.entity);

              return (
                <div key={log._id || i} className="group flex items-start gap-4 p-5 hover:bg-gray-50 transition-all duration-200">
                  {/* Icône avec cercle décoratif */}
                  <div className="relative flex-shrink-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shadow-sm ${cfg.color}`}>
                      {cfg.icon}
                    </div>
                    {/* Ligne de connexion verticale (effet timeline) */}
                    {i < logs.length - 1 && (
                      <div className="absolute left-1/2 -translate-x-1/2 top-10 w-0.5 h-8 bg-gray-100 group-last:hidden" />
                    )}
                  </div>

                  {/* Contenu principal */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cfg.color}`}>
                        {cfg.label}
                      </span>
                      <span className="text-xs text-gray-400">sur</span>
                      <span className="text-xs font-medium text-gray-700 bg-gray-100 px-2 py-0.5 rounded-full">
                        {entityLabel}
                      </span>
                      {log.entityId && (
                        <span className="text-xs text-gray-400 font-mono">
                          #{typeof log.entityId === 'string' ? log.entityId.slice(-8) : log.entityId}
                        </span>
                      )}
                    </div>

                    {/* Détails contextuels */}
                    <DetailsRenderer details={log.details} action={log.action} />

                    {/* Informations acteur */}
                    <div className="flex items-center gap-2 mt-2">
                      {actor && (
                        <>
                          <div 
                            className="w-6 h-6 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm"
                            title={actor.email}
                          >
                            {getInitials(actor.firstName, actor.lastName)}
                          </div>
                          <span className="text-xs text-gray-600">
                            {actor.firstName} {actor.lastName}
                            {actor.role && (
                              <span className="text-gray-400 ml-1 text-[10px] uppercase">({actor.role})</span>
                            )}
                          </span>
                        </>
                      )}
                      {!actor && (
                        <span className="text-xs text-gray-400 italic">Système</span>
                      )}
                      <span className="text-xs text-gray-300">·</span>
                      <span 
                        className="text-xs text-gray-400 hover:text-gray-600 cursor-help transition-colors"
                        title={fmtDate(log.createdAt)}
                      >
                        {timeAgo(log.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* Date compacte */}
                  <div className="flex-shrink-0 text-right hidden sm:block">
                    <div className="text-xs font-medium text-gray-500">
                      {new Date(log.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                    </div>
                    <div className="text-[10px] text-gray-300">
                      {new Date(log.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {total > 30 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50">
            <button 
              onClick={() => setPage(p => Math.max(1, p - 1))} 
              disabled={page === 1}
              className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              ← Précédent
            </button>
            <span className="text-sm text-gray-500">
              Page <span className="font-semibold text-gray-700">{page}</span> · 
              <span className="ml-1">{total.toLocaleString('fr-FR')} action{total > 1 ? 's' : ''}</span>
            </span>
            <button 
              onClick={() => setPage(p => p + 1)} 
              disabled={page * 30 >= total}
              className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Suivant →
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Export par défaut
export default ActionHistory;
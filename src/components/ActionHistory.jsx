import { dashboardAPI } from '../services/api';
// components/ActionHistory.jsx — Journal des actions admin
import React, { useState, useEffect, useCallback } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';



const ACTION_CONFIG = {
  status_update:   { icon: '🔄', label: 'Statut modifié',    color: 'bg-blue-100 text-blue-700'    },
  note_added:      { icon: '📝', label: 'Note ajoutée',      color: 'bg-yellow-100 text-yellow-700' },
  report_assigned: { icon: '👤', label: 'Assigné',           color: 'bg-purple-100 text-purple-700' },
  report_verified: { icon: '✅', label: 'Vérifié',           color: 'bg-green-100 text-green-700'   },
  report_resolved: { icon: '🎉', label: 'Résolu',            color: 'bg-emerald-100 text-emerald-700'},
  tags_updated:    { icon: '🏷️', label: 'Tags mis à jour',  color: 'bg-orange-100 text-orange-700' },
  role_changed:    { icon: '⚡', label: 'Rôle modifié',      color: 'bg-red-100 text-red-700'       },
  user_deleted:    { icon: '🗑️', label: 'Utilisateur supprimé', color: 'bg-red-100 text-red-700'   },
  message_sent:    { icon: '✉️', label: 'Message envoyé',    color: 'bg-indigo-100 text-indigo-700' },
};

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR', {
  day: 'numeric', month: 'short', year: 'numeric',
  hour: '2-digit', minute: '2-digit',
}) : '—';

const timeAgo = (d) => {
  if (!d) return '—';
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const day = Math.floor(diff / 86400000);
  if (m < 1)  return 'À l\'instant';
  if (m < 60) return `il y a ${m}min`;
  if (h < 24) return `il y a ${h}h`;
  return `il y a ${day}j`;
};

export const ActionHistory = () => {
  const [logs, setLogs]         = useState([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(true);
  const [page, setPage]         = useState(1);
  const [filter, setFilter]     = useState('all');
  const [search, setSearch]     = useState('');

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: 30, page });
      if (filter !== 'all') params.set('action', filter);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api'}/admin/action-logs?${params}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('remine_admin_token')}` }
      });
      const data = await response.json();
      if (data.success) {
        setLogs(data.data.logs || []);
        setTotal(data.data.total || 0);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [page, filter]);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  const filtered = search
    ? logs.filter(l =>
        l.performedBy?.email?.includes(search) ||
        l.action?.includes(search) ||
        l.entity?.includes(search)
      )
    : logs;

  const uniqueActions = [...new Set(Object.keys(ACTION_CONFIG))];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center text-xl">📋</div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Historique des actions</h2>
              <p className="text-xs text-gray-400">{total} action(s) enregistrée(s)</p>
            </div>
          </div>
          <button onClick={loadLogs} disabled={loading}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
            <span className={loading ? 'animate-spin inline-block' : ''}>🔄</span> Actualiser
          </button>
        </div>

        {/* Filtres */}
        <div className="flex flex-wrap gap-2 mb-3">
          <button onClick={() => setFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${filter === 'all' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-500'}`}>
            Toutes
          </button>
          {uniqueActions.map(a => {
            const cfg = ACTION_CONFIG[a];
            return (
              <button key={a} onClick={() => setFilter(a)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${filter === a ? cfg.color : 'bg-gray-100 text-gray-500'}`}>
                {cfg.icon} {cfg.label}
              </button>
            );
          })}
        </div>

        {/* Recherche */}
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)}
                 placeholder="Rechercher par email, action…"
                 className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none" />
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12 gap-3">
            <div className="w-5 h-5 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
            <span className="text-sm text-gray-400">Chargement…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-2">📭</div>
            <p className="text-gray-400 text-sm">Aucune action enregistrée</p>
            <p className="text-gray-300 text-xs mt-1">Les actions apparaîtront ici au fur et à mesure</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filtered.map((log, i) => {
              const cfg = ACTION_CONFIG[log.action] || { icon: '⚙️', label: log.action, color: 'bg-gray-100 text-gray-600' };
              const actor = log.performedBy;

              return (
                <div key={log._id || i} className="flex items-start gap-4 p-4 hover:bg-gray-50 transition-colors">
                  {/* Icône */}
                  <div className={`w-9 h-9 flex-shrink-0 rounded-xl flex items-center justify-center text-base ${cfg.color}`}>
                    {cfg.icon}
                  </div>

                  {/* Contenu */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cfg.color}`}>{cfg.label}</span>
                      <span className="text-xs text-gray-400">sur</span>
                      <span className="text-xs font-medium text-gray-600 capitalize">{log.entity}</span>
                      {log.entityId && (
                        <span className="text-xs text-gray-300 font-mono">#{log.entityId.toString().slice(-8)}</span>
                      )}
                    </div>

                    {/* Détails */}
                    {log.details && (
                      <div className="text-xs text-gray-500 bg-gray-50 rounded-lg px-2 py-1 mt-1 inline-block">
                        {log.details.newStatus && `→ ${log.details.newStatus}`}
                        {log.details.tags && `Tags: ${Array.isArray(log.details.tags) ? log.details.tags.join(', ') : log.details.tags}`}
                        {log.details.note && `Note: "${log.details.note.substring(0, 50)}..."`}
                      </div>
                    )}

                    <div className="flex items-center gap-2 mt-1.5">
                      {actor && (
                        <>
                          <div className="w-5 h-5 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-700 text-xs font-bold flex-shrink-0">
                            {actor.firstName?.[0]}
                          </div>
                          <span className="text-xs text-gray-500">
                            {actor.firstName} {actor.lastName}
                            <span className="text-gray-300 ml-1">({actor.role})</span>
                          </span>
                        </>
                      )}
                      <span className="text-xs text-gray-300">·</span>
                      <span className="text-xs text-gray-400" title={fmtDate(log.createdAt)}>{timeAgo(log.createdAt)}</span>
                    </div>
                  </div>

                  {/* Date */}
                  <div className="flex-shrink-0 text-xs text-gray-300 text-right">
                    {new Date(log.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                    <br />
                    {new Date(log.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {total > 30 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50">
            <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}
                    className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40">
              ← Précédent
            </button>
            <span className="text-sm text-gray-500">Page {page} · {total} actions</span>
            <button onClick={() => setPage(p => p+1)} disabled={page * 30 >= total}
                    className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40">
              Suivant →
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
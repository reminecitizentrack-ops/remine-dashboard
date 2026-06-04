// components/NotificationBell.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Centre de notifications dans le header du dashboard
// Agrège : nouveaux signalements, changements de statut, nouveaux messages
// Utilise les données déjà disponibles (recentReports + activity)
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { dashboardAPI } from '../services/api';

// ─── Config types de notifications ───────────────────────────────────────────

const NOTIF_CONFIG = {
  new_report: {
    icon:  '📋',
    color: 'bg-blue-50 border-blue-100',
    badge: 'bg-blue-500',
    label: 'Nouveau signalement',
  },
  status_changed: {
    icon:  '🔄',
    color: 'bg-amber-50 border-amber-100',
    badge: 'bg-amber-500',
    label: 'Statut modifié',
  },
  new_comment: {
    icon:  '💬',
    color: 'bg-purple-50 border-purple-100',
    badge: 'bg-purple-500',
    label: 'Nouveau message',
  },
  resolved: {
    icon:  '✅',
    color: 'bg-emerald-50 border-emerald-100',
    badge: 'bg-emerald-500',
    label: 'Signalement résolu',
  },
};

const STATUS_LABELS = {
  new:         'Nouveau',
  pending:     'En attente',
  in_progress: 'En cours',
  resolved:    'Résolu',
  verified:    'Vérifié',
  rejected:    'Rejeté',
};

const TYPE_LABELS = {
  water_pollution: 'Pollution eau', air_pollution: 'Pollution air',
  soil_contamination: 'Contamination sol', waste_deposit: 'Dépôt déchets',
  dust: 'Poussière', abandoned_site: 'Site abandonné',
  noise_pollution: 'Pollution sonore', mining_waste: 'Déchets miniers',
  industrial_waste: 'Déchets industriels', illegal_dumping: 'Dépôt sauvage',
  other: 'Autre',
};

// ─── Utilitaires ──────────────────────────────────────────────────────────────

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const min  = Math.floor(diff / 60000);
  const h    = Math.floor(diff / 3600000);
  const d    = Math.floor(diff / 86400000);
  if (min < 1)  return 'À l\'instant';
  if (min < 60) return `Il y a ${min}min`;
  if (h < 24)   return `Il y a ${h}h`;
  return `Il y a ${d}j`;
}

function buildNotificationsFromReports(reports) {
  const notifs = [];

  reports.forEach(r => {
    const id   = r._id || r.id;
    const loc  = r.location?.address || r.address || 'Localisation inconnue';
    const type = TYPE_LABELS[r.type] || r.type || 'Signalement';
    const date = r.createdAt || r.updatedAt;

    // Nouveau signalement
    if (r.status === 'new' || r.status === 'pending') {
      notifs.push({
        id:      `new_${id}`,
        type:    'new_report',
        title:   type,
        message: loc,
        time:    date,
        reportId: id,
        read:    false,
      });
    }

    // Signalement résolu
    if (r.status === 'resolved' || r.status === 'verified') {
      notifs.push({
        id:      `resolved_${id}`,
        type:    'resolved',
        title:   `${type} résolu`,
        message: loc,
        time:    r.updatedAt || date,
        reportId: id,
        read:    false,
      });
    }

    // Statut en cours
    if (r.status === 'in_progress') {
      notifs.push({
        id:      `inprogress_${id}`,
        type:    'status_changed',
        title:   `${type} en traitement`,
        message: `Statut → ${STATUS_LABELS[r.status]}`,
        time:    r.updatedAt || date,
        reportId: id,
        read:    false,
      });
    }
  });

  // Trier par date décroissante, garder les 20 plus récentes
  return notifs
    .sort((a, b) => new Date(b.time) - new Date(a.time))
    .slice(0, 20);
}

// ─── Composant principal ──────────────────────────────────────────────────────

export function NotificationBell({ onNavigate }) {
  const [open,         setOpen]         = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading,      setLoading]      = useState(false);
  const [filter,       setFilter]       = useState('all'); // all | unread
  const [deletedIds,   setDeletedIds]   = useState(() => {
    try {
      const stored = localStorage.getItem('remine_deleted_notifs');
      return new Set(JSON.parse(stored) || []);
    } catch { return new Set(); }
  });
  const [readIds,      setReadIds]      = useState(() => {
    try {
      const stored = localStorage.getItem('remine_read_notifs');
      return new Set(JSON.parse(stored) || []);
    } catch { return new Set(); }
  });

  const panelRef = useRef(null);
  const bellRef  = useRef(null);

  // ── Charger les notifications depuis les signalements récents ──────────────

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const [reportsRes, activityRes] = await Promise.all([
        dashboardAPI.getReports({ limit: 50, sort: 'recent' }),
        dashboardAPI.getActivity(),
      ]);

      const reports = reportsRes?.data?.reports || [];
      const notifs  = buildNotificationsFromReports(reports);

      // Ajouter les activités récentes comme notifications de commentaires
      const activity = activityRes?.data || [];
      activity.slice(0, 5).forEach((a, i) => {
        if (a.type === 'comment' || a.action?.includes('comment')) {
          notifs.unshift({
            id:      `comment_${i}_${Date.now()}`,
            type:    'new_comment',
            title:   'Nouveau commentaire citoyen',
            message: a.description || a.message || 'Un citoyen a laissé un message',
            time:    a.date || a.createdAt,
            read:    false,
          });
        }
      });

      setNotifications(notifs);
    } catch (e) {
      console.error('NotificationBell error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 60000); // refresh toutes les minutes
    return () => clearInterval(interval);
  }, [loadNotifications]);

  // ── Fermer en cliquant à l'extérieur ──────────────────────────────────────

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target) &&
          bellRef.current  && !bellRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // ── Supprimer une notification ───────────────────────────────────────────

  const deleteNotif = (e, id) => {
    e.stopPropagation();
    setDeletedIds(prev => {
      const next = new Set(prev).add(id);
      localStorage.setItem('remine_deleted_notifs', JSON.stringify([...next]));
      return next;
    });
  };

  const deleteAll = () => {
    const allIds = notifications.map(n => n.id);
    setDeletedIds(prev => {
      const next = new Set([...prev, ...allIds]);
      localStorage.setItem('remine_deleted_notifs', JSON.stringify([...next]));
      return next;
    });
  };

  // ── Marquer comme lu ──────────────────────────────────────────────────────

  const markRead = (id) => {
    setReadIds(prev => {
      const next = new Set(prev).add(id);
      localStorage.setItem('remine_read_notifs', JSON.stringify([...next]));
      return next;
    });
  };

  const markAllRead = () => {
    const allIds = notifications.map(n => n.id);
    setReadIds(prev => {
      const next = new Set([...prev, ...allIds]);
      localStorage.setItem('remine_read_notifs', JSON.stringify([...next]));
      return next;
    });
  };

  // ── Données filtrées ──────────────────────────────────────────────────────

  // Exclure les notifications supprimées
  const visibleNotifications = notifications.filter(n => !deletedIds.has(n.id));

  const notificationsWithRead = visibleNotifications.map(n => ({
    ...n,
    read: readIds.has(n.id),
  }));

  const filtered = filter === 'unread'
    ? notificationsWithRead.filter(n => !n.read)
    : notificationsWithRead;

  const unreadCount = notificationsWithRead.filter(n => !n.read).length;

  // ── Clic sur une notification ─────────────────────────────────────────────

  const handleNotifClick = (notif) => {
    markRead(notif.id);
    if (notif.reportId && onNavigate) {
      onNavigate('reports', notif.reportId);
    }
    setOpen(false);
  };

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="relative" ref={bellRef}>
      {/* Bouton cloche */}
      <button
        onClick={() => { setOpen(o => !o); if (!open) loadNotifications(); }}
        className="relative w-9 h-9 flex items-center justify-center rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
        title="Notifications"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-4 h-4 rounded-full flex items-center justify-center leading-none" style={{ fontSize: 10 }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Panneau */}
      {open && (
        <div
          ref={panelRef}
          className="absolute right-0 top-11 z-50 w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden"
          style={{ maxHeight: '520px' }}
        >
          {/* Header panneau */}
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-900 text-sm">Notifications</span>
              {unreadCount > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-3">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                  >
                    Tout lire
                  </button>
                )}
                {visibleNotifications.length > 0 && (
                  <button
                    onClick={deleteAll}
                    className="text-xs text-red-500 hover:text-red-600 font-medium"
                  >
                    Tout supprimer
                  </button>
                )}
              </div>
              <button
                onClick={loadNotifications}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                title="Actualiser"
              >
                <svg className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </div>

          {/* Filtres */}
          <div className="px-4 py-2 border-b border-gray-100 flex gap-2">
            {['all', 'unread'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`text-xs font-medium px-3 py-1 rounded-full transition-colors ${
                  filter === f
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                {f === 'all' ? 'Toutes' : 'Non lues'}
                {f === 'unread' && unreadCount > 0 && ` (${unreadCount})`}
              </button>
            ))}
          </div>

          {/* Liste */}
          <div className="overflow-y-auto" style={{ maxHeight: '360px' }}>
            {loading && filtered.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-3">🔔</div>
                <p className="text-gray-500 font-medium text-sm">
                  {filter === 'unread' ? 'Aucune notification non lue' : 'Aucune notification'}
                </p>
              </div>
            ) : (
              filtered.map(notif => {
                const cfg = NOTIF_CONFIG[notif.type] || NOTIF_CONFIG.new_report;
                return (
                  <button
                    key={notif.id}
                    onClick={() => handleNotifClick(notif)}
                    className={`group w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors flex items-start gap-3 ${
                      !notif.read ? 'bg-blue-50/30' : ''
                    }`}
                  >
                    {/* Icône */}
                    <div className={`flex-shrink-0 w-9 h-9 rounded-xl border flex items-center justify-center text-base ${cfg.color}`}>
                      {cfg.icon}
                    </div>

                    {/* Contenu */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm font-medium text-gray-900 truncate ${!notif.read ? 'font-semibold' : ''}`}>
                          {notif.title}
                        </p>
                        <span className="flex-shrink-0 text-xs text-gray-400 whitespace-nowrap">
                          {timeAgo(notif.time)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 truncate mt-0.5">{notif.message}</p>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      {!notif.read && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full" />
                      )}
                      <button
                        onClick={(e) => deleteNotif(e, notif.id)}
                        className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all text-base leading-none"
                        title="Supprimer"
                      >
                        ×
                      </button>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Footer */}
          {filtered.length > 0 && (
            <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50">
              <button
                onClick={() => { onNavigate?.('reports'); setOpen(false); }}
                className="w-full text-center text-xs text-emerald-600 hover:text-emerald-700 font-medium"
              >
                Voir tous les signalements →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
// components/LiveFeed.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Flux d'événements en temps réel pour le dashboard ReMine
// S'intègre dans l'onglet Aperçu, sous les stats principales
// Utilise useSocket pour recevoir les événements en direct
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSocket } from '../hooks/useSocket';

// ─── Config événements ────────────────────────────────────────────────────────

const EVENT_CONFIG = {
  new_report: {
    icon:    '📋',
    label:   'Nouveau signalement',
    color:   'border-blue-400',
    bg:      'bg-blue-50',
    badge:   'bg-blue-500',
    text:    'text-blue-700',
    pulse:   'bg-blue-400',
  },
  status_changed: {
    icon:    '🔄',
    label:   'Statut modifié',
    color:   'border-amber-400',
    bg:      'bg-amber-50',
    badge:   'bg-amber-500',
    text:    'text-amber-700',
    pulse:   'bg-amber-400',
  },
  new_comment: {
    icon:    '💬',
    label:   'Nouveau commentaire',
    color:   'border-purple-400',
    bg:      'bg-purple-50',
    badge:   'bg-purple-500',
    text:    'text-purple-700',
    pulse:   'bg-purple-400',
  },
  new_user: {
    icon:    '👤',
    label:   'Nouveau citoyen',
    color:   'border-emerald-400',
    bg:      'bg-emerald-50',
    badge:   'bg-emerald-500',
    text:    'text-emerald-700',
    pulse:   'bg-emerald-400',
  },
  resolved: {
    icon:    '✅',
    label:   'Signalement résolu',
    color:   'border-green-400',
    bg:      'bg-green-50',
    badge:   'bg-green-500',
    text:    'text-green-700',
    pulse:   'bg-green-400',
  },
  critical: {
    icon:    '🚨',
    label:   'Alerte critique',
    color:   'border-red-400',
    bg:      'bg-red-50',
    badge:   'bg-red-500',
    text:    'text-red-700',
    pulse:   'bg-red-400',
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
  water_pollution:    '💧 Pollution eau',
  dust:               '🌫️ Poussière',
  waste_deposit:      '🗑️ Dépôt déchets',
  abandoned_site:     '🏚️ Site abandonné',
  air_pollution:      '💨 Pollution air',
  soil_contamination: '🟤 Contamination sol',
  noise_pollution:    '🔊 Bruit',
  other:              '⚠️ Autre',
};

function timeAgo(date) {
  const diff = Date.now() - new Date(date).getTime();
  const s = Math.floor(diff / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (s < 10)  return 'À l\'instant';
  if (s < 60)  return `Il y a ${s}s`;
  if (m < 60)  return `Il y a ${m}min`;
  return `Il y a ${h}h`;
}

// ─── Élément du flux ──────────────────────────────────────────────────────────

function FeedItem({ event, isNew }) {
  const [visible, setVisible] = useState(false);
  const cfg = EVENT_CONFIG[event.type] || EVENT_CONFIG.new_report;

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-xl border-l-4 ${cfg.color} ${cfg.bg} transition-all duration-500
        ${visible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'}`}
    >
      {/* Icône avec ping si nouveau */}
      <div className="relative flex-shrink-0">
        <div className="w-9 h-9 rounded-xl bg-white shadow-sm flex items-center justify-center text-lg">
          {cfg.icon}
        </div>
        {isNew && (
          <span className={`absolute -top-1 -right-1 w-3 h-3 ${cfg.pulse} rounded-full`}>
            <span className={`absolute inset-0 ${cfg.pulse} rounded-full animate-ping opacity-75`} />
          </span>
        )}
      </div>

      {/* Contenu */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className={`text-xs font-bold ${cfg.text}`}>{cfg.label}</span>
          <span className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0">{timeAgo(event.date)}</span>
        </div>
        <p className="text-sm text-gray-700 font-medium mt-0.5 truncate">{event.title}</p>
        {event.subtitle && (
          <p className="text-xs text-gray-500 truncate">{event.subtitle}</p>
        )}
      </div>
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────

export function LiveFeed({ reports = [], onNavigate }) {
  const [events,   setEvents]   = useState([]);
  const [paused,   setPaused]   = useState(false);
  const [newIds,   setNewIds]   = useState(new Set());
  const [filter,   setFilter]   = useState('all');
  const [isLive,   setIsLive]   = useState(true);
  const listRef = useRef(null);
  const pausedRef = useRef(false);

  pausedRef.current = paused;

  // ── Construire les événements depuis les signalements existants ──────────────

  useEffect(() => {
    if (!reports.length) return;

    const evts = reports
      .slice(0, 30)
      .map(r => {
        const id  = r._id || r.id;
        const loc = r.location?.address || 'Zone inconnue';
        const typ = TYPE_LABELS[r.type] || r.type || 'Signalement';

        let type = 'new_report';
        if (r.status === 'resolved' || r.status === 'verified') type = 'resolved';
        if (r.status === 'in_progress') type = 'status_changed';
        if (r.severity === 'critical' && r.status !== 'resolved') type = 'critical';

        return {
          id:       `init_${id}`,
          type,
          title:    `${typ} — ${loc}`,
          subtitle: r.description ? r.description.slice(0, 60) + '…' : null,
          date:     r.updatedAt || r.createdAt || new Date().toISOString(),
          reportId: id,
          isNew:    false,
        };
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    setEvents(evts);
  }, [reports]);

  // ── Ajouter un événement temps réel ──────────────────────────────────────────

  const addEvent = useCallback((evt) => {
    if (pausedRef.current) return;
    const id = `rt_${Date.now()}_${Math.random()}`;
    const newEvt = { ...evt, id, isNew: true, date: new Date().toISOString() };

    setEvents(prev => [newEvt, ...prev].slice(0, 50));
    setNewIds(prev => new Set([...prev, id]));

    // Retirer le marqueur "nouveau" après 5s
    setTimeout(() => {
      setNewIds(prev => { const s = new Set(prev); s.delete(id); return s; });
    }, 5000);
  }, []);

  // ── Socket temps réel ─────────────────────────────────────────────────────────

  useSocket({
    enabled: true,
    onNewReport: useCallback((data) => {
      setIsLive(true);
      addEvent({
        type:     'new_report',
        title:    `${TYPE_LABELS[data?.type] || 'Signalement'} — ${data?.location?.address || 'Localisation inconnue'}`,
        subtitle: data?.description?.slice(0, 60) || null,
        reportId: data?._id || data?.id,
      });
    }, [addEvent]),
    onReportUpdated: useCallback((data) => {
      setIsLive(true);
      const status = data?.status;
      addEvent({
        type:     status === 'resolved' ? 'resolved' : 'status_changed',
        title:    `Statut → ${STATUS_LABELS[status] || status}`,
        subtitle: data?.location?.address || null,
        reportId: data?._id || data?.id,
      });
    }, [addEvent]),
    onNewComment: useCallback((data) => {
      setIsLive(true);
      addEvent({
        type:     'new_comment',
        title:    'Commentaire citoyen',
        subtitle: data?.content?.slice(0, 60) || null,
        reportId: data?.reportId,
      });
    }, [addEvent]),
    onReportDeleted: useCallback(() => {}, []),
  });

  // ── Filtrage ──────────────────────────────────────────────────────────────────

  const filtered = filter === 'all'
    ? events
    : events.filter(e => e.type === filter);

  const types = ['all', 'new_report', 'status_changed', 'new_comment', 'resolved', 'critical'];
  const filterLabels = {
    all:            'Tout',
    new_report:     '📋',
    status_changed: '🔄',
    new_comment:    '💬',
    resolved:       '✅',
    critical:       '🚨',
  };

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 bg-gray-50">
        <div className="flex items-center gap-2.5">
          {/* Indicateur live */}
          <div className="relative flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${isLive ? 'bg-emerald-500' : 'bg-gray-300'}`}>
              {isLive && <span className="absolute inset-0 bg-emerald-500 rounded-full animate-ping opacity-60" />}
            </span>
            <span className={`text-xs font-bold ${isLive ? 'text-emerald-600' : 'text-gray-400'}`}>
              {isLive ? 'LIVE' : 'OFFLINE'}
            </span>
          </div>
          <span className="text-sm font-semibold text-gray-800">Flux en temps réel</span>
          {events.filter(e => newIds.has(e.id)).length > 0 && (
            <span className="bg-blue-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full animate-pulse">
              {events.filter(e => newIds.has(e.id)).length} nouveau{events.filter(e => newIds.has(e.id)).length > 1 ? 'x' : ''}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Pause/Resume */}
          <button
            onClick={() => setPaused(p => !p)}
            className={`text-xs font-medium px-2.5 py-1 rounded-lg transition-colors ${
              paused
                ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {paused ? '▶ Reprendre' : '⏸ Pause'}
          </button>

          {/* Effacer */}
          <button
            onClick={() => setEvents([])}
            className="text-xs text-gray-400 hover:text-red-500 transition-colors px-2 py-1 rounded-lg hover:bg-red-50"
          >
            Effacer
          </button>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex gap-1.5 px-4 py-2.5 border-b border-gray-50 overflow-x-auto">
        {types.map(t => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`flex-shrink-0 text-xs font-semibold px-3 py-1 rounded-full transition-colors ${
              filter === t
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            {filterLabels[t]}
            {t === 'all' && ` (${events.length})`}
          </button>
        ))}
      </div>

      {/* Liste événements */}
      <div
        ref={listRef}
        className="overflow-y-auto p-3 space-y-2"
        style={{ maxHeight: 340 }}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {paused && (
          <div className="text-center py-2 bg-amber-50 rounded-lg border border-amber-100 text-xs text-amber-600 font-medium">
            ⏸ Flux en pause — passez la souris hors du flux pour reprendre
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="text-center py-10">
            <div className="text-4xl mb-3">📡</div>
            <p className="text-gray-400 text-sm font-medium">En attente d'événements…</p>
            <p className="text-gray-300 text-xs mt-1">Les nouvelles activités apparaîtront ici en temps réel</p>
          </div>
        ) : (
          filtered.map(evt => (
            <div
              key={evt.id}
              onClick={() => { if (evt.reportId) onNavigate?.('reports', evt.reportId); }}
              className={evt.reportId ? 'cursor-pointer' : ''}
            >
              <FeedItem event={evt} isNew={newIds.has(evt.id)} />
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2.5 border-t border-gray-50 bg-gray-50 flex items-center justify-between">
        <span className="text-xs text-gray-400">
          {filtered.length} événement{filtered.length > 1 ? 's' : ''}
          {paused ? ' · En pause' : ' · Mise à jour auto'}
        </span>
        <button
          onClick={() => onNavigate?.('reports')}
          className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold"
        >
          Voir tous les signalements →
        </button>
      </div>
    </div>
  );
}
// components/DeletionLogs.jsx — Journal d'audit des suppressions
import React, { useState, useEffect, useCallback } from 'react';
import { ExportPDFModal } from './ExportPDF';
import { ActionHistory }  from './ActionHistory';
import { dashboardAPI } from '../services/api';

const TYPE_LABELS = {
  water_pollution:    { icon: '💧', label: 'Pollution eau' },
  air_pollution:      { icon: '💨', label: 'Pollution air' },
  soil_contamination: { icon: '🟤', label: 'Contamination sol' },
  waste_deposit:      { icon: '🗑️', label: 'Dépôt déchets' },
  dust:               { icon: '🌫️', label: 'Poussière' },
  abandoned_site:     { icon: '🏚️', label: 'Site abandonné' },
  noise_pollution:    { icon: '🔊', label: 'Pollution sonore' },
  other:              { icon: '⚠️', label: 'Autre' },
};

const SEVERITY_COLORS = {
  low:      'bg-green-100 text-green-700',
  medium:   'bg-yellow-100 text-yellow-700',
  high:     'bg-red-100 text-red-700',
  critical: 'bg-red-200 text-red-900 font-bold',
};

const STATUS_COLORS = {
  new:         'text-yellow-600',
  verified:    'text-blue-600',
  in_progress: 'text-purple-600',
  resolved:    'text-green-600',
  rejected:    'text-red-600',
};

const STATUS_LABELS = {
  new: 'Nouveau', verified: 'Vérifié', in_progress: 'En cours',
  resolved: 'Résolu', rejected: 'Rejeté',
};

const formatDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleString('fr-FR', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

// Modal détail d'une suppression
const LogDetailModal = ({ log, onClose }) => {
  if (!log) return null;
  const typeCfg = TYPE_LABELS[log.reportType] || { icon: '⚠️', label: log.reportType };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
         onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
           onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-red-50 border-b border-red-100 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-red-100 rounded-full flex items-center justify-center text-lg">🗑️</div>
            <div>
              <h3 className="font-bold text-gray-900">Détail de suppression</h3>
              <p className="text-xs text-gray-500 font-mono">Log #{String(log._id).slice(-8)}</p>
            </div>
          </div>
          <button onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 text-xl font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">
            ✕
          </button>
        </div>

        <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Signalement supprimé */}
          <section>
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Signalement supprimé</h4>
            <div className="bg-gray-50 rounded-xl p-4 space-y-2 border border-gray-100">
              <div className="flex items-center gap-2">
                <span className="text-lg">{typeCfg.icon}</span>
                <span className="font-semibold text-gray-800">{typeCfg.label}</span>
                {log.reportSeverity && (
                  <span className={`text-xs px-2 py-0.5 rounded-full ${SEVERITY_COLORS[log.reportSeverity] || ''}`}>
                    {log.reportSeverity}
                  </span>
                )}
                {log.reportStatus && (
                  <span className={`text-xs font-medium ${STATUS_COLORS[log.reportStatus] || 'text-gray-500'}`}>
                    · {STATUS_LABELS[log.reportStatus] || log.reportStatus}
                  </span>
                )}
              </div>
              {log.reportDescription && (
                <p className="text-sm text-gray-700 leading-relaxed">{log.reportDescription}</p>
              )}
              {log.reportLocation?.address && (
                <p className="text-xs text-gray-500">📍 {log.reportLocation.address}</p>
              )}
              <p className="text-xs text-gray-400 font-mono">ID original : {log.reportId}</p>
              {log.reportCreatedAt && (
                <p className="text-xs text-gray-400">Créé le : {formatDate(log.reportCreatedAt)}</p>
              )}
            </div>
          </section>

          {/* Citoyen */}
          {log.citizenName && (
            <section>
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Citoyen</h4>
              <div className="bg-blue-50 rounded-xl p-3 border border-blue-100 flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm">👤</div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{log.citizenName}</p>
                  {log.citizenEmail && <p className="text-xs text-gray-500">{log.citizenEmail}</p>}
                </div>
              </div>
            </section>
          )}

          {/* Auteur de la suppression */}
          <section>
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Supprimé par</h4>
            <div className="bg-red-50 rounded-xl p-3 border border-red-100 flex items-center gap-3">
              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center text-sm">🛡️</div>
              <div>
                <p className="text-sm font-semibold text-gray-800">
                  {log.deletedBy?.firstName} {log.deletedBy?.lastName}
                  <span className="ml-1 text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">
                    {log.deletedBy?.role}
                  </span>
                </p>
                <p className="text-xs text-gray-500">{log.deletedBy?.email}</p>
              </div>
            </div>
          </section>

          {/* Raison + date */}
          <section>
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Contexte</h4>
            <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 space-y-2">
              <div>
                <span className="text-xs text-gray-400">Date de suppression :</span>
                <span className="text-sm font-medium text-gray-800 ml-2">{formatDate(log.deletedAt)}</span>
              </div>
              {log.ipAddress && (
                <div>
                  <span className="text-xs text-gray-400">IP :</span>
                  <span className="text-xs font-mono text-gray-600 ml-2">{log.ipAddress}</span>
                </div>
              )}
              <div>
                <span className="text-xs text-gray-400">Raison :</span>
                <p className="text-sm text-gray-800 mt-1 italic">
                  {log.reason?.trim() || <span className="text-gray-400 not-italic">Aucune raison renseignée</span>}
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

// ==================== COMPOSANT PRINCIPAL ====================

export function DeletionLogs() {
  const [logs, setLogs]           = useState([]);
  const [stats, setStats]         = useState([]);
  const [total, setTotal]         = useState(0);
  const [loading, setLoading]     = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [filters, setFilters]     = useState({ page: 1, limit: 20, dateFrom: '', dateTo: '', adminId: '' });
  const [showPDF, setShowPDF]     = useState(false);
  const [activeView, setActiveView] = useState('deletions'); // 'deletions' | 'actions'

  const loadLogs = useCallback(async (f = filters) => {
    setLoading(true);
    try {
      const params = { page: f.page, limit: f.limit };
      if (f.dateFrom) params.dateFrom = f.dateFrom;
      if (f.dateTo)   params.dateTo   = f.dateTo;
      if (f.adminId)  params.adminId  = f.adminId;

      const res = await dashboardAPI.getDeletionLogs(params);
      if (res?.success) {
        setLogs(res.data?.logs || []);
        setTotal(res.data?.total || 0);
        setStats(res.data?.stats || []);
      }
    } catch (e) {
      console.error('Erreur chargement logs:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadLogs(); }, []);

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value, page: 1 };
    setFilters(newFilters);
    loadLogs(newFilters);
  };

  const handleExport = () => {
    const SEP = ';';
    // Chaque cellule entre guillemets pour Excel (gère les virgules, sauts de ligne, etc.)
    const cell = (v) => {
      if (v === null || v === undefined) return '""';
      const s = String(v).replace(/"/g, '""').replace(/\r?\n/g, ' ');
      return `"${s}"`;
    };

    const headers = [
      'Date de suppression', 'Nom administrateur', 'Email administrateur', 'Rôle',
      'Type de signalement', 'Sévérité', 'Statut initial', 'Nom du citoyen',
      'Email du citoyen', 'Adresse du signalement', 'Raison de suppression',
      'ID original du signalement', 'Adresse IP',
    ].map(h => cell(h)).join(SEP);

    const rows = logs.map(l => [
      cell(formatDate(l.deletedAt)),
      cell(`${l.deletedBy?.firstName || ''} ${l.deletedBy?.lastName || ''}`.trim()),
      cell(l.deletedBy?.email   || ''),
      cell(l.deletedBy?.role    || ''),
      cell(TYPE_LABELS[l.reportType]?.label || l.reportType || ''),
      cell(l.reportSeverity ? { low:'Faible', medium:'Moyen', high:'Élevé', critical:'Critique' }[l.reportSeverity] || l.reportSeverity : ''),
      cell(l.reportStatus   ? STATUS_LABELS[l.reportStatus] || l.reportStatus : ''),
      cell(l.citizenName    || ''),
      cell(l.citizenEmail   || ''),
      cell(l.reportLocation?.address || ''),
      cell(l.reason         || ''),
      cell(l.reportId       || ''),
      cell(l.ipAddress      || ''),
    ].join(SEP));

    const bom  = '\uFEFF'; // BOM UTF-8 pour Excel
    const csv  = bom + [headers, ...rows].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `journal-suppressions-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalPages = Math.ceil(total / filters.limit);

  return (
    <>
      {selectedLog && <LogDetailModal log={selectedLog} onClose={() => setSelectedLog(null)} />}
      {showPDF && (
        <ExportPDFModal
          onClose={() => setShowPDF(false)}
          reports={[]}
          deletionLogs={logs}
          deletionStats={stats}
        />
      )}

      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              🗑️ Journal des suppressions
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Traçabilité complète de toutes les suppressions de signalements
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => loadLogs()} disabled={loading}
                    className="px-3 py-1.5 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1.5">
              <span className={loading ? 'animate-spin inline-block' : ''}>↻</span> Actualiser
            </button>
            <button onClick={handleExport} disabled={!logs.length}
                    className="px-3 py-1.5 text-sm text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5">
              📥 CSV
            </button>
            <button onClick={() => setShowPDF(true)} disabled={!logs.length}
                    className="px-3 py-1.5 text-sm text-white bg-slate-700 hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5">
              📄 PDF
            </button>
          </div>
        </div>

        {/* Stats par admin */}
        {stats.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-600 mb-3 flex items-center gap-2">
              <span className="w-6 h-6 bg-red-100 text-red-600 rounded-lg flex items-center justify-center text-xs">📊</span>
              Suppressions par administrateur
            </h3>
            <div className="flex flex-wrap gap-3">
              {stats.map((s, i) => (
                <div key={i}
                     onClick={() => handleFilterChange('adminId', s._id === filters.adminId ? '' : s._id)}
                     className={`flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer transition-all text-sm
                       ${filters.adminId === s._id
                         ? 'bg-red-50 border-red-200 text-red-700'
                         : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'}`}>
                  <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center text-xs font-bold text-red-600">
                    {(s.name?.trim() || s._id || '?')[0].toUpperCase()}
                  </div>
                  <div>
                    <span className="font-medium">{s.name?.trim() || s._id}</span>
                    <span className="ml-1.5 text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-bold">
                      {s.count}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400 hidden sm:inline">· dernier {formatDate(s.last)}</span>
                </div>
              ))}
              {filters.adminId && (
                <button onClick={() => handleFilterChange('adminId', '')}
                        className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1">
                  ✕ Tout voir
                </button>
              )}
            </div>
          </div>
        )}

        {/* Filtres dates */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-gray-600">Filtrer par date :</span>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-400">Du</label>
            <input type="date" value={filters.dateFrom}
                   onChange={e => handleFilterChange('dateFrom', e.target.value)}
                   className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-400" />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-400">Au</label>
            <input type="date" value={filters.dateTo}
                   onChange={e => handleFilterChange('dateTo', e.target.value)}
                   className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-400" />
          </div>
          {(filters.dateFrom || filters.dateTo) && (
            <button onClick={() => { handleFilterChange('dateFrom', ''); handleFilterChange('dateTo', ''); }}
                    className="text-xs text-gray-400 hover:text-gray-600">✕ Effacer</button>
          )}
          <span className="ml-auto text-sm text-gray-500 font-medium">
            {total} suppression{total > 1 ? 's' : ''} au total
          </span>
        </div>

        {/* Tableau */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16 gap-3">
              <div className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-gray-500 text-sm">Chargement du journal…</span>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-5xl mb-3">🗑️</div>
              <p className="font-semibold text-gray-600">Aucune suppression enregistrée</p>
              <p className="text-sm text-gray-400 mt-1">Les suppressions de signalements apparaîtront ici</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead>
                  <tr className="bg-gray-50">
                    {['Date suppression', 'Supprimé par', 'Signalement', 'Citoyen', 'Raison', 'Détail'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {logs.map(log => {
                    const typeCfg = TYPE_LABELS[log.reportType] || { icon: '⚠️', label: log.reportType };
                    return (
                      <tr key={log._id} className="hover:bg-red-50/30 transition-colors">
                        {/* Date */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm text-gray-800 font-medium">{formatDate(log.deletedAt)}</div>
                          {log.ipAddress && (
                            <div className="text-xs text-gray-400 font-mono">{log.ipAddress}</div>
                          )}
                        </td>

                        {/* Admin */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 bg-red-100 rounded-full flex items-center justify-center text-xs font-bold text-red-600 flex-shrink-0">
                              {(log.deletedBy?.firstName || log.deletedBy?.email || '?')[0].toUpperCase()}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-800">
                                {log.deletedBy?.firstName} {log.deletedBy?.lastName}
                              </div>
                              <div className="text-xs text-gray-400">{log.deletedBy?.email}</div>
                              <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">
                                {log.deletedBy?.role}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Signalement */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span>{typeCfg.icon}</span>
                            <span className="text-sm font-medium text-gray-800">{typeCfg.label}</span>
                            {log.reportSeverity && (
                              <span className={`text-xs px-1.5 py-0.5 rounded-full ${SEVERITY_COLORS[log.reportSeverity] || 'bg-gray-100 text-gray-600'}`}>
                                {log.reportSeverity}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 max-w-[220px] truncate">
                            {log.reportDescription || '—'}
                          </p>
                          {log.reportLocation?.address && (
                            <p className="text-xs text-gray-400 mt-0.5">📍 {log.reportLocation.address}</p>
                          )}
                          <p className="text-xs text-gray-300 font-mono mt-0.5">
                            #{String(log.reportId).slice(-8)}
                          </p>
                        </td>

                        {/* Citoyen */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          {log.citizenName ? (
                            <>
                              <div className="text-sm text-gray-800">{log.citizenName}</div>
                              <div className="text-xs text-gray-400">{log.citizenEmail}</div>
                            </>
                          ) : (
                            <span className="text-xs text-gray-300 italic">Non renseigné</span>
                          )}
                        </td>

                        {/* Raison */}
                        <td className="px-4 py-3 max-w-[160px]">
                          {log.reason?.trim() ? (
                            <p className="text-xs text-gray-700 italic line-clamp-2">"{log.reason}"</p>
                          ) : (
                            <span className="text-xs text-gray-300 italic">Aucune raison</span>
                          )}
                        </td>

                        {/* Voir détail */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <button
                            onClick={() => setSelectedLog(log)}
                            className="text-xs px-2.5 py-1.5 text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors font-medium"
                          >
                            Voir →
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="border-t border-gray-100 px-4 py-3 flex items-center justify-between">
              <span className="text-sm text-gray-500">
                Page {filters.page} / {totalPages} · {total} entrée{total > 1 ? 's' : ''}
              </span>
              <div className="flex gap-2">
                <button
                  disabled={filters.page <= 1}
                  onClick={() => handleFilterChange('page', filters.page - 1)}
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
                  ← Précédent
                </button>
                <button
                  disabled={filters.page >= totalPages}
                  onClick={() => handleFilterChange('page', filters.page + 1)}
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
                  Suivant →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
    )}

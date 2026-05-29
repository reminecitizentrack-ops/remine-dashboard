// components/ReportsTable.jsx — VERSION COMPLÈTE
// Corrections : searchReports, WebSocket temps réel, panneau détail, sévérité critical
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { TagEditor } from './TagsManager';
import { AdvancedFilters } from './AdvancedFilters';
import { dashboardAPI } from '../services/api';
import { VotesPanel } from './VotesPanel';

// ==================== CONSTANTES ====================

const STATUS_CONFIG = {
  new:         { label: 'Nouveau',    color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  pending:     { label: 'En attente', color: 'bg-orange-100 text-orange-800 border-orange-200' },
  verified:    { label: 'Vérifié',    color: 'bg-blue-100 text-blue-800 border-blue-200' },
  in_progress: { label: 'En cours',   color: 'bg-purple-100 text-purple-800 border-purple-200' },
  resolved:    { label: 'Résolu',     color: 'bg-green-100 text-green-800 border-green-200' },
  rejected:    { label: 'Rejeté',     color: 'bg-red-100 text-red-800 border-red-200' },
};

const SEVERITY_CONFIG = {
  low:      { label: 'Faible',   color: 'bg-green-100 text-green-800',   dot: 'bg-green-500' },
  medium:   { label: 'Moyen',    color: 'bg-yellow-100 text-yellow-800', dot: 'bg-yellow-500' },
  high:     { label: 'Élevé',    color: 'bg-red-100 text-red-800',       dot: 'bg-red-500' },
  critical: { label: 'Critique', color: 'bg-red-200 text-red-900 font-bold', dot: 'bg-red-700' },
};

const TYPE_CONFIG = {
  water_pollution:    { icon: '💧', label: 'Pollution eau' },
  air_pollution:      { icon: '💨', label: 'Pollution air' },
  soil_contamination: { icon: '🟤', label: 'Contamination sol' },
  waste_deposit:      { icon: '🗑️', label: 'Dépôt déchets' },
  dust:               { icon: '🌫️', label: 'Poussière' },
  abandoned_site:     { icon: '🏚️', label: 'Site abandonné' },
  noise_pollution:    { icon: '🔊', label: 'Pollution sonore' },
  mining_waste:       { icon: '⛏️', label: 'Déchets miniers' },
  industrial_waste:   { icon: '🏭', label: 'Déchets industriels' },
  illegal_dumping:    { icon: '🚯', label: 'Dépôt sauvage' },
  other:              { icon: '⚠️', label: 'Autre' },
};

// ==================== UTILITAIRES ====================

const getDisplayId   = (r) => r?.id || r?._id || 'N/A';
const getTypeConfig  = (type) => TYPE_CONFIG[type] || { icon: '📍', label: type?.replace('_', ' ') || 'Inconnu' };
const getStatusCfg   = (s) => STATUS_CONFIG[s] || STATUS_CONFIG.new;
const getSeverityCfg = (s) => SEVERITY_CONFIG[s] || SEVERITY_CONFIG.medium;

const getCitizenName = (report) => {
  const c = report?.citizen;
  if (c && typeof c === 'object') {
    if (c.firstName || c.lastName) return `${c.firstName || ''} ${c.lastName || ''}`.trim();
    if (c.email) return c.email;
  }
  if (typeof c === 'string') return c;
  return report?.userName || 'Anonyme';
};

const getCitizenInfo = (report) => {
  const c = report?.citizen;
  if (c && typeof c === 'object') {
    return {
      name:      `${c.firstName || ''} ${c.lastName || ''}`.trim() || 'Nom non disponible',
      email:     c.email     || 'Email non disponible',
      community: c.community || 'Communauté non spécifiée',
      phone:     c.phone     || 'Non renseigné',
    };
  }
  return null;
};

const getLocationInfo = (report) => {
  const loc = report?.location;
  let address = 'Localisation inconnue';
  let lat = null, lng = null;

  if (typeof loc === 'string') {
    address = loc;
  } else if (loc?.address) {
    address = loc.address;
    lat = loc.latitude;
    lng = loc.longitude;
  } else if (report?.address) {
    address = report.address;
  }

  if (!lat && report?.latitude)  lat = report.latitude;
  if (!lng && report?.longitude) lng = report.longitude;

  return { address, lat, lng, city: loc?.city, region: loc?.region };
};

const getImages = (report) => {
  const raw = report?.images || report?.photos || (report?.image ? [report.image] : []);
  return raw.map(img => (typeof img === 'string' ? img : img?.url || img?.path)).filter(Boolean);
};

const formatDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

// ==================== SOUS-COMPOSANTS ====================

const Badge = ({ config }) => (
  <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full border ${config.color}`}>
    {config.dot && <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />}
    {config.label}
  </span>
);

const ImageGallery = ({ images, onSelect }) => {
  if (!images.length) return <span className="text-xs text-gray-400 italic">Aucune photo</span>;
  return (
    <div className="flex gap-1">
      {images.slice(0, 3).map((img, i) => (
        <div key={i} className="relative w-10 h-10 flex-shrink-0">
          <img
            src={img}
            alt=""
            className="w-10 h-10 object-cover rounded border border-gray-200 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => onSelect(img)}
            onError={e => { e.target.style.display = 'none'; }}
          />
          {images.length > 3 && i === 2 && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded text-white text-xs font-bold">
              +{images.length - 3}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

const ImageModal = ({ image, onClose }) => {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!image) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4"
         onClick={onClose}>
      <div className="relative max-w-4xl max-h-full" onClick={e => e.stopPropagation()}>
        <button onClick={onClose}
                className="absolute -top-10 right-0 text-white text-2xl hover:text-gray-300 font-bold">✕</button>
        <img src={image} alt="Signalement" className="max-w-full max-h-screen object-contain rounded-lg shadow-2xl" />
      </div>
    </div>
  );
};

// ==================== SÉLECTEUR D'AGENT (avec recherche) ====================

const AgentSelector = ({ reportId, currentAgent, onAssign }) => {
  const [agents, setAgents]     = useState([]);
  const [loading, setLoading]   = useState(false);
  const [assigning, setAssign]  = useState(false);
  const [open, setOpen]         = useState(false);
  const [search, setSearch]     = useState('');

  // Nom affiché de l'agent courant
  const currentName = currentAgent && typeof currentAgent === 'object'
    ? `${currentAgent.firstName || ''} ${currentAgent.lastName || ''}`.trim() || currentAgent.email
    : null;

  // Charger les agents à l'ouverture (une seule fois, cache)
  useEffect(() => {
    if (!open || agents.length > 0) return;
    setLoading(true);
    dashboardAPI.getUsers()
      .then(res => {
        const arr = Array.isArray(res) ? res
          : Array.isArray(res?.data) ? res.data
          : [];
        setAgents(arr.filter(u => ['admin', 'moderator'].includes(u.role)));
      })
      .catch(() => setAgents([]))
      .finally(() => setLoading(false));
  }, [open]);

  // Filtrer selon la recherche
  const filtered = agents.filter(a => {
    const name = `${a.firstName || ''} ${a.lastName || ''} ${a.email || ''}`.toLowerCase();
    return name.includes(search.toLowerCase());
  });

  const handleAssign = async (agentId, agentName) => {
    setAssign(true);
    try {
      await dashboardAPI.updateReportStatus(reportId, null, '', agentId || null);
      onAssign(agentId, agentName);
      setOpen(false);
      setSearch('');
    } catch (e) {
      console.error("Erreur assignation:", e);
    } finally {
      setAssign(false);
    }
  };

  return (
    <div className="relative">
      {/* Bouton principal */}
      <button
        onClick={() => setOpen(o => !o)}
        disabled={assigning}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border text-sm transition-all ${
          currentName
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          {currentName ? (
            <>
              <div className="w-6 h-6 bg-emerald-200 text-emerald-800 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                {currentName[0]?.toUpperCase() || '?'}
              </div>
              <span className="font-semibold truncate">{currentName}</span>
              <span className="text-emerald-500 text-xs flex-shrink-0">✓ Assigné</span>
            </>
          ) : (
            <>
              <span className="text-base flex-shrink-0">👤</span>
              <span className="italic text-gray-400">Non assigné — cliquez pour assigner</span>
            </>
          )}
        </div>
        {assigning ? (
          <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
        ) : (
          <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => { setOpen(false); setSearch(''); }} />
          <div className="absolute left-0 right-0 top-12 z-40 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden">

            {/* Recherche */}
            <div className="p-2 border-b border-gray-100">
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
                <input
                  autoFocus
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Rechercher un agent…"
                  className="w-full text-sm pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="max-h-52 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-5 gap-2 text-sm text-gray-400">
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-emerald-500 rounded-full animate-spin" />
                  Chargement des agents…
                </div>
              ) : filtered.length === 0 ? (
                <p className="text-sm text-gray-400 italic text-center px-4 py-4">
                  {search ? `Aucun agent pour "${search}"` : 'Aucun agent disponible'}
                </p>
              ) : (
                <>
                  {/* Option retirer */}
                  {currentName && (
                    <button
                      onClick={() => handleAssign('', 'Non assigné')}
                      disabled={assigning}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors text-left border-b border-gray-50"
                    >
                      <div className="w-7 h-7 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 text-xs">✕</div>
                      <span className="font-medium">Retirer l'assignation</span>
                    </button>
                  )}

                  {/* Liste agents */}
                  {filtered.map(agent => {
                    const name  = `${agent.firstName || ''} ${agent.lastName || ''}`.trim() || agent.email;
                    const curId = currentAgent?._id || currentAgent?.id || (typeof currentAgent === 'string' ? currentAgent : '');
                    const aId   = agent._id || agent.id;
                    const isCur = curId === aId;
                    return (
                      <button
                        key={aId}
                        onClick={() => !isCur && handleAssign(aId, name)}
                        disabled={assigning || isCur}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors text-left ${
                          isCur
                            ? 'bg-emerald-50 cursor-default'
                            : 'hover:bg-gray-50 text-gray-700'
                        }`}
                      >
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                          isCur ? 'bg-emerald-200 text-emerald-800' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {name[0]?.toUpperCase() || '?'}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`font-medium truncate ${isCur ? 'text-emerald-700' : 'text-gray-800'}`}>{name}</p>
                          <p className="text-xs text-gray-400 truncate">{agent.email}</p>
                          <span className={`inline-block text-xs px-1.5 py-0.5 rounded-full mt-0.5 ${
                            agent.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {agent.role === 'admin' ? 'Admin' : 'Modérateur'}
                          </span>
                        </div>
                        {isCur && (
                          <span className="text-emerald-600 font-bold text-xs flex-shrink-0">✓</span>
                        )}
                      </button>
                    );
                  })}
                </>
              )}
            </div>

            {/* Footer stats */}
            {!loading && agents.length > 0 && (
              <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 text-xs text-gray-400">
                {agents.length} agent{agents.length > 1 ? 's' : ''} disponible{agents.length > 1 ? 's' : ''}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

// Panneau de détail d'un signalement
const ReportDetailPanel = ({ report, onClose, onStatusChange, updating, onDeleteRequest }) => {
  const [note, setNote]                   = useState('');
  const [selectedAgent, setSelectedAgent] = useState(
    report?.processing?.assignedTo?._id || report?.processing?.assignedTo || ''
  );
  const [selectedImg, setSelectedImg] = useState(null);

  if (!report) return null;

  const citizen  = getCitizenInfo(report);
  const location = getLocationInfo(report);
  const images   = getImages(report);
  const typeCfg  = getTypeConfig(report.type);

  const handleStatus = (status) => {
    onStatusChange(getDisplayId(report), status, note, selectedAgent);
    setNote('');
  };

  return (
    <>
      <ImageModal image={selectedImg} onClose={() => setSelectedImg(null)} />
      {/* Overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-40 z-30" onClick={onClose} />

      {/* Panneau latéral */}
      <div className="fixed right-0 top-0 h-full w-full max-w-lg bg-white shadow-2xl z-40 overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{typeCfg.icon}</span>
            <div>
              <h3 className="font-semibold text-gray-900">{typeCfg.label}</h3>
              <p className="text-xs text-gray-500 font-mono">#{getDisplayId(report).slice(-8)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { onClose(); onDeleteRequest(); }}
              className="px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors flex items-center gap-1.5"
              title="Supprimer ce signalement"
            >
              🗑️ Supprimer
            </button>
            <button onClick={onClose}
                    className="text-gray-400 hover:text-gray-600 text-xl font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">
              ✕
            </button>
          </div>
        </div>

        <div className="flex-1 px-6 py-4 space-y-6">
          {/* Statut + Sévérité */}
          <div className="flex gap-3 flex-wrap">
            <Badge config={getStatusCfg(report.status)} />
            <Badge config={getSeverityCfg(report.severity)} />
            {report.isVerified && (
              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-teal-100 text-teal-800 border border-teal-200">
                ✓ Vérifié IA
              </span>
            )}
          </div>

          {/* Description */}
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Description</h4>
            <p className="text-sm text-gray-800 leading-relaxed bg-gray-50 rounded-lg p-3">
              {report.description || 'Aucune description'}
            </p>
          </div>

          {/* Localisation */}
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">📍 Localisation</h4>
            <div className="bg-gray-50 rounded-lg p-3 space-y-1">
              <p className="text-sm text-gray-800 font-medium">{location.address}</p>
              {location.city && <p className="text-xs text-gray-500">{location.city}{location.region ? `, ${location.region}` : ''}</p>}
              {location.lat && location.lng && (
                <p className="text-xs text-gray-400 font-mono">
                  {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                </p>
              )}
              {location.lat && location.lng && (
                <a href={`https://maps.google.com/?q=${location.lat},${location.lng}`}
                   target="_blank" rel="noreferrer"
                   className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mt-1">
                  🗺️ Voir sur Google Maps
                </a>
              )}
            </div>
          </div>

          {/* Photos */}
          {images.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                📷 Photos ({images.length})
              </h4>
              <div className="grid grid-cols-3 gap-2">
                {images.map((img, i) => (
                  <img key={i} src={img} alt=""
                       className="w-full h-24 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-80 transition-opacity"
                       onClick={() => setSelectedImg(img)}
                       onError={e => { e.target.style.display = 'none'; }} />
                ))}
              </div>
            </div>
          )}

          {/* Citoyen */}
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">👤 Citoyen</h4>
            <div className="bg-gray-50 rounded-lg p-3 space-y-1">
              <p className="text-sm font-medium text-gray-800">{getCitizenName(report)}</p>
              {citizen && <>
                <p className="text-xs text-gray-500">{citizen.email}</p>
                <p className="text-xs text-gray-500">📍 {citizen.community}</p>
                {citizen.phone !== 'Non renseigné' && <p className="text-xs text-gray-500">📞 {citizen.phone}</p>}
              </>}
            </div>
          </div>

          {/* Dates */}
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">🕐 Dates</h4>
            <div className="bg-gray-50 rounded-lg p-3 space-y-1">
              <p className="text-xs text-gray-600">Créé le : <span className="font-medium">{formatDate(report.createdAt)}</span></p>
              {report.updatedAt && <p className="text-xs text-gray-600">Mis à jour : <span className="font-medium">{formatDate(report.updatedAt)}</span></p>}
              {report.resolvedAt && <p className="text-xs text-green-600">Résolu le : <span className="font-medium">{formatDate(report.resolvedAt)}</span></p>}
            </div>
          </div>

          {/* Score IA */}
          {report.confidenceScore !== undefined && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">🤖 Score IA</h4>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full transition-all"
                         style={{ width: `${report.confidenceScore}%` }} />
                  </div>
                  <span className="text-sm font-semibold text-gray-700">{report.confidenceScore}%</span>
                </div>
              </div>
            </div>
          )}

          {/* Votes citoyens */}
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              👍 Votes citoyens
            </h4>
            <VotesPanel report={report} />
          </div>

          {/* Assigner un agent */}
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">👤 Assignation</h4>
            <AgentSelector
              reportId={getDisplayId(report)}
              currentAgent={report?.processing?.assignedTo}
              onAssign={(agentId, agentLabel) => {
                setSelectedAgent(agentId);
                onStatusChange(getDisplayId(report), report.status, '', agentId);
              }}
            />
          </div>

          {/* Changer le statut */}
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">⚡ Mettre à jour le statut</h4>
            <div className="space-y-3">
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Note interne (optionnelle)..."
                rows={2}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
              />
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                  <button key={key}
                          disabled={report.status === key || updating}
                          onClick={() => handleStatus(key)}
                          className={`text-xs px-3 py-2 rounded-lg border font-medium transition-all
                            ${report.status === key
                              ? 'opacity-40 cursor-not-allowed ' + cfg.color
                              : cfg.color + ' hover:opacity-80 cursor-pointer'}`}>
                    {cfg.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Tags */}
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">🏷️ Tags</h4>
            <TagEditor
              reportId={getDisplayId(report)}
              initialTags={report.tags || []}
              onSaved={(tags) => onStatusChange && onStatusChange(getDisplayId(report), report.status, tags)}
            />
          </div>

          {/* Messagerie admin <-> citoyen */}
          <MessagingPanel reportId={getDisplayId(report)} />
        </div>
      </div>
    </>
  );
};

// ==================== MESSAGERIE ====================

function MessagingPanel({ reportId }) {
  const [comments, setComments]     = useState([]);
  const [loading, setLoading]       = useState(false);
  const [sending, setSending]       = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [msgType, setMsgType]       = useState('admin_message');
  const bottomRef                   = useRef(null);

  const loadComments = useCallback(async () => {
    if (!reportId || reportId === 'N/A') return;
    setLoading(true);
    try {
      const res = await dashboardAPI.getComments(reportId);
      if (res?.success) setComments(res.data?.comments || []);
    } catch (e) {
      console.error('Erreur chargement commentaires:', e);
    } finally {
      setLoading(false);
    }
  }, [reportId]);

  useEffect(() => { loadComments(); }, [loadComments]);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [comments]);

  const handleSend = async () => {
    if (!newMessage.trim()) return;
    setSending(true);
    try {
      const res = await dashboardAPI.addComment(reportId, newMessage.trim(), msgType);
      if (res?.success) {
        setComments(prev => [...prev, res.data?.comment].filter(Boolean));
        setNewMessage('');
      }
    } catch (e) {
      console.error('Erreur envoi commentaire:', e);
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (commentId) => {
    try {
      await dashboardAPI.deleteComment(reportId, commentId);
      setComments(prev => prev.filter(c => c._id !== commentId));
    } catch (e) {
      console.error('Erreur suppression commentaire:', e);
    }
  };

  const formatCommentDate = (d) => {
    if (!d) return '';
    return new Date(d).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  const getAuthorName = (author) => {
    if (!author) return 'Inconnu';
    if (typeof author === 'object') return `${author.firstName || ''} ${author.lastName || ''}`.trim() || author.email || 'Inconnu';
    return String(author);
  };

  const isAdmin = (author) => author?.role && ['admin', 'moderator'].includes(author.role);

  return (
    <div>
      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
        💬 Messagerie
        <span className="bg-gray-100 text-gray-600 text-xs px-1.5 py-0.5 rounded-full font-normal">{comments.length}</span>
        <button onClick={loadComments} className="ml-auto text-gray-400 hover:text-gray-600 text-xs">↺ Rafraîchir</button>
      </h4>

      {/* Liste des messages */}
      <div className="bg-gray-50 rounded-xl border border-gray-200 flex flex-col" style={{ maxHeight: 260 }}>
        <div className="flex-1 overflow-y-auto p-3 space-y-2" style={{ minHeight: 80 }}>
          {loading && (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600" />
            </div>
          )}
          {!loading && comments.length === 0 && (
            <p className="text-xs text-center text-gray-400 py-4 italic">Aucun message pour ce signalement</p>
          )}
          {comments.map((c) => {
            const admin = isAdmin(c.author);
            return (
              <div key={c._id} className={`flex gap-2 ${admin ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold
                  ${admin ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                  {admin ? '🛡' : '👤'}
                </div>
                <div className={`group max-w-[85%] ${admin ? 'items-end' : 'items-start'} flex flex-col`}>
                  <div className={`rounded-xl px-3 py-2 text-sm leading-snug relative
                    ${admin
                      ? 'bg-emerald-600 text-white rounded-tr-none'
                      : 'bg-white border border-gray-200 text-gray-800 rounded-tl-none'}`}>
                    {c.content}
                    {admin && (
                      <button
                        onClick={() => handleDelete(c._id)}
                        className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        ×
                      </button>
                    )}
                  </div>
                  <div className={`flex items-center gap-1 mt-0.5 ${admin ? 'flex-row-reverse' : ''}`}>
                    <span className="text-xs text-gray-400">{getAuthorName(c.author)}</span>
                    <span className="text-gray-300 text-xs">·</span>
                    <span className="text-xs text-gray-400">{formatCommentDate(c.createdAt)}</span>
                    {c.type === 'admin_message' && (
                      <span className="text-xs text-emerald-600 font-medium">· Visible citoyen</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Zone de saisie */}
        <div className="border-t border-gray-200 p-2 bg-white rounded-b-xl">
          <div className="flex items-center gap-1 mb-1.5">
            <button onClick={() => setMsgType('admin_message')}
                    className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${msgType === 'admin_message' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'text-gray-400 border-gray-200 hover:text-gray-600'}`}>
              👁 Visible citoyen
            </button>
            <button onClick={() => setMsgType('public')}
                    className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${msgType === 'public' ? 'bg-gray-100 text-gray-700 border-gray-300' : 'text-gray-400 border-gray-200 hover:text-gray-600'}`}>
              🔒 Note interne
            </button>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder={msgType === 'admin_message' ? 'Message au citoyen...' : 'Note interne...'}
              className="flex-1 text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <button
              onClick={handleSend}
              disabled={!newMessage.trim() || sending}
              className="bg-emerald-600 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0">
              {sending ? '…' : '→'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== MODAL CONFIRMATION SUPPRESSION ====================

const DeleteConfirmModal = ({ report, onConfirm, onCancel, deleting }) => {
  const [reason, setReason] = useState('');

  if (!report) return null;

  const typeCfg  = getTypeConfig(report.type);
  const location = getLocationInfo(report);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-red-50 border-b border-red-100 px-6 py-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-red-600 text-lg">🗑️</span>
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-base">Supprimer ce signalement ?</h3>
            <p className="text-xs text-red-600 font-medium">Cette action est irréversible</p>
          </div>
        </div>

        {/* Résumé du signalement */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
          <div className="flex items-center gap-2 mb-1">
            <span>{typeCfg.icon}</span>
            <span className="text-sm font-semibold text-gray-800">{typeCfg.label}</span>
            <Badge config={getSeverityCfg(report.severity)} />
          </div>
          <p className="text-xs text-gray-500 line-clamp-2">{report.description || 'Aucune description'}</p>
          <p className="text-xs text-gray-400 mt-1">📍 {location.address}</p>
          <p className="text-xs text-gray-400">👤 {getCitizenName(report)} · {formatDate(report.createdAt)}</p>
        </div>

        {/* Raison */}
        <div className="px-6 py-4">
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Raison de la suppression <span className="text-gray-400 font-normal">(optionnel)</span>
          </label>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Ex: Doublon, contenu invalide, erreur de localisation..."
            rows={3}
            autoFocus
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
          />
          <p className="text-xs text-gray-400 mt-1.5">
            ⚠️ La raison sera conservée dans le journal d'audit et envoyée au citoyen.
          </p>
        </div>

        {/* Actions */}
        <div className="px-6 pb-5 flex gap-3">
          <button
            onClick={onCancel}
            disabled={deleting}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            onClick={() => onConfirm(reason)}
            disabled={deleting}
            className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {deleting ? (
              <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Suppression...</>
            ) : (
              <><span>🗑️</span> Confirmer la suppression</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// ==================== COMPOSANT PRINCIPAL ====================

export function ReportsTable({ reports: initialReports, onStatusUpdate, onRefresh, onExportPDF, initialSelectedReportId, onReportOpened }) {
  const [reports, setReports]         = useState(initialReports || []);
  const [totalCount, setTotalCount]   = useState(0);
  const [loading, setLoading]         = useState(false);
  const [updatingId, setUpdatingId]   = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);

  // Ouvrir automatiquement un signalement depuis une notification
  useEffect(() => {
    if (!initialSelectedReportId || !reports.length) return;
    const found = reports.find(r => (r._id || r.id) === initialSelectedReportId);
    if (found) {
      setSelectedReport(found);
      onReportOpened?.();
    }
  }, [initialSelectedReportId, reports]);

  const [newReportIds, setNewReportIds]   = useState(new Set());
  const [deleteModal, setDeleteModal]     = useState(null);
  const [deleting, setDeleting]           = useState(false);
  const [filters, setFilters] = useState({
    status: '', type: '', severity: '', searchQuery: '', dateRange: '30d',
  });

  const wsRef = useRef(null);

  // ==================== WEBSOCKET ====================

  useEffect(() => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5001';

      if (typeof window !== 'undefined' && window.io) {
        const socket = window.io(apiUrl);
        wsRef.current = socket;

        socket.on('new-report', ({ data }) => {
          console.log('🔔 Nouveau signalement reçu en temps réel:', data);
          setReports(prev => [data, ...prev]);
          setTotalCount(prev => prev + 1);
          setNewReportIds(prev => new Set([...prev, getDisplayId(data)]));
          setTimeout(() => {
            setNewReportIds(prev => { const s = new Set(prev); s.delete(getDisplayId(data)); return s; });
          }, 3000);
        });

        socket.on('report-updated', ({ data }) => {
          console.log('🔄 Signalement mis à jour en temps réel:', data);
          setReports(prev => prev.map(r => getDisplayId(r) === getDisplayId(data) ? data : r));
        });

        return () => socket.disconnect();
      }
    } catch (e) {
      console.log('ℹ️ WebSocket non disponible:', e.message);
    }
  }, []);

  // ==================== CHARGEMENT ====================

  const loadReports = useCallback(async (currentFilters = {}) => {
    setLoading(true);
    try {
      const params = {};
      if (currentFilters.status    && currentFilters.status    !== 'all') params.status   = currentFilters.status;
      if (currentFilters.type      && currentFilters.type      !== 'all') params.type     = currentFilters.type;
      if (currentFilters.severity  && currentFilters.severity  !== 'all') params.severity = currentFilters.severity;
      if (currentFilters.searchQuery) params.search = currentFilters.searchQuery;
      params.limit  = 100;
      params.sortBy = 'createdAt';
      params.sortOrder = 'desc';

      const response = await dashboardAPI.getReports(params);

      let data = [];
      if (response?.data?.reports) data = response.data.reports;
      else if (response?.data && Array.isArray(response.data)) data = response.data;
      else if (Array.isArray(response)) data = response;

      setReports(data);
      setTotalCount(response?.data?.total || data.length);
    } catch (err) {
      console.error('❌ Erreur chargement signalements:', err);
      if (initialReports?.length) {
        setReports(initialReports);
        setTotalCount(initialReports.length);
      }
    } finally {
      setLoading(false);
    }
  }, [initialReports]);

  useEffect(() => {
    if (initialReports?.length) {
      setReports(initialReports);
      setTotalCount(initialReports.length);
    } else {
      loadReports(filters);
    }
  }, [initialReports]);

  // ==================== ACTIONS ====================

  const handleFiltersChange = (newFilters) => {
    setFilters(newFilters);
    loadReports(newFilters);
  };

  const handleStatusChange = async (reportId, newStatus, note, assignedTo = null) => {
    setUpdatingId(reportId);
    try {
      await dashboardAPI.updateReportStatus(reportId, newStatus, note, assignedTo);
      setReports(prev => prev.map(r =>
        getDisplayId(r) === reportId
          ? { ...r, status: newStatus, processing: assignedTo
              ? { ...r.processing, assignedTo }
              : r.processing }
          : r
      ));
      if (selectedReport && getDisplayId(selectedReport) === reportId) {
        setSelectedReport(prev => ({
          ...prev,
          status: newStatus,
          ...(assignedTo ? { processing: { ...prev.processing, assignedTo } } : {}),
        }));
      }
      if (onStatusUpdate) onStatusUpdate(reportId, newStatus);
    } catch (err) {
      console.error('❌ Erreur mise à jour statut:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleExport = async () => {
    try {
      await dashboardAPI.exportData(filters, 'csv');
    } catch {
      const headers = ['ID', 'Type', 'Description', 'Statut', 'Sévérité', 'Adresse', 'Date', 'Citoyen'];
      const rows = reports.map(r => {
        const loc = getLocationInfo(r);
        return [
          getDisplayId(r), getTypeConfig(r.type).label,
          `"${(r.description || '').replace(/"/g, '""')}"`,
          getStatusCfg(r.status).label, getSeverityCfg(r.severity).label,
          `"${loc.address}"`, formatDate(r.createdAt), getCitizenName(r),
        ].join(',');
      });
      const csv  = [headers.join(','), ...rows].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url;
      a.download = `signalements-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleDelete = async (reason) => {
    if (!deleteModal) return;
    setDeleting(true);
    try {
      const id  = getDisplayId(deleteModal);
      const res = await dashboardAPI.deleteReport(id, reason);
      if (res?.success) {
        setReports(prev => prev.filter(r => getDisplayId(r) !== id));
        setTotalCount(prev => prev - 1);
        if (selectedReport && getDisplayId(selectedReport) === id) setSelectedReport(null);
        setDeleteModal(null);
      } else {
        console.error('Erreur suppression:', res?.error);
      }
    } catch (err) {
      console.error('❌ Erreur suppression:', err);
    } finally {
      setDeleting(false);
    }
  };

  // ==================== RENDU ====================

  return (
    <div className="bg-white rounded-xl shadow-sm border">
      <ImageModal image={selectedImage} onClose={() => setSelectedImage(null)} />

      {deleteModal && (
        <DeleteConfirmModal
          report={deleteModal}
          onConfirm={handleDelete}
          onCancel={() => setDeleteModal(null)}
          deleting={deleting}
        />
      )}

      {selectedReport && (
        <ReportDetailPanel
          report={selectedReport}
          onClose={() => setSelectedReport(null)}
          onStatusChange={handleStatusChange}
          updating={updatingId === getDisplayId(selectedReport)}
          onDeleteRequest={() => setDeleteModal(selectedReport)}
        />
      )}

      {/* En-tête */}
      <div className="p-6 border-b">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-4 gap-4">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              📝 Gestion des Signalements
              <span className="text-sm text-gray-500 font-normal">
                ({loading ? '…' : totalCount})
              </span>
            </h2>
            {loading && (
              <div className="flex items-center gap-2 text-blue-600 text-sm">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
                Chargement…
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button onClick={handleExport} disabled={!reports.length || loading}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm flex items-center gap-2">
              📥 CSV
            </button>
            {onExportPDF && (
              <button
                onClick={() => onExportPDF({ reports, selectedReport })}
                disabled={!reports.length}
                className="bg-slate-700 text-white px-4 py-2 rounded-lg hover:bg-slate-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm flex items-center gap-2"
              >
                📄 PDF
              </button>
            )}
            <button onClick={() => loadReports(filters)} disabled={loading}
                    className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors text-sm flex items-center gap-2">
              🔄 Actualiser
            </button>
          </div>
        </div>

        <AdvancedFilters
          onFiltersChange={handleFiltersChange}
          isLoading={loading}
          initialFilters={{ status: filters.status, pollutionType: filters.type, priority: filters.severity }}
        />
      </div>

      {/* Tableau */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {['ID', 'Signalement', 'Photos', 'Localisation', 'Statut', 'Sévérité', 'Date', 'Citoyen', 'Actions'].map(col => (
                <th key={col} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {reports.map(report => {
              const id       = getDisplayId(report);
              const images   = getImages(report);
              const location = getLocationInfo(report);
              const isNew    = newReportIds.has(id);

              return (
                <tr key={id}
                    className={`hover:bg-gray-50 transition-all cursor-pointer
                      ${isNew ? 'bg-green-50 animate-pulse' : ''}`}
                    onClick={() => setSelectedReport(report)}>

                  {/* ID */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="text-xs font-mono text-gray-400">#{id.slice(-8)}</span>
                    {isNew && <span className="ml-1 text-xs text-green-600 font-bold">NEW</span>}
                  </td>

                  {/* Type + Description */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg flex-shrink-0">{getTypeConfig(report.type).icon}</span>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-900">{getTypeConfig(report.type).label}</div>
                        <div className="text-xs text-gray-500 truncate max-w-[180px]">
                          {report.description || 'Aucune description'}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Photos */}
                  <td className="px-4 py-3 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                    <ImageGallery images={images} onSelect={setSelectedImage} />
                  </td>

                  {/* Localisation */}
                  <td className="px-4 py-3">
                    <div className="text-sm text-gray-800 max-w-[160px] truncate" title={location.address}>
                      {location.address}
                    </div>
                    {location.lat && location.lng ? (
                      <div className="text-xs text-gray-400 font-mono">
                        {Number(location.lat).toFixed(4)}, {Number(location.lng).toFixed(4)}
                      </div>
                    ) : (
                      <div className="text-xs text-gray-300 italic">Pas de GPS</div>
                    )}
                  </td>

                  {/* Statut */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <Badge config={getStatusCfg(report.status)} />
                  </td>

                  {/* Sévérité */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <Badge config={getSeverityCfg(report.severity)} />
                  </td>

                  {/* Date */}
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">
                    {formatDate(report.createdAt)}
                  </td>

                  {/* Citoyen */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-sm text-gray-800">{getCitizenName(report)}</div>
                    {getCitizenInfo(report)?.community && (
                      <div className="text-xs text-gray-400">{getCitizenInfo(report).community}</div>
                    )}
                  </td>

                  {/* Action rapide statut */}
                  <td className="px-4 py-3 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                    <select
                      value={report.status || 'new'}
                      onChange={e => handleStatusChange(id, e.target.value)}
                      disabled={updatingId === id}
                      className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 bg-white cursor-pointer"
                      title="Changer le statut rapidement"
                    >
                      {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                        <option key={key} value={key}>{cfg.label}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => setDeleteModal(report)}
                      className="ml-1 p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Supprimer ce signalement"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* États vides */}
        {!loading && reports.length === 0 && (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">📭</div>
            <p className="text-gray-500 text-lg font-medium">Aucun signalement</p>
            <p className="text-gray-400 text-sm mt-1">
              {Object.values(filters).some(v => v && v !== '' && v !== 'all' && v !== '30d')
                ? 'Aucun résultat pour ces filtres — essayez d\'élargir la recherche'
                : 'Les signalements des citoyens apparaîtront ici'}
            </p>
          </div>
        )}

        {loading && (
          <div className="flex justify-center items-center py-12 gap-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600" />
            <span className="text-gray-500 text-sm">Chargement des signalements…</span>
          </div>
        )}
      </div>
    </div>
  );
}
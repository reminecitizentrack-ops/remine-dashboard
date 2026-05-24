import React, { useState, useEffect, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';

// ─── Chargement dynamique Leaflet (SSR désactivé) ───────────────────────────
const MapContainer   = dynamic(() => import('react-leaflet').then(m => m.MapContainer),   { ssr: false });
const TileLayer      = dynamic(() => import('react-leaflet').then(m => m.TileLayer),      { ssr: false });
const Marker         = dynamic(() => import('react-leaflet').then(m => m.Marker),         { ssr: false });
const Popup          = dynamic(() => import('react-leaflet').then(m => m.Popup),          { ssr: false });
const CircleMarker   = dynamic(() => import('react-leaflet').then(m => m.CircleMarker),   { ssr: false });

// MapController : ajuste la vue sur les marqueurs
const MapController = dynamic(
  () => import('react-leaflet').then(mod => {
    const { useMap } = mod;
    return function MapControllerInternal({ reports }) {
      const map = useMap();
      useEffect(() => {
        if (!reports.length) { map.setView([14.4974, -14.4524], 6); return; }
        const L = require('leaflet');
        const grp = new L.FeatureGroup();
        reports.forEach(r => {
          const c = extractCoords(r);
          if (c) grp.addLayer(L.circleMarker([c.lat, c.lng]));
        });
        if (grp.getLayers().length > 0) {
          map.fitBounds(grp.getBounds(), { padding: [40, 40], maxZoom: 13 });
        }
      }, [reports]);
      return null;
    };
  }),
  { ssr: false }
);

// ─── Utilitaires ─────────────────────────────────────────────────────────────
function extractCoords(r) {
  if (!r) return null;
  const tryPair = (lat, lng) => {
    const a = parseFloat(lat), b = parseFloat(lng);
    if (!isNaN(a) && !isNaN(b) && a >= -90 && a <= 90 && b >= -180 && b <= 180 && !(a === 0 && b === 0))
      return { lat: a, lng: b };
    return null;
  };
  return tryPair(r.location?.latitude,  r.location?.longitude)
      || tryPair(r.latitude,             r.longitude)
      || tryPair(r.coordinates?.lat,     r.coordinates?.lng)
      || tryPair(r.gps?.lat,             r.gps?.lng)
      || (Array.isArray(r.location?.coordinates)
          ? tryPair(r.location.coordinates[1], r.location.coordinates[0])
          : null)
      || null;
}

const TYPE_CFG = {
  water_pollution:    { icon: '💧', label: 'Pollution eau',        color: '#3b82f6', bg: '#eff6ff' },
  air_pollution:      { icon: '💨', label: 'Pollution air',        color: '#8b5cf6', bg: '#f5f3ff' },
  soil_contamination: { icon: '🟤', label: 'Contamination sol',    color: '#92400e', bg: '#fef3c7' },
  waste_deposit:      { icon: '🗑️', label: 'Dépôt déchets',       color: '#f59e0b', bg: '#fffbeb' },
  dust:               { icon: '🌫️', label: 'Poussière',           color: '#9ca3af', bg: '#f9fafb' },
  abandoned_site:     { icon: '🏚️', label: 'Site abandonné',      color: '#6b7280', bg: '#f3f4f6' },
  noise_pollution:    { icon: '🔊', label: 'Pollution sonore',     color: '#ec4899', bg: '#fdf2f8' },
  mining_waste:       { icon: '⛏️', label: 'Déchets miniers',     color: '#78350f', bg: '#fef3c7' },
  other:              { icon: '⚠️', label: 'Autre',               color: '#6b7280', bg: '#f3f4f6' },
};

const SEV_CFG = {
  critical: { color: '#dc2626', ring: '#fca5a5', label: 'Critique',  size: 18 },
  high:     { color: '#f97316', ring: '#fdba74', label: 'Élevé',     size: 15 },
  medium:   { color: '#f59e0b', ring: '#fcd34d', label: 'Moyen',     size: 12 },
  low:      { color: '#22c55e', ring: '#86efac', label: 'Faible',    size: 10 },
};

const STATUS_CFG = {
  new:         { label: 'Nouveau',    bg: '#fef9c3', color: '#854d0e' },
  verified:    { label: 'Vérifié',    bg: '#dbeafe', color: '#1e40af' },
  in_progress: { label: 'En cours',   bg: '#ede9fe', color: '#5b21b6' },
  resolved:    { label: 'Résolu',     bg: '#dcfce7', color: '#166534' },
  rejected:    { label: 'Rejeté',     bg: '#fee2e2', color: '#991b1b' },
};

const getCitizenName = r => {
  const c = r?.citizen;
  if (c && typeof c === 'object') return `${c.firstName || ''} ${c.lastName || ''}`.trim() || c.email || 'Anonyme';
  return typeof c === 'string' ? c : 'Anonyme';
};

const fmtDate = d => d ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

// ─── Panneau de détail d'un signalement ──────────────────────────────────────
function DetailPanel({ report, onClose }) {
  if (!report) return null;
  const coords = extractCoords(report);
  const type   = TYPE_CFG[report.type]   || TYPE_CFG.other;
  const sev    = SEV_CFG[report.severity]  || SEV_CFG.low;
  const sta    = STATUS_CFG[report.status] || { label: report.status, bg: '#f3f4f6', color: '#374151' };

  return (
    <div className="absolute top-3 right-3 z-[1000] w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[calc(100%-24px)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100" style={{ background: type.bg }}>
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xl flex-shrink-0">{type.icon}</span>
          <div className="min-w-0">
            <p className="font-bold text-gray-900 text-sm truncate">{type.label}</p>
            <p className="text-xs text-gray-500 truncate">{getCitizenName(report)}</p>
          </div>
        </div>
        <button onClick={onClose}
                className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full flex-shrink-0 text-lg">
          ✕
        </button>
      </div>

      {/* Corps scrollable */}
      <div className="overflow-y-auto flex-1 px-4 py-3 space-y-3">
        {/* Badges */}
        <div className="flex flex-wrap gap-1.5">
          <span className="text-xs font-bold px-2 py-1 rounded-full"
                style={{ background: sev.color + '20', color: sev.color }}>
            ● {sev.label}
          </span>
          <span className="text-xs font-semibold px-2 py-1 rounded-full"
                style={{ background: sta.bg, color: sta.color }}>
            {sta.label}
          </span>
          {report.isVerified && (
            <span className="text-xs font-semibold px-2 py-1 rounded-full bg-sky-50 text-sky-700">
              ✓ Vérifié IA
            </span>
          )}
        </div>

        {/* Description */}
        {report.description && (
          <p className="text-sm text-gray-700 leading-relaxed">
            {report.description}
          </p>
        )}

        {/* Localisation */}
        <div className="bg-blue-50 rounded-xl p-3 border border-blue-100 space-y-0.5">
          <p className="text-xs font-semibold text-blue-700">📍 Localisation</p>
          <p className="text-sm text-blue-900 font-medium">{report.location?.address || report.address || '—'}</p>
          {report.location?.city && (
            <p className="text-xs text-blue-600">{report.location.city}{report.location.region ? ', ' + report.location.region : ''}</p>
          )}
          {coords && (
            <p className="text-xs text-blue-400 font-mono">{coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}</p>
          )}
        </div>

        {/* Score IA + votes */}
        <div className="grid grid-cols-2 gap-2">
          {report.confidenceScore !== undefined && (
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-2.5 text-center">
              <p className="text-lg font-black text-amber-600">{report.confidenceScore}%</p>
              <p className="text-xs text-amber-500">Score IA</p>
            </div>
          )}
          <div className="bg-gray-50 border border-gray-100 rounded-xl p-2.5 text-center">
            <p className="text-lg font-black text-gray-700">{report.voteCount || 0}</p>
            <p className="text-xs text-gray-400">Votes</p>
          </div>
        </div>

        {/* Date */}
        <p className="text-xs text-gray-400">Signalé le {fmtDate(report.createdAt)}</p>
      </div>
    </div>
  );
}

// ─── Filtre chip ──────────────────────────────────────────────────────────────
function FilterChip({ label, active, color, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
        active
          ? 'text-white border-transparent shadow-sm'
          : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
      }`}
      style={active ? { background: color, borderColor: color } : {}}
    >
      {label}
    </button>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────
export function ReportsMap({ reports = [], onReportClick }) {
  const [isClient,   setIsClient]   = useState(false);
  const [selected,   setSelected]   = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [filterSev,  setFilterSev]  = useState('all');
  const [filterSta,  setFilterSta]  = useState('all');

  useEffect(() => { setIsClient(true); }, []);

  // Création d'icône SVG inline par sévérité
  const makeIcon = useCallback((report) => {
    if (typeof window === 'undefined') return null;
    const L   = require('leaflet');
    const sev = SEV_CFG[report.severity] || SEV_CFG.low;
    const typ = TYPE_CFG[report.type]    || TYPE_CFG.other;
    const s   = sev.size;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${s+8}" height="${s+8}" viewBox="0 0 ${s+8} ${s+8}">
      <circle cx="${(s+8)/2}" cy="${(s+8)/2}" r="${s/2+3}" fill="${sev.ring}" opacity="0.5"/>
      <circle cx="${(s+8)/2}" cy="${(s+8)/2}" r="${s/2}" fill="${sev.color}" stroke="white" stroke-width="2"/>
    </svg>`;
    return L.divIcon({
      html: `<div title="${typ.label}" style="position:relative;">
               ${svg}
               <span style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:${Math.round(s*0.55)}px;line-height:1;">${typ.icon}</span>
             </div>`,
      className: '',
      iconSize:   [s + 8, s + 8],
      iconAnchor: [(s + 8) / 2, (s + 8) / 2],
    });
  }, []);

  // Signalements filtrés avec coordonnées valides
  const filtered = useMemo(() => {
    return reports.filter(r => {
      if (!extractCoords(r)) return false;
      if (filterType !== 'all' && r.type     !== filterType) return false;
      if (filterSev  !== 'all' && r.severity !== filterSev)  return false;
      if (filterSta  !== 'all' && r.status   !== filterSta)  return false;
      return true;
    });
  }, [reports, filterType, filterSev, filterSta]);

  const withCoords = useMemo(() => reports.filter(r => extractCoords(r)), [reports]);

  // Types présents dans les données
  const presentTypes = useMemo(() => [...new Set(reports.map(r => r.type).filter(Boolean))], [reports]);

  const handleClick = (report) => {
    setSelected(report);
    if (onReportClick) onReportClick(report);
  };

  if (!isClient) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border p-8 flex items-center justify-center gap-3">
        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-gray-500 text-sm">Chargement de la carte…</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">

      {/* ── En-tête ── */}
      <div className="px-5 py-4 border-b border-gray-100">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              🗺️ Carte des Signalements
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              <span className="font-semibold text-emerald-600">{filtered.length}</span> affiché{filtered.length > 1 ? 's' : ''}
              {' '}sur <span className="font-semibold">{withCoords.length}</span> localisé{withCoords.length > 1 ? 's' : ''}
              {' '}/ <span className="font-semibold">{reports.length}</span> total
              {withCoords.length < reports.length && (
                <span className="text-amber-600 ml-1">· {reports.length - withCoords.length} sans GPS</span>
              )}
            </p>
          </div>

          {/* Légende sévérités */}
          <div className="flex items-center gap-2 flex-wrap">
            {Object.entries(SEV_CFG).map(([k, v]) => (
              <div key={k} className="flex items-center gap-1">
                <span className="inline-block w-3 h-3 rounded-full border-2 border-white shadow-sm"
                      style={{ background: v.color }} />
                <span className="text-xs text-gray-500">{v.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Filtres */}
        <div className="mt-3 flex flex-wrap gap-2 items-center">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Filtres :</span>

          {/* Filtre statut */}
          <FilterChip label="Tous statuts" active={filterSta === 'all'} color="#6b7280" onClick={() => setFilterSta('all')} />
          {Object.entries(STATUS_CFG).map(([k, v]) => (
            <FilterChip key={k} label={v.label} active={filterSta === k} color={v.color} onClick={() => setFilterSta(filterSta === k ? 'all' : k)} />
          ))}

          <span className="w-px h-4 bg-gray-200 mx-1" />

          {/* Filtre sévérité */}
          <FilterChip label="Toute sévérité" active={filterSev === 'all'} color="#6b7280" onClick={() => setFilterSev('all')} />
          {Object.entries(SEV_CFG).map(([k, v]) => (
            <FilterChip key={k} label={v.label} active={filterSev === k} color={v.color} onClick={() => setFilterSev(filterSev === k ? 'all' : k)} />
          ))}

          {(filterType !== 'all' || filterSev !== 'all' || filterSta !== 'all') && (
            <button onClick={() => { setFilterType('all'); setFilterSev('all'); setFilterSta('all'); }}
                    className="text-xs text-red-500 hover:text-red-700 font-semibold ml-1">
              ✕ Réinitialiser
            </button>
          )}
        </div>

        {/* Filtre type (ligne séparée) */}
        <div className="mt-2 flex flex-wrap gap-2 items-center">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Type :</span>
          <FilterChip label="Tous types" active={filterType === 'all'} color="#059669" onClick={() => setFilterType('all')} />
          {presentTypes.map(t => {
            const cfg = TYPE_CFG[t] || TYPE_CFG.other;
            return (
              <FilterChip key={t} label={`${cfg.icon} ${cfg.label}`} active={filterType === t}
                          color={cfg.color} onClick={() => setFilterType(filterType === t ? 'all' : t)} />
            );
          })}
        </div>
      </div>

      {/* ── Carte ── */}
      <div className="relative" style={{ height: 520 }}>
        <MapContainer
          center={[14.4974, -14.4524]}
          zoom={7}
          style={{ height: '100%', width: '100%' }}
          zoomControl={true}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />

          <MapController reports={filtered} />

          {filtered.map(report => {
            const coords = extractCoords(report);
            if (!coords) return null;
            const icon = makeIcon(report);
            const isSelected = selected?._id === report._id || selected?.id === report.id;

            return (
              <Marker
                key={report._id || report.id}
                position={[coords.lat, coords.lng]}
                icon={icon}
                eventHandlers={{ click: () => handleClick(report) }}
                zIndexOffset={isSelected ? 1000 : 0}
              >
                <Popup className="remine-popup" closeButton={false}>
                  <div style={{ minWidth: 180, padding: '6px 2px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <span style={{ fontSize: 18 }}>{(TYPE_CFG[report.type] || TYPE_CFG.other).icon}</span>
                      <div>
                        <strong style={{ fontSize: 12, color: '#111827' }}>
                          {(TYPE_CFG[report.type] || TYPE_CFG.other).label}
                        </strong>
                        <div style={{ fontSize: 10, color: '#6b7280' }}>{getCitizenName(report)}</div>
                      </div>
                    </div>
                    {report.description && (
                      <p style={{ fontSize: 11, color: '#374151', marginBottom: 6, lineHeight: 1.4 }}>
                        {report.description.substring(0, 100)}{report.description.length > 100 ? '…' : ''}
                      </p>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
                        background: (SEV_CFG[report.severity] || SEV_CFG.low).color + '20',
                        color: (SEV_CFG[report.severity] || SEV_CFG.low).color,
                      }}>
                        {(SEV_CFG[report.severity] || SEV_CFG.low).label}
                      </span>
                      <button
                        onClick={() => handleClick(report)}
                        style={{
                          fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 8,
                          background: '#059669', color: '#fff', border: 'none', cursor: 'pointer',
                        }}>
                        Détails →
                      </button>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>

        {/* Panneau de détail (overlay) */}
        {selected && (
          <DetailPanel report={selected} onClose={() => setSelected(null)} />
        )}

        {/* Badge "aucun résultat" */}
        {filtered.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-white rounded-2xl shadow-lg border px-6 py-4 text-center pointer-events-auto">
              <div className="text-3xl mb-2">🔍</div>
              <p className="font-semibold text-gray-700 text-sm">Aucun signalement avec ces filtres</p>
              <button onClick={() => { setFilterType('all'); setFilterSev('all'); setFilterSta('all'); }}
                      className="text-xs text-emerald-600 hover:underline mt-1">
                Réinitialiser les filtres
              </button>
            </div>
          </div>
        )}

        {/* Légende types (coin bas gauche) */}
        <div className="absolute bottom-4 left-4 z-[1000] bg-white rounded-xl shadow-lg border border-gray-100 px-3 py-2.5 max-w-[180px]">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Types</p>
          <div className="space-y-1">
            {presentTypes.map(t => {
              const cfg = TYPE_CFG[t] || TYPE_CFG.other;
              return (
                <div key={t} className="flex items-center gap-1.5 cursor-pointer hover:opacity-80"
                     onClick={() => setFilterType(filterType === t ? 'all' : t)}>
                  <span style={{ fontSize: 12 }}>{cfg.icon}</span>
                  <span className="text-xs text-gray-600 truncate">{cfg.label}</span>
                  <span className="ml-auto text-xs font-bold" style={{ color: cfg.color }}>
                    {reports.filter(r => r.type === t && extractCoords(r)).length}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Pied : stats rapides ── */}
      <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex flex-wrap gap-4">
        {Object.entries(SEV_CFG).map(([k, v]) => {
          const count = reports.filter(r => r.severity === k && extractCoords(r)).length;
          if (!count) return null;
          return (
            <div key={k} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: v.color }} />
              <span className="text-xs text-gray-500">{v.label} :</span>
              <span className="text-xs font-bold text-gray-700">{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
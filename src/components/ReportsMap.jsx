import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';

// ─── Imports dynamiques Leaflet ───────────────────────────────────────────────
const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false });
const TileLayer    = dynamic(() => import('react-leaflet').then(m => m.TileLayer),    { ssr: false });
const Marker       = dynamic(() => import('react-leaflet').then(m => m.Marker),       { ssr: false });
const Popup        = dynamic(() => import('react-leaflet').then(m => m.Popup),        { ssr: false });
const ZoomControl  = dynamic(() => import('react-leaflet').then(m => m.ZoomControl),  { ssr: false });
const Polygon      = dynamic(() => import('react-leaflet').then(m => m.Polygon),      { ssr: false });

// ─── MapController ────────────────────────────────────────────────────────────
const MapController = dynamic(
  () => import('react-leaflet').then(mod => {
    const { useMap, useMapEvents } = mod;
    return function MapControllerInternal({ reports, flyTo, drawMode, onDrawPoint, onDrawComplete, drawnPoints }) {
      const leafMap = useMap();

      useEffect(() => {
        if (flyTo) { leafMap.flyTo([flyTo.lat, flyTo.lng], flyTo.zoom || 14, { animate: true, duration: 0.9 }); return; }
        if (!reports.length) return;
        const L = require('leaflet');
        const grp = new L.FeatureGroup();
        reports.forEach(r => { const c = extractCoords(r); if (c) grp.addLayer(L.circleMarker([c.lat, c.lng])); });
        if (grp.getLayers().length > 0) {
          try { leafMap.fitBounds(grp.getBounds(), { padding: [60, 60], maxZoom: 13, animate: true }); } catch {}
        }
      }, [reports, flyTo, leafMap]);

      useEffect(() => {
        leafMap.getContainer().style.cursor = drawMode ? 'crosshair' : '';
      }, [drawMode, leafMap]);

      useMapEvents({
        click(e) { if (drawMode) onDrawPoint([e.latlng.lat, e.latlng.lng]); },
        dblclick(e) { if (drawMode && drawnPoints.length >= 3) { e.originalEvent.preventDefault(); onDrawComplete(); } },
      });

      return null;
    };
  }),
  { ssr: false }
);

// ─── ClusterLayer (fichier séparé → next/dynamic compatible) ─────────────────
const ClusterLayer = dynamic(
  () => import('./MapClusterLayer'),
  { ssr: false }
);

// ─── HeatmapLayer (fichier séparé → next/dynamic compatible) ─────────────────
const HeatmapLayer = dynamic(
  () => import('./MapHeatLayer'),
  { ssr: false }
);

// ─── Utilitaires ──────────────────────────────────────────────────────────────
function extractCoords(r) {
  if (!r) return null;
  const tryPair = (lat, lng) => {
    const a = parseFloat(lat), b = parseFloat(lng);
    if (!isNaN(a) && !isNaN(b) && a >= -90 && a <= 90 && b >= -180 && b <= 180 && !(a === 0 && b === 0))
      return { lat: a, lng: b };
    return null;
  };
  return tryPair(r.location?.latitude, r.location?.longitude)
      || tryPair(r.latitude, r.longitude)
      || tryPair(r.coordinates?.lat, r.coordinates?.lng)
      || (Array.isArray(r.location?.coordinates) ? tryPair(r.location.coordinates[1], r.location.coordinates[0]) : null)
      || null;
}

function pointInPolygon(point, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1], xj = polygon[j][0], yj = polygon[j][1];
    if (((yi > point[1]) !== (yj > point[1])) && (point[0] < (xj - xi) * (point[1] - yi) / (yj - yi) + xi))
      inside = !inside;
  }
  return inside;
}

const TYPE_CFG = {
  water_pollution:    { icon: '💧', label: 'Pollution eau',     color: '#3b82f6', bg: '#eff6ff' },
  air_pollution:      { icon: '💨', label: 'Pollution air',     color: '#8b5cf6', bg: '#f5f3ff' },
  soil_contamination: { icon: '🟤', label: 'Contamination sol', color: '#92400e', bg: '#fef3c7' },
  waste_deposit:      { icon: '🗑️', label: 'Dépôt déchets',   color: '#f59e0b', bg: '#fffbeb' },
  dust:               { icon: '🌫️', label: 'Poussière',        color: '#9ca3af', bg: '#f9fafb' },
  abandoned_site:     { icon: '🏚️', label: 'Site abandonné',   color: '#6b7280', bg: '#f3f4f6' },
  noise_pollution:    { icon: '🔊', label: 'Pollution sonore',  color: '#ec4899', bg: '#fdf2f8' },
  other:              { icon: '⚠️', label: 'Autre',             color: '#6b7280', bg: '#f3f4f6' },
};
const SEV_CFG = {
  critical: { color: '#dc2626', ring: '#fca5a5', label: 'Critique', size: 22 },
  high:     { color: '#f97316', ring: '#fdba74', label: 'Élevé',    size: 17 },
  medium:   { color: '#f59e0b', ring: '#fcd34d', label: 'Moyen',    size: 13 },
  low:      { color: '#22c55e', ring: '#86efac', label: 'Faible',   size: 10 },
};
const STATUS_CFG = {
  new:         { label: 'Nouveau',   color: '#854d0e', bg: '#fef9c3' },
  verified:    { label: 'Vérifié',   color: '#1e40af', bg: '#dbeafe' },
  in_progress: { label: 'En cours',  color: '#5b21b6', bg: '#ede9fe' },
  resolved:    { label: 'Résolu',    color: '#166534', bg: '#dcfce7' },
  rejected:    { label: 'Rejeté',    color: '#991b1b', bg: '#fee2e2' },
};
const MAP_STYLES = {
  standard:  { label: '🗺️ Standard',  url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',                                                           attr: '© OpenStreetMap' },
  satellite: { label: '🛰️ Satellite', url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',                 attr: '© Esri'          },
  dark:      { label: '🌙 Sombre',     url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',                                                attr: '© CartoDB'       },
  topo:      { label: '⛰️ Topo',      url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',                                                             attr: '© OpenTopoMap'   },
};

// Centres approximatifs des 14 régions du Sénégal pour le zoom rapide
const SENEGAL_REGIONS = {
  'Dakar':       { lat: 14.7167, lng: -17.4677, zoom: 11 },
  'Thiès':       { lat: 14.7910, lng: -16.9359, zoom: 10 },
  'Diourbel':    { lat: 14.6592, lng: -16.2333, zoom: 10 },
  'Fatick':      { lat: 14.3390, lng: -16.4110, zoom: 10 },
  'Kaolack':     { lat: 14.1825, lng: -16.0667, zoom: 10 },
  'Kaffrine':    { lat: 14.1059, lng: -15.5500, zoom: 10 },
  'Kolda':       { lat: 12.8983, lng: -14.9500, zoom: 9  },
  'Louga':       { lat: 15.6173, lng: -16.2240, zoom: 9  },
  'Matam':       { lat: 15.6559, lng: -13.2548, zoom: 9  },
  'Saint-Louis': { lat: 16.0179, lng: -16.4896, zoom: 9  },
  'Sédhiou':     { lat: 12.7081, lng: -15.5569, zoom: 10 },
  'Tambacounda': { lat: 13.7707, lng: -13.6673, zoom: 8  },
  'Kédougou':    { lat: 12.5556, lng: -12.1747, zoom: 9  },
  'Ziguinchor':  { lat: 12.5641, lng: -16.2733, zoom: 10 },
};

const getCitizenName = r => {
  const c = r?.citizen;
  if (c && typeof c === 'object') return `${c.firstName || ''} ${c.lastName || ''}`.trim() || c.email || 'Anonyme';
  return typeof c === 'string' ? c : 'Anonyme';
};
const fmtDate = d => d ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

// ─── Panneau de détail ────────────────────────────────────────────────────────
function DetailPanel({ report, onClose, darkMode: dm }) {
  if (!report) return null;
  const coords = extractCoords(report);
  const type = TYPE_CFG[report.type]     || TYPE_CFG.other;
  const sev  = SEV_CFG[report.severity]  || SEV_CFG.low;
  const sta  = STATUS_CFG[report.status] || { label: report.status, bg: '#f3f4f6', color: '#374151' };
  return (
    <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 1000, width: 300, background: dm ? '#1e293b' : '#fff', borderRadius: 20, boxShadow: '0 8px 40px rgba(0,0,0,0.18)', border: `1px solid ${dm ? '#334155' : '#f1f5f9'}`, overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: 'calc(100% - 24px)', animation: 'detailPanelIn 0.25s cubic-bezier(0.22,1,0.36,1) both' }}>
      <style>{`@keyframes detailPanelIn{from{opacity:0;transform:translateX(16px) scale(0.97)}to{opacity:1;transform:translateX(0) scale(1)}}`}</style>
      <div style={{ background: `linear-gradient(135deg,${sev.color}22,${type.bg})`, padding: '14px 16px', borderBottom: `1px solid ${dm ? '#334155' : '#f1f5f9'}`, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 28, flexShrink: 0 }}>{type.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontWeight: 800, fontSize: 14, color: dm ? '#f1f5f9' : '#0f172a', margin: 0 }}>{type.label}</p>
          <p style={{ fontSize: 11, color: dm ? '#94a3b8' : '#64748b', margin: '2px 0 0' }}>{getCitizenName(report)}</p>
        </div>
        <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: '50%', background: dm ? '#334155' : '#f1f5f9', border: 'none', cursor: 'pointer', color: dm ? '#94a3b8' : '#64748b', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>✕</button>
      </div>
      <div style={{ overflowY: 'auto', flex: 1, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: `${sev.color}18`, color: sev.color, border: `1px solid ${sev.color}30` }}>● {sev.label}</span>
          <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 99, background: sta.bg, color: sta.color }}>{sta.label}</span>
          {report.isVerified && <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 99, background: '#e0f2fe', color: '#0369a1' }}>✓ IA</span>}
        </div>
        {report.description && (
          <p style={{ fontSize: 12, color: dm ? '#cbd5e1' : '#374151', lineHeight: 1.6, margin: 0, padding: '10px 12px', background: dm ? '#0f172a' : '#f8fafc', borderRadius: 10, border: `1px solid ${dm ? '#1e293b' : '#f1f5f9'}` }}>
            {report.description.substring(0, 180)}{report.description.length > 180 ? '…' : ''}
          </p>
        )}
        <div style={{ padding: '10px 12px', background: '#eff6ff', borderRadius: 10, border: '1px solid #bfdbfe' }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#1d4ed8', margin: '0 0 4px' }}>📍 Localisation</p>
          <p style={{ fontSize: 12, fontWeight: 600, color: '#1e3a8a', margin: 0 }}>{report.location?.address || '—'}</p>
          {report.location?.city && <p style={{ fontSize: 11, color: '#3b82f6', margin: '2px 0 0' }}>{report.location.city}{report.location.region ? `, ${report.location.region}` : ''}</p>}
          {coords && <p style={{ fontSize: 10, color: '#93c5fd', fontFamily: 'monospace', margin: '3px 0 0' }}>{coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}</p>}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {report.confidenceScore != null && (
            <div style={{ padding: '10px 12px', background: dm ? '#1c1917' : '#fffbeb', borderRadius: 10, border: `1px solid ${dm ? '#44403c' : '#fde68a'}`, textAlign: 'center' }}>
              <p style={{ fontSize: 22, fontWeight: 900, color: '#d97706', margin: 0 }}>{report.confidenceScore}%</p>
              <p style={{ fontSize: 10, color: '#92400e', margin: '2px 0 0' }}>Score IA</p>
            </div>
          )}
          <div style={{ padding: '10px 12px', background: dm ? '#0f172a' : '#f8fafc', borderRadius: 10, border: `1px solid ${dm ? '#1e293b' : '#f1f5f9'}`, textAlign: 'center' }}>
            <p style={{ fontSize: 22, fontWeight: 900, color: dm ? '#e2e8f0' : '#374151', margin: 0 }}>{report.voteCount || 0}</p>
            <p style={{ fontSize: 10, color: dm ? '#64748b' : '#9ca3af', margin: '2px 0 0' }}>Votes</p>
          </div>
        </div>
        <p style={{ fontSize: 11, color: dm ? '#475569' : '#9ca3af', margin: 0 }}>Signalé le {fmtDate(report.createdAt)}</p>
      </div>
    </div>
  );
}

// ─── Panneau de résumé de zone (dessinée) ─────────────────────────────────────
function ZoneSummaryPanel({ reports, onClose, onClear, darkMode: dm }) {
  const byType = useMemo(() => reports.reduce((acc, r) => {
    acc[r.type || 'other'] = (acc[r.type || 'other'] || 0) + 1;
    return acc;
  }, {}), [reports]);

  const bySeverity = useMemo(() => reports.reduce((acc, r) => {
    acc[r.severity || 'low'] = (acc[r.severity || 'low'] || 0) + 1;
    return acc;
  }, {}), [reports]);

  const byStatus = useMemo(() => reports.reduce((acc, r) => {
    acc[r.status || 'new'] = (acc[r.status || 'new'] || 0) + 1;
    return acc;
  }, {}), [reports]);

  const resolved = byStatus.resolved || 0;
  const resRate  = reports.length ? Math.round((resolved / reports.length) * 100) : 0;

  const handleExport = () => {
    const headers = ['Type', 'Sévérité', 'Statut', 'Description', 'Adresse', 'Date'];
    const rows = reports.map(r => [
      (TYPE_CFG[r.type] || TYPE_CFG.other).label,
      (SEV_CFG[r.severity] || SEV_CFG.low).label,
      (STATUS_CFG[r.status] || { label: r.status }).label,
      (r.description || '').replace(/\n/g, ' ').substring(0, 200),
      r.location?.address || '',
      fmtDate(r.createdAt),
    ]);
    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `remine_zone_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ position: 'absolute', bottom: 12, left: 12, zIndex: 1000, width: 280, background: dm ? '#1e293b' : '#fff', borderRadius: 20, boxShadow: '0 8px 40px rgba(0,0,0,0.18)', border: `1px solid ${dm ? '#334155' : '#f1f5f9'}`, overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: 'calc(100% - 24px)', animation: 'detailPanelIn 0.25s cubic-bezier(0.22,1,0.36,1) both' }}>
      <div style={{ background: 'linear-gradient(135deg,#8b5cf622,#ede9fe)', padding: '14px 16px', borderBottom: `1px solid ${dm ? '#334155' : '#f1f5f9'}`, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 24, flexShrink: 0 }}>✏️</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontWeight: 800, fontSize: 14, color: dm ? '#f1f5f9' : '#0f172a', margin: 0 }}>Résumé de zone</p>
          <p style={{ fontSize: 11, color: dm ? '#94a3b8' : '#64748b', margin: '2px 0 0' }}>{reports.length} signalement{reports.length > 1 ? 's' : ''} dans la zone</p>
        </div>
        <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: '50%', background: dm ? '#334155' : '#f1f5f9', border: 'none', cursor: 'pointer', color: dm ? '#94a3b8' : '#64748b', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>✕</button>
      </div>

      <div style={{ overflowY: 'auto', flex: 1, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>

        {reports.length === 0 ? (
          <p style={{ fontSize: 12, color: dm ? '#94a3b8' : '#6b7280', textAlign: 'center', padding: '12px 0' }}>
            Aucun signalement dans cette zone.
          </p>
        ) : (
          <>
            {/* Résolution */}
            <div style={{ padding: '10px 12px', background: dm ? '#0f172a' : '#f8fafc', borderRadius: 10, border: `1px solid ${dm ? '#1e293b' : '#f1f5f9'}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, color: dm ? '#cbd5e1' : '#374151', fontWeight: 600 }}>Taux de résolution</span>
              <span style={{ fontSize: 18, fontWeight: 900, color: resRate >= 60 ? '#22c55e' : resRate >= 30 ? '#f59e0b' : '#ef4444' }}>{resRate}%</span>
            </div>

            {/* Par type */}
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, color: dm ? '#64748b' : '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 6px' }}>Par type</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {Object.entries(byType).sort((a, b) => b[1] - a[1]).map(([t, n]) => {
                  const cfg = TYPE_CFG[t] || TYPE_CFG.other;
                  return (
                    <div key={t} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
                      <span style={{ color: dm ? '#cbd5e1' : '#374151' }}>{cfg.icon} {cfg.label}</span>
                      <strong style={{ color: '#8b5cf6' }}>{n}</strong>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Par sévérité */}
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, color: dm ? '#64748b' : '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 6px' }}>Par sévérité</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {Object.entries(bySeverity).sort((a, b) => b[1] - a[1]).map(([s, n]) => {
                  const cfg = SEV_CFG[s] || SEV_CFG.low;
                  return (
                    <span key={s} style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: `${cfg.color}18`, color: cfg.color, border: `1px solid ${cfg.color}30` }}>
                      ● {cfg.label} ({n})
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Par statut */}
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, color: dm ? '#64748b' : '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 6px' }}>Par statut</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {Object.entries(byStatus).sort((a, b) => b[1] - a[1]).map(([s, n]) => {
                  const cfg = STATUS_CFG[s] || { label: s, bg: '#f3f4f6', color: '#374151' };
                  return (
                    <span key={s} style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 99, background: cfg.bg, color: cfg.color }}>
                      {cfg.label} ({n})
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button onClick={handleExport} style={{ flex: 1, fontSize: 11, fontWeight: 700, padding: '8px 12px', borderRadius: 8, background: '#8b5cf6', color: '#fff', border: 'none', cursor: 'pointer' }}>
                ⬇️ Exporter CSV
              </button>
              <button onClick={onClear} style={{ fontSize: 11, fontWeight: 700, padding: '8px 12px', borderRadius: 8, background: dm ? '#334155' : '#fee2e2', color: dm ? '#94a3b8' : '#dc2626', border: 'none', cursor: 'pointer' }}>
                Effacer la zone
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Bouton contrôle ──────────────────────────────────────────────────────────
function CtrlBtn({ onClick, title, active, children, danger, darkMode: dm }) {
  return (
    <button onClick={onClick} title={title} style={{ padding: '7px 11px', borderRadius: 10, border: `1px solid ${dm ? '#334155' : '#e2e8f0'}`, background: danger && active ? '#fee2e2' : active ? '#10b981' : (dm ? '#1e293b' : '#fff'), color: danger && active ? '#dc2626' : active ? '#fff' : (dm ? '#94a3b8' : '#374151'), cursor: 'pointer', fontSize: 13, fontWeight: 600, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}>
      {children}
    </button>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────
export function ReportsMap({ reports = [], onReportClick }) {
  const containerRef = useRef(null);

  const [isClient,        setIsClient]        = useState(false);
  const [selected,        setSelected]        = useState(null);
  const [filterType,      setFilterType]      = useState('all');
  const [filterSev,       setFilterSev]       = useState('all');
  const [filterSta,       setFilterSta]       = useState('all');
  const [mapStyle,        setMapStyle]        = useState('standard');
  const [flyTo,           setFlyTo]           = useState(null);
  const [showLegend,      setShowLegend]      = useState(true);
  const [showStylePicker, setShowStylePicker] = useState(false);
  const [clusterMode,     setClusterMode]     = useState(true);
  const [heatMode,        setHeatMode]        = useState(false);
  const [isFullscreen,    setIsFullscreen]    = useState(false);
  const [locating,        setLocating]        = useState(false);
  const [userLocation,    setUserLocation]    = useState(null);
  const [locError,        setLocError]        = useState(null);
  const [drawMode,        setDrawMode]        = useState(false);
  const [drawnPoints,     setDrawnPoints]     = useState([]);
  const [drawnZone,       setDrawnZone]       = useState(null);
  const [showZoneSummary, setShowZoneSummary] = useState(true);

  // Recherche d'adresse
  const [searchQuery,    setSearchQuery]    = useState('');
  const [searchResults,  setSearchResults]  = useState([]);
  const [searching,      setSearching]      = useState(false);
  const [showSearch,     setShowSearch]     = useState(false);
  const searchTimeoutRef = useRef(null);

  // Zoom rapide par région
  const [showRegionPicker, setShowRegionPicker] = useState(false);

  // Comparaison temporelle
  const [compareMode,    setCompareMode]    = useState(false);
  const [compareDate,    setCompareDate]    = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });

  // Lien partagé (init depuis l'URL au montage)
  const [linkCopied, setLinkCopied] = useState(false);
  const urlInitRef = useRef(false);

  const darkMode = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

  useEffect(() => { setIsClient(true); }, []);

  // Ferme les dropdowns (recherche, régions) au clic extérieur
  useEffect(() => {
    const handler = (e) => {
      if (!containerRef.current) return;
      if (!e.target.closest?.('.map-search-wrap') && showSearch) setShowSearch(false);
      if (!e.target.closest?.('.map-region-wrap') && showRegionPicker) setShowRegionPicker(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showSearch, showRegionPicker]);

  // ── Lecture des filtres depuis l'URL au montage ──────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined' || urlInitRef.current) return;
    urlInitRef.current = true;
    const params = new URLSearchParams(window.location.search);
    const t = params.get('mtype');
    const s = params.get('msev');
    const st = params.get('mstatus');
    const cl = params.get('mcluster');
    const hm = params.get('mheat');
    if (t)  setFilterType(t);
    if (s)  setFilterSev(s);
    if (st) setFilterSta(st);
    if (cl) setClusterMode(cl === '1');
    if (hm) setHeatMode(hm === '1');
  }, []);

  // ── Écriture des filtres actifs dans l'URL (sans recharger la page) ─────────
  useEffect(() => {
    if (typeof window === 'undefined' || !urlInitRef.current) return;
    const params = new URLSearchParams(window.location.search);
    const setOrDelete = (key, val, defaultVal) => {
      if (val && val !== defaultVal) params.set(key, val);
      else params.delete(key);
    };
    setOrDelete('mtype', filterType, 'all');
    setOrDelete('msev', filterSev, 'all');
    setOrDelete('mstatus', filterSta, 'all');
    setOrDelete('mcluster', clusterMode ? '1' : '0', '1');
    setOrDelete('mheat', heatMode ? '1' : '0', '0');
    const newUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}${window.location.hash}`;
    window.history.replaceState(null, '', newUrl);
  }, [filterType, filterSev, filterSta, clusterMode, heatMode]);

  const handleCopyLink = useCallback(() => {
    if (typeof window === 'undefined') return;
    navigator.clipboard?.writeText(window.location.href).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    });
  }, []);

  // ── Recherche d'adresse (géocodage Nominatim/OpenStreetMap) ──────────────────
  const handleSearchChange = useCallback((value) => {
    setSearchQuery(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (value.trim().length < 3) { setSearchResults([]); return; }
    searchTimeoutRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&limit=5&countrycodes=sn&q=${encodeURIComponent(value)}`,
          { headers: { 'Accept-Language': 'fr' } }
        );
        const data = await res.json();
        setSearchResults(Array.isArray(data) ? data : []);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 400);
  }, []);

  const handleSearchSelect = useCallback((result) => {
    setFlyTo({ lat: parseFloat(result.lat), lng: parseFloat(result.lon), zoom: 13 });
    setSearchQuery(result.display_name);
    setSearchResults([]);
    setShowSearch(false);
  }, []);

  const handleRegionSelect = useCallback((regionName) => {
    const r = SENEGAL_REGIONS[regionName];
    if (r) setFlyTo({ lat: r.lat, lng: r.lng, zoom: r.zoom });
    setShowRegionPicker(false);
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) containerRef.current?.requestFullscreen?.();
    else document.exitFullscreen?.();
  }, []);

  const locateUser = useCallback(() => {
    if (!navigator.geolocation) { setLocError('Non supporté'); return; }
    setLocating(true); setLocError(null);
    navigator.geolocation.getCurrentPosition(
      pos => { setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setFlyTo({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLocating(false); },
      ()  => { setLocError('Position indisponible'); setLocating(false); },
      { timeout: 8000, maximumAge: 60000 }
    );
  }, []);

  const handleDrawPoint    = useCallback((pt) => setDrawnPoints(prev => [...prev, pt]), []);
  const handleDrawComplete = useCallback(() => { if (drawnPoints.length >= 3) { setDrawnZone(drawnPoints); setDrawMode(false); setDrawnPoints([]); setShowZoneSummary(true); } }, [drawnPoints]);
  const clearZone          = useCallback(() => { setDrawnZone(null); setDrawnPoints([]); setDrawMode(false); setShowZoneSummary(true); }, []);

  const makeIcon = useCallback((report, isSelected, opacity = 1) => {
    if (typeof window === 'undefined') return null;
    const L   = require('leaflet');
    const sev = SEV_CFG[report.severity] || SEV_CFG.low;
    const typ = TYPE_CFG[report.type]    || TYPE_CFG.other;
    const s   = isSelected ? sev.size * 1.5 : sev.size;
    const pulse = isSelected ? `<circle cx="${(s+12)/2}" cy="${(s+12)/2}" r="${s/2+5}" fill="${sev.color}" opacity="0.2"><animate attributeName="r" from="${s/2+3}" to="${s/2+10}" dur="1.2s" repeatCount="indefinite"/><animate attributeName="opacity" from="0.3" to="0" dur="1.2s" repeatCount="indefinite"/></circle>` : '';
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${s+12}" height="${s+12}" viewBox="0 0 ${s+12} ${s+12}">${pulse}<circle cx="${(s+12)/2}" cy="${(s+12)/2}" r="${s/2+2}" fill="${sev.ring}" opacity="0.45"/><circle cx="${(s+12)/2}" cy="${(s+12)/2}" r="${s/2}" fill="${sev.color}" stroke="white" stroke-width="${isSelected?3:2}"/></svg>`;
    return L.divIcon({ html: `<div style="position:relative;opacity:${opacity};filter:${isSelected?`drop-shadow(0 4px 12px ${sev.color}88)`:'none'}">${svg}<span style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:${Math.round(s*0.55)}px;line-height:1">${typ.icon}</span></div>`, className: '', iconSize: [s+12,s+12], iconAnchor: [(s+12)/2,(s+12)/2] });
  }, []);

  const handleSelect = useCallback((report) => {
    setSelected(report);
    const coords = extractCoords(report);
    if (coords) setFlyTo(coords);
    if (onReportClick) onReportClick(report);
  }, [onReportClick]);

  const filtered = useMemo(() => reports.filter(r => {
    const c = extractCoords(r);
    if (!c) return false;
    if (filterType !== 'all' && r.type     !== filterType) return false;
    if (filterSev  !== 'all' && r.severity !== filterSev)  return false;
    if (filterSta  !== 'all' && r.status   !== filterSta)  return false;
    if (drawnZone) return pointInPolygon([c.lat, c.lng], drawnZone);
    return true;
  }), [reports, filterType, filterSev, filterSta, drawnZone]);

  const withCoords   = useMemo(() => reports.filter(r => extractCoords(r)), [reports]);
  const presentTypes = useMemo(() => [...new Set(reports.map(r => r.type).filter(Boolean))], [reports]);
  const heatPoints   = useMemo(() => filtered.map(r => { const c = extractCoords(r); return c ? { ...c, severity: r.severity } : null; }).filter(Boolean), [filtered]);
  const quickStats   = useMemo(() => ({ critical: filtered.filter(r => r.severity==='critical').length, resolved: filtered.filter(r => r.status==='resolved').length, unresolved: filtered.filter(r => !['resolved','rejected'].includes(r.status)).length }), [filtered]);

  // ── Comparaison temporelle : sépare les signalements avant/après la date pivot ──
  const compareCutoff = useMemo(() => new Date(compareDate).getTime(), [compareDate]);
  const beforeReports = useMemo(() => {
    if (!compareMode) return [];
    return filtered.filter(r => r.createdAt && new Date(r.createdAt).getTime() < compareCutoff);
  }, [filtered, compareMode, compareCutoff]);
  const afterReports = useMemo(() => {
    if (!compareMode) return [];
    return filtered.filter(r => r.createdAt && new Date(r.createdAt).getTime() >= compareCutoff);
  }, [filtered, compareMode, compareCutoff]);

  if (!isClient) return (
    <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #f1f5f9', padding: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
      <div style={{ width: 24, height: 24, border: '2px solid #10b981', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
      <span style={{ color: '#6b7280', fontSize: 14 }}>Chargement de la carte…</span>
    </div>
  );

  return (
    <div ref={containerRef} style={{ background: darkMode ? '#1e293b' : '#fff', borderRadius: isFullscreen ? 0 : 20, border: `1px solid ${darkMode ? '#334155' : '#f1f5f9'}`, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', height: isFullscreen ? '100vh' : 'auto' }}>

      {/* ── En-tête ── */}
      <div style={{ padding: '14px 18px', borderBottom: `1px solid ${darkMode ? '#334155' : '#f1f5f9'}`, flexShrink: 0 }}>

        {/* Titre + contrôles */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: darkMode ? '#f1f5f9' : '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>🗺️ Carte des signalements</h2>
            <p style={{ fontSize: 11, color: darkMode ? '#64748b' : '#94a3b8', margin: '2px 0 0' }}>
              <span style={{ fontWeight: 700, color: '#10b981' }}>{filtered.length}</span> affiché{filtered.length > 1 ? 's' : ''} · <span style={{ fontWeight: 600, color: darkMode ? '#94a3b8' : '#374151' }}>{withCoords.length}</span> localisé{withCoords.length > 1 ? 's' : ''} · <span style={{ fontWeight: 600, color: darkMode ? '#94a3b8' : '#374151' }}>{reports.length}</span> total
              {drawnZone && <span style={{ color: '#8b5cf6', fontWeight: 700 }}> · zone active</span>}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
            <CtrlBtn onClick={() => { setClusterMode(true);  setHeatMode(false); }} active={clusterMode && !heatMode} darkMode={darkMode} title="Clustering">⬡ Clusters</CtrlBtn>
            <CtrlBtn onClick={() => setHeatMode(h => !h)}    active={heatMode}                                        darkMode={darkMode} title="Heatmap">🔥 Heatmap</CtrlBtn>
            <CtrlBtn onClick={locateUser}                     active={!!userLocation}                                  darkMode={darkMode} title="Me localiser">{locating ? '⏳' : userLocation ? '📍' : '🎯'} GPS</CtrlBtn>
            <CtrlBtn onClick={() => { if (drawMode) { setDrawMode(false); setDrawnPoints([]); } else { clearZone(); setDrawMode(true); } }} active={drawMode} danger={drawMode} darkMode={darkMode} title={drawMode ? 'Annuler' : 'Dessiner une zone'}>✏️ {drawMode ? 'Dessiner…' : 'Zone'}</CtrlBtn>
            {drawnZone && <CtrlBtn onClick={() => setShowZoneSummary(s => !s)} active={showZoneSummary} darkMode={darkMode} title="Résumé de la zone">📊 Résumé</CtrlBtn>}
            {drawnZone && <CtrlBtn onClick={clearZone} danger darkMode={darkMode} title="Effacer la zone">✕ Zone</CtrlBtn>}
            <div style={{ position: 'relative' }}>
              <CtrlBtn onClick={() => setShowStylePicker(s => !s)} active={showStylePicker} darkMode={darkMode}>{MAP_STYLES[mapStyle].label}</CtrlBtn>
              {showStylePicker && (
                <div style={{ position: 'absolute', top: '110%', right: 0, zIndex: 200, background: darkMode ? '#1e293b' : '#fff', border: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`, borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', padding: 6, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 155 }}>
                  {Object.entries(MAP_STYLES).map(([k, v]) => (
                    <button key={k} onClick={() => { setMapStyle(k); setShowStylePicker(false); }} style={{ padding: '8px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', background: mapStyle===k ? '#10b981' : 'transparent', color: mapStyle===k ? '#fff' : (darkMode ? '#cbd5e1' : '#374151'), fontSize: 13, fontWeight: 600, textAlign: 'left' }}>{v.label}</button>
                  ))}
                </div>
              )}
            </div>
            <CtrlBtn onClick={toggleFullscreen} active={isFullscreen} darkMode={darkMode} title={isFullscreen ? 'Quitter plein écran' : 'Plein écran'}>{isFullscreen ? '⊡' : '⛶'}</CtrlBtn>
          </div>
        </div>

        {/* Ligne 2 : recherche, régions, comparaison, partage */}
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
          {/* Recherche d'adresse */}
          <div className="map-search-wrap" style={{ position: 'relative', flex: '1 1 220px', maxWidth: 320 }}>
            <input
              type="text"
              value={searchQuery}
              onChange={e => handleSearchChange(e.target.value)}
              onFocus={() => setShowSearch(true)}
              placeholder="🔍 Rechercher un lieu au Sénégal…"
              style={{ width: '100%', padding: '7px 11px', borderRadius: 10, border: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`, background: darkMode ? '#1e293b' : '#fff', color: darkMode ? '#e2e8f0' : '#374151', fontSize: 12, outline: 'none', boxSizing: 'border-box' }}
            />
            {searching && <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 12 }}>⏳</span>}
            {showSearch && searchResults.length > 0 && (
              <div style={{ position: 'absolute', top: '110%', left: 0, right: 0, zIndex: 1100, background: darkMode ? '#1e293b' : '#fff', border: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`, borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.15)', overflow: 'hidden' }}>
                {searchResults.map((r, i) => (
                  <button key={i} onClick={() => handleSearchSelect(r)} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '9px 12px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 12, color: darkMode ? '#cbd5e1' : '#374151', borderBottom: i < searchResults.length - 1 ? `1px solid ${darkMode ? '#334155' : '#f1f5f9'}` : 'none' }}>
                    📍 {r.display_name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Zoom rapide par région */}
          <div className="map-region-wrap" style={{ position: 'relative' }}>
            <CtrlBtn onClick={() => setShowRegionPicker(s => !s)} active={showRegionPicker} darkMode={darkMode} title="Zoomer sur une région">🧭 Régions</CtrlBtn>
            {showRegionPicker && (
              <div style={{ position: 'absolute', top: '110%', left: 0, zIndex: 1100, background: darkMode ? '#1e293b' : '#fff', border: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`, borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.15)', padding: 6, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, minWidth: 280, maxHeight: 280, overflowY: 'auto' }}>
                {Object.keys(SENEGAL_REGIONS).map(name => (
                  <button key={name} onClick={() => handleRegionSelect(name)} style={{ padding: '7px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'transparent', color: darkMode ? '#cbd5e1' : '#374151', fontSize: 12, fontWeight: 600, textAlign: 'left' }}>
                    📍 {name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Comparaison temporelle */}
          <CtrlBtn onClick={() => setCompareMode(c => !c)} active={compareMode} darkMode={darkMode} title="Comparer avant/après une date">📅 Comparer</CtrlBtn>
          {compareMode && (
            <input
              type="date"
              value={compareDate}
              onChange={e => setCompareDate(e.target.value)}
              style={{ padding: '6px 10px', borderRadius: 10, border: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`, background: darkMode ? '#1e293b' : '#fff', color: darkMode ? '#e2e8f0' : '#374151', fontSize: 12, outline: 'none' }}
            />
          )}

          {/* Partage de lien */}
          <CtrlBtn onClick={handleCopyLink} darkMode={darkMode} title="Copier le lien avec les filtres actuels">
            {linkCopied ? '✅ Copié !' : '🔗 Partager'}
          </CtrlBtn>
        </div>

        {/* Stats rapides */}
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 8 }}>
          {[{ label:'Critiques', value: quickStats.critical, color:'#dc2626', bg:'#fee2e2' }, { label:'Non résolus', value: quickStats.unresolved, color:'#f59e0b', bg:'#fffbeb' }, { label:'Résolus', value: quickStats.resolved, color:'#10b981', bg:'#dcfce7' }].map(s => (
            <span key={s.label} style={{ padding: '3px 11px', borderRadius: 99, background: darkMode ? `${s.color}18` : s.bg, color: s.color, fontSize: 11, fontWeight: 700, border: `1px solid ${s.color}28` }}>{s.value} {s.label}</span>
          ))}
          {locError && <span style={{ padding: '3px 11px', borderRadius: 99, background: '#fee2e2', color: '#dc2626', fontSize: 11, fontWeight: 600 }}>⚠️ {locError}</span>}
          {drawMode && <span style={{ padding: '3px 11px', borderRadius: 99, background: '#ede9fe', color: '#7c3aed', fontSize: 11, fontWeight: 700 }}>✏️ Cliquez pour placer des points · Double-clic pour terminer ({drawnPoints.length} pts)</span>}
          {compareMode && (
            <span style={{ padding: '3px 11px', borderRadius: 99, background: darkMode ? '#1e3a5f33' : '#eff6ff', color: '#3b82f6', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
              📅 <span style={{ opacity: 0.4 }}>● avant {new Date(compareDate).toLocaleDateString('fr-FR')}</span> ({beforeReports.length}) · <span>● après</span> ({afterReports.length})
            </span>
          )}
        </div>

        {/* Filtres statut + sévérité */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 6 }}>
          {[{ k:'all', label:'Tous statuts', color:'#6b7280' }, ...Object.entries(STATUS_CFG).map(([k,v])=>({k,...v}))].map(f => (
            <button key={f.k} onClick={() => setFilterSta(f.k)} style={{ padding: '2px 9px', borderRadius: 99, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600, background: filterSta===f.k ? f.color : (darkMode?'#334155':'#f1f5f9'), color: filterSta===f.k?'#fff':(darkMode?'#94a3b8':'#6b7280'), transition: 'all 0.15s' }}>{f.label}</button>
          ))}
          <span style={{ width: 1, background: darkMode?'#334155':'#e2e8f0', margin: '0 3px' }} />
          {[{ k:'all', label:'Ttes sévérités', color:'#6b7280' }, ...Object.entries(SEV_CFG).map(([k,v])=>({k,...v}))].map(f => (
            <button key={f.k} onClick={() => setFilterSev(f.k)} style={{ padding: '2px 9px', borderRadius: 99, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600, background: filterSev===f.k ? f.color : (darkMode?'#334155':'#f1f5f9'), color: filterSev===f.k?'#fff':(darkMode?'#94a3b8':'#6b7280'), transition: 'all 0.15s' }}>{f.label}</button>
          ))}
          {(filterType!=='all'||filterSev!=='all'||filterSta!=='all'||drawnZone) && (
            <button onClick={() => { setFilterType('all'); setFilterSev('all'); setFilterSta('all'); clearZone(); }} style={{ padding: '2px 9px', borderRadius: 99, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, background: '#fee2e2', color: '#dc2626' }}>✕ Tout réinitialiser</button>
          )}
        </div>

        {/* Filtre type */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          <button onClick={() => setFilterType('all')} style={{ padding: '2px 9px', borderRadius: 99, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600, background: filterType==='all'?'#059669':(darkMode?'#334155':'#f1f5f9'), color: filterType==='all'?'#fff':(darkMode?'#94a3b8':'#6b7280'), transition: 'all 0.15s' }}>Tous types</button>
          {presentTypes.map(t => { const cfg = TYPE_CFG[t]||TYPE_CFG.other; return <button key={t} onClick={() => setFilterType(filterType===t?'all':t)} style={{ padding: '2px 9px', borderRadius: 99, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600, background: filterType===t?cfg.color:(darkMode?'#334155':'#f1f5f9'), color: filterType===t?'#fff':(darkMode?'#94a3b8':'#6b7280'), transition: 'all 0.15s' }}>{cfg.icon} {cfg.label}</button>; })}
        </div>
      </div>

      {/* ── Carte ── */}
      <div style={{ position: 'relative', flex: 1, height: isFullscreen ? 'calc(100vh - 200px)' : 560 }}>
        <MapContainer center={[14.4974, -14.4524]} zoom={7} style={{ height: '100%', width: '100%' }} zoomControl={false}>
          <TileLayer url={MAP_STYLES[mapStyle].url} attribution={MAP_STYLES[mapStyle].attr} />
          <ZoomControl position="bottomright" />
          <MapController reports={filtered} flyTo={flyTo} drawMode={drawMode} onDrawPoint={handleDrawPoint} onDrawComplete={handleDrawComplete} drawnPoints={drawnPoints} />

          {/* Clusters */}
          {!heatMode && !compareMode && clusterMode && <ClusterLayer reports={filtered} onSelect={handleSelect} selected={selected} makeIcon={makeIcon} />}

          {/* Mode comparaison : avant (estompé) / après (normal) */}
          {!heatMode && compareMode && clusterMode && (
            <>
              <ClusterLayer reports={beforeReports} onSelect={handleSelect} selected={selected} makeIcon={(r, sel) => makeIcon(r, sel, 0.35)} />
              <ClusterLayer reports={afterReports}  onSelect={handleSelect} selected={selected} makeIcon={(r, sel) => makeIcon(r, sel, 1)} />
            </>
          )}

          {/* Marqueurs individuels (sans clustering) */}
          {!heatMode && !clusterMode && !compareMode && filtered.map(report => {
            const coords = extractCoords(report);
            if (!coords) return null;
            const isSelected = selected?._id === report._id || selected?.id === report.id;
            return (
              <Marker key={report._id||report.id} position={[coords.lat, coords.lng]} icon={makeIcon(report, isSelected)} eventHandlers={{ click: () => handleSelect(report) }} zIndexOffset={isSelected ? 1000 : 0}>
                <Popup closeButton={false}>
                  <div style={{ minWidth: 180, padding: '4px 2px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
                      <span style={{ fontSize: 18 }}>{(TYPE_CFG[report.type]||TYPE_CFG.other).icon}</span>
                      <div><strong style={{ fontSize: 12, color: '#0f172a', display: 'block' }}>{(TYPE_CFG[report.type]||TYPE_CFG.other).label}</strong><span style={{ fontSize: 10, color: '#6b7280' }}>{getCitizenName(report)}</span></div>
                    </div>
                    <button onClick={() => handleSelect(report)} style={{ fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 8, background: '#059669', color: '#fff', border: 'none', cursor: 'pointer', width: '100%' }}>Détails →</button>
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {/* Heatmap */}
          {heatMode && <HeatmapLayer points={heatPoints} />}

          {/* Marqueur GPS utilisateur */}
          {userLocation && (() => {
            if (typeof window === 'undefined') return null;
            const L = require('leaflet');
            const icon = L.divIcon({ html: `<div style="width:20px;height:20px;background:#3b82f6;border:3px solid #fff;border-radius:50%;box-shadow:0 0 0 6px rgba(59,130,246,0.25)"></div>`, className: '', iconSize: [20,20], iconAnchor: [10,10] });
            return <Marker position={[userLocation.lat, userLocation.lng]} icon={icon}><Popup><strong style={{fontSize:12}}>📍 Vous êtes ici</strong></Popup></Marker>;
          })()}

          {/* Polygone en dessin */}
          {drawnPoints.length >= 2 && <Polygon positions={drawnPoints} pathOptions={{ color: '#8b5cf6', fillColor: '#8b5cf6', fillOpacity: 0.1, weight: 2, dashArray: '6 4' }} />}

          {/* Zone finale */}
          {drawnZone && <Polygon positions={drawnZone} pathOptions={{ color: '#8b5cf6', fillColor: '#8b5cf6', fillOpacity: 0.08, weight: 2.5 }} />}
        </MapContainer>

        {/* Panneau de détail */}
        {selected && <DetailPanel report={selected} onClose={() => { setSelected(null); setFlyTo(null); }} darkMode={darkMode} />}

        {/* Résumé de zone dessinée */}
        {drawnZone && !selected && showZoneSummary && (
          <ZoneSummaryPanel
            reports={filtered}
            darkMode={darkMode}
            onClose={() => setShowZoneSummary(false)}
            onClear={clearZone}
          />
        )}

        {/* Aucun résultat */}
        {filtered.length === 0 && !drawMode && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 800 }}>
            <div style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)', borderRadius: 18, padding: '20px 28px', textAlign: 'center', boxShadow: '0 8px 32px rgba(0,0,0,0.12)', pointerEvents: 'auto' }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>🔍</div>
              <p style={{ fontWeight: 700, color: '#374151', fontSize: 14, margin: '0 0 8px' }}>Aucun signalement avec ces filtres</p>
              <button onClick={() => { setFilterType('all'); setFilterSev('all'); setFilterSta('all'); clearZone(); }} style={{ fontSize: 12, color: '#059669', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Réinitialiser</button>
            </div>
          </div>
        )}

        {/* Légende */}
        {showLegend && presentTypes.length > 0 && (
          <div style={{ position: 'absolute', bottom: 52, left: 12, zIndex: 800, background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)', borderRadius: 14, boxShadow: '0 4px 16px rgba(0,0,0,0.1)', padding: '10px 12px', border: '1px solid #f1f5f9', minWidth: 155 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
              <p style={{ fontSize: 10, fontWeight: 800, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1, margin: 0 }}>Légende</p>
              <button onClick={() => setShowLegend(false)} style={{ fontSize: 10, color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>✕</button>
            </div>
            {presentTypes.map(t => { const cfg = TYPE_CFG[t]||TYPE_CFG.other; const count = filtered.filter(r => r.type===t).length; return (
              <div key={t} onClick={() => setFilterType(filterType===t?'all':t)} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '3px 5px', borderRadius: 8, cursor: 'pointer', background: filterType===t?`${cfg.color}12`:'transparent', marginBottom: 1 }}>
                <span style={{ fontSize: 12 }}>{cfg.icon}</span><span style={{ fontSize: 11, color: '#374151', flex: 1 }}>{cfg.label}</span><span style={{ fontSize: 11, fontWeight: 800, color: cfg.color }}>{count}</span>
              </div>
            ); })}
          </div>
        )}
        {!showLegend && <button onClick={() => setShowLegend(true)} style={{ position: 'absolute', bottom: 52, left: 12, zIndex: 800, background: 'rgba(255,255,255,0.9)', border: '1px solid #f1f5f9', borderRadius: 10, padding: '5px 10px', fontSize: 12, fontWeight: 700, color: '#374151', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>📋 Légende</button>}

        {/* Légende heatmap */}
        {heatMode && (
          <div style={{ position: 'absolute', bottom: 52, right: 12, zIndex: 800, background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)', borderRadius: 12, padding: '8px 12px', border: '1px solid #f1f5f9', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <p style={{ fontSize: 10, fontWeight: 800, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 5px' }}>Intensité</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 80, height: 8, borderRadius: 4, background: 'linear-gradient(90deg,#3b82f6,#8b5cf6,#f59e0b,#f97316,#dc2626)' }} />
              <span style={{ fontSize: 9, color: '#9ca3af' }}>Faible → Critique</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Pied ── */}
      <div style={{ padding: '10px 18px', background: darkMode ? '#0f172a' : '#f8fafc', borderTop: `1px solid ${darkMode ? '#334155' : '#f1f5f9'}`, display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', flexShrink: 0 }}>
        {Object.entries(SEV_CFG).map(([k,v]) => { const count = filtered.filter(r => r.severity===k).length; if (!count) return null; return (
          <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 9, height: 9, borderRadius: '50%', background: v.color, flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: darkMode?'#94a3b8':'#6b7280' }}>{v.label}</span>
            <span style={{ fontSize: 11, fontWeight: 800, color: v.color }}>{count}</span>
          </div>
        ); })}
        <span style={{ marginLeft: 'auto', fontSize: 11, color: darkMode?'#475569':'#9ca3af' }}>
          {drawMode ? '✏️ Cliquez pour délimiter · Double-clic pour terminer' : clusterMode ? '⬡ Clustering actif · Cliquez sur un marqueur pour les détails' : 'Cliquez sur un marqueur pour les détails'}
        </span>
      </div>
    </div>
  );
}
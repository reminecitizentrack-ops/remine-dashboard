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
        if (flyTo) { leafMap.flyTo([flyTo.lat, flyTo.lng], 14, { animate: true, duration: 0.9 }); return; }
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

// ─── ClusterLayer ─────────────────────────────────────────────────────────────
const ClusterLayer = dynamic(
  () => Promise.resolve().then(() => {
    return function ClusterLayerInternal({ reports, onSelect, selected, makeIcon }) {
      const { useMap } = require('react-leaflet');
      const map = useMap();
      const groupRef = useRef(null);

      useEffect(() => {
        if (typeof window === 'undefined') return;
        const L = require('leaflet');
        require('leaflet.markercluster');

        if (!document.getElementById('cluster-css')) {
          ['https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css',
           'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css'].forEach(href => {
            const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = href;
            if (!document.getElementById('cluster-css')) { l.id = 'cluster-css'; }
            document.head.appendChild(l);
          });
        }

        if (groupRef.current) map.removeLayer(groupRef.current);

        const group = L.markerClusterGroup({
          maxClusterRadius: 60,
          spiderfyOnMaxZoom: true,
          showCoverageOnHover: true,
          zoomToBoundsOnClick: true,
          iconCreateFunction: (cluster) => {
            const count = cluster.getChildCount();
            const children = cluster.getAllChildMarkers();
            const hasCrit = children.some(m => m.options._severity === 'critical');
            const hasHigh = children.some(m => m.options._severity === 'high');
            const color   = hasCrit ? '#dc2626' : hasHigh ? '#f97316' : '#10b981';
            const size    = count < 10 ? 36 : count < 50 ? 44 : 52;
            return L.divIcon({
              html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};color:#fff;display:flex;align-items:center;justify-content:center;font-size:${count<10?13:12}px;font-weight:900;box-shadow:0 3px 14px ${color}66;border:3px solid rgba(255,255,255,0.85)">${count}</div>`,
              className: '', iconSize: [size, size], iconAnchor: [size/2, size/2],
            });
          },
        });

        reports.forEach(r => {
          const coords = extractCoords(r);
          if (!coords) return;
          const isSelected = selected?._id === r._id || selected?.id === r.id;
          const marker = L.marker([coords.lat, coords.lng], { icon: makeIcon(r, isSelected), _severity: r.severity });
          marker.on('click', () => onSelect(r));
          group.addLayer(marker);
        });

        map.addLayer(group);
        groupRef.current = group;

        return () => { if (groupRef.current) { map.removeLayer(groupRef.current); groupRef.current = null; } };
      }, [reports, selected, map, onSelect, makeIcon]);

      return null;
    };
  }),
  { ssr: false }
);

// ─── HeatmapLayer ─────────────────────────────────────────────────────────────
const HeatmapLayer = dynamic(
  () => Promise.resolve().then(() => {
    return function HeatmapLayerInternal({ points }) {
      const { useMap } = require('react-leaflet');
      const map = useMap();
      const layerRef = useRef(null);

      useEffect(() => {
        if (typeof window === 'undefined' || !points.length) return;
        const load = async () => {
          if (!window.L?.heatLayer) {
            await new Promise((res, rej) => {
              const s = document.createElement('script');
              s.src = 'https://unpkg.com/leaflet.heat@0.2.0/dist/leaflet-heat.js';
              s.onload = res; s.onerror = rej;
              document.head.appendChild(s);
            });
          }
          const L = require('leaflet');
          if (layerRef.current) map.removeLayer(layerRef.current);
          const heat = L.heatLayer(
            points.map(p => [p.lat, p.lng, p.severity === 'critical' ? 1 : p.severity === 'high' ? 0.7 : p.severity === 'medium' ? 0.4 : 0.2]),
            { radius: 35, blur: 25, maxZoom: 17, max: 1, gradient: { 0.1: '#3b82f6', 0.35: '#8b5cf6', 0.6: '#f59e0b', 0.8: '#f97316', 1: '#dc2626' } }
          );
          heat.addTo(map);
          layerRef.current = heat;
        };
        load().catch(console.error);
        return () => { if (layerRef.current) { map.removeLayer(layerRef.current); layerRef.current = null; } };
      }, [points, map]);

      return null;
    };
  }),
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

  const darkMode = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

  useEffect(() => { setIsClient(true); }, []);

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
  const handleDrawComplete = useCallback(() => { if (drawnPoints.length >= 3) { setDrawnZone(drawnPoints); setDrawMode(false); setDrawnPoints([]); } }, [drawnPoints]);
  const clearZone          = useCallback(() => { setDrawnZone(null); setDrawnPoints([]); setDrawMode(false); }, []);

  const makeIcon = useCallback((report, isSelected) => {
    if (typeof window === 'undefined') return null;
    const L   = require('leaflet');
    const sev = SEV_CFG[report.severity] || SEV_CFG.low;
    const typ = TYPE_CFG[report.type]    || TYPE_CFG.other;
    const s   = isSelected ? sev.size * 1.5 : sev.size;
    const pulse = isSelected ? `<circle cx="${(s+12)/2}" cy="${(s+12)/2}" r="${s/2+5}" fill="${sev.color}" opacity="0.2"><animate attributeName="r" from="${s/2+3}" to="${s/2+10}" dur="1.2s" repeatCount="indefinite"/><animate attributeName="opacity" from="0.3" to="0" dur="1.2s" repeatCount="indefinite"/></circle>` : '';
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${s+12}" height="${s+12}" viewBox="0 0 ${s+12} ${s+12}">${pulse}<circle cx="${(s+12)/2}" cy="${(s+12)/2}" r="${s/2+2}" fill="${sev.ring}" opacity="0.45"/><circle cx="${(s+12)/2}" cy="${(s+12)/2}" r="${s/2}" fill="${sev.color}" stroke="white" stroke-width="${isSelected?3:2}"/></svg>`;
    return L.divIcon({ html: `<div style="position:relative;filter:${isSelected?`drop-shadow(0 4px 12px ${sev.color}88)`:'none'}">${svg}<span style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:${Math.round(s*0.55)}px;line-height:1">${typ.icon}</span></div>`, className: '', iconSize: [s+12,s+12], iconAnchor: [(s+12)/2,(s+12)/2] });
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

        {/* Stats rapides */}
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 8 }}>
          {[{ label:'Critiques', value: quickStats.critical, color:'#dc2626', bg:'#fee2e2' }, { label:'Non résolus', value: quickStats.unresolved, color:'#f59e0b', bg:'#fffbeb' }, { label:'Résolus', value: quickStats.resolved, color:'#10b981', bg:'#dcfce7' }].map(s => (
            <span key={s.label} style={{ padding: '3px 11px', borderRadius: 99, background: darkMode ? `${s.color}18` : s.bg, color: s.color, fontSize: 11, fontWeight: 700, border: `1px solid ${s.color}28` }}>{s.value} {s.label}</span>
          ))}
          {locError && <span style={{ padding: '3px 11px', borderRadius: 99, background: '#fee2e2', color: '#dc2626', fontSize: 11, fontWeight: 600 }}>⚠️ {locError}</span>}
          {drawMode && <span style={{ padding: '3px 11px', borderRadius: 99, background: '#ede9fe', color: '#7c3aed', fontSize: 11, fontWeight: 700 }}>✏️ Cliquez pour placer des points · Double-clic pour terminer ({drawnPoints.length} pts)</span>}
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
          {!heatMode && clusterMode && <ClusterLayer reports={filtered} onSelect={handleSelect} selected={selected} makeIcon={makeIcon} />}

          {/* Marqueurs individuels */}
          {!heatMode && !clusterMode && filtered.map(report => {
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
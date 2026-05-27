import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';

const MapContainer   = dynamic(() => import('react-leaflet').then(m => m.MapContainer),   { ssr: false });
const TileLayer      = dynamic(() => import('react-leaflet').then(m => m.TileLayer),      { ssr: false });
const Marker         = dynamic(() => import('react-leaflet').then(m => m.Marker),         { ssr: false });
const Popup          = dynamic(() => import('react-leaflet').then(m => m.Popup),          { ssr: false });
const CircleMarker   = dynamic(() => import('react-leaflet').then(m => m.CircleMarker),   { ssr: false });
const ZoomControl    = dynamic(() => import('react-leaflet').then(m => m.ZoomControl),    { ssr: false });

const MapController = dynamic(
  () => import('react-leaflet').then(mod => {
    const { useMap } = mod;
    return function MapControllerInternal({ reports, flyTo }) {
      const map = useMap();
      useEffect(() => {
        if (flyTo) { map.flyTo([flyTo.lat, flyTo.lng], 13, { animate: true, duration: 1 }); return; }
        if (!reports.length) { map.setView([14.4974, -14.4524], 6); return; }
        const L = require('leaflet');
        const grp = new L.FeatureGroup();
        reports.forEach(r => {
          const c = extractCoords(r);
          if (c) grp.addLayer(L.circleMarker([c.lat, c.lng]));
        });
        if (grp.getLayers().length > 0) {
          try { map.fitBounds(grp.getBounds(), { padding: [50, 50], maxZoom: 12 }); } catch {}
        }
      }, [reports, flyTo]);
      return null;
    };
  }),
  { ssr: false }
);

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
      || (Array.isArray(r.location?.coordinates)
          ? tryPair(r.location.coordinates[1], r.location.coordinates[0]) : null)
      || null;
}

const TYPE_CFG = {
  water_pollution:    { icon: '💧', label: 'Pollution eau',     color: '#3b82f6', bg: '#eff6ff' },
  air_pollution:      { icon: '💨', label: 'Pollution air',     color: '#8b5cf6', bg: '#f5f3ff' },
  soil_contamination: { icon: '🟤', label: 'Contamination sol', color: '#92400e', bg: '#fef3c7' },
  waste_deposit:      { icon: '🗑️', label: 'Dépôt déchets',    color: '#f59e0b', bg: '#fffbeb' },
  dust:               { icon: '🌫️', label: 'Poussière',        color: '#9ca3af', bg: '#f9fafb' },
  abandoned_site:     { icon: '🏚️', label: 'Site abandonné',   color: '#6b7280', bg: '#f3f4f6' },
  noise_pollution:    { icon: '🔊', label: 'Pollution sonore',  color: '#ec4899', bg: '#fdf2f8' },
  other:              { icon: '⚠️', label: 'Autre',            color: '#6b7280', bg: '#f3f4f6' },
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
  standard: {
    label: '🗺️ Standard',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attr: '© OpenStreetMap',
  },
  satellite: {
    label: '🛰️ Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attr: '© Esri',
  },
  dark: {
    label: '🌙 Sombre',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attr: '© CartoDB',
  },
};

const getCitizenName = r => {
  const c = r?.citizen;
  if (c && typeof c === 'object') return `${c.firstName || ''} ${c.lastName || ''}`.trim() || c.email || 'Anonyme';
  return typeof c === 'string' ? c : 'Anonyme';
};

const fmtDate = d => d ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

// ─── Panneau de détail ────────────────────────────────────────────────────────
function DetailPanel({ report, onClose, darkMode }) {
  if (!report) return null;
  const coords = extractCoords(report);
  const type = TYPE_CFG[report.type]      || TYPE_CFG.other;
  const sev  = SEV_CFG[report.severity]   || SEV_CFG.low;
  const sta  = STATUS_CFG[report.status]  || { label: report.status, bg: '#f3f4f6', color: '#374151' };
  const dm   = darkMode;

  return (
    <div style={{
      position: 'absolute', top: 12, right: 12, zIndex: 1000, width: 300,
      background: dm ? '#1e293b' : '#fff',
      borderRadius: 20, boxShadow: '0 8px 40px rgba(0,0,0,0.18)', border: `1px solid ${dm ? '#334155' : '#f1f5f9'}`,
      overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: 'calc(100% - 24px)',
      animation: 'detailPanelIn 0.25s cubic-bezier(0.22,1,0.36,1) both',
    }}>
      <style>{`@keyframes detailPanelIn { from { opacity:0; transform:translateX(16px) scale(0.97); } to { opacity:1; transform:translateX(0) scale(1); } }`}</style>

      {/* Header coloré */}
      <div style={{ background: `linear-gradient(135deg, ${sev.color}22, ${type.bg})`, padding: '14px 16px', borderBottom: `1px solid ${dm ? '#334155' : '#f1f5f9'}`, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 28, flexShrink: 0 }}>{type.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontWeight: 800, fontSize: 14, color: dm ? '#f1f5f9' : '#0f172a', margin: 0 }}>{type.label}</p>
          <p style={{ fontSize: 11, color: dm ? '#94a3b8' : '#64748b', margin: 0, marginTop: 2 }}>{getCitizenName(report)}</p>
        </div>
        <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: '50%', background: dm ? '#334155' : '#f1f5f9', border: 'none', cursor: 'pointer', color: dm ? '#94a3b8' : '#64748b', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 700 }}>✕</button>
      </div>

      <div style={{ overflowY: 'auto', flex: 1, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Badges */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: `${sev.color}18`, color: sev.color, border: `1px solid ${sev.color}30` }}>● {sev.label}</span>
          <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 99, background: sta.bg, color: sta.color }}>{sta.label}</span>
          {report.isVerified && <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 99, background: '#e0f2fe', color: '#0369a1' }}>✓ IA</span>}
        </div>

        {/* Description */}
        {report.description && (
          <p style={{ fontSize: 12, color: dm ? '#cbd5e1' : '#374151', lineHeight: 1.6, margin: 0, padding: '10px 12px', background: dm ? '#0f172a' : '#f8fafc', borderRadius: 10, border: `1px solid ${dm ? '#1e293b' : '#f1f5f9'}` }}>
            {report.description.substring(0, 180)}{report.description.length > 180 ? '…' : ''}
          </p>
        )}

        {/* Localisation */}
        <div style={{ padding: '10px 12px', background: '#eff6ff', borderRadius: 10, border: '1px solid #bfdbfe' }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#1d4ed8', margin: '0 0 4px' }}>📍 Localisation</p>
          <p style={{ fontSize: 12, fontWeight: 600, color: '#1e3a8a', margin: 0 }}>{report.location?.address || '—'}</p>
          {report.location?.city && <p style={{ fontSize: 11, color: '#3b82f6', margin: '2px 0 0' }}>{report.location.city}{report.location.region ? `, ${report.location.region}` : ''}</p>}
          {coords && <p style={{ fontSize: 10, color: '#93c5fd', fontFamily: 'monospace', margin: '3px 0 0' }}>{coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}</p>}
        </div>

        {/* Score IA + votes */}
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

// ─── Bouton de contrôle carte ─────────────────────────────────────────────────
function MapCtrlBtn({ onClick, title, active, children, darkMode }) {
  const dm = darkMode;
  return (
    <button onClick={onClick} title={title} style={{
      padding: '7px 10px', borderRadius: 10, border: `1px solid ${dm ? '#334155' : '#e2e8f0'}`,
      background: active ? '#10b981' : (dm ? '#1e293b' : '#fff'),
      color: active ? '#fff' : (dm ? '#94a3b8' : '#374151'),
      cursor: 'pointer', fontSize: 13, fontWeight: 600,
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)', transition: 'all 0.15s',
      display: 'flex', alignItems: 'center', gap: 5,
    }}>
      {children}
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
  const [mapStyle,   setMapStyle]   = useState('standard');
  const [flyTo,      setFlyTo]      = useState(null);
  const [heatMode,   setHeatMode]   = useState(false);
  const [showLegend, setShowLegend] = useState(true);
  const [showStylePicker, setShowStylePicker] = useState(false);
  const darkMode = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

  useEffect(() => { setIsClient(true); }, []);

  const makeIcon = useCallback((report, isSelected) => {
    if (typeof window === 'undefined') return null;
    const L   = require('leaflet');
    const sev = SEV_CFG[report.severity] || SEV_CFG.low;
    const typ = TYPE_CFG[report.type]    || TYPE_CFG.other;
    const s   = isSelected ? sev.size * 1.5 : sev.size;
    const pulse = isSelected ? `<circle cx="${(s+12)/2}" cy="${(s+12)/2}" r="${s/2+5}" fill="${sev.color}" opacity="0.2"><animate attributeName="r" from="${s/2+3}" to="${s/2+9}" dur="1.2s" repeatCount="indefinite"/><animate attributeName="opacity" from="0.3" to="0" dur="1.2s" repeatCount="indefinite"/></circle>` : '';
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${s+12}" height="${s+12}" viewBox="0 0 ${s+12} ${s+12}">
      ${pulse}
      <circle cx="${(s+12)/2}" cy="${(s+12)/2}" r="${s/2+2}" fill="${sev.ring}" opacity="0.45"/>
      <circle cx="${(s+12)/2}" cy="${(s+12)/2}" r="${s/2}" fill="${sev.color}" stroke="white" stroke-width="${isSelected ? 3 : 2}"/>
    </svg>`;
    return L.divIcon({
      html: `<div style="position:relative;filter:${isSelected ? 'drop-shadow(0 4px 12px ' + sev.color + '88)' : 'none'}">${svg}<span style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:${Math.round(s*0.55)}px;line-height:1;">${typ.icon}</span></div>`,
      className: '',
      iconSize:   [s + 12, s + 12],
      iconAnchor: [(s + 12) / 2, (s + 12) / 2],
    });
  }, []);

  const filtered = useMemo(() => reports.filter(r => {
    if (!extractCoords(r)) return false;
    if (filterType !== 'all' && r.type     !== filterType) return false;
    if (filterSev  !== 'all' && r.severity !== filterSev)  return false;
    if (filterSta  !== 'all' && r.status   !== filterSta)  return false;
    return true;
  }), [reports, filterType, filterSev, filterSta]);

  const withCoords   = useMemo(() => reports.filter(r => extractCoords(r)), [reports]);
  const presentTypes = useMemo(() => [...new Set(reports.map(r => r.type).filter(Boolean))], [reports]);

  // Stats rapides pour le bandeau supérieur
  const quickStats = useMemo(() => ({
    critical: filtered.filter(r => r.severity === 'critical').length,
    resolved: filtered.filter(r => r.status === 'resolved').length,
    unresolved: filtered.filter(r => !['resolved','rejected'].includes(r.status)).length,
  }), [filtered]);

  const handleClick = (report) => {
    setSelected(report);
    const coords = extractCoords(report);
    if (coords) setFlyTo(coords);
    if (onReportClick) onReportClick(report);
  };

  if (!isClient) return (
    <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #f1f5f9', padding: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
      <div style={{ width: 24, height: 24, border: '2px solid #10b981', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
      <span style={{ color: '#6b7280', fontSize: 14 }}>Chargement de la carte…</span>
    </div>
  );

  const currentStyle = MAP_STYLES[mapStyle];

  return (
    <div style={{ background: darkMode ? '#1e293b' : '#fff', borderRadius: 20, border: `1px solid ${darkMode ? '#334155' : '#f1f5f9'}`, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>

      {/* ── En-tête ── */}
      <div style={{ padding: '16px 20px', borderBottom: `1px solid ${darkMode ? '#334155' : '#f1f5f9'}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 800, color: darkMode ? '#f1f5f9' : '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              🗺️ Carte des signalements
            </h2>
            <p style={{ fontSize: 12, color: darkMode ? '#64748b' : '#94a3b8', margin: '3px 0 0' }}>
              <span style={{ fontWeight: 700, color: '#10b981' }}>{filtered.length}</span> affiché{filtered.length > 1 ? 's' : ''} ·{' '}
              <span style={{ fontWeight: 600, color: darkMode ? '#94a3b8' : '#374151' }}>{withCoords.length}</span> localisé{withCoords.length > 1 ? 's' : ''} ·{' '}
              <span style={{ fontWeight: 600, color: darkMode ? '#94a3b8' : '#374151' }}>{reports.length}</span> total
            </p>
          </div>

          {/* Contrôles style carte */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', position: 'relative' }}>
            <MapCtrlBtn onClick={() => setShowStylePicker(s => !s)} title="Changer le fond de carte" active={showStylePicker} darkMode={darkMode}>
              🗺️ {MAP_STYLES[mapStyle].label.split(' ')[1]}
            </MapCtrlBtn>
            {showStylePicker && (
              <div style={{ position: 'absolute', top: '110%', right: 0, zIndex: 100, background: darkMode ? '#1e293b' : '#fff', border: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`, borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', padding: 6, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 150 }}>
                {Object.entries(MAP_STYLES).map(([k, v]) => (
                  <button key={k} onClick={() => { setMapStyle(k); setShowStylePicker(false); }} style={{ padding: '8px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', background: mapStyle === k ? '#10b981' : 'transparent', color: mapStyle === k ? '#fff' : (darkMode ? '#cbd5e1' : '#374151'), fontSize: 13, fontWeight: 600, textAlign: 'left' }}>
                    {v.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Bande de stats rapides */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          {[
            { label: 'Critiques', value: quickStats.critical, color: '#dc2626', bg: '#fee2e2' },
            { label: 'Non résolus', value: quickStats.unresolved, color: '#f59e0b', bg: '#fffbeb' },
            { label: 'Résolus', value: quickStats.resolved, color: '#10b981', bg: '#dcfce7' },
          ].map(s => (
            <div key={s.label} style={{ padding: '4px 12px', borderRadius: 99, background: darkMode ? `${s.color}18` : s.bg, color: s.color, fontSize: 12, fontWeight: 700, border: `1px solid ${s.color}30` }}>
              {s.value} {s.label}
            </div>
          ))}
        </div>

        {/* Filtres statut */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
          {[{ k: 'all', label: 'Tous', color: '#6b7280' }, ...Object.entries(STATUS_CFG).map(([k, v]) => ({ k, ...v }))].map(f => (
            <button key={f.k} onClick={() => setFilterSta(f.k)} style={{
              padding: '3px 10px', borderRadius: 99, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600,
              background: filterSta === f.k ? f.color : (darkMode ? '#334155' : '#f1f5f9'),
              color: filterSta === f.k ? '#fff' : (darkMode ? '#94a3b8' : '#6b7280'),
              transition: 'all 0.15s',
            }}>{f.label}</button>
          ))}
          <span style={{ width: 1, background: darkMode ? '#334155' : '#e2e8f0', margin: '0 4px' }} />
          {[{ k: 'all', label: 'Ttes sévérités', color: '#6b7280' }, ...Object.entries(SEV_CFG).map(([k, v]) => ({ k, ...v }))].map(f => (
            <button key={f.k} onClick={() => setFilterSev(f.k)} style={{
              padding: '3px 10px', borderRadius: 99, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600,
              background: filterSev === f.k ? f.color : (darkMode ? '#334155' : '#f1f5f9'),
              color: filterSev === f.k ? '#fff' : (darkMode ? '#94a3b8' : '#6b7280'),
              transition: 'all 0.15s',
            }}>{f.label}</button>
          ))}
          {(filterType !== 'all' || filterSev !== 'all' || filterSta !== 'all') && (
            <button onClick={() => { setFilterType('all'); setFilterSev('all'); setFilterSta('all'); }} style={{ padding: '3px 10px', borderRadius: 99, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, background: '#fee2e2', color: '#dc2626' }}>
              ✕ Réinitialiser
            </button>
          )}
        </div>

        {/* Filtre type */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          <button onClick={() => setFilterType('all')} style={{ padding: '3px 10px', borderRadius: 99, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600, background: filterType === 'all' ? '#059669' : (darkMode ? '#334155' : '#f1f5f9'), color: filterType === 'all' ? '#fff' : (darkMode ? '#94a3b8' : '#6b7280'), transition: 'all 0.15s' }}>
            Tous types
          </button>
          {presentTypes.map(t => {
            const cfg = TYPE_CFG[t] || TYPE_CFG.other;
            return (
              <button key={t} onClick={() => setFilterType(filterType === t ? 'all' : t)} style={{ padding: '3px 10px', borderRadius: 99, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600, background: filterType === t ? cfg.color : (darkMode ? '#334155' : '#f1f5f9'), color: filterType === t ? '#fff' : (darkMode ? '#94a3b8' : '#6b7280'), transition: 'all 0.15s' }}>
                {cfg.icon} {cfg.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Carte ── */}
      <div style={{ position: 'relative', height: 540 }}>
        <MapContainer center={[14.4974, -14.4524]} zoom={7} style={{ height: '100%', width: '100%' }} zoomControl={false}>
          <TileLayer url={currentStyle.url} attribution={currentStyle.attr} />
          <ZoomControl position="bottomright" />
          <MapController reports={filtered} flyTo={flyTo} />

          {filtered.map(report => {
            const coords = extractCoords(report);
            if (!coords) return null;
            const isSelected = selected?._id === report._id || selected?.id === report.id;
            const icon = makeIcon(report, isSelected);

            return (
              <Marker
                key={report._id || report.id}
                position={[coords.lat, coords.lng]}
                icon={icon}
                eventHandlers={{ click: () => handleClick(report) }}
                zIndexOffset={isSelected ? 1000 : 0}
              >
                <Popup closeButton={false} className="remine-popup">
                  <div style={{ minWidth: 190, padding: '6px 2px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <span style={{ fontSize: 20 }}>{(TYPE_CFG[report.type] || TYPE_CFG.other).icon}</span>
                      <div>
                        <strong style={{ fontSize: 12, color: '#0f172a', display: 'block' }}>{(TYPE_CFG[report.type] || TYPE_CFG.other).label}</strong>
                        <span style={{ fontSize: 10, color: '#6b7280' }}>{getCitizenName(report)}</span>
                      </div>
                    </div>
                    {report.description && (
                      <p style={{ fontSize: 11, color: '#374151', marginBottom: 8, lineHeight: 1.5 }}>
                        {report.description.substring(0, 90)}{report.description.length > 90 ? '…' : ''}
                      </p>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 99, background: (SEV_CFG[report.severity] || SEV_CFG.low).color + '20', color: (SEV_CFG[report.severity] || SEV_CFG.low).color }}>
                        {(SEV_CFG[report.severity] || SEV_CFG.low).label}
                      </span>
                      <button onClick={() => handleClick(report)} style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 8, background: '#059669', color: '#fff', border: 'none', cursor: 'pointer' }}>
                        Détails →
                      </button>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>

        {/* Panneau de détail */}
        {selected && <DetailPanel report={selected} onClose={() => { setSelected(null); setFlyTo(null); }} darkMode={darkMode} />}

        {/* Aucun résultat */}
        {filtered.length === 0 && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 800 }}>
            <div style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)', borderRadius: 18, padding: '20px 28px', textAlign: 'center', boxShadow: '0 8px 32px rgba(0,0,0,0.12)', pointerEvents: 'auto' }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>🔍</div>
              <p style={{ fontWeight: 700, color: '#374151', fontSize: 14, margin: '0 0 8px' }}>Aucun signalement avec ces filtres</p>
              <button onClick={() => { setFilterType('all'); setFilterSev('all'); setFilterSta('all'); }} style={{ fontSize: 12, color: '#059669', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                Réinitialiser les filtres
              </button>
            </div>
          </div>
        )}

        {/* Légende types — coin bas gauche */}
        {showLegend && presentTypes.length > 0 && (
          <div style={{ position: 'absolute', bottom: 48, left: 12, zIndex: 800, background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)', borderRadius: 14, boxShadow: '0 4px 16px rgba(0,0,0,0.1)', padding: '10px 12px', border: '1px solid #f1f5f9', minWidth: 160 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <p style={{ fontSize: 10, fontWeight: 800, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1, margin: 0 }}>Légende</p>
              <button onClick={() => setShowLegend(false)} style={{ fontSize: 10, color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>✕</button>
            </div>
            {presentTypes.map(t => {
              const cfg = TYPE_CFG[t] || TYPE_CFG.other;
              const count = reports.filter(r => r.type === t && extractCoords(r)).length;
              return (
                <div key={t} onClick={() => setFilterType(filterType === t ? 'all' : t)}
                  style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '4px 6px', borderRadius: 8, cursor: 'pointer', background: filterType === t ? `${cfg.color}15` : 'transparent', marginBottom: 2 }}>
                  <span style={{ fontSize: 13 }}>{cfg.icon}</span>
                  <span style={{ fontSize: 11, color: '#374151', flex: 1 }}>{cfg.label}</span>
                  <span style={{ fontSize: 11, fontWeight: 800, color: cfg.color }}>{count}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Bouton afficher légende */}
        {!showLegend && (
          <button onClick={() => setShowLegend(true)} style={{ position: 'absolute', bottom: 48, left: 12, zIndex: 800, background: 'rgba(255,255,255,0.95)', border: '1px solid #f1f5f9', borderRadius: 10, padding: '6px 10px', fontSize: 12, fontWeight: 700, color: '#374151', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
            📋 Légende
          </button>
        )}
      </div>

      {/* ── Pied : barre de sévérités ── */}
      <div style={{ padding: '12px 20px', background: darkMode ? '#0f172a' : '#f8fafc', borderTop: `1px solid ${darkMode ? '#334155' : '#f1f5f9'}`, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
        {Object.entries(SEV_CFG).map(([k, v]) => {
          const count = filtered.filter(r => r.severity === k).length;
          if (!count) return null;
          return (
            <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: v.color, flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: darkMode ? '#94a3b8' : '#6b7280' }}>{v.label}</span>
              <span style={{ fontSize: 12, fontWeight: 800, color: v.color }}>{count}</span>
            </div>
          );
        })}
        <span style={{ marginLeft: 'auto', fontSize: 11, color: darkMode ? '#475569' : '#9ca3af' }}>
          Cliquez sur un marqueur pour les détails
        </span>
      </div>
    </div>
  );
}
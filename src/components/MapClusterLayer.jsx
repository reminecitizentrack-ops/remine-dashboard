import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';

export default function MapClusterLayer({ reports, onSelect, selected, makeIcon }) {
  const map = useMap();
  const groupRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let L;
    try { L = require('leaflet'); } catch { return; }

    // CSS clusters
    if (!document.getElementById('cluster-css-1')) {
      const l1 = document.createElement('link');
      l1.id = 'cluster-css-1'; l1.rel = 'stylesheet';
      l1.href = 'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css';
      document.head.appendChild(l1);
    }
    if (!document.getElementById('cluster-css-2')) {
      const l2 = document.createElement('link');
      l2.id = 'cluster-css-2'; l2.rel = 'stylesheet';
      l2.href = 'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css';
      document.head.appendChild(l2);
    }

    try { require('leaflet.markercluster'); } catch {}

    if (groupRef.current) { map.removeLayer(groupRef.current); groupRef.current = null; }

    if (!L.markerClusterGroup) return;

    const group = L.markerClusterGroup({
      maxClusterRadius: 60,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: true,
      zoomToBoundsOnClick: true,
      iconCreateFunction: (cluster) => {
        const count    = cluster.getChildCount();
        const children = cluster.getAllChildMarkers();
        const hasCrit  = children.some(m => m.options._severity === 'critical');
        const hasHigh  = children.some(m => m.options._severity === 'high');
        const color    = hasCrit ? '#dc2626' : hasHigh ? '#f97316' : '#10b981';
        const size     = count < 10 ? 36 : count < 50 ? 44 : 52;
        return L.divIcon({
          html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};color:#fff;display:flex;align-items:center;justify-content:center;font-size:${count<10?13:12}px;font-weight:900;box-shadow:0 3px 14px ${color}66;border:3px solid rgba(255,255,255,0.85)">${count}</div>`,
          className: '', iconSize: [size, size], iconAnchor: [size/2, size/2],
        });
      },
    });

    reports.forEach(r => {
      const c = extractCoords(r);
      if (!c) return;
      const isSelected = selected?._id === r._id || selected?.id === r.id;
      try {
        const icon   = makeIcon(r, isSelected);
        const marker = L.marker([c.lat, c.lng], { icon, _severity: r.severity });
        marker.on('click', () => onSelect(r));
        group.addLayer(marker);
      } catch {}
    });

    map.addLayer(group);
    groupRef.current = group;

    return () => {
      if (groupRef.current) { try { map.removeLayer(groupRef.current); } catch {} groupRef.current = null; }
    };
  }, [reports, selected, map, onSelect, makeIcon]);

  return null;
}

function extractCoords(r) {
  if (!r) return null;
  const tryPair = (lat, lng) => {
    const a = parseFloat(lat), b = parseFloat(lng);
    if (!isNaN(a) && !isNaN(b) && a>=-90 && a<=90 && b>=-180 && b<=180 && !(a===0&&b===0)) return { lat:a, lng:b };
    return null;
  };
  return tryPair(r.location?.latitude, r.location?.longitude)
      || tryPair(r.latitude, r.longitude)
      || tryPair(r.coordinates?.lat, r.coordinates?.lng)
      || (Array.isArray(r.location?.coordinates) ? tryPair(r.location.coordinates[1], r.location.coordinates[0]) : null)
      || null;
}
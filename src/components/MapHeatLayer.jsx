import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';

export default function MapHeatLayer({ points = [] }) {
  const map      = useMap();
  const layerRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!Array.isArray(points) || points.length === 0) return;

    const load = async () => {
      // Charger leaflet.heat si absent
      if (!window.L?.heatLayer) {
        await new Promise((res, rej) => {
          if (document.getElementById('leaflet-heat-script')) { res(); return; }
          const s = document.createElement('script');
          s.id      = 'leaflet-heat-script';
          s.src     = 'https://unpkg.com/leaflet.heat@0.2.0/dist/leaflet-heat.js';
          s.onload  = res;
          s.onerror = rej;
          document.head.appendChild(s);
        });
      }

      let L;
      try { L = require('leaflet'); } catch { return; }
      if (!L.heatLayer) return;

      // Supprimer l'ancienne couche
      if (layerRef.current) {
        try { map.removeLayer(layerRef.current); } catch {}
        layerRef.current = null;
      }

      const heatData = points
        .filter(p => p && typeof p.lat === 'number' && typeof p.lng === 'number')
        .map(p => [
          p.lat, p.lng,
          p.severity === 'critical' ? 1.0
            : p.severity === 'high'   ? 0.7
            : p.severity === 'medium' ? 0.4
            : 0.2,
        ]);

      if (!heatData.length) return;

      const layer = L.heatLayer(heatData, {
        radius: 35, blur: 25, maxZoom: 17, max: 1.0,
        gradient: { 0.1: '#3b82f6', 0.35: '#8b5cf6', 0.6: '#f59e0b', 0.8: '#f97316', 1.0: '#dc2626' },
      });

      layer.addTo(map);
      layerRef.current = layer;
    };

    load().catch(console.error);

    return () => {
      if (layerRef.current) {
        try { map.removeLayer(layerRef.current); } catch {}
        layerRef.current = null;
      }
    };
  }, [points, map]);

  return null;
}
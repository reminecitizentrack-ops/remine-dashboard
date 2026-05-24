// components/MarkerClusterGroup.jsx
'use client';

import React, { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.markercluster';

// Correction des icônes Leaflet
const fixLeafletIcons = () => {
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  });
};

const MarkerClusterGroup = ({ reports, onReportClick }) => {
  const map = useMap();

  useEffect(() => {
    if (!reports.length) return;

    fixLeafletIcons();

    const markerClusterGroup = L.markerClusterGroup({
      maxClusterRadius: 50,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: true,
      zoomToBoundsOnClick: true,
      
      iconCreateFunction: function(cluster) {
        const count = cluster.getChildCount();
        let clusterColor = '#6B7280';
        
        if (count > 10) clusterColor = '#EF4444';
        else if (count > 5) clusterColor = '#F59E0B';
        else clusterColor = '#10B981';

        const size = count < 10 ? 'small' : count < 50 ? 'medium' : 'large';
        
        return L.divIcon({
          html: `
            <div style="
              background-color: ${clusterColor};
              color: white;
              border: 3px solid white;
              border-radius: 50%;
              box-shadow: 0 2px 6px rgba(0,0,0,0.3);
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: bold;
            " class="cluster-${size}">
              ${count}
            </div>
          `,
          iconSize: size === 'small' ? [40, 40] : size === 'medium' ? [50, 50] : [60, 60],
          className: 'marker-cluster-custom'
        });
      }
    });

    // Ajouter les marqueurs
    reports.forEach(report => {
      const icon = L.divIcon({
        html: `
          <div style="
            background-color: ${
              report.type === 'water_pollution' ? '#3B82F6' :
              report.type === 'dust' ? '#F59E0B' :
              report.type === 'abandoned_site' ? '#EF4444' :
              report.type === 'waste_deposit' ? '#8B5CF6' : '#6B7280'
            };
            width: 32px;
            height: 32px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 14px;
            border: 3px solid white;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            cursor: pointer;
          ">
            ${
              report.type === 'water_pollution' ? '💧' :
              report.type === 'dust' ? '💨' :
              report.type === 'abandoned_site' ? '🏭' :
              report.type === 'waste_deposit' ? '🗑️' : '⚠️'
            }
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        className: 'custom-marker'
      });

      const marker = L.marker([report.latitude, report.longitude], { icon });
      
      marker.bindPopup(`
        <div style="min-width: 250px; padding: 16px; font-family: system-ui;">
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
            <div style="
              width: 40px; 
              height: 40px; 
              border-radius: 50%; 
              background: ${
                report.type === 'water_pollution' ? '#3B82F6' :
                report.type === 'dust' ? '#F59E0B' :
                report.type === 'abandoned_site' ? '#EF4444' :
                report.type === 'waste_deposit' ? '#8B5CF6' : '#6B7280'
              }; 
              display: flex; 
              align-items: center; 
              justify-content: center; 
              color: white;
            ">
              ${
                report.type === 'water_pollution' ? '💧' :
                report.type === 'dust' ? '💨' :
                report.type === 'abandoned_site' ? '🏭' :
                report.type === 'waste_deposit' ? '🗑️' : '⚠️'
              }
            </div>
            <div>
              <h4 style="font-weight: bold; margin: 0; color: #111827; text-transform: capitalize;">
                ${report.type?.replace('_', ' ') || 'Signalement'}
              </h4>
              <p style="margin: 0; font-size: 12px; color: #6B7280;">
                ${report.address || 'Localisation inconnue'}
              </p>
            </div>
          </div>
          
          <p style="margin: 0 0 12px 0; color: #374151; font-size: 14px; line-height: 1.4;">
            ${report.description}
          </p>
          
          <button 
            onclick="window.dispatchEvent(new CustomEvent('reportClick', { detail: ${JSON.stringify(report)} }))"
            style="
              width: 100%; 
              background: #10B981; 
              color: white; 
              border: none; 
              padding: 8px 16px; 
              border-radius: 6px; 
              cursor: pointer; 
              font-size: 14px;
            "
          >
            📋 Voir les détails
          </button>
        </div>
      `);

      marker.on('click', () => {
        onReportClick && onReportClick(report);
      });

      markerClusterGroup.addLayer(marker);
    });

    // Gérer les clics depuis les popups
    const handleReportClick = (event) => {
      onReportClick && onReportClick(event.detail);
    };
    
    window.addEventListener('reportClick', handleReportClick);
    map.addLayer(markerClusterGroup);

    // Ajuster la vue
    if (reports.length > 0) {
      const group = L.featureGroup(
        reports.map(report => L.marker([report.latitude, report.longitude]))
      );
      if (group.getBounds().isValid()) {
        map.fitBounds(group.getBounds().pad(0.1));
      }
    }

    return () => {
      window.removeEventListener('reportClick', handleReportClick);
      map.removeLayer(markerClusterGroup);
    };
  }, [map, reports, onReportClick]);

  return null;
};

export default MarkerClusterGroup;
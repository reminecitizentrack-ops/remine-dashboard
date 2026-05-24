// components/ReportsMapClient.jsx - VERSION CORRIGÉE
'use client';

import React, { useEffect, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';

// Chargement dynamique des composants Leaflet (côté client uniquement)
const MapContainer = dynamic(
  () => import('react-leaflet').then(mod => mod.MapContainer),
  { ssr: false }
);

const TileLayer = dynamic(
  () => import('react-leaflet').then(mod => mod.TileLayer),
  { ssr: false }
);

const Marker = dynamic(
  () => import('react-leaflet').then(mod => mod.Marker),
  { ssr: false }
);

const Popup = dynamic(
  () => import('react-leaflet').then(mod => mod.Popup),
  { ssr: false }
);

const MarkerClusterGroup = dynamic(
  () => import('./MarkerClusterGroup'),
  { ssr: false }
);

export const ReportsMapClient = ({ reports, onReportClick }) => {
  const [isClient, setIsClient] = useState(false);

  // ✅ S'assurer que reports est un tableau
  const safeReports = useMemo(() => Array.isArray(reports) ? reports : [], [reports]);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Filtrer les rapports avec des coordonnées valides
  const validReports = useMemo(() => 
    safeReports.filter(report => 
      report.latitude && report.longitude &&
      !isNaN(report.latitude) && !isNaN(report.longitude)
    ), [safeReports]
  );

  if (!isClient) {
    return (
      <div className="bg-white rounded-lg shadow border p-6">
        <div className="h-96 bg-gray-100 rounded flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-2"></div>
            <p className="text-gray-600">Initialisation de la carte...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow border p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-semibold">🗺️ Carte Interactive</h3>
        <div className="text-sm text-gray-600">
          {validReports.length} signalement(s)
        </div>
      </div>

      {validReports.length === 0 ? (
        <div className="h-96 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl mb-4">🗺️</div>
            <p className="text-gray-600 font-medium text-lg">Aucun signalement localisé</p>
            <p className="text-gray-500 mt-2">Les signalements apparaîtront une fois géolocalisés</p>
          </div>
        </div>
      ) : (
        <div className="relative rounded-lg overflow-hidden border-2 border-gray-200">
          <MapContainer
            center={[46.603, 1.888]}
            zoom={6}
            style={{ height: '500px', width: '100%' }}
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MarkerClusterGroup 
              reports={validReports} 
              onReportClick={onReportClick} 
            />
          </MapContainer>
        </div>
      )}
    </div>
  );
};
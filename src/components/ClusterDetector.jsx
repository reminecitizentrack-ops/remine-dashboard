// components/ClusterDetector.jsx
// Détection automatique de clusters d'incidents géospatiaux + interprétation IA
import React, { useState, useCallback, useEffect } from 'react';

function useDark() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const check = () => setDark(document.documentElement.classList.contains('dark'));
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);
  return dark;
}

const TYPE_FR = {
  water_pollution: 'Pollution eau', air_pollution: 'Pollution air',
  soil_contamination: 'Contamination sol', waste_deposit: 'Dépôts déchets',
  dust: 'Poussière', noise_pollution: 'Bruit', other: 'Autre',
};

const RISK_CONFIG = {
  low:      { label: 'Faible',    bg: 'rgba(34,197,94,0.12)',  border: 'rgba(34,197,94,0.35)',  text: '#16a34a', dot: '#22c55e' },
  medium:   { label: 'Moyen',     bg: 'rgba(234,179,8,0.12)',  border: 'rgba(234,179,8,0.35)',  text: '#b45309', dot: '#eab308' },
  high:     { label: 'Élevé',     bg: 'rgba(249,115,22,0.12)', border: 'rgba(249,115,22,0.35)', text: '#c2410c', dot: '#f97316' },
  critical: { label: 'Critique',  bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.35)',  text: '#dc2626', dot: '#ef4444' },
};

const TYPE_ICONS = {
  water_pollution: '💧', air_pollution: '🌫️', soil_contamination: '🟤',
  waste_deposit: '🗑️', dust: '💨', noise_pollution: '🔊', other: '⚠️',
};

export function ClusterDetector({ reports = [] }) {
  const dark = useDark();
  const [result, setResult]         = useState(null);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState(null);
  const [expanded, setExpanded]     = useState(null);
  const [params, setParams]         = useState({ radiusKm: 2, minReports: 3, dayWindow: 30 });
  const [showParams, setShowParams] = useState(false);

  const bg    = dark ? '#0f1f15' : '#ffffff';
  const card  = dark ? 'rgba(255,255,255,0.04)' : '#f9fafb';
  const bord  = dark ? 'rgba(255,255,255,0.08)' : '#e5e7eb';
  const txt   = dark ? '#f1f5f9' : '#111827';
  const muted = dark ? 'rgba(255,255,255,0.45)' : '#6b7280';
  const accent = '#2dd460';

  const run = useCallback(async () => {
    const geo = reports.filter(r => {
      const lat = r.location?.latitude ?? r.location?.coordinates?.[1] ?? r.latitude;
      const lng = r.location?.longitude ?? r.location?.coordinates?.[0] ?? r.longitude;
      return lat && lng && !isNaN(parseFloat(lat)) && !isNaN(parseFloat(lng));
    });

    if (geo.length < params.minReports) {
      setError(`Seulement ${geo.length} signalement(s) géolocalisé(s) trouvé(s). Il en faut au moins ${params.minReports}.`);
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setExpanded(null);

    try {
      const res = await fetch('/api/ai/cluster-detection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reports, ...params }),
      });
      const data = await res.json();
      if (data.success) setResult(data);
      else setError(data.error || 'Erreur lors de l\'analyse');
    } catch {
      setError('Impossible de contacter l\'API. Vérifiez votre connexion.');
    } finally {
      setLoading(false);
    }
  }, [reports, params]);

  // Lancer automatiquement au montage si assez de données
  useEffect(() => {
    if (reports.length >= 5) run();
  }, []);  // eslint-disable-line

  const geoCount = reports.filter(r => {
    const lat = r.location?.latitude ?? r.location?.coordinates?.[1] ?? r.latitude;
    const lng = r.location?.longitude ?? r.location?.coordinates?.[0] ?? r.longitude;
    return lat && lng && !isNaN(parseFloat(lat)) && !isNaN(parseFloat(lng));
  }).length;

  return (
    <div style={{ background: bg, border: `1px solid ${bord}`, borderRadius: 16, padding: 24, fontFamily: 'inherit' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <span style={{ fontSize: 22 }}>🧬</span>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: txt }}>Détection de Clusters IA</h3>
            {result?.model === 'claude' && (
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: accent, background: 'rgba(45,212,96,0.1)', border: '1px solid rgba(45,212,96,0.25)', borderRadius: 20, padding: '2px 8px' }}>Claude IA</span>
            )}
          </div>
          <p style={{ margin: 0, fontSize: 12, color: muted }}>
            Détecte automatiquement les concentrations géographiques et temporelles d'incidents
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button
            onClick={() => setShowParams(!showParams)}
            style={{ padding: '6px 12px', fontSize: 12, borderRadius: 8, border: `1px solid ${bord}`, background: 'transparent', color: muted, cursor: 'pointer' }}
          >
            ⚙️ Paramètres
          </button>
          <button
            onClick={run}
            disabled={loading}
            style={{ padding: '6px 14px', fontSize: 12, fontWeight: 600, borderRadius: 8, border: 'none', background: loading ? 'rgba(45,212,96,0.4)' : accent, color: '#fff', cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}
          >
            {loading ? '⏳ Analyse...' : '🔍 Analyser'}
          </button>
        </div>
      </div>

      {/* Params panel */}
      {showParams && (
        <div style={{ background: card, border: `1px solid ${bord}`, borderRadius: 12, padding: 16, marginBottom: 20, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {[
            { key: 'radiusKm', label: 'Rayon (km)', min: 0.5, max: 20, step: 0.5 },
            { key: 'minReports', label: 'Signalements min.', min: 2, max: 10, step: 1 },
            { key: 'dayWindow', label: 'Fenêtre (jours)', min: 7, max: 90, step: 7 },
          ].map(({ key, label, min, max, step }) => (
            <div key={key}>
              <label style={{ fontSize: 11, fontWeight: 600, color: muted, textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: 6 }}>
                {label} : <strong style={{ color: txt }}>{params[key]}</strong>
              </label>
              <input
                type="range" min={min} max={max} step={step} value={params[key]}
                onChange={e => setParams(p => ({ ...p, [key]: parseFloat(e.target.value) }))}
                style={{ width: '100%', accentColor: accent }}
              />
            </div>
          ))}
        </div>
      )}

      {/* Coverage info */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { label: 'Signalements totaux', val: reports.length },
          { label: 'Géolocalisés', val: geoCount, accent: geoCount > 0 },
          ...(result ? [
            { label: 'Clusters détectés', val: result.clusters.length, accent: result.clusters.length > 0 },
            { label: 'Points analysés', val: result.totalPointsAnalyzed },
          ] : []),
        ].map(({ label, val, accent: isAccent }) => (
          <div key={label} style={{ background: card, border: `1px solid ${bord}`, borderRadius: 8, padding: '6px 12px', fontSize: 12 }}>
            <span style={{ color: muted }}>{label} : </span>
            <strong style={{ color: isAccent ? accent : txt }}>{val}</strong>
          </div>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10, padding: '12px 16px', color: '#f87171', fontSize: 13, marginBottom: 16 }}>
          ⚠️ {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '32px 0' }}>
          <div style={{ fontSize: 32, marginBottom: 12, animation: 'spin 1s linear infinite', display: 'inline-block' }}>🔬</div>
          <p style={{ color: muted, fontSize: 14, margin: 0 }}>Calcul des clusters en cours...</p>
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* No clusters */}
      {result && result.clusters.length === 0 && !loading && (
        <div style={{ textAlign: 'center', padding: '32px 0' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
          <p style={{ color: txt, fontSize: 14, fontWeight: 600, margin: '0 0 6px' }}>Aucun cluster détecté</p>
          <p style={{ color: muted, fontSize: 13, margin: 0 }}>{result.message || `Aucune concentration anormale sur ${params.dayWindow} jours avec un rayon de ${params.radiusKm}km.`}</p>
        </div>
      )}

      {/* Global summary */}
      {result?.globalSummary && result.clusters.length > 0 && (
        <div style={{ background: 'rgba(45,212,96,0.07)', border: '1px solid rgba(45,212,96,0.2)', borderRadius: 12, padding: '14px 16px', marginBottom: 20, fontSize: 13, color: dark ? '#86efac' : '#166534', lineHeight: 1.6 }}>
          🌍 <strong>Synthèse globale :</strong> {result.globalSummary}
        </div>
      )}

      {/* Clusters list */}
      {result?.clusters && result.clusters.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {result.clusters
            .sort((a, b) => (b.count || 0) - (a.count || 0))
            .map(cluster => {
              const risk = RISK_CONFIG[cluster.riskLevel] || RISK_CONFIG.medium;
              const isOpen = expanded === cluster.id;
              const isMostUrgent = result.mostUrgentClusterId === cluster.id;

              return (
                <div
                  key={cluster.id}
                  style={{ border: `1px solid ${isOpen ? risk.border : bord}`, borderLeft: `4px solid ${risk.dot}`, borderRadius: 12, overflow: 'hidden', transition: 'all 0.2s', background: isOpen ? risk.bg : 'transparent' }}
                >
                  {/* Cluster header */}
                  <button
                    onClick={() => setExpanded(isOpen ? null : cluster.id)}
                    style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '14px 16px', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12 }}
                  >
                    {/* Badge */}
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: risk.bg, border: `1px solid ${risk.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                      {TYPE_ICONS[cluster.dominantType] || '⚠️'}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: txt }}>
                          Zone #{cluster.id} — {cluster.location}
                        </span>
                        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: risk.text, background: risk.bg, border: `1px solid ${risk.border}`, borderRadius: 20, padding: '1px 7px', flexShrink: 0 }}>
                          {risk.label}
                        </span>
                        {isMostUrgent && (
                          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: '#dc2626', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 20, padding: '1px 7px', flexShrink: 0 }}>
                            🚨 Prioritaire
                          </span>
                        )}
                        {cluster.isUrgent && !isMostUrgent && (
                          <span style={{ fontSize: 18 }}>🔥</span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: muted }}>
                        <strong style={{ color: cluster.count >= 5 ? '#f97316' : txt }}>{cluster.count}</strong> signalements
                        {' · '}{cluster.spanDays} jour(s)
                        {' · '}{cluster.center.radius.toFixed(1)} km de rayon
                        {cluster.hasCritical && <span style={{ color: '#ef4444', marginLeft: 8 }}>● incidents critiques</span>}
                      </div>
                    </div>

                    <span style={{ color: muted, fontSize: 18, flexShrink: 0 }}>{isOpen ? '▲' : '▼'}</span>
                  </button>

                  {/* Alert bar */}
                  {cluster.alert && (
                    <div style={{ background: risk.bg, borderTop: `1px solid ${risk.border}`, padding: '8px 16px 8px 20px', fontSize: 12, color: risk.text, fontStyle: 'italic' }}>
                      💬 {cluster.alert}
                    </div>
                  )}

                  {/* Expanded details */}
                  {isOpen && (
                    <div style={{ borderTop: `1px solid ${bord}`, padding: '16px 16px 20px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

                        {/* Interprétation */}
                        {cluster.interpretation && (
                          <div style={{ gridColumn: '1 / -1', background: card, border: `1px solid ${bord}`, borderRadius: 10, padding: '12px 14px' }}>
                            <p style={{ margin: 0, fontSize: 13, color: txt, lineHeight: 1.6 }}>
                              🤖 <strong>Interprétation IA :</strong> {cluster.interpretation}
                            </p>
                          </div>
                        )}

                        {/* Types */}
                        <div>
                          <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '1px' }}>Types d'incidents</p>
                          {Object.entries(cluster.types || {}).sort((a,b) => b[1]-a[1]).map(([t, n]) => (
                            <div key={t} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: `1px solid ${bord}`, fontSize: 12 }}>
                              <span style={{ color: txt }}>{TYPE_ICONS[t]} {TYPE_FR[t] || t}</span>
                              <strong style={{ color: accent }}>{n}</strong>
                            </div>
                          ))}
                        </div>

                        {/* Sévérités */}
                        <div>
                          <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '1px' }}>Sévérités</p>
                          {Object.entries(cluster.severities || {}).sort((a,b) => b[1]-a[1]).map(([s, n]) => {
                            const sc = { critical: '#ef4444', high: '#f97316', medium: '#eab308', low: '#22c55e', unknown: muted }[s] || muted;
                            return (
                              <div key={s} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: `1px solid ${bord}`, fontSize: 12 }}>
                                <span style={{ color: sc, fontWeight: 600, textTransform: 'capitalize' }}>● {s}</span>
                                <strong style={{ color: txt }}>{n}</strong>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Actions recommandées */}
                      {cluster.recommendedActions?.length > 0 && (
                        <div style={{ marginBottom: 16 }}>
                          <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '1px' }}>Actions recommandées</p>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {cluster.recommendedActions.map((a, i) => (
                              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12, color: txt }}>
                                <span style={{ color: accent, fontWeight: 700, flexShrink: 0 }}>{i + 1}.</span> {a}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Coords */}
                      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        <div style={{ fontSize: 11, color: muted, fontFamily: 'monospace', background: card, border: `1px solid ${bord}`, borderRadius: 6, padding: '4px 8px' }}>
                          📍 {cluster.center.lat.toFixed(4)}, {cluster.center.lng.toFixed(4)}
                        </div>
                        <div style={{ fontSize: 11, color: muted, background: card, border: `1px solid ${bord}`, borderRadius: 6, padding: '4px 8px' }}>
                          🗓️ {cluster.firstDate?.slice(0, 10)} → {cluster.lastDate?.slice(0, 10)}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
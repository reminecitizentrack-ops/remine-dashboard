// pages/api/ai/cluster-detection.js
// Détection de clusters géospatiaux + interprétation Claude

// ─── DBSCAN simplifié ────────────────────────────────────────────────────────
// distance en km entre deux points GPS (Haversine)
function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function dbscan(points, radiusKm, minPts) {
  const n = points.length;
  const labels = new Array(n).fill(-1); // -1 = bruit
  let clusterId = 0;

  const neighbors = (idx) =>
    points.reduce((acc, _, j) => {
      if (
        j !== idx &&
        haversine(
          points[idx].lat, points[idx].lng,
          points[j].lat,  points[j].lng
        ) <= radiusKm
      ) acc.push(j);
      return acc;
    }, []);

  for (let i = 0; i < n; i++) {
    if (labels[i] !== -1) continue;
    const nb = neighbors(i);
    if (nb.length < minPts - 1) continue; // bruit

    labels[i] = clusterId;
    const queue = [...nb];
    while (queue.length) {
      const j = queue.shift();
      if (labels[j] === -1) labels[j] = clusterId; // bruit → bord
      if (labels[j] !== -1 && labels[j] !== clusterId) continue;
      labels[j] = clusterId;
      const nb2 = neighbors(j);
      if (nb2.length >= minPts - 1) queue.push(...nb2.filter(k => labels[k] !== clusterId));
    }
    clusterId++;
  }

  // Regrouper par cluster
  const clusters = {};
  points.forEach((p, i) => {
    if (labels[i] === -1) return;
    if (!clusters[labels[i]]) clusters[labels[i]] = [];
    clusters[labels[i]].push(p);
  });

  return Object.values(clusters);
}

// ─── Centroïde + rayon ───────────────────────────────────────────────────────
function clusterStats(points) {
  const lat = points.reduce((s, p) => s + p.lat, 0) / points.length;
  const lng = points.reduce((s, p) => s + p.lng, 0) / points.length;
  const radius = Math.max(...points.map(p => haversine(lat, lng, p.lat, p.lng)));
  return { lat, lng, radius: Math.max(radius, 0.1) };
}

// ─── Handler ─────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method !== 'POST')
    return res.status(405).json({ error: 'Méthode non autorisée' });

  const { reports = [], radiusKm = 2, minReports = 3, dayWindow = 30 } = req.body;

  // 1. Extraire les points avec coords valides dans la fenêtre temporelle
  const cutoff = Date.now() - dayWindow * 24 * 3600 * 1000;
  const points = reports
    .filter(r => {
      const lat =
        r.location?.latitude ?? r.location?.coordinates?.[1] ?? r.latitude;
      const lng =
        r.location?.longitude ?? r.location?.coordinates?.[0] ?? r.longitude;
      const date = r.createdAt ? new Date(r.createdAt).getTime() : 0;
      return lat && lng && !isNaN(lat) && !isNaN(lng) && date >= cutoff;
    })
    .map(r => ({
      lat: parseFloat(r.location?.latitude ?? r.location?.coordinates?.[1] ?? r.latitude),
      lng: parseFloat(r.location?.longitude ?? r.location?.coordinates?.[0] ?? r.longitude),
      report: r,
    }));

  if (points.length < minReports) {
    return res.status(200).json({
      success: true,
      clusters: [],
      message: 'Pas assez de signalements géolocalisés pour détecter des clusters.',
      model: 'none',
    });
  }

  // 2. DBSCAN
  const rawClusters = dbscan(points, radiusKm, minReports);

  // 3. Préparer les données structurées des clusters
  const clustersData = rawClusters.map((pts, i) => {
    const center = clusterStats(pts);
    const reps = pts.map(p => p.report);
    const types = reps.reduce((acc, r) => {
      acc[r.type || 'other'] = (acc[r.type || 'other'] || 0) + 1;
      return acc;
    }, {});
    const severities = reps.reduce((acc, r) => {
      acc[r.severity || 'unknown'] = (acc[r.severity || 'unknown'] || 0) + 1;
      return acc;
    }, {});
    const dates = reps.map(r => new Date(r.createdAt)).sort((a, b) => a - b);
    const spanDays = Math.ceil((dates[dates.length - 1] - dates[0]) / (24 * 3600 * 1000));
    const location =
      reps[0]?.location?.city ||
      reps[0]?.location?.region ||
      reps[0]?.location?.address?.split(',')[0]?.trim() ||
      `${center.lat.toFixed(3)}, ${center.lng.toFixed(3)}`;

    return {
      id: i + 1,
      count: pts.length,
      center,
      location,
      types,
      severities,
      spanDays,
      firstDate: dates[0]?.toISOString(),
      lastDate: dates[dates.length - 1]?.toISOString(),
      dominantType: Object.entries(types).sort((a, b) => b[1] - a[1])[0]?.[0],
      hasCritical: !!severities.critical,
      reports: reps.slice(0, 5).map(r => ({
        id: r._id,
        type: r.type,
        severity: r.severity,
        description: (r.description || '').substring(0, 80),
        date: r.createdAt,
      })),
    };
  });

  // 4. Interprétation Claude (si clé dispo)
  let interpretations = null;
  let model = 'local';

  if (process.env.ANTHROPIC_API_KEY && clustersData.length > 0) {
    try {
      const prompt = `Tu es un expert en analyse environnementale au Sénégal (zones minières, pollution, santé publique).

Voici ${clustersData.length} cluster(s) de signalements environnementaux détectés automatiquement :

${clustersData.map(c => `CLUSTER ${c.id} — ${c.count} signalements
- Zone : ${c.location}
- Période : ${c.spanDays} jour(s), du ${c.firstDate?.slice(0,10)} au ${c.lastDate?.slice(0,10)}
- Types : ${Object.entries(c.types).map(([t,n])=>`${t}(${n})`).join(', ')}
- Sévérités : ${Object.entries(c.severities).map(([s,n])=>`${s}(${n})`).join(', ')}
- Rayon estimé : ${c.center.radius.toFixed(1)} km`).join('\n\n')}

Réponds UNIQUEMENT en JSON valide (sans markdown) avec ce schéma exact :
{
  "clusters": [
    {
      "id": 1,
      "interpretation": "phrase courte expliquant le pattern (ex: concentration de pollutions minières)",
      "riskLevel": "low|medium|high|critical",
      "alert": "alerte courte pour l'admin (1 phrase)",
      "recommendedActions": ["action1", "action2", "action3"],
      "isUrgent": true|false
    }
  ],
  "globalSummary": "synthèse globale en 2 phrases",
  "mostUrgentClusterId": 1
}`;

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1200,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const text = data.content?.[0]?.text || '';
        const match = text.match(/\{[\s\S]*\}/);
        if (match) {
          interpretations = JSON.parse(match[0]);
          model = 'claude';
        }
      }
    } catch (e) {
      console.error('Claude cluster interpretation error:', e.message);
    }
  }

  // 5. Fallback local si pas Claude
  if (!interpretations) {
    const TYPE_FR = {
      water_pollution: 'pollution eau', air_pollution: 'pollution air',
      soil_contamination: 'contamination sol', waste_deposit: 'dépôts déchets',
      dust: 'poussière', noise_pollution: 'bruit', other: 'incidents',
    };
    interpretations = {
      clusters: clustersData.map(c => ({
        id: c.id,
        interpretation: `Concentration de ${TYPE_FR[c.dominantType] || c.dominantType} (${c.count} signalements en ${c.spanDays}j)`,
        riskLevel: c.hasCritical ? 'critical' : c.count >= 8 ? 'high' : c.count >= 5 ? 'medium' : 'low',
        alert: `${c.count} incidents en ${c.spanDays} jours dans la zone ${c.location} — surveillance recommandée`,
        recommendedActions: [
          'Envoyer une équipe d\'inspection sur site',
          'Croiser avec les données historiques de la zone',
          'Alerter les autorités locales compétentes',
        ],
        isUrgent: c.hasCritical || c.count >= 6,
      })),
      globalSummary: `${clustersData.length} zone(s) à forte concentration détectée(s) sur les ${dayWindow} derniers jours. ${clustersData.filter(c => c.hasCritical).length} zone(s) avec incidents critiques.`,
      mostUrgentClusterId: clustersData.sort((a, b) => b.count - a.count)[0]?.id || 1,
    };
  }

  // 6. Fusionner données + interprétations
  const finalClusters = clustersData.map(c => {
    const interp = interpretations.clusters?.find(i => i.id === c.id) || {};
    return { ...c, ...interp };
  });

  return res.status(200).json({
    success: true,
    clusters: finalClusters,
    globalSummary: interpretations.globalSummary,
    mostUrgentClusterId: interpretations.mostUrgentClusterId,
    totalPointsAnalyzed: points.length,
    params: { radiusKm, minReports, dayWindow },
    model,
    generatedAt: new Date().toISOString(),
  });
}
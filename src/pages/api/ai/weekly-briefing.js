// pages/api/ai/weekly-briefing.js
// Génère le rapport hebdomadaire IA via Claude

export default async function handler(req, res) {
  if (req.method !== 'POST')
    return res.status(405).json({ error: 'Méthode non autorisée' });

  const { reports = [], users = [], period = '7d' } = req.body;

  const periodDays = period === '30d' ? 30 : period === '14d' ? 14 : 7;
  const now = Date.now();
  const cutoff   = new Date(now - periodDays * 24 * 3600 * 1000);
  const prevCutoff = new Date(now - periodDays * 2 * 24 * 3600 * 1000);

  // ─── Stats de base ──────────────────────────────────────────────────────────
  const periodReports = reports.filter(r => r.createdAt && new Date(r.createdAt) >= cutoff);
  const prevReports   = reports.filter(r => {
    const d = r.createdAt && new Date(r.createdAt);
    return d && d >= prevCutoff && d < cutoff;
  });

  const countByStatus = (arr) =>
    arr.reduce((acc, r) => { acc[r.status || 'unknown'] = (acc[r.status || 'unknown'] || 0) + 1; return acc; }, {});

  const countByType = (arr) =>
    arr.reduce((acc, r) => { acc[r.type || 'other'] = (acc[r.type || 'other'] || 0) + 1; return acc; }, {});

  const countBySeverity = (arr) =>
    arr.reduce((acc, r) => { acc[r.severity || 'unknown'] = (acc[r.severity || 'unknown'] || 0) + 1; return acc; }, {});

  const countByRegion = (arr) => {
    const acc = {};
    arr.forEach(r => {
      const zone = r.location?.region || r.location?.city || r.location?.address?.split(',')[0]?.trim() || 'Inconnu';
      acc[zone] = (acc[zone] || 0) + 1;
    });
    return acc;
  };

  const resolved = periodReports.filter(r => r.status === 'resolved').length;
  const resRate = periodReports.length ? Math.round((resolved / periodReports.length) * 100) : 0;
  const prevResolved = prevReports.filter(r => r.status === 'resolved').length;
  const prevResRate = prevReports.length ? Math.round((prevResolved / prevReports.length) * 100) : 0;

  const evolution = periodReports.length - prevReports.length;
  const evolutionPct = prevReports.length
    ? Math.round(((periodReports.length - prevReports.length) / prevReports.length) * 100)
    : null;

  // Jours de la semaine avec le plus d'incidents
  const byDayOfWeek = [0,0,0,0,0,0,0];
  periodReports.forEach(r => {
    if (r.createdAt) byDayOfWeek[new Date(r.createdAt).getDay()]++;
  });
  const DAYS_FR = ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'];
  const peakDay = DAYS_FR[byDayOfWeek.indexOf(Math.max(...byDayOfWeek))];

  const stats = {
    total: periodReports.length,
    prevTotal: prevReports.length,
    evolution,
    evolutionPct,
    resolved,
    resolutionRate: resRate,
    prevResolutionRate: prevResRate,
    critical: periodReports.filter(r => r.severity === 'critical').length,
    newUsers: (users || []).filter(u => u.createdAt && new Date(u.createdAt) >= cutoff).length,
    byStatus:   countByStatus(periodReports),
    byType:     countByType(periodReports),
    bySeverity: countBySeverity(periodReports),
    byRegion:   countByRegion(periodReports),
    peakDay,
    topRegions: Object.entries(countByRegion(periodReports))
      .sort((a, b) => b[1] - a[1]).slice(0, 5)
      .map(([region, count]) => ({ region, count })),
    topTypes: Object.entries(countByType(periodReports))
      .sort((a, b) => b[1] - a[1]).slice(0, 4)
      .map(([type, count]) => ({ type, count })),
    unresolvedCritical: periodReports.filter(r => r.severity === 'critical' && r.status !== 'resolved').length,
  };

  // ─── Génération Claude ──────────────────────────────────────────────────────
  let briefing = null;
  let model = 'local';

  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const TYPE_FR = {
        water_pollution: 'Pollution eau', air_pollution: 'Pollution air',
        soil_contamination: 'Contamination sol', waste_deposit: 'Dépôts déchets',
        dust: 'Poussière', noise_pollution: 'Bruit', other: 'Autre',
      };

      const prompt = `Tu es un analyste environnemental expert en surveillance minière au Sénégal.

Génère un rapport de synthèse hebdomadaire basé sur ces données réelles de la plateforme ReMine Citizen Track :

PÉRIODE : ${periodDays} derniers jours
SIGNALEMENTS : ${stats.total} (${evolution >= 0 ? '+' : ''}${evolution} vs période précédente${evolutionPct !== null ? `, ${evolutionPct >= 0 ? '+' : ''}${evolutionPct}%` : ''})
TAUX DE RÉSOLUTION : ${stats.resolutionRate}% (était ${stats.prevResolutionRate}%)
INCIDENTS CRITIQUES NON RÉSOLUS : ${stats.unresolvedCritical}
NOUVEAUX UTILISATEURS : ${stats.newUsers}
JOUR RECORD : ${peakDay}

PAR TYPE :
${stats.topTypes.map(t => `  - ${TYPE_FR[t.type] || t.type} : ${t.count}`).join('\n')}

PAR RÉGION (top 5) :
${stats.topRegions.map(r => `  - ${r.region} : ${r.count} signalements`).join('\n')}

PAR SÉVÉRITÉ :
${Object.entries(stats.bySeverity).map(([s,n])=>`  - ${s} : ${n}`).join('\n')}

Réponds UNIQUEMENT en JSON valide (sans markdown) :
{
  "headline": "titre accrocheur du rapport (15 mots max)",
  "executiveSummary": "synthèse en 3 phrases pour un décideur",
  "keyFindings": [
    { "icon": "emoji", "title": "titre court", "detail": "1 phrase d'explication", "severity": "info|warning|critical" }
  ],
  "trendAnalysis": "analyse des tendances sur 2-3 phrases, comparaison avec la période précédente",
  "criticalZones": [
    { "zone": "nom de la zone", "reason": "pourquoi c'est critique", "urgency": "high|critical" }
  ],
  "recommendations": [
    { "priority": "immédiate|court-terme|moyen-terme", "action": "action concrète à prendre", "target": "qui doit agir" }
  ],
  "positiveHighlights": ["point positif 1", "point positif 2"],
  "outlookNextWeek": "prévision courte pour la semaine suivante"
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
          max_tokens: 1500,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const text = data.content?.[0]?.text || '';
        const match = text.match(/\{[\s\S]*\}/);
        if (match) {
          briefing = JSON.parse(match[0]);
          model = 'claude';
        }
      }
    } catch (e) {
      console.error('Claude weekly briefing error:', e.message);
    }
  }

  // ─── Fallback local ─────────────────────────────────────────────────────────
  if (!briefing) {
    const trend = stats.evolutionPct === null ? 'stable'
      : stats.evolutionPct > 10 ? 'en hausse' : stats.evolutionPct < -10 ? 'en baisse' : 'stable';

    briefing = {
      headline: `${stats.total} signalements sur ${periodDays} jours — taux de résolution ${stats.resolutionRate}%`,
      executiveSummary: `La plateforme a enregistré ${stats.total} signalements sur la période, ${trend} par rapport aux ${periodDays} jours précédents. Le taux de résolution est de ${stats.resolutionRate}%. ${stats.unresolvedCritical > 0 ? `${stats.unresolvedCritical} incident(s) critique(s) restent non résolus et nécessitent une attention immédiate.` : 'Aucun incident critique non résolu.'}`,
      keyFindings: [
        { icon: '📊', title: `${stats.total} signalements`, detail: `${evolution >= 0 ? '+' : ''}${evolution} vs période précédente`, severity: evolution > 5 ? 'warning' : 'info' },
        { icon: '✅', title: `${stats.resolutionRate}% résolus`, detail: `${resolved} signalements traités sur ${stats.total}`, severity: stats.resolutionRate >= 60 ? 'info' : 'warning' },
        ...(stats.unresolvedCritical > 0 ? [{ icon: '🚨', title: `${stats.unresolvedCritical} critiques non résolus`, detail: 'Nécessitent une intervention immédiate', severity: 'critical' }] : []),
      ],
      trendAnalysis: `Les signalements sont ${trend} avec ${stats.total} incidents recensés. La zone la plus touchée est ${stats.topRegions[0]?.region || 'non déterminée'} (${stats.topRegions[0]?.count || 0} cas).`,
      criticalZones: stats.topRegions.slice(0, 3).map(r => ({
        zone: r.region,
        reason: `${r.count} signalements concentrés sur la période`,
        urgency: r.count >= 5 ? 'high' : 'medium',
      })),
      recommendations: [
        ...(stats.unresolvedCritical > 0 ? [{ priority: 'immédiate', action: `Traiter les ${stats.unresolvedCritical} signalements critiques en attente`, target: 'Équipe terrain' }] : []),
        { priority: 'court-terme', action: `Renforcer la surveillance en ${stats.topRegions[0]?.region || 'zones prioritaires'}`, target: 'Coordinateurs régionaux' },
        { priority: 'moyen-terme', action: 'Analyser les patterns récurrents pour prévention proactive', target: 'Équipe analytique' },
      ],
      positiveHighlights: [
        ...(stats.resolutionRate >= 50 ? [`${stats.resolutionRate}% de taux de résolution atteint`] : []),
        ...(stats.newUsers > 0 ? [`${stats.newUsers} nouveau(x) citoyen(s) inscrit(s)`] : []),
        ...(stats.resolutionRate > stats.prevResolutionRate ? ['Taux de résolution en amélioration'] : []),
      ],
      outlookNextWeek: `Sur la base des tendances actuelles, ${stats.total > stats.prevTotal ? 'une légère augmentation des signalements est possible' : 'le volume devrait rester stable'}. Priorité : zones ${stats.topRegions[0]?.region || 'à risque'}.`,
    };
  }

  return res.status(200).json({
    success: true,
    briefing,
    stats,
    period,
    periodDays,
    model,
    generatedAt: new Date().toISOString(),
  });
}
// services/aiService.js
export const aiService = {

  async analyzeReport(reportData) {
    try {
      const response = await fetch('/api/ai/analyze-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: reportData.description,
          type: reportData.type,
          location: reportData.location,
          photos: reportData.photos
        })
      });
      const data = await response.json();
      return data.data || data;
    } catch (error) {
      return this.localAnalysis(reportData);
    }
  },

  async prioritizeReports(reports) {
    const safe = Array.isArray(reports) ? reports : [];
    const scored = safe.map(report => {
      const severity  = this.calculateSeverity(report);
      const urgency   = this.calculateUrgency(report);
      const impact    = this.calculateImpact(report);
      const locRisk   = this.calculateLocationRisk(report.location);
      const aiScore   = severity * 0.4 + urgency * 0.3 + impact * 0.2 + locRisk * 0.1;
      const priority  = aiScore >= 8 ? 'critical' : aiScore >= 6 ? 'high' : aiScore >= 4 ? 'medium' : 'low';
      return {
        ...report,
        aiScore,
        priority,
        recommendedActions: this.suggestActions(report)
      };
    });
    return scored.sort((a, b) => b.aiScore - a.aiScore);
  },

  async detectPatterns(reports) {
    const safe = Array.isArray(reports) ? reports : [];
    return {
      hotspots:    this.findHotspots(safe),
      temporal:    this.findTemporalPatterns(safe),
      correlation: this.findCorrelations(safe),
      predictions: this.predictTrends(safe)
    };
  },

  async generateSuggestions(report) {
    return {
      immediate:    this.getImmediateActions(report),
      preventive:   this.getPreventiveMeasures(report),
      valorization: this.getValorizationOpportunities(report)
    };
  },

  // === CALCULS ===

  calculateSeverity(report) {
    const sw = { critical: 10, high: 7, medium: 4, low: 1 };
    const tw = { water_pollution: 8, air_pollution: 6, soil_contamination: 9,
                 waste_deposit: 5, dust: 4, noise_pollution: 3, other: 2 };
    return (sw[report.severity] || 1) * (tw[report.type] || 1);
  },

  calculateUrgency(report) {
    const h = (Date.now() - new Date(report.createdAt)) / 3600000;
    if (h < 24)  return 10;
    if (h < 72)  return 7;
    if (h < 168) return 4;
    return 1;
  },

  calculateImpact(report) {
    let score = 0;
    if (report.affectedPopulation > 1000) score += 8;
    else if (report.affectedPopulation > 100) score += 5;
    else if (report.affectedPopulation > 10)  score += 2;
    if (report.environmentalRisk === 'high')   score += 9;
    else if (report.environmentalRisk === 'medium') score += 5;
    else if (report.environmentalRisk === 'low')    score += 2;
    return score;
  },

  calculateLocationRisk(location) {
    if (!location) return 1;
    const zones = ['mine', 'minier', 'industriel', 'usine', 'kedougou', 'thies', 'dakar'];
    const loc = (typeof location === 'string' ? location : location.address || '').toLowerCase();
    return zones.some(z => loc.includes(z)) ? 8 : 3;
  },

  suggestActions(report) {
    const actions = {
      water_pollution:    ['Prelevement eau', 'Alerte sanitaire', 'Controle source'],
      air_pollution:      ['Mesure qualite air', 'Identification emission', 'Protection population'],
      waste_deposit:      ['Identification responsable', 'Evaluation volume', 'Plan nettoyage'],
      soil_contamination: ['Analyse sols', 'Delimitation zone', 'Plan decontamination'],
      dust:               ['Mesure particules', 'Arrosage pistes', 'Protection respiratoire'],
    };
    return actions[report.type] || ['Analyse approfondie requise', 'Contacter autorites'];
  },

  // === PATTERNS ===

  findHotspots(reports) {
    const cityCount = {};
    reports.forEach(r => {
      const city = r.location?.city
        || r.location?.region
        || r.location?.address?.split(',')[0]?.trim()
        || r.address?.split(',')[0]?.trim();
      if (!city) return; // ignorer sans localisation
      cityCount[city] = (cityCount[city] || 0) + 1;
    });
    return Object.entries(cityCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([location, count]) => ({ location, count }));
  },

  findTemporalPatterns(reports) {
    const byDay = {};
    reports.forEach(r => {
      if (!r.createdAt) return;
      const day = new Date(r.createdAt).toLocaleDateString('fr-FR');
      byDay[day] = (byDay[day] || 0) + 1;
    });
    return byDay;
  },

  findCorrelations(reports) {
    const typeCount = {};
    reports.forEach(r => { typeCount[r.type] = (typeCount[r.type] || 0) + 1; });
    return typeCount;
  },

  predictTrends(reports) {
    const now = Date.now();
    const last7 = reports.filter(r => r.createdAt && new Date(r.createdAt) > new Date(now - 7*24*3600*1000)).length;
    const prev7 = reports.filter(r => {
      if (!r.createdAt) return false;
      const d = new Date(r.createdAt);
      return d > new Date(now - 14*24*3600*1000) && d <= new Date(now - 7*24*3600*1000);
    }).length;
    return { trend: last7 > prev7 ? 'hausse' : last7 < prev7 ? 'baisse' : 'stable', last7, prev7 };
  },

  // === SUGGESTIONS ===

  getImmediateActions(report) {
    const actions = {
      water_pollution:    ['Fermer acces a la source', 'Alerter autorites sanitaires'],
      air_pollution:      ['Evacuer personnes sensibles', 'Identifier la source'],
      soil_contamination: ['Delimiter la zone', 'Prelever echantillons'],
      waste_deposit:      ['Signaler aux autorites', 'Photographier les preuves'],
    };
    return actions[report?.type] || ['Documenter le probleme', 'Contacter les autorites'];
  },

  getPreventiveMeasures() {
    return [
      'Surveillance reguliere de la zone',
      'Sensibilisation des communautes locales',
      'Mise en place de suivi regulier'
    ];
  },

  getValorizationOpportunities(report) {
    const opps = {
      waste_deposit:      ['Recyclage des materiaux', 'Creation emplois verts'],
      soil_contamination: ['Phytoremediation', 'Agriculture apres traitement'],
      water_pollution:    ['Station de traitement', 'Reutilisation eau traitee'],
    };
    return opps[report?.type] || ['Valorisation energetique possible', 'Transformation en ressource'];
  },

  // === ANALYSE LOCALE ===

  localAnalysis(reportData) {
    const text = (reportData.description || '').toLowerCase();
    const flags = {
      urgent: /urgent|critique|dangereux|immediat/.test(text),
      water:  /eau|riviere|source|nappe/.test(text),
      health: /sante|maladie|hopital|medecin/.test(text)
    };
    return {
      confidence:          0.75,
      category:            this.categorizeReport(reportData),
      riskLevel:           flags.urgent && flags.health ? 'critical' : flags.urgent || flags.health ? 'high' : 'medium',
      recommendedPriority: flags.urgent ? 'high' : 'medium',
      tags:                this.extractTags(text),
      suggestedActions:    this.suggestActions(reportData),
      environmentalImpact: { water: 'low', air: 'low', soil: 'low', biodiversity: 'low' },
      urgencyFactors:      Object.keys(flags).filter(k => flags[k]),
      summary:             (reportData.description || '').substring(0, 100)
    };
  },

  categorizeReport(report) {
    const text = (report.description || '').toLowerCase();
    if (text.includes('eau'))    return 'water_pollution';
    if (text.includes('air'))    return 'air_pollution';
    if (text.includes('dechet')) return 'waste_deposit';
    return report.type || 'other';
  },

  extractTags(text) {
    return ['pollution', 'mine', 'dechet', 'eau', 'air', 'sol', 'sante']
      .filter(tag => text.includes(tag));
  }
};
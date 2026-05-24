// pages/api/ai/analyze-report.js — Sans Hugging Face
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  const { description, type, location } = req.body;

  if (!description || description.length < 10) {
    return res.status(400).json({ success: false, error: 'Description trop courte' });
  }

  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1024,
          messages: [{ role: 'user', content: `Analyse ce signalement environnemental au Sénégal et réponds UNIQUEMENT en JSON valide sans markdown:\n\nType: ${type}\nLocalisation: ${location?.address || ''}\nDescription: "${description}"\n\n{"category":"water_pollution|air_pollution|soil_contamination|waste_deposit|dust|noise_pollution|other","riskLevel":"low|medium|high|critical","recommendedPriority":"low|medium|high|critical","confidence":0.0,"summary":"résumé court","tags":[],"suggestedActions":[],"environmentalImpact":{"water":"low|medium|high","air":"low|medium|high","soil":"low|medium|high","biodiversity":"low|medium|high"},"urgencyFactors":[],"sentiment":{"label":"NEGATIVE|NEUTRAL|POSITIVE","score":0.0}}` }],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const text = data.content?.[0]?.text || '';
        const match = text.match(/\{[\s\S]*\}/);
        if (match) {
          return res.status(200).json({ success: true, data: JSON.parse(match[0]), model: 'claude', timestamp: new Date().toISOString() });
        }
      }
    } catch (e) {
      console.error('Claude API error:', e.message);
    }
  }

  // Analyse locale
  const text = (description || '').toLowerCase();
  const patterns = { water_pollution: /eau|rivière|source|nappe/, air_pollution: /air|fumée|odeur|gaz/, soil_contamination: /sol|terre|contamination/, waste_deposit: /déchet|dépôt|décharge/, dust: /poussière|particule/, noise_pollution: /bruit|sonore/ };
  let category = type || 'other';
  for (const [cat, re] of Object.entries(patterns)) { if (re.test(text)) { category = cat; break; } }
  const urgent = /urgent|critique|dangereux|immédiat/.test(text);
  const health = /santé|maladie|hôpital/.test(text);
  const riskLevel = urgent && health ? 'critical' : urgent || health ? 'high' : 'medium';

  return res.status(200).json({
    success: true,
    data: {
      category, riskLevel, recommendedPriority: riskLevel, confidence: 0.70,
      summary: description.substring(0, 100),
      tags: ['pollution', 'mine', 'environnement'].filter(t => text.includes(t)),
      suggestedActions: ['Analyse approfondie requise', 'Contacter les autorités locales'],
      environmentalImpact: { water: category === 'water_pollution' ? 'high' : 'low', air: category === 'air_pollution' ? 'high' : 'low', soil: category === 'soil_contamination' ? 'high' : 'low', biodiversity: 'low' },
      urgencyFactors: urgent ? ['urgency_detected'] : [],
      sentiment: { label: 'NEGATIVE', score: 0.7 },
    },
    model: 'local',
    timestamp: new Date().toISOString(),
  });
}

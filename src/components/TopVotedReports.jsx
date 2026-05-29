import React, { useState, useEffect } from 'react';
import { dashboardAPI } from '../services/api';

const TYPE_ICO = {
  water_pollution: '💧', air_pollution: '💨', soil_contamination: '🟤',
  waste_deposit: '🗑️', dust: '🌫️', abandoned_site: '🏚️',
  noise_pollution: '🔊', other: '⚠️',
};
const SEV_COLOR = { critical: '#dc2626', high: '#f97316', medium: '#f59e0b', low: '#22c55e' };
const STA_LABEL = { new: 'Nouveau', verified: 'Vérifié', in_progress: 'En cours', resolved: 'Résolu', rejected: 'Rejeté' };
const STA_COLOR = { new: '#f59e0b', verified: '#3b82f6', in_progress: '#8b5cf6', resolved: '#10b981', rejected: '#ef4444' };

function useDarkMode() {
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

export function TopVotedReports({ onReportClick }) {
  const [reports, setReports]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [sortBy,  setSortBy]    = useState('voteCount');
  const [filter,  setFilter]    = useState('all');
  const [limit,   setLimit]     = useState(10);
  const darkMode = useDarkMode();
  const dm = darkMode;

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ limit, sortBy, sortOrder: 'desc' });
        if (filter !== 'all') params.append('status', filter);
        const res = await dashboardAPI.request(`/api/reports/top?${params}`);
        setReports(res?.data?.reports || []);
      } catch {
        setReports([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [sortBy, filter, limit]);

  const maxVotes = Math.max(...reports.map(r => Math.abs(r.voteCount || 0)), 1);

  return (
    <div style={{ background: dm ? '#1e293b' : '#fff', borderRadius: 20, border: `1px solid ${dm ? '#334155' : '#f1f5f9'}`, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>

      {/* En-tête */}
      <div style={{ padding: '16px 20px', borderBottom: `1px solid ${dm ? '#334155' : '#f1f5f9'}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h3 style={{ fontSize: 15, fontWeight: 800, color: dm ? '#f1f5f9' : '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 32, height: 32, background: '#fef9c3', borderRadius: 10, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🏆</span>
            Classement par votes
          </h3>
          {/* Tri */}
          <div style={{ display: 'flex', gap: 4, background: dm ? '#0f172a' : '#f1f5f9', padding: 3, borderRadius: 10 }}>
            {[
              { v: 'voteCount', l: '⚡ Score' },
              { v: 'upvotes',   l: '👍 Pour'  },
              { v: 'createdAt', l: '🕐 Récent' },
            ].map(s => (
              <button key={s.v} onClick={() => setSortBy(s.v)} style={{ padding: '4px 10px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600, background: sortBy===s.v ? '#10b981' : 'transparent', color: sortBy===s.v ? '#fff' : (dm ? '#94a3b8' : '#6b7280'), transition: 'all 0.15s' }}>
                {s.l}
              </button>
            ))}
          </div>
        </div>

        {/* Filtres statut */}
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {[{ v:'all', l:'Tous' }, { v:'new', l:'Nouveau' }, { v:'verified', l:'Vérifié' }, { v:'in_progress', l:'En cours' }, { v:'resolved', l:'Résolu' }].map(f => (
            <button key={f.v} onClick={() => setFilter(f.v)} style={{ padding: '3px 10px', borderRadius: 99, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600, background: filter===f.v ? '#059669' : (dm ? '#334155' : '#f1f5f9'), color: filter===f.v ? '#fff' : (dm ? '#94a3b8' : '#6b7280'), transition: 'all 0.15s' }}>
              {f.l}
            </button>
          ))}
        </div>
      </div>

      {/* Corps */}
      <div style={{ padding: '8px 0' }}>
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px' }}>
              <div style={{ width: 24, height: 24, borderRadius: 8, background: dm ? '#334155' : '#f1f5f9', flexShrink: 0 }} />
              <div style={{ flex: 1, height: 14, borderRadius: 7, background: dm ? '#334155' : '#f1f5f9' }} />
              <div style={{ width: 50, height: 14, borderRadius: 7, background: dm ? '#334155' : '#f1f5f9' }} />
            </div>
          ))
        ) : reports.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: dm ? '#475569' : '#94a3b8', fontSize: 13 }}>
            Aucun signalement trouvé
          </div>
        ) : reports.map((report, i) => {
          const score    = report.voteCount || 0;
          const isPos    = score > 0;
          const barColor = isPos ? '#10b981' : score < 0 ? '#ef4444' : '#6b7280';
          const barWidth = Math.round(Math.abs(score) / maxVotes * 100);
          const sevC     = SEV_COLOR[report.severity] || '#6b7280';
          const staC     = STA_COLOR[report.status]   || '#6b7280';

          return (
            <div
              key={report._id || i}
              onClick={() => onReportClick?.(report)}
              style={{ padding: '10px 20px', cursor: 'pointer', transition: 'background 0.15s', borderBottom: i < reports.length - 1 ? `1px solid ${dm ? '#1e293b' : '#f8fafc'}` : 'none' }}
              onMouseEnter={e => e.currentTarget.style.background = dm ? '#0f172a' : '#f8fafc'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {/* Rang */}
                <div style={{ width: 28, height: 28, borderRadius: 8, background: i < 3 ? ['#fef9c3','#f1f5f9','#fff7ed'][i] : (dm ? '#1e293b' : '#f8fafc'), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 900, color: i < 3 ? ['#a16207','#475569','#c2410c'][i] : (dm ? '#475569' : '#9ca3af'), flexShrink: 0, border: i < 3 ? `1px solid ${['#fde68a','#e2e8f0','#fed7aa'][i]}` : 'none' }}>
                  {i < 3 ? ['🥇','🥈','🥉'][i] : `${i+1}`}
                </div>

                {/* Icône type */}
                <span style={{ fontSize: 18, flexShrink: 0 }}>{TYPE_ICO[report.type] || '⚠️'}</span>

                {/* Infos */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: dm ? '#e2e8f0' : '#0f172a', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {report.title || report.description?.substring(0, 60) || 'Sans titre'}
                  </p>
                  <div style={{ display: 'flex', gap: 8, marginTop: 4, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 10, color: dm ? '#64748b' : '#94a3b8' }}>
                      📍 {report.location?.city || report.location?.address?.substring(0, 25) || '—'}
                    </span>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 99, background: `${sevC}18`, color: sevC }}>
                      {report.severity}
                    </span>
                    <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 99, background: `${staC}18`, color: staC }}>
                      {STA_LABEL[report.status] || report.status}
                    </span>
                  </div>

                  {/* Barre de votes */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                    <div style={{ flex: 1, height: 4, background: dm ? '#334155' : '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: `linear-gradient(90deg, ${barColor}, ${barColor}88)`, width: `${barWidth}%`, borderRadius: 99, transition: 'width 0.6s cubic-bezier(0.22,1,0.36,1)' }} />
                    </div>
                    <span style={{ fontSize: 9, color: dm ? '#475569' : '#9ca3af', whiteSpace: 'nowrap' }}>
                      👍 {report.upvotes ?? '—'} / 👎 {report.downvotes ?? '—'}
                    </span>
                  </div>
                </div>

                {/* Score */}
                <div style={{ textAlign: 'center', flexShrink: 0 }}>
                  <p style={{ fontSize: 20, fontWeight: 900, color: barColor, margin: 0, fontVariantNumeric: 'tabular-nums' }}>
                    {isPos ? '+' : ''}{score}
                  </p>
                  <p style={{ fontSize: 9, color: dm ? '#475569' : '#9ca3af', margin: '2px 0 0' }}>score</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pied */}
      {!loading && reports.length > 0 && (
        <div style={{ padding: '10px 20px', borderTop: `1px solid ${dm ? '#334155' : '#f1f5f9'}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 11, color: dm ? '#475569' : '#9ca3af' }}>{reports.length} signalement{reports.length > 1 ? 's' : ''} affichés</span>
          {limit <= 10 && (
            <button onClick={() => setLimit(25)} style={{ fontSize: 11, color: '#10b981', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer' }}>
              Voir plus →
            </button>
          )}
        </div>
      )}
    </div>
  );
}
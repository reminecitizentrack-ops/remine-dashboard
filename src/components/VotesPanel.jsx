import React, { useState, useEffect, useCallback } from 'react';
import { dashboardAPI } from '../services/api';

// ─── Utilitaires ──────────────────────────────────────────────────────────────
const dm = () => typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

const Card = ({ children, style = {} }) => (
  <div style={{
    background: dm() ? '#0f172a' : '#f8fafc',
    borderRadius: 12, border: `1px solid ${dm() ? '#1e293b' : '#f1f5f9'}`,
    padding: '12px 14px', ...style,
  }}>{children}</div>
);

// ─── Barre de vote animée ─────────────────────────────────────────────────────
function VoteBar({ upvotes, downvotes }) {
  const total = upvotes + downvotes || 1;
  const upPct = Math.round(upvotes / total * 100);
  const dark  = dm();
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#10b981' }}>👍 {upvotes} ({upPct}%)</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#ef4444' }}>👎 {downvotes} ({100 - upPct}%)</span>
      </div>
      <div style={{ height: 10, borderRadius: 99, background: dark ? '#1e293b' : '#f1f5f9', overflow: 'hidden', display: 'flex' }}>
        <div style={{ height: '100%', background: 'linear-gradient(90deg, #10b981, #34d399)', width: `${upPct}%`, transition: 'width 0.8s cubic-bezier(0.22,1,0.36,1)', borderRadius: '99px 0 0 99px' }} />
        <div style={{ height: '100%', background: 'linear-gradient(90deg, #ef4444, #fca5a5)', flex: 1, borderRadius: '0 99px 99px 0' }} />
      </div>
    </div>
  );
}

// ─── Score badge ──────────────────────────────────────────────────────────────
function ScoreBadge({ score, size = 'md' }) {
  const isPos   = score > 0, isNeg = score < 0;
  const color   = isPos ? '#10b981' : isNeg ? '#ef4444' : '#6b7280';
  const bg      = isPos ? '#dcfce7' : isNeg ? '#fee2e2' : (dm() ? '#334155' : '#f1f5f9');
  const fontSize = size === 'lg' ? 22 : size === 'sm' ? 11 : 15;
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: size === 'lg' ? '8px 16px' : '3px 10px', borderRadius: 99, background: bg, border: `1px solid ${color}30` }}>
      <span style={{ fontSize, fontWeight: 900, color, fontVariantNumeric: 'tabular-nums' }}>
        {isPos ? '+' : ''}{score}
      </span>
      {size !== 'sm' && <span style={{ fontSize: size === 'lg' ? 14 : 11, color, opacity: 0.8 }}>score</span>}
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────
export function VotesPanel({ report }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [voters,  setVoters]  = useState([]);
  const [showVoters, setShowVoters] = useState(false);
  const dark = dm();

  const reportId = report?._id || report?.id;

  const load = useCallback(async () => {
    if (!reportId) return;
    setLoading(true);
    try {
      const res = await dashboardAPI.request(`/api/reports/${reportId}/vote`);
      setData(res?.data || null);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [reportId]);

  useEffect(() => { load(); }, [load]);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 0', color: dark ? '#64748b' : '#9ca3af' }}>
      <div style={{ width: 14, height: 14, border: '2px solid #10b981', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
      <span style={{ fontSize: 12 }}>Chargement des votes…</span>
    </div>
  );

  const upvotes   = data?.upvotes   ?? 0;
  const downvotes = data?.downvotes ?? 0;
  const score     = data?.score     ?? (report?.voteCount || 0);
  const total     = upvotes + downvotes;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Score principal */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <ScoreBadge score={score} size="lg" />
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ textAlign: 'center', padding: '8px 14px', background: '#dcfce7', borderRadius: 12, border: '1px solid #bbf7d0' }}>
            <p style={{ fontSize: 18, fontWeight: 900, color: '#16a34a', margin: 0 }}>{upvotes}</p>
            <p style={{ fontSize: 10, color: '#166534', margin: '2px 0 0' }}>👍 Pour</p>
          </div>
          <div style={{ textAlign: 'center', padding: '8px 14px', background: '#fee2e2', borderRadius: 12, border: '1px solid #fecaca' }}>
            <p style={{ fontSize: 18, fontWeight: 900, color: '#dc2626', margin: 0 }}>{downvotes}</p>
            <p style={{ fontSize: 10, color: '#991b1b', margin: '2px 0 0' }}>👎 Contre</p>
          </div>
          <div style={{ textAlign: 'center', padding: '8px 14px', background: dark ? '#0f172a' : '#f1f5f9', borderRadius: 12, border: `1px solid ${dark ? '#1e293b' : '#e2e8f0'}` }}>
            <p style={{ fontSize: 18, fontWeight: 900, color: dark ? '#94a3b8' : '#374151', margin: 0 }}>{total}</p>
            <p style={{ fontSize: 10, color: dark ? '#64748b' : '#9ca3af', margin: '2px 0 0' }}>Total</p>
          </div>
        </div>
      </div>

      {/* Barre visuelle */}
      {total > 0 ? (
        <Card>
          <VoteBar upvotes={upvotes} downvotes={downvotes} />
          <p style={{ fontSize: 10, color: dark ? '#475569' : '#9ca3af', marginTop: 8, textAlign: 'center' }}>
            {upvotes >= downvotes
              ? `✅ Majorité positive (${Math.round(upvotes / total * 100)}% de soutien)`
              : `⚠️ Signalement controversé (${Math.round(downvotes / total * 100)}% de doutes)`}
          </p>
        </Card>
      ) : (
        <Card>
          <p style={{ fontSize: 12, color: dark ? '#475569' : '#9ca3af', textAlign: 'center', margin: 0 }}>
            Aucun vote pour le moment
          </p>
        </Card>
      )}

      {/* Popularité relative */}
      {score !== 0 && (
        <Card>
          <p style={{ fontSize: 11, fontWeight: 700, color: dark ? '#94a3b8' : '#6b7280', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: 0.8 }}>
            Popularité
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ flex: 1, height: 6, background: dark ? '#334155' : '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 99,
                background: score > 10 ? 'linear-gradient(90deg, #10b981, #34d399)' : score > 0 ? 'linear-gradient(90deg, #3b82f6, #60a5fa)' : 'linear-gradient(90deg, #f97316, #fb923c)',
                width: `${Math.min(100, Math.abs(score) * 5)}%`,
                transition: 'width 0.8s cubic-bezier(0.22,1,0.36,1)',
              }} />
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: score > 0 ? '#10b981' : '#ef4444', whiteSpace: 'nowrap' }}>
              {score > 10 ? '🔥 Viral' : score > 5 ? '⭐ Populaire' : score > 0 ? '📈 Positif' : score < 0 ? '📉 Contesté' : '➡️ Neutre'}
            </span>
          </div>
        </Card>
      )}

      {/* Bouton rafraîchir */}
      <button onClick={load} style={{ fontSize: 11, color: dark ? '#64748b' : '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', display: 'flex', alignItems: 'center', gap: 5 }}>
        ↺ Rafraîchir les votes
      </button>
    </div>
  );
}
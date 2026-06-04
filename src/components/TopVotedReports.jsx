import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { dashboardAPI } from '../services/api';
import { VoteManagerPanel } from './VoteManagerPanel';
import {
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, AreaChart, Area,
} from 'recharts';

// ─── Constantes ───────────────────────────────────────────────────────────────
const TYPE_ICO   = { water_pollution:'💧', air_pollution:'💨', soil_contamination:'🟤', waste_deposit:'🗑️', dust:'🌫️', abandoned_site:'🏚️', noise_pollution:'🔊', other:'⚠️' };
const SEV_COLOR  = { critical:'#dc2626', high:'#f97316', medium:'#f59e0b', low:'#22c55e' };
const STA_LABEL  = { new:'Nouveau', verified:'Vérifié', in_progress:'En cours', resolved:'Résolu', rejected:'Rejeté' };
const STA_COLOR  = { new:'#f59e0b', verified:'#3b82f6', in_progress:'#8b5cf6', resolved:'#10b981', rejected:'#ef4444' };
const TYPE_LABEL = { water_pollution:'Pollution eau', air_pollution:'Pollution air', soil_contamination:'Contamination sol', waste_deposit:'Dépôt déchets', dust:'Poussière', abandoned_site:'Site abandonné', noise_pollution:'Pollution sonore', mining_waste:'Déchets miniers', industrial_waste:'Déchets industriels', illegal_dumping:'Dépôt sauvage', chemical_spill:'Déversement chimique', deforestation:'Déforestation', other:'Autre' };

// ─── Hook dark mode ───────────────────────────────────────────────────────────
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

// ─── Tooltip custom ───────────────────────────────────────────────────────────
const ChartTip = ({ active, payload, label, dm }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: dm ? '#1e293b' : '#fff', border: `1px solid ${dm ? '#334155' : '#e2e8f0'}`, borderRadius: 12, padding: '8px 12px', boxShadow: '0 4px 20px rgba(0,0,0,.1)' }}>
      {label && <p style={{ fontWeight: 700, fontSize: 11, color: dm ? '#f1f5f9' : '#0f172a', margin: '0 0 4px' }}>{label}</p>}
      {payload.map((e, i) => <p key={i} style={{ fontSize: 11, color: e.color, margin: '1px 0' }}>{e.name} : <strong>{e.value}</strong></p>)}
    </div>
  );
};

// ─── Carte KPI mini ───────────────────────────────────────────────────────────
function MiniKpi({ label, value, icon, color, bg, dm }) {
  return (
    <div style={{ background: dm ? `${color}12` : bg, borderRadius: 14, padding: '12px 14px', border: `1px solid ${color}28`, textAlign: 'center', flex: 1 }}>
      <span style={{ fontSize: 20 }}>{icon}</span>
      <p style={{ fontSize: 22, fontWeight: 900, color, margin: '4px 0 2px', fontVariantNumeric: 'tabular-nums' }}>{value}</p>
      <p style={{ fontSize: 10, color: dm ? `${color}99` : color, margin: 0, fontWeight: 700, opacity: 0.8 }}>{label}</p>
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────
export function TopVotedReports({ onReportClick }) {
  const [reports,     setReports]     = useState([]);
  const [globalStats, setGlobalStats] = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [statsLoading,setStatsLoading]= useState(true);
  const [sortBy,      setSortBy]      = useState('voteCount');
  const [filter,      setFilter]      = useState('all');
  const [limit,       setLimit]       = useState(10);
  const [view,        setView]        = useState('list');
  const [managedReport, setManagedReport] = useState(null); // list | charts | controversial
  const [search,      setSearch]      = useState('');
  const dm = useDark();

  // ── Chargement classement ──────────────────────────────────────────────────
  const loadReports = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit, sortBy, sortOrder: 'desc' });
      if (filter !== 'all') params.append('status', filter);
      const res = await dashboardAPI.request(`/api/reports/top?${params}`);
      setReports(res?.data?.reports || []);
    } catch { setReports([]); }
    finally { setLoading(false); }
  }, [sortBy, filter, limit]);

  // ── Chargement stats globales ──────────────────────────────────────────────
  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await dashboardAPI.request('/api/admin/votes/stats');
      setGlobalStats(res?.data || null);
    } catch { setGlobalStats(null); }
    finally { setStatsLoading(false); }
  }, []);

  useEffect(() => { loadReports(); }, [loadReports]);
  useEffect(() => { loadStats(); },  [loadStats]);

  // ── Données filtrées ───────────────────────────────────────────────────────
  const displayed = useMemo(() => {
    if (!search.trim()) return reports;
    const q = search.toLowerCase();
    return reports.filter(r =>
      (r.title || '').toLowerCase().includes(q) ||
      (r.description || '').toLowerCase().includes(q) ||
      (r.location?.city || '').toLowerCase().includes(q)
    );
  }, [reports, search]);

  const maxVotes = useMemo(() => Math.max(...displayed.map(r => Math.abs(r.voteCount || 0)), 1), [displayed]);

  // ── Charts data ────────────────────────────────────────────────────────────
  const typeChartData = useMemo(() => {
    const map = {};
    reports.forEach(r => {
      const t = r.type || 'other';
      if (!map[t]) map[t] = { name: TYPE_LABEL[t] || t, totalScore: 0, count: 0, avgScore: 0 };
      map[t].totalScore += r.voteCount || 0;
      map[t].count++;
    });
    return Object.values(map).map(d => ({ ...d, avgScore: Math.round(d.totalScore / d.count) })).sort((a, b) => b.avgScore - a.avgScore);
  }, [reports]);

  const activityData = useMemo(() =>
    globalStats?.activitySeries?.slice(-14).map(d => ({
      date: d.date.slice(5), up: d.up || 0, down: d.down || 0,
    })) || [],
  [globalStats]);

  // ── Totaux ─────────────────────────────────────────────────────────────────
  const totals = globalStats?.totals || {};

  const cardBg     = dm ? '#1e293b' : '#fff';
  const cardBorder = dm ? '#334155' : '#f1f5f9';
  const textPri    = dm ? '#f1f5f9' : '#0f172a';
  const textSec    = dm ? '#94a3b8' : '#6b7280';
  const textMut    = dm ? '#64748b' : '#9ca3af';
  const bgMut      = dm ? '#0f172a' : '#f8fafc';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── KPIs globaux ── */}
      {!statsLoading && totals.totalVotes != null && (
        <div style={{ display: 'flex', gap: 10 }}>
          <MiniKpi label="Votes totaux"  value={totals.totalVotes || 0} icon="🗳️" color="#3b82f6" bg="#eff6ff"  dm={dm} />
          <MiniKpi label="Pour"          value={totals.totalUp    || 0} icon="👍" color="#10b981" bg="#dcfce7"  dm={dm} />
          <MiniKpi label="Contre"        value={totals.totalDown  || 0} icon="👎" color="#ef4444" bg="#fee2e2"  dm={dm} />
          <MiniKpi label="Taux positif"  value={`${totals.upRatio || 0}%`} icon="📊" color="#8b5cf6" bg="#ede9fe" dm={dm} />
          <MiniKpi label="Avec votes"    value={totals.withVotes  || 0} icon="✅" color="#f59e0b" bg="#fffbeb"  dm={dm} />
        </div>
      )}

      {/* ── Barre de contrôles ── */}
      <div style={{ background: cardBg, borderRadius: 18, border: `1px solid ${cardBorder}`, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        {/* Titre */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 8 }}>
          <span style={{ width: 32, height: 32, background: '#fef9c3', borderRadius: 10, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🏆</span>
          <h3 style={{ fontSize: 14, fontWeight: 800, color: textPri, margin: 0 }}>Classement par votes</h3>
        </div>

        {/* Recherche */}
        <input
          value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher…"
          style={{ padding: '6px 12px', borderRadius: 10, border: `1px solid ${cardBorder}`, background: bgMut, color: textPri, fontSize: 12, outline: 'none', width: 160 }}
        />

        {/* Tri */}
        <div style={{ display: 'flex', gap: 3, background: bgMut, padding: 3, borderRadius: 10 }}>
          {[{ v:'voteCount',l:'⚡ Score'}, {v:'upvotes',l:'👍 Pour'}, {v:'createdAt',l:'🕐 Récent'}].map(s => (
            <button key={s.v} onClick={() => setSortBy(s.v)} style={{ padding:'4px 10px', borderRadius:7, border:'none', cursor:'pointer', fontSize:11, fontWeight:600, background:sortBy===s.v?'#10b981':'transparent', color:sortBy===s.v?'#fff':textSec, transition:'all 0.15s' }}>{s.l}</button>
          ))}
        </div>

        {/* Vue */}
        <div style={{ display:'flex', gap:3, background:bgMut, padding:3, borderRadius:10 }}>
          {[{v:'list',l:'≡ Liste'},{v:'charts',l:'📊 Graphiques'},{v:'controversial',l:'🔥 Controversés'}].map(v => (
            <button key={v.v} onClick={() => setView(v.v)} style={{ padding:'4px 10px', borderRadius:7, border:'none', cursor:'pointer', fontSize:11, fontWeight:600, background:view===v.v?'#3b82f6':'transparent', color:view===v.v?'#fff':textSec, transition:'all 0.15s' }}>{v.l}</button>
          ))}
        </div>

        {/* Filtres statut */}
        <div style={{ display:'flex', gap:4, flexWrap:'wrap', marginLeft:'auto' }}>
          {[{v:'all',l:'Tous'},{v:'new',l:'Nouveau'},{v:'verified',l:'Vérifié'},{v:'in_progress',l:'En cours'},{v:'resolved',l:'Résolu'}].map(f => (
            <button key={f.v} onClick={() => setFilter(f.v)} style={{ padding:'3px 9px', borderRadius:99, border:'none', cursor:'pointer', fontSize:10, fontWeight:600, background:filter===f.v?'#059669':(dm?'#334155':'#f1f5f9'), color:filter===f.v?'#fff':textSec, transition:'all 0.15s' }}>{f.l}</button>
          ))}
        </div>
      </div>

      {/* ══ VUE LISTE ══════════════════════════════════════════════════════════ */}
      {view === 'list' && (
        <div style={{ background: cardBg, borderRadius: 18, border: `1px solid ${cardBorder}`, overflow: 'hidden' }}>
          {loading ? (
            Array.from({length:5}).map((_,i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 20px', borderBottom:`1px solid ${dm?'#1e293b':'#f8fafc'}` }}>
                <div style={{ width:28, height:28, borderRadius:8, background:dm?'#334155':'#f1f5f9' }} />
                <div style={{ flex:1, height:14, borderRadius:7, background:dm?'#334155':'#f1f5f9' }} />
                <div style={{ width:50, height:14, borderRadius:7, background:dm?'#334155':'#f1f5f9' }} />
              </div>
            ))
          ) : displayed.length === 0 ? (
            <div style={{ textAlign:'center', padding:'40px 0', color:textMut, fontSize:13 }}>
              {search ? '🔍 Aucun résultat pour cette recherche' : 'Aucun signalement trouvé'}
            </div>
          ) : displayed.map((report, i) => {
            const score    = report.voteCount || 0;
            const isPos    = score > 0;
            const barColor = isPos ? '#10b981' : score < 0 ? '#ef4444' : '#6b7280';
            const barWidth = Math.round(Math.abs(score) / maxVotes * 100);
            const sevC     = SEV_COLOR[report.severity]  || '#6b7280';
            const staC     = STA_COLOR[report.status]    || '#6b7280';
            const medal    = i < 3 ? ['🥇','🥈','🥉'][i] : null;
            const rankBg   = i < 3 ? [dm?'rgba(250,204,21,0.12)':'#fef9c3', dm?'rgba(148,163,184,0.08)':'#f8fafc', dm?'rgba(234,88,12,0.08)':'#fff7ed'][i] : 'transparent';

            return (
              <div key={report._id || i}
                onClick={() => onReportClick?.(report)}
                style={{ padding:'12px 20px', cursor:'pointer', transition:'background 0.15s', borderBottom:`1px solid ${dm?'#1e293b':'#f8fafc'}`, background: rankBg }}
                onMouseEnter={e => e.currentTarget.style.background = dm ? '#0f172a' : '#f8fafc'}
                onMouseLeave={e => e.currentTarget.style.background = rankBg}
              >
                <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                  {/* Rang */}
                  <div style={{ width:32, height:32, borderRadius:10, background:i<3?'transparent':(dm?'#1e293b':'#f8fafc'), display:'flex', alignItems:'center', justifyContent:'center', fontSize: medal ? 20 : 13, fontWeight:900, color:dm?'#64748b':'#9ca3af', flexShrink:0 }}>
                    {medal || (i + 1)}
                  </div>

                  {/* Icône type */}
                  <span style={{ fontSize:20, flexShrink:0 }}>{TYPE_ICO[report.type] || '⚠️'}</span>

                  {/* Infos */}
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ fontSize:12, fontWeight:700, color:textPri, margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {report.title || report.description?.substring(0, 60) || 'Sans titre'}
                    </p>
                    <div style={{ display:'flex', gap:6, marginTop:4, alignItems:'center', flexWrap:'wrap' }}>
                      <span style={{ fontSize:10, color:textMut }}>📍 {report.location?.city || report.location?.address?.substring(0,25) || '—'}</span>
                      <span style={{ fontSize:10, fontWeight:700, padding:'1px 6px', borderRadius:99, background:`${sevC}18`, color:sevC }}>{report.severity}</span>
                      <span style={{ fontSize:10, fontWeight:600, padding:'1px 6px', borderRadius:99, background:`${staC}18`, color:staC }}>{STA_LABEL[report.status] || report.status}</span>
                    </div>

                    {/* Barre votes */}
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:6 }}>
                      {/* Partie gauche (pour) */}
                      <span style={{ fontSize:9, color:'#10b981', fontWeight:700, width:26, textAlign:'right', flexShrink:0 }}>👍 {report.upvotes ?? 0}</span>
                      <div style={{ flex:1, height:6, background:dm?'#334155':'#f1f5f9', borderRadius:99, overflow:'hidden', display:'flex' }}>
                        {(report.upvotes || 0) + (report.downvotes || 0) > 0 ? <>
                          <div style={{ height:'100%', background:'linear-gradient(90deg,#10b981,#34d399)', width:`${Math.round((report.upvotes||0)/((report.upvotes||0)+(report.downvotes||0))*100)}%`, borderRadius:'99px 0 0 99px', transition:'width 0.8s' }} />
                          <div style={{ height:'100%', background:'linear-gradient(90deg,#ef4444,#fca5a5)', flex:1, borderRadius:'0 99px 99px 0' }} />
                        </> : <div style={{ height:'100%', background:dm?'#475569':'#cbd5e1', width:'100%', borderRadius:99 }} />}
                      </div>
                      <span style={{ fontSize:9, color:'#ef4444', fontWeight:700, width:26, flexShrink:0 }}>👎 {report.downvotes ?? 0}</span>
                    </div>
                  </div>

                  {/* Score + bouton gérer */}
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4, flexShrink:0, minWidth:64 }}>
                    <div style={{ textAlign:'center' }}>
                      <p style={{ fontSize:22, fontWeight:900, color:barColor, margin:0, fontVariantNumeric:'tabular-nums', lineHeight:1 }}>
                        {isPos ? '+' : ''}{score}
                      </p>
                      <p style={{ fontSize:9, color:textMut, margin:'3px 0 0' }}>score</p>
                      <div style={{ height:3, background:dm?'#334155':'#f1f5f9', borderRadius:99, marginTop:4, overflow:'hidden' }}>
                        <div style={{ height:'100%', background:barColor, width:`${barWidth}%`, borderRadius:99, transition:'width 0.8s' }} />
                      </div>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); setManagedReport(report); }}
                      title="Gérer les votes"
                      style={{ padding:'3px 8px', borderRadius:7, border:`1px solid ${dm?'#334155':'#e2e8f0'}`, background:dm?'#0f172a':'#f8fafc', color:'#8b5cf6', fontSize:10, fontWeight:700, cursor:'pointer', whiteSpace:'nowrap' }}>
                      ⚙️ Gérer
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Pied */}
          {!loading && reports.length > 0 && (
            <div style={{ padding:'10px 20px', borderTop:`1px solid ${cardBorder}`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <span style={{ fontSize:11, color:textMut }}>
                {displayed.length !== reports.length ? `${displayed.length}/${reports.length} affiché(s)` : `${reports.length} signalement${reports.length>1?'s':''}`}
              </span>
              <div style={{ display:'flex', gap:8 }}>
                {limit <= 10 && <button onClick={() => setLimit(25)} style={{ fontSize:11, color:'#10b981', fontWeight:700, background:'none', border:'none', cursor:'pointer' }}>Voir 25 →</button>}
                {limit > 10  && <button onClick={() => setLimit(10)} style={{ fontSize:11, color:textMut, fontWeight:600, background:'none', border:'none', cursor:'pointer' }}>← Réduire</button>}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══ VUE GRAPHIQUES ════════════════════════════════════════════════════ */}
      {view === 'charts' && (
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

          {/* Score moyen par type */}
          <div style={{ background:cardBg, borderRadius:18, border:`1px solid ${cardBorder}`, padding:'18px 20px' }}>
            <h4 style={{ fontSize:13, fontWeight:800, color:textPri, margin:'0 0 14px', display:'flex', alignItems:'center', gap:7 }}>
              <span style={{ fontSize:16 }}>🗂️</span> Score moyen par type de pollution
            </h4>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={typeChartData} margin={{ top:0, right:10, left:-20, bottom:20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={dm?'#334155':'#f1f5f9'} />
                <XAxis dataKey="name" tick={{ fontSize:9, fill:textMut }} angle={-25} textAnchor="end" />
                <YAxis tick={{ fontSize:9, fill:textMut }} allowDecimals={false} />
                <Tooltip content={<ChartTip dm={dm} />} />
                <Bar dataKey="avgScore" name="Score moyen" radius={[6,6,0,0]}>
                  {typeChartData.map((_,i) => <Cell key={i} fill={`hsl(${152+i*18},65%,${50-i*3}%)`} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Activité de votes sur 14j */}
          {activityData.length > 0 && (
            <div style={{ background:cardBg, borderRadius:18, border:`1px solid ${cardBorder}`, padding:'18px 20px' }}>
              <h4 style={{ fontSize:13, fontWeight:800, color:textPri, margin:'0 0 14px', display:'flex', alignItems:'center', gap:7 }}>
                <span style={{ fontSize:16 }}>📈</span> Activité de votes — 14 derniers jours
              </h4>
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={activityData} margin={{ top:0, right:10, left:-20, bottom:0 }}>
                  <defs>
                    <linearGradient id="gVUp"   x1="0" y1="0" x2="0" y2="1"><stop offset="5%"  stopColor="#10b981" stopOpacity={0.3}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
                    <linearGradient id="gVDown" x1="0" y1="0" x2="0" y2="1"><stop offset="5%"  stopColor="#ef4444" stopOpacity={0.25}/><stop offset="95%" stopColor="#ef4444" stopOpacity={0}/></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={dm?'#334155':'#f1f5f9'} />
                  <XAxis dataKey="date" tick={{ fontSize:9, fill:textMut }} />
                  <YAxis tick={{ fontSize:9, fill:textMut }} allowDecimals={false} />
                  <Tooltip content={<ChartTip dm={dm} />} />
                  <Area type="monotone" dataKey="up"   name="👍 Pour"    stroke="#10b981" fill="url(#gVUp)"   strokeWidth={2} dot={false} />
                  <Area type="monotone" dataKey="down" name="👎 Contre"  stroke="#ef4444" fill="url(#gVDown)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Distribution des scores */}
          {reports.length > 0 && (
            <div style={{ background:cardBg, borderRadius:18, border:`1px solid ${cardBorder}`, padding:'18px 20px' }}>
              <h4 style={{ fontSize:13, fontWeight:800, color:textPri, margin:'0 0 14px', display:'flex', alignItems:'center', gap:7 }}>
                <span style={{ fontSize:16 }}>📊</span> Distribution des scores
              </h4>
              {(() => {
                const buckets = [
                  { label:'Très négatif (< -5)', min:-999,  max:-6,  color:'#dc2626' },
                  { label:'Négatif (-5 à -1)',    min:-5,    max:-1,  color:'#f97316' },
                  { label:'Neutre (0)',            min:0,     max:0,   color:'#9ca3af' },
                  { label:'Positif (1 à 5)',       min:1,     max:5,   color:'#3b82f6' },
                  { label:'Populaire (6 à 15)',    min:6,     max:15,  color:'#10b981' },
                  { label:'Viral (> 15)',           min:16,    max:999, color:'#f59e0b' },
                ];
                const data = buckets.map(b => ({
                  name:  b.label.split('(')[0].trim(),
                  count: reports.filter(r => (r.voteCount||0) >= b.min && (r.voteCount||0) <= b.max).length,
                  color: b.color,
                })).filter(d => d.count > 0);
                return (
                  <ResponsiveContainer width="100%" height={130}>
                    <BarChart data={data} margin={{ top:0, right:10, left:-20, bottom:0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={dm?'#334155':'#f1f5f9'} />
                      <XAxis dataKey="name" tick={{ fontSize:9, fill:textMut }} />
                      <YAxis tick={{ fontSize:9, fill:textMut }} allowDecimals={false} />
                      <Tooltip content={<ChartTip dm={dm} />} />
                      <Bar dataKey="count" name="Signalements" radius={[5,5,0,0]}>
                        {data.map((d,i) => <Cell key={i} fill={d.color} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* ══ VUE CONTROVERSÉS ══════════════════════════════════════════════════ */}
      {view === 'controversial' && (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          <div style={{ background:dm?'rgba(239,68,68,0.06)':'#fef2f2', borderRadius:14, padding:'12px 16px', border:'1px solid #fecaca', display:'flex', gap:10, alignItems:'flex-start' }}>
            <span style={{ fontSize:18, flexShrink:0 }}>🔥</span>
            <p style={{ fontSize:12, color:dm?'#fca5a5':'#991b1b', margin:0, lineHeight:1.5 }}>
              Ces signalements ont reçu beaucoup de votes mais un score proche de zéro — la communauté est divisée. Une vérification approfondie est recommandée.
            </p>
          </div>

          {statsLoading ? (
            <div style={{ textAlign:'center', padding:'30px', color:textMut, fontSize:12 }}>Chargement…</div>
          ) : !globalStats?.controversial?.length ? (
            <div style={{ textAlign:'center', padding:'40px', color:textMut, fontSize:13 }}>
              ✅ Aucun signalement controversé pour le moment
            </div>
          ) : globalStats.controversial.map((r, i) => {
            const upPct = r.totalVotes > 0 ? Math.round(r.upCount / r.totalVotes * 100) : 50;
            return (
              <div key={r._id || i} style={{ background:cardBg, borderRadius:16, border:`1px solid ${cardBorder}`, padding:'14px 18px', cursor:'pointer', transition:'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#fca5a5'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(239,68,68,0.1)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = cardBorder; e.currentTarget.style.boxShadow = 'none'; }}
                onClick={() => onReportClick?.(r)}
              >
                <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12 }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                      <span style={{ fontSize:16 }}>{TYPE_ICO[r.type] || '⚠️'}</span>
                      <p style={{ fontSize:12, fontWeight:700, color:textPri, margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {r.title || r.description?.substring(0, 60) || 'Sans titre'}
                      </p>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8 }}>
                      <span style={{ fontSize:10, fontWeight:700, padding:'1px 6px', borderRadius:99, background:`${SEV_COLOR[r.severity]||'#6b7280'}18`, color:SEV_COLOR[r.severity]||'#6b7280' }}>{r.severity}</span>
                      <span style={{ fontSize:10, color:textMut }}>{r.totalVotes} votes</span>
                    </div>
                    {/* Barre controversée */}
                    <div>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                        <span style={{ fontSize:10, fontWeight:700, color:'#10b981' }}>👍 {r.upCount} ({upPct}%)</span>
                        <span style={{ fontSize:10, fontWeight:700, color:'#ef4444' }}>👎 {r.totalVotes - r.upCount} ({100-upPct}%)</span>
                      </div>
                      <div style={{ height:10, borderRadius:99, overflow:'hidden', display:'flex', background:dm?'#334155':'#f1f5f9' }}>
                        <div style={{ height:'100%', background:'linear-gradient(90deg,#10b981,#34d399)', width:`${upPct}%`, borderRadius:'99px 0 0 99px', transition:'width 0.8s' }} />
                        <div style={{ height:'100%', background:'linear-gradient(90deg,#ef4444,#fca5a5)', flex:1, borderRadius:'0 99px 99px 0' }} />
                      </div>
                      {/* Indicateur de controverse */}
                      <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:6 }}>
                        <div style={{ flex:1, height:4, background:dm?'#334155':'#f1f5f9', borderRadius:99, overflow:'hidden' }}>
                          <div style={{ height:'100%', background:'linear-gradient(90deg,#f59e0b,#fbbf24)', width:`${Math.abs(50 - upPct) < 10 ? 95 : Math.abs(50 - upPct) < 20 ? 60 : 30}%`, borderRadius:99, transition:'width 0.8s' }} />
                        </div>
                        <span style={{ fontSize:9, color:'#f59e0b', fontWeight:700, whiteSpace:'nowrap' }}>
                          {Math.abs(50 - upPct) < 10 ? '🔥 Très controversé' : Math.abs(50 - upPct) < 20 ? '⚠️ Controversé' : '💡 Légèrement divisé'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign:'center', flexShrink:0 }}>
                    <p style={{ fontSize:18, fontWeight:900, color:r.voteCount > 0 ? '#10b981' : r.voteCount < 0 ? '#ef4444' : '#6b7280', margin:0 }}>
                      {r.voteCount > 0 ? '+' : ''}{r.voteCount}
                    </p>
                    <p style={{ fontSize:9, color:textMut, margin:'2px 0 0' }}>score</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal VoteManagerPanel */}
      {managedReport && (
        <div style={{ position:'fixed', inset:0, zIndex:9990, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.5)', backdropFilter:'blur(4px)' }} onClick={e => { if(e.target===e.currentTarget) setManagedReport(null); }}>
          <div style={{ background:dm?'#1e293b':'#fff', borderRadius:24, padding:'24px 28px', width:'min(620px,95vw)', maxHeight:'90vh', overflow:'hidden', display:'flex', flexDirection:'column', gap:16, boxShadow:'0 32px 80px rgba(0,0,0,0.3)', border:`1px solid ${dm?'#334155':'#f1f5f9'}` }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
              <h2 style={{ fontSize:16, fontWeight:800, color:dm?'#f1f5f9':'#0f172a', margin:0, display:'flex', alignItems:'center', gap:8 }}>⚙️ Gestion des votes</h2>
              <button onClick={()=>setManagedReport(null)} style={{ width:32,height:32,borderRadius:'50%',background:dm?'#334155':'#f1f5f9',border:'none',cursor:'pointer',color:dm?'#94a3b8':'#374151',fontSize:16,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700 }}>✕</button>
            </div>
            <div style={{ flex:1, overflowY:'auto' }}>
              <VoteManagerPanel report={managedReport} onClose={() => { setManagedReport(null); loadReports(); }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
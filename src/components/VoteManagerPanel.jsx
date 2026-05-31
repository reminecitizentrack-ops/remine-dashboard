import React, { useState, useEffect, useCallback } from 'react';
import { dashboardAPI } from '../services/api';

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

const fmtDate = d => d
  ? new Date(d).toLocaleDateString('fr-FR', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })
  : '—';

const SEV_COLOR  = { critical:'#dc2626', high:'#f97316', medium:'#f59e0b', low:'#22c55e' };
const TYPE_ICO   = { water_pollution:'💧', air_pollution:'💨', soil_contamination:'🟤', waste_deposit:'🗑️', dust:'🌫️', abandoned_site:'🏚️', noise_pollution:'🔊', other:'⚠️' };
const ROLE_LABEL = { admin:'Admin', moderator:'Modérateur', citizen:'Citoyen' };
const ROLE_COLOR = { admin:'#dc2626', moderator:'#8b5cf6', citizen:'#3b82f6' };

// ─── Boîte de confirmation ────────────────────────────────────────────────────
function ConfirmDialog({ title, message, danger, onConfirm, onCancel, dm }) {
  return (
    <div style={{ position:'fixed', inset:0, zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.5)', backdropFilter:'blur(4px)', animation:'remine-fade-in 0.15s both' }}>
      <div style={{ background:dm?'#1e293b':'#fff', borderRadius:20, padding:'24px 28px', width:360, boxShadow:'0 24px 64px rgba(0,0,0,0.2)', border:`1px solid ${dm?'#334155':'#f1f5f9'}`, animation:'remine-scale-in 0.2s both' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
          <span style={{ fontSize:22 }}>{danger ? '⚠️' : '❓'}</span>
          <h3 style={{ fontSize:15, fontWeight:800, color:dm?'#f1f5f9':'#0f172a', margin:0 }}>{title}</h3>
        </div>
        <p style={{ fontSize:13, color:dm?'#94a3b8':'#6b7280', margin:'0 0 20px', lineHeight:1.6 }}>{message}</p>
        <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
          <button onClick={onCancel} style={{ padding:'8px 16px', borderRadius:10, border:`1px solid ${dm?'#334155':'#e2e8f0'}`, background:'transparent', color:dm?'#94a3b8':'#6b7280', fontSize:13, fontWeight:600, cursor:'pointer' }}>
            Annuler
          </button>
          <button onClick={onConfirm} style={{ padding:'8px 16px', borderRadius:10, border:'none', background:danger?'#dc2626':'#10b981', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', boxShadow:danger?'0 4px 12px rgba(220,38,38,0.3)':'0 4px 12px rgba(16,185,129,0.3)' }}>
            Confirmer
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Badge vote ───────────────────────────────────────────────────────────────
function VoteBadge({ type, size = 'md' }) {
  const isUp = type === 'up';
  const fs   = size === 'lg' ? 16 : 12;
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:size==='lg'?'5px 12px':'3px 8px', borderRadius:99, background:isUp?'#dcfce7':'#fee2e2', color:isUp?'#16a34a':'#dc2626', fontSize:fs, fontWeight:700, border:`1px solid ${isUp?'#bbf7d0':'#fecaca'}` }}>
      {isUp ? '👍' : '👎'} {isUp ? 'Pour' : 'Contre'}
    </span>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────
export function VoteManagerPanel({ report, onClose }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [filter,  setFilter]  = useState('all'); // all | up | down
  const [sortBy,  setSortBy]  = useState('date'); // date | type | name
  const [confirm, setConfirm] = useState(null);  // { type, userId, name }
  const [pending, setPending] = useState(null);  // userId en cours de traitement
  const [feedback,setFeedback]= useState(null);
  const dm = useDark();

  const reportId = report?._id || report?.id;

  const load = useCallback(async () => {
    if (!reportId) return;
    setLoading(true);
    try {
      const res = await dashboardAPI.request(`/api/admin/reports/${reportId}/votes`);
      setData(res?.data || null);
    } catch { setData(null); }
    finally { setLoading(false); }
  }, [reportId]);

  useEffect(() => { load(); }, [load]);

  // ── Supprimer un vote ──────────────────────────────────────────────────────
  const deleteVote = useCallback(async (userId) => {
    setPending(userId);
    try {
      const res = await dashboardAPI.request(`/api/admin/reports/${reportId}/votes/${userId}`, { method:'DELETE' });
      if (res?.success) {
        setFeedback({ type:'success', msg:`✅ Vote supprimé. Nouveau score : ${res.data.newScore > 0 ? '+' : ''}${res.data.newScore}` });
        await load();
      } else {
        setFeedback({ type:'error', msg:'Erreur lors de la suppression.' });
      }
    } catch { setFeedback({ type:'error', msg:'Erreur réseau.' }); }
    finally { setPending(null); setTimeout(() => setFeedback(null), 4000); }
  }, [reportId, load]);

  // ── Modifier un vote ───────────────────────────────────────────────────────
  const changeVote = useCallback(async (userId, newType) => {
    setPending(userId);
    try {
      const res = await dashboardAPI.request(`/api/admin/reports/${reportId}/votes/${userId}`, {
        method:'PATCH', body:JSON.stringify({ voteType: newType }),
      });
      if (res?.success) {
        setFeedback({ type:'success', msg:`✅ Vote modifié → ${newType === 'up' ? '👍 Pour' : '👎 Contre'}` });
        await load();
      } else {
        setFeedback({ type:'error', msg:'Erreur lors de la modification.' });
      }
    } catch { setFeedback({ type:'error', msg:'Erreur réseau.' }); }
    finally { setPending(null); setTimeout(() => setFeedback(null), 4000); }
  }, [reportId, load]);

  // ── Réinitialiser tous les votes ──────────────────────────────────────────
  const resetAllVotes = useCallback(async () => {
    setPending('all');
    try {
      const res = await dashboardAPI.request(`/api/admin/reports/${reportId}/votes`, { method:'DELETE' });
      if (res?.success) {
        setFeedback({ type:'success', msg:`✅ ${res.data.removed} vote(s) supprimé(s)` });
        await load();
      } else {
        setFeedback({ type:'error', msg:'Erreur lors de la réinitialisation.' });
      }
    } catch { setFeedback({ type:'error', msg:'Erreur réseau.' }); }
    finally { setPending(null); setTimeout(() => setFeedback(null), 4000); }
  }, [reportId, load]);

  // ── Votes filtrés + triés ─────────────────────────────────────────────────
  const displayed = (data?.votes || [])
    .filter(v => {
      if (filter !== 'all' && v.voteType !== filter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (v.user?.name || '').toLowerCase().includes(q)
            || (v.user?.email || '').toLowerCase().includes(q)
            || (v.user?.community || '').toLowerCase().includes(q);
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'date') return new Date(b.createdAt) - new Date(a.createdAt);
      if (sortBy === 'type') return a.voteType.localeCompare(b.voteType);
      if (sortBy === 'name') return (a.user?.name || '').localeCompare(b.user?.name || '');
      return 0;
    });

  const summary  = data?.summary || {};
  const rpt      = data?.report  || report;
  const sevC     = SEV_COLOR[rpt?.severity] || '#6b7280';

  const cardBg     = dm ? '#1e293b' : '#fff';
  const cardBorder = dm ? '#334155' : '#f1f5f9';
  const textPri    = dm ? '#f1f5f9' : '#0f172a';
  const textSec    = dm ? '#94a3b8' : '#6b7280';
  const textMut    = dm ? '#64748b' : '#9ca3af';
  const bgMut      = dm ? '#0f172a' : '#f8fafc';

  return (
    <>
      {/* Boîte de confirmation */}
      {confirm && (
        <ConfirmDialog
          title={confirm.type === 'delete' ? 'Supprimer ce vote ?' : confirm.type === 'reset' ? 'Réinitialiser tous les votes ?' : 'Modifier ce vote ?'}
          message={
            confirm.type === 'delete' ? `Le vote de "${confirm.name}" sera définitivement supprimé. Cette action est irréversible.`
            : confirm.type === 'reset' ? `Tous les ${summary.total} votes de ce signalement seront supprimés. Le score reviendra à 0.`
            : `Le vote de "${confirm.name}" sera changé en ${confirm.newType === 'up' ? '👍 Pour' : '👎 Contre'}.`
          }
          danger={confirm.type === 'delete' || confirm.type === 'reset'}
          onConfirm={() => {
            if (confirm.type === 'delete') deleteVote(confirm.userId);
            else if (confirm.type === 'reset') resetAllVotes();
            else if (confirm.type === 'change') changeVote(confirm.userId, confirm.newType);
            setConfirm(null);
          }}
          onCancel={() => setConfirm(null)}
          dm={dm}
        />
      )}

      <div style={{ display:'flex', flexDirection:'column', gap:14, maxHeight:'80vh', overflow:'hidden' }}>

        {/* ── En-tête signalement ── */}
        <div style={{ background:bgMut, borderRadius:14, padding:'12px 16px', border:`1px solid ${cardBorder}`, display:'flex', alignItems:'center', gap:12, flexShrink:0 }}>
          <span style={{ fontSize:22 }}>{TYPE_ICO[rpt?.type] || '⚠️'}</span>
          <div style={{ flex:1, minWidth:0 }}>
            <p style={{ fontSize:12, fontWeight:700, color:textPri, margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {rpt?.title || 'Signalement'}
            </p>
            <div style={{ display:'flex', gap:6, marginTop:3 }}>
              <span style={{ fontSize:10, fontWeight:700, padding:'1px 6px', borderRadius:99, background:`${sevC}18`, color:sevC }}>{rpt?.severity}</span>
              <span style={{ fontSize:10, color:textMut }}>{rpt?.city || rpt?.location?.city || ''}</span>
            </div>
          </div>
          {/* Score recap */}
          <div style={{ display:'flex', gap:8, alignItems:'center', flexShrink:0 }}>
            <div style={{ textAlign:'center', padding:'6px 10px', background:'#dcfce7', borderRadius:10 }}>
              <p style={{ fontSize:16, fontWeight:900, color:'#16a34a', margin:0 }}>{summary.upvotes ?? 0}</p>
              <p style={{ fontSize:9, color:'#16a34a', margin:'1px 0 0', fontWeight:700 }}>👍 POUR</p>
            </div>
            <div style={{ textAlign:'center', padding:'6px 10px', background:summary.score > 0 ? '#dcfce7' : summary.score < 0 ? '#fee2e2' : bgMut, borderRadius:10, border:`1px solid ${cardBorder}` }}>
              <p style={{ fontSize:16, fontWeight:900, color: summary.score > 0 ? '#16a34a' : summary.score < 0 ? '#dc2626' : textSec, margin:0 }}>
                {(summary.score > 0 ? '+' : '')}{summary.score ?? 0}
              </p>
              <p style={{ fontSize:9, color:textSec, margin:'1px 0 0', fontWeight:700 }}>SCORE</p>
            </div>
            <div style={{ textAlign:'center', padding:'6px 10px', background:'#fee2e2', borderRadius:10 }}>
              <p style={{ fontSize:16, fontWeight:900, color:'#dc2626', margin:0 }}>{summary.downvotes ?? 0}</p>
              <p style={{ fontSize:9, color:'#dc2626', margin:'1px 0 0', fontWeight:700 }}>👎 CONTRE</p>
            </div>
          </div>
        </div>

        {/* ── Feedback ── */}
        {feedback && (
          <div style={{ padding:'10px 14px', borderRadius:10, fontSize:12, fontWeight:600, background:feedback.type==='success'?'#dcfce7':'#fee2e2', color:feedback.type==='success'?'#16a34a':'#dc2626', border:`1px solid ${feedback.type==='success'?'#bbf7d0':'#fecaca'}`, animation:'remine-scale-in 0.2s both', flexShrink:0 }}>
            {feedback.msg}
          </div>
        )}

        {/* ── Barre de contrôles ── */}
        <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap', flexShrink:0 }}>
          {/* Recherche */}
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Rechercher un votant…"
            style={{ flex:1, minWidth:160, padding:'7px 12px', borderRadius:10, border:`1px solid ${cardBorder}`, background:bgMut, color:textPri, fontSize:12, outline:'none' }}
          />
          {/* Filtre type */}
          <div style={{ display:'flex', gap:3, background:bgMut, padding:3, borderRadius:9 }}>
            {[{v:'all',l:'Tous'},{v:'up',l:'👍'},{v:'down',l:'👎'}].map(f=>(
              <button key={f.v} onClick={()=>setFilter(f.v)} style={{ padding:'4px 10px', borderRadius:7, border:'none', cursor:'pointer', fontSize:11, fontWeight:700, background:filter===f.v?(f.v==='up'?'#10b981':f.v==='down'?'#ef4444':'#334155'):'transparent', color:filter===f.v?'#fff':textSec, transition:'all 0.15s' }}>
                {f.l}
              </button>
            ))}
          </div>
          {/* Tri */}
          <select value={sortBy} onChange={e=>setSortBy(e.target.value)}
            style={{ padding:'6px 10px', borderRadius:9, border:`1px solid ${cardBorder}`, background:bgMut, color:textPri, fontSize:11, outline:'none', cursor:'pointer' }}>
            <option value="date">📅 Plus récent</option>
            <option value="type">🗳️ Type</option>
            <option value="name">👤 Nom</option>
          </select>
          {/* Reset tous */}
          {summary.total > 0 && (
            <button onClick={()=>setConfirm({type:'reset'})} disabled={pending==='all'}
              style={{ padding:'6px 12px', borderRadius:9, border:'1px solid #fecaca', background:dm?'rgba(239,68,68,0.08)':'#fee2e2', color:'#dc2626', fontSize:11, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:5, opacity:pending==='all'?0.5:1 }}>
              {pending==='all' ? <span style={{width:12,height:12,border:'2px solid #dc2626',borderTopColor:'transparent',borderRadius:'50%',animation:'remine-spin 0.7s linear infinite',display:'inline-block'}} /> : '🗑️'}
              Réinitialiser tout
            </button>
          )}
        </div>

        {/* ── Info résumé ── */}
        <div style={{ display:'flex', gap:6, alignItems:'center', flexShrink:0 }}>
          <span style={{ fontSize:11, color:textMut }}>
            {displayed.length !== (data?.votes||[]).length
              ? `${displayed.length} / ${data?.votes?.length || 0} vote(s) affiché(s)`
              : `${data?.votes?.length || 0} vote(s) total`}
          </span>
          {filter !== 'all' && <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:99, background:filter==='up'?'#dcfce7':'#fee2e2', color:filter==='up'?'#16a34a':'#dc2626' }}>Filtre : {filter==='up'?'👍 Pour':'👎 Contre'}</span>}
        </div>

        {/* ── Liste des votes ── */}
        <div style={{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column', gap:6 }}>
          {loading ? (
            Array.from({length:4}).map((_,i)=>(
              <div key={i} style={{ height:72, borderRadius:14, background:dm?'#334155':'#f1f5f9', animation:'remine-shimmer 1.5s linear infinite' }} />
            ))
          ) : displayed.length === 0 ? (
            <div style={{ textAlign:'center', padding:'40px 0', color:textMut }}>
              <div style={{ fontSize:32, marginBottom:8 }}>{search ? '🔍' : '🗳️'}</div>
              <p style={{ fontSize:13, margin:0 }}>{search ? 'Aucun votant trouvé' : filter !== 'all' ? `Aucun vote "${filter==='up'?'Pour':'Contre'}"` : 'Aucun vote pour ce signalement'}</p>
            </div>
          ) : displayed.map((vote, i) => {
            const isUp     = vote.voteType === 'up';
            const vColor   = isUp ? '#10b981' : '#ef4444';
            const isBusy   = pending === String(vote.userId);
            const roleC    = ROLE_COLOR[vote.user?.role] || '#6b7280';

            return (
              <div key={String(vote.userId) + i} style={{
                background:cardBg, borderRadius:14, padding:'12px 16px',
                border:`1px solid ${cardBorder}`,
                borderLeft:`4px solid ${vColor}`,
                display:'flex', alignItems:'center', gap:12,
                opacity:isBusy?0.6:1,
                transition:'all 0.2s',
                animation:`remine-fade-in 0.3s ${i*0.04}s both`,
              }}>
                {/* Avatar initiales */}
                <div style={{ width:40, height:40, borderRadius:12, background:`${roleC}18`, border:`2px solid ${roleC}30`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, fontWeight:800, color:roleC, flexShrink:0 }}>
                  {(vote.user?.name || '?').charAt(0).toUpperCase()}
                </div>

                {/* Infos utilisateur */}
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3 }}>
                    <p style={{ fontSize:12, fontWeight:700, color:textPri, margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {vote.user?.name || 'Utilisateur supprimé'}
                    </p>
                    {vote.user?.role && (
                      <span style={{ fontSize:9, fontWeight:700, padding:'1px 6px', borderRadius:99, background:`${roleC}15`, color:roleC, flexShrink:0 }}>
                        {ROLE_LABEL[vote.user.role] || vote.user.role}
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize:10, color:textMut, margin:0 }}>
                    {vote.user?.email && <span>{vote.user.email}</span>}
                    {vote.user?.community && <span style={{ marginLeft:6 }}>· {vote.user.community}</span>}
                  </p>
                  <p style={{ fontSize:10, color:textMut, margin:'3px 0 0' }}>
                    Voté le {fmtDate(vote.createdAt)}
                  </p>
                </div>

                {/* Type de vote */}
                <VoteBadge type={vote.voteType} size="md" />

                {/* Actions */}
                <div style={{ display:'flex', gap:5, flexShrink:0 }}>
                  {/* Inverser le vote */}
                  <button
                    onClick={() => setConfirm({ type:'change', userId:String(vote.userId), name:vote.user?.name || 'Utilisateur', newType: isUp ? 'down' : 'up' })}
                    disabled={isBusy}
                    title={`Changer en ${isUp ? '👎 Contre' : '👍 Pour'}`}
                    style={{ width:32, height:32, borderRadius:9, border:`1px solid ${dm?'#334155':'#e2e8f0'}`, background:dm?'#0f172a':'#f8fafc', cursor:isBusy?'not-allowed':'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, transition:'all 0.15s' }}
                    onMouseEnter={e=>{ e.currentTarget.style.background=isUp?'#fee2e2':'#dcfce7'; e.currentTarget.style.borderColor=isUp?'#fecaca':'#bbf7d0'; }}
                    onMouseLeave={e=>{ e.currentTarget.style.background=dm?'#0f172a':'#f8fafc'; e.currentTarget.style.borderColor=dm?'#334155':'#e2e8f0'; }}
                  >
                    {isBusy ? <span style={{width:12,height:12,border:'2px solid #6b7280',borderTopColor:'transparent',borderRadius:'50%',animation:'remine-spin 0.7s linear infinite',display:'inline-block'}} /> : (isUp ? '👎' : '👍')}
                  </button>

                  {/* Supprimer */}
                  <button
                    onClick={() => setConfirm({ type:'delete', userId:String(vote.userId), name:vote.user?.name || 'Utilisateur' })}
                    disabled={isBusy}
                    title="Supprimer ce vote"
                    style={{ width:32, height:32, borderRadius:9, border:'1px solid #fecaca', background:dm?'rgba(239,68,68,0.06)':'#fee2e2', cursor:isBusy?'not-allowed':'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, transition:'all 0.15s', color:'#dc2626' }}
                    onMouseEnter={e=>{ e.currentTarget.style.background='#fecaca'; }}
                    onMouseLeave={e=>{ e.currentTarget.style.background=dm?'rgba(239,68,68,0.06)':'#fee2e2'; }}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Pied ── */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0, paddingTop:4, borderTop:`1px solid ${cardBorder}` }}>
          <button onClick={load} style={{ fontSize:11, color:textMut, background:'none', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:5 }}>
            <span style={{ display:'inline-block', transition:'transform 0.3s' }} onMouseEnter={e=>e.currentTarget.style.transform='rotate(180deg)'} onMouseLeave={e=>e.currentTarget.style.transform='rotate(0)'}>↺</span> Rafraîchir
          </button>
          <p style={{ fontSize:10, color:textMut, margin:0 }}>
            Seuls les admins et modérateurs peuvent gérer les votes
          </p>
        </div>
      </div>
    </>
  );
}
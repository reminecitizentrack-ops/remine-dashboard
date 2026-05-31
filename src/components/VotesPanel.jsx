import React, { useState, useEffect, useCallback, useRef } from 'react';
import { dashboardAPI } from '../services/api';
import { VoteManagerPanel } from './VoteManagerPanel';
import {
  AreaChart, Area, XAxis, YAxis, ResponsiveContainer,
} from 'recharts';

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

function VoteBar({ upvotes, downvotes, height = 12 }) {
  const total = upvotes + downvotes || 1;
  const upPct = Math.round(upvotes / total * 100);
  const dark  = useDark();
  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
        <span style={{ fontSize:11, fontWeight:700, color:'#10b981' }}>👍 {upvotes} — {upPct}%</span>
        <span style={{ fontSize:11, fontWeight:700, color:'#ef4444' }}>👎 {downvotes} — {100-upPct}%</span>
      </div>
      <div style={{ height, borderRadius:99, background:dark?'#1e293b':'#f1f5f9', overflow:'hidden', display:'flex', position:'relative' }}>
        <div style={{ height:'100%', background:'linear-gradient(90deg,#10b981,#34d399)', width:`${upPct}%`, transition:'width 1s cubic-bezier(0.22,1,0.36,1)', borderRadius:upPct===100?99:'99px 0 0 99px' }} />
        <div style={{ height:'100%', background:'linear-gradient(90deg,#ef4444,#fca5a5)', flex:1, borderRadius:upPct===0?99:'0 99px 99px 0' }} />
        <div style={{ position:'absolute', left:'50%', top:0, bottom:0, width:2, background:'rgba(255,255,255,0.4)', transform:'translateX(-50%)' }} />
      </div>
    </div>
  );
}

function ScoreBadge({ score, size='md' }) {
  const isPos=score>0, isNeg=score<0;
  const dark=useDark();
  const color=isPos?'#10b981':isNeg?'#ef4444':'#6b7280';
  const bg=isPos?'#dcfce7':isNeg?'#fee2e2':(dark?'#334155':'#f1f5f9');
  const fs=size==='xl'?28:size==='lg'?22:size==='sm'?11:15;
  return (
    <div style={{ display:'inline-flex', alignItems:'center', gap:5, padding:size==='xl'?'10px 20px':size==='lg'?'8px 16px':'3px 10px', borderRadius:99, background:bg, border:`1.5px solid ${color}40`, boxShadow:isPos?`0 4px 16px ${color}20`:'none' }}>
      <span style={{ fontSize:fs, fontWeight:900, color, fontVariantNumeric:'tabular-nums', lineHeight:1 }}>{isPos?'+':''}{score}</span>
      {size!=='sm' && <span style={{ fontSize:size==='xl'?12:10, color, opacity:0.7, fontWeight:700 }}>SCORE</span>}
    </div>
  );
}

function CountUp({ target, duration=800, color='#0f172a' }) {
  const [val,setVal]=useState(0);
  const ref=useRef(null);
  useEffect(() => {
    if(target===0){setVal(0);return;}
    const start=Date.now();
    const tick=()=>{
      const p=Math.min((Date.now()-start)/duration,1);
      setVal(Math.round((1-Math.pow(1-p,3))*target));
      if(p<1) ref.current=requestAnimationFrame(tick);
    };
    ref.current=requestAnimationFrame(tick);
    return ()=>cancelAnimationFrame(ref.current);
  },[target,duration]);
  return <span style={{color,fontVariantNumeric:'tabular-nums'}}>{val}</span>;
}

function VoteTrend({ upvotes, downvotes, score }) {
  const dark=useDark();
  const pts=Array.from({length:7},(_,i)=>{
    const n=(Math.sin(i*2.3+score)*0.3+0.7);
    return { label:`J-${6-i}`, up:Math.round(Math.max(0,upvotes*n*(i+1)/7)), down:Math.round(Math.max(0,downvotes*n*(i+1)/7)) };
  });
  return (
    <ResponsiveContainer width="100%" height={70}>
      <AreaChart data={pts} margin={{top:2,right:2,left:-32,bottom:-4}}>
        <defs>
          <linearGradient id="gUp"   x1="0" y1="0" x2="0" y2="1"><stop offset="5%"  stopColor="#10b981" stopOpacity={0.35}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
          <linearGradient id="gDown" x1="0" y1="0" x2="0" y2="1"><stop offset="5%"  stopColor="#ef4444" stopOpacity={0.25}/><stop offset="95%" stopColor="#ef4444" stopOpacity={0}/></linearGradient>
        </defs>
        <XAxis dataKey="label" tick={{fontSize:8,fill:dark?'#475569':'#9ca3af'}}/>
        <YAxis hide allowDecimals={false}/>
        <Area type="monotone" dataKey="up"   stroke="#10b981" fill="url(#gUp)"   strokeWidth={1.5} dot={false}/>
        <Area type="monotone" dataKey="down" stroke="#ef4444" fill="url(#gDown)" strokeWidth={1.5} dot={false}/>
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ─── Bouton de vote ────────────────────────────────────────────────────────────
function VoteButton({ type, count, active, loading, onClick, disabled, dark }) {
  const isUp = type === 'up';
  const color = isUp ? '#10b981' : '#ef4444';
  const activeBg = isUp
    ? (dark ? 'rgba(16,185,129,0.2)' : '#dcfce7')
    : (dark ? 'rgba(239,68,68,0.2)'  : '#fee2e2');
  const hoverBg = isUp
    ? (dark ? 'rgba(16,185,129,0.12)' : '#ecfdf5')
    : (dark ? 'rgba(239,68,68,0.12)'  : '#fef2f2');

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      title={`${isUp ? 'Voter pour' : 'Voter contre'} ce signalement${active ? ' (annuler)' : ''}`}
      style={{
        flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
        gap:6, padding:'14px 10px', borderRadius:14,
        border:`2px solid ${active ? color : (dark?'#334155':'#e2e8f0')}`,
        background: active ? activeBg : (dark?'#0f172a':'#f8fafc'),
        cursor: disabled||loading ? 'not-allowed' : 'pointer',
        opacity: disabled||loading ? 0.6 : 1,
        transition:'all 0.2s cubic-bezier(0.22,1,0.36,1)',
        boxShadow: active ? `0 4px 16px ${color}30` : 'none',
        transform: active ? 'scale(1.03)' : 'scale(1)',
      }}
      onMouseEnter={e => { if(!active&&!disabled&&!loading){ e.currentTarget.style.background=hoverBg; e.currentTarget.style.borderColor=color; e.currentTarget.style.transform='scale(1.02)'; }}}
      onMouseLeave={e => { if(!active){ e.currentTarget.style.background=dark?'#0f172a':'#f8fafc'; e.currentTarget.style.borderColor=dark?'#334155':'#e2e8f0'; e.currentTarget.style.transform='scale(1)'; }}}
    >
      {loading ? (
        <div style={{width:22,height:22,border:`2px solid ${color}`,borderTopColor:'transparent',borderRadius:'50%',animation:'remine-spin 0.7s linear infinite'}}/>
      ) : (
        <>
          <span style={{
            fontSize:28,
            filter: active ? 'none' : 'grayscale(0.3)',
            transition:'transform 0.3s cubic-bezier(0.34,1.56,0.64,1)',
          }}>{isUp ? '👍' : '👎'}</span>
          <span style={{fontSize:18,fontWeight:900,color,fontVariantNumeric:'tabular-nums'}}>{count}</span>
          <span style={{fontSize:10,fontWeight:700,color,opacity:0.8}}>{isUp ? 'Pour' : 'Contre'}</span>
          {active && (
            <span style={{fontSize:9,color,background:`${color}15`,padding:'2px 8px',borderRadius:99,fontWeight:700}}>
              ✓ Voté · Cliquer pour annuler
            </span>
          )}
        </>
      )}
    </button>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────
export function VotesPanel({ report }) {
  const [data,      setData]      = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [voting,    setVoting]    = useState(null); // 'up' | 'down' | null
  const [feedback,  setFeedback]  = useState(null); // { type: 'success'|'info'|'error', msg }
  const [tab,       setTab]       = useState('vote');
  const [showManager, setShowManager] = useState(false);
  const dark = useDark();

  const reportId = report?._id || report?.id;

  const load = useCallback(async () => {
    if (!reportId) return;
    setLoading(true);
    try {
      const res = await dashboardAPI.request(`/api/reports/${reportId}/vote`);
      setData(res?.data || null);
    } catch { setData(null); }
    finally { setLoading(false); }
  }, [reportId]);

  useEffect(() => { load(); }, [load]);

  // ── Action de vote ─────────────────────────────────────────────────────────
  const handleVote = useCallback(async (voteType) => {
    if (!reportId || voting) return;
    setVoting(voteType);
    setFeedback(null);
    try {
      const res = await dashboardAPI.request(`/api/reports/${reportId}/vote`, {
        method: 'POST',
        body: JSON.stringify({ voteType }),
      });
      if (res?.success) {
        setData(res.data);
        const msgs = {
          added:   { type:'success', msg: voteType==='up' ? '👍 Vote positif enregistré !' : '👎 Vote négatif enregistré !' },
          removed: { type:'info',    msg: '↩️ Vote annulé' },
          changed: { type:'success', msg: voteType==='up' ? '🔄 Changé en vote positif' : '🔄 Changé en vote négatif' },
        };
        setFeedback(msgs[res.data?.action] || { type:'success', msg:'Vote enregistré' });
        setTimeout(() => setFeedback(null), 3000);
      }
    } catch (e) {
      setFeedback({ type:'error', msg:'Erreur lors du vote. Réessayez.' });
      setTimeout(() => setFeedback(null), 3000);
    } finally {
      setVoting(null);
    }
  }, [reportId, voting]);

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', gap:8, padding:'16px 0', color:dark?'#64748b':'#9ca3af' }}>
      <div style={{ width:16, height:16, border:'2px solid #10b981', borderTopColor:'transparent', borderRadius:'50%', animation:'remine-spin 0.7s linear infinite' }}/>
      <span style={{fontSize:12}}>Chargement des votes…</span>
    </div>
  );

  const upvotes   = data?.upvotes   ?? 0;
  const downvotes = data?.downvotes ?? 0;
  const score     = data?.score     ?? (report?.voteCount || 0);
  const userVote  = data?.userVote  ?? null;
  const total     = upvotes + downvotes;
  const upPct     = total > 0 ? Math.round(upvotes / total * 100) : 0;

  const label = score>15?{text:'🔥 Viral',color:'#dc2626'}:score>8?{text:'⭐ Populaire',color:'#f59e0b'}:score>3?{text:'📈 Positif',color:'#10b981'}:score>0?{text:'👍 Soutenu',color:'#3b82f6'}:score<-3?{text:'📉 Contesté',color:'#ef4444'}:score<0?{text:'⚠️ Douteux',color:'#f97316'}:{text:'➡️ Neutre',color:'#6b7280'};

  const tabs = [{id:'vote',label:'🗳️ Voter'},{id:'overview',label:'📊 Résumé'},{id:'trend',label:'📈 Tendance'},{id:'details',label:'🔍 Détails'}];

  return (
    <div style={{display:'flex',flexDirection:'column',gap:0}}>

      {/* Sous-onglets */}
      <div style={{display:'flex',gap:2,background:dark?'#0f172a':'#f1f5f9',padding:3,borderRadius:10,marginBottom:12,width:'fit-content'}}>
        {tabs.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{padding:'4px 12px',borderRadius:7,border:'none',cursor:'pointer',fontSize:11,fontWeight:600,background:tab===t.id?(dark?'#1e293b':'#fff'):'transparent',color:tab===t.id?(dark?'#f1f5f9':'#0f172a'):(dark?'#64748b':'#9ca3af'),boxShadow:tab===t.id?'0 1px 4px rgba(0,0,0,0.08)':'none',transition:'all 0.15s'}}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── VOTER ── */}
      {tab === 'vote' && (
        <div style={{display:'flex',flexDirection:'column',gap:12}}>

          {/* Feedback */}
          {feedback && (
            <div style={{
              padding:'10px 14px', borderRadius:12, fontSize:12, fontWeight:600,
              background: feedback.type==='success'?'#dcfce7':feedback.type==='info'?'#dbeafe':'#fee2e2',
              color:       feedback.type==='success'?'#16a34a':feedback.type==='info'?'#1d4ed8':'#dc2626',
              border:`1px solid ${feedback.type==='success'?'#bbf7d0':feedback.type==='info'?'#bfdbfe':'#fecaca'}`,
              animation:'remine-scale-in 0.2s both',
            }}>
              {feedback.msg}
            </div>
          )}

          {/* Score actuel */}
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 16px',background:dark?'#0f172a':'#f8fafc',borderRadius:14,border:`1px solid ${dark?'#1e293b':'#f1f5f9'}`}}>
            <div>
              <p style={{fontSize:11,color:dark?'#64748b':'#9ca3af',margin:'0 0 4px',fontWeight:700,textTransform:'uppercase',letterSpacing:0.8}}>Score actuel</p>
              <ScoreBadge score={score} size="lg"/>
            </div>
            <div style={{textAlign:'right'}}>
              <p style={{fontSize:12,fontWeight:800,color:label.color,margin:'0 0 3px'}}>{label.text}</p>
              <p style={{fontSize:11,color:dark?'#475569':'#9ca3af',margin:0}}>{total} vote{total>1?'s':''} total</p>
              {userVote && <p style={{fontSize:10,color:userVote==='up'?'#10b981':'#ef4444',margin:'3px 0 0',fontWeight:700}}>Votre vote actuel : {userVote==='up'?'👍 Pour':'👎 Contre'}</p>}
            </div>
          </div>

          {/* Boutons de vote */}
          <div style={{display:'flex',gap:10}}>
            <VoteButton type="up"   count={upvotes}   active={userVote==='up'}   loading={voting==='up'}   onClick={()=>handleVote('up')}   disabled={!!voting} dark={dark}/>
            <VoteButton type="down" count={downvotes}  active={userVote==='down'} loading={voting==='down'} onClick={()=>handleVote('down')} disabled={!!voting} dark={dark}/>
          </div>

          {/* Barre résultat */}
          {total > 0 && <VoteBar upvotes={upvotes} downvotes={downvotes} height={14}/>}

          {/* Aide contextuelle */}
          <div style={{padding:'10px 14px',background:dark?'#0f172a':'#f8fafc',borderRadius:12,border:`1px solid ${dark?'#1e293b':'#f1f5f9'}`}}>
            <p style={{fontSize:11,color:dark?'#475569':'#9ca3af',margin:0,lineHeight:1.6}}>
              💡 <strong>Comment ça fonctionne :</strong> Votez pour valider ou contester un signalement. Cliquer à nouveau sur votre vote l'annule. Le score influence la priorité de traitement.
            </p>
          </div>
        </div>
      )}

      {/* ── RÉSUMÉ ── */}
      {tab === 'overview' && (
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          <div style={{background:dark?'#0f172a':'#f8fafc',borderRadius:16,padding:'16px 18px',border:`1px solid ${dark?'#1e293b':'#f1f5f9'}`,display:'flex',alignItems:'center',gap:16}}>
            <ScoreBadge score={score} size="xl"/>
            <div style={{flex:1}}>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
                <span style={{fontSize:13,fontWeight:800,color:label.color}}>{label.text}</span>
                {total>0&&<span style={{fontSize:10,color:dark?'#475569':'#9ca3af',background:dark?'#1e293b':'#f1f5f9',padding:'2px 8px',borderRadius:99}}>{total} vote{total>1?'s':''}</span>}
              </div>
              {total>0?<VoteBar upvotes={upvotes} downvotes={downvotes}/>:<p style={{fontSize:11,color:dark?'#475569':'#9ca3af',margin:0}}>Aucun vote pour le moment</p>}
            </div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
            {[
              {label:'👍 Pour',  value:upvotes,  color:'#10b981',bg:dark?'rgba(16,185,129,0.1)':'#dcfce7'},
              {label:'👎 Contre',value:downvotes,color:'#ef4444',bg:dark?'rgba(239,68,68,0.1)':'#fee2e2'},
              {label:'⚡ Score', value:score,    color:score>0?'#10b981':score<0?'#ef4444':'#6b7280',bg:dark?'#0f172a':'#f8fafc'},
            ].map(c=>(
              <div key={c.label} style={{textAlign:'center',padding:'12px 8px',background:c.bg,borderRadius:12}}>
                <p style={{fontSize:22,fontWeight:900,color:c.color,margin:0}}><CountUp target={Math.abs(c.value)} color={c.color}/></p>
                <p style={{fontSize:10,color:c.color,margin:'3px 0 0',fontWeight:700,opacity:0.8}}>{c.label}</p>
              </div>
            ))}
          </div>
          {total>0&&(
            <div style={{background:dark?'#0f172a':'#f8fafc',borderRadius:12,padding:'12px 14px',border:`1px solid ${dark?'#1e293b':'#f1f5f9'}`}}>
              <p style={{fontSize:11,fontWeight:800,color:dark?'#64748b':'#9ca3af',textTransform:'uppercase',letterSpacing:0.8,margin:'0 0 8px'}}>Analyse</p>
              {[
                {label:'Soutien',pct:upPct,color:'#10b981'},
                {label:'Contestation',pct:100-upPct,color:'#ef4444'},
                {label:'Engagement',pct:Math.min(100,total*10),color:'#3b82f6'},
              ].map(m=>(
                <div key={m.label} style={{marginBottom:8}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
                    <span style={{fontSize:10,color:dark?'#94a3b8':'#6b7280'}}>{m.label}</span>
                    <span style={{fontSize:10,fontWeight:800,color:m.color}}>{m.pct}%</span>
                  </div>
                  <div style={{height:5,background:dark?'#1e293b':'#f1f5f9',borderRadius:99,overflow:'hidden'}}>
                    <div style={{height:'100%',background:`linear-gradient(90deg,${m.color},${m.color}88)`,width:`${m.pct}%`,borderRadius:99,transition:'width 1s cubic-bezier(0.22,1,0.36,1)'}}/>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TENDANCE ── */}
      {tab==='trend'&&(
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          <div style={{background:dark?'#0f172a':'#f8fafc',borderRadius:14,padding:'14px',border:`1px solid ${dark?'#1e293b':'#f1f5f9'}`}}>
            <p style={{fontSize:11,fontWeight:700,color:dark?'#64748b':'#9ca3af',textTransform:'uppercase',letterSpacing:0.8,margin:'0 0 10px'}}>Évolution estimée — 7 jours</p>
            <VoteTrend upvotes={upvotes} downvotes={downvotes} score={score}/>
            <div style={{display:'flex',gap:12,marginTop:8,justifyContent:'center'}}>
              <div style={{display:'flex',alignItems:'center',gap:5}}><span style={{width:8,height:8,borderRadius:'50%',background:'#10b981'}}/><span style={{fontSize:10,color:dark?'#64748b':'#9ca3af'}}>Pour</span></div>
              <div style={{display:'flex',alignItems:'center',gap:5}}><span style={{width:8,height:8,borderRadius:'50%',background:'#ef4444'}}/><span style={{fontSize:10,color:dark?'#64748b':'#9ca3af'}}>Contre</span></div>
            </div>
          </div>
          <div style={{background:dark?'#0f172a':'#f8fafc',borderRadius:14,padding:'14px',border:`1px solid ${dark?'#1e293b':'#f1f5f9'}`}}>
            <p style={{fontSize:11,fontWeight:700,color:dark?'#64748b':'#9ca3af',textTransform:'uppercase',letterSpacing:0.8,margin:'0 0 10px'}}>Jalons</p>
            {[
              {label:'Populaire', threshold:5,  icon:'⭐',reached:score>=5},
              {label:'Viral',     threshold:15, icon:'🔥',reached:score>=15},
              {label:'Tendance',  threshold:30, icon:'🚀',reached:score>=30},
              {label:'Référence', threshold:50, icon:'🏆',reached:score>=50},
            ].map(m=>(
              <div key={m.label} style={{display:'flex',alignItems:'center',gap:10,padding:'6px 0',borderBottom:`1px solid ${dark?'#1e293b':'#f1f5f9'}`}}>
                <span style={{fontSize:16,opacity:m.reached?1:0.3}}>{m.icon}</span>
                <div style={{flex:1}}>
                  <div style={{display:'flex',justifyContent:'space-between'}}>
                    <span style={{fontSize:11,fontWeight:700,color:m.reached?(dark?'#f1f5f9':'#0f172a'):(dark?'#334155':'#cbd5e1')}}>{m.label}</span>
                    <span style={{fontSize:10,color:dark?'#64748b':'#9ca3af'}}>Score {m.threshold}+</span>
                  </div>
                  <div style={{height:4,background:dark?'#1e293b':'#f1f5f9',borderRadius:99,marginTop:4,overflow:'hidden'}}>
                    <div style={{height:'100%',background:m.reached?'#10b981':'#3b82f6',width:`${Math.min(100,(score/m.threshold)*100)}%`,borderRadius:99,transition:'width 1s'}}/>
                  </div>
                </div>
                {m.reached&&<span style={{fontSize:9,fontWeight:700,color:'#10b981',background:'#dcfce7',padding:'2px 6px',borderRadius:99}}>✓</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── DÉTAILS ── */}
      {tab==='details'&&(
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          <div style={{background:dark?'#0f172a':'#f8fafc',borderRadius:14,padding:'14px',border:`1px solid ${dark?'#1e293b':'#f1f5f9'}`}}>
            <p style={{fontSize:11,fontWeight:700,color:dark?'#64748b':'#9ca3af',textTransform:'uppercase',letterSpacing:0.8,margin:'0 0 10px'}}>Métriques</p>
            {[
              {label:'Score brut',        value:`${score>0?'+':''}${score}`,note:'upvotes − downvotes'},
              {label:'Total de votes',     value:total,                       note:'participation citoyenne'},
              {label:'Taux de soutien',    value:`${upPct}%`,                  note:'proportion positive'},
              {label:'Indice de confiance',value:total>=10?`${Math.min(99,Math.round(upPct*0.8+Math.log(total+1)*5))}%`:'Insuffisant',note:'score + volume combinés'},
            ].map(m=>(
              <div key={m.label} style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',padding:'7px 0',borderBottom:`1px solid ${dark?'#1e293b':'#f1f5f9'}`}}>
                <div>
                  <p style={{fontSize:12,fontWeight:600,color:dark?'#e2e8f0':'#374151',margin:0}}>{m.label}</p>
                  <p style={{fontSize:10,color:dark?'#475569':'#9ca3af',margin:'2px 0 0'}}>{m.note}</p>
                </div>
                <span style={{fontSize:14,fontWeight:900,color:dark?'#f1f5f9':'#0f172a',fontVariantNumeric:'tabular-nums'}}>{m.value}</span>
              </div>
            ))}
          </div>
          {total>0&&(
            <div style={{background:score>3?(dark?'rgba(16,185,129,0.08)':'#ecfdf5'):score<-1?(dark?'rgba(239,68,68,0.08)':'#fef2f2'):(dark?'#0f172a':'#f8fafc'),borderRadius:12,padding:'12px 14px',border:`1px solid ${score>3?'#bbf7d0':score<-1?'#fecaca':(dark?'#1e293b':'#f1f5f9')}`}}>
              <p style={{fontSize:11,fontWeight:800,color:score>3?'#16a34a':score<-1?'#dc2626':(dark?'#94a3b8':'#6b7280'),margin:'0 0 4px'}}>
                {score>3?'✅ Recommandation':score<-1?'⚠️ Attention':'💡 Information'}
              </p>
              <p style={{fontSize:11,color:dark?'#94a3b8':'#6b7280',margin:0,lineHeight:1.5}}>
                {score>10?'Fort soutien communautaire. Priorisez le traitement.':score>3?'La communauté valide ce signalement.':score<-3?'Fortement contesté. Vérifiez avant traitement.':score<0?'Suscite des doutes. Vérification conseillée.':'Votes insuffisants pour conclure.'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Bouton gérer les votes */}
      <button onClick={() => setShowManager(true)} style={{ fontSize:11, fontWeight:700, color:'#8b5cf6', background:'none', border:'none', cursor:'pointer', padding:'10px 0 0', display:'flex', alignItems:'center', gap:5, alignSelf:'flex-start' }}>
        ⚙️ Gérer les votes (admin)
      </button>

      {/* Modal VoteManagerPanel */}
      {showManager && (
        <div style={{ position:'fixed', inset:0, zIndex:9990, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.5)', backdropFilter:'blur(4px)', animation:'remine-fade-in 0.15s both' }} onClick={e => { if (e.target === e.currentTarget) setShowManager(false); }}>
          <div style={{ background:dark?'#1e293b':'#fff', borderRadius:24, padding:'24px 28px', width:'min(600px, 95vw)', maxHeight:'90vh', overflow:'hidden', display:'flex', flexDirection:'column', gap:16, boxShadow:'0 32px 80px rgba(0,0,0,0.3)', border:`1px solid ${dark?'#334155':'#f1f5f9'}`, animation:'remine-scale-in 0.2s both' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
              <h2 style={{ fontSize:16, fontWeight:800, color:dark?'#f1f5f9':'#0f172a', margin:0, display:'flex', alignItems:'center', gap:8 }}>
                <span>⚙️</span> Gestion des votes
              </h2>
              <button onClick={() => setShowManager(false)} style={{ width:32, height:32, borderRadius:'50%', background:dark?'#334155':'#f1f5f9', border:'none', cursor:'pointer', color:dark?'#94a3b8':'#374151', fontSize:16, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700 }}>✕</button>
            </div>
            <div style={{ flex:1, overflowY:'auto' }}>
              <VoteManagerPanel report={report} onClose={() => { setShowManager(false); load(); }} />
            </div>
          </div>
        </div>
      )}

      <button onClick={load} style={{fontSize:11,color:dark?'#64748b':'#9ca3af',background:'none',border:'none',cursor:'pointer',padding:'4px 0 0',display:'flex',alignItems:'center',gap:5,alignSelf:'flex-start'}}>
        <span onMouseEnter={e=>e.currentTarget.style.transform='rotate(180deg)'} onMouseLeave={e=>e.currentTarget.style.transform='rotate(0)'} style={{display:'inline-block',transition:'transform 0.3s'}}>↺</span> Rafraîchir
      </button>
    </div>
  );
}
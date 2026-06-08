// ─── GlobalSearch — Modal de recherche avancée ───────────────────────────────
const TYPE_FR_SEARCH = {
  water_pollution:'Pollution eau', air_pollution:'Pollution air',
  soil_contamination:'Contamination sol', waste_deposit:'Dépôt déchets',
  dust:'Poussière', abandoned_site:'Site abandonné',
  noise_pollution:'Pollution sonore', other:'Autre',
};
const SEV_COLOR_SEARCH = { critical:'#dc2626', high:'#f97316', medium:'#f59e0b', low:'#22c55e' };
const STA_LABEL_SEARCH = { new:'Nouveau', verified:'Vérifié', in_progress:'En cours', resolved:'Résolu', rejected:'Rejeté' };
const STA_COLOR_SEARCH = { new:'#f59e0b', verified:'#3b82f6', in_progress:'#8b5cf6', resolved:'#10b981', rejected:'#ef4444' };

function GlobalSearch({ show, onClose, onNavigate, reports = [], users = [], darkMode: dm }) {
  const [q,          setQ]          = React.useState('');
  const [category,   setCategory]   = React.useState('all'); // all|reports|users|locations
  const [selected,   setSelected]   = React.useState(0);
  const [serverRes,  setServerRes]  = React.useState(null);
  const [loading,    setLoading]    = React.useState(false);
  const inputRef = React.useRef(null);
  const listRef  = React.useRef(null);

  // Focus auto à l'ouverture
  React.useEffect(() => {
    if (show) { setQ(''); setCategory('all'); setSelected(0); setServerRes(null); setTimeout(() => inputRef.current?.focus(), 50); }
  }, [show]);

  // Recherche serveur avec debounce
  React.useEffect(() => {
    if (q.length < 3) { setServerRes(null); return; }
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const token = localStorage.getItem('remine_admin_token');
        const api   = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';
        const res   = await fetch(`${api}/admin/search?q=${encodeURIComponent(q)}&limit=8`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success) setServerRes(data.data);
      } catch {} finally { setLoading(false); }
    }, 300);
    return () => clearTimeout(timer);
  }, [q]);

  // Résultats locaux (instantanés)
  const localResults = React.useMemo(() => {
    if (q.length < 2) return { reports:[], users:[], locations:[] };
    const lq = q.toLowerCase();

    const repFiltered = reports.filter(r =>
      (r.type && (TYPE_FR_SEARCH[r.type]||r.type).toLowerCase().includes(lq)) ||
      (r.description||r.title||'').toLowerCase().includes(lq) ||
      (r.location?.city||'').toLowerCase().includes(lq) ||
      (r.location?.region||'').toLowerCase().includes(lq) ||
      (r._id||'').toString().slice(-6).includes(lq)
    ).slice(0, 8);

    const usrFiltered = users.filter(u =>
      `${u.firstName||''} ${u.lastName||''}`.toLowerCase().includes(lq) ||
      (u.email||'').toLowerCase().includes(lq) ||
      (u.community||'').toLowerCase().includes(lq)
    ).slice(0, 5);

    const cities = [...new Set(reports.map(r => r.location?.city).filter(Boolean))]
      .filter(c => c.toLowerCase().includes(lq)).slice(0, 4);
    const regions = [...new Set(reports.map(r => r.location?.region).filter(Boolean))]
      .filter(r => r.toLowerCase().includes(lq)).slice(0, 3);

    return { reports: repFiltered, users: usrFiltered, locations: [...cities, ...regions] };
  }, [q, reports, users]);

  // Fusionner résultats locaux + serveur
  const merged = React.useMemo(() => {
    const srv = serverRes || {};
    const srvReports = (srv.reports||[]).filter(r => !localResults.reports.some(lr => lr._id===r._id));
    const srvUsers   = (srv.users||[]).filter(u => !localResults.users.some(lu => lu._id===u._id));
    return {
      reports:   [...localResults.reports, ...srvReports].slice(0, 8),
      users:     [...localResults.users, ...srvUsers].slice(0, 5),
      locations: localResults.locations,
    };
  }, [localResults, serverRes]);

  // Tous les items à naviguer au clavier
  const items = React.useMemo(() => {
    const all = [];
    if (category === 'all' || category === 'reports')
      merged.reports.forEach(r => all.push({ type:'report', data:r }));
    if (category === 'all' || category === 'users')
      merged.users.forEach(u => all.push({ type:'user', data:u }));
    if (category === 'all' || category === 'locations')
      merged.locations.forEach(l => all.push({ type:'location', data:l }));
    return all;
  }, [merged, category]);

  // Navigation clavier
  React.useEffect(() => {
    if (!show) return;
    const handler = (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s+1, items.length-1)); }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setSelected(s => Math.max(s-1, 0)); }
      if (e.key === 'Enter' && items[selected]) { handleSelect(items[selected]); }
      if (e.key === 'Escape') { onClose(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [show, items, selected]);

  // Scroll item sélectionné visible
  React.useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${selected}"]`);
    el?.scrollIntoView({ block:'nearest' });
  }, [selected]);

  const handleSelect = (item) => {
    if (item.type === 'report') {
      onNavigate('reports', item.data._id||item.data.id);
    } else if (item.type === 'user') {
      onNavigate('citoyens');
    } else if (item.type === 'location') {
      onNavigate('reports');
    }
    onClose();
  };

  if (!show) return null;

  const cardBg  = dm ? '#1e293b' : '#fff';
  const border  = dm ? '#334155' : '#f1f5f9';
  const textPri = dm ? '#f1f5f9' : '#0f172a';
  const textSec = dm ? '#94a3b8' : '#6b7280';
  const textMut = dm ? '#64748b' : '#9ca3af';
  const bgMut   = dm ? '#0f172a' : '#f8fafc';
  const hoverBg = dm ? 'rgba(255,255,255,0.05)' : '#f8fafc';

  const totalResults = merged.reports.length + merged.users.length + merged.locations.length;
  let globalIdx = 0;

  const SectionHeader = ({ icon, label, count }) => (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 16px 4px', background:bgMut, borderTop:`1px solid ${border}` }}>
      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
        {icon}
        <span style={{ fontSize:10, fontWeight:800, color:textSec, textTransform:'uppercase', letterSpacing:1 }}>{label}</span>
      </div>
      <span style={{ fontSize:10, color:textMut }}>{count} résultat{count>1?'s':''}</span>
    </div>
  );

  return (
    <div style={{ position:'fixed', top:0, left:0, right:0, bottom:0, zIndex:99999, display:'flex', alignItems:'flex-start', justifyContent:'center', paddingTop:72, paddingLeft:16, paddingRight:16, background:'rgba(0,0,0,0.5)', backdropFilter:'blur(6px)' }}
      onClick={onClose}>
      <div style={{ background:cardBg, borderRadius:20, width:'min(640px,100%)', boxShadow:'0 32px 80px rgba(0,0,0,0.3)', border:`1px solid ${border}`, overflow:'hidden', animation:'remine-scale-in 0.18s both' }}
        onClick={e => e.stopPropagation()}>

        {/* ── Input ── */}
        <div style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 18px', borderBottom:`1px solid ${border}` }}>
          {loading
            ? <span style={{ width:16, height:16, border:'2px solid #10b981', borderTopColor:'transparent', borderRadius:'50%', animation:'remine-spin 0.7s linear infinite', flexShrink:0 }} />
            : <Search size={16} color={textMut} style={{ flexShrink:0 }} />}
          <input ref={inputRef} value={q} onChange={e => { setQ(e.target.value); setSelected(0); }}
            placeholder="Rechercher signalement, citoyen, commune, type…"
            style={{ flex:1, fontSize:15, outline:'none', border:'none', background:'transparent', color:textPri, fontFamily:'inherit' }} />
          {q && <button onClick={()=>{setQ('');setServerRes(null);inputRef.current?.focus();}} style={{ width:22, height:22, borderRadius:'50%', background:dm?'#334155':'#f1f5f9', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:textSec, fontSize:12 }}>✕</button>}
          <kbd style={{ fontSize:10, padding:'2px 7px', borderRadius:6, background:dm?'#0f172a':'#f1f5f9', border:`1px solid ${border}`, color:textMut, fontFamily:'monospace' }}>Esc</kbd>
        </div>

        {/* ── Filtres catégorie ── */}
        <div style={{ display:'flex', gap:4, padding:'8px 16px', borderBottom:`1px solid ${border}`, background:bgMut }}>
          {[
            { id:'all',       label:'Tout',          count: totalResults },
            { id:'reports',   label:'Signalements',  count: merged.reports.length },
            { id:'users',     label:'Citoyens',      count: merged.users.length },
            { id:'locations', label:'Lieux',         count: merged.locations.length },
          ].map(cat => (
            <button key={cat.id} onClick={()=>{setCategory(cat.id);setSelected(0);}} style={{ display:'flex', alignItems:'center', gap:5, padding:'4px 10px', borderRadius:8, border:`1px solid ${category===cat.id?'#10b981':border}`, background:category===cat.id?(dm?'rgba(16,185,129,0.15)':'#ecfdf5'):'transparent', color:category===cat.id?'#10b981':textSec, fontSize:11, fontWeight:category===cat.id?700:500, cursor:'pointer', transition:'all 0.15s' }}>
              {cat.label}
              {q.length >= 2 && cat.count > 0 && <span style={{ fontSize:10, fontWeight:700, background:category===cat.id?'#10b981':dm?'#334155':'#e2e8f0', color:category===cat.id?'#fff':textSec, padding:'0px 5px', borderRadius:99 }}>{cat.count}</span>}
            </button>
          ))}
        </div>

        {/* ── Résultats ── */}
        <div ref={listRef} style={{ maxHeight:420, overflowY:'auto' }}>
          {q.length < 2 ? (
            <div style={{ padding:'24px 18px' }}>
              <p style={{ fontSize:11, fontWeight:700, color:textMut, textTransform:'uppercase', letterSpacing:1, margin:'0 0 12px' }}>Recherches récentes</p>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                {['Pollution eau','Site abandonné','Thies','Dakar'].map(s => (
                  <button key={s} onClick={()=>setQ(s)} style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 12px', borderRadius:10, border:`1px solid ${border}`, background:bgMut, color:textSec, fontSize:12, cursor:'pointer', textAlign:'left', transition:'all 0.15s' }}
                    onMouseEnter={e=>e.currentTarget.style.borderColor='#10b981'}
                    onMouseLeave={e=>e.currentTarget.style.borderColor=border}>
                    <Search size={11} color={textMut}/> {s}
                  </button>
                ))}
              </div>
              <p style={{ fontSize:11, color:textMut, margin:'16px 0 0', textAlign:'center' }}>
                Tapez pour chercher dans {reports.length} signalements et {users.length} utilisateurs
              </p>
            </div>
          ) : totalResults === 0 && !loading ? (
            <div style={{ padding:'32px 18px', textAlign:'center' }}>
              <div style={{ fontSize:32, marginBottom:10 }}>🔍</div>
              <p style={{ fontSize:14, fontWeight:700, color:textPri, margin:'0 0 6px' }}>Aucun résultat pour « {q} »</p>
              <p style={{ fontSize:12, color:textMut, margin:0 }}>Essayez avec d'autres mots-clés</p>
            </div>
          ) : (
            <>
              {/* Signalements */}
              {(category==='all'||category==='reports') && merged.reports.length > 0 && (
                <div>
                  <SectionHeader icon={<ClipboardList size={12} color={textSec}/>} label="Signalements" count={merged.reports.length}/>
                  {merged.reports.map(r => {
                    const idx = globalIdx++;
                    const isSel = idx === selected;
                    const sevC  = SEV_COLOR_SEARCH[r.severity] || '#6b7280';
                    const staC  = STA_COLOR_SEARCH[r.status]   || '#6b7280';
                    const typeLabel = TYPE_FR_SEARCH[r.type] || r.type || 'Signalement';
                    return (
                      <button key={r._id||r.id} data-idx={idx}
                        onClick={() => handleSelect({ type:'report', data:r })}
                        style={{ width:'100%', display:'flex', alignItems:'center', gap:12, padding:'10px 16px', border:'none', background:isSel?(dm?'rgba(16,185,129,0.12)':'#ecfdf5'):'transparent', cursor:'pointer', textAlign:'left', borderLeft:isSel?'3px solid #10b981':'3px solid transparent', transition:'all 0.1s' }}>
                        <div style={{ width:36, height:36, borderRadius:10, background:`${sevC}18`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:16 }}>
                          {({water_pollution:'💧',air_pollution:'💨',soil_contamination:'🟤',waste_deposit:'🗑️',dust:'🌫️',abandoned_site:'🏚️',noise_pollution:'🔊'})[r.type] || '⚠️'}
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <p style={{ fontSize:12, fontWeight:700, color:textPri, margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                            {typeLabel}{r.title ? ' — '+r.title.substring(0,40) : r.description ? ' — '+r.description.substring(0,40) : ''}
                          </p>
                          <p style={{ fontSize:10, color:textMut, margin:'3px 0 0', display:'flex', gap:8 }}>
                            {r.location?.city && <span>📍 {r.location.city}</span>}
                            <span style={{ color:staC, fontWeight:600 }}>{STA_LABEL_SEARCH[r.status]||r.status}</span>
                            {r._id && <span style={{ fontFamily:'monospace' }}>#{r._id.toString().slice(-6)}</span>}
                          </p>
                        </div>
                        <span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:99, background:`${sevC}18`, color:sevC, flexShrink:0 }}>{r.severity}</span>
                        <ChevronDown size={13} color={textMut} style={{ transform:'rotate(-90deg)', flexShrink:0 }}/>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Utilisateurs */}
              {(category==='all'||category==='users') && merged.users.length > 0 && (
                <div>
                  <SectionHeader icon={<Users size={12} color={textSec}/>} label="Citoyens" count={merged.users.length}/>
                  {merged.users.map(u => {
                    const idx = globalIdx++;
                    const isSel = idx === selected;
                    const color = {citizen:'#10b981',admin:'#3b82f6',moderator:'#8b5cf6'}[u.role]||'#6b7280';
                    return (
                      <button key={u._id||u.id} data-idx={idx}
                        onClick={() => handleSelect({ type:'user', data:u })}
                        style={{ width:'100%', display:'flex', alignItems:'center', gap:12, padding:'10px 16px', border:'none', background:isSel?(dm?'rgba(16,185,129,0.12)':'#ecfdf5'):'transparent', cursor:'pointer', textAlign:'left', borderLeft:isSel?'3px solid #10b981':'3px solid transparent', transition:'all 0.1s' }}>
                        <div style={{ width:36, height:36, borderRadius:'50%', background:`linear-gradient(135deg,${color},${color}bb)`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:800, color:'#fff', flexShrink:0 }}>
                          {(u.firstName||'?')[0]}{(u.lastName||'?')[0]}
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <p style={{ fontSize:12, fontWeight:700, color:textPri, margin:0 }}>{u.firstName} {u.lastName}</p>
                          <p style={{ fontSize:10, color:textMut, margin:'2px 0 0' }}>{u.email}{u.community?' · '+u.community:''}</p>
                        </div>
                        <span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:99, background:`${color}18`, color, flexShrink:0 }}>{u.role}</span>
                        <ChevronDown size={13} color={textMut} style={{ transform:'rotate(-90deg)', flexShrink:0 }}/>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Lieux */}
              {(category==='all'||category==='locations') && merged.locations.length > 0 && (
                <div>
                  <SectionHeader icon={<MapPin size={12} color={textSec}/>} label="Lieux" count={merged.locations.length}/>
                  {merged.locations.map(loc => {
                    const idx = globalIdx++;
                    const isSel = idx === selected;
                    const count = reports.filter(r=>r.location?.city===loc||r.location?.region===loc).length;
                    return (
                      <button key={loc} data-idx={idx}
                        onClick={() => handleSelect({ type:'location', data:loc })}
                        style={{ width:'100%', display:'flex', alignItems:'center', gap:12, padding:'10px 16px', border:'none', background:isSel?(dm?'rgba(16,185,129,0.12)':'#ecfdf5'):'transparent', cursor:'pointer', textAlign:'left', borderLeft:isSel?'3px solid #10b981':'3px solid transparent', transition:'all 0.1s' }}>
                        <div style={{ width:36, height:36, borderRadius:10, background:dm?'rgba(59,130,246,0.15)':'#eff6ff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>📍</div>
                        <div style={{ flex:1 }}>
                          <p style={{ fontSize:12, fontWeight:700, color:textPri, margin:0 }}>{loc}</p>
                          <p style={{ fontSize:10, color:textMut, margin:'2px 0 0' }}>{count} signalement{count>1?'s':''}</p>
                        </div>
                        <ChevronDown size={13} color={textMut} style={{ transform:'rotate(-90deg)', flexShrink:0 }}/>
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Pied ── */}
        <div style={{ padding:'8px 16px', borderTop:`1px solid ${border}`, background:bgMut, display:'flex', gap:16, alignItems:'center' }}>
          <div style={{ display:'flex', gap:12, flex:1 }}>
            {[
              { key:'↑↓', label:'Naviguer' },
              { key:'↵',  label:'Ouvrir'   },
              { key:'Esc',label:'Fermer'   },
            ].map(k => (
              <span key={k.key} style={{ display:'flex', alignItems:'center', gap:4, fontSize:10, color:textMut }}>
                <kbd style={{ padding:'1px 5px', borderRadius:5, background:dm?'#1e293b':'#fff', border:`1px solid ${border}`, fontFamily:'monospace', fontSize:10, color:textSec }}>{k.key}</kbd>
                {k.label}
              </span>
            ))}
          </div>
          {q.length >= 2 && totalResults > 0 && (
            <span style={{ fontSize:10, color:textMut }}>{totalResults} résultat{totalResults>1?'s':''}</span>
          )}
        </div>
      </div>
    </div>
  );
}

export { GlobalSearch };
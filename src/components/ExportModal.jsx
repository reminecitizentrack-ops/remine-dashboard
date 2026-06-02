import React, { useState, useCallback, useMemo } from 'react';
import { dashboardAPI } from '../services/api';
import * as XLSX from 'xlsx';
import { LOGO_BASE64 } from '../assets/logo';

// ─── Constantes ───────────────────────────────────────────────────────────────
const TYPE_LABELS = {
  water_pollution:'Pollution eau', air_pollution:'Pollution air',
  soil_contamination:'Contamination sol', waste_deposit:'Dépôt déchets',
  dust:'Poussière', abandoned_site:'Site abandonné',
  noise_pollution:'Pollution sonore', other:'Autre',
};
const STATUS_LABELS = { new:'Nouveau', verified:'Vérifié', in_progress:'En cours', resolved:'Résolu', rejected:'Rejeté' };
const SEV_LABELS    = { low:'Faible', medium:'Moyen', high:'Élevé', critical:'Critique' };

const COLUMNS = [
  { id:'id',          label:'ID',                  default:false },
  { id:'type',        label:'Type de pollution',    default:true  },
  { id:'title',       label:'Titre',                default:true  },
  { id:'description', label:'Description',          default:true  },
  { id:'status',      label:'Statut',               default:true  },
  { id:'severity',    label:'Sévérité',             default:true  },
  { id:'city',        label:'Ville',                default:true  },
  { id:'region',      label:'Région',               default:true  },
  { id:'address',     label:'Adresse',              default:false },
  { id:'lat',         label:'Latitude',             default:false },
  { id:'lng',         label:'Longitude',            default:false },
  { id:'citizen',     label:'Citoyen',              default:true  },
  { id:'email',       label:'Email citoyen',        default:false },
  { id:'community',   label:'Communauté',           default:true  },
  { id:'votes',       label:'Score votes',          default:true  },
  { id:'upvotes',     label:'Pour (votes)',         default:false },
  { id:'downvotes',   label:'Contre (votes)',       default:false },
  { id:'confidence',  label:'Score IA (%)',         default:true  },
  { id:'verified',    label:'Vérifié IA',           default:false },
  { id:'createdAt',   label:'Date signalement',     default:true  },
  { id:'resolvedAt',  label:'Date résolution',      default:false },
];

const fmtDate = d => d ? new Date(d).toLocaleDateString('fr-FR', { day:'2-digit', month:'2-digit', year:'numeric' }) : '';
const fmtDateFull = d => d ? new Date(d).toLocaleDateString('fr-FR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '';
const getCitizenName = r => { const c = r?.citizen; if (c && typeof c === 'object') return `${c.firstName||''} ${c.lastName||''}`.trim() || c.email || 'Anonyme'; return typeof c === 'string' ? c : 'Anonyme'; };

function getCell(report, colId) {
  switch (colId) {
    case 'id':          return String(report._id || '');
    case 'type':        return TYPE_LABELS[report.type] || report.type || '';
    case 'title':       return report.title || report.description?.substring(0, 80) || '';
    case 'description': return (report.description || '').substring(0, 300);
    case 'status':      return STATUS_LABELS[report.status] || report.status || '';
    case 'severity':    return SEV_LABELS[report.severity] || report.severity || '';
    case 'city':        return report.location?.city || '';
    case 'region':      return report.location?.region || '';
    case 'address':     return report.location?.address || '';
    case 'lat':         return report.location?.latitude ?? '';
    case 'lng':         return report.location?.longitude ?? '';
    case 'citizen':     return getCitizenName(report);
    case 'email':       return report.citizen?.email || (typeof report.citizen === 'string' ? '' : '');
    case 'community':   return report.citizen?.community || '';
    case 'votes':       return report.voteCount ?? 0;
    case 'upvotes':     return (report.votes||[]).filter(v=>v.voteType==='up').length;
    case 'downvotes':   return (report.votes||[]).filter(v=>v.voteType==='down').length;
    case 'confidence':  return report.confidenceScore ?? '';
    case 'verified':    return report.isVerified ? 'Oui' : 'Non';
    case 'createdAt':   return fmtDate(report.createdAt);
    case 'resolvedAt':  return fmtDate(report.resolvedAt);
    default:            return '';
  }
}

// ─── Hook dark mode ───────────────────────────────────────────────────────────
function useDark() {
  const [dark, setDark] = React.useState(false);
  React.useEffect(() => {
    const check = () => setDark(document.documentElement.classList.contains('dark'));
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes:true, attributeFilter:['class'] });
    return () => obs.disconnect();
  }, []);
  return dark;
}

// ─── Composant principal ──────────────────────────────────────────────────────
export function ExportModal({ onClose, reports: allReports = [], stats }) {
  const dm = useDark();

  // ── Filtres ─────────────────────────────────────────────────────────────────
  const [filterStatus,   setFilterStatus]   = useState('all');
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [filterType,     setFilterType]     = useState('all');
  const [dateFrom,       setDateFrom]       = useState('');
  const [dateTo,         setDateTo]         = useState('');
  const [selectedCols,   setSelectedCols]   = useState(() => new Set(COLUMNS.filter(c=>c.default).map(c=>c.id)));
  const [format,         setFormat]         = useState('csv');
  const [exporting,      setExporting]      = useState(false);
  const [done,           setDone]           = useState(null);
  const [tab,            setTab]            = useState('filters'); // filters | columns | preview

  // ── Données filtrées ────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return allReports.filter(r => {
      if (filterStatus   !== 'all' && r.status   !== filterStatus)   return false;
      if (filterSeverity !== 'all' && r.severity !== filterSeverity) return false;
      if (filterType     !== 'all' && r.type     !== filterType)     return false;
      if (dateFrom && r.createdAt && new Date(r.createdAt) < new Date(dateFrom)) return false;
      if (dateTo   && r.createdAt && new Date(r.createdAt) > new Date(dateTo + 'T23:59:59')) return false;
      return true;
    });
  }, [allReports, filterStatus, filterSeverity, filterType, dateFrom, dateTo]);

  const activeCols = useMemo(() => COLUMNS.filter(c => selectedCols.has(c.id)), [selectedCols]);

  // ── Export CSV ──────────────────────────────────────────────────────────────
  const exportCSV = useCallback(() => {
    const SEP  = ';';
    const cell = v => { const s = String(v ?? '').replace(/"/g,'""').replace(/\r?\n/g,' '); return `"${s}"`; };
    const header = activeCols.map(c => cell(c.label)).join(SEP);
    const rows   = filtered.map(r => activeCols.map(c => cell(getCell(r, c.id))).join(SEP));
    const csv    = '\uFEFF' + [header, ...rows].join('\n');
    const blob   = new Blob([csv], { type:'text/csv;charset=utf-8;' });
    const url    = URL.createObjectURL(blob);
    const a      = document.createElement('a');
    a.href       = url;
    a.download   = `remine_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setDone({ count: filtered.length, format: 'CSV' });
  }, [filtered, activeCols]);

  // ── Export Excel XLSX ───────────────────────────────────────────────────────
  const exportXLSX = useCallback(() => {
    const ws_data = [
      activeCols.map(c => c.label),
      ...filtered.map(r => activeCols.map(c => getCell(r, c.id))),
    ];

    const wb  = XLSX.utils.book_new();
    const ws  = XLSX.utils.aoa_to_sheet(ws_data);

    // Largeurs de colonnes adaptatives
    ws['!cols'] = activeCols.map(c => ({ wch: Math.min(40, Math.max(12, c.label.length + 4)) }));

    // Style en-tête (feuille principale)
    const headerRange = XLSX.utils.decode_range(ws['!ref']);
    for (let C = headerRange.s.c; C <= headerRange.e.c; C++) {
      const addr = XLSX.utils.encode_cell({ r: 0, c: C });
      if (ws[addr]) {
        ws[addr].s = { font: { bold: true, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '10B981' } }, alignment: { horizontal: 'center' } };
      }
    }

    XLSX.utils.book_append_sheet(wb, ws, 'Signalements');

    // Feuille résumé stats
    if (stats) {
      const summary = [
        ['Résumé ReMine', ''],
        ['Généré le', new Date().toLocaleString('fr-FR')],
        [''],
        ['Total signalements', stats.overview?.totalReports || filtered.length],
        ['Signalements résolus', stats.overview?.resolvedReports || 0],
        ['Taux de résolution', `${Math.round(stats.overview?.resolutionRate || 0)}%`],
        ['Signalements actifs', stats.overview?.activeReports || 0],
        ['Citoyens inscrits', stats.overview?.totalUsers || 0],
        [''],
        ['Export filtré', filtered.length + ' signalements'],
        ['Colonnes exportées', activeCols.length],
      ];
      const ws2 = XLSX.utils.aoa_to_sheet(summary);
      ws2['!cols'] = [{ wch: 28 }, { wch: 20 }];
      XLSX.utils.book_append_sheet(wb, ws2, 'Résumé');
    }

    // Feuille par statut
    const byStatus = Object.entries(STATUS_LABELS).map(([k, v]) => {
      const count = filtered.filter(r => r.status === k).length;
      return [v, count];
    }).filter(r => r[1] > 0);
    if (byStatus.length) {
      const ws3 = XLSX.utils.aoa_to_sheet([['Statut', 'Nombre'], ...byStatus]);
      ws3['!cols'] = [{ wch: 18 }, { wch: 12 }];
      XLSX.utils.book_append_sheet(wb, ws3, 'Par statut');
    }

    XLSX.writeFile(wb, `remine_export_${new Date().toISOString().split('T')[0]}.xlsx`);
    setDone({ count: filtered.length, format: 'Excel' });
  }, [filtered, activeCols, stats]);

  // ── Export PDF via impression ────────────────────────────────────────────────
  const exportPDF = useCallback(() => {
    const cols = activeCols;
    const rows = filtered.slice(0, 500);

    const SEV_BG = { critical:'#fee2e2', high:'#ffedd5', medium:'#fef9c3', low:'#dcfce7' };
    const SEV_TX = { critical:'#dc2626', high:'#ea580c', medium:'#a16207', low:'#16a34a' };
    const STA_BG = { new:'#fef9c3', verified:'#dbeafe', in_progress:'#ede9fe', resolved:'#dcfce7', rejected:'#fee2e2' };
    const STA_TX = { new:'#a16207', verified:'#1d4ed8', in_progress:'#5b21b6', resolved:'#16a34a', rejected:'#dc2626' };

    // ── Stats pour graphiques ──────────────────────────────────────────────────
    const byStatus   = Object.entries(STATUS_LABELS).map(([k,v]) => ({ k, v, n: rows.filter(r=>r.status===k).length })).filter(s=>s.n>0);
    const bySev      = Object.entries(SEV_LABELS).map(([k,v])    => ({ k, v, n: rows.filter(r=>r.severity===k).length })).filter(s=>s.n>0);
    const byType     = Object.entries(TYPE_LABELS).map(([k,v])   => ({ k, v, n: rows.filter(r=>r.type===k).length })).filter(s=>s.n>0).sort((a,b)=>b.n-a.n).slice(0,6);
    const maxStatus  = Math.max(...byStatus.map(s=>s.n), 1);
    const maxSev     = Math.max(...bySev.map(s=>s.n), 1);
    const maxType    = Math.max(...byType.map(s=>s.n), 1);
    const resolved   = rows.filter(r=>r.status==='resolved').length;
    const resPct     = rows.length ? Math.round(resolved/rows.length*100) : 0;
    const avgAI      = (() => { const a=rows.filter(r=>r.confidenceScore!=null); return a.length ? Math.round(a.reduce((s,r)=>s+(r.confidenceScore||0),0)/a.length) : null; })();
    const cities     = new Set(rows.map(r=>r.location?.city).filter(Boolean));
    const genDate    = new Date().toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
    const genTime    = new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});

    // ── Logo ReMine (base64 réel depuis assets) ───────────────────────────────
    const LOGO_IMG = `<img src="${LOGO_BASE64}" alt="ReMine" style="width:52px;height:52px;border-radius:12px;object-fit:contain;background:rgba(255,255,255,0.15);padding:4px"/>`;
    const LOGO = LOGO_IMG;

    // ── Barre SVG horizontale ─────────────────────────────────────────────────
    const bar = (n, max, color) => {
      const pct = Math.round(n/max*100);
      return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:5px">
        <div style="flex:1;height:10px;background:#f1f5f9;border-radius:99px;overflow:hidden">
          <div style="height:100%;background:${color};border-radius:99px;width:${pct}%;transition:width 0s"></div>
        </div>
        <span style="font-size:11px;font-weight:800;color:${color};min-width:24px;text-align:right">${n}</span>
      </div>`;
    };

    // ── Jauge circulaire SVG ──────────────────────────────────────────────────
    const gauge = (pct, color) => {
      const R = 28, circ = 2*Math.PI*R, dash = pct/100*circ;
      return `<svg width="72" height="72" viewBox="0 0 72 72">
        <circle cx="36" cy="36" r="${R}" fill="none" stroke="#e2e8f0" stroke-width="8"/>
        <circle cx="36" cy="36" r="${R}" fill="none" stroke="${color}" stroke-width="8"
          stroke-dasharray="${dash} ${circ-dash}" stroke-linecap="round" transform="rotate(-90 36 36)"/>
        <text x="36" y="40" text-anchor="middle" style="font-size:13px;font-weight:900;fill:${color};font-family:Arial">${pct}%</text>
      </svg>`;
    };

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8"/>
<title>ReMine — Rapport d'export</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size:10px; color:#1e293b; background:#fff; }
  @page { size: A4 landscape; margin: 10mm 12mm; }
  @media print { .no-print { display:none!important; } body { -webkit-print-color-adjust:exact; print-color-adjust:exact; } }

  /* ── Page de garde ── */
  .cover { min-height:100vh; display:flex; flex-direction:column; page-break-after:always; }
  .cover-header { background:linear-gradient(135deg,#064e3b 0%,#10b981 60%,#34d399 100%); padding:40px 48px 32px; color:#fff; flex-shrink:0; position:relative; overflow:hidden; }
  .cover-header::before { content:''; position:absolute; top:-60px; right:-60px; width:200px; height:200px; background:rgba(255,255,255,0.05); border-radius:50%; }
  .cover-header::after  { content:''; position:absolute; bottom:-40px; left:200px; width:120px; height:120px; background:rgba(255,255,255,0.04); border-radius:50%; }
  .cover-logo { display:flex; align-items:center; gap:16px; margin-bottom:32px; }
  .cover-logo-name { font-size:32px; font-weight:900; letter-spacing:-0.5px; }
  .cover-logo-sub  { font-size:13px; opacity:0.85; margin-top:2px; letter-spacing:0.5px; }
  .cover-title  { font-size:22px; font-weight:800; margin-bottom:8px; }
  .cover-sub    { font-size:13px; opacity:0.8; }
  .cover-meta   { font-size:11px; opacity:0.75; margin-top:24px; display:flex; gap:24px; }
  .cover-meta span { background:rgba(255,255,255,0.15); padding:4px 12px; border-radius:99px; }

  .cover-body { flex:1; padding:32px 48px; display:grid; grid-template-columns:1fr 1fr; gap:24px; }
  .cover-section { background:#f8fafc; border-radius:16px; padding:20px 24px; border:1px solid #e2e8f0; }
  .cover-section h3 { font-size:11px; font-weight:800; color:#64748b; text-transform:uppercase; letter-spacing:1px; margin-bottom:14px; }

  /* ── KPIs ── */
  .kpis { display:grid; grid-template-columns:repeat(5,1fr); gap:10px; margin-bottom:14px; }
  .kpi  { background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:10px; text-align:center; }
  .kpi-val  { font-size:22px; font-weight:900; color:#0f172a; line-height:1; }
  .kpi-lbl  { font-size:8px; color:#94a3b8; margin-top:3px; text-transform:uppercase; letter-spacing:0.5px; }
  .kpi-trend { font-size:9px; font-weight:700; margin-top:3px; }

  /* ── Table ── */
  .section-title { font-size:12px; font-weight:800; color:#0f172a; margin:14px 0 8px; display:flex; align-items:center; gap:8px; border-bottom:2px solid #10b981; padding-bottom:6px; }
  table { width:100%; border-collapse:collapse; }
  th { background:#0f172a; color:#fff; padding:8px 9px; text-align:left; font-size:8.5px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; }
  th:first-child { border-radius:6px 0 0 0; }
  th:last-child  { border-radius:0 6px 0 0; }
  td { padding:6px 9px; border-bottom:1px solid #f1f5f9; font-size:9.5px; vertical-align:middle; max-width:150px; word-break:break-word; }
  tr:nth-child(even) td { background:#f8fafc; }
  tr:hover td { background:#ecfdf5; }
  .badge { display:inline-flex; align-items:center; padding:2px 7px; border-radius:99px; font-size:8px; font-weight:800; }

  /* ── Graphiques ── */
  .charts { display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px; margin-bottom:14px; }
  .chart  { background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:14px 16px; }
  .chart h4 { font-size:10px; font-weight:800; color:#374151; margin-bottom:12px; text-transform:uppercase; letter-spacing:0.5px; }
  .chart-row { display:flex; align-items:center; gap:8px; margin-bottom:6px; }
  .chart-label { font-size:9px; color:#64748b; width:80px; flex-shrink:0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .chart-bar   { flex:1; height:10px; background:#e2e8f0; border-radius:99px; overflow:hidden; }
  .chart-fill  { height:100%; border-radius:99px; }
  .chart-val   { font-size:10px; font-weight:800; min-width:20px; text-align:right; }

  /* ── Footer ── */
  .footer { margin-top:14px; padding-top:8px; border-top:2px solid #f1f5f9; display:flex; justify-content:space-between; align-items:center; color:#94a3b8; font-size:8.5px; }
  .footer-brand { display:flex; align-items:center; gap:6px; }
  .footer-dot { width:6px; height:6px; border-radius:50%; background:#10b981; }

  .print-btn { position:fixed; top:20px; right:20px; z-index:999; padding:12px 24px; background:linear-gradient(135deg,#10b981,#059669); color:#fff; border:none; border-radius:10px; font-size:14px; font-weight:700; cursor:pointer; box-shadow:0 6px 20px rgba(16,185,129,0.4); display:flex; align-items:center; gap:8px; }
</style>
</head>
<body>
<button class="print-btn no-print" onclick="window.print()">🖨️ Imprimer / PDF</button>

<!-- ══ PAGE DE GARDE ═══════════════════════════════════════════════════════ -->
<div class="cover">
  <div class="cover-header">
    <div class="cover-logo">
      ${LOGO}
      <div>
        <div class="cover-logo-name">ReMine</div>
        <div class="cover-logo-sub">CITIZEN TRACK</div>
      </div>
    </div>
    <div class="cover-title">Rapport d'export — Signalements environnementaux</div>
    <div class="cover-sub">Surveillance et traçabilité des impacts miniers au Sénégal</div>
    <div class="cover-meta">
      <span>📅 Généré le ${genDate} à ${genTime}</span>
      <span>📊 ${rows.length} signalement${rows.length>1?'s':''} exporté${rows.length>1?'s':''}</span>
      ${filterStatus !== 'all' ? `<span>🔍 Statut : ${STATUS_LABELS[filterStatus]}</span>` : ''}
      ${filterSeverity !== 'all' ? `<span>⚠️ Sévérité : ${SEV_LABELS[filterSeverity]}</span>` : ''}
    </div>
  </div>

  <div class="cover-body">
    <!-- Vue d'ensemble -->
    <div class="cover-section">
      <h3>📊 Vue d'ensemble</h3>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        ${[
          { label:'Total signalements', val:rows.length,               color:'#3b82f6' },
          { label:'Résolus',            val:resolved,                   color:'#10b981' },
          { label:'Critiques',          val:rows.filter(r=>r.severity==='critical').length, color:'#dc2626' },
          { label:'Villes couvertes',   val:cities.size,                color:'#8b5cf6' },
        ].map(k=>`
          <div style="background:white;border-radius:10px;padding:12px;border:1px solid #e2e8f0;text-align:center">
            <div style="font-size:26px;font-weight:900;color:${k.color}">${k.val}</div>
            <div style="font-size:9px;color:#94a3b8;margin-top:3px;text-transform:uppercase;letter-spacing:0.5px">${k.label}</div>
          </div>`).join('')}
      </div>
      <div style="margin-top:14px;display:flex;align-items:center;gap:16px;background:white;border-radius:10px;padding:12px;border:1px solid #e2e8f0">
        ${gauge(resPct, resPct>=70?'#10b981':resPct>=40?'#f59e0b':'#ef4444')}
        <div>
          <div style="font-size:13px;font-weight:800;color:#0f172a">Taux de résolution</div>
          <div style="font-size:11px;color:#64748b;margin-top:3px">${resolved} sur ${rows.length} signalement${rows.length>1?'s':''}</div>
          ${avgAI != null ? `<div style="font-size:11px;color:#8b5cf6;margin-top:5px;font-weight:700">Score IA moyen : ${avgAI}%</div>` : ''}
        </div>
      </div>
    </div>

    <!-- Répartition -->
    <div class="cover-section">
      <h3>📍 Répartition géographique</h3>
      ${Array.from(cities).slice(0,8).map(city => {
        const n = rows.filter(r=>r.location?.city===city).length;
        const pct = Math.round(n/rows.length*100);
        return `<div class="chart-row">
          <span class="chart-label">${city}</span>
          <div class="chart-bar"><div class="chart-fill" style="width:${pct}%;background:linear-gradient(90deg,#10b981,#34d399)"></div></div>
          <span class="chart-val" style="color:#10b981">${n}</span>
        </div>`;
      }).join('')}
    </div>

    <!-- Par statut -->
    <div class="cover-section">
      <h3>🔄 Par statut</h3>
      ${byStatus.map(s => `<div class="chart-row">
        <span class="chart-label">${s.v}</span>
        <div class="chart-bar"><div class="chart-fill" style="width:${Math.round(s.n/maxStatus*100)}%;background:${STA_TX[s.k]||'#6b7280'}"></div></div>
        <span class="chart-val" style="color:${STA_TX[s.k]||'#6b7280'}">${s.n}</span>
      </div>`).join('')}
    </div>

    <!-- Par sévérité -->
    <div class="cover-section">
      <h3>⚠️ Par sévérité</h3>
      ${bySev.map(s => `<div class="chart-row">
        <span class="chart-label">${s.v}</span>
        <div class="chart-bar"><div class="chart-fill" style="width:${Math.round(s.n/maxSev*100)}%;background:${SEV_TX[s.k]||'#6b7280'}"></div></div>
        <span class="chart-val" style="color:${SEV_TX[s.k]||'#6b7280'}">${s.n}</span>
      </div>`).join('')}

      <div style="margin-top:12px;padding-top:10px;border-top:1px solid #e2e8f0">
        <h3 style="margin-bottom:10px">🏭 Top types</h3>
        ${byType.slice(0,4).map(s => `<div class="chart-row">
          <span class="chart-label">${s.v}</span>
          <div class="chart-bar"><div class="chart-fill" style="width:${Math.round(s.n/maxType*100)}%;background:#8b5cf6"></div></div>
          <span class="chart-val" style="color:#8b5cf6">${s.n}</span>
        </div>`).join('')}
      </div>
    </div>
  </div>
</div>

<!-- ══ PAGE DONNÉES ════════════════════════════════════════════════════════ -->
<div style="padding:0 4px">
  <!-- Header répété -->
  <div style="background:linear-gradient(135deg,#064e3b,#10b981);color:#fff;padding:10px 16px;border-radius:10px;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center">
    <div style="display:flex;align-items:center;gap:10px">
      <img src="${LOGO_BASE64}" alt="ReMine" style="width:36px;height:36px;border-radius:10px;object-fit:contain;background:rgba(255,255,255,0.15);padding:3px"/>
      <div>
        <span style="font-size:14px;font-weight:900">ReMine</span>
        <span style="font-size:11px;opacity:0.8;margin-left:8px">Citizen Track</span>
      </div>
    </div>
    <div style="font-size:10px;opacity:0.85;text-align:right">
      <div>Rapport généré le ${genDate}</div>
      <div>${rows.length} signalement${rows.length>1?'s':''} · ${cols.length} colonne${cols.length>1?'s':''}</div>
    </div>
  </div>

  <!-- KPIs mini -->
  <div class="kpis">
    ${[
      { label:'Total',     val:rows.length,      color:'#3b82f6' },
      { label:'Résolus',   val:resolved,          color:'#10b981' },
      { label:'Critiques', val:rows.filter(r=>r.severity==='critical').length, color:'#dc2626' },
      { label:'Score IA',  val:avgAI!=null?avgAI+'%':'—', color:'#8b5cf6' },
      { label:'Villes',    val:cities.size,       color:'#f59e0b' },
    ].map(k=>`<div class="kpi">
      <div class="kpi-val" style="color:${k.color}">${k.val}</div>
      <div class="kpi-lbl">${k.label}</div>
    </div>`).join('')}
  </div>

  <!-- Tableau -->
  <div class="section-title">
    <span style="width:20px;height:20px;background:#10b981;border-radius:6px;display:inline-flex;align-items:center;justify-content:center;font-size:11px">📋</span>
    Détail des signalements
  </div>
  <table>
    <thead><tr>${cols.map(c=>`<th>${c.label}</th>`).join('')}</tr></thead>
    <tbody>
      ${rows.map((r,i) => {
        const sev=r.severity, sta=r.status;
        return `<tr>${cols.map(c => {
          let val = getCell(r, c.id);
          if (c.id==='severity') val=`<span class="badge" style="background:${SEV_BG[sev]||'#f8fafc'};color:${SEV_TX[sev]||'#64748b'}">${val}</span>`;
          if (c.id==='status')   val=`<span class="badge" style="background:${STA_BG[sta]||'#f8fafc'};color:${STA_TX[sta]||'#64748b'}">${val}</span>`;
          return `<td>${val}</td>`;
        }).join('')}</tr>`;
      }).join('')}
    </tbody>
  </table>

  <!-- Footer -->
  <div class="footer">
    <div class="footer-brand">
      <div class="footer-dot"></div>
      <strong>ReMine Citizen Track</strong>
      <span>— Surveillance environnementale minière au Sénégal</span>
    </div>
    <span>Document confidentiel · Usage administratif · ${genDate}</span>
    <span>Page 2 / 2</span>
  </div>
</div>
</body></html>`;

    const w = window.open('', '_blank', 'width=1300,height=900');
    w.document.write(html);
    w.document.close();
    setDone({ count: rows.length, format: 'PDF' });
  }, [filtered, activeCols, filterStatus, filterSeverity]);

  // ── Action principale ────────────────────────────────────────────────────────
  const handleExport = useCallback(async () => {
    setExporting(true);
    setDone(null);
    try {
      if (format === 'csv')  exportCSV();
      if (format === 'xlsx') exportXLSX();
      if (format === 'pdf')  exportPDF();
    } finally {
      setExporting(false);
    }
  }, [format, exportCSV, exportXLSX, exportPDF]);

  const toggleCol = id => setSelectedCols(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const cardBg     = dm ? '#1e293b' : '#fff';
  const cardBorder = dm ? '#334155' : '#f1f5f9';
  const textPri    = dm ? '#f1f5f9' : '#0f172a';
  const textSec    = dm ? '#94a3b8' : '#6b7280';
  const textMut    = dm ? '#64748b' : '#9ca3af';
  const bgMut      = dm ? '#0f172a' : '#f8fafc';

  return (
    <div style={{ position:'fixed', top:0, left:0, right:0, bottom:0, zIndex:99999, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.55)', backdropFilter:'blur(6px)', padding:'20px' }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background:cardBg, borderRadius:24, width:'min(860px,95vw)', maxHeight:'90vh', display:'flex', flexDirection:'column', boxShadow:'0 32px 80px rgba(0,0,0,0.3)', border:`1px solid ${cardBorder}`, overflow:'hidden', animation:'remine-scale-in 0.2s both', margin:'auto', position:'relative' }}>

        {/* ── En-tête ── */}
        <div style={{ padding:'20px 28px', borderBottom:`1px solid ${cardBorder}`, display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
          <div>
            <h2 style={{ fontSize:18, fontWeight:900, color:textPri, margin:0, display:'flex', alignItems:'center', gap:10 }}>
              <span style={{ width:38, height:38, background:'linear-gradient(135deg,#10b981,#059669)', borderRadius:12, display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>📤</span>
              Export des données
            </h2>
            <p style={{ fontSize:12, color:textSec, margin:'4px 0 0' }}>
              <span style={{ fontWeight:700, color:'#10b981' }}>{filtered.length}</span> signalement{filtered.length > 1 ? 's' : ''} sélectionné{filtered.length > 1 ? 's' : ''} sur {allReports.length} total
            </p>
          </div>
          <button onClick={onClose} style={{ width:36, height:36, borderRadius:'50%', background:dm?'#334155':'#f1f5f9', border:'none', cursor:'pointer', color:textSec, fontSize:18, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700 }}>✕</button>
        </div>

        {/* ── Format selector ── */}
        <div style={{ padding:'16px 28px', borderBottom:`1px solid ${cardBorder}`, display:'flex', gap:10, flexShrink:0 }}>
          {[
            { id:'csv',  icon:'📊', label:'CSV',          sub:'Compatible Excel / Google Sheets', color:'#10b981' },
            { id:'xlsx', icon:'📗', label:'Excel XLSX',    sub:'Feuilles multiples + mise en forme', color:'#16a34a' },
            { id:'pdf',  icon:'📄', label:'PDF / Impression', sub:'Rapport mis en page A4 paysage', color:'#3b82f6' },
          ].map(f => (
            <button key={f.id} onClick={() => setFormat(f.id)} style={{ flex:1, padding:'12px 14px', borderRadius:14, border:`2px solid ${format===f.id ? f.color : (dm?'#334155':'#e2e8f0')}`, background:format===f.id?(dm?`${f.color}15`:`${f.color}10`):'transparent', cursor:'pointer', textAlign:'left', transition:'all 0.15s' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                <span style={{ fontSize:20 }}>{f.icon}</span>
                <span style={{ fontSize:13, fontWeight:800, color:format===f.id?f.color:textPri }}>{f.label}</span>
              </div>
              <p style={{ fontSize:10, color:textSec, margin:0 }}>{f.sub}</p>
            </button>
          ))}
        </div>

        {/* ── Onglets config ── */}
        <div style={{ display:'flex', gap:2, padding:'10px 28px 0', background:cardBg, flexShrink:0 }}>
          {[{id:'filters',label:'🔍 Filtres'},{id:'columns',label:'📋 Colonnes'},{id:'preview',label:'👁️ Aperçu'}].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ padding:'7px 16px', borderRadius:'8px 8px 0 0', border:`1px solid ${dm?'#334155':'#e2e8f0'}`, borderBottom:`2px solid ${tab===t.id?cardBg:(dm?'#334155':'#e2e8f0')}`, background:tab===t.id?cardBg:(dm?'#0f172a':'#f8fafc'), color:tab===t.id?textPri:textSec, fontSize:12, fontWeight:tab===t.id?700:500, cursor:'pointer', marginBottom:tab===t.id?-1:0, transition:'all 0.15s' }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Corps ── */}
        <div style={{ flex:1, overflowY:'auto', padding:'20px 28px' }}>

          {/* FILTRES */}
          {tab === 'filters' && (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:14 }}>
              {[
                { label:'Statut', value:filterStatus, set:setFilterStatus, options:[{v:'all',l:'Tous les statuts'},...Object.entries(STATUS_LABELS).map(([v,l])=>({v,l}))] },
                { label:'Sévérité', value:filterSeverity, set:setFilterSeverity, options:[{v:'all',l:'Toutes les sévérités'},...Object.entries(SEV_LABELS).map(([v,l])=>({v,l}))] },
                { label:'Type', value:filterType, set:setFilterType, options:[{v:'all',l:'Tous les types'},...Object.entries(TYPE_LABELS).map(([v,l])=>({v,l}))] },
              ].map(f => (
                <div key={f.label}>
                  <p style={{ fontSize:11, fontWeight:700, color:textSec, margin:'0 0 6px', textTransform:'uppercase', letterSpacing:0.7 }}>{f.label}</p>
                  <select value={f.value} onChange={e=>f.set(e.target.value)} style={{ width:'100%', padding:'8px 10px', borderRadius:10, border:`1px solid ${cardBorder}`, background:bgMut, color:textPri, fontSize:12, outline:'none', fontFamily:'inherit', cursor:'pointer' }}>
                    {f.options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                  </select>
                </div>
              ))}
              <div>
                <p style={{ fontSize:11, fontWeight:700, color:textSec, margin:'0 0 6px', textTransform:'uppercase', letterSpacing:0.7 }}>Date début</p>
                <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} style={{ width:'100%', padding:'8px 10px', borderRadius:10, border:`1px solid ${cardBorder}`, background:bgMut, color:textPri, fontSize:12, outline:'none', fontFamily:'inherit' }} />
              </div>
              <div>
                <p style={{ fontSize:11, fontWeight:700, color:textSec, margin:'0 0 6px', textTransform:'uppercase', letterSpacing:0.7 }}>Date fin</p>
                <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} style={{ width:'100%', padding:'8px 10px', borderRadius:10, border:`1px solid ${cardBorder}`, background:bgMut, color:textPri, fontSize:12, outline:'none', fontFamily:'inherit' }} />
              </div>
              <div style={{ display:'flex', flexDirection:'column', justifyContent:'flex-end' }}>
                <button onClick={() => { setFilterStatus('all'); setFilterSeverity('all'); setFilterType('all'); setDateFrom(''); setDateTo(''); }} style={{ padding:'8px 12px', borderRadius:10, border:`1px solid ${cardBorder}`, background:'transparent', color:textSec, fontSize:12, fontWeight:600, cursor:'pointer' }}>
                  ↺ Réinitialiser les filtres
                </button>
              </div>

              {/* Résumé filtres */}
              <div style={{ gridColumn:'1/-1', background:bgMut, borderRadius:12, padding:'12px 16px', border:`1px solid ${cardBorder}` }}>
                <p style={{ fontSize:11, fontWeight:700, color:textSec, margin:'0 0 10px', textTransform:'uppercase', letterSpacing:0.7 }}>Résumé de la sélection</p>
                <div style={{ display:'flex', gap:20, flexWrap:'wrap' }}>
                  {[
                    { label:'Sélectionnés',  val:filtered.length,                                              color:'#10b981' },
                    { label:'Résolus',        val:filtered.filter(r=>r.status==='resolved').length,            color:'#3b82f6' },
                    { label:'Critiques',      val:filtered.filter(r=>r.severity==='critical').length,          color:'#ef4444' },
                    { label:'Avec coords',    val:filtered.filter(r=>r.location?.latitude).length,             color:'#f59e0b' },
                    { label:'Villes',         val:new Set(filtered.map(r=>r.location?.city).filter(Boolean)).size, color:'#8b5cf6' },
                  ].map(s => (
                    <div key={s.label} style={{ textAlign:'center' }}>
                      <p style={{ fontSize:20, fontWeight:900, color:s.color, margin:0, fontVariantNumeric:'tabular-nums' }}>{s.val}</p>
                      <p style={{ fontSize:10, color:textMut, margin:'2px 0 0' }}>{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* COLONNES */}
          {tab === 'columns' && (
            <div>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:14 }}>
                <p style={{ fontSize:12, color:textSec, margin:0 }}><span style={{ fontWeight:700, color:'#10b981' }}>{selectedCols.size}</span> colonne{selectedCols.size > 1?'s':''} sélectionnée{selectedCols.size > 1?'s':''}</p>
                <div style={{ display:'flex', gap:8 }}>
                  <button onClick={() => setSelectedCols(new Set(COLUMNS.map(c=>c.id)))} style={{ fontSize:11, fontWeight:600, color:'#10b981', background:'none', border:'none', cursor:'pointer' }}>Tout sélectionner</button>
                  <button onClick={() => setSelectedCols(new Set(COLUMNS.filter(c=>c.default).map(c=>c.id)))} style={{ fontSize:11, fontWeight:600, color:textSec, background:'none', border:'none', cursor:'pointer' }}>Par défaut</button>
                  <button onClick={() => setSelectedCols(new Set())} style={{ fontSize:11, fontWeight:600, color:'#ef4444', background:'none', border:'none', cursor:'pointer' }}>Tout effacer</button>
                </div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
                {COLUMNS.map(col => (
                  <button key={col.id} onClick={() => toggleCol(col.id)} style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 12px', borderRadius:10, border:`1.5px solid ${selectedCols.has(col.id)?(dm?'rgba(16,185,129,0.5)':'#10b981'):(dm?'#334155':'#e2e8f0')}`, background:selectedCols.has(col.id)?(dm?'rgba(16,185,129,0.08)':'#ecfdf5'):'transparent', cursor:'pointer', textAlign:'left', transition:'all 0.15s' }}>
                    <span style={{ width:16, height:16, borderRadius:4, border:`2px solid ${selectedCols.has(col.id)?'#10b981':(dm?'#475569':'#cbd5e1')}`, background:selectedCols.has(col.id)?'#10b981':'transparent', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'all 0.15s' }}>
                      {selectedCols.has(col.id) && <span style={{ fontSize:10, color:'#fff', fontWeight:900 }}>✓</span>}
                    </span>
                    <span style={{ fontSize:12, fontWeight:selectedCols.has(col.id)?700:500, color:selectedCols.has(col.id)?(dm?'#34d399':'#059669'):textPri }}>{col.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* APERÇU */}
          {tab === 'preview' && (
            <div style={{ overflowX:'auto' }}>
              {filtered.length === 0 ? (
                <div style={{ textAlign:'center', padding:'40px', color:textMut }}>
                  <div style={{ fontSize:32, marginBottom:8 }}>🔍</div>
                  <p style={{ fontSize:13 }}>Aucun signalement avec ces filtres</p>
                </div>
              ) : (
                <>
                  <p style={{ fontSize:11, color:textMut, margin:'0 0 10px' }}>Aperçu des {Math.min(5, filtered.length)} premières lignes</p>
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
                    <thead>
                      <tr>
                        {activeCols.map(c => <th key={c.id} style={{ background:dm?'#0f172a':'#f8fafc', padding:'7px 10px', textAlign:'left', fontWeight:700, color:textSec, fontSize:10, textTransform:'uppercase', letterSpacing:0.5, borderBottom:`2px solid ${dm?'#334155':'#e2e8f0'}`, whiteSpace:'nowrap' }}>{c.label}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.slice(0, 5).map((r, i) => (
                        <tr key={i}>
                          {activeCols.map(c => {
                            const val = getCell(r, c.id);
                            const color = c.id==='severity'?({critical:'#dc2626',high:'#f97316',medium:'#f59e0b',low:'#22c55e'}[r.severity]||textPri):textPri;
                            return <td key={c.id} style={{ padding:'7px 10px', borderBottom:`1px solid ${dm?'#1e293b':'#f8fafc'}`, color:c.id==='severity'?color:textPri, fontWeight:c.id==='severity'?700:400, maxWidth:120, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{val}</td>;
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filtered.length > 5 && <p style={{ fontSize:10, color:textMut, marginTop:8, textAlign:'center' }}>… et {filtered.length - 5} ligne{filtered.length-5>1?'s':''} supplémentaire{filtered.length-5>1?'s':''}</p>}
                </>
              )}
            </div>
          )}
        </div>

        {/* ── Pied — bouton export ── */}
        <div style={{ padding:'16px 28px', borderTop:`1px solid ${cardBorder}`, display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
          {done ? (
            <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 16px', borderRadius:10, background:'#dcfce7', border:'1px solid #bbf7d0' }}>
              <span style={{ fontSize:16 }}>✅</span>
              <span style={{ fontSize:12, fontWeight:700, color:'#16a34a' }}>{done.count} signalement{done.count>1?'s':''} exporté{done.count>1?'s':''} en {done.format}</span>
            </div>
          ) : (
            <p style={{ fontSize:12, color:textSec, margin:0 }}>
              Format sélectionné : <strong style={{ color:textPri }}>{format.toUpperCase()}</strong> · {selectedCols.size} colonne{selectedCols.size>1?'s':''}
            </p>
          )}
          <div style={{ display:'flex', gap:10 }}>
            <button onClick={onClose} style={{ padding:'10px 18px', borderRadius:12, border:`1px solid ${cardBorder}`, background:'transparent', color:textSec, fontSize:13, fontWeight:600, cursor:'pointer' }}>
              Annuler
            </button>
            <button onClick={handleExport} disabled={exporting || filtered.length === 0 || selectedCols.size === 0} style={{ padding:'10px 22px', borderRadius:12, border:'none', background: filtered.length === 0 || selectedCols.size === 0 ? '#d1d5db' : 'linear-gradient(135deg,#10b981,#059669)', color:'#fff', fontSize:13, fontWeight:700, cursor: filtered.length === 0 || selectedCols.size === 0 ? 'not-allowed' : 'pointer', boxShadow: filtered.length === 0 || selectedCols.size === 0 ? 'none' : '0 4px 14px rgba(16,185,129,0.35)', display:'flex', alignItems:'center', gap:8, transition:'all 0.15s' }}>
              {exporting ? (
                <><span style={{ width:14, height:14, border:'2px solid rgba(255,255,255,0.5)', borderTopColor:'#fff', borderRadius:'50%', animation:'remine-spin 0.7s linear infinite', display:'inline-block' }} /> Export en cours…</>
              ) : (
                <><span>📤</span> Exporter {filtered.length} signalement{filtered.length>1?'s':''}</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
// components/ValorizationProjects.jsx — Version complète avec CRUD, filtres, édition, CO₂
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { dashboardAPI } from '../services/api';

// ─── Constantes ───────────────────────────────────────────────────────────────
const EUR_TO_FCFA = 655.957;

const fmt = (n, unit = '') => {
  if (n === undefined || n === null) return `0${unit}`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M${unit}`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}k${unit}`;
  return `${Number(n).toLocaleString('fr-FR')}${unit}`;
};
const fmtFCFA = (eur) => fmt(Math.round((eur || 0) * EUR_TO_FCFA), ' FCFA');
const fmtDate = (d)   => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const STATUS_CFG = {
  planning:  { label: 'En planification', color: '#2563eb', bg: '#dbeafe', icon: '📋' },
  active:    { label: 'Actif',            color: '#16a34a', bg: '#dcfce7', icon: '✅' },
  paused:    { label: 'En pause',         color: '#d97706', bg: '#fef3c7', icon: '⏸️' },
  completed: { label: 'Terminé',          color: '#7c3aed', bg: '#ede9fe', icon: '🏆' },
};

const CAT_CFG = {
  recyclage:    { label: 'Recyclage',         icon: '♻️',  color: '#059669' },
  depollution:  { label: 'Dépollution',       icon: '💧',  color: '#2563eb' },
  energie:      { label: 'Énergie',           icon: '⚡',  color: '#f59e0b' },
  construction: { label: 'Construction',      icon: '🏗️', color: '#6b7280' },
  agriculture:  { label: 'Agriculture',       icon: '🌱',  color: '#16a34a' },
  autre:        { label: 'Autre',             icon: '🔧',  color: '#9ca3af' },
};

const EMPTY_FORM = {
  name: '', description: '', location: '', status: 'planning', category: 'autre',
  wasteProcessed: '', productsCreated: '', revenue: '', co2Avoided: '',
  targetWaste: '', targetRevenue: '', teamSize: 1,
  startDate: new Date().toISOString().split('T')[0], endDate: '',
  partners: '', tags: '', notes: '',
};

const getProgress = (p) => {
  if (p.status === 'completed') return 100;
  if (p.status === 'planning')  return 5;
  if (p.targetWaste && p.wasteProcessed) return Math.min(99, Math.round((p.wasteProcessed / p.targetWaste) * 100));
  if (p.wasteProcessed) return Math.min(90, Math.round((p.wasteProcessed / 1500) * 100));
  return 10;
};

// ─── Formulaire projet ────────────────────────────────────────────────────────
function ProjectForm({ initial = EMPTY_FORM, onSave, onCancel, saving }) {
  const [form, setForm] = useState(initial);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = () => {
    if (!form.name.trim()) return;
    const payload = {
      ...form,
      wasteProcessed:  parseFloat(form.wasteProcessed)  || 0,
      productsCreated: parseInt(form.productsCreated)   || 0,
      revenue:         parseFloat(form.revenue)          || 0,
      co2Avoided:      parseFloat(form.co2Avoided)       || 0,
      targetWaste:     parseFloat(form.targetWaste)      || 0,
      targetRevenue:   parseFloat(form.targetRevenue)    || 0,
      teamSize:        parseInt(form.teamSize)            || 1,
      partners: typeof form.partners === 'string' ? form.partners.split(',').map(s => s.trim()).filter(Boolean) : form.partners,
      tags:     typeof form.tags     === 'string' ? form.tags.split(',').map(s => s.trim()).filter(Boolean) : form.tags,
    };
    onSave(payload);
  };

  const Field = ({ k, label, type = 'text', placeholder = '', unit = '', span = false, required = false }) => (
    <div className={span ? 'md:col-span-2' : ''}>
      <label className="block text-xs font-semibold text-gray-500 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <div className="relative">
        {type === 'textarea' ? (
          <textarea value={form[k]} onChange={e => set(k, e.target.value)} rows={2}
                    placeholder={placeholder}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none resize-none" />
        ) : (
          <input type={type} value={form[k]} onChange={e => set(k, e.target.value)}
                 placeholder={placeholder} min={type === 'number' ? 0 : undefined}
                 className={`w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none ${unit ? 'pr-14' : ''}`} />
        )}
        {unit && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">{unit}</span>}
      </div>
    </div>
  );

  return (
    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 mb-6">
      <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
        {initial._id ? '✏️ Modifier le projet' : '➕ Nouveau projet de valorisation'}
      </h4>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        <Field k="name"        label="Nom du projet"      required placeholder="Ex: Recyclage béton minier" />
        <Field k="location"    label="Localisation"       placeholder="Ex: Site Nord, Kédougou" />
        <Field k="description" label="Description"        type="textarea" placeholder="Objectif du projet…" span />

        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Statut</label>
          <select value={form.status} onChange={e => set('status', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none">
            {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Catégorie</label>
          <select value={form.category} onChange={e => set('category', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none">
            {Object.entries(CAT_CFG).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
          </select>
        </div>

        <div className="md:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-3">
          <Field k="wasteProcessed"  label="Déchets traités"  type="number" unit="t"   placeholder="0" />
          <Field k="targetWaste"     label="Objectif déchets" type="number" unit="t"   placeholder="0" />
          <Field k="revenue"         label="Revenus (€)"      type="number" unit="€"   placeholder="0" />
          <Field k="co2Avoided"      label="CO₂ évité"        type="number" unit="t"   placeholder="0" />
        </div>

        <Field k="teamSize"      label="Taille équipe"   type="number" placeholder="1" />
        <Field k="productsCreated" label="Produits créés" type="number" placeholder="0" />
        <Field k="startDate"    label="Date de début"    type="date" />
        <Field k="endDate"      label="Date de fin"      type="date" />
        <Field k="partners"     label="Partenaires (séparés par virgule)" span placeholder="ONG, Mairie…" />
        <Field k="tags"         label="Tags (séparés par virgule)" span placeholder="minier, eau, béton…" />
        <Field k="notes"        label="Notes internes"   type="textarea" span placeholder="Observations, contacts…" />
      </div>

      <div className="flex gap-3">
        <button onClick={handleSubmit} disabled={!form.name.trim() || saving}
                className="px-5 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 disabled:opacity-50 transition-colors flex items-center gap-2">
          {saving ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Enregistrement…</> : '✅ Enregistrer'}
        </button>
        <button onClick={onCancel}
                className="px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-xl text-sm hover:bg-gray-50 transition-colors">
          Annuler
        </button>
      </div>
    </div>
  );
}

// ─── Carte projet ─────────────────────────────────────────────────────────────
function ProjectCard({ project, onEdit, onDelete, onSelect }) {
  const sta  = STATUS_CFG[project.status]  || STATUS_CFG.planning;
  const cat  = CAT_CFG[project.category]   || CAT_CFG.autre;
  const prog = getProgress(project);
  const [delConfirm, setDelConfirm] = useState(false);

  return (
    <div className="border border-gray-100 rounded-2xl p-5 hover:shadow-md transition-all bg-white flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xl flex-shrink-0">{cat.icon}</span>
          <div className="min-w-0">
            <h4 className="font-bold text-gray-900 text-sm leading-tight truncate">{project.name}</h4>
            {project.location && <p className="text-xs text-gray-400 truncate">📍 {project.location}</p>}
          </div>
        </div>
        <span className="flex-shrink-0 text-xs font-bold px-2.5 py-1 rounded-full"
              style={{ background: sta.bg, color: sta.color }}>
          {sta.icon} {sta.label}
        </span>
      </div>

      {project.description && (
        <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{project.description}</p>
      )}

      {/* Tags */}
      {project.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {project.tags.slice(0, 3).map(t => (
            <span key={t} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{t}</span>
          ))}
          {project.tags.length > 3 && <span className="text-xs text-gray-400">+{project.tags.length - 3}</span>}
        </div>
      )}

      {/* Progression */}
      <div>
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>Progression</span>
          <span className="font-bold" style={{ color: sta.color }}>{prog}%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2">
          <div className="h-2 rounded-full transition-all duration-700"
               style={{ width: `${prog}%`, background: sta.color }} />
        </div>
        {project.targetWaste > 0 && (
          <p className="text-xs text-gray-400 mt-0.5">
            {fmt(project.wasteProcessed, 't')} / {fmt(project.targetWaste, 't')} objectif
          </p>
        )}
      </div>

      {/* Métriques */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Déchets',   value: fmt(project.wasteProcessed, 't'), icon: '♻️' },
          { label: 'Revenus',   value: fmtFCFA(project.revenue),          icon: '💰' },
          { label: 'CO₂ évité', value: fmt(project.co2Avoided, 't'),      icon: '🌿' },
        ].map(m => (
          <div key={m.label} className="bg-gray-50 rounded-xl p-2 text-center">
            <div className="text-sm">{m.icon}</div>
            <div className="text-xs font-bold text-gray-800 mt-0.5 truncate">{m.value}</div>
            <div className="text-xs text-gray-400" style={{ fontSize: 9 }}>{m.label}</div>
          </div>
        ))}
      </div>

      {/* Équipe + date */}
      <div className="flex items-center justify-between text-xs text-gray-400 pt-1 border-t border-gray-50">
        <span>👥 {project.teamSize || 0} personnes</span>
        <span>📅 {fmtDate(project.startDate)}</span>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button onClick={() => onSelect(project)}
                className="flex-1 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors">
          📊 Détails
        </button>
        <button onClick={() => onEdit(project)}
                className="flex-1 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
          ✏️ Modifier
        </button>
        {delConfirm ? (
          <div className="flex gap-1">
            <button onClick={() => onDelete(project._id || project.id)}
                    className="py-1.5 px-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors">
              Oui
            </button>
            <button onClick={() => setDelConfirm(false)}
                    className="py-1.5 px-2 text-xs text-gray-500 bg-gray-100 rounded-lg">
              Non
            </button>
          </div>
        ) : (
          <button onClick={() => setDelConfirm(true)}
                  className="py-1.5 px-2.5 text-xs font-semibold text-red-500 hover:bg-red-50 rounded-lg transition-colors">
            🗑️
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Modal de détail complet ──────────────────────────────────────────────────
function ProjectDetailModal({ project, onClose, onEdit }) {
  if (!project) return null;
  const sta  = STATUS_CFG[project.status]  || STATUS_CFG.planning;
  const cat  = CAT_CFG[project.category]   || CAT_CFG.autre;
  const prog = getProgress(project);

  const metrics = [
    { label: 'Déchets traités',  value: fmt(project.wasteProcessed, ' t'),     icon: '♻️',  color: '#dbeafe', text: '#1d4ed8' },
    { label: 'Produits créés',   value: fmt(project.productsCreated),           icon: '📦',  color: '#ede9fe', text: '#6d28d9' },
    { label: 'Revenus générés',  value: fmtFCFA(project.revenue),               icon: '💰',  color: '#dcfce7', text: '#15803d' },
    { label: 'CO₂ évité',        value: fmt(project.co2Avoided, ' t'),          icon: '🌿',  color: '#d1fae5', text: '#065f46' },
    { label: 'Équipe',           value: `${project.teamSize || 0} pers.`,       icon: '👥',  color: '#fef3c7', text: '#92400e' },
    { label: 'Objectif déchets', value: fmt(project.targetWaste, ' t'),         icon: '🎯',  color: '#f3f4f6', text: '#374151' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm"
         onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
           onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="px-6 py-5 border-b flex items-start justify-between gap-3"
             style={{ background: `${sta.bg}80` }}>
          <div className="flex items-center gap-3">
            <span className="text-3xl">{cat.icon}</span>
            <div>
              <h3 className="font-bold text-gray-900 text-base">{project.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full"
                      style={{ background: sta.bg, color: sta.color }}>
                  {sta.icon} {sta.label}
                </span>
                <span className="text-xs text-gray-500">{cat.label}</span>
                {project.location && <span className="text-xs text-gray-400">📍 {project.location}</span>}
              </div>
            </div>
          </div>
          <button onClick={onClose}
                  className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 text-lg flex-shrink-0">
            ✕
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Description */}
          {project.description && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Description</p>
              <p className="text-sm text-gray-700 leading-relaxed">{project.description}</p>
            </div>
          )}

          {/* Progression */}
          <div>
            <div className="flex justify-between text-sm mb-1.5">
              <span className="font-semibold text-gray-700">Progression</span>
              <span className="font-bold" style={{ color: sta.color }}>{prog}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-3">
              <div className="h-3 rounded-full transition-all duration-700"
                   style={{ width: `${prog}%`, background: sta.color }} />
            </div>
          </div>

          {/* Métriques */}
          <div className="grid grid-cols-3 gap-2">
            {metrics.map(m => (
              <div key={m.label} className="rounded-xl p-3 text-center border border-gray-100"
                   style={{ background: m.color }}>
                <div className="text-xl mb-1">{m.icon}</div>
                <p className="text-sm font-black" style={{ color: m.text }}>{m.value}</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-tight">{m.label}</p>
              </div>
            ))}
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-400 font-semibold mb-0.5">Date de début</p>
              <p className="text-sm font-bold text-gray-800">{fmtDate(project.startDate)}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-400 font-semibold mb-0.5">Date de fin prévue</p>
              <p className="text-sm font-bold text-gray-800">{project.endDate ? fmtDate(project.endDate) : 'Non définie'}</p>
            </div>
          </div>

          {/* Partenaires */}
          {project.partners?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Partenaires</p>
              <div className="flex flex-wrap gap-2">
                {project.partners.map(p => (
                  <span key={p} className="text-xs bg-blue-50 text-blue-700 px-3 py-1 rounded-full border border-blue-100 font-medium">
                    🤝 {p}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          {project.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {project.tags.map(t => (
                <span key={t} className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full"># {t}</span>
              ))}
            </div>
          )}

          {/* Notes */}
          {project.notes && (
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
              <p className="text-xs font-semibold text-amber-700 mb-1">📝 Notes internes</p>
              <p className="text-sm text-amber-900">{project.notes}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button onClick={() => { onClose(); onEdit(project); }}
                    className="flex-1 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors">
              ✏️ Modifier
            </button>
            <button onClick={onClose}
                    className="flex-1 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────
export const ValorizationProjects = () => {
  const [projects, setProjects]     = useState([]);
  const [stats,    setStats]        = useState(null);
  const [loading,  setLoading]      = useState(false);
  const [saving,   setSaving]       = useState(false);
  const [detail,   setDetail]       = useState(null);
  const [editProj, setEditProj]     = useState(null);
  const [showForm, setShowForm]     = useState(false);
  const [search,   setSearch]       = useState('');
  const [filterSta,setFilterSta]    = useState('all');
  const [filterCat,setFilterCat]    = useState('all');
  const [view,     setView]         = useState('grid'); // grid | list

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await dashboardAPI.getValorizationProjects();
      if (res?.success) {
        setProjects(res.data || []);
        setStats(res.stats || null);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    return projects.filter(p => {
      if (filterSta !== 'all' && p.status   !== filterSta) return false;
      if (filterCat !== 'all' && p.category !== filterCat) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        if (![p.name, p.description, p.location].some(s => s?.toLowerCase().includes(q))) return false;
      }
      return true;
    });
  }, [projects, filterSta, filterCat, search]);

  const handleSave = async (data) => {
    setSaving(true);
    try {
      const res = editProj
        ? await dashboardAPI.updateValorizationProject(editProj._id || editProj.id, data)
        : await dashboardAPI.createValorizationProject(data);
      if (res?.success) {
        await load();
        setShowForm(false);
        setEditProj(null);
      }
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    const res = await dashboardAPI.deleteValorizationProject(id);
    if (res?.success) {
      setProjects(prev => prev.filter(p => (p._id || p.id) !== id));
      setStats(prev => prev ? { ...prev, total: prev.total - 1 } : null);
    }
  };

  const handleEdit = (p) => { setEditProj(p); setShowForm(true); setDetail(null); };

  const presentCats = useMemo(() => [...new Set(projects.map(p => p.category).filter(Boolean))], [projects]);

  return (
    <div className="space-y-5">

      {/* Modal détail */}
      {detail && <ProjectDetailModal project={detail} onClose={() => setDetail(null)} onEdit={handleEdit} />}

      {/* KPIs globaux */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'Projets actifs',    value: stats.active,                        icon: '✅', color: 'bg-green-50 text-green-700' },
            { label: 'Déchets traités',   value: fmt(stats.totalWaste, ' t'),          icon: '♻️', color: 'bg-blue-50 text-blue-700' },
            { label: 'Revenus générés',   value: fmtFCFA(stats.totalRevenue),          icon: '💰', color: 'bg-emerald-50 text-emerald-700' },
            { label: 'CO₂ évité',         value: fmt(stats.totalCO2, ' t'),            icon: '🌿', color: 'bg-teal-50 text-teal-700' },
            { label: 'Emplois créés',     value: stats.totalJobs,                     icon: '👥', color: 'bg-amber-50 text-amber-700' },
            { label: 'Produits créés',    value: fmt(stats.totalProducts),             icon: '📦', color: 'bg-purple-50 text-purple-700' },
          ].map(k => (
            <div key={k.label} className={`rounded-2xl border border-white p-4 text-center ${k.color} shadow-sm`}>
              <div className="text-2xl mb-1">{k.icon}</div>
              <p className="text-lg font-black">{k.value}</p>
              <p className="text-xs opacity-70 mt-0.5 leading-tight">{k.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Header + contrôles */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              🏭 Projets de Valorisation
              <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full text-sm">{projects.length}</span>
            </h3>
            <button onClick={load} disabled={loading}
                    className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
              <span className={loading ? 'inline-block animate-spin' : ''}>↻</span>
            </button>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex bg-gray-100 rounded-lg p-0.5">
              {(['grid', 'list']).map(v => (
                <button key={v} onClick={() => setView(v)}
                        className={`px-3 py-1.5 text-xs rounded-md transition-colors font-medium ${view === v ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}>
                  {v === 'grid' ? '⊞ Grille' : '≡ Liste'}
                </button>
              ))}
            </div>
            <button onClick={() => { setEditProj(null); setShowForm(!showForm); }}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-colors shadow-sm">
              ➕ Nouveau projet
            </button>
          </div>
        </div>

        {/* Filtres */}
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                   placeholder="Rechercher…"
                   className="w-full border border-gray-200 rounded-xl pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
          </div>

          <select value={filterSta} onChange={e => setFilterSta(e.target.value)}
                  className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white">
            <option value="all">Tous statuts</option>
            {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>

          <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
                  className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white">
            <option value="all">Toutes catégories</option>
            {presentCats.map(c => <option key={c} value={c}>{CAT_CFG[c]?.label || c}</option>)}
          </select>

          {(search || filterSta !== 'all' || filterCat !== 'all') && (
            <button onClick={() => { setSearch(''); setFilterSta('all'); setFilterCat('all'); }}
                    className="text-xs text-red-500 hover:text-red-700 font-semibold">
              ✕ Effacer
            </button>
          )}

          <span className="ml-auto text-xs text-gray-400">{filtered.length} projet{filtered.length > 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Formulaire */}
      {showForm && (
        <ProjectForm
          initial={editProj ? {
            ...editProj,
            startDate: editProj.startDate ? new Date(editProj.startDate).toISOString().split('T')[0] : '',
            endDate:   editProj.endDate   ? new Date(editProj.endDate).toISOString().split('T')[0]   : '',
            partners: Array.isArray(editProj.partners) ? editProj.partners.join(', ') : (editProj.partners || ''),
            tags:     Array.isArray(editProj.tags)     ? editProj.tags.join(', ')     : (editProj.tags || ''),
          } : EMPTY_FORM}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditProj(null); }}
          saving={saving}
        />
      )}

      {/* Contenu */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 flex items-center justify-center gap-3">
          <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-500 text-sm">Chargement des projets…</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <div className="text-5xl mb-3">🏗️</div>
          <p className="font-bold text-gray-600">
            {projects.length === 0 ? 'Aucun projet de valorisation' : 'Aucun résultat pour ces filtres'}
          </p>
          <p className="text-sm text-gray-400 mt-1">
            {projects.length === 0
              ? 'Créez votre premier projet avec le bouton "Nouveau projet"'
              : 'Essayez de modifier les filtres'}
          </p>
        </div>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(p => (
            <ProjectCard key={p._id || p.id} project={p}
                         onEdit={handleEdit}
                         onDelete={handleDelete}
                         onSelect={setDetail} />
          ))}
        </div>
      ) : (
        /* Vue liste */
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-50">
            <thead className="bg-gray-50">
              <tr>
                {['Projet', 'Statut', 'Déchets', 'Revenus', 'CO₂', 'Équipe', 'Progression', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(p => {
                const sta = STATUS_CFG[p.status] || STATUS_CFG.planning;
                const cat = CAT_CFG[p.category]  || CAT_CFG.autre;
                const prog = getProgress(p);
                return (
                  <tr key={p._id || p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span>{cat.icon}</span>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{p.name}</p>
                          {p.location && <p className="text-xs text-gray-400">{p.location}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-bold px-2 py-1 rounded-full" style={{ background: sta.bg, color: sta.color }}>
                        {sta.icon} {sta.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-700">{fmt(p.wasteProcessed, ' t')}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-emerald-700">{fmtFCFA(p.revenue)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{fmt(p.co2Avoided, ' t')}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{p.teamSize || 0}</td>
                    <td className="px-4 py-3 min-w-[120px]">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                          <div className="h-1.5 rounded-full" style={{ width: `${prog}%`, background: sta.color }} />
                        </div>
                        <span className="text-xs font-bold text-gray-500 w-7 text-right">{prog}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => setDetail(p)}
                                className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg text-xs">📊</button>
                        <button onClick={() => handleEdit(p)}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg text-xs">✏️</button>
                        <button onClick={() => handleDelete(p._id || p.id)}
                                className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg text-xs">🗑️</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
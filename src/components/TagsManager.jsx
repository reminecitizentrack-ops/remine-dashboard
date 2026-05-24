import { dashboardAPI } from '../services/api';
// components/TagsManager.jsx — Système de tags
import React, { useState, useEffect, useCallback } from 'react';



const TAG_COLORS = [
  'bg-blue-100 text-blue-700 border-blue-200',
  'bg-purple-100 text-purple-700 border-purple-200',
  'bg-amber-100 text-amber-700 border-amber-200',
  'bg-pink-100 text-pink-700 border-pink-200',
  'bg-teal-100 text-teal-700 border-teal-200',
  'bg-orange-100 text-orange-700 border-orange-200',
  'bg-indigo-100 text-indigo-700 border-indigo-200',
  'bg-red-100 text-red-700 border-red-200',
];

const getTagColor = (tag) => TAG_COLORS[tag.length % TAG_COLORS.length];

// Tag inline modifiable sur un signalement
export const TagEditor = ({ reportId, initialTags = [], onSaved }) => {
  const [tags, setTags]       = useState(initialTags);
  const [input, setInput]     = useState('');
  const [saving, setSaving]   = useState(false);
  const [editing, setEditing] = useState(false);

  const handleAdd = () => {
    const clean = input.trim().toLowerCase().replace(/\s+/g, '-');
    if (!clean || tags.includes(clean)) { setInput(''); return; }
    setTags(prev => [...prev, clean]);
    setInput('');
  };

  const handleRemove = (tag) => setTags(prev => prev.filter(t => t !== tag));

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = await dashboardAPI.updateReportTags(reportId, tags);
      if (data.success) { onSaved?.(tags); setEditing(false); }
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); handleAdd(); }
    if (e.key === 'Backspace' && !input && tags.length) {
      setTags(prev => prev.slice(0, -1));
    }
  };

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {tags.map(tag => (
          <span key={tag} className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getTagColor(tag)}`}>
            🏷️ {tag}
            {editing && (
              <button onClick={() => handleRemove(tag)} className="hover:opacity-60 ml-0.5 font-bold">×</button>
            )}
          </span>
        ))}
        {tags.length === 0 && !editing && (
          <span className="text-xs text-gray-300 italic">Aucun tag</span>
        )}
      </div>

      {editing && (
        <div className="flex gap-2 mb-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ajouter un tag (Entrée pour valider)"
            className="flex-1 text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-emerald-500 outline-none"
          />
          <button onClick={handleAdd} className="text-xs px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors">
            + Ajouter
          </button>
        </div>
      )}

      <div className="flex gap-2">
        {!editing ? (
          <button onClick={() => setEditing(true)} className="text-xs text-emerald-600 hover:text-emerald-700 font-medium">
            ✏️ Modifier les tags
          </button>
        ) : (
          <>
            <button onClick={handleSave} disabled={saving}
                    className="text-xs px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 font-medium transition-colors">
              {saving ? 'Enregistrement…' : '✅ Sauvegarder'}
            </button>
            <button onClick={() => { setEditing(false); setTags(initialTags); }}
                    className="text-xs px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 font-medium transition-colors">
              Annuler
            </button>
          </>
        )}
      </div>
    </div>
  );
};

// Vue globale des tags
export const TagsManager = ({ reports = [] }) => {
  const [globalTags, setGlobalTags]   = useState([]);
  const [selectedTag, setSelectedTag] = useState('');
  const [loading, setLoading]         = useState(true);

  const loadTags = useCallback(async () => {
    setLoading(true);
    try {
      const data = await dashboardAPI.getAllTags();
      if (data.success) setGlobalTags(data.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadTags(); }, []);

  const filteredReports = selectedTag
    ? reports.filter(r => (r.tags || []).includes(selectedTag))
    : reports.filter(r => (r.tags || []).length > 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center text-xl">🏷️</div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Système de tags</h2>
            <p className="text-xs text-gray-400">Étiquetez et filtrez les signalements par thématique</p>
          </div>
        </div>

        {/* Nuage de tags */}
        {loading ? (
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <div className="w-4 h-4 border-2 border-gray-200 border-t-orange-500 rounded-full animate-spin" />
            Chargement des tags…
          </div>
        ) : globalTags.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-2">🏷️</div>
            <p className="text-gray-500 font-medium">Aucun tag encore</p>
            <p className="text-gray-400 text-sm mt-1">Ajoutez des tags sur vos signalements depuis la page Signalements</p>
          </div>
        ) : (
          <>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              {globalTags.length} tag{globalTags.length > 1 ? 's' : ''} utilisé{globalTags.length > 1 ? 's' : ''}
            </p>
            <div className="flex flex-wrap gap-2 mb-4">
              <button onClick={() => setSelectedTag('')}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${!selectedTag ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                Tous ({reports.filter(r => (r.tags||[]).length > 0).length})
              </button>
              {globalTags.map(({ tag, count }) => (
                <button key={tag} onClick={() => setSelectedTag(tag === selectedTag ? '' : tag)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                          selectedTag === tag
                            ? 'bg-orange-500 text-white border-orange-500 shadow-sm'
                            : `${getTagColor(tag)} hover:opacity-80`
                        }`}
                        style={{ fontSize: Math.max(10, Math.min(14, 10 + count)) + 'px' }}>
                  🏷️ {tag}
                  <span className={`px-1.5 py-0.5 rounded-full text-xs ${selectedTag === tag ? 'bg-white bg-opacity-30' : 'bg-black bg-opacity-10'}`}>
                    {count}
                  </span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Signalements filtrés par tag */}
      {(selectedTag || filteredReports.length > 0) && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">
              {selectedTag ? `Signalements avec #${selectedTag}` : 'Signalements avec tags'}
              <span className="ml-2 text-sm font-normal text-gray-400">({filteredReports.length})</span>
            </h3>
            {selectedTag && (
              <button onClick={() => setSelectedTag('')} className="text-xs text-gray-400 hover:text-gray-600">
                Effacer le filtre ×
              </button>
            )}
          </div>

          {filteredReports.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <div className="text-3xl mb-2">📭</div>
              <p className="text-sm">Aucun signalement avec ce tag</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {filteredReports.map(r => (
                <div key={r._id || r.id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors">
                  <div className="w-9 h-9 bg-gray-100 rounded-xl flex items-center justify-center text-lg flex-shrink-0">
                    {({ water_pollution:'💧', air_pollution:'💨', waste_deposit:'🗑️', soil_contamination:'🟤', dust:'🌫️', noise_pollution:'🔊' })[r.type] || '⚠️'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 capitalize truncate">
                      {(r.type||'').replace(/_/g, ' ')}
                    </p>
                    <p className="text-xs text-gray-400 truncate">{r.description}</p>
                  </div>
                  <div className="flex flex-wrap gap-1 flex-shrink-0">
                    {(r.tags || []).map(tag => (
                      <span key={tag} className={`text-xs px-2 py-0.5 rounded-full font-medium border ${getTagColor(tag)}`}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
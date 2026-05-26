// components/TagsManager.jsx — Système de tags
import React, { useState, useEffect, useCallback } from 'react';
import { dashboardAPI } from '../services/api';

// ==================== CONSTANTES ====================

const TAG_COLORS = [
  'bg-blue-100 text-blue-700 border-blue-200',
  'bg-purple-100 text-purple-700 border-purple-200',
  'bg-amber-100 text-amber-700 border-amber-200',
  'bg-pink-100 text-pink-700 border-pink-200',
  'bg-teal-100 text-teal-700 border-teal-200',
  'bg-orange-100 text-orange-700 border-orange-200',
  'bg-indigo-100 text-indigo-700 border-indigo-200',
  'bg-red-100 text-red-700 border-red-200',
  'bg-emerald-100 text-emerald-700 border-emerald-200',
  'bg-cyan-100 text-cyan-700 border-cyan-200',
];

// Map des icônes par type de signalement
const TYPE_ICONS = {
  water_pollution: '💧',
  air_pollution: '💨',
  waste_deposit: '🗑️',
  soil_contamination: '🟤',
  dust: '🌫️',
  noise_pollution: '🔊',
  deforestation: '🌳',
  chemical_spill: '🧪',
  mining_accident: '⛏️',
  default: '⚠️',
};

const getTagColor = (tag) => TAG_COLORS[tag.length % TAG_COLORS.length];

const getTypeIcon = (type) => TYPE_ICONS[type] || TYPE_ICONS.default;

// ==================== TAG EDITOR ====================

export const TagEditor = ({ reportId, initialTags = [], onSaved, disabled = false }) => {
  const [tags, setTags] = useState(initialTags);
  const [input, setInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');

  // Reset quand initialTags change
  useEffect(() => {
    setTags(initialTags);
  }, [initialTags]);

  const handleAdd = () => {
    const clean = input.trim().toLowerCase().replace(/\s+/g, '-');
    setError('');
    
    if (!clean) {
      setInput('');
      return;
    }
    
    if (clean.length > 30) {
      setError('Le tag est trop long (max 30 caractères)');
      return;
    }
    
    if (tags.includes(clean)) {
      setError('Ce tag existe déjà');
      setInput('');
      return;
    }
    
    setTags(prev => [...prev, clean]);
    setInput('');
  };

  const handleRemove = (tag) => setTags(prev => prev.filter(t => t !== tag));

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const data = await dashboardAPI.updateReportTags(reportId, tags);
      if (data.success) {
        onSaved?.(tags);
        setEditing(false);
      } else {
        setError(data.message || 'Erreur lors de l\'enregistrement');
      }
    } catch (e) {
      console.error(e);
      setError('Erreur réseau, veuillez réessayer');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditing(false);
    setTags(initialTags);
    setInput('');
    setError('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
    if (e.key === 'Escape') {
      setEditing(false);
      setTags(initialTags);
      setInput('');
      setError('');
    }
    if (e.key === 'Backspace' && !input && tags.length) {
      setTags(prev => prev.slice(0, -1));
    }
  };

  if (disabled && !editing) {
    return (
      <div className="flex flex-wrap gap-1.5">
        {tags.map(tag => (
          <span key={tag} className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getTagColor(tag)}`}>
            🏷️ {tag}
          </span>
        ))}
        {tags.length === 0 && (
          <span className="text-xs text-gray-300 italic">Aucun tag</span>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Tags existants */}
      <div className="flex flex-wrap gap-1.5">
        {tags.map(tag => (
          <span key={tag} className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getTagColor(tag)}`}>
            🏷️ {tag}
            {editing && (
              <button 
                onClick={() => handleRemove(tag)} 
                className="hover:opacity-60 ml-0.5 font-bold transition-opacity"
                type="button"
              >
                ×
              </button>
            )}
          </span>
        ))}
        {tags.length === 0 && !editing && (
          <span className="text-xs text-gray-300 italic">Aucun tag</span>
        )}
      </div>

      {/* Message d'erreur */}
      {error && (
        <div className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded-lg">
          ⚠️ {error}
        </div>
      )}

      {/* Mode édition */}
      {editing && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ajouter un tag (Entrée pour valider)"
              className="flex-1 text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              maxLength={30}
            />
            <button 
              onClick={handleAdd} 
              className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
              type="button"
            >
              + Ajouter
            </button>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={handleSave} 
              disabled={saving}
              className="text-xs px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 font-medium transition-colors"
              type="button"
            >
              {saving ? '💾 Enregistrement…' : '✅ Sauvegarder'}
            </button>
            <button 
              onClick={handleCancel}
              className="text-xs px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 font-medium transition-colors"
              type="button"
            >
              ❌ Annuler
            </button>
          </div>
          <p className="text-[10px] text-gray-400">
            Appuyez sur <kbd className="px-1 bg-gray-100 rounded">Entrée</kbd> pour ajouter,{' '}
            <kbd className="px-1 bg-gray-100 rounded">Esc</kbd> pour annuler
          </p>
        </div>
      )}

      {/* Bouton Modifier */}
      {!editing && (
        <button 
          onClick={() => setEditing(true)} 
          className="text-xs text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
          type="button"
        >
          ✏️ Modifier les tags
        </button>
      )}
    </div>
  );
};

// ==================== TAGS MANAGER (Vue globale) ====================

export const TagsManager = ({ reports = [], onTagClick }) => {
  const [globalTags, setGlobalTags] = useState([]);
  const [selectedTag, setSelectedTag] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const loadTags = useCallback(async () => {
    setLoading(true);
    try {
      const data = await dashboardAPI.getAllTags();
      if (data.success) {
        setGlobalTags(data.data || []);
      }
    } catch (e) {
      console.error('Erreur chargement tags:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTags();
  }, [loadTags]);

  // Recharger quand reports change
  useEffect(() => {
    loadTags();
  }, [reports, loadTags]);

  // Filtrer les rapports par tag et recherche
  const filteredReports = React.useMemo(() => {
    let filtered = selectedTag
      ? reports.filter(r => (r.tags || []).includes(selectedTag))
      : reports.filter(r => (r.tags || []).length > 0);
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(r => 
        r.description?.toLowerCase().includes(term) ||
        r.type?.toLowerCase().includes(term) ||
        (r.tags || []).some(tag => tag.toLowerCase().includes(term))
      );
    }
    
    return filtered;
  }, [reports, selectedTag, searchTerm]);

  const handleTagSelect = (tag) => {
    const newTag = tag === selectedTag ? '' : tag;
    setSelectedTag(newTag);
    onTagClick?.(newTag);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl flex items-center justify-center text-xl shadow-md">
            🏷️
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Système de tags</h2>
            <p className="text-xs text-gray-400">Étiquetez et filtrez les signalements par thématique</p>
          </div>
        </div>

        {/* Nuage de tags */}
        {loading ? (
          <div className="flex items-center justify-center gap-2 text-gray-400 text-sm py-8">
            <div className="w-4 h-4 border-2 border-gray-200 border-t-orange-500 rounded-full animate-spin" />
            Chargement des tags…
          </div>
        ) : globalTags.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-5xl mb-3 opacity-50">🏷️</div>
            <p className="text-gray-500 font-medium">Aucun tag encore</p>
            <p className="text-gray-400 text-sm mt-1">
              Ajoutez des tags sur vos signalements depuis la page Signalements
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {globalTags.reduce((sum, { count }) => sum + count, 0)} tags utilisés sur {globalTags.length} catégories
              </p>
              
              {/* Recherche de tag */}
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="🔍 Filtrer tags..."
                  className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 w-40 focus:ring-2 focus:ring-orange-500 outline-none"
                />
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2 mb-4 max-h-48 overflow-y-auto p-1">
              <button 
                onClick={() => handleTagSelect('')}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                  !selectedTag 
                    ? 'bg-gray-800 text-white border-gray-800 shadow-sm' 
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                📋 Tous ({reports.filter(r => (r.tags || []).length > 0).length})
              </button>
              
              {globalTags.map(({ tag, count }) => {
                // Filtrer par recherche
                if (searchTerm && !tag.toLowerCase().includes(searchTerm.toLowerCase())) {
                  return null;
                }
                
                return (
                  <button 
                    key={tag} 
                    onClick={() => handleTagSelect(tag)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                      selectedTag === tag
                        ? 'bg-orange-500 text-white border-orange-500 shadow-md scale-105'
                        : `${getTagColor(tag)} hover:opacity-80 hover:scale-105`
                    }`}
                    style={{ 
                      fontSize: Math.max(10, Math.min(14, 10 + Math.min(count / 5, 4))) + 'px',
                    }}
                  >
                    🏷️ {tag}
                    <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                      selectedTag === tag ? 'bg-white bg-opacity-30' : 'bg-black bg-opacity-10'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Signalements filtrés par tag */}
      {(selectedTag || filteredReports.length > 0) && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
            <h3 className="font-semibold text-gray-900">
              {selectedTag ? (
                <>📌 Signalements avec #<span className="text-orange-600">{selectedTag}</span></>
              ) : (
                '📋 Tous les signalements avec tags'
              )}
              <span className="ml-2 text-sm font-normal text-gray-400">
                ({filteredReports.length})
              </span>
            </h3>
            
            {(selectedTag || searchTerm) && (
              <div className="flex gap-2">
                {searchTerm && (
                  <button 
                    onClick={() => setSearchTerm('')} 
                    className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    ❌ Effacer recherche
                  </button>
                )}
                {selectedTag && (
                  <button 
                    onClick={() => handleTagSelect('')} 
                    className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    ✖️ Effacer le filtre
                  </button>
                )}
              </div>
            )}
          </div>

          {filteredReports.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <div className="text-4xl mb-3">📭</div>
              <p className="text-sm font-medium">Aucun signalement trouvé</p>
              <p className="text-xs mt-1">
                {searchTerm ? `Aucun résultat pour "${searchTerm}"` : 'Aucun signalement avec ce tag'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50 max-h-[500px] overflow-y-auto">
              {filteredReports.map(r => (
                <div 
                  key={r._id || r.id} 
                  className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer group"
                  onClick={() => onTagClick?.(r._id || r.id, selectedTag)}
                >
                  <div className="w-10 h-10 bg-gradient-to-br from-gray-100 to-gray-50 rounded-xl flex items-center justify-center text-xl flex-shrink-0 group-hover:scale-110 transition-transform">
                    {getTypeIcon(r.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 capitalize truncate">
                      {(r.type || '').replace(/_/g, ' ')}
                    </p>
                    <p className="text-xs text-gray-400 truncate max-w-md">
                      {r.description || 'Aucune description'}
                    </p>
                    {r.location?.address && (
                      <p className="text-[10px] text-gray-300 truncate mt-0.5">
                        📍 {r.location.address}
                      </p>
                    )}
                  </div>
                  
                  {/* Badge statut */}
                  <div className="flex-shrink-0">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      r.status === 'resolved' 
                        ? 'bg-green-100 text-green-700' 
                        : r.status === 'in_progress'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {r.status === 'resolved' ? '✅ Résolu' : r.status === 'in_progress' ? '🔄 En cours' : '🆕 Nouveau'}
                    </span>
                  </div>
                  
                  {/* Tags */}
                  <div className="flex flex-wrap gap-1 flex-shrink-0 max-w-xs justify-end">
                    {(r.tags || []).slice(0, 3).map(tag => (
                      <span 
                        key={tag} 
                        className={`text-xs px-2 py-0.5 rounded-full font-medium border ${getTagColor(tag)} cursor-pointer hover:scale-105 transition-transform`}
                        onClick={(e) => { e.stopPropagation(); handleTagSelect(tag); }}
                      >
                        {tag}
                      </span>
                    ))}
                    {(r.tags || []).length > 3 && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                        +{r.tags.length - 3}
                      </span>
                    )}
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

export default TagsManager;
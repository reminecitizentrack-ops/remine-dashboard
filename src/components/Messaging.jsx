// components/Messaging.jsx — Messagerie admin → citoyens
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { dashboardAPI } from '../services/api';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR', {
  day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
}) : '—';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

const _af = async (url, opts = {}) => {
  const t = typeof window !== 'undefined' ? localStorage.getItem('remine_admin_token') : '';
  const r = await fetch(url, { 
    ...opts, 
    headers: { 
      'Content-Type': 'application/json', 
      Authorization: `Bearer ${t}`, 
      ...opts.headers 
    } 
  });
  return r.json();
};

// ==================== NOUVEAU MESSAGE ====================

const NewMessageModal = ({ users, reports, onClose, onSent }) => {
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [reportId, setReportId] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const handleSend = async () => {
    // Validation
    if (!to) {
      setError('Veuillez sélectionner un destinataire');
      return;
    }
    if (!subject.trim()) {
      setError('Le sujet est requis');
      return;
    }
    if (!content.trim()) {
      setError('Le message ne peut pas être vide');
      return;
    }

    setSending(true);
    setError('');
    
    try {
      const res = await fetch(`${API}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem("remine_admin_token")}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          toUserId: to, 
          subject: subject.trim(), 
          content: content.trim(), 
          reportId: reportId || undefined 
        }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        onSent(data.data);
        onClose();
      } else {
        setError(data.error || "Erreur lors de l'envoi");
      }
    } catch (err) {
      setError('Erreur de connexion au serveur');
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-40 z-30" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-40 p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
          <div className="p-6 border-b flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #16a34a, #166534)', borderRadius: '16px 16px 0 0' }}>
            <h3 className="font-bold text-white text-lg flex items-center gap-2">✉️ Nouveau message</h3>
            <button onClick={onClose} className="text-white opacity-70 hover:opacity-100 text-xl font-bold">✕</button>
          </div>
          <div className="p-6 space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">
                ⚠️ {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                Destinataire *
              </label>
              <select 
                value={to} 
                onChange={e => setTo(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              >
                <option value="">— Choisir un citoyen —</option>
                {users.filter(u => u.role === 'citizen').map(u => (
                  <option key={u._id || u.id} value={u._id || u.id}>
                    {u.firstName} {u.lastName} — {u.email}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                Lié au signalement (optionnel)
              </label>
              <select 
                value={reportId} 
                onChange={e => setReportId(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              >
                <option value="">— Aucun signalement —</option>
                {reports.slice(0, 20).map(r => (
                  <option key={r._id || r.id} value={r._id || r.id}>
                    #{(r._id || r.id || '').slice(-8)} — {(r.type || '').replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                Sujet *
              </label>
              <input 
                value={subject} 
                onChange={e => setSubject(e.target.value)} 
                maxLength={200}
                placeholder="Ex: Mise à jour concernant votre signalement"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" 
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                Message *
              </label>
              <textarea 
                value={content} 
                onChange={e => setContent(e.target.value)} 
                rows={5} 
                maxLength={2000}
                placeholder="Bonjour, nous avons traité votre signalement…"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none resize-none" 
              />
              <p className="text-xs text-gray-400 text-right mt-1">{content.length}/2000</p>
            </div>

            <div className="flex gap-3 pt-2">
              <button 
                onClick={handleSend} 
                disabled={sending || !to || !subject.trim() || !content.trim()}
                className="flex-1 py-3 rounded-xl font-semibold text-sm text-white transition-colors disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #16a34a, #166534)' }}
              >
                {sending ? '⏳ Envoi...' : '📤 Envoyer le message'}
              </button>
              <button 
                onClick={onClose} 
                className="px-4 py-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

// ==================== COMPOSANT PRINCIPAL ====================

export const Messaging = ({ users = [], reports = [] }) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState('all');

  const loadMessages = useCallback(async () => {
    setLoading(true);
    try {
      const data = await _af(`${API}/messages/sent`);
      if (data.success) setMessages(data.data || []);
    } catch (e) { 
      console.error('Erreur chargement messages:', e); 
    } finally { 
      setLoading(false); 
    }
  }, []);

  useEffect(() => { 
    loadMessages(); 
  }, [loadMessages]);

  const handleSent = (msg) => {
    setMessages(prev => [msg, ...prev]);
  };

  // Mémoïsation des filtres pour performance
  const messageCounts = useMemo(() => ({
    all: messages.length,
    unread: messages.filter(m => !m.read).length,
    read: messages.filter(m => m.read).length
  }), [messages]);

  const filtered = useMemo(() => {
    if (filter === 'read') return messages.filter(m => m.read);
    if (filter === 'unread') return messages.filter(m => !m.read);
    return messages;
  }, [messages, filter]);

  return (
    <div className="space-y-5">
      {showNew && (
        <NewMessageModal 
          users={users} 
          reports={reports} 
          onClose={() => setShowNew(false)} 
          onSent={handleSent} 
        />
      )}

      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-xl">✉️</div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Messagerie</h2>
              <p className="text-xs text-gray-400">Communiquez directement avec les citoyens</p>
            </div>
          </div>
          <button 
            onClick={() => setShowNew(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white shadow-sm"
            style={{ background: 'linear-gradient(135deg, #16a34a, #166534)' }}
          >
            ✏️ Nouveau message
          </button>
        </div>

        {/* Filtres */}
        <div className="flex gap-2">
          {[
            { key: 'all', label: `Tous (${messageCounts.all})` },
            { key: 'unread', label: `Non lus (${messageCounts.unread})` },
            { key: 'read', label: `Lus (${messageCounts.read})` },
          ].map(f => (
            <button 
              key={f.key} 
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filter === f.key 
                  ? 'bg-emerald-100 text-emerald-700' 
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Liste + Détail */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Liste */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-2">📭</div>
              <p className="text-gray-400 text-sm">Aucun message</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {filtered.map(msg => (
                <div 
                  key={msg._id} 
                  onClick={() => setSelected(msg)}
                  className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                    selected?._id === msg._id 
                      ? 'bg-emerald-50 border-l-2 border-emerald-500' 
                      : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-700 font-bold text-xs flex-shrink-0">
                        {msg.to?.firstName?.[0]}{msg.to?.lastName?.[0]}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {msg.to?.firstName} {msg.to?.lastName}
                        </p>
                        <p className="text-xs text-gray-400 truncate">{msg.to?.email}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span className="text-xs text-gray-400">{fmtDate(msg.createdAt)}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                        msg.read 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-orange-100 text-orange-700'
                      }`}>
                        {msg.read ? '✓ Lu' : '● Non lu'}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm font-medium text-gray-700 truncate">{msg.subject}</p>
                  <p className="text-xs text-gray-400 truncate mt-0.5">{msg.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Détail */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-100 shadow-sm">
          {selected ? (
            <div className="p-6">
              <div className="flex items-start justify-between mb-5">
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">{selected.subject}</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    À : <strong>{selected.to?.firstName} {selected.to?.lastName}</strong> ({selected.to?.email})
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">Envoyé le {fmtDate(selected.createdAt)}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                  selected.read 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-orange-100 text-orange-700'
                }`}>
                  {selected.read 
                    ? `✓ Lu le ${fmtDate(selected.readAt)}` 
                    : '● Non lu'
                  }
                </span>
              </div>

              {selected.reportId && (
                <div className="bg-gray-50 rounded-xl p-3 mb-4 text-sm text-gray-600">
                  📋 Lié au signalement #{(selected.reportId?._id || selected.reportId || '').toString().slice(-8)}
                  {selected.reportId?.type && ` — ${selected.reportId.type.replace(/_/g, ' ')}`}
                </div>
              )}

              <div className="bg-gray-50 rounded-xl p-5">
                <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                  {selected.content}
                </p>
              </div>

              <button 
                onClick={() => setShowNew(true)}
                className="mt-4 flex items-center gap-2 px-4 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
              >
                ↩️ Envoyer un autre message à ce citoyen
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full py-16 text-gray-300">
              <span className="text-5xl mb-3">✉️</span>
              <p className="text-sm font-medium">Sélectionnez un message</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
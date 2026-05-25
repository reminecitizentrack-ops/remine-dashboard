// components/UsersManagement.jsx — VERSION FONCTIONNELLE
import React, { useState, useMemo } from 'react';
import { Mail, MapPin, Calendar } from 'lucide-react';
import { dashboardAPI } from '../services/api';

const ROLE_CONFIG = {
  citizen:   { label: 'Citoyen',        color: 'bg-green-100 text-green-800'  },
  admin:     { label: 'Administrateur', color: 'bg-blue-100 text-blue-800'    },
  moderator: { label: 'Modérateur',     color: 'bg-purple-100 text-purple-800'},
};

// ==================== MODAL DÉTAIL UTILISATEUR ====================

const UserDetailModal = ({ user, onClose, onRoleChange, onDelete, onNotify }) => {
  const [role, setRole]       = useState(user.role);
  const [saving, setSaving]   = useState(false);
  const [confirm, setConfirm] = useState(false);

  if (!user) return null;

  const handleRoleChange = async () => {
    setSaving(true);
    try {
      const data = await dashboardAPI.changeUserRole(user._id || user.id, role);
      if (data.success) {
        onRoleChange(user._id || user.id, role);
        onNotify('Rôle mis à jour avec succès', 'success');
        onClose();
      } else {
        onNotify(data.error || 'Erreur lors de la modification du rôle', 'error');
      }
    } catch (e) {
      onNotify('Erreur de connexion au serveur', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      const data = await dashboardAPI.deleteUser(user._id || user.id);
      if (data.success) {
        onDelete(user._id || user.id);
        onNotify('Utilisateur supprimé', 'success');
        onClose();
      } else {
        onNotify(data.error || 'Erreur lors de la suppression', 'error');
      }
    } catch (e) {
      onNotify('Erreur de connexion au serveur', 'error');
    } finally {
      setSaving(false);
      setConfirm(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-40 z-30" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-40 p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
          {/* Header */}
          <div className="p-6 border-b flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                {user.firstName?.[0]}{user.lastName?.[0]}
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{user.firstName} {user.lastName}</h3>
                <p className="text-sm text-gray-500">{user.email}</p>
              </div>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">✕</button>
          </div>

          <div className="p-6 space-y-4">
            {/* Infos */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-gray-400 text-xs mb-1">Communauté</p>
                <p className="font-medium">{user.community || 'Non spécifiée'}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-gray-400 text-xs mb-1">Inscrit le</p>
                <p className="font-medium">{user.createdAt ? new Date(user.createdAt).toLocaleDateString('fr-FR') : '—'}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-gray-400 text-xs mb-1">Dernière connexion</p>
                <p className="font-medium">{user.lastLogin ? new Date(user.lastLogin).toLocaleDateString('fr-FR') : '—'}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-gray-400 text-xs mb-1">Téléphone</p>
                <p className="font-medium">{user.phone || 'Non renseigné'}</p>
              </div>
            </div>

            {/* Changer le rôle */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Rôle</label>
              <select
                value={role}
                onChange={e => setRole(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value="citizen">Citoyen</option>
                <option value="moderator">Modérateur</option>
                <option value="admin">Administrateur</option>
              </select>
            </div>

            {/* Boutons */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleRoleChange}
                disabled={saving || role === user.role}
                className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium text-sm"
              >
                {saving ? 'Enregistrement…' : 'Enregistrer'}
              </button>
              {user.role !== 'admin' && !confirm && (
                <button
                  onClick={() => setConfirm(true)}
                  className="bg-red-50 text-red-600 py-2 px-4 rounded-lg hover:bg-red-100 transition-colors font-medium text-sm border border-red-200"
                >
                  Supprimer
                </button>
              )}
              {confirm && (
                <button
                  onClick={handleDelete}
                  disabled={saving}
                  className="bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors font-medium text-sm"
                >
                  {saving ? '…' : 'Confirmer ?'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

// ==================== MODAL NOUVEL UTILISATEUR ====================

const NewUserModal = ({ onClose, onCreated, onNotify }) => {
  const [form, setForm]     = useState({ firstName: '', lastName: '', email: '', password: '', community: '', role: 'citizen' });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const handleCreate = async () => {
    if (!form.firstName || !form.email || !form.password) {
      setError('Prénom, email et mot de passe sont obligatoires');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const data = await dashboardAPI.createUser(form);
      if (data.success) {
        onCreated(data.data?.user || data.data);
        onNotify('Compte créé avec succès', 'success');
        onClose();
      } else {
        setError(data.error || 'Erreur lors de la création');
      }
    } catch (e) {
      setError('Erreur de connexion au serveur');
    } finally {
      setSaving(false);
    }
  };

  const field = (key, label, type = 'text', placeholder = '') => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        value={form[key]}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        placeholder={placeholder}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
      />
    </div>
  );

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-40 z-30" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-40 p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
          <div className="p-6 border-b flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Nouvel utilisateur</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">✕</button>
          </div>
          <div className="p-6 space-y-3">
            {error && <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg border border-red-200">{error}</div>}
            <div className="grid grid-cols-2 gap-3">
              {field('firstName', 'Prénom *', 'text', 'Aminata')}
              {field('lastName', 'Nom', 'text', 'Diallo')}
            </div>
            {field('email', 'Email *', 'email', 'exemple@remine.sn')}
            {field('password', 'Mot de passe *', 'password', 'Min. 8 caractères')}
            {field('community', 'Communauté', 'text', 'Dakar')}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rôle</label>
              <select
                value={form.role}
                onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500"
              >
                <option value="citizen">Citoyen</option>
                <option value="moderator">Modérateur</option>
                <option value="admin">Administrateur</option>
              </select>
            </div>
            <button
              onClick={handleCreate}
              disabled={saving}
              className="w-full bg-green-600 text-white py-2.5 rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium mt-2"
            >
              {saving ? 'Création…' : 'Créer le compte'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

// ==================== COMPOSANT PRINCIPAL ====================

export const UsersManagement = ({ users: initialUsers, onNotify = () => {} }) => {
  const [users, setUsers]           = useState(initialUsers || []);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [sortBy, setSortBy]         = useState('recent');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showNewUser, setShowNewUser]   = useState(false);

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchesSearch =
        u.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.community?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = roleFilter === 'all' || u.role === roleFilter;
      return matchesSearch && matchesRole;
    }).sort((a, b) => {
      if (sortBy === 'name')   return a.firstName?.localeCompare(b.firstName);
      if (sortBy === 'recent') return new Date(b.createdAt) - new Date(a.createdAt);
      return 0;
    });
  }, [users, searchTerm, roleFilter, sortBy]);

  const stats = useMemo(() => ({
    total:     users.length,
    citizens:  users.filter(u => u.role === 'citizen').length,
    admins:    users.filter(u => u.role === 'admin').length,
    moderators:users.filter(u => u.role === 'moderator').length,
  }), [users]);

  const handleRoleChange = (userId, newRole) => {
    setUsers(prev => prev.map(u =>
      (u._id || u.id) === userId ? { ...u, role: newRole } : u
    ));
  };

  const handleDelete = (userId) => {
    setUsers(prev => prev.filter(u => (u._id || u.id) !== userId));
  };

  const handleExportCSV = () => {
    const SEP = ';';
    const cell = (v) => {
      if (v === null || v === undefined) return '""';
      return `"${String(v).replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`;
    };
    const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR', { day:'2-digit', month:'2-digit', year:'numeric' }) : '';

    const ROLE_LABELS = { admin:'Administrateur', moderator:'Modérateur', citizen:'Citoyen' };

    const headers = [
      'Nom', 'Prénom', 'Email', 'Rôle', 'Communauté', 'Téléphone',
      'Date inscription', 'Statut', 'ID',
    ].map(h => cell(h)).join(SEP);

    const rows = filteredUsers.map(u => [
      cell(u.lastName   || ''),
      cell(u.firstName  || ''),
      cell(u.email      || ''),
      cell(ROLE_LABELS[u.role] || u.role || ''),
      cell(u.community  || ''),
      cell(u.phone      || ''),
      cell(fmtDate(u.createdAt)),
      cell(u.isActive !== false ? 'Actif' : 'Inactif'),
      cell(u._id || u.id || ''),
    ].join(SEP));

    const bom = '\uFEFF';
    const csv = bom + [headers, ...rows].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `utilisateurs-remine-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCreated = (newUser) => {
    setUsers(prev => [newUser, ...prev]);
  };

  return (
    <div className="space-y-6">
      {/* Modals */}
      {selectedUser && (
        <UserDetailModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onRoleChange={handleRoleChange}
          onDelete={handleDelete}
          onNotify={onNotify}
        />
      )}
      {showNewUser && (
        <NewUserModal
          onClose={() => setShowNewUser(false)}
          onCreated={handleCreated}
          onNotify={onNotify}
        />
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: stats.total,      icon: '👥', color: 'bg-blue-100 text-blue-600'   },
          { label: 'Citoyens', value: stats.citizens, icon: '🌍', color: 'bg-green-100 text-green-600' },
          { label: 'Admins', value: stats.admins,    icon: '⚡', color: 'bg-purple-100 text-purple-600'},
          { label: 'Modérateurs', value: stats.moderators, icon: '🛡️', color: 'bg-orange-100 text-orange-600'},
        ].map(s => (
          <div key={s.label} className="bg-white p-5 rounded-xl shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{s.label}</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{s.value}</p>
              </div>
              <div className={`w-12 h-12 ${s.color} rounded-full flex items-center justify-center text-xl`}>
                {s.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Barre de contrôle */}
      <div className="bg-white p-5 rounded-xl shadow-sm border">
        <div className="flex flex-col lg:flex-row gap-3 items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-3 flex-1">
            <div className="relative flex-1 min-w-64">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
              <input
                type="text"
                placeholder="Rechercher un utilisateur…"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
              />
            </div>
            <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-green-500 text-sm">
              <option value="all">Tous les rôles</option>
              <option value="citizen">Citoyens</option>
              <option value="admin">Administrateurs</option>
              <option value="moderator">Modérateurs</option>
            </select>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-green-500 text-sm">
              <option value="recent">Plus récents</option>
              <option value="name">Nom A-Z</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              disabled={!filteredUsers.length}
              className="bg-white border border-gray-300 text-gray-700 px-4 py-2.5 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 text-sm font-medium whitespace-nowrap disabled:opacity-50"
            >
              📊 CSV
            </button>
            <button
              onClick={() => setShowNewUser(true)}
              className="bg-green-600 text-white px-5 py-2.5 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 text-sm font-medium whitespace-nowrap"
            >
              ➕ Nouvel utilisateur
            </button>
          </div>
        </div>
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['Utilisateur', 'Email', 'Rôle', 'Communauté', 'Inscription', 'Actions'].map(col => (
                  <th key={col} className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredUsers.map(user => (
                <tr key={user._id || user.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                        {user.firstName?.[0]}{user.lastName?.[0]}
                      </div>
                      <span className="text-sm font-medium text-gray-900">
                        {user.firstName} {user.lastName}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-600">{user.email}</td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full ${(ROLE_CONFIG[user.role] || ROLE_CONFIG.citizen).color}`}>
                      {(ROLE_CONFIG[user.role] || ROLE_CONFIG.citizen).label}
                    </span>
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-600">
                    {user.community || <span className="text-gray-300 italic">Non spécifiée</span>}
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString('fr-FR') : '—'}
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSelectedUser(user)}
                        className="text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors font-medium"
                      >
                        👁️ Voir
                      </button>
                      <button
                        onClick={() => setSelectedUser(user)}
                        className="text-xs bg-green-50 text-green-600 hover:bg-green-100 px-3 py-1.5 rounded-lg transition-colors font-medium"
                      >
                        ✏️ Modifier
                      </button>
                      {user.role !== 'admin' && (
                        <button
                          onClick={() => { setSelectedUser(user); }}
                          className="text-xs bg-red-50 text-red-600 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors font-medium"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <div className="text-5xl mb-3">👥</div>
            <p className="text-gray-500 font-medium">Aucun utilisateur trouvé</p>
            <p className="text-gray-400 text-sm mt-1">
              {searchTerm || roleFilter !== 'all' ? 'Ajustez vos critères' : 'Aucun utilisateur inscrit'}
            </p>
          </div>
        )}

        {filteredUsers.length > 0 && (
          <div className="px-5 py-3 border-t bg-gray-50">
            <p className="text-sm text-gray-500">
              {filteredUsers.length} utilisateur{filteredUsers.length > 1 ? 's' : ''} affiché{filteredUsers.length > 1 ? 's' : ''}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
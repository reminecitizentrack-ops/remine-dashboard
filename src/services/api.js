// services/api.js — VERSION SÉCURISÉE avec JWT
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

// ==================== GESTION DU TOKEN ====================

const TOKEN_KEY = 'remine_admin_token';

export const tokenStorage = {
  get: () => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(TOKEN_KEY);
  },
  set: (token) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(TOKEN_KEY, token);
  },
  clear: () => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(TOKEN_KEY);
  },
};

// ==================== FETCH AUTHENTIFIÉ ====================

async function authFetch(url, options = {}) {
  const token = tokenStorage.get();

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(url, { ...options, headers });

  // Token expiré ou invalide → déconnexion automatique
  if (response.status === 401) {
    tokenStorage.clear();
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
    throw new Error('Session expirée, veuillez vous reconnecter');
  }

  return response;
}

// ==================== CACHE SIMPLE ====================

const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000;

function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_DURATION) { cache.delete(key); return null; }
  return entry.data;
}

function setCached(key, data) {
  cache.set(key, { data, ts: Date.now() });
}

// ==================== API ====================

export const dashboardAPI = {

  // === MÉTHODE GÉNÉRIQUE ===
  async request(path, options = {}) {
    try {
      // Utiliser API_BASE_URL (avec /api) pour les chemins /api/...
      // Sinon construire depuis la base sans /api
      let url;
      if (path.startsWith('http')) {
        url = path;
      } else if (path.startsWith('/api/')) {
        // Remplacer /api/ par API_BASE_URL/
        url = `${API_BASE_URL}/${path.slice(5)}`;
      } else {
        url = `${API_BASE_URL}${path}`;
      }
      const res = await authFetch(url, options);
      return await res.json();
    } catch (error) {
      console.error('API request error:', error);
      return { success: false, error: 'Erreur de connexion' };
    }
  },

  // === AUTH ===

  async login(email, password) {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();

      if (data.success && data.data?.token) {
        tokenStorage.set(data.data.token);
        cache.clear();
      }

      return data;
    } catch (error) {
      console.error('❌ Erreur login:', error);
      return { success: false, error: 'Impossible de se connecter au serveur' };
    }
  },

  logout() {
    tokenStorage.clear();
    cache.clear();
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  },

  isAuthenticated() {
    return !!tokenStorage.get();
  },

  // === STATS ===

  async getStats(useCache = true) {
    try {
      const cacheKey = 'stats';
      if (useCache) {
        const cached = getCached(cacheKey);
        if (cached) return cached;
      }

      const response = await authFetch(`${API_BASE_URL}/admin/stats`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      if (data.success) setCached(cacheKey, data);
      return data;
    } catch (error) {
      console.error('❌ Erreur stats:', error);
      return {
        success: true,
        data: {
          overview: { totalReports: 0, activeReports: 0, resolvedReports: 0, resolutionRate: 0, totalUsers: 0 },
          recentReports: [], reportsByType: {}, reportsByStatus: {}, topCitizens: [],
          recentActivity: { reportsLast7Days: 0 },
        },
      };
    }
  },

  // === SIGNALEMENTS ===

  async getReports(params = {}) {
    try {
      const query = new URLSearchParams(params).toString();
      const response = await authFetch(`${API_BASE_URL}/admin/reports?${query}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('❌ Erreur reports:', error);
      return { success: true, data: { reports: [], total: 0 } };
    }
  },

  async updateReportStatus(reportId, status, note, assignedTo = null) {
    try {
      const body = { status, note };
      if (assignedTo) body.assignedTo = assignedTo;
      const response = await authFetch(`${API_BASE_URL}/admin/reports/${reportId}/status`, {
        method: 'PUT',
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      cache.delete('stats');
      return data;
    } catch (error) {
      console.error('❌ Erreur update status:', error);
      return { success: false, error: 'Erreur de connexion au serveur' };
    }
  },

  // === TAGS ===

  async updateReportTags(reportId, tags) {
    try {
      const response = await authFetch(`${API_BASE_URL}/admin/reports/${reportId}/tags`, {
        method: 'PUT',
        body: JSON.stringify({ tags }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('❌ updateReportTags:', error);
      return { success: false, error: 'Erreur de connexion' };
    }
  },

  async getAllTags() {
    try {
      const response = await authFetch(`${API_BASE_URL}/admin/tags`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      return { success: false, data: [] };
    }
  },

  // === UTILISATEURS ===

  async getUsers(params = {}) {
    try {
      const query = new URLSearchParams(params).toString();
      const response = await authFetch(`${API_BASE_URL}/admin/users?${query}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('❌ Erreur users:', error);
      return { success: false, error: 'Erreur de connexion au serveur' };
    }
  },

  // === ANALYTICS ===

  async getAdvancedAnalytics(timeRange = '30d') {
    try {
      const cacheKey = `analytics-${timeRange}`;
      const cached = getCached(cacheKey);
      if (cached) return cached;

      const response = await authFetch(`${API_BASE_URL}/admin/analytics?range=${timeRange}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      if (data.success) setCached(cacheKey, data);
      return data;
    } catch (error) {
      console.error('❌ Erreur analytics:', error);
      return { success: true, data: this._mockAnalytics(timeRange) };
    }
  },

  // === ACTIVITÉ 7 JOURS ===

  async getActivity() {
    try {
      const cacheKey = 'activity-7d';
      const cached = getCached(cacheKey);
      if (cached) return cached;

      const response = await authFetch(`${API_BASE_URL}/admin/activity`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      if (data.success) setCached(cacheKey, data);
      return data;
    } catch (error) {
      console.error('❌ Erreur activity:', error);
      return { success: false, data: [] };
    }
  },

  // === SUPPRESSION SIGNALEMENTS ===

  async deleteReport(reportId, reason = '') {
    try {
      const response = await authFetch(`${API_BASE_URL}/admin/reports/${reportId}`, {
        method: 'DELETE',
        body: JSON.stringify({ reason }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      cache.delete('stats');
      return data;
    } catch (error) {
      console.error('❌ Erreur suppression signalement:', error);
      return { success: false, error: 'Erreur de connexion au serveur' };
    }
  },

  async getDeletionLogs(params = {}) {
    try {
      const query = new URLSearchParams(params).toString();
      const response = await authFetch(`${API_BASE_URL}/admin/deletion-logs?${query}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('❌ Erreur journal suppressions:', error);
      return { success: false, data: { logs: [], total: 0, stats: [] } };
    }
  },

  // === COMMENTAIRES ===

  async getComments(reportId) {
    try {
      const response = await authFetch(`${API_BASE_URL}/reports/${reportId}/comments`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('❌ Erreur get comments:', error);
      return { success: false, data: { comments: [] } };
    }
  },

  async addComment(reportId, content, type = 'public') {
    try {
      const response = await authFetch(`${API_BASE_URL}/reports/${reportId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content, type }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('❌ Erreur add comment:', error);
      return { success: false, error: 'Erreur de connexion' };
    }
  },

  async deleteComment(reportId, commentId) {
    try {
      const response = await authFetch(`${API_BASE_URL}/reports/${reportId}/comments/${commentId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('❌ Erreur delete comment:', error);
      return { success: false, error: 'Erreur de connexion' };
    }
  },

  // === VALORISATION ===

  async getValorizationProjects(params = {}) {
    try {
      const query = new URLSearchParams(params).toString();
      const response = await authFetch(`${API_BASE_URL}/valorization/projects?${query}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('❌ Erreur valorization GET:', error);
      return { success: false, data: [], stats: null };
    }
  },

  async createValorizationProject(data) {
    try {
      const response = await authFetch(`${API_BASE_URL}/valorization/projects`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('❌ Erreur valorization POST:', error);
      return { success: false, error: 'Erreur de connexion' };
    }
  },

  async updateValorizationProject(id, data) {
    try {
      const response = await authFetch(`${API_BASE_URL}/valorization/projects/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('❌ Erreur valorization PUT:', error);
      return { success: false, error: 'Erreur de connexion' };
    }
  },

  async deleteValorizationProject(id) {
    try {
      const response = await authFetch(`${API_BASE_URL}/valorization/projects/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('❌ Erreur valorization DELETE:', error);
      return { success: false, error: 'Erreur de connexion' };
    }
  },

  // === TAGS ===

  async updateReportTags(reportId, tags) {
    try {
      const response = await authFetch(`${API_BASE_URL}/admin/reports/${reportId}/tags`, {
        method: 'PUT',
        body: JSON.stringify({ tags }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('❌ updateReportTags:', error);
      return { success: false, error: 'Erreur de connexion' };
    }
  },

  async getAllTags() {
    try {
      const response = await authFetch(`${API_BASE_URL}/admin/tags`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      return { success: false, data: [] };
    }
  },

  // === UTILISATEURS ===

  async changeUserRole(userId, role) {
    try {
      const response = await authFetch(`${API_BASE_URL}/admin/users/${userId}/role`, {
        method: 'PUT',
        body: JSON.stringify({ role }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('❌ changeUserRole:', error);
      return { success: false, error: 'Erreur de connexion' };
    }
  },

  async deleteUser(userId) {
    try {
      const response = await authFetch(`${API_BASE_URL}/admin/users/${userId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('❌ deleteUser:', error);
      return { success: false, error: 'Erreur de connexion' };
    }
  },

  async createUser(data) {
    try {
      const response = await authFetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('❌ createUser:', error);
      return { success: false, error: 'Erreur de connexion' };
    }
  },

  // === VALORISATION (ancien alias) ===

  async getValorizationProjects() {
    try {
      const cached = getCached('valorization-projects');
      if (cached) return cached;

      const response = await authFetch(`${API_BASE_URL}/valorization/projects`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      if (data.success) setCached('valorization-projects', data);
      return data;
    } catch (error) {
      console.error('❌ Erreur valorization:', error);
      return { success: true, data: this._mockValorizationProjects() };
    }
  },

  // === IMPACT ===

  async getImpactMetrics() {
    try {
      const cached = getCached('impact-metrics');
      if (cached) return cached;

      const response = await authFetch(`${API_BASE_URL}/admin/impact`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      if (data.success) setCached('impact-metrics', data);
      return data;
    } catch (error) {
      console.error('❌ Erreur impact:', error);
      return { success: true, data: this._mockImpactMetrics() };
    }
  },

  // === FILTRES ===

  async getFilterOptions() {
    try {
      const cached = getCached('filter-options');
      if (cached) return cached;

      const response = await authFetch(`${API_BASE_URL}/admin/filter-options`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      if (data.success) setCached('filter-options', data);
      return data;
    } catch (error) {
      return {
        success: true,
        data: {
          locations: ['Dakar', 'Thiès', 'Saint-Louis', 'Ziguinchor', 'Kaolack', 'Mbour'],
          pollutionTypes: ['water_pollution', 'dust', 'abandoned_site', 'waste_deposit',
                          'air_pollution', 'soil_contamination', 'noise_pollution', 'other'],
          severities: ['low', 'medium', 'high', 'critical'],
          statuses: ['new', 'verified', 'in_progress', 'resolved', 'rejected'],
        },
      };
    }
  },

  // === EXPORT ===

  async exportData(filters = {}, format = 'csv') {
    try {
      const query = new URLSearchParams({ ...filters, format }).toString();
      const response = await authFetch(`${API_BASE_URL}/admin/export?${query}`);

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `remine-export-${new Date().toISOString().split('T')[0]}.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        return { success: true };
      }
      return { success: false, error: 'Erreur lors de l\'export' };
    } catch (error) {
      console.error('❌ Erreur export:', error);
      return { success: false, error: 'Erreur de connexion lors de l\'export' };
    }
  },

  // === DÉMO ===

  async createDemoData() {
    try {
      const response = await authFetch(`${API_BASE_URL}/admin/demo-data`, { method: 'POST' });
      const data = await response.json();
      cache.clear();
      return data;
    } catch (error) {
      console.error('❌ Erreur demo data:', error);
      return { success: false, error: 'Erreur lors de la création des données de démo' };
    }
  },

  // === HEALTH ===

  async healthCheck() {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      return await response.json();
    } catch (error) {
      return { success: false, error: 'API non accessible' };
    }
  },

  clearCache() { cache.clear(); },

  // === DONNÉES MOCK (fallback) ===

  _mockAnalytics(timeRange) {
    const base = timeRange === '7d' ? 50 : timeRange === '30d' ? 200 : 800;
    return {
      trends: { activeReports: 0, resolutionRate: 0, reportsInRange: base },
      hotspots: [
        { location: 'Dakar', count: 45 }, { location: 'Thiès', count: 32 },
        { location: 'Mbour', count: 18 },
      ],
      impact: { savedCO2: base * 2.5, wasteProcessed: base * 15, waterProtected: base * 1000 },
    };
  },

  _mockValorizationProjects() {
    return [
      { id: 1, name: 'Transformation déchets béton', status: 'active',
        description: 'Recyclage des résidus miniers en matériaux de construction',
        wasteProcessed: 1250, productsCreated: 890, revenue: 45000,
        location: 'Site Nord', startDate: '2024-01-15', teamSize: 8 },
      { id: 2, name: 'Traitement eaux résiduaires', status: 'planning',
        description: 'Dépollution des eaux contaminées pour réutilisation agricole',
        wasteProcessed: 0, productsCreated: 0, revenue: 0,
        location: 'Site Est', startDate: '2024-03-01', teamSize: 5 },
    ];
  },

  _mockImpactMetrics() {
    return {
      environmental: { co2Saved: 0, waterProtected: 0, landRehabilitated: 0, wasteDiverted: 0 },
      social: { jobsCreated: 0, citizensEngaged: 0, communitiesImpacted: 0 },
      economic: { revenueGenerated: 0, costSavings: 0, newProducts: 0 },
    };
  },
};
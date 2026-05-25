// pages/dashboard.jsx — DESIGN MODERNE
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { StatsOverview }       from '../components/StatsOverview';
import { ReportsTable }        from '../components/ReportsTable';
import { RecentActivity }      from '../components/RecentActivity';
import { UsersManagement }     from '../components/UsersManagement';
import { AdvancedAnalytics }   from '../components/AdvancedAnalytics';
import { ReportsMap }          from '../components/ReportsMap';
import { SmartAlerts }         from '../components/SmartAlerts';
import { ValorizationProjects } from '../components/ValorizationProjects';
import { AIAnalysisPanel }     from '../components/AIAnalysisPanel';
import { AIPriorityEngine }    from '../components/AIPriorityEngine';
import { AIPatternDetector }   from '../components/AIPatternDetector';
import { PredictiveInsights }  from '../components/PredictiveInsights';
import { MetricCard }          from '../components/MetricCard';
import { StatsCards }         from '../components/StatsCards';
import { TagsManager }       from '../components/TagsManager';
import { dashboardAPI }        from '../services/api';
import { useDashboardData }    from '../hooks/useDashboardData';
import { DeletionLogs }        from '../components/DeletionLogs';
import { ExportPDFModal }      from '../components/ExportPDF';
import { useSocket }           from '../hooks/useSocket';
import { RegionDashboard }     from '../components/RegionDashboard';
import { ActionHistory }       from '../components/ActionHistory';
import { Messaging }           from '../components/Messaging';
import { AutoReport }          from '../components/AutoReport';
import { NotificationBell }    from '../components/NotificationBell';
import { LOGO_BASE64 }         from '../assets/logo';
import { aiService }           from '../services/aiService';
import { useQuery }             from '@tanstack/react-query';

// ==================== CONSTANTES ====================

const EUR_TO_FCFA = 655;
const formatFCFA = (euros) => {
  const n = Math.round((Number(euros) || 0) * EUR_TO_FCFA);
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M FCFA`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}k FCFA`;
  return `${n.toLocaleString('fr-FR')} FCFA`;
};

const TABS = [
  { id: 'overview',     label: 'Aperçu',         icon: '⬡', desc: 'Vue d\'ensemble'         },
  { id: 'reports',      label: 'Signalements',    icon: '📋', desc: 'Gérer les signalements'  },
  { id: 'map',          label: 'Carte',           icon: '🗺', desc: 'Visualisation géo'       },
  { id: 'ai-insights',  label: 'Insights IA',     icon: '✦', desc: 'Analyses intelligentes'  },
  { id: 'analytics',    label: 'Analytics',       icon: '↗', desc: 'Statistiques avancées'   },
  { id: 'valorization', label: 'Valorisation',    icon: '◈', desc: 'Projets de valorisation'  },
  { id: 'users',        label: 'Utilisateurs',    icon: '◉', desc: 'Gestion des citoyens'    },
  { id: 'audit',        label: 'Journal audit',   icon: '🗑️', desc: 'Historique des suppressions' },
  { id: 'regions',      label: 'Régions',         icon: '🗺️', desc: 'Stats par région'             },
  { id: 'messaging',    label: 'Messagerie',      icon: '✉️',  desc: 'Messages aux citoyens'        },
  { id: 'autoreport',   label: 'Rapport auto',    icon: '📄',  desc: 'Générer un rapport PDF'       },
];

// ==================== SOUS-COMPOSANTS ====================

const Toast = ({ toast, onClose }) => {
  if (!toast.show) return null;
  const cfg = {
    success: { bg: 'bg-emerald-500', icon: '✓' },
    error:   { bg: 'bg-red-500',     icon: '✕' },
    warning: { bg: 'bg-amber-500',   icon: '!' },
    info:    { bg: 'bg-blue-500',    icon: 'i' },
  }[toast.type] || { bg: 'bg-blue-500', icon: 'i' };

  return (
    <div className={`fixed top-5 right-5 z-50 flex items-start gap-3 px-4 py-3 rounded-xl shadow-2xl text-white ${cfg.bg} max-w-sm animate-in slide-in-from-right-full duration-300`}>
      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-white bg-opacity-25 flex items-center justify-center text-xs font-bold">{cfg.icon}</span>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm">{toast.message}</p>
        {toast.details && <p className="text-xs opacity-80 mt-0.5">{toast.details}</p>}
      </div>
      <button onClick={onClose} className="text-white opacity-60 hover:opacity-100 text-lg leading-none">×</button>
    </div>
  );
};

const StatPill = ({ label, value, color = 'gray' }) => {
  const colors = {
    green:  'text-emerald-600 bg-emerald-50',
    orange: 'text-amber-600 bg-amber-50',
    blue:   'text-blue-600 bg-blue-50',
    gray:   'text-gray-600 bg-gray-100',
  };
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-xs text-gray-500">{label}</span>
      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${colors[color]}`}>{value}</span>
    </div>
  );
};

const NavItem = ({ tab, active, onClick, badge, collapsed = false }) => (
  <button
    onClick={() => onClick(tab.id)}
    title={collapsed ? tab.label : undefined}
    className={`group w-full flex items-center gap-3 px-2 py-2.5 rounded-lg text-left text-sm font-medium transition-all duration-150 ${
      active
        ? 'bg-emerald-50 text-emerald-700 shadow-sm'
        : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
    } ${collapsed ? 'justify-center' : ''}`}
  >
    <span className={`w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-lg text-base transition-colors relative ${
      active ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-400 group-hover:bg-gray-200 group-hover:text-gray-600'
    }`}>
      {tab.icon}
      {collapsed && badge > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-4 h-4 rounded-full flex items-center justify-center" style={{fontSize:9}}>
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </span>
    {!collapsed && <span className="flex-1 truncate">{tab.label}</span>}
    {!collapsed && badge > 0 && (
      <span className="flex-shrink-0 bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-5 text-center">
        {badge > 99 ? '99+' : badge}
      </span>
    )}
    {!collapsed && active && <span className="w-1.5 h-1.5 flex-shrink-0 bg-emerald-500 rounded-full" />}
  </button>
);

const LoadingScreen = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="text-center">
      <div className="w-14 h-14 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto" />
      <p className="mt-4 text-gray-500 font-medium">Chargement de ReMine…</p>
    </div>
  </div>
);

// Horloge footer — se met à jour chaque minute
const FooterClock = () => {
  const [time, setTime] = React.useState(() =>
    new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  );
  React.useEffect(() => {
    const id = setInterval(() => {
      setTime(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));
    }, 30000);
    return () => clearInterval(id);
  }, []);
  return <>{time}</>;
};

// ==================== EXPORT DROPDOWN ====================
const ExportDropdown = ({ onCSV, onPDF, disabled }) => {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        disabled={disabled}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-slate-700 hover:bg-slate-800 border border-slate-700 rounded-lg transition-colors disabled:opacity-50"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        <span className="hidden sm:inline">Exporter</span>
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-10 z-40 w-48 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden">
            <div className="px-3 py-2 bg-gray-50 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Exporter</p>
            </div>
            <button onClick={() => { setOpen(false); onCSV(); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left">
              <div className="w-8 h-8 bg-emerald-100 text-emerald-700 rounded-lg flex items-center justify-center flex-shrink-0 text-base">📊</div>
              <div>
                <p className="font-semibold text-gray-800 text-sm">CSV</p>
                <p className="text-xs text-gray-400">Compatible Excel</p>
              </div>
            </button>
            <button onClick={() => { setOpen(false); onPDF(); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left border-t border-gray-50">
              <div className="w-8 h-8 bg-slate-100 text-slate-700 rounded-lg flex items-center justify-center flex-shrink-0 text-base">📄</div>
              <div>
                <p className="font-semibold text-gray-800 text-sm">PDF</p>
                <p className="text-xs text-gray-400">Rapport mis en page</p>
              </div>
            </button>
          </div>
        </>
      )}
    </div>
  );
};

// ==================== DASHBOARD PRINCIPAL ====================

export default function Dashboard() {
  const {
    stats, reports, users, analytics, valorizationProjects,
    impactMetrics, isLoading, reportsLoading, usersLoading,
    analyticsLoading, projectsLoading, error,
    updateReport, createDemoData, createDemoDataLoading,
    exportData, exportDataLoading, refetchAll,
  } = useDashboardData();

  const [activeTab, setActiveTab] = useState(() => {
    try { return localStorage.getItem('remine_active_tab') || 'overview'; } catch { return 'overview'; }
  });
  const [collapsed, setCollapsed]           = useState(false);  // sidebar réduite
  const [showSearch, setShowSearch]         = useState(false);  // recherche globale
  const [darkMode, setDarkMode]             = useState(() => {
    try { return localStorage.getItem('remine_dark') === '1'; } catch { return false; }
  });
  const [searchQuery, setSearchQuery]       = useState('');
  const [toast, setToast]                   = useState({ show: false, message: '', type: 'info', details: '' });
  const [sidebarOpen, setSidebarOpen]       = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [aiLoading, setAILoading]           = useState(false);
  const [showPDFModal, setShowPDFModal]     = useState(false);
  const [refreshing, setRefreshing]         = useState(false);
  const [rtBadge, setRtBadge]               = useState(0);    // badge temps réel
  const [rtToast, setRtToast]               = useState(null); // toast notification
  const [showProfile, setShowProfile]       = useState(false); // menu profil admin
  const [autoRefresh, setAutoRefresh]       = useState(false); // auto-refresh
  const [refreshInterval, setRefreshInterval] = useState(60); // secondes
  const [refreshCountdown, setRefreshCountdown] = useState(60);
  const [pdfSelectedReport, setPdfSelectedReport] = useState(null);
  const [pdfReportComments, setPdfReportComments] = useState([]);
  const [deletionLogsForPDF, setDeletionLogsForPDF] = useState([]);
  const [deletionStatsForPDF, setDeletionStatsForPDF] = useState([]);

  // Données d'activité réelles (7 jours)
  const { data: activityData = [] } = useQuery({
    queryKey: ['activity-7d'],
    queryFn: async () => {
      const res = await dashboardAPI.getActivity();
      if (res?.success && Array.isArray(res.data) && res.data.length > 0) return res.data;
      // Fallback : distribuer les signalements connus sur 7 jours si l'API échoue
      return Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return {
          date:  d.toISOString().split('T')[0],
          label: d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' }),
          count: 0,
        };
      });
    },
    initialData: [],
    refetchInterval: 60000,
    staleTime: 30000,
    retry: 2,
  });
  const [aiPatterns, setAIPatterns]         = useState(null);

  const notify = useCallback((message, type = 'success', details = '') => {
    setToast({ show: true, message, type, details });
    setTimeout(() => setToast(t => ({ ...t, show: false })), 4000);
  }, []);

  const memoizedStats    = useMemo(() => stats,               [stats]);
  const memoizedReports  = useMemo(() => Array.isArray(reports)  ? reports  : [], [reports]);
  const memoizedUsers    = useMemo(() => Array.isArray(users)    ? users    : [], [users]);
  const memoizedAnalytics = useMemo(() => analytics,          [analytics]);
  const memoizedProjects  = useMemo(() => Array.isArray(valorizationProjects) ? valorizationProjects : [], [valorizationProjects]);
  const memoizedImpact    = useMemo(() => impactMetrics,      [impactMetrics]);

  const analyzePatterns = useCallback(async () => {
    if (!memoizedReports.length) return;
    setAILoading(true);
    try {
      const patterns = await aiService.detectPatterns(memoizedReports);
      setAIPatterns(patterns);
    } catch (e) {
      console.error('Erreur analyse patterns:', e);
    } finally {
      setAILoading(false);
    }
  }, [memoizedReports]);

  // Lire le profil depuis le token JWT
  const adminProfile = React.useMemo(() => {
    try {
      const token = localStorage.getItem('remine_admin_token');
      if (!token) return null;
      const payload = JSON.parse(atob(token.split('.')[1]));
      return { name: `${payload.firstName || ''} ${payload.lastName || ''}`.trim() || payload.email, email: payload.email, role: payload.role };
    } catch { return null; }
  }, []);

  // Socket.io temps réel
  const showRtToast = React.useCallback((message, type = 'info') => {
    setRtToast({ message, type, id: Date.now() });
    setTimeout(() => setRtToast(null), 4000);
  }, []);

  useSocket({
    enabled: true,
    onNewReport: React.useCallback((data) => {
      setRtBadge(b => b + 1);
      showRtToast('📬 Nouveau signalement reçu', 'info');
      refetchAll();
    }, [refetchAll, showRtToast]),
    onReportUpdated: React.useCallback(() => { refetchAll(); }, [refetchAll]),
    onReportDeleted: React.useCallback(() => { refetchAll(); }, [refetchAll]),
    onNewComment:    React.useCallback(() => {}, []),
  });

  // Auto-refresh countdown
  React.useEffect(() => {
    if (!autoRefresh) { setRefreshCountdown(refreshInterval); return; }
    setRefreshCountdown(refreshInterval);
    const tick = setInterval(() => {
      setRefreshCountdown(c => {
        if (c <= 1) { refetchAll(); return refreshInterval; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [autoRefresh, refreshInterval, refetchAll]);

  // Persister l'onglet actif — déclaré AVANT les useEffect qui l'utilisent
  // Appliquer dark mode
  React.useEffect(() => {
    const html = document.documentElement;
    if (darkMode) { html.classList.add('dark'); }
    else          { html.classList.remove('dark'); }
    try { localStorage.setItem('remine_dark', darkMode ? '1' : '0'); } catch {}
  }, [darkMode]);

  const handleTabChange = useCallback((id) => {
    setActiveTab(id);
    try { localStorage.setItem('remine_active_tab', id); } catch {}
  }, []);

  useEffect(() => { if (error) notify('Erreur de connexion au serveur', 'error', 'Vérifiez que le backend tourne'); }, [error]);

  // Fermer profil si clic extérieur
  useEffect(() => {
    if (!showProfile) return;
    const handler = (e) => {
      if (!e.target.closest('[data-profile]')) setShowProfile(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showProfile]);

  // Raccourcis clavier
  useEffect(() => {
    const handler = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearch(s => !s);
        return;
      }
      if (e.key === 'Escape') { setShowSearch(false); setSearchQuery(''); return; }
      if (e.key === 'r' && !e.metaKey && !e.ctrlKey) { refetchAll(); return; }
      const tabIds = ['overview','reports','map','ai-insights','analytics','valorization','users','audit'];
      const idx = parseInt(e.key) - 1;
      if (idx >= 0 && idx < tabIds.length) handleTabChange(tabIds[idx]);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [refetchAll, handleTabChange]);

  useEffect(() => { if (memoizedReports.length > 0) analyzePatterns(); }, [memoizedReports.length]);

  // Recherche globale
  const searchResults = React.useMemo(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) return { reports: [], users: [] };
    const q = searchQuery.toLowerCase();
    return {
      reports: memoizedReports.filter(r =>
        r.description?.toLowerCase().includes(q) ||
        r.location?.address?.toLowerCase().includes(q) ||
        r.type?.toLowerCase().includes(q)
      ).slice(0, 5),
      users: memoizedUsers.filter(u =>
        u.firstName?.toLowerCase().includes(q) ||
        u.lastName?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.community?.toLowerCase().includes(q)
      ).slice(0, 5),
    };
  }, [searchQuery, memoizedReports, memoizedUsers]);

  const handleStatusUpdate = useCallback(async (reportId, newStatus) => {
    try {
      await updateReport({ reportId, status: newStatus });
      notify(`Statut mis à jour : ${newStatus}`, 'success');
    } catch {
      notify('Erreur lors de la mise à jour', 'error');
    }
  }, [updateReport, notify]);

  const handleExport = useCallback(async () => {
    try {
      await exportData({ filters: {}, format: 'csv' });
      notify('Export CSV téléchargé', 'success');
    } catch {
      notify('Erreur lors de l\'export', 'error');
    }
  }, [exportData, notify]);

  const handleDemoData = useCallback(async () => {
    try {
      await createDemoData();
      notify('Données de démo créées', 'success');
    } catch {
      notify('Erreur création données démo', 'error');
    }
  }, [createDemoData, notify]);

  const urgentCount  = memoizedReports.filter(r => r.severity === 'critical' && r.status !== 'resolved').length;
  const pendingCount = memoizedReports.filter(r => r.status === 'new').length;

  const impactData = useMemo(() => ({
    co2Saved:          memoizedImpact?.environmental?.co2Saved          || 1250,
    waterProtected:    memoizedImpact?.environmental?.waterProtected    || 45000,
    wasteProcessed:    memoizedImpact?.environmental?.wasteDiverted     || 2850,
    jobsCreated:       memoizedImpact?.social?.jobsCreated              || 45,
    landRehabilitated: memoizedImpact?.environmental?.landRehabilitated || 12,
    revenueGenerated:  memoizedImpact?.economic?.revenueGenerated       || 125000,
    citizensEngaged:   memoizedImpact?.social?.citizensEngaged          || 320,
  }), [memoizedImpact]);

  // ==================== CONTENU DES ONGLETS ====================

  const renderContent = () => {
    switch (activeTab) {

      case 'overview':
        return (
          <div className="space-y-6">
            {/* Stats principales */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Total signalements', value: memoizedStats?.overview?.totalReports || 0, icon: '📋', color: 'blue',   sub: `${memoizedStats?.overview?.activeReports || 0} actifs` },
                { label: 'Résolus',            value: memoizedStats?.overview?.resolvedReports || 0, icon: '✅', color: 'green',  sub: `${Math.round(memoizedStats?.overview?.resolutionRate || 0)}% taux` },
                { label: 'Urgents',            value: urgentCount,  icon: '🚨', color: 'red',    sub: 'Nécessitent action' },
                { label: 'Citoyens',           value: memoizedStats?.overview?.totalUsers || 0, icon: '👥', color: 'purple', sub: 'inscrits' },
              ].map(s => (
                <div key={s.label} className={`bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow`}>
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-2xl">{s.icon}</span>
                    <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">{s.sub}</span>
                  </div>
                  <p className="text-3xl font-black text-gray-900 tabular-nums">{s.value}</p>
                  <p className="text-sm text-gray-500 mt-1">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Impact + Alertes */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Impact environnemental */}
              <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="w-7 h-7 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center text-sm">🌍</span>
                  Impact environnemental
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: 'CO₂ évité',       value: `${impactData.co2Saved.toLocaleString()}t`,  color: 'emerald' },
                    { label: 'Eau protégée',     value: `${(impactData.waterProtected/1000).toFixed(0)}k L`, color: 'blue' },
                    { label: 'Déchets traités',  value: `${impactData.wasteProcessed.toLocaleString()}t`,    color: 'amber' },
                    { label: 'Revenus générés',  value: formatFCFA(impactData.revenueGenerated / EUR_TO_FCFA), color: 'purple' },
                  ].map(m => {
                    const c = { emerald: 'bg-emerald-50 text-emerald-700', blue: 'bg-blue-50 text-blue-700', amber: 'bg-amber-50 text-amber-700', purple: 'bg-purple-50 text-purple-700' }[m.color];
                    return (
                      <div key={m.label} className={`rounded-xl p-4 ${c}`}>
                        <p className="text-xl font-black tabular-nums">{m.value}</p>
                        <p className="text-xs mt-1 opacity-70">{m.label}</p>
                      </div>
                    );
                  })}
                </div>

                {/* Mini graphique activité */}
                <div className="mt-5 pt-5 border-t border-gray-100">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-gray-600">Activité des 7 derniers jours</h4>
                    <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                      {activityData?.reduce((s, d) => s + (d.count || 0), 0) ?? 0} signalements
                    </span>
                  </div>
                  {(() => {
                    const days = activityData?.length
                      ? activityData
                      : Array.from({ length: 7 }, (_, i) => {
                          const d = new Date(); d.setDate(d.getDate() - (6 - i));
                          return { count: 0, label: d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' }) };
                        });
                    const maxCount = Math.max(...days.map(d => d.count || 0), 1);
                    return (
                      <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                        {/* Barres */}
                        <div className="flex items-end gap-1.5 h-16 mb-2">
                          {days.map((day, i) => {
                            const pct   = Math.max(((day.count || 0) / maxCount) * 100, day.count > 0 ? 8 : 3);
                            const today = i === days.length - 1;
                            return (
                              <div key={i} className="flex-1 flex flex-col items-center justify-end h-full gap-0.5"
                                   title={`${day.label} : ${day.count || 0} signalement(s)`}>
                                {day.count > 0 && (
                                  <span className="text-xs font-bold text-gray-700" style={{ fontSize: 9 }}>{day.count}</span>
                                )}
                                <div
                                  className={`w-full rounded-t-md transition-all ${today ? 'bg-emerald-500' : 'bg-emerald-300'} border-b-2 ${today ? 'border-emerald-700' : 'border-emerald-400'}`}
                                  style={{ height: `${pct}%`, minHeight: 3 }}
                                />
                              </div>
                            );
                          })}
                        </div>
                        {/* Labels jours */}
                        <div className="flex gap-1.5">
                          {days.map((day, i) => {
                            const today = i === days.length - 1;
                            const label = (day.label || '').split(' ')[0]; // juste "lun", "mar"…
                            return (
                              <div key={i} className="flex-1 text-center">
                                <span className={`text-gray-500 font-medium ${today ? 'text-emerald-600 font-bold' : ''}`}
                                      style={{ fontSize: 9 }}>
                                  {label}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Alertes */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-gray-100">
                  <h3 className="font-bold text-gray-900 flex items-center gap-2">
                    <span className="w-7 h-7 bg-red-100 text-red-500 rounded-lg flex items-center justify-center text-sm">🔔</span>
                    Alertes
                    {urgentCount > 0 && (
                      <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">{urgentCount}</span>
                    )}
                  </h3>
                </div>
                <div className="p-3">
                  <SmartAlerts reports={memoizedReports} stats={memoizedStats} onNavigate={setActiveTab} />
                </div>
              </div>
            </div>

            {/* Activité récente + Priorisation IA */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="w-7 h-7 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center text-sm">📋</span>
                  Signalements récents
                </h3>
                <RecentActivity reports={memoizedReports.slice(0, 5)} />
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <AIPriorityEngine reports={memoizedReports} onPriorityUpdate={() => {}} />
              </div>
            </div>
          </div>
        );

      case 'reports':
        return (
          <ReportsTable
            reports={memoizedReports}
            onStatusUpdate={handleStatusUpdate}
            onRefresh={refetchAll}
            onExportPDF={async ({ reports: reps, selectedReport: sel }) => {
              setPdfSelectedReport(sel || null);
              // Charger les commentaires si un signalement est sélectionné
              if (sel) {
                try {
                  const id = sel._id || sel.id;
                  const res = await dashboardAPI.getComments(id);
                  setPdfReportComments(res?.data?.comments || []);
                } catch (e) { setPdfReportComments([]); }
              } else {
                setPdfReportComments([]);
              }
              // Charger les logs de suppression
              try {
                const res = await dashboardAPI.getDeletionLogs({ limit: 500 });
                if (res?.success) {
                  setDeletionLogsForPDF(res.data?.logs || []);
                  setDeletionStatsForPDF(res.data?.stats || []);
                }
              } catch (e) { /* silencieux */ }
              setShowPDFModal(true);
            }}
          />
        );

      case 'map':
        return (
          <ReportsMap reports={memoizedReports} onReportClick={(r) => { setSelectedReport(r); setActiveTab('reports'); }} />
        );

      case 'ai-insights':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AIAnalysisPanel report={selectedReport || memoizedReports[0]} />
              <AIPatternDetector reports={memoizedReports} patterns={aiPatterns} isLoading={aiLoading} />
            </div>
            <PredictiveInsights reports={memoizedReports} patterns={aiPatterns} />
          </div>
        );

      case 'analytics':
        return <AdvancedAnalytics stats={memoizedStats} reports={memoizedReports} analytics={memoizedAnalytics} />;

      case 'valorization':
        return <ValorizationProjects />;

      case 'users':
        return <UsersManagement users={memoizedUsers} onNotify={notify} />;

      case 'audit':
        return <DeletionLogs />;

      case 'regions':
        return <RegionDashboard reports={memoizedReports} />;

      case 'autoreport':
        return <AutoReport />;

      case 'messaging':
        return <Messaging users={memoizedUsers} reports={memoizedReports} />;

      default:
        return (
          <div className="flex flex-col items-center justify-center py-24 text-gray-400">
            <span className="text-5xl mb-4">🔧</span>
            <p className="font-semibold">Section en développement</p>
          </div>
        );
    }
  };

  if (isLoading && !stats && !memoizedReports.length) return <LoadingScreen />;

  const currentTab = TABS.find(t => t.id === activeTab);

  return (
    <div className="min-h-screen bg-gray-50 flex font-sans">

      {/* ===== SIDEBAR MOBILE OVERLAY ===== */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="fixed inset-0 bg-gray-900 bg-opacity-50 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <div className="relative flex flex-col w-72 h-full bg-white shadow-2xl p-4">
            <div className="flex items-center justify-between mb-6 px-1">
              <div className="flex items-center gap-2">
                <img src={LOGO_BASE64} alt="ReMine" className="w-9 h-9 object-contain" />
                <span className="font-bold text-gray-900">ReMine</span>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <nav className="space-y-1 flex-1">
              {TABS.map(tab => (
                <NavItem key={tab.id} tab={tab} active={activeTab === tab.id}
                  onClick={(id) => { handleTabChange(id); setSidebarOpen(false); }}
                  badge={tab.id === 'reports' ? urgentCount : 0} />
              ))}
            </nav>
          </div>
        </div>
      )}

      {/* ===== SIDEBAR DESKTOP ===== */}
      <aside className={`hidden lg:flex flex-col bg-white border-r border-gray-100 flex-shrink-0 transition-all duration-200 ${collapsed ? 'w-16' : 'w-60 xl:w-64'}`}>
        {/* Logo */}
        <div className="flex items-center justify-between px-3 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2 min-w-0">
            <img src={LOGO_BASE64} alt="ReMine" className="w-9 h-9 object-contain flex-shrink-0" />
            {!collapsed && (
              <div className="min-w-0">
                <p className="font-bold text-gray-900 text-sm leading-tight">ReMine</p>
                <p className="text-xs text-emerald-600 font-medium">Citizen Track</p>
              </div>
            )}
          </div>
          <button onClick={() => setCollapsed(c => !c)}
                  className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 flex-shrink-0"
                  title={collapsed ? 'Étendre la sidebar' : 'Réduire la sidebar'}>
            {collapsed ? '›' : '‹'}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {TABS.map(tab => (
            <NavItem key={tab.id} tab={tab} active={activeTab === tab.id} onClick={handleTabChange}
              badge={tab.id === 'reports' ? urgentCount : 0} collapsed={collapsed} />
          ))}
        </nav>

        {/* Stats rapides */}
        {!collapsed && (
          <div className="px-4 py-4 border-t border-gray-100 bg-gray-50">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Résumé</p>
            <StatPill label="Signalements actifs"
              value={
                memoizedStats?.overview?.activeReports ??
                memoizedReports.filter(r => ['new','verified','in_progress'].includes(r.status)).length
              }
              color="orange" />
            <StatPill label="Taux de résolution"
              value={(() => {
                if (memoizedStats?.overview?.resolutionRate != null)
                  return `${Math.round(memoizedStats.overview.resolutionRate)}%`;
                const total    = memoizedReports.length;
                const resolved = memoizedReports.filter(r => r.status === 'resolved').length;
                return total ? `${Math.round((resolved / total) * 100)}%` : '0%';
              })()}
              color="green" />
            <StatPill label="Citoyens inscrits"
              value={memoizedStats?.overview?.totalUsers ?? memoizedUsers.length}
              color="blue" />
            <StatPill label="Projets actifs"
              value={memoizedProjects.filter(p => p.status === 'active').length}
              color="gray" />
          </div>
        )}

        {/* Dark mode toggle */}
        <div className={`px-2 py-2 ${collapsed ? 'flex justify-center' : ''}`}>
          <button
            onClick={() => setDarkMode(d => !d)}
            title={darkMode ? 'Mode clair' : 'Mode sombre'}
            className={`flex items-center gap-2 px-3 py-2 text-sm text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors ${collapsed ? 'justify-center w-full' : 'w-full'}`}
          >
            <span className="w-6 h-6 flex items-center justify-center flex-shrink-0">{darkMode ? '☀️' : '🌙'}</span>
            {!collapsed && <span>{darkMode ? 'Mode clair' : 'Mode sombre'}</span>}
          </button>
        </div>

        {/* Déconnexion */}
        <div className="px-2 py-3 border-t border-gray-100">
          <button
            onClick={() => dashboardAPI.logout()}
            title="Déconnexion"
            className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors ${collapsed ? 'justify-center' : ''}`}
          >
            <span className="w-6 h-6 flex items-center justify-center flex-shrink-0">→</span>
            {!collapsed && 'Déconnexion'}
          </button>
        </div>
      </aside>

      {/* ===== CONTENU PRINCIPAL ===== */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Header */}
        <header className="bg-white border-b border-gray-100 px-4 lg:px-6 py-3.5 flex items-center justify-between gap-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            {/* Hamburger mobile */}
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-lg text-gray-400 hover:bg-gray-100">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div>
              <h1 className="text-base font-bold text-gray-900">{currentTab?.label}</h1>
              <p className="text-xs text-gray-400 hidden sm:block">{currentTab?.desc}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Recherche globale Cmd+K */}
            <button
              onClick={() => setShowSearch(true)}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-sm text-gray-400 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
              title="Recherche globale (Cmd+K)"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span className="text-xs">Rechercher…</span>
              <kbd className="text-xs bg-white border border-gray-200 rounded px-1 py-0.5 font-mono">⌘K</kbd>
            </button>

            {/* Statut + badge RT */}
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-gray-500 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-200 relative">
              <span className={`w-1.5 h-1.5 rounded-full ${isLoading ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500'}`} />
              {isLoading ? 'Sync…' : 'Connecté'}
              {rtBadge > 0 && (
                <button
                  onClick={() => { setRtBadge(0); refetchAll(); }}
                  className="ml-1 bg-red-500 text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center animate-bounce"
                  title="Nouveaux signalements — cliquez pour rafraîchir"
                >
                  {rtBadge > 9 ? '9+' : rtBadge}
                </button>
              )}
            </div>

            {/* Auto-refresh */}
            <div className="hidden sm:flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5">
              <button
                onClick={() => setAutoRefresh(a => !a)}
                className={`text-xs font-semibold px-2 py-0.5 rounded transition-colors ${autoRefresh ? 'bg-emerald-100 text-emerald-700' : 'text-gray-400 hover:text-gray-600'}`}
                title={autoRefresh ? 'Désactiver auto-refresh' : 'Activer auto-refresh'}
              >
                {autoRefresh ? `↻ ${refreshCountdown}s` : '↻ Auto'}
              </button>
              {autoRefresh && (
                <select
                  value={refreshInterval}
                  onChange={e => setRefreshInterval(Number(e.target.value))}
                  className="text-xs border-0 bg-transparent text-gray-400 outline-none cursor-pointer"
                >
                  <option value={30}>30s</option>
                  <option value={60}>1min</option>
                  <option value={300}>5min</option>
                </select>
              )}
            </div>

            {/* Actualiser */}
            <button
              onClick={() => { setRefreshing(true); refetchAll(); setTimeout(() => setRefreshing(false), 1500); }}
              disabled={refreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-70 transition-colors shadow-sm shadow-emerald-200"
            >
              <svg className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span className="hidden sm:inline">Actualiser</span>
            </button>

            {/* Bouton Export unique CSV + PDF */}
            <ExportDropdown
              onCSV={() => handleExport()}
              onPDF={async () => {
                try {
                  const res = await dashboardAPI.getDeletionLogs({ limit: 500 });
                  if (res?.success) {
                    setDeletionLogsForPDF(res.data?.logs || []);
                    setDeletionStatsForPDF(res.data?.stats || []);
                  }
                } catch {}
                setShowPDFModal(true);
              }}
              disabled={exportDataLoading}
            />

            {/* Démo */}
            <button
              onClick={handleDemoData}
              disabled={createDemoDataLoading}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              🎮 <span className="hidden lg:inline">Données démo</span>
            </button>
            {/* Centre de notifications */}
            <NotificationBell onNavigate={(tab, reportId) => handleTabChange(tab, reportId)} />

            {/* Profil admin */}
            <div className="relative" data-profile>
              <button
                onClick={() => setShowProfile(p => !p)}
                className="w-8 h-8 bg-emerald-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 hover:bg-emerald-700 transition-colors"
                title="Profil administrateur"
              >
                {adminProfile?.name?.[0]?.toUpperCase() || 'A'}
              </button>
              {showProfile && (
                <div className="absolute right-0 top-10 z-50 w-56 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
                  <div className="px-4 py-3 bg-emerald-50 border-b border-emerald-100">
                    <p className="text-sm font-bold text-gray-900 truncate">{adminProfile?.name || 'Administrateur'}</p>
                    <p className="text-xs text-gray-500 truncate">{adminProfile?.email}</p>
                    <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">{adminProfile?.role}</span>
                  </div>
                  <div className="py-1">
                    <button
                      onClick={() => { setShowProfile(false); setAutoRefresh(a => !a); }}
                      className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
                    >
                      {autoRefresh ? '⏸ Désactiver auto-refresh' : '▶ Activer auto-refresh'}
                    </button>
                    <div className="border-t border-gray-100 mt-1 pt-1">
                      <button
                        onClick={() => { setShowProfile(false); dashboardAPI.logout(); }}
                        className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                      >
                        → Déconnexion
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Contenu */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 lg:p-6 max-w-screen-2xl mx-auto">
            <Toast toast={toast} onClose={() => setToast(t => ({ ...t, show: false }))} />
            {renderContent()}
          </div>
        </main>

        {/* Footer minimal */}
        <footer className="flex-shrink-0 border-t border-gray-100 bg-white px-6 py-2.5 flex items-center justify-between text-xs text-gray-400">
          <span>ReMine Citizen Track — {memoizedStats?.overview?.totalReports || 0} signalements · {memoizedStats?.overview?.totalUsers || 0} citoyens</span>
          <span>Dernière sync : <FooterClock /></span>
        </footer>
      </div>
      {/* Toast temps réel */}
      {rtToast && (
        <div className="fixed bottom-6 right-6 z-[9999] animate-in slide-in-from-bottom-2 duration-300">
          <div className="bg-gray-900 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 max-w-sm">
            <span className="text-base">📬</span>
            <p className="text-sm font-medium">{rtToast.message}</p>
            <button onClick={() => setRtToast(null)} className="text-gray-400 hover:text-white ml-2 text-lg">×</button>
          </div>
        </div>
      )}

      {/* Recherche globale */}
      {showSearch && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4"
             onClick={() => { setShowSearch(false); setSearchQuery(''); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-gray-200 overflow-hidden"
               onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
              <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                autoFocus
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Rechercher signalement, utilisateur, commune…"
                className="flex-1 text-sm outline-none text-gray-800 placeholder-gray-400"
              />
              <button onClick={() => { setShowSearch(false); setSearchQuery(''); }}
                      className="text-gray-400 hover:text-gray-600 text-xs border border-gray-200 rounded px-1.5 py-0.5 font-mono">Esc</button>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {searchQuery.length < 2 ? (
                <div className="px-4 py-6 text-center text-sm text-gray-400">
                  Tapez au moins 2 caractères pour chercher
                </div>
              ) : searchResults.reports.length === 0 && searchResults.users.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-gray-400">Aucun résultat pour « {searchQuery} »</div>
              ) : (
                <div>
                  {searchResults.reports.length > 0 && (
                    <div>
                      <p className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider bg-gray-50">Signalements</p>
                      {searchResults.reports.map(r => (
                        <button key={r._id || r.id}
                                onClick={() => { handleTabChange('reports'); setShowSearch(false); setSearchQuery(''); }}
                                className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50 flex items-start gap-3">
                          <span className="text-base flex-shrink-0">📋</span>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">{r.type?.replace('_', ' ')}</p>
                            <p className="text-xs text-gray-400 truncate">{r.description?.substring(0, 60)}</p>
                          </div>
                          <span className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full ${r.status === 'resolved' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{r.status}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {searchResults.users.length > 0 && (
                    <div>
                      <p className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider bg-gray-50">Utilisateurs</p>
                      {searchResults.users.map(u => (
                        <button key={u._id || u.id}
                                onClick={() => { handleTabChange('users'); setShowSearch(false); setSearchQuery(''); }}
                                className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-center gap-3">
                          <div className="w-8 h-8 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                            {u.firstName?.[0]}{u.lastName?.[0]}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-800">{u.firstName} {u.lastName}</p>
                            <p className="text-xs text-gray-400">{u.email}</p>
                          </div>
                          <span className="flex-shrink-0 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{u.role}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="px-4 py-2 border-t border-gray-100 bg-gray-50 flex gap-4 text-xs text-gray-400">
              <span><kbd className="font-mono bg-white border border-gray-200 rounded px-1">↵</kbd> ouvrir</span>
              <span><kbd className="font-mono bg-white border border-gray-200 rounded px-1">Esc</kbd> fermer</span>
              <span><kbd className="font-mono bg-white border border-gray-200 rounded px-1">1-8</kbd> onglets</span>
            </div>
          </div>
        </div>
      )}

      {/* Modal Export PDF */}
      {showPDFModal && (
        <ExportPDFModal
          onClose={() => setShowPDFModal(false)}
          reports={reports || []}
          stats={stats}
          selectedReport={pdfSelectedReport}
          reportComments={pdfReportComments}
          deletionLogs={deletionLogsForPDF}
          deletionStats={deletionStatsForPDF}
        />
      )}

    </div>
  );
}
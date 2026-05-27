// pages/dashboard.jsx — DESIGN MODERNE (avec tous les composants intégrés)
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
import { StatsCards }          from '../components/StatsCards';
import { TagsManager }         from '../components/TagsManager';
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
import { LiveFeed }            from '../components/LiveFeed';
import { LOGO_BASE64 }         from '../assets/logo';
import { aiService }           from '../services/aiService';
import { useQuery }            from '@tanstack/react-query';

// ==================== CONSTANTES ====================

const EUR_TO_FCFA = 655;
const formatFCFA = (euros) => {
  const n = Math.round((Number(euros) || 0) * EUR_TO_FCFA);
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M FCFA`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}k FCFA`;
  return `${n.toLocaleString('fr-FR')} FCFA`;
};

const TABS = [
  { id: 'overview',     label: 'Aperçu',       icon: '⬡', desc: 'Vue d\'ensemble'          },
  { id: 'reports',      label: 'Signalements', icon: '📋', desc: 'Signalements & carte'     },
  { id: 'analyse',      label: 'Analyse',      icon: '✦', desc: 'IA, stats & régions'      },
  { id: 'valorization', label: 'Valorisation', icon: '◈', desc: 'Projets de valorisation'  },
  { id: 'citoyens',     label: 'Citoyens',     icon: '◉', desc: 'Utilisateurs & messagerie'},
  { id: 'admin',        label: 'Administration', icon: '🗂️', desc: 'Audit, tags & rapports' },
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

const NavItem = ({ tab, active, onClick, badge, collapsed = false }) => {
  const [hovered, setHovered] = React.useState(false);
  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  return (
    <button
      onClick={() => onClick(tab.id)}
      title={collapsed ? tab.label : undefined}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: collapsed ? 0 : 12,
        padding: '8px 8px',
        borderRadius: 10,
        textAlign: 'left',
        fontSize: 13,
        fontWeight: 500,
        border: 'none',
        cursor: 'pointer',
        justifyContent: collapsed ? 'center' : 'flex-start',
        background: active
          ? isDark ? 'rgba(16,185,129,0.15)' : 'linear-gradient(135deg, #ecfdf5, #d1fae5)'
          : hovered ? (isDark ? 'rgba(255,255,255,0.06)' : '#f9fafb') : 'transparent',
        color: active ? '#10b981' : hovered ? (isDark ? '#e5e7eb' : '#374151') : (isDark ? '#9ca3af' : '#6b7280'),
        boxShadow: active ? '0 1px 4px rgba(5,150,105,0.12)' : 'none',
        transition: 'all 0.18s cubic-bezier(0.4,0,0.2,1)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {active && !collapsed && (
        <span style={{
          position: 'absolute', left: 0, top: '20%', bottom: '20%',
          width: 3, borderRadius: 4,
          background: 'linear-gradient(180deg, #10b981, #059669)',
          transition: 'all 0.2s',
        }} />
      )}

      <span style={{
        width: 34, height: 34, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: 10, fontSize: 17, position: 'relative',
        background: active
          ? 'linear-gradient(135deg, #10b981, #059669)'
          : hovered ? (isDark ? '#334155' : '#f3f4f6') : (isDark ? '#1e293b' : '#f9fafb'),
        boxShadow: active ? '0 4px 12px rgba(16,185,129,0.3)' : 'none',
        transform: active ? 'scale(1.08)' : hovered ? 'scale(1.04)' : 'scale(1)',
        transition: 'all 0.2s cubic-bezier(0.34,1.56,0.64,1)',
        filter: active ? 'brightness(1.1)' : 'none',
      }}>
        <span style={{
          display: 'inline-block',
          transform: hovered && !active ? 'rotate(-8deg) scale(1.15)' : 'rotate(0) scale(1)',
          transition: 'transform 0.2s cubic-bezier(0.34,1.56,0.64,1)',
          filter: active ? 'brightness(0) invert(1)' : 'none',
        }}>
          {tab.icon}
        </span>
        {collapsed && badge > 0 && (
          <span style={{
            position: 'absolute', top: -4, right: -4,
            background: '#ef4444', color: '#fff',
            fontSize: 9, fontWeight: 700,
            width: 16, height: 16, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'navBadgePulse 1.5s infinite',
          }}>
            {badge > 9 ? '9+' : badge}
          </span>
        )}
      </span>

      {!collapsed && <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tab.label}</span>}

      {!collapsed && badge > 0 && (
        <span style={{
          flexShrink: 0, background: '#ef4444', color: '#fff',
          fontSize: 10, fontWeight: 700,
          padding: '2px 6px', borderRadius: 20,
          animation: 'navBadgePulse 1.5s infinite',
        }}>
          {badge > 99 ? '99+' : badge}
        </span>
      )}

      {!collapsed && active && (
        <span style={{
          width: 7, height: 7, flexShrink: 0,
          background: 'linear-gradient(135deg, #10b981, #059669)',
          borderRadius: '50%',
          animation: 'navDotPulse 2s infinite',
        }} />
      )}
    </button>
  );
};

// Keyframes pour animations nav
if (typeof document !== 'undefined' && !document.getElementById('remine-nav-styles')) {
  const style = document.createElement('style');
  style.id = 'remine-nav-styles';
  style.textContent = `
    @keyframes navBadgePulse {
      0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239,68,68,0.4); }
      50% { transform: scale(1.1); box-shadow: 0 0 0 4px rgba(239,68,68,0); }
    }
    @keyframes navDotPulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.6; transform: scale(0.8); }
    }
    @keyframes statCardIn {
      from { opacity: 0; transform: translateY(12px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `;
  document.head.appendChild(style);
}

const LoadingScreen = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="text-center">
      <div className="w-14 h-14 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto" />
      <p className="mt-4 text-gray-500 font-medium">Chargement de ReMine…</p>
    </div>
  </div>
);

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

// ==================== COMPOSANT SOUS-ONGLETS ====================

const TabGroup = ({ tabs, children }) => {
  const [active, setActive] = useState(tabs[0].id);
  return (
    <div className="space-y-4">
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActive(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              active === t.id
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            <span>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>
      <div>{children(active)}</div>
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
    try {
      const saved = localStorage.getItem('remine_active_tab') || 'overview';
      const legacyMap = { 'map':'reports','ai-insights':'analyse','analytics':'analyse','users':'citoyens','audit':'admin','regions':'analyse','messaging':'citoyens','autoreport':'admin','tags':'admin','stats-cards':'analyse','metrics':'analyse','history':'admin' };
      const validTabs = new Set(['overview','reports','analyse','valorization','citoyens','admin']);
      const resolved = legacyMap[saved] || saved;
      return validTabs.has(resolved) ? resolved : 'overview';
    } catch { return 'overview'; }
  });
  const [collapsed, setCollapsed]           = useState(false);
  const [showSearch, setShowSearch]         = useState(false);
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
  const [rtBadge, setRtBadge]               = useState(0);
  const [rtToast, setRtToast]               = useState(null);
  const [showProfile, setShowProfile]       = useState(false);
  const [autoRefresh, setAutoRefresh]       = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(60);
  const [refreshCountdown, setRefreshCountdown] = useState(60);
  const [pdfSelectedReport, setPdfSelectedReport] = useState(null);
  const [pdfReportComments, setPdfReportComments] = useState([]);
  const [deletionLogsForPDF, setDeletionLogsForPDF] = useState([]);
  const [deletionStatsForPDF, setDeletionStatsForPDF] = useState([]);

  const { data: activityData = [] } = useQuery({
    queryKey: ['activity-7d'],
    queryFn: async () => {
      const res = await dashboardAPI.getActivity();
      if (res?.success && Array.isArray(res.data) && res.data.length > 0) return res.data;
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
  const [aiPatterns, setAIPatterns] = useState(null);

  const notify = useCallback((message, type = 'success', details = '') => {
    setToast({ show: true, message, type, details });
    setTimeout(() => setToast(t => ({ ...t, show: false })), 4000);
  }, []);

  const memoizedStats    = useMemo(() => stats, [stats]);
  const memoizedReports  = useMemo(() => Array.isArray(reports) ? reports : [], [reports]);
  const memoizedUsers    = useMemo(() => Array.isArray(users) ? users : [], [users]);
  const memoizedAnalytics = useMemo(() => analytics, [analytics]);
  const memoizedProjects  = useMemo(() => Array.isArray(valorizationProjects) ? valorizationProjects : [], [valorizationProjects]);
  const memoizedImpact    = useMemo(() => impactMetrics, [impactMetrics]);

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

  const adminProfile = React.useMemo(() => {
    try {
      const token = localStorage.getItem('remine_admin_token');
      if (!token) return null;
      const payload = JSON.parse(atob(token.split('.')[1]));
      return { name: `${payload.firstName || ''} ${payload.lastName || ''}`.trim() || payload.email, email: payload.email, role: payload.role };
    } catch { return null; }
  }, []);

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

  React.useEffect(() => {
    const html = document.documentElement;
    if (darkMode) { html.classList.add('dark'); }
    else          { html.classList.remove('dark'); }
    try { localStorage.setItem('remine_dark', darkMode ? '1' : '0'); } catch {}
  }, [darkMode]);

  // Correspondance anciens IDs → nouveaux (migration localStorage ou liens hardcodés)
  const LEGACY_TAB_MAP = useMemo(() => ({
    'map':         'reports',
    'ai-insights': 'analyse',
    'analytics':   'analyse',
    'users':       'citoyens',
    'audit':       'admin',
    'regions':     'analyse',
    'messaging':   'citoyens',
    'autoreport':  'admin',
    'tags':        'admin',
    'stats-cards': 'analyse',
    'metrics':     'analyse',
    'history':     'admin',
  }), []);

  const VALID_TABS = useMemo(() => new Set(['overview','reports','analyse','valorization','citoyens','admin']), []);

  const handleTabChange = useCallback((id, reportId) => {
    const resolved = LEGACY_TAB_MAP[id] || id;
    const final = VALID_TABS.has(resolved) ? resolved : 'overview';
    if (reportId) {
      const found = memoizedReports.find(r => (r._id || r.id) === reportId);
      if (found) setSelectedReport(found);
    }
    setActiveTab(final);
    try { localStorage.setItem('remine_active_tab', final); } catch {}
  }, [LEGACY_TAB_MAP, VALID_TABS, memoizedReports]);

  useEffect(() => { if (error) notify('Erreur de connexion au serveur', 'error', 'Vérifiez que le backend tourne'); }, [error]);

  useEffect(() => {
    if (!showProfile) return;
    const handler = (e) => {
      if (!e.target.closest('[data-profile]')) setShowProfile(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showProfile]);

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
      const tabIds = ['overview','reports','analyse','valorization','citoyens','admin'];
      const idx = parseInt(e.key) - 1;
      if (idx >= 0 && idx < tabIds.length) handleTabChange(tabIds[idx]);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [refetchAll, handleTabChange]);

  useEffect(() => { if (memoizedReports.length > 0) analyzePatterns(); }, [memoizedReports.length]);

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

  const impactData = useMemo(() => ({
    co2Saved:          memoizedImpact?.environmental?.co2Saved          || 1250,
    waterProtected:    memoizedImpact?.environmental?.waterProtected    || 45000,
    wasteProcessed:    memoizedImpact?.environmental?.wasteDiverted     || 2850,
    jobsCreated:       memoizedImpact?.social?.jobsCreated              || 45,
    landRehabilitated: memoizedImpact?.environmental?.landRehabilitated || 12,
    revenueGenerated:  memoizedImpact?.economic?.revenueGenerated       || 125000,
    citizensEngaged:   memoizedImpact?.social?.citizensEngaged          || 320,
  }), [memoizedImpact]);

  // Préparer les données pour StatsCards
  const statsCardsData = useMemo(() => ({
    totalReports: memoizedStats?.overview?.totalReports || 0,
    resolvedReports: memoizedStats?.overview?.resolvedReports || 0,
    activeReports: memoizedStats?.overview?.activeReports || memoizedReports.filter(r => ['new','verified','in_progress'].includes(r.status)).length,
    resolutionRate: memoizedStats?.overview?.resolutionRate || (memoizedReports.length ? Math.round((memoizedReports.filter(r => r.status === 'resolved').length / memoizedReports.length) * 100) : 0),
    totalUsers: memoizedStats?.overview?.totalUsers || memoizedUsers.length,
    urgentReports: urgentCount,
  }), [memoizedStats, memoizedReports, memoizedUsers, urgentCount]);

  // ==================== CONTENU DES ONGLETS ====================

  const renderContent = () => {
    switch (activeTab) {

      case 'overview':
        return (
          <div className="space-y-6">
            {/* Stats principales */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Total signalements', value: memoizedStats?.overview?.totalReports || 0, icon: '📋', color: '#3b82f6', bg: darkMode ? 'rgba(30,58,138,0.25)' : '#eff6ff', sub: `${memoizedStats?.overview?.activeReports || 0} actifs` },
                { label: 'Résolus',            value: memoizedStats?.overview?.resolvedReports || 0, icon: '✅', color: '#10b981', bg: darkMode ? 'rgba(6,78,59,0.25)' : '#ecfdf5', sub: `${Math.round(memoizedStats?.overview?.resolutionRate || 0)}% taux` },
                { label: 'Urgents',            value: urgentCount,  icon: '🚨', color: '#ef4444', bg: darkMode ? 'rgba(69,10,10,0.3)' : '#fef2f2', sub: 'Nécessitent action' },
                { label: 'Citoyens',           value: memoizedStats?.overview?.totalUsers || 0, icon: '👥', color: '#8b5cf6', bg: darkMode ? 'rgba(46,16,101,0.25)' : '#f5f3ff', sub: 'inscrits' },
              ].map((s, i) => (
                <div key={s.label} style={{
                  background: darkMode ? '#1e293b' : '#fff',
                  borderRadius: 18,
                  padding: 20,
                  border: `1px solid ${darkMode ? '#334155' : '#f3f4f6'}`,
                  boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                  animation: `statCardIn 0.4s ease ${i * 0.08}s both`,
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  cursor: 'default',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = `0 8px 24px ${s.color}22`; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)'; }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                    <span style={{
                      width: 44, height: 44, borderRadius: 14,
                      background: s.bg,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 22,
                      boxShadow: `0 4px 12px ${s.color}22`,
                      transition: 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1)',
                    }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.15) rotate(-5deg)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1) rotate(0)'}
                    >{s.icon}</span>
                    <span style={{ fontSize: 11, color: darkMode ? '#64748b' : '#9ca3af', background: darkMode ? '#0f172a' : '#f9fafb', padding: '2px 8px', borderRadius: 20 }}>{s.sub}</span>
                  </div>
                  <p style={{ fontSize: 34, fontWeight: 900, color: darkMode ? '#f1f5f9' : '#111827', fontVariantNumeric: 'tabular-nums', margin: 0 }}>{s.value}</p>
                  <p style={{ fontSize: 13, color: darkMode ? '#94a3b8' : '#6b7280', marginTop: 4 }}>{s.label}</p>
                  <div style={{ marginTop: 12, height: 3, borderRadius: 3, background: darkMode ? '#334155' : '#f3f4f6', overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 3, background: `linear-gradient(90deg, ${s.color}, ${s.color}99)`, width: s.value > 0 ? '100%' : '0%', transition: 'width 1s ease', }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Flux temps réel */}
            <LiveFeed reports={memoizedReports} onNavigate={handleTabChange} />

            {/* Impact + Alertes */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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

                <div className="mt-5 pt-5 border-t border-gray-100">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-gray-600">Activité des 7 derniers jours</h4>
                    <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                      {activityData?.reduce((s, d) => s + (d.count || 0), 0) ?? 0} signalements
                    </span>
                  </div>
                  {(() => {
                    const days = activityData?.length                      ? activityData
                      : Array.from({ length: 7 }, (_, i) => {
                          const d = new Date(); d.setDate(d.getDate() - (6 - i));
                          return { count: 0, label: d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' }) };
                        });
                    const maxCount = Math.max(...days.map(d => d.count || 0), 1);
                    return (
                      <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
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
                        <div className="flex gap-1.5">
                          {days.map((day, i) => {
                            const today = i === days.length - 1;
                            const label = (day.label || '').split(' ')[0];
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
          <TabGroup
            tabs={[
              { id: 'list', label: 'Liste', icon: '📋' },
              { id: 'map',  label: 'Carte', icon: '🗺️' },
            ]}
          >
            {(sub) => sub === 'map'
              ? <ReportsMap reports={memoizedReports} onReportClick={(r) => { setSelectedReport(r); }} />
              : <ReportsTable
                  reports={memoizedReports}
                  onStatusUpdate={handleStatusUpdate}
                  onRefresh={refetchAll}
                  onExportPDF={async ({ reports: reps, selectedReport: sel }) => {
                    setPdfSelectedReport(sel || null);
                    if (sel) {
                      try {
                        const id = sel._id || sel.id;
                        const res = await dashboardAPI.getComments(id);
                        setPdfReportComments(res?.data?.comments || []);
                      } catch (e) { setPdfReportComments([]); }
                    } else {
                      setPdfReportComments([]);
                    }
                    try {
                      const res = await dashboardAPI.getDeletionLogs({ limit: 500 });
                      if (res?.success) {
                        setDeletionLogsForPDF(res.data?.logs || []);
                        setDeletionStatsForPDF(res.data?.stats || []);
                      }
                    } catch (e) {}
                    setShowPDFModal(true);
                  }}
                />
            }
          </TabGroup>
        );

      case 'analyse':
        return (
          <TabGroup
            tabs={[
              { id: 'ia',        label: 'Insights IA', icon: '✦' },
              { id: 'analytics', label: 'Analytics',   icon: '↗' },
              { id: 'stats',     label: 'Statistiques',icon: '📊' },
              { id: 'regions',   label: 'Régions',     icon: '🗺️' },
            ]}
          >
            {(sub) => {
              if (sub === 'ia') return (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <AIAnalysisPanel report={selectedReport || memoizedReports[0]} />
                    <AIPatternDetector reports={memoizedReports} patterns={aiPatterns} loading={aiLoading} />
                  </div>
                  <PredictiveInsights reports={memoizedReports} patterns={aiPatterns} />
                </div>
              );
              if (sub === 'analytics') return (
                <AdvancedAnalytics stats={memoizedStats} reports={memoizedReports} analytics={memoizedAnalytics} />
              );
              if (sub === 'regions') return (
                <RegionDashboard reports={memoizedReports} />
              );
              // stats (StatsCards + MetricCards fusionnés)
              return (
                <div className="space-y-8">
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <span className="text-2xl">📊</span> Vue globale des statistiques
                    </h2>
                    <StatsCards stats={memoizedStats} />
                  </div>
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                      <span className="text-2xl">📈</span> Métriques d'impact
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <MetricCard title="Impact CO₂"      value={`${impactData.co2Saved} t`}                            change={+12} icon="🌍" color="emerald" />
                      <MetricCard title="Eau protégée"    value={`${(impactData.waterProtected / 1000).toFixed(0)}k L`} change={+8}  icon="💧" color="blue"    />
                      <MetricCard title="Déchets traités" value={`${impactData.wasteProcessed} t`}                      change={+15} icon="♻️" color="amber"   />
                      <MetricCard title="Revenus générés" value={formatFCFA(impactData.revenueGenerated / EUR_TO_FCFA)} change={+5}  icon="💰" color="purple"  />
                      <MetricCard title="Emplois créés"   value={impactData.jobsCreated}                                change={+3}  icon="👔" color="emerald" />
                      <MetricCard title="Citoyens engagés"value={impactData.citizensEngaged}                            change={+22} icon="🤝" color="blue"    />
                    </div>
                  </div>
                </div>
              );
            }}
          </TabGroup>
        );

      case 'valorization':
        return <ValorizationProjects />;

      case 'citoyens':
        return (
          <TabGroup
            tabs={[
              { id: 'users',     label: 'Utilisateurs', icon: '◉' },
              { id: 'messaging', label: 'Messagerie',   icon: '✉️' },
            ]}
          >
            {(sub) => sub === 'messaging'
              ? <Messaging users={memoizedUsers} reports={memoizedReports} />
              : <UsersManagement users={memoizedUsers} onNotify={notify} />
            }
          </TabGroup>
        );

      case 'admin':
        return (
          <TabGroup
            tabs={[
              { id: 'audit',      label: 'Journal audit', icon: '🗑️' },
              { id: 'history',    label: 'Historique',    icon: '⏱️' },
              { id: 'tags',       label: 'Tags',          icon: '🏷️' },
              { id: 'autoreport', label: 'Rapport auto',  icon: '📄' },
            ]}
          >
            {(sub) => {
              if (sub === 'history') return (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <span className="text-2xl">⏱️</span> Historique des actions
                  </h2>
                  <ActionHistory />
                </div>
              );
              if (sub === 'tags') return (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <span className="text-2xl">🏷️</span> Gestion des tags
                  </h2>
                  <p className="text-sm text-gray-500 mb-6">Gérez les tags pour catégoriser et filtrer les signalements.</p>
                  <TagsManager reports={memoizedReports} onUpdate={refetchAll} />
                </div>
              );
              if (sub === 'autoreport') return <AutoReport />;
              return <DeletionLogs />;
            }}
          </TabGroup>
        );



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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex font-sans">

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
      <aside className={`hidden lg:flex flex-col bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 flex-shrink-0 transition-all duration-200 ${collapsed ? 'w-16' : 'w-60 xl:w-64'}`}>
        <div className="flex items-center justify-between px-3 py-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2 min-w-0">
            <img src={LOGO_BASE64} alt="ReMine" className="w-9 h-9 object-contain flex-shrink-0" />
            {!collapsed && (
              <div className="min-w-0">
                <p className="font-bold text-gray-900 dark:text-white text-sm leading-tight">ReMine</p>
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

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {TABS.map(tab => (
            <NavItem key={tab.id} tab={tab} active={activeTab === tab.id} onClick={handleTabChange}
              badge={tab.id === 'reports' ? urgentCount : 0} collapsed={collapsed} />
          ))}
        </nav>

        {!collapsed && (
          <div className="px-4 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
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

        <div className="px-2 py-3 border-t border-gray-100 dark:border-gray-800">
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

        <header className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-4 lg:px-6 py-3.5 flex items-center justify-between gap-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-lg text-gray-400 hover:bg-gray-100">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div>
              <h1 className="text-base font-bold text-gray-900 dark:text-white">{currentTab?.label}</h1>
              <p className="text-xs text-gray-400 dark:text-gray-500 hidden sm:block">{currentTab?.desc}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
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

            <button
              onClick={handleDemoData}
              disabled={createDemoDataLoading}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              🎮 <span className="hidden lg:inline">Données démo</span>
            </button>

            <NotificationBell onNavigate={(tab, reportId) => handleTabChange(tab, reportId)} />

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

        <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-950">
          <div className="p-4 lg:p-6 max-w-screen-2xl mx-auto">
            <Toast toast={toast} onClose={() => setToast(t => ({ ...t, show: false }))} />
            {renderContent()}
          </div>
        </main>

        <footer className="flex-shrink-0 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 px-6 py-2.5 flex items-center justify-between text-xs text-gray-400 dark:text-gray-500">
          <span>ReMine Citizen Track — {memoizedStats?.overview?.totalReports || 0} signalements · {memoizedStats?.overview?.totalUsers || 0} citoyens</span>
          <span>Dernière sync : <FooterClock /></span>
        </footer>
      </div>

      {rtToast && (
        <div className="fixed bottom-6 right-6 z-[9999] animate-in slide-in-from-bottom-2 duration-300">
          <div className="bg-gray-900 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 max-w-sm">
            <span className="text-base">📬</span>
            <p className="text-sm font-medium">{rtToast.message}</p>
            <button onClick={() => setRtToast(null)} className="text-gray-400 hover:text-white ml-2 text-lg">×</button>
          </div>
        </div>
      )}

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
                                onClick={() => { handleTabChange('citoyens'); setShowSearch(false); setSearchQuery(''); }}
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
              <span><kbd className="font-mono bg-white border border-gray-200 rounded px-1">1-6</kbd> onglets</span>
            </div>
          </div>
        </div>
      )}

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
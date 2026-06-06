// pages/dashboard.jsx — DESIGN MODERNE (avec tous les composants intégrés)
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  LayoutDashboard, ClipboardList, BarChart3, Gem, Users,
  ShieldCheck, Settings, Bell, RefreshCw, Download,
  AlertTriangle, CheckCircle, UserCheck, Leaf, Droplets,
  Recycle, DollarSign, Activity, TrendingUp, MapPin,
  Search, LogOut, ChevronDown, Zap, Globe,
} from 'lucide-react';
import { StatsOverview }       from '../components/StatsOverview';
import { ReportsTable }        from '../components/ReportsTable';
import { RecentActivity }      from '../components/RecentActivity';
import { UsersManagement }     from '../components/UsersManagement';
import { AdvancedAnalytics }   from '../components/AdvancedAnalytics';
import { SettingsPage }        from '../components/SettingsPage';
import { TopVotedReports }     from '../components/TopVotedReports';
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
import { ExportModal }         from '../components/ExportModal';
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

const TAB_ICONS = {
  overview:     <LayoutDashboard size={17} />,
  reports:      <ClipboardList   size={17} />,
  analyse:      <BarChart3       size={17} />,
  valorization: <Gem             size={17} />,
  citoyens:     <Users           size={17} />,
  admin:        <ShieldCheck     size={17} />,
  settings:     <Settings        size={17} />,
};

const TABS = [
  { id: 'overview',     label: 'Aperçu',         desc: "Vue d'ensemble"            },
  { id: 'reports',      label: 'Signalements',   desc: 'Signalements & carte'      },
  { id: 'analyse',      label: 'Analyse',        desc: 'IA, stats & régions'       },
  { id: 'valorization', label: 'Valorisation',   desc: 'Projets de valorisation'   },
  { id: 'citoyens',     label: 'Citoyens',       desc: 'Utilisateurs & messagerie' },
  { id: 'admin',        label: 'Administration', desc: 'Audit, tags & rapports'    },
  { id: 'settings',     label: 'Paramètres',     desc: 'Configuration du dashboard'},
].map(t => ({ ...t, icon: TAB_ICONS[t.id] }));

// ==================== SOUS-COMPOSANTS ====================

const Toast = ({ toast, onClose }) => {
  if (!toast.show) return null;
  const cfg = {
    success: { bg: 'bg-emerald-500', icon: <CheckCircle   size={14} color="#fff"/> },
    error:   { bg: 'bg-red-500',     icon: <AlertTriangle size={14} color="#fff"/> },
    warning: { bg: 'bg-amber-500',   icon: <AlertTriangle size={14} color="#fff"/> },
    info:    { bg: 'bg-blue-500',    icon: <Activity      size={14} color="#fff"/> },
  }[toast.type] || { bg: 'bg-blue-500', icon: <Activity size={14} color="#fff"/> };

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
  const [ripples, setRipples] = React.useState([]);
  const [iconKey, setIconKey] = React.useState(0);
  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

  const handleClick = (e) => {
    // Ripple effect
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = Date.now();
    setRipples(r => [...r, { id, x, y }]);
    setTimeout(() => setRipples(r => r.filter(rp => rp.id !== id)), 500);
    // Bounce icon
    setIconKey(k => k + 1);
    onClick(tab.id);
  };

  return (
    <button
      onClick={handleClick}
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
      {/* Ripples au clic */}
      {ripples.map(rp => (
        <span key={rp.id} className="nav-ripple" style={{ left: rp.x, top: rp.y, opacity: 0.25 }} />
      ))}

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
        borderRadius: 10, position: 'relative',
        background: active
          ? 'linear-gradient(135deg, #10b981, #059669)'
          : hovered ? (isDark ? '#334155' : '#f3f4f6') : (isDark ? '#1e293b' : '#f9fafb'),
        boxShadow: active ? '0 4px 12px rgba(16,185,129,0.3)' : 'none',
        transform: active ? 'scale(1.08)' : hovered ? 'scale(1.04)' : 'scale(1)',
        transition: 'all 0.2s cubic-bezier(0.34,1.56,0.64,1)',
        color: active ? '#fff' : hovered ? (isDark ? '#e2e8f0' : '#374151') : (isDark ? '#9ca3af' : '#6b7280'),
      }}>
        <span
          key={iconKey}
          className={iconKey > 0 ? 'nav-icon-activate' : ''}
          style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            transform: (iconKey === 0 && hovered && !active) ? 'rotate(-8deg) scale(1.15)' : 'rotate(0) scale(1)',
            transition: iconKey > 0 ? 'none' : 'transform 0.2s cubic-bezier(0.34,1.56,0.64,1)',
          }}
        >
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

// Keyframes pour animations nav + transitions onglets
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
    @keyframes tabSlideIn {
      from { opacity: 0; transform: translateY(14px) scale(0.995); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }
    .tab-content-enter {
      animation: tabSlideIn 0.28s cubic-bezier(0.22, 1, 0.36, 1) both;
    }
    @keyframes subTabIn {
      from { opacity: 0; transform: translateX(10px); }
      to   { opacity: 1; transform: translateX(0); }
    }
    .subtab-content-enter {
      animation: subTabIn 0.22s cubic-bezier(0.22, 1, 0.36, 1) both;
    }
    @keyframes iconActivate {
      0%   { transform: scale(1) rotate(0deg); }
      30%  { transform: scale(1.35) rotate(-12deg); }
      60%  { transform: scale(0.9) rotate(6deg); }
      80%  { transform: scale(1.08) rotate(-3deg); }
      100% { transform: scale(1) rotate(0deg); }
    }
    .nav-icon-activate { animation: iconActivate 0.45s cubic-bezier(0.34,1.56,0.64,1) both; }
    @keyframes subIconPop {
      0%   { transform: scale(0.6) translateY(4px); opacity: 0; }
      60%  { transform: scale(1.2) translateY(-2px); opacity: 1; }
      100% { transform: scale(1) translateY(0); opacity: 1; }
    }
    .sub-icon-pop { animation: subIconPop 0.3s cubic-bezier(0.34,1.56,0.64,1) both; }
    @keyframes navRipple {
      from { transform: scale(0); opacity: 0.35; }
      to   { transform: scale(2.8); opacity: 0; }
    }
    .nav-ripple {
      position: absolute; border-radius: 50%;
      background: #10b981; width: 40px; height: 40px;
      margin-left: -20px; margin-top: -20px;
      pointer-events: none;
      animation: navRipple 0.5s ease-out forwards;
    }
    @keyframes iconShimmer {
      0%   { background-position: -200% center; }
      100% { background-position: 200% center; }
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
// ExportDropdown remplacé par ExportModal

// ==================== COMPOSANT SOUS-ONGLETS ====================

const TabGroup = ({ tabs, children }) => {
  const [active, setActive] = useState(tabs[0].id);
  const [contentKey, setContentKey] = useState(0);
  const [activeIconKey, setActiveIconKey] = useState({});

  const handleSubTab = (id) => {
    if (id === active) return;
    setActive(id);
    setContentKey(k => k + 1);
    setActiveIconKey(prev => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
  };

  return (
    <div className="space-y-4">
      {/* Barre de sous-onglets */}
      <div
        className="flex gap-0.5 bg-gray-100 dark:bg-gray-800/80 p-1 rounded-xl w-fit"
        style={{ backdropFilter: 'blur(8px)' }}
      >
        {tabs.map((t) => {
          const isActive = active === t.id;
          const iconK = activeIconKey[t.id] || 0;
          return (
            <button
              key={t.id}
              onClick={() => handleSubTab(t.id)}
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 14px',
                borderRadius: 8,
                border: 'none',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: isActive ? 600 : 500,
                zIndex: 1,
                background: isActive ? (
                  typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
                    ? '#374151' : 'white'
                ) : 'transparent',
                color: isActive ? (
                  typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
                    ? '#f9fafb' : '#111827'
                ) : (
                  typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
                    ? '#9ca3af' : '#6b7280'
                ),
                boxShadow: isActive ? '0 1px 6px rgba(0,0,0,0.1), 0 0 0 1px rgba(0,0,0,0.04)' : 'none',
                transition: 'all 0.2s cubic-bezier(0.22, 1, 0.36, 1)',
              }}
            >
              {/* Icône sous-onglet */}
              <span
                key={iconK}
                className={iconK > 0 ? 'sub-icon-pop' : ''}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 22,
                  height: 22,
                  borderRadius: 6,
                  fontSize: 13,
                  background: isActive ? 'linear-gradient(135deg, #10b981, #059669)' : 'transparent',
                  transition: 'background 0.2s, transform 0.2s',
                  transform: isActive ? 'scale(1.05)' : 'scale(1)',
                  filter: isActive ? 'brightness(0) invert(1)' : 'none',
                  flexShrink: 0,
                }}
              >
                {t.icon}
              </span>
              <span style={{ whiteSpace: 'nowrap' }}>{t.label}</span>

              {/* Dot actif */}
              {isActive && (
                <span style={{
                  width: 5, height: 5, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  flexShrink: 0,
                  animation: 'navDotPulse 2s infinite',
                }} />
              )}
            </button>
          );
        })}
      </div>

      {/* Contenu avec transition */}
      <div key={contentKey} className="subtab-content-enter">
        {children(active)}
      </div>
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
      const validTabs = new Set(['overview','reports','analyse','valorization','citoyens','admin','settings']);
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
  const [showExportModal,   setShowExportModal]   = useState(false);
  const [dashSettings,      setDashSettings]      = useState(() => {
    try {
      const s = localStorage.getItem('remine_settings');
      return s ? JSON.parse(s) : {};
    } catch { return {}; }
  });
  const [deleteDemoLoading, setDeleteDemoLoading] = useState(false);
  const [showDeleteDemoConfirm, setShowDeleteDemoConfirm] = useState(false);
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

  const TYPE_FR_SSE = {
    water_pollution:'Pollution eau', air_pollution:'Pollution air',
    soil_contamination:'Contamination sol', waste_deposit:'Dépôt déchets',
    dust:'Poussière', abandoned_site:'Site abandonné',
    noise_pollution:'Pollution sonore', other:'Autre',
  };

  useSocket({
    enabled: true,
    onNewReport: React.useCallback((data) => {
      setRtBadge(b => b + 1);
      const type = TYPE_FR_SSE[data.reportType] || data.reportType || 'Signalement';
      const city = data.city ? ` — ${data.city}` : '';
      const isCritical = data.severity === 'critical';
      showRtToast(
        isCritical ? `🚨 Signalement critique : ${type}${city}` : `📬 Nouveau signalement : ${type}${city}`,
        isCritical ? 'error' : 'info'
      );
      refetchAll();
    }, [refetchAll, showRtToast]),

    onReportUpdated: React.useCallback((data) => {
      refetchAll();
    }, [refetchAll]),

    onReportDeleted: React.useCallback((data) => {
      refetchAll();
      showRtToast('🗑️ Un signalement a été supprimé', 'warning');
    }, [refetchAll, showRtToast]),

    onNewComment: React.useCallback((data) => {
      showRtToast('💬 Nouveau commentaire sur un signalement', 'info');
    }, [showRtToast]),

    onNewMessage: React.useCallback((data) => {
      showRtToast(`✉️ Message envoyé à ${data.to?.name || 'un citoyen'}`, 'success');
    }, [showRtToast]),

    onReportViral: React.useCallback((data) => {
      const type = TYPE_FR_SSE[data.type] || data.type || 'Signalement';
      showRtToast(`🔥 Signalement viral ! Score ${data.score} — ${type}${data.city ? ` à ${data.city}` : ''}`, 'warning');
      setRtBadge(b => b + 1);
    }, [showRtToast]),

    onCriticalReport: React.useCallback((data) => {
      const type = TYPE_FR_SSE[data.type] || data.type || 'Signalement';
      showRtToast(`🚨 URGENT : ${type}${data.city ? ` à ${data.city}` : ''}`, 'error');
      setRtBadge(b => b + 1);
      refetchAll();
    }, [showRtToast, refetchAll]),
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

  const VALID_TABS = useMemo(() => new Set(['overview','reports','analyse','valorization','citoyens','admin','settings']), []);

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
      const tabIds = ['overview','reports','analyse','valorization','citoyens','admin','settings'];
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

  // Appliquer les settings sauvegardés au montage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('remine_settings');
      if (!saved) return;
      const s = JSON.parse(saved);
      if (s.fontSize) {
        const sizes = { sm: '13px', md: '14px', lg: '16px' };
        document.documentElement.style.fontSize = sizes[s.fontSize] || '14px';
      }
      if (s.accentColor) {
        document.documentElement.style.setProperty('--brand-500', s.accentColor);
        document.documentElement.style.setProperty('--brand-600', s.accentColor);
      }
      if (s.compactMode) document.documentElement.classList.add('compact');
      if (s.animationsEnabled === false) {
        document.documentElement.style.setProperty('--duration-normal', '0ms');
        document.documentElement.style.setProperty('--duration-fast', '0ms');
      }
      if (s.sidebarCollapsed !== undefined) setCollapsed(s.sidebarCollapsed);
      setDashSettings(s);
    } catch {}
  }, []);

  const handleDeleteDemo = useCallback(async (deleteUser = false) => {
    setDeleteDemoLoading(true);
    try {
      const url = deleteUser ? '/api/admin/demo-data?deleteUser=true' : '/api/admin/demo-data';
      const res = await dashboardAPI.request(url, { method: 'DELETE' });
      if (res?.success) {
        notify(res.message || 'Données démo supprimées', 'success');
        refreshData();
      } else {
        notify(res?.error || 'Erreur lors de la suppression', 'error');
      }
    } catch {
      notify('Erreur réseau', 'error');
    } finally {
      setDeleteDemoLoading(false);
      setShowDeleteDemoConfirm(false);
    }
  }, [notify]);

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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* ══ LIGNE 1 : 4 KPI cards ══ */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
              {[
                dashSettings.showKpiReports  !== false && { label: 'Signalements', value: memoizedStats?.overview?.totalReports || 0,  icon: <ClipboardList size={22}/>, color: '#3b82f6', bg: darkMode ? 'rgba(30,58,138,0.2)'  : '#eff6ff', sub: `${memoizedStats?.overview?.activeReports || 0} actifs`,      trend: null },
                dashSettings.showKpiResolved !== false && { label: 'Résolus',      value: memoizedStats?.overview?.resolvedReports || 0, icon: <CheckCircle   size={22}/>, color: '#10b981', bg: darkMode ? 'rgba(6,78,59,0.2)'   : '#ecfdf5', sub: `${Math.round(memoizedStats?.overview?.resolutionRate || 0)}% taux`, trend: 'up' },
                dashSettings.showKpiUrgent   !== false && { label: 'Urgents',      value: urgentCount,                                   icon: <AlertTriangle size={22}/>, color: '#ef4444', bg: darkMode ? 'rgba(69,10,10,0.25)' : '#fef2f2', sub: 'Nécessitent action',  trend: urgentCount > 0 ? 'warn' : null },
                dashSettings.showKpiCitizens !== false && { label: 'Citoyens',     value: memoizedStats?.overview?.totalUsers || 0,     icon: <UserCheck     size={22}/>, color: '#8b5cf6', bg: darkMode ? 'rgba(46,16,101,0.2)' : '#f5f3ff', sub: 'inscrits',            trend: 'up' },
              ].filter(Boolean).map((s, i) => (
                <div key={s.label}
                  style={{
                    background: darkMode ? '#1e293b' : '#fff',
                    borderRadius: 20, padding: '18px 20px',
                    border: `1px solid ${darkMode ? '#334155' : '#f1f5f9'}`,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                    animation: `statCardIn 0.45s cubic-bezier(0.22,1,0.36,1) ${i * 0.07}s both`,
                    cursor: 'default', position: 'relative', overflow: 'hidden',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = `0 12px 32px ${s.color}28`; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)';    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)'; }}
                >
                  {/* Fond décoratif */}
                  <div style={{ position: 'absolute', top: -12, right: -12, fontSize: 56, opacity: 0.055, userSelect: 'none', pointerEvents: 'none' }}>{s.icon}</div>

                  {/* Header */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
                    <span
                      style={{ width: 46, height: 46, borderRadius: 14, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, boxShadow: `0 4px 14px ${s.color}25`, flexShrink: 0, transition: 'transform 0.35s cubic-bezier(0.34,1.56,0.64,1)' }}
                      onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.18) rotate(-8deg)'}
                      onMouseLeave={e => e.currentTarget.style.transform = 'scale(1) rotate(0)'}
                    >{s.icon}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 99, background: s.trend === 'warn' ? '#fee2e2' : s.trend === 'up' ? '#dcfce7' : (darkMode ? '#0f172a' : '#f8fafc'), color: s.trend === 'warn' ? '#dc2626' : s.trend === 'up' ? '#16a34a' : (darkMode ? '#475569' : '#9ca3af') }}>
                      {s.sub}
                    </span>
                  </div>

                  {/* Valeur */}
                  <p style={{ fontSize: 36, fontWeight: 900, color: darkMode ? '#f1f5f9' : '#0f172a', margin: 0, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{s.value}</p>
                  <p style={{ fontSize: 12, color: darkMode ? '#64748b' : '#9ca3af', marginTop: 5, fontWeight: 500 }}>{s.label}</p>

                  {/* Barre de progression */}
                  <div style={{ marginTop: 14, height: 4, borderRadius: 4, background: darkMode ? '#334155' : '#f1f5f9', overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 4, background: `linear-gradient(90deg, ${s.color}, ${s.color}88)`, width: s.value > 0 ? '100%' : '0%', transition: 'width 1.2s cubic-bezier(0.22,1,0.36,1)' }} />
                  </div>
                </div>
              ))}
            </div>

            {/* ══ LIGNE 2 : Signalements récents + Jauge résolution ══ */}
            <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: 14 }}>

              {/* Signalements récents */}
              <div style={{ background: darkMode ? '#1e293b' : '#fff', borderRadius: 20, border: `1px solid ${darkMode ? '#334155' : '#f1f5f9'}`, padding: '18px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 800, color: darkMode ? '#f1f5f9' : '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 28, height: 28, background: darkMode ? '#0f172a' : '#f1f5f9', borderRadius: 8, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🕐</span>
                    Signalements récents
                  </h3>
                  <button onClick={() => handleTabChange('reports')} style={{ fontSize: 11, color: '#10b981', fontWeight: 700, background: darkMode ? 'rgba(16,185,129,0.1)' : '#ecfdf5', border: 'none', cursor: 'pointer', padding: '4px 10px', borderRadius: 99 }}>
                    Voir tout →
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {memoizedReports.slice(0, 6).length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '24px 0', color: darkMode ? '#475569' : '#94a3b8', fontSize: 13 }}>Aucun signalement</div>
                  ) : memoizedReports.slice(0, 6).map((r, i) => {
                    const SEV_COLOR = { critical: '#dc2626', high: '#f97316', medium: '#f59e0b', low: '#22c55e' };
                    const STA_LABEL = { new: 'Nouveau', verified: 'Vérifié', in_progress: 'En cours', resolved: 'Résolu', rejected: 'Rejeté' };
                    const TYPE_ICO  = { water_pollution: '💧', air_pollution: '💨', soil_contamination: '🟤', waste_deposit: '🗑️', dust: '🌫️', abandoned_site: '🏚️', noise_pollution: '🔊', other: '⚠️' };
                    const c = SEV_COLOR[r.severity] || '#6b7280';
                    const timeAgo = (() => {
                      const diff = Date.now() - new Date(r.createdAt);
                      const h = Math.floor(diff / 3600000);
                      const d = Math.floor(diff / 86400000);
                      return d > 0 ? `il y a ${d}j` : h > 0 ? `il y a ${h}h` : 'récent';
                    })();
                    return (
                      <div key={r._id || i}
                        onClick={() => handleTabChange('reports', r._id || r.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 10px', borderRadius: 12, cursor: 'pointer', animation: `statCardIn 0.4s ease ${i * 0.05}s both`, transition: 'background 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.background = darkMode ? '#0f172a' : '#f8fafc'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: `${c}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                          {TYPE_ICO[r.type] || '⚠️'}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 12, fontWeight: 700, color: darkMode ? '#e2e8f0' : '#0f172a', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {r.title || r.description?.substring(0, 55) || 'Sans titre'}
                          </p>
                          <p style={{ fontSize: 11, color: darkMode ? '#64748b' : '#94a3b8', margin: '2px 0 0', display: 'flex', gap: 6 }}>
                            <span>📍 {r.location?.city || r.location?.address?.substring(0, 25) || '—'}</span>
                            <span style={{ opacity: 0.5 }}>·</span>
                            <span>{timeAgo}</span>
                          </p>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: `${c}18`, color: c, border: `1px solid ${c}30` }}>{r.severity}</span>
                          <span style={{ fontSize: 10, color: darkMode ? '#475569' : '#94a3b8', fontWeight: 500 }}>{STA_LABEL[r.status] || r.status}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Jauge de résolution */}
              <div style={{ background: darkMode ? '#1e293b' : '#fff', borderRadius: 20, border: `1px solid ${darkMode ? '#334155' : '#f1f5f9'}`, padding: '18px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', gap: 14 }}>
                <h3 style={{ fontSize: 14, fontWeight: 800, color: darkMode ? '#f1f5f9' : '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 28, height: 28, background: '#dcfce7', borderRadius: 8, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🎯</span>
                  Résolution
                </h3>
                {(() => {
                  const rate  = Math.round(memoizedStats?.overview?.resolutionRate || 0);
                  const R     = 44, circ = 2 * Math.PI * R;
                  const dash  = (rate / 100) * circ;
                  const color = rate >= 70 ? '#10b981' : rate >= 40 ? '#f59e0b' : '#ef4444';
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
                      <svg width="116" height="116" viewBox="0 0 116 116">
                        {/* Cercle de fond */}
                        <circle cx="58" cy="58" r={R} fill="none" stroke={darkMode ? '#334155' : '#f1f5f9'} strokeWidth="11" />
                        {/* Arc coloré */}
                        <circle cx="58" cy="58" r={R} fill="none" stroke={color} strokeWidth="11"
                          strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round"
                          transform="rotate(-90 58 58)"
                          style={{ transition: 'stroke-dasharray 1.4s cubic-bezier(0.22,1,0.36,1)' }}
                        />
                        {/* Texte central */}
                        <text x="58" y="53" textAnchor="middle" style={{ fontSize: 24, fontWeight: 900, fill: darkMode ? '#f1f5f9' : '#0f172a', fontFamily: 'system-ui' }}>{rate}%</text>
                        <text x="58" y="69" textAnchor="middle" style={{ fontSize: 9, fill: darkMode ? '#64748b' : '#94a3b8', fontFamily: 'system-ui', fontWeight: 600, letterSpacing: 0.5 }}>RÉSOLUTION</text>
                      </svg>

                      {/* Mini légende */}
                      {[
                        { label: 'Résolus',  value: memoizedStats?.overview?.resolvedReports || 0, color: '#10b981' },
                        { label: 'Actifs',   value: memoizedStats?.overview?.activeReports   || 0, color: '#3b82f6' },
                        { label: 'Urgents',  value: urgentCount,                                   color: '#ef4444'  },
                      ].map(s => (
                        <div key={s.label} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                            <span style={{ width: 9, height: 9, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                            <span style={{ fontSize: 12, color: darkMode ? '#94a3b8' : '#6b7280' }}>{s.label}</span>
                          </div>
                          <span style={{ fontSize: 14, fontWeight: 900, color: s.color, fontVariantNumeric: 'tabular-nums' }}>{s.value}</span>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* ══ LIGNE 3 : Flux temps réel ══ */}
            {dashSettings.showLiveFeed !== false && <LiveFeed reports={memoizedReports} onNavigate={handleTabChange} />}

            {/* ══ LIGNE 4 : Impact env + Activité 7j + Alertes ══ */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14 }}>

              {/* Impact + Activité */}
              <div style={{ background: darkMode ? '#1e293b' : '#fff', borderRadius: 20, border: `1px solid ${darkMode ? '#334155' : '#f1f5f9'}`, padding: '20px 22px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                {dashSettings.showImpact === false ? null : <h3 style={{ fontSize: 14, fontWeight: 800, color: darkMode ? '#f1f5f9' : '#0f172a', margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 28, height: 28, background: '#dcfce7', borderRadius: 8, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🌍</span>
                  Impact environnemental
                </h3>}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
                  {[
                    { label: 'CO₂ évité',       value: `${(impactData.co2Saved||0).toLocaleString()}t`,                  bg: '#dcfce7', color: '#16a34a', icon: <Leaf       size={18}/> },
                    { label: 'Eau protégée',     value: `${((impactData.waterProtected||0)/1000).toFixed(0)}k L`,          bg: '#dbeafe', color: '#1d4ed8', icon: <Droplets   size={18}/> },
                    { label: 'Déchets traités',  value: `${(impactData.wasteProcessed||0).toLocaleString()}t`,             bg: '#fef9c3', color: '#a16207', icon: <Recycle    size={18}/> },
                    { label: 'Revenus',          value: formatFCFA(impactData.revenueGenerated / EUR_TO_FCFA),             bg: '#ede9fe', color: '#6d28d9', icon: <DollarSign size={18}/> },
                  ].map(m => (
                    <div key={m.label} style={{ borderRadius: 14, padding: '12px 14px', background: darkMode ? `${m.color}18` : m.bg, border: `1px solid ${m.color}25` }}>
                      <span style={{ fontSize: 18 }}>{m.icon}</span>
                      <p style={{ fontSize: 18, fontWeight: 900, color: m.color, margin: '6px 0 2px', fontVariantNumeric: 'tabular-nums' }}>{m.value}</p>
                      <p style={{ fontSize: 10, color: darkMode ? `${m.color}99` : m.color, margin: 0, opacity: 0.75, fontWeight: 600 }}>{m.label}</p>
                    </div>
                  ))}
                </div>

                {/* Graphique activité 7j */}
                <div style={{ borderTop: `1px solid ${darkMode ? '#334155' : '#f1f5f9'}`, paddingTop: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <h4 style={{ fontSize: 12, fontWeight: 700, color: darkMode ? '#94a3b8' : '#6b7280', margin: 0 }}>Activité — 7 derniers jours</h4>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#10b981', background: darkMode ? 'rgba(16,185,129,0.1)' : '#dcfce7', padding: '2px 8px', borderRadius: 99 }}>
                      {activityData?.reduce((s, d) => s + (d.count || 0), 0) ?? 0} signalement{(activityData?.reduce((s, d) => s + (d.count || 0), 0) ?? 0) > 1 ? 's' : ''}
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
                      <div style={{ background: darkMode ? '#0f172a' : '#f8fafc', borderRadius: 14, padding: '12px 14px', border: `1px solid ${darkMode ? '#1e293b' : '#f1f5f9'}` }}>
                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 64, marginBottom: 8 }}>
                          {days.map((day, i) => {
                            const pct   = Math.max(((day.count || 0) / maxCount) * 100, day.count > 0 ? 10 : 4);
                            const today = i === days.length - 1;
                            return (
                              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%', gap: 3 }}
                                   title={`${day.label} : ${day.count || 0} signalement(s)`}>
                                {day.count > 0 && <span style={{ fontSize: 8, fontWeight: 800, color: today ? '#059669' : (darkMode ? '#64748b' : '#94a3b8') }}>{day.count}</span>}
                                <div style={{
                                  width: '100%', borderRadius: '4px 4px 2px 2px',
                                  height: `${pct}%`, minHeight: 4,
                                  background: today ? 'linear-gradient(180deg, #10b981, #059669)' : (darkMode ? '#334155' : '#d1fae5'),
                                  transition: `height 0.8s cubic-bezier(0.22,1,0.36,1) ${i * 0.06}s`,
                                  boxShadow: today ? '0 2px 8px rgba(16,185,129,0.4)' : 'none',
                                }} />
                              </div>
                            );
                          })}
                        </div>
                        <div style={{ display: 'flex', gap: 5 }}>
                          {days.map((day, i) => {
                            const today = i === days.length - 1;
                            return (
                              <div key={i} style={{ flex: 1, textAlign: 'center' }}>
                                <span style={{ fontSize: 8, fontWeight: today ? 800 : 500, color: today ? '#10b981' : (darkMode ? '#475569' : '#9ca3af') }}>
                                  {(day.label || '').split(' ')[0]}
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
              <div style={{ background: darkMode ? '#1e293b' : '#fff', borderRadius: 20, border: `1px solid ${darkMode ? '#334155' : '#f1f5f9'}`, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '16px 18px', borderBottom: `1px solid ${darkMode ? '#334155' : '#f1f5f9'}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h3 style={{ fontSize: 14, fontWeight: 800, color: darkMode ? '#f1f5f9' : '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 28, height: 28, background: '#fee2e2', borderRadius: 8, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🔔</span>
                    Alertes
                  </h3>
                  {urgentCount > 0 && (
                    <span style={{ background: '#ef4444', color: '#fff', fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 99 }}>{urgentCount}</span>
                  )}
                </div>
                <div style={{ flex: 1, padding: 12, overflowY: 'auto' }}>
                  <SmartAlerts reports={memoizedReports} stats={memoizedStats} onNavigate={setActiveTab} />
                </div>
              </div>
            </div>

            {/* ══ LIGNE 5 : Priorités IA ══ */}
            {dashSettings.showAIPriority !== false && (
              <div style={{ background: darkMode ? '#1e293b' : '#fff', borderRadius: 20, border: `1px solid ${darkMode ? '#334155' : '#f1f5f9'}`, padding: '18px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                <AIPriorityEngine reports={memoizedReports} onPriorityUpdate={() => {}} />
              </div>
            )}

          </div>
        );

      case 'reports':
        return (
          <TabGroup
            tabs={[
              { id: 'list',  label: 'Liste',   icon: <ClipboardList size={14}/> },
              { id: 'map',   label: 'Carte',   icon: <MapPin size={14}/> },
              { id: 'votes', label: 'Votes',   icon: <TrendingUp size={14}/> },
            ]}
          >
            {(sub) => sub === 'votes'
              ? <TopVotedReports onReportClick={(r) => { setSelectedReport(r); handleTabChange('reports'); }} />
              : sub === 'map'
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
              { id: 'ia',        label: 'Insights IA', icon: <Zap size={14}/> },
              { id: 'analytics', label: 'Analytics',   icon: '↗' },
              { id: 'stats',     label: 'Statistiques', icon: <Activity   size={14}/> },
              { id: 'regions',   label: 'Régions',      icon: <Globe      size={14}/> },
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
              { id: 'users',     label: 'Utilisateurs', icon: <Users size={14}/> },
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
              { id: 'tags',       label: 'Tags',          icon: <Zap        size={14}/> },
              { id: 'autoreport', label: 'Rapport auto',  icon: <Download   size={14}/> },
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



      case 'settings':
        return (
          <SettingsPage
            currentDarkMode={darkMode}
            onDarkModeChange={setDarkMode}
            autoRefresh={autoRefresh}
            onAutoRefreshChange={setAutoRefresh}
            refreshInterval={refreshInterval}
            onRefreshIntervalChange={setRefreshInterval}
            onSettingsChange={(s) => {
              setDashSettings(s);
              if (s.sidebarCollapsed !== undefined) setCollapsed(s.sidebarCollapsed);
              if (s.fontSize) {
                const sizes = { sm: '13px', md: '14px', lg: '16px' };
                document.documentElement.style.fontSize = sizes[s.fontSize] || '14px';
              }
              document.documentElement.classList.toggle('compact', !!s.compactMode);
            }}
            onCreateDemo={handleDemoData}
            onDeleteDemo={() => setShowDeleteDemoConfirm(true)}
          />
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
                <img src={LOGO_BASE64} alt="ReMine" style={{ width:38, height:38, borderRadius:10, objectFit:'cover', flexShrink:0, boxShadow:'0 2px 8px rgba(0,0,0,0.12)' }} />
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
            <img src={LOGO_BASE64} alt="ReMine" style={{ width:38, height:38, borderRadius:10, objectFit:'cover', flexShrink:0, boxShadow:'0 2px 8px rgba(0,0,0,0.12)' }} />
            {!collapsed && (
              <div className="min-w-0">
                <p className="font-bold text-gray-900 dark:text-white text-sm leading-tight">ReMine</p>
                <p className="text-xs text-emerald-600 font-medium">Citizen Track</p>
              </div>
            )}
          </div>
          <button onClick={() => setCollapsed(c => !c)}
                  className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 flex-shrink-0 transition-colors"
                  title={collapsed ? 'Étendre la sidebar' : 'Réduire la sidebar'}>
            {collapsed
              ? <ChevronDown size={14} style={{ transform: 'rotate(-90deg)' }} />
              : <ChevronDown size={14} style={{ transform: 'rotate(90deg)' }} />}
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

            {/* Auto-refresh → configurable dans Paramètres > Données */}

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

            <button
              onClick={() => setShowExportModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-slate-700 hover:bg-slate-800 border border-slate-700 rounded-lg transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span className="hidden sm:inline">Exporter</span>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Données démo → Paramètres > Avancé */}

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
            <div key={activeTab} className="tab-content-enter">
              {renderContent()}
            </div>
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
              <span><kbd className="font-mono bg-white border border-gray-200 rounded px-1">1-7</kbd> onglets</span>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmation suppression données démo */}
      {showDeleteDemoConfirm && (
        <div style={{ position:'fixed', top:0, left:0, right:0, bottom:0, zIndex:99999, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.5)', backdropFilter:'blur(4px)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowDeleteDemoConfirm(false); }}>
          <div style={{ background:'#fff', borderRadius:20, padding:'28px 32px', width:'min(440px,92vw)', boxShadow:'0 24px 64px rgba(0,0,0,0.2)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:14 }}>
              <span style={{ width:44, height:44, background:'#fee2e2', borderRadius:14, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0 }}>🗑️</span>
              <div>
                <h3 style={{ fontSize:16, fontWeight:800, color:'#0f172a', margin:0 }}>Supprimer les données démo ?</h3>
                <p style={{ fontSize:11, color:'#ef4444', margin:'3px 0 0', fontWeight:600 }}>Action irréversible</p>
              </div>
            </div>
            <p style={{ fontSize:13, color:'#475569', lineHeight:1.7, margin:'0 0 8px' }}>
              Tous les signalements créés par l'utilisateur <strong>demo@remine.sn</strong> seront définitivement supprimés.
            </p>
            <p style={{ fontSize:12, color:'#94a3b8', margin:'0 0 22px', lineHeight:1.6, background:'#f8fafc', padding:'10px 14px', borderRadius:10, border:'1px solid #f1f5f9' }}>
              💡 Les signalements réels créés par de vrais citoyens ne seront pas affectés.
            </p>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <label style={{ display:'flex', alignItems:'center', gap:7, cursor:'pointer', flex:1 }}>
                <input type="checkbox" id="deleteUserCheck" style={{ accentColor:'#ef4444' }} />
                <span style={{ fontSize:12, color:'#64748b' }}>Supprimer aussi l'utilisateur démo</span>
              </label>
              <button onClick={() => setShowDeleteDemoConfirm(false)}
                style={{ padding:'9px 18px', borderRadius:10, border:'1px solid #e2e8f0', background:'transparent', color:'#64748b', fontSize:13, fontWeight:600, cursor:'pointer' }}>
                Annuler
              </button>
              <button
                onClick={() => {
                  const deleteUser = document.getElementById('deleteUserCheck')?.checked;
                  handleDeleteDemo(deleteUser);
                }}
                disabled={deleteDemoLoading}
                style={{ padding:'9px 18px', borderRadius:10, border:'none', background:'linear-gradient(135deg,#ef4444,#dc2626)', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', boxShadow:'0 4px 12px rgba(239,68,68,0.35)', display:'flex', alignItems:'center', gap:6 }}>
                {deleteDemoLoading
                  ? <><span style={{ width:12, height:12, border:'2px solid rgba(255,255,255,0.5)', borderTopColor:'#fff', borderRadius:'50%', animation:'remine-spin 0.7s linear infinite', display:'inline-block' }} /> Suppression…</>
                  : <><span>🗑️</span> Supprimer</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {showExportModal && (
        <ExportModal
          onClose={() => setShowExportModal(false)}
          reports={memoizedReports}
          stats={memoizedStats}
        />
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
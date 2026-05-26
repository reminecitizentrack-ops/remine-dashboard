// hooks/useDashboardData.js - VERSION ULTRA-CORRIGÉE
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { dashboardAPI } from '../services/api';

// 🔥 FONCTION DE NETTOYAGE COMPLÈTE ET PROFONDE
const ultraDeepCleanData = (data) => {
  if (!data || typeof data !== 'object') return data;
  
  if (Array.isArray(data)) {
    return data.map(item => ultraDeepCleanData(item));
  }
  
  const cleaned = { ...data };
  
  Object.keys(cleaned).forEach(key => {
    const value = cleaned[key];
    
    // 🔥 CONVERTIR TOUS LES OBJETS EN STRINGS SÉCURISÉES
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      // Objets utilisateur/citoyen
      if (key === 'user' || key === 'citizen' || key === 'createdBy' || key === 'updatedBy') {
        cleaned[key] = value.name || value.firstName || value.email || value.username || 'Utilisateur';
      }
      // Objets d'adresse/location
      else if (key === 'address' || key === 'location') {
        cleaned[key] = value.formatted || value.street || value.city || value.address || 'Localisation inconnue';
      }
      // Objets de traitement
      else if (key === 'processing') {
        cleaned[key] = value.priority || 'medium';
      }
      // Métadonnées
      else if (key === 'metadata') {
        cleaned[key] = value.deviceType || 'web';
      }
      // Top citoyens
      else if (key === 'topCitizens') {
        // Géré séparément dans cleanStatsData
      }
      // Tous les autres objets → convertir en JSON
      else {
        try {
          cleaned[key] = JSON.stringify(value);
        } catch {
          cleaned[key] = '[Object]';
        }
      }
    }
    
    // Nettoyer récursivement
    if (value && typeof value === 'object') {
      cleaned[key] = ultraDeepCleanData(value);
    }
  });
  
  return cleaned;
};

// 🔥 FONCTION SPÉCIALISÉE POUR LES STATS
const cleanStatsData = (stats) => {
  if (!stats) return null;
  
  const cleaned = { ...stats };
  
  // Nettoyer overview (convertir en simple objet si nécessaire)
  if (cleaned.overview && typeof cleaned.overview === 'object') {
    cleaned.overview = {
      totalReports: cleaned.overview.totalReports || 0,
      activeReports: cleaned.overview.activeReports || 0,
      resolvedReports: cleaned.overview.resolvedReports || 0,
      resolutionRate: cleaned.overview.resolutionRate || 0,
      totalUsers: cleaned.overview.totalUsers || 0
    };
  }
  
  // Nettoyer reportsByType et reportsByStatus (les convertir en objets simples)
  if (cleaned.reportsByType && typeof cleaned.reportsByType === 'object') {
    cleaned.reportsByType = { ...cleaned.reportsByType };
  }
  
  if (cleaned.reportsByStatus && typeof cleaned.reportsByStatus === 'object') {
    cleaned.reportsByStatus = { ...cleaned.reportsByStatus };
  }
  
  // Nettoyer recentReports
  if (cleaned.recentReports && Array.isArray(cleaned.recentReports)) {
    cleaned.recentReports = cleanReportsData(cleaned.recentReports);
  }
  
  // Nettoyer topCitizens
  if (cleaned.topCitizens && Array.isArray(cleaned.topCitizens)) {
    cleaned.topCitizens = cleaned.topCitizens.map(citizen => ({
      _id: citizen._id,
      reports: citizen.reports,
      citizen: typeof citizen.citizen === 'object'
        ? citizen.citizen.name || citizen.citizen.firstName || citizen.citizen.email || 'Citoyen'
        : citizen.citizen
    }));
  }
  
  // Nettoyer recentActivity
  if (cleaned.recentActivity && typeof cleaned.recentActivity === 'object') {
    cleaned.recentActivity = {
      reportsLast7Days: cleaned.recentActivity.reportsLast7Days || 0,
      usersLast7Days: cleaned.recentActivity.usersLast7Days || 0
    };
  }
  
  return cleaned;
};

// FONCTION POUR LES REPORTS — préserve location comme objet complet
const cleanReportsData = (reports) => {
  if (!Array.isArray(reports)) return [];

  return reports.map(report => {
    // Préserver l'objet location complet pour les cartes, hotspots et filtres
    const locationObj = typeof report.location === 'object' && report.location !== null
      ? report.location
      : {};

    // Citizen : préserver l'objet pour le nom affiché dans les tableaux
    const citizenObj = typeof report.citizen === 'object' && report.citizen !== null
      ? report.citizen
      : null;

    return {
      _id:         report._id,
      id:          report.id,
      type:        report.type,
      title:       report.title,
      description: report.description,
      status:      report.status,
      severity:    report.severity,
      tags:        Array.isArray(report.tags) ? report.tags : [],
      voteCount:   report.voteCount || 0,
      isVerified:  report.isVerified || false,
      confidenceScore: report.confidenceScore,
      images:      Array.isArray(report.images) ? report.images : [],
      notes:       report.notes,
      createdAt:   report.createdAt,
      updatedAt:   report.updatedAt,
      resolvedAt:  report.resolvedAt,

      // ✅ location préservé comme OBJET complet (city, region, address, latitude, longitude)
      location: {
        city:      locationObj.city      || null,
        region:    locationObj.region    || null,
        address:   locationObj.address   || locationObj.formatted || null,
        latitude:  locationObj.latitude  || report.latitude  || null,
        longitude: locationObj.longitude || report.longitude || null,
        coordinates: locationObj.coordinates || null,
      },

      // Raccourcis pratiques pour les composants qui lisent à plat
      latitude:  locationObj.latitude  || report.latitude  || null,
      longitude: locationObj.longitude || report.longitude || null,
      address:   locationObj.address   || locationObj.formatted || report.address || null,

      // citizen : préservé comme objet pour affichage nom + email
      citizen: citizenObj || report.citizen,

      // Champs legacy nettoyés
      processing: report.processing?.priority || 'medium',
      metadata:   report.metadata?.deviceType || 'web',
    };
  });
};

export const useDashboardData = () => {
  const queryClient = useQueryClient();

  // Query pour les signalements
  const { 
    data: reports, 
    isLoading: reportsLoading, 
    error: reportsError,
    refetch: refetchReports 
  } = useQuery({
    queryKey: ['reports'],
    queryFn: async () => {
      try {
        const response = await dashboardAPI.getReports({ 
          limit: 100, 
          sortBy: 'createdAt', 
          sortOrder: 'desc' 
        });
        
        let reportsData = [];
        if (response?.success) {
          if (Array.isArray(response.data?.reports)) {
            reportsData = response.data.reports;
          } else if (Array.isArray(response.data)) {
            reportsData = response.data;
          } else if (Array.isArray(response.reports)) {
            reportsData = response.reports;
          }
        }
        
        
        // 🔥 NETTOYAGE SPÉCIALISÉ DES REPORTS
        const cleanedReports = cleanReportsData(reportsData);
        
        return cleanedReports;
      } catch (error) {
        console.error('❌ Erreur fetch reports:', error);
        return [];
      }
    },
    refetchInterval: 60000,
    staleTime: 30000,
    retry: 1,
    retryDelay: 2000,
  });

  // Query pour les statistiques
  const { data: stats, isLoading: statsLoading, error: statsError } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      try {
        const response = await dashboardAPI.getStats();
        const statsData = response?.success ? response.data : null;
        
        // 🔥 NETTOYAGE COMPLET DES STATS
        const cleanedStats = cleanStatsData(statsData);
        
        return cleanedStats;
      } catch (error) {
        console.error('❌ Erreur fetch stats:', error);
        return null;
      }
    },
    refetchInterval: 30000,
    staleTime: 25000,
  });

  // Query pour les utilisateurs
  const { data: users, isLoading: usersLoading, error: usersError } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      try {
        const response = await dashboardAPI.getUsers();
        const usersData = response?.success ? response.data : [];
        return ultraDeepCleanData(usersData);
      } catch (error) {
        console.error('❌ Erreur fetch users:', error);
        return [];
      }
    },
    refetchInterval: 60000,
    staleTime: 50000,
  });

  // Query pour les analytics avancés
  const { data: analytics, isLoading: analyticsLoading, error: analyticsError } = useQuery({
    queryKey: ['advanced-analytics'],
    queryFn: async () => {
      try {
        const response = await dashboardAPI.getAdvancedAnalytics();
        return response?.success ? ultraDeepCleanData(response.data) : null;
      } catch (error) {
        console.error('❌ Erreur fetch analytics:', error);
        return null;
      }
    },
    refetchInterval: 60000,
    staleTime: 30000,
  });

  // Query pour les projets de valorisation
  const { data: valorizationProjects, isLoading: projectsLoading, error: projectsError } = useQuery({
    queryKey: ['valorization-projects'],
    queryFn: async () => {
      try {
        const response = await dashboardAPI.getValorizationProjects();
        const projectsData = response?.success ? response.data : [];
        return ultraDeepCleanData(projectsData);
      } catch (error) {
        console.error('❌ Erreur fetch projects:', error);
        return [];
      }
    },
    refetchInterval: 120000,
    staleTime: 60000,
  });

  // Query pour les métriques d'impact
  const { data: impactMetrics, isLoading: impactLoading, error: impactError } = useQuery({
    queryKey: ['impact-metrics'],
    queryFn: async () => {
      try {
        const response = await dashboardAPI.getImpactMetrics();
        return response?.success ? ultraDeepCleanData(response.data) : null;
      } catch (error) {
        console.error('❌ Erreur fetch impact:', error);
        return null;
      }
    },
    refetchInterval: 180000,
    staleTime: 120000,
  });

  // Query pour les options de filtres
  const { data: filterOptions, isLoading: filterOptionsLoading } = useQuery({
    queryKey: ['filter-options'],
    queryFn: async () => {
      try {
        const response = await dashboardAPI.getFilterOptions();
        return response?.success ? ultraDeepCleanData(response.data) : null;
      } catch (error) {
        console.error('❌ Erreur fetch filter options:', error);
        return null;
      }
    },
    staleTime: 300000,
  });

  // [RESTE DU CODE IDENTIQUE - mutations, états, etc.]
  const updateReportMutation = useMutation({
    mutationFn: ({ reportId, status }) => 
      dashboardAPI.updateReportStatus(reportId, status),
    onSuccess: () => {
      queryClient.invalidateQueries(['dashboard-stats']);
      queryClient.invalidateQueries(['reports']);
      queryClient.invalidateQueries(['advanced-analytics']);
    },
  });

  const createDemoDataMutation = useMutation({
    mutationFn: () => dashboardAPI.createDemoData(),
    onSuccess: () => {
      queryClient.invalidateQueries(['dashboard-stats']);
      queryClient.invalidateQueries(['reports']);
      queryClient.invalidateQueries(['users']);
      queryClient.invalidateQueries(['advanced-analytics']);
      queryClient.invalidateQueries(['valorization-projects']);
      queryClient.invalidateQueries(['impact-metrics']);
    }
  });

  const exportDataMutation = useMutation({
    mutationFn: ({ filters, format }) => 
      dashboardAPI.exportData(filters, format),
  });

  // États de chargement combinés
  const isLoading = statsLoading || reportsLoading || usersLoading || analyticsLoading || projectsLoading || impactLoading;
  const error = statsError || reportsError || usersError || analyticsError || projectsError || impactError;

  // ✅ DONNÉES ULTRA-SÉCURISÉES
  const safeReports = Array.isArray(reports) ? reports : [];
  const safeStats = stats;
  const safeUsers = Array.isArray(users) ? users : [];
  const safeAnalytics = analytics;
  const safeProjects = Array.isArray(valorizationProjects) ? valorizationProjects : [];
  const safeImpact = impactMetrics;
  const safeFilterOptions = filterOptions;

  // VÉRIFICATION FINALE - SUPPRIMER LES LOGS QUI CAUSENT DES ERREURS


  return {
    // Données principales - ULTRA-SÉCURISÉES
    stats: safeStats,
    reports: safeReports,
    users: safeUsers,
    
    // Nouvelles données avancées
    analytics: safeAnalytics,
    valorizationProjects: safeProjects,
    impactMetrics: safeImpact,
    filterOptions: safeFilterOptions,
    
    // États de chargement
    isLoading,
    statsLoading,
    reportsLoading,
    usersLoading,
    analyticsLoading,
    projectsLoading,
    impactLoading,
    filterOptionsLoading,
    
    // Erreurs
    error,
    statsError,
    reportsError,
    usersError,
    analyticsError,
    projectsError,
    impactError,
    
    // Mutations
    updateReport: updateReportMutation.mutate,
    updateReportLoading: updateReportMutation.isLoading,
    createDemoData: createDemoDataMutation.mutate,
    createDemoDataLoading: createDemoDataMutation.isLoading,
    exportData: exportDataMutation.mutate,
    exportDataLoading: exportDataMutation.isLoading,
    
    // Rafraîchissement manuel
    refetchAll: () => {
      // React Query v5 : syntaxe { queryKey: [...] }
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['advanced-analytics'] });
      queryClient.invalidateQueries({ queryKey: ['valorization-projects'] });
      queryClient.invalidateQueries({ queryKey: ['impact-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['filter-options'] });
    },
    
    // Rafraîchissement spécifique
    refetchReports,
    refetchAnalytics: () => queryClient.invalidateQueries({ queryKey: ['advanced-analytics'] }),
    refetchProjects:  () => queryClient.invalidateQueries({ queryKey: ['valorization-projects'] }),
    refetchImpact:    () => queryClient.invalidateQueries({ queryKey: ['impact-metrics'] })
  };
};
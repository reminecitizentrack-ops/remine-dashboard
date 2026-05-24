// scripts/check-errors.js
function checkForCommonErrors() {
  const errors = [];
  
  // Vérifier les retours de fonctions dans des contextes texte
  const textContextIssues = [
    'RecentActivity.jsx - renderUserInfo dans span',
    'ReportsTable.jsx - renderUserInfo dans tableau'
  ];
  
  textContextIssues.forEach(issue => {
    console.warn(`⚠️  Vérifier: ${issue}`);
    errors.push(issue);
  });
  
  // Vérifier la gestion des tableaux
  const arraySafetyIssues = [
    'useDashboardData - Sécurisation des tableaux',
    'Tous les composants - Vérification Array.isArray'
  ];
  
  return errors;
}

checkForCommonErrors();
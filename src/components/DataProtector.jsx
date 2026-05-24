// components/DataProtector.jsx
import React from 'react';

// 🔥 FONCTION GLOBALE de protection
export const protectValue = (value) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map(protectValue).join(', ');
  
  // 🔥 FORCER la conversion des objets
  if (typeof value === 'object') {
    if (value.name !== undefined) return String(value.name);
    if (value.email !== undefined) return String(value.email);
    if (value.title !== undefined) return String(value.title);
    if (value.label !== undefined) return String(value.label);
    
    // Fallback : convertir en JSON
    try {
      return JSON.stringify(value);
    } catch {
      return '[Object]';
    }
  }
  
  return String(value);
};

// 🔥 COMPOSANT de protection pour l'affichage
export const SafeText = ({ children, fallback = '' }) => {
  try {
    const safeValue = protectValue(children);
    return <>{safeValue}</>;
  } catch (error) {
    console.error('❌ SafeText error:', error);
    return <>{fallback}</>;
  }
};

export default SafeText;
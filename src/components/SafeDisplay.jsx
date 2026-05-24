// components/SafeDisplay.jsx
import React from 'react';

export const SafeDisplay = ({ children, fallback = '-' }) => {
  const safeValue = React.useMemo(() => {
    if (children === null || children === undefined) return fallback;
    
    // Si c'est déjà une string, number, boolean
    if (typeof children !== 'object') return String(children);
    
    // Si c'est un objet, extraire les propriétés utiles
    if (typeof children === 'object') {
      if (children.name) return String(children.name);
      if (children.email) return String(children.email);
      if (children.firstName) return String(children.firstName);
      if (children.lastName) return String(children.lastName);
      if (children.label) return String(children.label);
      if (children.title) return String(children.title);
      if (children.formatted) return String(children.formatted);
      if (children.street) return String(children.street);
      if (children.city) return String(children.city);
      
      // Fallback: convertir en JSON
      try {
        return JSON.stringify(children);
      } catch {
        return '[Object]';
      }
    }
    
    return fallback;
  }, [children, fallback]);

  return <>{safeValue}</>;
};

export default SafeDisplay;
// hooks/useDebugData.js
import { useEffect } from 'react';

export const useDebugData = (data, name = 'Data') => {
  useEffect(() => {
    const findObjectsInReactChildren = (obj, path = 'root') => {
      if (!obj || typeof obj !== 'object') return;
      
      Object.entries(obj).forEach(([key, value]) => {
        const currentPath = `${path}.${key}`;
        
        // Vérifier si c'est un objet qui pourrait être utilisé comme enfant React
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          console.error(`🚨 OBJET DANGEREUX TROUVÉ: ${currentPath}`, value);
        }
        
        // Vérifier récursivement
        if (value && typeof value === 'object') {
          findObjectsInReactChildren(value, currentPath);
        }
      });
    };
    
    console.log(`🔍 Debug ${name}:`, data);
    findObjectsInReactChildren(data);
  }, [data, name]);
};
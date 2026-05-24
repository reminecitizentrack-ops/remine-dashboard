// hooks/useOptimizedData.js - Nouveau hook
import { useMemo, useCallback } from 'react';

export const useOptimizedData = (data) => {
  const memoizedData = useMemo(() => {
    return Array.isArray(data) ? data : [];
  }, [data]);

  const safeData = useMemo(() => {
    return memoizedData.map(item => {
      const safeItem = { ...item };
      
      // Sécuriser tous les champs objets
      Object.keys(safeItem).forEach(key => {
        const value = safeItem[key];
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          if (key === 'user' || key === 'citizen') {
            safeItem[key] = value.name || value.email || value.toString();
          } else {
            safeItem[key] = JSON.stringify(value);
          }
        }
      });
      
      return safeItem;
    });
  }, [memoizedData]);

  return safeData;
};
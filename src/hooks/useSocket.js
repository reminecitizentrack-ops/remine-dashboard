// hooks/useSocket.js — Temps réel via SSE (Server-Sent Events)
// Aucune dépendance externe — fonctionne avec le navigateur natif
import { useEffect, useRef, useCallback } from 'react';

const SSE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api') + '/events';

export function useSocket({ onNewReport, onReportUpdated, onReportDeleted, onNewComment, enabled = true } = {}) {
  const esRef        = useRef(null);
  const reconnectRef = useRef(null);
  const attemptsRef  = useRef(0);
  const MAX_ATTEMPTS = 5;

  const connect = useCallback(() => {
    if (typeof window === 'undefined' || !enabled) return;
    const token = localStorage.getItem('remine_admin_token');
    if (!token) return;

    // Construire l'URL avec le token en query param (SSE ne supporte pas les headers custom)
    const url = `${SSE_URL}?token=${encodeURIComponent(token)}`;
    const es  = new EventSource(url);

    es.addEventListener('new-report', (e) => {
      try { onNewReport?.(JSON.parse(e.data)); } catch {}
    });
    es.addEventListener('report-updated', (e) => {
      try { onReportUpdated?.(JSON.parse(e.data)); } catch {}
    });
    es.addEventListener('report-deleted', (e) => {
      try { onReportDeleted?.(JSON.parse(e.data)); } catch {}
    });
    es.addEventListener('new-comment', (e) => {
      try { onNewComment?.(JSON.parse(e.data)); } catch {}
    });
    es.addEventListener('ping', () => { attemptsRef.current = 0; });

    es.onopen = () => {
      console.log('📡 SSE connecté');
      attemptsRef.current = 0;
    };

    es.onerror = () => {
      es.close();
      esRef.current = null;
      if (attemptsRef.current >= MAX_ATTEMPTS) {
        console.warn('📡 SSE: trop de tentatives, abandon');
        return;
      }
      attemptsRef.current++;
      const delay = Math.min(1000 * 2 ** attemptsRef.current, 30000);
      console.log(`📡 SSE reconnexion dans ${delay / 1000}s (tentative ${attemptsRef.current})`);
      reconnectRef.current = setTimeout(connect, delay);
    };

    esRef.current = es;
  }, [enabled, onNewReport, onReportUpdated, onReportDeleted, onNewComment]);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectRef.current);
      esRef.current?.close();
      esRef.current = null;
    };
  }, [connect]);

  return { isConnected: () => esRef.current?.readyState === EventSource.OPEN };
}
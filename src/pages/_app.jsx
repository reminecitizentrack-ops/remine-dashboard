// pages/_app.jsx
import '../styles/globals.css';
import { GlobalErrorBoundary } from '../components/GlobalErrorBoundary';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

export default function App({ Component, pageProps }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000,
        cacheTime: 10 * 60 * 1000,
        retry: 2,
        refetchOnWindowFocus: false,
      },
    },
  }));

  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [displayedPage, setDisplayedPage] = useState({ Component, pageProps });
  const [fadeIn, setFadeIn] = useState(true);

  useEffect(() => {
    let progressInterval;

    const handleStart = () => {
      setLoading(true);
      setProgress(0);
      setFadeIn(false);
      progressInterval = setInterval(() => {
        setProgress(p => p < 85 ? p + Math.random() * 12 : p);
      }, 120);
    };

    const handleComplete = (url) => {
      clearInterval(progressInterval);
      setProgress(100);
      setTimeout(() => {
        setDisplayedPage({ Component, pageProps });
        setFadeIn(true);
        setLoading(false);
        setProgress(0);
      }, 150);
    };

    router.events.on('routeChangeStart', handleStart);
    router.events.on('routeChangeComplete', handleComplete);
    router.events.on('routeChangeError', handleComplete);

    return () => {
      clearInterval(progressInterval);
      router.events.off('routeChangeStart', handleStart);
      router.events.off('routeChangeComplete', handleComplete);
      router.events.off('routeChangeError', handleComplete);
    };
  }, [router, Component, pageProps]);

  // Sync page quand pas de transition
  useEffect(() => {
    if (!loading) {
      setDisplayedPage({ Component, pageProps });
    }
  }, [Component, pageProps, loading]);

  return (
    <QueryClientProvider client={queryClient}>
      <GlobalErrorBoundary>
        {/* Barre de progression en haut */}
        {loading && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0,
            height: 3, zIndex: 9999,
            background: 'rgba(16,185,129,0.15)',
          }}>
            <div style={{
              height: '100%',
              width: `${progress}%`,
              background: 'linear-gradient(90deg, #10b981, #059669, #34d399)',
              borderRadius: '0 4px 4px 0',
              transition: 'width 0.12s ease',
              boxShadow: '0 0 10px rgba(16,185,129,0.6)',
            }} />
          </div>
        )}

        {/* Spinner discret */}
        {loading && (
          <div style={{
            position: 'fixed', bottom: 24, right: 24,
            zIndex: 9999, display: 'flex', alignItems: 'center', gap: 8,
            background: '#fff', border: '1px solid #e5e7eb',
            borderRadius: 12, padding: '8px 14px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
            animation: 'fadeInUp 0.2s ease',
          }}>
            <div style={{
              width: 16, height: 16, borderRadius: '50%',
              border: '2px solid #d1fae5',
              borderTopColor: '#10b981',
              animation: 'spin 0.7s linear infinite',
            }} />
            <span style={{ fontSize: 13, color: '#6b7280', fontWeight: 500 }}>Chargement…</span>
          </div>
        )}

        {/* Page avec transition fade */}
        <div style={{
          opacity: fadeIn ? 1 : 0,
          transform: fadeIn ? 'translateY(0)' : 'translateY(6px)',
          transition: 'opacity 0.22s ease, transform 0.22s ease',
        }}>
          <displayedPage.Component {...displayedPage.pageProps} />
        </div>

        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(8px); }
            to   { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </GlobalErrorBoundary>
    </QueryClientProvider>
  );
}
// pages/404.jsx — Page 404 personnalisée
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

export default function NotFound() {
  const router = useRouter();
  const [count, setCount] = useState(5);

  useEffect(() => {
    const timer = setInterval(() => {
      setCount(c => {
        if (c <= 1) {
          clearInterval(timer);
          router.push(typeof window !== 'undefined' && localStorage.getItem('remine_admin_token') ? '/dashboard' : '/');
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'linear-gradient(135deg, #f0fdf4, #dcfce7)', fontFamily:'-apple-system, sans-serif' }}>
      <div style={{ textAlign:'center', padding:40 }}>
        <div style={{ fontSize:80, marginBottom:16 }}>🌿</div>
        <h1 style={{ fontSize:72, fontWeight:900, color:'#16a34a', margin:0, lineHeight:1 }}>404</h1>
        <h2 style={{ fontSize:24, fontWeight:700, color:'#111', margin:'16px 0 8px' }}>Page introuvable</h2>
        <p style={{ color:'#6b7280', fontSize:15, marginBottom:32 }}>
          Cette page n'existe pas dans ReMine.<br />
          Redirection automatique dans <strong style={{ color:'#16a34a' }}>{count}s</strong>…
        </p>
        <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
          <button onClick={() => router.push('/dashboard')}
                  style={{ padding:'12px 24px', background:'#16a34a', color:'#fff', border:'none', borderRadius:12, fontSize:15, fontWeight:700, cursor:'pointer', boxShadow:'0 4px 12px rgba(22,163,74,0.3)' }}>
            🏠 Tableau de bord
          </button>
          <button onClick={() => router.back()}
                  style={{ padding:'12px 24px', background:'#fff', color:'#374151', border:'1.5px solid #e5e7eb', borderRadius:12, fontSize:15, fontWeight:600, cursor:'pointer' }}>
            ← Retour
          </button>
        </div>
      </div>
    </div>
  );
}

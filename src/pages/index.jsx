// pages/index.jsx — Page de connexion redesignée
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { dashboardAPI } from '../services/api';
import { LOGO_BASE64 }  from '../assets/logo';

export default function LoginPage() {
  const router  = useRouter();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [apiOk, setApiOk]       = useState(null);

  useEffect(() => {
    // Vérifier si déjà connecté
    if (dashboardAPI.isAuthenticated()) {
      router.push('/dashboard');
      return;
    }
    // Tester la connexion backend
    dashboardAPI.healthCheck().then(r => setApiOk(r.status === 'ok'));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await dashboardAPI.login(email, password);
      if (result.success) {
        const role = result.data?.user?.role;
        if (!['admin', 'moderator'].includes(role)) {
          setError('Accès réservé aux administrateurs.');
          dashboardAPI.logout();
          return;
        }
        router.push('/dashboard');
      } else {
        setError(result.error || 'Email ou mot de passe incorrect');
      }
    } catch {
      setError('Impossible de se connecter au serveur.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight:'100vh', display:'flex', background:'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 50%, #bbf7d0 100%)' }}>

      {/* Panneau gauche — branding */}
      <div style={{ display:'none', flex:1, background:'linear-gradient(135deg, #16a34a, #166534)', padding:'48px', flexDirection:'column', justifyContent:'space-between' }}
           className="lg:flex">
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:48 }}>
            <img src="/icon.png" alt="ReMine" style={{ width:48, height:48, borderRadius:12, objectFit:'cover' }}
                 onError={e => { e.target.style.display='none'; }} />
            <div>
              <h1 style={{ color:'#fff', fontSize:24, fontWeight:800, margin:0 }}>ReMine</h1>
              <p style={{ color:'rgba(255,255,255,0.7)', fontSize:13, margin:0 }}>Citizen Track</p>
            </div>
          </div>

          <h2 style={{ color:'#fff', fontSize:36, fontWeight:800, lineHeight:1.2, marginBottom:16 }}>
            Tableau de bord<br />administrateur
          </h2>
          <p style={{ color:'rgba(255,255,255,0.8)', fontSize:16, lineHeight:1.6 }}>
            Gérez les signalements environnementaux,<br />
            analysez les données et coordonnez<br />
            les interventions en temps réel.
          </p>
        </div>

        {/* Stats */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
          {[
            { label:'Signalements gérés', value:'12+' },
            { label:'Taux de résolution', value:'17%' },
            { label:'Citoyens inscrits', value:'1' },
            { label:'Zones surveillées', value:'Thiès' },
          ].map(s => (
            <div key={s.label} style={{ background:'rgba(255,255,255,0.15)', borderRadius:12, padding:'16px 20px' }}>
              <p style={{ color:'#fff', fontSize:22, fontWeight:800, margin:0 }}>{s.value}</p>
              <p style={{ color:'rgba(255,255,255,0.7)', fontSize:12, margin:0 }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Panneau droit — formulaire */}
      <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:'32px 24px' }}>
        <div style={{ width:'100%', maxWidth:420 }}>

          {/* Logo mobile */}
          <div style={{ textAlign:'center', marginBottom:40 }}>
            <div style={{ display:'inline-flex', alignItems:'center', gap:12, marginBottom:8 }}>
              <img src={LOGO_BASE64} alt="ReMine"
                   style={{ width:60, height:60, objectFit:'contain' }} />
              <div style={{ textAlign:'left' }}>
                <h1 style={{ margin:0, fontSize:22, fontWeight:900, color:'#111' }}>ReMine</h1>
                <p style={{ margin:0, fontSize:12, color:'#16a34a', fontWeight:600 }}>Citizen Track</p>
              </div>
            </div>
            <p style={{ color:'#6b7280', fontSize:14, margin:0 }}>Connectez-vous à votre espace admin</p>
          </div>

          {/* Statut API */}
          {apiOk !== null && (
            <div style={{
              display:'flex', alignItems:'center', gap:8, padding:'8px 14px',
              background: apiOk ? '#f0fdf4' : '#fef2f2',
              border: `1px solid ${apiOk ? '#86efac' : '#fca5a5'}`,
              borderRadius:10, marginBottom:20, fontSize:13,
              color: apiOk ? '#166534' : '#991b1b',
            }}>
              <span style={{ width:8, height:8, borderRadius:'50%', background: apiOk ? '#22c55e' : '#ef4444', flexShrink:0 }} />
              {apiOk ? 'Serveur connecté' : 'Serveur inaccessible — vérifiez le backend'}
            </div>
          )}

          {/* Erreur */}
          {error && (
            <div style={{
              background:'#fef2f2', border:'1px solid #fecaca', borderRadius:12,
              padding:'12px 16px', marginBottom:20, color:'#991b1b', fontSize:14,
              display:'flex', alignItems:'center', gap:8,
            }}>
              <span>⚠️</span> {error}
            </div>
          )}

          {/* Formulaire */}
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom:16 }}>
              <label style={{ display:'block', fontSize:13, fontWeight:600, color:'#374151', marginBottom:6 }}>
                Adresse email
              </label>
              <div style={{ position:'relative' }}>
                <span style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', fontSize:16 }}>📧</span>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="admin@remine.sn" required
                  style={{
                    width:'100%', boxSizing:'border-box',
                    padding:'12px 14px 12px 42px',
                    border:'1.5px solid #e5e7eb', borderRadius:12,
                    fontSize:15, color:'#111', outline:'none',
                    transition:'border-color 0.15s', background:'#fafafa',
                  }}
                  onFocus={e => e.target.style.borderColor='#16a34a'}
                  onBlur={e => e.target.style.borderColor='#e5e7eb'}
                />
              </div>
            </div>

            <div style={{ marginBottom:28 }}>
              <label style={{ display:'block', fontSize:13, fontWeight:600, color:'#374151', marginBottom:6 }}>
                Mot de passe
              </label>
              <div style={{ position:'relative' }}>
                <span style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', fontSize:16 }}>🔐</span>
                <input
                  type={showPwd ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" required
                  style={{
                    width:'100%', boxSizing:'border-box',
                    padding:'12px 44px 12px 42px',
                    border:'1.5px solid #e5e7eb', borderRadius:12,
                    fontSize:15, color:'#111', outline:'none',
                    transition:'border-color 0.15s', background:'#fafafa',
                  }}
                  onFocus={e => e.target.style.borderColor='#16a34a'}
                  onBlur={e => e.target.style.borderColor='#e5e7eb'}
                />
                <button type="button" onClick={() => setShowPwd(!showPwd)}
                        style={{ position:'absolute', right:14, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', fontSize:16, color:'#9ca3af', padding:0 }}>
                  {showPwd ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
                    style={{
                      width:'100%', padding:'14px',
                      background: loading ? '#86efac' : 'linear-gradient(135deg, #16a34a, #166534)',
                      color:'#fff', border:'none', borderRadius:12,
                      fontSize:16, fontWeight:700, cursor: loading ? 'not-allowed' : 'pointer',
                      boxShadow: loading ? 'none' : '0 4px 12px rgba(22,163,74,0.35)',
                      transition:'all 0.2s',
                    }}>
              {loading ? '⏳ Connexion...' : '🚀 Se connecter'}
            </button>
          </form>

          <p style={{ textAlign:'center', fontSize:12, color:'#9ca3af', marginTop:24 }}>
            ReMine Citizen Track v1.0 — Tableau de bord administrateur
          </p>
        </div>
      </div>
    </div>
  );
}
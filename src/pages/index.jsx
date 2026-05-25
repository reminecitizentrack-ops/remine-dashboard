// pages/index.jsx — Page de connexion ReMine
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { dashboardAPI } from '../services/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [apiOk, setApiOk] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('remine_admin_token');
    if (token) {
      router.push('/dashboard');
      return;
    }
    setChecking(false);
    dashboardAPI.healthCheck()
      .then(r => setApiOk(r.success !== false))
      .catch(() => setApiOk(false));
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
          setLoading(false);
          return;
        }
        // Stocker aussi dans un cookie pour le middleware
        const token = result.data?.token || localStorage.getItem('remine_admin_token');
        if (token) {
          document.cookie = `remine_token=${token}; path=/; max-age=604800; SameSite=Lax`;
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

  if (checking) return null;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');

        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
          font-family: 'DM Sans', sans-serif;
          background: #0a0f0d;
          color: #fff;
          min-height: 100vh;
        }

        .page {
          min-height: 100vh;
          display: grid;
          grid-template-columns: 1fr 1fr;
          position: relative;
          overflow: hidden;
        }

        @media (max-width: 768px) {
          .page { grid-template-columns: 1fr; }
          .left-panel { display: none; }
        }

        /* ── LEFT PANEL ── */
        .left-panel {
          background: linear-gradient(145deg, #064e2a 0%, #0a1a10 60%, #000 100%);
          padding: 60px 48px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          position: relative;
          overflow: hidden;
        }

        .left-panel::before {
          content: '';
          position: absolute;
          top: -100px; left: -100px;
          width: 500px; height: 500px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(34,197,94,0.15) 0%, transparent 70%);
        }

        .left-panel::after {
          content: '';
          position: absolute;
          bottom: -80px; right: -80px;
          width: 400px; height: 400px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(34,197,94,0.08) 0%, transparent 70%);
        }

        .brand {
          position: relative;
          z-index: 1;
        }

        .brand-logo {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-bottom: 56px;
        }

        .logo-icon {
          width: 48px; height: 48px;
          background: linear-gradient(135deg, #22c55e, #16a34a);
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          box-shadow: 0 8px 24px rgba(34,197,94,0.3);
        }

        .brand-name {
          font-family: 'Syne', sans-serif;
          font-size: 22px;
          font-weight: 800;
          color: #fff;
          letter-spacing: -0.5px;
        }

        .brand-sub {
          font-size: 12px;
          color: rgba(255,255,255,0.5);
          font-weight: 400;
          letter-spacing: 2px;
          text-transform: uppercase;
        }

        .hero-title {
          font-family: 'Syne', sans-serif;
          font-size: 42px;
          font-weight: 800;
          line-height: 1.1;
          color: #fff;
          margin-bottom: 20px;
          letter-spacing: -1px;
        }

        .hero-title span {
          color: #22c55e;
        }

        .hero-desc {
          font-size: 15px;
          color: rgba(255,255,255,0.55);
          line-height: 1.7;
          max-width: 340px;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          position: relative;
          z-index: 1;
        }

        .stat-card {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 16px;
          padding: 20px;
          backdrop-filter: blur(10px);
        }

        .stat-value {
          font-family: 'Syne', sans-serif;
          font-size: 28px;
          font-weight: 800;
          color: #22c55e;
          margin-bottom: 4px;
        }

        .stat-label {
          font-size: 12px;
          color: rgba(255,255,255,0.45);
          font-weight: 400;
        }

        /* ── RIGHT PANEL ── */
        .right-panel {
          background: #0d1410;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px 32px;
          position: relative;
        }

        .right-panel::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background: 
            radial-gradient(ellipse at 20% 20%, rgba(34,197,94,0.04) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 80%, rgba(34,197,94,0.03) 0%, transparent 50%);
          pointer-events: none;
        }

        .form-container {
          width: 100%;
          max-width: 400px;
          position: relative;
          z-index: 1;
        }

        .form-header {
          margin-bottom: 40px;
        }

        .form-tag {
          display: inline-block;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 2.5px;
          text-transform: uppercase;
          color: #22c55e;
          background: rgba(34,197,94,0.1);
          border: 1px solid rgba(34,197,94,0.2);
          border-radius: 20px;
          padding: 5px 14px;
          margin-bottom: 16px;
        }

        .form-title {
          font-family: 'Syne', sans-serif;
          font-size: 30px;
          font-weight: 800;
          color: #fff;
          letter-spacing: -0.8px;
          margin-bottom: 8px;
        }

        .form-subtitle {
          font-size: 14px;
          color: rgba(255,255,255,0.4);
        }

        /* Status */
        .status-bar {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          border-radius: 10px;
          font-size: 13px;
          margin-bottom: 24px;
        }

        .status-bar.ok {
          background: rgba(34,197,94,0.08);
          border: 1px solid rgba(34,197,94,0.2);
          color: #4ade80;
        }

        .status-bar.error {
          background: rgba(239,68,68,0.08);
          border: 1px solid rgba(239,68,68,0.2);
          color: #f87171;
        }

        .status-dot {
          width: 7px; height: 7px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        /* Error */
        .error-box {
          background: rgba(239,68,68,0.08);
          border: 1px solid rgba(239,68,68,0.2);
          border-radius: 12px;
          padding: 12px 16px;
          margin-bottom: 20px;
          color: #f87171;
          font-size: 13px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        /* Inputs */
        .field {
          margin-bottom: 18px;
        }

        .field label {
          display: block;
          font-size: 12px;
          font-weight: 600;
          color: rgba(255,255,255,0.5);
          letter-spacing: 1px;
          text-transform: uppercase;
          margin-bottom: 8px;
        }

        .input-wrap {
          position: relative;
        }

        .input-wrap input {
          width: 100%;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px;
          padding: 14px 16px;
          font-size: 15px;
          color: #fff;
          font-family: 'DM Sans', sans-serif;
          outline: none;
          transition: all 0.2s;
        }

        .input-wrap input:focus {
          border-color: rgba(34,197,94,0.5);
          background: rgba(34,197,94,0.04);
          box-shadow: 0 0 0 3px rgba(34,197,94,0.08);
        }

        .input-wrap input::placeholder {
          color: rgba(255,255,255,0.2);
        }

        .toggle-pwd {
          position: absolute;
          right: 14px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: rgba(255,255,255,0.3);
          cursor: pointer;
          font-size: 16px;
          padding: 4px;
          transition: color 0.2s;
        }

        .toggle-pwd:hover { color: rgba(255,255,255,0.6); }

        /* Submit */
        .submit-btn {
          width: 100%;
          padding: 15px;
          background: linear-gradient(135deg, #22c55e, #16a34a);
          color: #fff;
          border: none;
          border-radius: 12px;
          font-size: 15px;
          font-weight: 700;
          font-family: 'Syne', sans-serif;
          cursor: pointer;
          letter-spacing: 0.3px;
          transition: all 0.2s;
          box-shadow: 0 4px 20px rgba(34,197,94,0.25);
          margin-top: 8px;
          position: relative;
          overflow: hidden;
        }

        .submit-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 8px 28px rgba(34,197,94,0.35);
        }

        .submit-btn:active:not(:disabled) {
          transform: translateY(0);
        }

        .submit-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .footer-note {
          text-align: center;
          font-size: 12px;
          color: rgba(255,255,255,0.2);
          margin-top: 28px;
        }
      `}</style>

      <div className="page">

        {/* LEFT */}
        <div className="left-panel">
          <div className="brand">
            <div className="brand-logo">
              <div className="logo-icon">🌍</div>
              <div>
                <div className="brand-name">ReMine</div>
                <div className="brand-sub">Citizen Track</div>
              </div>
            </div>
            <h2 className="hero-title">
              Tableau de bord<br /><span>administrateur</span>
            </h2>
            <p className="hero-desc">
              Gérez les signalements environnementaux, analysez les données et coordonnez les interventions en temps réel.
            </p>
          </div>

          <div className="stats-grid">
            {[
              { label: 'Signalements', value: '12+' },
              { label: 'Résolution', value: '17%' },
              { label: 'Citoyens', value: '1' },
              { label: 'Zone', value: 'Thiès' },
            ].map(s => (
              <div key={s.label} className="stat-card">
                <div className="stat-value">{s.value}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT */}
        <div className="right-panel">
          <div className="form-container">

            <div className="form-header">
              <div className="form-tag">Admin Access</div>
              <h1 className="form-title">Connexion</h1>
              <p className="form-subtitle">Accédez à votre espace administrateur</p>
            </div>

            {apiOk !== null && (
              <div className={`status-bar ${apiOk ? 'ok' : 'error'}`}>
                <div className="status-dot" style={{ background: apiOk ? '#22c55e' : '#ef4444' }} />
                {apiOk ? 'Serveur connecté' : 'Serveur inaccessible'}
              </div>
            )}

            {error && (
              <div className="error-box">
                <span>⚠️</span> {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="field">
                <label>Adresse email</label>
                <div className="input-wrap">
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="admin@remine.sn"
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="field">
                <label>Mot de passe</label>
                <div className="input-wrap">
                  <input
                    type={showPwd ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                    style={{ paddingRight: '44px' }}
                  />
                  <button
                    type="button"
                    className="toggle-pwd"
                    onClick={() => setShowPwd(!showPwd)}
                  >
                    {showPwd ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="submit-btn"
                disabled={loading}
              >
                {loading ? '⏳ Connexion en cours...' : '🚀 Se connecter'}
              </button>
            </form>

            <p className="footer-note">
              ReMine Citizen Track v1.0 — Espace administrateur
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
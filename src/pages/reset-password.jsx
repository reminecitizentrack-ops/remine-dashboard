// pages/reset-password.jsx — Page de réinitialisation de mot de passe ReMine
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { dashboardAPI } from '../services/api';

export default function ResetPasswordPage() {
  const router = useRouter();
  const { token, email } = router.query;

  const [checking, setChecking]   = useState(true);
  const [tokenValid, setTokenValid] = useState(null); // null = checking, true/false = result
  const [tokenError, setTokenError] = useState('');

  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [showPwd, setShowPwd]     = useState(false);
  const [loading, setLoading]     = useState(false);
  const [result, setResult]       = useState(null); // { success, message }

  // Vérification du token au chargement
  useEffect(() => {
    if (!router.isReady) return;

    if (!token || !email) {
      setTokenValid(false);
      setTokenError('Lien invalide : informations manquantes.');
      setChecking(false);
      return;
    }

    dashboardAPI.verifyResetToken(String(email), String(token))
      .then(res => {
        if (res.success) {
          setTokenValid(true);
        } else {
          setTokenValid(false);
          setTokenError(res.error || 'Lien invalide ou expiré.');
        }
      })
      .catch(() => {
        setTokenValid(false);
        setTokenError('Impossible de vérifier le lien.');
      })
      .finally(() => setChecking(false));
  }, [router.isReady, token, email]);

  const passwordRules = {
    length: password.length >= 8,
    match: password.length > 0 && password === confirm,
  };
  const canSubmit = passwordRules.length && passwordRules.match && !loading;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await dashboardAPI.confirmPasswordReset(String(email), String(token), password);
      if (res.success) {
        setResult({ success: true, message: res.message || 'Mot de passe réinitialisé avec succès.' });
      } else {
        setResult({ success: false, message: res.error || 'Une erreur est survenue.' });
      }
    } catch {
      setResult({ success: false, message: 'Impossible de contacter le serveur.' });
    } finally {
      setLoading(false);
    }
  };

  if (checking) return null;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family:'DM Sans',sans-serif; background:#061209; color:#fff; min-height:100vh; }

        .wrap { min-height:100vh; display:flex; align-items:center; justify-content:center; padding:24px; position:relative; overflow:hidden; }
        .wrap::before {
          content:''; position:absolute; top:-150px; left:-150px;
          width:500px; height:500px; border-radius:50%;
          background:radial-gradient(circle,rgba(45,212,96,0.10) 0%,transparent 65%);
          pointer-events:none;
        }
        .wrap::after {
          content:''; position:absolute; bottom:-130px; right:-100px;
          width:420px; height:420px; border-radius:50%;
          background:radial-gradient(circle,rgba(234,179,8,0.06) 0%,transparent 65%);
          pointer-events:none;
        }

        .box { width:100%; max-width:420px; background:#0b1710; border:1px solid rgba(255,255,255,0.07); border-radius:20px; padding:36px 32px; position:relative; z-index:1; box-shadow:0 20px 60px rgba(0,0,0,0.4); }

        .tag {
          display:inline-flex; align-items:center; gap:6px;
          font-size:10px; font-weight:700; letter-spacing:2.5px; text-transform:uppercase;
          color:#2dd460; background:rgba(45,212,96,0.08); border:1px solid rgba(45,212,96,0.18);
          border-radius:30px; padding:5px 14px; margin-bottom:18px;
        }
        .icon { font-size:36px; text-align:center; margin-bottom:14px; }
        .title { font-family:'Syne',sans-serif; font-size:26px; font-weight:800; color:#fff; letter-spacing:-0.5px; margin-bottom:8px; }
        .sub { font-size:13px; color:rgba(255,255,255,0.45); line-height:1.7; margin-bottom:28px; }

        .field { margin-bottom:14px; }
        .field label { display:block; font-size:11px; font-weight:600; letter-spacing:1.5px; text-transform:uppercase; color:rgba(255,255,255,0.4); margin-bottom:7px; }
        .inp-wrap { position:relative; }
        .inp-wrap input {
          width:100%; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.07);
          border-radius:12px; padding:13px 16px; font-size:15px; color:#fff;
          font-family:'DM Sans',sans-serif; outline:none; transition:all 0.2s;
        }
        .inp-wrap input:focus { border-color:rgba(45,212,96,0.45); background:rgba(45,212,96,0.04); box-shadow:0 0 0 3px rgba(45,212,96,0.07); }
        .toggle { position:absolute; right:13px; top:50%; transform:translateY(-50%); background:none; border:none; color:rgba(255,255,255,0.25); cursor:pointer; font-size:15px; padding:4px; }
        .toggle:hover { color:rgba(255,255,255,0.55); }

        .rules { display:flex; flex-direction:column; gap:5px; margin:4px 0 18px; }
        .rule { font-size:12px; display:flex; align-items:center; gap:6px; color:rgba(255,255,255,0.35); transition:color 0.2s; }
        .rule.ok { color:#4ade80; }

        .btn {
          width:100%; margin-top:6px; padding:14px;
          background:linear-gradient(135deg,#2dd460,#16a34a);
          color:#fff; border:none; border-radius:12px;
          font-size:15px; font-weight:700; font-family:'Syne',sans-serif;
          letter-spacing:0.2px; cursor:pointer; transition:all 0.2s;
          box-shadow:0 4px 24px rgba(45,212,96,0.22);
        }
        .btn:not(:disabled):hover { transform:translateY(-1px); box-shadow:0 8px 32px rgba(45,212,96,0.32); }
        .btn:disabled { opacity:0.45; cursor:not-allowed; }

        .btn-secondary {
          width:100%; margin-top:12px; padding:13px;
          background:transparent; border:1px solid rgba(255,255,255,0.1);
          color:rgba(255,255,255,0.6); border-radius:12px;
          font-size:14px; font-weight:600; cursor:pointer; transition:all 0.2s;
        }
        .btn-secondary:hover { background:rgba(255,255,255,0.04); color:#fff; }

        .result-box {
          border-radius:12px; padding:14px 16px; font-size:13px; line-height:1.6; margin-bottom:18px;
        }
        .result-box.ok { background:rgba(45,212,96,0.07); border:1px solid rgba(45,212,96,0.18); color:#4ade80; }
        .result-box.err { background:rgba(239,68,68,0.07); border:1px solid rgba(239,68,68,0.18); color:#f87171; }

        .footer { text-align:center; font-size:11px; color:rgba(255,255,255,0.18); margin-top:24px; letter-spacing:0.3px; }
      `}</style>

      <div className="wrap">
        <div className="box">

          {/* ── Lien invalide / expiré ──────────────────────────────────── */}
          {tokenValid === false && (
            <>
              <div className="icon">⚠️</div>
              <h1 className="title">Lien invalide</h1>
              <p className="sub">{tokenError} Veuillez refaire une demande de réinitialisation depuis la page de connexion.</p>
              <button className="btn" onClick={() => router.push('/')}>
                Retour à la connexion
              </button>
            </>
          )}

          {/* ── Succès ──────────────────────────────────────────────────── */}
          {result?.success && (
            <>
              <div className="icon">✅</div>
              <h1 className="title">Mot de passe modifié</h1>
              <p className="sub">{result.message}</p>
              <p className="sub" style={{ marginTop: -16 }}>
                Vous pouvez maintenant vous connecter avec votre nouveau mot de passe, sur l'application mobile ReMine ou sur le tableau de bord administrateur.
              </p>
              <button className="btn" onClick={() => router.push('/')}>
                Aller à la connexion
              </button>
            </>
          )}

          {/* ── Formulaire ──────────────────────────────────────────────── */}
          {tokenValid === true && !result?.success && (
            <>
              <div className="tag">🔐 Réinitialisation</div>
              <h1 className="title">Nouveau mot de passe</h1>
              <p className="sub">Choisissez un nouveau mot de passe pour le compte <strong style={{ color:'#fff' }}>{email}</strong>.</p>

              {result && !result.success && (
                <div className="result-box err">⚠️ {result.message}</div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="field">
                  <label>Nouveau mot de passe</label>
                  <div className="inp-wrap">
                    <input
                      type={showPwd ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      autoFocus
                      style={{ paddingRight: '42px' }}
                    />
                    <button type="button" className="toggle" onClick={() => setShowPwd(!showPwd)}>
                      {showPwd ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>

                <div className="field">
                  <label>Confirmer le mot de passe</label>
                  <div className="inp-wrap">
                    <input
                      type={showPwd ? 'text' : 'password'}
                      value={confirm}
                      onChange={e => setConfirm(e.target.value)}
                      placeholder="••••••••"
                      required
                    />
                  </div>
                </div>

                <div className="rules">
                  <div className={`rule ${passwordRules.length ? 'ok' : ''}`}>
                    {passwordRules.length ? '✓' : '○'} Au moins 8 caractères
                  </div>
                  <div className={`rule ${passwordRules.match ? 'ok' : ''}`}>
                    {passwordRules.match ? '✓' : '○'} Les mots de passe correspondent
                  </div>
                </div>

                <button type="submit" className="btn" disabled={!canSubmit}>
                  {loading ? '⏳ Mise à jour...' : '🔐 Réinitialiser le mot de passe'}
                </button>
              </form>

              <button className="btn-secondary" onClick={() => router.push('/')}>
                Annuler
              </button>
            </>
          )}

          <p className="footer">ReMine Citizen Track v1.0</p>
        </div>
      </div>
    </>
  );
}
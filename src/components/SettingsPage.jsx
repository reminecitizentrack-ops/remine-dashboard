import React, { useState, useEffect, useCallback } from 'react';
import { dashboardAPI } from '../services/api';
import { LOGO_BASE64 } from '../assets/logo';
import {
  Palette, Layout, Bell, Database, Lock, Wrench, Info,
  Moon, Sun, Type, Sidebar, Zap, Map, Layers,
  RefreshCw, Clock, FileDown, FileUp, Keyboard,
  Eye, EyeOff, Trash2, LogOut, Check, Save, RotateCcw,
  Monitor, Smartphone, Shield, User, Globe,
} from 'lucide-react';

// ─── Hook dark mode ───────────────────────────────────────────────────────────
function useDark() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const check = () => setDark(document.documentElement.classList.contains('dark'));
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);
  return dark;
}

// ─── Stockage persistant des paramètres ───────────────────────────────────────
const DEFAULTS = {
  // Apparence
  darkMode:        false,
  accentColor:     '#10b981',
  theme:           'remine',  // remine | ocean | forest | sunset | midnight | desert
  sidebarCollapsed:false,
  compactMode:     false,
  animationsEnabled: true,
  fontSize:        'md',
  // Données & Refresh
  autoRefresh:     false,
  refreshInterval: 60,
  defaultPeriod:   '30d',
  pageSize:        20,
  // Notifications
  notifNewReport:  true,
  notifUrgent:     true,
  notifResolved:   false,
  notifSystemAlerts: true,
  notifSound:      false,
  notifPosition:   'bottom-right',
  // Carte
  defaultMapStyle: 'standard',
  clusterEnabled:  true,
  // Sécurité
  sessionTimeout:  60,
  confirmDelete:   true,
  // Avancé
  debugMode:       false,
  cacheEnabled:    true,
  language:        'fr',
  // Dashboard
  showKpiReports:  true,
  showKpiResolved: true,
  showKpiUrgent:   true,
  showKpiCitizens: true,
  showLiveFeed:    true,
  showAIPriority:  true,
  showImpact:      true,
};

// ─── Thèmes prédéfinis ───────────────────────────────────────────────────────
const THEMES = {
  remine:   { label: 'ReMine',    emoji: '🌍', accent: '#10b981', dark: false, desc: 'Vert nature — thème par défaut' },
  ocean:    { label: 'Océan',     emoji: '🌊', accent: '#0ea5e9', dark: false, desc: 'Bleu profond — frais et calme' },
  forest:   { label: 'Forêt',     emoji: '🌲', accent: '#16a34a', dark: true,  desc: 'Vert sombre — forêt tropicale' },
  sunset:   { label: 'Coucher',   emoji: '🌅', accent: '#f97316', dark: false, desc: 'Orange doré — chaleureux' },
  midnight: { label: 'Minuit',    emoji: '🌙', accent: '#8b5cf6', dark: true,  desc: 'Violet nuit — mode sombre élégant' },
  desert:   { label: 'Désert',    emoji: '🏜️', accent: '#d97706', dark: false, desc: 'Ocre sableux — Sahel africain' },
};

function loadSettings() {
  try {
    const saved = localStorage.getItem('remine_settings');
    return saved ? { ...DEFAULTS, ...JSON.parse(saved) } : { ...DEFAULTS };
  } catch { return { ...DEFAULTS }; }
}

function saveSettings(settings) {
  try { localStorage.setItem('remine_settings', JSON.stringify(settings)); } catch {}
}

// ─── Composants UI ────────────────────────────────────────────────────────────
function Toggle({ checked, onChange, disabled = false }) {
  return (
    <button
      role="switch" aria-checked={checked}
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      style={{
        width: 44, height: 24, borderRadius: 99, border: 'none',
        background: checked ? 'linear-gradient(135deg,#10b981,#059669)' : '#d1d5db',
        cursor: disabled ? 'not-allowed' : 'pointer',
        position: 'relative', transition: 'background 0.25s', flexShrink: 0,
        boxShadow: checked ? '0 2px 8px rgba(16,185,129,0.35)' : 'none',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <span style={{
        position: 'absolute', top: 3, left: checked ? 22 : 3, width: 18, height: 18,
        borderRadius: '50%', background: '#fff',
        boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
        transition: 'left 0.25s cubic-bezier(0.34,1.56,0.64,1)',
      }} />
    </button>
  );
}

function Select({ value, onChange, options, dm }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} style={{
      padding: '6px 10px', borderRadius: 9, border: `1px solid ${dm ? '#334155' : '#e2e8f0'}`,
      background: dm ? '#0f172a' : '#f8fafc', color: dm ? '#f1f5f9' : '#0f172a',
      fontSize: 12, fontWeight: 600, cursor: 'pointer', outline: 'none',
      fontFamily: 'inherit',
    }}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function Slider({ value, onChange, min, max, step = 1, unit = '', dm }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ flex: 1, accentColor: '#10b981', cursor: 'pointer', height: 4 }}
      />
      <span style={{ fontSize: 12, fontWeight: 800, color: '#10b981', minWidth: 40, textAlign: 'right' }}>
        {value}{unit}
      </span>
    </div>
  );
}

function SettingRow({ label, description, children, dm }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '13px 0', borderBottom: `1px solid ${dm ? '#1e293b' : '#f1f5f9'}` }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: dm ? '#e2e8f0' : '#1e293b', margin: 0 }}>{label}</p>
        {description && <p style={{ fontSize: 11, color: dm ? '#64748b' : '#94a3b8', margin: '3px 0 0', lineHeight: 1.5 }}>{description}</p>}
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  );
}

function Section({ title, icon, children, dm }) {
  return (
    <div style={{ background: dm ? '#1e293b' : '#fff', borderRadius: 20, border: `1px solid ${dm ? '#334155' : '#f1f5f9'}`, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
      <div style={{ padding: '16px 20px', borderBottom: `1px solid ${dm ? '#334155' : '#f1f5f9'}`, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ width: 34, height: 34, background: dm ? '#0f172a' : '#f8fafc', borderRadius: 10, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 17 }}>{icon}</span>
        <h3 style={{ fontSize: 14, fontWeight: 800, color: dm ? '#f1f5f9' : '#0f172a', margin: 0 }}>{title}</h3>
      </div>
      <div style={{ padding: '4px 20px 8px' }}>{children}</div>
    </div>
  );
}

function ColorPicker({ value, onChange }) {
  const presets = ['#10b981','#3b82f6','#8b5cf6','#f59e0b','#ef4444','#ec4899','#06b6d4','#f97316'];
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
      {presets.map(c => (
        <button key={c} onClick={() => onChange(c)} style={{
          width: 26, height: 26, borderRadius: '50%', background: c, border: `3px solid ${value === c ? '#fff' : 'transparent'}`,
          boxShadow: value === c ? `0 0 0 2px ${c}` : 'none',
          cursor: 'pointer', transition: 'all 0.15s', transform: value === c ? 'scale(1.15)' : 'scale(1)',
        }} />
      ))}
      <input type="color" value={value} onChange={e => onChange(e.target.value)}
        style={{ width: 28, height: 28, borderRadius: 8, border: 'none', cursor: 'pointer', padding: 2, background: 'transparent' }}
      />
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────
export function SettingsPage({ onSettingsChange, currentDarkMode, onDarkModeChange, autoRefresh, onAutoRefreshChange, refreshInterval, onRefreshIntervalChange }) {
  const [settings, setSettings] = useState(loadSettings);
  const [saved,    setSaved]    = useState(false);
  const [section,  setSection]  = useState('appearance');
  const [info,     setInfo]     = useState(null);
  const dm = useDark();

  // Sync dark mode depuis les props
  useEffect(() => {
    setSettings(s => ({ ...s, darkMode: currentDarkMode }));
  }, [currentDarkMode]);

  useEffect(() => {
    setSettings(s => ({ ...s, autoRefresh, refreshInterval }));
  }, [autoRefresh, refreshInterval]);

  const update = useCallback((key, value) => {
    setSettings(s => {
      const next = { ...s, [key]: value };
      saveSettings(next);

      // Propager les changements critiques vers le dashboard
      if (key === 'darkMode')          onDarkModeChange?.(value);
      if (key === 'autoRefresh')       onAutoRefreshChange?.(value);
      if (key === 'refreshInterval')   onRefreshIntervalChange?.(value);
      if (key === 'accentColor') {
        document.documentElement.style.setProperty('--brand-500', value);
        document.documentElement.style.setProperty('--brand-600', value);
      }
      if (key === 'fontSize') {
        const sizes = { sm: '13px', md: '14px', lg: '16px' };
        document.documentElement.style.fontSize = sizes[value] || '14px';
        document.body.style.fontSize = sizes[value] || '14px';
      }
      if (key === 'animationsEnabled') {
        document.documentElement.style.setProperty('--duration-normal', value ? '250ms' : '0ms');
        document.documentElement.style.setProperty('--duration-fast', value ? '150ms' : '0ms');
      }
      if (key === 'compactMode') {
        document.documentElement.classList.toggle('compact', value);
        // Réduire le padding global en mode compact
        document.documentElement.style.setProperty('--compact-scale', value ? '0.85' : '1');
      }

      onSettingsChange?.(next);
      return next;
    });
  }, [onDarkModeChange, onAutoRefreshChange, onRefreshIntervalChange, onSettingsChange]);

  const handleSave = useCallback(() => {
    saveSettings(settings);
    setSaved(true);
    setInfo({ type: 'success', msg: '✅ Paramètres sauvegardés' });
    setTimeout(() => { setSaved(false); setInfo(null); }, 3000);
  }, [settings]);

  const handleReset = useCallback(() => {
    const fresh = { ...DEFAULTS };
    setSettings(fresh);
    saveSettings(fresh);
    onDarkModeChange?.(false);
    onAutoRefreshChange?.(false);
    document.documentElement.style.removeProperty('--brand-500');
    document.documentElement.style.removeProperty('--brand-600');
    document.documentElement.style.removeProperty('font-size');
    setInfo({ type: 'info', msg: '↺ Paramètres réinitialisés' });
    setTimeout(() => setInfo(null), 3000);
  }, [onDarkModeChange, onAutoRefreshChange]);

  const handleClearCache = useCallback(() => {
    try {
      Object.keys(localStorage).filter(k => k.startsWith('remine_') && k !== 'remine_admin_token' && k !== 'remine_settings').forEach(k => localStorage.removeItem(k));
      setInfo({ type: 'success', msg: '✅ Cache vidé avec succès' });
    } catch {
      setInfo({ type: 'error', msg: '❌ Erreur lors du vidage du cache' });
    }
    setTimeout(() => setInfo(null), 3000);
  }, []);

  const SECTIONS = [
    { id: 'appearance',    label: 'Apparence',       icon: <Palette  size={16}/>, desc: 'Thèmes, couleurs, police'  },
    { id: 'perso',         label: 'Personnalisation', icon: <Layout   size={16}/>, desc: 'Dashboard, carte, widgets' },
    { id: 'notifications', label: 'Notifications',   icon: <Bell     size={16}/>, desc: 'Alertes et événements'     },
    { id: 'data',          label: 'Données',          icon: <Database size={16}/>, desc: 'Refresh, export, cache'    },
    { id: 'security',      label: 'Sécurité',         icon: <Lock     size={16}/>, desc: 'Session, compte, accès'    },
    { id: 'tools',         label: 'Outils',           icon: <Wrench   size={16}/>, desc: 'Raccourcis, config'        },
    { id: 'about',         label: 'À propos',         icon: <Info     size={16}/>, desc: 'Version, stack technique'  },
  ];

  const textPri = dm ? '#f1f5f9' : '#0f172a';
  const textSec = dm ? '#94a3b8' : '#6b7280';
  const bgMut   = dm ? '#0f172a' : '#f8fafc';
  const textMut  = dm ? '#64748b' : '#9ca3af';

  return (
    <div style={{ display: 'flex', gap: 24, height: '100%' }}>

      {/* ── Sidebar sections ── */}
      <div style={{ width: 200, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <p style={{ fontSize: 10, fontWeight: 800, color: textSec, textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 8px 8px' }}>Paramètres</p>
        {SECTIONS.map(s => (
          <button key={s.id} onClick={() => setSection(s.id)} style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 12,
            border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%',
            background: section === s.id ? (dm ? 'rgba(16,185,129,0.15)' : '#ecfdf5') : 'transparent',
            color: section === s.id ? '#10b981' : textSec,
            transition: 'all 0.15s',
            borderLeft: section === s.id ? '3px solid #10b981' : '3px solid transparent',
          }}
          onMouseEnter={e => { if (section !== s.id) e.currentTarget.style.background = dm ? '#1e293b' : '#f8fafc'; }}
          onMouseLeave={e => { if (section !== s.id) e.currentTarget.style.background = 'transparent'; }}
          >
            <span style={{ fontSize: 16, width: 22, textAlign: 'center', flexShrink: 0 }}>{s.icon}</span>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 600, margin: 0, color: section === s.id ? '#10b981' : textSec }}>{s.label}</p>
              {s.desc && <p style={{ fontSize: 10, margin: '1px 0 0', color: textMut, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.desc}</p>}
            </div>
          </button>
        ))}

        {/* Boutons bas */}
        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 16 }}>
          <button onClick={handleSave} style={{ padding: '9px 12px', borderRadius: 12, border: 'none', background: saved ? '#dcfce7' : 'linear-gradient(135deg,#10b981,#059669)', color: saved ? '#16a34a' : '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', boxShadow: saved ? 'none' : '0 4px 12px rgba(16,185,129,0.3)', transition: 'all 0.2s' }}>
            {saved ? '✅ Sauvegardé' : 'Sauvegarder'}
          </button>
          <button onClick={handleReset} style={{ padding: '7px 12px', borderRadius: 12, border: `1px solid ${dm ? '#334155' : '#e2e8f0'}`, background: 'transparent', color: textSec, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            ↺ Réinitialiser
          </button>
        </div>
      </div>

      {/* ── Contenu ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0, overflowY: 'auto' }}>

        {/* Feedback */}
        {info && (
          <div style={{ padding: '10px 16px', borderRadius: 12, fontSize: 12, fontWeight: 600, background: info.type === 'success' ? '#dcfce7' : info.type === 'error' ? '#fee2e2' : '#dbeafe', color: info.type === 'success' ? '#16a34a' : info.type === 'error' ? '#dc2626' : '#1d4ed8', border: `1px solid ${info.type === 'success' ? '#bbf7d0' : info.type === 'error' ? '#fecaca' : '#bfdbfe'}`, animation: 'remine-scale-in 0.2s both' }}>
            {info.msg}
          </div>
        )}

        {/* ══ APPARENCE ══════════════════════════════════════════════════════ */}
        {section === 'appearance' && (
          <>
            <Section title="Apparence" icon={<Palette  size={17}/>} dm={dm}>
              <SettingRow label="Mode sombre" description="Interface en thème sombre" dm={dm}>
                <Toggle checked={settings.darkMode} onChange={v => update('darkMode', v)} />
              </SettingRow>
              <SettingRow label="Mode compact" description="Réduit l'espacement pour afficher plus de contenu" dm={dm}>
                <Toggle checked={settings.compactMode} onChange={v => update('compactMode', v)} />
              </SettingRow>
              <SettingRow label="Animations" description="Transitions et micro-animations" dm={dm}>
                <Toggle checked={settings.animationsEnabled} onChange={v => update('animationsEnabled', v)} />
              </SettingRow>
              <SettingRow label="Sidebar réduite" description="Afficher uniquement les icônes" dm={dm}>
                <Toggle checked={settings.sidebarCollapsed} onChange={v => update('sidebarCollapsed', v)} />
              </SettingRow>
              <SettingRow label="Taille du texte" description="Taille de la police globale" dm={dm}>
                <Select value={settings.fontSize} onChange={v => update('fontSize', v)} dm={dm} options={[
                  { value: 'sm', label: 'Petite (13px)' },
                  { value: 'md', label: 'Normale (14px)' },
                  { value: 'lg', label: 'Grande (16px)' },
                ]} />
              </SettingRow>
            </Section>

            <Section title="Couleur d'accent" icon={<Palette  size={17}/>} dm={dm}>
              <div style={{ padding: '12px 0' }}>
                <p style={{ fontSize: 12, color: textSec, margin: '0 0 12px' }}>Couleur principale de l'interface</p>
                <ColorPicker value={settings.accentColor} onChange={v => update('accentColor', v)} />
                <div style={{ marginTop: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: settings.accentColor, boxShadow: `0 4px 12px ${settings.accentColor}44` }} />
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: settings.accentColor, margin: 0 }}>Couleur active</p>
                    <p style={{ fontSize: 10, color: textSec, margin: '2px 0 0', fontFamily: 'monospace' }}>{settings.accentColor}</p>
                  </div>
                </div>
              </div>
            </Section>
          </>
        )}

        {/* ══ DONNÉES ════════════════════════════════════════════════════════ */}
        {section === 'data' && (
          <Section title="Données & Actualisation" icon={<Database size={17}/>} dm={dm}>
            <SettingRow label="Actualisation automatique" description="Rafraîchir les données en arrière-plan" dm={dm}>
              <Toggle checked={settings.autoRefresh} onChange={v => update('autoRefresh', v)} />
            </SettingRow>
            <SettingRow label="Intervalle d'actualisation" description={`Toutes les ${settings.refreshInterval} secondes`} dm={dm}>
              <div style={{ width: 200 }}>
                <Slider value={settings.refreshInterval} onChange={v => update('refreshInterval', v)} min={15} max={300} step={15} unit="s" dm={dm} />
              </div>
            </SettingRow>
            <SettingRow label="Période par défaut" description="Période affichée dans Analytics" dm={dm}>
              <Select value={settings.defaultPeriod} onChange={v => update('defaultPeriod', v)} dm={dm} options={[
                { value: '7d',  label: '7 derniers jours'  },
                { value: '30d', label: '30 derniers jours' },
                { value: '90d', label: '3 derniers mois'   },
                { value: '6m',  label: '6 derniers mois'   },
                { value: '1y',  label: 'Dernière année'    },
              ]} />
            </SettingRow>
            <SettingRow label="Signalements par page" description="Nombre de lignes dans les tableaux" dm={dm}>
              <Select value={String(settings.pageSize)} onChange={v => update('pageSize', Number(v))} dm={dm} options={[
                { value: '10', label: '10 par page' },
                { value: '20', label: '20 par page' },
                { value: '50', label: '50 par page' },
                { value: '100',label: '100 par page'},
              ]} />
            </SettingRow>
            <SettingRow label="Cache des requêtes" description="Mettre en cache les données pour améliorer les performances" dm={dm}>
              <Toggle checked={settings.cacheEnabled} onChange={v => update('cacheEnabled', v)} />
            </SettingRow>
          </Section>
        )}

        {/* ══ NOTIFICATIONS ══════════════════════════════════════════════════ */}
        {section === 'notifications' && (
          <>
            <Section title="Événements" icon={<Bell     size={17}/>} dm={dm}>
              <SettingRow label="Nouveaux signalements" description="Notification à chaque nouveau signalement" dm={dm}>
                <Toggle checked={settings.notifNewReport} onChange={v => update('notifNewReport', v)} />
              </SettingRow>
              <SettingRow label="Signalements urgents" description="Alerte immédiate pour les niveaux critiques" dm={dm}>
                <Toggle checked={settings.notifUrgent} onChange={v => update('notifUrgent', v)} />
              </SettingRow>
              <SettingRow label="Signalements résolus" description="Notification à la résolution" dm={dm}>
                <Toggle checked={settings.notifResolved} onChange={v => update('notifResolved', v)} />
              </SettingRow>
              <SettingRow label="Alertes système" description="Erreurs de connexion, mises à jour" dm={dm}>
                <Toggle checked={settings.notifSystemAlerts} onChange={v => update('notifSystemAlerts', v)} />
              </SettingRow>
            </Section>
            <Section title="Options" icon="🔕" dm={dm}>
              <SettingRow label="Son des notifications" description="Jouer un son lors des alertes" dm={dm}>
                <Toggle checked={settings.notifSound} onChange={v => update('notifSound', v)} />
              </SettingRow>
              <SettingRow label="Position des toasts" description="Emplacement des notifications" dm={dm}>
                <Select value={settings.notifPosition} onChange={v => update('notifPosition', v)} dm={dm} options={[
                  { value: 'top-right',    label: 'Haut droite'   },
                  { value: 'top-left',     label: 'Haut gauche'   },
                  { value: 'bottom-right', label: 'Bas droite'    },
                  { value: 'bottom-left',  label: 'Bas gauche'    },
                  { value: 'top-center',   label: 'Haut centre'   },
                ]} />
              </SettingRow>
            </Section>
          </>
        )}

        {/* ══ CARTE ══════════════════════════════════════════════════════════ */}
        {section === 'perso' && (
          <Section title="Carte interactive" icon={<Map      size={17}/>} dm={dm}>
            <SettingRow label="Fond de carte par défaut" description="Style de carte affiché à l'ouverture" dm={dm}>
              <Select value={settings.defaultMapStyle} onChange={v => update('defaultMapStyle', v)} dm={dm} options={[
                { value: 'standard',  label: '🗺️ Standard'  },
                { value: 'satellite', label: '🛰️ Satellite' },
                { value: 'dark',      label: '🌙 Sombre'    },
                { value: 'topo',      label: '⛰️ Topographique' },
              ]} />
            </SettingRow>
            <SettingRow label="Clustering des marqueurs" description="Regrouper les marqueurs proches" dm={dm}>
              <Toggle checked={settings.clusterEnabled} onChange={v => update('clusterEnabled', v)} />
            </SettingRow>
          </Section>
        )}

        {/* ══ SÉCURITÉ ═══════════════════════════════════════════════════════ */}
        {section === 'security' && (
          <>
            <Section title="Session" icon={<Lock     size={17}/>} dm={dm}>
              <SettingRow label="Délai d'expiration de session" description={`Déconnexion automatique après ${settings.sessionTimeout} min · Se réinitialise à la prochaine session`} dm={dm}>
                <div style={{ width: 200 }}>
                  <Slider value={settings.sessionTimeout} onChange={v => update('sessionTimeout', v)} min={15} max={480} step={15} unit=" min" dm={dm} />
                </div>
              </SettingRow>
              <SettingRow label="Confirmation avant suppression" description="Demander confirmation avant toute suppression" dm={dm}>
                <Toggle checked={settings.confirmDelete} onChange={v => update('confirmDelete', v)} />
              </SettingRow>
            </Section>

            <Section title="Compte" icon={<User     size={17}/>} dm={dm}>
              <div style={{ padding: '12px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {/* Info profil */}
                {(() => {
                  try {
                    const token = localStorage.getItem('remine_admin_token');
                    if (!token) return null;
                    const p = JSON.parse(atob(token.split('.')[1]));
                    return (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: bgMut, borderRadius: 12, border: `1px solid ${dm ? '#334155' : '#f1f5f9'}` }}>
                        <div style={{ width: 44, height: 44, borderRadius: 14, background: 'linear-gradient(135deg,#10b981,#059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 900, color: '#fff', flexShrink: 0 }}>
                          {(p.firstName || p.email || '?').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 700, color: textPri, margin: 0 }}>{`${p.firstName || ''} ${p.lastName || ''}`.trim() || p.email}</p>
                          <p style={{ fontSize: 11, color: textSec, margin: '2px 0 0' }}>{p.email}</p>
                          <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 99, background: p.role === 'admin' ? '#fee2e2' : '#ede9fe', color: p.role === 'admin' ? '#dc2626' : '#7c3aed', display: 'inline-block', marginTop: 3 }}>
                            {p.role === 'admin' ? '🔴 Admin' : '🟣 Modérateur'}
                          </span>
                        </div>
                      </div>
                    );
                  } catch { return null; }
                })()}
                <button style={{ padding: '8px 14px', borderRadius: 10, border: '1px solid #fecaca', background: dm ? 'rgba(239,68,68,0.06)' : '#fee2e2', color: '#dc2626', fontSize: 12, fontWeight: 700, cursor: 'pointer', alignSelf: 'flex-start' }}
                  onClick={() => { if (window.confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) { localStorage.removeItem('remine_admin_token'); window.location.href = '/'; } }}>
                  🚪 Se déconnecter
                </button>
              </div>
            </Section>
          </>
        )}

        {/* ══ AVANCÉ ═════════════════════════════════════════════════════════ */}
        {/* ══ THÈMES ══════════════════════════════════════════════════════════ */}
        {section === 'appearance' && (
          <Section title="Thèmes prédéfinis" icon={<Palette  size={17}/>} dm={dm}>
            <div style={{ padding: '12px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 4 }}>
                <p style={{ fontSize: 12, color: textSec, margin: 0 }}>Choisissez un thème pour personnaliser l'apparence complète du dashboard</p>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#10b981', background: dm ? 'rgba(16,185,129,0.1)' : '#ecfdf5', padding: '3px 10px', borderRadius: 99 }}>
                  {THEMES[settings.theme]?.emoji || '🌍'} {THEMES[settings.theme]?.label || 'ReMine'} actif
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {Object.entries(THEMES).map(([key, t]) => {
                  const isActive = settings.theme === key;
                  return (
                    <button key={key} onClick={() => {
                      update('theme', key);
                      update('accentColor', t.accent);
                      update('darkMode', t.dark);
                    }} style={{
                      padding: '14px 16px', borderRadius: 14, border: `2px solid ${isActive ? t.accent : (dm ? '#334155' : '#e2e8f0')}`,
                      background: isActive ? (dm ? `${t.accent}15` : `${t.accent}10`) : (dm ? '#0f172a' : '#f8fafc'),
                      cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s',
                      boxShadow: isActive ? `0 4px 16px ${t.accent}25` : 'none',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 20 }}>{t.emoji}</span>
                          <span style={{ fontSize: 13, fontWeight: 800, color: isActive ? t.accent : textPri }}>{t.label}</span>
                        </div>
                        {isActive && <span style={{ fontSize: 11, fontWeight: 700, color: t.accent, background: `${t.accent}18`, padding: '2px 8px', borderRadius: 99 }}>✓ Actif</span>}
                      </div>
                      <p style={{ fontSize: 10, color: textSec, margin: 0 }}>{t.desc}</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
                        <div style={{ width: 18, height: 18, borderRadius: '50%', background: t.accent, boxShadow: `0 2px 6px ${t.accent}44` }} />
                        <span style={{ fontSize: 10, fontFamily: 'monospace', color: textMut }}>{t.accent}</span>
                        <span style={{ fontSize: 9, color: textMut, background: t.dark ? '#1e293b' : '#f1f5f9', padding: '1px 6px', borderRadius: 99, marginLeft: 4 }}>
                          {t.dark ? '🌙 Sombre' : '☀️ Clair'}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </Section>
        )}

        {/* ══ DASHBOARD ═════════════════════════════════════════════════════════ */}
        {section === 'perso' && (
          <>
            <Section title="Widgets de l'Aperçu" icon={<Layout   size={17}/>} dm={dm}>
              {[
                { key: 'showKpiReports',  label: 'KPI Signalements',     icon: '📋', desc: 'Carte total des signalements' },
                { key: 'showKpiResolved', label: 'KPI Résolus',          icon: '✅', desc: 'Carte taux de résolution' },
                { key: 'showKpiUrgent',   label: 'KPI Urgents',          icon: '🚨', desc: 'Carte signalements urgents' },
                { key: 'showKpiCitizens', label: 'KPI Citoyens',         icon: '👥', desc: 'Carte citoyens inscrits' },
                { key: 'showLiveFeed',    label: 'Flux temps réel',      icon: '🔴', desc: 'Activité en direct' },
                { key: 'showAIPriority',  label: 'Priorités IA',         icon: '🤖', desc: 'Moteur de priorisation IA' },
                { key: 'showImpact',      label: 'Impact environnemental', icon: '🌍', desc: 'Métriques CO₂, eau, déchets' },
              ].map(w => (
                <SettingRow key={w.key} label={`${w.icon} ${w.label}`} description={w.desc} dm={dm}>
                  <Toggle checked={settings[w.key] !== false} onChange={v => update(w.key, v)} />
                </SettingRow>
              ))}
            </Section>

            <Section title="Raccourcis rapides" icon={<Zap      size={17}/>} dm={dm}>
              <div style={{ padding: '10px 0' }}>
                <p style={{ fontSize: 12, color: textSec, margin: '0 0 12px' }}>
                  Ces préférences sont sauvegardées et utilisées au prochain chargement.
                  <span style={{ display:'block', fontSize:11, color:textMut, marginTop:4 }}>
                    ℹ️ L'affichage des raccourcis dans la sidebar sera activé dans une prochaine mise à jour.
                  </span>
                </p>
                {[
                  { key: 'pinSignalements', label: 'Épingler Signalements', default: true },
                  { key: 'pinAnalyse',      label: 'Épingler Analyse',      default: true },
                  { key: 'pinVotes',        label: 'Épingler onglet Votes', default: false },
                  { key: 'pinExport',       label: 'Épingler Export rapide', default: false },
                ].map(p => (
                  <SettingRow key={p.key} label={p.label} dm={dm}>
                    <Toggle checked={settings[p.key] !== false && settings[p.key] !== undefined ? settings[p.key] : p.default} onChange={v => update(p.key, v)} />
                  </SettingRow>
                ))}
              </div>
            </Section>
          </>
        )}

        {/* ══ RACCOURCIS CLAVIER ══════════════════════════════════════════════ */}
        {section === 'tools' && (
          <Section title="Raccourcis clavier" icon={<Keyboard size={17}/>} dm={dm}>
            <div style={{ padding: '8px 0', display: 'flex', flexDirection: 'column', gap: 2 }}>
              <p style={{ fontSize: 11, color: textSec, margin: '0 0 16px' }}>Tous les raccourcis actifs dans le dashboard</p>
              {[
                { category: 'Navigation', items: [
                  { keys: ['1'], desc: 'Onglet Aperçu'         },
                  { keys: ['2'], desc: 'Onglet Signalements'   },
                  { keys: ['3'], desc: 'Onglet Analyse'        },
                  { keys: ['4'], desc: 'Onglet Valorisation'   },
                  { keys: ['5'], desc: 'Onglet Citoyens'       },
                  { keys: ['6'], desc: 'Onglet Administration' },
                  { keys: ['7'], desc: 'Onglet Paramètres'     },
                ]},
                { category: 'Actions', items: [
                  { keys: ['R'],        desc: 'Actualiser les données'  },
                  { keys: ['⌘', 'K'],  desc: 'Ouvrir la recherche'     },
                  { keys: ['D'],        desc: 'Basculer dark mode'      },
                  { keys: ['Esc'],      desc: 'Fermer les modals'       },
                ]},
                { category: 'Export & Paramètres', items: [
                  { keys: ['⌘', 'E'],  desc: "Ouvrir l'export"         },
                  { keys: ['⌘', 'S'],  desc: 'Sauvegarder paramètres'  },
                ]},
              ].map(group => (
                <div key={group.category} style={{ marginBottom: 18 }}>
                  <p style={{ fontSize: 10, fontWeight: 800, color: textMut, textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 8px' }}>{group.category}</p>
                  {group.items.map((item, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${dm ? '#1e293b' : '#f8fafc'}` }}>
                      <span style={{ fontSize: 12, color: textPri }}>{item.desc}</span>
                      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                        {item.keys.map((k, j) => (
                          <React.Fragment key={j}>
                            {j > 0 && <span style={{ fontSize: 10, color: textMut }}>+</span>}
                            <kbd style={{ padding: '3px 8px', borderRadius: 6, background: dm ? '#0f172a' : '#f1f5f9', border: `1px solid ${dm ? '#334155' : '#d1d5db'}`, fontSize: 11, fontFamily: 'monospace', fontWeight: 700, color: textPri, boxShadow: dm ? '0 2px 0 #1e293b' : '0 2px 0 #d1d5db' }}>
                              {k}
                            </kbd>
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </Section>
        )}

                {/* ══ IMPORT / EXPORT CONFIG ════════════════════════════════════════════ */}
        {section === 'tools' && (
          <>
            <Section title="Exporter la configuration" icon={<FileUp   size={17}/>} dm={dm}>
              <div style={{ padding: '12px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <p style={{ fontSize: 12, color: textSec, margin: 0 }}>Sauvegardez tous vos paramètres dans un fichier JSON pour les restaurer plus tard ou les transférer sur un autre appareil.</p>
                <button onClick={() => {
                  const blob = new Blob([JSON.stringify({ version: '2.0', exported: new Date().toISOString(), settings }, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url; a.download = `remine-settings-${new Date().toISOString().split('T')[0]}.json`;
                  a.click(); URL.revokeObjectURL(url);
                  setInfo({ type: 'success', msg: '✅ Configuration exportée' });
                  setTimeout(() => setInfo(null), 3000);
                }} style={{ padding: '10px 16px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 12px rgba(16,185,129,0.3)' }}>
                  📥 Télécharger remine-settings.json
                </button>
                <div style={{ padding: '10px 14px', background: bgMut, borderRadius: 10, border: `1px solid ${dm ? '#334155' : '#f1f5f9'}` }}>
                  <p style={{ fontSize: 11, color: textMut, margin: 0 }}>Inclut : thème, couleurs, préférences, notifications, carte, sécurité, dashboard</p>
                </div>
              </div>
            </Section>

            <Section title="Importer une configuration" icon={<FileDown size={17}/>} dm={dm}>
              <div style={{ padding: '12px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <p style={{ fontSize: 12, color: textSec, margin: 0 }}>Restaurez une configuration précédemment exportée. Les paramètres actuels seront remplacés.</p>
                <label style={{ padding: '10px 16px', borderRadius: 12, border: `2px dashed ${dm ? '#334155' : '#e2e8f0'}`, background: bgMut, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, transition: 'all 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = '#10b981'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = dm ? '#334155' : '#e2e8f0'}>
                  <span style={{ fontSize: 20 }}>📂</span>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: textPri, margin: 0 }}>Choisir un fichier JSON</p>
                    <p style={{ fontSize: 10, color: textMut, margin: '2px 0 0' }}>Format : remine-settings-*.json</p>
                  </div>
                  <input type="file" accept=".json" style={{ display: 'none' }} onChange={e => {
                    const file = e.target.files[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = ev => {
                      try {
                        const parsed = JSON.parse(ev.target.result);
                        if (parsed.settings) {
                          const merged = { ...DEFAULTS, ...parsed.settings };
                          setSettings(merged);
                          saveSettings(merged);
                          if (merged.darkMode !== undefined) onDarkModeChange?.(merged.darkMode);
                          if (merged.accentColor) document.documentElement.style.setProperty('--brand-500', merged.accentColor);
                          setInfo({ type: 'success', msg: `✅ Configuration importée (v${parsed.version || '?'} du ${parsed.exported?.split('T')[0] || '?'})` });
                        } else {
                          setInfo({ type: 'error', msg: '❌ Format de fichier invalide' });
                        }
                      } catch {
                        setInfo({ type: 'error', msg: '❌ Fichier JSON invalide' });
                      }
                      setTimeout(() => setInfo(null), 4000);
                    };
                    reader.readAsText(file);
                    e.target.value = '';
                  }} />
                </label>
                <div style={{ padding: '10px 14px', background: dm ? 'rgba(239,68,68,0.06)' : '#fef2f2', borderRadius: 10, border: `1px solid ${dm ? '#7f1d1d' : '#fecaca'}` }}>
                  <p style={{ fontSize: 11, color: '#dc2626', margin: 0, fontWeight: 600 }}>⚠️ L'importation remplace immédiatement tous vos paramètres actuels</p>
                </div>
              </div>
            </Section>
          </>
        )}

        {section === 'data' && (
          <>
            <Section title="Développement" icon={<Wrench   size={17}/>} dm={dm}>
              <SettingRow label="Mode debug" description="Afficher les logs dans la console" dm={dm}>
                <Toggle checked={settings.debugMode} onChange={v => update('debugMode', v)} />
              </SettingRow>
              <SettingRow label="Langue de l'interface" description="Langue d'affichage" dm={dm}>
                <Select value={settings.language} onChange={v => update('language', v)} dm={dm} options={[
                  { value: 'fr', label: '🇫🇷 Français' },
                  { value: 'en', label: '🇬🇧 English'  },
                  { value: 'wo', label: '🇸🇳 Wolof'    },
                ]} />
              </SettingRow>
            </Section>

            <Section title="Stockage local" icon={<FileDown size={17}/>} dm={dm}>
              <div style={{ padding: '12px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {/* Utilisation localStorage */}
                {(() => {
                  let size = 0;
                  try { Object.keys(localStorage).forEach(k => { size += (localStorage.getItem(k) || '').length; }); } catch {}
                  const kb = (size / 1024).toFixed(1);
                  return (
                    <div style={{ padding: '12px 14px', background: bgMut, borderRadius: 12, border: `1px solid ${dm ? '#334155' : '#f1f5f9'}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span style={{ fontSize: 12, color: textSec }}>Espace utilisé</span>
                        <span style={{ fontSize: 12, fontWeight: 800, color: textPri }}>{kb} Ko / ~5 Mo</span>
                      </div>
                      <div style={{ height: 6, background: dm ? '#334155' : '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{ height: '100%', background: 'linear-gradient(90deg,#10b981,#34d399)', width: `${Math.min(100, (size / (5*1024*1024)) * 100)}%`, borderRadius: 99 }} />
                      </div>
                    </div>
                  );
                })()}
                <button onClick={handleClearCache} style={{ padding: '8px 14px', borderRadius: 10, border: `1px solid ${dm ? '#334155' : '#e2e8f0'}`, background: dm ? '#0f172a' : '#f8fafc', color: textSec, fontSize: 12, fontWeight: 700, cursor: 'pointer', alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 6 }}>
                  🗑️ Vider le cache (sauf connexion)
                </button>
                <button onClick={() => { localStorage.clear(); window.location.reload(); }} style={{ padding: '8px 14px', borderRadius: 10, border: '1px solid #fecaca', background: dm ? 'rgba(239,68,68,0.06)' : '#fee2e2', color: '#dc2626', fontSize: 12, fontWeight: 700, cursor: 'pointer', alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 6 }}>
                  ⚠️ Effacer tout le stockage local
                </button>
              </div>
            </Section>
          </>
        )}

        {/* ══ À PROPOS ═══════════════════════════════════════════════════════ */}
        {section === 'about' && (
          <Section title="À propos de ReMine" icon={<Info     size={17}/>} dm={dm}>
            <div style={{ padding: '16px 0', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Logo + version */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <img src={LOGO_BASE64} alt="ReMine" style={{ width: 64, height: 64, borderRadius: 16, objectFit: 'cover', boxShadow: '0 8px 24px rgba(16,185,129,0.3)', flexShrink: 0 }} />
                <div>
                  <h2 style={{ fontSize: 20, fontWeight: 900, color: textPri, margin: 0 }}>ReMine</h2>
                  <p style={{ fontSize: 12, color: '#10b981', margin: '2px 0 0', fontWeight: 700 }}>Citizen Track Dashboard</p>
                  <p style={{ fontSize: 11, color: textSec, margin: '3px 0 0' }}>Version 2.0.0 · Build 2026</p>
                </div>
              </div>

              <p style={{ fontSize: 13, color: textSec, lineHeight: 1.7, margin: 0, padding: '12px 14px', background: bgMut, borderRadius: 12, border: `1px solid ${dm ? '#334155' : '#f1f5f9'}` }}>
                Plateforme de surveillance environnementale permettant aux citoyens sénégalais de signaler et suivre les problèmes liés à l'exploitation minière. Développée pour favoriser la transparence et la participation citoyenne.
              </p>

              {[
                { label: 'Frontend',  value: 'Next.js 16 · React · Tailwind CSS · Recharts · Leaflet'  },
                { label: 'Backend',   value: 'Node.js · Express · MongoDB Atlas · Socket.IO'            },
                { label: 'Mobile',    value: 'React Native · Expo SDK 54'                               },
                { label: 'Déployé sur', value: 'Vercel (dashboard) · Render (API)'                     },
              ].map(r => (
                <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${dm ? '#1e293b' : '#f1f5f9'}` }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: textSec }}>{r.label}</span>
                  <span style={{ fontSize: 12, color: textPri, textAlign: 'right', maxWidth: '60%' }}>{r.value}</span>
                </div>
              ))}
            </div>
          </Section>
        )}
      </div>
    </div>
  );
}
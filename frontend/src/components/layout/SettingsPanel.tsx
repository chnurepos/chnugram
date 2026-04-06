import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useThemeStore } from '../../stores/themeStore';
import { useAuthStore } from '../../stores/authStore';
import { authApi } from '../../services/api';
import { getAvatarUrl } from '../../utils/helpers';
import { stopConnection } from '../../services/signalr';
import Avatar from '../ui/Avatar';

interface SettingsPanelProps {
  onClose: () => void;
}

function loadSetting(key: string, def: boolean): boolean {
  try { const v = localStorage.getItem(key); return v === null ? def : v === 'true'; } catch { return def; }
}
function saveSetting(key: string, val: boolean) {
  try { localStorage.setItem(key, String(val)); } catch {}
}

export default function SettingsPanel({ onClose }: SettingsPanelProps) {
  const { theme, setTheme } = useThemeStore();
  const { user, refreshToken, logout } = useAuthStore();
  const [soundOn, setSoundOn] = useState(() => loadSetting('setting-sound', true));
  const [notifOn, setNotifOn] = useState(() => loadSetting('setting-notif', false));
  const [showOnline, setShowOnline] = useState(() => loadSetting('setting-show-online', true));
  const [showRead, setShowRead] = useState(() => loadSetting('setting-show-read', true));
  const [closing, setClosing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigate = useNavigate();

  const toggle = (val: boolean, set: (v: boolean) => void, key: string) => {
    const next = !val;
    set(next);
    saveSetting(key, next);
    if (key === 'setting-notif' && next) Notification.requestPermission().catch(() => {});
  };

  const animateClose = useCallback(() => {
    setClosing(true);
    setTimeout(() => onClose(), 280);
  }, [onClose]);

  const scheduleClose = useCallback(() => {
    closeTimer.current = setTimeout(() => animateClose(), 120);
  }, [animateClose]);

  const cancelClose = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }, []);

  const handleLogout = async () => {
    try { if (refreshToken) await authApi.logout(refreshToken); } catch {}
    await stopConnection();
    logout();
    navigate('/login');
  };

  // Close when clicking outside (in chat area)
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        animateClose();
      }
    };
    const t = setTimeout(() => document.addEventListener('mousedown', handler), 50);
    return () => { clearTimeout(t); document.removeEventListener('mousedown', handler); };
  }, [animateClose]);

  return (
    <div
      ref={panelRef}
      className={`absolute inset-0 z-30 flex flex-col overflow-y-auto ${closing ? 'settings-slide-down' : 'settings-slide-up'}`}
      style={{ background: 'var(--bg-sidebar)' }}
      onMouseLeave={scheduleClose}
      onMouseEnter={cancelClose}
      onMouseDown={e => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0" style={{ background: 'var(--bg-header)', borderBottom: '1px solid var(--border-real)' }}>
        <button
          onClick={animateClose}
          className="p-1.5 rounded-xl transition-colors"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = ''; }}
        >
          <svg style={{ width: 20, height: 20 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <h2 className="font-semibold text-sm" style={{ color: 'var(--text-primary)', fontFamily: "'Space Mono', monospace", letterSpacing: '0.05em' }}>
          SETTINGS
        </h2>
      </div>

      {/* Profile card */}
      <div className="flex items-center gap-4 px-5 py-4 flex-shrink-0" style={{ borderBottom: '1px solid var(--border-real)' }}>
        <Avatar src={getAvatarUrl(user?.avatarUrl)} name={user?.displayName ?? '?'} size="lg" isOnline />
        <div className="min-w-0">
          <p className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>{user?.displayName}</p>
          <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>@{user?.username}</p>
        </div>
      </div>

      <div className="flex-1 py-2">
        {/* Appearance */}
        <SectionLabel>Appearance</SectionLabel>
        <div className="px-4 pb-3 flex gap-3">
          <ThemeBtn active={theme === 'light'} onClick={() => setTheme('light')}>
            <SunIcon />
            <span>Light</span>
          </ThemeBtn>
          <ThemeBtn active={theme === 'dark'} onClick={() => setTheme('dark')}>
            <MoonIcon />
            <span>Dark</span>
          </ThemeBtn>
        </div>

        {/* Notifications */}
        <SectionLabel>Notifications and Sounds</SectionLabel>
        <SettingRow
          icon={<BellIcon />}
          label="Message sounds"
          right={<Toggle on={soundOn} onToggle={() => toggle(soundOn, setSoundOn, 'setting-sound')} />}
        />
        <SettingRow
          icon={<NotifIcon />}
          label="Browser notifications"
          right={<Toggle on={notifOn} onToggle={() => toggle(notifOn, setNotifOn, 'setting-notif')} />}
        />

        {/* Privacy */}
        <SectionLabel>Privacy and Security</SectionLabel>
        <SettingRow
          icon={<EyeIcon />}
          label="Show online status"
          right={<Toggle on={showOnline} onToggle={() => toggle(showOnline, setShowOnline, 'setting-show-online')} />}
        />
        <SettingRow
          icon={<CheckIcon />}
          label="Show read receipts"
          right={<Toggle on={showRead} onToggle={() => toggle(showRead, setShowRead, 'setting-show-read')} />}
        />
      </div>

      {/* Logout */}
      <div className="px-4 py-3 flex-shrink-0" style={{ borderTop: '1px solid var(--border-real)' }}>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-colors text-left"
          style={{ color: '#e74c3c' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(231,76,60,0.08)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = ''; }}
        >
          <svg style={{ width: 18, height: 18, color: '#e74c3c', flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span className="text-sm font-medium">Log out</span>
        </button>
      </div>

      {/* Version */}
      <div className="px-5 py-3 flex-shrink-0">
        <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>CHNUgram · v2.0</p>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-5 pt-3 pb-1.5 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--accent)' }}>
      {children}
    </p>
  );
}

function SettingRow({ icon, label, right }: { icon: React.ReactNode; label: string; right?: React.ReactNode }) {
  return (
    <div
      className="flex items-center gap-4 px-5 py-3 transition-colors"
      style={{ cursor: 'default' }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ''; }}
    >
      <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>{icon}</span>
      <span className="flex-1 text-sm" style={{ color: 'var(--text-primary)' }}>{label}</span>
      {right}
    </div>
  );
}

function ThemeBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="flex-1 flex flex-col items-center gap-2 py-3 rounded-2xl transition-all text-sm font-medium"
      style={{
        background: active ? 'var(--accent-muted)' : 'var(--bg-input)',
        border: `2px solid ${active ? 'var(--accent)' : 'transparent'}`,
        color: active ? 'var(--accent)' : 'var(--text-secondary)',
      }}
    >
      {children}
    </button>
  );
}

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="w-11 h-6 rounded-full relative transition-colors flex-shrink-0"
      style={{ background: on ? 'var(--accent)' : 'var(--bg-input)' }}
    >
      <div
        className="absolute top-1 w-4 h-4 rounded-full bg-white transition-transform shadow-sm"
        style={{ transform: on ? 'translateX(22px)' : 'translateX(4px)' }}
      />
    </button>
  );
}

function SunIcon() {
  return <svg style={{ width: 20, height: 20 }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>;
}
function MoonIcon() {
  return <svg style={{ width: 20, height: 20 }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>;
}
function BellIcon() {
  return <svg style={{ width: 20, height: 20 }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>;
}
function NotifIcon() {
  return <svg style={{ width: 20, height: 20 }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H4a2 2 0 01-2-2V5a2 2 0 012-2h16a2 2 0 012 2v10a2 2 0 01-2 2h-1" /></svg>;
}
function EyeIcon() {
  return <svg style={{ width: 20, height: 20 }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>;
}
function CheckIcon() {
  return <svg style={{ width: 20, height: 20 }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
}

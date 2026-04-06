import { useState } from 'react';
import { useThemeStore } from '../../stores/themeStore';
import { useAuthStore } from '../../stores/authStore';
import { getAvatarUrl } from '../../utils/helpers';

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
  const { user } = useAuthStore();
  const [soundOn, setSoundOn] = useState(() => loadSetting('setting-sound', true));
  const [notifOn, setNotifOn] = useState(() => loadSetting('setting-notif', false));
  const [showOnline, setShowOnline] = useState(() => loadSetting('setting-show-online', true));
  const [showRead, setShowRead] = useState(() => loadSetting('setting-show-read', true));

  const toggle = (val: boolean, set: (v: boolean) => void, key: string) => {
    const next = !val;
    set(next);
    saveSetting(key, next);
    if (key === 'setting-notif' && next) {
      Notification.requestPermission().catch(() => {});
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center fade-in"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(5px)' }}
      onMouseDown={e => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl p-6 slide-up"
        style={{ background: 'var(--bg-card)', boxShadow: 'var(--shadow-lg)' }}
        onMouseDown={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Налаштування</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl transition-colors"
            style={{ background: 'var(--bg-input)', color: 'var(--text-muted)' }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Profile quick info */}
        <div className="flex items-center gap-3 p-3 rounded-2xl mb-5" style={{ background: 'var(--bg-input)' }}>
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm overflow-hidden flex-shrink-0"
            style={{ background: 'var(--accent)' }}>
            {user?.avatarUrl
              ? <img src={getAvatarUrl(user.avatarUrl)} alt="" className="w-full h-full object-cover" />
              : user?.displayName?.[0]?.toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{user?.displayName}</p>
            <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>@{user?.username}</p>
          </div>
        </div>

        {/* Theme */}
        <Section title="Зовнішній вигляд">
          <div className="flex gap-3">
            <ThemeOption active={theme === 'light'} onClick={() => setTheme('light')} icon={<SunIcon />} label="Світла" />
            <ThemeOption active={theme === 'dark'} onClick={() => setTheme('dark')} icon={<MoonIcon />} label="Темна" />
          </div>
        </Section>

        {/* Notifications */}
        <Section title="Сповіщення">
          <ToggleRow label="Звук повідомлень" on={soundOn} onToggle={() => toggle(soundOn, setSoundOn, 'setting-sound')} />
          <ToggleRow label="Сповіщення браузера" on={notifOn} onToggle={() => toggle(notifOn, setNotifOn, 'setting-notif')} />
        </Section>

        {/* Privacy */}
        <Section title="Конфіденційність">
          <ToggleRow label="Показувати статус 'онлайн'" on={showOnline} onToggle={() => toggle(showOnline, setShowOnline, 'setting-show-online')} />
          <ToggleRow label="Показувати прочитання" on={showRead} onToggle={() => toggle(showRead, setShowRead, 'setting-show-read')} />
        </Section>

        {/* About */}
        <div className="mt-3 pt-4">
          <p className="text-xs text-center font-mono" style={{ color: 'var(--text-muted)' }}>
            CHNUgram · v2.0
          </p>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>{title}</p>
      {children}
    </div>
  );
}

function ThemeOption({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className="flex-1 flex flex-col items-center gap-2 p-4 rounded-2xl transition-all"
      style={{
        background: active ? 'var(--accent-muted)' : 'var(--bg-input)',
        border: `2px solid ${active ? 'var(--accent)' : 'transparent'}`,
        color: active ? 'var(--accent)' : 'var(--text-secondary)',
      }}
    >
      {icon}
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}

function ToggleRow({ label, on, onToggle }: { label: string; on: boolean; onToggle: () => void }) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{label}</span>
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
    </div>
  );
}

function SunIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
    </svg>
  );
}

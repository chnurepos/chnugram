import { useState, useEffect, useRef } from 'react';
import { usersApi } from '../../services/api';
import { getAvatarUrl, formatLastSeen } from '../../utils/helpers';
import { useChatStore } from '../../stores/chatStore';
import type { User } from '../../types';

// Local storage key for custom contact info
const CUSTOM_CONTACTS_KEY = 'chnugram_custom_contacts';

export interface CustomContact {
  userId: string;
  customName?: string;
  customAvatarUrl?: string; // base64 or url
}

export function getCustomContacts(): Record<string, CustomContact> {
  try {
    return JSON.parse(localStorage.getItem(CUSTOM_CONTACTS_KEY) ?? '{}');
  } catch {
    return {};
  }
}

export function saveCustomContact(contact: CustomContact) {
  const all = getCustomContacts();
  all[contact.userId] = contact;
  localStorage.setItem(CUSTOM_CONTACTS_KEY, JSON.stringify(all));
}

export function getCustomContact(userId: string): CustomContact | null {
  return getCustomContacts()[userId] ?? null;
}

interface UserProfileModalProps {
  userId: string;
  onClose: () => void;
}

export default function UserProfileModal({ userId, onClose }: UserProfileModalProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customAvatar, setCustomAvatar] = useState<string | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const { onlineUsers } = useChatStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLoading(true);
    usersApi.getUser(userId).then(res => {
      const u = res.data.data!;
      setUser(u);
      const custom = getCustomContact(userId);
      setCustomName(custom?.customName ?? u.displayName);
      setCustomAvatar(custom?.customAvatarUrl ?? getAvatarUrl(u.avatarUrl));
    }).catch(console.error).finally(() => setLoading(false));
  }, [userId]);

  const isOnline = onlineUsers.has(userId) || (user?.isOnline ?? false);

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setCustomAvatar(ev.target?.result as string);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    saveCustomContact({
      userId: user.id,
      customName: customName !== user.displayName ? customName : undefined,
      customAvatarUrl: customAvatar !== getAvatarUrl(user.avatarUrl) ? customAvatar : undefined,
    });
    setSaving(false);
    setIsEditing(false);
    window.dispatchEvent(new Event('storage'));
  };

  const handleReset = () => {
    if (!user) return;
    saveCustomContact({ userId: user.id });
    setCustomName(user.displayName);
    setCustomAvatar(getAvatarUrl(user.avatarUrl));
    setIsEditing(false);
    window.dispatchEvent(new Event('storage'));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center fade-in"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
      onMouseDown={e => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-sm mx-4 rounded-2xl overflow-hidden slide-up"
        style={{ background: 'var(--bg-card)', boxShadow: 'var(--shadow-lg)', maxHeight: '90vh', overflowY: 'auto' }}
        onMouseDown={e => e.stopPropagation()}
      >
        {/* Header strip */}
        <div className="h-20 relative flex-shrink-0" style={{ background: 'var(--bg-input)' }}>
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 rounded-xl transition-colors"
            style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)' }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="absolute top-3 left-4">
            <span className="text-xs font-mono tracking-widest" style={{ color: 'var(--text-muted)' }}>// КОНТАКТ</span>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-8 h-8 border-4 rounded-full" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
          </div>
        ) : user ? (
          <div className="px-6 pb-6 -mt-10">
            {/* Avatar row */}
            <div className="flex justify-between items-end mb-4">
              <div className="relative">
                <div className="w-20 h-20 rounded-full overflow-hidden shadow-lg flex items-center justify-center" style={{ background: 'var(--accent)' }}>
                  {customAvatar ? (
                    <img src={customAvatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-white text-2xl font-bold">{(customName || user.displayName)[0].toUpperCase()}</span>
                  )}
                </div>
                <div
                  className="absolute bottom-1 right-1 w-4 h-4 rounded-full border-2"
                  style={{ background: isOnline ? 'var(--online)' : 'var(--text-muted)', borderColor: 'var(--bg-card)' }}
                />
                {isEditing && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 rounded-full flex items-center justify-center text-white transition-colors"
                    style={{ background: 'rgba(0,0,0,0.45)' }}
                  >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </button>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarFileChange} />
              </div>

              <div className="flex gap-2 mb-1">
                {!isEditing ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all"
                    style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Змінити
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        const c = getCustomContact(userId);
                        setCustomName(c?.customName ?? user.displayName);
                        setCustomAvatar(c?.customAvatarUrl ?? getAvatarUrl(user.avatarUrl));
                      }}
                      className="px-3 py-1.5 rounded-xl text-sm font-medium transition-colors"
                      style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)' }}
                    >
                      Скасувати
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="btn-primary px-3 py-1.5 text-sm"
                    >
                      {saving ? '...' : 'Зберегти'}
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Name */}
            {isEditing ? (
              <div className="mb-3">
                <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-muted)' }}>
                  Відображуване ім'я (лише для вас)
                </label>
                <input
                  value={customName}
                  onChange={e => setCustomName(e.target.value)}
                  className="input-field"
                  placeholder="Кастомне ім'я..."
                />
              </div>
            ) : (
              <div className="mb-1">
                <h3 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{customName || user.displayName}</h3>
                {customName && customName !== user.displayName && (
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Реальне ім'я: {user.displayName}</p>
                )}
              </div>
            )}

            <p className="text-sm mb-3" style={{ color: 'var(--text-muted)' }}>@{user.username}</p>

            {/* Online status */}
            <div className="flex items-center gap-1.5 mb-4">
              <div className="w-2 h-2 rounded-full" style={{ background: isOnline ? 'var(--online)' : 'var(--text-muted)' }} />
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {isOnline ? 'Онлайн' : `Був(ла) ${formatLastSeen(user.lastSeenAt)}`}
              </span>
            </div>

            {/* Bio */}
            {user.bio && (
              <div className="rounded-xl p-3 mb-4" style={{ background: 'var(--bg-input)' }}>
                <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Про себе</p>
                <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{user.bio}</p>
              </div>
            )}

            {/* Reset custom */}
            {getCustomContact(userId) && (getCustomContact(userId)?.customName || getCustomContact(userId)?.customAvatarUrl) && !isEditing && (
              <button
                onClick={handleReset}
                className="w-full text-center text-xs py-1 transition-colors"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#e74c3c')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
              >
                Скинути кастомізацію
              </button>
            )}
          </div>
        ) : (
          <div className="px-6 py-8 text-center" style={{ color: 'var(--text-muted)' }}>Користувача не знайдено</div>
        )}
      </div>
    </div>
  );
}

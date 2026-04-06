import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { usersApi } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import Avatar from '../ui/Avatar';
import { format } from 'date-fns';
import { uk } from 'date-fns/locale';
import { getAvatarUrl } from '../../utils/helpers';

interface ProfileFormData {
  displayName: string;
  username: string;
  bio: string;
}

interface ProfileModalProps {
  onClose: () => void;
}

export default function ProfileModal({ onClose }: ProfileModalProps) {
  const { user, setUser } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [avatarLoading, setAvatarLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ProfileFormData>({
    defaultValues: {
      displayName: user?.displayName ?? '',
      username: user?.username ?? '',
      bio: user?.bio ?? '',
    },
  });

  const onSubmit = async (data: ProfileFormData) => {
    setError('');
    setSuccess('');
    try {
      const response = await usersApi.updateProfile({
        displayName: data.displayName,
        username: data.username,
        bio: data.bio,
      });
      setUser(response.data.data!);
      setSuccess('Профіль оновлено!');
      setIsEditing(false);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e?.response?.data?.message ?? 'Помилка оновлення');
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarLoading(true);
    setError('');
    try {
      const response = await usersApi.updateAvatar(file);
      setUser(response.data.data!);
      setSuccess('Аватар оновлено!');
    } catch {
      setError('Помилка завантаження аватара');
    } finally {
      setAvatarLoading(false);
      // Reset file input so same file can be selected again
      e.target.value = '';
    }
  };

  if (!user) return null;

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
            <span className="text-xs font-mono tracking-widest" style={{ color: 'var(--text-muted)' }}>// ПРОФІЛЬ</span>
          </div>
        </div>

        {/* Avatar overlap */}
        <div className="px-6 pb-4 -mt-10">
          <div className="flex items-end gap-4 mb-4">
            <div className="relative">
              <div className="rounded-full overflow-hidden shadow-lg">
                <Avatar src={getAvatarUrl(user.avatarUrl)} name={user.displayName} size="xl" />
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={avatarLoading}
                className="absolute -bottom-1 -right-1 w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:scale-105"
                style={{ background: 'var(--accent)', color: '#fff', boxShadow: '0 2px 8px rgba(0,184,148,0.5)' }}
              >
                {avatarLoading
                  ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                }
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </div>

            <div className="flex-1 min-w-0 mt-10">
              <h2 className="font-bold text-lg truncate" style={{ color: 'var(--text-primary)' }}>{user.displayName}</h2>
              <p className="text-sm truncate" style={{ color: 'var(--text-muted)' }}>@{user.username}</p>
            </div>

            <div className="mt-10 flex-shrink-0">
              {!isEditing && (
                <button
                  onClick={() => { setIsEditing(true); setSuccess(''); setError(''); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all"
                  style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Змінити
                </button>
              )}
            </div>
          </div>

          {/* Verification badge */}
          <div className="mb-4">
            {user.isVerified
              ? <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg font-medium" style={{ background: 'rgba(0,184,148,0.12)', color: 'var(--accent)' }}>
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                  </svg>
                  Email підтверджено
                </span>
              : <span className="inline-flex text-xs px-2.5 py-1 rounded-lg font-medium" style={{ background: 'rgba(253,203,110,0.15)', color: '#e67e22' }}>
                  Email не підтверджено
                </span>
            }
          </div>

          {/* Alerts */}
          {error && (
            <div className="mb-3 px-3 py-2 rounded-xl text-sm flex items-center gap-2" style={{ background: 'rgba(231,76,60,0.1)', color: '#e74c3c' }}>
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {error}
            </div>
          )}
          {success && (
            <div className="mb-3 px-3 py-2 rounded-xl text-sm flex items-center gap-2" style={{ background: 'rgba(0,184,148,0.1)', color: 'var(--accent)' }}>
              <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
              </svg>
              {success}
            </div>
          )}

          {/* Info / Edit form */}
          {isEditing ? (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
              <div>
                <label className="auth-label block mb-1.5">Відображуване ім'я</label>
                <input {...register('displayName', { required: true, minLength: 2 })} className="input-field" />
                {errors.displayName && <p className="text-xs mt-1" style={{ color: '#e74c3c' }}>Мінімум 2 символи</p>}
              </div>
              <div>
                <label className="auth-label block mb-1.5">Username</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--text-muted)' }}>@</span>
                  <input {...register('username', { required: true, minLength: 3 })} className="input-field pl-7" />
                </div>
                {errors.username && <p className="text-xs mt-1" style={{ color: '#e74c3c' }}>Мінімум 3 символи</p>}
              </div>
              <div>
                <label className="auth-label block mb-1.5">Про себе</label>
                <textarea {...register('bio')} className="input-field resize-none" rows={3} placeholder="Розкажіть щось..." />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => { setIsEditing(false); reset(); setError(''); }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors"
                  style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)' }}
                >
                  Скасувати
                </button>
                <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
                  {isSubmitting ? 'Зберігаємо...' : 'Зберегти'}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-1">
              <InfoRow label="Email" value={user.email} />
              <InfoRow label="Username" value={`@${user.username}`} />
              {user.bio && <InfoRow label="Про себе" value={user.bio} />}
              <InfoRow label="Реєстрація" value={format(new Date(user.createdAt), 'd MMMM yyyy', { locale: uk })} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-3 py-1.5">
      <span className="auth-label w-24 flex-shrink-0">{label}</span>
      <span className="text-sm flex-1 break-all" style={{ color: 'var(--text-primary)' }}>{value}</span>
    </div>
  );
}

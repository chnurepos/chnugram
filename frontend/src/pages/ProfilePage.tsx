import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { usersApi } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import Avatar from '../components/ui/Avatar';
import { format } from 'date-fns';
import { uk } from 'date-fns/locale';

interface ProfileFormData {
  displayName: string;
  username: string;
  bio: string;
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, setUser } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ProfileFormData>({
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
      setSuccess('Профіль оновлено успішно!');
      setIsEditing(false);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error?.response?.data?.message ?? 'Помилка оновлення профілю');
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const response = await usersApi.updateAvatar(file);
      setUser(response.data.data!);
      setSuccess('Аватар оновлено!');
    } catch {
      setError('Помилка оновлення аватара');
    }
  };

  if (!user) return null;

  return (
    <div className="flex-1 overflow-y-auto" style={{ background: 'linear-gradient(180deg, #eef2f7 0%, #e8edf5 100%)' }}>
      {/* Top gradient header */}
      <div className="relative" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', paddingBottom: '60px' }}>
        <div className="flex items-center gap-3 px-4 pt-4 pb-2">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-bold text-white">Мій профіль</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 -mt-12 pb-8">
        {/* Avatar card */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-4">
          <div className="flex flex-col items-center">
            <div className="relative">
              <div className="ring-4 ring-white rounded-full shadow-lg">
                <Avatar src={user.avatarUrl} name={user.displayName} size="xl" />
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white shadow-lg hover:shadow-xl transition-all hover:scale-105"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />

            <h2 className="mt-4 text-xl font-bold text-gray-900">{user.displayName}</h2>
            <p className="text-gray-500 text-sm">@{user.username}</p>

            {user.isVerified ? (
              <span className="mt-2 flex items-center gap-1 text-xs text-green-700 bg-green-50 border border-green-200 px-3 py-1 rounded-full font-medium">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                </svg>
                Email підтверджено
              </span>
            ) : (
              <span className="mt-2 text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 px-3 py-1 rounded-full font-medium">
                Email не підтверджено
              </span>
            )}
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm flex items-center gap-2">
            <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
            </svg>
            {success}
          </div>
        )}

        {/* Info/Edit card */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-semibold text-gray-900">Інформація</h3>
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Редагувати
              </button>
            )}
          </div>

          {isEditing ? (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Відображуване ім'я</label>
                <input {...register('displayName', { required: true, minLength: 2 })} className="input-field" />
                {errors.displayName && <p className="text-red-500 text-xs mt-1">Мінімум 2 символи</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Username</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">@</span>
                  <input {...register('username', { required: true, minLength: 3 })} className="input-field pl-7" />
                </div>
                {errors.username && <p className="text-red-500 text-xs mt-1">Мінімум 3 символи</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Про себе</label>
                <textarea
                  {...register('bio')}
                  className="input-field resize-none"
                  rows={3}
                  placeholder="Розкажіть щось про себе..."
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setIsEditing(false)} className="btn-secondary flex-1">
                  Скасувати
                </button>
                <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
                  {isSubmitting ? 'Зберігаємо...' : 'Зберегти'}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <InfoRow icon="✉️" label="Email" value={user.email} />
              <InfoRow icon="@" label="Username" value={`@${user.username}`} />
              {user.bio && <InfoRow icon="📝" label="Про себе" value={user.bio} />}
              <InfoRow
                icon="📅"
                label="Дата реєстрації"
                value={format(new Date(user.createdAt), 'd MMMM yyyy', { locale: uk })}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 py-1">
      <span className="text-base mt-0.5 w-5 text-center">{icon}</span>
      <div>
        <dt className="text-xs text-gray-400 font-medium">{label}</dt>
        <dd className="text-sm text-gray-900 mt-0.5">{value}</dd>
      </div>
    </div>
  );
}

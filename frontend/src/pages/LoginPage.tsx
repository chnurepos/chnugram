import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { authApi } from '../services/api';
import { useAuthStore } from '../stores/authStore';

const schema = z.object({
  username: z.string().min(1, 'Enter your username'),
  password: z.string().min(1, 'Enter your password'),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [error, setError] = useState('');

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setError('');
    try {
      const email = data.username.includes('@') ? data.username : `${data.username}@chnu.edu.ua`;
      const response = await authApi.login({ email, password: data.password });
      const { accessToken, refreshToken, user } = response.data.data!;
      setAuth(user, accessToken, refreshToken);
      navigate('/');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e?.response?.data?.message ?? 'Login failed. Please try again.');
    }
  };

  return (
    <AuthShell>
      <div className="auth-card glass-card">
        <div className="auth-tabs">
          <span className="auth-tab auth-tab-active">Sign in</span>
          <Link to="/register" className="auth-tab">Sign up</Link>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="auth-form">
          <AuthField label="University email" error={errors.username?.message}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                {...register('username')}
                type="text"
                placeholder="your.name"
                className="auth-input"
                style={{ paddingRight: '130px' }}
                autoComplete="username"
                autoFocus
              />
              <span style={{
                position: 'absolute',
                right: '14px',
                color: 'var(--text-muted)',
                fontFamily: "'DM Sans', sans-serif",
                fontSize: '14px',
                pointerEvents: 'none',
                userSelect: 'none',
              }}>@chnu.edu.ua</span>
            </div>
          </AuthField>

          <AuthField label="Password" error={errors.password?.message}>
            <input
              {...register('password')}
              type="password"
              placeholder="••••••••"
              className="auth-input"
              autoComplete="current-password"
            />
          </AuthField>

          {error && <div className="auth-error">{error}</div>}

          <button type="submit" disabled={isSubmitting} className="auth-btn">
            {isSubmitting && <span className="auth-spinner" />}
            <span>{isSubmitting ? 'Signing in...' : 'Sign in →'}</span>
          </button>
        </form>

        <div className="auth-divider"><span>///</span></div>
        <p className="auth-hint">
          No account? <Link to="/register" className="auth-hint-link">Sign up</Link>
        </p>
      </div>
    </AuthShell>
  );
}

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-page">
      <div className="auth-bg-grid" />
      <div className="auth-orb auth-orb-1" />
      <div className="auth-orb auth-orb-2" />
      <div className="auth-orb auth-orb-3" />
      <div className="auth-layout">
        <div className="auth-brand">
          <div className="auth-brand-logo">// CHNUgram</div>
          <h1 className="auth-brand-heading">
            Communicate<br />smarter<span className="auth-brand-accent">.</span>
          </h1>
          <p className="auth-brand-sub">
            Messenger of Chernivtsi National University. JWT auth, group chats, reactions and file sharing.
          </p>
          <div className="auth-pills">
            <Pill>Private chats</Pill>
            <Pill>Groups</Pill>
            <Pill>Reactions</Pill>
            <Pill>Files</Pill>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-pill">
      <div className="auth-pill-dot" />
      {children}
    </div>
  );
}

export function AuthField({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="auth-field">
      <label className="auth-label">{label}</label>
      {children}
      {error && <p className="auth-field-error">{error}</p>}
    </div>
  );
}

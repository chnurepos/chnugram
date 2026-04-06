import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { authApi } from '../services/api';
import { useAuthStore } from '../stores/authStore';

const schema = z.object({
  email: z.string().email('Invalid email').endsWith('@chnu.edu.ua', 'Only @chnu.edu.ua emails allowed'),
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
      const response = await authApi.login(data);
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
        {/* Tabs */}
        <div className="auth-tabs">
          <span className="auth-tab auth-tab-active">Sign in</span>
          <Link to="/register" className="auth-tab">Sign up</Link>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="auth-form">
          <AuthField label="Email університету" error={errors.email?.message}>
            <input
              {...register('email')}
              type="email"
              placeholder="your.name@chnu.edu.ua"
              className="auth-input"
              autoComplete="email"
              autoFocus
            />
          </AuthField>

          <AuthField label="Пароль" error={errors.password?.message}>
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
            <span>{isSubmitting ? 'Входимо...' : 'Sign in →'}</span>
          </button>
        </form>

        <div className="auth-divider"><span>///</span></div>
        <p className="auth-hint">
          Немає акаунта? <Link to="/register" className="auth-hint-link">Sign up</Link>
        </p>
      </div>
    </AuthShell>
  );
}

/* ── Shared layout ── */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-page">
      {/* Animated grid */}
      <div className="auth-bg-grid" />

      {/* Glow orbs */}
      <div className="auth-orb auth-orb-1" />
      <div className="auth-orb auth-orb-2" />
      <div className="auth-orb auth-orb-3" />

      <div className="auth-layout">
        {/* Left branding */}
        <div className="auth-brand">
          <div className="auth-brand-logo">// CHNUgram</div>
          <h1 className="auth-brand-heading">
            Спілкуйся<br />розумніше<span className="auth-brand-accent">.</span>
          </h1>
          <p className="auth-brand-sub">
            Месенджер Чернівецького національного університету. JWT-автентифікація, групові чати, реакції та файли.
          </p>
          <div className="auth-pills">
            <Pill>Приватні чати</Pill>
            <Pill>Групи</Pill>
            <Pill>Реакції</Pill>
            <Pill>Файли</Pill>
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

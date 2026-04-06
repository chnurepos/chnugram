import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { authApi } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import { AuthShell, AuthField } from './LoginPage';

const schema = z.object({
  email: z.string().email('Invalid email').refine(
    (email) => email.endsWith('@chnu.edu.ua'),
    'Only @chnu.edu.ua email addresses are allowed'
  ),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username too long')
    .regex(/^[a-z0-9_]+$/, 'Only lowercase letters, numbers, underscores'),
  displayName: z
    .string()
    .min(2, 'Display name must be at least 2 characters')
    .max(100, 'Display name too long'),
  password: z
    .string()
    .min(5, 'Мінімум 5 символів')
    .refine(
      (pwd) => {
        const simple = [
          /^(.)\1+$/,
          /^(012|123|234|345|456|567|678|789|890|987|876|765|654|543|432|321|210)/i,
          /^(qwerty|asdf|zxcv|password|passwd|111|222|333|444|555|666|777|888|999|000|12345|123456|1234567|12345678)/i,
        ];
        return !simple.some(r => r.test(pwd));
      },
      'Пароль занадто простий.'
    ),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [error, setError] = useState('');

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setError('');
    try {
      const response = await authApi.register({
        email: data.email,
        username: data.username,
        displayName: data.displayName,
        password: data.password,
      });
      const { accessToken, refreshToken, user } = response.data.data!;
      setAuth(user, accessToken, refreshToken);
      navigate('/');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e?.response?.data?.message ?? 'Registration failed. Please try again.');
    }
  };

  return (
    <AuthShell>
      <div className="auth-card glass-card" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
        {/* Tabs */}
        <div className="auth-tabs">
          <Link to="/login" className="auth-tab">Sign in</Link>
          <span className="auth-tab auth-tab-active">Sign up</span>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="auth-form">
          <AuthField label="Email університету" error={errors.email?.message}>
            <input
              {...register('email')}
              type="email"
              placeholder="your.name@chnu.edu.ua"
              className="auth-input"
              autoFocus
            />
          </AuthField>

          <AuthField label="Username" error={errors.username?.message}>
            <div style={{ position: 'relative' }}>
              <span className="auth-input-prefix">@</span>
              <input
                {...register('username')}
                type="text"
                placeholder="username"
                className="auth-input"
                style={{ paddingLeft: '28px' }}
                autoComplete="off"
              />
            </div>
          </AuthField>

          <AuthField label="Відображуване ім'я" error={errors.displayName?.message}>
            <input
              {...register('displayName')}
              type="text"
              placeholder="Іван Петренко"
              className="auth-input"
            />
          </AuthField>

          <AuthField label="Пароль" error={errors.password?.message}>
            <input
              {...register('password')}
              type="password"
              placeholder="мін. 5 символів"
              className="auth-input"
              autoComplete="new-password"
            />
          </AuthField>

          <AuthField label="Підтвердіть пароль" error={errors.confirmPassword?.message}>
            <input
              {...register('confirmPassword')}
              type="password"
              placeholder="••••••••"
              className="auth-input"
            />
          </AuthField>

          {error && <div className="auth-error">{error}</div>}

          <button type="submit" disabled={isSubmitting} className="auth-btn">
            {isSubmitting && <span className="auth-spinner" />}
            <span>{isSubmitting ? 'Реєструємо...' : 'Create account →'}</span>
          </button>
        </form>

        <div className="auth-divider"><span>///</span></div>
        <p className="auth-hint">
          Вже маєте акаунт? <Link to="/login" className="auth-hint-link">Sign in</Link>
        </p>
      </div>
    </AuthShell>
  );
}

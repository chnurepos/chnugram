import { useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import { useSignalR } from './hooks/useSignalR';
import { useThemeStore, applyTheme } from './stores/themeStore';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import EmailVerificationPage from './pages/EmailVerificationPage';
import MainLayout from './components/layout/MainLayout';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  return !isAuthenticated ? <>{children}</> : <Navigate to="/" replace />;
}

/* ── Persistent particle canvas — lives outside routes so it doesn't restart on tab switch ── */
const PARTICLE_COUNT = 28;

function PersistentParticles() {
  const location = useLocation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isAuth = location.pathname === '/login' || location.pathname === '/register';

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let W = window.innerWidth;
    let H = window.innerHeight;
    canvas.width = W;
    canvas.height = H;

    const isDark = document.documentElement.classList.contains('dark');
    const color = isDark ? '#00b894' : '#00b894';

    type Particle = { x: number; y: number; r: number; speed: number; opacity: number; phase: number };
    const particles: Particle[] = Array.from({ length: PARTICLE_COUNT }, () => ({
      x: Math.random() * W,
      y: H + Math.random() * H,
      r: 0.8 + Math.random() * 3,
      speed: 0.3 + Math.random() * 0.7,
      opacity: 0.12 + Math.random() * 0.55,
      phase: Math.random() * Math.PI * 2,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      particles.forEach(p => {
        p.y -= p.speed;
        p.phase += 0.018;
        p.x += Math.sin(p.phase) * 0.4;
        if (p.y < -10) { p.y = H + 10; p.x = Math.random() * W; }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = color + Math.round(p.opacity * 255).toString(16).padStart(2, '0');
        ctx.fill();
      });
      animId = requestAnimationFrame(draw);
    };
    draw();

    const onResize = () => {
      W = window.innerWidth; H = window.innerHeight;
      canvas.width = W; canvas.height = H;
    };
    window.addEventListener('resize', onResize);
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', onResize); };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed', inset: 0, zIndex: 1,
        pointerEvents: 'none',
        opacity: isAuth ? 1 : 0,
        transition: 'opacity 0.3s',
      }}
    />
  );
}

function AppContent() {
  useSignalR();
  const { theme } = useThemeStore();
  useEffect(() => { applyTheme(theme); }, [theme]);

  return (
    <BrowserRouter>
      <PersistentParticles />
      <Routes>
        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <RegisterPage />
            </PublicRoute>
          }
        />
        <Route path="/verify-email" element={<EmailVerificationPage />} />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default function App() {
  return <AppContent />;
}

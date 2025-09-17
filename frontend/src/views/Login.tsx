import { FormEvent, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../modules/auth/AuthContext';
import { useLogin } from '../services/authService';
import { RajkamalLogo } from '../shared/RajkamalLogo';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login: authLogin, isAuthenticated } = useAuth();
  const loginMutation = useLogin();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from?.pathname || '/';

  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const payload = { email: email.trim().toLowerCase(), password };
    
    try {
      const loginResult = await loginMutation.mutateAsync(payload);
      
      // Check if login was successful and extract token
      if (loginResult?.data?.token) {
        authLogin(loginResult.data.token);
        // Navigation will happen automatically via useEffect
      }
    } catch (error) {
      // Error is handled by React Query and displayed in the form
      console.error('Login failed:', error);
    }
  };

  const errorMessage = (loginMutation.error as any)?.response?.data?.error || 'Login failed';

  return (
    <main className="flex min-h-screen flex-col bg-slate-100 lg:flex-row">
      <section className="relative hidden w-full flex-1 overflow-hidden bg-gradient-to-br from-rose-600 via-rose-500 to-orange-400 text-white lg:flex lg:max-w-2xl xl:max-w-3xl">
        <div className="absolute inset-0">
          <div className="absolute -left-28 top-24 h-80 w-80 rounded-full bg-white/15 blur-3xl" />
          <div className="absolute right-[-80px] bottom-16 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute left-16 bottom-24 h-56 w-56 rounded-full border border-white/20" />
        </div>
        <div className="relative z-10 flex h-full w-full flex-col justify-between p-12">
          <RajkamalLogo
            className="gap-4 text-white"
            wordmarkClassName="h-12"
            emblemWrapperClassName="h-16 w-16 bg-white/10 text-white ring-white/40"
            emblemClassName="h-16 w-16"
          />
          <div className="mt-16 max-w-lg space-y-6">
            <h2 className="text-4xl font-semibold leading-tight">
              Unlock sharper intelligence for every Rajkamal partner.
            </h2>
            <p className="text-base text-rose-50/90">
              Monitor inventory health, track sales momentum, and spot emerging opportunities with dashboards that stay in sync across your teams.
            </p>
            <div className="flex items-center gap-3 text-sm text-rose-50/80">
              <span className="inline-flex h-1 w-12 rounded-full bg-white/80" />
              <span>Real-time analytics - Territory visibility - Collaborative planning</span>
            </div>
          </div>
        </div>
      </section>

      <section className="flex w-full flex-1 items-center justify-center px-6 py-12 sm:px-10 lg:px-16">
        <div className="w-full max-w-md rounded-3xl bg-white/95 p-8 shadow-xl backdrop-blur sm:p-10">
          <RajkamalLogo
            showWordmark={false}
            className="justify-center"
            emblemWrapperClassName="h-16 w-16"
            emblemClassName="h-14 w-14"
          />
          <div className="mt-6 text-center">
            <h1 className="text-3xl font-semibold text-slate-900">Welcome back</h1>
            <p className="mt-2 text-sm text-slate-500">Sign in to continue to your Rajkamal workspace.</p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-slate-600">
                Work email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm transition focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-200"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm font-medium text-slate-600">
                <label htmlFor="password">Password</label>
                <a
                  href="mailto:support@rajkamal.com"
                  className="text-xs font-semibold text-rose-500 hover:text-rose-600"
                >
                  Need help?
                </a>
              </div>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm transition focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-200"
              />
            </div>

            <div aria-live="polite" aria-atomic="true" className="min-h-[1.5rem]">
              {loginMutation.isError && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50/90 px-4 py-2 text-sm text-rose-700 shadow-sm">
                  {errorMessage}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loginMutation.isPending}
              className="flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-rose-600 via-rose-500 to-orange-400 px-4 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-rose-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loginMutation.isPending ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <div className="mt-8 space-y-3 text-center text-sm text-slate-500">
            <p>
              New to Rajkamal?{' '}
              <a href="mailto:partnerships@rajkamal.com" className="font-semibold text-rose-500 hover:text-rose-600">
                Request access
              </a>
            </p>
            <p className="text-xs text-slate-400">
              By continuing you agree to our{' '}
              <a href="#" className="underline hover:text-slate-600">
                terms
              </a>{' '}
              and{' '}
              <a href="#" className="underline hover:text-slate-600">
                privacy policy
              </a>
              .
            </p>
          </div>
        </div>
      </section>
    </main>
  );
};

export default Login;

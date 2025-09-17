import { FormEvent, useEffect, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../modules/auth/AuthContext';
import { useLogin } from '../services/authService';
import { RajkamalLogo } from '../shared/RajkamalLogo';
import { LoadingSpinner } from '../components/LoadingSpinner';

// Inline SVG icons to replace Heroicons dependency
const EyeIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const EyeSlashIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 11-4.243-4.243m4.242 4.242L9.88 9.88" />
  </svg>
);

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{email?: string; password?: string}>({});
  const [showGlobalError, setShowGlobalError] = useState(false);
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

  // Debounced error clearing
  const clearFieldError = useCallback((field: 'email' | 'password') => {
    setTimeout(() => {
      setFieldErrors(prev => ({ ...prev, [field]: undefined }));
    }, 2000); // Increased delay to 2 seconds
  }, []);

  // Show global error with proper timing
  useEffect(() => {
    if (loginMutation.isError) {
      setShowGlobalError(true);
      // Auto-hide global error after 30 seconds if no field errors
      const timer = setTimeout(() => {
        if (!fieldErrors.email && !fieldErrors.password) {
          setShowGlobalError(false);
        }
      }, 30000); // Increased to 30 seconds
      return () => clearTimeout(timer);
    } else {
      setShowGlobalError(false);
    }
  }, [loginMutation.isError, fieldErrors.email, fieldErrors.password]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    // Clear previous errors
    setFieldErrors({});
    setShowGlobalError(false);
    
    // Client-side validation
    const errors: {email?: string; password?: string} = {};
    
    if (!email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = 'Please enter a valid email address';
    }
    
    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }
    
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    
    const payload = { email: email.trim().toLowerCase(), password };
    
    try {
      const loginResult = await loginMutation.mutateAsync(payload);
      
      if (loginResult?.data?.token) {
        authLogin(loginResult.data.token);
      }
    } catch (error) {
      console.error('Login failed:', error);
      // Extract field-specific errors from backend response
      const backendErrors = (error as any)?.response?.data?.errors;
      if (backendErrors) {
        setFieldErrors(backendErrors);
      } else {
        setShowGlobalError(true);
      }
    }
  };

  // Enhanced error message extraction
  const getGlobalErrorMessage = () => {
    const error = loginMutation.error as any;
    
    if (error?.response?.data?.error) {
      return error.response.data.error;
    }
    
    if (error?.response?.data?.message) {
      return error.response.data.message;
    }
    
    if (error?.response?.status === 401) {
      return 'Invalid email or password. Please check your credentials and try again.';
    }
    
    if (error?.response?.status === 429) {
      return 'Too many login attempts. Please wait a moment before trying again.';
    }
    
    if (error?.response?.status >= 500) {
      return 'Server error. Please try again later or contact support if the problem persists.';
    }
    
    if (error?.message === 'Network Error') {
      return 'Network connection error. Please check your internet connection and try again.';
    }
    
    return 'Login failed. Please check your credentials and try again.';
  };

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
            {/* Email Field */}
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-slate-600">
                Work email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  // Clear field error with delay only if there's an error
                  if (fieldErrors.email) {
                    clearFieldError('email');
                  }
                  // Don't clear global error when typing - let it persist
                }}
                autoComplete="email"
                required
                className={`w-full rounded-2xl border px-4 py-3 text-sm text-slate-900 shadow-sm transition focus:outline-none focus:ring-2 ${
                  fieldErrors.email 
                    ? 'border-red-300 bg-red-50/50 focus:border-red-500 focus:ring-red-200' 
                    : 'border-slate-200 bg-white focus:border-rose-500 focus:ring-rose-200'
                }`}
                placeholder="Enter your work email"
              />
              {fieldErrors.email && (
                <div className="flex items-center gap-2 text-sm text-red-600">
                  <svg className="h-4 w-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                  </svg>
                  <span>{fieldErrors.email}</span>
                </div>
              )}
            </div>

            {/* Password Field */}
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
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    // Clear field error with delay only if there's an error
                    if (fieldErrors.password) {
                      clearFieldError('password');
                    }
                    // Don't clear global error when typing - let it persist
                  }}
                  autoComplete="current-password"
                  required
                  className={`w-full rounded-2xl border px-4 py-3 pr-12 text-sm text-slate-900 shadow-sm transition focus:outline-none focus:ring-2 ${
                    fieldErrors.password 
                      ? 'border-red-300 bg-red-50/50 focus:border-red-500 focus:ring-red-200' 
                      : 'border-slate-200 bg-white focus:border-rose-500 focus:ring-rose-200'
                  }`}
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 transition-colors hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-rose-200"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-5 w-5" />
                  ) : (
                    <EyeIcon className="h-5 w-5" />
                  )}
                </button>
              </div>
              {fieldErrors.password && (
                <div className="flex items-center gap-2 text-sm text-red-600">
                  <svg className="h-4 w-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                  </svg>
                  <span>{fieldErrors.password}</span>
                </div>
              )}
            </div>

            {/* Global Error Message with manual dismiss */}
            <div aria-live="polite" aria-atomic="true" className="min-h-[1.5rem]">
              {showGlobalError && loginMutation.isError && (
                <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50/90 px-4 py-3 text-sm text-red-700 shadow-sm">
                  <svg className="mt-0.5 h-5 w-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                  </svg>
                  <div className="flex-1">
                    <p className="font-medium">Authentication failed</p>
                    <p className="mt-1 leading-relaxed">{getGlobalErrorMessage()}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowGlobalError(false)}
                    className="ml-2 flex-shrink-0 rounded-lg p-1 text-red-400 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-200"
                    aria-label="Dismiss error"
                  >
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loginMutation.isPending}
              className="flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-rose-600 via-rose-500 to-orange-400 px-4 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-rose-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loginMutation.isPending ? (
                <div className="flex items-center gap-2">
                  <LoadingSpinner size="sm" className="gap-0" message="" />
                  <span>Signing in...</span>
                </div>
              ) : (
                'Sign in'
              )}
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

import React, { useEffect, useState } from 'react';
import { Leaf, Eye, EyeOff, X, AlertTriangle, CheckCircle2, Circle } from 'lucide-react';
import { motion } from 'motion/react';
import { GoogleLogin } from '@react-oauth/google';
import {
  AuthFieldErrors,
  AuthMode,
  friendlyAuthError,
  hasAuthErrors,
  validateAuthForm,
  validateEmail,
  validateFirstName,
  validateLastName,
  validatePassword,
  validateUsername,
} from '../lib/authValidation';
import {
  displayNameFromUser,
  fetchCurrentUser,
  loginUser,
  loginWithSocial,
  registerUser,
  type AuthUser,
} from '../lib/authApi';

const GOOGLE_CLIENT_ID = String(
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID) || ''
).trim();

type AuthModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onAuthenticated: (user: AuthUser, displayName: string) => void;
  onAddToast: (title: string, msg: string, type: 'success' | 'warning' | 'info') => void;
  initialMode?: AuthMode;
};

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="mt-1.5 flex items-start gap-1.5 text-xs font-medium text-red-600 dark:text-red-400" role="alert">
      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
      <span>{message}</span>
    </p>
  );
}

function fieldClass(hasError: boolean) {
  return [
    'w-full rounded-xl border bg-white px-3.5 py-3 text-sm text-slate-900 outline-hidden transition-shadow',
    'placeholder:text-slate-400 dark:placeholder:text-slate-500',
    'dark:bg-[#161616] dark:text-white',
    hasError
      ? 'border-red-400/80 ring-2 ring-red-400/25 dark:border-red-500/70'
      : 'border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 dark:border-white/10',
  ].join(' ');
}

export default function AuthModal({
  isOpen,
  onClose,
  onAuthenticated,
  onAddToast,
  initialMode = 'login',
}: AuthModalProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<AuthFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [didAttempt, setDidAttempt] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setMode(initialMode);
    setErrors({});
    setFormError(null);
    setDidAttempt(false);
    setShowPassword(false);
    setIsLoading(false);
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  const switchMode = (next: AuthMode) => {
    setMode(next);
    setErrors({});
    setFormError(null);
    setDidAttempt(false);
    setShowPassword(false);
  };

  const revalidateLive = (patch: Partial<{
    firstName: string;
    lastName: string;
    username: string;
    email: string;
    password: string;
  }>) => {
    if (!didAttempt) return;
    const nextValues = {
      firstName: patch.firstName ?? firstName,
      lastName: patch.lastName ?? lastName,
      username: patch.username ?? username,
      email: patch.email ?? email,
      password: patch.password ?? password,
    };
    setErrors(validateAuthForm(mode, nextValues));
  };

  const finishAuth = async (token: string, successTitle: string, successMsg: (name: string) => string) => {
    const user = await fetchCurrentUser(token);
    const name = displayNameFromUser(user);
    onAuthenticated(user, name);
    onAddToast(successTitle, successMsg(name), 'success');
    onClose();
  };

  const handleGoogleCredential = async (credential?: string) => {
    if (!credential) {
      setFormError('Google did not return a sign-in token. Please try again.');
      return;
    }
    setFormError(null);
    setIsLoading(true);
    try {
      const token = await loginWithSocial('GOOGLE', credential);
      await finishAuth(token, 'Welcome', (name) => `Signed in with Google as ${name}.`);
    } catch (err) {
      setFormError(friendlyAuthError(err, false, { social: true }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDidAttempt(true);
    setFormError(null);

    const nextErrors = validateAuthForm(mode, {
      firstName,
      lastName,
      username,
      email,
      password,
    });
    setErrors(nextErrors);
    if (hasAuthErrors(nextErrors)) return;

    setIsLoading(true);
    try {
      const token =
        mode === 'login'
          ? await loginUser(username.trim(), password)
          : await registerUser({
              firstName: firstName.trim(),
              lastName: lastName.trim(),
              username: username.trim(),
              email: email.trim(),
              password,
            });

      await finishAuth(
        token,
        mode === 'login' ? 'Welcome back' : 'Account created',
        (name) =>
          mode === 'login'
            ? `Signed in as ${name}.`
            : `Welcome to Aura Fresh, ${name}.`
      );
    } catch (err) {
      setFormError(friendlyAuthError(err, mode === 'register'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-100 flex items-end justify-center sm:items-center p-0 sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px] cursor-pointer"
        aria-label="Close sign in"
        onClick={onClose}
      />

      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 380, damping: 28 }}
        className="relative z-10 flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl border border-slate-200 bg-slate-50 shadow-2xl dark:border-white/10 dark:bg-[#0f0f0f] sm:rounded-3xl"
      >
        <div className="pointer-events-none absolute -left-16 -top-20 h-56 w-56 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-10 bottom-0 h-40 w-40 rounded-full bg-emerald-500/10 blur-3xl" />

        <div className="relative flex items-start justify-between gap-3 px-5 pt-5 pb-2">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-linear-to-br from-emerald-500/30 to-emerald-500/5">
              <Leaf className="h-5 w-5 text-emerald-500" aria-hidden />
            </div>
            <div>
              <p id="auth-modal-title" className="font-display text-2xl font-extrabold text-slate-900 dark:text-white">
                Aura Fresh
              </p>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-400">
                Premium groceries
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-200/70 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white cursor-pointer"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="relative overflow-y-auto px-5 pb-6 pt-2">
          <div className="mb-5">
            <h3 className="font-display text-lg font-bold text-slate-800 dark:text-white">
              {mode === 'login' ? 'Welcome back' : 'Join Aura Fresh'}
            </h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {mode === 'login'
                ? 'Sign in to sync your cart, orders, and delivery details.'
                : 'Create a free account — checkout and reorders stay easy.'}
            </p>
          </div>

          <div
            className="mb-5 grid grid-cols-2 gap-1 rounded-full bg-white p-1 shadow-sm dark:bg-[#161616]"
            role="tablist"
            aria-label="Account mode"
          >
            {([
              { id: 'login', label: 'Sign in' },
              { id: 'register', label: 'Join' },
            ] as const).map((tab) => {
              const active = mode === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => switchMode(tab.id)}
                  className={[
                    'rounded-full py-2.5 text-sm font-extrabold transition-colors cursor-pointer',
                    active
                      ? 'bg-linear-to-br from-emerald-400 to-emerald-600 text-black shadow-md shadow-emerald-500/25'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white',
                  ].join(' ')}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {GOOGLE_CLIENT_ID ? (
            <div className={`mb-4 space-y-3 ${isLoading ? 'pointer-events-none opacity-60' : ''}`}>
              <div className="flex w-full justify-center overflow-hidden [&_div]:!w-full [&_iframe]:!w-full">
                <GoogleLogin
                  onSuccess={(res) => {
                    void handleGoogleCredential(res.credential);
                  }}
                  onError={() => setFormError('Google sign-in was cancelled or failed.')}
                  useOneTap={false}
                  theme="outline"
                  size="large"
                  shape="rectangular"
                  text="continue_with"
                />
              </div>
              <div className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <div className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
                <span>or email</span>
                <div className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
              </div>
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="space-y-3.5" noValidate>
            {mode === 'register' && (
              <>
                <div>
                  <label className={`mb-1 block text-xs font-semibold ${errors.firstName ? 'text-red-600 dark:text-red-400' : 'text-slate-500'}`}>
                    First name
                  </label>
                  <input
                    value={firstName}
                    onChange={(e) => {
                      setFirstName(e.target.value);
                      revalidateLive({ firstName: e.target.value });
                    }}
                    onBlur={() =>
                      didAttempt &&
                      setErrors((prev) => ({ ...prev, firstName: validateFirstName(firstName) || undefined }))
                    }
                    autoComplete="given-name"
                    placeholder="e.g. Thura"
                    className={fieldClass(!!errors.firstName)}
                    aria-invalid={!!errors.firstName}
                  />
                  <FieldError message={errors.firstName} />
                </div>

                <div>
                  <label className={`mb-1 block text-xs font-semibold ${errors.lastName ? 'text-red-600 dark:text-red-400' : 'text-slate-500'}`}>
                    Last name
                  </label>
                  <input
                    value={lastName}
                    onChange={(e) => {
                      setLastName(e.target.value);
                      revalidateLive({ lastName: e.target.value });
                    }}
                    onBlur={() =>
                      didAttempt &&
                      setErrors((prev) => ({ ...prev, lastName: validateLastName(lastName) || undefined }))
                    }
                    autoComplete="family-name"
                    placeholder="e.g. Kyaw"
                    className={fieldClass(!!errors.lastName)}
                    aria-invalid={!!errors.lastName}
                  />
                  <FieldError message={errors.lastName} />
                </div>
              </>
            )}

            <div>
              <label className={`mb-1 block text-xs font-semibold ${errors.username ? 'text-red-600 dark:text-red-400' : 'text-slate-500'}`}>
                Username
              </label>
              <input
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  revalidateLive({ username: e.target.value });
                }}
                onBlur={() =>
                  didAttempt &&
                  setErrors((prev) => ({ ...prev, username: validateUsername(username, mode) || undefined }))
                }
                autoComplete="username"
                autoCapitalize="none"
                placeholder={mode === 'login' ? 'Enter your username' : 'Choose a username'}
                className={fieldClass(!!errors.username)}
                aria-invalid={!!errors.username}
              />
              <FieldError message={errors.username} />
            </div>

            {mode === 'register' && (
              <div>
                <label className={`mb-1 block text-xs font-semibold ${errors.email ? 'text-red-600 dark:text-red-400' : 'text-slate-500'}`}>
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    revalidateLive({ email: e.target.value });
                  }}
                  onBlur={() =>
                    didAttempt &&
                    setErrors((prev) => ({ ...prev, email: validateEmail(email) || undefined }))
                  }
                  autoComplete="email"
                  placeholder="you@example.com"
                  className={fieldClass(!!errors.email)}
                  aria-invalid={!!errors.email}
                />
                <FieldError message={errors.email} />
              </div>
            )}

            <div>
              <label className={`mb-1 block text-xs font-semibold ${errors.password ? 'text-red-600 dark:text-red-400' : 'text-slate-500'}`}>
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    revalidateLive({ password: e.target.value });
                  }}
                  onBlur={() =>
                    didAttempt &&
                    setErrors((prev) => ({ ...prev, password: validatePassword(password, mode) || undefined }))
                  }
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  placeholder={mode === 'login' ? 'Enter your password' : 'At least 8 characters'}
                  className={`${fieldClass(!!errors.password)} pr-11`}
                  aria-invalid={!!errors.password}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <FieldError message={errors.password} />
              {mode === 'register' && !errors.password && (
                <p className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-500">
                  {password.length >= 8 ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  ) : (
                    <Circle className="h-3.5 w-3.5" />
                  )}
                  {password.length >= 8 ? 'Password looks good' : 'Use 8+ characters for your password'}
                </p>
              )}
            </div>

            {formError && (
              <div
                className="flex items-start gap-2 rounded-xl bg-red-500/10 px-3.5 py-3 text-sm font-medium text-red-700 dark:text-red-300"
                role="alert"
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="mt-2 w-full rounded-xl bg-linear-to-br from-emerald-400 to-emerald-600 py-3.5 text-sm font-extrabold text-black shadow-lg shadow-emerald-500/25 transition enabled:hover:brightness-105 disabled:opacity-60 cursor-pointer"
            >
              {isLoading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
            </button>

            <button
              type="button"
              onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
              className="w-full py-2 text-sm font-bold text-emerald-700 hover:text-emerald-600 dark:text-emerald-400 cursor-pointer"
            >
              {mode === 'login' ? 'New here? Create an account' : 'Already have an account? Sign in'}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}

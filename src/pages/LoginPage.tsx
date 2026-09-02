import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  ArrowLeft,
  GraduationCap,
  LogIn,
  Mail,
  Lock,
  CheckCircle2,
  Eye,
  EyeOff,
} from 'lucide-react';
import type { Role } from '@/types';
import { cn } from '@/lib/utils';
import { roleInfo, roleUser } from '@/config/nav';
import { findAccount, type AuthAccount } from '@/lib/auth';
import { ToastContainer, type ToastData } from '@/components/ui';

const loginMeta: Record<
  Role,
  {
    icon: typeof GraduationCap;
    accent: string;
    password: string;
    features: string[];
  }
> = {
  student: {
    icon: GraduationCap,
    accent: 'from-primary-500 to-primary-700',
    password: 'student@123',
    features: ['AI Study Assistant', 'Notes & Quiz Center'],
  },
};

export default function LoginPage({
  initialRole,
  onBack,
  onLoginSuccess,
  onSignup,
}: {
  initialRole: Role;
  onBack: () => void;
  onLoginSuccess: (account: AuthAccount) => void;
  onSignup: (role: Role) => void;
}) {
  const [role, setRole] = useState<Role>(initialRole);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const addToast = (message: string, tone: ToastData['tone'] = 'success') => {
    const id = `t-${Date.now()}`;
    setToasts((prev) => [...prev, { id, message, tone }]);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  useEffect(() => {
    setRole(initialRole);
    setEmail('');
    setPassword('');
    setError('');
  }, [initialRole]);

  useEffect(() => {
    setEmail('');
    setPassword('');
    setShowPassword(false);
    setError('');
  }, [role]);

  const selectedInfo = roleInfo[role];
  const selectedUser = roleUser[role];
  const selectedMeta = loginMeta[role];
  const RoleIcon = selectedMeta.icon;

  const canSubmit = useMemo(() => email.trim().length > 0 && password.trim().length > 0, [email, password]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('http://localhost:8000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.account) {
            setLoading(false);
            if (typeof window !== 'undefined' && data.token) {
              window.localStorage.setItem('edurag-auth-token', data.token);
            }
            const loginTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
            addToast(`Login successful at ${loginTime}!`, 'success');
            window.setTimeout(() => {
              onLoginSuccess({
                ...data.account,
                password,
                createdAt: new Date().toISOString(),
              });
            }, 1500);
            return;
          }
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(errData.error || 'Invalid credentials for the selected role.');
        setLoading(false);
        return;
      }
    } catch (err) {
      console.warn('[Login Backend] Could not verify with backend, checking local storage:', err);
    }

    // Local fallback for offline operation
    const savedAccount = findAccount(role, email);
    if (!savedAccount || savedAccount.password !== password) {
      setError('Invalid credentials for the selected role.');
      setLoading(false);
      return;
    }

    window.setTimeout(() => {
      setLoading(false);
      const loginTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      addToast(`Login successful at ${loginTime}!`, 'success');
      window.setTimeout(() => {
        onLoginSuccess(savedAccount);
      }, 1500);
    }, 450);
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-6xl grid lg:grid-cols-[1.15fr_0.85fr] overflow-hidden rounded-3xl bg-white border border-neutral-200 shadow-[0_20px_60px_rgba(0,0,0,0.08)]">
        <aside className={cn('p-8 lg:p-10 text-white bg-gradient-to-br', selectedMeta.accent)}>
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-white/20"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          <div className="mt-10 flex items-center gap-3">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white/15">
              <RoleIcon className="h-7 w-7" />
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-white/70">Secure Login</p>
              <h1 className="text-3xl font-bold font-display">{selectedInfo.name}</h1>
            </div>
          </div>

          <p className="mt-5 max-w-md text-sm leading-6 text-white/85">{selectedInfo.subtitle}</p>

          <div className="mt-8 space-y-3">
            {selectedMeta.features.map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-3 text-sm text-white/90">
                <CheckCircle2 className="h-4.5 w-4.5 text-white" />
                {item}
              </div>
            ))}
          </div>
        </aside>

        <main className="p-8 lg:p-10">
          <div>
            <p className="text-sm font-medium text-primary-600">Welcome back</p>
            <h2 className="mt-2 text-3xl font-bold font-display text-neutral-900">Sign in to continue</h2>
            <p className="mt-2 text-sm text-neutral-500">Choose your portal and sign in with your account.</p>
          </div>

          <div className="mt-8 grid grid-cols-3 gap-2 rounded-2xl bg-neutral-100 p-1">
            {(['student'] as Role[]).map((candidate) => {
              const active = candidate === role;
              const CandidateIcon = loginMeta[candidate].icon;
              return (
                <button
                  key={candidate}
                  onClick={() => setRole(candidate)}
                  className={cn(
                    'flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
                    active ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-900',
                  )}
                >
                  <CandidateIcon className="h-4 w-4" />
                  {candidate}
                </button>
              );
            })}
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-neutral-700">Email address</span>
              <div className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 focus-within:border-primary-300 focus-within:bg-white">
                <Mail className="h-4.5 w-4.5 text-neutral-400" />
                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  type="email"
                  className="w-full bg-transparent outline-none text-sm text-neutral-900 placeholder:text-neutral-400"
                  placeholder="name@edurag.edu"
                />
              </div>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-neutral-700">Password</span>
              <div className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 focus-within:border-primary-300 focus-within:bg-white">
                <Lock className="h-4.5 w-4.5 text-neutral-400" />
                <input
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  type={showPassword ? 'text' : 'password'}
                  className="w-full bg-transparent outline-none text-sm text-neutral-900 placeholder:text-neutral-400"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-neutral-400 hover:text-neutral-600 focus:outline-none"
                >
                  {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                </button>
              </div>
            </label>

            {error && (
              <div className="rounded-2xl border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={!canSubmit || loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary-600 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-primary-600/20 transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <LogIn className="h-4 w-4" />
              {loading ? 'Signing in...' : `Login as ${role}`}
            </button>

            <p className="text-center text-sm text-neutral-500">
              Don&apos;t have an account?{' '}
              <button
                type="button"
                onClick={() => onSignup(role)}
                className="font-semibold text-primary-600 hover:text-primary-700 hover:underline"
              >
                Sign up
              </button>
            </p>
          </form>

          <div className="mt-6 rounded-2xl bg-primary-50 px-4 py-3 text-sm text-primary-700">
            Selected portal: <span className="font-semibold">{selectedInfo.name}</span>
          </div>
        </main>
      </div>
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

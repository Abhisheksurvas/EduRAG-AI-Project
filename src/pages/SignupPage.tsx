import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  GraduationCap,
  Lock,
  Mail,
  User,
  UserPlus,
  Eye,
  EyeOff,
} from 'lucide-react';
import type { Role } from '@/types';
import { cn } from '@/lib/utils';
import { roleInfo, roleUser } from '@/config/nav';
import { findAccount, registerAccount, type AuthAccount } from '@/lib/auth';
import { ToastContainer, type ToastData } from '@/components/ui';

const signupMeta: Record<
  Role,
  {
    icon: typeof GraduationCap;
    accent: string;
    features: string[];
  }
> = {
  student: {
    icon: GraduationCap,
    accent: 'from-primary-500 to-primary-700',
    features: ['Access study tools', 'Save progress', 'Use AI assistant'],
  },
};

const classOptions = ['FY', 'SY', 'TY', 'B.E'];
const semesterOptions = ['1', '2', '3', '4', '5', '6', '7', '8'];
const batchOptions = ['1', '2', '3'];
const branchOptions = ['CSE', 'AI&DS', 'ENTC', 'ELE', 'MECH', 'CIVIL'];

export default function SignupPage({
  initialRole,
  onBack,
  onSignupSuccess,
}: {
  initialRole: Role;
  onBack: () => void;
  onSignupSuccess: (account: AuthAccount) => void;
}) {
  const [role, setRole] = useState<Role>(initialRole);
  const [name, setName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rollNo, setRollNo] = useState('');
  const [classYear, setClassYear] = useState('');
  const [semester, setSemester] = useState('');
  const [batch, setBatch] = useState('');
  const [branch, setBranch] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
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
    setName('');
    setDateOfBirth('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    setRollNo('');
    setClassYear('');
    setSemester('');
    setBatch('');
    setBranch('');
    setAcceptTerms(false);
    setError('');
  }, [initialRole]);

  const selectedInfo = roleInfo[role];
  const selectedMeta = signupMeta[role];
  const RoleIcon = selectedMeta.icon;
  const suggestedEmail = roleUser[role].email;

  const isStudent = role === 'student';

  const canSubmit = useMemo(() => {
    const baseValid =
      name.trim().length > 0 &&
      email.trim().length > 0 &&
      password.trim().length > 0 &&
      confirmPassword.trim().length > 0;

    if (isStudent) {
      return (
        baseValid &&
        dateOfBirth.trim().length > 0 &&
        rollNo.trim().length > 0 &&
        classYear.trim().length > 0 &&
        semester.trim().length > 0 &&
        batch.trim().length > 0 &&
        branch.trim().length > 0 &&
        acceptTerms
      );
    }

    return baseValid;
  }, [
    acceptTerms,
    batch,
    branch,
    classYear,
    confirmPassword,
    dateOfBirth,
    email,
    isStudent,
    name,
    password,
    rollNo,
    semester,
  ]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (isStudent) {
      if (!dateOfBirth || !rollNo || !classYear || !semester || !batch || !branch) {
        setError('Please complete all student details.');
        return;
      }

      if (!acceptTerms) {
        setError('Please accept the terms and conditions.');
        return;
      }
    }

    if (findAccount(role, email)) {
      setError('An account already exists for this role and email.');
      return;
    }

    setLoading(true);
    try {
      let details: Record<string, string> | undefined = undefined;
      if (isStudent) {
        details = {
          dateOfBirth,
          rollNo,
          classYear,
          semester,
          batch,
          branch,
          termsAccepted: 'yes',
        };
      }

      const nextAccount = await registerAccount({
        role,
        name: name.trim(),
        email: email.trim(),
        password,
        details,
      });
      addToast('Account created successfully! Redirecting...', 'success');
      window.setTimeout(() => {
        onSignupSuccess(nextAccount);
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create your account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-6xl grid lg:grid-cols-[0.95fr_1.05fr] overflow-hidden rounded-3xl bg-white border border-neutral-200 shadow-[0_20px_60px_rgba(0,0,0,0.08)]">
        <aside className={cn('p-8 lg:p-10 text-white bg-gradient-to-br', selectedMeta.accent)}>
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-white/20"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to login
          </button>

          <div className="mt-10 flex items-center gap-3">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white/15">
              <RoleIcon className="h-7 w-7" />
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-white/70">Create account</p>
              <h1 className="text-3xl font-bold font-display">{selectedInfo.name}</h1>
            </div>
          </div>

          <p className="mt-5 max-w-md text-sm leading-6 text-white/85">
            Create your portal account to start using EduRAG with the selected role.
          </p>

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
            <p className="text-sm font-medium text-primary-600">Get started</p>
            <h2 className="mt-2 text-3xl font-bold font-display text-neutral-900">Sign up for EduRAG</h2>
            <p className="mt-2 text-sm text-neutral-500">Create a new account for your selected portal.</p>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-2 rounded-2xl bg-neutral-100 p-1">
            {(['student'] as Role[]).map((candidate) => {
              const active = candidate === role;
              const CandidateIcon = signupMeta[candidate].icon;
              return (
                <button
                  key={candidate}
                  type="button"
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
              <span className="mb-2 block text-sm font-medium text-neutral-700">Full name</span>
              <div className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 focus-within:border-primary-300 focus-within:bg-white">
                <User className="h-4.5 w-4.5 text-neutral-400" />
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  type="text"
                  className="w-full bg-transparent outline-none text-sm text-neutral-900 placeholder:text-neutral-400"
                  placeholder="Your name"
                />
              </div>
            </label>

            {isStudent && (
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-neutral-700">Date of birth</span>
                  <input
                    value={dateOfBirth}
                    onChange={(event) => setDateOfBirth(event.target.value)}
                    type="date"
                    className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-900 outline-none focus:border-primary-300 focus:bg-white"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-neutral-700">Student roll no.</span>
                  <input
                    value={rollNo}
                    onChange={(event) => setRollNo(event.target.value)}
                    type="text"
                    className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-900 outline-none focus:border-primary-300 focus:bg-white"
                    placeholder="01"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-neutral-700">Class</span>
                  <select
                    value={classYear}
                    onChange={(event) => setClassYear(event.target.value)}
                    className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-900 outline-none focus:border-primary-300 focus:bg-white"
                  >
                    <option value="">Select class</option>
                    {classOptions.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-neutral-700">Semester</span>
                  <select
                    value={semester}
                    onChange={(event) => setSemester(event.target.value)}
                    className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-900 outline-none focus:border-primary-300 focus:bg-white"
                  >
                    <option value="">Select semester</option>
                    {semesterOptions.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-neutral-700">Batch</span>
                  <select
                    value={batch}
                    onChange={(event) => setBatch(event.target.value)}
                    className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-900 outline-none focus:border-primary-300 focus:bg-white"
                  >
                    <option value="">Select batch</option>
                    {batchOptions.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-neutral-700">Branch</span>
                  <select
                    value={branch}
                    onChange={(event) => setBranch(event.target.value)}
                    className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-900 outline-none focus:border-primary-300 focus:bg-white"
                  >
                    <option value="">Select branch</option>
                    {branchOptions.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </label>
              </div>
            )}

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-neutral-700">Email address</span>
              <div className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 focus-within:border-primary-300 focus-within:bg-white">
                <Mail className="h-4.5 w-4.5 text-neutral-400" />
                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  type="email"
                  className="w-full bg-transparent outline-none text-sm text-neutral-900 placeholder:text-neutral-400"
                  placeholder="your.email@edurag.edu"
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
                  placeholder="Create a password"
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

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-neutral-700">Confirm password</span>
              <div className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 focus-within:border-primary-300 focus-within:bg-white">
                <Lock className="h-4.5 w-4.5 text-neutral-400" />
                <input
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  type={showConfirmPassword ? 'text' : 'password'}
                  className="w-full bg-transparent outline-none text-sm text-neutral-900 placeholder:text-neutral-400"
                  placeholder="Repeat your password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="text-neutral-400 hover:text-neutral-600 focus:outline-none"
                >
                  {showConfirmPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                </button>
              </div>
            </label>

            {isStudent && (
              <label className="flex items-start gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3">
                <input
                  checked={acceptTerms}
                  onChange={(event) => setAcceptTerms(event.target.checked)}
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-neutral-600">
                  I agree to the terms and conditions and confirm that the student details entered above are correct.
                </span>
              </label>
            )}

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
              <UserPlus className="h-4 w-4" />
              {loading ? 'Creating account...' : `Sign up as ${role}`}
            </button>

            <p className="text-center text-sm text-neutral-500">
              Already have an account?{' '}
              <button
                type="button"
                onClick={onBack}
                className="font-semibold text-primary-600 hover:text-primary-700 hover:underline"
              >
                Login
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

import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';
import { type ReactNode, useEffect } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, X } from 'lucide-react';

export function Card({
  children,
  className,
  hover = false,
}: {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}) {
  return (
    <div
      className={cn(
        'rounded-2xl bg-white border border-neutral-200/80 card-shadow',
        hover && 'transition-all duration-300 hover:card-shadow-lg hover:-translate-y-0.5 hover:border-neutral-300',
        className,
      )}
    >
      {children}
    </div>
  );
}

const isReactComponent = (c: any) =>
  typeof c === 'function' || (c && typeof c === 'object' && ('$$typeof' in c || 'render' in c));

export function CardHeader({
  title,
  subtitle,
  icon,
  action,
}: {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  action?: ReactNode;
}) {
  const Icon = isReactComponent(icon) ? icon : null;
  return (
    <div className="flex items-start justify-between gap-4 px-6 pt-6">
      <div className="flex items-start gap-3 min-w-0">
        {Icon && (
          <div className="grid place-items-center h-10 w-10 rounded-xl bg-primary-50 text-primary-600 shrink-0">
            <Icon className="h-5 w-5" />
          </div>
        )}
        <div className="min-w-0">
          <h3 className="font-display font-semibold text-neutral-900 text-base truncate">{title}</h3>
          {subtitle && <p className="text-sm text-neutral-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

export function CardBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('p-6', className)}>{children}</div>;
}

type BadgeTone = 'primary' | 'success' | 'warning' | 'error' | 'neutral' | 'accent' | 'secondary';

const badgeTones: Record<BadgeTone, string> = {
  primary: 'bg-primary-50 text-primary-700 ring-primary-200',
  success: 'bg-success-50 text-success-700 ring-success-200',
  warning: 'bg-warning-50 text-warning-700 ring-warning-200',
  error: 'bg-error-50 text-error-700 ring-error-200',
  neutral: 'bg-neutral-100 text-neutral-600 ring-neutral-200',
  accent: 'bg-accent-50 text-accent-700 ring-accent-200',
  secondary: 'bg-secondary-50 text-secondary-700 ring-secondary-200',
};

export function Badge({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
        badgeTones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  className,
  onClick,
  type = 'button',
  disabled,
}: {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  icon?: LucideIcon;
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  type?: 'button' | 'submit';
  disabled?: boolean;
}) {
  const variants: Record<string, string> = {
    primary:
      'bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800 shadow-sm shadow-primary-600/30',
    secondary:
      'bg-secondary-500 text-white hover:bg-secondary-600 active:bg-secondary-700 shadow-sm shadow-secondary-500/30',
    success: 'bg-success-500 text-white hover:bg-success-600 active:bg-success-700',
    danger: 'bg-error-500 text-white hover:bg-error-600 active:bg-error-700',
    outline:
      'border border-neutral-300 text-neutral-700 bg-white hover:bg-neutral-50 hover:border-neutral-400',
    ghost: 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900',
  };
  const sizes: Record<string, string> = {
    sm: 'h-8 px-3 text-sm gap-1.5 rounded-lg',
    md: 'h-10 px-4 text-sm gap-2 rounded-xl',
    lg: 'h-12 px-6 text-base gap-2 rounded-xl',
  };
  const Icon = isReactComponent(icon) ? icon : null;
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex items-center justify-center font-medium transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2',
        variants[variant],
        sizes[size],
        className,
      )}
    >
      {Icon && <Icon className={size === 'sm' ? 'h-4 w-4' : 'h-4.5 w-4.5'} />}
      {children}
    </button>
  );
}

export function Progress({
  value,
  className,
  tone = 'primary',
  size = 'md',
}: {
  value: number;
  className?: string;
  tone?: 'primary' | 'success' | 'warning' | 'secondary' | 'accent';
  size?: 'sm' | 'md' | 'lg';
}) {
  const tones: Record<string, string> = {
    primary: 'bg-primary-500',
    success: 'bg-success-500',
    warning: 'bg-warning-500',
    secondary: 'bg-secondary-500',
    accent: 'bg-accent-500',
  };
  const heights: Record<string, string> = { sm: 'h-1.5', md: 'h-2', lg: 'h-3' };
  return (
    <div className={cn('w-full rounded-full bg-neutral-200 overflow-hidden', heights[size], className)}>
      <div
        className={cn('h-full rounded-full transition-all duration-700 ease-out', tones[tone])}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

export function StatCard({
  icon,
  label,
  value,
  trend,
  tone = 'primary',
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  trend?: { value: string; up: boolean };
  tone?: BadgeTone;
}) {
  const tones: Record<BadgeTone, string> = {
    primary: 'bg-primary-50 text-primary-600',
    success: 'bg-success-50 text-success-600',
    warning: 'bg-warning-50 text-warning-600',
    error: 'bg-error-50 text-error-600',
    neutral: 'bg-neutral-100 text-neutral-600',
    accent: 'bg-accent-50 text-accent-600',
    secondary: 'bg-secondary-50 text-secondary-600',
  };
  const Icon = isReactComponent(icon) ? icon : null;
  return (
    <Card hover className="p-5">
      <div className="flex items-center justify-between">
        <div className={cn('grid place-items-center h-12 w-12 rounded-xl', tones[tone])}>
          {Icon && <Icon className="h-6 w-6" />}
        </div>
        {trend && (
          <span
            className={cn(
              'text-xs font-semibold px-2 py-1 rounded-full',
              trend.up ? 'bg-success-50 text-success-700' : 'bg-error-50 text-error-700',
            )}
          >
            {trend.up ? '▲' : '▼'} {trend.value}
          </span>
        )}
      </div>
      <p className="mt-4 text-3xl font-bold font-display text-neutral-900">{value}</p>
      <p className="text-sm text-neutral-500 mt-1">{label}</p>
    </Card>
  );
}

export function Avatar({
  name,
  src,
  size = 'md',
  tone = 'primary',
}: {
  name: string;
  src?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  tone?: BadgeTone;
}) {
  const sizes = { sm: 'h-8 w-8 text-xs', md: 'h-10 w-10 text-sm', lg: 'h-12 w-12 text-base', xl: 'h-20 w-20 text-2xl' };
  const tones: Record<BadgeTone, string> = {
    primary: 'bg-primary-100 text-primary-700',
    success: 'bg-success-100 text-success-700',
    warning: 'bg-warning-100 text-warning-700',
    error: 'bg-error-100 text-error-700',
    neutral: 'bg-neutral-200 text-neutral-700',
    accent: 'bg-accent-100 text-accent-700',
    secondary: 'bg-secondary-100 text-secondary-700',
  };
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  if (src) {
    return <img src={src} alt={name} className={cn('rounded-full object-cover', sizes[size])} />;
  }
  return (
    <div className={cn('grid place-items-center rounded-full font-semibold font-display', sizes[size], tones[tone])}>
      {initials}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  const Icon = isReactComponent(icon) ? icon : null;
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {Icon && (
        <div className="grid place-items-center h-16 w-16 rounded-2xl bg-neutral-100 text-neutral-400 mb-4">
          <Icon className="h-8 w-8" />
        </div>
      )}
      <h3 className="font-display font-semibold text-neutral-700">{title}</h3>
      {description && <p className="text-sm text-neutral-500 mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function SectionHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-bold font-display text-neutral-900">{title}</h1>
        {description && <p className="text-neutral-500 mt-1">{description}</p>}
      </div>
      {action}
    </div>
  );
}

/* ============ TOAST ============ */
export type ToastTone = 'success' | 'error' | 'warning';

export type ToastData = {
  id: string;
  message: string;
  tone: ToastTone;
};

const toastStyles: Record<ToastTone, { bg: string; icon: typeof CheckCircle2; iconCls: string }> = {
  success: { bg: 'bg-green-600 border-green-700 text-white', icon: CheckCircle2, iconCls: 'text-white' },
  error: { bg: 'bg-red-600 border-red-700 text-white', icon: XCircle, iconCls: 'text-white' },
  warning: { bg: 'bg-amber-600 border-amber-700 text-white', icon: AlertTriangle, iconCls: 'text-white' },
};

export function Toast({ toast, onDismiss }: { toast: ToastData; onDismiss: (id: string) => void }) {
  const style = toastStyles[toast.tone];
  const Icon = style.icon;

  useEffect(() => {
    const t = setTimeout(() => onDismiss(toast.id), 5000);
    return () => clearTimeout(t);
  }, [toast.id, onDismiss]);

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium shadow-lg animate-fade-in-up max-w-sm',
        style.bg,
      )}
      role="alert"
      aria-live="assertive"
    >
      <Icon className={cn('h-5 w-5 shrink-0', style.iconCls)} aria-hidden />
      <span className="flex-1">{toast.message}</span>
      <button
        onClick={() => onDismiss(toast.id)}
        className="shrink-0 p-0.5 rounded opacity-60 hover:opacity-100 transition-opacity"
        aria-label="Dismiss notification"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function ToastContainer({ toasts, onDismiss }: { toasts: ToastData[]; onDismiss: (id: string) => void }) {
  if (toasts.length === 0) return null;
  return (
    <div
      className="fixed top-4 left-1/2 z-[60] flex w-[min(calc(100vw-2rem),32rem)] -translate-x-1/2 flex-col items-center gap-2 pointer-events-none"
      aria-label="Notifications"
    >
      {toasts.map(t => (
        <div key={t.id} className="w-full pointer-events-auto">
          <Toast toast={t} onDismiss={onDismiss} />
        </div>
      ))}
    </div>
  );
}

/* ============ CONFIRM DIALOG ============ */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Delete',
  confirmVariant = 'danger',
  loading = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  confirmVariant?: 'danger' | 'primary';
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" onClick={onCancel} />
      {/* Dialog */}
      <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-neutral-200">
        <h2 id="confirm-dialog-title" className="font-display font-bold text-neutral-900 text-lg">{title}</h2>
        <div className="mt-2 text-sm text-neutral-600">{description}</div>
        <div className="flex gap-3 mt-6 justify-end">
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button variant={confirmVariant} onClick={onConfirm} disabled={loading}>
            {loading ? 'Deleting…' : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

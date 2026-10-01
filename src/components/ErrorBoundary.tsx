import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary caught error]:', error, errorInfo);
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20 p-8 text-center my-6">
          <div className="mx-auto grid place-items-center h-12 w-12 rounded-xl bg-red-100 dark:bg-red-900/60 text-red-600 dark:text-red-400 mb-4">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
            {this.props.fallbackTitle || 'Something went wrong rendering this section'}
          </h3>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1 max-w-md mx-auto">
            {this.state.error?.message || this.props.fallbackMessage || 'An unexpected error occurred. Please try reloading or switching tabs.'}
          </p>
          <div className="mt-5 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={this.handleReset}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-primary-600 text-white hover:bg-primary-700 transition-colors shadow-sm"
            >
              <RefreshCw className="h-4 w-4" />
              Try again
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 transition-colors"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

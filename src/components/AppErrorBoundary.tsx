import React from 'react';
import { AlertTriangle, RefreshCw, Home, X } from 'lucide-react';
import { BRAND_NAME } from '../config/brand.ts';

interface AppErrorBoundaryProps {
  children: React.ReactNode;
  sectionName?: string;
  compactModal?: boolean;
  onReset?: () => void;
}

interface AppErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

/**
 * React Error Boundary that prevents uncaught render exceptions (including
 * Android WebView crashes) from unmounting the app into a blank white screen.
 */
export class AppErrorBoundary extends React.Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  declare readonly props: Readonly<AppErrorBoundaryProps>;
  declare setState: (
    state:
      | Partial<AppErrorBoundaryState>
      | ((prevState: Readonly<AppErrorBoundaryState>) => Partial<AppErrorBoundaryState> | null)
  ) => void;

  public state: AppErrorBoundaryState = {
    hasError: false,
    errorMessage: '',
  };

  constructor(props: AppErrorBoundaryProps) {
    super(props);
  }

  public static getDerivedStateFromError(error: unknown): AppErrorBoundaryState {
    const message =
      error instanceof Error && error.message
        ? error.message
        : typeof error === 'string' && error
          ? error
          : 'An unexpected rendering error occurred.';
    return {
      hasError: true,
      errorMessage: message,
    };
  }

  public componentDidCatch(error: unknown, errorInfo: React.ErrorInfo): void {
    try {
      console.error(
        `[${BRAND_NAME} ErrorBoundary${this.props.sectionName ? `: ${this.props.sectionName}` : ''}]`,
        error,
        errorInfo?.componentStack
      );
    } catch {
      // Ignore console errors on restricted WebViews
    }
  }

  private handleRetry = () => {
    this.setState({ hasError: false, errorMessage: '' });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  private handleReload = () => {
    try {
      window.location.reload();
    } catch {
      this.handleRetry();
    }
  };

  public render(): React.ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const title = this.props.sectionName
      ? `${this.props.sectionName} Could Not Load`
      : `${BRAND_NAME} Encountered an Error`;

    if (this.props.compactModal) {
      return (
        <div
          role="alertdialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-[#0A2540]/70 flex items-center justify-center p-4"
        >
          <div className="w-full max-w-md bg-white border border-[#E2E8F0] rounded-2xl shadow-2xl p-6 space-y-4 text-[#0F172A]">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-[#0A2540]">{title}</h2>
                  <p className="text-xs text-[#64748B]">
                    Please retry or close this screen to continue using {BRAND_NAME}.
                  </p>
                </div>
              </div>
              {this.props.onReset && (
                <button
                  type="button"
                  onClick={this.handleRetry}
                  aria-label="Close error dialog"
                  className="p-1.5 rounded-lg text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-mono break-words">
              {this.state.errorMessage}
            </div>

            <div className="flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={this.handleRetry}
                className="flex-1 min-h-[42px] px-4 py-2 rounded-xl bg-[#0B5ED7] hover:bg-[#084BB3] text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Try Again</span>
              </button>
              <button
                type="button"
                onClick={this.handleReload}
                className="min-h-[42px] px-4 py-2 rounded-xl bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#334155] border border-[#CBD5E1] text-xs font-semibold cursor-pointer"
              >
                Reload App
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4 text-[#0F172A]">
        <div className="w-full max-w-md bg-white border border-[#E2E8F0] rounded-2xl shadow-lg p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
            </div>
            <div>
              <h1 className="text-lg font-extrabold text-[#0A2540]">{title}</h1>
              <p className="text-xs text-[#64748B]">
                Something went wrong while rendering this screen.
              </p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-mono break-words">
            {this.state.errorMessage}
          </div>

          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={this.handleRetry}
              className="flex-1 min-h-[44px] px-4 py-2.5 rounded-xl bg-[#0B5ED7] hover:bg-[#084BB3] text-white text-sm font-bold inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Retry</span>
            </button>
            <button
              type="button"
              onClick={() => {
                try {
                  window.history.replaceState({}, '', '/');
                } catch {}
                this.handleReload();
              }}
              className="min-h-[44px] px-4 py-2.5 rounded-xl bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#334155] border border-[#CBD5E1] text-sm font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Home className="w-4 h-4" />
              <span>Home</span>
            </button>
          </div>
        </div>
      </div>
    );
  }
}

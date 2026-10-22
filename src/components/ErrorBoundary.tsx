import React, { Component, ErrorInfo, ReactNode } from 'react';
import { RefreshCw, RotateCcw, AlertOctagon } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[Deepwork] Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    if (window.confirm('Reset all local data and reload? This will clear locally cached study plans.')) {
      try {
        localStorage.removeItem('studypulse_storage');
        localStorage.removeItem('studypulse_google_token');
        sessionStorage.clear();
      } catch (e) {
        console.error('Failed to clear storage:', e);
      }
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-ocean-950 flex items-center justify-center p-6 text-slate-100 font-sans">
          <div className="water-caustic-bg" aria-hidden="true" />
          <div className="relative z-10 max-w-md w-full glass-card p-8 rounded-3xl border border-aqua-500/20 shadow-2xl backdrop-blur-2xl text-center">
            <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-gradient-to-tr from-cyan-600/30 to-teal-400/30 border border-aqua-400/40 flex items-center justify-center text-aqua-300 shadow-inner">
              <AlertOctagon className="w-8 h-8 animate-pulse text-cyan-400" />
            </div>

            <h2 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-teal-200 via-cyan-200 to-sky-300 bg-clip-text text-transparent mb-2">
              Flow Interrupted
            </h2>
            <p className="text-sm text-slate-400 mb-6 leading-relaxed">
              Deepwork caught an unexpected ripple. Don't worry, your progress is safely preserved.
            </p>

            {this.state.error && (
              <div className="p-3 mb-6 rounded-xl bg-ocean-900/80 border border-ocean-700/50 text-left font-mono text-xs text-rose-300/90 overflow-x-auto max-h-32">
                {this.state.error.message || 'Unknown render error'}
              </div>
            )}

            <div className="flex flex-col gap-3">
              <button
                onClick={this.handleReload}
                className="liquid-btn w-full py-3 px-4 rounded-xl flex items-center justify-center gap-2 font-medium text-slate-900 text-sm"
              >
                <RefreshCw className="w-4 h-4" />
                Reload Application
              </button>

              <button
                onClick={this.handleReset}
                className="w-full py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 font-medium text-slate-400 hover:text-slate-200 hover:bg-ocean-800/50 border border-ocean-700/40 transition-colors text-xs"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Cache & Restart Fresh
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

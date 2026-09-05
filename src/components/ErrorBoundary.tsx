import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RotateCw } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorMessage: "",
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return {
      hasError: true,
      errorMessage: error?.message || "An unexpected rendering error occurred.",
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Directive 11: Log the error client-side only (no plaintext journal content)
    console.error("[ErrorBoundary caught uncaught render error]:", {
      name: error?.name,
      message: error?.message,
      componentStack: errorInfo?.componentStack,
    });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    // Clear any test crash flag from URL or session storage and reset boundary state
    if (window.location.search.includes("trigger_error=true")) {
      window.history.replaceState(null, "", window.location.pathname);
    }
    this.setState({ hasError: false, errorMessage: "" });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div
          id="global-error-boundary-fallback"
          className="min-h-screen bg-[#0d0d0d] text-[#f5f5f5] flex items-center justify-center p-6 select-none font-sans"
        >
          <div className="max-w-md w-full bg-[#171717] border border-[#2e2e2e] rounded-xl p-8 shadow-2xl space-y-6 text-center">
            <div className="mx-auto w-14 h-14 rounded-full bg-red-950/40 border border-red-800/50 flex items-center justify-center text-red-400">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <h1 className="text-xl font-medium tracking-tight text-white">
                Something went wrong
              </h1>
              <p className="text-sm text-[#a3a3a3] leading-relaxed">
                The application encountered an unexpected interface issue. Your encrypted
                journal entries in the vault remain safe and untouched.
              </p>
            </div>

            {this.state.errorMessage && (
              <div className="bg-[#0f0f0f] border border-[#262626] rounded-lg p-3 text-left">
                <span className="text-[11px] font-mono text-[#737373] uppercase tracking-wider block mb-1">
                  Diagnostics
                </span>
                <p className="text-xs font-mono text-[#d4d4d4] truncate">
                  {this.state.errorMessage}
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                id="btn-error-boundary-reload"
                onClick={this.handleReload}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-white text-black hover:bg-[#e5e5e5] transition-colors focus:outline-none focus:ring-2 focus:ring-white/20"
              >
                <RotateCw className="w-4 h-4" />
                Reload App
              </button>
              <button
                id="btn-error-boundary-retry"
                onClick={this.handleReset}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-[#262626] text-[#e5e5e5] hover:bg-[#333333] transition-colors border border-[#383838]"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

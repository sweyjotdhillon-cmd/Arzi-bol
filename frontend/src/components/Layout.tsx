import type { ReactNode } from 'react';
import { FileWarning, Home, Scale, Settings } from 'lucide-react';
import { ErrorBanner } from './ErrorBanner';

export type ActiveView = 'home' | 'terms';

interface LayoutProps {
  activeView: ActiveView;
  onNavigate: (view: ActiveView) => void;
  onOpenSettings: () => void;
  hasConfiguredKeys: boolean;
  children: ReactNode;
}

export function Layout({
  activeView,
  onNavigate,
  onOpenSettings,
  hasConfiguredKeys,
  children,
}: LayoutProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-slate-50 text-slate-900 pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
      {/* Sticky Top Navbar */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          {/* Left: Arzi-Bol Logo & Title */}
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className="flex items-center gap-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded-xl"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-700 text-white shadow-sm">
              <Scale className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <span className="block text-base font-bold tracking-tight text-slate-900 sm:text-lg">
                Arzi-Bol
              </span>
              <span className="block text-xs text-slate-500">
                Voice-to-Legal Engine
              </span>
            </div>
          </button>

          {/* Right: Navigation & Settings Button */}
          <nav
            aria-label="Primary Navigation"
            className="flex items-center gap-1.5 sm:gap-2"
          >
            <button
              type="button"
              onClick={() => onNavigate('home')}
              aria-current={activeView === 'home' ? 'page' : undefined}
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-medium transition sm:px-3 sm:text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                activeView === 'home'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Home className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="hidden sm:inline">Home</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('terms')}
              aria-current={activeView === 'terms' ? 'page' : undefined}
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-medium transition sm:px-3 sm:text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                activeView === 'terms'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <FileWarning className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="hidden sm:inline">Terms &amp; Disclaimer</span>
            </button>

            <button
              type="button"
              onClick={onOpenSettings}
              aria-label="Open API Settings"
              title="Settings (API Keys)"
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            >
              <Settings className="h-5 w-5" aria-hidden="true" />
              {hasConfiguredKeys && (
                <span
                  aria-label="API keys configured"
                  className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white"
                />
              )}
            </button>
          </nav>
        </div>
      </header>

      {/* Global Error Banner */}
      <ErrorBanner />

      {/* Main Content */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        {children}
      </main>

      {/* Footer with iOS safe area bottom padding */}
      <footer className="border-t border-slate-200 bg-white pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 pt-4 text-xs text-slate-500 md:flex-row sm:px-6 lg:px-8">
          <p>
            Arzi-Bol &middot; Civic Voice-to-Legal Drafting Assistant (BNS)
          </p>
          <button
            type="button"
            onClick={() => onNavigate('terms')}
            className="font-medium text-blue-700 underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded"
          >
            Legal Disclaimer &amp; Usage Terms
          </button>
        </div>
      </footer>
    </div>
  );
}

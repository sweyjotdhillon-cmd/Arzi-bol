import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { AlertCircle, X } from 'lucide-react';
import { maskErrorMessage } from '../utils/errorMasking';

interface ErrorBannerContextValue {
  errorMessage: string | null;
  showError: (error: unknown, fallback?: string) => void;
  clearError: () => void;
}

const ErrorBannerContext = createContext<ErrorBannerContextValue | null>(null);

interface ErrorProviderProps {
  children: ReactNode;
}

export function ErrorProvider({ children }: ErrorProviderProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const showError = useCallback((error: unknown, fallback?: string) => {
    const safeMessage =
      typeof error === 'string' &&
      !/\b[45]\d{2}\b/.test(error) &&
      !error.toLowerCase().includes('cors')
        ? error
        : maskErrorMessage(error, fallback);
    setErrorMessage(safeMessage);
  }, []);

  const clearError = useCallback(() => {
    setErrorMessage(null);
  }, []);

  const value = useMemo(
    () => ({ errorMessage, showError, clearError }),
    [errorMessage, showError, clearError]
  );

  return (
    <ErrorBannerContext.Provider value={value}>
      {children}
    </ErrorBannerContext.Provider>
  );
}

export function useErrorBanner(): ErrorBannerContextValue {
  const context = useContext(ErrorBannerContext);
  if (!context) {
    throw new Error('useErrorBanner must be used within an ErrorProvider');
  }
  return context;
}

interface ErrorBannerProps {
  message?: string | null;
  onDismiss?: () => void;
}

export function ErrorBanner({ message, onDismiss }: ErrorBannerProps) {
  const context = useContext(ErrorBannerContext);
  const activeMessage = message !== undefined ? message : context?.errorMessage ?? null;
  const handleDismiss = onDismiss ?? context?.clearError;

  if (!activeMessage) {
    return null;
  }

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="mx-auto w-full max-w-5xl px-4 pt-4 sm:px-6 lg:px-8"
    >
      <div className="flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 shadow-sm">
        <div className="flex items-start gap-2.5">
          <AlertCircle
            className="mt-0.5 h-4 w-4 shrink-0 text-red-600"
            aria-hidden="true"
          />
          <p className="leading-relaxed font-medium">{activeMessage}</p>
        </div>

        {handleDismiss && (
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss error message"
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-red-600 transition hover:bg-red-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}

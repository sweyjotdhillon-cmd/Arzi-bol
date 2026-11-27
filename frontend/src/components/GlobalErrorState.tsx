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

interface GlobalErrorContextValue {
  errorMessage: string | null;
  showError: (error: unknown, fallback?: string) => void;
  clearError: () => void;
}

const GlobalErrorContext = createContext<GlobalErrorContextValue | null>(null);

interface GlobalErrorProviderProps {
  children: ReactNode;
}

export function GlobalErrorProvider({ children }: GlobalErrorProviderProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const showError = useCallback((error: unknown, fallback?: string) => {
    setErrorMessage(maskErrorMessage(error, fallback));
  }, []);

  const clearError = useCallback(() => {
    setErrorMessage(null);
  }, []);

  const value = useMemo(
    () => ({ errorMessage, showError, clearError }),
    [errorMessage, showError, clearError]
  );

  return (
    <GlobalErrorContext.Provider value={value}>
      {children}
    </GlobalErrorContext.Provider>
  );
}

export function useGlobalError(): GlobalErrorContextValue {
  const context = useContext(GlobalErrorContext);
  if (!context) {
    throw new Error('useGlobalError must be used within a GlobalErrorProvider');
  }
  return context;
}

interface GlobalErrorStateProps {
  message?: string | null;
  onDismiss?: () => void;
}

export function GlobalErrorState({
  message,
  onDismiss,
}: GlobalErrorStateProps) {
  const context = useContext(GlobalErrorContext);
  const rawActiveMessage =
    message !== undefined ? message : context?.errorMessage ?? null;
  const activeMessage = rawActiveMessage
    ? maskErrorMessage(rawActiveMessage)
    : null;
  const handleDismiss = onDismiss ?? context?.clearError;

  if (!activeMessage) {
    return null;
  }

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="mx-auto w-full max-w-6xl px-4 pt-4 sm:px-6 lg:px-8"
    >
      <div className="flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50/95 px-4 py-3 text-xs text-red-900 shadow-sm sm:px-5 sm:py-3.5 sm:text-sm">
        <div className="flex items-start gap-2.5 sm:gap-3">
          <AlertCircle
            className="mt-0.5 h-4 w-4 shrink-0 text-red-600 sm:h-5 sm:w-5"
            aria-hidden="true"
          />
          <p className="font-medium leading-relaxed">{activeMessage}</p>
        </div>

        {handleDismiss && (
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss error message"
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-red-700 transition hover:bg-red-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}

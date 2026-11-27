import { useEffect, useState, type FormEvent } from 'react';
import { CheckCircle2, Eye, EyeOff, KeyRound, ShieldCheck, X } from 'lucide-react';
import { useGlobalError } from './GlobalErrorState';
import {
  API_STORAGE_KEYS,
  loadStoredApiSettings,
} from '../utils/storage';

export interface ApiKeysConfig {
  sarvamApiKey: string;
  geminiApiKey: string;
}

export function loadStoredApiKeys(): ApiKeysConfig {
  const { sarvamKey, geminiKey } = loadStoredApiSettings();
  return {
    sarvamApiKey: sarvamKey,
    geminiApiKey: geminiKey,
  };
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (config: ApiKeysConfig) => void;
}

export function SettingsModal({ isOpen, onClose, onSaved }: SettingsModalProps) {
  const { showError } = useGlobalError();
  const [sarvamApiKey, setSarvamApiKey] = useState('');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [showSarvamKey, setShowSarvamKey] = useState(false);
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [savedFeedback, setSavedFeedback] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const stored = loadStoredApiKeys();
    setSarvamApiKey(stored.sarvamApiKey);
    setGeminiApiKey(stored.geminiApiKey);
    setSavedFeedback(false);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const handleSave = (event: FormEvent) => {
    event.preventDefault();
    const trimmedSarvam = sarvamApiKey.trim();
    const trimmedGemini = geminiApiKey.trim();

    try {
      if (trimmedSarvam) {
        window.localStorage.setItem(API_STORAGE_KEYS.sarvam, trimmedSarvam);
      } else {
        window.localStorage.removeItem(API_STORAGE_KEYS.sarvam);
      }

      if (trimmedGemini) {
        window.localStorage.setItem(API_STORAGE_KEYS.gemini, trimmedGemini);
      } else {
        window.localStorage.removeItem(API_STORAGE_KEYS.gemini);
      }

      const updated: ApiKeysConfig = {
        sarvamApiKey: trimmedSarvam,
        geminiApiKey: trimmedGemini,
      };
      onSaved?.(updated);
      setSavedFeedback(true);
      window.setTimeout(() => {
        onClose();
      }, 650);
    } catch {
      showError(
        'Unable to save API keys in browser storage. Please check your browser privacy settings.'
      );
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
              <KeyRound className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2
                id="settings-modal-title"
                className="text-base font-semibold text-slate-900"
              >
                API Configuration (Bring Your Own Key)
              </h2>
              <p className="text-xs text-slate-500">
                Stored locally in your browser. Never uploaded to third-party servers.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings modal"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="space-y-5 px-5 py-5 sm:px-6">
          {/* Sarvam AI Key */}
          <div>
            <label
              htmlFor="sarvam-api-key"
              className="block text-sm font-medium text-slate-800"
            >
              Sarvam AI API Key (Speech-to-Text)
            </label>
            <div className="relative mt-1.5">
              <input
                id="sarvam-api-key"
                type={showSarvamKey ? 'text' : 'password'}
                value={sarvamApiKey}
                onChange={(e) => setSarvamApiKey(e.target.value)}
                placeholder="Enter your Sarvam AI API key"
                autoComplete="off"
                spellCheck={false}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 pr-11 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20"
              />
              <button
                type="button"
                onClick={() => setShowSarvamKey((prev) => !prev)}
                aria-label={showSarvamKey ? 'Hide Sarvam AI API Key' : 'Show Sarvam AI API Key'}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-500 hover:text-slate-700 focus:outline-none"
              >
                {showSarvamKey ? (
                  <EyeOff className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Eye className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Used for multilingual Indian voice transcription.
            </p>
          </div>

          {/* Gemini Key */}
          <div>
            <label
              htmlFor="gemini-api-key"
              className="block text-sm font-medium text-slate-800"
            >
              Gemini API Key (LLM)
            </label>
            <div className="relative mt-1.5">
              <input
                id="gemini-api-key"
                type={showGeminiKey ? 'text' : 'password'}
                value={geminiApiKey}
                onChange={(e) => setGeminiApiKey(e.target.value)}
                placeholder="Enter your Gemini API key"
                autoComplete="off"
                spellCheck={false}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 pr-11 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20"
              />
              <button
                type="button"
                onClick={() => setShowGeminiKey((prev) => !prev)}
                aria-label={showGeminiKey ? 'Hide Gemini API Key' : 'Show Gemini API Key'}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-500 hover:text-slate-700 focus:outline-none"
              >
                {showGeminiKey ? (
                  <EyeOff className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Eye className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Used to map facts to Bharatiya Nyaya Sanhita (BNS) provisions and draft petitions.
            </p>
          </div>

          {/* Security Note */}
          <div className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" aria-hidden="true" />
            <span>
              Your keys remain in your browser&apos;s <code className="font-mono">localStorage</code> and can be cleared at any time.
            </span>
          </div>

          {savedFeedback && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-medium text-emerald-800">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
              <span>Configuration saved successfully.</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
            >
              Save Configuration
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

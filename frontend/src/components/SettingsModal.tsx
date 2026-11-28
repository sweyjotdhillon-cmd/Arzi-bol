import { useEffect, useRef, useState, type FormEvent } from 'react';
import { CheckCircle2, Eye, EyeOff, KeyRound, ShieldCheck, X } from 'lucide-react';
import { useGlobalError } from './GlobalErrorState';
import {
  API_STORAGE_KEYS,
  loadStoredApiSettings,
  normalizeLlmProvider,
  type LlmProvider,
} from '../utils/storage';

const MODEL_REGISTRY = {
  "Gemini": [
    "gemini-1.5-flash",
    "gemini-1.5-pro",
    "gemini-2.0-flash-exp",
    "Custom..."
  ],
  "OpenAI": [
    "gpt-6.1-sol",
    "gpt-6-astra",
    "gpt-6.1-terra",
    "gpt-6-luna",
    "o1-preview",
    "o1-mini",
    "Custom..."
  ],
  "Anthropic": [
    "claude-sonnet-5-5",
    "claude-haiku-5-5",
    "claude-opus-5-5",
    "claude-fable-5-2",
    "Custom..."
  ],
  "OpenRouter": [
    "google/gemini-flash-1.5",
    "anthropic/claude-3.5-sonnet",
    "meta-llama/llama-3.1-8b-instruct",
    "liquid/lfm-40b",
    "Custom..."
  ]
} as const;

type ModelRegistryKey = keyof typeof MODEL_REGISTRY;
const CUSTOM_MODEL_OPTION = 'Custom...';

export interface ApiKeysConfig {
  sarvamApiKey: string;
  llmProvider: LlmProvider;
  llmApiKey: string;
  llmModel: string;
}

const PROVIDER_OPTIONS: ReadonlyArray<{
  value: LlmProvider;
  registryKey: ModelRegistryKey;
  label: string;
  keyPlaceholder: string;
  modelPlaceholder: string;
}> = [
  {
    value: 'gemini',
    registryKey: 'Gemini',
    label: 'Gemini',
    keyPlaceholder: 'Enter your Google Gemini API key',
    modelPlaceholder: 'e.g. gemini-1.5-flash',
  },
  {
    value: 'openai',
    registryKey: 'OpenAI',
    label: 'OpenAI',
    keyPlaceholder: 'Enter your OpenAI API key (sk-...)',
    modelPlaceholder: 'e.g. gpt-6.1-sol',
  },
  {
    value: 'anthropic',
    registryKey: 'Anthropic',
    label: 'Anthropic (Claude)',
    keyPlaceholder: 'Enter your Anthropic API key (sk-ant-...)',
    modelPlaceholder: 'e.g. claude-sonnet-5-5',
  },
  {
    value: 'openrouter',
    registryKey: 'OpenRouter',
    label: 'OpenRouter',
    keyPlaceholder: 'Enter your OpenRouter API key (sk-or-...)',
    modelPlaceholder: 'e.g. google/gemini-flash-1.5',
  },
];

function getProviderMeta(provider: LlmProvider) {
  return (
    PROVIDER_OPTIONS.find((opt) => opt.value === provider) ??
    PROVIDER_OPTIONS[0]
  );
}

function getModelsForProvider(provider: LlmProvider): readonly string[] {
  return MODEL_REGISTRY[getProviderMeta(provider).registryKey];
}

function isPresetModel(provider: LlmProvider, model: string): boolean {
  if (!model || model === CUSTOM_MODEL_OPTION) return false;
  return getModelsForProvider(provider).includes(model);
}

export function loadStoredApiKeys(): ApiKeysConfig {
  const { sarvamKey, llmProvider, llmApiKey, llmModel } = loadStoredApiSettings();
  return {
    sarvamApiKey: sarvamKey,
    llmProvider,
    llmApiKey,
    llmModel,
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
  const [llmProvider, setLlmProvider] = useState<LlmProvider>('gemini');
  const [llmApiKey, setLlmApiKey] = useState('');
  const [selectedModelOption, setSelectedModelOption] = useState<string>(
    MODEL_REGISTRY.Gemini[0]
  );
  const [customModel, setCustomModel] = useState('');
  const [modelError, setModelError] = useState<string | null>(null);
  const [showSarvamKey, setShowSarvamKey] = useState(false);
  const [showLlmKey, setShowLlmKey] = useState(false);
  const [savedFeedback, setSavedFeedback] = useState(false);
  const closeTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current !== null) {
        window.clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const stored = loadStoredApiKeys();
    setSarvamApiKey(stored.sarvamApiKey);
    setLlmProvider(stored.llmProvider);
    setLlmApiKey(stored.llmApiKey);

    const storedModel = stored.llmModel.trim();
    const providerModels = getModelsForProvider(stored.llmProvider);
    if (storedModel && isPresetModel(stored.llmProvider, storedModel)) {
      setSelectedModelOption(storedModel);
      setCustomModel('');
    } else if (storedModel) {
      setSelectedModelOption(CUSTOM_MODEL_OPTION);
      setCustomModel(storedModel);
    } else {
      setSelectedModelOption(providerModels[0]);
      setCustomModel('');
    }
    setModelError(null);
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

  const activeProviderMeta = getProviderMeta(llmProvider);
  const activeModels = getModelsForProvider(llmProvider);
  const isCustomModelSelected = selectedModelOption === CUSTOM_MODEL_OPTION;

  const handleProviderChange = (nextRaw: string) => {
    const nextProvider = normalizeLlmProvider(nextRaw);
    const nextModels = getModelsForProvider(nextProvider);
    setLlmProvider(nextProvider);
    setSelectedModelOption(nextModels[0]);
    setCustomModel('');
    setModelError(null);
  };

  const handleModelOptionChange = (nextModel: string) => {
    setSelectedModelOption(nextModel);
    setModelError(null);
    if (nextModel !== CUSTOM_MODEL_OPTION) {
      setCustomModel('');
    }
  };

  const handleSave = (event: FormEvent) => {
    event.preventDefault();
    const trimmedSarvam = sarvamApiKey.trim();
    const trimmedLlmKey = llmApiKey.trim();
    const resolvedModel = isCustomModelSelected
      ? customModel.trim()
      : selectedModelOption;

    if (!resolvedModel) {
      setModelError('Please enter a custom model name or select a preset model.');
      return;
    }

    try {
      if (trimmedSarvam) {
        window.localStorage.setItem(API_STORAGE_KEYS.sarvam, trimmedSarvam);
      } else {
        window.localStorage.removeItem(API_STORAGE_KEYS.sarvam);
      }

      window.localStorage.setItem(API_STORAGE_KEYS.llmProvider, llmProvider);
      window.localStorage.setItem(API_STORAGE_KEYS.llmModel, resolvedModel);

      if (trimmedLlmKey) {
        window.localStorage.setItem(API_STORAGE_KEYS.llmApiKey, trimmedLlmKey);
      } else {
        window.localStorage.removeItem(API_STORAGE_KEYS.llmApiKey);
      }

      // Clean up legacy Gemini-only keys so provider switches don't fall back unexpectedly
      window.localStorage.removeItem(API_STORAGE_KEYS.gemini);
      window.localStorage.removeItem(API_STORAGE_KEYS.geminiModel);

      const updated: ApiKeysConfig = {
        sarvamApiKey: trimmedSarvam,
        llmProvider,
        llmApiKey: trimmedLlmKey,
        llmModel: resolvedModel,
      };
      onSaved?.(updated);
      setSavedFeedback(true);
      if (closeTimeoutRef.current !== null) {
        window.clearTimeout(closeTimeoutRef.current);
      }
      closeTimeoutRef.current = window.setTimeout(() => {
        closeTimeoutRef.current = null;
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
        className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-xl"
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
                Stored locally in your browser. Zero server-side key retention.
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
        <form onSubmit={handleSave} className="space-y-4 px-5 py-5 sm:px-6">
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
              Used for multilingual Indian voice transcription (saaras:v4).
            </p>
          </div>

          {/* LLM Provider Dropdown */}
          <div>
            <label
              htmlFor="llm-provider"
              className="block text-sm font-medium text-slate-800"
            >
              LLM Provider
            </label>
            <select
              id="llm-provider"
              value={llmProvider}
              onChange={(e) => handleProviderChange(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20"
            >
              {PROVIDER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Dynamic LLM API Key */}
          <div>
            <label
              htmlFor="llm-api-key"
              className="block text-sm font-medium text-slate-800"
            >
              {activeProviderMeta.label} API Key
            </label>
            <div className="relative mt-1.5">
              <input
                id="llm-api-key"
                type={showLlmKey ? 'text' : 'password'}
                value={llmApiKey}
                onChange={(e) => setLlmApiKey(e.target.value)}
                placeholder={activeProviderMeta.keyPlaceholder}
                autoComplete="off"
                spellCheck={false}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 pr-11 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20"
              />
              <button
                type="button"
                onClick={() => setShowLlmKey((prev) => !prev)}
                aria-label={showLlmKey ? 'Hide LLM API Key' : 'Show LLM API Key'}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-500 hover:text-slate-700 focus:outline-none"
              >
                {showLlmKey ? (
                  <EyeOff className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Eye className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>

          {/* Dynamic Model Selection */}
          <div>
            <label
              htmlFor="llm-model-select"
              className="block text-sm font-medium text-slate-800"
            >
              Model Name
            </label>
            <select
              id="llm-model-select"
              value={selectedModelOption}
              onChange={(e) => handleModelOptionChange(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20"
            >
              {activeModels.map((model) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </select>

            {isCustomModelSelected && (
              <div className="mt-2">
                <label htmlFor="llm-custom-model-name" className="sr-only">
                  Custom Model Name
                </label>
                <input
                  id="llm-custom-model-name"
                  type="text"
                  value={customModel}
                  onChange={(e) => {
                    setCustomModel(e.target.value);
                    if (modelError) setModelError(null);
                  }}
                  placeholder={activeProviderMeta.modelPlaceholder}
                  autoComplete="off"
                  spellCheck={false}
                  required
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                />
              </div>
            )}

            {modelError && (
              <p role="alert" className="mt-1 text-xs font-medium text-red-600">
                {modelError}
              </p>
            )}

            <p className="mt-1 text-xs text-slate-500">
              Used to map facts to BNS, IPC, and Special Acts and draft your FIR petition.
            </p>
          </div>

          {/* Security Note */}
          <div className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" aria-hidden="true" />
            <span>
              Your keys remain in your browser&apos;s <code className="font-mono">localStorage</code> and exist only in server RAM during the request.
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

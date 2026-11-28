export type LlmProvider = 'gemini' | 'openai' | 'anthropic' | 'openrouter';

export const DEFAULT_LLM_PROVIDER: LlmProvider = 'gemini';

export const DEFAULT_MODEL_BY_PROVIDER: Record<LlmProvider, string> = {
  gemini: 'gemini-3.8-flash',
  openai: 'gpt-4o',
  anthropic: 'claude-3-5-sonnet-20241022',
  openrouter: 'google/gemini-flash-1.5',
};

export const DEFAULT_GEMINI_MODEL = DEFAULT_MODEL_BY_PROVIDER.gemini;

export const API_STORAGE_KEYS = {
  sarvam: 'arzi_bol_sarvam_api_key',
  llmProvider: 'arzi_bol_llm_provider',
  llmApiKey: 'arzi_bol_llm_api_key',
  llmModel: 'arzi_bol_llm_model',
  // Legacy keys kept for seamless backward compatibility
  gemini: 'arzi_bol_gemini_api_key',
  geminiModel: 'arzi_bol_gemini_model',
} as const;

export interface StoredApiSettings {
  sarvamKey: string;
  llmProvider: LlmProvider;
  llmApiKey: string;
  llmModel: string;
}

export function normalizeLlmProvider(raw: string | null | undefined): LlmProvider {
  const normalized = (raw ?? '').trim().toLowerCase();
  if (
    normalized === 'gemini' ||
    normalized === 'openai' ||
    normalized === 'anthropic' ||
    normalized === 'openrouter'
  ) {
    return normalized;
  }
  return DEFAULT_LLM_PROVIDER;
}

/**
 * Loads user-provided API keys and LLM provider/model preferences strictly from browser localStorage.
 */
export function loadStoredApiSettings(): StoredApiSettings {
  try {
    const sarvamKey =
      window.localStorage.getItem(API_STORAGE_KEYS.sarvam)?.trim() ?? '';
    const llmProvider = normalizeLlmProvider(
      window.localStorage.getItem(API_STORAGE_KEYS.llmProvider)
    );
    const llmApiKey =
      window.localStorage.getItem(API_STORAGE_KEYS.llmApiKey)?.trim() ||
      window.localStorage.getItem(API_STORAGE_KEYS.gemini)?.trim() ||
      '';
    const llmModel =
      window.localStorage.getItem(API_STORAGE_KEYS.llmModel)?.trim() ||
      window.localStorage.getItem(API_STORAGE_KEYS.geminiModel)?.trim() ||
      DEFAULT_MODEL_BY_PROVIDER[llmProvider];

    return { sarvamKey, llmProvider, llmApiKey, llmModel };
  } catch {
    return {
      sarvamKey: '',
      llmProvider: DEFAULT_LLM_PROVIDER,
      llmApiKey: '',
      llmModel: DEFAULT_MODEL_BY_PROVIDER[DEFAULT_LLM_PROVIDER],
    };
  }
}

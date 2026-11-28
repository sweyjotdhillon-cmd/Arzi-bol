export const DEFAULT_GEMINI_MODEL = 'gemini-3.8-flash';

export const API_STORAGE_KEYS = {
  sarvam: 'arzi_bol_sarvam_api_key',
  gemini: 'arzi_bol_gemini_api_key',
  geminiModel: 'arzi_bol_gemini_model',
} as const;

export interface StoredApiSettings {
  sarvamKey: string;
  geminiKey: string;
  geminiModel: string;
}

/**
 * Loads user-provided API keys and model preference strictly from browser localStorage.
 */
export function loadStoredApiSettings(): StoredApiSettings {
  try {
    const sarvamKey =
      window.localStorage.getItem(API_STORAGE_KEYS.sarvam)?.trim() ?? '';
    const geminiKey =
      window.localStorage.getItem(API_STORAGE_KEYS.gemini)?.trim() ?? '';
    const geminiModel =
      window.localStorage.getItem(API_STORAGE_KEYS.geminiModel)?.trim() ||
      DEFAULT_GEMINI_MODEL;

    return { sarvamKey, geminiKey, geminiModel };
  } catch {
    return {
      sarvamKey: '',
      geminiKey: '',
      geminiModel: DEFAULT_GEMINI_MODEL,
    };
  }
}

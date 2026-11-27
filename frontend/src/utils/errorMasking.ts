/**
 * Translates raw technical, HTTP, network, or permission errors into
 * plain-text, user-friendly messages without exposing JSON, URLs, status codes, or stack traces.
 */
export function maskErrorMessage(error: unknown, fallback?: string): string {
  const defaultMessage =
    fallback ??
    'Something went wrong while processing your request. Please try again.';

  if (!error) {
    return defaultMessage;
  }

  let raw = '';
  if (error instanceof Error) {
    raw = `${error.name} ${error.message}`;
  } else if (typeof error === 'string') {
    raw = error;
  } else if (typeof error === 'object' && error !== null) {
    const maybeMessage = (error as { message?: unknown }).message;
    raw = typeof maybeMessage === 'string' ? maybeMessage : '';
  }

  const normalized = raw.toLowerCase();

  if (
    normalized.includes('notallowederror') ||
    normalized.includes('permission denied') ||
    normalized.includes('microphone')
  ) {
    return 'Microphone access denied. Please check your browser permissions.';
  }

  if (
    normalized.includes('401') ||
    normalized.includes('403') ||
    normalized.includes('unauthorized') ||
    normalized.includes('invalid key') ||
    normalized.includes('invalid api key') ||
    normalized.includes('api_key_invalid')
  ) {
    return 'Invalid Key. Please open Settings and verify your API keys.';
  }

  if (
    normalized.includes('429') ||
    normalized.includes('rate limit') ||
    normalized.includes('quota')
  ) {
    return 'Service limit reached. Please wait a moment and try again.';
  }

  if (
    normalized.includes('cors') ||
    normalized.includes('failed to fetch') ||
    normalized.includes('networkerror') ||
    normalized.includes('network error') ||
    normalized.includes('network request failed') ||
    normalized.includes('load failed') ||
    normalized.includes('econnrefused') ||
    normalized.includes('econnaborted') ||
    normalized.includes('timeout') ||
    normalized.includes('enotfound')
  ) {
    return 'Network error occurred while contacting AI models.';
  }

  if (
    normalized.includes('500') ||
    normalized.includes('502') ||
    normalized.includes('503') ||
    normalized.includes('504')
  ) {
    return 'Service temporarily unavailable. Please try again shortly.';
  }

  if (normalized.includes('404')) {
    return 'Requested service was not found. Please try again later.';
  }

  // Never surface raw JSON, URLs, stack traces, HTTP status codes, or JS error names
  const containsSensitiveOrTechnicalData =
    /https?:\/\//i.test(raw) ||
    /[{}[\]]/.test(raw) ||
    /\bat\s+[\w.$]+\s*\(/.test(raw) ||
    /\b[45]\d{2}\b/.test(raw) ||
    normalized.includes('syntaxerror') ||
    normalized.includes('typeerror') ||
    normalized.includes('referenceerror') ||
    raw.includes('\n');

  if (containsSensitiveOrTechnicalData || !raw.trim()) {
    return defaultMessage;
  }

  return raw.trim();
}

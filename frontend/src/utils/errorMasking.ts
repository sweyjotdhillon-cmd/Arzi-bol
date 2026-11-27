/**
 * Translates raw technical, HTTP, network, or permission errors into
 * plain-English, user-friendly messages without exposing status codes or stack traces.
 */
export function maskErrorMessage(error: unknown, fallback?: string): string {
  const defaultMessage =
    fallback ??
    'Something went wrong while processing your request. Please try again.';

  if (!error) {
    return defaultMessage;
  }

  const raw =
    error instanceof Error
      ? `${error.name} ${error.message}`
      : typeof error === 'string'
        ? error
        : '';

  const normalized = raw.toLowerCase();

  if (
    normalized.includes('notallowederror') ||
    normalized.includes('permission denied') ||
    normalized.includes('microphone')
  ) {
    return 'Microphone access denied. Please check browser settings.';
  }

  if (
    normalized.includes('401') ||
    normalized.includes('403') ||
    normalized.includes('unauthorized') ||
    normalized.includes('invalid api key') ||
    normalized.includes('api_key_invalid')
  ) {
    return 'Invalid API Key provided. Please open Settings and verify your Sarvam AI and Gemini keys.';
  }

  if (normalized.includes('429') || normalized.includes('rate limit') || normalized.includes('quota')) {
    return 'Service limit reached. Please wait a moment and try again.';
  }

  if (
    normalized.includes('cors') ||
    normalized.includes('failed to fetch') ||
    normalized.includes('networkerror') ||
    normalized.includes('network request failed') ||
    normalized.includes('load failed')
  ) {
    return 'Unable to connect to the service. Please check your internet connection and try again.';
  }

  if (
    normalized.includes('500') ||
    normalized.includes('502') ||
    normalized.includes('503') ||
    normalized.includes('504')
  ) {
    return 'The service is temporarily unavailable. Please try again shortly.';
  }

  if (normalized.includes('404')) {
    return 'Requested service endpoint was not found. Please try again later.';
  }

  // Never surface strings that contain raw HTTP status numbers or technical jargon
  if (/\b[45]\d{2}\b/.test(raw) || normalized.includes('syntaxerror') || normalized.includes('typeerror')) {
    return defaultMessage;
  }

  return defaultMessage;
}

export type AppStatus = 'idle' | 'listening' | 'processing' | 'error';

export type BackendMode = 'live' | 'local-demo' | 'checking' | 'offline';

export interface LegalPetitionResult {
  transcript: string;
  legal_petition: string;
  language: string;
}

export interface ExamplePrompt {
  id: string;
  label: string;
  language: string;
  text: string;
}

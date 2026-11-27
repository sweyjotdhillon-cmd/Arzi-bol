import { useEffect, useState } from 'react';
import axios from 'axios';
import {
  ArrowRight,
  CheckCircle2,
  Download,
  FileAudio,
  Mic,
  Scale,
  Settings,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import type {
  BackendMode,
  ExamplePrompt,
  LegalPetitionResult,
} from '../types';
import { VoiceRecorder } from '../VoiceRecorder';
import { maskErrorMessage } from '../utils/errorMasking';
import { loadStoredApiSettings } from '../utils/storage';
import { useGlobalError } from './GlobalErrorState';
import { LegalPetitionView } from './LegalPetitionView';

interface HomePresentationProps {
  hasConfiguredKeys: boolean;
  hasAcceptedTerms: boolean;
  onOpenSettings: () => void;
  onOpenTerms: () => void;
  onRequestTermsGate: () => void;
}

const WORKFLOW_STEPS = [
  {
    step: '01',
    tag: 'Speak',
    title: 'Speak Your Grievance',
    description:
      'Describe your issue naturally in Hindi, Punjabi, English, or supported regional languages without legal jargon.',
    icon: Mic,
  },
  {
    step: '02',
    tag: 'AI Legal Mapping',
    title: 'AI Legal Mapping',
    description:
      'Key facts, dates, and relevant Bharatiya Nyaya Sanhita (BNS) or civic provisions are structured into a clear summary.',
    icon: Scale,
  },
  {
    step: '03',
    tag: 'Download',
    title: 'Download Formal Petition',
    description:
      'Review every detail with a qualified advocate and export a clean, print-ready petition draft.',
    icon: Download,
  },
] as const;

export function HomePresentation({
  hasConfiguredKeys,
  hasAcceptedTerms,
  onOpenSettings,
  onOpenTerms,
  onRequestTermsGate,
}: HomePresentationProps) {
  const { showError, clearError } = useGlobalError();
  const [capturedAudio, setCapturedAudio] = useState<{
    blob: Blob;
    url: string;
  } | null>(null);
  const [selectedExample, setSelectedExample] = useState<ExamplePrompt | null>(
    null
  );
  const [petitionResult, setPetitionResult] =
    useState<LegalPetitionResult | null>(null);
  const [isProcessingExample, setIsProcessingExample] = useState(false);
  const [backendMode, setBackendMode] = useState<BackendMode>('checking');

  useEffect(() => {
    let cancelled = false;
    axios
      .get<{ mode?: BackendMode }>('/api/health', { timeout: 5000 })
      .then((res) => {
        if (cancelled) return;
        const mode = res.data?.mode;
        setBackendMode(mode === 'live' ? 'live' : 'local-demo');
      })
      .catch(() => {
        if (!cancelled) {
          setBackendMode('offline');
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (capturedAudio?.url) {
        URL.revokeObjectURL(capturedAudio.url);
      }
    };
  }, [capturedAudio]);

  const handleRecordingComplete = (
    audioBlob: Blob,
    result?: LegalPetitionResult
  ) => {
    setSelectedExample(null);
    setCapturedAudio((prev) => {
      if (prev?.url) {
        URL.revokeObjectURL(prev.url);
      }
      return {
        blob: audioBlob,
        url: URL.createObjectURL(audioBlob),
      };
    });
    if (result) {
      setPetitionResult(result);
    }
  };

  const handleDiscard = () => {
    setCapturedAudio((prev) => {
      if (prev?.url) {
        URL.revokeObjectURL(prev.url);
      }
      return null;
    });
  };

  const handleExampleSelect = async (example: ExamplePrompt) => {
    setSelectedExample(example);
    setCapturedAudio((prev) => {
      if (prev?.url) {
        URL.revokeObjectURL(prev.url);
      }
      return null;
    });
    setPetitionResult(null);
    clearError();
    setIsProcessingExample(true);

    const { geminiKey, geminiModel } = loadStoredApiSettings();

    try {
      const response = await axios.post<LegalPetitionResult>(
        '/api/process-text',
        {
          text: example.text,
          language: example.language,
          geminiModel,
          ...(geminiKey ? { geminiKey } : {}),
        },
        { timeout: 60000 }
      );
      setPetitionResult(response.data);
    } catch (err: unknown) {
      let rawError: unknown = err;
      if (axios.isAxiosError(err)) {
        const serverError = (
          err.response?.data as { error?: unknown } | undefined
        )?.error;
        if (typeof serverError === 'string' && serverError.trim()) {
          rawError = serverError.trim();
        }
      }
      const cleanMessage = maskErrorMessage(
        rawError,
        'Network error occurred while contacting AI models.'
      );
      showError(cleanMessage);
    } finally {
      setIsProcessingExample(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      {/* Hero & Live Voice Recorder */}
      <section
        aria-label="Arzi-Bol Guided Workspace"
        className="relative overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-5 shadow-md shadow-slate-200/50 sm:p-8 lg:p-10"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-blue-50/80 blur-3xl"
        />

        <div className="relative flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          {/* Left: Bulletproof Voice Recorder */}
          <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-50 to-slate-100/80 px-5 py-7 text-center shadow-inner sm:px-6 sm:py-8 md:w-5/12">
            <VoiceRecorder
              onRecordingComplete={handleRecordingComplete}
              onExampleSelect={(example) => void handleExampleSelect(example)}
              onDiscard={handleDiscard}
              disabled={!hasAcceptedTerms}
              isProcessingExternal={isProcessingExample}
            />

            {capturedAudio && (
              <div className="mt-5 w-full rounded-xl border border-emerald-200 bg-emerald-50/90 p-3 text-left text-xs text-emerald-900">
                <div className="flex items-center gap-2 font-semibold">
                  <FileAudio className="h-4 w-4 shrink-0 text-emerald-700" aria-hidden="true" />
                  <span>
                    Audio ready ({Math.max(1, Math.round(capturedAudio.blob.size / 1024))} KB ·{' '}
                    {capturedAudio.blob.type || 'audio/webm'})
                  </span>
                </div>
                <audio
                  controls
                  src={capturedAudio.url}
                  className="mt-2 h-8 w-full"
                />
              </div>
            )}

            {selectedExample && (
              <div className="mt-5 w-full rounded-xl border border-blue-200 bg-blue-50/90 p-3 text-left text-xs text-slate-800">
                <p className="font-semibold text-blue-900">
                  Selected Example ({selectedExample.language}):
                </p>
                <p className="mt-1 leading-relaxed">{selectedExample.text}</p>
              </div>
            )}

            <div className="mt-5 flex w-full max-w-xs flex-col gap-2.5 sm:max-w-sm sm:flex-row sm:justify-center">
              {!hasAcceptedTerms ? (
                <button
                  type="button"
                  onClick={onRequestTermsGate}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-amber-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-600"
                >
                  <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Review &amp; Accept Terms</span>
                </button>
              ) : (
                <span className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-semibold text-emerald-800">
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Terms Agreed</span>
                </span>
              )}

              <button
                type="button"
                onClick={onOpenSettings}
                className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                  hasConfiguredKeys
                    ? 'border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                    : 'bg-blue-700 text-white shadow-sm hover:bg-blue-800'
                }`}
              >
                <Settings className="h-3.5 w-3.5" aria-hidden="true" />
                <span>
                  {hasConfiguredKeys ? 'Keys Configured' : 'Configure API Keys'}
                </span>
              </button>
            </div>
          </div>

          {/* Right: Live Legal Petition Output or 3-Step Visual Presentation */}
          <div className="flex flex-1 flex-col justify-between">
            {isProcessingExample || petitionResult ? (
              <LegalPetitionView
                result={petitionResult}
                isProcessing={isProcessingExample}
                backendMode={backendMode}
              />
            ) : (
              <>
                <div>
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800">
                    <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Three-Step Civic Workflow</span>
                  </div>

                  <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl lg:text-4xl">
                    From Spoken Grievance to Formal Petition
                  </h2>
                  <p className="mt-2.5 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
                    Arzi-Bol guides citizens from everyday spoken complaints to
                    structured legal drafts mapped against the Bharatiya Nyaya
                    Sanhita (BNS).
                  </p>
                </div>

                {/* 3-Step Structured Cards with Hover Depth */}
                <ol className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
                  {WORKFLOW_STEPS.map((item, index) => {
                    const Icon = item.icon;
                    return (
                      <li
                        key={item.step}
                        className="group relative flex flex-col justify-between rounded-2xl border border-slate-200 bg-slate-50/70 p-4 shadow-xs transition duration-200 hover:-translate-y-1 hover:border-blue-200 hover:bg-white hover:shadow-md sm:p-5"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-700 text-white shadow-xs transition group-hover:bg-blue-800">
                              <Icon className="h-4 w-4" aria-hidden="true" />
                            </div>
                            <span className="rounded-full bg-white px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-blue-700 ring-1 ring-slate-200">
                              Step {item.step}
                            </span>
                          </div>

                          <p className="mt-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                            {item.tag}
                          </p>
                          <h3 className="mt-1 text-sm font-bold text-slate-900 sm:text-base">
                            {item.title}
                          </h3>
                          <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                            {item.description}
                          </p>
                        </div>

                        {index < WORKFLOW_STEPS.length - 1 && (
                          <div className="mt-3 hidden items-center justify-end text-slate-400 md:flex">
                            <ArrowRight className="h-4 w-4" aria-hidden="true" />
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ol>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Legal Notice Strip */}
      <section
        aria-label="Legal Disclaimer Notice"
        className="flex flex-col items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm md:flex-row md:items-center"
      >
        <div className="flex items-start gap-3">
          <ShieldAlert
            className="mt-0.5 h-5 w-5 shrink-0 text-blue-700"
            aria-hidden="true"
          />
          <p className="text-xs leading-relaxed text-slate-600 sm:text-sm">
            Arzi-Bol is an AI-assisted drafting tool, not a substitute for a
            human advocate. Verify all facts, dates, and legal sections before
            official use.
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenTerms}
          className="shrink-0 rounded-xl border border-slate-300 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
        >
          Read Legal &amp; Terms
        </button>
      </section>
    </div>
  );
}

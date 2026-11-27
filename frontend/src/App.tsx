import { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Radio,
  Scale,
  Sparkles,
  WifiOff,
} from 'lucide-react';
import { VoiceRecorderButton } from './components/VoiceRecorderButton';
import { LegalPetitionView } from './components/LegalPetitionView';
import type {
  AppStatus,
  BackendMode,
  ExamplePrompt,
  LegalPetitionResult,
} from './types';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const EXAMPLE_PROMPTS: ExamplePrompt[] = [
  {
    id: 'unpaid-wages',
    label: 'Example: Unpaid Wages',
    language: 'English',
    text: "The contractor didn't pay my wages for 10 days and slapped me when I asked for my money.",
  },
  {
    id: 'land-dispute',
    label: 'Example: Land Dispute (Punjabi)',
    language: 'Punjabi',
    text: 'ਮੇਰੇ ਗੁਆਂਢੀ ਨੇ ਮੇਰੇ ਖੇਤ ਦੀ ਵੱਟ ਤੋੜ ਕੇ ਜ਼ਮੀਨ ਤੇ ਕਬਜ਼ਾ ਕਰ ਲਿਆ ਹੈ ਅਤੇ ਧਮਕੀਆਂ ਦੇ ਰਿਹਾ ਹੈ।',
  },
  {
    id: 'ration-denial',
    label: 'Example: Ration Card Denial (Hindi)',
    language: 'Hindi',
    text: 'राशन डीलर पिछले तीन महीने से मेरा राशन नहीं दे रहा है और अंगूठा लगवाकर वापस भेज देता है।',
  },
];

export function App() {
  const [status, setStatus] = useState<AppStatus>('idle');
  const [backendMode, setBackendMode] = useState<BackendMode>('checking');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<LegalPetitionResult | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    let active = true;
    fetch(`${API_BASE}/health`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        if (!active) return;
        setBackendMode(data.mode === 'live' ? 'live' : 'local-demo');
      })
      .catch(() => {
        if (!active) return;
        setBackendMode('offline');
      });

    return () => {
      active = false;
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
      }
    };
  }, []);

  const stopTimer = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const uploadAudioBlob = async (blob: Blob) => {
    setStatus('processing');
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append('audio', blob, 'complaint.webm');

      const response = await fetch(`${API_BASE}/process-audio`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to process audio.');
      }

      setResult(data as LegalPetitionResult);
      setStatus('idle');
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Unable to reach the server. Please try again.'
      );
      setStatus('error');
    }
  };

  const handleStartRecording = async () => {
    setErrorMessage(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setErrorMessage(
        'Microphone recording is not supported in this browser. Try one of the example chips below.'
      );
      setStatus('error');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        stopTimer();
        stream.getTracks().forEach((track) => track.stop());
        const audioBlob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        });
        void uploadAudioBlob(audioBlob);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setElapsedSeconds(0);
      setStatus('listening');

      timerRef.current = window.setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } catch {
      setErrorMessage(
        'Microphone access was denied or unavailable. Allow mic permissions or use an example chip below.'
      );
      setStatus('error');
    }
  };

  const handleStopRecording = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== 'inactive'
    ) {
      mediaRecorderRef.current.stop();
    }
  };

  const handleExampleClick = async (example: ExamplePrompt) => {
    if (status === 'listening' || status === 'processing') return;
    setStatus('processing');
    setErrorMessage(null);

    try {
      const response = await fetch(`${API_BASE}/process-text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: example.text,
          language: example.language,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to process example.');
      }

      setResult(data as LegalPetitionResult);
      setStatus('idle');
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Unable to reach the server. Please try again.'
      );
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-600 text-white shadow-sm">
              <Scale className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-slate-900">
                Arzi-Bol
              </h1>
              <p className="text-xs text-slate-500">
                Voice-to-Legal Engine for Civic Services
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {backendMode === 'live' && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
                <Radio className="h-3.5 w-3.5" aria-hidden="true" />
                Sarvam AI Live
              </span>
            )}
            {backendMode === 'local-demo' && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800 ring-1 ring-inset ring-amber-200">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                Local Demo Mode
              </span>
            )}
            {backendMode === 'offline' && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1 text-xs font-medium text-rose-700 ring-1 ring-inset ring-rose-200">
                <WifiOff className="h-3.5 w-3.5" aria-hidden="true" />
                Backend Offline
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left Panel: Voice Input & Example Chips */}
          <section
            aria-label="Voice Complaint Input"
            className="lg:col-span-5 flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <div>
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                  1. Speak Your Grievance
                </h2>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                    status === 'listening'
                      ? 'bg-rose-100 text-rose-700'
                      : status === 'processing'
                        ? 'bg-sky-100 text-sky-700'
                        : status === 'error'
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {status}
                </span>
              </div>

              <VoiceRecorderButton
                status={status}
                elapsedSeconds={elapsedSeconds}
                onStartRecording={handleStartRecording}
                onStopRecording={handleStopRecording}
              />

              {errorMessage && (
                <div
                  role="alert"
                  className="mt-2 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-sm text-rose-800"
                >
                  <AlertCircle
                    className="mt-0.5 h-4 w-4 shrink-0 text-rose-600"
                    aria-hidden="true"
                  />
                  <span>{errorMessage}</span>
                </div>
              )}
            </div>

            <div className="mt-6 border-t border-slate-100 pt-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                No microphone? Try an example
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {EXAMPLE_PROMPTS.map((example) => (
                  <button
                    key={example.id}
                    type="button"
                    disabled={status === 'listening' || status === 'processing'}
                    onClick={() => void handleExampleClick(example)}
                    className="rounded-full border border-slate-200 bg-slate-50 px-3.5 py-1.5 text-xs font-medium text-slate-700 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-800 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                  >
                    {example.label}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Right Panel: Generated Legal Document */}
          <section
            aria-label="Generated Legal Petition"
            className="lg:col-span-7"
          >
            <LegalPetitionView
              result={result}
              isProcessing={status === 'processing'}
              backendMode={backendMode}
            />
          </section>
        </div>
      </main>
    </div>
  );
}

export default App;

import { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import {
  AlertTriangle,
  Loader2,
  Mic,
  MicOff,
  RefreshCw,
  Sparkles,
  Square,
} from 'lucide-react';
import { useGlobalError } from './components/GlobalErrorState';
import type { ExamplePrompt, LegalPetitionResult } from './types';
import { maskErrorMessage } from './utils/errorMasking';

export type RecorderState =
  | 'idle'
  | 'requesting'
  | 'recording'
  | 'processing'
  | 'error'
  | 'denied'
  | 'unsupported';

export interface VoiceRecorderProps {
  onRecordingComplete: (audioBlob: Blob, result?: LegalPetitionResult) => void;
  onExampleSelect?: (example: ExamplePrompt) => void;
  disabled?: boolean;
}

const MAX_RECORDING_SECONDS = 60;
const DEFAULT_GEMINI_MODEL = 'gemini-3.8-flash';
const API_PROCESS_AUDIO_PATH = '/api/process-audio';

const STORAGE_KEYS = {
  sarvam: 'arzi_bol_sarvam_api_key',
  gemini: 'arzi_bol_gemini_api_key',
  geminiModel: 'arzi_bol_gemini_model',
} as const;

const DENIED_ERROR_MESSAGE =
  'Microphone access blocked. Click the lock icon (🔒) in your URL bar to allow access, then click Retry.';

const INSECURE_CONTEXT_MESSAGE = 'Microphone requires HTTPS or localhost.';

const PREFERRED_MIME_TYPES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4;codecs=mp4a.40.2',
  'audio/mp4',
  'audio/ogg;codecs=opus',
  'audio/ogg',
  'audio/wav',
] as const;

export const FALLBACK_EXAMPLES: readonly ExamplePrompt[] = [
  {
    id: 'landlord-deposit',
    label: 'Unpaid Security Deposit',
    language: 'English',
    text: 'My landlord is refusing to return my ₹45,000 security deposit two months after I vacated the flat and handed over the keys.',
  },
  {
    id: 'wage-theft',
    label: 'बकाया वेतन शिकायत (Hindi)',
    language: 'Hindi',
    text: 'मेरे नियोक्ता ने पिछले तीन महीनों का वेतन नहीं दिया है और बार-बार मांगने पर भी टालमटोल कर रहे हैं।',
  },
  {
    id: 'cyber-fraud',
    label: 'UPI ਧੋਖਾਧੜੀ (Punjabi)',
    language: 'Punjabi',
    text: 'ਮੇਰੇ ਬੈਂਕ ਖਾਤੇ ਵਿੱਚੋਂ ਧੋਖੇ ਨਾਲ UPI ਰਾਹੀਂ 18,000 ਰੁਪਏ ਕਢਵਾ ਲਏ ਗਏ ਹਨ, ਤੁਰੰਤ ਸ਼ਿਕਾਇਤ ਦਰਜ ਕਰਨੀ ਹੈ।',
  },
] as const;

function formatCountdown(seconds: number): string {
  const clamped = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(clamped / 60);
  const secs = clamped % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function resolveSupportedMimeType(): string | undefined {
  if (
    typeof MediaRecorder === 'undefined' ||
    typeof MediaRecorder.isTypeSupported !== 'function'
  ) {
    return undefined;
  }

  for (const mimeType of PREFERRED_MIME_TYPES) {
    try {
      if (MediaRecorder.isTypeSupported(mimeType)) {
        return mimeType;
      }
    } catch {
      // Ignore browser-specific errors from isTypeSupported
    }
  }

  return undefined;
}

function resolveAudioExtension(mimeType: string): string {
  const lower = mimeType.toLowerCase();
  if (lower.includes('mp4')) return 'mp4';
  if (lower.includes('ogg')) return 'ogg';
  if (lower.includes('wav')) return 'wav';
  return 'webm';
}

function loadStoredSettings(): {
  sarvamKey: string;
  geminiKey: string;
  geminiModel: string;
} {
  try {
    const sarvamKey =
      window.localStorage.getItem(STORAGE_KEYS.sarvam)?.trim() ?? '';
    const geminiKey =
      window.localStorage.getItem(STORAGE_KEYS.gemini)?.trim() ?? '';
    const geminiModel =
      window.localStorage.getItem(STORAGE_KEYS.geminiModel)?.trim() ||
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

function getInitialSupportError(): {
  state: RecorderState;
  message: string | null;
} {
  if (typeof window === 'undefined') {
    return { state: 'unsupported', message: INSECURE_CONTEXT_MESSAGE };
  }

  if (!window.isSecureContext) {
    return { state: 'unsupported', message: INSECURE_CONTEXT_MESSAGE };
  }

  if (
    typeof navigator === 'undefined' ||
    !navigator.mediaDevices ||
    typeof navigator.mediaDevices.getUserMedia !== 'function' ||
    typeof MediaRecorder === 'undefined'
  ) {
    return {
      state: 'unsupported',
      message:
        'Your browser does not support audio recording. Please use a modern version of Chrome, Safari, Firefox, or Brave, or choose an example below.',
    };
  }

  return { state: 'idle', message: null };
}

export function VoiceRecorder({
  onRecordingComplete,
  onExampleSelect,
  disabled = false,
}: VoiceRecorderProps) {
  const { showError, clearError } = useGlobalError();
  const initialSupport = getInitialSupportError();

  const [recorderState, setRecorderState] = useState<RecorderState>(
    initialSupport.state
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(
    initialSupport.message
  );
  const [secondsRemaining, setSecondsRemaining] = useState<number>(
    MAX_RECORDING_SECONDS
  );
  const [activeExampleId, setActiveExampleId] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<number | null>(null);
  const recordingStartedAtRef = useRef<number | null>(null);
  const selectedMimeTypeRef = useRef<string | undefined>(undefined);
  const isMountedRef = useRef<boolean>(true);
  const onRecordingCompleteRef = useRef(onRecordingComplete);

  useEffect(() => {
    onRecordingCompleteRef.current = onRecordingComplete;
  }, [onRecordingComplete]);

  const clearTimer = useCallback(() => {
    if (timerIntervalRef.current !== null) {
      window.clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    recordingStartedAtRef.current = null;
  }, []);

  const stopStreamTracks = useCallback(() => {
    const stream = mediaStreamRef.current;
    if (stream) {
      stream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // Ignore track cleanup errors
        }
      });
      mediaStreamRef.current = null;
    }
  }, []);

  const submitRecording = useCallback(
    async (audioBlob: Blob) => {
      setRecorderState('processing');
      setErrorMessage(null);
      clearError();

      const formData = new FormData();
      const extension = resolveAudioExtension(audioBlob.type || 'audio/webm');
      formData.append('audio', audioBlob, `recording.${extension}`);

      const { sarvamKey, geminiKey, geminiModel } = loadStoredSettings();
      formData.append('geminiModel', geminiModel);
      if (sarvamKey) {
        formData.append('sarvamKey', sarvamKey);
      }
      if (geminiKey) {
        formData.append('geminiKey', geminiKey);
      }

      try {
        const response = await axios.post<LegalPetitionResult>(
          API_PROCESS_AUDIO_PATH,
          formData,
          { timeout: 60000 }
        );

        if (!isMountedRef.current) return;

        setRecorderState('idle');
        onRecordingCompleteRef.current(audioBlob, response.data);
      } catch (err: unknown) {
        if (!isMountedRef.current) return;

        let rawError: unknown = err;
        if (axios.isAxiosError(err)) {
          const serverError = (err.response?.data as { error?: unknown } | undefined)
            ?.error;
          if (typeof serverError === 'string' && serverError.trim()) {
            rawError = serverError.trim();
          }
        }

        const cleanMessage = maskErrorMessage(
          rawError,
          'Failed to process your recording. Please try again.'
        );
        showError(cleanMessage);
        setRecorderState('error');
        setErrorMessage(cleanMessage);
      }
    },
    [clearError, showError]
  );

  const stopRecording = useCallback(() => {
    clearTimer();
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      try {
        recorder.stop();
      } catch {
        stopStreamTracks();
        if (isMountedRef.current) {
          setRecorderState('idle');
          setSecondsRemaining(MAX_RECORDING_SECONDS);
        }
      }
    } else {
      stopStreamTracks();
    }
  }, [clearTimer, stopStreamTracks]);

  // Monitor browser permission state when supported (defensive for Safari/Firefox)
  useEffect(() => {
    isMountedRef.current = true;

    if (
      initialSupport.state === 'unsupported' ||
      typeof navigator === 'undefined' ||
      !navigator.permissions ||
      typeof navigator.permissions.query !== 'function'
    ) {
      return () => {
        isMountedRef.current = false;
      };
    }

    let permissionStatus: PermissionStatus | null = null;
    let cancelled = false;

    const handlePermissionChange = () => {
      if (!permissionStatus || !isMountedRef.current) return;
      if (permissionStatus.state === 'denied') {
        setRecorderState('denied');
        setErrorMessage(DENIED_ERROR_MESSAGE);
      } else if (permissionStatus.state === 'granted') {
        setRecorderState((prev) => (prev === 'denied' ? 'idle' : prev));
        setErrorMessage((prev) =>
          prev === DENIED_ERROR_MESSAGE ? null : prev
        );
      }
    };

    navigator.permissions
      .query({ name: 'microphone' as PermissionName })
      .then((status) => {
        if (cancelled || !isMountedRef.current) return;
        permissionStatus = status;
        if (status.state === 'denied') {
          setRecorderState('denied');
          setErrorMessage(DENIED_ERROR_MESSAGE);
        }
        status.addEventListener?.('change', handlePermissionChange);
      })
      .catch(() => {
        // Safari and some browsers reject 'microphone' in permissions.query
      });

    return () => {
      cancelled = true;
      isMountedRef.current = false;
      permissionStatus?.removeEventListener?.('change', handlePermissionChange);
      clearTimer();
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== 'inactive') {
        try {
          recorder.stop();
        } catch {
          // Ignore unmount stop errors
        }
      }
      stopStreamTracks();
    };
  }, [clearTimer, initialSupport.state, stopStreamTracks]);

  const startRecording = useCallback(async () => {
    if (
      disabled ||
      recorderState === 'requesting' ||
      recorderState === 'recording' ||
      recorderState === 'processing'
    ) {
      return;
    }

    // Strict Secure Context check before touching navigator.mediaDevices
    if (typeof window === 'undefined' || !window.isSecureContext) {
      setRecorderState('unsupported');
      setErrorMessage(INSECURE_CONTEXT_MESSAGE);
      return;
    }

    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices ||
      typeof navigator.mediaDevices.getUserMedia !== 'function' ||
      typeof MediaRecorder === 'undefined'
    ) {
      setRecorderState('unsupported');
      setErrorMessage(
        'Audio recording is not supported in this browser. Try Chrome, Safari, Firefox, or Brave.'
      );
      return;
    }

    setRecorderState('requesting');
    setErrorMessage(null);
    clearError();
    setSecondsRemaining(MAX_RECORDING_SECONDS);
    audioChunksRef.current = [];

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err: unknown) {
      if (!isMountedRef.current) return;

      const errorName = err instanceof DOMException ? err.name : '';

      if (
        errorName === 'NotAllowedError' ||
        errorName === 'PermissionDeniedError'
      ) {
        setRecorderState('denied');
        setErrorMessage(DENIED_ERROR_MESSAGE);
        return;
      }

      if (
        errorName === 'NotFoundError' ||
        errorName === 'DevicesNotFoundError'
      ) {
        setRecorderState('error');
        setErrorMessage(
          'No microphone detected. Please connect a microphone and try again.'
        );
        return;
      }

      if (
        errorName === 'NotReadableError' ||
        errorName === 'TrackStartError'
      ) {
        setRecorderState('error');
        setErrorMessage(
          'Microphone is busy or unavailable. Close other apps using the mic and try again.'
        );
        return;
      }

      if (errorName === 'SecurityError') {
        setRecorderState('unsupported');
        setErrorMessage(INSECURE_CONTEXT_MESSAGE);
        return;
      }

      setRecorderState('error');
      setErrorMessage(
        'Unable to access microphone. Please check your device settings or try an example below.'
      );
      return;
    }

    if (!isMountedRef.current) {
      stream.getTracks().forEach((track) => track.stop());
      return;
    }

    mediaStreamRef.current = stream;

    const preferredMimeType = resolveSupportedMimeType();
    selectedMimeTypeRef.current = preferredMimeType;

    let recorder: MediaRecorder;
    try {
      recorder = preferredMimeType
        ? new MediaRecorder(stream, { mimeType: preferredMimeType })
        : new MediaRecorder(stream);
    } catch {
      try {
        recorder = new MediaRecorder(stream);
        selectedMimeTypeRef.current = recorder.mimeType || undefined;
      } catch {
        stopStreamTracks();
        setRecorderState('unsupported');
        setErrorMessage(
          'Could not initialize audio recorder on this browser. Please try an example below.'
        );
        return;
      }
    }

    mediaRecorderRef.current = recorder;

    // Handle external hardware disconnect or OS audio interruption (e.g., iOS call)
    stream.getAudioTracks().forEach((track) => {
      track.onended = () => {
        if (mediaRecorderRef.current?.state === 'recording') {
          stopRecording();
        }
      };
    });

    recorder.ondataavailable = (event: BlobEvent) => {
      if (event.data && event.data.size > 0) {
        audioChunksRef.current.push(event.data);
      }
    };

    recorder.onerror = () => {
      clearTimer();
      stopStreamTracks();
      if (!isMountedRef.current) return;
      const msg = 'An unexpected recording error occurred. Please try again.';
      setRecorderState('error');
      setSecondsRemaining(MAX_RECORDING_SECONDS);
      setErrorMessage(msg);
      showError(msg);
    };

    recorder.onstop = () => {
      clearTimer();
      stopStreamTracks();
      mediaRecorderRef.current = null;

      if (!isMountedRef.current) return;

      const chunks = audioChunksRef.current;
      audioChunksRef.current = [];

      const resolvedType =
        recorder.mimeType ||
        selectedMimeTypeRef.current ||
        chunks[0]?.type ||
        'audio/webm';

      const audioBlob = new Blob(chunks, { type: resolvedType });
      setSecondsRemaining(MAX_RECORDING_SECONDS);

      if (audioBlob.size === 0) {
        const msg =
          'No audio was captured. Please speak into your microphone and try again.';
        setRecorderState('error');
        setErrorMessage(msg);
        return;
      }

      void submitRecording(audioBlob);
    };

    try {
      // 1000ms timeslice for steady chunking across Chrome/Firefox/modern Safari;
      // fallback to no-arg start() if a WebKit build rejects timeslice.
      try {
        recorder.start(1000);
      } catch {
        recorder.start();
      }
    } catch {
      stopStreamTracks();
      mediaRecorderRef.current = null;
      setRecorderState('error');
      setErrorMessage('Failed to start audio recording. Please try again.');
      return;
    }

    recordingStartedAtRef.current = Date.now();
    setRecorderState('recording');
    setSecondsRemaining(MAX_RECORDING_SECONDS);

    timerIntervalRef.current = window.setInterval(() => {
      const startedAt = recordingStartedAtRef.current;
      if (startedAt === null) return;

      const elapsedSeconds = Math.floor((Date.now() - startedAt) / 1000);
      const remaining = Math.max(0, MAX_RECORDING_SECONDS - elapsedSeconds);
      setSecondsRemaining(remaining);

      if (remaining <= 0) {
        stopRecording();
      }
    }, 250);
  }, [
    clearError,
    clearTimer,
    disabled,
    recorderState,
    showError,
    stopRecording,
    stopStreamTracks,
    submitRecording,
  ]);

  const handleMainButtonClick = () => {
    if (disabled) return;
    if (recorderState === 'recording') {
      stopRecording();
    } else if (
      recorderState === 'idle' ||
      recorderState === 'error' ||
      recorderState === 'denied'
    ) {
      void startRecording();
    }
  };

  const handleExampleClick = (example: ExamplePrompt) => {
    setActiveExampleId(example.id);
    onExampleSelect?.(example);
  };

  const isRequesting = recorderState === 'requesting';
  const isRecording = recorderState === 'recording';
  const isProcessing = recorderState === 'processing';
  const isError = recorderState === 'error';
  const isDenied = recorderState === 'denied';
  const isUnsupported = recorderState === 'unsupported';
  const isButtonDisabled =
    disabled || isRequesting || isProcessing || isUnsupported;

  return (
    <div className="flex w-full flex-col items-center justify-center">
      {/* Massive, visually striking Microphone button */}
      <div className="relative flex items-center justify-center py-2">
        {isRecording && (
          <>
            <span
              aria-hidden="true"
              className="absolute h-48 w-48 rounded-full bg-rose-500/25 animate-ping sm:h-52 sm:w-52"
            />
            <span
              aria-hidden="true"
              className="absolute h-44 w-44 rounded-full border-2 border-rose-400/60 animate-pulse sm:h-48 sm:w-48"
            />
          </>
        )}

        {!isRecording && !isDenied && !isUnsupported && !isError && (
          <span
            aria-hidden="true"
            className="absolute h-44 w-44 rounded-full bg-blue-500/10 sm:h-48 sm:w-48"
          />
        )}

        <button
          type="button"
          onClick={handleMainButtonClick}
          disabled={isButtonDisabled}
          aria-live="polite"
          aria-label={
            isRecording
              ? `Stop recording (${formatCountdown(secondsRemaining)} remaining)`
              : isProcessing
                ? 'Processing your recording'
                : isRequesting
                  ? 'Requesting microphone permission'
                  : isDenied
                    ? 'Microphone access blocked. Click to retry'
                    : isError
                      ? 'Recording error. Click to try again'
                      : isUnsupported
                        ? 'Microphone unavailable'
                        : 'Start voice recording'
          }
          className={`relative z-10 flex h-36 w-36 flex-col items-center justify-center rounded-full border-4 shadow-xl transition-all duration-200 focus:outline-none focus-visible:ring-4 focus-visible:ring-offset-2 sm:h-40 sm:w-40 ${
            isRecording
              ? 'scale-105 border-rose-300 bg-rose-600 text-white shadow-rose-500/30 hover:bg-rose-700 focus-visible:ring-rose-500'
              : isRequesting || isProcessing
                ? 'cursor-wait border-blue-200 bg-blue-700 text-white focus-visible:ring-blue-500'
                : isDenied || isError
                  ? 'border-red-300 bg-gradient-to-b from-slate-200 to-red-100 text-red-700 shadow-red-200/50 hover:from-slate-300 hover:to-red-200 focus-visible:ring-red-500'
                  : isUnsupported || disabled
                    ? 'cursor-not-allowed border-slate-300 bg-slate-200 text-slate-500 shadow-none'
                    : 'border-blue-300 bg-gradient-to-b from-blue-600 to-blue-800 text-white shadow-blue-600/30 hover:scale-105 hover:from-blue-700 hover:to-blue-900 active:scale-95 focus-visible:ring-blue-600'
          }`}
        >
          {isRequesting || isProcessing ? (
            <Loader2 className="h-12 w-12 animate-spin" aria-hidden="true" />
          ) : isRecording ? (
            <Square className="h-10 w-10 fill-current" aria-hidden="true" />
          ) : isDenied || isUnsupported ? (
            <MicOff className="h-12 w-12" aria-hidden="true" />
          ) : (
            <Mic className="h-12 w-12" aria-hidden="true" />
          )}

          <span className="mt-2.5 font-mono text-xs font-bold uppercase tracking-wider">
            {isRecording
              ? formatCountdown(secondsRemaining)
              : isProcessing
                ? 'Processing'
                : isRequesting
                  ? 'Requesting'
                  : isDenied
                    ? 'Blocked'
                    : isError
                      ? 'Retry'
                      : isUnsupported
                        ? 'Unavailable'
                        : 'Tap to Speak'}
          </span>
        </button>
      </div>

      {/* Status caption */}
      <div className="mt-4 text-center">
        <p className="text-base font-bold tracking-tight text-slate-900 sm:text-lg">
          {isRecording && 'Recording in progress... Tap to stop'}
          {isProcessing && 'Transcribing & drafting legal petition...'}
          {isRequesting && 'Waiting for microphone permission...'}
          {isDenied && 'Microphone Access Denied'}
          {isError && 'Could Not Process Recording'}
          {isUnsupported && 'Microphone Unavailable'}
          {recorderState === 'idle' &&
            'Tap the microphone to record your grievance'}
        </p>
        <p className="mt-1 text-xs text-slate-600 sm:text-sm">
          {isRecording
            ? `Auto-stops in ${formatCountdown(secondsRemaining)} (60s max)`
            : isProcessing
              ? 'Connecting to speech-to-text and BNS legal drafting engine'
              : 'Supports Hindi, Punjabi, English & regional languages (60s max)'}
        </p>
      </div>

      {/* Persistent error banner (Denied / Insecure Context / Processing Errors) */}
      {errorMessage && (
        <div
          role="alert"
          aria-live="assertive"
          className="mt-4 w-full max-w-md rounded-2xl border border-red-300 bg-red-50 p-4 text-left text-xs text-red-900 shadow-sm sm:text-sm"
        >
          <div className="flex items-start gap-2.5">
            <AlertTriangle
              className="mt-0.5 h-4 w-4 shrink-0 text-red-600"
              aria-hidden="true"
            />
            <div className="flex-1">
              <p className="font-semibold leading-relaxed">{errorMessage}</p>
              {(isDenied || isError) && (
                <button
                  type="button"
                  onClick={() => void startRecording()}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-1"
                >
                  <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{isDenied ? 'Retry / Check Again' : 'Try Again'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3 Hardcoded "Try an example" fallback chips — always clickable */}
      <div className="mt-6 w-full border-t border-slate-200/80 pt-5">
        <div className="mb-2.5 flex items-center justify-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          <Sparkles className="h-3.5 w-3.5 text-blue-600" aria-hidden="true" />
          <span>Try an example</span>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2">
          {FALLBACK_EXAMPLES.map((example) => {
            const isSelected = activeExampleId === example.id;
            return (
              <button
                key={example.id}
                type="button"
                onClick={() => handleExampleClick(example)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50 text-blue-800 shadow-xs'
                    : 'border-slate-300 bg-white text-slate-700 hover:border-blue-400 hover:bg-blue-50/60 hover:text-blue-800'
                }`}
              >
                <span>{example.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default VoiceRecorder;

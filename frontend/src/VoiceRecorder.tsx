import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  FileText,
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
import { loadStoredApiSettings } from './utils/storage';

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
  onDiscard?: () => void;
  disabled?: boolean;
  isProcessingExternal?: boolean;
}

const MAX_RECORDING_SECONDS = 60;
const API_PROCESS_AUDIO_PATH = '/api/process-audio';
const WAV_PROCESSOR_BUFFER_SIZE = 4096;

const DENIED_ERROR_MESSAGE =
  'Microphone access blocked. Click the lock icon (🔒) in your URL bar to allow access, then click Retry.';

const INSECURE_CONTEXT_MESSAGE = 'Microphone requires HTTPS or localhost.';

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

function getAudioContextConstructor(): typeof AudioContext | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }
  return (
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext
  );
}

function writeAsciiString(view: DataView, offset: number, value: string): void {
  for (let i = 0; i < value.length; i += 1) {
    view.setUint8(offset + i, value.charCodeAt(i));
  }
}

function interleaveChannels(channels: readonly Float32Array[]): Float32Array {
  if (channels.length === 1) {
    return channels[0];
  }

  const numChannels = channels.length;
  const frameCount = channels[0]?.length ?? 0;
  const interleaved = new Float32Array(frameCount * numChannels);

  let writeIndex = 0;
  for (let frame = 0; frame < frameCount; frame += 1) {
    for (let ch = 0; ch < numChannels; ch += 1) {
      interleaved[writeIndex] = channels[ch][frame] ?? 0;
      writeIndex += 1;
    }
  }

  return interleaved;
}

function encodeWav(
  channelChunks: readonly Float32Array[][],
  sampleRate: number
): ArrayBuffer {
  const numChannels = channelChunks.length || 1;
  const mergedChannels = Array.from({ length: numChannels }, (_, chIndex) => {
    const chunks = channelChunks[chIndex] ?? [];
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const merged = new Float32Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      merged.set(chunk, offset);
      offset += chunk.length;
    }
    return merged;
  });

  const interleaved = interleaveChannels(mergedChannels);
  const bytesPerSample = 2; // 16-bit PCM
  const dataByteLength = interleaved.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataByteLength);
  const view = new DataView(buffer);

  // RIFF chunk descriptor
  writeAsciiString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataByteLength, true);
  writeAsciiString(view, 8, 'WAVE');

  // fmt sub-chunk
  writeAsciiString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 = PCM)
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * bytesPerSample, true); // ByteRate
  view.setUint16(32, numChannels * bytesPerSample, true); // BlockAlign
  view.setUint16(34, 16, true); // BitsPerSample

  // data sub-chunk
  writeAsciiString(view, 36, 'data');
  view.setUint32(40, dataByteLength, true);

  let byteOffset = 44;
  for (let i = 0; i < interleaved.length; i += 1) {
    const clamped = Math.max(-1, Math.min(1, interleaved[i]));
    const int16Sample =
      clamped < 0 ? Math.round(clamped * 0x8000) : Math.round(clamped * 0x7fff);
    view.setInt16(byteOffset, int16Sample, true);
    byteOffset += bytesPerSample;
  }

  return buffer;
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
    !getAudioContextConstructor()
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
  onDiscard,
  disabled = false,
  isProcessingExternal = false,
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
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [activeExampleId, setActiveExampleId] = useState<string | null>(null);

  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorNodeRef = useRef<ScriptProcessorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const pcmChannelChunksRef = useRef<Float32Array[][]>([[]]);
  const sampleRateRef = useRef<number>(44100);
  const isRecordingRef = useRef<boolean>(false);
  const timerIntervalRef = useRef<number | null>(null);
  const recordingStartedAtRef = useRef<number | null>(null);
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

  const teardownAudioGraph = useCallback(() => {
    isRecordingRef.current = false;

    const processor = processorNodeRef.current;
    if (processor) {
      processor.onaudioprocess = null;
      try {
        processor.disconnect();
      } catch {
        // Ignore disconnect errors
      }
      processorNodeRef.current = null;
    }

    const source = sourceNodeRef.current;
    if (source) {
      try {
        source.disconnect();
      } catch {
        // Ignore disconnect errors
      }
      sourceNodeRef.current = null;
    }

    const gain = gainNodeRef.current;
    if (gain) {
      try {
        gain.disconnect();
      } catch {
        // Ignore disconnect errors
      }
      gainNodeRef.current = null;
    }

    const context = audioContextRef.current;
    if (context) {
      audioContextRef.current = null;
      if (context.state !== 'closed') {
        context.close().catch(() => {
          // Ignore AudioContext close errors
        });
      }
    }

    stopStreamTracks();
  }, [stopStreamTracks]);

  const submitRecording = useCallback(
    async (audioBlob: Blob) => {
      setRecorderState('processing');
      setErrorMessage(null);
      clearError();

      const formData = new FormData();
      const wavBlob =
        audioBlob.type === 'audio/wav'
          ? audioBlob
          : new Blob([audioBlob], { type: 'audio/wav' });
      formData.append('file', wavBlob, 'recording.wav');

      const { sarvamKey, llmProvider, llmApiKey, llmModel } =
        loadStoredApiSettings();
      formData.append('llmProvider', llmProvider);
      formData.append('llmModel', llmModel);
      if (sarvamKey) {
        formData.append('SARVAM_API_KEY', sarvamKey);
      }
      if (llmApiKey) {
        formData.append('llmApiKey', llmApiKey);
      }

      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 60000);

      try {
        const response = await fetch(API_PROCESS_AUDIO_PATH, {
          method: 'POST',
          body: formData,
          signal: controller.signal,
        });

        const payload = (await response.json().catch(() => null)) as
          | (LegalPetitionResult & { error?: unknown })
          | null;

        if (!response.ok) {
          const serverError =
            payload && typeof payload.error === 'string' && payload.error.trim()
              ? payload.error.trim()
              : `Request failed with status ${response.status}.`;
          throw new Error(serverError);
        }

        if (!payload) {
          throw new Error('Empty response received from server.');
        }

        if (!isMountedRef.current) return;

        setRecordedBlob(null);
        setRecorderState('idle');
        onRecordingCompleteRef.current(audioBlob, payload);
      } catch (err: unknown) {
        if (!isMountedRef.current) return;

        const rawError =
          err instanceof Error && err.name === 'AbortError'
            ? 'Request timed out. Please try again.'
            : err;

        const cleanMessage = maskErrorMessage(
          rawError,
          'Failed to process your recording. Please try again.'
        );
        showError(cleanMessage);
        setRecorderState('error');
        setErrorMessage(cleanMessage);
      } finally {
        window.clearTimeout(timeoutId);
      }
    },
    [clearError, showError]
  );

  const stopRecording = useCallback(() => {
    clearTimer();
    const wasRecording = isRecordingRef.current;
    teardownAudioGraph();

    if (!wasRecording || !isMountedRef.current) {
      return;
    }

    const capturedChannels = pcmChannelChunksRef.current;
    pcmChannelChunksRef.current = [[]];
    setSecondsRemaining(MAX_RECORDING_SECONDS);

    const totalSamples = capturedChannels.reduce(
      (channelSum, chunks) =>
        channelSum + chunks.reduce((sum, chunk) => sum + chunk.length, 0),
      0
    );

    if (totalSamples === 0) {
      const msg =
        'No audio was captured. Please speak into your microphone and try again.';
      setRecorderState('error');
      setErrorMessage(msg);
      return;
    }

    const wavData = encodeWav(capturedChannels, sampleRateRef.current);
    const wavBlob = new Blob([wavData], { type: 'audio/wav' });
    setRecordedBlob(wavBlob);
    setRecorderState('idle');
  }, [clearTimer, teardownAudioGraph]);

  // Monitor browser permission state when supported (defensive for Safari/Firefox)
  useEffect(() => {
    isMountedRef.current = true;

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

    if (
      initialSupport.state !== 'unsupported' &&
      typeof navigator !== 'undefined' &&
      navigator.permissions &&
      typeof navigator.permissions.query === 'function'
    ) {
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
    }

    return () => {
      cancelled = true;
      isMountedRef.current = false;
      permissionStatus?.removeEventListener?.('change', handlePermissionChange);
      clearTimer();
      teardownAudioGraph();
    };
  }, [clearTimer, initialSupport.state, teardownAudioGraph]);

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

    const AudioContextCtor = getAudioContextConstructor();
    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices ||
      typeof navigator.mediaDevices.getUserMedia !== 'function' ||
      !AudioContextCtor
    ) {
      setRecorderState('unsupported');
      setErrorMessage(
        'Audio recording is not supported in this browser. Try Chrome, Safari, Firefox, or Brave.'
      );
      return;
    }

    setRecorderState('requesting');
    setRecordedBlob(null);
    setErrorMessage(null);
    clearError();
    setSecondsRemaining(MAX_RECORDING_SECONDS);
    pcmChannelChunksRef.current = [[]];

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

    let audioContext: AudioContext;
    try {
      audioContext = new AudioContextCtor();
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
    } catch {
      teardownAudioGraph();
      setRecorderState('unsupported');
      setErrorMessage(
        'Could not initialize audio recorder on this browser. Please try an example below.'
      );
      return;
    }

    if (!isMountedRef.current) {
      audioContext.close().catch(() => {});
      stopStreamTracks();
      return;
    }

    audioContextRef.current = audioContext;
    sampleRateRef.current = audioContext.sampleRate;

    try {
      const sourceNode = audioContext.createMediaStreamSource(stream);
      const processorNode = audioContext.createScriptProcessor(
        WAV_PROCESSOR_BUFFER_SIZE,
        1,
        1
      );
      const silentGainNode = audioContext.createGain();
      silentGainNode.gain.value = 0;

      sourceNodeRef.current = sourceNode;
      processorNodeRef.current = processorNode;
      gainNodeRef.current = silentGainNode;
      pcmChannelChunksRef.current = [[]];
      isRecordingRef.current = true;

      processorNode.onaudioprocess = (event: AudioProcessingEvent) => {
        if (!isRecordingRef.current) return;
        const inputData = event.inputBuffer.getChannelData(0);
        // Copy samples out of the reusable Web Audio buffer
        pcmChannelChunksRef.current[0].push(new Float32Array(inputData));
      };

      // Handle external hardware disconnect or OS audio interruption (e.g., iOS call)
      stream.getAudioTracks().forEach((track) => {
        track.onended = () => {
          if (isRecordingRef.current) {
            stopRecording();
          }
        };
      });

      sourceNode.connect(processorNode);
      processorNode.connect(silentGainNode);
      silentGainNode.connect(audioContext.destination);
    } catch {
      teardownAudioGraph();
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
    disabled,
    recorderState,
    stopRecording,
    stopStreamTracks,
    teardownAudioGraph,
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

  const handleSubmitRecorded = () => {
    if (!recordedBlob || disabled || recorderState === 'processing') return;
    void submitRecording(recordedBlob);
  };

  const handleDiscardRecording = () => {
    if (recorderState === 'processing') return;
    setRecordedBlob(null);
    setErrorMessage(null);
    clearError();
    setRecorderState('idle');
    setSecondsRemaining(MAX_RECORDING_SECONDS);
    onDiscard?.();
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
      {recordedBlob ? (
        <div className="flex w-full max-w-md flex-col items-center justify-center gap-3 py-4">
          <button
            type="button"
            onClick={handleSubmitRecorded}
            disabled={disabled || isProcessing}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-blue-600 to-blue-800 px-6 py-4 text-base font-bold text-white shadow-lg shadow-blue-600/25 transition hover:from-blue-700 hover:to-blue-900 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-70"
          >
            {isProcessing ? (
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
            ) : (
              <FileText className="h-5 w-5" aria-hidden="true" />
            )}
            <span>
              {isProcessing
                ? 'Drafting Legal Petition...'
                : 'Draft Legal Petition'}
            </span>
          </button>

          <button
            type="button"
            onClick={handleDiscardRecording}
            disabled={isProcessing}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-xs transition hover:border-red-300 hover:bg-red-50 hover:text-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span>🗑️ Discard &amp; Re-record</span>
          </button>
        </div>
      ) : (
        /* Massive, visually striking Microphone button */
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
      )}

      {/* Status caption */}
      <div className="mt-4 text-center">
        <p className="text-base font-bold tracking-tight text-slate-900 sm:text-lg">
          {isRecording && 'Recording in progress... Tap to stop'}
          {isProcessing && 'Transcribing & drafting legal petition...'}
          {isRequesting && 'Waiting for microphone permission...'}
          {isDenied && 'Microphone Access Denied'}
          {isError && 'Could Not Process Recording'}
          {isUnsupported && 'Microphone Unavailable'}
          {!isProcessing &&
            !isError &&
            recordedBlob &&
            'Recording captured and ready'}
          {recorderState === 'idle' &&
            !recordedBlob &&
            (disabled
              ? 'Accept Terms & Conditions to unlock microphone'
              : 'Tap the microphone to record your grievance')}
        </p>
        <p className="mt-1 text-xs text-slate-600 sm:text-sm">
          {isRecording
            ? `Auto-stops in ${formatCountdown(secondsRemaining)} (60s max)`
            : isProcessing
              ? 'Connecting to speech-to-text and BNS legal drafting engine'
              : recordedBlob
                ? 'Review your choice below to draft the FIR petition or re-record'
                : disabled
                  ? 'Click "Review & Accept Terms" below or try an example chip'
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
              {(isDenied || (isError && !recordedBlob)) && (
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
                disabled={isProcessing || isProcessingExternal}
                onClick={() => handleExampleClick(example)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 disabled:cursor-wait disabled:opacity-60 ${
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

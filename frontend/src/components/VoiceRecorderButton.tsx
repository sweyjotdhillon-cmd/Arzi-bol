import { Loader2, Mic, Square } from 'lucide-react';
import type { AppStatus } from '../types';

interface VoiceRecorderButtonProps {
  status: AppStatus;
  elapsedSeconds: number;
  onStartRecording: () => void;
  onStopRecording: () => void;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function VoiceRecorderButton({
  status,
  elapsedSeconds,
  onStartRecording,
  onStopRecording,
}: VoiceRecorderButtonProps) {
  const isListening = status === 'listening';
  const isProcessing = status === 'processing';

  const handleClick = () => {
    if (isProcessing) return;
    if (isListening) {
      onStopRecording();
    } else {
      onStartRecording();
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-6">
      <div className="relative flex items-center justify-center">
        {isListening && (
          <>
            <span
              aria-hidden="true"
              className="absolute h-44 w-44 rounded-full bg-rose-500/20 animate-ping"
            />
            <span
              aria-hidden="true"
              className="absolute h-40 w-40 rounded-full border-2 border-rose-400/50 animate-pulse"
            />
          </>
        )}

        {!isListening && !isProcessing && (
          <span
            aria-hidden="true"
            className="absolute h-40 w-40 rounded-full bg-sky-500/10 transition-transform duration-300 group-hover:scale-105"
          />
        )}

        <button
          type="button"
          onClick={handleClick}
          disabled={isProcessing}
          aria-label={
            isListening
              ? 'Stop recording and draft legal petition'
              : isProcessing
                ? 'Processing your voice complaint'
                : 'Start voice recording'
          }
          className={`relative z-10 flex h-36 w-36 flex-col items-center justify-center rounded-full shadow-xl transition-all duration-200 focus:outline-none focus-visible:ring-4 focus-visible:ring-offset-2 ${
            isListening
              ? 'bg-rose-600 text-white hover:bg-rose-700 focus-visible:ring-rose-500 scale-105'
              : isProcessing
                ? 'bg-slate-800 text-slate-200 cursor-wait focus-visible:ring-slate-500'
                : 'bg-sky-600 text-white hover:bg-sky-700 hover:scale-105 active:scale-95 focus-visible:ring-sky-500'
          }`}
        >
          {isProcessing ? (
            <Loader2 className="h-12 w-12 animate-spin" aria-hidden="true" />
          ) : isListening ? (
            <Square className="h-10 w-10 fill-current" aria-hidden="true" />
          ) : (
            <Mic className="h-12 w-12" aria-hidden="true" />
          )}

          <span className="mt-2 text-xs font-semibold uppercase tracking-wider">
            {isListening
              ? formatDuration(elapsedSeconds)
              : isProcessing
                ? 'Working'
                : 'Speak'}
          </span>
        </button>
      </div>

      <div className="mt-5 text-center">
        <p className="text-base font-semibold text-slate-900">
          {isListening && 'Listening... Tap to stop & draft'}
          {isProcessing && 'Transcribing & drafting legal petition...'}
          {status === 'idle' && 'Tap the microphone to record your complaint'}
          {status === 'error' && 'Tap the microphone to try again'}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          {isListening
            ? 'Speak clearly in Hindi, Punjabi, English, or any regional language'
            : 'Supports Indian languages via Sarvam AI Speech-to-Text'}
        </p>
      </div>
    </div>
  );
}

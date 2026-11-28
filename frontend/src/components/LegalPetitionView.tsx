import { useState } from 'react';
import {
  Check,
  Copy,
  Download,
  FileText,
  Globe,
  MessageSquareQuote,
  Scale,
} from 'lucide-react';
import type { BackendMode, LegalPetitionResult } from '../types';

interface LegalPetitionViewProps {
  result: LegalPetitionResult | null;
  isProcessing: boolean;
  backendMode: BackendMode;
}

export function LegalPetitionView({
  result,
  isProcessing,
  backendMode,
}: LegalPetitionViewProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!result?.legal_petition) return;
    try {
      await navigator.clipboard.writeText(result.legal_petition);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API may be restricted in non-HTTPS contexts
    }
  };

  const handleDownloadDoc = () => {
    if (!result?.legal_petition) return;
    const blob = new Blob([result.legal_petition], {
      type: 'text/markdown;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'arzi-bol-legal-petition.md';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePrintPdf = () => {
    if (!result?.legal_petition || typeof window === 'undefined') return;
    window.print();
  };

  if (isProcessing) {
    return (
      <div className="flex h-full min-h-[420px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="h-14 w-14 rounded-full border-4 border-sky-100 border-t-sky-600 animate-spin" />
        <h2 className="mt-5 text-lg font-semibold text-slate-900">
          Extracting Legal Facts
        </h2>
        <p className="mt-2 max-w-sm text-sm text-slate-500">
          Analyzing the statement, identifying applicable civic and BNS
          provisions, and formatting your formal petition...
        </p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex h-full min-h-[420px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/70 p-8 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
          <Scale className="h-7 w-7" aria-hidden="true" />
        </div>
        <h2 className="mt-4 text-lg font-semibold text-slate-900">
          Generated Legal Document
        </h2>
        <p className="mt-2 max-w-md text-sm text-slate-500">
          Record a voice complaint or select one of the example chips on the
          left. Arzi-Bol will transcribe the statement and draft a ready-to-file
          formal petition here.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <MessageSquareQuote className="h-4 w-4 text-sky-600" aria-hidden="true" />
            <span>Citizen Statement Transcript</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-medium text-sky-700 ring-1 ring-inset ring-sky-200">
              <Globe className="h-3 w-3" aria-hidden="true" />
              {result.language}
            </span>
            {backendMode === 'local-demo' && (
              <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-inset ring-amber-200">
                Local Demo Mode
              </span>
            )}
          </div>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-slate-700 italic">
          &ldquo;{result.transcript}&rdquo;
        </p>
      </div>

      <div className="flex flex-1 flex-col rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-sky-600" aria-hidden="true" />
            <h2 className="text-base font-semibold text-slate-900">
              Drafted Legal Petition
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                  <span className="text-emerald-700">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Copy</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleDownloadDoc}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Download Doc</span>
            </button>

            <button
              type="button"
              onClick={handlePrintPdf}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
            >
              <FileText className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Save PDF</span>
            </button>
          </div>
        </div>

        <div className="flex-1 p-5">
          <pre className="whitespace-pre-wrap rounded-xl border border-slate-200 bg-amber-50/30 p-5 font-serif text-sm leading-relaxed text-slate-800">
            {result.legal_petition}
          </pre>
        </div>
      </div>
    </div>
  );
}

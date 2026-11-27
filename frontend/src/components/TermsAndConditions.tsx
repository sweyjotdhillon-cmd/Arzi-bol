import { useEffect } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  FileCheck2,
  Scale,
  ShieldAlert,
  X,
} from 'lucide-react';

export const TERMS_ACCEPTED_STORAGE_KEY = 'arzi_bol_terms_accepted_v1';

export function hasAcceptedTerms(): boolean {
  try {
    return window.localStorage.getItem(TERMS_ACCEPTED_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function saveTermsAccepted(): boolean {
  try {
    window.localStorage.setItem(TERMS_ACCEPTED_STORAGE_KEY, 'true');
    return true;
  } catch {
    return false;
  }
}

const LEGAL_CLAUSES = [
  {
    id: 'verification',
    label: 'Clause 01 · Mandatory Human Review',
    text: '1. Verification Required: Arzi-Bol is an AI-assisted drafting tool, not a substitute for a human advocate. You must thoroughly read and verify all facts, dates, and legal sections in the generated document before any official use.',
    icon: FileCheck2,
  },
  {
    id: 'liability',
    label: 'Clause 02 · Limitation of Liability',
    text: '2. No Liability: The creators and operators of Arzi-Bol bear absolutely no responsibility or liability for any unwanted outcomes, rejected petitions, legal consequences, or damages arising from the use of this tool.',
    icon: ShieldAlert,
  },
  {
    id: 'accuracy',
    label: 'Clause 03 · AI Audio & Drafting Limitations',
    text: '3. Accuracy Disclaimer: AI models can hallucinate or misinterpret spoken audio. We do not guarantee 100% accuracy of the generated legal documents.',
    icon: AlertTriangle,
  },
] as const;

interface TermsAndConditionsProps {
  hasAccepted: boolean;
  onAgree: () => void;
  onBack: () => void;
  variant?: 'page' | 'modal';
}

export function TermsAndConditions({
  hasAccepted,
  onAgree,
  onBack,
  variant = 'page',
}: TermsAndConditionsProps) {
  useEffect(() => {
    if (variant !== 'modal') return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onBack();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [variant, onBack]);

  const handleAccept = () => {
    saveTermsAccepted();
    onAgree();
  };

  const content = (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      {/* Header Bar */}
      <div className="flex flex-col items-start justify-between gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm">
            <Scale className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-amber-900">
              Legal Agreement &amp; Disclaimers
            </span>
            <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              Terms &amp; Conditions of Use
            </h1>
            <p className="mt-1 text-xs text-slate-600 sm:text-sm">
              Review and accept these mandatory terms before accessing voice
              intake for the first time.
            </p>
          </div>
        </div>

        {variant === 'modal' ? (
          <button
            type="button"
            onClick={onBack}
            aria-label="Close legal terms dialog"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center self-end rounded-xl border border-slate-200 bg-white text-slate-600 shadow-xs transition hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 sm:self-auto"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        ) : (
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 sm:text-sm"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>Back to Home</span>
          </button>
        )}
      </div>

      {/* Mandatory Notice Banner */}
      <div
        role="note"
        className="rounded-2xl border border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50/70 p-4 shadow-sm sm:p-5"
      >
        <div className="flex items-start gap-3">
          <AlertTriangle
            className="mt-0.5 h-5 w-5 shrink-0 text-amber-700"
            aria-hidden="true"
          />
          <p className="text-xs font-medium leading-relaxed text-amber-950 sm:text-sm">
            Arzi-Bol provides AI-assisted legal drafting support. Agreement to
            all three clauses below is required prior to first-time microphone
            access.
          </p>
        </div>
      </div>

      {/* Three Mandatory Verbatim Clauses */}
      <section
        aria-label="Mandatory Legal Clauses"
        className="grid grid-cols-1 gap-4 lg:grid-cols-3"
      >
        {LEGAL_CLAUSES.map((clause) => {
          const Icon = clause.icon;
          return (
            <article
              key={clause.id}
              className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
            >
              <div>
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700 ring-1 ring-blue-100">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    {clause.label}
                  </span>
                </div>
                <p className="mt-4 text-sm leading-relaxed text-slate-800">
                  {clause.text}
                </p>
              </div>
            </article>
          );
        })}
      </section>

      {/* Acceptance Footer */}
      <div className="flex flex-col items-stretch justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:p-6">
        <div className="flex items-start gap-3">
          <CheckCircle2
            className={`mt-0.5 h-5 w-5 shrink-0 ${
              hasAccepted ? 'text-emerald-600' : 'text-slate-400'
            }`}
            aria-hidden="true"
          />
          <div>
            <p className="text-sm font-semibold text-slate-900">
              {hasAccepted
                ? 'Terms Accepted for This Browser'
                : 'Consent Required Before Microphone Access'}
            </p>
            <p className="mt-0.5 text-xs text-slate-600">
              {hasAccepted
                ? 'Your acknowledgement is saved locally in this browser.'
                : 'Clicking below saves your acceptance locally so you can proceed when voice intake activates.'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleAccept}
          className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
            hasAccepted
              ? 'border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
              : 'bg-blue-700 text-white hover:bg-blue-800'
          }`}
        >
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          <span>I Understand and Agree</span>
        </button>
      </div>
    </div>
  );

  if (variant === 'modal') {
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Terms and Conditions"
        className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-xs sm:p-6"
      >
        <div className="my-auto w-full max-w-4xl rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-2xl sm:p-8">
          {content}
        </div>
      </div>
    );
  }

  return content;
}

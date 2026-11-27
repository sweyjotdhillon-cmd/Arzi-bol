import { ArrowLeft, BookOpen, FileCheck2, Lock, Scale } from 'lucide-react';

interface TermsViewProps {
  onBack: () => void;
}

const USAGE_TERMS = [
  {
    title: '1. Informational Drafting Aid Only',
    body: 'Arzi-Bol assists citizens in organizing spoken grievances into structured petition drafts. It does not establish an advocate-client relationship, nor does it constitute legal representation or statutory advice.',
    icon: Scale,
  },
  {
    title: '2. Mandatory Human Verification',
    body: 'Statutory references—including sections of the Bharatiya Nyaya Sanhita (BNS), Bharatiya Nagarik Suraksha Sanhita (BNSS), or local civic rules—must be independently verified by a licensed legal practitioner prior to filing with any police station, magistrate, or authority.',
    icon: FileCheck2,
  },
  {
    title: '3. Bring Your Own Key (BYOK) & Local Privacy',
    body: 'API credentials entered in Settings (Sarvam AI and Gemini) are stored strictly in your browser’s localStorage. You are responsible for keeping your keys secure and complying with each provider’s terms of service.',
    icon: Lock,
  },
  {
    title: '4. No Warranty & Limitation of Liability',
    body: 'Drafted outputs are provided "as is" without warranties of accuracy, completeness, or fitness for a particular legal proceeding. The creators and maintainers of Arzi-Bol assume no liability for filings made using generated text.',
    icon: BookOpen,
  },
] as const;

export function TermsView({ onBack }: TermsViewProps) {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      {/* Top Bar */}
      <div className="flex flex-col items-start justify-between gap-3 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Terms of Use &amp; Legal Disclaimer
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Please review these strict usage terms before using Arzi-Bol.
          </p>
        </div>

        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-xs transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <span>Back to Home</span>
        </button>
      </div>

      {/* Prominent Mandatory Warning */}
      <div
        role="alert"
        className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-5 shadow-sm sm:p-6"
      >
        <p className="text-sm font-semibold leading-relaxed text-amber-950 sm:text-base">
          ⚠️ WARNING: Arzi-Bol is an AI-powered drafting tool, not authorized
          legal advice. The generated documents may contain errors or
          hallucinate legal codes. Always cross-check facts and consult a human
          advocate before formal submission.
        </p>
      </div>

      {/* Structured Usage Terms */}
      <section
        aria-label="Strict Usage Terms"
        className="grid grid-cols-1 gap-4 md:grid-cols-2"
      >
        {USAGE_TERMS.map((term) => {
          const Icon = term.icon;
          return (
            <article
              key={term.title}
              className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <h2 className="text-base font-semibold text-slate-900">
                  {term.title}
                </h2>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                {term.body}
              </p>
            </article>
          );
        })}
      </section>
    </div>
  );
}

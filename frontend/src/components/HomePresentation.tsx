import {
  ArrowRight,
  CheckCircle2,
  Download,
  Lock,
  Mic,
  Scale,
  Settings,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';

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
  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      {/* Hero & Disabled Microphone Placeholder */}
      <section
        aria-label="Arzi-Bol Guided Workspace"
        className="relative overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-5 shadow-md shadow-slate-200/50 sm:p-8 lg:p-10"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-blue-50/80 blur-3xl"
        />

        <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          {/* Left: Visually Striking Disabled Microphone Placeholder */}
          <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-50 to-slate-100/80 px-6 py-8 text-center shadow-inner lg:w-5/12">
            <div className="relative flex items-center justify-center">
              <span
                aria-hidden="true"
                className="absolute h-44 w-44 rounded-full border border-dashed border-slate-300/90 bg-white/60 sm:h-48 sm:w-48"
              />
              <span
                aria-hidden="true"
                className="absolute h-38 w-38 rounded-full bg-slate-200/50 sm:h-42 sm:w-42"
              />
              <button
                type="button"
                disabled
                aria-disabled="true"
                aria-label="Microphone intake coming in Step 2"
                title="Voice recording will be activated in Step 2"
                className="relative z-10 flex h-32 w-32 cursor-not-allowed flex-col items-center justify-center rounded-full border-2 border-slate-300 bg-gradient-to-b from-slate-100 to-slate-200 text-slate-500 shadow-md sm:h-36 sm:w-36"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/80 shadow-xs">
                  <Mic className="h-6 w-6 text-slate-500" aria-hidden="true" />
                </div>
                <span className="mt-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                  Step 2 Preview
                </span>
              </button>
            </div>

            <div className="mt-6 inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600 shadow-xs">
              <Lock className="h-3 w-3 text-slate-500" aria-hidden="true" />
              <span>Microphone Locked · Activates in Step 2</span>
            </div>

            <h1 className="mt-4 text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
              Voice Intake Standby
            </h1>
            <p className="mt-1.5 max-w-xs text-xs leading-relaxed text-slate-600 sm:text-sm">
              {hasAcceptedTerms
                ? 'Legal terms accepted. Configure your API keys in Settings so you are ready when voice capture activates.'
                : 'Accept the Legal Terms before your first microphone session and configure your API keys in Settings.'}
            </p>

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

          {/* Right: 3-Step Visual Presentation */}
          <div className="flex flex-1 flex-col justify-between">
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

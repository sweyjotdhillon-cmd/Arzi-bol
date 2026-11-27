import { Download, Mic, Scale, Settings, ShieldAlert, Sparkles } from 'lucide-react';

interface HomeViewProps {
  hasConfiguredKeys: boolean;
  onOpenSettings: () => void;
  onOpenTerms: () => void;
}

const GUIDE_STEPS = [
  {
    step: 'Step 1',
    title: 'Speak your grievance.',
    description:
      'Record your complaint naturally in Hindi, Punjabi, English, or any supported regional language.',
    icon: Mic,
  },
  {
    step: 'Step 2',
    title: 'AI maps facts to the Bharatiya Nyaya Sanhita (BNS).',
    description:
      'Key facts, dates, and civic or BNS legal provisions are structured into a clear legal summary.',
    icon: Scale,
  },
  {
    step: 'Step 3',
    title: 'Download a formal petition.',
    description:
      'Review the drafted petition with an advocate and download a ready-to-print copy.',
    icon: Download,
  },
] as const;

export function HomeView({
  hasConfiguredKeys,
  onOpenSettings,
  onOpenTerms,
}: HomeViewProps) {
  return (
    <div className="flex flex-col gap-6">
      {/* Hero / Main Workspace: Stacked on mobile (flex-col), side-by-side on desktop (md:flex-row) */}
      <section
        aria-label="Arzi-Bol Guided Workspace"
        className="flex flex-col gap-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between md:p-8"
      >
        {/* Left: Massive Disabled Microphone Placeholder */}
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-slate-50/80 px-6 py-8 text-center md:w-5/12">
          <div className="relative flex items-center justify-center">
            <span
              aria-hidden="true"
              className="absolute h-44 w-44 rounded-full border border-slate-200 bg-slate-100/80 sm:h-48 sm:w-48"
            />
            <button
              type="button"
              disabled
              aria-disabled="true"
              aria-label="Microphone recording coming in Step 2"
              title="Voice recording will be enabled in Step 2"
              className="relative z-10 flex h-36 w-36 cursor-not-allowed flex-col items-center justify-center rounded-full border-2 border-slate-300 bg-slate-200 text-slate-500 shadow-inner sm:h-40 sm:w-40"
            >
              <Mic className="h-12 w-12 text-slate-500" aria-hidden="true" />
              <span className="mt-2 text-xs font-semibold uppercase tracking-wider text-slate-600">
                Mic Disabled
              </span>
            </button>
          </div>

          <h1 className="mt-6 text-lg font-bold tracking-tight text-slate-900">
            Voice Intake Ready Soon
          </h1>
          <p className="mt-1.5 max-w-xs text-xs leading-relaxed text-slate-500">
            Live microphone capture will be activated in Step 2. Configure your
            API keys in Settings while you review the workflow.
          </p>

          <button
            type="button"
            onClick={onOpenSettings}
            className={`mt-5 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
              hasConfiguredKeys
                ? 'border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                : 'bg-blue-700 text-white shadow-sm hover:bg-blue-800'
            }`}
          >
            <Settings className="h-3.5 w-3.5" aria-hidden="true" />
            <span>
              {hasConfiguredKeys
                ? 'API Keys Configured — Edit Settings'
                : 'Configure API Keys'}
            </span>
          </button>
        </div>

        {/* Right: 3-Step Instructional Guide */}
        <div className="flex flex-1 flex-col justify-between md:pl-4">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              <span>How Arzi-Bol Works</span>
            </div>

            <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              From Spoken Grievance to Formal Petition
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Step 1: Speak your grievance. Step 2: AI maps facts to the
              Bharatiya Nyaya Sanhita (BNS). Step 3: Download a formal petition.
            </p>
          </div>

          {/* 3-Step Cards: Stack on mobile (flex-col), side-by-side on desktop (md:flex-row) */}
          <ol className="mt-6 flex flex-col gap-3 md:flex-row">
            {GUIDE_STEPS.map((item) => {
              const Icon = item.icon;
              return (
                <li
                  key={item.step}
                  className="flex flex-1 flex-col rounded-xl border border-slate-200 bg-slate-50/70 p-4"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-700 text-white">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-700">
                      {item.step}
                    </span>
                  </div>
                  <h3 className="mt-3 text-sm font-semibold text-slate-900">
                    {item.title}
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">
                    {item.description}
                  </p>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      {/* Civic Legal Notice Strip */}
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
            Arzi-Bol is an AI-assisted civic drafting tool. Always verify all
            facts and BNS citations with a qualified human advocate before
            submission.
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenTerms}
          className="shrink-0 rounded-lg border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
        >
          Read Full Terms
        </button>
      </section>
    </div>
  );
}

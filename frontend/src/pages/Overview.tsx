import React from 'react';
import {
  Compass,
  ArrowRight,
  Camera,
  ShieldCheck,
  Footprints,
  Eye,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const Overview: React.FC = () => {
  return (
    <div className="space-y-12 max-w-5xl mx-auto pb-12 pt-2 sm:pt-4">
      {/* =========================================================================
          HERO SECTION
          ========================================================================= */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-canvas-900 via-surface-card to-canvas-950 border border-surface-border p-6 sm:p-10 lg:p-12 shadow-2xl">
        {/* Subtle Ambient Glow */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 -mb-20 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl">
          {/* Brand Tagline Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono bg-cyan-950/70 text-cyan-300 border border-cyan-800/60 mb-5 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            <span className="font-semibold">PATHWISE AI</span>
            <span className="text-slate-400">•</span>
            <span>Beyond Shortest. Towards Safest.</span>
          </div>

          {/* Hero Headline */}
          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-[1.15]">
            Every Journey Deserves an{' '}
            <span className="bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">
              Accessible Path.
            </span>
          </h1>

          {/* Subtext */}
          <p className="mt-4 text-base sm:text-lg text-slate-300 leading-relaxed font-normal max-w-2xl">
            Smarter navigation built around different mobility needs.
          </p>

          {/* Primary & Secondary Call to Actions */}
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              to="/route-explorer"
              className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-sm transition-all shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 hover:translate-y-[-1px]"
            >
              <Compass className="w-4 h-4 text-slate-950" />
              <span>Explore Routes</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              to="/report"
              className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-surface-panel hover:bg-surface-hover text-slate-100 font-semibold text-sm border border-cyan-500/30 transition-all hover:border-cyan-400/50"
            >
              <Camera className="w-4 h-4 text-cyan-400" />
              <span>Report a Barrier</span>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </Link>
          </div>
        </div>

        {/* Large Elegant Map Preview Card */}
        <div className="mt-10 pt-8 border-t border-surface-border/60">
          <div className="relative rounded-2xl overflow-hidden bg-canvas-950 border border-surface-border p-5 shadow-inner">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                  Demonstration Area: Ram Niwas Garden & Albert Hall, Jaipur
                </span>
              </div>
              <Link
                to="/route-explorer"
                className="text-xs font-mono text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1"
              >
                <span>Launch Interactive Map</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Comparison Route Preview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/40 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    Accessible Route (Step-Free)
                  </span>
                  <span className="text-xs font-mono text-emerald-300 font-bold">658 m</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Avoids 18 monumental steps via Rose Garden ramped promenade with continuous tactile paving and certified flush kerb transitions.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-red-950/20 border border-red-500/30 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-red-400 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" />
                    Shortest Route (Blocked)
                  </span>
                  <span className="text-xs font-mono text-red-300 font-bold">413 m</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Follows direct line directly into an 18-step heritage staircase with no ramp access, leaving wheelchair and assisted users stranded.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          THREE CONCISE HIGHLIGHTS
          ========================================================================= */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Highlight 1: Accessible Routes */}
        <div className="rounded-2xl bg-surface-card border border-surface-border p-6 space-y-3 hover:border-cyan-500/40 transition-all shadow-geo-card flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-4">
              <Footprints className="w-5 h-5" />
            </div>
            <h2 className="text-base font-bold text-white mb-1.5">
              Accessible Routes
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              Step-free, slope-aware, and tactile-guided paths calculated for Wheelchair, Low Vision, Elderly, and General Walking.
            </p>
          </div>
          <div className="pt-3 border-t border-surface-border/50">
            <Link
              to="/route-explorer"
              className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              <span>Explore navigation</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Highlight 2: Barrier Awareness */}
        <div className="rounded-2xl bg-surface-card border border-surface-border p-6 space-y-3 hover:border-emerald-500/40 transition-all shadow-geo-card flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4">
              <Eye className="w-5 h-5" />
            </div>
            <h2 className="text-base font-bold text-white mb-1.5">
              Barrier Awareness
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              Detects stairs, missing curb ramps, and street obstacles from photographs and citizen reports within 60 seconds.
            </p>
          </div>
          <div className="pt-3 border-t border-surface-border/50">
            <Link
              to="/report"
              className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              <span>Submit a barrier report</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Highlight 3: Confidence That Matters */}
        <div className="rounded-2xl bg-surface-card border border-surface-border p-6 space-y-3 hover:border-purple-500/40 transition-all shadow-geo-card flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-4">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h2 className="text-base font-bold text-white mb-1.5">
              Confidence That Matters
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              Honest route confidence based on imagery freshness (&lt;90 days) and audited ground truth. Temporary obstacles expire automatically.
            </p>
          </div>
          <div className="pt-3 border-t border-surface-border/50">
            <Link
              to="/route-explorer"
              className="inline-flex items-center gap-1 text-xs font-semibold text-purple-400 hover:text-purple-300 transition-colors"
            >
              <span>View route confidence</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

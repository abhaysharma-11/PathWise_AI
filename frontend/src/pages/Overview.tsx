import React from 'react';
import {
  Compass,
  ArrowRight,
  ShieldCheck,
  Camera,
  Layers,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Eye,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { HealthResponse, ConnectionState } from '../types';

interface OverviewProps {
  healthData?: HealthResponse | null;
  latencyMs?: number | null;
  connectionState?: ConnectionState;
  healthError?: string | null;
  onRefreshHealth?: () => void;
}

export const Overview: React.FC<OverviewProps> = ({
  connectionState = 'connected',
  latencyMs = 4,
}) => {
  return (
    <div className="space-y-12 max-w-6xl mx-auto pb-12">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-canvas-900 via-surface-card to-canvas-950 border border-surface-border p-8 sm:p-12 lg:p-14 shadow-geo-card">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 -mr-24 -mt-24 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 -mb-24 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono bg-cyan-950/70 text-cyan-300 border border-cyan-800/60 mb-6 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Accessible Pedestrian Navigation • Jaipur Demonstration Precinct</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.15]">
            Every Journey Deserves an{' '}
            <span className="bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">
              Accessible Path.
            </span>
          </h1>

          <p className="mt-5 text-base sm:text-xl text-slate-300 leading-relaxed font-normal">
            Find better walking routes, discover barriers, and help make streets accessible for everyone. Beyond shortest distance — towards genuine physical safety.
          </p>

          {/* Primary Action Buttons */}
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

        {/* Live Map Preview Teaser */}
        <div className="mt-10 pt-8 border-t border-surface-border/60">
          <div className="bg-canvas-950/80 rounded-2xl border border-surface-border p-4 sm:p-6 backdrop-blur-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-200">
                  Live Demonstration Network
                </span>
                <span className="text-[11px] text-slate-400">
                  Ram Niwas Garden & Albert Hall, Jaipur
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
                <span>Latency: {latencyMs ?? 4}ms</span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {connectionState === 'connected' ? 'FastAPI Connected' : 'Checking'}
                </span>
              </div>
            </div>

            {/* Visual Route Demonstration Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 uppercase tracking-wide">
                    <CheckCircle2 className="w-4 h-4" />
                    Accessible Route (Step-Free)
                  </span>
                  <span className="text-xs font-mono text-emerald-300">658m • Step-Free</span>
                </div>
                <p className="text-xs text-slate-300 leading-normal">
                  Reroutes via gentle Rose Garden ramp (1.8% incline) with continuous tactile guiding pavers, safely bypassing monumental heritage stairs.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-red-950/20 border border-red-500/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-red-400 flex items-center gap-1.5 uppercase tracking-wide">
                    <AlertTriangle className="w-4 h-4" />
                    Shortest Route (Blocked)
                  </span>
                  <span className="text-xs font-mono text-red-300">413m • 18 Steps</span>
                </div>
                <p className="text-xs text-slate-300 leading-normal">
                  Standard map algorithms take 413m straight into 18 steep monumental steps (16.5% grade, no ramp), leaving wheelchair users completely stranded.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3 Concise Core Feature Cards */}
      <section className="space-y-4">
        <div className="text-center max-w-xl mx-auto mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Built for Real-World Streets
          </h2>
          <p className="text-sm text-slate-400 mt-2">
            Standard navigation solves for cars. PATHWISE AI is purpose-built for pedestrians with diverse mobility requirements.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Find Accessible Routes */}
          <div className="group rounded-2xl bg-surface-card border border-surface-border p-6 hover:border-cyan-500/40 transition-all hover:translate-y-[-2px] shadow-geo-card flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-5 group-hover:scale-105 transition-transform">
                <Compass className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">
                Find Accessible Routes
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Step-free, slope-aware, and tactile-guided routes designed specifically for wheelchairs, strollers, visually impaired, and senior pedestrians.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-surface-border/50">
              <Link
                to="/route-explorer"
                className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                Plan your journey <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Card 2: Spot & Report Barriers */}
          <div className="group rounded-2xl bg-surface-card border border-surface-border p-6 hover:border-emerald-500/40 transition-all hover:translate-y-[-2px] shadow-geo-card flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-5 group-hover:scale-105 transition-transform">
                <Camera className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">
                Spot & Report Barriers
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Snap photos of blocked footpaths, parked vehicles, or broken ramps. Pretrained computer vision and community reporting update active routes within 60 seconds.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-surface-border/50">
              <Link
                to="/report"
                className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                Submit photo report <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Card 3: Navigate With Confidence */}
          <div className="group rounded-2xl bg-surface-card border border-surface-border p-6 hover:border-purple-500/40 transition-all hover:translate-y-[-2px] shadow-geo-card flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-5 group-hover:scale-105 transition-transform">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">
                Navigate With Confidence
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Transparent confidence scores derived from recent street photography age (&lt;90 days) and audited ground truth. Temporary obstacles expire automatically.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-surface-border/50">
              <Link
                to="/route-explorer"
                className="inline-flex items-center gap-1 text-xs font-semibold text-purple-400 hover:text-purple-300 transition-colors"
              >
                Inspect route evidence <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Live System Capabilities Grid */}
      <section className="rounded-2xl bg-surface-panel/40 border border-surface-border p-6 sm:p-8">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-6 font-mono">
          System Verification & Reliability Highlights
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-2xl font-mono">
              <Clock className="w-5 h-5" /> &lt; 60s
            </div>
            <div className="text-xs font-medium text-slate-300">Live Barrier Updates</div>
            <div className="text-[11px] text-slate-400">User photo reports propagate to navigation without reload</div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-cyan-400 font-bold text-2xl font-mono">
              <Layers className="w-5 h-5" /> 4 Modes
            </div>
            <div className="text-xs font-medium text-slate-300">Mobility Profiles</div>
            <div className="text-[11px] text-slate-400">Wheelchair, Blind / Low Vision, Elderly, General Walking</div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-purple-400 font-bold text-2xl font-mono">
              <Eye className="w-5 h-5" /> 90-Day
            </div>
            <div className="text-xs font-medium text-slate-300">Freshness Threshold</div>
            <div className="text-[11px] text-slate-400">Honest route confidence drops when imagery is stale</div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-2xl font-mono">
              <CheckCircle2 className="w-5 h-5" /> Auto-Expire
            </div>
            <div className="text-xs font-medium text-slate-300">Temporary Obstacles</div>
            <div className="text-[11px] text-slate-400">Parked vehicles & work zones expire while kept in history</div>
          </div>
        </div>
      </section>

      {/* Bottom CTA Banner */}
      <section className="rounded-3xl bg-gradient-to-r from-cyan-950/60 via-canvas-900 to-emerald-950/60 border border-cyan-500/30 p-8 sm:p-10 flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
        <div>
          <h3 className="text-xl sm:text-2xl font-bold text-white">
            Ready to explore accessible walking routes?
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
            Choose your mobility profile, compare accessible paths against standard navigation, and discover verified step-free corridors.
          </p>
        </div>
        <Link
          to="/route-explorer"
          className="shrink-0 inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm transition-all shadow-lg shadow-cyan-500/20"
        >
          <span>Get Started Now</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </section>
    </div>
  );
};

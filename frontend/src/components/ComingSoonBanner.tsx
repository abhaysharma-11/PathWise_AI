import React from 'react';
import { Clock, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ComingSoonBannerProps {
  featureName: string;
  targetPhase: 2 | 3;
  techStack: string;
  description: string;
}

export const ComingSoonBanner: React.FC<ComingSoonBannerProps> = ({
  featureName,
  targetPhase,
  techStack,
  description,
}) => {
  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-5 mb-6 text-amber-200 shadow-sm">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 mt-0.5 sm:mt-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-white text-base">{featureName}</span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-medium">
                Phase {targetPhase} Roadmap
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
              {description}
            </p>
            <div className="mt-2 text-[11px] font-mono text-cyan-300/90 flex items-center gap-2">
              <span className="text-slate-400">Target Pipeline:</span>
              <span className="px-1.5 py-0.5 rounded bg-surface-panel border border-surface-border">
                {techStack}
              </span>
              <span className="text-slate-400">• Unimplemented in Phase 1</span>
            </div>
          </div>
        </div>

        <Link
          to="/"
          className="self-start sm:self-auto inline-flex items-center gap-1.5 text-xs font-mono font-medium text-cyan-400 hover:text-cyan-300 px-3 py-1.5 rounded-md bg-surface-panel border border-surface-border hover:border-cyan-500/50 transition-colors"
        >
          <span>Return to Overview</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
};

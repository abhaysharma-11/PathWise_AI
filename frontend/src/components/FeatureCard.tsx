import React from 'react';
import { LucideIcon, CheckCircle2, Clock } from 'lucide-react';

export interface FeatureCardProps {
  title: string;
  tagline: string;
  description: string;
  icon: LucideIcon;
  phase: number;
  phaseLabel: string;
  status: 'active' | 'scheduled';
  metrics: string[];
  accentColor?: 'cyan' | 'emerald' | 'blue' | 'purple';
}

export const FeatureCard: React.FC<FeatureCardProps> = ({
  title,
  tagline,
  description,
  icon: Icon,
  phase,
  phaseLabel,
  status,
  metrics,
  accentColor = 'cyan',
}) => {
  const accentStyles = {
    cyan: {
      borderHover: 'hover:border-cyan-500/50',
      iconBg: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
      badge: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30',
      glow: 'group-hover:shadow-cyan-soft',
    },
    emerald: {
      borderHover: 'hover:border-emerald-500/50',
      iconBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      badge: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
      glow: 'group-hover:shadow-emerald-soft',
    },
    blue: {
      borderHover: 'hover:border-blue-500/50',
      iconBg: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      badge: 'bg-blue-500/10 text-blue-300 border-blue-500/30',
      glow: 'group-hover:shadow-cyan-soft',
    },
    purple: {
      borderHover: 'hover:border-purple-500/50',
      iconBg: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
      badge: 'bg-purple-500/10 text-purple-300 border-purple-500/30',
      glow: 'group-hover:shadow-cyan-soft',
    },
  }[accentColor];

  return (
    <div
      className={`group relative rounded-xl bg-surface-card border border-surface-border p-6 transition-all duration-300 ${accentStyles.borderHover} ${accentStyles.glow} flex flex-col justify-between`}
    >
      <div>
        {/* Card Header: Icon + Phase Badge */}
        <div className="flex items-center justify-between mb-4">
          <div className={`p-3 rounded-xl border ${accentStyles.iconBg}`}>
            <Icon className="w-5 h-5" />
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`text-[11px] font-mono font-medium px-2.5 py-1 rounded-full border ${accentStyles.badge}`}
            >
              Phase {phase} • {phaseLabel}
            </span>
          </div>
        </div>

        {/* Title & Tagline */}
        <h3 className="text-base font-semibold text-white tracking-tight group-hover:text-cyan-300 transition-colors">
          {title}
        </h3>
        <p className="text-xs font-mono text-cyan-400/80 mt-1 mb-2.5 font-medium">
          {tagline}
        </p>

        {/* Description */}
        <p className="text-xs text-slate-400 leading-relaxed">
          {description}
        </p>
      </div>

      {/* Capabilities/Metrics List */}
      <div className="mt-5 pt-4 border-t border-surface-border/60">
        <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-2">
          Target Specifications
        </div>
        <ul className="space-y-1.5">
          {metrics.map((metric, idx) => (
            <li key={idx} className="flex items-center gap-2 text-xs text-slate-300">
              {status === 'active' ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              ) : (
                <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              )}
              <span>{metric}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

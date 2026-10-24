import React, { useState, useEffect } from 'react';

interface LaunchExperienceProps {
  onComplete: () => void;
}

export const LaunchExperience: React.FC<LaunchExperienceProps> = ({ onComplete }) => {
  const [fading, setFading] = useState<boolean>(false);

  useEffect(() => {
    // Check if user prefers reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      onComplete();
      return;
    }

    // Auto complete after 1.8 seconds with a smooth fade-out
    const fadeTimer = setTimeout(() => {
      setFading(true);
    }, 1400);

    const completeTimer = setTimeout(() => {
      onComplete();
    }, 1800);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <div
      role="region"
      aria-label="Welcome to PATHWISE AI"
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#070D18] transition-opacity duration-400 ease-in-out ${
        fading ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Accessible Skip Button */}
      <button
        onClick={onComplete}
        className="absolute top-6 right-6 px-3 py-1.5 rounded-lg text-xs font-mono font-medium text-slate-400 hover:text-white bg-slate-900/60 hover:bg-slate-800/80 border border-slate-700/50 transition-all focus:outline-none focus:ring-2 focus:ring-cyan-400"
        aria-label="Skip introduction animation"
      >
        Skip Intro &rarr;
      </button>

      {/* Center Branding Content */}
      <div className="flex flex-col items-center text-center px-6 max-w-md">
        {/* Animated Navigation Route SVG Line */}
        <div className="w-48 h-16 mb-6 relative">
          <svg
            viewBox="0 0 200 60"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full"
            aria-hidden="true"
          >
            {/* Background path glow */}
            <path
              d="M 20 40 Q 60 10, 100 35 T 180 20"
              stroke="#064E3B"
              strokeWidth="4"
              strokeLinecap="round"
              fill="none"
              opacity="0.4"
            />
            {/* Animated foreground stroke */}
            <path
              d="M 20 40 Q 60 10, 100 35 T 180 20"
              stroke="url(#route-gradient)"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeDasharray="220"
              strokeDashoffset="220"
              className="animate-[dash_1.3s_cubic-bezier(0.4,0,0.2,1)_forwards]"
              fill="none"
            />
            {/* Origin Node Dot */}
            <circle cx="20" cy="40" r="5" fill="#10B981" />
            <circle cx="20" cy="40" r="8" stroke="#10B981" strokeWidth="1.5" opacity="0.6" />
            {/* Destination Node Dot */}
            <circle cx="180" cy="20" r="5" fill="#06B6D4" />
            <circle cx="180" cy="20" r="8" stroke="#06B6D4" strokeWidth="1.5" opacity="0.6" />

            <defs>
              <linearGradient id="route-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#10B981" />
                <stop offset="60%" stopColor="#2DD4BF" />
                <stop offset="100%" stopColor="#06B6D4" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Title */}
        <div className="flex items-center gap-2 mb-2">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white font-mono">
            PATHWISE
          </h1>
          <span className="text-xs px-2 py-0.5 rounded font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
            AI
          </span>
        </div>

        {/* Tagline */}
        <p className="text-sm sm:text-base font-medium text-slate-300 tracking-wide mt-1">
          Beyond Shortest. Towards Safest.
        </p>

        {/* Subtext */}
        <div className="mt-4 flex items-center gap-2 text-[11px] font-mono text-slate-500">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>Mobility-Specific Geointelligence</span>
        </div>
      </div>
    </div>
  );
};

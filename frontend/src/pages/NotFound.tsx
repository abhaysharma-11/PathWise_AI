import React from 'react';
import { Compass, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export const NotFound: React.FC = () => {
  return (
    <div className="py-20 text-center space-y-4 max-w-md mx-auto">
      <div className="w-16 h-16 rounded-2xl bg-surface-card border border-surface-border mx-auto flex items-center justify-center text-cyan-400 shadow-geo-card">
        <Compass className="w-8 h-8" />
      </div>
      <h1 className="text-2xl font-bold text-white">404 - Page Not Found</h1>
      <p className="text-xs text-slate-400">
        The requested path does not exist in the PATHWISE AI platform.
      </p>
      <div className="pt-2">
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Overview</span>
        </Link>
      </div>
    </div>
  );
};

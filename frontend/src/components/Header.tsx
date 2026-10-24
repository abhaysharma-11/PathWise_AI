import React from 'react';
import { NavLink } from 'react-router-dom';
import { Menu, X, Compass, MapPin, Eye, BarChart3, Wrench } from 'lucide-react';
import { ConnectionState } from '../types';

interface HeaderProps {
  connectionState: ConnectionState;
  onRefreshHealth: () => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  onOpenDiagnostics?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  connectionState,
  onRefreshHealth,
  mobileMenuOpen,
  setMobileMenuOpen,
  onOpenDiagnostics,
}) => {
  return (
    <header className="h-14 bg-canvas-900/95 backdrop-blur-md border-b border-surface-border px-4 lg:px-6 flex items-center justify-between sticky top-0 z-30 transition-colors">
      {/* Left: Branding & Tagline */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors"
          aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        <NavLink to="/route-explorer" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500/20 via-surface-panel to-emerald-500/20 border border-cyan-500/40 flex items-center justify-center shadow-geo-card group-hover:border-cyan-400/80 transition-colors">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-subtle-pulse" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 leading-none">
              <span className="font-extrabold tracking-tight text-white text-base font-mono">PATHWISE</span>
              <span className="text-[10px] px-1 py-0.5 rounded font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">AI</span>
            </div>
            <span className="text-[10px] text-slate-400 tracking-wide font-medium mt-0.5 hidden sm:block">
              Beyond Shortest. Towards Safest.
            </span>
          </div>
        </NavLink>
      </div>

      {/* Center: Clean Nav Links (Desktop) */}
      <nav className="hidden md:flex items-center gap-1 text-xs font-medium">
        <NavLink
          to="/route-explorer"
          className={({ isActive }) =>
            `px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors ${
              isActive
                ? 'bg-surface-panel text-white border border-surface-border font-semibold shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-surface-hover/50'
            }`
          }
        >
          <MapPin className="w-3.5 h-3.5 text-cyan-400" />
          <span>Route Map</span>
        </NavLink>

        <NavLink
          to="/"
          className={({ isActive }) =>
            `px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors ${
              isActive
                ? 'bg-surface-panel text-white border border-surface-border font-semibold shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-surface-hover/50'
            }`
          }
        >
          <Compass className="w-3.5 h-3.5 text-slate-400" />
          <span>Overview</span>
        </NavLink>

        <NavLink
          to="/street-vision"
          className={({ isActive }) =>
            `px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors ${
              isActive
                ? 'bg-surface-panel text-white border border-surface-border font-semibold shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-surface-hover/50'
            }`
          }
        >
          <Eye className="w-3.5 h-3.5 text-purple-400" />
          <span>StreetVision</span>
        </NavLink>

        <NavLink
          to="/accessibility-insights"
          className={({ isActive }) =>
            `px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors ${
              isActive
                ? 'bg-surface-panel text-white border border-surface-border font-semibold shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-surface-hover/50'
            }`
          }
        >
          <BarChart3 className="w-3.5 h-3.5 text-blue-400" />
          <span>Insights</span>
        </NavLink>
      </nav>

      {/* Right: Small Unobtrusive Status & Diagnostics Trigger */}
      <div className="flex items-center gap-3">
        {/* Subtle Connection Status Indicator */}
        <button
          onClick={onRefreshHealth}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono bg-canvas-950 border border-surface-border hover:border-slate-600 transition-colors"
          title={`Backend API Status: ${connectionState}. Click to refresh.`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              connectionState === 'connected'
                ? 'bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.7)]'
                : connectionState === 'checking'
                ? 'bg-cyan-400 animate-ping'
                : 'bg-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.7)]'
            }`}
          />
          <span className="text-[11px] text-slate-300 capitalize">
            {connectionState === 'connected' ? 'Live' : connectionState}
          </span>
        </button>

        {/* Developer Diagnostics Subtle Trigger */}
        {onOpenDiagnostics && (
          <button
            onClick={onOpenDiagnostics}
            className="p-1.5 text-slate-500 hover:text-slate-300 hover:bg-surface-hover rounded-lg transition-colors"
            title="Open Developer & Engine Diagnostics"
          >
            <Wrench className="w-4 h-4" />
          </button>
        )}
      </div>
    </header>
  );
};

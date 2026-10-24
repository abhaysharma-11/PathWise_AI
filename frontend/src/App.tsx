import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { DeveloperDiagnosticsModal } from './components/DeveloperDiagnosticsModal';
import { Overview } from './pages/Overview';
import { RouteExplorer } from './pages/RouteExplorer';
import { StreetVision } from './pages/StreetVision';
import { AccessibilityInsights } from './pages/AccessibilityInsights';
import { NotFound } from './pages/NotFound';
import { checkBackendHealth } from './services/api';
import { HealthResponse, ConnectionState } from './types';

const MainLayout: React.FC = () => {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [connectionState, setConnectionState] = useState<ConnectionState>('checking');
  const [healthData, setHealthData] = useState<HealthResponse | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [diagnosticsOpen, setDiagnosticsOpen] = useState<boolean>(false);

  const performHealthCheck = useCallback(async () => {
    setConnectionState('checking');
    try {
      const result = await checkBackendHealth();
      setHealthData(result.data);
      setLatencyMs(result.latencyMs);
      setHealthError(null);
      setConnectionState('connected');
    } catch (err: unknown) {
      setHealthData(null);
      setLatencyMs(null);
      const msg = err instanceof Error ? err.message : 'Backend unreachable';
      setHealthError(msg);
      setConnectionState('disconnected');
    }
  }, []);

  // Health ping on mount and every 30s
  useEffect(() => {
    performHealthCheck();
    const intervalId = setInterval(performHealthCheck, 30000);
    return () => clearInterval(intervalId);
  }, [performHealthCheck]);

  const isMapRoute = location.pathname === '/route-explorer';

  return (
    <div className="min-h-screen bg-canvas-950 text-slate-100 flex font-sans selection:bg-cyan-500/20 selection:text-cyan-300">
      {/* Navigation Sidebar */}
      <Sidebar
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
      />

      {/* Main Content Area (Offset by sidebar width on large screens) */}
      <div className="lg:pl-64 flex flex-col flex-1 min-w-0 h-screen overflow-hidden">
        {/* Minimal Header */}
        <Header
          connectionState={connectionState}
          onRefreshHealth={performHealthCheck}
          mobileMenuOpen={mobileMenuOpen}
          setMobileMenuOpen={setMobileMenuOpen}
          onOpenDiagnostics={() => setDiagnosticsOpen(true)}
        />

        {/* Routed Views Container */}
        <main
          className={`flex-1 ${
            isMapRoute
              ? 'p-0 overflow-hidden flex flex-col'
              : 'p-4 sm:p-6 lg:p-8 overflow-y-auto'
          }`}
        >
          <Routes>
            <Route path="/" element={<Overview
              healthData={healthData}
              latencyMs={latencyMs}
              connectionState={connectionState}
              healthError={healthError}
              onRefreshHealth={performHealthCheck}
            />} />
            <Route path="/route-explorer" element={<RouteExplorer />} />
            <Route path="/report" element={<StreetVision />} />
            <Route path="/street-vision" element={<StreetVision />} />
            <Route path="/streetvision" element={<StreetVision />} />
            <Route path="/accessibility-insights" element={<AccessibilityInsights />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>

        {/* Minimalist Footer on non-map views */}
        {!isMapRoute && (
          <footer className="border-t border-surface-border/60 py-3 px-6 text-center text-xs text-slate-500 font-mono bg-canvas-950">
            PATHWISE AI • Beyond Shortest. Towards Safest. • HypNex Hackathon SC-02
          </footer>
        )}
      </div>

      {/* Developer Diagnostics Modal */}
      <DeveloperDiagnosticsModal
        isOpen={diagnosticsOpen}
        onClose={() => setDiagnosticsOpen(false)}
        shortestRoute={null}
        accessibleRoute={null}
        segments={[]}
      />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <MainLayout />
    </BrowserRouter>
  );
};

export default App;

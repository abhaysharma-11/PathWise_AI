import React, { useState, useRef, useEffect } from 'react';
import { MapPin, Navigation, X, Crosshair } from 'lucide-react';
import { Coordinate } from '../types';

export interface LandmarkOption {
  id: string;
  name: string;
  lat: number;
  lon: number;
  description?: string;
}

interface SearchableLocationInputProps {
  label: string;
  placeholder: string;
  type: 'start' | 'destination';
  value: Coordinate | null;
  onChange: (coord: Coordinate | null) => void;
  isPickingOnMap: boolean;
  onTogglePickOnMap: () => void;
  availableLandmarks: LandmarkOption[];
}

export const SearchableLocationInput: React.FC<SearchableLocationInputProps> = ({
  label,
  placeholder,
  type,
  value,
  onChange,
  isPickingOnMap,
  onTogglePickOnMap,
  availableLandmarks,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync search term with current selected value name
  useEffect(() => {
    if (value && value.name) {
      setSearchTerm(value.name);
    } else if (!value) {
      setSearchTerm('');
    }
  }, [value]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        // If we closed and have a value, restore its name
        if (value && value.name) {
          setSearchTerm(value.name);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [value]);

  // Filter landmarks by search term
  const filteredLandmarks = availableLandmarks.filter((l) => {
    if (!searchTerm || (value && searchTerm === value.name)) return true;
    const term = searchTerm.toLowerCase();
    return (
      l.name.toLowerCase().includes(term) ||
      (l.description && l.description.toLowerCase().includes(term))
    );
  });

  const handleSelect = (landmark: LandmarkOption) => {
    onChange({
      lat: landmark.lat,
      lon: landmark.lon,
      name: landmark.name,
    });
    setSearchTerm(landmark.name);
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange(null);
    setSearchTerm('');
  };

  const isStart = type === 'start';

  return (
    <div ref={containerRef} className="relative space-y-1">
      <div className="flex items-center justify-between text-xs">
        <label className="font-semibold text-slate-300 flex items-center gap-1.5">
          {isStart ? (
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
          ) : (
            <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block" />
          )}
          <span>{label}</span>
        </label>

        <button
          type="button"
          onClick={onTogglePickOnMap}
          className={`text-[11px] font-mono px-2 py-0.5 rounded-lg flex items-center gap-1 transition-all ${
            isPickingOnMap
              ? isStart
                ? 'bg-emerald-500 text-black font-bold shadow-emerald-soft'
                : 'bg-cyan-500 text-black font-bold shadow-cyan-soft'
              : 'bg-surface-panel hover:bg-surface-hover text-slate-400 hover:text-slate-200 border border-surface-border'
          }`}
          title="Click to activate map selection cursor"
        >
          <Crosshair className="w-3 h-3" />
          <span>{isPickingOnMap ? 'Click Map...' : 'Pick on Map'}</span>
        </button>
      </div>

      <div className="relative flex items-center">
        <div className="absolute left-3 text-slate-500 pointer-events-none">
          {isStart ? (
            <MapPin className="w-4 h-4 text-emerald-400" />
          ) : (
            <Navigation className="w-4 h-4 text-cyan-400" />
          )}
        </div>

        <input
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
            if (!e.target.value) {
              onChange(null);
            }
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="w-full bg-canvas-950 border border-surface-border hover:border-slate-600 focus:border-cyan-500 rounded-xl pl-9 pr-8 py-2 text-xs text-slate-200 placeholder-slate-500 transition-colors focus:outline-none"
        />

        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2.5 p-1 text-slate-500 hover:text-white rounded-md transition-colors"
            title="Clear selection"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Dropdown Options */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-canvas-900 border border-surface-border rounded-xl shadow-2xl overflow-hidden max-h-52 overflow-y-auto divide-y divide-surface-border/40 animate-fadeIn">
          {filteredLandmarks.length > 0 ? (
            filteredLandmarks.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => handleSelect(l)}
                className="w-full text-left px-3.5 py-2.5 hover:bg-surface-hover transition-colors flex flex-col group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-200 group-hover:text-cyan-300">
                    {l.name}
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">
                    {l.lat.toFixed(4)}, {l.lon.toFixed(4)}
                  </span>
                </div>
                {l.description && (
                  <span className="text-[10px] text-slate-400 truncate mt-0.5">
                    {l.description}
                  </span>
                )}
              </button>
            ))
          ) : (
            <div className="px-3 py-3 text-center text-xs text-slate-500">
              No matching landmark in demonstration precinct.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

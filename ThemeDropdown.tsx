import { useState, useEffect, useRef } from 'react';
import { Palette } from 'lucide-react';

interface ThemeDropdownProps {
  currentTheme: string;
  customColor: string;
  onThemeChange: (theme: string) => void;
  onCustomColorChange: (color: string) => void;
}

export default function ThemeDropdown({
  currentTheme,
  customColor,
  onThemeChange,
  onCustomColorChange,
}: ThemeDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const themes = [
    { name: 'yellow', label: 'Kuning', color: 'bg-[#facc15]' },
    { name: 'blue', label: 'Biru', color: 'bg-[#3b82f6]' },
    { name: 'emerald', label: 'Hijau', color: 'bg-[#10b981]' },
    { name: 'rose', label: 'Merah', color: 'bg-[#f43f5e]' },
    { name: 'purple', label: 'Ungu', color: 'bg-[#a855f7]' },
  ];

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 font-bold bg-white text-gray-700 px-3 py-1.5 rounded-full shadow-xs border border-gray-200 hover:bg-gray-50 transition-colors active-tap cursor-pointer"
      >
        <Palette className="w-4 h-4 text-primary-500" />
        <span className="hidden sm:inline text-sm">Tema</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-100 rounded-2xl shadow-xl p-3 flex flex-col gap-1 z-[10000]">
          <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 px-1">
            Pilih Tema Warna
          </h3>

          {themes.map((theme) => (
            <button
              key={theme.name}
              onClick={() => {
                onThemeChange(theme.name);
                setIsOpen(false);
              }}
              className={`flex items-center justify-between w-full px-3 py-2 hover:bg-gray-50 rounded-xl text-sm font-semibold text-gray-700 transition-colors cursor-pointer ${
                currentTheme === theme.name ? 'bg-primary-50/50 text-primary-900' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={`w-4 h-4 rounded-full ${theme.color} shadow-xs border border-gray-200`}></span>
                {theme.label}
              </div>
              {currentTheme === theme.name && (
                <span className="w-1.5 h-1.5 rounded-full bg-primary-500"></span>
              )}
            </button>
          ))}

          <div className="mt-2 pt-2 border-t border-gray-100">
            <label className="flex items-center justify-between px-3 py-1.5 hover:bg-gray-50 rounded-xl cursor-pointer transition-colors">
              <span className="text-sm font-semibold text-gray-700">Custom...</span>
              <input
                type="color"
                value={customColor || '#facc15'}
                onChange={(e) => onCustomColorChange(e.target.value)}
                className="w-6 h-6 rounded cursor-pointer border-0 p-0 bg-transparent"
              />
            </label>
          </div>
        </div>
      )}
    </div>
  );
}

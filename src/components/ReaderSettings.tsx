'use client';

import { ReaderSettings, ThemeName } from '@/lib/types';
import { X } from 'lucide-react';

interface ReaderSettingsProps {
  settings: ReaderSettings;
  onSettingsChange: (settings: ReaderSettings) => void;
  onClose: () => void;
}

const FONTS = [
  { value: 'Literata', label: 'Literata', style: { fontFamily: 'Literata, serif' } },
  { value: 'Georgia', label: 'Georgia', style: { fontFamily: 'Georgia, serif' } },
  { value: 'Merriweather', label: 'Merriweather', style: { fontFamily: 'Merriweather, serif' } },
  { value: 'system', label: 'System Default', style: { fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' } },
];

const THEMES: { value: ThemeName; label: string; className: string }[] = [
  { value: 'light', label: 'Light', className: 'theme-light' },
  { value: 'dark', label: 'Dark', className: 'theme-dark' },
  { value: 'sepia', label: 'Sepia', className: 'theme-sepia' },
  { value: 'midnight', label: 'Midnight', className: 'theme-midnight' },
];

export default function ReaderSettingsPanel({
  settings,
  onSettingsChange,
  onClose,
}: ReaderSettingsProps) {
  const update = (partial: Partial<ReaderSettings>) => {
    onSettingsChange({ ...settings, ...partial });
  };

  return (
    <>
      <div className="settings-overlay" onClick={onClose} />
      <div className="settings-panel">
        <div className="settings-header">
          <h2>Reading Settings</h2>
          <button className="btn-icon" onClick={onClose} aria-label="Close settings">
            <X size={20} />
          </button>
        </div>

        <div className="settings-body">
          {/* Theme */}
          <div className="settings-section">
            <div className="settings-label">Theme</div>
            <div className="theme-grid">
              {THEMES.map((theme) => (
                <button
                  key={theme.value}
                  className={`theme-option ${theme.className} ${settings.theme === theme.value ? 'active' : ''}`}
                  onClick={() => update({ theme: theme.value })}
                >
                  {theme.label}
                </button>
              ))}
            </div>
          </div>

          {/* Font Family */}
          <div className="settings-section">
            <div className="settings-label">Font</div>
            <div className="font-grid">
              {FONTS.map((font) => (
                <button
                  key={font.value}
                  className={`font-option ${settings.fontFamily === font.value ? 'active' : ''}`}
                  style={font.style}
                  onClick={() => update({ fontFamily: font.value })}
                >
                  {font.label}
                </button>
              ))}
            </div>
          </div>

          {/* Font Size */}
          <div className="settings-section">
            <div className="settings-label">Font Size</div>
            <div className="settings-slider-row">
              <span className="settings-slider-value" style={{ fontSize: '13px' }}>A</span>
              <input
                type="range"
                className="settings-slider"
                min="14"
                max="28"
                step="1"
                value={settings.fontSize}
                onChange={(e) => update({ fontSize: Number(e.target.value) })}
              />
              <span className="settings-slider-value" style={{ fontSize: '20px' }}>A</span>
              <span className="settings-slider-value">{settings.fontSize}px</span>
            </div>
          </div>

          {/* Line Height */}
          <div className="settings-section">
            <div className="settings-label">Line Spacing</div>
            <div className="settings-slider-row">
              <span className="settings-slider-value" style={{ fontSize: '13px' }}>≡</span>
              <input
                type="range"
                className="settings-slider"
                min="1.4"
                max="2.4"
                step="0.1"
                value={settings.lineHeight}
                onChange={(e) => update({ lineHeight: Number(e.target.value) })}
              />
              <span className="settings-slider-value" style={{ fontSize: '18px' }}>≡</span>
              <span className="settings-slider-value">{settings.lineHeight.toFixed(1)}</span>
            </div>
          </div>

          {/* Margin */}
          <div className="settings-section">
            <div className="settings-label">Page Width</div>
            <div className="theme-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
              {(['compact', 'normal', 'wide'] as const).map((m) => (
                <button
                  key={m}
                  className={`theme-option ${settings.marginSize === m ? 'active' : ''}`}
                  onClick={() => update({ marginSize: m })}
                  style={{ textTransform: 'capitalize' }}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

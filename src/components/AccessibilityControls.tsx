import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';

export const AccessibilityControls: React.FC = () => {
  const { accessibility, setAccessibility } = useTheme();
  const [warning, setWarning] = useState<string | null>(null);

  const handleHighContrastToggle = () => {
    setAccessibility({
      ...accessibility,
      highContrast: !accessibility.highContrast,
    });
  };

  const handleFontSizeChange = (size: number) => {
    if (size < 12 || size > 24) {
      setWarning('Yazı tipi boyutu 12px ile 24px arasında olmalıdır!');
      const clamped = Math.min(24, Math.max(12, size));
      setAccessibility({ ...accessibility, fontSize: clamped });
    } else {
      setWarning(null);
      setAccessibility({ ...accessibility, fontSize: size });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* High Contrast Toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-secondary)' }}>
            <circle cx="12" cy="12" r="5" />
            <line x1="12" y1="1" x2="12" y2="3" />
            <line x1="12" y1="21" x2="12" y2="23" />
          </svg>
          <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>Yüksek Kontrast</span>
        </div>
        {/* Toggle Switch */}
        <div
          onClick={handleHighContrastToggle}
          style={{
            width: '44px',
            height: '24px',
            borderRadius: '12px',
            padding: '3px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            background: accessibility.highContrast ? 'var(--accent-color)' : 'var(--input-bg)',
            border: '1px solid var(--border-subtle)',
            position: 'relative',
          }}
        >
          <div
            style={{
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              background: 'var(--text-primary)',
              boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
              transition: 'transform 0.2s ease',
              transform: accessibility.highContrast ? 'translateX(20px)' : 'translateX(0)',
            }}
          />
        </div>
      </div>

      {/* Font Size */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>Yazı Tipi Boyutu</span>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, fontFamily: 'monospace', color: 'var(--accent-color)' }}>
            {accessibility.fontSize}px
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>A</span>
          <input
            type="range"
            min="12"
            max="24"
            value={accessibility.fontSize}
            onChange={(e) => handleFontSizeChange(parseInt(e.target.value, 10))}
            style={{ flex: 1, accentColor: 'var(--accent-color)', cursor: 'pointer' }}
          />
          <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-secondary)' }}>A+</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
          <span>Küçük</span>
          <span>Normal</span>
          <span>Büyük</span>
        </div>

        {warning && (
          <div style={{ fontSize: '0.75rem', color: 'var(--warning)', marginTop: '4px' }}>
            {warning}
          </div>
        )}
      </div>
    </div>
  );
};

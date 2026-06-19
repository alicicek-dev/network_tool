import React from 'react';
import { useTheme } from '../context/ThemeContext';

export const ThemeResetButton: React.FC = () => {
  const { resetToDefaults } = useTheme();

  return (
    <button
      onClick={resetToDefaults}
      style={{
        padding: '8px 18px',
        borderRadius: '6px',
        fontSize: '0.78rem',
        fontWeight: 600,
        transition: 'all 0.2s ease',
        background: 'rgba(243, 139, 168, 0.12)',
        color: 'var(--danger)',
        border: '1px solid rgba(243, 139, 168, 0.25)',
        cursor: 'pointer',
      }}
      title="Temayı ilk varsayılan ayarlarına sıfırlar."
    >
      Varsayılanlara Dön
    </button>
  );
};

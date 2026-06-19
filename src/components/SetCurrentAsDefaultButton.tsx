import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';

export const SetCurrentAsDefaultButton: React.FC = () => {
  const { saveCurrentAsDefaults } = useTheme();
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    saveCurrentAsDefaults();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <button
      onClick={handleSave}
      style={{
        padding: '8px 18px',
        borderRadius: '6px',
        fontSize: '0.78rem',
        fontWeight: 600,
        transition: 'all 0.2s ease',
        background: saved ? 'rgba(var(--success-rgb), 0.25)' : 'rgba(var(--success-rgb), 0.12)',
        color: 'var(--success)',
        border: '1px solid rgba(var(--success-rgb), 0.25)',
        cursor: 'pointer',
      }}
      title="Mevcut tema ve erişilebilirlik ayarlarını başlangıç varsayılanı yapar."
    >
      {saved ? 'Varsayılan Yapıldı!' : 'Şu Anki Ayarları Varsayılan Yap'}
    </button>
  );
};

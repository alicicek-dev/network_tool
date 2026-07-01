import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { MoonIcon, SunIcon } from './Icons';
import type { Theme } from '../types';

export const ThemeSwitcher: React.FC = () => {
  const { theme, setTheme } = useTheme();

  const themes: { id: Theme; name: string; desc: string; icon: React.ReactNode }[] = [
    {
      id: 'dark',
      name: 'Koyu',
      desc: 'Sistem ile Uyumlu Koyu Tema',
      icon: <MoonIcon width="18" height="18" />,
    },
    {
      id: 'light',
      name: 'Açık',
      desc: 'Aydınlık ve Net Görünüm',
      icon: <SunIcon width="18" height="18" />,
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {themes.map((t) => {
        const isSelected = theme === t.id;
        return (
          <div
            key={t.id}
            onClick={() => setTheme(t.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 16px',
              borderRadius: '10px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              background: isSelected ? 'var(--nav-active-bg)' : 'var(--hover-overlay)',
              border: isSelected ? '1px solid var(--accent-color)' : '1px solid var(--border-subtle)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ color: isSelected ? 'var(--accent-color)' : 'var(--text-secondary)' }}>
                {t.icon}
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{t.name}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{t.desc}</div>
              </div>
            </div>
            {/* Radio circle */}
            <div
              style={{
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                border: isSelected ? '2px solid var(--accent-color)' : '2px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {isSelected && (
                <div style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: 'var(--accent-color)',
                }} />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

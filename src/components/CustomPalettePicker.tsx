import React from 'react';
import { useTheme } from '../context/ThemeContext';

const COLOR_GROUPS = [
  { key: '--bg-color', label: 'Genel Arka Plan', desc: 'Uygulama ve içerik zemini' },
  { key: '--panel-bg', label: 'Paneller ve Yan Menü', desc: 'Kartlar, paneller ve sidebar' },
  { key: '--panel-border', label: 'Kenarlıklar', desc: 'Tüm çizgi ve çerçeveler' },
  { key: '--text-primary', label: 'Ana Metin', desc: 'Başlıklar ve ana yazılar' },
  { key: '--text-secondary', label: 'İkincil Metin', desc: 'Açıklamalar ve alt yazılar' },
  { key: '--accent-color', label: 'Vurgu Rengi', desc: 'Aktif butonlar ve ana hatlar' },
  { key: '--success', label: 'Başarı Durumu', desc: 'Bağlı, başarılı, aktif' },
  { key: '--danger', label: 'Hata Durumu', desc: 'Kopuk, başarısız, hata' },
  { key: '--warning', label: 'Uyarı Durumu', desc: 'Bekliyor, uyarı' },
] as const;

export const CustomPalettePicker: React.FC = () => {
  const { customPalette, setCustomPalette, theme } = useTheme();
  const isDisabled = theme !== 'custom';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', opacity: isDisabled ? 0.4 : 1, pointerEvents: isDisabled ? 'none' : 'auto' }}>
      {isDisabled && (
        <div style={{
          padding: '10px 14px',
          borderRadius: '8px',
          background: 'rgba(116, 199, 236, 0.06)',
          border: '1px solid rgba(116, 199, 236, 0.15)',
          fontSize: '0.75rem',
          color: 'var(--accent-color)',
          lineHeight: 1.5,
        }}>
          Renk paletini özelleştirmek için önce "Özel" temayı seçin.
        </div>
      )}

      {COLOR_GROUPS.map(({ key, label, desc }) => {
        const rawValue = customPalette[key] || '#000000';
        const colorValue = rawValue.startsWith('#') && rawValue.length === 7 ? rawValue : '#000000';

        return (
          <div
            key={key}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px',
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '8px',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{label}</span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{desc}</span>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{
                fontSize: '0.7rem',
                fontFamily: 'monospace',
                color: 'var(--text-secondary)',
                background: 'rgba(0, 0, 0, 0.2)',
                padding: '4px 8px',
                borderRadius: '4px',
                width: '65px',
                textAlign: 'center'
              }}>
                {colorValue}
              </span>
              <label style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                cursor: 'pointer',
              }}>
                <input
                  type="color"
                  value={colorValue}
                  onChange={(e) =>
                    setCustomPalette({ ...customPalette, [key]: e.target.value })
                  }
                  style={{
                    position: 'absolute',
                    width: '1px',
                    height: '1px',
                    overflow: 'hidden',
                    opacity: 0,
                  }}
                />
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '6px',
                  background: colorValue,
                  border: '2px solid rgba(255, 255, 255, 0.1)',
                  cursor: 'pointer',
                  transition: 'box-shadow 0.2s ease',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                }} />
              </label>
            </div>
          </div>
        );
      })}
    </div>
  );
};

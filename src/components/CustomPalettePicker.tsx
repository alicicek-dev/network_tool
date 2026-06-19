import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { generateThemeFromPrimary } from '../utils/themeGenerator';

export const CustomPalettePicker: React.FC = () => {
  const { customPalette, setCustomPalette, theme } = useTheme();
  const isDisabled = theme !== 'custom';

  const primaryColor = customPalette['--primary-color'] || '#74c7ec';
  const generated = generateThemeFromPrimary(primaryColor);

  const handlePrimaryChange = (color: string) => {
    setCustomPalette({
      ...customPalette,
      '--primary-color': color,
    });
  };

  const handleReset = () => {
    setCustomPalette({
      ...customPalette,
      '--primary-color': '#74c7ec', // default accent sapphire blue
    });
  };

  const PREVIEW_KEYS = [
    { key: '--bg-color', label: 'Arka Plan', desc: 'Genel uygulama zemini', value: generated['--bg-color'] },
    { key: '--panel-bg', label: 'Paneller & Kartlar', desc: 'Kartlar ve menü zeminleri', value: generated['--panel-bg'] },
    { key: '--panel-border', label: 'Kenarlıklar', desc: 'Çerçeve ve ayırıcı çizgiler', value: generated['--panel-border'] },
    { key: '--text-primary', label: 'Ana Metin', desc: 'Okunabilir ana yazılar', value: generated['--text-primary'] },
    { key: '--text-secondary', label: 'İkincil Metin', desc: 'Muted alt yazılar', value: generated['--text-secondary'] },
    { key: '--accent-color', label: 'Vurgu Rengi', desc: 'Düğmeler ve aktif elemanlar', value: generated['--accent-color'] },
    { key: '--success', label: 'Başarı Durumu', desc: 'Aktif / başarılı bildirimleri', value: generated['--success'] },
    { key: '--danger', label: 'Hata Durumu', desc: 'Kopukluk / hata uyarıları', value: generated['--danger'] },
    { key: '--warning', label: 'Uyarı Durumu', desc: 'Bekleme / askıda kalma', value: generated['--warning'] },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', opacity: isDisabled ? 0.4 : 1, pointerEvents: isDisabled ? 'none' : 'auto' }}>
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

      {/* Main Accent Selector */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        padding: '14px',
        background: 'var(--card-bg)',
        border: '1px solid var(--panel-border)',
        borderRadius: '8px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>Tema Ana Rengi (Primary)</h4>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Seçtiğiniz bu renge göre tüm renk paleti uyumlu ve erişilebilir olarak üretilir.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{
              fontSize: '0.75rem',
              fontFamily: 'monospace',
              color: 'var(--text-secondary)',
              background: 'var(--input-bg)',
              padding: '6px 10px',
              borderRadius: '4px',
              border: '1px solid var(--panel-border)'
            }}>
              {primaryColor.toUpperCase()}
            </span>
            <label style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer', position: 'relative' }}>
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => handlePrimaryChange(e.target.value)}
                style={{ position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', opacity: 0 }}
              />
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '6px',
                background: primaryColor,
                border: '2px solid rgba(255, 255, 255, 0.15)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                cursor: 'pointer',
              }} />
            </label>
          </div>
        </div>

        <button
          onClick={handleReset}
          style={{
            alignSelf: 'flex-start',
            padding: '6px 12px',
            fontSize: '0.75rem',
            background: 'var(--hover-overlay)',
            color: 'var(--text-primary)',
            border: '1px solid var(--panel-border)',
            borderRadius: '6px',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          Varsayılana Sıfırla
        </button>
      </div>

      {/* Preview Header */}
      <div>
        <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Üretilen Renk Paleti Önizlemesi
        </h4>
      </div>

      {/* Grid of Preview Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '10px'
      }}>
        {PREVIEW_KEYS.map(({ key, label, desc, value }) => {
          // If value is rgba, parse or display directly
          const displayColor = value.startsWith('rgba') ? value : value.toUpperCase();
          const previewBackground = value; // rgba is directly usable as CSS background

          return (
            <div
              key={key}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                background: 'var(--card-bg)',
                border: '1px solid var(--panel-border)',
                borderRadius: '8px',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>{label}</span>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>{desc}</span>
                <span style={{ fontSize: '0.62rem', fontFamily: 'monospace', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  {displayColor}
                </span>
              </div>

              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '6px',
                background: previewBackground,
                border: '1px solid var(--panel-border)',
                boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.05)',
                flexShrink: 0
              }} />
            </div>
          );
        })}
      </div>
    </div>
  );
};

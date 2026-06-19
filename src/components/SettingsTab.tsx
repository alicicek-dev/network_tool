import { ThemeSwitcher } from './ThemeSwitcher';
import { CustomPalettePicker } from './CustomPalettePicker';
import { AccessibilityControls } from './AccessibilityControls';
import { ThemeResetButton } from './ThemeResetButton';
import { SetCurrentAsDefaultButton } from './SetCurrentAsDefaultButton';
import { useTheme } from '../context/ThemeContext';

export default function SettingsTab() {
  const { theme, palette } = useTheme();

  return (
    <div
      className="fade-in"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflowY: 'auto',
        padding: '0 8px 40px 8px',
      }}
    >
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px', fontSize: '0.8rem' }}>
        <span style={{ color: 'var(--text-secondary)', opacity: 0.7 }}>Ana Sayfa</span>
        <span style={{ opacity: 0.35 }}>/</span>
        <span style={{ color: 'var(--text-primary)' }}>Ayarlar</span>
      </div>

      {/* Main Settings Grid - 3 Column Layout */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '20px',
        maxWidth: '1200px',
        alignItems: 'start',
      }}>

        {/* Section 1: Görünüm ve Tema */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '4px' }}>Görünüm ve Tema</h3>
            <div style={{ width: '100%', height: '1px', background: 'var(--panel-border)', marginTop: '10px' }} />
          </div>

          <ThemeSwitcher />

          {/* Theme Variation Dropdown (disabled placeholder) */}
          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Tema Varyasyonu</span>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 14px',
                borderRadius: '8px',
                background: 'var(--input-bg)',
                border: '1px solid var(--border-subtle)',
                fontSize: '0.78rem',
                color: 'var(--text-secondary)',
                opacity: 0.6,
                cursor: 'not-allowed',
              }}
            >
              <span>Varsayılan</span>
              <svg width="10" height="6" viewBox="0 0 10 6" fill="none" style={{ opacity: 0.7 }}>
                <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
        </div>

        {/* Section 2: Erişilebilirlik */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '4px' }}>Erişilebilirlik</h3>
            <div style={{ width: '100%', height: '1px', background: 'var(--panel-border)', marginTop: '10px' }} />
          </div>

          <AccessibilityControls />
        </div>

        {/* Section 3: Renk Paleti Özelleştirme */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '4px' }}>Renk Paleti Özelleştirme</h3>
            <div style={{ width: '100%', height: '1px', background: 'var(--panel-border)', marginTop: '10px' }} />
          </div>

          {theme === 'custom' ? (
            <CustomPalettePicker />
          ) : (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              padding: '28px 20px',
              border: '1px dashed var(--border-subtle)',
              borderRadius: '10px',
              background: 'var(--input-bg)',
              margin: '12px 0',
            }}>
              {/* Palette SVG Icon */}
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--accent-color)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '12px', opacity: 0.5 }}>
                <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 14.7255 3.09032 17.1962 4.85857 19C5.32832 19.4697 5.21553 20.2452 4.80218 20.6586" />
                <path d="M12 22H9C7.34315 22 6 20.6569 6 19C6 17.3431 7.34315 16 9 16" />
                <circle cx="7.5" cy="10.5" r="1" fill="var(--accent-color)" />
                <circle cx="11.5" cy="7.5" r="1" fill="var(--accent-color)" />
                <circle cx="16.5" cy="9.5" r="1" fill="var(--accent-color)" />
              </svg>
              <p style={{ fontSize: '0.78rem', fontWeight: 600, marginBottom: '6px' }}>
                Renk paletini özelleştirmek için tema seçeneğini "Özel" yapın.
              </p>
              <p style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
                Açık veya Koyu varsayılan temalar kilitli paletler kullanır.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Live Preview Section */}
      <div className="glass-panel" style={{
        padding: '20px 24px',
        maxWidth: '1200px',
        marginTop: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
      }}>
        <h3 style={{ fontSize: '0.85rem', fontWeight: 700 }}>Canlı Önizleme</h3>
        <div style={{ width: '100%', height: '1px', background: 'var(--panel-border)' }} />

        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Color swatches */}
          {[
            { label: 'Arka Plan', color: palette['--bg-color'] },
            { label: 'Panel', color: palette['--panel-bg'] },
            { label: 'Vurgu', color: palette['--accent-color'] },
            { label: 'Metin', color: palette['--text-primary'] },
            { label: 'İkincil', color: palette['--text-secondary'] },
          ].map((swatch) => (
            <div key={swatch.label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '20px',
                height: '20px',
                borderRadius: '4px',
                background: swatch.color,
                border: '1px solid var(--border-subtle)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              }} />
              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{swatch.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Global Actions Footer */}
      <div className="glass-panel" style={{
        padding: '16px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        maxWidth: '1200px',
        marginTop: '16px',
        background: 'var(--input-bg)',
        flexWrap: 'wrap',
        gap: '12px',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 600 }}>Tüm Değişiklikler Otomatik Kaydedilir</span>
          <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
            Kalıcı olarak yerel bellekte saklanır.
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <ThemeResetButton />
          <SetCurrentAsDefaultButton />
        </div>
      </div>
    </div>
  );
}

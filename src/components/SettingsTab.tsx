import { ThemeSwitcher } from './ThemeSwitcher';
import { AccessibilityControls } from './AccessibilityControls';
import { ThemeResetButton } from './ThemeResetButton';
import { SetCurrentAsDefaultButton } from './SetCurrentAsDefaultButton';

export default function SettingsTab() {
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

      {/* Main Settings Grid - 2 Column Layout now that palette picker is removed */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
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
        </div>

        {/* Section 2: Erişilebilirlik */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '4px' }}>Erişilebilirlik</h3>
            <div style={{ width: '100%', height: '1px', background: 'var(--panel-border)', marginTop: '10px' }} />
          </div>

          <AccessibilityControls />
        </div>
      </div>

      {/* Global Actions Footer */}
      <div className="glass-panel" style={{
        padding: '16px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        maxWidth: '1200px',
        marginTop: '20px',
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

import { useState } from 'react';
import packageJson from '../../package.json';
import { AppIcon } from './Icons';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const compareVersions = (v1: string, v2: string): number => {
  const parts1 = v1.replace(/^v/, '').split('.').map(Number);
  const parts2 = v2.replace(/^v/, '').split('.').map(Number);
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;
    if (p1 > p2) return 1;
    if (p2 > p1) return -1;
  }
  return 0;
};

export default function AboutModal({ isOpen, onClose }: AboutModalProps) {
  const [isCheckingUpdates, setIsCheckingUpdates] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<string | null>(null);
  const [hasUpdate, setHasUpdate] = useState(false);
  const [latestReleaseUrl, setLatestReleaseUrl] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  if (!isOpen) return null;

  const appName = packageJson.build.productName || packageJson.name || 'NetTool';
  const author = typeof packageJson.author === 'object' ? (packageJson.author as any).name : packageJson.author || 'Ali Çiçek';
  const currentYear = new Date().getFullYear();
  const githubUrl = 'https://github.com/alicicek-dev/network_tool';

  const handleCheckUpdates = async () => {
    setIsCheckingUpdates(true);
    setUpdateStatus(null);
    setHasUpdate(false);
    setIsError(false);
    
    try {
      const response = await fetch('https://api.github.com/repos/alicicek-dev/network_tool/releases/latest', {
        headers: {
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      if (!response.ok) {
        throw new Error('Github API hatası');
      }
      const data = await response.json();
      const latestVersion = data.tag_name;
      const releaseUrl = data.html_url || githubUrl + '/releases';

      const currentVersion = packageJson.version;
      const comparison = compareVersions(latestVersion, currentVersion);
      
      if (comparison > 0) {
        setHasUpdate(true);
        setLatestReleaseUrl(releaseUrl);
        setUpdateStatus(`Yeni sürüm mevcut: ${latestVersion}`);
      } else {
        setHasUpdate(false);
        setUpdateStatus(`Uygulamanız güncel (v${currentVersion})`);
      }
    } catch (error) {
      console.error('Update check failed:', error);
      setIsError(true);
      setUpdateStatus('Güncelleme kontrolü başarısız oldu. İnternet bağlantısını denetleyin.');
    } finally {
      setIsCheckingUpdates(false);
    }
  };

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(8px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div 
        className="glass-panel"
        style={{
          width: '420px',
          padding: '30px',
          background: 'var(--panel-bg)',
          border: '1px solid var(--panel-border)',
          borderRadius: '12px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          animation: 'selectDropdownEnter 200ms cubic-bezier(0.23, 1, 0.32, 1) forwards'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button 
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '15px',
            right: '15px',
            background: 'transparent',
            color: 'var(--text-secondary)',
            border: 'none',
            fontSize: '1.2rem',
            cursor: 'pointer',
            padding: '5px',
            lineHeight: 1
          }}
          title="Kapat"
        >
          ×
        </button>

        {/* Logo */}
        <div style={{
          width: '72px',
          height: '72px',
          borderRadius: '16px',
          background: 'var(--hover-overlay)',
          border: '1px solid var(--panel-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '16px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
        }}>
          <AppIcon style={{ width: '48px', height: '48px' }} />
        </div>

        {/* App Title */}
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
          {appName}
        </h2>
        
        {/* Sub-text version */}
        <span style={{ 
          fontSize: '0.78rem', 
          fontFamily: 'monospace', 
          color: 'var(--accent-color)', 
          background: 'var(--nav-active-bg)', 
          padding: '3px 8px', 
          borderRadius: '4px',
          fontWeight: 600,
          marginBottom: '12px'
        }}>
          v{packageJson.version}
        </span>

        {/* Description */}
        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '20px' }}>
          {packageJson.description || 'Ağ mühendisleri ve yöneticileri için kapsamlı masaüstü araç seti.'}
        </p>

        {/* Info Grid */}
        <div style={{
          width: '100%',
          display: 'grid',
          gridTemplateColumns: '80px 1fr',
          gap: '8px',
          fontSize: '0.78rem',
          textAlign: 'left',
          padding: '12px',
          background: 'var(--input-bg)',
          borderRadius: '8px',
          border: '1px solid var(--panel-border)',
          marginBottom: '20px'
        }}>
          <span style={{ color: 'var(--text-secondary)' }}>Geliştirici:</span>
          <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{author}</span>

          <span style={{ color: 'var(--text-secondary)' }}>Lisans:</span>
          <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{packageJson.license || 'Miras'}</span>

          <span style={{ color: 'var(--text-secondary)' }}>Telif Hakkı:</span>
          <span style={{ color: 'var(--text-primary)' }}>© {currentYear} {author}</span>
        </div>

        {/* Auto-updater Section */}
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
          {hasUpdate ? (
            <button 
              onClick={() => latestReleaseUrl && window.electronAPI?.openExternal(latestReleaseUrl)}
              style={{
                width: '100%',
                padding: '10px',
                fontSize: '0.82rem',
                fontWeight: 600,
                background: 'var(--accent-color)',
                color: 'var(--bg-color)',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Güncellemeyi İndir (GitHub)
            </button>
          ) : (
            <button 
              onClick={handleCheckUpdates}
              disabled={isCheckingUpdates}
              style={{
                width: '100%',
                padding: '10px',
                fontSize: '0.82rem',
                fontWeight: 600,
                background: isCheckingUpdates ? 'var(--input-bg)' : 'var(--accent-color)',
                color: isCheckingUpdates ? 'var(--text-secondary)' : 'var(--bg-color)',
                border: isCheckingUpdates ? '1px solid var(--panel-border)' : 'none',
                borderRadius: '6px',
                cursor: isCheckingUpdates ? 'not-allowed' : 'pointer'
              }}
            >
              {isCheckingUpdates ? 'Güncellemeler denetleniyor...' : 'Güncellemeleri Kontrol Et'}
            </button>
          )}
          {updateStatus && (
            <span style={{ 
              fontSize: '0.72rem', 
              color: isError ? 'var(--danger)' : (hasUpdate ? 'var(--accent-color)' : 'var(--success)'), 
              fontWeight: 500 
            }}>
              {updateStatus}
            </span>
          )}
        </div>

        {/* Links */}
        <div style={{ width: '100%', height: '1px', background: 'var(--panel-border)', marginBottom: '14px' }} />
        
        <div style={{ display: 'flex', gap: '16px', fontSize: '0.78rem', justifyContent: 'center' }}>
          <a 
            href={githubUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            style={{ color: 'var(--accent-color)', textDecoration: 'none', fontWeight: 500 }}
            onClick={(e) => { e.preventDefault(); window.electronAPI?.openExternal(githubUrl); }}
          >
            GitHub
          </a>
        </div>
      </div>
    </div>
  );
}

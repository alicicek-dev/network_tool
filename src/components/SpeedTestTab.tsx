import { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';

interface Props {
  socket: Socket;
}

export default function SpeedTestTab({ socket }: Props) {
  const [status, setStatus] = useState('Hazır');
  const [ping, setPing] = useState(0);
  const [download, setDownload] = useState(0);
  const [upload, setUpload] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    socket.on('speedtest-update', (data) => {
      setStatus(`Test ediliyor: ${data.phase.toUpperCase()}`);
      setProgress(data.progress);
      if (data.phase === 'ping' && data.result) setPing(data.result);
      if (data.phase === 'download' && data.result) setDownload(data.result);
      if (data.phase === 'upload' && data.result) setUpload(data.result);
    });

    socket.on('speedtest-complete', (data) => {
      setStatus('Tamamlandı');
      setIsTesting(false);
      setPing(data.ping);
      setDownload(data.download);
      setUpload(data.upload);
      setProgress(100);
    });

    socket.on('speedtest-error', (data) => {
      setStatus(`Hata: ${data.error}`);
      setIsTesting(false);
    });

    return () => {
      socket.off('speedtest-update');
      socket.off('speedtest-complete');
      socket.off('speedtest-error');
    }
  }, [socket]);

  const startTest = () => {
    setPing(0);
    setDownload(0);
    setUpload(0);
    setProgress(0);
    setIsTesting(true);
    setStatus('Sunucuya bağlanıyor...');
    socket.emit('start-speedtest');
  };

  return (
    <div className="fade-in" style={{display: 'flex', flexDirection: 'column', height: '100%', alignItems: 'center', justifyContent: 'center'}}>
      <h1>Speed Test</h1>
      <div className="glass-panel" style={{padding: '40px', width: '500px', textAlign: 'center', borderRadius: '15px'}}>
        
        <div style={{fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '30px', background: 'rgba(0,0,0,0.2)', padding: '15px', borderRadius: '8px', borderLeft: '3px solid var(--primary)', textAlign: 'left'}}>
          <strong>Cloudflare Edge Ağı</strong> üzerinden test yapılmaktadır. Cihazınız ile size en yakın Cloudflare veri merkezi arasında (çoklu bağlantıyla) kesintisiz 20 saniyelik stres testi uygulanarak gerçek kapasiteniz ölçülür.
        </div>
        
        <div style={{fontSize: '1.2rem', color: 'var(--text-secondary)', marginBottom: '20px'}}>
          {status}
        </div>

        <div style={{width: '100%', background: 'rgba(0,0,0,0.3)', height: '10px', borderRadius: '5px', overflow: 'hidden', marginBottom: '30px'}}>
          <div style={{width: `${progress}%`, background: 'var(--primary)', height: '100%', transition: 'width 0.3s ease'}}></div>
        </div>

        <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '40px'}}>
          <div className="stat-card" style={{flex: 1, margin: '0 10px', background: 'rgba(0,0,0,0.2)'}}>
            <div className="stat-label">Ping</div>
            <div className="stat-value">{ping ? `${ping} ms` : '-'}</div>
          </div>
          <div className="stat-card" style={{flex: 1, margin: '0 10px', background: 'rgba(0,0,0,0.2)'}}>
            <div className="stat-label">Download</div>
            <div className="stat-value" style={{color: 'var(--primary)'}}>{download ? `${download} Mbps` : '-'}</div>
          </div>
          <div className="stat-card" style={{flex: 1, margin: '0 10px', background: 'rgba(0,0,0,0.2)'}}>
            <div className="stat-label">Upload</div>
            <div className="stat-value" style={{color: 'var(--success)'}}>{upload ? `${upload} Mbps` : '-'}</div>
          </div>
        </div>

        <button 
          onClick={startTest} 
          disabled={isTesting}
          style={{padding: '15px 40px', fontSize: '1.2rem', borderRadius: '30px'}}
        >
          {isTesting ? 'Test Ediliyor...' : 'Testi Başlat'}
        </button>
      </div>
    </div>
  );
}

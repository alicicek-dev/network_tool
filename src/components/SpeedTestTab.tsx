import { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';

interface Props {
  socket: Socket;
}

interface SpeedTestHistory {
  timestamp: string;
  ping: number;
  download: number;
  upload: number;
}

export default function SpeedTestTab({ socket }: Props) {
  const [status, setStatus] = useState('Ready');
  const [ping, setPing] = useState(0);
  const [download, setDownload] = useState(0);
  const [upload, setUpload] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isTesting, setIsTesting] = useState(false);
  const [history, setHistory] = useState<SpeedTestHistory[]>([]);

  useEffect(() => {
    socket.on('speedtest-update', (data) => {
      setStatus(`Testing: ${data.phase.toUpperCase()}`);
      setProgress(data.progress);
      if (data.phase === 'ping' && data.result) setPing(data.result);
      if (data.phase === 'download' && data.result) setDownload(data.result);
      if (data.phase === 'upload' && data.result) setUpload(data.result);
    });

    socket.on('speedtest-complete', (data) => {
      setStatus('Completed');
      setIsTesting(false);
      setPing(data.ping);
      setDownload(data.download);
      setUpload(data.upload);
      setProgress(100);
      
      const now = new Date();
      setHistory(prev => [{
        timestamp: now.toLocaleDateString() + ' ' + now.toLocaleTimeString(),
        ping: data.ping,
        download: data.download,
        upload: data.upload
      }, ...prev]);
    });

    socket.on('speedtest-error', (data) => {
      setStatus(`Error: ${data.error}`);
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
    setStatus('Connecting to server...');
    socket.emit('start-speedtest');
  };

  return (
    <div className="fade-in" style={{display: 'flex', flexDirection: 'column', height: '100%', alignItems: 'center', justifyContent: 'flex-start', overflowY: 'auto', paddingTop: '40px', paddingBottom: '40px'}}>
      <h1 style={{marginBottom: '20px'}}>Speed Test</h1>
      <div className="glass-panel" style={{padding: '40px', width: '600px', textAlign: 'center', borderRadius: '15px', marginBottom: '30px'}}>
        
        <div style={{fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '30px', background: 'var(--input-bg)', padding: '15px', borderRadius: '8px', borderLeft: '3px solid var(--accent-color)', textAlign: 'left'}}>
          Testing is conducted over the <strong>Cloudflare Edge Network</strong>. Real capacity is measured using multi-threaded stress tests between your device and the closest datacenters.
        </div>
        
        <div style={{fontSize: '1.2rem', color: 'var(--text-secondary)', marginBottom: '20px'}}>
          {status}
        </div>

        <div style={{width: '100%', background: 'var(--input-bg)', height: '10px', borderRadius: '5px', overflow: 'hidden', marginBottom: '30px'}}>
          <div style={{width: `${progress}%`, background: 'var(--accent-color)', height: '100%', transition: 'width 0.3s ease'}}></div>
        </div>

        <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '40px'}}>
          <div className="stat-card" style={{flex: 1, margin: '0 10px', background: 'var(--input-bg)'}}>
            <div className="stat-label">Ping</div>
            <div className="stat-value">{ping ? `${ping} ms` : '-'}</div>
          </div>
          <div className="stat-card" style={{flex: 1, margin: '0 10px', background: 'var(--input-bg)'}}>
            <div className="stat-label">Download</div>
            <div className="stat-value" style={{color: 'var(--accent-color)'}}>
              {download ? <>{(status === 'Completed' || status.includes('UPLOAD')) && <span style={{fontSize: '0.9rem', color: 'var(--text-secondary)'}}>Max: </span>}{download} Mbps</> : '-'}
            </div>
          </div>
          <div className="stat-card" style={{flex: 1, margin: '0 10px', background: 'var(--input-bg)'}}>
            <div className="stat-label">Upload</div>
            <div className="stat-value" style={{color: 'var(--success)'}}>
              {upload ? <>{status === 'Completed' && <span style={{fontSize: '0.9rem', color: 'var(--text-secondary)'}}>Max: </span>}{upload} Mbps</> : '-'}
            </div>
          </div>
        </div>

        <button 
          onClick={startTest} 
          disabled={isTesting}
          style={{padding: '15px 40px', fontSize: '1.2rem', borderRadius: '30px'}}
        >
          {isTesting ? 'Testing...' : 'Start Test'}
        </button>
      </div>

      {history.length > 0 && (
        <div className="glass-panel" style={{padding: '20px', width: '600px', borderRadius: '15px'}}>
          <h3 style={{marginBottom: '15px', color: 'var(--text-primary)', textAlign: 'left'}}>Test History</h3>
          <div style={{background: 'var(--input-bg)', borderRadius: '10px', overflow: 'hidden'}}>
            <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem'}}>
              <thead>
                <tr style={{background: 'var(--hover-overlay)', color: 'var(--text-secondary)'}}>
                  <th style={{padding: '12px', textAlign: 'left'}}>Date & Time</th>
                  <th style={{padding: '12px', textAlign: 'center'}}>Ping</th>
                  <th style={{padding: '12px', textAlign: 'center'}}>Download</th>
                  <th style={{padding: '12px', textAlign: 'center'}}>Upload</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h, i) => (
                  <tr key={i} style={{borderTop: '1px solid var(--border-subtle)'}}>
                    <td style={{padding: '12px'}}>{h.timestamp}</td>
                    <td style={{padding: '12px', textAlign: 'center'}}>{h.ping} ms</td>
                    <td style={{padding: '12px', textAlign: 'center', color: 'var(--accent-color)', fontWeight: 'bold'}}>{h.download} Mbps</td>
                    <td style={{padding: '12px', textAlign: 'center', color: 'var(--success)', fontWeight: 'bold'}}>{h.upload} Mbps</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

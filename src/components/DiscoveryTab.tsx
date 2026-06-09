import { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';

interface Props {
  socket: Socket;
}

export default function DiscoveryTab({ socket }: Props) {
  // Sweep State
  const [sweepSubnet, setSweepSubnet] = useState('192.168.1');
  const [sweepResults, setSweepResults] = useState<{ip: string, time: number}[]>([]);
  const [isSweeping, setIsSweeping] = useState(false);

  // Port Scan State
  const [scanHost, setScanHost] = useState('');
  const [scanPorts, setScanPorts] = useState('21,22,23,25,53,80,110,135,139,143,443,445,3389');
  const [portResults, setPortResults] = useState<{port: number, status: string}[]>([]);
  const [isScanning, setIsScanning] = useState(false);

  // ARP State
  const [arpTable, setArpTable] = useState<{ip: string, mac: string, type: string}[]>([]);
  const [isLoadingArp, setIsLoadingArp] = useState(false);

  useEffect(() => {
    socket.on('sweep-result', (data) => {
      setSweepResults(prev => {
        if (!prev.find(p => p.ip === data.ip)) return [...prev, data];
        return prev;
      });
    });
    socket.on('port-scan-result', (data) => {
      setPortResults(prev => {
        const p = [...prev.filter(x => x.port !== data.port), data];
        return p.sort((a,b) => a.port - b.port);
      });
    });
    return () => {
      socket.off('sweep-result');
      socket.off('port-scan-result');
    }
  }, [socket]);

  const handleStartSweep = () => {
    setSweepResults([]);
    setIsSweeping(true);
    socket.emit('start-sweep', sweepSubnet);
    setTimeout(() => setIsSweeping(false), 5000);
  };

  const handleStartPortScan = () => {
    if (!scanHost) return;
    setPortResults([]);
    setIsScanning(true);
    const ports = scanPorts.split(',').map(p => parseInt(p.trim())).filter(p => !isNaN(p));
    socket.emit('start-port-scan', { host: scanHost, ports });
    setTimeout(() => setIsScanning(false), 3000);
  };

  const handleFetchArp = async () => {
    setIsLoadingArp(true);
    try {
      const res = await fetch('http://localhost:3001/api/arp');
      const data = await res.json();
      setArpTable(data);
    } catch(e) {
      console.error(e);
    }
    setIsLoadingArp(false);
  };

  return (
    <div className="fade-in" style={{display: 'flex', flexDirection: 'column', height: '100%'}}>
      <h1>Network Discovery</h1>
      <div className="dashboard-grid" style={{gridTemplateColumns: '1fr 1fr 1fr'}}>
        
        {/* PING SWEEP */}
        <div className="glass-panel stat-card" style={{display: 'flex', flexDirection: 'column'}}>
          <h3>Local IP Scanner</h3>
          <p style={{color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '10px', marginBottom: '15px'}}>Ağınızdaki aktif cihazları bulun (/24).</p>
          <div style={{display: 'flex', gap: '5px', marginBottom: '10px'}}>
            <input 
              type="text" 
              placeholder="Örn: 192.168.1" 
              value={sweepSubnet}
              onChange={(e) => setSweepSubnet(e.target.value)}
              className="ui-input"
              style={{flex: 1}}
            />
            <button onClick={handleStartSweep} disabled={isSweeping}>{isSweeping ? '...' : 'Tara'}</button>
          </div>
          <div className="scroll-box">
            {sweepResults.length === 0 ? (
              <span className="placeholder-text">Sonuçlar burada listelenecek...</span>
            ) : (
              sweepResults.map((res, i) => (
                <div key={i} className="list-item">
                  <span style={{color: 'var(--primary)'}}>{res.ip}</span>
                  <span style={{color: 'var(--success)'}}>{res.time}ms</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* PORT SCANNER */}
        <div className="glass-panel stat-card" style={{display: 'flex', flexDirection: 'column'}}>
          <h3>Port Scanner</h3>
          <p style={{color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '10px', marginBottom: '15px'}}>Hedef IP'deki açık portları tarayın.</p>
          <input 
            type="text" 
            placeholder="Hedef IP veya Host" 
            value={scanHost}
            onChange={(e) => setScanHost(e.target.value)}
            className="ui-input"
            style={{marginBottom: '5px'}}
          />
          <div style={{display: 'flex', gap: '5px', marginBottom: '10px'}}>
            <input 
              type="text" 
              placeholder="Portlar (Virgülle)" 
              value={scanPorts}
              onChange={(e) => setScanPorts(e.target.value)}
              className="ui-input"
              style={{flex: 1}}
            />
            <button onClick={handleStartPortScan} disabled={isScanning}>{isScanning ? '...' : 'Tara'}</button>
          </div>
          <div className="scroll-box">
            {portResults.length === 0 ? (
              <span className="placeholder-text">Taranan portlar...</span>
            ) : (
              portResults.map((res, i) => (
                <div key={i} className="list-item">
                  <span>Port {res.port}</span>
                  <span style={{color: res.status === 'open' ? 'var(--success)' : (res.status === 'closed' ? 'var(--danger)' : 'var(--warning)')}}>{res.status.toUpperCase()}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ARP TABLE */}
        <div className="glass-panel stat-card" style={{display: 'flex', flexDirection: 'column'}}>
          <h3>ARP Table</h3>
          <p style={{color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '10px', marginBottom: '15px'}}>İşletim sisteminizin ARP önbelleği.</p>
          <button onClick={handleFetchArp} disabled={isLoadingArp} style={{marginBottom: '10px', width: '100%', background: 'var(--panel-border)', color: 'white'}}>
            {isLoadingArp ? '...' : 'ARP Tablosunu Getir'}
          </button>
          <div className="scroll-box">
            {arpTable.length === 0 ? (
              <span className="placeholder-text">Henüz çekilmedi...</span>
            ) : (
              arpTable.map((res, i) => (
                <div key={i} className="list-item" style={{flexDirection: 'column', alignItems: 'flex-start'}}>
                  <div style={{display: 'flex', justifyContent: 'space-between', width: '100%'}}>
                    <span style={{color: 'var(--primary)'}}>{res.ip}</span>
                    <span style={{fontSize: '0.8rem', color: 'gray'}}>{res.type}</span>
                  </div>
                  <span style={{fontSize: '0.85rem', color: 'var(--text-secondary)'}}>{res.mac}</span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

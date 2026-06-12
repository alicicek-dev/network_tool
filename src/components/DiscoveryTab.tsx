import { useState, useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { CopyIcon } from './Icons';

interface Props {
  socket: Socket;
  defaultSubnet?: string;
}

// Helper to convert IP to numerical value for sorting
const ipToInt = (ip: string) => {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(isNaN)) return 0;
  return parts.reduce((acc, octet) => acc * 256 + octet, 0);
};

export default function DiscoveryTab({ socket, defaultSubnet }: Props) {
  // Navigation sub-tab
  const [activeSubTab, setActiveSubTab] = useState<'ip' | 'port' | 'arp'>('ip');

  // Sweep State
  const [sweepSubnet, setSweepSubnet] = useState(defaultSubnet || '192.168.1');

  useEffect(() => {
    if (defaultSubnet) {
      setSweepSubnet(defaultSubnet);
    }
  }, [defaultSubnet]);
  const [sweepResults, setSweepResults] = useState<{ip: string, time: number}[]>([]);
  const [isSweeping, setIsSweeping] = useState(false);

  // Port Scan State
  const [scanHost, setScanHost] = useState('');
  const [scanPorts, setScanPorts] = useState('21,22,23,25,53,80,110,135,139,143,443,445,3389');
  const [portResults, setPortResults] = useState<{port: number, status: string}[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [expectedPortsCount, setExpectedPortsCount] = useState(0);
  const scanTimeoutRef = useRef<any>(null);
  const sweepTimeoutRef = useRef<any>(null);

  // ARP State
  const [arpTable, setArpTable] = useState<{ip: string, mac: string, type: string}[]>([]);
  const [isLoadingArp, setIsLoadingArp] = useState(false);
  const [copiedMac, setCopiedMac] = useState<string | null>(null);
  const [copiedIp, setCopiedIp] = useState<string | null>(null);

  useEffect(() => {
    socket.on('sweep-result', (data) => {
      setSweepResults(prev => {
        if (prev.find(p => p.ip === data.ip)) return prev;
        const newList = [...prev, data];
        return newList.sort((a, b) => ipToInt(a.ip) - ipToInt(b.ip));
      });
    });

    socket.on('sweep-complete', () => {
      setIsSweeping(false);
      if (sweepTimeoutRef.current) {
        clearTimeout(sweepTimeoutRef.current);
        sweepTimeoutRef.current = null;
      }
    });

    socket.on('port-scan-result', (data) => {
      setPortResults(prev => {
        const p = [...prev.filter(x => x.port !== data.port), data];
        // Sort priority: open (1) -> filtered (2) -> closed (3)
        const priority: Record<string, number> = { 'open': 1, 'filtered': 2, 'closed': 3 };
        return p.sort((a, b) => {
          const prioA = priority[a.status] || 99;
          const prioB = priority[b.status] || 99;
          if (prioA !== prioB) return prioA - prioB;
          return a.port - b.port;
        });
      });
    });

    return () => {
      socket.off('sweep-result');
      socket.off('sweep-complete');
      socket.off('port-scan-result');
      if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);
      if (sweepTimeoutRef.current) clearTimeout(sweepTimeoutRef.current);
    }
  }, [socket]);

  // Handle auto-stop when all expected port replies are received
  useEffect(() => {
    if (isScanning && expectedPortsCount > 0 && portResults.length >= expectedPortsCount) {
      setIsScanning(false);
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
        scanTimeoutRef.current = null;
      }
    }
  }, [portResults, isScanning, expectedPortsCount]);

  const handleStartSweep = () => {
    setSweepResults([]);
    setIsSweeping(true);
    socket.emit('start-sweep', sweepSubnet);
    if (sweepTimeoutRef.current) clearTimeout(sweepTimeoutRef.current);
    // 30 seconds fallback safety timeout
    sweepTimeoutRef.current = setTimeout(() => {
      setIsSweeping(false);
      sweepTimeoutRef.current = null;
    }, 30000);
  };

  const handleStopSweep = () => {
    socket.emit('stop-sweep');
    setIsSweeping(false);
    if (sweepTimeoutRef.current) {
      clearTimeout(sweepTimeoutRef.current);
      sweepTimeoutRef.current = null;
    }
  };

  const handleStartPortScan = () => {
    if (!scanHost) return;
    setPortResults([]);
    setIsScanning(true);

    // Parse ports with range support (e.g. 21,22,80-100)
    const ports: number[] = [];
    const parts = scanPorts.split(',');
    for (const part of parts) {
      const trimmed = part.trim();
      if (trimmed.includes('-')) {
        const rangeParts = trimmed.split('-');
        const start = parseInt(rangeParts[0]);
        const end = parseInt(rangeParts[1]);
        if (!isNaN(start) && !isNaN(end) && start <= end) {
          // Limit range size to a max of 5000 ports to prevent system resource issues
          const limit = Math.min(end, start + 5000);
          for (let p = start; p <= limit; p++) {
            ports.push(p);
          }
        }
      } else {
        const p = parseInt(trimmed);
        if (!isNaN(p)) {
          ports.push(p);
        }
      }
    }

    const uniquePorts = Array.from(new Set(ports)).filter(p => p >= 1 && p <= 65535);

    if (uniquePorts.length === 0) {
      setIsScanning(false);
      return;
    }

    setExpectedPortsCount(uniquePorts.length);
    socket.emit('start-port-scan', { host: scanHost, ports: uniquePorts });

    // Fallback safety timeout (e.g. 45 seconds max for large scans)
    if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);
    scanTimeoutRef.current = setTimeout(() => {
      setIsScanning(false);
    }, 45000);
  };

  const handleStopPortScan = () => {
    socket.emit('stop-port-scan');
    setIsScanning(false);
    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
      scanTimeoutRef.current = null;
    }
  };

  const handleFetchArp = async () => {
    setIsLoadingArp(true);
    try {
      const res = await fetch('http://localhost:3001/api/arp');
      const data = await res.json();
      // Sort data by IP address numerically (ascending)
      const sorted = data.sort((a: any, b: any) => ipToInt(a.ip) - ipToInt(b.ip));
      setArpTable(sorted);
    } catch(e) {
      console.error(e);
    }
    setIsLoadingArp(false);
  };

  const handleCopyMac = (mac: string) => {
    navigator.clipboard.writeText(mac).then(() => {
      setCopiedMac(mac);
      setTimeout(() => setCopiedMac(null), 1500);
    });
  };

  const handleCopyIp = (ip: string) => {
    navigator.clipboard.writeText(ip).then(() => {
      setCopiedIp(ip);
      setTimeout(() => setCopiedIp(null), 1500);
    });
  };

  return (
    <div className="fade-in" style={{display: 'flex', flexDirection: 'column', height: '100%', gap: '15px'}}>
      
      {/* Header & Sub-Tab Control */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Network Discovery</h1>
        
        {/* Segmented Sub-Tab Control */}
        <div style={{ display: 'flex', gap: '8px', background: 'rgba(0,0,0,0.2)', padding: '4px', borderRadius: '20px', border: '1px solid var(--panel-border)' }}>
          <button 
            onClick={() => setActiveSubTab('ip')} 
            disabled={isSweeping || isScanning || isLoadingArp}
            style={{
              background: activeSubTab === 'ip' ? 'var(--accent-color)' : 'transparent',
              color: activeSubTab === 'ip' ? '#11111b' : 'var(--text-primary)',
              border: 'none',
              borderRadius: '16px',
              padding: '6px 16px',
              fontSize: '0.85rem',
              cursor: (isSweeping || isScanning || isLoadingArp) ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              fontWeight: '600'
            }}
          >
            IP Scanner
          </button>
          <button 
            onClick={() => setActiveSubTab('port')} 
            disabled={isSweeping || isScanning || isLoadingArp}
            style={{
              background: activeSubTab === 'port' ? 'var(--accent-color)' : 'transparent',
              color: activeSubTab === 'port' ? '#11111b' : 'var(--text-primary)',
              border: 'none',
              borderRadius: '16px',
              padding: '6px 16px',
              fontSize: '0.85rem',
              cursor: (isSweeping || isScanning || isLoadingArp) ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              fontWeight: '600'
            }}
          >
            Port Scanner
          </button>
          <button 
            onClick={() => setActiveSubTab('arp')} 
            disabled={isSweeping || isScanning || isLoadingArp}
            style={{
              background: activeSubTab === 'arp' ? 'var(--accent-color)' : 'transparent',
              color: activeSubTab === 'arp' ? '#11111b' : 'var(--text-primary)',
              border: 'none',
              borderRadius: '16px',
              padding: '6px 16px',
              fontSize: '0.85rem',
              cursor: (isSweeping || isScanning || isLoadingArp) ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              fontWeight: '600'
            }}
          >
            ARP Table
          </button>
        </div>
      </div>

      {/* --- IP SCANNER VIEW --- */}
      {activeSubTab === 'ip' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', flex: 1, minHeight: 0 }}>
          {/* Controls */}
          <div className="glass-panel" style={{ padding: '15px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <h3 style={{ fontSize: '1.1rem' }}>Local IP Scanner</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Scan and find active devices on your local subnet (/24 network range).
            </p>
            <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
              <input 
                type="text" 
                placeholder="e.g. 192.168.1" 
                value={sweepSubnet}
                onChange={(e) => setSweepSubnet(e.target.value)}
                className="ui-input"
                style={{ flex: 1, margin: 0 }}
                onKeyDown={(e) => e.key === 'Enter' && !isSweeping && handleStartSweep()}
              />
              <button 
                onClick={isSweeping ? handleStopSweep : handleStartSweep} 
                style={{ 
                  width: '120px',
                  background: isSweeping ? 'var(--danger)' : 'var(--accent-color)',
                  color: isSweeping ? '#ffffff' : '#11111b'
                }}
              >
                {isSweeping ? 'Stop' : 'Scan'}
              </button>
            </div>
          </div>

          {/* Results Table */}
          <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '15px', minHeight: 0 }}>
            <h3 style={{ marginBottom: '10px' }}>Discovered Devices</h3>
            <div style={{ flex: 1, overflowY: 'auto', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-secondary)', borderBottom: '1px solid var(--panel-border)' }}>
                    <th style={{ padding: '10px 12px', width: '60px', textAlign: 'center' }}>Status</th>
                    <th style={{ padding: '10px 12px' }}>IP Address</th>
                    <th style={{ padding: '10px 12px' }}>Response Time</th>
                  </tr>
                </thead>
                <tbody>
                  {sweepResults.map((res, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                        <span style={{ 
                          display: 'inline-block', 
                          width: '8px', 
                          height: '8px', 
                          borderRadius: '50%', 
                          background: 'var(--success)',
                          boxShadow: '0 0 6px var(--success)'
                        }} />
                      </td>
                      <td 
                        onClick={() => handleCopyIp(res.ip)}
                        title="Click to copy IP Address"
                        style={{ 
                          padding: '8px 12px', 
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          transition: 'color 0.2s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent-color)'}
                        onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
                      >
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', position: 'relative', width: '100%' }}>
                          <span>{res.ip}</span>
                          <CopyIcon width="12" height="12" style={{ opacity: 0.5 }} />
                          {copiedIp === res.ip && (
                            <span style={{
                              position: 'absolute',
                              left: '140px',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              fontSize: '0.7rem',
                              color: '#11111b',
                              background: 'var(--success)',
                              padding: '1px 6px',
                              borderRadius: '4px',
                              fontWeight: '600',
                              boxShadow: '0 0 8px var(--success)',
                              zIndex: 10,
                              whiteSpace: 'nowrap'
                            }}>
                              Copied
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '8px 12px', color: 'var(--success)' }}>{res.time} ms</td>
                    </tr>
                  ))}
                  {sweepResults.length === 0 && (
                    <tr>
                      <td colSpan={3} style={{ padding: '20px', textAlign: 'center', color: 'gray' }}>
                        {isSweeping ? 'Scanning subnet...' : 'No scan results. Enter subnet prefix above and click Scan.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* --- PORT SCANNER VIEW --- */}
      {activeSubTab === 'port' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', flex: 1, minHeight: 0 }}>
          {/* Controls */}
          <div className="glass-panel" style={{ padding: '15px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <h3 style={{ fontSize: '1.1rem' }}>Port Scanner</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Scan for open TCP ports on a specific target host or IP address.
            </p>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '5px' }}>
              <input 
                type="text" 
                placeholder="Target IP or Host" 
                value={scanHost}
                onChange={(e) => setScanHost(e.target.value)}
                className="ui-input"
                style={{ flex: 1.5, minWidth: '150px', margin: 0 }}
                disabled={isScanning}
                onKeyDown={(e) => e.key === 'Enter' && !isScanning && handleStartPortScan()}
              />
              <input 
                type="text" 
                placeholder="Ports (e.g. 80,443 or range 1-1024)" 
                value={scanPorts}
                onChange={(e) => setScanPorts(e.target.value)}
                className="ui-input"
                style={{ flex: 2, minWidth: '200px', margin: 0 }}
                disabled={isScanning}
                onKeyDown={(e) => e.key === 'Enter' && !isScanning && handleStartPortScan()}
              />
              <button 
                onClick={isScanning ? handleStopPortScan : handleStartPortScan} 
                style={{ 
                  minWidth: '120px',
                  background: isScanning ? 'var(--danger)' : 'var(--accent-color)',
                  color: isScanning ? '#ffffff' : '#11111b'
                }}
              >
                {isScanning ? `Stop (${portResults.length}/${expectedPortsCount})` : 'Scan'}
              </button>
            </div>

            {/* Quick Presets Buttons */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              <button 
                type="button" 
                onClick={() => setScanPorts('21,22,23,25,53,80,110,135,139,143,443,445,3389')}
                disabled={isScanning}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--panel-border)',
                  borderRadius: '6px',
                  color: 'var(--text-secondary)',
                  padding: '4px 10px',
                  fontSize: '0.75rem',
                  cursor: isScanning ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  width: 'auto'
                }}
                onMouseEnter={e => !isScanning && (e.currentTarget.style.borderColor = 'var(--accent-color)', e.currentTarget.style.color = 'var(--text-primary)')}
                onMouseLeave={e => !isScanning && (e.currentTarget.style.borderColor = 'var(--panel-border)', e.currentTarget.style.color = 'var(--text-secondary)')}
              >
                Common Ports
              </button>
              <button 
                type="button" 
                onClick={() => setScanPorts('1-1024')}
                disabled={isScanning}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--panel-border)',
                  borderRadius: '6px',
                  color: 'var(--text-secondary)',
                  padding: '4px 10px',
                  fontSize: '0.75rem',
                  cursor: isScanning ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  width: 'auto'
                }}
                onMouseEnter={e => !isScanning && (e.currentTarget.style.borderColor = 'var(--accent-color)', e.currentTarget.style.color = 'var(--text-primary)')}
                onMouseLeave={e => !isScanning && (e.currentTarget.style.borderColor = 'var(--panel-border)', e.currentTarget.style.color = 'var(--text-secondary)')}
              >
                Well-known (1-1024)
              </button>
              <button 
                type="button" 
                onClick={() => setScanPorts('1-65535')}
                disabled={isScanning}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--panel-border)',
                  borderRadius: '6px',
                  color: 'var(--text-secondary)',
                  padding: '4px 10px',
                  fontSize: '0.75rem',
                  cursor: isScanning ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  width: 'auto'
                }}
                onMouseEnter={e => !isScanning && (e.currentTarget.style.borderColor = 'var(--accent-color)', e.currentTarget.style.color = 'var(--text-primary)')}
                onMouseLeave={e => !isScanning && (e.currentTarget.style.borderColor = 'var(--panel-border)', e.currentTarget.style.color = 'var(--text-secondary)')}
              >
                All Ports (1-65535)
              </button>
            </div>
          </div>

          {/* Results Table */}
          <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '15px', minHeight: 0 }}>
            <h3 style={{ marginBottom: '10px' }}>Port Scan Status</h3>
            <div style={{ flex: 1, overflowY: 'auto', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-secondary)', borderBottom: '1px solid var(--panel-border)' }}>
                    <th style={{ padding: '10px 12px' }}>Port</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center', width: '100px' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {portResults.map((res, i) => {
                    let statusColor = 'var(--text-secondary)';
                    if (res.status === 'open') statusColor = 'var(--success)';
                    else if (res.status === 'closed') statusColor = 'var(--danger)';
                    else if (res.status === 'filtered') statusColor = 'var(--warning)';

                    return (
                      <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                        <td style={{ padding: '8px 12px', fontWeight: 'bold' }}>Port {res.port}</td>
                        <td style={{ 
                          padding: '8px 12px', 
                          textAlign: 'center', 
                          fontWeight: '600',
                          color: statusColor
                        }}>
                          {res.status.toUpperCase()}
                        </td>
                      </tr>
                    );
                  })}
                  {portResults.length === 0 && (
                    <tr>
                      <td colSpan={2} style={{ padding: '20px', textAlign: 'center', color: 'gray' }}>
                        {isScanning ? `Scanning ports... (${portResults.length}/${expectedPortsCount})` : 'No scan results. Enter target host and ports above, then click Scan.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* --- ARP TABLE VIEW --- */}
      {activeSubTab === 'arp' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', flex: 1, minHeight: 0 }}>
          {/* Controls */}
          <div className="glass-panel" style={{ padding: '15px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <h3 style={{ fontSize: '1.1rem' }}>ARP Table</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Retrieve the local Address Resolution Protocol (ARP) table containing IP-to-MAC address mappings.
            </p>
            <div style={{ marginTop: '5px' }}>
              <button 
                onClick={handleFetchArp} 
                disabled={isLoadingArp} 
                style={{ width: '100%', background: 'var(--panel-border)', color: 'white', height: '42px' }}
              >
                {isLoadingArp ? 'Fetching...' : 'Fetch ARP Table'}
              </button>
            </div>
          </div>

          {/* Results Table */}
          <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '15px', minHeight: 0 }}>
            <h3 style={{ marginBottom: '10px' }}>ARP Cache Mapping</h3>
            <div style={{ flex: 1, overflowY: 'auto', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-secondary)', borderBottom: '1px solid var(--panel-border)' }}>
                    <th style={{ padding: '10px 12px' }}>IP Address</th>
                    <th style={{ padding: '10px 12px' }}>MAC Address</th>
                    <th style={{ padding: '10px 12px', width: '100px' }}>Type</th>
                  </tr>
                </thead>
                <tbody>
                  {arpTable.map((res, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <td 
                        onClick={() => handleCopyIp(res.ip)}
                        title="Click to copy IP Address"
                        style={{ 
                          padding: '8px 12px', 
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          transition: 'color 0.2s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent-color)'}
                        onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
                      >
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', position: 'relative', width: '100%' }}>
                          <span>{res.ip}</span>
                          <CopyIcon width="12" height="12" style={{ opacity: 0.5 }} />
                          {copiedIp === res.ip && (
                            <span style={{
                              position: 'absolute',
                              left: '140px',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              fontSize: '0.7rem',
                              color: '#11111b',
                              background: 'var(--success)',
                              padding: '1px 6px',
                              borderRadius: '4px',
                              fontWeight: '600',
                              boxShadow: '0 0 8px var(--success)',
                              zIndex: 10,
                              whiteSpace: 'nowrap'
                            }}>
                              Copied
                            </span>
                          )}
                        </div>
                      </td>
                      <td 
                        onClick={() => handleCopyMac(res.mac)}
                        title="Click to copy MAC Address"
                        style={{ 
                          padding: '8px 12px', 
                          fontFamily: 'monospace',
                          cursor: 'pointer',
                          transition: 'color 0.2s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent-color)'}
                        onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
                      >
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', position: 'relative', width: '100%' }}>
                          <span>{res.mac}</span>
                          <CopyIcon width="12" height="12" style={{ opacity: 0.5 }} />
                          {copiedMac === res.mac && (
                            <span style={{
                              position: 'absolute',
                              left: '155px',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              fontSize: '0.7rem',
                              color: '#11111b',
                              background: 'var(--success)',
                              padding: '1px 6px',
                              borderRadius: '4px',
                              fontWeight: '600',
                              boxShadow: '0 0 8px var(--success)',
                              zIndex: 10,
                              whiteSpace: 'nowrap'
                            }}>
                              Copied
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>{res.type}</td>
                    </tr>
                  ))}
                  {arpTable.length === 0 && (
                    <tr>
                      <td colSpan={3} style={{ padding: '20px', textAlign: 'center', color: 'gray' }}>
                        {isLoadingArp ? 'Fetching ARP mappings...' : 'ARP cache mapping is empty. Click Fetch to retrieve data.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

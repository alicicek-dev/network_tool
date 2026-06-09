import { useState, useEffect } from 'react';
import './index.css';
import TerminalComponent from './TerminalComponent';
import { io } from 'socket.io-client';

const socket = io('http://localhost:3001');

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [pingTarget, setPingTarget] = useState('');
  const [activePing, setActivePing] = useState('');
  const [pingMode, setPingMode] = useState('ping');

  // Interfaces State
  const [interfaces, setInterfaces] = useState<{name: string, ip: string, mac: string}[]>([]);
  const [selectedIfIdx, setSelectedIfIdx] = useState(0);

  // Terminal State
  const [terminalMode, setTerminalMode] = useState('ssh');
  const [host, setHost] = useState('');
  const [port, setPort] = useState('22');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  const [comPort, setComPort] = useState('');
  const [baudRate, setBaudRate] = useState('9600');
  const [serialPorts, setSerialPorts] = useState<{path: string}[]>([]);

  const [activeTerminalTarget, setActiveTerminalTarget] = useState('');

  const [wolMac, setWolMac] = useState('');
  const [wolStatus, setWolStatus] = useState('');

  const [vendorMac, setVendorMac] = useState('');
  const [vendorResult, setVendorResult] = useState('');

  const [sweepSubnet, setSweepSubnet] = useState('192.168.1');
  const [sweepResults, setSweepResults] = useState<{ip: string, time: number}[]>([]);
  const [isSweeping, setIsSweeping] = useState(false);

  useEffect(() => {
    socket.on('sweep-result', (data) => {
      setSweepResults(prev => {
        if (!prev.find(p => p.ip === data.ip)) return [...prev, data];
        return prev;
      });
    });
    return () => {
      socket.off('sweep-result');
    }
  }, []);

  useEffect(() => {
    fetch('http://localhost:3001/api/interfaces')
      .then(res => res.json())
      .then(data => setInterfaces(data))
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (activeTab === 'terminal') {
      fetch('http://localhost:3001/api/ports')
        .then(res => res.json())
        .then(data => {
           setSerialPorts(data);
           if (data.length > 0 && !comPort) setComPort(data[0].path);
        })
        .catch(err => console.error(err));
    }
  }, [activeTab]);

  const handleStartPing = () => {
    if (pingTarget.trim()) {
      setPingMode('ping');
      setActivePing(pingTarget.trim());
    }
  };

  const handleStartTrace = () => {
    if (pingTarget.trim()) {
      setPingMode('trace');
      setActivePing(pingTarget.trim());
    }
  };

  const handleStopPing = () => {
    setActivePing('');
  };

  const handleConnectTerminal = () => {
    if (terminalMode === 'ssh') {
      setActiveTerminalTarget(JSON.stringify({ host, port, username, password }));
    } else {
      setActiveTerminalTarget(JSON.stringify({ path: comPort, baudRate }));
    }
  };

  const handleDisconnectTerminal = () => {
    setActiveTerminalTarget('');
  };

  const handleWakeOnLan = async () => {
    if (!wolMac) return;
    try {
      const res = await fetch('http://localhost:3001/api/wol', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mac: wolMac })
      });
      const data = await res.json();
      if (res.ok) {
        setWolStatus(`✅ ${data.message}`);
      } else {
        setWolStatus(`❌ Hata: ${data.error}`);
      }
    } catch (e) {
      setWolStatus(`❌ Bağlantı hatası`);
    }
  };

  const handleVendorLookup = async () => {
    if (!vendorMac) return;
    try {
      const res = await fetch(`http://localhost:3001/api/mac/${vendorMac}`);
      const data = await res.json();
      if (res.ok) {
        setVendorResult(`🏢 ${data.vendor}`);
      } else {
        setVendorResult(`❌ ${data.error}`);
      }
    } catch (e) {
      setVendorResult(`❌ Bağlantı hatası`);
    }
  };

  const handleStartSweep = () => {
    setSweepResults([]);
    setIsSweeping(true);
    socket.emit('start-sweep', sweepSubnet);
    setTimeout(() => setIsSweeping(false), 5000);
  };

  return (
    <>
      <div className="titlebar">
        NetTool - Network Engineer Toolkit
      </div>
      <div className="app-container">
        <aside className="sidebar">
          <div 
            className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            📊 Dashboard
          </div>
          <div 
            className={`nav-item ${activeTab === 'ping' ? 'active' : ''}`}
            onClick={() => setActiveTab('ping')}
          >
            📡 Ping / Trace
          </div>
          <div 
            className={`nav-item ${activeTab === 'terminal' ? 'active' : ''}`}
            onClick={() => setActiveTab('terminal')}
          >
            💻 Web Terminal
          </div>
          <div 
            className={`nav-item ${activeTab === 'tools' ? 'active' : ''}`}
            onClick={() => setActiveTab('tools')}
          >
            🛠️ Net Tools
          </div>
        </aside>

        <main className="main-content">
          {activeTab === 'dashboard' && (
            <div className="fade-in">
              <h1>Network Overview</h1>
              <div className="dashboard-grid">
                <div className="glass-panel stat-card" style={{position: 'relative'}}>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px'}}>
                    <div className="stat-label">Interface</div>
                    <select 
                      style={{background: 'rgba(0,0,0,0.3)', color: 'var(--text-primary)', border: '1px solid var(--panel-border)', borderRadius: '4px', fontSize: '0.8rem', padding: '2px'}}
                      value={selectedIfIdx}
                      onChange={e => setSelectedIfIdx(parseInt(e.target.value))}
                    >
                      {interfaces.length === 0 && <option>Unknown</option>}
                      {interfaces.map((intf, idx) => (
                        <option key={idx} value={idx}>{intf.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="stat-value">{interfaces[selectedIfIdx]?.ip || 'Unknown'}</div>
                  <div style={{fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '5px'}}>MAC: {interfaces[selectedIfIdx]?.mac || 'Unknown'}</div>
                </div>
                <div className="stat-card glass-panel">
                  <div className="stat-label">Gateway</div>
                  <div className="stat-value">Determined by OS</div>
                </div>
                <div className="stat-card glass-panel">
                  <div className="stat-label">Internet Status</div>
                  <div className="stat-value" style={{color: 'var(--success)'}}>Connected</div>
                </div>
              </div>
              
              <div className="glass-panel" style={{padding: '20px', marginTop: '20px'}}>
                <h2>Quick Actions</h2>
                <div style={{display: 'flex', gap: '15px', marginTop: '15px'}}>
                  <button onClick={() => setActiveTab('terminal')}>Open SSH</button>
                  <button onClick={() => setActiveTab('ping')}>Start Ping Sweep</button>
                  <button onClick={() => setActiveTab('tools')}>Wake on LAN</button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ping' && (
            <div className="fade-in" style={{display: 'flex', flexDirection: 'column', height: '100%'}}>
              <h1>Ping & Traceroute</h1>
              <div className="glass-panel" style={{padding: '20px', display: 'flex', gap: '10px'}}>
                <input 
                  type="text" 
                  placeholder="Enter IP or Domain (e.g. 8.8.8.8)" 
                  style={{flex: 1}} 
                  value={pingTarget}
                  onChange={(e) => setPingTarget(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleStartPing()}
                />
                {!activePing ? (
                  <>
                    <button onClick={handleStartPing}>Ping</button>
                    <button onClick={handleStartTrace} style={{background: 'var(--panel-border)', color: 'var(--text-primary)'}}>Traceroute</button>
                  </>
                ) : (
                  <button onClick={handleStopPing} style={{background: 'var(--danger)'}}>Stop</button>
                )}
              </div>
              <div className="terminal-container">
                {activePing ? (
                  <TerminalComponent action={pingMode} target={activePing} />
                ) : (
                  <div style={{fontFamily: 'monospace', color: 'gray', padding: '15px'}}>
                    Ready. Enter a target and click Ping...
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'terminal' && (
            <div className="fade-in" style={{display: 'flex', flexDirection: 'column', height: '100%'}}>
              <h1>Connection Manager</h1>
              <div className="glass-panel" style={{padding: '15px', display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center'}}>
                <select 
                  style={{padding: '10px', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', color: 'var(--text-primary)', border: '1px solid var(--panel-border)'}}
                  value={terminalMode}
                  onChange={(e) => setTerminalMode(e.target.value)}
                  disabled={!!activeTerminalTarget}
                >
                  <option value="ssh">SSH</option>
                  <option value="serial">COM Port (Serial)</option>
                </select>
                
                {terminalMode === 'ssh' ? (
                  <>
                    <input type="text" placeholder="Host / IP" style={{flex: 1}} value={host} onChange={e => setHost(e.target.value)} disabled={!!activeTerminalTarget} />
                    <input type="text" placeholder="Port" style={{width: '70px'}} value={port} onChange={e => setPort(e.target.value)} disabled={!!activeTerminalTarget} />
                    <input type="text" placeholder="User" style={{width: '120px'}} value={username} onChange={e => setUsername(e.target.value)} disabled={!!activeTerminalTarget} />
                    <input type="password" placeholder="Password" style={{width: '120px'}} value={password} onChange={e => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleConnectTerminal()} disabled={!!activeTerminalTarget} />
                  </>
                ) : (
                  <>
                    <select 
                      style={{flex: 1, padding: '10px', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', color: 'var(--text-primary)', border: '1px solid var(--panel-border)'}}
                      value={comPort}
                      onChange={e => setComPort(e.target.value)}
                      disabled={!!activeTerminalTarget}
                    >
                      {serialPorts.length === 0 ? <option value="">No COM ports found</option> : null}
                      {serialPorts.map(sp => (
                        <option key={sp.path} value={sp.path}>{sp.path}</option>
                      ))}
                    </select>
                    <div style={{position: 'relative', width: '120px'}}>
                      <input 
                        type="text" 
                        placeholder="Baudrate"
                        style={{width: '100%', padding: '10px', paddingRight: '30px', borderRadius: '8px', border: '1px solid var(--panel-border)', background: 'rgba(0,0,0,0.3)', color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box'}} 
                        value={baudRate} 
                        onChange={e => setBaudRate(e.target.value)} 
                        disabled={!!activeTerminalTarget} 
                      />
                      <select 
                        style={{position: 'absolute', right: 0, top: 0, width: '30px', height: '100%', opacity: 0, cursor: 'pointer'}}
                        value={baudRate}
                        onChange={e => setBaudRate(e.target.value)}
                        disabled={!!activeTerminalTarget}
                        title="Sık kullanılan hızlar"
                      >
                        <option value="9600">9600</option>
                        <option value="19200">19200</option>
                        <option value="38400">38400</option>
                        <option value="57600">57600</option>
                        <option value="115200">115200</option>
                      </select>
                      <span style={{position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', fontSize: '10px', color: 'var(--text-secondary)'}}>▼</span>
                    </div>
                  </>
                )}

                {!activeTerminalTarget ? (
                  <button onClick={handleConnectTerminal}>Connect</button>
                ) : (
                  <button onClick={handleDisconnectTerminal} style={{background: 'var(--danger)'}}>Disconnect</button>
                )}
              </div>
              <div className="terminal-container">
                {activeTerminalTarget ? (
                  <TerminalComponent action={terminalMode} target={activeTerminalTarget} />
                ) : (
                  <div style={{color: 'gray', padding: '20px'}}>Terminal emulator ready. Enter connection details.</div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'tools' && (
            <div className="fade-in" style={{display: 'flex', flexDirection: 'column', height: '100%'}}>
              <h1>Network Tools</h1>
              <div className="dashboard-grid" style={{gridTemplateColumns: '1fr 1fr 1fr'}}>
                
                <div className="glass-panel stat-card">
                  <h3>Wake on LAN (WoL)</h3>
                  <p style={{color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '10px', marginBottom: '15px'}}>Uyandırmak istediğiniz cihazın MAC adresini girin.</p>
                  <input 
                    type="text" 
                    placeholder="Örn: 00:11:22:33:44:55" 
                    value={wolMac}
                    onChange={(e) => setWolMac(e.target.value)}
                    style={{width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--panel-border)', background: 'rgba(0,0,0,0.3)', color: 'var(--text-primary)', marginBottom: '10px', boxSizing: 'border-box'}}
                  />
                  <button onClick={handleWakeOnLan} style={{width: '100%'}}>Uyandır</button>
                  {wolStatus && <div style={{marginTop: '10px', fontSize: '0.9rem', color: wolStatus.includes('✅') ? 'var(--success)' : 'var(--danger)'}}>{wolStatus}</div>}
                </div>

                <div className="glass-panel stat-card">
                  <h3>MAC Vendor Lookup</h3>
                  <p style={{color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '10px', marginBottom: '15px'}}>Cihazın MAC adresinden üretici firmayı bulun.</p>
                  <input 
                    type="text" 
                    placeholder="Örn: B8:27:EB:..." 
                    value={vendorMac}
                    onChange={(e) => setVendorMac(e.target.value)}
                    style={{width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--panel-border)', background: 'rgba(0,0,0,0.3)', color: 'var(--text-primary)', marginBottom: '10px', boxSizing: 'border-box'}}
                  />
                  <button onClick={handleVendorLookup} style={{width: '100%', background: 'var(--panel-border)', color: 'white'}}>Sorgula</button>
                  {vendorResult && <div style={{marginTop: '10px', fontSize: '0.9rem', color: vendorResult.includes('❌') ? 'var(--danger)' : 'var(--success)'}}>{vendorResult}</div>}
                </div>
                
                <div className="glass-panel stat-card" style={{display: 'flex', flexDirection: 'column'}}>
                  <h3>Local IP Scanner (Ping Sweep)</h3>
                  <p style={{color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '10px', marginBottom: '15px'}}>Ağınızdaki aktif cihazları tespit edin (/24).</p>
                  <div style={{display: 'flex', gap: '5px', marginBottom: '10px'}}>
                    <input 
                      type="text" 
                      placeholder="Subnet (Örn: 192.168.1)" 
                      value={sweepSubnet}
                      onChange={(e) => setSweepSubnet(e.target.value)}
                      style={{flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid var(--panel-border)', background: 'rgba(0,0,0,0.3)', color: 'var(--text-primary)', boxSizing: 'border-box'}}
                    />
                    <button onClick={handleStartSweep} disabled={isSweeping}>{isSweeping ? '...' : 'Tara'}</button>
                  </div>
                  <div style={{flex: 1, background: 'rgba(0,0,0,0.2)', borderRadius: '8px', padding: '10px', overflowY: 'auto', maxHeight: '100px'}}>
                    {sweepResults.length === 0 ? (
                      <span style={{color: 'var(--text-secondary)', fontSize: '0.8rem'}}>Sonuçlar burada listelenecek...</span>
                    ) : (
                      sweepResults.map((res, i) => (
                        <div key={i} style={{fontSize: '0.85rem', padding: '2px 0', display: 'flex', justifyContent: 'space-between'}}>
                          <span style={{color: 'var(--primary)'}}>{res.ip}</span>
                          <span style={{color: 'var(--success)'}}>{res.time}ms</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  );
}

export default App;

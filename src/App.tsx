import { useState, useEffect, useRef } from 'react';
import './index.css';
import TerminalComponent from './TerminalComponent';
import DiscoveryTab from './components/DiscoveryTab';
import UtilitiesTab from './components/UtilitiesTab';
import SpeedTestTab from './components/SpeedTestTab';
import PingTab from './components/PingTab';
import { io } from 'socket.io-client';
import { AppIcon, DashboardIcon, PingIcon, TerminalIcon, DiscoveryIcon, UtilitiesIcon, SpeedTestIcon } from './components/Icons';
import CustomSelect from './components/CustomSelect';

const socket = io('http://localhost:3001', {
  transports: ['websocket']
});

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  // Interfaces State
  const [interfaces, setInterfaces] = useState<{name: string, ip: string, mac: string, gateway?: string}[]>([]);
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
  const [showBaudratePresets, setShowBaudratePresets] = useState(false);
  const baudrateRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (baudrateRef.current && !baudrateRef.current.contains(event.target as Node)) {
        setShowBaudratePresets(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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

  return (
    <>
      <div className="titlebar">
        NetTool - Network Engineer Toolkit
      </div>
      <div className="app-container">
        <aside className="sidebar">
          <div style={{display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 16px', marginBottom: '15px', borderBottom: '1px solid rgba(255,255,255,0.05)'}}>
            <AppIcon style={{color: 'var(--accent-color)'}} width="28" height="28" />
            <span style={{fontWeight: '700', fontSize: '1.1rem', color: 'var(--text-primary)'}}>NetTool</span>
          </div>
          <div 
            className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <DashboardIcon width="18" height="18" />
            Dashboard
          </div>
          <div 
            className={`nav-item ${activeTab === 'ping' ? 'active' : ''}`}
            onClick={() => setActiveTab('ping')}
          >
            <PingIcon width="18" height="18" />
            Ping / Trace
          </div>
          <div 
            className={`nav-item ${activeTab === 'terminal' ? 'active' : ''}`}
            onClick={() => setActiveTab('terminal')}
          >
            <TerminalIcon width="18" height="18" />
            Web Terminal
          </div>
          <div 
            className={`nav-item ${activeTab === 'discovery' ? 'active' : ''}`}
            onClick={() => setActiveTab('discovery')}
          >
            <DiscoveryIcon width="18" height="18" />
            Discovery
          </div>
          <div 
            className={`nav-item ${activeTab === 'utilities' ? 'active' : ''}`}
            onClick={() => setActiveTab('utilities')}
          >
            <UtilitiesIcon width="18" height="18" />
            Utilities
          </div>
          <div 
            className={`nav-item ${activeTab === 'speedtest' ? 'active' : ''}`}
            onClick={() => setActiveTab('speedtest')}
          >
            <SpeedTestIcon width="18" height="18" />
            Speed Test
          </div>
        </aside>

        <main className="main-content">
          {activeTab === 'dashboard' && (
            <div className="fade-in">
              <h1>Network Overview</h1>
              <div className="dashboard-grid">
                <div className="glass-panel stat-card" style={{position: 'relative'}}>
                    <div className="stat-label">Interface</div>
                    <CustomSelect 
                      options={interfaces.length === 0 ? [{ value: 0, label: 'Unknown' }] : interfaces.map((intf, idx) => ({ value: idx, label: intf.name }))}
                      value={selectedIfIdx}
                      onChange={(val) => setSelectedIfIdx(val)}
                      maxWidth="100%"
                    />
                    <div className="stat-value" style={{marginTop: '4px'}}>{interfaces[selectedIfIdx]?.ip || 'Unknown'}</div>
                    <div style={{fontSize: '0.8rem', color: 'var(--text-secondary)'}}>MAC: {interfaces[selectedIfIdx]?.mac || 'Unknown'}</div>
                </div>
                <div className="stat-card glass-panel">
                  <div className="stat-label">Gateway</div>
                  <div className="stat-value">{interfaces[selectedIfIdx]?.gateway || 'Unknown'}</div>
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
                  <button onClick={() => setActiveTab('discovery')}>Start Ping Sweep</button>
                  <button onClick={() => setActiveTab('utilities')}>Wake on LAN</button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ping' && <PingTab socket={socket} />}

          {activeTab === 'terminal' && (
            <div className="fade-in" style={{display: 'flex', flexDirection: 'column', height: '100%'}}>
              <h1>Connection Manager</h1>
              <div className="glass-panel" style={{padding: '15px', display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center'}}>
                <CustomSelect 
                  options={[
                    { value: 'ssh', label: 'SSH' },
                    { value: 'serial', label: 'COM Port (Serial)' }
                  ]}
                  value={terminalMode}
                  onChange={(val) => setTerminalMode(val)}
                  disabled={!!activeTerminalTarget}
                  maxWidth="180px"
                />
                
                {terminalMode === 'ssh' ? (
                  <>
                    <input type="text" placeholder="Host / IP" style={{flex: 1}} value={host} onChange={e => setHost(e.target.value)} disabled={!!activeTerminalTarget} />
                    <input type="text" placeholder="Port" style={{width: '70px'}} value={port} onChange={e => setPort(e.target.value)} disabled={!!activeTerminalTarget} />
                    <input type="text" placeholder="User" style={{width: '120px'}} value={username} onChange={e => setUsername(e.target.value)} disabled={!!activeTerminalTarget} />
                    <input type="password" placeholder="Password" style={{width: '120px'}} value={password} onChange={e => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleConnectTerminal()} disabled={!!activeTerminalTarget} />
                  </>
                ) : (
                  <>
                    <CustomSelect 
                      options={serialPorts.length === 0 ? [{ value: '', label: 'No COM ports found' }] : serialPorts.map(sp => ({ value: sp.path, label: sp.path }))}
                      value={comPort}
                      onChange={(val) => setComPort(val)}
                      disabled={!!activeTerminalTarget}
                      maxWidth="220px"
                    />
                    <div ref={baudrateRef} style={{position: 'relative', width: '120px'}}>
                      <input 
                        type="text" 
                        placeholder="Baudrate"
                        style={{width: '100%', padding: '10px', paddingRight: '30px', borderRadius: '8px', border: '1px solid var(--panel-border)', background: 'rgba(0,0,0,0.3)', color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box'}} 
                        value={baudRate} 
                        onChange={e => setBaudRate(e.target.value)} 
                        disabled={!!activeTerminalTarget} 
                      />
                      <span 
                        onClick={() => !activeTerminalTarget && setShowBaudratePresets(!showBaudratePresets)}
                        style={{
                          position: 'absolute', 
                          right: '12px', 
                          top: '50%', 
                          transform: 'translateY(-50%)', 
                          cursor: activeTerminalTarget ? 'not-allowed' : 'pointer', 
                          fontSize: '10px', 
                          color: 'var(--text-secondary)',
                          userSelect: 'none'
                        }}
                      >
                        ▼
                      </span>
                      {showBaudratePresets && (
                        <div
                          style={{
                            position: 'absolute',
                            top: 'calc(100% + 6px)',
                            left: 0,
                            right: 0,
                            background: 'rgba(20, 20, 35, 0.95)',
                            backdropFilter: 'blur(16px)',
                            border: '1px solid var(--panel-border)',
                            borderRadius: '8px',
                            boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.5)',
                            zIndex: 9999,
                            padding: '4px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '2px',
                          }}
                        >
                          {['9600', '19200', '38400', '57600', '115200'].map(val => (
                            <div
                              key={val}
                              onClick={() => {
                                setBaudRate(val);
                                setShowBaudratePresets(false);
                              }}
                              style={{
                                padding: '8px 12px',
                                fontSize: '0.85rem',
                                borderRadius: '6px',
                                color: baudRate === val ? 'var(--accent-color)' : 'var(--text-primary)',
                                background: baudRate === val ? 'rgba(137, 180, 250, 0.15)' : 'transparent',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                              }}
                              onMouseEnter={(e) => {
                                if (baudRate !== val) {
                                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (baudRate !== val) {
                                  e.currentTarget.style.background = 'transparent';
                                }
                              }}
                            >
                              {val}
                            </div>
                          ))}
                        </div>
                      )}
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

          {activeTab === 'discovery' && <DiscoveryTab socket={socket} />}
          {activeTab === 'utilities' && <UtilitiesTab />}
          {activeTab === 'speedtest' && <SpeedTestTab socket={socket} />}
        </main>
      </div>
    </>
  );
}

export default App;

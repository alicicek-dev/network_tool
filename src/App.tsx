import { useState, useEffect, useRef } from 'react';
import './index.css';
import TerminalComponent from './TerminalComponent';
import DiscoveryTab from './components/DiscoveryTab';
import UtilitiesTab from './components/UtilitiesTab';
import SpeedTestTab from './components/SpeedTestTab';
import PingTab from './components/PingTab';
import QuickServerTab from './components/QuickServerTab';
import { io } from 'socket.io-client';
import { AppIcon, DashboardIcon, PingIcon, TerminalIcon, DiscoveryIcon, UtilitiesIcon, SpeedTestIcon, RefreshIcon, CopyIcon, ServerIcon } from './components/Icons';
import CustomSelect from './components/CustomSelect';

const socket = io('http://127.0.0.1:3001', {
  transports: ['websocket']
});

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  // Interfaces State
  const [interfaces, setInterfaces] = useState<{name: string, ip: string, mac: string, gateway?: string}[]>([]);
  const [selectedIfIdx, setSelectedIfIdx] = useState(0);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const handleCopyValue = (value: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(value).then(() => {
      setCopiedText(value);
      setTimeout(() => setCopiedText(null), 1500);
    });
  };

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
    if (terminalMode === 'ssh') {
      setPort('22');
    } else if (terminalMode === 'telnet') {
      setPort('23');
    }
  }, [terminalMode]);

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
    let retries = 0;
    const maxRetries = 10;
    
    function fetchInterfaces() {
      fetch('http://127.0.0.1:3001/api/interfaces')
        .then(res => {
          if (!res.ok) throw new Error('Network response was not ok');
          return res.json();
        })
        .then(data => setInterfaces(data))
        .catch(err => {
          console.warn('Failed to fetch interfaces, retrying...', err);
          if (retries < maxRetries) {
            retries++;
            setTimeout(fetchInterfaces, 1000);
          }
        });
    }
    
    fetchInterfaces();
  }, []);

  const getPortLabel = (sp: any) => {
    if (sp.friendlyName) {
      const pathUpper = sp.path.toUpperCase();
      if (sp.friendlyName.toUpperCase().includes(`(${pathUpper})`)) {
        const cleanedName = sp.friendlyName.replace(new RegExp(`\\s*\\(${sp.path}\\)`, 'i'), '').trim();
        return `${sp.path} - ${cleanedName}`;
      }
      return `${sp.path} - ${sp.friendlyName}`;
    }
    if (sp.manufacturer) {
      return `${sp.path} - ${sp.manufacturer}`;
    }
    return sp.path;
  };

  const refreshSerialPorts = () => {
    fetch('http://127.0.0.1:3001/api/ports')
      .then(res => res.json())
      .then(data => {
         // Natural sort (e.g. COM2 before COM10)
         const sorted = [...data].sort((a, b) => {
           return a.path.localeCompare(b.path, undefined, { numeric: true, sensitivity: 'base' });
         });
         setSerialPorts(sorted);
         if (sorted.length > 0) {
           const exists = sorted.some(sp => sp.path === comPort);
           if (!exists || !comPort) {
             setComPort(sorted[0].path);
           }
         } else {
           setComPort('');
         }
      })
      .catch(err => console.error(err));
  };

  useEffect(() => {
    if (activeTab === 'terminal') {
      refreshSerialPorts();
    }
  }, [activeTab]);

  const handleConnectTerminal = () => {
    if (terminalMode === 'ssh') {
      setActiveTerminalTarget(JSON.stringify({ host, port, username, password }));
    } else if (terminalMode === 'telnet') {
      setActiveTerminalTarget(JSON.stringify({ host, port }));
    } else {
      setActiveTerminalTarget(JSON.stringify({ path: comPort, baudRate }));
    }
  };

  const handleDisconnectTerminal = () => {
    setActiveTerminalTarget('');
  };

  return (
    <div className="app-root">
      <div className="titlebar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', pointerEvents: 'none' }}>
          <AppIcon width="16" height="16" />
          <span className="titlebar-title">NetTool - Network Engineer Toolkit</span>
        </div>
        <div className="titlebar-controls">
          <button
            className="titlebar-btn"
            onClick={(e) => { e.stopPropagation(); (window as any).electronAPI?.windowMinimize(); }}
            title="Minimize"
          >
            <svg width="10" height="1" viewBox="0 0 10 1"><rect width="10" height="1" fill="currentColor"/></svg>
          </button>
          <button
            className="titlebar-btn"
            onClick={(e) => { e.stopPropagation(); (window as any).electronAPI?.windowToggleMaximize(); }}
            title="Maximize"
          >
            <svg width="10" height="10" viewBox="0 0 10 10"><rect x="0.5" y="0.5" width="9" height="9" fill="none" stroke="currentColor" strokeWidth="1"/></svg>
          </button>
          <button
            className="titlebar-btn titlebar-btn-close"
            onClick={(e) => { e.stopPropagation(); (window as any).electronAPI?.windowClose(); }}
            title="Close"
          >
            <svg width="10" height="10" viewBox="0 0 10 10"><line x1="0" y1="0" x2="10" y2="10" stroke="currentColor" strokeWidth="1.2"/><line x1="10" y1="0" x2="0" y2="10" stroke="currentColor" strokeWidth="1.2"/></svg>
          </button>
        </div>
      </div>
      <div className="app-container">
        <aside className="sidebar">
          <div style={{display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 16px', marginBottom: '15px', borderBottom: '1px solid rgba(255,255,255,0.05)'}}>
            <AppIcon width="28" height="28" />
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
            className={`nav-item ${activeTab === 'quick-server' ? 'active' : ''}`}
            onClick={() => setActiveTab('quick-server')}
          >
            <ServerIcon width="18" height="18" />
            Quick Server
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
              <div className="glass-panel" style={{ padding: '0px', overflow: 'hidden', border: '1px solid var(--panel-border)' }}>
                <table className="device-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid var(--panel-border)' }}>
                      <th style={{ padding: '10px 14px', fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase', width: '50px', textAlign: 'center' }}>Select</th>
                      <th style={{ padding: '10px 14px', fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase' }}>Interface Name</th>
                      <th style={{ padding: '10px 14px', fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase' }}>IP Address</th>
                      <th style={{ padding: '10px 14px', fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase' }}>Gateway</th>
                      <th style={{ padding: '10px 14px', fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase' }}>MAC Address</th>
                      <th style={{ padding: '10px 14px', fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase', width: '120px', textAlign: 'right' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {interfaces.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                          No interfaces found
                        </td>
                      </tr>
                    ) : (
                      interfaces.map((intf, idx) => {
                        const isSelected = selectedIfIdx === idx;
                        const hasGateway = !!intf.gateway;
                        return (
                          <tr
                            key={idx}
                            onClick={() => setSelectedIfIdx(idx)}
                            style={{
                              borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
                              cursor: 'pointer',
                              background: isSelected ? 'rgba(137, 180, 250, 0.06)' : 'transparent',
                              transition: 'all 0.15s ease'
                            }}
                            className="interface-row"
                          >
                            {/* 1. Radio Select */}
                            <td style={{ padding: '8px 14px', verticalAlign: 'middle', textAlign: 'center' }}>
                              <div style={{
                                width: '16px',
                                height: '16px',
                                borderRadius: '50%',
                                border: isSelected ? '2px solid var(--accent-color)' : '2px solid var(--text-secondary)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: isSelected ? 'transparent' : 'rgba(0,0,0,0.2)',
                                verticalAlign: 'middle'
                              }}>
                                {isSelected && (
                                  <div style={{
                                    width: '8px',
                                    height: '8px',
                                    borderRadius: '50%',
                                    background: 'var(--accent-color)'
                                  }} />
                                )}
                              </div>
                            </td>

                            {/* 2. Name */}
                            <td style={{ 
                              padding: '8px 14px', 
                              fontWeight: '600', 
                              fontSize: '0.9rem', 
                              color: isSelected ? 'var(--accent-color)' : 'var(--text-primary)',
                              verticalAlign: 'middle'
                            }}>
                              {intf.name}
                            </td>

                            {/* 3. IP Address (Copyable) */}
                            <td 
                              onClick={(e) => handleCopyValue(intf.ip, e)}
                              title="Click to copy IP Address"
                              style={{ 
                                padding: '8px 14px', 
                                fontFamily: 'monospace',
                                fontSize: '0.9rem',
                                color: 'var(--text-primary)',
                                transition: 'color 0.2s ease',
                                verticalAlign: 'middle'
                              }}
                              className="copyable-cell"
                            >
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', position: 'relative' }}>
                                <span style={{ fontWeight: 'bold' }}>{intf.ip}</span>
                                <CopyIcon width="11" height="11" className="copy-icon-hover" style={{ opacity: 0.4, transition: 'opacity 0.2s' }} />
                                {copiedText === intf.ip && (
                                  <span style={{
                                    position: 'absolute',
                                    left: '110%',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    fontSize: '0.65rem',
                                    color: '#11111b',
                                    background: 'var(--success)',
                                    padding: '1px 5px',
                                    borderRadius: '3px',
                                    fontWeight: '600',
                                    zIndex: 10,
                                    whiteSpace: 'nowrap'
                                  }}>
                                    Copied
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* 4. Gateway (Copyable) */}
                            <td 
                              onClick={(e) => intf.gateway && handleCopyValue(intf.gateway, e)}
                              title={intf.gateway ? "Click to copy Gateway" : undefined}
                              style={{ 
                                padding: '8px 14px', 
                                fontFamily: 'monospace',
                                fontSize: '0.9rem',
                                color: hasGateway ? 'var(--text-primary)' : 'var(--text-secondary)',
                                transition: 'color 0.2s ease',
                                cursor: intf.gateway ? 'pointer' : 'default',
                                verticalAlign: 'middle'
                              }}
                              className={intf.gateway ? "copyable-cell" : ""}
                            >
                              {intf.gateway ? (
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', position: 'relative' }}>
                                  <span>{intf.gateway}</span>
                                  <CopyIcon width="11" height="11" className="copy-icon-hover" style={{ opacity: 0.4, transition: 'opacity 0.2s' }} />
                                  {copiedText === intf.gateway && (
                                    <span style={{
                                      position: 'absolute',
                                      left: '110%',
                                      top: '50%',
                                      transform: 'translateY(-50%)',
                                      fontSize: '0.65rem',
                                      color: '#11111b',
                                      background: 'var(--success)',
                                      padding: '1px 5px',
                                      borderRadius: '3px',
                                      fontWeight: '600',
                                      zIndex: 10,
                                      whiteSpace: 'nowrap'
                                    }}>
                                      Copied
                                    </span>
                                  )}
                                </div>
                              ) : (
                                'N/A'
                              )}
                            </td>

                            {/* 5. MAC Address (Copyable) */}
                            <td 
                              onClick={(e) => handleCopyValue(intf.mac, e)}
                              title="Click to copy MAC Address"
                              style={{ 
                                padding: '8px 14px', 
                                fontFamily: 'monospace',
                                fontSize: '0.85rem',
                                color: 'var(--text-secondary)',
                                transition: 'color 0.2s ease',
                                verticalAlign: 'middle'
                              }}
                              className="copyable-cell"
                            >
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', position: 'relative' }}>
                                <span>{intf.mac}</span>
                                <CopyIcon width="11" height="11" className="copy-icon-hover" style={{ opacity: 0.4, transition: 'opacity 0.2s' }} />
                                {copiedText === intf.mac && (
                                  <span style={{
                                    position: 'absolute',
                                    left: '110%',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    fontSize: '0.65rem',
                                    color: '#11111b',
                                    background: 'var(--success)',
                                    padding: '1px 5px',
                                    borderRadius: '3px',
                                    fontWeight: '600',
                                    zIndex: 10,
                                    whiteSpace: 'nowrap'
                                  }}>
                                    Copied
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* 6. Status Badge */}
                            <td style={{ padding: '8px 14px', textAlign: 'right', verticalAlign: 'middle' }}>
                              <span style={{
                                fontSize: '0.7rem',
                                color: hasGateway ? 'var(--success)' : 'var(--text-secondary)',
                                background: hasGateway ? 'rgba(166, 227, 161, 0.12)' : 'rgba(255, 255, 255, 0.04)',
                                padding: '3px 8px',
                                borderRadius: '5px',
                                fontWeight: '500',
                                border: hasGateway ? '1px solid rgba(166, 227, 161, 0.15)' : '1px solid rgba(255, 255, 255, 0.06)',
                                whiteSpace: 'nowrap',
                                display: 'inline-block'
                              }}>
                                {hasGateway ? 'Connected' : 'Local Only'}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
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
                    { value: 'telnet', label: 'Telnet' },
                    { value: 'serial', label: 'COM Port (Serial)' }
                  ]}
                  value={terminalMode}
                  onChange={(val) => setTerminalMode(val)}
                  disabled={!!activeTerminalTarget}
                  maxWidth="180px"
                />
                
                {(terminalMode === 'ssh' || terminalMode === 'telnet') ? (
                  <>
                    <input 
                      type="text" 
                      placeholder="Host / IP" 
                      style={{flex: 1}} 
                      value={host} 
                      onChange={e => setHost(e.target.value)} 
                      onKeyDown={(e) => e.key === 'Enter' && handleConnectTerminal()}
                      disabled={!!activeTerminalTarget} 
                    />
                    <input 
                      type="text" 
                      placeholder="Port" 
                      style={{width: '70px'}} 
                      value={port} 
                      onChange={e => setPort(e.target.value)} 
                      onKeyDown={(e) => e.key === 'Enter' && handleConnectTerminal()}
                      disabled={!!activeTerminalTarget} 
                    />
                    {terminalMode === 'ssh' && (
                      <>
                        <input 
                          type="text" 
                          placeholder="User" 
                          style={{width: '120px'}} 
                          value={username} 
                          onChange={e => setUsername(e.target.value)} 
                          disabled={!!activeTerminalTarget} 
                        />
                        <input 
                          type="password" 
                          placeholder="Password" 
                          style={{width: '120px'}} 
                          value={password} 
                          onChange={e => setPassword(e.target.value)} 
                          onKeyDown={(e) => e.key === 'Enter' && handleConnectTerminal()} 
                          disabled={!!activeTerminalTarget} 
                        />
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <div style={{display: 'flex', alignItems: 'center', gap: '8px', flex: 1, maxWidth: '270px', minWidth: 0}}>
                      <CustomSelect 
                        options={serialPorts.length === 0 ? [{ value: '', label: 'No COM ports found' }] : serialPorts.map(sp => ({ value: sp.path, label: getPortLabel(sp) }))}
                        value={comPort}
                        onChange={(val) => setComPort(val)}
                        disabled={!!activeTerminalTarget}
                        maxWidth="100%"
                        style={{flex: 1, minWidth: 0}}
                      />
                      <button
                        onClick={refreshSerialPorts}
                        disabled={!!activeTerminalTarget}
                        title="Refresh COM Ports"
                        style={{
                          background: 'rgba(0,0,0,0.3)',
                          border: '1px solid var(--panel-border)',
                          borderRadius: '8px',
                          color: 'var(--text-primary)',
                          padding: '10px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          opacity: activeTerminalTarget ? 0.5 : 1,
                          flexShrink: 0,
                          width: 'auto'
                        }}
                        onMouseEnter={(e) => {
                          if (!activeTerminalTarget) {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                            e.currentTarget.style.borderColor = 'var(--accent-color)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!activeTerminalTarget) {
                            e.currentTarget.style.background = 'rgba(0,0,0,0.3)';
                            e.currentTarget.style.borderColor = 'var(--panel-border)';
                          }
                        }}
                      >
                        <RefreshIcon width="16" height="16" style={{color: 'var(--accent-color)'}} />
                      </button>
                    </div>
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

          {activeTab === 'discovery' && (
            <DiscoveryTab 
              socket={socket} 
              defaultSubnet={interfaces[selectedIfIdx]?.ip ? interfaces[selectedIfIdx].ip.split('.').slice(0, 3).join('.') : undefined} 
            />
          )}
          {activeTab === 'quick-server' && <QuickServerTab socket={socket} />}
          {activeTab === 'utilities' && <UtilitiesTab />}
          {activeTab === 'speedtest' && <SpeedTestTab socket={socket} />}
        </main>
      </div>
    </div>
  );
}

export default App;

import React, { useState, useEffect } from 'react';
import TerminalComponent from '../TerminalComponent';
import TerminalConnectionForm from './TerminalConnectionForm';
import type { SerialPortInfo } from '../types';

interface TerminalSession {
  id: string;
  name: string;
  mode: 'ssh' | 'telnet' | 'serial';
  connected: boolean;
  target: string;
  config: {
    host: string;
    port: string;
    username: string;
    password?: string;
    comPort?: string;
    baudRate?: string;
  };
}

interface TerminalTabProps {
  isActive: boolean;
}

export default function TerminalTab({ isActive }: TerminalTabProps) {
  const [sessions, setSessions] = useState<TerminalSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [serialPorts, setSerialPorts] = useState<SerialPortInfo[]>([]);

  // Create new session in setup state
  const createNewSession = () => {
    const newId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    const newSession: TerminalSession = {
      id: newId,
      name: 'New Connection',
      mode: 'ssh',
      connected: false,
      target: '',
      config: {
        host: '',
        port: '22',
        username: '',
        password: '',
        comPort: '',
        baudRate: '9600'
      }
    };
    setSessions(prev => [...prev, newSession]);
    setActiveSessionId(newId);
  };

  // Auto create a session on mount if list is empty
  useEffect(() => {
    if (sessions.length === 0) {
      createNewSession();
    }
  }, [sessions]);

  const refreshSerialPorts = () => {
    fetch('http://127.0.0.1:3001/api/ports')
      .then(res => res.json())
      .then(data => {
         const sorted = [...data].sort((a, b) => {
           return a.path.localeCompare(b.path, undefined, { numeric: true, sensitivity: 'base' });
         });
         setSerialPorts(sorted);
         
         const active = sessions.find(s => s.id === activeSessionId);
         if (active && active.mode === 'serial' && sorted.length > 0) {
           const exists = sorted.some(sp => sp.path === active.config.comPort);
           if (!exists || !active.config.comPort) {
             updateActiveSessionConfig('comPort', sorted[0].path);
           }
         }
      })
      .catch(err => console.error(err));
  };

  useEffect(() => {
    if (isActive) {
      refreshSerialPorts();
    }
  }, [isActive, activeSessionId]);

  const updateActiveSessionConfig = (key: string, value: any) => {
    setSessions(prev => prev.map(s => {
      if (s.id === activeSessionId) {
        return {
          ...s,
          config: {
            ...s.config,
            [key]: value
          }
        };
      }
      return s;
    }));
  };

  const setActiveSessionMode = (mode: 'ssh' | 'telnet' | 'serial') => {
    setSessions(prev => prev.map(s => {
      if (s.id === activeSessionId) {
        const defaultPort = mode === 'ssh' ? '22' : mode === 'telnet' ? '23' : '';
        return {
          ...s,
          mode,
          config: {
            ...s.config,
            port: defaultPort
          }
        };
      }
      return s;
    }));
  };

  const handleConnect = () => {
    setSessions(prev => prev.map(s => {
      if (s.id === activeSessionId) {
        let targetStr = '';
        let tabName = '';
        if (s.mode === 'ssh') {
          targetStr = JSON.stringify({ host: s.config.host, port: s.config.port, username: s.config.username, password: s.config.password });
          tabName = `SSH: ${s.config.host || 'unknown'}`;
        } else if (s.mode === 'telnet') {
          targetStr = JSON.stringify({ host: s.config.host, port: s.config.port });
          tabName = `Telnet: ${s.config.host || 'unknown'}`;
        } else {
          targetStr = JSON.stringify({ path: s.config.comPort, baudRate: s.config.baudRate });
          tabName = `Serial: ${s.config.comPort || 'COM'}`;
        }
        return {
          ...s,
          connected: true,
          target: targetStr,
          name: tabName
        };
      }
      return s;
    }));
  };

  const handleDisconnect = (sessionIdToDisconnect?: string) => {
    const targetId = sessionIdToDisconnect || activeSessionId;
    setSessions(prev => prev.map(s => {
      if (s.id === targetId) {
        return {
          ...s,
          connected: false,
          target: '',
          name: 'New Connection'
        };
      }
      return s;
    }));
  };

  const closeSession = (sessionIdToClose: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (sessions.length === 1) {
      handleDisconnect(sessionIdToClose);
      return;
    }

    const index = sessions.findIndex(s => s.id === sessionIdToClose);
    const newSessions = sessions.filter(s => s.id !== sessionIdToClose);
    setSessions(newSessions);

    if (activeSessionId === sessionIdToClose) {
      const nextActiveIndex = index === 0 ? 0 : index - 1;
      setActiveSessionId(newSessions[nextActiveIndex].id);
    }
  };

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      {/* Tab Bar Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '15px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '10px', flexWrap: 'wrap' }}>
        {sessions.map(s => {
          const isSelected = s.id === activeSessionId;
          return (
            <div
              key={s.id}
              onClick={() => setActiveSessionId(s.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 14px',
                borderRadius: '8px',
                background: isSelected ? 'rgba(137, 180, 250, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                border: isSelected ? '1px solid var(--accent-color)' : '1px solid var(--panel-border)',
                color: isSelected ? 'var(--accent-color)' : 'var(--text-primary)',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: isSelected ? '600' : 'normal',
                transition: 'all 0.15s ease'
              }}
            >
              <span>{s.name}</span>
              <span 
                onClick={(e) => closeSession(s.id, e)}
                style={{ 
                  marginLeft: '4px', 
                  opacity: 0.6, 
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '0.8rem'
                }}
                title="Close session"
              >
                ×
              </span>
            </div>
          );
        })}
        
        <button
          onClick={createNewSession}
          style={{
            padding: '6px 12px',
            borderRadius: '8px',
            fontSize: '1rem',
            lineHeight: '1',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid var(--panel-border)',
            color: 'var(--text-primary)',
            cursor: 'pointer'
          }}
          title="Open new terminal tab"
        >
          +
        </button>
      </div>

      {/* Render all mounted sessions but toggle visibility */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {sessions.map(s => {
          const isSessionActive = s.id === activeSessionId;
          return (
            <div 
              key={s.id}
              style={{ 
                display: isSessionActive ? 'flex' : 'none', 
                flexDirection: 'column', 
                height: '100%',
                minHeight: 0
              }}
            >
              {!s.connected ? (
                <TerminalConnectionForm
                  terminalMode={s.mode}
                  setTerminalMode={(mode) => setActiveSessionMode(mode as any)}
                  host={s.config.host}
                  setHost={(val) => updateActiveSessionConfig('host', val)}
                  port={s.config.port}
                  setPort={(val) => updateActiveSessionConfig('port', val)}
                  username={s.config.username}
                  setUsername={(val) => updateActiveSessionConfig('username', val)}
                  password={s.config.password || ''}
                  setPassword={(val) => updateActiveSessionConfig('password', val)}
                  comPort={s.config.comPort || ''}
                  setComPort={(val) => updateActiveSessionConfig('comPort', val)}
                  baudRate={s.config.baudRate || '9600'}
                  setBaudRate={(val) => updateActiveSessionConfig('baudRate', val)}
                  serialPorts={serialPorts}
                  refreshSerialPorts={refreshSerialPorts}
                  activeTerminalTarget={''}
                  handleConnectTerminal={handleConnect}
                  handleDisconnectTerminal={() => handleDisconnect(s.id)}
                />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
                    <button 
                      onClick={() => handleDisconnect(s.id)} 
                      style={{ background: 'var(--danger)', padding: '6px 14px', fontSize: '0.85rem' }}
                    >
                      Disconnect
                    </button>
                  </div>
                  <div className="terminal-container" style={{ flex: 1, minHeight: 0 }}>
                    <TerminalComponent 
                      action={s.mode} 
                      target={s.target} 
                      isActive={isActive && isSessionActive} 
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

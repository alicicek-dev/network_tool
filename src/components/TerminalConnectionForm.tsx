import { useState, useEffect, useRef } from 'react';
import CustomSelect from './CustomSelect';
import { RefreshIcon, BookmarkIcon } from './Icons';
import type { SerialPortInfo, DeviceProfile } from '../types';
import ProfileManagerModal from './ProfileManagerModal';

interface TerminalConnectionFormProps {
  terminalMode: string;
  setTerminalMode: (mode: string) => void;
  host: string;
  setHost: (host: string) => void;
  port: string;
  setPort: (port: string) => void;
  username: string;
  setUsername: (user: string) => void;
  password: string;
  setPassword: (password: string) => void;
  comPort: string;
  setComPort: (com: string) => void;
  baudRate: string;
  setBaudRate: (baud: string) => void;
  serialPorts: SerialPortInfo[];
  refreshSerialPorts: () => void;
  activeTerminalTarget: string;
  handleConnectTerminal: () => void;
  handleDisconnectTerminal: () => void;
  isParentActive: boolean;
}

export default function TerminalConnectionForm({
  terminalMode,
  setTerminalMode,
  host,
  setHost,
  port,
  setPort,
  username,
  setUsername,
  password,
  setPassword,
  comPort,
  setComPort,
  baudRate,
  setBaudRate,
  serialPorts,
  refreshSerialPorts,
  activeTerminalTarget,
  handleConnectTerminal,
  handleDisconnectTerminal,
  isParentActive
}: TerminalConnectionFormProps) {
  const [showBaudratePresets, setShowBaudratePresets] = useState(false);
  const [showProfilesModal, setShowProfilesModal] = useState(false);
  const baudrateRef = useRef<HTMLDivElement>(null);
  const hostInputRef = useRef<HTMLInputElement>(null);

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
    if (isParentActive && (terminalMode === 'ssh' || terminalMode === 'telnet')) {
      const timer = setTimeout(() => {
        hostInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isParentActive, terminalMode]);

  const getPortLabel = (sp: SerialPortInfo) => {
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

  return (
    <>
    <div className="glass-panel" style={{ padding: '15px', display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
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
            ref={hostInputRef}
            type="text" 
            placeholder="Host / IP" 
            style={{ flex: 1 }} 
            value={host} 
            onChange={e => setHost(e.target.value)} 
            onKeyDown={(e) => e.key === 'Enter' && handleConnectTerminal()}
            disabled={!!activeTerminalTarget} 
          />
          <input 
            type="text" 
            placeholder="Port" 
            style={{ width: '70px' }} 
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
                style={{ width: '120px' }} 
                value={username} 
                onChange={e => setUsername(e.target.value)} 
                disabled={!!activeTerminalTarget} 
              />
              <input 
                type="password" 
                placeholder="Password" 
                style={{ width: '120px' }} 
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, maxWidth: '270px', minWidth: 0 }}>
            <CustomSelect 
              options={serialPorts.length === 0 ? [{ value: '', label: 'No COM ports found' }] : serialPorts.map(sp => ({ value: sp.path, label: getPortLabel(sp) }))}
              value={comPort}
              onChange={(val) => setComPort(val)}
              disabled={!!activeTerminalTarget}
              maxWidth="100%"
              style={{ flex: 1, minWidth: 0 }}
            />
            <button
              onClick={refreshSerialPorts}
              disabled={!!activeTerminalTarget}
              title="Refresh COM Ports"
              style={{
                background: 'var(--input-bg)',
                border: '1px solid var(--panel-border)',
                borderRadius: '8px',
                color: 'var(--text-primary)',
                padding: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'background-color 160ms cubic-bezier(0.23, 1, 0.32, 1), border-color 160ms cubic-bezier(0.23, 1, 0.32, 1), transform 160ms cubic-bezier(0.23, 1, 0.32, 1)',
                opacity: activeTerminalTarget ? 0.5 : 1,
                flexShrink: 0,
                width: 'auto'
              }}
              onMouseEnter={(e) => {
                if (!activeTerminalTarget) {
                  e.currentTarget.style.background = 'var(--hover-overlay)';
                  e.currentTarget.style.borderColor = 'var(--accent-color)';
                }
              }}
              onMouseLeave={(e) => {
                if (!activeTerminalTarget) {
                  e.currentTarget.style.background = 'var(--input-bg)';
                  e.currentTarget.style.borderColor = 'var(--panel-border)';
                }
              }}
            >
              <RefreshIcon width="16" height="16" style={{ color: 'var(--accent-color)' }} />
            </button>
          </div>
          <div ref={baudrateRef} style={{ position: 'relative', width: '120px' }}>
            <input 
              type="text" 
              placeholder="Baudrate"
              style={{ width: '100%', padding: '10px', paddingRight: '30px', borderRadius: '8px', border: '1px solid var(--panel-border)', background: 'var(--input-bg)', color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box' }} 
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
                className="select-dropdown-enter"
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 6px)',
                  left: 0,
                  right: 0,
                  background: 'var(--card-bg)',
                  backdropFilter: 'blur(16px)',
                  border: '1px solid var(--panel-border)',
                  borderRadius: '8px',
                  boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.2)',
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
                      background: baudRate === val ? 'var(--nav-active-bg)' : 'transparent',
                      cursor: 'pointer',
                      transition: 'background-color 150ms cubic-bezier(0.23, 1, 0.32, 1), color 150ms cubic-bezier(0.23, 1, 0.32, 1)',
                    }}
                    onMouseEnter={(e) => {
                      if (baudRate !== val) {
                        e.currentTarget.style.background = 'var(--hover-overlay)';
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
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            onClick={() => setShowProfilesModal(true)} 
            style={{ 
              background: 'var(--input-bg)', 
              color: 'var(--text-primary)',
              border: '1px solid var(--panel-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '10px',
              borderRadius: '8px'
            }}
            title="Saved Devices"
          >
            <BookmarkIcon width="18" height="18" style={{ color: 'var(--accent-color)' }} />
          </button>
          <button onClick={handleConnectTerminal}>Connect</button>
        </div>
      ) : (
        <button onClick={handleDisconnectTerminal} style={{ background: 'var(--danger)' }}>Disconnect</button>
      )}
    </div>

    {showProfilesModal && (
      <ProfileManagerModal 
        onClose={() => setShowProfilesModal(false)}
        onSelectProfile={(profile, decryptedPass) => {
          setTerminalMode(profile.type);
          setHost(profile.host);
          setPort(profile.port);
          if (profile.type === 'ssh') {
            setUsername(profile.username || '');
            setPassword(decryptedPass || '');
          }
          // The form state will update. If you wanted auto-connect, 
          // we could call handleConnectTerminal here, but we'd need to wait 
          // for state to update. For safety, let the user click Connect manually 
          // or we can wrap the state updates in a timeout. Let's just populate the form.
        }}
      />
    )}
    </>
  );
}

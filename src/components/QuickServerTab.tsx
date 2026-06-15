import { useState, useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';

interface Props {
  socket: Socket;
}

interface ServerState {
  running: boolean;
  port: number | null;
  rootDir: string | null;
}

declare global {
  interface Window {
    electronAPI: {
      ping: (host: string) => Promise<{ success: boolean; host: string }>;
      selectDirectory: () => Promise<string | null>;
    };
  }
}

export default function QuickServerTab({ socket }: Props) {
  const [activeSubTab, setActiveSubTab] = useState<'http' | 'https' | 'ftp' | 'tftp'>('http');
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  // Server states (synchronized with backend)
  const [servers, setServers] = useState<{
    http: ServerState;
    https: ServerState;
    ftp: ServerState;
    tftp: ServerState;
  }>({
    http: { running: false, port: null, rootDir: null },
    https: { running: false, port: null, rootDir: null },
    ftp: { running: false, port: null, rootDir: null },
    tftp: { running: false, port: null, rootDir: null }
  });

  // Config States for each server
  const [httpPort, setHttpPort] = useState('8080');
  const [httpRootDir, setHttpRootDir] = useState('');

  const [httpsPort, setHttpsPort] = useState('8443');
  const [httpsRootDir, setHttpsRootDir] = useState('');
  const [useSelfSigned, setUseSelfSigned] = useState(true);
  const [sslKeyPath, setSslKeyPath] = useState('');
  const [sslCertPath, setSslCertPath] = useState('');

  const [ftpPort, setFtpPort] = useState('2121');
  const [ftpRootDir, setFtpRootDir] = useState('');
  const [ftpUser, setFtpUser] = useState('');
  const [ftpPass, setFtpPass] = useState('');

  const [tftpPort, setTftpPort] = useState('6969');
  const [tftpRootDir, setTftpRootDir] = useState('');

  // Logs state
  const [logs, setLogs] = useState<{
    http: { message: string; timestamp: string }[];
    https: { message: string; timestamp: string }[];
    ftp: { message: string; timestamp: string }[];
    tftp: { message: string; timestamp: string }[];
  }>({
    http: [],
    https: [],
    ftp: [],
    tftp: []
  });

  const logsEndRef = useRef<HTMLDivElement>(null);

  // Check administrator privileges on load
  useEffect(() => {
    fetch('http://127.0.0.1:3001/api/is-admin')
      .then((res) => res.json())
      .then((data) => {
        setIsAdmin(data.isAdmin);
        // If administrator, update default ports to privileged ports
        if (data.isAdmin) {
          setHttpPort('80');
          setHttpsPort('443');
          setFtpPort('21');
          setTftpPort('69');
        }
      })
      .catch((err) => {
        console.error('Failed to check admin rights:', err);
        setIsAdmin(false);
      });
  }, []);

  // Socket listeners for server status and logs
  useEffect(() => {
    socket.emit('quick-server-get-status');

    socket.on('quick-server-status-all', (status) => {
      setServers(status);
      
      // Update config inputs if the servers are already running
      if (status.http.running) {
        setHttpPort(String(status.http.port));
        setHttpRootDir(status.http.rootDir || '');
      }
      if (status.https.running) {
        setHttpsPort(String(status.https.port));
        setHttpsRootDir(status.https.rootDir || '');
      }
      if (status.ftp.running) {
        setFtpPort(String(status.ftp.port));
        setFtpRootDir(status.ftp.rootDir || '');
      }
      if (status.tftp.running) {
        setTftpPort(String(status.tftp.port));
        setTftpRootDir(status.tftp.rootDir || '');
      }
    });

    socket.on('quick-server-status-update', (data) => {
      setServers((prev) => ({
        ...prev,
        [data.type]: {
          running: data.running,
          port: data.port,
          rootDir: data.running ? prev[data.type as keyof typeof prev].rootDir : null
        }
      }));
    });

    socket.on('quick-server-log', (data) => {
      setLogs((prev) => ({
        ...prev,
        [data.type]: [...prev[data.type as keyof typeof prev], { message: data.message, timestamp: data.timestamp }]
      }));
    });

    socket.on('quick-server-start-success', () => {
      // Handled via status updates
    });

    socket.on('quick-server-start-error', (data) => {
      alert(`[${data.type.toUpperCase()} Server Error] Start failed: ${data.error}`);
    });

    return () => {
      socket.off('quick-server-status-all');
      socket.off('quick-server-status-update');
      socket.off('quick-server-log');
      socket.off('quick-server-start-success');
      socket.off('quick-server-start-error');
    };
  }, [socket]);

  // Auto-scroll logs to bottom
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs, activeSubTab]);

  const selectDirectory = async (serverType: 'http' | 'https' | 'ftp' | 'tftp') => {
    if (typeof window.electronAPI === 'undefined' || !window.electronAPI.selectDirectory) {
      alert('Directory selector is only available in the desktop application.');
      return;
    }

    try {
      const selectedPath = await window.electronAPI.selectDirectory();
      if (selectedPath) {
        if (serverType === 'http') setHttpRootDir(selectedPath);
        if (serverType === 'https') setHttpsRootDir(selectedPath);
        if (serverType === 'ftp') setFtpRootDir(selectedPath);
        if (serverType === 'tftp') setTftpRootDir(selectedPath);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleServer = (type: 'http' | 'https' | 'ftp' | 'tftp') => {
    const isRunning = servers[type].running;

    if (isRunning) {
      socket.emit('quick-server-stop', type);
    } else {
      let config: any = {};
      if (type === 'http') {
        if (!httpRootDir) return alert('Please specify a root directory.');
        config = { port: httpPort, rootDir: httpRootDir };
      } else if (type === 'https') {
        if (!httpsRootDir) return alert('Please specify a root directory.');
        config = {
          port: httpsPort,
          rootDir: httpsRootDir,
          useSelfSigned,
          keyPath: sslKeyPath,
          certPath: sslCertPath
        };
      } else if (type === 'ftp') {
        if (!ftpRootDir) return alert('Please specify a root directory.');
        config = {
          port: ftpPort,
          rootDir: ftpRootDir,
          username: ftpUser,
          password: ftpPass
        };
      } else if (type === 'tftp') {
        if (!tftpRootDir) return alert('Please specify a root directory.');
        config = { port: tftpPort, rootDir: tftpRootDir };
      }

      socket.emit('quick-server-start', { type, config });
    }
  };

  const clearLogs = (type: 'http' | 'https' | 'ftp' | 'tftp') => {
    setLogs((prev) => ({
      ...prev,
      [type]: []
    }));
  };

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <h1>Quick Server</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: isAdmin ? 'var(--success)' : 'var(--warning)',
            boxShadow: isAdmin ? '0 0 8px var(--success)' : '0 0 8px var(--warning)'
          }}></div>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            {isAdmin === null ? 'Checking privileges...' : isAdmin ? 'Administrator Mode' : 'Standard Privilege Mode'}
          </span>
        </div>
      </div>

      {/* Warning for standard privileges */}
      {isAdmin === false && (
        <div className="glass-panel" style={{
          padding: '12px 18px',
          marginBottom: '18px',
          borderLeft: '4px solid var(--warning)',
          background: 'rgba(249, 226, 175, 0.04)',
          borderRadius: '8px',
          fontSize: '0.9rem',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <span style={{ fontSize: '1.2rem' }}>⚠️</span>
          <div>
            <strong style={{ color: 'var(--warning)' }}>Limited Privileges:</strong> Standard ports (&lt; 1024) such as 80, 443, 21, and 69 are blocked by the OS. Dynamic high ports are configured. Restart NetTool as Administrator to bind to standard ports.
          </div>
        </div>
      )}

      {/* Sub-tabs selection */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '18px' }}>
        {(['http', 'https', 'ftp', 'tftp'] as const).map((tab) => {
          const isRunning = servers[tab].running;
          return (
            <button
              key={tab}
              onClick={() => setActiveSubTab(tab)}
              className={activeSubTab === tab ? '' : 'btn-secondary'}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontWeight: activeSubTab === tab ? '600' : 'normal',
                backgroundColor: activeSubTab === tab ? 'var(--accent-color)' : 'rgba(255, 255, 255, 0.05)',
                color: activeSubTab === tab ? '#11111b' : 'var(--text-primary)',
                border: activeSubTab === tab ? 'none' : '1px solid var(--panel-border)'
              }}
            >
              <span style={{ textTransform: 'uppercase' }}>{tab}</span>
              {isRunning && (
                <span style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: '#a6e3a1',
                  boxShadow: '0 0 6px #a6e3a1',
                  display: 'inline-block'
                }}></span>
              )}
            </button>
          );
        })}
      </div>

      {/* Main Server Tab Panel */}
      <div style={{ display: 'flex', gap: '20px', flex: 1, overflow: 'hidden', minHeight: 0 }}>
        
        {/* Left Side: Server Config Panel */}
        <div className="glass-panel stat-card" style={{ flex: 1.2, padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px', overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ textTransform: 'uppercase' }}>{activeSubTab} Server Config</h3>
            <span style={{
              fontSize: '0.8rem',
              padding: '4px 8px',
              borderRadius: '12px',
              fontWeight: 'bold',
              backgroundColor: servers[activeSubTab].running ? 'rgba(166, 227, 161, 0.15)' : 'rgba(255, 255, 255, 0.05)',
              color: servers[activeSubTab].running ? 'var(--success)' : 'var(--text-secondary)'
            }}>
              {servers[activeSubTab].running ? `RUNNING (Port ${servers[activeSubTab].port})` : 'STOPPED'}
            </span>
          </div>

          {/* Tab Content 1: HTTP */}
          {activeSubTab === 'http' && (
            <>
              <div>
                <label className="subtext" style={{ display: 'block', marginBottom: '6px' }}>Port</label>
                <input
                  type="number"
                  disabled={servers.http.running}
                  value={httpPort}
                  onChange={(e) => setHttpPort(e.target.value)}
                  className="ui-input"
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <label className="subtext" style={{ display: 'block', marginBottom: '6px' }}>Root Directory</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    disabled={servers.http.running}
                    placeholder="Select folder to serve..."
                    value={httpRootDir}
                    onChange={(e) => setHttpRootDir(e.target.value)}
                    className="ui-input"
                    style={{ flex: 1 }}
                  />
                  <button
                    disabled={servers.http.running}
                    onClick={() => selectDirectory('http')}
                    className="btn-secondary"
                    style={{ padding: '0 15px' }}
                  >
                    Browse
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Tab Content 2: HTTPS */}
          {activeSubTab === 'https' && (
            <>
              <div>
                <label className="subtext" style={{ display: 'block', marginBottom: '6px' }}>Port</label>
                <input
                  type="number"
                  disabled={servers.https.running}
                  value={httpsPort}
                  onChange={(e) => setHttpsPort(e.target.value)}
                  className="ui-input"
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <label className="subtext" style={{ display: 'block', marginBottom: '6px' }}>Root Directory</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    disabled={servers.https.running}
                    placeholder="Select folder to serve..."
                    value={httpsRootDir}
                    onChange={(e) => setHttpsRootDir(e.target.value)}
                    className="ui-input"
                    style={{ flex: 1 }}
                  />
                  <button
                    disabled={servers.https.running}
                    onClick={() => selectDirectory('https')}
                    className="btn-secondary"
                    style={{ padding: '0 15px' }}
                  >
                    Browse
                  </button>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '5px' }}>
                <input
                  type="checkbox"
                  id="selfsigned"
                  disabled={servers.https.running}
                  checked={useSelfSigned}
                  onChange={(e) => setUseSelfSigned(e.target.checked)}
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <label htmlFor="selfsigned" style={{ fontSize: '0.9rem', cursor: 'pointer', userSelect: 'none' }}>
                  Generate self-signed SSL certificate automatically
                </label>
              </div>

              {!useSelfSigned && (
                <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '5px', padding: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                  <div>
                    <label className="subtext" style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem' }}>SSL Private Key Path (.key)</label>
                    <input
                      type="text"
                      disabled={servers.https.running}
                      placeholder="C:\path\to\server.key"
                      value={sslKeyPath}
                      onChange={(e) => setSslKeyPath(e.target.value)}
                      className="ui-input"
                      style={{ width: '100%', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div>
                    <label className="subtext" style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem' }}>SSL Certificate Path (.crt / .pem)</label>
                    <input
                      type="text"
                      disabled={servers.https.running}
                      placeholder="C:\path\to\server.crt"
                      value={sslCertPath}
                      onChange={(e) => setSslCertPath(e.target.value)}
                      className="ui-input"
                      style={{ width: '100%', fontSize: '0.85rem' }}
                    />
                  </div>
                </div>
              )}
            </>
          )}

          {/* Tab Content 3: FTP */}
          {activeSubTab === 'ftp' && (
            <>
              <div>
                <label className="subtext" style={{ display: 'block', marginBottom: '6px' }}>Port</label>
                <input
                  type="number"
                  disabled={servers.ftp.running}
                  value={ftpPort}
                  onChange={(e) => setFtpPort(e.target.value)}
                  className="ui-input"
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <label className="subtext" style={{ display: 'block', marginBottom: '6px' }}>Root Directory</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    disabled={servers.ftp.running}
                    placeholder="Select FTP storage folder..."
                    value={ftpRootDir}
                    onChange={(e) => setFtpRootDir(e.target.value)}
                    className="ui-input"
                    style={{ flex: 1 }}
                  />
                  <button
                    disabled={servers.ftp.running}
                    onClick={() => selectDirectory('ftp')}
                    className="btn-secondary"
                    style={{ padding: '0 15px' }}
                  >
                    Browse
                  </button>
                </div>
              </div>
              
              <div style={{ padding: '12px', background: 'rgba(0,0,0,0.15)', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Authentication settings (leave empty for anonymous login):
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input
                    type="text"
                    disabled={servers.ftp.running}
                    placeholder="Username"
                    value={ftpUser}
                    onChange={(e) => setFtpUser(e.target.value)}
                    className="ui-input"
                    style={{ flex: 1, fontSize: '0.85rem' }}
                  />
                  <input
                    type="password"
                    disabled={servers.ftp.running}
                    placeholder="Password"
                    value={ftpPass}
                    onChange={(e) => setFtpPass(e.target.value)}
                    className="ui-input"
                    style={{ flex: 1, fontSize: '0.85rem' }}
                  />
                </div>
              </div>
            </>
          )}

          {/* Tab Content 4: TFTP */}
          {activeSubTab === 'tftp' && (
            <>
              <div>
                <label className="subtext" style={{ display: 'block', marginBottom: '6px' }}>Port</label>
                <input
                  type="number"
                  disabled={servers.tftp.running}
                  value={tftpPort}
                  onChange={(e) => setTftpPort(e.target.value)}
                  className="ui-input"
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <label className="subtext" style={{ display: 'block', marginBottom: '6px' }}>TFTP Root Directory</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    disabled={servers.tftp.running}
                    placeholder="Select TFTP folder (config/images)..."
                    value={tftpRootDir}
                    onChange={(e) => setTftpRootDir(e.target.value)}
                    className="ui-input"
                    style={{ flex: 1 }}
                  />
                  <button
                    disabled={servers.tftp.running}
                    onClick={() => selectDirectory('tftp')}
                    className="btn-secondary"
                    style={{ padding: '0 15px' }}
                  >
                    Browse
                  </button>
                </div>
              </div>
            </>
          )}

          <div style={{ marginTop: 'auto', paddingTop: '10px' }}>
            <button
              onClick={() => handleToggleServer(activeSubTab)}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: 'bold',
                backgroundColor: servers[activeSubTab].running ? 'var(--danger)' : 'var(--accent-color)',
                color: servers[activeSubTab].running ? 'white' : '#11111b',
                transition: 'background-color 0.2s ease',
                border: 'none',
                boxShadow: servers[activeSubTab].running ? '0 0 10px rgba(243, 139, 168, 0.2)' : '0 0 10px rgba(137, 180, 250, 0.2)'
              }}
            >
              {servers[activeSubTab].running ? `Stop ${activeSubTab.toUpperCase()} Server` : `Start ${activeSubTab.toUpperCase()} Server`}
            </button>
          </div>
        </div>

        {/* Right Side: Real-Time Server Logs Terminal */}
        <div className="glass-panel stat-card" style={{
          flex: 1.8,
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          background: 'rgba(10, 10, 15, 0.85)',
          border: '1px solid rgba(255,255,255,0.05)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <h3 style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{
                display: 'inline-block',
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: servers[activeSubTab].running ? 'var(--success)' : 'rgba(255,255,255,0.2)'
              }}></span>
              {activeSubTab.toUpperCase()} SERVER LOGS
            </h3>
            <button
              onClick={() => clearLogs(activeSubTab)}
              className="btn-secondary"
              style={{ padding: '4px 10px', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid var(--panel-border)' }}
            >
              Clear Logs
            </button>
          </div>

          <div style={{
            flex: 1,
            background: 'rgba(0,0,0,0.4)',
            borderRadius: '6px',
            padding: '12px',
            overflowY: 'auto',
            fontFamily: 'Fira Code, Source Code Pro, monospace',
            fontSize: '0.8rem',
            lineHeight: '1.4',
            color: '#cdd6f4',
            border: '1px solid rgba(255,255,255,0.03)'
          }}>
            {logs[activeSubTab].length === 0 ? (
              <div style={{ color: 'var(--text-secondary)', opacity: 0.6, fontStyle: 'italic' }}>
                Server is offline. Start the server and incoming operations will be displayed here in real-time...
              </div>
            ) : (
              logs[activeSubTab].map((log, index) => (
                <div key={index} style={{ marginBottom: '4px', wordBreak: 'break-all' }}>
                  <span style={{ color: 'var(--accent-color)', marginRight: '8px' }}>[{log.timestamp}]</span>
                  <span style={{
                    color: log.message.toLowerCase().includes('error') || log.message.toLowerCase().includes('fail')
                      ? 'var(--danger)'
                      : log.message.includes('successfully') || log.message.includes('complete') || log.message.includes('logged in')
                      ? 'var(--success)'
                      : '#cdd6f4'
                  }}>
                    {log.message}
                  </span>
                </div>
              ))
            )}
            <div ref={logsEndRef} />
          </div>
        </div>

      </div>
    </div>
  );
}

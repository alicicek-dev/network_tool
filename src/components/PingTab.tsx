import { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';
import TerminalComponent from '../TerminalComponent';

interface Props {
  socket: Socket;
}

interface MultiHistoryItem {
  seq: number;
  time: string;
  replyIp: string;
  rtt: number | null;
  ttl: number | string;
  status: 'Success' | 'Timeout';
}

interface TargetStats {
  target: string;
  ip: string;
  sent: number;
  success: number;
  failed: number;
  lastRtt: number | null;
  avgRtt: number | null;
  consecutiveFailed: number;
  maxConsecutiveFailed: number;
  history: MultiHistoryItem[];
}

export default function PingTab({ socket }: Props) {
  // Navigation sub-tab
  const [subTab, setSubTab] = useState<'single' | 'multi'>('single');

  // --- Single Ping State ---
  const [pingTarget, setPingTarget] = useState('8.8.8.8');
  const [activePing, setActivePing] = useState('');
  const [pingMode, setPingMode] = useState('ping');
  
  const [summary, setSummary] = useState({
    sent: 0, received: 0, lost: 0, min: 0, max: 0, avg: 0, jitter: 0
  });

  // --- Multi Ping State ---
  const [multiTargetsInput, setMultiTargetsInput] = useState("8.8.8.8\n1.1.1.1\ngoogle.com");
  const [isMultiTesting, setIsMultiTesting] = useState(false);
  const [activeMultiTargets, setActiveMultiTargets] = useState<string[]>([]);
  const [multiPingStats, setMultiPingStats] = useState<Record<string, TargetStats>>({});
  const [selectedTarget, setSelectedTarget] = useState<string>('');

  useEffect(() => {
    // Single Ping Listener
    socket.on('ping-stat', (data) => {
      setSummary(prev => {
        const sent = prev.sent + 1;
        const received = data.alive ? prev.received + 1 : prev.received;
        const lost = sent - received;
        
        let min = prev.min;
        let max = prev.max;
        let avg = prev.avg;
        let jitter = prev.jitter;

        if (data.alive && data.time !== null) {
          const timeVal = typeof data.time === 'number' ? data.time : parseFloat(data.time as any);
          const time = isNaN(timeVal) ? null : timeVal;
          if (time !== null) {
            if (min === 0 || time < min) min = time;
            if (time > max) max = time;
            
            avg = prev.received === 0 ? time : ((prev.avg * prev.received) + time) / received;
            
            if (prev.received > 0) {
              const diff = Math.abs(time - prev.avg);
              jitter = prev.received === 1 ? diff : ((prev.jitter * (prev.received - 1)) + diff) / received;
            }
          }
        }

        return { sent, received, lost, min, max, avg, jitter };
      });
    });

    // Multi Ping Listener
    socket.on('multi-ping-stat', (data: {
      target: string;
      seq: number;
      alive: boolean;
      time: number | null;
      host: string;
      ttl: number | string;
    }) => {
      setMultiPingStats((prev) => {
        const current = prev[data.target] || {
          target: data.target,
          ip: data.host,
          sent: 0,
          success: 0,
          failed: 0,
          lastRtt: null,
          avgRtt: null,
          consecutiveFailed: 0,
          maxConsecutiveFailed: 0,
          history: []
        };

        const sent = current.sent + 1;
        const success = data.alive ? current.success + 1 : current.success;
        const failed = sent - success;
        const lastRtt = data.time;
        
        let avgRtt = current.avgRtt;
        if (data.alive && data.time !== null) {
          avgRtt = current.success === 0 ? data.time : ((current.avgRtt || 0) * current.success + data.time) / success;
        }

        const consecutiveFailed = data.alive ? 0 : current.consecutiveFailed + 1;
        const maxConsecutiveFailed = Math.max(current.maxConsecutiveFailed, consecutiveFailed);

        const now = new Date();
        const timeStr = now.toLocaleTimeString();

        const newHistoryItem: MultiHistoryItem = {
          seq: data.seq,
          time: timeStr,
          replyIp: data.host,
          rtt: data.time,
          ttl: data.ttl,
          status: data.alive ? 'Success' : 'Timeout'
        };

        return {
          ...prev,
          [data.target]: {
            target: data.target,
            ip: data.host,
            sent,
            success,
            failed,
            lastRtt,
            avgRtt,
            consecutiveFailed,
            maxConsecutiveFailed,
            history: [newHistoryItem, ...current.history].slice(0, 100)
          }
        };
      });
    });

    return () => {
      socket.off('ping-stat');
      socket.off('multi-ping-stat');
    };
  }, [socket]);

  // Clean up ping/multi-ping on unmount
  useEffect(() => {
    return () => {
      socket.emit('stop-ping');
      socket.emit('stop-multi-ping');
    };
  }, [socket]);

  // Single Ping Controls
  const handleStartPing = () => {
    if (pingTarget.trim()) {
      setSummary({ sent: 0, received: 0, lost: 0, min: 0, max: 0, avg: 0, jitter: 0 });
      setPingMode('ping');
      setActivePing(pingTarget.trim());
    }
  };

  const handleStartTrace = () => {
    if (pingTarget.trim()) {
      setSummary({ sent: 0, received: 0, lost: 0, min: 0, max: 0, avg: 0, jitter: 0 });
      setPingMode('traceroute');
      setActivePing(pingTarget.trim());
    }
  };

  const handleStopPing = () => {
    setActivePing('');
  };

  // Multi Ping Controls
  const handleStartMultiPing = () => {
    const list = multiTargetsInput
      .split('\n')
      .map(t => t.trim())
      .filter(t => t.length > 0);
    
    if (list.length === 0) return;

    const initialStats: Record<string, TargetStats> = {};
    list.forEach(t => {
      initialStats[t] = {
        target: t,
        ip: '-',
        sent: 0,
        success: 0,
        failed: 0,
        lastRtt: null,
        avgRtt: null,
        consecutiveFailed: 0,
        maxConsecutiveFailed: 0,
        history: []
      };
    });

    setMultiPingStats(initialStats);
    setSelectedTarget(list[0]);
    setIsMultiTesting(true);
    setActiveMultiTargets(list);
    socket.emit('start-multi-ping', list);
  };

  const handleStopMultiPing = () => {
    socket.emit('stop-multi-ping');
    setIsMultiTesting(false);
  };

  const packetLossPercent = summary.sent > 0 ? ((summary.lost / summary.sent) * 100).toFixed(1) : 0;
  
  return (
    <div className="fade-in" style={{display: 'flex', flexDirection: 'column', height: '100%', gap: '15px'}}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Ping & Traceroute</h1>
        
        {/* Segmented Sub-Tab Control */}
        <div style={{ display: 'flex', gap: '8px', background: 'var(--hover-overlay)', padding: '4px', borderRadius: '20px', border: '1px solid var(--panel-border)' }}>
          <button 
            onClick={() => setSubTab('single')} 
            disabled={isMultiTesting || !!activePing}
            style={{
              background: subTab === 'single' ? 'var(--accent-color)' : 'transparent',
              color: subTab === 'single' ? 'var(--button-text)' : 'var(--text-primary)',
              border: 'none',
              borderRadius: '16px',
              padding: '6px 16px',
              fontSize: '0.85rem',
              cursor: (isMultiTesting || !!activePing) ? 'not-allowed' : 'pointer',
              transition: 'background-color 160ms cubic-bezier(0.23, 1, 0.32, 1), color 160ms cubic-bezier(0.23, 1, 0.32, 1), transform 160ms cubic-bezier(0.23, 1, 0.32, 1)',
              fontWeight: '600'
            }}
          >
            Single Ping
          </button>
          <button 
            onClick={() => setSubTab('multi')} 
            disabled={isMultiTesting || !!activePing}
            style={{
              background: subTab === 'multi' ? 'var(--accent-color)' : 'transparent',
              color: subTab === 'multi' ? 'var(--button-text)' : 'var(--text-primary)',
              border: 'none',
              borderRadius: '16px',
              padding: '6px 16px',
              fontSize: '0.85rem',
              cursor: (isMultiTesting || !!activePing) ? 'not-allowed' : 'pointer',
              transition: 'background-color 160ms cubic-bezier(0.23, 1, 0.32, 1), color 160ms cubic-bezier(0.23, 1, 0.32, 1), transform 160ms cubic-bezier(0.23, 1, 0.32, 1)',
              fontWeight: '600'
            }}
          >
            Multi-Ping
          </button>
        </div>
      </div>

      {/* --- SINGLE PING VIEW --- */}
      {subTab === 'single' && (
        <>
          {/* Controls */}
          <div className="glass-panel" style={{padding: '15px', display: 'flex', gap: '10px'}}>
            <input 
              type="text" 
              placeholder="Enter IP or Domain (e.g. 8.8.8.8)" 
              className="ui-input"
              style={{flex: 1, margin: 0}} 
              value={pingTarget}
              onChange={(e) => setPingTarget(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleStartPing()}
              disabled={!!activePing}
            />
            {activePing ? (
              <button onClick={handleStopPing} style={{background: 'var(--danger)'}}>Stop</button>
            ) : (
              <div style={{display: 'flex', gap: '10px'}}>
                <button onClick={handleStartPing}>Ping</button>
                <button onClick={handleStartTrace} style={{background: 'var(--panel-border)', color: 'var(--text-primary)'}}>Traceroute</button>
              </div>
            )}
          </div>

          {/* Stats Cards */}
          {pingMode === 'ping' && (
            <div className="dashboard-grid" style={{gridTemplateColumns: '1fr 1fr 1fr 1fr'}}>
              <div className="stat-card glass-panel" style={{padding: '15px'}}>
                <div className="stat-label">Packet Loss</div>
                <div className="stat-value" style={{color: Number(packetLossPercent) > 0 ? 'var(--danger)' : 'var(--success)'}}>
                  {packetLossPercent}%
                </div>
                <div className="subtext">Sent: {summary.sent} | Lost: {summary.lost}</div>
              </div>
              <div className="stat-card glass-panel" style={{padding: '15px'}}>
                <div className="stat-label">Min Latency</div>
                <div className="stat-value">{summary.min > 0 ? `${summary.min} ms` : '-'}</div>
              </div>
              <div className="stat-card glass-panel" style={{padding: '15px'}}>
                <div className="stat-label">Avg Latency</div>
                <div className="stat-value" style={{color: 'var(--accent-color)'}}>{summary.avg > 0 ? `${summary.avg.toFixed(1)} ms` : '-'}</div>
              </div>
              <div className="stat-card glass-panel" style={{padding: '15px'}}>
                <div className="stat-label">Jitter</div>
                <div className="stat-value" style={{color: 'var(--warning)'}}>{summary.jitter > 0 ? `${summary.jitter.toFixed(1)} ms` : '-'}</div>
              </div>
            </div>
          )}

          {/* Terminal */}
          <div className="terminal-container" style={{flex: 1, minHeight: '150px'}}>
            {activePing ? (
              <TerminalComponent action={pingMode} target={activePing} socket={socket} />
            ) : (
              <div className="placeholder-text" style={{padding: '15px', fontFamily: 'monospace'}}>
                Ready. Enter a target and click Ping...
              </div>
            )}
          </div>
        </>
      )}

      {/* --- MULTI PING VIEW --- */}
      {subTab === 'multi' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', flex: 1, minHeight: 0 }}>
          
          {/* Controls */}
          <div className="glass-panel" style={{ padding: '15px', display: 'flex', gap: '15px', alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: '500' }}>
                Target Hosts (one per line)
              </label>
              <textarea 
                placeholder="8.8.8.8&#10;1.1.1.1&#10;google.com"
                value={multiTargetsInput}
                onChange={e => setMultiTargetsInput(e.target.value)}
                disabled={isMultiTesting}
                style={{
                  width: '100%',
                  height: '75px',
                  background: 'var(--input-bg)',
                  border: '1px solid var(--panel-border)',
                  borderRadius: '8px',
                  color: 'var(--text-primary)',
                  padding: '8px 12px',
                  fontFamily: 'monospace',
                  fontSize: '0.85rem',
                  resize: 'none',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            <div>
              {!isMultiTesting ? (
                <button onClick={handleStartMultiPing} style={{ width: '140px', height: '42px' }}>Start Ping</button>
              ) : (
                <button onClick={handleStopMultiPing} style={{ width: '140px', height: '42px', background: 'var(--danger)' }}>Stop Ping</button>
              )}
            </div>
          </div>

          {/* Dual-Pane View */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', flex: 1, minHeight: 0 }}>
            
            {/* Top Table - Targets list */}
            <div className="glass-panel" style={{ flex: 1.2, display: 'flex', flexDirection: 'column', padding: '15px', minHeight: 0 }}>
              <h3 style={{ marginBottom: '10px', fontSize: '1.1rem' }}>Targets Summary</h3>
              <div style={{ flex: 1, overflowY: 'auto', background: 'var(--card-bg)', borderRadius: '8px', border: '1px solid var(--panel-border)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: 'var(--hover-overlay)', color: 'var(--text-secondary)', borderBottom: '1px solid var(--panel-border)' }}>
                      <th style={{ padding: '10px 12px', width: '60px', textAlign: 'center' }}>Status</th>
                      <th style={{ padding: '10px 12px' }}>Host Name</th>
                      <th style={{ padding: '10px 12px' }}>IP Address</th>
                      <th style={{ padding: '10px 12px', textAlign: 'center' }}>Sent</th>
                      <th style={{ padding: '10px 12px', textAlign: 'center' }}>Success</th>
                      <th style={{ padding: '10px 12px', textAlign: 'center' }}>Failed</th>
                      <th style={{ padding: '10px 12px', textAlign: 'center' }}>Failed %</th>
                      <th style={{ padding: '10px 12px', textAlign: 'center' }}>Last RTT</th>
                      <th style={{ padding: '10px 12px', textAlign: 'center' }}>Avg RTT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeMultiTargets.map(t => {
                      const stats = multiPingStats[t] || {
                        target: t, ip: '-', sent: 0, success: 0, failed: 0, lastRtt: null, avgRtt: null, history: []
                      };
                      const failedPercent = stats.sent > 0 ? ((stats.failed / stats.sent) * 100).toFixed(1) : '0.0';
                      const isSelected = selectedTarget === t;
                      
                      let statusColor = '#7f8c8d'; // gray
                      if (stats.sent > 0) {
                        const lastHistory = stats.history && stats.history[0];
                        statusColor = lastHistory && lastHistory.status === 'Success' ? 'var(--success)' : 'var(--danger)';
                      }

                      return (
                        <tr 
                          key={t} 
                          onClick={() => setSelectedTarget(t)}
                          style={{ 
                            borderBottom: '1px solid var(--border-subtle)', 
                            cursor: 'pointer',
                            background: isSelected ? 'var(--nav-active-bg)' : 'transparent',
                            color: isSelected ? 'var(--accent-color)' : 'var(--text-primary)',
                            transition: 'background 0.15s ease'
                          }}
                        >
                          <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                            <span style={{ 
                              display: 'inline-block', 
                              width: '9px', 
                              height: '9px', 
                              borderRadius: '50%', 
                              background: statusColor,
                              boxShadow: stats.sent > 0 ? `0 0 6px ${statusColor}` : 'none'
                            }} />
                          </td>
                          <td style={{ padding: '8px 12px', fontWeight: 'bold' }}>{t}</td>
                          <td style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>{stats.ip}</td>
                          <td style={{ padding: '8px 12px', textAlign: 'center' }}>{stats.sent}</td>
                          <td style={{ padding: '8px 12px', textAlign: 'center', color: 'var(--success)' }}>{stats.success}</td>
                          <td style={{ padding: '8px 12px', textAlign: 'center', color: stats.failed > 0 ? 'var(--danger)' : 'var(--text-secondary)' }}>{stats.failed}</td>
                          <td style={{ padding: '8px 12px', textAlign: 'center', color: Number(failedPercent) > 0 ? 'var(--danger)' : 'var(--text-secondary)' }}>{failedPercent}%</td>
                          <td style={{ padding: '8px 12px', textAlign: 'center' }}>{stats.lastRtt !== null ? `${stats.lastRtt} ms` : '-'}</td>
                          <td style={{ padding: '8px 12px', textAlign: 'center' }}>{stats.avgRtt !== null ? `${stats.avgRtt.toFixed(1)} ms` : '-'}</td>
                        </tr>
                      );
                    })}
                    {activeMultiTargets.length === 0 && (
                      <tr>
                        <td colSpan={9} style={{ padding: '20px', textAlign: 'center', color: 'gray' }}>
                          Enter hosts above and click Start Ping.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bottom Table - Selected host history */}
            <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '15px', minHeight: 0 }}>
              <h3 style={{ marginBottom: '10px', fontSize: '1.1rem' }}>
                Ping History for <span style={{ color: 'var(--accent-color)' }}>{selectedTarget || '-'}</span>
              </h3>
              <div style={{ flex: 1, overflowY: 'auto', background: 'var(--card-bg)', borderRadius: '8px', border: '1px solid var(--panel-border)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: 'var(--hover-overlay)', color: 'var(--text-secondary)', borderBottom: '1px solid var(--panel-border)' }}>
                      <th style={{ padding: '10px 12px', width: '60px' }}>Seq</th>
                      <th style={{ padding: '10px 12px' }}>Time</th>
                      <th style={{ padding: '10px 12px' }}>Reply IP</th>
                      <th style={{ padding: '10px 12px', textAlign: 'center' }}>RTT</th>
                      <th style={{ padding: '10px 12px', textAlign: 'center' }}>TTL</th>
                      <th style={{ padding: '10px 12px', textAlign: 'center' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedTarget && multiPingStats[selectedTarget]?.history?.map((h, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>#{h.seq}</td>
                        <td style={{ padding: '8px 12px' }}>{h.time}</td>
                        <td style={{ padding: '8px 12px' }}>{h.replyIp}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'center' }}>{h.rtt !== null ? `${h.rtt} ms` : '-'}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'center' }}>{h.ttl}</td>
                        <td style={{ 
                          padding: '8px 12px', 
                          textAlign: 'center', 
                          fontWeight: 'bold', 
                          color: h.status === 'Success' ? 'var(--success)' : 'var(--danger)'
                        }}>
                          {h.status}
                        </td>
                      </tr>
                    ))}
                    {(!selectedTarget || !multiPingStats[selectedTarget]?.history?.length) && (
                      <tr>
                        <td colSpan={6} style={{ padding: '20px', textAlign: 'center', color: 'gray' }}>
                          No history records. Select a host from the table above to view history.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

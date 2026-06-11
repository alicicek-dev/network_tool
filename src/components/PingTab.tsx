import { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';
// Recharts removed
import TerminalComponent from '../TerminalComponent';

interface Props {
  socket: Socket;
}

export default function PingTab({ socket }: Props) {
  const [pingTarget, setPingTarget] = useState('8.8.8.8');
  const [activePing, setActivePing] = useState('');
  const [pingMode, setPingMode] = useState('ping');
  
  const [summary, setSummary] = useState({
    sent: 0, received: 0, lost: 0, min: 0, max: 0, avg: 0, jitter: 0
  });

  useEffect(() => {
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

    return () => {
      socket.off('ping-stat');
    };
  }, [socket]);

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

  const packetLossPercent = summary.sent > 0 ? ((summary.lost / summary.sent) * 100).toFixed(1) : 0;
  
  return (
    <div className="fade-in" style={{display: 'flex', flexDirection: 'column', height: '100%', gap: '15px'}}>
      <h1>Ping & Traceroute</h1>
      
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
            <div className="stat-value" style={{color: 'var(--primary)'}}>{summary.avg > 0 ? `${summary.avg.toFixed(1)} ms` : '-'}</div>
          </div>
          <div className="stat-card glass-panel" style={{padding: '15px'}}>
            <div className="stat-label">Jitter</div>
            <div className="stat-value" style={{color: 'var(--warning)'}}>{summary.jitter > 0 ? `${summary.jitter.toFixed(1)} ms` : '-'}</div>
          </div>
        </div>
      )}

      {/* Terminal */}
      <div className="terminal-container" style={{flex: 1, minHeight: '200px'}}>
        {activePing ? (
          <TerminalComponent action={pingMode} target={activePing} socket={socket} />
        ) : (
          <div className="placeholder-text" style={{padding: '15px', fontFamily: 'monospace'}}>
            Ready. Enter a target and click Ping...
          </div>
        )}
      </div>
    </div>
  );
}

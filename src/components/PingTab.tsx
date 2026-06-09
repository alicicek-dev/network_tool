import { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import TerminalComponent from '../TerminalComponent';

interface Props {
  socket: Socket;
}

export default function PingTab({ socket }: Props) {
  const [pingTarget, setPingTarget] = useState('');
  const [activePing, setActivePing] = useState('');
  const [pingMode, setPingMode] = useState('ping');
  
  // Stats state
  const [stats, setStats] = useState<{seq: number, alive: boolean, time: number | null, host?: string}[]>([]);
  const [summary, setSummary] = useState({
    sent: 0, received: 0, lost: 0, min: 0, max: 0, avg: 0, jitter: 0
  });

  useEffect(() => {
    socket.on('ping-stat', (data) => {
      setStats(prev => {
        const newStats = [...prev, data];
        if (newStats.length > 50) newStats.shift();
        return newStats;
      });

      setSummary(prev => {
        const sent = prev.sent + 1;
        const received = data.alive ? prev.received + 1 : prev.received;
        const lost = sent - received;
        
        let min = prev.min;
        let max = prev.max;
        let avg = prev.avg;
        let jitter = prev.jitter;

        if (data.alive && data.time !== null) {
          if (min === 0 || data.time < min) min = data.time;
          if (data.time > max) max = data.time;
          
          avg = prev.received === 0 ? data.time : ((prev.avg * prev.received) + data.time) / received;
          
          if (prev.received > 0) {
            // Find last alive ping time for jitter
            let lastTime = data.time;
            setStats(curr => {
              for (let i = curr.length - 1; i >= 0; i--) {
                if (curr[i].alive && curr[i].time !== null) {
                  lastTime = curr[i].time!;
                  break;
                }
              }
              return curr;
            });
            const diff = Math.abs(data.time - lastTime);
            jitter = prev.received === 1 ? diff : ((prev.jitter * (prev.received - 1)) + diff) / received;
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
      setStats([]);
      setSummary({ sent: 0, received: 0, lost: 0, min: 0, max: 0, avg: 0, jitter: 0 });
      setPingMode('ping');
      setActivePing(pingTarget.trim());
    }
  };

  const handleStartTrace = () => {
    if (pingTarget.trim()) {
      setStats([]);
      setSummary({ sent: 0, received: 0, lost: 0, min: 0, max: 0, avg: 0, jitter: 0 });
      setPingMode('trace');
      setActivePing(pingTarget.trim());
    }
  };

  const handleStopPing = () => {
    setActivePing('');
  };

  const packetLossPercent = summary.sent > 0 ? ((summary.lost / summary.sent) * 100).toFixed(1) : 0;
  
  // Custom tooltip for chart
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={{ background: 'rgba(0,0,0,0.8)', padding: '10px', border: '1px solid var(--panel-border)', borderRadius: '5px' }}>
          <p style={{ margin: 0 }}>Seq: {data.seq}</p>
          <p style={{ margin: 0, color: data.alive ? 'var(--success)' : 'var(--danger)' }}>
            {data.alive ? `Time: ${data.time}ms` : 'Timeout'}
          </p>
        </div>
      );
    }
    return null;
  };

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
        {!activePing ? (
          <>
            <button onClick={handleStartPing}>Ping</button>
            <button onClick={handleStartTrace} style={{background: 'var(--panel-border)', color: 'var(--text-primary)'}}>Traceroute</button>
          </>
        ) : (
          <button onClick={handleStopPing} style={{background: 'var(--danger)'}}>Stop</button>
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

      {/* Chart */}
      {pingMode === 'ping' && (
        <div className="glass-panel" style={{padding: '20px', height: '200px', display: 'flex', flexDirection: 'column'}}>
          <h3 style={{margin: '0 0 10px 0', fontSize: '1rem'}}>Live Latency (Last 50 pings)</h3>
          {stats.length > 0 ? (
            <div style={{flex: 1, minHeight: 0}}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats}>
                  <XAxis dataKey="seq" stroke="var(--text-secondary)" tick={false} />
                  <YAxis stroke="var(--text-secondary)" width={40} domain={['auto', 'auto']} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line 
                    type="monotone" 
                    dataKey="time" 
                    stroke="var(--primary)" 
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="placeholder-text" style={{display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1}}>
              Ping başlatıldığında grafik burada belirecektir...
            </div>
          )}
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

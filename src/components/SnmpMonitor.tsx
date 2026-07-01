import { useState, useEffect } from 'react';
import { API_BASE } from '../config';

const OIDS = {
  sysName: '1.3.6.1.2.1.1.5.0',
  sysDescr: '1.3.6.1.2.1.1.1.0',
  sysUpTime: '1.3.6.1.2.1.1.3.0',
  ifNumber: '1.3.6.1.2.1.2.1.0'
};

export default function SnmpMonitor() {
  const [host, setHost] = useState('');
  const [community, setCommunity] = useState('public');
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const fetchSnmp = async () => {
    if (!host) return;
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/snmp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host,
          community,
          oids: Object.values(OIDS)
        })
      });
      const result = await res.json();
      if (res.ok) {
        setData(result);
      } else {
        setError(result.error || 'SNMP Request Failed');
      }
    } catch (err: any) {
      setError(err.message || 'Connection error');
    }
    setIsLoading(false);
  };

  useEffect(() => {
    let interval: any;
    if (autoRefresh && host && !error) {
      interval = setInterval(fetchSnmp, 5000);
    }
    return () => clearInterval(interval);
  }, [autoRefresh, host, error]);

  const formatUptime = (ticks: number) => {
    if (!ticks) return 'Unknown';
    const totalSeconds = Math.floor(ticks / 100);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
  };

  return (
    <div className="glass-panel stat-card" style={{ gridColumn: '1 / -1' }}>
      <h3>SNMP Monitor</h3>
      <p className="subtext">Fetch device info via SNMP (v1/v2c).</p>
      
      <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
        <input 
          type="text" 
          placeholder="Device IP" 
          value={host} 
          onChange={e => setHost(e.target.value)} 
          className="ui-input" 
          style={{ flex: 2 }}
        />
        <input 
          type="text" 
          placeholder="Community (e.g. public)" 
          value={community} 
          onChange={e => setCommunity(e.target.value)} 
          className="ui-input" 
          style={{ flex: 1 }}
        />
        <button onClick={fetchSnmp} disabled={isLoading}>
          {isLoading ? 'Polling...' : 'Poll Device'}
        </button>
        <label style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--text-secondary)' }}>
          <input 
            type="checkbox" 
            checked={autoRefresh} 
            onChange={e => setAutoRefresh(e.target.checked)} 
          />
          Auto Refresh (5s)
        </label>
      </div>

      {error && (
        <div style={{ padding: '10px', background: 'var(--danger)', color: '#fff', borderRadius: '4px', marginBottom: '15px' }}>
          {error}
        </div>
      )}

      {data && !error && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: 'var(--input-bg)', padding: '15px', borderRadius: '8px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div>
              <span className="subtext">System Name (SysName):</span><br/>
              <b>{data[OIDS.sysName] || 'N/A'}</b>
            </div>
            <div>
              <span className="subtext">System Uptime:</span><br/>
              <b>{formatUptime(data[OIDS.sysUpTime])}</b>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <span className="subtext">Description (SysDescr):</span><br/>
              <b style={{ wordBreak: 'break-all' }}>{data[OIDS.sysDescr] || 'N/A'}</b>
            </div>
            <div>
              <span className="subtext">Total Interfaces:</span><br/>
              <b>{data[OIDS.ifNumber] || 'N/A'}</b>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

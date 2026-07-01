import { API_BASE } from '../config';
import { useState } from 'react';
import SnmpMonitor from './SnmpMonitor';

export default function UtilitiesTab() {
  // WoL
  const [wolMac, setWolMac] = useState('');
  const [wolStatus, setWolStatus] = useState('');

  // MAC
  const [vendorMac, setVendorMac] = useState('');
  const [vendorResult, setVendorResult] = useState('');

  // DNS & Whois
  const [domain, setDomain] = useState('');
  const [dnsResults, setDnsResults] = useState<any[]>([]);
  const [whoisResult, setWhoisResult] = useState<any>(null);
  const [isDnsLoading, setIsDnsLoading] = useState(false);

  // Subnet Calc
  const [subnetIp, setSubnetIp] = useState('192.168.1.0');
  const [subnetCidr, setSubnetCidr] = useState('24');
  const [calcResult, setCalcResult] = useState<any>(null);

  const handleWakeOnLan = async () => {
    if (!wolMac) return;
    try {
      const res = await fetch(`${API_BASE}/api/wol`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mac: wolMac })
      });
      const data = await res.json();
      setWolStatus(res.ok ? `✅ ${data.message}` : `❌ Error: ${data.error}`);
    } catch (e) {
      setWolStatus(`❌ Connection error`);
    }
  };

  const handleVendorLookup = async () => {
    if (!vendorMac) return;
    try {
      const res = await fetch(`${API_BASE}/api/mac/${vendorMac}`);
      const data = await res.json();
      setVendorResult(res.ok ? `🏢 ${data.vendor}` : `❌ ${data.error}`);
    } catch (e) {
      setVendorResult(`❌ Connection error`);
    }
  };

  const handleDnsLookup = async () => {
    if (!domain) return;
    setIsDnsLoading(true);
    setDnsResults([]);
    setWhoisResult(null);
    try {
      const dnsRes = await fetch(`${API_BASE}/api/dns/${domain}`);
      if(dnsRes.ok) setDnsResults(await dnsRes.json());
      const whoisRes = await fetch(`${API_BASE}/api/whois/${domain}`);
      if(whoisRes.ok) setWhoisResult(await whoisRes.json());
    } catch (e) {
      console.error(e);
    }
    setIsDnsLoading(false);
  };

  const handleSubnetCalc = () => {
    try {
      const ipParts = subnetIp.split('.').map(Number);
      const cidr = parseInt(subnetCidr);
      if (ipParts.length !== 4 || isNaN(cidr) || cidr < 0 || cidr > 32) throw new Error('Invalid');
      
      const ipInt = (ipParts[0] << 24) | (ipParts[1] << 16) | (ipParts[2] << 8) | ipParts[3];
      const maskInt = ~((1 << (32 - cidr)) - 1);
      const networkInt = ipInt & maskInt;
      const broadcastInt = networkInt | ~maskInt;

      const intToIp = (int: number) => [
        (int >>> 24) & 255, (int >>> 16) & 255, (int >>> 8) & 255, int & 255
      ].join('.');

      setCalcResult({
        network: intToIp(networkInt),
        mask: intToIp(maskInt),
        broadcast: intToIp(broadcastInt),
        hosts: Math.max(0, (1 << (32 - cidr)) - 2)
      });
    } catch(e) {
      setCalcResult(null);
    }
  };

  return (
    <div className="fade-in" style={{display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto'}}>
      <h1>Utilities</h1>
      <div className="dashboard-grid" style={{gridTemplateColumns: '1fr 1fr'}}>
        
        <SnmpMonitor />

        <div className="glass-panel stat-card">
          <h3>Wake on LAN (WoL)</h3>
          <p className="subtext">Enter the MAC address of the device you want to wake.</p>
          <input type="text" placeholder="e.g. 00:11:22:33:44:55" value={wolMac} onChange={e => setWolMac(e.target.value)} className="ui-input" style={{marginBottom: '10px'}}/>
          <button onClick={handleWakeOnLan} style={{width: '100%'}}>Wake Up</button>
          {wolStatus && <div style={{marginTop: '10px', fontSize: '0.9rem', color: wolStatus.includes('✅') ? 'var(--success)' : 'var(--danger)'}}>{wolStatus}</div>}
        </div>

        <div className="glass-panel stat-card">
          <h3>MAC Vendor Lookup</h3>
          <p className="subtext">Find the manufacturer vendor from the device MAC address.</p>
          <input type="text" placeholder="e.g. B8:27:EB:..." value={vendorMac} onChange={e => setVendorMac(e.target.value)} className="ui-input" style={{marginBottom: '10px'}}/>
          <button onClick={handleVendorLookup} style={{width: '100%', background: 'var(--panel-border)', color: 'var(--text-primary)'}}>Lookup</button>
          {vendorResult && <div style={{marginTop: '10px', fontSize: '0.9rem', color: vendorResult.includes('❌') ? 'var(--danger)' : 'var(--success)'}}>{vendorResult}</div>}
        </div>

        <div className="glass-panel stat-card" style={{gridColumn: '1 / -1'}}>
          <h3>Subnet Calculator</h3>
          <p className="subtext">Calculate subnet information for the IPv4 address.</p>
          <div style={{display: 'flex', gap: '10px', marginBottom: '15px'}}>
            <input type="text" placeholder="IP Address" value={subnetIp} onChange={e => setSubnetIp(e.target.value)} className="ui-input" style={{flex: 2}}/>
            <span style={{alignSelf: 'center', fontSize: '1.5rem'}}>/</span>
            <input type="text" placeholder="CIDR" value={subnetCidr} onChange={e => setSubnetCidr(e.target.value)} className="ui-input" style={{flex: 1}}/>
            <button onClick={handleSubnetCalc}>Calculate</button>
          </div>
          {calcResult && (
            <div style={{display: 'flex', gap: '20px', background: 'var(--input-bg)', padding: '15px', borderRadius: '8px'}}>
              <div><span className="subtext">Network:</span><br/><b>{calcResult.network}</b></div>
              <div><span className="subtext">Netmask:</span><br/><b>{calcResult.mask}</b></div>
              <div><span className="subtext">Broadcast:</span><br/><b>{calcResult.broadcast}</b></div>
              <div><span className="subtext">Total Hosts:</span><br/><b>{calcResult.hosts}</b></div>
            </div>
          )}
        </div>

        <div className="glass-panel stat-card" style={{gridColumn: '1 / -1'}}>
          <h3>DNS & Whois Lookup</h3>
          <p className="subtext">Find registration and DNS records for a domain or IP.</p>
          <div style={{display: 'flex', gap: '10px', marginBottom: '10px'}}>
            <input type="text" placeholder="google.com" value={domain} onChange={e => setDomain(e.target.value)} className="ui-input" style={{flex: 1}}/>
            <button onClick={handleDnsLookup} disabled={isDnsLoading}>{isDnsLoading ? '...' : 'Lookup'}</button>
          </div>
          <div style={{display: 'flex', gap: '10px', height: '200px'}}>
            <div className="scroll-box" style={{flex: 1}}>
              <h4 style={{margin: '0 0 10px 0'}}>DNS Records</h4>
              {dnsResults.length === 0 ? <span className="placeholder-text">No records found...</span> : 
                dnsResults.map((rec, i) => (
                  <div key={i} className="list-item" style={{display: 'flex', gap: '10px'}}>
                    <span style={{color: 'var(--accent-color)', width: '40px'}}>{rec.type}</span>
                    <span>{rec.value || rec.address || rec.exchange || JSON.stringify(rec)}</span>
                  </div>
                ))
              }
            </div>
            <div className="scroll-box" style={{flex: 1}}>
              <h4 style={{margin: '0 0 10px 0'}}>Whois Data</h4>
              <pre style={{fontSize: '0.8rem', whiteSpace: 'pre-wrap'}}>
                {whoisResult ? JSON.stringify(whoisResult, null, 2) : 'No data...'}
              </pre>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

import { API_BASE } from '../config';
import { useState } from 'react';
import SnmpMonitor from './SnmpMonitor';


export default function UtilitiesTab() {
  const [activeTab, setActiveTab] = useState<'snmp' | 'wol' | 'mac' | 'subnet' | 'dns'>('snmp');

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
      setVendorResult(res.ok ? data.vendor : `Error: ${data.error}`);
    } catch (e) {
      setVendorResult(`Error: Connection error`);
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

  const tabs = [
    { id: 'snmp', label: 'SNMP Monitor' },
    { id: 'wol', label: 'Wake on LAN' },
    { id: 'mac', label: 'MAC Vendor' },
    { id: 'subnet', label: 'Subnet Calc' },
    { id: 'dns', label: 'DNS & Whois' }
  ] as const;

  return (
    <div className="fade-in" style={{display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto'}}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '15px' }}>
        <h1 style={{ margin: 0 }}>Utilities</h1>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '18px', flexWrap: 'wrap' }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={activeTab === tab.id ? '' : 'btn-secondary'}
            style={{
              flex: 1,
              minWidth: '120px',
              padding: '10px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: activeTab === tab.id ? '600' : 'normal',
              background: activeTab === tab.id ? 'var(--accent-color)' : 'var(--input-bg)',
              color: activeTab === tab.id ? 'var(--bg-color)' : 'var(--text-secondary)',
              border: activeTab === tab.id ? 'none' : '1px solid var(--panel-border)'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {activeTab === 'snmp' && (
          <div className="fade-in" style={{ height: '100%' }}>
            <SnmpMonitor />
          </div>
        )}

        {activeTab === 'wol' && (
          <div className="glass-panel stat-card fade-in" style={{ maxWidth: '600px', margin: '0 auto', width: '100%' }}>
            <h3>Wake on LAN (WoL)</h3>
            <p className="subtext">Enter the MAC address of the device you want to wake.</p>
            <input type="text" placeholder="e.g. 00:11:22:33:44:55" value={wolMac} onChange={e => setWolMac(e.target.value)} className="ui-input" style={{marginBottom: '10px'}}/>
            <button onClick={handleWakeOnLan} style={{width: '100%'}}>Wake Up</button>
            {wolStatus && <div style={{marginTop: '10px', fontSize: '0.9rem', color: wolStatus.includes('✅') ? 'var(--success)' : 'var(--danger)'}}>{wolStatus}</div>}
          </div>
        )}

        {activeTab === 'mac' && (
          <div className="glass-panel stat-card fade-in" style={{ maxWidth: '600px', margin: '0 auto', width: '100%' }}>
            <h3>MAC Vendor Lookup</h3>
            <p className="subtext">Find the manufacturer vendor from the device MAC address.</p>
            <input type="text" placeholder="e.g. B8:27:EB:..." value={vendorMac} onChange={e => setVendorMac(e.target.value)} className="ui-input" style={{marginBottom: '10px'}}/>
            <button onClick={handleVendorLookup} style={{width: '100%', background: 'var(--panel-border)', color: 'var(--text-primary)'}}>Lookup</button>
            {vendorResult && <div style={{marginTop: '10px', fontSize: '0.9rem', color: vendorResult.startsWith('Error') ? 'var(--danger)' : 'var(--success)'}}>{vendorResult}</div>}
          </div>
        )}

        {activeTab === 'subnet' && (
          <div className="glass-panel stat-card fade-in" style={{ maxWidth: '800px', margin: '0 auto', width: '100%' }}>
            <h3>Subnet Calculator</h3>
            <p className="subtext">Calculate subnet information for the IPv4 address.</p>
            <div style={{display: 'flex', gap: '10px', marginBottom: '15px'}}>
              <input type="text" placeholder="IP Address" value={subnetIp} onChange={e => setSubnetIp(e.target.value)} className="ui-input" style={{flex: 2}}/>
              <span style={{alignSelf: 'center', fontSize: '1.5rem'}}>/</span>
              <input type="text" placeholder="CIDR" value={subnetCidr} onChange={e => setSubnetCidr(e.target.value)} className="ui-input" style={{flex: 1}}/>
              <button onClick={handleSubnetCalc}>Calculate</button>
            </div>
            {calcResult && (
              <div style={{display: 'flex', gap: '20px', background: 'var(--input-bg)', padding: '15px', borderRadius: '8px', flexWrap: 'wrap'}}>
                <div style={{flex: 1, minWidth: '120px'}}><span className="subtext">Network:</span><br/><b>{calcResult.network}</b></div>
                <div style={{flex: 1, minWidth: '120px'}}><span className="subtext">Netmask:</span><br/><b>{calcResult.mask}</b></div>
                <div style={{flex: 1, minWidth: '120px'}}><span className="subtext">Broadcast:</span><br/><b>{calcResult.broadcast}</b></div>
                <div style={{flex: 1, minWidth: '120px'}}><span className="subtext">Total Hosts:</span><br/><b>{calcResult.hosts}</b></div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'dns' && (
          <div className="glass-panel stat-card fade-in" style={{ maxWidth: '1000px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', height: '100%' }}>
            <h3>DNS & Whois Lookup</h3>
            <p className="subtext">Find registration and DNS records for a domain or IP.</p>
            <div style={{display: 'flex', gap: '10px', marginBottom: '15px'}}>
              <input type="text" placeholder="google.com" value={domain} onChange={e => setDomain(e.target.value)} className="ui-input" style={{flex: 1}}/>
              <button onClick={handleDnsLookup} disabled={isDnsLoading}>{isDnsLoading ? '...' : 'Lookup'}</button>
            </div>
            <div style={{display: 'flex', gap: '15px', flex: 1, minHeight: 0}}>
              <div className="scroll-box" style={{flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column'}}>
                <h4 style={{margin: '0 0 10px 0'}}>DNS Records</h4>
                <div style={{ flex: 1, overflowY: 'auto', paddingRight: '5px' }}>
                  {dnsResults.length === 0 ? <span className="placeholder-text">No records found...</span> : 
                    dnsResults.map((rec, i) => (
                      <div key={i} className="list-item" style={{display: 'flex', gap: '10px'}}>
                        <span style={{color: 'var(--accent-color)', width: '40px', flexShrink: 0}}>{rec.type}</span>
                        <span style={{wordBreak: 'break-word'}}>{rec.value || rec.address || rec.exchange || JSON.stringify(rec)}</span>
                      </div>
                    ))
                  }
                </div>
              </div>
              <div className="scroll-box" style={{flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column'}}>
                <h4 style={{margin: '0 0 10px 0'}}>Whois Data</h4>
                <div style={{ flex: 1, overflowY: 'auto', paddingRight: '5px' }}>
                  <pre style={{fontSize: '0.8rem', whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0}}>
                    {whoisResult ? JSON.stringify(whoisResult, null, 2) : 'No data...'}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

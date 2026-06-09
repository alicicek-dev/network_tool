import { useState } from 'react';

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
      const res = await fetch('http://localhost:3001/api/wol', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mac: wolMac })
      });
      const data = await res.json();
      setWolStatus(res.ok ? `✅ ${data.message}` : `❌ Hata: ${data.error}`);
    } catch (e) {
      setWolStatus(`❌ Bağlantı hatası`);
    }
  };

  const handleVendorLookup = async () => {
    if (!vendorMac) return;
    try {
      const res = await fetch(`http://localhost:3001/api/mac/${vendorMac}`);
      const data = await res.json();
      setVendorResult(res.ok ? `🏢 ${data.vendor}` : `❌ ${data.error}`);
    } catch (e) {
      setVendorResult(`❌ Bağlantı hatası`);
    }
  };

  const handleDnsLookup = async () => {
    if (!domain) return;
    setIsDnsLoading(true);
    setDnsResults([]);
    setWhoisResult(null);
    try {
      const dnsRes = await fetch(`http://localhost:3001/api/dns/${domain}`);
      if(dnsRes.ok) setDnsResults(await dnsRes.json());
      const whoisRes = await fetch(`http://localhost:3001/api/whois/${domain}`);
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
    <div className="fade-in" style={{display: 'flex', flexDirection: 'column', height: '100%'}}>
      <h1>Utilities</h1>
      <div className="dashboard-grid" style={{gridTemplateColumns: '1fr 1fr'}}>
        
        <div className="glass-panel stat-card">
          <h3>Wake on LAN (WoL)</h3>
          <p className="subtext">Uyandırmak istediğiniz cihazın MAC adresini girin.</p>
          <input type="text" placeholder="Örn: 00:11:22:33:44:55" value={wolMac} onChange={e => setWolMac(e.target.value)} className="ui-input" style={{marginBottom: '10px'}}/>
          <button onClick={handleWakeOnLan} style={{width: '100%'}}>Uyandır</button>
          {wolStatus && <div style={{marginTop: '10px', fontSize: '0.9rem', color: wolStatus.includes('✅') ? 'var(--success)' : 'var(--danger)'}}>{wolStatus}</div>}
        </div>

        <div className="glass-panel stat-card">
          <h3>MAC Vendor Lookup</h3>
          <p className="subtext">Cihazın MAC adresinden üretici firmayı bulun.</p>
          <input type="text" placeholder="Örn: B8:27:EB:..." value={vendorMac} onChange={e => setVendorMac(e.target.value)} className="ui-input" style={{marginBottom: '10px'}}/>
          <button onClick={handleVendorLookup} style={{width: '100%', background: 'var(--panel-border)', color: 'white'}}>Sorgula</button>
          {vendorResult && <div style={{marginTop: '10px', fontSize: '0.9rem', color: vendorResult.includes('❌') ? 'var(--danger)' : 'var(--success)'}}>{vendorResult}</div>}
        </div>

        <div className="glass-panel stat-card" style={{gridColumn: '1 / -1'}}>
          <h3>Subnet Calculator</h3>
          <p className="subtext">IPv4 adresinin alt ağ (subnet) bilgilerini hesaplayın.</p>
          <div style={{display: 'flex', gap: '10px', marginBottom: '15px'}}>
            <input type="text" placeholder="IP Adresi" value={subnetIp} onChange={e => setSubnetIp(e.target.value)} className="ui-input" style={{flex: 2}}/>
            <span style={{alignSelf: 'center', fontSize: '1.5rem'}}>/</span>
            <input type="text" placeholder="CIDR" value={subnetCidr} onChange={e => setSubnetCidr(e.target.value)} className="ui-input" style={{flex: 1}}/>
            <button onClick={handleSubnetCalc}>Hesapla</button>
          </div>
          {calcResult && (
            <div style={{display: 'flex', gap: '20px', background: 'rgba(0,0,0,0.2)', padding: '15px', borderRadius: '8px'}}>
              <div><span className="subtext">Network:</span><br/><b>{calcResult.network}</b></div>
              <div><span className="subtext">Netmask:</span><br/><b>{calcResult.mask}</b></div>
              <div><span className="subtext">Broadcast:</span><br/><b>{calcResult.broadcast}</b></div>
              <div><span className="subtext">Total Hosts:</span><br/><b>{calcResult.hosts}</b></div>
            </div>
          )}
        </div>

        <div className="glass-panel stat-card" style={{gridColumn: '1 / -1'}}>
          <h3>DNS & Whois Lookup</h3>
          <p className="subtext">Domain veya IP adresinin arkasındaki kayıtları öğrenin.</p>
          <div style={{display: 'flex', gap: '10px', marginBottom: '10px'}}>
            <input type="text" placeholder="google.com" value={domain} onChange={e => setDomain(e.target.value)} className="ui-input" style={{flex: 1}}/>
            <button onClick={handleDnsLookup} disabled={isDnsLoading}>{isDnsLoading ? '...' : 'Sorgula'}</button>
          </div>
          <div style={{display: 'flex', gap: '10px', height: '200px'}}>
            <div className="scroll-box" style={{flex: 1}}>
              <h4 style={{margin: '0 0 10px 0'}}>DNS Records</h4>
              {dnsResults.length === 0 ? <span className="placeholder-text">Kayıt bulunamadı...</span> : 
                dnsResults.map((rec, i) => (
                  <div key={i} className="list-item" style={{display: 'flex', gap: '10px'}}>
                    <span style={{color: 'var(--primary)', width: '40px'}}>{rec.type}</span>
                    <span>{rec.value || rec.address || rec.exchange || JSON.stringify(rec)}</span>
                  </div>
                ))
              }
            </div>
            <div className="scroll-box" style={{flex: 1}}>
              <h4 style={{margin: '0 0 10px 0'}}>Whois Data</h4>
              <pre style={{fontSize: '0.8rem', whiteSpace: 'pre-wrap'}}>
                {whoisResult ? JSON.stringify(whoisResult, null, 2) : 'Veri yok...'}
              </pre>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

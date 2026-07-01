import { useState, useEffect } from 'react';
import { useProfiles } from '../hooks/useProfiles';
import type { DeviceProfile } from '../types';

interface ProfileManagerModalProps {
  onClose: () => void;
  onSelectProfile: (profile: DeviceProfile, decryptedPass: string) => void;
}

export default function ProfileManagerModal({ onClose, onSelectProfile }: ProfileManagerModalProps) {
  const { profiles, addProfile, removeProfile, decryptPassword } = useProfiles();
  
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<'ssh' | 'telnet'>('ssh');
  const [host, setHost] = useState('');
  const [port, setPort] = useState('22');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const [isConnecting, setIsConnecting] = useState(false);

  // Sync default port on type change
  useEffect(() => {
    if (type === 'ssh' && port === '23') setPort('22');
    if (type === 'telnet' && port === '22') setPort('23');
  }, [type]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !host) return;
    await addProfile({
      name,
      type,
      host,
      port,
      username,
      passwordPlain: password
    });
    setShowAdd(false);
    setName('');
    setHost('');
    setUsername('');
    setPassword('');
  };

  const handleSelect = async (profile: DeviceProfile) => {
    setIsConnecting(true);
    const pass = await decryptPassword(profile.passwordEncrypted);
    onSelectProfile(profile, pass);
    setIsConnecting(false);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.5)', zIndex: 999, display: 'flex',
      justifyContent: 'center', alignItems: 'center'
    }}>
      <div className="glass-panel" onClick={e => e.stopPropagation()} style={{
        width: '450px', maxHeight: '80vh', display: 'flex', flexDirection: 'column',
        padding: '20px', borderRadius: '12px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h2 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-primary)' }}>🔖 Saved Devices</h2>
          <button onClick={onClose} style={{ background: 'transparent', padding: '5px', color: 'var(--text-secondary)' }}>✕</button>
        </div>

        {showAdd ? (
          <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <input required type="text" placeholder="Profile Name (e.g. Core Switch)" value={name} onChange={e => setName(e.target.value)} />
            <select value={type} onChange={e => setType(e.target.value as 'ssh' | 'telnet')} style={{
              background: 'var(--input-bg)', color: 'var(--text-primary)', border: '1px solid var(--panel-border)', padding: '10px', borderRadius: '8px'
            }}>
              <option value="ssh">SSH</option>
              <option value="telnet">Telnet</option>
            </select>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input required type="text" placeholder="Host / IP" value={host} onChange={e => setHost(e.target.value)} style={{ flex: 1 }} />
              <input required type="text" placeholder="Port" value={port} onChange={e => setPort(e.target.value)} style={{ width: '70px' }} />
            </div>
            {type === 'ssh' && (
              <div style={{ display: 'flex', gap: '10px' }}>
                <input required type="text" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} style={{ flex: 1 }} />
                <input type="password" placeholder="Password (Optional)" value={password} onChange={e => setPassword(e.target.value)} style={{ flex: 1 }} />
              </div>
            )}
            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button type="button" onClick={() => setShowAdd(false)} style={{ flex: 1, background: 'var(--panel-border)', color: 'var(--text-primary)' }}>Cancel</button>
              <button type="submit" style={{ flex: 1 }}>Save Device</button>
            </div>
          </form>
        ) : (
          <>
            <button onClick={() => setShowAdd(true)} style={{ marginBottom: '15px', width: '100%' }}>+ Add New Device</button>
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {profiles.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '20px' }}>
                  No saved devices yet.
                </div>
              ) : (
                profiles.map(p => (
                  <div key={p.id} className="glass-panel" style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '12px', background: 'var(--input-bg)'
                  }}>
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, cursor: 'pointer' }} onClick={() => handleSelect(p)}>
                      <strong style={{ color: 'var(--text-primary)', marginBottom: '4px' }}>{p.name}</strong>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {p.type.toUpperCase()} - {p.host}:{p.port}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={(e) => { e.stopPropagation(); handleSelect(p); }} disabled={isConnecting} style={{ padding: '6px 12px', fontSize: '0.85rem' }}>
                        {isConnecting ? '...' : 'Connect'}
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); removeProfile(p.id); }} style={{ padding: '6px 12px', fontSize: '0.85rem', background: 'var(--danger)' }}>
                        Del
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import './index.css';
import TerminalTab from './components/TerminalTab';
import DiscoveryTab from './components/DiscoveryTab';
import UtilitiesTab from './components/UtilitiesTab';
import SpeedTestTab from './components/SpeedTestTab';
import PingTab from './components/PingTab';
import QuickServerTab from './components/QuickServerTab';
import DashboardTab from './components/DashboardTab';
import SettingsTab from './components/SettingsTab';
import AboutModal from './components/AboutModal';
import { io } from 'socket.io-client';
import { AppIcon, DashboardIcon, PingIcon, TerminalIcon, DiscoveryIcon, UtilitiesIcon, SpeedTestIcon, ServerIcon, SettingsIcon, InfoIcon } from './components/Icons';
import type { NetworkInterface } from './types';

const socket = io('http://127.0.0.1:3001', {
  transports: ['websocket']
});

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showAbout, setShowAbout] = useState(false);

  // Interfaces State
  const [interfaces, setInterfaces] = useState<NetworkInterface[]>([]);
  const [selectedIfIdx, setSelectedIfIdx] = useState(0);



  useEffect(() => {
    let retries = 0;
    const maxRetries = 10;
    
    function fetchInterfaces() {
      fetch('http://127.0.0.1:3001/api/interfaces')
        .then(res => {
          if (!res.ok) throw new Error('Network response was not ok');
          return res.json();
        })
        .then(data => setInterfaces(data))
        .catch(err => {
          console.warn('Failed to fetch interfaces, retrying...', err);
          if (retries < maxRetries) {
            retries++;
            setTimeout(fetchInterfaces, 1000);
          }
        });
    }
    
    fetchInterfaces();
  }, []);



  return (
    <div className="app-root">
      <div className="titlebar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', pointerEvents: 'none' }}>
          <AppIcon width="14" height="14" style={{ color: 'var(--accent-color)' }} />
          <span className="titlebar-title" style={{ fontSize: '0.75rem', fontWeight: 600 }}>NetTool - Network Engineer Toolkit</span>
        </div>
        <div className="titlebar-controls">
          <button
            className="titlebar-btn"
            onClick={(e) => { e.stopPropagation(); (window as any).electronAPI?.windowMinimize(); }}
            title="Minimize"
          >
            <svg width="10" height="1" viewBox="0 0 10 1"><rect width="10" height="1" fill="currentColor"/></svg>
          </button>
          <button
            className="titlebar-btn"
            onClick={(e) => { e.stopPropagation(); (window as any).electronAPI?.windowToggleMaximize(); }}
            title="Maximize"
          >
            <svg width="10" height="10" viewBox="0 0 10 10"><rect x="0.5" y="0.5" width="9" height="9" fill="none" stroke="currentColor" strokeWidth="1"/></svg>
          </button>
          <button
            className="titlebar-btn titlebar-btn-close"
            onClick={(e) => { e.stopPropagation(); (window as any).electronAPI?.windowClose(); }}
            title="Close"
          >
            <svg width="10" height="10" viewBox="0 0 10 10"><line x1="0" y1="0" x2="10" y2="10" stroke="currentColor" strokeWidth="1.2"/><line x1="10" y1="0" x2="0" y2="10" stroke="currentColor" strokeWidth="1.2"/></svg>
          </button>
        </div>
      </div>
      <div className="app-container">
        <aside className="sidebar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 14px', marginBottom: '16px', borderBottom: '1px solid var(--border-subtle)' }}>
            <AppIcon width="24" height="24" style={{ color: 'var(--accent-color)' }} />
            <span style={{ fontWeight: '700', fontSize: '1.05rem', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>NetTool</span>
          </div>
          <div 
            className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <DashboardIcon width="18" height="18" />
            Dashboard
          </div>
          <div 
            className={`nav-item ${activeTab === 'ping' ? 'active' : ''}`}
            onClick={() => setActiveTab('ping')}
          >
            <PingIcon width="18" height="18" />
            Ping / Trace
          </div>
          <div 
            className={`nav-item ${activeTab === 'terminal' ? 'active' : ''}`}
            onClick={() => setActiveTab('terminal')}
          >
            <TerminalIcon width="18" height="18" />
            Web Terminal
          </div>
          <div 
            className={`nav-item ${activeTab === 'discovery' ? 'active' : ''}`}
            onClick={() => setActiveTab('discovery')}
          >
            <DiscoveryIcon width="18" height="18" />
            Discovery
          </div>
          <div 
            className={`nav-item ${activeTab === 'quick-server' ? 'active' : ''}`}
            onClick={() => setActiveTab('quick-server')}
          >
            <ServerIcon width="18" height="18" />
            Quick Server
          </div>
          <div 
            className={`nav-item ${activeTab === 'utilities' ? 'active' : ''}`}
            onClick={() => setActiveTab('utilities')}
          >
            <UtilitiesIcon width="18" height="18" />
            Utilities
          </div>
          <div 
            className={`nav-item ${activeTab === 'speedtest' ? 'active' : ''}`}
            onClick={() => setActiveTab('speedtest')}
          >
            <SpeedTestIcon width="18" height="18" />
            Speed Test
          </div>
          <div 
            className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
            style={{ marginTop: 'auto', borderTop: '1px solid var(--border-subtle)', paddingTop: '12px', marginBottom: '4px' }}
          >
            <SettingsIcon width="18" height="18" />
            Ayarlar
          </div>
          <div 
            className="nav-item"
            onClick={() => setShowAbout(true)}
            style={{ padding: '10px 14px', cursor: 'pointer' }}
          >
            <InfoIcon width="18" height="18" />
            Hakkında
          </div>
        </aside>

        <main className="main-content">
          {/* Dashboard Tab */}
          <div style={{ display: activeTab === 'dashboard' ? 'flex' : 'none', flexDirection: 'column', height: '100%', minHeight: 0 }}>
            <DashboardTab 
              interfaces={interfaces} 
              selectedIfIdx={selectedIfIdx} 
              setSelectedIfIdx={setSelectedIfIdx} 
              setActiveTab={setActiveTab} 
            />
          </div>

          {/* Ping Tab */}
          <div style={{ display: activeTab === 'ping' ? 'flex' : 'none', flexDirection: 'column', height: '100%', minHeight: 0 }}>
            <PingTab socket={socket} />
          </div>

          {/* Terminal Tab */}
          <div style={{ display: activeTab === 'terminal' ? 'flex' : 'none', flexDirection: 'column', height: '100%', minHeight: 0 }} className="fade-in">
            <h1>Connection Manager</h1>
            <TerminalTab isActive={activeTab === 'terminal'} />
          </div>

          {/* Discovery Tab */}
          <div style={{ display: activeTab === 'discovery' ? 'flex' : 'none', flexDirection: 'column', height: '100%', minHeight: 0 }}>
            <DiscoveryTab 
              socket={socket} 
              defaultSubnet={interfaces[selectedIfIdx]?.ip ? interfaces[selectedIfIdx].ip.split('.').slice(0, 3).join('.') : undefined} 
            />
          </div>

          {/* Quick Server Tab */}
          <div style={{ display: activeTab === 'quick-server' ? 'flex' : 'none', flexDirection: 'column', height: '100%', minHeight: 0 }}>
            <QuickServerTab socket={socket} />
          </div>

          {/* Utilities Tab */}
          <div style={{ display: activeTab === 'utilities' ? 'flex' : 'none', flexDirection: 'column', height: '100%', minHeight: 0 }}>
            <UtilitiesTab />
          </div>

          {/* Speed Test Tab */}
          <div style={{ display: activeTab === 'speedtest' ? 'flex' : 'none', flexDirection: 'column', height: '100%', minHeight: 0 }}>
            <SpeedTestTab socket={socket} />
          </div>

          {/* Settings Tab */}
          <div style={{ display: activeTab === 'settings' ? 'flex' : 'none', flexDirection: 'column', height: '100%', minHeight: 0 }}>
            <SettingsTab />
          </div>
        </main>
      </div>

      <AboutModal isOpen={showAbout} onClose={() => setShowAbout(false)} />
    </div>
  );
}

export default App;

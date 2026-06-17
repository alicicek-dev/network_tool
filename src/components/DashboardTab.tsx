import React, { useState } from 'react';
import { CopyIcon, TerminalIcon, DiscoveryIcon, UtilitiesIcon } from './Icons';
import type { NetworkInterface } from '../types';

interface DashboardTabProps {
  interfaces: NetworkInterface[];
  selectedIfIdx: number;
  setSelectedIfIdx: (idx: number) => void;
  setActiveTab: (tab: string) => void;
}

export default function DashboardTab({
  interfaces,
  selectedIfIdx,
  setSelectedIfIdx,
  setActiveTab
}: DashboardTabProps) {
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const handleCopyValue = (value: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(value).then(() => {
      setCopiedText(value);
      setTimeout(() => setCopiedText(null), 1500);
    });
  };

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
      <h1 style={{ marginBottom: '16px' }}>Network Overview</h1>
      <div className="glass-panel" style={{ padding: '0px', overflow: 'hidden', border: '1px solid var(--panel-border)', marginBottom: '24px' }}>
        <table className="telemetry-table">
          <thead>
            <tr>
              <th style={{ width: '60px', textAlign: 'center' }}>Select</th>
              <th>Interface Name</th>
              <th>IP Address</th>
              <th>Gateway</th>
              <th>MAC Address</th>
              <th style={{ width: '120px', textAlign: 'right' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {interfaces.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  No interfaces found
                </td>
              </tr>
            ) : (
              interfaces.map((intf, idx) => {
                const isSelected = selectedIfIdx === idx;
                const hasGateway = !!intf.gateway;
                return (
                  <tr
                    key={idx}
                    onClick={() => setSelectedIfIdx(idx)}
                    className={`telemetry-row ${isSelected ? 'selected' : ''}`}
                  >
                    <td style={{ textAlign: 'center' }}>
                      <div style={{
                        width: '14px',
                        height: '14px',
                        borderRadius: '50%',
                        border: isSelected ? '2px solid var(--accent-color)' : '2px solid var(--text-secondary)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: isSelected ? 'transparent' : 'rgba(0,0,0,0.2)',
                        verticalAlign: 'middle',
                        transition: 'border-color 150ms ease'
                      }}>
                        {isSelected && (
                          <div style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            background: 'var(--accent-color)'
                          }} />
                        )}
                      </div>
                    </td>
                    <td style={{ 
                      fontWeight: '600', 
                      color: isSelected ? 'var(--accent-color)' : 'var(--text-primary)',
                      transition: 'color 150ms ease'
                    }}>
                      {intf.name}
                    </td>
                    <td 
                      onClick={(e) => handleCopyValue(intf.ip, e)}
                      title="Click to copy IP Address"
                      className="copyable-cell"
                      style={{ 
                        fontFamily: 'monospace',
                        fontSize: '0.8rem',
                        letterSpacing: '0.05em',
                        color: 'var(--text-primary)',
                      }}
                    >
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', position: 'relative' }}>
                        <span style={{ fontWeight: '600' }}>{intf.ip}</span>
                        <CopyIcon width="10" height="10" className="copy-icon-hover" style={{ opacity: 0.3, transition: 'opacity 150ms ease' }} />
                        {copiedText === intf.ip && (
                          <span style={{
                            position: 'absolute',
                            left: '110%',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            fontSize: '0.65rem',
                            color: '#11111b',
                            background: 'var(--accent-color)',
                            padding: '1px 5px',
                            borderRadius: '3px',
                            fontWeight: '600',
                            zIndex: 10,
                            whiteSpace: 'nowrap'
                          }}>
                            Copied
                          </span>
                        )}
                      </div>
                    </td>
                    <td 
                      onClick={(e) => intf.gateway && handleCopyValue(intf.gateway, e)}
                      title={intf.gateway ? "Click to copy Gateway" : undefined}
                      className={intf.gateway ? "copyable-cell" : ""}
                      style={{ 
                        fontFamily: 'monospace',
                        fontSize: '0.8rem',
                        letterSpacing: '0.05em',
                        color: hasGateway ? 'var(--text-primary)' : 'var(--text-secondary)',
                        cursor: intf.gateway ? 'pointer' : 'default',
                      }}
                    >
                      {intf.gateway ? (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', position: 'relative' }}>
                          <span>{intf.gateway}</span>
                          <CopyIcon width="10" height="10" className="copy-icon-hover" style={{ opacity: 0.3, transition: 'opacity 150ms ease' }} />
                          {copiedText === intf.gateway && (
                            <span style={{
                              position: 'absolute',
                              left: '110%',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              fontSize: '0.65rem',
                              color: '#11111b',
                              background: 'var(--accent-color)',
                              padding: '1px 5px',
                              borderRadius: '3px',
                              fontWeight: '600',
                              zIndex: 10,
                              whiteSpace: 'nowrap'
                            }}>
                              Copied
                            </span>
                          )}
                        </div>
                      ) : (
                        'N/A'
                      )}
                    </td>
                    <td 
                      onClick={(e) => handleCopyValue(intf.mac, e)}
                      title="Click to copy MAC Address"
                      className="copyable-cell"
                      style={{ 
                        fontFamily: 'monospace',
                        fontSize: '0.8rem',
                        letterSpacing: '0.05em',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', position: 'relative' }}>
                        <span>{intf.mac}</span>
                        <CopyIcon width="10" height="10" className="copy-icon-hover" style={{ opacity: 0.3, transition: 'opacity 150ms ease' }} />
                        {copiedText === intf.mac && (
                          <span style={{
                            position: 'absolute',
                            left: '110%',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            fontSize: '0.65rem',
                            color: '#11111b',
                            background: 'var(--accent-color)',
                            padding: '1px 5px',
                            borderRadius: '3px',
                            fontWeight: '600',
                            zIndex: 10,
                            whiteSpace: 'nowrap'
                          }}>
                            Copied
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span style={{
                        fontSize: '0.65rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        color: hasGateway ? '#a6e3a1' : 'var(--text-secondary)',
                        background: hasGateway ? 'rgba(166, 227, 161, 0.08)' : 'rgba(255, 255, 255, 0.03)',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontWeight: '600',
                        border: hasGateway ? '1px solid rgba(166, 227, 161, 0.12)' : '1px solid rgba(255, 255, 255, 0.04)',
                        whiteSpace: 'nowrap',
                        display: 'inline-block'
                      }}>
                        {hasGateway ? 'Connected' : 'Local Only'}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: '24px' }}>
        <h2 style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)', marginBottom: '14px', fontWeight: 600 }}>Quick Actions</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          {/* Action 1: Web Terminal */}
          <div 
            className="stat-card" 
            onClick={() => setActiveTab('terminal')}
            style={{ cursor: 'pointer', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <span className="stat-label">Web Terminal</span>
              <TerminalIcon width="16" height="16" style={{ color: 'var(--accent-color)', opacity: 0.8 }} />
            </div>
            <div style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Open SSH Session
            </div>
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
              Connect to network devices via SSH, Telnet, or Serial console port.
            </p>
          </div>
          
          {/* Action 2: Discovery */}
          <div 
            className="stat-card" 
            onClick={() => setActiveTab('discovery')}
            style={{ cursor: 'pointer', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <span className="stat-label">Discovery</span>
              <DiscoveryIcon width="16" height="16" style={{ color: 'var(--accent-color)', opacity: 0.8 }} />
            </div>
            <div style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Start Ping Sweep
            </div>
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
              Scan subnet to discover active hosts and resolve vendor hardware.
            </p>
          </div>

          {/* Action 3: Utilities */}
          <div 
            className="stat-card" 
            onClick={() => setActiveTab('utilities')}
            style={{ cursor: 'pointer', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <span className="stat-label">Utilities</span>
              <UtilitiesIcon width="16" height="16" style={{ color: 'var(--accent-color)', opacity: 0.8 }} />
            </div>
            <div style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Wake on LAN
            </div>
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
              Send magic WoL packets to broadcast addresses or target device MACs.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

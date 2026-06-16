import React, { useState } from 'react';
import { CopyIcon } from './Icons';
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
    <div className="fade-in">
      <h1>Network Overview</h1>
      <div className="glass-panel" style={{ padding: '0px', overflow: 'hidden', border: '1px solid var(--panel-border)' }}>
        <table className="device-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid var(--panel-border)' }}>
              <th style={{ padding: '10px 14px', fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase', width: '50px', textAlign: 'center' }}>Select</th>
              <th style={{ padding: '10px 14px', fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase' }}>Interface Name</th>
              <th style={{ padding: '10px 14px', fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase' }}>IP Address</th>
              <th style={{ padding: '10px 14px', fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase' }}>Gateway</th>
              <th style={{ padding: '10px 14px', fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase' }}>MAC Address</th>
              <th style={{ padding: '10px 14px', fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase', width: '120px', textAlign: 'right' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {interfaces.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
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
                    style={{
                      borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
                      cursor: 'pointer',
                      background: isSelected ? 'rgba(137, 180, 250, 0.06)' : 'transparent',
                      transition: 'all 0.15s ease'
                    }}
                    className="interface-row"
                  >
                    <td style={{ padding: '8px 14px', verticalAlign: 'middle', textAlign: 'center' }}>
                      <div style={{
                        width: '16px',
                        height: '16px',
                        borderRadius: '50%',
                        border: isSelected ? '2px solid var(--accent-color)' : '2px solid var(--text-secondary)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: isSelected ? 'transparent' : 'rgba(0,0,0,0.2)',
                        verticalAlign: 'middle'
                      }}>
                        {isSelected && (
                          <div style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: 'var(--accent-color)'
                          }} />
                        )}
                      </div>
                    </td>
                    <td style={{ 
                      padding: '8px 14px', 
                      fontWeight: '600', 
                      fontSize: '0.9rem', 
                      color: isSelected ? 'var(--accent-color)' : 'var(--text-primary)',
                      verticalAlign: 'middle'
                    }}>
                      {intf.name}
                    </td>
                    <td 
                      onClick={(e) => handleCopyValue(intf.ip, e)}
                      title="Click to copy IP Address"
                      style={{ 
                        padding: '8px 14px', 
                        fontFamily: 'monospace',
                        fontSize: '0.9rem',
                        color: 'var(--text-primary)',
                        transition: 'color 0.2s ease',
                        verticalAlign: 'middle'
                      }}
                      className="copyable-cell"
                    >
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', position: 'relative' }}>
                        <span style={{ fontWeight: 'bold' }}>{intf.ip}</span>
                        <CopyIcon width="11" height="11" className="copy-icon-hover" style={{ opacity: 0.4, transition: 'opacity 0.2s' }} />
                        {copiedText === intf.ip && (
                          <span style={{
                            position: 'absolute',
                            left: '110%',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            fontSize: '0.65rem',
                            color: '#11111b',
                            background: 'var(--success)',
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
                      style={{ 
                        padding: '8px 14px', 
                        fontFamily: 'monospace',
                        fontSize: '0.9rem',
                        color: hasGateway ? 'var(--text-primary)' : 'var(--text-secondary)',
                        transition: 'color 0.2s ease',
                        cursor: intf.gateway ? 'pointer' : 'default',
                        verticalAlign: 'middle'
                      }}
                      className={intf.gateway ? "copyable-cell" : ""}
                    >
                      {intf.gateway ? (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', position: 'relative' }}>
                          <span>{intf.gateway}</span>
                          <CopyIcon width="11" height="11" className="copy-icon-hover" style={{ opacity: 0.4, transition: 'opacity 0.2s' }} />
                          {copiedText === intf.gateway && (
                            <span style={{
                              position: 'absolute',
                              left: '110%',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              fontSize: '0.65rem',
                              color: '#11111b',
                              background: 'var(--success)',
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
                      style={{ 
                        padding: '8px 14px', 
                        fontFamily: 'monospace',
                        fontSize: '0.85rem',
                        color: 'var(--text-secondary)',
                        transition: 'color 0.2s ease',
                        verticalAlign: 'middle'
                      }}
                      className="copyable-cell"
                    >
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', position: 'relative' }}>
                        <span>{intf.mac}</span>
                        <CopyIcon width="11" height="11" className="copy-icon-hover" style={{ opacity: 0.4, transition: 'opacity 0.2s' }} />
                        {copiedText === intf.mac && (
                          <span style={{
                            position: 'absolute',
                            left: '110%',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            fontSize: '0.65rem',
                            color: '#11111b',
                            background: 'var(--success)',
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
                    <td style={{ padding: '8px 14px', textAlign: 'right', verticalAlign: 'middle' }}>
                      <span style={{
                        fontSize: '0.7rem',
                        color: hasGateway ? 'var(--success)' : 'var(--text-secondary)',
                        background: hasGateway ? 'rgba(166, 227, 161, 0.12)' : 'rgba(255, 255, 255, 0.04)',
                        padding: '3px 8px',
                        borderRadius: '5px',
                        fontWeight: '500',
                        border: hasGateway ? '1px solid rgba(166, 227, 161, 0.15)' : '1px solid rgba(255, 255, 255, 0.06)',
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
      
      <div className="glass-panel" style={{ padding: '20px', marginTop: '20px' }}>
        <h2>Quick Actions</h2>
        <div style={{ display: 'flex', gap: '15px', marginTop: '15px' }}>
          <button onClick={() => setActiveTab('terminal')}>Open SSH</button>
          <button onClick={() => setActiveTab('discovery')}>Start Ping Sweep</button>
          <button onClick={() => setActiveTab('utilities')}>Wake on LAN</button>
        </div>
      </div>
    </div>
  );
}

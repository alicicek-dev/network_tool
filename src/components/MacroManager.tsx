import { useState } from 'react';
import { useMacros } from '../hooks/useMacros';
import type { Macro } from '../hooks/useMacros';
import { PlayIcon, CodeIcon, SettingsIcon } from './Icons';

interface MacroManagerProps {
  onExecute: (commands: string[]) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export default function MacroManager({ onExecute, isOpen, onToggle }: MacroManagerProps) {
  const { macros, addMacro, updateMacro, removeMacro } = useMacros();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editContent, setEditContent] = useState('');

  const handleStartAdd = () => {
    setEditingId('new');
    setEditName('');
    setEditContent('');
  };

  const handleStartEdit = (m: Macro) => {
    setEditingId(m.id);
    setEditName(m.name);
    setEditContent(m.content);
  };

  const handleSave = () => {
    if (!editName.trim() || !editContent.trim()) return;
    if (editingId === 'new') {
      addMacro(editName, editContent);
    } else if (editingId) {
      updateMacro(editingId, editName, editContent);
    }
    setEditingId(null);
  };

  const handlePlay = (m: Macro) => {
    const lines = m.content.split('\\n').map(l => l.trim()).filter(l => l.length > 0);
    onExecute(lines);
  };

  if (!isOpen) {
    return (
      <div 
        style={{
          width: '40px',
          background: 'var(--panel-bg)',
          borderLeft: '1px solid var(--panel-border)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '10px 0',
          cursor: 'pointer'
        }}
        onClick={onToggle}
      >
        <CodeIcon width="20" height="20" style={{ color: 'var(--text-secondary)' }} />
      </div>
    );
  }

  return (
    <div 
      className="glass-panel"
      style={{
        width: '300px',
        borderLeft: '1px solid var(--panel-border)',
        borderTop: 'none',
        borderBottom: 'none',
        borderRight: 'none',
        borderRadius: 0,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        padding: '15px'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CodeIcon width="18" height="18" /> Macros
        </h3>
        <button onClick={onToggle} style={{ background: 'transparent', color: 'var(--text-secondary)', padding: '4px' }}>✕</button>
      </div>

      {editingId ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
          <input 
            type="text" 
            placeholder="Macro Name" 
            value={editName} 
            onChange={e => setEditName(e.target.value)} 
            className="ui-input"
          />
          <textarea 
            placeholder="Commands (one per line)..."
            value={editContent}
            onChange={e => setEditContent(e.target.value)}
            className="ui-input"
            style={{ flex: 1, resize: 'none', fontFamily: 'monospace', whiteSpace: 'pre' }}
          />
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setEditingId(null)} style={{ flex: 1, background: 'var(--panel-border)' }}>Cancel</button>
            <button onClick={handleSave} style={{ flex: 1 }}>Save</button>
          </div>
        </div>
      ) : (
        <>
          <button onClick={handleStartAdd} style={{ marginBottom: '15px', width: '100%' }}>+ New Macro</button>
          
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {macros.length === 0 && <div className="subtext" style={{ textAlign: 'center' }}>No macros saved.</div>}
            {macros.map(m => (
              <div key={m.id} style={{
                background: 'var(--input-bg)',
                border: '1px solid var(--panel-border)',
                borderRadius: '6px',
                padding: '10px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ color: 'var(--text-primary)' }}>{m.name}</strong>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button onClick={() => handleStartEdit(m)} style={{ background: 'transparent', padding: '4px', color: 'var(--text-secondary)' }} title="Edit">
                      <SettingsIcon width="14" height="14" />
                    </button>
                    <button onClick={() => removeMacro(m.id)} style={{ background: 'transparent', padding: '4px', color: 'var(--danger)' }} title="Delete">
                      ✕
                    </button>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => handlePlay(m)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: 'var(--accent-color)', color: '#000' }}>
                    <PlayIcon width="14" height="14" /> Run
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

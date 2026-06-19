import { useEffect, useRef } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from '@xterm/addon-fit';
import 'xterm/css/xterm.css';
import { io, Socket } from 'socket.io-client';
import { useTheme } from './context/ThemeContext';

interface TerminalProps {
  action: string;
  target: string;
  socket?: Socket;
  isActive?: boolean;
}

export default function TerminalComponent({ action, target, socket: externalSocket, isActive = true }: TerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  const { palette } = useTheme();

  useEffect(() => {
    // Initialize xterm.js
    const term = new Terminal({
      theme: {
        background: palette['--card-bg'] || '#000000',
        foreground: palette['--text-primary'] || '#a6e3a1',
        cursor: palette['--text-primary'] || '#a6e3a1',
        selectionBackground: palette['--nav-active-bg'] || 'rgba(255, 255, 255, 0.3)',
      },
      fontFamily: 'monospace',
      fontSize: 14,
      cursorBlink: true,
    });
    
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    fitAddonRef.current = fitAddon;
    
    if (terminalRef.current) {
      term.open(terminalRef.current);
      fitAddon.fit();
      // Focus the terminal container immediately
      setTimeout(() => {
        term.focus();
      }, 50);
    }
    xtermRef.current = term;

    // Connect to backend
    const socket = externalSocket || io('http://127.0.0.1:3001', {
      transports: ['websocket'],
      forceNew: true
    });
    const isLocalSocket = !externalSocket;
    socketRef.current = socket;

    const onConnect = () => {
      term.writeln('\x1b[32m[System] Connected to backend service.\x1b[0m');
      term.focus();
      
      if (action === 'ping' && target) {
        socket.emit('start-ping', target);
      } else if (action === 'traceroute' && target) {
        socket.emit('start-trace', target);
      } else if (action === 'ssh' && target) {
        // target is a JSON string with SSH details
        try {
          socket.emit('connect-ssh', JSON.parse(target));
        } catch(e) {}
      } else if (action === 'telnet' && target) {
        // target is a JSON string with Telnet details
        try {
          socket.emit('connect-telnet', JSON.parse(target));
        } catch(e) {}
      } else if (action === 'serial' && target) {
        // target is a JSON string with Serial details
        try {
          socket.emit('connect-serial', JSON.parse(target));
        } catch(e) {}
      }
    };
    
    if (socket.connected) {
      onConnect();
    } else {
      socket.on('connect', onConnect);
    }

    const handleTerminalData = (data: string) => {
      term.write(data);
    };
    socket.on('terminal-data', handleTerminalData);

    const handleDisconnect = () => {
      term.writeln('\r\n\x1b[31m[System] Disconnected from backend service.\x1b[0m');
    };
    socket.on('disconnect', handleDisconnect);

    // Handle user input in terminal
    term.onData((data) => {
      socket.emit('terminal-input', data);
    });

    // Auto copy on selection (PuTTY style)
    const selectionDisposable = term.onSelectionChange(() => {
      if (term.hasSelection()) {
        const selectedText = term.getSelection();
        if (selectedText) {
          navigator.clipboard.writeText(selectedText).catch(console.error);
        }
      }
    });

    // Resize handling
    const handleResize = () => {
      fitAddon.fit();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (action === 'ping') {
        socket.emit('stop-ping');
      } else if (action === 'traceroute') {
        socket.emit('stop-trace');
      } else if (action === 'ssh') {
        socket.emit('disconnect-ssh');
      } else if (action === 'telnet') {
        socket.emit('disconnect-telnet');
      } else if (action === 'serial') {
        socket.emit('disconnect-serial');
      }
      
      socket.off('terminal-data', handleTerminalData);
      socket.off('connect', onConnect);
      socket.off('disconnect', handleDisconnect);
      selectionDisposable.dispose();
      
      if (isLocalSocket) {
        socket.disconnect();
      }
      fitAddonRef.current = null;
      term.dispose();
    };
  }, [action, target]);

  useEffect(() => {
    if (xtermRef.current) {
      xtermRef.current.options.theme = {
        background: palette['--card-bg'] || '#000000',
        foreground: palette['--text-primary'] || '#a6e3a1',
        cursor: palette['--text-primary'] || '#a6e3a1',
        selectionBackground: palette['--nav-active-bg'] || 'rgba(255, 255, 255, 0.3)',
      };
    }
  }, [palette]);

  useEffect(() => {
    if (isActive && xtermRef.current && fitAddonRef.current) {
      const timer = setTimeout(() => {
        try {
          fitAddonRef.current?.fit();
          xtermRef.current?.focus();
        } catch (e) {
          console.warn('Failed to fit terminal on tab activation:', e);
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isActive]);

  const handleContextMenu = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      const text = await navigator.clipboard.readText();
      if (text && socketRef.current) {
        socketRef.current.emit('terminal-input', text);
      }
    } catch (err) {
      console.error('Failed to read clipboard:', err);
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <button 
        onClick={() => xtermRef.current?.clear()}
        style={{
          position: 'absolute',
          top: '10px',
          right: '25px', // prevent overlapping with scrollbar
          zIndex: 10,
          background: 'rgba(255, 255, 255, 0.1)',
          border: '1px solid var(--panel-border)',
          color: 'var(--text-secondary)',
          padding: '5px 10px',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '0.8rem'
        }}
      >
        Clear
      </button>
      <div 
        ref={terminalRef} 
        onContextMenu={handleContextMenu}
        style={{ width: '100%', height: '100%' }} 
      />
    </div>
  );
}

import { useEffect, useRef } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from '@xterm/addon-fit';
import 'xterm/css/xterm.css';
import { io, Socket } from 'socket.io-client';

interface TerminalProps {
  action: string;
  target: string;
  socket?: Socket;
}

export default function TerminalComponent({ action, target, socket: externalSocket }: TerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Initialize xterm.js
    const term = new Terminal({
      theme: {
        background: '#000000',
        foreground: '#a6e3a1',
        cursor: '#a6e3a1'
      },
      fontFamily: 'monospace',
      fontSize: 14,
      cursorBlink: true,
      copyOnSelect: true,
    });
    
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    
    if (terminalRef.current) {
      term.open(terminalRef.current);
      fitAddon.fit();
    }
    xtermRef.current = term;

    // Connect to backend
    const socket = externalSocket || io('http://localhost:3001');
    const isLocalSocket = !externalSocket;
    socketRef.current = socket;

    const onConnect = () => {
      term.writeln('\x1b[32m[System] Connected to backend service.\x1b[0m');
      
      if (action === 'ping' && target) {
        socket.emit('start-ping', target);
      } else if (action === 'traceroute' && target) {
        socket.emit('start-trace', target);
      } else if (action === 'ssh' && target) {
        // target is a JSON string with SSH details
        try {
          socket.emit('connect-ssh', JSON.parse(target));
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
      } else if (action === 'serial') {
        socket.emit('disconnect-serial');
      }
      
      socket.off('terminal-data', handleTerminalData);
      socket.off('connect', onConnect);
      socket.off('disconnect', handleDisconnect);
      
      if (isLocalSocket) {
        socket.disconnect();
      }
      term.dispose();
    };
  }, [action, target]);

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

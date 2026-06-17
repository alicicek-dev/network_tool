import React, { useState, useRef, useEffect } from 'react';

interface Option {
  value: any;
  label: string;
}

interface CustomSelectProps {
  options: Option[];
  value: any;
  onChange: (value: any) => void;
  disabled?: boolean;
  style?: React.CSSProperties;
  maxWidth?: string;
}

export default function CustomSelect({
  options,
  value,
  onChange,
  disabled = false,
  style = {},
  maxWidth = '200px'
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(opt => opt.value === value) || options[0];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (val: any) => {
    if (disabled) return;
    onChange(val);
    setIsOpen(false);
  };

  return (
    <div 
      ref={containerRef} 
      style={{
        position: 'relative',
        display: 'block',
        maxWidth: maxWidth,
        width: '100%',
        margin: '0',
        padding: '0',
        userSelect: 'none',
        ...style
      }}
    >
      {/* Dropdown Button */}
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        style={{
          background: 'rgba(0, 0, 0, 0.4)',
          border: '1px solid var(--panel-border)',
          borderRadius: '8px',
          color: disabled ? 'var(--text-secondary)' : 'var(--text-primary)',
          padding: '8px 12px',
          fontSize: '0.85rem',
          cursor: disabled ? 'not-allowed' : 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '8px',
          transition: 'all 0.2s ease',
          opacity: disabled ? 0.6 : 1,
          width: '100%',
          boxSizing: 'border-box',
          minWidth: 0
        }}
        className="custom-select-btn"
      >
        <span style={{ 
          textOverflow: 'ellipsis', 
          overflow: 'hidden', 
          whiteSpace: 'nowrap', 
          flex: 1,
          minWidth: 0,
          textAlign: 'left'
        }}>
          {selectedOption ? selectedOption.label : 'Select...'}
        </span>
        <svg 
          width="10" 
          height="6" 
          viewBox="0 0 10 6" 
          fill="none" 
          style={{ 
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease',
            flexShrink: 0,
            opacity: 0.7
          }}
        >
          <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>

      {/* Dropdown Options List */}
      {isOpen && (
        <div
          className="select-dropdown-enter"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            background: 'rgba(20, 20, 35, 0.95)',
            backdropFilter: 'blur(16px)',
            border: '1px solid var(--panel-border)',
            borderRadius: '8px',
            boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.5)',
            zIndex: 9999,
            maxHeight: '250px',
            overflowY: 'auto',
            padding: '4px',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
          }}
        >
          {options.length === 0 ? (
            <div style={{ padding: '8px 12px', color: 'var(--text-secondary)', fontSize: '0.85rem', textAlign: 'center' }}>
              No options
            </div>
          ) : (
            options.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <div
                  key={String(opt.value)}
                  onClick={() => handleSelect(opt.value)}
                  style={{
                    padding: '8px 12px',
                    fontSize: '0.85rem',
                    borderRadius: '6px',
                    color: isSelected ? 'var(--accent-color)' : 'var(--text-primary)',
                    background: isSelected ? 'rgba(137, 180, 250, 0.15)' : 'transparent',
                    cursor: 'pointer',
                    transition: 'background-color 150ms cubic-bezier(0.23, 1, 0.32, 1), color 150ms cubic-bezier(0.23, 1, 0.32, 1)',
                    textOverflow: 'ellipsis',
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  {opt.label}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

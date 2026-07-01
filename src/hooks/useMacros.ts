import { useState, useEffect } from 'react';

export interface Macro {
  id: string;
  name: string;
  content: string;
}

export function useMacros() {
  const [macros, setMacros] = useState<Macro[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('nettool_macros');
    if (saved) {
      try {
        setMacros(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse macros', e);
      }
    }
  }, []);

  const saveMacros = (newMacros: Macro[]) => {
    setMacros(newMacros);
    localStorage.setItem('nettool_macros', JSON.stringify(newMacros));
  };

  const addMacro = (name: string, content: string) => {
    const newMacro: Macro = {
      id: crypto.randomUUID(),
      name,
      content
    };
    saveMacros([...macros, newMacro]);
  };

  const updateMacro = (id: string, name: string, content: string) => {
    saveMacros(macros.map(m => m.id === id ? { ...m, name, content } : m));
  };

  const removeMacro = (id: string) => {
    saveMacros(macros.filter(m => m.id !== id));
  };

  return { macros, addMacro, updateMacro, removeMacro };
}

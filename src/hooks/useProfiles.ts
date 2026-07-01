import { useState, useEffect } from 'react';
import type { DeviceProfile } from '../types';

export function useProfiles() {
  const [profiles, setProfiles] = useState<DeviceProfile[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('nettool_profiles');
    if (saved) {
      try {
        setProfiles(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse profiles', e);
      }
    }
  }, []);

  const saveProfiles = (newProfiles: DeviceProfile[]) => {
    setProfiles(newProfiles);
    localStorage.setItem('nettool_profiles', JSON.stringify(newProfiles));
  };

  const addProfile = async (profile: Omit<DeviceProfile, 'id' | 'passwordEncrypted'> & { passwordPlain: string }) => {
    let encrypted = '';
    if (profile.passwordPlain && window.electronAPI && window.electronAPI.encryptString) {
      encrypted = await window.electronAPI.encryptString(profile.passwordPlain);
    } else if (profile.passwordPlain) {
      // Fallback for browser dev mode
      encrypted = btoa(profile.passwordPlain);
    }
    
    const newProfile: DeviceProfile = {
      id: crypto.randomUUID(),
      name: profile.name,
      type: profile.type,
      host: profile.host,
      port: profile.port,
      username: profile.username,
      passwordEncrypted: encrypted
    };
    saveProfiles([...profiles, newProfile]);
  };

  const removeProfile = (id: string) => {
    saveProfiles(profiles.filter(p => p.id !== id));
  };

  const decryptPassword = async (encrypted: string): Promise<string> => {
    if (!encrypted) return '';
    if (window.electronAPI && window.electronAPI.decryptString) {
      return await window.electronAPI.decryptString(encrypted);
    }
    // Fallback for browser dev mode
    try {
      return atob(encrypted);
    } catch {
      return '';
    }
  };

  return { profiles, addProfile, removeProfile, decryptPassword };
}

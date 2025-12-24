// Settings persistence and state management

export interface GameSettings {
  masterVolume: number; // 0-1
  musicVolume: number;  // 0-1
  sfxVolume: number;    // 0-1
}

const STORAGE_KEY = 'dungeon_crawler_settings';

const DEFAULT_SETTINGS: GameSettings = {
  masterVolume: 0.7,
  musicVolume: 0.5,
  sfxVolume: 0.6,
};

class SettingsManagerClass {
  private settings: GameSettings;

  constructor() {
    this.settings = this.load();
  }

  private load(): GameSettings {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<GameSettings>;
        return { ...DEFAULT_SETTINGS, ...parsed };
      }
    } catch (e) {
      console.warn('Failed to load settings:', e);
    }
    return { ...DEFAULT_SETTINGS };
  }

  save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    } catch (e) {
      console.warn('Failed to save settings:', e);
    }
  }

  get(): GameSettings {
    return { ...this.settings };
  }

  setMasterVolume(value: number): void {
    this.settings.masterVolume = Math.max(0, Math.min(1, value));
    this.save();
  }

  setMusicVolume(value: number): void {
    this.settings.musicVolume = Math.max(0, Math.min(1, value));
    this.save();
  }

  setSFXVolume(value: number): void {
    this.settings.sfxVolume = Math.max(0, Math.min(1, value));
    this.save();
  }

  getMasterVolume(): number {
    return this.settings.masterVolume;
  }

  getMusicVolume(): number {
    return this.settings.musicVolume;
  }

  getSFXVolume(): number {
    return this.settings.sfxVolume;
  }

  resetToDefaults(): void {
    this.settings = { ...DEFAULT_SETTINGS };
    this.save();
  }
}

// Singleton instance
export const SettingsManager = new SettingsManagerClass();

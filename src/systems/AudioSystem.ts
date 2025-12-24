import Phaser from 'phaser';
import { SettingsManager } from './SettingsManager';

export type MusicStyle = 'exploration' | 'shrine' | 'combat';

// Dorian mode frequencies starting from A (220 Hz)
const DORIAN_SCALE = [
  220,    // A (root)
  247.5,  // B (major 2nd)
  264,    // C (minor 3rd)
  293.3,  // D (perfect 4th)
  330,    // E (perfect 5th)
  367.5,  // F# (major 6th)
  396,    // G (minor 7th)
  440,    // A (octave)
];

export class AudioSystem {
  private audioContext: AudioContext | null = null;
  private soundBuffers: Map<string, AudioBuffer> = new Map();

  // Music system
  private droneOscillator: OscillatorNode | null = null;
  private droneGain: GainNode | null = null;
  private melodyOscillator: OscillatorNode | null = null;
  private melodyGain: GainNode | null = null;
  private isPlayingMusic: boolean = false;
  private melodyTimeoutId: number | null = null;
  private currentStyle: MusicStyle = 'exploration';
  private currentNoteIndex: number = 0;

  // Volume controls (0-1)
  private masterVolume: number;
  private musicVolume: number;
  private sfxVolume: number;

  constructor(_scene: Phaser.Scene) {
    // Load volumes from settings
    this.masterVolume = SettingsManager.getMasterVolume();
    this.musicVolume = SettingsManager.getMusicVolume();
    this.sfxVolume = SettingsManager.getSFXVolume();
    this.initAudio();
  }

  private initAudio(): void {
    try {
      this.audioContext = new AudioContext();
      this.generateAllSounds();

      // Handle browser autoplay policy - unlock on first interaction
      const unlock = () => {
        if (this.audioContext && this.audioContext.state === 'suspended') {
          this.audioContext.resume();
        }
        document.removeEventListener('click', unlock);
        document.removeEventListener('keydown', unlock);
      };

      document.addEventListener('click', unlock);
      document.addEventListener('keydown', unlock);
    } catch (e) {
      console.warn('Web Audio API not supported');
    }
  }

  private generateAllSounds(): void {
    if (!this.audioContext) return;

    // Attack sound - short zap
    this.createSound('sfx_attack', 0.1, (t) => {
      return Math.sin(880 * Math.PI * 2 * t) * Math.exp(-t * 30) * 0.3;
    });

    // Hit sound - thump
    this.createSound('sfx_hit', 0.15, (t) => {
      return Math.sin(150 * Math.PI * 2 * t) * Math.exp(-t * 20) * 0.4;
    });

    // Pickup sound - chime
    this.createSound('sfx_pickup', 0.2, (t) => {
      const freq = 600 + t * 400;
      return Math.sin(freq * Math.PI * 2 * t) * Math.exp(-t * 8) * 0.25;
    });

    // Level up sound - triumphant
    this.createSound('sfx_levelup', 0.5, (t) => {
      const freq1 = 440;
      const freq2 = 554;
      const freq3 = 659;
      return (
        Math.sin(freq1 * Math.PI * 2 * t) * (t < 0.15 ? 1 : 0) +
        Math.sin(freq2 * Math.PI * 2 * t) * (t >= 0.15 && t < 0.3 ? 1 : 0) +
        Math.sin(freq3 * Math.PI * 2 * t) * (t >= 0.3 ? 1 : 0)
      ) * Math.exp(-t * 2) * 0.3;
    });

    // Enemy death sound
    this.createSound('sfx_enemy_death', 0.2, (t) => {
      return Math.sin(200 * Math.PI * 2 * t * (1 - t)) * Math.exp(-t * 10) * 0.3;
    });

    // Player hurt sound
    this.createSound('sfx_hurt', 0.15, (t) => {
      return (Math.random() * 2 - 1) * Math.exp(-t * 15) * 0.2;
    });

    // Floor transition sound
    this.createSound('sfx_stairs', 0.4, (t) => {
      const freq = 300 + t * 200;
      return Math.sin(freq * Math.PI * 2 * t) * Math.exp(-t * 3) * 0.25;
    });

    // Use potion sound
    this.createSound('sfx_potion', 0.3, (t) => {
      return Math.sin(500 * Math.PI * 2 * t + Math.sin(8 * Math.PI * 2 * t) * 50) * Math.exp(-t * 5) * 0.2;
    });

    // Ghostly whisper sound (breathy, ethereal)
    this.createSound('sfx_whisper', 0.6, (t) => {
      // Layered noise with slow modulation for breathy effect
      const noise = (Math.random() * 2 - 1) * 0.3;
      const tone1 = Math.sin(180 * Math.PI * 2 * t) * 0.1;
      const tone2 = Math.sin(220 * Math.PI * 2 * t) * 0.08;
      const envelope = Math.sin(Math.PI * t / 0.6) * Math.exp(-t * 2);
      return (noise + tone1 + tone2) * envelope * 0.15;
    });

    // Stone tablet reading sound (stone scrape)
    this.createSound('sfx_tablet', 0.25, (t) => {
      const noise = (Math.random() * 2 - 1);
      const tone = Math.sin(120 * Math.PI * 2 * t);
      return (noise * 0.3 + tone * 0.2) * Math.exp(-t * 8) * 0.2;
    });
  }

  private createSound(key: string, duration: number, generator: (t: number) => number): void {
    if (!this.audioContext) return;

    const sampleRate = this.audioContext.sampleRate;
    const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < buffer.length; i++) {
      const t = i / sampleRate;
      data[i] = generator(t);
    }

    this.soundBuffers.set(key, buffer);
  }

  play(key: string, volume: number = 0.5): void {
    if (!this.audioContext) return;

    const buffer = this.soundBuffers.get(key);
    if (!buffer) {
      console.warn(`Sound not found: ${key}`);
      return;
    }

    // Resume audio context if suspended (browser autoplay policy)
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    const source = this.audioContext.createBufferSource();
    const gainNode = this.audioContext.createGain();

    source.buffer = buffer;
    // Apply master and SFX volume
    gainNode.gain.value = volume * this.masterVolume * this.sfxVolume;

    source.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    source.start(0);
  }

  // Keep the static method for backwards compatibility but make it a no-op
  static generateSounds(_scene: Phaser.Scene): void {
    // Sounds are now generated in the instance constructor
  }

  // ==================== MUSIC SYSTEM ====================

  startMusic(style: MusicStyle = 'exploration'): void {
    if (!this.audioContext) return;

    // Resume audio context if suspended
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    // If already playing same style, do nothing
    if (this.isPlayingMusic && this.currentStyle === style) return;

    // If playing different style, crossfade
    if (this.isPlayingMusic) {
      this.crossfadeToStyle(style);
      return;
    }

    this.currentStyle = style;
    this.isPlayingMusic = true;
    this.currentNoteIndex = 0; // Start on root

    // Start the drone
    this.createDrone();

    // Start the melody
    this.scheduleNextNote();
  }

  stopMusic(): void {
    if (!this.audioContext || !this.isPlayingMusic) return;

    this.isPlayingMusic = false;

    // Clear melody timeout
    if (this.melodyTimeoutId !== null) {
      clearTimeout(this.melodyTimeoutId);
      this.melodyTimeoutId = null;
    }

    // Fade out drone
    if (this.droneGain && this.droneOscillator) {
      const now = this.audioContext.currentTime;
      this.droneGain.gain.setValueAtTime(this.droneGain.gain.value, now);
      this.droneGain.gain.linearRampToValueAtTime(0, now + 1);
      this.droneOscillator.stop(now + 1.1);
      this.droneOscillator = null;
      this.droneGain = null;
    }

    // Fade out melody
    if (this.melodyGain && this.melodyOscillator) {
      const now = this.audioContext.currentTime;
      this.melodyGain.gain.setValueAtTime(this.melodyGain.gain.value, now);
      this.melodyGain.gain.linearRampToValueAtTime(0, now + 0.5);
      this.melodyOscillator.stop(now + 0.6);
      this.melodyOscillator = null;
      this.melodyGain = null;
    }
  }

  private crossfadeToStyle(newStyle: MusicStyle): void {
    // Simple implementation: adjust parameters without restarting
    this.currentStyle = newStyle;
    // The next scheduled note will pick up the new style parameters
  }

  private getEffectiveMusicVolume(): number {
    return this.masterVolume * this.musicVolume;
  }

  private createDrone(): void {
    if (!this.audioContext) return;

    // Create drone oscillator (low A at 110 Hz)
    this.droneOscillator = this.audioContext.createOscillator();
    this.droneGain = this.audioContext.createGain();

    this.droneOscillator.type = 'sine';
    this.droneOscillator.frequency.value = 110; // Low A

    // Set initial volume based on style, scaled by music volume
    const baseVolume = this.currentStyle === 'shrine' ? 0.06 : 0.08;
    const droneVolume = baseVolume * this.getEffectiveMusicVolume();
    this.droneGain.gain.value = 0;

    this.droneOscillator.connect(this.droneGain);
    this.droneGain.connect(this.audioContext.destination);

    this.droneOscillator.start();

    // Fade in drone
    const now = this.audioContext.currentTime;
    this.droneGain.gain.setValueAtTime(0, now);
    this.droneGain.gain.linearRampToValueAtTime(droneVolume, now + 2);

    // Add subtle volume wobble to drone
    this.addDroneWobble();
  }

  private addDroneWobble(): void {
    if (!this.audioContext || !this.droneGain) return;

    // Create LFO for subtle volume modulation
    const lfo = this.audioContext.createOscillator();
    const lfoGain = this.audioContext.createGain();

    lfo.type = 'sine';
    lfo.frequency.value = 0.1; // Very slow wobble
    lfoGain.gain.value = 0.02; // Subtle amount

    lfo.connect(lfoGain);
    lfoGain.connect(this.droneGain.gain);
    lfo.start();
  }

  private scheduleNextNote(): void {
    if (!this.isPlayingMusic || !this.audioContext) return;

    // Play current note
    this.playMelodyNote();

    // Calculate delay until next note based on style
    let minDelay: number, maxDelay: number;
    switch (this.currentStyle) {
      case 'combat':
        minDelay = 1000;
        maxDelay = 2000;
        break;
      case 'shrine':
        minDelay = 3000;
        maxDelay = 5000;
        break;
      case 'exploration':
      default:
        minDelay = 2000;
        maxDelay = 4000;
        break;
    }

    const delay = minDelay + Math.random() * (maxDelay - minDelay);

    this.melodyTimeoutId = window.setTimeout(() => {
      this.generateNextNote();
      this.scheduleNextNote();
    }, delay);
  }

  private generateNextNote(): void {
    const rand = Math.random();

    if (rand < 0.2) {
      // 20% chance: stay on same note
      return;
    } else if (rand < 0.9) {
      // 70% chance: step up or down
      const direction = Math.random() < 0.5 ? -1 : 1;
      this.currentNoteIndex = Math.max(0, Math.min(DORIAN_SCALE.length - 1, this.currentNoteIndex + direction));
    } else {
      // 10% chance: leap (up to a third)
      const leap = Math.random() < 0.5 ? -2 : 2;
      this.currentNoteIndex = Math.max(0, Math.min(DORIAN_SCALE.length - 1, this.currentNoteIndex + leap));
    }

    // In combat, occasionally add tension by moving to less stable notes
    if (this.currentStyle === 'combat' && Math.random() < 0.3) {
      // Favor the minor 3rd (index 2) or minor 7th (index 6) for tension
      if (Math.random() < 0.5) {
        this.currentNoteIndex = 2;
      } else {
        this.currentNoteIndex = 6;
      }
    }
  }

  private playMelodyNote(): void {
    if (!this.audioContext) return;

    // Don't play if music volume is 0
    if (this.getEffectiveMusicVolume() === 0) return;

    const frequency = DORIAN_SCALE[this.currentNoteIndex];

    // Create new oscillator for this note
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = 'sine';
    osc.frequency.value = frequency;

    // Volume based on style, scaled by music volume
    let baseVolume: number;
    switch (this.currentStyle) {
      case 'combat':
        baseVolume = 0.15;
        break;
      case 'shrine':
        baseVolume = 0.10;
        break;
      case 'exploration':
      default:
        baseVolume = 0.12;
        break;
    }
    const noteVolume = baseVolume * this.getEffectiveMusicVolume();

    const now = this.audioContext.currentTime;

    // Envelope: attack and release
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(noteVolume, now + 0.3); // Attack
    gain.gain.setValueAtTime(noteVolume, now + 0.3);
    gain.gain.linearRampToValueAtTime(noteVolume * 0.7, now + 1.5); // Sustain decay
    gain.gain.linearRampToValueAtTime(0, now + 2.5); // Release

    osc.connect(gain);
    gain.connect(this.audioContext.destination);

    osc.start(now);
    osc.stop(now + 2.6);
  }

  setMusicStyle(style: MusicStyle): void {
    if (this.isPlayingMusic) {
      this.currentStyle = style;
    }
  }

  isMusicPlaying(): boolean {
    return this.isPlayingMusic;
  }

  // Volume control methods
  setMasterVolume(value: number): void {
    this.masterVolume = Math.max(0, Math.min(1, value));
    SettingsManager.setMasterVolume(this.masterVolume);
    this.updateDroneVolume();
  }

  setMusicVolume(value: number): void {
    this.musicVolume = Math.max(0, Math.min(1, value));
    SettingsManager.setMusicVolume(this.musicVolume);
    this.updateDroneVolume();
  }

  setSFXVolume(value: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, value));
    SettingsManager.setSFXVolume(this.sfxVolume);
  }

  getMasterVolume(): number {
    return this.masterVolume;
  }

  getMusicVolume(): number {
    return this.musicVolume;
  }

  getSFXVolume(): number {
    return this.sfxVolume;
  }

  private updateDroneVolume(): void {
    if (!this.audioContext) return;

    const effectiveVolume = this.getEffectiveMusicVolume();

    // If volume is 0, stop the drone entirely
    if (effectiveVolume === 0) {
      if (this.droneOscillator) {
        this.droneOscillator.stop();
        this.droneOscillator = null;
        this.droneGain = null;
      }
      return;
    }

    // If drone was stopped but volume is now > 0, restart it
    if (!this.droneOscillator && this.isPlayingMusic) {
      this.createDrone();
      return;
    }

    if (this.droneGain) {
      const baseVolume = this.currentStyle === 'shrine' ? 0.06 : 0.08;
      const droneVolume = baseVolume * effectiveVolume;
      const now = this.audioContext.currentTime;
      // Cancel any scheduled ramps and set new value
      this.droneGain.gain.cancelScheduledValues(now);
      this.droneGain.gain.setValueAtTime(droneVolume, now);
    }
  }
}

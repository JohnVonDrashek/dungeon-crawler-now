import Phaser from 'phaser';

export class AudioSystem {
  private audioContext: AudioContext | null = null;
  private soundBuffers: Map<string, AudioBuffer> = new Map();

  constructor(_scene: Phaser.Scene) {
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
    gainNode.gain.value = volume;

    source.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    source.start(0);
  }

  // Keep the static method for backwards compatibility but make it a no-op
  static generateSounds(_scene: Phaser.Scene): void {
    // Sounds are now generated in the instance constructor
  }
}

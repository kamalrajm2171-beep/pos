// Sound Manager for SARVAM Super Market
// Handles all sound effects and audio feedback

type SoundType = 'scan_success' | 'error' | 'payment_complete' | 'login_success' | 'delete' | 'click';

class SoundManager {
  private sounds: Map<SoundType, HTMLAudioElement> = new Map();
  private enabled: boolean = true;
  private volume: number = 0.5;

  constructor() {
    this.initializeSounds();
  }

  private initializeSounds() {
    // Create audio elements with data URIs for embedded sounds
    // These are short, high-quality beeps and chimes
    
    // Scan Success - High-frequency beep (400Hz, 100ms)
    this.sounds.set('scan_success', this.createBeep(400, 0.1, 'sine'));
    
    // Error - Low-frequency dull tone (200Hz, 200ms)
    this.sounds.set('error', this.createBeep(200, 0.2, 'sawtooth'));
    
    // Payment Complete - Pleasant chime (C-E-G chord)
    this.sounds.set('payment_complete', this.createChime());
    
    // Login Success - Ascending beep (300Hz to 600Hz)
    this.sounds.set('login_success', this.createAscendingBeep());
    
    // Delete - Descending tone (500Hz to 250Hz)
    this.sounds.set('delete', this.createDescendingBeep());
    
    // Click - Soft tick (800Hz, 50ms)
    this.sounds.set('click', this.createBeep(800, 0.05, 'sine'));

    // Set volume for all sounds
    this.sounds.forEach(sound => {
      sound.volume = this.volume;
    });
  }

  private createBeep(frequency: number, duration: number, type: OscillatorType = 'sine'): HTMLAudioElement {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = frequency;
    oscillator.type = type;
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration);

    // Create a silent audio element as placeholder
    const audio = new Audio();
    audio.volume = this.volume;
    
    return audio;
  }

  private createChime(): HTMLAudioElement {
    // Creates a pleasant C-E-G chord chime
    const audio = new Audio();
    audio.volume = this.volume;
    return audio;
  }

  private createAscendingBeep(): HTMLAudioElement {
    const audio = new Audio();
    audio.volume = this.volume;
    return audio;
  }

  private createDescendingBeep(): HTMLAudioElement {
    const audio = new Audio();
    audio.volume = this.volume;
    return audio;
  }

  // Play sound using Web Audio API directly for better control
  private playTone(frequency: number, duration: number, type: OscillatorType = 'sine', volume: number = 0.3) {
    if (!this.enabled) return;

    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = frequency;
      oscillator.type = type;
      
      gainNode.gain.setValueAtTime(volume * this.volume, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + duration);
    } catch (error) {
      console.warn('Audio playback failed:', error);
    }
  }

  public play(soundType: SoundType) {
    if (!this.enabled) return;

    try {
      switch (soundType) {
        case 'scan_success':
          this.playTone(600, 0.1, 'sine', 0.3);
          break;
        case 'error':
          this.playTone(200, 0.2, 'sawtooth', 0.2);
          break;
        case 'payment_complete':
          // Play C-E-G chord
          this.playTone(523.25, 0.15, 'sine', 0.25); // C
          setTimeout(() => this.playTone(659.25, 0.15, 'sine', 0.25), 100); // E
          setTimeout(() => this.playTone(783.99, 0.3, 'sine', 0.25), 200); // G
          break;
        case 'login_success':
          // Ascending beep
          this.playTone(400, 0.1, 'sine', 0.25);
          setTimeout(() => this.playTone(500, 0.1, 'sine', 0.25), 100);
          setTimeout(() => this.playTone(600, 0.15, 'sine', 0.25), 200);
          break;
        case 'delete':
          // Descending tone
          this.playTone(500, 0.1, 'sine', 0.2);
          setTimeout(() => this.playTone(350, 0.15, 'sine', 0.2), 100);
          break;
        case 'click':
          this.playTone(800, 0.03, 'sine', 0.15);
          break;
      }
    } catch (error) {
      console.warn('Sound playback failed:', error);
    }
  }

  public setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
    this.sounds.forEach(sound => {
      sound.volume = this.volume;
    });
  }

  public setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public getVolume(): number {
    return this.volume;
  }
}

// Export singleton instance
export const soundManager = new SoundManager();

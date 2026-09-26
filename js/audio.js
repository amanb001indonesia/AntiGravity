/**
 * TYPE//TANK - Web Audio API Procedural Sound Synthesizer
 * Zero External Audio Files - 100% Native Procedural Audio
 */

class SoundSynthesizer {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.muted = false;
    this.initialized = false;
    this.volume = 0.35; // Default comfortable retro arcade volume
  }

  init() {
    if (this.initialized) return;

    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) {
        console.warn("Web Audio API not supported in this browser.");
        return;
      }
      this.ctx = new AudioContextClass();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.muted ? 0 : this.volume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.initialized = true;
    } catch (e) {
      console.warn("AudioContext initialization failed:", e);
    }
  }

  ensureContext() {
    if (!this.initialized) {
      this.init();
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
  }

  setMuted(muteState) {
    this.muted = !!muteState;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.masterGain.gain.setValueAtTime(this.muted ? 0 : this.volume, this.ctx.currentTime);
    }
  }

  toggleMute() {
    this.setMuted(!this.muted);
    return this.muted;
  }

  /**
   * 1. High-frequency laser shot for normal keystrokes
   */
  playLaserShot(isBonus = false) {
    if (this.muted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    // Laser frequency sweep
    const startFreq = isBonus ? 1600 : 1100;
    const endFreq = isBonus ? 350 : 250;

    osc.type = isBonus ? "sawtooth" : "triangle";
    osc.frequency.setValueAtTime(startFreq, t);
    osc.frequency.exponentialRampToValueAtTime(endFreq, t + 0.08);

    // Fast snappy attack and decay
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.1);
  }

  /**
   * 2. Heavy metallic thump / explosion on word elimination
   */
  playWordExplosion(isBonus = false) {
    if (this.muted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const duration = isBonus ? 0.45 : 0.28;

    // Sub-bass punch oscillator
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();

    subOsc.type = "sine";
    subOsc.frequency.setValueAtTime(isBonus ? 140 : 110, t);
    subOsc.frequency.exponentialRampToValueAtTime(28, t + duration * 0.7);

    subGain.gain.setValueAtTime(isBonus ? 0.6 : 0.45, t);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    subOsc.connect(subGain);
    subGain.connect(this.masterGain);

    subOsc.start(t);
    subOsc.stop(t + duration);

    // Procedural noise burst for explosive blast
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(isBonus ? 1800 : 1200, t);
    filter.frequency.exponentialRampToValueAtTime(120, t + duration);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(isBonus ? 0.5 : 0.35, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    whiteNoise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    whiteNoise.start(t);
    whiteNoise.stop(t + duration);
  }

  /**
   * 3. High-pitched dual-tone chime on red bonus word spawn
   */
  playRedBonusSpawn() {
    if (this.muted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;

    const playChimeTone = (freq, startTime, dur) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "square";
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.2, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + dur);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(startTime);
      osc.stop(startTime + dur);
    };

    // Fast high alert dual chirp: 880Hz -> 1760Hz
    playChimeTone(880, t, 0.08);
    playChimeTone(1760, t + 0.08, 0.16);
  }

  /**
   * 4. Low crunch / screen shake buzz on damage impact
   */
  playDamageImpact() {
    if (this.muted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const dur = 0.38;

    // Distorted sawtooth rumble
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(32, t + dur);

    gain.gain.setValueAtTime(0.55, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

    // Distortion wave shaper
    const shaper = this.ctx.createWaveShaper();
    const n = 256;
    const curve = new Float32Array(n);
    for (let i = 0; i < n; ++i) {
      const x = (i * 2) / n - 1;
      curve[i] = Math.tanh(x * 3);
    }
    shaper.curve = curve;

    osc.connect(shaper);
    shaper.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + dur);
  }

  /**
   * 5. Multi-tone triumphant fanfare for new records
   */
  playVictoryFanfare() {
    if (this.muted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    // Classic arcade triumphant ascending arpeggio chords
    // C4, E4, G4, C5, E5, G5, High C6
    const notes = [
      { freq: 261.63, start: 0.00, dur: 0.12 },
      { freq: 329.63, start: 0.12, dur: 0.12 },
      { freq: 392.00, start: 0.24, dur: 0.12 },
      { freq: 523.25, start: 0.36, dur: 0.16 },
      { freq: 659.25, start: 0.52, dur: 0.16 },
      { freq: 783.99, start: 0.68, dur: 0.22 },
      { freq: 1046.50, start: 0.90, dur: 0.65 }
    ];

    notes.forEach(note => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "square";
      osc.frequency.setValueAtTime(note.freq, t + note.start);

      // Add gentle vibrato for the sustained final note
      if (note.dur > 0.4) {
        const lfo = this.ctx.createOscillator();
        const lfoGain = this.ctx.createGain();
        lfo.frequency.setValueAtTime(6, t + note.start);
        lfoGain.gain.setValueAtTime(8, t + note.start);
        lfo.connect(osc.frequency);
        lfo.start(t + note.start);
        lfo.stop(t + note.start + note.dur);
      }

      gain.gain.setValueAtTime(0.24, t + note.start);
      gain.gain.exponentialRampToValueAtTime(0.001, t + note.start + note.dur);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(t + note.start);
      osc.stop(t + note.start + note.dur);
    });
  }

  /**
   * 6. Soft retro terminal click on UI buttons and menus
   */
  playMenuClick() {
    if (this.muted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(1400, t);
    osc.frequency.exponentialRampToValueAtTime(700, t + 0.025);

    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.028);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.03);
  }

  /**
   * 7. Low warning miss beep for invalid keystroke while locked
   */
  playMissBeep() {
    if (this.muted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(180, t);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.09);
  }

  /**
   * 8. Hull critical alarm / warning pulse
   */
  playCriticalAlarm() {
    if (this.muted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "square";
    osc.frequency.setValueAtTime(540, t);
    osc.frequency.setValueAtTime(420, t + 0.07);

    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.16);
  }
}

// Global audio singleton
const soundFX = new SoundSynthesizer();

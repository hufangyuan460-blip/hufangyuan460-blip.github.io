/**
 * Pure Web Audio API ambient & retro-pixel SFX synthesizer (zero external audio files).
 * Muted by default until the user explicitly toggles the pixel speaker button.
 */
class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private oceanNode: AudioBufferSourceNode | null = null;
  private oceanLfo: OscillatorNode | null = null;
  private crackleTimer: number | null = null;
  private muted = true;

  public isMuted(): boolean {
    return this.muted;
  }

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;

    if (!this.ctx) {
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0;
      this.masterGain.connect(this.ctx.destination);
      this.startAmbientLayers();
    }

    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  private startAmbientLayers() {
    if (!this.ctx || !this.masterGain) return;
    const ctx = this.ctx;

    // 1. Gentle rolling ocean waves: 4-second seamless pink/brown noise loop + slow filter LFO
    const bufferLength = ctx.sampleRate * 4;
    const noiseBuffer = ctx.createBuffer(1, bufferLength, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < bufferLength; i++) {
      const white = Math.random() * 2 - 1;
      // Warm brown-ish surf texture
      lastOut = (lastOut + 0.035 * white) / 1.035;
      data[i] = lastOut * 2.8;
    }

    const oceanSrc = ctx.createBufferSource();
    oceanSrc.buffer = noiseBuffer;
    oceanSrc.loop = true;

    const oceanFilter = ctx.createBiquadFilter();
    oceanFilter.type = 'lowpass';
    oceanFilter.frequency.value = 310;
    oceanFilter.Q.value = 0.7;

    const oceanGain = ctx.createGain();
    oceanGain.gain.value = 0.14;

    // Slow 0.12 Hz wave swell (~8.3s period) modulating both filter cutoff & volume
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.12;

    const lfoFilterDepth = ctx.createGain();
    lfoFilterDepth.gain.value = 165;
    lfo.connect(lfoFilterDepth);
    lfoFilterDepth.connect(oceanFilter.frequency);

    const lfoGainDepth = ctx.createGain();
    lfoGainDepth.gain.value = 0.055;
    lfo.connect(lfoGainDepth);
    lfoGainDepth.connect(oceanGain.gain);

    oceanSrc.connect(oceanFilter);
    oceanFilter.connect(oceanGain);
    oceanGain.connect(this.masterGain);

    oceanSrc.start();
    lfo.start();
    this.oceanNode = oceanSrc;
    this.oceanLfo = lfo;

    // 2. Subtle cozy campfire micro-crackles scheduled organically
    const scheduleCrackle = () => {
      if (!this.ctx || !this.masterGain) return;
      if (!this.muted && this.ctx.state === 'running') {
        this.triggerCampfireSnap();
      }
      const nextMs = 380 + Math.random() * 1450;
      this.crackleTimer = window.setTimeout(scheduleCrackle, nextMs);
    };
    this.crackleTimer = window.setTimeout(scheduleCrackle, 800);
  }

  private triggerCampfireSnap() {
    if (!this.ctx || !this.masterGain) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    const len = Math.floor(ctx.sampleRate * 0.022);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      const env = Math.pow(1 - i / len, 2.4);
      ch[i] = (Math.random() * 2 - 1) * env;
    }

    const src = ctx.createBufferSource();
    src.buffer = buf;

    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1400 + Math.random() * 1800;
    bp.Q.value = 2.6;

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.025 + Math.random() * 0.03, now);
    g.gain.exponentialRampToValueAtTime(0.0005, now + 0.022);

    src.connect(bp);
    bp.connect(g);
    g.connect(this.masterGain);
    src.start(now);
  }

  public setMuted(nextMuted: boolean) {
    this.muted = nextMuted;
    if (!nextMuted) {
      const ctx = this.ensureContext();
      if (ctx && this.masterGain) {
        const now = ctx.currentTime;
        this.masterGain.gain.cancelScheduledValues(now);
        this.masterGain.gain.setTargetAtTime(0.7, now, 0.25);
        this.playUiClick();
      }
    } else if (this.ctx && this.masterGain) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setTargetAtTime(0.0, now, 0.12);
    }
  }

  public playUiClick() {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(640, now);
    osc.frequency.exponentialRampToValueAtTime(360, now + 0.042);

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.11, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.046);

    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.05);
  }

  public playAdvancementChime() {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 - E5 - G5 - C6

    notes.forEach((freq, idx) => {
      const t0 = now + idx * 0.075;
      const osc = ctx.createOscillator();
      osc.type = idx === notes.length - 1 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, t0);

      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(idx === notes.length - 1 ? 0.14 : 0.095, t0 + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0008, t0 + (idx === notes.length - 1 ? 0.52 : 0.24));

      osc.connect(g);
      g.connect(this.masterGain!);
      osc.start(t0);
      osc.stop(t0 + 0.56);
    });
  }

  public playSplash() {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;
    const now = ctx.currentTime;

    const len = Math.floor(ctx.sampleRate * 0.22);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      const env = Math.sin((i / len) * Math.PI) * Math.pow(1 - i / len, 0.8);
      ch[i] = (Math.random() * 2 - 1) * env;
    }

    const src = ctx.createBufferSource();
    src.buffer = buf;

    const lp = ctx.createBiquadFilter();
    lp.type = 'bandpass';
    lp.frequency.setValueAtTime(880, now);
    lp.frequency.exponentialRampToValueAtTime(340, now + 0.22);
    lp.Q.value = 1.2;

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.11, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    src.connect(lp);
    lp.connect(g);
    g.connect(this.masterGain);
    src.start(now);
  }

  public dispose() {
    if (this.crackleTimer !== null) {
      window.clearTimeout(this.crackleTimer);
      this.crackleTimer = null;
    }
    try {
      this.oceanNode?.stop();
      this.oceanLfo?.stop();
      void this.ctx?.close();
    } catch {
      // ignore
    }
    this.ctx = null;
    this.masterGain = null;
  }
}

export const soundEngine = new SoundEngine();

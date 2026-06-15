let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!sharedAudioCtx) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      sharedAudioCtx = new AudioContextClass();
    }
  }
  if (sharedAudioCtx && sharedAudioCtx.state === "suspended") {
    sharedAudioCtx.resume().catch(() => {});
  }
  return sharedAudioCtx;
}

/**
 * Sweeps oscillator from low to high frequency, overlays a high chime, and decays.
 * Fits a futuristic mainframe boot sequence.
 */
export function playBootSound(volume = 0.5) {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  // 1. Deep sci-fi frequency sweep (low to high sawtooth)
  const sweepOsc = ctx.createOscillator();
  const sweepGain = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  sweepOsc.type = "sawtooth";
  sweepOsc.frequency.setValueAtTime(90, now);
  sweepOsc.frequency.exponentialRampToValueAtTime(360, now + 1.8);

  filter.type = "lowpass";
  filter.frequency.setValueAtTime(250, now);
  filter.frequency.exponentialRampToValueAtTime(1000, now + 1.5);

  sweepGain.gain.setValueAtTime(0, now);
  sweepGain.gain.linearRampToValueAtTime(volume * 0.18, now + 0.4);
  sweepGain.gain.linearRampToValueAtTime(volume * 0.15, now + 1.2);
  sweepGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.0);

  sweepOsc.connect(filter);
  filter.connect(sweepGain);
  sweepGain.connect(ctx.destination);

  sweepOsc.start(now);
  sweepOsc.stop(now + 2.1);

  // 2. Chime overlay (E5, B5, E6) for harmony
  const chimeNotes = [659.25, 987.77, 1318.51];
  chimeNotes.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, now + 1.2 + idx * 0.08);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume * 0.1, now + 1.2 + idx * 0.08 + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2 + idx * 0.08 + 1.8);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now + 1.2 + idx * 0.08);
    osc.stop(now + 1.2 + idx * 0.08 + 1.9);
  });
}

/**
 * Quick sweep of high-frequency pulses for the biometric scan.
 */
export function playScanSound(volume = 0.5) {
  const ctx = getAudioContext();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "triangle";
  osc.frequency.setValueAtTime(700, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(1600, ctx.currentTime + 0.07);

  gain.gain.setValueAtTime(volume * 0.06, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.07);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.08);
}

/**
 * A beautiful major arpeggio resolving to a chord, indicating access granted.
 */
export function playSuccessSound(volume = 0.5) {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6

  notes.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, now + idx * 0.06);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume * 0.12, now + idx * 0.06 + 0.02);
    gain.gain.setValueAtTime(volume * 0.12, now + idx * 0.06 + 0.12);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.06 + 0.5);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now + idx * 0.06);
    osc.stop(now + idx * 0.06 + 0.55);
  });
}

/**
 * A tiny UI click beep.
 */
export function playClickSound(volume = 0.5) {
  const ctx = getAudioContext();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "sine";
  osc.frequency.setValueAtTime(1100, ctx.currentTime);

  gain.gain.setValueAtTime(volume * 0.08, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.04);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.05);
}

/**
 * A beautiful sci-fi notification sound using a metallic double chime.
 */
export function playNotificationSound(volume = 0.5) {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  // Double chime structure: Note 1 (A5, 880Hz), then Note 2 (C#6, 1109Hz)
  const notes = [880.0, 1109.73];
  
  notes.forEach((freq, idx) => {
    const timeOffset = idx * 0.08;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, now + timeOffset);
    
    // Metallic FM modulation flavor on the second chime
    if (idx === 1) {
      const mod = ctx.createOscillator();
      const modGain = ctx.createGain();
      mod.type = "triangle";
      mod.frequency.setValueAtTime(freq * 2, now + timeOffset);
      modGain.gain.setValueAtTime(120, now + timeOffset); // Modulation depth
      mod.connect(modGain);
      modGain.connect(osc.frequency);
      mod.start(now + timeOffset);
      mod.stop(now + timeOffset + 0.4);
    }

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(2500, now + timeOffset);

    gain.gain.setValueAtTime(0, now + timeOffset);
    gain.gain.linearRampToValueAtTime(volume * 0.09, now + timeOffset + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + timeOffset + 0.4);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now + timeOffset);
    osc.stop(now + timeOffset + 0.45);
  });
}

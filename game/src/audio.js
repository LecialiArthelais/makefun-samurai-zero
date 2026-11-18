// Sound, synthesised in code with Web Audio (see audio-design skill): no
// audio files, no network, nothing to download. Two buses — SFX and music —
// with a master mute (M). Every effect is a small oscillator/noise recipe with
// slight random variation, so repeated slashes never sound identical.
// The music is a quiet taiko-and-pluck loop in a minor pentatonic scale, driven
// by a lookahead scheduler; it starts only after the first user gesture.

const PENTA = [220.0, 261.63, 293.66, 329.63, 392.0, 440.0, 523.25];

export function createAudio() {
  let ctx = null;
  let master = null;
  let sfxBus = null;
  let musicBus = null;
  let muted = false;
  let musicTimer = null;
  let nextNoteTime = 0;
  let step = 0;

  function ensure() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      return true;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.9;
      master.connect(ctx.destination);
      sfxBus = ctx.createGain();
      sfxBus.gain.value = 0.5;
      sfxBus.connect(master);
      musicBus = ctx.createGain();
      musicBus.gain.value = 0.16;
      musicBus.connect(master);
    } catch {
      return false;
    }
    return true;
  }

  function noiseBuffer(duration) {
    const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * duration), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  function playNoise({ duration, filterType = 'bandpass', frequency = 1200, q = 1, gain = 0.4, sweepTo = null, when = 0 }) {
    if (!ensure()) return;
    const t = ctx.currentTime + when;
    const source = ctx.createBufferSource();
    source.buffer = noiseBuffer(duration + 0.05);
    const filter = ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.setValueAtTime(frequency, t);
    if (sweepTo !== null) filter.frequency.exponentialRampToValueAtTime(Math.max(40, sweepTo), t + duration);
    filter.Q.value = q;
    const amp = ctx.createGain();
    amp.gain.setValueAtTime(gain, t);
    amp.gain.exponentialRampToValueAtTime(0.001, t + duration);
    source.connect(filter).connect(amp).connect(sfxBus);
    source.start(t);
    source.stop(t + duration + 0.05);
  }

  function playTone({ type = 'sine', frequency = 440, endFrequency = null, duration = 0.2, gain = 0.3, when = 0, bus = null }) {
    if (!ensure()) return;
    const t = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency * (0.97 + Math.random() * 0.06), t);
    if (endFrequency !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), t + duration);
    const amp = ctx.createGain();
    amp.gain.setValueAtTime(gain, t);
    amp.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.connect(amp).connect(bus || sfxBus);
    osc.start(t);
    osc.stop(t + duration + 0.05);
  }

  const sfx = {
    slash() {
      playNoise({ duration: 0.09, frequency: 3200, q: 0.8, gain: 0.35, sweepTo: 900 });
      playTone({ type: 'triangle', frequency: 880, endFrequency: 440, duration: 0.07, gain: 0.12 });
    },
    heavy() {
      playNoise({ duration: 0.16, frequency: 1400, q: 0.8, gain: 0.45, sweepTo: 300 });
      playTone({ type: 'square', frequency: 220, endFrequency: 90, duration: 0.14, gain: 0.16 });
    },
    special() {
      playTone({ type: 'sawtooth', frequency: 330, endFrequency: 1320, duration: 0.3, gain: 0.14 });
      playNoise({ duration: 0.3, frequency: 2400, q: 2, gain: 0.2, sweepTo: 5200 });
    },
    thunder() {
      playNoise({ duration: 0.7, filterType: 'lowpass', frequency: 900, q: 0.6, gain: 0.6, sweepTo: 90 });
      playTone({ type: 'sine', frequency: 90, endFrequency: 38, duration: 0.55, gain: 0.4 });
    },
    hurt() {
      playTone({ type: 'sine', frequency: 200, endFrequency: 55, duration: 0.22, gain: 0.4 });
      playNoise({ duration: 0.12, filterType: 'lowpass', frequency: 500, gain: 0.25 });
    },
    raijuHit() {
      playTone({ type: 'triangle', frequency: 520, endFrequency: 380, duration: 0.06, gain: 0.14 });
    },
    dash() {
      playNoise({ duration: 0.14, frequency: 900, q: 1.4, gain: 0.22, sweepTo: 2600 });
    },
    jump() {
      playTone({ type: 'sine', frequency: 300, endFrequency: 520, duration: 0.1, gain: 0.1 });
    },
    roar() {
      playTone({ type: 'sawtooth', frequency: 70, endFrequency: 55, duration: 0.8, gain: 0.3 });
      playNoise({ duration: 0.8, filterType: 'lowpass', frequency: 400, gain: 0.3, sweepTo: 120 });
    },
    surge() {
      // The deciding round: a lower, longer roar under a thunder crack.
      playTone({ type: 'sawtooth', frequency: 55, endFrequency: 38, duration: 1.4, gain: 0.34 });
      playTone({ type: 'sawtooth', frequency: 82, endFrequency: 50, duration: 1.1, gain: 0.18, when: 0.1 });
      playNoise({ duration: 1.2, filterType: 'lowpass', frequency: 500, gain: 0.32, sweepTo: 90 });
    },
    click() {
      playTone({ type: 'triangle', frequency: 660, duration: 0.05, gain: 0.12 });
    },
    combo() {
      // The multiplier tier went up: two quick rising notes.
      playTone({ type: 'triangle', frequency: 660, duration: 0.08, gain: 0.16 });
      playTone({ type: 'triangle', frequency: 990, duration: 0.12, gain: 0.16, when: 0.07 });
    },
    victory() {
      [0, 2, 4, 5, 7].forEach((degree, i) => {
        playTone({ type: 'triangle', frequency: PENTA[degree % PENTA.length] * (degree >= PENTA.length ? 2 : 1), duration: 0.5, gain: 0.2, when: i * 0.14 });
      });
    },
    defeat() {
      [4, 3, 1, 0].forEach((degree, i) => {
        playTone({ type: 'sine', frequency: PENTA[degree] / 2, duration: 0.6, gain: 0.2, when: i * 0.22 });
      });
    },
  };

  // --- Music: 8-step loop, taiko thump on steps 0 and 4, a plucked note on
  // the off-steps. Quiet enough to sit under the fight.
  const MELODY = [0, -1, 2, -1, 4, -1, 3, -1];
  function scheduleStep(stepIndex, time) {
    if (!ctx) return;
    const when = time - ctx.currentTime;
    if (stepIndex % 4 === 0) {
      playTone({ type: 'sine', frequency: 75, endFrequency: 42, duration: 0.22, gain: 0.5, when, bus: musicBus });
    }
    const degree = MELODY[stepIndex % MELODY.length];
    if (degree >= 0) {
      playTone({ type: 'triangle', frequency: PENTA[degree], duration: 0.5, gain: 0.16, when, bus: musicBus });
    }
  }

  function startMusic() {
    if (!ensure() || musicTimer) return;
    nextNoteTime = ctx.currentTime + 0.1;
    step = 0;
    musicTimer = window.setInterval(() => {
      if (!ctx) return;
      while (nextNoteTime < ctx.currentTime + 0.15) {
        scheduleStep(step, nextNoteTime);
        nextNoteTime += 0.32;
        step += 1;
      }
    }, 40);
  }

  function stopMusic() {
    if (musicTimer) {
      window.clearInterval(musicTimer);
      musicTimer = null;
    }
  }

  function toggleMute() {
    muted = !muted;
    if (master) master.gain.value = muted ? 0 : 0.9;
    return muted;
  }

  return {
    ensure, sfx, startMusic, stopMusic, toggleMute,
    get muted() { return muted; },
  };
}

// Boot, the fixed-step loop, screens, and feedback. The world decides the
// rules; this file decides what the player feels: hit-stop freezes time on
// impacts, trauma shakes the camera, and every world event gets its sound.
// Screens: title -> select -> play -> paused -> over. ?shot=title|select|
// fight|victory|defeat stages one deterministic scene for a screenshot
// instead of starting the loop.
import { BEST_KEY, SAMURAI_ORDER, STEP } from './config.js';
import { createRandom } from './random.js';
import {
  EVENT_BOLT,
  EVENT_COMBO,
  EVENT_DASH,
  EVENT_HEAVY,
  EVENT_HIT,
  EVENT_JUMP,
  EVENT_LOSE,
  EVENT_PHASE,
  EVENT_RAIJU_HIT,
  EVENT_SLASH,
  EVENT_SPECIAL,
  EVENT_WIN,
  createWorld,
} from './world.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { createRenderer } from './render.js';
import { loadAssets } from './assets.js';
import { stageShot } from './shots.js';

// The raster art (samurai, portraits, attack effects) loads before the
// first frame, so a screenshot never catches a half-loaded hero. A missing
// file resolves to null and the renderer falls back to pixel art.
const assets = await loadAssets();

const canvas = document.getElementById('game');
const statusEl = document.getElementById('status');
const params = new URLSearchParams(window.location.search);
const seed = Number(params.get('seed') || 1) || 1;
const shot = params.get('shot');

const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas, assets);
const audio = createAudio();
const input = createInput(canvas, () => {
  audio.ensure();
  audio.startMusic();
});

let screen = 'title';
let best = 0;
/** Which samurai is highlighted on the select screen (index into SAMURAI_ORDER). */
let selection = 0;
let lastMove = 0;
try {
  best = Number(window.localStorage.getItem(BEST_KEY) || 0) || 0;
} catch {
  best = 0;
}

let hitStopTimer = 0;
let hitStopId = 0;
let timeScale = 1;

function announce(text) {
  if (statusEl) statusEl.textContent = text;
}

/** Freeze time briefly; only the newest call restores it (game-feel). */
function hitStop(duration) {
  hitStopId += 1;
  const id = hitStopId;
  timeScale = 0.05;
  hitStopTimer = duration;
  window.setTimeout(() => {
    if (id === hitStopId) {
      timeScale = 1;
      hitStopTimer = 0;
    }
  }, duration * 1000);
}

function feedback(events) {
  if (events & EVENT_SLASH) {
    audio.sfx.slash();
    renderer.addTrauma(0.14);
    hitStop(0.045);
  }
  if (events & EVENT_HEAVY) {
    audio.sfx.heavy();
    renderer.addTrauma(0.32);
    hitStop(0.12);
  }
  if (events & EVENT_SPECIAL) {
    audio.sfx.special();
    renderer.addTrauma(0.45);
  }
  if (events & EVENT_RAIJU_HIT) audio.sfx.raijuHit();
  if (events & EVENT_HIT) {
    audio.sfx.hurt();
    renderer.addTrauma(0.4);
  }
  if (events & EVENT_BOLT) {
    audio.sfx.thunder();
    renderer.addTrauma(0.5);
  }
  if (events & EVENT_PHASE) {
    audio.sfx.roar();
    renderer.addTrauma(0.7);
  }
  if (events & EVENT_COMBO) {
    audio.sfx.combo();
    renderer.addTrauma(0.15);
  }
  if (events & EVENT_DASH) audio.sfx.dash();
  if (events & EVENT_JUMP) audio.sfx.jump();
  if (events & EVENT_WIN) {
    audio.sfx.victory();
    audio.stopMusic();
  }
  if (events & EVENT_LOSE) {
    audio.sfx.defeat();
    audio.stopMusic();
  }
}

function saveBest() {
  const score = world.state.score;
  if (score > best) {
    best = score;
    try {
      window.localStorage.setItem(BEST_KEY, String(best));
    } catch {
      // Best score is a nicety; the game plays on without it.
    }
  }
}

function startFight() {
  world.reset();
  screen = 'play';
  audio.ensure();
  audio.startMusic();
  announce('The fight begins. Three minutes on the clock.');
}

/** The player picked a samurai; the kaiju is drawn at random (1/3 each). */
function confirmSelection() {
  const samuraiId = SAMURAI_ORDER[selection];
  const kaijuId = world.pickKaiju();
  world.setMatch(samuraiId, kaijuId);
  audio.sfx.click();
  startFight();
}

function endFight() {
  screen = 'over';
  saveBest();
  announce(world.state.won
    ? `Victory. The storm falls. Score ${world.state.score}.`
    : `Defeat. The storm wins. Score ${world.state.score}.`);
}

// --- Screenshot mode: stage one scene, paint it, and report ready.
if (shot) {
  const staged = stageShot(shot, world);
  screen = staged.screen;
  if (staged.screen === 'over') saveBest();
  renderer.render(world.state, screen, 0, staged.best, staged.selection);
  renderer.render(world.state, screen, 0, staged.best, staged.selection);
  window.__shotReady = true;
} else {
  // --- The live loop.
  let last = performance.now();
  let accumulator = 0;
  const MAX_FRAME = 0.25;

  function frame(now) {
    const dtReal = Math.min(MAX_FRAME, Math.max(0, (now - last) / 1000));
    last = now;
    if (hitStopTimer > 0) hitStopTimer = Math.max(0, hitStopTimer - dtReal);
    else timeScale = 1;
    const inputState = input.read();
    if (inputState.mute) {
      const muted = audio.toggleMute();
      announce(muted ? 'Sound off.' : 'Sound on.');
    }

    if (screen === 'title') {
      if (inputState.confirm) {
        audio.sfx.click();
        screen = 'select';
        announce('Choose your samurai. A or D to choose, Enter to fight.');
      } else {
        // The title scene breathes: the duelists stand off, embers drift.
        world.state.elapsed += dtReal;
      }
    } else if (screen === 'select') {
      // A/D switches the highlighted samurai (edge only — holding a key
      // must not flip the choice every frame).
      if (inputState.move !== 0 && inputState.move !== lastMove) {
        selection = (selection + (inputState.move > 0 ? 1 : SAMURAI_ORDER.length - 1)) % SAMURAI_ORDER.length;
        audio.sfx.click();
      }
      lastMove = inputState.move;
      if (inputState.confirm) confirmSelection();
      else world.state.elapsed += dtReal;
    } else if (screen === 'play') {
      if (inputState.pause) {
        screen = 'paused';
        audio.stopMusic();
        announce('Paused.');
      } else {
        accumulator += dtReal * timeScale;
        let guard = 0;
        while (accumulator >= STEP && guard < 8) {
          const events = world.step(STEP, inputState);
          feedback(events);
          accumulator -= STEP;
          guard += 1;
          if (events & (EVENT_WIN | EVENT_LOSE)) {
            endFight();
            break;
          }
        }
        if (guard >= 8) accumulator = 0;
      }
    } else if (screen === 'paused') {
      if (inputState.pause) {
        screen = 'play';
        audio.startMusic();
        announce('The fight resumes.');
      } else if (inputState.confirm) {
        audio.sfx.click();
        startFight();
      }
    } else if (screen === 'over') {
      if (inputState.confirm) {
        audio.sfx.click();
        startFight();
      }
    }

    renderer.render(world.state, screen, dtReal, best, SAMURAI_ORDER[selection]);
    window.requestAnimationFrame(frame);
  }

  announce('Samurai Zero. Press Enter to choose your samurai.');
  window.requestAnimationFrame(frame);
}

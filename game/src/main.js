// Boot, the fixed-step loop, screens, and feedback. The world decides the
// rules; this file decides what the player feels: hit-stop freezes time on
// impacts, trauma shakes the camera, and every world event gets its sound.
// Screens: title -> select -> roundIntro -> play -> paused -> over, plus
// the skin shop (title or over, key S). ?shot=title|select|fight|victory|
// defeat|setup|shop stages one deterministic scene for a screenshot
// instead of starting the loop.
import { ARENA_ORDER, BEST_KEY, DIFFICULTY_ORDER, KAIJU_ORDER, MATCH, SAMURAI_ORDER, SAVE_KEY, SAVE_VERSION, SKINS, SKIN_ORDER, STEP } from './config.js';
import { createRandom } from './random.js';
import {
  EVENT_BOLT,
  EVENT_COMBO,
  EVENT_DASH,
  EVENT_DRAW,
  EVENT_HEAVY,
  EVENT_HIT,
  EVENT_JUMP,
  EVENT_LOSE,
  EVENT_PHASE,
  EVENT_RAIJU_HIT,
  EVENT_SLASH,
  EVENT_SPECIAL,
  EVENT_SURGE,
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
const preview = params.get('preview'); // e.g. 'samurai-blue', 'kaiju-dragon'

const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas, assets);
const audio = createAudio();
const input = createInput(canvas, () => {
  audio.ensure();
  audio.startMusic();
});

// ---------------------------------------------------------- save (coins + skins)
// One versioned object in localStorage (save-systems): parse, check the
// version, migrate the old best-only key once, sanitize every field, and
// fall back to the backup key when the primary is unreadable. A save that
// fails every check starts fresh — the game never refuses to play.
function defaultSave() {
  return { version: SAVE_VERSION, coins: 0, owned: [], equipped: { blue: 'blue', red: 'red' }, best: 0 };
}

function sanitizeSave(raw) {
  const save = defaultSave();
  if (!raw || typeof raw !== 'object') return save;
  if (typeof raw.coins === 'number' && Number.isFinite(raw.coins)) save.coins = Math.max(0, Math.floor(raw.coins));
  if (Array.isArray(raw.owned)) {
    for (const id of raw.owned) {
      if (SKINS[id] && !SKINS[id].comingSoon && !save.owned.includes(id)) save.owned.push(id);
    }
  }
  if (raw.equipped && typeof raw.equipped === 'object') {
    for (const sam of ['blue', 'red']) {
      const id = raw.equipped[sam];
      if (id === sam) save.equipped[sam] = sam;
      else if (SKINS[id] && SKINS[id].samurai === sam && save.owned.includes(id)) save.equipped[sam] = id;
    }
  }
  if (typeof raw.best === 'number' && Number.isFinite(raw.best)) save.best = Math.max(0, Math.floor(raw.best));
  return save;
}

function loadSave() {
  for (const key of [SAVE_KEY, `${SAVE_KEY}.bak`]) {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (parsed && parsed.version === SAVE_VERSION) return sanitizeSave(parsed);
    } catch {
      // Try the next source.
    }
  }
  // No v1 save: fold the old best-only key in once, then leave it alone.
  const save = defaultSave();
  try {
    const oldBest = Number(window.localStorage.getItem(BEST_KEY) || 0) || 0;
    if (oldBest > 0) save.best = oldBest;
  } catch {
    // No old best score.
  }
  return save;
}

function saveGame() {
  try {
    const prev = window.localStorage.getItem(SAVE_KEY);
    if (prev) window.localStorage.setItem(`${SAVE_KEY}.bak`, prev);
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  } catch {
    // Storage is a nicety; the game plays on without it.
  }
}

let save = loadSave();

let screen = 'title';
/** Which samurai is highlighted on the select screen (index into SAMURAI_ORDER). */
let selection = 0;
/** Which kaiju is highlighted (index into KAIJU_ORDER) — the player picks
 * their storm now instead of drawing it at random. */
let kaijuSelection = 0;
/** Which difficulty is highlighted (index into DIFFICULTY_ORDER). */
let diffSelection = 1;
/** Which arena is highlighted (index into ARENA_ORDER). */
let arenaSelection = 0;
/** Match length: 0 = Best of 3, 1 = Best of 5. */
let matchSelection = 0;
let lastMove = 0;
/** Round intro card: how long it shows, and whether it is a surge round. */
let introTimer = 0;
let introSurge = false;
let introDraw = false;
/** Coins earned by the last match, shown on the end screen. */
let lastCoins = 0;
/** Where the shop returns to (title or over). */
let screenBeforeShop = 'title';
/** Shop cursor: column (0 Hayate, 1 Enjin) and row in that samurai's list. */
let shopCol = 0;
let shopRow = 0;
let shopMsg = '';
let shopMsgTimer = 0;

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
  if (events & EVENT_SURGE) {
    audio.sfx.surge();
    renderer.addTrauma(0.7);
  }
  // Round/match endings are NOT handled here: the frame loop calls
  // endRound() first, so a round win never plays the victory jingle.
}

/** The round-intro card: "ROUND 2", "MATCH POINT", or the surge banner.
 * The world resets the round and reports whether the kaiju surges. */
function startRoundIntro(draw) {
  introDraw = draw;
  introSurge = world.startRound();
  introTimer = introSurge ? 1.6 : 1.0;
  screen = 'roundIntro';
  if (introSurge) {
    feedback(EVENT_SURGE);
    announce('KAIJU SURGE — the storm rages, kaiju power +20%.');
  } else if (world.state.round > 1 || world.state.roundWins.ronin + world.state.roundWins.raiju > 0) {
    audio.sfx.roar();
    announce(`Round ${world.state.round}.`);
  } else {
    announce('The fight begins. Three minutes on the clock.');
  }
}

/** The player picked a samurai, a kaiju, an arena, a match length and a
 * difficulty — start the match. */
function startMatch() {
  const samuraiId = SAMURAI_ORDER[selection];
  const kaijuId = KAIJU_ORDER[kaijuSelection];
  world.setDifficulty(DIFFICULTY_ORDER[diffSelection]);
  world.setMatch(samuraiId, kaijuId, ARENA_ORDER[arenaSelection], MATCH.lengths[matchSelection]);
  audio.sfx.click();
  audio.ensure();
  audio.startMusic();
  startRoundIntro(false);
}

/** A round ended (EVENT_WIN / EVENT_LOSE / EVENT_DRAW from step()). Record
 * it in the world: a deciding round is a surge round, a drawn round is
 * replayed, and a match win or loss ends the match. */
function endRound() {
  const result = world.endRound();
  if (result.matchOver) {
    endMatch();
  } else {
    startRoundIntro(result.roundDraw);
  }
}

/** The match is over: pay the coins (win 100, lose 25), keep the best
 * score, and show the end screen. */
function endMatch() {
  screen = 'over';
  const won = world.state.matchWon;
  lastCoins = won ? 100 : 25;
  save.coins += lastCoins;
  if (world.state.score > save.best) save.best = world.state.score;
  saveGame();
  if (won) {
    audio.sfx.victory();
    audio.stopMusic();
  } else {
    audio.sfx.defeat();
    audio.stopMusic();
  }
  announce(won
    ? `Match won. +${lastCoins} coins. Score ${world.state.score}.`
    : `Match lost. +${lastCoins} coins. Score ${world.state.score}.`);
}

/** Buy the highlighted skin, or equip one already owned. Prices come from
 * the SKINS table, never from the player — so a skin can never be bought
 * for less than its price, and a failed buy changes nothing. */
function buyOrEquipSkin() {
  const sam = shopCol === 0 ? 'blue' : 'red';
  const list = SKIN_ORDER[sam];
  const skin = SKINS[list[shopRow]];
  if (!skin || skin.comingSoon) {
    shopMsg = 'COMING SOON';
    shopMsgTimer = 2;
    audio.sfx.click();
    return;
  }
  if (save.owned.includes(skin.id)) {
    save.equipped[sam] = skin.id;
    saveGame();
    shopMsg = 'SKIN EQUIPPED';
    shopMsgTimer = 2;
    audio.sfx.click();
    return;
  }
  if (save.coins < skin.price) {
    shopMsg = `NEED ${skin.price - save.coins} MORE COINS`;
    shopMsgTimer = 2;
    audio.sfx.defeat();
    return;
  }
  save.coins -= skin.price;
  save.owned.push(skin.id);
  save.equipped[sam] = skin.id;
  saveGame();
  shopMsg = 'SKIN EQUIPPED';
  shopMsgTimer = 2;
  audio.sfx.click();
}

// --- Screenshot mode: stage one scene, paint it, and report ready.
if (shot) {
  const staged = stageShot(shot, world);
  screen = staged.screen;
  renderer.render(world.state, screen, 0, staged.best, staged.selection, staged.kaijuSel, staged.diffSel, undefined, staged.ui);
  renderer.render(world.state, screen, 0, staged.best, staged.selection, staged.kaijuSel, staged.diffSel, undefined, staged.ui);
  window.__shotReady = true;
} else {
  // --- Preview mode: one character stands idle on the Edo backdrop,
  // breathing, for a short video clip. No HUD, no input, no fight — just
  // the character, centred, so the clip shows how it moves and that the
  // art is clean. ?preview=samurai-blue|samurai-red|kaiju-fire|kaiju-sea|
  // kaiju-dragon
  if (preview) {
    const [kind, id] = preview.split('-');
    if (kind === 'samurai' && SAMURAI_ORDER.includes(id)) {
      world.setMatch(id, 'fire');
      world.state.ronin.x = 640;
    } else if (kind === 'kaiju' && KAIJU_ORDER.includes(id)) {
      world.setMatch('blue', id);
      world.state.raiju.x = 640;
    }
    screen = 'preview';
  }
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
        lastMove = 0;
        announce('Choose your samurai. A or D to choose, Enter to fight.');
      } else if (inputState.dash) {
        // S opens the skin shop (dash does nothing on this screen).
        audio.sfx.click();
        screenBeforeShop = 'title';
        screen = 'shop';
        lastMove = 0;
      } else {
        // The title scene breathes: the duelists stand off, embers drift.
        world.state.elapsed += dtReal;
      }
    } else if (screen === 'preview') {
      // Preview: the character stands idle and breathes. Only the clock
      // advances — no fight, no timer, no attacks — so the clip is just
      // the character alive on the backdrop.
      world.state.elapsed += dtReal;
    } else if (screen === 'select') {
      // A/D switches the highlighted samurai (edge only — holding a key
      // must not flip the choice every frame).
      if (inputState.move !== 0 && inputState.move !== lastMove) {
        selection = (selection + (inputState.move > 0 ? 1 : SAMURAI_ORDER.length - 1)) % SAMURAI_ORDER.length;
        audio.sfx.click();
      }
      lastMove = inputState.move;
      // W/S cycles the kaiju (jump = up, dash = down — they do nothing
      // else on this screen).
      if (inputState.jump) {
        kaijuSelection = (kaijuSelection + 1) % KAIJU_ORDER.length;
        audio.sfx.click();
      }
      if (inputState.dash) {
        kaijuSelection = (kaijuSelection + KAIJU_ORDER.length - 1) % KAIJU_ORDER.length;
        audio.sfx.click();
      }
      // Q/E cycles the arena.
      if (inputState.arenaPrev) {
        arenaSelection = (arenaSelection + ARENA_ORDER.length - 1) % ARENA_ORDER.length;
        audio.sfx.click();
      }
      if (inputState.arenaNext) {
        arenaSelection = (arenaSelection + 1) % ARENA_ORDER.length;
        audio.sfx.click();
      }
      // T toggles Best of 3 / Best of 5.
      if (inputState.matchToggle) {
        matchSelection = (matchSelection + 1) % MATCH.lengths.length;
        audio.sfx.click();
      }
      // 1/2/3/4 picks the difficulty directly.
      if (inputState.diff1) { diffSelection = 0; audio.sfx.click(); }
      if (inputState.diff2) { diffSelection = 1; audio.sfx.click(); }
      if (inputState.diff3) { diffSelection = 2; audio.sfx.click(); }
      if (inputState.diff4) { diffSelection = 3; audio.sfx.click(); }
      if (inputState.pause) {
        audio.sfx.click();
        screen = 'title';
      } else if (inputState.confirm) {
        startMatch();
      } else world.state.elapsed += dtReal;
    } else if (screen === 'roundIntro') {
      // The intro card shows while the duelists breathe behind it; then
      // the round begins. The music keeps playing across rounds.
      introTimer -= dtReal;
      world.state.elapsed += dtReal;
      if (introTimer <= 0) {
        screen = 'play';
        audio.ensure();
        audio.startMusic();
      }
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
          // Combat feedback only: round/match endings go to endRound(),
          // so a round win never plays the victory jingle.
          feedback(events & ~(EVENT_WIN | EVENT_LOSE | EVENT_DRAW));
          accumulator -= STEP;
          guard += 1;
          if (events & (EVENT_WIN | EVENT_LOSE | EVENT_DRAW)) {
            endRound();
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
        startMatch();
      }
    } else if (screen === 'over') {
      if (inputState.confirm) {
        audio.sfx.click();
        startMatch();
      } else if (inputState.dash) {
        // S opens the skin shop (dash does nothing on this screen).
        audio.sfx.click();
        screenBeforeShop = 'over';
        screen = 'shop';
        lastMove = 0;
      }
    } else if (screen === 'shop') {
      // A/D switches the samurai column, W/S moves down the skin list,
      // Enter buys or equips, Esc goes back.
      if (inputState.move !== 0 && inputState.move !== lastMove) {
        shopCol = (shopCol + (inputState.move > 0 ? 1 : 2 - 1)) % 2;
        shopRow = 0;
        audio.sfx.click();
      }
      lastMove = inputState.move;
      const list = SKIN_ORDER[shopCol === 0 ? 'blue' : 'red'];
      if (inputState.jump) {
        shopRow = (shopRow + list.length - 1) % list.length;
        audio.sfx.click();
      }
      if (inputState.dash) {
        shopRow = (shopRow + 1) % list.length;
        audio.sfx.click();
      }
      if (inputState.confirm) buyOrEquipSkin();
      if (inputState.pause) {
        audio.sfx.click();
        screen = screenBeforeShop;
      } else {
        world.state.elapsed += dtReal;
      }
      if (shopMsgTimer > 0) {
        shopMsgTimer -= dtReal;
        if (shopMsgTimer <= 0) shopMsg = '';
      }
    }

    const ui = {
      arenaSel: ARENA_ORDER[arenaSelection],
      matchSel: MATCH.lengths[matchSelection],
      save,
      intro: {
        round: world.state.round,
        matchLength: world.state.matchLength,
        roundWins: world.state.roundWins,
        winsNeeded: world.state.winsNeeded,
        surge: introSurge,
        draw: introDraw,
      },
      shop: { col: shopCol, row: shopRow, msg: shopMsg },
      lastCoins,
    };
    renderer.render(world.state, screen, dtReal, save.best, SAMURAI_ORDER[selection], KAIJU_ORDER[kaijuSelection], DIFFICULTY_ORDER[diffSelection], preview, ui);
    window.requestAnimationFrame(frame);
  }

  announce('Samurai Zero. Press Enter to choose your samurai.');
  window.requestAnimationFrame(frame);
}

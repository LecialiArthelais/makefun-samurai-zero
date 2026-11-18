// The screenshot scenes behind ?shot=title|select|setup|fight|fireball|
// victory|defeat|shop. Each one plays the real rules forward from a fresh
// world, steered by a simple autopilot, so the frame is what a real game
// looks like and the same seed always gives the same frame. The fight
// pilot is the one from the balance tests: it closes in while Raiju rests,
// slashes, and backs off when the storm telegraphs. The defeat pilot
// stands still, as a hurried player does. The four gameplay shots
// showcase the whole roster: the cover is red vs dragon, the surge shot
// is blue vs sea in the Moonlit Sea, the victory is red vs sea, the
// defeat is blue vs the dragon. Staged shots inject a deterministic save
// (1,250 coins, one skin owned) instead of reading the player's
// localStorage, so the shop and setup frames never depend on who took them.
import { STEP } from './config.js';
import { EVENT_DRAW, EVENT_LOSE, EVENT_RAIJU_HIT, EVENT_WIN } from './world.js';

const TITLE_SECONDS = 2;
const LIMIT_SECONDS = 175;

const IDLE = { move: 0, jump: false, jumpHeld: false, slash: false, heavy: false, special: false, dash: false };

/** The deterministic save every staged shot injects. */
function stagedSave() {
  return { version: 1, coins: 1250, owned: ['blueFrost'], equipped: { blue: 'blueFrost', red: 'red' }, best: 0 };
}

function stagedUi(overrides) {
  return {
    arenaSel: 'town',
    matchSel: 3,
    save: stagedSave(),
    intro: { round: 1, matchLength: 3, roundWins: { ronin: 0, raiju: 0 }, winsNeeded: 2, surge: false, draw: false },
    shop: { col: 0, row: 0, msg: '' },
    lastCoins: 0,
    ...(overrides || {}),
  };
}

/** A duellist that fights properly: punish the rest, respect the telegraph. */
export function createAutopilot() {
  let frame = 0;
  return function autopilot(state) {
    frame += 1;
    const r = state.ronin;
    const k = state.raiju;
    const dist = Math.abs(k.x - r.x);
    let move = 0;
    let inBolt = false;
    for (const b of state.bolts) {
      if (b.active && b.phase === 'mark' && Math.abs(r.x - b.x) < b.width / 2 + 30) inBolt = true;
    }
    const waveNear = state.waves.some((w) => w.active && Math.abs(w.x - r.x) < 160);
    if (inBolt) move = r.x < 640 ? -1 : 1;
    else if (waveNear && r.onGround) move = 0;
    else if (k.state === 'recover' || k.state === 'idle') move = dist > 150 ? (k.x > r.x ? 1 : -1) : 0;
    else if (k.state === 'telegraph' && (k.attack === 'swipe' || k.attack === 'leap') && dist < 260) move = k.x > r.x ? -1 : 1;
    else if (dist > 320) move = k.x > r.x ? 1 : -1;
    return {
      move,
      jump: waveNear && r.onGround,
      jumpHeld: true,
      slash: dist < 160 && (k.state === 'recover' || k.state === 'idle') && frame % 18 === 0,
      heavy: dist < 180 && k.state === 'recover' && frame % 60 === 0,
      special: r.energy >= 1 && dist < 500 && frame % 240 === 0,
      dash: inBolt && r.dashTimer <= 0,
    };
  };
}

/**
 * Set `world` to the named scene and return the screen to draw over it.
 * Any unknown name is the title.
 */
export function stageShot(name, world) {
  world.reset();
  if (name === 'select' || name === 'setup') {
    // The setup screen: blue highlighted, the sea kaiju and the Moonlit
    // Sea arena picked, Best of 3, Medium — the full match setup in one
    // frame, with the Frost skin worn so the card shows a variant.
    const idle = { ...IDLE };
    for (let index = 0; index < TITLE_SECONDS / STEP; index += 1) world.step(STEP, idle);
    return {
      screen: 'select', best: 0, selection: 'blue', kaijuSel: 'sea', diffSel: 'medium',
      ui: stagedUi({ arenaSel: 'sea', matchSel: 3 }),
    };
  }
  if (name === 'fight') {
    // Shot 2: the deciding round of a Best of 3 in the Moonlit Sea, with
    // the KAIJU SURGE banner up — one frame proves the new arena and the
    // surge at once. The match is staged at 1–1, so round 3 decides it.
    world.setDifficulty('medium');
    world.setMatch('blue', 'sea', 'sea', 3);
    world.state.roundWins = { ronin: 1, raiju: 1 };
    world.state.round = 3;
    world.startRound(); // Surge is on: round 3 decides the match.
    for (let index = 0; index < 0.5 / STEP; index += 1) world.step(STEP, { ...IDLE });
    return {
      screen: 'roundIntro',
      best: world.state.score,
      selection: 'blue', kaijuSel: 'sea', diffSel: 'medium',
      ui: stagedUi({
        arenaSel: 'sea', matchSel: 3,
        intro: { round: 3, matchLength: 3, roundWins: { ronin: 1, raiju: 1 }, winsNeeded: 2, surge: true, draw: false },
      }),
    };
  }
  if (name === 'fireball') {
    // The cover shot: Enjin (red) hurls his fireball at SANRYU, the
    // three-headed dragon. The autopilot fights until Enjin has a full
    // energy cell, then he backs away to open range and fires — so the
    // fireball has a long flight and the frame catches it mid-screen,
    // clearly separated from both the samurai and the dragon.
    world.setMatch('red', 'dragon');
    const auto = createAutopilot();
    let phase = 'fight';
    const pilot = (state) => {
      const r = state.ronin;
      const k = state.raiju;
      const dist = Math.abs(k.x - r.x);
      if (phase === 'fight') {
        if (r.energy >= 1) phase = 'retreat';
        return auto(state);
      }
      if (phase === 'retreat') {
        if (dist > 420) {
          phase = 'fire';
          return { move: 0, jump: false, jumpHeld: false, slash: false, heavy: false, special: true, dash: false };
        }
        const away = k.x > r.x ? -1 : 1;
        return { move: away, jump: false, jumpHeld: false, slash: false, heavy: false, special: false, dash: false };
      }
      return { move: 0, jump: false, jumpHeld: false, slash: false, heavy: false, special: true, dash: false };
    };
    const idle = { move: 0, jump: false, jumpHeld: false, slash: false, heavy: false, special: false, dash: false };
    for (let index = 0; index < LIMIT_SECONDS / STEP; index += 1) {
      world.step(STEP, pilot(world.state));
      const proj = world.state.projectiles.find((p) => p.active);
      if (proj) {
        // The fireball flies at 1150 px/s (~19.2 px/frame) and dies on the
        // dragon's hitbox (100 px either side of his centre). Step to the
        // midpoint of the remaining flight so it sits between the two.
        const dist = Math.abs(world.state.raiju.x - world.state.ronin.x);
        const framesToHit = Math.max(0, (dist - 150) / 19.2);
        const mid = Math.max(3, Math.min(12, Math.floor(framesToHit / 2)));
        for (let j = 0; j < mid; j += 1) {
          world.step(STEP, idle);
          if (!world.state.projectiles.find((p) => p.active)) break;
        }
        break;
      }
      if (world.state.over) break;
    }
    return { screen: 'play', best: world.state.score };
  }
  if (name === 'victory') {
    // The match is staged at 1–0, so winning this round wins the match.
    // Rounds are played to a conclusion, so the end screen always shows
    // the true match result.
    world.setDifficulty('medium');
    world.setMatch('red', 'sea', 'town', 3);
    world.state.roundWins = { ronin: 1, raiju: 0 };
    world.state.round = 2;
    world.startRound();
    const pilot = createAutopilot();
    for (let index = 0; index < LIMIT_SECONDS / STEP; index += 1) {
      const events = world.step(STEP, pilot(world.state));
      if (events & (EVENT_WIN | EVENT_LOSE | EVENT_DRAW)) {
        const result = world.endRound();
        if (result.matchOver) break;
        world.startRound();
      }
    }
    return {
      screen: 'over', best: world.state.score, selection: 'red', kaijuSel: 'sea', diffSel: 'medium',
      ui: stagedUi({ lastCoins: world.state.matchWon ? 100 : 25 }),
    };
  }
  if (name === 'defeat') {
    world.setMatch('blue', 'dragon');
    const idle = { ...IDLE };
    for (let index = 0; index < LIMIT_SECONDS / STEP; index += 1) {
      const events = world.step(STEP, idle);
      if (events & EVENT_LOSE) {
        world.endRound();
        break;
      }
      if (events & EVENT_WIN) break;
    }
    return {
      screen: 'over', best: world.state.score, selection: 'blue', kaijuSel: 'dragon', diffSel: 'medium',
      ui: stagedUi({ lastCoins: 25 }),
    };
  }
  if (name === 'shop') {
    // The shop with the staged save: 1,250 coins, Frost owned and
    // equipped — the first row shows EQUIPPED, the second its price.
    const idle = { ...IDLE };
    for (let index = 0; index < TITLE_SECONDS / STEP; index += 1) world.step(STEP, idle);
    return {
      screen: 'shop', best: 0, selection: 'blue', kaijuSel: 'fire', diffSel: 'medium',
      ui: stagedUi({ shop: { col: 0, row: 0, msg: '' } }),
    };
  }
  // Title: a couple of seconds in, so the embers have drifted and the idle
  // animation is mid-frame, the duelists still standing off.
  const idle = { move: 0, jump: false, jumpHeld: false, slash: false, heavy: false, special: false, dash: false };
  for (let index = 0; index < TITLE_SECONDS / STEP; index += 1) world.step(STEP, idle);
  return { screen: 'title', best: 0 };
}

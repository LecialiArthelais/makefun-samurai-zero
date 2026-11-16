// The screenshot scenes behind ?shot=title|select|fight|victory|defeat. Each
// one plays the real rules forward from a fresh world, steered by a simple
// autopilot, so the frame is what a real game looks like and the same seed
// always gives the same frame. The fight pilot is the one from the balance
// tests: it closes in while Raiju rests, slashes, and backs off when the
// storm telegraphs. The defeat pilot stands still, as a hurried player does.
// The four gameplay shots showcase the whole roster: the fight is blue vs
// fire, the victory is red vs sea, the defeat is blue vs the dragon.
import { STEP } from './config.js';
import { EVENT_LOSE, EVENT_RAIJU_HIT, EVENT_WIN } from './world.js';

const TITLE_SECONDS = 2;
const FIGHT_MIN_SECONDS = 20;
const FIGHT_MAX_SECONDS = 26;
const LIMIT_SECONDS = 175;

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
  if (name === 'select') {
    // The select screen, blue highlighted, the duelists standing off.
    const idle = { move: 0, jump: false, jumpHeld: false, slash: false, heavy: false, special: false, dash: false };
    for (let index = 0; index < TITLE_SECONDS / STEP; index += 1) world.step(STEP, idle);
    return { screen: 'select', best: 0, selection: 'blue' };
  }
  if (name === 'fight') {
    world.setMatch('blue', 'fire');
    const pilot = createAutopilot();
    let events = 0;
    for (let index = 0; index < FIGHT_MAX_SECONDS / STEP; index += 1) {
      events = world.step(STEP, pilot(world.state));
      if (world.state.elapsed >= FIGHT_MIN_SECONDS && (events & EVENT_RAIJU_HIT)) {
        // Let the slash arc swing past the impact and the hit flash fade, so
        // the frame shows the blade mid-arc, the damage number still rising,
        // and Raiju himself readable instead of white-hot.
        const idle = { move: 0, jump: false, jumpHeld: false, slash: false, heavy: false, special: false, dash: false };
        for (let j = 0; j < 8; j += 1) world.step(STEP, idle);
        break;
      }
      if (world.state.over) break;
    }
    return { screen: world.state.over ? 'over' : 'play', best: world.state.score };
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
    world.setMatch('red', 'sea');
    const pilot = createAutopilot();
    for (let index = 0; index < LIMIT_SECONDS / STEP; index += 1) {
      const events = world.step(STEP, pilot(world.state));
      if (events & EVENT_WIN) break;
      if (events & EVENT_LOSE) break;
    }
    return { screen: 'over', best: world.state.score };
  }
  if (name === 'defeat') {
    world.setMatch('blue', 'dragon');
    const idle = { move: 0, jump: false, jumpHeld: false, slash: false, heavy: false, special: false, dash: false };
    for (let index = 0; index < LIMIT_SECONDS / STEP; index += 1) {
      const events = world.step(STEP, idle);
      if (events & EVENT_LOSE) break;
      if (events & EVENT_WIN) break;
    }
    return { screen: 'over', best: world.state.score };
  }
  // Title: a couple of seconds in, so the embers have drifted and the idle
  // animation is mid-frame, the duelists still standing off.
  const idle = { move: 0, jump: false, jumpHeld: false, slash: false, heavy: false, special: false, dash: false };
  for (let index = 0; index < TITLE_SECONDS / STEP; index += 1) world.step(STEP, idle);
  return { screen: 'title', best: 0 };
}

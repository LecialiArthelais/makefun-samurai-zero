// The screenshot scenes behind ?shot=title|fight|victory|defeat. Each one plays
// the real rules forward from a fresh world, steered by a simple autopilot, so
// the frame is what a real game looks like and the same seed always gives the
// same frame. The fight pilot is the one from the balance tests: it closes in
// while Raiju rests, slashes, and backs off when the storm telegraphs. The
// defeat pilot stands still, as a hurried player does.
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
  if (name === 'fight') {
    const pilot = createAutopilot();
    let events = 0;
    for (let index = 0; index < FIGHT_MAX_SECONDS / STEP; index += 1) {
      events = world.step(STEP, pilot(world.state));
      if (world.state.elapsed >= FIGHT_MIN_SECONDS && (events & EVENT_RAIJU_HIT)) {
        // Let the slash arc swing past the impact and the hit flash fade, so
        // the frame shows the blade mid-arc, the damage number still rising,
        // and Raiju himself readable instead of white-hot.
        const idle = { move: 0, jump: false, slash: false, heavy: false, special: false, dash: false };
        for (let j = 0; j < 8; j += 1) world.step(STEP, idle);
        break;
      }
      if (world.state.over) break;
    }
    return { screen: world.state.over ? 'over' : 'play', best: world.state.score };
  }
  if (name === 'victory') {
    const pilot = createAutopilot();
    for (let index = 0; index < LIMIT_SECONDS / STEP; index += 1) {
      const events = world.step(STEP, pilot(world.state));
      if (events & EVENT_WIN) break;
      if (events & EVENT_LOSE) break;
    }
    return { screen: 'over', best: world.state.score };
  }
  if (name === 'defeat') {
    const idle = { move: 0, jump: false, slash: false, heavy: false, special: false, dash: false };
    for (let index = 0; index < LIMIT_SECONDS / STEP; index += 1) {
      const events = world.step(STEP, idle);
      if (events & EVENT_LOSE) break;
      if (events & EVENT_WIN) break;
    }
    return { screen: 'over', best: world.state.score };
  }
  // Title: a couple of seconds in, so the embers have drifted and the idle
  // animation is mid-frame, the duelists still standing off.
  const idle = { move: 0, jump: false, slash: false, heavy: false, special: false, dash: false };
  for (let index = 0; index < TITLE_SECONDS / STEP; index += 1) world.step(STEP, idle);
  return { screen: 'title', best: 0 };
}

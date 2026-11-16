// The game's rules and state, with no drawing and no browser in it: the
// samurai, the kaiju boss machine (one of three types, picked at random with
// equal chance), lightning, shockwaves, particles, score and the three-minute
// clock. step() advances one fixed step and returns what happened as bit
// flags, so the caller can react (sound, shake, hit-stop) without the world
// knowing about screens or sound. Nothing here allocates after createWorld
// returns; every random choice comes from the seeded generator passed in,
// so the same seed always plays the same fight.
import { FIELD, KAIJU_ORDER, KAIJU_TYPES, RAIJU, RONIN, SAMURAI_VARIANTS, SCORE, STEP, TIME_LIMIT } from './config.js';

export const EVENT_SLASH = 1;
export const EVENT_HEAVY = 2;
export const EVENT_SPECIAL = 4;
export const EVENT_HIT = 8;
export const EVENT_RAIJU_HIT = 16;
export const EVENT_BOLT = 32;
export const EVENT_WAVE = 64;
export const EVENT_PHASE = 128;
export const EVENT_WIN = 256;
export const EVENT_LOSE = 512;
export const EVENT_DASH = 1024;
export const EVENT_JUMP = 2048;
export const EVENT_ROAR = 4096;
export const EVENT_COMBO = 8192;

const MAX_PARTICLES = 160;
const MAX_NUMBERS = 24;
const MAX_BOLTS = 8;
const MAX_WAVES = 4;
const MAX_PROJECTILES = 2;

function overlaps(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

export function createWorld(random) {
  const ronin = {
    x: 300, y: FIELD.groundY, vx: 0, vy: 0, facing: 1,
    hp: RONIN.hp, invulnerable: 0, onGround: true,
    coyote: 0, jumpBuffer: 0,
    slashTimer: 0, heavyTimer: 0, specialTimer: 0, dashTimer: 0, dashTime: 0,
    energy: 1, energyHits: 0,
    slashBuffer: 0, heavyBuffer: 0,
    pose: 'idle', poseTime: 0, animTime: 0, moving: false,
  };
  const raiju = {
    x: 980, y: FIELD.groundY, hp: RAIJU.hp, phase: 1,
    state: 'idle', stateTime: 0, restTimer: 1.4,
    attack: null, attackX: 0, targetX: 0,
    headRear: 0, bodyDrop: 0, flash: 0, aura: 0,
    leapVx: 0, leapVy: 0, leaping: false,
  };
  const particles = [];
  for (let i = 0; i < MAX_PARTICLES; i += 1) {
    particles.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 2, color: '#ffffff', gravity: 0 });
  }
  const numbers = [];
  for (let i = 0; i < MAX_NUMBERS; i += 1) {
    numbers.push({ active: false, x: 0, y: 0, text: '', life: 0, maxLife: 1, color: '#ffffff' });
  }
  const bolts = [];
  for (let i = 0; i < MAX_BOLTS; i += 1) {
    bolts.push({ active: false, x: 0, width: RAIJU.boltWidth, timer: 0, phase: 'mark', struck: false });
  }
  const waves = [];
  for (let i = 0; i < MAX_WAVES; i += 1) {
    waves.push({ active: false, x: 0, dir: -1, speed: RAIJU.waveSpeed, width: 46, height: 42 });
  }
  const projectiles = [];
  for (let i = 0; i < MAX_PROJECTILES; i += 1) {
    projectiles.push({ active: false, x: 0, y: 0, dir: 1, speed: 1150, width: 90, height: 150, damage: RONIN.specialDamage });
  }
  const state = {
    ronin, raiju, particles, numbers, bolts, waves, projectiles,
    score: 0, timeLeft: TIME_LIMIT, over: false, won: false,
    noHit: true, hits: 0, damageDealt: 0, elapsed: 0, endTimer: 0,
    /** Combo: consecutive hits within SCORE.comboWindow build a multiplier. */
    combo: 0, comboTimer: 0, comboBest: 0,
    /** The match: which samurai the player picked, which kaiju was drawn. */
    samurai: 'blue', kaiju: 'fire',
  };

  /** One seeded draw over the three kaiju: equal chance, 1/3 each. */
  function pickKaiju() {
    return KAIJU_ORDER[Math.floor(random() * KAIJU_ORDER.length)];
  }

  /** Set the match (player's samurai + the drawn kaiju) and start fresh. */
  function setMatch(samuraiId, kaijuId) {
    state.samurai = samuraiId;
    state.kaiju = kaijuId;
    reset();
  }

  function reset() {
    ronin.x = 300; ronin.y = FIELD.groundY; ronin.vx = 0; ronin.vy = 0; ronin.facing = 1;
    ronin.hp = RONIN.hp; ronin.invulnerable = 0; ronin.onGround = true;
    ronin.coyote = 0; ronin.jumpBuffer = 0;
    ronin.slashTimer = 0; ronin.heavyTimer = 0; ronin.specialTimer = 0; ronin.dashTimer = 0; ronin.dashTime = 0;
    ronin.energy = 1; ronin.energyHits = 0; ronin.slashBuffer = 0; ronin.heavyBuffer = 0; ronin.pose = 'idle'; ronin.poseTime = 0; ronin.animTime = 0;
    raiju.x = 980; raiju.y = FIELD.groundY; raiju.hp = RAIJU.hp; raiju.phase = 1;
    raiju.state = 'idle'; raiju.stateTime = 0; raiju.restTimer = 1.4;
    raiju.attack = null; raiju.headRear = 0; raiju.bodyDrop = 0; raiju.flash = 0; raiju.aura = 0; raiju.leaping = false;
    for (const p of particles) p.active = false;
    for (const n of numbers) n.active = false;
    for (const b of bolts) b.active = false;
    for (const w of waves) w.active = false;
    for (const p of projectiles) p.active = false;
    state.score = 0; state.timeLeft = TIME_LIMIT; state.over = false; state.won = false;
    state.noHit = true; state.hits = 0; state.damageDealt = 0; state.elapsed = 0; state.endTimer = 0;
    state.combo = 0; state.comboTimer = 0; state.comboBest = 0;
  }

  function spawnParticle(x, y, vx, vy, life, size, color, gravity) {
    for (const p of particles) {
      if (p.active) continue;
      p.active = true; p.x = x; p.y = y; p.vx = vx; p.vy = vy;
      p.life = life; p.maxLife = life; p.size = size; p.color = color; p.gravity = gravity;
      return;
    }
  }

  function burst(x, y, count, speed, life, size, color, gravity) {
    for (let i = 0; i < count; i += 1) {
      const angle = random() * Math.PI * 2;
      const v = speed * (0.3 + random() * 0.7);
      spawnParticle(x, y, Math.cos(angle) * v, Math.sin(angle) * v - speed * 0.3, life * (0.6 + random() * 0.6), size, color, gravity);
    }
  }

  function spawnNumber(x, y, text, color) {
    for (const n of numbers) {
      if (n.active) continue;
      n.active = true; n.x = x; n.y = y; n.text = text; n.life = 0.8; n.maxLife = 0.8; n.color = color;
      return;
    }
  }

  function raijuBox() {
    return { x: raiju.x - 100, y: raiju.y - 150, width: 200, height: 150 };
  }

  function roninBox() {
    return { x: ronin.x - RONIN.width / 2, y: ronin.y - RONIN.height, width: RONIN.width, height: RONIN.height };
  }

  /** Score multiplier from the combo: x1 base, +1 tier per comboStep hits, capped. */
  function comboMultiplier(combo) {
    return 1 + Math.min(Math.floor(combo / SCORE.comboStep), SCORE.comboMax - 1);
  }

  function dealDamageToRaiju(amount, x, y, big) {
    raiju.hp = Math.max(0, raiju.hp - amount);
    raiju.flash = 0.12;
    state.damageDealt += amount;
    // Combo: this hit chains onto the last one if it lands inside the window.
    // Getting hurt breaks it (see hurtRonin); the window expiring does too.
    const prevMult = comboMultiplier(state.combo);
    state.combo += 1;
    state.comboTimer = SCORE.comboWindow;
    if (state.combo > state.comboBest) state.comboBest = state.combo;
    const mult = comboMultiplier(state.combo);
    state.score += amount * SCORE.perDamage * mult;
    state.hits += 1;
    spawnNumber(raiju.x + (random() * 60 - 30), raiju.y - 160, String(amount), big ? '#ffd94a' : '#ffffff');
    burst(x, y, big ? 14 : 8, big ? 320 : 220, 0.5, 3, '#b78bff', 300);
    // Charge energy: landing hits refills one cell.
    ronin.energyHits += 1;
    if (ronin.energyHits >= RONIN.hitsPerCell && ronin.energy < RONIN.maxCells) {
      ronin.energy += 1;
      ronin.energyHits = 0;
      burst(ronin.x, ronin.y - 40, 10, 160, 0.6, 3, '#7ec8ff', -60);
    }
    // Phase lines: the storm quickens, then rages.
    const nextPhase = raiju.hp <= RAIJU.phase3At ? 3 : raiju.hp <= RAIJU.phase2At ? 2 : 1;
    let phaseUp = false;
    if (nextPhase > raiju.phase) {
      raiju.phase = nextPhase;
      state.score += SCORE.phaseBonus;
      spawnNumber(raiju.x, raiju.y - 200, `PHASE ${nextPhase}`, '#b78bff');
      phaseUp = true;
    }
    return { phaseUp, comboUp: mult > prevMult };
  }

  function hurtRonin(amount, x, y) {
    if (ronin.invulnerable > 0 || ronin.dashTime > 0 || state.over) return false;
    ronin.hp = Math.max(0, ronin.hp - amount);
    ronin.invulnerable = RONIN.invulnerable;
    ronin.pose = 'hurt';
    ronin.poseTime = 0.25;
    state.noHit = false;
    // Getting hit breaks the combo.
    state.combo = 0;
    state.comboTimer = 0;
    spawnNumber(ronin.x, ronin.y - 80, `-${amount}`, '#e05243');
    burst(ronin.x, ronin.y - 32, 12, 260, 0.5, 3, '#e05243', 300);
    return true;
  }

  function pickAttack() {
    const dist = Math.abs(raiju.x - ronin.x);
    const set = KAIJU_TYPES[state.kaiju].attacks;
    const has = (kind) => set.includes(kind);
    const options = [];
    if (has('swipe') && dist < RAIJU.swipeRange + 40) options.push('swipe', 'swipe');
    if (has('bolt')) options.push('bolt');
    if (raiju.phase >= 2) {
      if (has('bolt')) options.push('bolt');
      if (has('leap')) options.push('leap');
      if (has('stomp')) options.push('stomp');
    }
    if (raiju.phase >= 3) {
      if (has('storm')) options.push('storm', 'bolt');
      if (has('leap')) options.push('leap');
    }
    if (dist > 500) {
      if (has('bolt')) options.push('bolt');
      if (has('leap')) options.push('leap');
    }
    if (has('stomp')) options.push('stomp');
    if (options.length === 0) options.push(set[0]);
    return options[Math.floor(random() * options.length)];
  }

  function startAttack(kind) {
    raiju.attack = kind;
    raiju.state = 'telegraph';
    raiju.stateTime = 0;
    if (kind === 'swipe') {
      raiju.headRear = 1;
    } else if (kind === 'bolt' || kind === 'storm') {
      const count = kind === 'storm' ? 5 : raiju.phase >= 2 ? 2 : 1;
      let placed = 0;
      for (const b of bolts) {
        if (placed >= count) break;
        if (b.active) continue;
        b.active = true;
        // Storm marks the ronin's ground, then fans out; single bolts hunt the ronin.
        const spread = kind === 'storm' ? (placed - 2) * 130 : (random() * 120 - 60);
        b.x = Math.max(60, Math.min(FIELD.width - 60, ronin.x + spread));
        b.width = RAIJU.boltWidth;
        b.timer = RAIJU.boltTelegraph * (kind === 'storm' ? 1 + placed * 0.18 : 1);
        b.phase = 'mark';
        b.struck = false;
        placed += 1;
      }
    } else if (kind === 'leap') {
      // Lands NEAR the ronin, not on top of them: the slam is dodgeable.
      raiju.targetX = Math.max(120, Math.min(FIELD.width - 120, ronin.x + (random() * 160 - 80)));
      raiju.headRear = 1;
    } else if (kind === 'stomp') {
      raiju.bodyDrop = 1;
    }
  }

  function fireAttack() {
    const kind = raiju.attack;
    if (kind === 'swipe') {
      const box = { x: raiju.x - 210, y: raiju.y - 170, width: 210, height: 170 };
      if (overlaps(box, roninBox())) hurtRonin(RAIJU.swipeDamage, ronin.x, ronin.y - 32);
      burst(raiju.x - 160, raiju.y - 90, 16, 380, 0.5, 3, KAIJU_TYPES[state.kaiju].burst, 200);
    } else if (kind === 'leap') {
      raiju.leaping = true;
      raiju.leapVx = (raiju.targetX - raiju.x) / 0.55;
      raiju.leapVy = -620;
    } else if (kind === 'stomp') {
      let w = null;
      for (const wave of waves) if (!wave.active) { w = wave; break; }
      if (w) {
        w.active = true;
        w.x = raiju.x - 100;
        w.dir = ronin.x < raiju.x ? -1 : 1;
        w.speed = RAIJU.waveSpeed * RAIJU.speedScale[raiju.phase - 1];
      }
      burst(raiju.x, FIELD.groundY, 20, 420, 0.6, 4, KAIJU_TYPES[state.kaiju].burst, 500);
    }
    raiju.state = 'recover';
    raiju.stateTime = 0;
  }

  function updateRaiju(dt) {
    raiju.stateTime += dt;
    if (raiju.flash > 0) raiju.flash = Math.max(0, raiju.flash - dt);
    const speed = RAIJU.speedScale[raiju.phase - 1];
    if (raiju.leaping) {
      raiju.x += raiju.leapVx * dt;
      raiju.y += raiju.leapVy * dt;
      raiju.leapVy += 2200 * dt;
      if (raiju.y >= FIELD.groundY) {
        raiju.y = FIELD.groundY;
        raiju.leaping = false;
        raiju.bodyDrop = 1;
        burst(raiju.x, FIELD.groundY, 24, 460, 0.6, 4, KAIJU_TYPES[state.kaiju].burst, 500);
        const box = { x: raiju.x - 100, y: FIELD.groundY - 60, width: 200, height: 60 };
        if (overlaps(box, roninBox()) && ronin.onGround) hurtRonin(RAIJU.slamDamage, ronin.x, ronin.y - 32);
        let w = null;
        for (const wave of waves) if (!wave.active) { w = wave; break; }
        if (w) {
          w.active = true;
          w.x = raiju.x + (ronin.x < raiju.x ? -110 : 110);
          w.dir = ronin.x < raiju.x ? -1 : 1;
          w.speed = RAIJU.waveSpeed * speed;
        }
      }
      return;
    }
    if (raiju.state === 'idle') {
      raiju.headRear = Math.max(0, raiju.headRear - dt * 3);
      raiju.bodyDrop = Math.max(0, raiju.bodyDrop - dt * 3);
      raiju.restTimer -= dt;
      // Drift back toward its hunting ground, slowly.
      const home = 980;
      raiju.x += Math.max(-30, Math.min(30, home - raiju.x)) * dt * 0.5;
      if (raiju.restTimer <= 0) startAttack(pickAttack());
    } else if (raiju.state === 'telegraph') {
      const telegraph = raiju.attack === 'swipe' ? RAIJU.swipeTelegraph / speed
        : raiju.attack === 'leap' ? RAIJU.slamTelegraph / speed
          : raiju.attack === 'stomp' ? 0.45 / speed
            : RAIJU.boltTelegraph / speed;
      if (raiju.stateTime >= telegraph) fireAttack();
    } else if (raiju.state === 'recover') {
      raiju.headRear = Math.max(0, raiju.headRear - dt * 3);
      raiju.bodyDrop = Math.max(0, raiju.bodyDrop - dt * 3);
      if (raiju.stateTime >= RAIJU.restAfter[raiju.phase - 1]) {
        raiju.state = 'idle';
        raiju.stateTime = 0;
        raiju.restTimer = 0.3 + random() * 0.5;
      }
    }
  }

  function updateBolts(dt) {
    let struck = false;
    for (const b of bolts) {
      if (!b.active) continue;
      b.timer -= dt;
      if (b.phase === 'mark' && b.timer <= 0) {
        b.phase = 'strike';
        b.timer = 0.22;
        struck = true;
        burst(b.x, FIELD.groundY - 120, 18, 420, 0.4, 3, '#b78bff', 100);
        burst(b.x, FIELD.groundY, 10, 300, 0.4, 4, '#f2e9ff', 400);
        const boltBox = { x: b.x - b.width / 2, y: 0, width: b.width, height: FIELD.groundY };
        if (overlaps(boltBox, roninBox())) hurtRonin(RAIJU.boltDamage, ronin.x, ronin.y - 32);
      } else if (b.phase === 'strike' && b.timer <= 0) {
        b.active = false;
      }
    }
    return struck;
  }

  function updateWaves(dt) {
    let hit = false;
    for (const w of waves) {
      if (!w.active) continue;
      w.x += w.dir * w.speed * dt;
      const box = { x: w.x - w.width / 2, y: FIELD.groundY - w.height, width: w.width, height: w.height };
      if (overlaps(box, roninBox()) && ronin.onGround) {
        if (hurtRonin(RAIJU.waveDamage, ronin.x, ronin.y - 32)) hit = true;
        w.active = false;
      }
      if (w.x < -80 || w.x > FIELD.width + 80) w.active = false;
    }
    return hit;
  }

  function updateProjectiles(dt) {
    let raijuHit = false;
    let phaseUp = false;
    let comboUp = false;
    for (const p of projectiles) {
      if (!p.active) continue;
      p.x += p.dir * p.speed * dt;
      const box = { x: p.x - p.width / 2, y: p.y - p.height / 2, width: p.width, height: p.height };
      if (overlaps(box, raijuBox())) {
        p.active = false;
        raijuHit = true;
        const r = dealDamageToRaiju(p.damage, raiju.x - 100, raiju.y - 90, true);
        if (r.phaseUp) phaseUp = true;
        if (r.comboUp) comboUp = true;
        burst(raiju.x - 100, raiju.y - 90, 20, 380, 0.6, 3, '#7ec8ff', 200);
      }
      if (p.x < -120 || p.x > FIELD.width + 120) p.active = false;
    }
    return { raijuHit, phaseUp, comboUp };
  }

  /** The active samurai's attack numbers — Hayate is swift, Enjin is mighty. */
  function variantStats() {
    return SAMURAI_VARIANTS[state.samurai || 'blue'];
  }

  function trySlash(heavy) {
    const v = variantStats();
    const reach = heavy ? RONIN.heavyReach : RONIN.slashReach;
    const damage = heavy ? v.heavyDamage : v.slashDamage;
    const box = {
      x: ronin.facing > 0 ? ronin.x : ronin.x - reach,
      y: ronin.y - 110,
      width: reach,
      height: 110,
    };
    if (overlaps(box, raijuBox())) {
      const r = dealDamageToRaiju(damage, raiju.x - 100, raiju.y - 90, heavy);
      return { hit: true, phaseUp: r.phaseUp, comboUp: r.comboUp };
    }
    return { hit: false, phaseUp: false, comboUp: false };
  }

  /**
   * One fixed step. `input` is { move: -1|0|1, jump, slash, heavy, special,
   * dash } — the pressed flags are edges (true only on the frame the key went
   * down) and are consumed here. Returns the event bit flags.
   */
  function step(dt, input) {
    let events = 0;
    if (state.over) {
      state.endTimer += dt;
      updateParticles(dt);
      updateNumbers(dt);
      return events;
    }
    state.elapsed += dt;
    state.timeLeft = Math.max(0, TIME_LIMIT - state.elapsed);
    if (state.timeLeft <= 0) {
      state.over = true;
      state.won = false;
      return EVENT_LOSE;
    }

    // --- Ronin timers.
    if (ronin.invulnerable > 0) ronin.invulnerable = Math.max(0, ronin.invulnerable - dt);
    if (ronin.slashTimer > 0) ronin.slashTimer -= dt;
    if (ronin.heavyTimer > 0) ronin.heavyTimer -= dt;
    if (ronin.specialTimer > 0) ronin.specialTimer -= dt;
    if (ronin.dashTimer > 0) ronin.dashTimer -= dt;
    if (ronin.coyote > 0) ronin.coyote -= dt;
    if (ronin.jumpBuffer > 0) ronin.jumpBuffer -= dt;
    if (ronin.slashBuffer > 0) ronin.slashBuffer -= dt;
    if (ronin.heavyBuffer > 0) ronin.heavyBuffer -= dt;
    if (ronin.poseTime > 0) ronin.poseTime -= dt;

    // Face the kaiju: a duel is always face to face.
    ronin.facing = raiju.x >= ronin.x ? 1 : -1;

    // --- Movement (locked out while hurt or dashing).
    const locked = ronin.pose === 'hurt' && ronin.poseTime > 0;
    if (ronin.dashTime > 0) {
      ronin.dashTime -= dt;
      ronin.vx = ronin.facing * RONIN.dashSpeed;
    } else if (!locked) {
      ronin.vx = input.move * RONIN.runSpeed;
      ronin.moving = input.move !== 0;
    } else {
      ronin.vx = 0;
    }
    ronin.x = Math.max(RONIN.width / 2 + 8, Math.min(FIELD.width - RONIN.width / 2 - 8, ronin.x + ronin.vx * dt));
    // Keep the ronin out of Raiju's body.
    const rb = raijuBox();
    const pb = roninBox();
    if (overlaps(pb, rb)) {
      ronin.x = ronin.x < raiju.x ? rb.x - RONIN.width / 2 - 1 : rb.x + rb.width + RONIN.width / 2 + 1;
      if (hurtRonin(RAIJU.touchDamage, ronin.x, ronin.y - 32)) events |= EVENT_HIT;
    }

    // --- Jump: coyote time + a short buffer, so it forgives late presses.
    if (input.jump) ronin.jumpBuffer = 0.12;
    if (ronin.jumpBuffer > 0 && (ronin.onGround || ronin.coyote > 0) && !locked) {
      ronin.vy = RONIN.jumpVelocity;
      ronin.onGround = false;
      ronin.coyote = 0;
      ronin.jumpBuffer = 0;
      events |= EVENT_JUMP;
      burst(ronin.x, FIELD.groundY, 6, 120, 0.4, 3, '#b8a8c8', 100);
    }
    ronin.vy += RONIN.gravity * dt;
    ronin.y += ronin.vy * dt;
    if (ronin.y >= FIELD.groundY) {
      if (!ronin.onGround && ronin.vy > 300) burst(ronin.x, FIELD.groundY, 5, 100, 0.35, 3, '#b8a8c8', 100);
      ronin.y = FIELD.groundY;
      ronin.vy = 0;
      ronin.onGround = true;
      ronin.coyote = 0.1;
    } else {
      ronin.onGround = false;
    }

    // --- Dash.
    if (input.dash && ronin.dashTimer <= 0 && !locked) {
      ronin.dashTime = RONIN.dashTime;
      ronin.dashTimer = RONIN.dashCooldown;
      events |= EVENT_DASH;
      burst(ronin.x, ronin.y - 32, 8, 200, 0.35, 3, '#7ec8ff', 0);
    }

    // --- Attacks. A press that lands just before the cooldown ends is
    // buffered briefly, so the combo never eats an input (input-systems).
    if (input.slash) ronin.slashBuffer = 0.12;
    if (input.heavy) ronin.heavyBuffer = 0.12;
    if (ronin.slashBuffer > 0 && ronin.slashTimer <= 0 && !locked) {
      ronin.slashBuffer = 0;
      ronin.slashTimer = variantStats().slashCooldown;
      ronin.pose = 'slash';
      ronin.poseTime = 0.18;
      events |= EVENT_SLASH;
      const r = trySlash(false);
      if (r.hit) {
        events |= EVENT_RAIJU_HIT;
        if (r.phaseUp) events |= EVENT_PHASE;
        if (r.comboUp) events |= EVENT_COMBO;
      }
    }
    if (ronin.heavyBuffer > 0 && ronin.heavyTimer <= 0 && !locked) {
      ronin.heavyBuffer = 0;
      ronin.heavyTimer = RONIN.heavyCooldown;
      ronin.pose = 'heavy';
      ronin.poseTime = 0.32;
      events |= EVENT_HEAVY;
      const r = trySlash(true);
      if (r.hit) {
        events |= EVENT_RAIJU_HIT;
        if (r.phaseUp) events |= EVENT_PHASE;
        if (r.comboUp) events |= EVENT_COMBO;
      }
    }
    if (input.special && ronin.specialTimer <= 0 && ronin.energy >= RONIN.specialCost && !locked) {
      ronin.energy -= RONIN.specialCost;
      ronin.specialTimer = RONIN.specialCooldown;
      ronin.pose = 'heavy';
      ronin.poseTime = 0.32;
      events |= EVENT_SPECIAL;
      let p = null;
      for (const proj of projectiles) if (!proj.active) { p = proj; break; }
      if (p) {
        p.active = true;
        p.x = ronin.x + ronin.facing * 50;
        p.y = ronin.y - 70;
        p.dir = ronin.facing;
      }
    }

    // --- Combo window: it runs out if no hit lands in time.
    if (state.comboTimer > 0) {
      state.comboTimer -= dt;
      if (state.comboTimer <= 0) {
        state.comboTimer = 0;
        state.combo = 0;
      }
    }

    // --- Pose: what the renderer shows. While poseTime runs, the pose is an
    // animation lock (slash, heavy, hurt); after it, the pose follows the body.
    if (ronin.poseTime <= 0) {
      if (!ronin.onGround) ronin.pose = 'jump';
      else if (ronin.moving) ronin.pose = 'run';
      else ronin.pose = 'idle';
    }
    ronin.animTime += dt;

    // --- Raiju, bolts, waves, projectiles.
    updateRaiju(dt);
    if (updateBolts(dt)) events |= EVENT_BOLT;
    if (updateWaves(dt)) events |= EVENT_HIT;
    const pr = updateProjectiles(dt);
    if (pr.raijuHit) events |= EVENT_RAIJU_HIT;
    if (pr.phaseUp) events |= EVENT_PHASE;
    if (pr.comboUp) events |= EVENT_COMBO;

    // --- Particles and floating numbers.
    updateParticles(dt);
    updateNumbers(dt);

    // --- Win / lose.
    if (raiju.hp <= 0) {
      state.over = true;
      state.won = true;
      state.score += Math.round(state.timeLeft) * SCORE.winTimeBonus;
      if (state.noHit) state.score += SCORE.noHitBonus;
      burst(raiju.x, raiju.y - 90, 60, 520, 1.2, 4, '#b78bff', 200);
      burst(raiju.x, raiju.y - 90, 40, 420, 1.0, 4, '#ffd94a', 100);
      return events | EVENT_WIN;
    }
    if (ronin.hp <= 0) {
      state.over = true;
      state.won = false;
      return events | EVENT_LOSE;
    }
    return events;
  }

  function updateParticles(dt) {
    for (const p of particles) {
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) { p.active = false; continue; }
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
  }

  function updateNumbers(dt) {
    for (const n of numbers) {
      if (!n.active) continue;
      n.life -= dt;
      if (n.life <= 0) { n.active = false; continue; }
      n.y -= 42 * dt;
    }
  }

  reset();
  return { state, reset, step, setMatch, pickKaiju };
}

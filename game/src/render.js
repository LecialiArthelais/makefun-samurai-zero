// The canvas renderer: everything the player sees, and nothing the game
// decides. It draws the Edo dusk (sky, sun, Fuji, town, torii, lanterns,
// drifting embers), the ronin and Raiju from the pixel sprites, combat
// feedback (slash arcs, lightning, shockwaves, particles, damage numbers),
// the HUD, and the title / pause / end screens. Juice lives here too:
// trauma-based screen shake (game-feel) moves only the camera, never the
// simulation. The playfield is a fixed 1280x720 logical area, scaled to the
// window with letterboxing.
import { FIELD, PALETTE, FONT, RAIJU, RONIN } from './config.js';
import { drawPixelSprite, drawPixelSpriteAt, SPRITES } from './sprites.js';

function hash(n) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  let trauma = 0;
  let shakeTime = 0;
  let view = { scale: 1, ox: 0, oy: 0, width: 1280, height: 720 };

  function resize() {
    const w = canvas.clientWidth || FIELD.width;
    const h = canvas.clientHeight || FIELD.height;
    canvas.width = w;
    canvas.height = h;
    const scale = Math.min(w / FIELD.width, h / FIELD.height);
    view = { scale, ox: (w - FIELD.width * scale) / 2, oy: (h - FIELD.height * scale) / 2, width: w, height: h };
  }
  window.addEventListener('resize', resize);
  resize();

  function addTrauma(amount) {
    trauma = Math.min(1, trauma + amount);
  }

  function updateShake(dt) {
    if (trauma <= 0) return;
    trauma = Math.max(0, trauma - dt * 1.4);
    shakeTime += dt * 30;
  }

  function shakeOffset() {
    const s = trauma * trauma;
    return {
      x: 12 * s * Math.sin(shakeTime * 1.7),
      y: 8 * s * Math.sin(shakeTime * 2.3),
    };
  }

  // ---------------------------------------------------------- background
  function drawBackground(elapsed) {
    // Sunset sky: deep violet at the top, burning orange at the horizon.
    const sky = ctx.createLinearGradient(0, 0, 0, FIELD.groundY);
    sky.addColorStop(0, PALETTE.skyTop);
    sky.addColorStop(0.38, PALETTE.skyMid);
    sky.addColorStop(0.68, PALETTE.skyLow);
    sky.addColorStop(1, PALETTE.horizon);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, FIELD.width, FIELD.groundY + 2);
    // The low sun, big and burning, with a halo.
    const glow = ctx.createRadialGradient(880, 520, 40, 880, 520, 230);
    glow.addColorStop(0, 'rgba(255,122,42,0.55)');
    glow.addColorStop(0.5, 'rgba(255,122,42,0.18)');
    glow.addColorStop(1, 'rgba(255,122,42,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(610, 250, 540, 540);
    ctx.fillStyle = PALETTE.sun;
    ctx.beginPath();
    ctx.arc(880, 520, 92, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.sunCore;
    ctx.beginPath();
    ctx.arc(880, 520, 62, 0, Math.PI * 2);
    ctx.fill();
    // Clouds: soft clusters of low-alpha puffs, never solid discs.
    const clouds = [
      [120, 120, 150, 18], [520, 90, 190, 22], [980, 150, 170, 20],
      [300, 210, 120, 14], [1120, 260, 150, 16],
    ];
    for (let i = 0; i < clouds.length; i += 1) {
      const [cx, cy, cw, ch] = clouds[i];
      const drift = Math.sin(elapsed * 0.05 + i * 2.1) * 6;
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = PALETTE.cloud;
      const puffs = 4;
      for (let p = 0; p < puffs; p += 1) {
        const px = cx + drift + (p - (puffs - 1) / 2) * cw * 0.42;
        const py = cy + hash(i * 10 + p) * ch * 0.5;
        ctx.beginPath();
        ctx.ellipse(px, py, cw * 0.34, ch * 0.9, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      // A faint fire-lit rim along the cloud's underside.
      ctx.globalAlpha = 0.16;
      ctx.fillStyle = PALETTE.cloudLit;
      ctx.beginPath();
      ctx.ellipse(cx + drift, cy + ch * 0.55, cw * 0.85, ch * 0.35, 0, 0, Math.PI);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    // Mount Fuji, snow-capped, rising over the town.
    ctx.fillStyle = PALETTE.fuji;
    ctx.beginPath();
    ctx.moveTo(30, FIELD.groundY);
    ctx.lineTo(230, 296);
    ctx.lineTo(430, FIELD.groundY);
    ctx.closePath();
    ctx.fill();
    // Fuji's shaded flank, away from the sun.
    ctx.fillStyle = 'rgba(20,10,30,0.45)';
    ctx.beginPath();
    ctx.moveTo(230, 296);
    ctx.lineTo(430, FIELD.groundY);
    ctx.lineTo(300, FIELD.groundY);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = PALETTE.fujiSnow;
    ctx.beginPath();
    ctx.moveTo(196, 362);
    ctx.lineTo(230, 296);
    ctx.lineTo(266, 364);
    ctx.lineTo(248, 376);
    ctx.lineTo(230, 358);
    ctx.lineTo(212, 378);
    ctx.closePath();
    ctx.fill();
    // Far city: rooftops and a tall tower, dark against the sunset.
    ctx.fillStyle = PALETTE.townFar;
    const far = [
      [470, 500, 90, 164], [570, 540, 70, 124], [650, 480, 110, 184],
      [1080, 520, 80, 144], [1170, 550, 90, 114],
    ];
    for (const [x, y, w, h] of far) ctx.fillRect(x, y, w, h);
    // The tall tower (a Skytree-like spire) on the right.
    ctx.fillStyle = PALETTE.tower;
    ctx.fillRect(1008, 330, 22, 334);
    ctx.beginPath();
    ctx.moveTo(1019, 330);
    ctx.lineTo(1012, 288);
    ctx.lineTo(1026, 288);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(1002, 400, 34, 8);
    // Pagoda, left of the tower.
    ctx.fillStyle = PALETTE.townFar;
    ctx.fillRect(770, 470, 56, 194);
    ctx.fillRect(758, 452, 80, 16);
    ctx.fillRect(762, 500, 72, 12);
    ctx.fillRect(762, 548, 72, 12);
    // Lit windows in the far town, warm against the dark.
    ctx.fillStyle = PALETTE.lantern;
    for (let i = 0; i < 14; i += 1) {
      const wx = 480 + hash(i + 7) * 700;
      const wy = 500 + hash(i + 21) * 120;
      ctx.globalAlpha = 0.5 + 0.4 * hash(i + 33);
      ctx.fillRect(wx, wy, 4, 6);
    }
    ctx.globalAlpha = 1;
    // Fires on the burning buildings: glow, flickering flames, smoke.
    const fires = [
      [500, 500], [700, 480], [1110, 520], [1210, 550],
    ];
    for (let i = 0; i < fires.length; i += 1) {
      const [fx, fy] = fires[i];
      const fl = 0.8 + 0.25 * Math.sin(elapsed * 7 + i * 1.7);
      const fglow = ctx.createRadialGradient(fx, fy, 4, fx, fy, 70 * fl);
      fglow.addColorStop(0, 'rgba(255,150,50,0.5)');
      fglow.addColorStop(1, 'rgba(255,122,42,0)');
      ctx.fillStyle = fglow;
      ctx.fillRect(fx - 70, fy - 70, 140, 140);
      // Flame tongues.
      ctx.fillStyle = PALETTE.fire;
      ctx.beginPath();
      ctx.moveTo(fx - 14, fy);
      ctx.lineTo(fx - 6, fy - 30 * fl);
      ctx.lineTo(fx + 2, fy - 12 * fl);
      ctx.lineTo(fx + 10, fy - 26 * fl);
      ctx.lineTo(fx + 16, fy);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = PALETTE.fireCore;
      ctx.beginPath();
      ctx.moveTo(fx - 7, fy);
      ctx.lineTo(fx - 2, fy - 16 * fl);
      ctx.lineTo(fx + 6, fy);
      ctx.closePath();
      ctx.fill();
      // Smoke rising, fading as it climbs.
      for (let s = 0; s < 3; s += 1) {
        const rise = ((elapsed * 14 + s * 26 + i * 40) % 90);
        const sa = 0.28 * (1 - rise / 90);
        ctx.globalAlpha = sa;
        ctx.fillStyle = PALETTE.smoke;
        ctx.beginPath();
        ctx.arc(fx + 8 + s * 6 - rise * 0.12, fy - 20 - rise, 10 + rise * 0.16, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    // Bridge over the river, and the water with the sun's reflection.
    ctx.fillStyle = PALETTE.water;
    ctx.fillRect(0, 606, FIELD.width, FIELD.groundY - 606);
    // Sun's reflection: a shimmering band under the sun.
    for (let i = 0; i < 26; i += 1) {
      const ry = 610 + i * 2;
      const rw = 60 + hash(i + 90) * 130;
      const wob = Math.sin(elapsed * 2 + i * 0.9) * 8;
      ctx.globalAlpha = 0.12 + 0.22 * hash(i + 120);
      ctx.fillStyle = PALETTE.waterShine;
      ctx.fillRect(880 - rw / 2 + wob, ry, rw, 1.6);
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = PALETTE.bridge;
    ctx.fillRect(430, 566, 560, 12);
    for (let i = 0; i < 5; i += 1) {
      const bx = 460 + i * 104;
      ctx.fillRect(bx, 578, 14, 28);
    }
    ctx.fillRect(430, 560, 560, 6);
    // Near town at the edges, darker, with lit windows.
    ctx.fillStyle = PALETTE.townNear;
    ctx.fillRect(0, 600, 130, 64);
    ctx.fillRect(1150, 610, 130, 54);
    ctx.fillStyle = PALETTE.lantern;
    for (let i = 0; i < 6; i += 1) {
      const wx = 20 + i * 22 + hash(i + 300) * 12;
      ctx.globalAlpha = 0.5 + 0.4 * hash(i + 310);
      ctx.fillRect(wx, 612 + hash(i + 320) * 18, 5, 7);
    }
    ctx.globalAlpha = 1;
    // Torii gate on the left, framing the hero's side, with lanterns.
    ctx.fillStyle = PALETTE.toriiDark;
    ctx.fillRect(64, 480, 12, 184);
    ctx.fillRect(176, 480, 12, 184);
    ctx.fillStyle = PALETTE.torii;
    ctx.fillRect(46, 464, 160, 14);
    ctx.fillRect(58, 494, 136, 10);
    ctx.fillRect(120, 504, 16, 160);
    const flick = 0.75 + 0.25 * Math.sin(elapsed * 6);
    ctx.globalAlpha = flick;
    drawPixelSpriteAt(ctx, SPRITES.lantern, 78, 518, 3);
    drawPixelSpriteAt(ctx, SPRITES.lantern, 168, 518, 3);
    ctx.globalAlpha = 1;
    // Ground: cracked stone platform, warm rim light from the sunset.
    ctx.fillStyle = PALETTE.groundTop;
    ctx.fillRect(0, FIELD.groundY, FIELD.width, 5);
    ctx.fillStyle = PALETTE.ground;
    ctx.fillRect(0, FIELD.groundY + 5, FIELD.width, FIELD.height - FIELD.groundY - 5);
    // Stone slabs and cracks.
    ctx.fillStyle = PALETTE.stone;
    for (let i = 0; i < 9; i += 1) {
      const sx = 60 + i * 140 + hash(i + 400) * 30;
      ctx.globalAlpha = 0.5;
      ctx.fillRect(sx, FIELD.groundY + 14, 90, 3);
    }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = PALETTE.groundCrack;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(300, FIELD.groundY + 8);
    ctx.lineTo(340, FIELD.groundY + 30);
    ctx.lineTo(330, FIELD.groundY + 52);
    ctx.moveTo(900, FIELD.groundY + 8);
    ctx.lineTo(860, FIELD.groundY + 34);
    ctx.lineTo(880, FIELD.groundY + 50);
    ctx.stroke();
    // Rubble near the edges.
    ctx.fillStyle = PALETTE.stone;
    ctx.fillRect(30, FIELD.groundY + 24, 18, 10);
    ctx.fillRect(1240, FIELD.groundY + 30, 22, 12);
    // Drifting embers and glowing sparks, deterministic from the clock.
    for (let i = 0; i < 64; i += 1) {
      const speed = 12 + hash(i + 200) * 22;
      const rise = 8 + hash(i + 300) * 18;
      const x = (hash(i) * FIELD.width + elapsed * speed) % FIELD.width;
      const y = FIELD.groundY - ((hash(i + 100) * 420 + elapsed * rise) % 460);
      const size = 2 + hash(i + 400) * 3;
      const a = 0.35 + 0.45 * hash(i + 500);
      if (hash(i + 600) > 0.7) {
        ctx.globalAlpha = a * 0.35;
        ctx.fillStyle = PALETTE.ember;
        ctx.fillRect(x - 3, y - 3, size + 6, size + 6);
      }
      ctx.globalAlpha = a;
      ctx.fillStyle = hash(i + 600) > 0.5 ? PALETTE.ember : PALETTE.spark;
      ctx.fillRect(x, y, size, size);
    }
    ctx.globalAlpha = 1;
  }

  // ---------------------------------------------------------- actors
  function roninFrame(state) {
    const r = state.ronin;
    if (r.pose === 'hurt') return SPRITES.ronin.hurt;
    if (r.pose === 'slash') return SPRITES.ronin.slash;
    if (r.pose === 'heavy') return SPRITES.ronin.heavy;
    if (r.pose === 'jump') return SPRITES.ronin.jump;
    if (r.pose === 'run') {
      const frame = Math.floor(r.animTime * 10) % 2;
      return SPRITES.ronin.run[frame];
    }
    const frame = Math.floor(r.animTime * 2) % 2;
    return SPRITES.ronin.idle[frame];
  }

  function drawRonin(state, elapsed) {
    const r = state.ronin;
    const scale = 4;
    ctx.save();
    // Invulnerability: the ronin goes ghostly, never invisible — the hero
    // must always read, even in a screenshot.
    if (r.invulnerable > 0 && Math.floor(elapsed * 14) % 2 === 0) ctx.globalAlpha = 0.45;
    if (r.facing < 0) {
      ctx.translate(r.x, 0);
      ctx.scale(-1, 1);
      ctx.translate(-r.x, 0);
    }
    drawPixelSprite(ctx, roninFrame(state), r.x, r.y, scale);
    ctx.restore();
    // Shadow.
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(r.x - 26, FIELD.groundY - 2, 52, 5);
  }

  function drawRaiju(state, elapsed) {
    const k = state.raiju;
    if (state.over && state.won) return; // felled: the storm is gone.
    // One connected silhouette, 216x156 at scale 6. The beast rears (lifts)
    // during the telegraph and drops on the stomp; the maw opens to strike.
    const s = 6;
    const rear = k.headRear * 22;
    const drop = k.bodyDrop * 14;
    const bob = Math.sin(elapsed * 2.2) * 3;
    const frame = (k.state === 'telegraph' && (k.attack === 'swipe' || k.attack === 'leap')) || k.state === 'recover'
      ? SPRITES.raiju.open
      : SPRITES.raiju.closed;
    ctx.save();
    if (k.flash > 0) ctx.filter = 'brightness(1.7) saturate(0.6)';
    drawPixelSprite(ctx, frame, k.x, FIELD.groundY + drop - rear + bob, s);
    ctx.restore();
    // Phase 3 aura: crackling light around the beast.
    if (k.phase === 3) {
      ctx.globalAlpha = 0.25 + 0.2 * Math.sin(elapsed * 9);
      ctx.strokeStyle = PALETTE.lightning;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(k.x, FIELD.groundY - 80, 150 + Math.sin(elapsed * 5) * 8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    // Shadow.
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(k.x - 110, FIELD.groundY - 2, 220, 6);
  }

  // ---------------------------------------------------------- effects
  function drawSlashArc(state) {
    const r = state.ronin;
    if (r.pose !== 'slash' && r.pose !== 'heavy') return;
    const heavy = r.pose === 'heavy';
    const reach = heavy ? 120 : 84;
    const cx = r.x + r.facing * (reach * 0.55);
    const cy = r.y - 52;
    const progress = 1 - r.poseTime / (heavy ? 0.32 : 0.18);
    const startAngle = -Math.PI * 0.7;
    const endAngle = Math.PI * 0.15;
    const angle = startAngle + (endAngle - startAngle) * progress;
    ctx.save();
    ctx.globalAlpha = 0.9 * (1 - progress * 0.6);
    ctx.strokeStyle = heavy ? PALETTE.lightningCore : PALETTE.steel;
    ctx.lineWidth = heavy ? 7 : 5;
    ctx.beginPath();
    ctx.arc(cx, cy, reach, startAngle, angle);
    ctx.stroke();
    ctx.strokeStyle = PALETTE.lightning;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, reach - 12, startAngle, angle);
    ctx.stroke();
    ctx.restore();
  }

  function drawBolts(state) {
    for (const b of state.bolts) {
      if (!b.active) continue;
      if (b.phase === 'mark') {
        // Telegraph: a pulsing danger zone with chevrons.
        const pulse = 0.5 + 0.4 * Math.sin(state.elapsed * 14);
        ctx.globalAlpha = 0.25 + pulse * 0.35;
        ctx.fillStyle = PALETTE.lightning;
        ctx.fillRect(b.x - b.width / 2, FIELD.groundY - 6, b.width, 6);
        ctx.beginPath();
        ctx.moveTo(b.x, FIELD.groundY - 34);
        ctx.lineTo(b.x - 12, FIELD.groundY - 12);
        ctx.lineTo(b.x + 12, FIELD.groundY - 12);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;
      } else {
        // Strike: a jagged bolt from the sky, with glow.
        const segments = 7;
        ctx.save();
        ctx.globalAlpha = 0.85;
        ctx.strokeStyle = PALETTE.lightning;
        ctx.lineWidth = 6;
        ctx.beginPath();
        let px = b.x;
        ctx.moveTo(px, 0);
        for (let i = 1; i <= segments; i += 1) {
          px = b.x + (hash(b.x + i * 7) - 0.5) * 44;
          ctx.lineTo(px, (i / segments) * FIELD.groundY);
        }
        ctx.stroke();
        ctx.strokeStyle = PALETTE.lightningCore;
        ctx.lineWidth = 2;
        ctx.beginPath();
        px = b.x;
        ctx.moveTo(px, 0);
        for (let i = 1; i <= segments; i += 1) {
          px = b.x + (hash(b.x + i * 7) - 0.5) * 44;
          ctx.lineTo(px, (i / segments) * FIELD.groundY);
        }
        ctx.stroke();
        ctx.restore();
        ctx.fillStyle = 'rgba(183,139,255,0.25)';
        ctx.fillRect(b.x - b.width / 2, FIELD.groundY - 8, b.width, 8);
      }
    }
  }

  function drawWaves(state) {
    for (const w of state.waves) {
      if (!w.active) continue;
      ctx.fillStyle = PALETTE.kaijuBody;
      ctx.beginPath();
      ctx.ellipse(w.x, FIELD.groundY - 10, w.width / 2, 26, 0, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = PALETTE.lightning;
      ctx.beginPath();
      ctx.ellipse(w.x, FIELD.groundY - 22, w.width / 4, 10, 0, Math.PI, 0);
      ctx.fill();
    }
  }

  function drawProjectiles(state) {
    for (const p of state.projectiles) {
      if (!p.active) continue;
      // Moonlight Wave: a tall blade of light.
      ctx.save();
      ctx.globalAlpha = 0.95;
      ctx.fillStyle = PALETTE.lightningCore;
      ctx.beginPath();
      ctx.moveTo(p.x - p.dir * 40, p.y - 70);
      ctx.lineTo(p.x + p.dir * 40, p.y - 40);
      ctx.lineTo(p.x + p.dir * 40, p.y + 40);
      ctx.lineTo(p.x - p.dir * 40, p.y + 70);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = PALETTE.lightning;
      ctx.beginPath();
      ctx.moveTo(p.x - p.dir * 40, p.y - 30);
      ctx.lineTo(p.x + p.dir * 10, p.y);
      ctx.lineTo(p.x - p.dir * 40, p.y + 30);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  function drawParticles(state) {
    for (const p of state.particles) {
      if (!p.active) continue;
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }

  function drawNumbers(state) {
    ctx.textAlign = 'center';
    ctx.font = `bold 20px ${FONT}`;
    for (const n of state.numbers) {
      if (!n.active) continue;
      ctx.globalAlpha = Math.max(0, n.life / n.maxLife);
      ctx.fillStyle = n.color;
      ctx.fillText(n.text, n.x, n.y);
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
  }

  // ---------------------------------------------------------- HUD
  function drawBar(x, y, w, h, ratio, good, warn, bad) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
    ctx.fillStyle = ratio > 0.5 ? good : ratio > 0.25 ? warn : bad;
    ctx.fillRect(x, y, Math.max(0, w * ratio), h);
  }

  function drawHud(state, screen) {
    const r = state.ronin;
    const k = state.raiju;
    // Samurai HP + energy (top-left).
    ctx.fillStyle = PALETTE.text;
    ctx.font = `bold 15px ${FONT}`;
    ctx.fillText('SAMURAI', 24, 30);
    drawBar(24, 38, 220, 14, r.hp / RONIN.hp, PALETTE.hpGood, PALETTE.hpWarn, PALETTE.hpBad);
    ctx.font = `13px ${FONT}`;
    ctx.fillText(`${Math.max(0, Math.ceil(r.hp))} / ${RONIN.hp}`, 252, 51);
    for (let i = 0; i < RONIN.maxCells; i += 1) {
      ctx.fillStyle = i < r.energy ? PALETTE.energy : 'rgba(126,200,255,0.25)';
      ctx.beginPath();
      ctx.arc(36 + i * 26, 70, 8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = PALETTE.muted;
    ctx.fillText('MOONLIGHT', 118, 74);
    // Timer + score (top-centre).
    const t = Math.max(0, Math.ceil(state.timeLeft));
    const mm = String(Math.floor(t / 60));
    const ss = String(t % 60).padStart(2, '0');
    ctx.textAlign = 'center';
    ctx.font = `bold 30px ${FONT}`;
    ctx.fillStyle = t <= 30 ? PALETTE.hpBad : PALETTE.text;
    ctx.fillText(`${mm}:${ss}`, FIELD.width / 2, 44);
    ctx.font = `bold 16px ${FONT}`;
    ctx.fillStyle = PALETTE.text;
    ctx.fillText(`SCORE ${state.score}`, FIELD.width / 2, 68);
    ctx.textAlign = 'left';
    // Raiju HP + phase (top-right).
    ctx.textAlign = 'right';
    ctx.font = `bold 15px ${FONT}`;
    ctx.fillStyle = PALETTE.text;
    ctx.fillText('RAIJU — THUNDER KAIJU', FIELD.width - 24, 30);
    drawBar(FIELD.width - 244, 38, 220, 14, k.hp / RAIJU.hp, PALETTE.lightning, PALETTE.lightning, PALETTE.hpBad);
    ctx.font = `13px ${FONT}`;
    ctx.fillText(`PHASE ${k.phase} / 3`, FIELD.width - 24, 74);
    ctx.textAlign = 'left';
    // Controls hint, early in the fight.
    if (screen === 'play' && state.elapsed < 6) {
      ctx.globalAlpha = 0.75;
      ctx.fillStyle = PALETTE.muted;
      ctx.font = `14px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText('A/D MOVE   SPACE JUMP   J SLASH   K HEAVY   L MOONLIGHT   SHIFT DASH', FIELD.width / 2, FIELD.height - 16);
      ctx.textAlign = 'left';
      ctx.globalAlpha = 1;
    }
  }

  // ---------------------------------------------------------- screens
  function panel(x, y, w, h) {
    ctx.fillStyle = 'rgba(20,14,28,0.88)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = PALETTE.panelEdge;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);
  }

  function drawTitle(state, best) {
    ctx.fillStyle = 'rgba(10,6,16,0.45)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `16px ${FONT}`;
    ctx.fillText('A SAMURAI DUEL IN THE BURNING TOWN', FIELD.width / 2, 168);
    ctx.fillStyle = PALETTE.sunCore;
    ctx.font = `bold 84px ${FONT}`;
    ctx.fillText('SAMURAI', FIELD.width / 2, 268);
    ctx.fillStyle = PALETTE.fire;
    ctx.shadowColor = PALETTE.fire;
    ctx.shadowBlur = 28;
    ctx.font = `bold 84px ${FONT}`;
    ctx.fillText('ZERO', FIELD.width / 2, 352);
    ctx.shadowBlur = 0;
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `16px ${FONT}`;
    ctx.fillText('RAIJU, THE THUNDER BEAST, HAS COME FOR THE TOWN.', FIELD.width / 2, 396);
    ctx.fillText('THREE MINUTES. THREE PHASES. ONE BLADE.', FIELD.width / 2, 422);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `bold 20px ${FONT}`;
    ctx.fillText('PRESS ENTER TO FIGHT', FIELD.width / 2, 492);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `15px ${FONT}`;
    ctx.fillText('A/D MOVE    SPACE JUMP    J SLASH    K HEAVY    L MOONLIGHT    SHIFT DASH    ESC PAUSE', FIELD.width / 2, 544);
    if (best > 0) {
      ctx.fillStyle = PALETTE.spark;
      ctx.fillText(`BEST SCORE ${best}`, FIELD.width / 2, 580);
    }
    ctx.textAlign = 'left';
  }

  function drawPaused() {
    ctx.fillStyle = 'rgba(10,6,16,0.6)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.text;
    ctx.font = `bold 52px ${FONT}`;
    ctx.fillText('PAUSED', FIELD.width / 2, 330);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `18px ${FONT}`;
    ctx.fillText('ESC TO RESUME    —    ENTER TO RESTART', FIELD.width / 2, 380);
    ctx.textAlign = 'left';
  }

  function drawEnd(state, best) {
    ctx.fillStyle = 'rgba(10,6,16,0.55)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    const w = 560;
    const h = state.won ? 380 : 340;
    const x = (FIELD.width - w) / 2;
    const y = (FIELD.height - h) / 2;
    panel(x, y, w, h);
    ctx.textAlign = 'center';
    ctx.fillStyle = state.won ? PALETTE.spark : PALETTE.hpBad;
    ctx.font = `bold 46px ${FONT}`;
    ctx.fillText(state.won ? 'THE STORM FALLS' : 'THE STORM WINS', FIELD.width / 2, y + 78);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `16px ${FONT}`;
    ctx.fillText(
      state.won ? 'RAIJU IS FELLED. THE TOWN STILL STANDS.' : 'THE SAMURAI FALLS. THE THUNDER ROLLS ON.',
      FIELD.width / 2, y + 112,
    );
    ctx.fillStyle = PALETTE.text;
    ctx.font = `bold 22px ${FONT}`;
    const timeBonus = state.won ? Math.round(state.timeLeft) * 10 : 0;
    const noHitBonus = state.won && state.noHit ? 1000 : 0;
    ctx.fillText(`DAMAGE DEALT  ${state.damageDealt}`, FIELD.width / 2, y + 168);
    if (state.won) {
      ctx.fillText(`TIME BONUS  +${timeBonus}`, FIELD.width / 2, y + 202);
      if (noHitBonus > 0) ctx.fillText(`UNTOUCHED  +${noHitBonus}`, FIELD.width / 2, y + 236);
    }
    ctx.fillStyle = PALETTE.spark;
    ctx.font = `bold 30px ${FONT}`;
    ctx.fillText(`SCORE  ${state.score}`, FIELD.width / 2, y + (state.won ? 282 : 246));
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `15px ${FONT}`;
    ctx.fillText(`BEST  ${Math.max(best, state.score)}`, FIELD.width / 2, y + (state.won ? 318 : 282));
    ctx.fillStyle = PALETTE.text;
    ctx.font = `bold 18px ${FONT}`;
    ctx.fillText('PRESS ENTER TO FIGHT AGAIN', FIELD.width / 2, y + h - 24);
    ctx.textAlign = 'left';
  }

  // ---------------------------------------------------------- frame
  function render(state, screen, dt, best) {
    updateShake(dt);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#0d0916';
    ctx.fillRect(0, 0, view.width, view.height);
    const shake = shakeOffset();
    ctx.setTransform(view.scale, 0, 0, view.scale, view.ox + shake.x * view.scale, view.oy + shake.y * view.scale);
    ctx.imageSmoothingEnabled = false;
    drawBackground(state.elapsed);
    drawRaiju(state, state.elapsed);
    drawRonin(state, state.elapsed);
    drawSlashArc(state);
    drawBolts(state);
    drawWaves(state);
    drawProjectiles(state);
    drawParticles(state);
    drawNumbers(state);
    // HUD stays still: redraw it without the shake offset.
    ctx.setTransform(view.scale, 0, 0, view.scale, view.ox, view.oy);
    if (screen === 'play' || screen === 'paused') drawHud(state, screen);
    if (screen === 'title') drawTitle(state, best);
    if (screen === 'paused') drawPaused();
    if (screen === 'over') drawEnd(state, best);
  }

  return { render, addTrauma, resize };
}

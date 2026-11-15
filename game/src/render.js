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
    // Dusk sky.
    const sky = ctx.createLinearGradient(0, 0, 0, FIELD.groundY);
    sky.addColorStop(0, PALETTE.skyTop);
    sky.addColorStop(0.55, PALETTE.skyMid);
    sky.addColorStop(0.85, PALETTE.skyLow);
    sky.addColorStop(1, PALETTE.horizon);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, FIELD.width, FIELD.groundY + 2);
    // Low sun, half-sunk behind the town.
    ctx.fillStyle = PALETTE.sun;
    ctx.beginPath();
    ctx.arc(880, 560, 64, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.sunCore;
    ctx.beginPath();
    ctx.arc(880, 560, 44, 0, Math.PI * 2);
    ctx.fill();
    // Mount Fuji, snow-capped.
    ctx.fillStyle = PALETTE.fuji;
    ctx.beginPath();
    ctx.moveTo(60, FIELD.groundY);
    ctx.lineTo(230, 330);
    ctx.lineTo(400, FIELD.groundY);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = PALETTE.fujiSnow;
    ctx.beginPath();
    ctx.moveTo(200, 392);
    ctx.lineTo(230, 330);
    ctx.lineTo(262, 394);
    ctx.lineTo(246, 404);
    ctx.lineTo(230, 388);
    ctx.lineTo(214, 406);
    ctx.closePath();
    ctx.fill();
    // Far town: rooftops and a pagoda, dark against the sunset.
    ctx.fillStyle = PALETTE.townFar;
    const far = [[480, 520, 90, 144], [580, 560, 70, 104], [660, 500, 110, 164], [1060, 540, 80, 124], [1150, 570, 90, 94]];
    for (const [x, y, w, h] of far) ctx.fillRect(x, y, w, h);
    // Pagoda.
    ctx.fillRect(700, 470, 60, 194);
    ctx.fillRect(688, 452, 84, 18);
    ctx.fillRect(692, 500, 76, 12);
    ctx.fillRect(692, 548, 76, 12);
    // Near town, darker, with lit windows.
    ctx.fillStyle = PALETTE.townNear;
    const near = [[0, 600, 130, 64], [150, 620, 110, 44], [1120, 610, 160, 54]];
    for (const [x, y, w, h] of near) ctx.fillRect(x, y, w, h);
    ctx.fillStyle = PALETTE.lantern;
    for (let i = 0; i < 8; i += 1) {
      const wx = 40 + i * 150 + hash(i) * 40;
      const wy = 612 + hash(i + 50) * 20;
      ctx.fillRect(wx, wy, 5, 7);
    }
    // Torii gate, right of centre, framing the duel.
    ctx.fillStyle = PALETTE.toriiDark;
    ctx.fillRect(1010, 470, 14, 194);
    ctx.fillRect(1140, 470, 14, 194);
    ctx.fillStyle = PALETTE.torii;
    ctx.fillRect(990, 452, 184, 16);
    ctx.fillRect(1002, 486, 160, 12);
    ctx.fillRect(1072, 498, 20, 166);
    // Paper lanterns hanging from the torii, flickering.
    const flick = 0.75 + 0.25 * Math.sin(elapsed * 6);
    ctx.globalAlpha = flick;
    drawPixelSpriteAt(ctx, SPRITES.lantern, 1024, 512, 3);
    drawPixelSpriteAt(ctx, SPRITES.lantern, 1128, 512, 3);
    ctx.globalAlpha = 1;
    // Ground.
    ctx.fillStyle = PALETTE.groundTop;
    ctx.fillRect(0, FIELD.groundY, FIELD.width, 6);
    ctx.fillStyle = PALETTE.ground;
    ctx.fillRect(0, FIELD.groundY + 6, FIELD.width, FIELD.height - FIELD.groundY - 6);
    // Drifting embers, deterministic from the clock so screenshots repeat.
    for (let i = 0; i < 42; i += 1) {
      const speed = 12 + hash(i + 200) * 22;
      const rise = 8 + hash(i + 300) * 18;
      const x = (hash(i) * FIELD.width + elapsed * speed) % FIELD.width;
      const y = FIELD.groundY - ((hash(i + 100) * 420 + elapsed * rise) % 460);
      const size = 2 + hash(i + 400) * 2;
      ctx.globalAlpha = 0.35 + 0.45 * hash(i + 500);
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
    // Ronin HP + energy (top-left).
    ctx.fillStyle = PALETTE.text;
    ctx.font = `bold 15px ${FONT}`;
    ctx.fillText('RONIN', 24, 30);
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
    ctx.fillStyle = PALETTE.text;
    ctx.font = `bold 84px ${FONT}`;
    ctx.fillText('RONIN', FIELD.width / 2, 268);
    ctx.fillStyle = PALETTE.lightning;
    ctx.font = `bold 84px ${FONT}`;
    ctx.fillText('VS KAIJU', FIELD.width / 2, 352);
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
      state.won ? 'RAIJU IS FELLED. THE TOWN STILL STANDS.' : 'THE RONIN FALLS. THE THUNDER ROLLS ON.',
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

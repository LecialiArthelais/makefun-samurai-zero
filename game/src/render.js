// The canvas renderer: everything the player sees, and nothing the game
// decides. It draws the Edo dusk (sky, sun, Fuji, town, torii, lanterns,
// drifting embers), the samurai and the kaiju from the pixel sprites, combat
// feedback (slash arcs, lightning, shockwaves, particles, damage numbers),
// the HUD, and the title / select / pause / end screens. Juice lives here
// too: trauma-based screen shake (game-feel) moves only the camera, never
// the simulation. The playfield is a fixed 1280x720 logical area, scaled to
// the window with letterboxing.
import { ARENA_ORDER, ARENAS, DIFFICULTY, DIFFICULTY_ORDER, FIELD, KAIJU_TYPES, MATCH, PALETTE, FONT, RAIJU, RONIN, SAMURAI_VARIANTS, SCORE, SKINS, SKIN_ORDER, SURGE } from './config.js';
import { drawPixelSprite, drawPixelSpriteAt, SPRITES } from './sprites.js';

function hash(n) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

export function createRenderer(canvas, assets) {
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

  // ---------------------------------------------------------- raster art
  // Draw a raster asset centred on (cx, bottomY) at the given height,
  // preserving its aspect ratio. Smoothing is ON for raster art (the pixel
  // sprites keep it off), and the call restores it, so the two styles never
  // leak into each other. `flip` mirrors the image (the art faces right);
  // `tilt` rotates it around its centre, in radians; `alpha` fades it.
  // Returns false when the image is not loaded (the caller falls back).
  function drawRaster(img, cx, bottomY, height, { flip = false, tilt = 0, alpha = 1, filter = '' } = {}) {
    if (!img || !img.naturalWidth) return false;
    const w = (height * img.naturalWidth) / img.naturalHeight;
    ctx.save();
    ctx.globalAlpha = alpha;
    if (filter) ctx.filter = filter;
    ctx.imageSmoothingEnabled = true;
    ctx.translate(cx, bottomY - height / 2);
    if (tilt) ctx.rotate(tilt);
    if (flip) ctx.scale(-1, 1);
    ctx.drawImage(img, -w / 2, -height / 2, w, height);
    ctx.restore();
    ctx.imageSmoothingEnabled = false;
    return true;
  }

  // The raster hero for the picked samurai — the equipped skin when one
  // is worn (ui.save.equipped), else the default art. A skin whose file
  // did not load falls back to the default, never to a blank.
  function skinAssetKey(skinId) {
    return 'skin' + skinId.charAt(0).toUpperCase() + skinId.slice(1);
  }

  function heroImage(state, ui) {
    if (!assets) return null;
    const equipped = ui && ui.save && ui.save.equipped ? ui.save.equipped[state.samurai || 'blue'] : null;
    if (equipped && equipped !== state.samurai && SKINS[equipped]) {
      const img = assets[skinAssetKey(equipped)];
      if (img) return img;
    }
    return state.samurai === 'red' ? assets.samuraiRed : assets.samuraiBlue;
  }

  // The raster HUD portrait for the picked samurai, or null.
  function heroPortrait(state) {
    if (!assets) return null;
    return state.samurai === 'red' ? assets.portraitRed : assets.portraitBlue;
  }

  // ---------------------------------------------------------- background
  // The arena's painted backdrop: the raster painting for the arena when
  // it loaded (Edo dusk, moonlit sea, burning mountain), the Edo painting
  // as a fallback, the old code-drawn dusk when nothing loaded. The
  // ambient particles and the vignette stay code-drawn — alive, moving
  // with the clock, on top of the painting. The ground line never moves:
  // every arena shares the same playfield geometry, so the balance does
  // not move with the scenery.
  function drawBackground(elapsed, arenaId) {
    const arena = ARENAS[arenaId || 'town'] || ARENAS.town;
    const bgImg = (assets && assets[arena.bg]) || (assets && assets.bgEdo);
    if (bgImg) {
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(bgImg, 0, 0, FIELD.width, FIELD.height);
      ctx.imageSmoothingEnabled = false;
    } else {
      // Asset missing: the old code-drawn dusk, as a fallback.
      const sky = ctx.createLinearGradient(0, 0, 0, FIELD.groundY);
      sky.addColorStop(0, PALETTE.skyTop);
      sky.addColorStop(0.38, PALETTE.skyMid);
      sky.addColorStop(0.68, PALETTE.skyLow);
      sky.addColorStop(1, PALETTE.horizon);
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, FIELD.width, FIELD.groundY + 2);
      ctx.fillStyle = PALETTE.ground;
      ctx.fillRect(0, FIELD.groundY, FIELD.width, FIELD.height - FIELD.groundY);
    }
    if (arena.id === 'sea') {
      // Moonlit sea: the raster background already carries its moon, so
      // the ambient layer adds only shimmer on the water and spray
      // rising from the waves — never a second moon.
      for (let i = 0; i < 5; i += 1) {
        const wob = Math.sin(elapsed * 0.7 + i * 1.7) * 18;
        ctx.globalAlpha = 0.16;
        ctx.fillStyle = '#bfe6ff';
        ctx.fillRect(880 + wob, 560 + i * 16, 260, 3);
      }
      ctx.globalAlpha = 1;
      for (let i = 0; i < 40; i += 1) {
        const speed = 10 + hash(i + 200) * 18;
        const rise = 14 + hash(i + 300) * 22;
        const x = (hash(i) * FIELD.width + elapsed * speed) % FIELD.width;
        const y = FIELD.groundY - ((hash(i + 100) * 300 + elapsed * rise) % 340);
        const size = 2 + hash(i + 400) * 2;
        ctx.globalAlpha = 0.3 + 0.4 * hash(i + 500);
        ctx.fillStyle = '#bfe6ff';
        ctx.fillRect(x, y, size, size);
      }
      ctx.globalAlpha = 1;
    } else if (arena.id === 'mountain') {
      // Burning mountain: ash falling slow, and the lava's glow low on
      // the slope — deterministic from the clock.
      const glow = ctx.createRadialGradient(640, 520, 40, 640, 520, 420);
      glow.addColorStop(0, 'rgba(255,122,42,0.20)');
      glow.addColorStop(1, 'rgba(255,122,42,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, FIELD.width, FIELD.height);
      for (let i = 0; i < 48; i += 1) {
        const fall = 6 + hash(i + 200) * 12;
        const drift = (hash(i + 300) - 0.5) * 14;
        const x = (hash(i) * FIELD.width + elapsed * drift + 1280) % FIELD.width;
        const y = (hash(i + 100) * 420 + elapsed * fall) % 460;
        const size = 2 + hash(i + 400) * 3;
        ctx.globalAlpha = 0.3 + 0.4 * hash(i + 500);
        ctx.fillStyle = hash(i + 600) > 0.5 ? '#ff9a3d' : '#8a7a72';
        ctx.fillRect(x, y, size, size);
      }
      ctx.globalAlpha = 1;
    } else {
      // Burning town: drifting embers and glowing sparks, as before.
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
    // Cinematic vignette: the edges darken, pulling the eye to the duel.
    const vig = ctx.createRadialGradient(640, 360, 260, 640, 360, 760);
    vig.addColorStop(0, 'rgba(10,6,16,0)');
    vig.addColorStop(1, 'rgba(10,6,16,0.42)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  }

  // ---------------------------------------------------------- actors
  function roninFrame(state) {
    const r = state.ronin;
    const set = SPRITES.samurai[state.samurai || 'blue'] || SPRITES.samurai.blue;
    if (r.pose === 'hurt') return set.hurt;
    if (r.pose === 'slash') return set.slash;
    if (r.pose === 'heavy') return set.heavy;
    if (r.pose === 'jump') return set.jump;
    if (r.pose === 'run') {
      const frame = Math.floor(r.animTime * 10) % 2;
      return set.run[frame];
    }
    const frame = Math.floor(r.animTime * 2) % 2;
    return set.idle[frame];
  }

  function drawRonin(state, elapsed, ui) {
    const r = state.ronin;
    // Invulnerability: the ronin goes ghostly, never invisible — the hero
    // must always read, even in a screenshot.
    const ghost = r.invulnerable > 0 && Math.floor(elapsed * 14) % 2 === 0;
    // Slash lunge: the hero drives forward into the cut, strongest at the
    // start of the swing, easing back as the pose ends.
    let lunge = 0;
    if (r.pose === 'slash' || r.pose === 'heavy') {
      const dur = r.pose === 'heavy' ? 0.32 : 0.18;
      lunge = r.facing * 14 * Math.max(0, Math.min(1, r.poseTime / dur));
    }
    const hx = r.x + lunge;
    const img = heroImage(state, ui);
    if (img) {
      // One static raster portrait, so the pose reads through motion: a
      // gentle idle breath (up-down bob plus a faint sway), a forward lean
      // while running, a deep lean into the slash and the heavy iaido draw,
      // and a white-hot flash when hurt. The hero is never frozen — even
      // standing still, he breathes.
      let bob = Math.sin(elapsed * 2) * 3;
      let tilt = Math.sin(elapsed * 2 + 0.5) * 0.015;
      let filter = '';
      if (r.pose === 'run') {
        tilt = 0.08 * r.facing;
        bob = Math.sin(elapsed * 14) * 3;
      } else if (r.pose === 'slash') tilt = 0.16 * r.facing;
      else if (r.pose === 'heavy') tilt = 0.22 * r.facing;
      else if (r.pose === 'hurt') filter = 'brightness(1.7) saturate(0.6)';
      drawRaster(img, hx, r.y + bob, 210, {
        flip: r.facing < 0,
        tilt,
        alpha: ghost ? 0.45 : 1,
        filter,
      });
    } else {
      // Asset missing: the code-drawn pixel sprite, as before.
      const scale = 4;
      ctx.save();
      if (ghost) ctx.globalAlpha = 0.45;
      if (r.facing < 0) {
        ctx.translate(hx, 0);
        ctx.scale(-1, 1);
        ctx.translate(-hx, 0);
      }
      drawPixelSprite(ctx, roninFrame(state), hx, r.y, scale);
      ctx.restore();
    }
    // Shadow.
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(r.x - 52, FIELD.groundY - 2, 104, 5);
  }

  function drawRaiju(state, elapsed) {
    const k = state.raiju;
    if (state.over && state.won) return; // felled: the storm is gone.
    // The beast rears (lifts) during the telegraph and drops on the stomp.
    const rear = k.headRear * 28;
    const drop = k.bodyDrop * 18;
    // Idle life: the kaiju breathes. A slow up-down bob plus a faint sway,
    // so it never stands frozen — the beast is alive even while it waits.
    // The sway is small (a degree of tilt) and the bob is slow, so the
    // silhouette stays clean and readable. In a surge round the breath
    // quickens — the beast is hunting, and the round is deciding.
    const breathing = k.state === 'idle' || k.state === 'recover';
    const bobRate = state.surge ? 3.4 : 1.8;
    const bob = breathing ? Math.sin(elapsed * bobRate) * 4 : Math.sin(elapsed * 2.2) * 3;
    const sway = breathing ? Math.sin(elapsed * 1.8 + 0.6) * 0.02 : 0;
    const bottomY = FIELD.groundY + drop - rear + bob;
    // The raster kaiju when it loaded, the code-drawn pixel sprite
    // otherwise. The raster is drawn much taller than the hero (it is a
    // boss); the pixel sprite keeps its old 280x200 frame.
    const kaijuKey = { fire: 'kaijuFire', sea: 'kaijuSea', dragon: 'kaijuDragon' }[state.kaiju || 'fire'];
    const kaijuImg = assets && assets[kaijuKey];
    if (kaijuImg) {
      drawRaster(kaijuImg, k.x, bottomY, 320, {
        tilt: sway,
        filter: k.flash > 0 ? 'brightness(1.7) saturate(0.6)' : '',
      });
    } else {
      const s = 5;
      const set = SPRITES.raiju[state.kaiju || 'fire'] || SPRITES.raiju.fire;
      const frame = (k.state === 'telegraph' && (k.attack === 'swipe' || k.attack === 'leap')) || k.state === 'recover'
        ? set.open
        : set.closed;
      ctx.save();
      if (k.flash > 0) ctx.filter = 'brightness(1.7) saturate(0.6)';
      drawPixelSprite(ctx, frame, k.x, bottomY, s);
      ctx.restore();
    }
    // Shadow.
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(k.x - 112, FIELD.groundY - 2, 224, 6);
    // Surge: the ground under the kaiju cracks and glows — a temporary
    // event effect for the deciding round, never part of the character art.
    if (state.surge) {
      const fx = KAIJU_TYPES[state.kaiju || 'fire'];
      ctx.save();
      ctx.globalAlpha = 0.7 + 0.2 * Math.sin(elapsed * 6);
      ctx.strokeStyle = fx.eye;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(k.x - 110, FIELD.groundY + 2);
      ctx.lineTo(k.x - 40, FIELD.groundY + 10);
      ctx.lineTo(k.x + 10, FIELD.groundY + 4);
      ctx.lineTo(k.x + 90, FIELD.groundY + 12);
      ctx.moveTo(k.x - 40, FIELD.groundY + 10);
      ctx.lineTo(k.x - 60, FIELD.groundY + 22);
      ctx.lineTo(k.x - 10, FIELD.groundY + 28);
      ctx.moveTo(k.x + 10, FIELD.groundY + 4);
      ctx.lineTo(k.x + 50, FIELD.groundY + 20);
      ctx.stroke();
      ctx.restore();
    }
  }

  // ---------------------------------------------------------- effects
  function drawSlashArc(state) {
    const r = state.ronin;
    if (r.pose !== 'slash' && r.pose !== 'heavy') return;
    const heavy = r.pose === 'heavy';
    const reach = heavy ? 140 : 100;
    const cx = r.x + r.facing * (reach * 0.55);
    const cy = r.y - 88;
    const progress = 1 - r.poseTime / (heavy ? 0.32 : 0.18);
    const alpha = 0.9 * (1 - progress * 0.6);
    // The raster effects: the blue slash arc for a katana slash, the
    // lightning bolt for the heavy iaido draw (a lightning-charged strike).
    if (assets) {
      if (heavy && assets.fxLightning) {
        drawRaster(assets.fxLightning, cx, cy + 56, 113, {
          flip: r.facing < 0,
          tilt: -0.25 * r.facing,
          alpha,
        });
        return;
      }
      if (!heavy && assets.fxSlash) {
        drawRaster(assets.fxSlash, cx, cy + 62, 124, {
          flip: r.facing < 0,
          alpha,
        });
        return;
      }
    }
    // Asset missing: the code-drawn arc, as before.
    const startAngle = -Math.PI * 0.7;
    const endAngle = Math.PI * 0.15;
    const angle = startAngle + (endAngle - startAngle) * progress;
    const fx = SAMURAI_VARIANTS[state.samurai || 'blue'];
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = heavy ? fx.slashCore : fx.slash;
    ctx.lineWidth = heavy ? 7 : 5;
    ctx.beginPath();
    ctx.arc(cx, cy, reach, startAngle, angle);
    ctx.stroke();
    ctx.strokeStyle = fx.slash;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, reach - 12, startAngle, angle);
    ctx.stroke();
    ctx.restore();
  }

  // The dash ghost: speed lines and a blurred silhouette, drawn behind the
  // hero while the dash is active. The raster silhouette sits slightly
  // ahead of the hero, in the dash direction.
  function drawDash(state) {
    const r = state.ronin;
    if (r.dashTimer <= 0 || !assets || !assets.fxDash) return;
    drawRaster(assets.fxDash, r.x + r.facing * 30, r.y - 10, 146, {
      flip: r.facing < 0,
      alpha: 0.9,
    });
  }

  function drawBolts(state) {
    const fx = KAIJU_TYPES[state.kaiju || 'fire'];
    for (const b of state.bolts) {
      if (!b.active) continue;
      if (b.phase === 'mark') {
        // Telegraph: a pulsing danger zone with chevrons.
        const pulse = 0.5 + 0.4 * Math.sin(state.elapsed * 14);
        ctx.globalAlpha = 0.25 + pulse * 0.35;
        ctx.fillStyle = fx.bolt;
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
        ctx.strokeStyle = fx.bolt;
        ctx.lineWidth = 6;
        ctx.beginPath();
        let px = b.x;
        ctx.moveTo(px, 0);
        for (let i = 1; i <= segments; i += 1) {
          px = b.x + (hash(b.x + i * 7) - 0.5) * 44;
          ctx.lineTo(px, (i / segments) * FIELD.groundY);
        }
        ctx.stroke();
        ctx.strokeStyle = fx.boltCore;
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
        ctx.fillStyle = fx.bolt;
        ctx.globalAlpha = 0.25;
        ctx.fillRect(b.x - b.width / 2, FIELD.groundY - 8, b.width, 8);
        ctx.globalAlpha = 1;
      }
    }
  }

  function drawWaves(state) {
    const fx = KAIJU_TYPES[state.kaiju || 'fire'];
    for (const w of state.waves) {
      if (!w.active) continue;
      ctx.fillStyle = fx.wave;
      ctx.beginPath();
      ctx.ellipse(w.x, FIELD.groundY - 10, w.width / 2, 26, 0, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = fx.waveTop;
      ctx.beginPath();
      ctx.ellipse(w.x, FIELD.groundY - 22, w.width / 4, 10, 0, Math.PI, 0);
      ctx.fill();
    }
  }

  function drawProjectiles(state) {
    for (const p of state.projectiles) {
      if (!p.active) continue;
      // The samurai's special: a fireball, head-first in its travel
      // direction. The raster head sits on the right, so it flips when the
      // projectile flies left.
      if (assets && assets.fxFireball) {
        drawRaster(assets.fxFireball, p.x, p.y + 40, 140, {
          flip: p.dir < 0,
          alpha: 0.95,
        });
        continue;
      }
      // Asset missing: the code-drawn blade of light, as before.
      const fx = SAMURAI_VARIANTS[state.samurai || 'blue'];
      ctx.save();
      ctx.globalAlpha = 0.95;
      ctx.fillStyle = fx.specialCore;
      ctx.beginPath();
      ctx.moveTo(p.x - p.dir * 40, p.y - 70);
      ctx.lineTo(p.x + p.dir * 40, p.y - 40);
      ctx.lineTo(p.x + p.dir * 40, p.y + 40);
      ctx.lineTo(p.x - p.dir * 40, p.y + 70);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = fx.special;
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
  // Damage ghosts: the pale segment a Tekken-style bar leaves behind
  // after a hit, shrinking back to the true HP after a short hold.
  // Kept in the renderer closure — a new round snaps them back to full.
  let ghostRonin = 1;
  let ghostKaiju = 1;
  let ghostRoninAt = -10;
  let ghostKaijuAt = -10;
  let lastRRatio = 1;
  let lastKRatio = 1;

  function roundRectPath(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }

  function diamondPath(cx, cy, r) {
    ctx.beginPath();
    ctx.moveTo(cx, cy - r);
    ctx.lineTo(cx + r, cy);
    ctx.lineTo(cx, cy + r);
    ctx.lineTo(cx - r, cy);
    ctx.closePath();
  }

  // A Tekken-style slanted HP bar: a parallelogram from the outer end
  // (xOuter, yOuter, by the portrait) to the inner end (xInner, yInner,
  // toward the timer), height h. The fill hugs the outer end and drains
  // from the inner end; the pale ghost trails behind it. Segment lines
  // every 25% of max HP. `gradStops` are [offset, color] pairs for the
  // fill gradient, running outer -> inner. When lowHp, the border
  // pulses red with the given pulse alpha.
  function drawSlantedBar(xOuter, yOuter, xInner, yInner, h, ratio, ghost, maxHp, gradStops, lowHp, pulse) {
    const len = Math.abs(xInner - xOuter);
    const dir = xInner > xOuter ? 1 : -1;
    const top = Math.min(yOuter, yInner);
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(xOuter, yOuter);
    ctx.lineTo(xInner, yInner);
    ctx.lineTo(xInner, yInner + h);
    ctx.lineTo(xOuter, yOuter + h);
    ctx.closePath();
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fill();
    ctx.clip();
    // Ghost: pale segment between the true edge and the ghost edge.
    // It anchors at the outer end (portrait side) in both orientations,
    // so it trails behind the fill on the mirrored (kaiju) bar too.
    if (ghost > ratio + 0.005) {
      ctx.fillStyle = 'rgba(255,240,180,0.9)';
      const a = xOuter + dir * len * ratio;
      const b = xOuter + dir * len * Math.min(1, ghost);
      ctx.fillRect(Math.min(a, b), top - 4, Math.abs(b - a) + 1, h + 8);
    }
    // Fill: gradient anchored at the outer end.
    const grad = ctx.createLinearGradient(xOuter, 0, xInner, 0);
    for (const [off, color] of gradStops) grad.addColorStop(off, color);
    ctx.fillStyle = grad;
    if (dir > 0) ctx.fillRect(xOuter, top - 4, Math.max(0, len * ratio), h + 8);
    else ctx.fillRect(xInner + len * (1 - ratio), top - 4, Math.max(0, len * ratio), h + 8);
    // Segment lines every 25% of max HP, measured from the outer end.
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    for (const f of [0.25, 0.5, 0.75]) {
      const sx = xOuter + dir * len * f;
      ctx.fillRect(sx - 0.5, top - 2, 1, h + 4);
    }
    ctx.restore();
    // Border: dark, or pulsing red under 25% HP.
    ctx.beginPath();
    ctx.moveTo(xOuter, yOuter);
    ctx.lineTo(xInner, yInner);
    ctx.lineTo(xInner, yInner + h);
    ctx.lineTo(xOuter, yOuter + h);
    ctx.closePath();
    ctx.strokeStyle = lowHp ? `rgba(224,82,67,${pulse})` : 'rgba(0,0,0,0.65)';
    ctx.lineWidth = lowHp ? 3 : 2;
    ctx.stroke();
    ctx.lineWidth = 1;
  }

  function drawHud(state, screen, dt, ui) {
    const r = state.ronin;
    const k = state.raiju;
    const sam = SAMURAI_VARIANTS[state.samurai || 'blue'];
    const kai = KAIJU_TYPES[state.kaiju || 'fire'];
    const diff = DIFFICULTY[state.difficulty] || DIFFICULTY.medium;
    const maxHp = diff.roninHp;
    const maxKaijuHp = diff.raijuHp;
    const coins = ui && ui.save ? ui.save.coins : 0;
    // Tekken-style plates: 460 px slanted bars, portrait at the outer
    // corner, draining from the inner end toward the timer.
    const BAR_LEN = 460;
    const BAR_H = 20;
    const SLANT = 12;
    // Damage ghosts: hold 0.35 s after a hit, then shrink to the true HP.
    const rRatio = Math.max(0, Math.min(1, r.hp / maxHp));
    const kRatio = Math.max(0, Math.min(1, k.hp / maxKaijuHp));
    if (rRatio < lastRRatio) ghostRoninAt = state.elapsed;
    if (kRatio < lastKRatio) ghostKaijuAt = state.elapsed;
    if (rRatio > ghostRonin) ghostRonin = rRatio;
    if (kRatio > ghostKaiju) ghostKaiju = kRatio;
    if (state.elapsed - ghostRoninAt > 0.35) ghostRonin = Math.max(rRatio, ghostRonin - (dt || 0) * 0.3);
    if (state.elapsed - ghostKaijuAt > 0.35) ghostKaiju = Math.max(kRatio, ghostKaiju - (dt || 0) * 0.3);
    lastRRatio = rRatio;
    lastKRatio = kRatio;
    const lowPulse = 0.55 + 0.45 * Math.sin(state.elapsed * 9);
    const surgePulse = 0.55 + 0.45 * Math.sin(state.elapsed * 6);
    // ---- Player plate (left). Portrait in a slanted frame at the outer
    // corner; the raster portrait when it loaded, the code-drawn one
    // otherwise.
    const portrait = heroPortrait(state);
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(14, 12);
    ctx.lineTo(78, 20);
    ctx.lineTo(78, 76);
    ctx.lineTo(14, 68);
    ctx.closePath();
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fill();
    ctx.clip();
    if (portrait) ctx.drawImage(portrait, 14, 12, 64, 64);
    ctx.restore();
    if (!portrait) drawPixelSpriteAt(ctx, SPRITES.portraits.hero, 24, 12, 3);
    ctx.beginPath();
    ctx.moveTo(14, 12);
    ctx.lineTo(78, 20);
    ctx.lineTo(78, 76);
    ctx.lineTo(14, 68);
    ctx.closePath();
    ctx.strokeStyle = PALETTE.panelEdge;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.lineWidth = 1;
    drawSlantedBar(88, 20, 88 + BAR_LEN, 20 + SLANT, BAR_H, rRatio, ghostRonin, maxHp,
      [[0, PALETTE.sunCore], [0.5, PALETTE.spark], [1, PALETTE.horizon]], rRatio < 0.25, lowPulse);
    ctx.font = `13px ${FONT}`;
    ctx.fillStyle = rRatio < 0.25 ? PALETTE.hpBad : PALETTE.text;
    ctx.textAlign = 'right';
    ctx.fillText(`${Math.max(0, Math.ceil(r.hp))} / ${maxHp}`, 548, 68);
    ctx.textAlign = 'left';
    // Big name + style tag + samurai-colour accent line.
    ctx.fillStyle = PALETTE.text;
    ctx.font = `bold 26px ${FONT}`;
    ctx.fillText(sam.name, 88, 96);
    ctx.font = `11px ${FONT}`;
    ctx.fillStyle = PALETTE.muted;
    ctx.fillText(sam.style.split(' ')[0], 88, 114);
    ctx.fillStyle = state.samurai === 'red' ? PALETTE.fire : PALETTE.energy;
    ctx.fillRect(88, 120, 120, 2);
    // EMBER meter: thin bar + energy-cell pips.
    ctx.font = `11px ${FONT}`;
    ctx.fillStyle = PALETTE.muted;
    ctx.fillText(state.samurai === 'red' ? 'EMBER' : 'MOONLIGHT', 88, 140);
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(170, 132, 140, 6);
    ctx.fillStyle = PALETTE.energy;
    ctx.fillRect(170, 132, Math.max(0, 140 * r.energy / RONIN.maxCells), 6);
    for (let i = 0; i < RONIN.maxCells; i += 1) {
      ctx.fillStyle = i < r.energy ? PALETTE.energy : 'rgba(126,200,255,0.25)';
      ctx.beginPath();
      ctx.arc(326 + i * 18, 135, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    // Timer in an enso brush-ring, score + coins under it, round-win
    // diamonds flanking the ring, round + match format under that.
    const t = Math.max(0, Math.ceil(state.timeLeft));
    const mm = String(Math.floor(t / 60));
    const ss = String(t % 60).padStart(2, '0');
    const ringX = FIELD.width / 2;
    const ringY = 40;
    const ringR = 32;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = PALETTE.spark;
    ctx.globalAlpha = state.surge ? 0.65 + 0.35 * Math.sin(state.elapsed * 3) : 0.9;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(ringX, ringY, ringR, Math.PI * 0.15, Math.PI * 1.85);
    ctx.stroke();
    ctx.globalAlpha = 0.45;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(ringX, ringY, ringR - 6, Math.PI * 0.3, Math.PI * 1.7);
    ctx.stroke();
    ctx.restore();
    if (state.surge) {
      ctx.save();
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#ff5a2a';
      ctx.globalAlpha = 0.35 + 0.35 * Math.sin(state.elapsed * 3);
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(ringX, ringY, ringR, Math.PI * 0.15, Math.PI * 1.85);
      ctx.stroke();
      ctx.restore();
    }
    ctx.textAlign = 'center';
    ctx.font = `bold 26px ${FONT}`;
    ctx.fillStyle = t <= 30 ? PALETTE.hpBad : PALETTE.text;
    ctx.fillText(`${mm}:${ss}`, ringX, ringY + 9);
    ctx.font = `bold 14px ${FONT}`;
    ctx.fillStyle = PALETTE.text;
    ctx.fillText(`SCORE ${state.score}`, ringX, 90);
    // Coins pill under the score.
    roundRectPath(ringX - 62, 98, 124, 18, 9);
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fill();
    ctx.strokeStyle = PALETTE.spark;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.font = `bold 12px ${FONT}`;
    ctx.fillStyle = PALETTE.spark;
    ctx.fillText(`COINS ${coins.toLocaleString('en-US')}`, ringX, 111);
    // Round + match format, one line.
    ctx.font = `12px ${FONT}`;
    ctx.fillStyle = PALETTE.muted;
    ctx.fillText(`ROUND ${state.round}  •  BEST OF ${state.winsNeeded === 2 ? 3 : 5}`, ringX, 134);
    // Round-win diamonds flanking the ring (Bo3: 2 per side; Bo5: 3).
    for (let i = 0; i < state.winsNeeded; i += 1) {
      const off = (i - (state.winsNeeded - 1) / 2) * 20;
      diamondPath(ringX - 62 + off, ringY, 7);
      if (i < state.roundWins.ronin) { ctx.fillStyle = PALETTE.spark; ctx.fill(); }
      else {
        ctx.fillStyle = 'rgba(243,234,216,0.12)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(243,234,216,0.35)';
        ctx.stroke();
      }
      diamondPath(ringX + 62 + off, ringY, 7);
      if (i < state.roundWins.raiju) { ctx.fillStyle = kai.aura; ctx.fill(); }
      else {
        ctx.fillStyle = 'rgba(243,234,216,0.12)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(243,234,216,0.35)';
        ctx.stroke();
      }
    }
    // Combo: consecutive hits within the window raise the score multiplier.
    // Shown once the chain is worth noticing, with the time left to keep it.
    if (state.combo >= 2) {
      const mult = 1 + Math.min(Math.floor(state.combo / SCORE.comboStep), SCORE.comboMax - 1);
      ctx.font = `bold 16px ${FONT}`;
      ctx.fillStyle = mult >= SCORE.comboMax ? PALETTE.spark : PALETTE.text;
      ctx.fillText(`COMBO x${state.combo}  (x${mult})`, ringX, 168);
      const barW = 120;
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.fillRect(ringX - barW / 2, 176, barW, 4);
      ctx.fillStyle = PALETTE.spark;
      ctx.fillRect(ringX - barW / 2, 176, barW * Math.max(0, state.comboTimer / SCORE.comboWindow), 4);
    }
    ctx.textAlign = 'left';
    // ---- Kaiju plate (right, mirrored). Portrait is a crop of the kaiju
    // sprite — no new asset. The raster kaiju when it loaded, the
    // code-drawn portrait otherwise.
    const kaijuKey = { fire: 'kaijuFire', sea: 'kaijuSea', dragon: 'kaijuDragon' }[state.kaiju || 'fire'];
    const kaijuImg = assets && assets[kaijuKey];
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(1266, 12);
    ctx.lineTo(1202, 20);
    ctx.lineTo(1202, 76);
    ctx.lineTo(1266, 68);
    ctx.closePath();
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fill();
    ctx.clip();
    if (kaijuImg) ctx.drawImage(kaijuImg, kaijuImg.width * 0.15, 0, kaijuImg.width * 0.7, kaijuImg.height * 0.5, 1202, 12, 64, 64);
    ctx.restore();
    if (!kaijuImg) {
      const kaiPortrait = SPRITES.portraits.kaiju[state.kaiju || 'fire'] || SPRITES.portraits.kaiju.fire;
      drawPixelSpriteAt(ctx, kaiPortrait, FIELD.width - 72, 12, 3);
    }
    ctx.beginPath();
    ctx.moveTo(1266, 12);
    ctx.lineTo(1202, 20);
    ctx.lineTo(1202, 76);
    ctx.lineTo(1266, 68);
    ctx.closePath();
    ctx.strokeStyle = state.surge ? `rgba(255,90,42,${surgePulse})` : PALETTE.panelEdge;
    ctx.lineWidth = state.surge ? 3 : 2;
    ctx.stroke();
    ctx.lineWidth = 1;
    drawSlantedBar(1192, 20, 1192 - BAR_LEN, 20 + SLANT, BAR_H, kRatio, ghostKaiju, maxKaijuHp,
      [[0, PALETTE.sunCore], [0.5, PALETTE.spark], [1, kai.aura]], kRatio < 0.25, lowPulse);
    // SURGE marker: pulsing frame + tag on the kaiju bar + the timer
    // ring above already blinks — the player always sees the stakes.
    if (state.surge) {
      ctx.beginPath();
      ctx.moveTo(1192, 20);
      ctx.lineTo(732, 32);
      ctx.lineTo(732, 52);
      ctx.lineTo(1192, 40);
      ctx.closePath();
      ctx.strokeStyle = `rgba(255,90,42,${surgePulse})`;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.lineWidth = 1;
      roundRectPath(700, 56, 118, 20, 9);
      ctx.fillStyle = 'rgba(192,57,43,0.95)';
      ctx.fill();
      ctx.font = `bold 12px ${FONT}`;
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText('SURGE +20%', 759, 70);
      ctx.textAlign = 'left';
    }
    ctx.textAlign = 'right';
    ctx.font = `bold 24px ${FONT}`;
    ctx.fillStyle = PALETTE.text;
    ctx.fillText(`${kai.name} — ${kai.title.toUpperCase()}`, 1192, 102);
    // Phase pips: three dots, filled for phases already passed.
    ctx.font = `12px ${FONT}`;
    const phaseText = `PHASE ${k.phase} / 3`;
    const phaseW = ctx.measureText(phaseText).width;
    for (let i = 0; i < 3; i += 1) {
      ctx.fillStyle = i < k.phase - 1 ? PALETTE.spark : 'rgba(243,234,216,0.25)';
      ctx.beginPath();
      ctx.arc(1192 - phaseW - 16 - (2 - i) * 18, 116, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = PALETTE.muted;
    ctx.fillText(phaseText, 1192, 120);
    // Difficulty, small, under the kaiju phase — the player always knows
    // which storm they picked.
    ctx.fillText(diff.name, 1192, 138);
    ctx.textAlign = 'left';
    // Control hints, early in the fight: small muted pills that fade out.
    if (screen === 'play' && state.elapsed < 6) {
      const fade = state.elapsed < 4 ? 0.85 : Math.max(0, 0.85 * (6 - state.elapsed) / 2);
      if (fade > 0.01) {
        const hints = [['A / D', 'MOVE'], ['SPACE', 'JUMP'], ['J', 'SLASH'], ['K', 'HEAVY'], ['L', 'FIREBALL'], ['SHIFT', 'DASH']];
        ctx.save();
        ctx.globalAlpha = fade;
        ctx.font = `bold 12px ${FONT}`;
        const widths = hints.map(([key, act]) => ctx.measureText(key).width + 6 + ctx.measureText(act).width);
        const gap = 10;
        const pad = 9;
        const total = widths.reduce((a, b) => a + b, 0) + pad * 2 * hints.length + gap * (hints.length - 1);
        let hx = FIELD.width / 2 - total / 2;
        const hy = FIELD.height - 30;
        for (let i = 0; i < hints.length; i += 1) {
          const [key, act] = hints[i];
          const w = widths[i] + pad * 2;
          roundRectPath(hx, hy, w, 20, 9);
          ctx.fillStyle = 'rgba(10,6,16,0.6)';
          ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,0.15)';
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.fillStyle = PALETTE.text;
          ctx.font = `bold 12px ${FONT}`;
          ctx.textAlign = 'left';
          ctx.fillText(key, hx + pad, hy + 14);
          ctx.fillStyle = PALETTE.muted;
          ctx.font = `11px ${FONT}`;
          ctx.fillText(act, hx + pad + ctx.measureText(key).width + 6, hy + 14);
          hx += w + gap;
        }
        ctx.restore();
      }
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

  function drawTitle(state, best, ui) {
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
    ctx.fillText('CHOOSE YOUR BLADE. CHOOSE YOUR STORM.', FIELD.width / 2, 396);
    ctx.fillText('THREE MINUTES. THREE PHASES. ONE BLADE.', FIELD.width / 2, 422);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `bold 20px ${FONT}`;
    ctx.fillText('PRESS ENTER TO FIGHT', FIELD.width / 2, 492);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `15px ${FONT}`;
    ctx.fillText('A/D MOVE    SPACE JUMP    J SLASH    K HEAVY    L FIREBALL    SHIFT DASH    ESC PAUSE', FIELD.width / 2, 544);
    if (best > 0) {
      ctx.fillStyle = PALETTE.spark;
      ctx.fillText(`BEST SCORE ${best}`, FIELD.width / 2, 580);
    }
    const coins = ui && ui.save ? ui.save.coins : 0;
    ctx.fillStyle = PALETTE.spark;
    ctx.font = `bold 16px ${FONT}`;
    ctx.fillText(`COINS ${coins}    —    PRESS S FOR SKIN SHOP`, FIELD.width / 2, 612);
    ctx.textAlign = 'left';
  }

  // The round-intro card: "ROUND 2" for an ordinary round, the KAIJU
  // SURGE banner for a deciding round — with the edge lightning and the
  // roar's shake behind it. The duelists breathe behind the card.
  function drawRoundIntro(state, ui) {
    const intro = (ui && ui.intro) || {};
    ctx.fillStyle = 'rgba(10,6,16,0.5)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.textAlign = 'center';
    if (intro.surge) {
      const kai = KAIJU_TYPES[state.kaiju || 'fire'];
      ctx.fillStyle = PALETTE.spark;
      ctx.font = `bold 26px ${FONT}`;
      ctx.fillText('MATCH POINT', FIELD.width / 2, 250);
      ctx.fillStyle = kai.eye;
      ctx.shadowColor = kai.eye;
      ctx.shadowBlur = 30;
      ctx.font = `bold 64px ${FONT}`;
      ctx.fillText(SURGE.bannerText, FIELD.width / 2, 340);
      ctx.shadowBlur = 0;
      ctx.fillStyle = PALETTE.text;
      ctx.font = `18px ${FONT}`;
      ctx.fillText(SURGE.subText, FIELD.width / 2, 380);
      // Edge lightning: jagged lines down both frame edges — an event
      // effect, never part of the character art.
      ctx.strokeStyle = kai.eye;
      ctx.lineWidth = 3;
      ctx.globalAlpha = 0.8;
      for (let side = 0; side < 2; side += 1) {
        const x0 = side === 0 ? 24 : FIELD.width - 24;
        ctx.beginPath();
        ctx.moveTo(x0, 120);
        for (let i = 1; i <= 6; i += 1) {
          ctx.lineTo(x0 + (hash(i + side * 10) - 0.5) * 36, 120 + i * 80);
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    } else {
      ctx.fillStyle = PALETTE.sunCore;
      ctx.font = `bold 56px ${FONT}`;
      ctx.fillText(intro.draw ? 'DRAW — ROUND REPLAYED' : `ROUND ${state.round}`, FIELD.width / 2, 320);
      ctx.fillStyle = PALETTE.muted;
      ctx.font = `18px ${FONT}`;
      const wins = state.roundWins || { ronin: 0, raiju: 0 };
      ctx.fillText(`BEST OF ${state.matchLength}  —  ${wins.ronin} : ${wins.raiju}`, FIELD.width / 2, 360);
    }
    ctx.textAlign = 'left';
  }

  function drawSelect(state, selection, kaijuSel, diffSel, ui) {
    ctx.fillStyle = 'rgba(10,6,16,0.45)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.textAlign = 'center';
    // Coins, top-right — the player always sees the wallet.
    const coins = ui && ui.save ? ui.save.coins : 0;
    ctx.fillStyle = PALETTE.spark;
    ctx.font = `bold 16px ${FONT}`;
    ctx.textAlign = 'right';
    ctx.fillText(`COINS ${coins}`, FIELD.width - 24, 30);
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.sunCore;
    ctx.font = `bold 40px ${FONT}`;
    ctx.fillText('SAMURAI ZERO', FIELD.width / 2, 64);
    // --- Samurai: two cards, A/D to choose.
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `15px ${FONT}`;
    ctx.fillText('CHOOSE YOUR SAMURAI  —  A / D', FIELD.width / 2, 92);
    const cards = [
      { id: 'blue', x: 340, variant: SAMURAI_VARIANTS.blue },
      { id: 'red', x: 940, variant: SAMURAI_VARIANTS.red },
    ];
    for (const card of cards) {
      const selected = selection === card.id;
      const cx = card.x;
      // Card panel.
      ctx.fillStyle = selected ? 'rgba(60,40,80,0.92)' : 'rgba(20,14,28,0.88)';
      ctx.fillRect(cx - 190, 104, 380, 200);
      ctx.strokeStyle = selected ? card.variant.slash : PALETTE.panelEdge;
      ctx.lineWidth = selected ? 3 : 1;
      ctx.strokeRect(cx - 190, 104, 380, 200);
      ctx.lineWidth = 1;
      // The samurai, wearing the equipped skin when one is worn.
      const equipped = ui && ui.save && ui.save.equipped ? ui.save.equipped[card.id] : null;
      let img = null;
      if (equipped && equipped !== card.id && SKINS[equipped]) img = assets ? assets[skinAssetKey(equipped)] : null;
      if (!img) img = assets && (card.id === 'red' ? assets.samuraiRed : assets.samuraiBlue);
      if (img) drawRaster(img, cx, 240, 125);
      else {
        const set = SPRITES.samurai[card.id];
        drawPixelSprite(ctx, set.idle[0], cx, 240, 4);
      }
      // Name + tagline + fighting style (Hayate swift, Enjin mighty).
      // The selected card's name carries a ▶ marker — no separate line,
      // so nothing overlaps the card's bottom edge.
      ctx.fillStyle = PALETTE.text;
      ctx.font = `bold 22px ${FONT}`;
      ctx.fillText(selected ? `▶ ${card.variant.title.toUpperCase()}` : card.variant.title.toUpperCase(), cx, 268);
      ctx.fillStyle = PALETTE.muted;
      ctx.font = `13px ${FONT}`;
      ctx.fillText(card.variant.tagline, cx, 288);
      ctx.fillStyle = card.variant.slash;
      ctx.font = `bold 12px ${FONT}`;
      ctx.fillText(card.variant.style, cx, 302);
    }
    // --- Kaiju: three cards with their pictures, W/S to choose.
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `15px ${FONT}`;
    ctx.fillText('CHOOSE YOUR KAIJU  —  W / S', FIELD.width / 2, 330);
    const kaijuCards = [
      { id: 'fire', x: 350, type: KAIJU_TYPES.fire, img: assets ? assets.kaijuFire : null },
      { id: 'sea', x: 640, type: KAIJU_TYPES.sea, img: assets ? assets.kaijuSea : null },
      { id: 'dragon', x: 930, type: KAIJU_TYPES.dragon, img: assets ? assets.kaijuDragon : null },
    ];
    for (const card of kaijuCards) {
      const selected = kaijuSel === card.id;
      ctx.fillStyle = selected ? 'rgba(60,40,80,0.92)' : 'rgba(20,14,28,0.88)';
      ctx.fillRect(card.x - 135, 342, 270, 110);
      ctx.strokeStyle = selected ? card.type.eye : PALETTE.panelEdge;
      ctx.lineWidth = selected ? 3 : 1;
      ctx.strokeRect(card.x - 135, 342, 270, 110);
      ctx.lineWidth = 1;
      if (card.img) drawRaster(card.img, card.x, 420, 64);
      ctx.fillStyle = PALETTE.text;
      ctx.font = `bold 16px ${FONT}`;
      ctx.fillText(selected ? `▶ ${card.type.name}` : card.type.name, card.x, 444);
    }
    const kaiju = KAIJU_TYPES[kaijuSel || 'fire'];
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `13px ${FONT}`;
    ctx.fillText(kaiju.tagline, FIELD.width / 2, 472);
    // --- Arena: three cards, Q/E to choose. Each names its home kaiju.
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `15px ${FONT}`;
    ctx.fillText('CHOOSE YOUR ARENA  —  Q / E', FIELD.width / 2, 496);
    const arenaSel = (ui && ui.arenaSel) || 'town';
    const arenaCards = ARENA_ORDER.map((id, i) => ({ id, x: 350 + i * 290, arena: ARENAS[id] }));
    for (const card of arenaCards) {
      const selected = arenaSel === card.id;
      ctx.fillStyle = selected ? 'rgba(60,40,80,0.92)' : 'rgba(20,14,28,0.88)';
      ctx.fillRect(card.x - 135, 508, 270, 48);
      ctx.strokeStyle = selected ? PALETTE.spark : PALETTE.panelEdge;
      ctx.lineWidth = selected ? 2 : 1;
      ctx.strokeRect(card.x - 135, 508, 270, 48);
      ctx.lineWidth = 1;
      ctx.fillStyle = selected ? PALETTE.spark : PALETTE.text;
      ctx.font = `bold 14px ${FONT}`;
      ctx.fillText((selected ? '▶ ' : '') + card.arena.name, card.x, 530);
      ctx.fillStyle = PALETTE.muted;
      ctx.font = `11px ${FONT}`;
      const homeKaiju = KAIJU_TYPES[card.arena.homeKaiju];
      ctx.fillText(`HOME OF ${homeKaiju.name}`, card.x, 548);
    }
    // --- Match length: Best of 3 or Best of 5, T to toggle.
    const matchSel = (ui && ui.matchSel) || 3;
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `15px ${FONT}`;
    ctx.fillText('MATCH  —  T TO CHANGE', FIELD.width / 2, 576);
    const matchBtns = [
      { length: 3, x: 548, label: 'BEST OF 3' },
      { length: 5, x: 732, label: 'BEST OF 5' },
    ];
    for (const btn of matchBtns) {
      const selected = matchSel === btn.length;
      ctx.fillStyle = selected ? 'rgba(60,40,80,0.92)' : 'rgba(20,14,28,0.88)';
      ctx.fillRect(btn.x - 85, 588, 170, 40);
      ctx.strokeStyle = selected ? PALETTE.spark : PALETTE.panelEdge;
      ctx.lineWidth = selected ? 2 : 1;
      ctx.strokeRect(btn.x - 85, 588, 170, 40);
      ctx.lineWidth = 1;
      ctx.fillStyle = selected ? PALETTE.spark : PALETTE.text;
      ctx.font = `bold 15px ${FONT}`;
      ctx.fillText((selected ? '▶ ' : '') + btn.label, btn.x, 614);
    }
    // --- Difficulty: 1/2/3/4, with the win chance on the label.
    const diffs = DIFFICULTY_ORDER.map((id) => DIFFICULTY[id]);
    const diffY = 640;
    const diffW = 200;
    const diffGap = 16;
    const totalW = diffs.length * diffW + (diffs.length - 1) * diffGap;
    let dx = (FIELD.width - totalW) / 2;
    for (const d of diffs) {
      const selected = diffSel === d.id;
      ctx.fillStyle = selected ? 'rgba(60,40,80,0.92)' : 'rgba(20,14,28,0.88)';
      ctx.fillRect(dx, diffY, diffW, 40);
      ctx.strokeStyle = selected ? PALETTE.spark : PALETTE.panelEdge;
      ctx.lineWidth = selected ? 2 : 1;
      ctx.strokeRect(dx, diffY, diffW, 40);
      ctx.lineWidth = 1;
      ctx.fillStyle = selected ? PALETTE.spark : PALETTE.text;
      ctx.font = `bold 14px ${FONT}`;
      ctx.fillText(`${d.name}  —  ${d.winChance}% WIN`, dx + diffW / 2, diffY + 26);
      dx += diffW + diffGap;
    }
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `13px ${FONT}`;
    ctx.fillText('ENTER  TO FIGHT      ESC  BACK', FIELD.width / 2, 700);
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

  function drawEnd(state, best, ui) {
    ctx.fillStyle = 'rgba(10,6,16,0.55)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    // The end screen shows the MATCH result (matchWon), not the last
    // round's — a match can end on a lost round for the loser.
    const won = state.matchWon;
    const w = 560;
    const h = won ? 500 : 440;
    const x = (FIELD.width - w) / 2;
    const y = (FIELD.height - h) / 2;
    panel(x, y, w, h);
    let cy = y + 72;
    ctx.textAlign = 'center';
    ctx.fillStyle = won ? PALETTE.spark : PALETTE.hpBad;
    ctx.font = `bold 46px ${FONT}`;
    ctx.fillText(won ? 'THE STORM FALLS' : 'THE STORM WINS', FIELD.width / 2, cy);
    cy += 34;
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `16px ${FONT}`;
    const kaiName = KAIJU_TYPES[state.kaiju || 'fire'].name;
    ctx.fillText(
      won ? `${kaiName} IS FELLED. THE TOWN STILL STANDS.` : 'THE SAMURAI FALLS. THE THUNDER ROLLS ON.',
      FIELD.width / 2, cy,
    );
    cy += 52;
    ctx.fillStyle = PALETTE.text;
    ctx.font = `bold 22px ${FONT}`;
    ctx.fillText(`ROUNDS  ${state.roundWins.ronin} — ${state.roundWins.raiju}`, FIELD.width / 2, cy);
    cy += 34;
    ctx.fillText(`DAMAGE DEALT  ${state.matchDamage}`, FIELD.width / 2, cy);
    if (won) {
      cy += 34;
      ctx.fillText(`TIME BONUS  +${Math.round(state.timeLeft) * 10}`, FIELD.width / 2, cy);
      if (state.noHit) {
        cy += 34;
        ctx.fillText('UNTOUCHED  +1000', FIELD.width / 2, cy);
      }
    }
    cy += 46;
    ctx.fillStyle = PALETTE.spark;
    ctx.font = `bold 30px ${FONT}`;
    ctx.fillText(`SCORE  ${state.score}`, FIELD.width / 2, cy);
    cy += 36;
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `15px ${FONT}`;
    ctx.fillText(`BEST  ${Math.max(best, state.score)}`, FIELD.width / 2, cy);
    if (state.matchComboBest >= 2) {
      cy += 34;
      ctx.fillStyle = PALETTE.text;
      ctx.fillText(`BEST COMBO  x${state.matchComboBest}`, FIELD.width / 2, cy);
    }
    cy += 34;
    ctx.fillStyle = PALETTE.spark;
    ctx.font = `bold 18px ${FONT}`;
    const coins = ui && ui.save ? ui.save.coins : 0;
    const earned = ui ? ui.lastCoins || 0 : 0;
    ctx.fillText(`+${earned} COINS  —  TOTAL ${coins}`, FIELD.width / 2, cy);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `bold 18px ${FONT}`;
    ctx.fillText('PRESS ENTER TO FIGHT AGAIN', FIELD.width / 2, y + h - 52);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `15px ${FONT}`;
    ctx.fillText('S — SKIN SHOP', FIELD.width / 2, y + h - 24);
    ctx.textAlign = 'left';
  }

  // The skin shop: two columns (Hayate | Enjin), each skin a row with its
  // preview, name, price or status. A/D switches column, W/S moves down
  // the list, Enter buys or equips, Esc goes back. Prices come from the
  // SKINS table; a skin that never loaded shows the default art and can
  // never be bought unseen.
  function drawShop(state, ui) {
    const shop = (ui && ui.shop) || { col: 0, row: 0, msg: '' };
    const coins = ui && ui.save ? ui.save.coins : 0;
    const owned = (ui && ui.save && ui.save.owned) || [];
    const equipped = (ui && ui.save && ui.save.equipped) || { blue: 'blue', red: 'red' };
    ctx.fillStyle = 'rgba(10,6,16,0.45)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.sunCore;
    ctx.font = `bold 40px ${FONT}`;
    ctx.fillText('SKIN SHOP', FIELD.width / 2, 64);
    ctx.fillStyle = PALETTE.spark;
    ctx.font = `bold 22px ${FONT}`;
    ctx.fillText(`COINS  ${coins}`, FIELD.width / 2, 96);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `13px ${FONT}`;
    ctx.fillText('COSMETIC ONLY — NO GAMEPLAY EFFECT', FIELD.width / 2, 118);
    const cols = [
      { sam: 'blue', x: 340, variant: SAMURAI_VARIANTS.blue },
      { sam: 'red', x: 940, variant: SAMURAI_VARIANTS.red },
    ];
    for (let c = 0; c < cols.length; c += 1) {
      const col = cols[c];
      const selected = shop.col === c;
      ctx.fillStyle = PALETTE.text;
      ctx.font = `bold 20px ${FONT}`;
      ctx.fillText(col.variant.title.toUpperCase(), col.x, 150);
      const list = SKIN_ORDER[col.sam];
      let ry = 168;
      for (let i = 0; i < list.length; i += 1) {
        const skin = SKINS[list[i]];
        const cursor = selected && shop.row === i;
        const isOwned = owned.includes(skin.id);
        const isEquipped = equipped[col.sam] === skin.id;
        ctx.fillStyle = cursor ? 'rgba(60,40,80,0.92)' : 'rgba(20,14,28,0.88)';
        ctx.fillRect(col.x - 190, ry, 380, 84);
        ctx.strokeStyle = cursor ? PALETTE.spark : PALETTE.panelEdge;
        ctx.lineWidth = cursor ? 2 : 1;
        ctx.strokeRect(col.x - 190, ry, 380, 84);
        ctx.lineWidth = 1;
        // Preview: the recolored samurai when it loaded; the default art
        // when the skin file is missing (never a blank).
        const img = !skin.comingSoon && assets ? assets[skinAssetKey(skin.id)] : null;
        if (img) drawRaster(img, col.x - 140, ry + 78, 72);
        else if (!skin.comingSoon) {
          const def = assets ? (col.sam === 'red' ? assets.samuraiRed : assets.samuraiBlue) : null;
          if (def) drawRaster(def, col.x - 140, ry + 78, 72);
        }
        ctx.textAlign = 'left';
        ctx.fillStyle = skin.comingSoon ? PALETTE.muted : PALETTE.text;
        ctx.font = `bold 17px ${FONT}`;
        ctx.fillText(cursor ? `▶ ${skin.name}` : skin.name, col.x - 92, ry + 32);
        ctx.font = `14px ${FONT}`;
        if (skin.comingSoon) {
          ctx.fillStyle = PALETTE.muted;
          ctx.fillText(`COMING SOON — ${skin.price} COINS`, col.x - 92, ry + 58);
        } else if (isEquipped) {
          ctx.fillStyle = PALETTE.spark;
          ctx.fillText('EQUIPPED', col.x - 92, ry + 58);
        } else if (isOwned) {
          ctx.fillStyle = PALETTE.text;
          ctx.fillText('OWNED — ENTER TO EQUIP', col.x - 92, ry + 58);
        } else {
          ctx.fillStyle = coins >= skin.price ? PALETTE.text : PALETTE.hpBad;
          ctx.fillText(`${skin.price} COINS — ENTER TO BUY`, col.x - 92, ry + 58);
        }
        ctx.textAlign = 'center';
        ry += 96;
      }
    }
    if (shop.msg) {
      ctx.fillStyle = shop.msg.startsWith('NEED') ? PALETTE.hpBad : PALETTE.spark;
      ctx.font = `bold 18px ${FONT}`;
      ctx.fillText(shop.msg, FIELD.width / 2, 668);
    }
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `14px ${FONT}`;
    ctx.fillText('A / D  COLUMN      W / S  SKIN      ENTER  BUY / EQUIP      ESC  BACK', FIELD.width / 2, 696);
    ctx.textAlign = 'left';
  }

  // ---------------------------------------------------------- frame
  function render(state, screen, dt, best, selection, kaijuSel, diffSel, preview, ui) {
    updateShake(dt);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#0d0916';
    ctx.fillRect(0, 0, view.width, view.height);
    const shake = shakeOffset();
    ctx.setTransform(view.scale, 0, 0, view.scale, view.ox + shake.x * view.scale, view.oy + shake.y * view.scale);
    ctx.imageSmoothingEnabled = false;
    drawBackground(state.elapsed, state.arena);
    // Preview: one character, centred, breathing on the backdrop. No HUD,
    // no other fighter — the clip is just that character, clean.
    if (screen === 'preview') {
      const [kind] = (preview || '').split('-');
      if (kind === 'samurai') drawRonin(state, state.elapsed, ui);
      else if (kind === 'kaiju') drawRaiju(state, state.elapsed);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      return;
    }
    // The select and shop screens hide the duelists — the cards and the
    // shop rows are the scene there, and the fighters behind them would
    // overlap the UI. The title keeps them (the standoff is the title),
    // and the round intro keeps them behind its card.
    if (screen !== 'select' && screen !== 'shop') {
      drawRaiju(state, state.elapsed);
      drawDash(state);
      drawRonin(state, state.elapsed, ui);
      drawSlashArc(state);
      drawBolts(state);
      drawWaves(state);
      drawProjectiles(state);
      drawParticles(state);
      drawNumbers(state);
    }
    // HUD stays still: redraw it without the shake offset.
    ctx.setTransform(view.scale, 0, 0, view.scale, view.ox, view.oy);
    if (screen === 'play' || screen === 'paused') drawHud(state, screen, dt, ui);
    if (screen === 'title') drawTitle(state, best, ui);
    if (screen === 'select') drawSelect(state, selection || 'blue', kaijuSel || 'fire', diffSel || 'medium', ui);
    if (screen === 'roundIntro') drawRoundIntro(state, ui);
    if (screen === 'paused') drawPaused();
    if (screen === 'over') drawEnd(state, best, ui);
    if (screen === 'shop') drawShop(state, ui);
  }

  return { render, addTrauma, resize };
}

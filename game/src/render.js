// The canvas renderer: everything the player sees, and nothing the game
// decides. It draws the Edo dusk (sky, sun, Fuji, town, torii, lanterns,
// drifting embers), the samurai and the kaiju from the pixel sprites, combat
// feedback (slash arcs, lightning, shockwaves, particles, damage numbers),
// the HUD, and the title / select / pause / end screens. Juice lives here
// too: trauma-based screen shake (game-feel) moves only the camera, never
// the simulation. The playfield is a fixed 1280x720 logical area, scaled to
// the window with letterboxing.
import { DIFFICULTY, FIELD, KAIJU_TYPES, PALETTE, FONT, RAIJU, RONIN, SAMURAI_VARIANTS, SCORE } from './config.js';
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

  // The raster hero for the picked samurai, or null when it did not load.
  function heroImage(state) {
    if (!assets) return null;
    return state.samurai === 'red' ? assets.samuraiRed : assets.samuraiBlue;
  }

  // The raster HUD portrait for the picked samurai, or null.
  function heroPortrait(state) {
    if (!assets) return null;
    return state.samurai === 'red' ? assets.portraitRed : assets.portraitBlue;
  }

  // ---------------------------------------------------------- background
  function drawBackground(elapsed) {
    // The painted Edo dusk: a raster backdrop (Fuji, the burning town, the
    // torii, the bridge, the stone platform) replaces the old flat vector
    // scenery. The drifting embers and the vignette stay code-drawn — they
    // are alive, moving with the clock, and they sit on top of the painting.
    if (assets && assets.bgEdo) {
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(assets.bgEdo, 0, 0, FIELD.width, FIELD.height);
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

  function drawRonin(state, elapsed) {
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
    const img = heroImage(state);
    if (img) {
      // One static raster portrait, so the pose reads through motion: a
      // gentle idle bob, a forward lean while running, a deep lean into the
      // slash and the heavy iaido draw, and a white-hot flash when hurt.
      let bob = Math.sin(elapsed * 2) * 2;
      let tilt = 0;
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
    const bob = Math.sin(elapsed * 2.2) * 3;
    const bottomY = FIELD.groundY + drop - rear + bob;
    // The raster kaiju when it loaded, the code-drawn pixel sprite
    // otherwise. The raster is drawn much taller than the hero (it is a
    // boss); the pixel sprite keeps its old 280x200 frame.
    const kaijuKey = { fire: 'kaijuFire', sea: 'kaijuSea', dragon: 'kaijuDragon' }[state.kaiju || 'fire'];
    const kaijuImg = assets && assets[kaijuKey];
    if (kaijuImg) {
      drawRaster(kaijuImg, k.x, bottomY, 320, {
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
    // Phase 3 aura: crackling light around the beast, in its own colour.
    if (k.phase === 3) {
      ctx.globalAlpha = 0.25 + 0.2 * Math.sin(elapsed * 9);
      ctx.strokeStyle = KAIJU_TYPES[state.kaiju || 'fire'].aura;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(k.x, FIELD.groundY - 100, 170 + Math.sin(elapsed * 5) * 8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    // Shadow.
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(k.x - 112, FIELD.groundY - 2, 224, 6);
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
  function drawBar(x, y, w, h, ratio, good, warn, bad) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
    ctx.fillStyle = ratio > 0.5 ? good : ratio > 0.25 ? warn : bad;
    ctx.fillRect(x, y, Math.max(0, w * ratio), h);
  }

  function drawHud(state, screen) {
    const r = state.ronin;
    const k = state.raiju;
    const sam = SAMURAI_VARIANTS[state.samurai || 'blue'];
    const kai = KAIJU_TYPES[state.kaiju || 'fire'];
    // Samurai portrait + HP + energy (top-left). The raster portrait when
    // it loaded, the code-drawn one otherwise.
    const portrait = heroPortrait(state);
    if (portrait) {
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(22, 10, 52, 52);
      ctx.strokeStyle = PALETTE.panelEdge;
      ctx.lineWidth = 1;
      ctx.strokeRect(22, 10, 52, 52);
      drawRaster(portrait, 48, 60, 48);
    } else {
      drawPixelSpriteAt(ctx, SPRITES.portraits.hero, 24, 12, 3);
    }
    ctx.fillStyle = PALETTE.text;
    ctx.font = `bold 15px ${FONT}`;
    ctx.fillText(sam.name, 84, 30);
    const maxHp = (DIFFICULTY[state.difficulty] || DIFFICULTY.medium).roninHp;
    drawBar(84, 38, 200, 14, r.hp / maxHp, PALETTE.hpGood, PALETTE.hpWarn, PALETTE.hpBad);
    ctx.font = `13px ${FONT}`;
    ctx.fillText(`${Math.max(0, Math.ceil(r.hp))} / ${maxHp}`, 292, 51);
    for (let i = 0; i < RONIN.maxCells; i += 1) {
      ctx.fillStyle = i < r.energy ? PALETTE.energy : 'rgba(126,200,255,0.25)';
      ctx.beginPath();
      ctx.arc(96 + i * 26, 70, 8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = PALETTE.muted;
    ctx.fillText(state.samurai === 'red' ? 'EMBER' : 'MOONLIGHT', 178, 74);
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
    // Combo: consecutive hits within the window raise the score multiplier.
    // Shown once the chain is worth noticing, with the time left to keep it.
    if (state.combo >= 2) {
      const mult = 1 + Math.min(Math.floor(state.combo / SCORE.comboStep), SCORE.comboMax - 1);
      ctx.font = `bold 16px ${FONT}`;
      ctx.fillStyle = mult >= SCORE.comboMax ? PALETTE.spark : PALETTE.text;
      ctx.fillText(`COMBO x${state.combo}  (x${mult})`, FIELD.width / 2, 92);
      const barW = 120;
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.fillRect(FIELD.width / 2 - barW / 2, 100, barW, 4);
      ctx.fillStyle = PALETTE.spark;
      ctx.fillRect(FIELD.width / 2 - barW / 2, 100, barW * Math.max(0, state.comboTimer / SCORE.comboWindow), 4);
    }
    ctx.textAlign = 'left';
    // Kaiju portrait + HP + phase (top-right). The raster kaiju when it
    // loaded, the code-drawn portrait otherwise.
    const kaijuKey = { fire: 'kaijuFire', sea: 'kaijuSea', dragon: 'kaijuDragon' }[state.kaiju || 'fire'];
    const kaijuImg = assets && assets[kaijuKey];
    if (kaijuImg) {
      drawRaster(kaijuImg, FIELD.width - 48, 60, 48);
    } else {
      const kaiPortrait = SPRITES.portraits.kaiju[state.kaiju || 'fire'] || SPRITES.portraits.kaiju.fire;
      drawPixelSpriteAt(ctx, kaiPortrait, FIELD.width - 72, 12, 3);
    }
    ctx.textAlign = 'right';
    ctx.font = `bold 15px ${FONT}`;
    ctx.fillStyle = PALETTE.text;
    ctx.fillText(`${kai.name} — ${kai.title.toUpperCase()}`, FIELD.width - 84, 30);
    const maxKaijuHp = (DIFFICULTY[state.difficulty] || DIFFICULTY.medium).raijuHp;
    drawBar(FIELD.width - 284, 38, 200, 14, k.hp / maxKaijuHp, kai.aura, kai.aura, PALETTE.hpBad);
    ctx.font = `13px ${FONT}`;
    ctx.fillText(`PHASE ${k.phase} / 3`, FIELD.width - 84, 74);
    // Difficulty, small, under the kaiju phase — the player always knows
    // which storm they picked.
    ctx.fillStyle = PALETTE.muted;
    ctx.fillText((DIFFICULTY[state.difficulty] || DIFFICULTY.medium).name, FIELD.width - 84, 96);
    ctx.textAlign = 'left';
    // Controls hint, early in the fight.
    if (screen === 'play' && state.elapsed < 6) {
      ctx.globalAlpha = 0.75;
      ctx.fillStyle = PALETTE.muted;
      ctx.font = `14px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText('A/D MOVE   SPACE JUMP   J SLASH   K HEAVY   L FIREBALL   SHIFT DASH', FIELD.width / 2, FIELD.height - 16);
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
    ctx.fillText('A KAIJU HAS COME FOR THE TOWN. WHICH ONE, NO ONE KNOWS.', FIELD.width / 2, 396);
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
    ctx.textAlign = 'left';
  }

  function drawSelect(state, selection, kaijuSel, diffSel) {
    ctx.fillStyle = 'rgba(10,6,16,0.45)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.sunCore;
    ctx.font = `bold 40px ${FONT}`;
    ctx.fillText('SAMURAI ZERO', FIELD.width / 2, 72);
    // --- Samurai: two cards, A/D to choose.
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `15px ${FONT}`;
    ctx.fillText('CHOOSE YOUR SAMURAI  —  A / D', FIELD.width / 2, 104);
    const cards = [
      { id: 'blue', x: 340, variant: SAMURAI_VARIANTS.blue },
      { id: 'red', x: 940, variant: SAMURAI_VARIANTS.red },
    ];
    for (const card of cards) {
      const selected = selection === card.id;
      const cx = card.x;
      // Card panel.
      ctx.fillStyle = selected ? 'rgba(60,40,80,0.92)' : 'rgba(20,14,28,0.88)';
      ctx.fillRect(cx - 190, 128, 380, 300);
      ctx.strokeStyle = selected ? card.variant.slash : PALETTE.panelEdge;
      ctx.lineWidth = selected ? 3 : 1;
      ctx.strokeRect(cx - 190, 128, 380, 300);
      ctx.lineWidth = 1;
      // The samurai, large, standing on the card — the raster art when it
      // loaded, the code-drawn sprite otherwise.
      const img = assets && (card.id === 'red' ? assets.samuraiRed : assets.samuraiBlue);
      if (img) drawRaster(img, cx, 320, 170);
      else {
        const set = SPRITES.samurai[card.id];
        drawPixelSprite(ctx, set.idle[0], cx, 320, 5);
      }
      // Name + tagline + fighting style (Hayate swift, Enjin mighty).
      // The selected card's name carries a ▶ marker — no separate line,
      // so nothing overlaps the card's bottom edge.
      ctx.fillStyle = PALETTE.text;
      ctx.font = `bold 24px ${FONT}`;
      ctx.fillText(selected ? `▶ ${card.variant.title.toUpperCase()}` : card.variant.title.toUpperCase(), cx, 368);
      ctx.fillStyle = PALETTE.muted;
      ctx.font = `13px ${FONT}`;
      ctx.fillText(card.variant.tagline, cx, 392);
      ctx.fillStyle = card.variant.slash;
      ctx.font = `bold 12px ${FONT}`;
      ctx.fillText(card.variant.style, cx, 414);
    }
    // --- Kaiju: W/S to choose which storm to face (no longer random).
    const kaiju = KAIJU_TYPES[kaijuSel || 'fire'];
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `15px ${FONT}`;
    ctx.fillText('CHOOSE YOUR KAIJU  —  W / S', FIELD.width / 2, 492);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `bold 22px ${FONT}`;
    ctx.fillText(`${kaiju.name} — ${kaiju.title.toUpperCase()}`, FIELD.width / 2, 522);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `13px ${FONT}`;
    ctx.fillText(kaiju.tagline, FIELD.width / 2, 544);
    // --- Difficulty: 1/2/3, with the win chance on the label.
    const diffs = ['easy', 'medium', 'hard'].map((id) => DIFFICULTY[id]);
    const diffY = 576;
    const diffW = 260;
    const diffGap = 24;
    const totalW = diffs.length * diffW + (diffs.length - 1) * diffGap;
    let dx = (FIELD.width - totalW) / 2;
    for (const d of diffs) {
      const selected = diffSel === d.id;
      ctx.fillStyle = selected ? 'rgba(60,40,80,0.92)' : 'rgba(20,14,28,0.88)';
      ctx.fillRect(dx, diffY, diffW, 64);
      ctx.strokeStyle = selected ? PALETTE.spark : PALETTE.panelEdge;
      ctx.lineWidth = selected ? 2 : 1;
      ctx.strokeRect(dx, diffY, diffW, 64);
      ctx.lineWidth = 1;
      ctx.fillStyle = selected ? PALETTE.spark : PALETTE.text;
      ctx.font = `bold 16px ${FONT}`;
      ctx.fillText(`${d.name}  —  ${d.winChance}% WIN`, dx + diffW / 2, diffY + 26);
      ctx.fillStyle = PALETTE.muted;
      ctx.font = `12px ${FONT}`;
      ctx.fillText(d.tagline, dx + diffW / 2, diffY + 48);
      dx += diffW + diffGap;
    }
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `14px ${FONT}`;
    ctx.fillText('1 / 2 / 3  TO CHOOSE DIFFICULTY      ENTER  TO FIGHT', FIELD.width / 2, 668);
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
    const h = state.won ? 414 : 374;
    const x = (FIELD.width - w) / 2;
    const y = (FIELD.height - h) / 2;
    panel(x, y, w, h);
    ctx.textAlign = 'center';
    ctx.fillStyle = state.won ? PALETTE.spark : PALETTE.hpBad;
    ctx.font = `bold 46px ${FONT}`;
    ctx.fillText(state.won ? 'THE STORM FALLS' : 'THE STORM WINS', FIELD.width / 2, y + 78);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `16px ${FONT}`;
    const kaiName = KAIJU_TYPES[state.kaiju || 'fire'].name;
    ctx.fillText(
      state.won ? `${kaiName} IS FELLED. THE TOWN STILL STANDS.` : 'THE SAMURAI FALLS. THE THUNDER ROLLS ON.',
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
    if (state.comboBest >= 2) {
      ctx.fillStyle = PALETTE.text;
      ctx.fillText(`BEST COMBO  x${state.comboBest}`, FIELD.width / 2, y + (state.won ? 352 : 316));
    }
    ctx.fillStyle = PALETTE.text;
    ctx.font = `bold 18px ${FONT}`;
    ctx.fillText('PRESS ENTER TO FIGHT AGAIN', FIELD.width / 2, y + h - 24);
    ctx.textAlign = 'left';
  }

  // ---------------------------------------------------------- frame
  function render(state, screen, dt, best, selection, kaijuSel, diffSel) {
    updateShake(dt);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#0d0916';
    ctx.fillRect(0, 0, view.width, view.height);
    const shake = shakeOffset();
    ctx.setTransform(view.scale, 0, 0, view.scale, view.ox + shake.x * view.scale, view.oy + shake.y * view.scale);
    ctx.imageSmoothingEnabled = false;
    drawBackground(state.elapsed);
    // The select screen hides the duelists — the cards and the difficulty
    // buttons are the scene there, and the fighters behind them would
    // overlap the UI. The title keeps them (the standoff is the title).
    if (screen !== 'select') {
      drawRaiju(state, state.elapsed);
      drawDash(state);
      drawRonin(state, state.elapsed);
      drawSlashArc(state);
      drawBolts(state);
      drawWaves(state);
      drawProjectiles(state);
      drawParticles(state);
      drawNumbers(state);
    }
    // HUD stays still: redraw it without the shake offset.
    ctx.setTransform(view.scale, 0, 0, view.scale, view.ox, view.oy);
    if (screen === 'play' || screen === 'paused') drawHud(state, screen);
    if (screen === 'title') drawTitle(state, best);
    if (screen === 'select') drawSelect(state, selection || 'blue', kaijuSel || 'fire', diffSel || 'medium');
    if (screen === 'paused') drawPaused();
    if (screen === 'over') drawEnd(state, best);
  }

  return { render, addTrauma, resize };
}

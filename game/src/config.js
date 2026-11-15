// Every tuning number and colour in one place. The playfield is a fixed 1280x720
// logical area; the renderer scales it to the window, so no rule below depends
// on the screen size. SAMURAI ZERO: a lone samurai faces Raiju, the thunder kaiju,
// in a burning castle town at dusk. Three minutes on the clock, three phases.

export const FIELD = { width: 1280, height: 720, groundY: 664 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** Seconds on the clock. Win by felling Raiju before it runs out. */
export const TIME_LIMIT = 180;

export const RONIN = {
  width: 72,
  height: 118,
  runSpeed: 340,
  jumpVelocity: -880,
  gravity: 2400,
  /** Seconds of mercy after a hit lands. */
  invulnerable: 1.1,
  hp: 150,
  /** Fast katana slash: damage, reach ahead of the ronin, cooldown, hit-stop. */
  slashDamage: 8,
  slashReach: 64,
  slashCooldown: 0.32,
  slashHitStop: 0.045,
  /** Heavy iaido draw: slower, harder, longer reach, bigger freeze. */
  heavyDamage: 22,
  heavyReach: 92,
  heavyCooldown: 0.9,
  heavyHitStop: 0.12,
  /** Moonlight Wave: a screen-wide blade of light. Costs one energy cell. */
  specialDamage: 34,
  specialCost: 1,
  specialCooldown: 1.2,
  /** Dash: a short burst with invulnerability frames. */
  dashSpeed: 780,
  dashTime: 0.16,
  dashCooldown: 1.1,
  /** Landing hits charges energy: this many hits refill one cell. */
  hitsPerCell: 6,
  maxCells: 3,
};

/** The two playable samurai. Same moveset, different theme — the player
 * picks one on the select screen. `fx` colours the slash arc and the
 * special projectile; `cloth`/`dark` are the sprite palette keys used by
 * the variant (see sprites.js). */
export const SAMURAI_VARIANTS = {
  blue: {
    id: 'blue', name: 'AO', title: 'Samurai Biru',
    tagline: 'Tenang seperti bulan, tebasan cahaya.',
    slash: '#8ef1ff', slashCore: '#f3f7ff', special: '#8ef1ff', specialCore: '#f2e9ff',
  },
  red: {
    id: 'red', name: 'AKA', title: 'Samurai Merah',
    tagline: 'Membara seperti api, tebasan bara.',
    slash: '#ff9e45', slashCore: '#ffd94a', special: '#ff7a2a', specialCore: '#ffd94a',
  },
};
export const SAMURAI_ORDER = ['blue', 'red'];

/** The three kaiju bosses. The fight picks one at random, equal chance
 * (1/3 each). Each has its own attack set, drawn from the shared boss
 * mechanics: swipe = claw/bite (melee), bolt = ranged projectile
 * (fireball / wind gust), storm = ranged barrage (phase 3),
 * leap = charging ram/slam, stomp = ground shockwave (tsunami).
 * `fx` colours the boss's bolts, waves, aura and impact bursts. */
export const KAIJU_TYPES = {
  fire: {
    id: 'fire', name: 'KAGUTSUCHI', title: 'Kaiju Api',
    tagline: 'Lava mengalir di tubuhnya — cakaran dan bola api.',
    attacks: ['swipe', 'bolt', 'storm'],
    eye: '#ff7a2a', bolt: '#ff7a2a', boltCore: '#ffd94a',
    aura: '#ff7a2a', wave: '#b23a2e', waveTop: '#ff9e45', burst: '#ff9a3d',
  },
  sea: {
    id: 'sea', name: 'UMIBOZU', title: 'Kaiju Laut',
    tagline: 'Raksasa dari laut dalam — serudukan dan tsunami.',
    attacks: ['swipe', 'leap', 'stomp'],
    eye: '#7ec8ff', bolt: '#7ec8ff', boltCore: '#f3f7ff',
    aura: '#7ec8ff', wave: '#2f6fb2', waveTop: '#7ec8ff', burst: '#7ec8ff',
  },
  dragon: {
    id: 'dragon', name: 'SANRYU', title: 'Naga Kepala 3',
    tagline: 'Tiga kepala, sayap badai — gigitan dan angin topan.',
    attacks: ['swipe', 'bolt', 'storm'],
    eye: '#ffd94a', bolt: '#b8d8ff', boltCore: '#f3f7ff',
    aura: '#ffd94a', wave: '#b39ddb', waveTop: '#f2e9ff', burst: '#ffd94a',
  },
};
/** Equal-chance order: the boss is picked by one seeded random draw. */
export const KAIJU_ORDER = ['fire', 'sea', 'dragon'];

export const RAIJU = {
  width: 260,
  height: 210,
  hp: 1200,
  /** Phase lines: below 800 the storm quickens, below 400 it rages. */
  phase2At: 800,
  phase3At: 400,
  /** Claw swipe: melee range, telegraph, damage. */
  swipeDamage: 12,
  swipeRange: 190,
  swipeTelegraph: 0.55,
  /** Lightning: ground zones the storm marks before it strikes. */
  boltDamage: 18,
  boltTelegraph: 0.9,
  boltWidth: 74,
  /** Stomp shockwave: a ground wave the ronin must jump over. */
  waveDamage: 10,
  waveSpeed: 420,
  /** Leap slam: Raiju crashes down where the ronin stands. */
  slamDamage: 18,
  slamTelegraph: 0.7,
  /** How long Raiju rests after each attack, per phase (seconds). */
  restAfter: [1.25, 1.0, 0.7],
  /** Attack speed multiplier per phase. */
  speedScale: [1, 1.25, 1.55],
  /** Contact damage when the ronin touches Raiju's body. */
  touchDamage: 10,
};

/** Score: damage dealt, plus bonuses. */
export const SCORE = {
  perDamage: 1,
  phaseBonus: 500,
  winTimeBonus: 10,
  noHitBonus: 1000,
};

export const PALETTE = {
  skyTop: '#1a0b2e',
  skyMid: '#5c1f3d',
  skyLow: '#b23a2e',
  horizon: '#f2a541',
  sun: '#ffb347',
  sunCore: '#ffe08a',
  sunGlow: '#ff7a2a',
  cloud: '#3d1f45',
  cloudLit: '#c65a3a',
  fuji: '#3d2b52',
  fujiSnow: '#f2e6ff',
  townFar: '#2e1a38',
  townNear: '#1f1226',
  tower: '#2a1633',
  fire: '#ff7a2a',
  fireCore: '#ffd94a',
  smoke: '#4a3550',
  water: '#3a1f4d',
  waterShine: '#f2a541',
  bridge: '#241530',
  ground: '#2e1f33',
  groundTop: '#6b4232',
  groundCrack: '#1a1020',
  stone: '#4a2f3d',
  torii: '#c0392b',
  toriiDark: '#7e2318',
  lantern: '#f2a541',
  lanternGlow: '#f7c873',
  roninCloth: '#2f6fb2',
  roninClothDark: '#1f4d80',
  roninSkin: '#e8b98a',
  roninHair: '#171219',
  steel: '#e8ecf2',
  steelDark: '#9aa3b2',
  sash: '#c0392b',
  kaijuBody: '#4a3f66',
  kaijuBelly: '#6b5a8a',
  kaijuHorn: '#e8dff2',
  kaijuEye: '#ffd94a',
  kaijuMaw: '#2a1f3d',
  lightning: '#b78bff',
  lightningCore: '#f2e9ff',
  spark: '#ffd94a',
  ember: '#ff9a3d',
  blood: '#e05243',
  panel: '#1c1426',
  panelEdge: '#4a3f66',
  text: '#f3ead8',
  muted: '#b8a8c8',
  hpGood: '#43d17a',
  hpWarn: '#f2c14e',
  hpBad: '#e05243',
  energy: '#7ec8ff',
};

export const FONT = '"Courier New", ui-monospace, monospace';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'samurai-zero.best';

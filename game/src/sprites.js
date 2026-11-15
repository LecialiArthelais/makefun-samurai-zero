// Pixel-art sprites, authored as explicit grids (see pixel-art-code skill).
// Every sprite is a matrix of characters over a shared palette: outline first,
// light second, hard edges only. The renderer draws them with image smoothing
// off, so they stay crisp at any scale.
//
// RONIN: 16x24, facing right. RAIJU: built from parts (head 16x14, body 24x14,
// legs 8x10, tail 14x8) so the boss can rear, swipe and stomp without slicing
// one giant sheet — the mistake the TikTok build kept hitting.

/** Character -> colour. K is always the outline. */
export const PALETTE = {
  K: '#14101c',
  H: '#d9b36a', // straw hat
  S: '#e8b98a', // skin
  E: '#14101c', // eye (dark on skin)
  B: '#2f6fb2', // ronin indigo cloth
  D: '#1f4d80', // cloth shadow
  A: '#c0392b', // sash red
  W: '#e8ecf2', // steel
  G: '#9aa3b2', // steel shadow
  M: '#4a2f6e', // kaiju mane (dark, against the lighter body)
  Y: '#7a5fb0', // kaiju body (light violet: must pop against the dusk)
  L: '#a88ad0', // kaiju belly
  O: '#e8dff2', // horn pale
  2: '#ffd94a', // kaiju eye
  T: '#f3f7ff', // teeth
  J: '#1c1030', // maw interior
  C: '#c8b8e8', // claw
};

/** Draw one matrix sprite centred on (cx, cy) at the given pixel scale. */
export function drawPixelSprite(ctx, frame, x, y, scale) {
  const rows = frame.length;
  const cols = frame[0].length;
  const ox = Math.round(x - (cols * scale) / 2);
  const oy = Math.round(y - rows * scale);
  ctx.imageSmoothingEnabled = false;
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const key = frame[row][col];
      if (key !== '.' && PALETTE[key]) {
        ctx.fillStyle = PALETTE[key];
        ctx.fillRect(ox + col * scale, oy + row * scale, scale, scale);
      }
    }
  }
}

/** Draw a matrix sprite with its top-left corner at (x, y). */
export function drawPixelSpriteAt(ctx, frame, x, y, scale) {
  ctx.imageSmoothingEnabled = false;
  for (let row = 0; row < frame.length; row += 1) {
    for (let col = 0; col < frame[row].length; col += 1) {
      const key = frame[row][col];
      if (key !== '.' && PALETTE[key]) {
        ctx.fillStyle = PALETTE[key];
        ctx.fillRect(Math.round(x + col * scale), Math.round(y + row * scale), scale, scale);
      }
    }
  }
}

// ---------------------------------------------------------------- RONIN (16x24)
// The ronin stands in profile, straw hat low, katana sheathed at the hip.
// Frames differ only where the pose changes: feet, lean, and the draw arm.

export const RONIN_IDLE_A = [
  '................',
  '.....KKKKKK.....',
  '...KKHHHHHHKK...',
  '..KHHHHHHHHHHK..',
  '...KKKKKKKKKK...',
  '.....KSSSSK.....',
  '.....KSEESK.....',
  '.....KSSSSK.....',
  '......KSSK......',
  '....KBBBBBBK....',
  '...KBBBBBBBBK...',
  '...KBKBBBBKBK...',
  '...KBKBBBBKBK...',
  '....KBBBBBBK....',
  '....KAAAAAAK....',
  '....KBBBBBBK....',
  '....KBBKBBBK....',
  '....KBBKBBBK....',
  '....KBBKBBBK....',
  '...KBBBKBBBK....',
  '...KBBK..KBBK...',
  '...KKK....KKK...',
  '................',
  '................',
];

export const RONIN_IDLE_B = [
  '................',
  '.....KKKKKK.....',
  '...KKHHHHHHKK...',
  '..KHHHHHHHHHHK..',
  '...KKKKKKKKKK...',
  '.....KSSSSK.....',
  '.....KSEESK.....',
  '.....KSSSSK.....',
  '......KSSK......',
  '....KBBBBBBK....',
  '...KBBBBBBBBK...',
  '...KBKBBBBKBK...',
  '...KBKBBBBKBK...',
  '....KBBBBBBK....',
  '....KAAAAAAK....',
  '....KBBBBBBK....',
  '....KBBKBBBK....',
  '....KBBKBBBK....',
  '....KBBKBBBK....',
  '....KBBBKBBK....',
  '...KBBK...KBBK..',
  '...KKK.....KKK..',
  '................',
  '................',
];

export const RONIN_RUN_A = [
  '................',
  '.....KKKKKK.....',
  '...KKHHHHHHKK...',
  '..KHHHHHHHHHHK..',
  '...KKKKKKKKKK...',
  '.....KSSSSK.....',
  '.....KSEESK.....',
  '.....KSSSSK.....',
  '......KSSK......',
  '.....KBBBBBK....',
  '....KBBBBBBBK...',
  '....KBBBBBBBK...',
  '....KBBBKBBBK...',
  '....KBBBBBBBK...',
  '.....KAAAAAK....',
  '.....KBBBBBK....',
  '....KBBKBBBK....',
  '...KBBK..KBBK...',
  '..KBBK....KBBK..',
  '..KBBK.....KBBK.',
  '.KKK........KKK.',
  '................',
  '................',
  '................',
];

export const RONIN_RUN_B = [
  '................',
  '.....KKKKKK.....',
  '...KKHHHHHHKK...',
  '..KHHHHHHHHHHK..',
  '...KKKKKKKKKK...',
  '.....KSSSSK.....',
  '.....KSEESK.....',
  '.....KSSSSK.....',
  '......KSSK......',
  '.....KBBBBBK....',
  '....KBBBBBBBK...',
  '....KBBBBBBBK...',
  '....KBBBKBBBK...',
  '....KBBBBBBBK...',
  '.....KAAAAAK....',
  '.....KBBBBBK....',
  '.....KBBKBBK....',
  '....KBBK.KBBK...',
  '....KBBK..KBBK..',
  '...KBBK....KBBK.',
  '...KKK......KKK.',
  '................',
  '................',
  '................',
];

export const RONIN_JUMP = [
  '................',
  '.....KKKKKK.....',
  '...KKHHHHHHKK...',
  '..KHHHHHHHHHHK..',
  '...KKKKKKKKKK...',
  '.....KSSSSK.....',
  '.....KSEESK.....',
  '.....KSSSSK.....',
  '......KSSK......',
  '....KBBBBBBK....',
  '...KBBBBBBBBK...',
  '...KBKBBBBKBK...',
  '...KBKBBBBKBK...',
  '....KBBBBBBK....',
  '....KAAAAAAK....',
  '....KBBBBBBK....',
  '....KBBKBBBK....',
  '...KBBK.KBBK....',
  '...KBBK..KBBK...',
  '...KKK....KKK...',
  '................',
  '................',
  '................',
  '................',
];

export const RONIN_SLASH = [
  '................',
  '.....KKKKKK.....',
  '...KKHHHHHHKK...',
  '..KHHHHHHHHHHK..',
  '...KKKKKKKKKK...',
  '.....KSSSSK.....',
  '.....KSEESK.....',
  '.....KSSSSK.....',
  '......KSSK......',
  '.....KBBBBBK....',
  '....KBBBBBBBK...',
  '....KBBBBBBBK...',
  '....KBBBKBBBK...',
  '....KBBBBBBBK...',
  '.....KAAAAAK....',
  '.....KBBBBBK....',
  '....KBBKBBBK....',
  '...KBBK..KBBK...',
  '..KBBK....KBBK..',
  '..KKK......KKK..',
  '................',
  '................',
  '................',
  '................',
];

export const RONIN_HEAVY = [
  '................',
  '.....KKKKKK.....',
  '...KKHHHHHHKK...',
  '..KHHHHHHHHHHK..',
  '...KKKKKKKKKK...',
  '.....KSSSSK.....',
  '.....KSEESK.....',
  '.....KSSSSK.....',
  '......KSSK......',
  '....KBBBBBBK....',
  '...KBBBBBBBBK...',
  '...KBKBBBBKBK...',
  '...KBKBBBBKBK...',
  '....KBBBBBBK....',
  '....KAAAAAAK....',
  '....KBBBBBBK....',
  '....KBBKBBBK....',
  '....KBBKBBBK....',
  '....KBBKBBBK....',
  '...KBBBKBBBK....',
  '...KBBK..KBBK...',
  '...KKK....KKK...',
  '................',
  '................',
];

export const RONIN_HURT = [
  '................',
  '.....KKKKKK.....',
  '...KKHHHHHHKK...',
  '..KHHHHHHHHHHK..',
  '...KKKKKKKKKK...',
  '.....KSSSSK.....',
  '.....KSEESK.....',
  '.....KSSSSK.....',
  '......KSSK......',
  '...KBBBBBBK.....',
  '..KBBBBBBBBK....',
  '..KBKBBBBKBK....',
  '..KBKBBBBKBK....',
  '...KBBBBBBK.....',
  '...KAAAAAAK.....',
  '...KBBBBBBK.....',
  '...KBBKBBBK.....',
  '...KBBKBBBK.....',
  '...KBBKBBBK.....',
  '..KBBBKBBBK.....',
  '..KBBK..KBBK....',
  '..KKK....KKK....',
  '................',
  '................',
];

// ---------------------------------------------------------------- RAIJU
// The thunder kaiju, facing left toward the ronin, as ONE connected
// silhouette (36x26): horns, head with glowing eye and teeth, spiked back,
// belly, legs with claws, and a tail rising from the rear. One matrix means
// the parts can never drift apart — the mistake the part-based build kept
// making. Drawn at scale 6, it is 216x156, the size of its own hitbox.

export const RAIJU = [
  '.........KK.........................',
  '........KOOOK.......................',
  '........KOOOK.....KK................',
  '.......KOOOOOK...KOOOK..............',
  '......KOOOOOOOKKOOOOOK..............',
  '.....KMMMMMMMMMMMMMMMK..............',
  '....KMMMMMMMMMMMMMMMMMK....KK.......',
  '...KMMMMMMMMMMMMMMMMMMK..KMMK.......',
  '..KMM22MMMMMMMMMMMMMMMMMK.KMMMK.....',
  '..KMM22MMMMMMMMMMMMMMMMMMK.KMMK.....',
  '.KMMMMMMMMMMMMMMMMMMMMMMMMK.KMMMK...',
  '.KMMTTTTMMMMMMMMMMMMMMMMMMK..KMMK...',
  '..KMMMMMMMMMMMMMMMMMMMMMMMK...KK....',
  '...KKMMMMMMMMMMMMMMMMMMMMMK.........',
  '....KMMYYYYYYYYYYYYYYYYYYYMMK.......',
  '....KMMYYYYYYYYYYYYYYYYYYYMMK..KK...',
  '....KMMYYYYYYYYYYYYYYYYYYYMMK.KYYK..',
  '....KMMYYYYYLLLLLLLLLLLLYYMMK.YYYK..',
  '....KMMYYYYYLLLLLLLLLLLLYYMMK..YYK..',
  '....KMMYYYYYYYYYYYYYYYYYYYMMK...KK..',
  '.....KMMYYYYYYYYYYYYYYYYYMMK........',
  '.....KKMMMMMMMMMMMMMMMMMMKK.........',
  '......KYYYYK......KYYYYK............',
  '......KYYYYK......KYYYYK............',
  '......KYYYYK......KYYYYK............',
  '......KCCCCK......KCCCCK............',
];

// The same beast with its maw open, for the telegraph and the recover.
export const RAIJU_OPEN = [
  '.........KK.........................',
  '........KOOOK.......................',
  '........KOOOK.....KK................',
  '.......KOOOOOK...KOOOK..............',
  '......KOOOOOOOKKOOOOOK..............',
  '.....KMMMMMMMMMMMMMMMK..............',
  '....KMMMMMMMMMMMMMMMMMK....KK.......',
  '...KMMMMMMMMMMMMMMMMMMK..KMMK.......',
  '..KMM22MMMMMMMMMMMMMMMMMK.KMMMK.....',
  '..KMM22MMMMMMMMMMMMMMMMMMK.KMMK.....',
  '.KMMMMMMMMMMMMMMMMMMMMMMMMK.KMMMK...',
  '.KMMTTTTMMMMMMMMMMMMMMMMMMK..KMMK...',
  '..KMMJJJJJJMMMMMMMMMMMMMMMK...KK....',
  '...KMMTTTTTTMMMMMMMMMMMMMMK.........',
  '....KMMYYYYYYYYYYYYYYYYYYYMMK.......',
  '....KMMYYYYYYYYYYYYYYYYYYYMMK..KK...',
  '....KMMYYYYYYYYYYYYYYYYYYYMMK.KYYK..',
  '....KMMYYYYYLLLLLLLLLLLLYYMMK.YYYK..',
  '....KMMYYYYYLLLLLLLLLLLLYYMMK..YYK..',
  '....KMMYYYYYYYYYYYYYYYYYYYMMK...KK..',
  '.....KMMYYYYYYYYYYYYYYYYYMMK........',
  '.....KKMMMMMMMMMMMMMMMMMMKK.........',
  '......KYYYYK......KYYYYK............',
  '......KYYYYK......KYYYYK............',
  '......KYYYYK......KYYYYK............',
  '......KCCCCK......KCCCCK............',
];

// Small paper lantern (6x8), hung from the torii and the town eaves.
export const LANTERN = [
  '.KKKK.',
  'KOOOOK',
  'KOYYYK',
  'KOYYYK',
  'KOYYYK',
  'KOOOOK',
  '.KKKK.',
  '...K..',
];

export const SPRITES = {
  ronin: {
    idle: [RONIN_IDLE_A, RONIN_IDLE_B],
    run: [RONIN_RUN_A, RONIN_RUN_B],
    jump: RONIN_JUMP,
    slash: RONIN_SLASH,
    heavy: RONIN_HEAVY,
    hurt: RONIN_HURT,
  },
  raiju: {
    closed: RAIJU,
    open: RAIJU_OPEN,
  },
  lantern: LANTERN,
};

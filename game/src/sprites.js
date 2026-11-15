// Pixel-art sprites, authored as explicit grids (see pixel-art-code skill).
// Every sprite is a matrix of characters over a shared palette: outline first,
// light second, hard edges only. The renderer draws them with image smoothing
// off, so they stay crisp at any scale.
//
// SAMURAI ZERO: a lone samurai duels Raiju, the thunder kaiju.
// SAMURAI: 32x44, facing right — straw kasa hat, indigo kimono and hakama,
// katana sheathed at the hip (idle/run/jump) and drawn, glowing, for the
// slash and the heavy iaido draw. RAIJU: 56x40, facing left, one connected
// body — curved bone horns, spiky mane, glowing eyes, fangs, claws, and
// crackling lightning on the shoulders. Portraits are 16x16, front-facing,
// for the HUD.

/** Character -> colour. K is always the outline. */
export const PALETTE = {
  K: '#14101c', // outline
  H: '#d9b36a', // straw hat
  S: '#e8b98a', // skin
  E: '#14101c', // eye (dark on skin)
  B: '#2f6fb2', // samurai indigo cloth
  D: '#1f4d80', // cloth shadow
  A: '#c0392b', // sash red
  W: '#e8ecf2', // steel
  G: '#9aa3b2', // steel shadow / bone
  M: '#4a2f6e', // kaiju mane (dark, against the lighter body)
  Y: '#7a5fb0', // kaiju body (light violet: must pop against the dusk)
  L: '#c9b8ec', // kaiju belly (very light lavender: must pop)
  O: '#e8dff2', // horn pale
  '2': '#ffd94a', // kaiju eye
  T: '#f3f7ff', // teeth
  J: '#1c1030', // maw interior
  C: '#c8b8e8', // claw
  R: '#ff9e45', // sunset rim light
  P: '#8ef1ff', // moonlight blade glow
  N: '#8a6a35', // hat band / dark straw
  U: '#241a2e', // hair dark
  F: '#7a5230', // sandal
  Q: '#22386b', // hakama dark indigo
  X: '#e8d9a8', // pale gold trim
  Z: '#fff3a0', // lightning crackle
  I: '#b39ddb', // kaiju body highlight (lighter violet top)
  V: '#33204f', // kaiju deep shadow
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

// ---------------------------------------------------------------- SAMURAI (32x44)
// The samurai stands in profile, kasa hat low, katana sheathed at the hip.
// Frames differ where the pose changes: feet, lean, arms, and the blade.
export const SAMURAI_IDLE_A = [
  '..............KHK...............',
  '............KHHHHHK.............',
  '..........KHHHHHHHHHX...........',
  '........KHNNNNNNNNNNNXK.........',
  '.......KHHHHHHHHHHHHHHHR........',
  '.......KNNNNNNNSNNNNNNNK........',
  '...........UUSSSSS..............',
  '...........UUSSSKKKR............',
  '...........UUSSSSEER............',
  '...........UUSSSSSSS............',
  '...........UUSSSSK..............',
  '..............DSS...............',
  '..........KBBXBBBBBXBK..........',
  '..........KKKKXBXBKKRK..........',
  '..........KKBKXXBXKBKK..........',
  '..........KKBKBXBXKBKK..........',
  '..........KKBKBXBXKBRK..........',
  '..........KKBKBBXBKBKK..........',
  '..........KKBKDBBBKBKK..........',
  '..........KBKKDBBBKKBK..........',
  '..........KUXUDBBBBKRK..........',
  '..........KUXUDBBBBKBK..........',
  '..........KKKKBBBBBKSK..........',
  '.........KKKGKAAAAAKKK..........',
  '........KKUKKKAAAAAAAA..........',
  '.......KKUUKQQQQQQQK............',
  '......KKUUUKQBQQQBQK............',
  '.....KKUUUKKQBQQQBQBR...........',
  '....KKUUGKKKQBQQQBQB............',
  '...KKUUGKK.KQBQQQBQB............',
  '..KKUUUKK..KQBQQQBQB............',
  '..KUUUKK...KQBQQQBQBR...........',
  '..KUUKK....KQBQQQBQB............',
  '..KKKK....KQQBQQQBQBK...........',
  '..........KQQBQQQBQBK...........',
  '..........KQQBQQQBQBR...........',
  '..........KQQBQQQBQBK...........',
  '..........KQQBQQQBQBK...........',
  '..........KQQBQQQBQBK...........',
  '..........KQQBQQQBQBR...........',
  '..........KQQQQQQQQQK...........',
  '.........FFFFF....FFFFR.........',
  '.........KKKKK....KKKKK.........',
  '................................',
];

export const SAMURAI_IDLE_B = [
  '..............KHK...............',
  '............KHHHHHK.............',
  '..........KHHHHHHHHHX...........',
  '........KHNNNNNNNNNNNXK.........',
  '.......KHHHHHHHHHHHHHHHR........',
  '.......KNNNNNNNSNNNNNNNK........',
  '...........UUSSSSS..............',
  '...........UUSSSKKKR............',
  '...........UUSSSSEER............',
  '...........UUSSSSSSS............',
  '...........UUSSSSK..............',
  '..............DSS...............',
  '..........KBBXBBBBBXBK..........',
  '..........KKKKXBXBKKRK..........',
  '..........KKBKXXBXKBKK..........',
  '..........KKBKBXBXKBKK..........',
  '..........KKBKBXBXKKRK..........',
  '..........KBKKBBXBBKBK..........',
  '..........KBKBDBBBBKBK..........',
  '..........KBKBDBBBBKBKK.........',
  '.........KKUXUDBBBBKRBK.........',
  '.........KBUXUDBBBBBKSK.........',
  '.........KKKKKBBBBBBKKK.........',
  '.........KKKGKAAAAAAAX..........',
  '........KKUKKKAAAAAAAA..........',
  '.......KKUUKQQQQQQQK............',
  '......KKUUUKQBQQQBQK............',
  '.....KKUUUKKQBQQQBQBR...........',
  '....KKUUGKKKQBQQQBQB............',
  '...KKUUGKK.KQBQQQBQB............',
  '..KKUUUKK..KQBQQQBQB............',
  '..KUUUKK...KQBQQQBQBR...........',
  '..KUUKK....KQBQQQBQB............',
  '..KKKK....KQQBQQQBQBK...........',
  '..........KQQBQQQBQBK...........',
  '..........KQQBQQQBQBR...........',
  '..........KQQBQQQBQBK...........',
  '..........KQQBQQQBQBK...........',
  '..........KQQBQQQBQBK...........',
  '..........KQQBQQQBQBR...........',
  '..........KQQQQQQQQQK...........',
  '........FFFFF......FFFFR........',
  '........KKKKK......KKKKK........',
  '................................',
];

export const SAMURAI_RUN_A = [
  '................KHK.............',
  '..............KHHHHHK...........',
  '............KHHHHHHHHHX.........',
  '..........KHNNNNNNNNNNNXK.......',
  '.........KHHHHHHHHHHHHHHHR......',
  '.........KNNNNNNNSNNNNNNNK......',
  '.............UUSSSSS............',
  '.............UUSSSSKKR..........',
  '.............UUSSSSSER..........',
  '.............UUSSSSSSS..........',
  '.............UUSSSSK............',
  '................DSS.............',
  '..............KBBXBBBBBXBK......',
  '............KKKDBBXBXBRKKK......',
  '...........KKBKDDBXXBXKBKK......',
  '..........KKBKKDDBBXBXKKBKK.....',
  '.........KKBKKKDDBBXBXRKKBKK....',
  '........KKBKK.KDDBBBXBBBKKBKK...',
  '.......KKBKK..KDDBDBBBBBBKKBKK..',
  '.......KSKK...KDDBDBBBBBBKKKSK..',
  '.......KKK...UXUDBDBBBBBBK.KKK..',
  '.............UXUDBDBBBBBBK......',
  '............KKKKBBBBBBBBBK......',
  '...........KKKGKAAAAAAAAAX......',
  '..........KKUKKKAAAAAAAAAA......',
  '.........KKUUKQQQQQQQK..........',
  '........KKUUUKQBQQQBQK..........',
  '.......KKUUUKKQBQQQBQBR.........',
  '......KKUUGKKKQBQQQBQB..........',
  '.....KKUUGKKKQQBQQQBQBK.........',
  '....KKUUUKK.KQQBQQQBQBK.........',
  '....KUUUKK..KQQBQQQBQBR.........',
  '....KUUKK...KQQBQQQBQBK.........',
  '....KKKK....KQQBQQQBQBK.........',
  '............KQQBQQQBQBK.........',
  '............KQQBQQQBQBR.........',
  '............KQQBQQQBQBK.........',
  '..........KKKKQBQQKKKKQK........',
  '......KKKKKQQKQBQQKQQKKK........',
  '....KKKQQQQKKKQBQQKKKQQKKK......',
  '.FFFFFQKKKKKQQQQQQQQKKKQQKK.....',
  '.KKKKKKK..............KKKFFFFR..',
  '........................KKKKKK..',
  '................................',
];

export const SAMURAI_RUN_B = [
  '................KHK.............',
  '..............KHHHHHK...........',
  '............KHHHHHHHHHX.........',
  '..........KHNNNNNNNNNNNXK.......',
  '.........KHHHHHHHHHHHHHHHR......',
  '.........KNNNNNNNSNNNNNNNK......',
  '.............UUSSSSS............',
  '.............UUSSSSKKR..........',
  '.............UUSSSSSER..........',
  '.............UUSSSSSSS..........',
  '.............UUSSSSK............',
  '................DSS.............',
  '..............KBBXBBBBBXBK......',
  '............KKKDBBXBXBRKKK......',
  '...........KKBKDDBXXBXKBKK......',
  '..........KKBKKDDBBXBXKKBK......',
  '.........KKBKKKDDBBXBXRKBKK.....',
  '........KKBKK.KDDBBBXBBKKBKK....',
  '........KSKK..KDDBDBBBBBKKBK....',
  '........KKK...KDDBDBBBBBBKBKK...',
  '.............UXUDBDBBBBBBKKSK...',
  '.............UXUDBDBBBBBBKKKK...',
  '............KKKKBBBBBBBBBK......',
  '...........KKKGKAAAAAAAAAX......',
  '..........KKUKKKAAAAAAAAAA......',
  '.........KKUUKQQQQQQQK..........',
  '........KKUUUKQBQQQBQK..........',
  '.......KKUUUKKQBQQQBQBR.........',
  '......KKUUGKKKQBQQQBQB..........',
  '.....KKUUGKKKQQBQQQBQBK.........',
  '....KKUUUKK.KQQBQQQBQBK.........',
  '....KUUUKK..KQQBQQQBQBR.........',
  '....KUUKK...KQQBQQQBQBK.........',
  '....KKKK....KQQBQQQBQBK.........',
  '............KQQBQQQBQBK.........',
  '............KQQBQQQBQBR.........',
  '............KQQBQQQBQBK.........',
  '...........KKKKBQKKKKBQK........',
  '.........KKKQQKBQKQQKKKK........',
  '.......KKKQQKKKBQKKKQQKKK.......',
  '......KKQQKKKQQQQQQKKKQFFFFR....',
  '...FFFFFKKK..........KKKKKKK....',
  '...KKKKKK.......................',
  '................................',
];

export const SAMURAI_JUMP = [
  '...........UUSSSSSER............',
  '...........UUSSSSSSS............',
  '...........UUSSSSK..............',
  '..............DSS...............',
  '..........KBBXBBBBBXBK..........',
  '........KKKKKKXBXBKKRKKK........',
  '........KSBBBKXXBXKBBBSK........',
  '........KKKKKKBXBXKKKKKK........',
  '..........KDDBBXBXBBRK..........',
  '..........KDDBBBXBBBBK..........',
  '..........KDDBDBBBBBBK..........',
  '..........KDDBDBBBBBBK..........',
  '..........KUXUDBBBBBRK..........',
  '..........KUXUDBBBBBBK..........',
  '..........KKKKBBBBBBBK..........',
  '.........KKKGKAAAAAAAX..........',
  '........KKUKKKAAAAAAAA..........',
  '.......KKUUKQQQQQQQK............',
  '......KKUUUKQBQQQBQK............',
  '.....KKUUUKKQBQQQBQBR...........',
  '....KKUUGKKKQBQQQBQB............',
  '...KKUUGKKKQQBQQQBQBK...........',
  '..KKUUUKK.KQQBQQQBQBK...........',
  '..KUUUKK..KQQBQQQBQBR...........',
  '..KUUKK...KQQBQQQBQBK...........',
  '..KKKK....KQQBQQQBQBK...........',
  '..........KQQBQQQBQBK...........',
  '..........KQQBQQQBQBR...........',
  '..........KQQBQQQBQBK...........',
  '.........KQQQKKKKKQBQK..........',
  '.........KQKKKQKQKKKQK..........',
  '.........KKKQQKKKQQKKK..........',
  '........KKQQKKKQKKKQQKK.........',
  '.....FFFFFKKK.....KKKFFFFR......',
  '.....KKKKKK.........KKKKKK......',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
];

export const SAMURAI_SLASH = [
  '................KHK.............',
  '..............KHHHHHK...........',
  '............KHHHHHHHHHX........K',
  '..........KHNNNNNNNNNNNXK.....KK',
  '.........KHHHHHHHHHHHHHHHR....KW',
  '.........KNNNNNNNSNNNNNNNK...KKW',
  '.............UUSSSSS.........KWP',
  '.............UUSSSSKKR......KKWP',
  '.............UUSSSSSER......KWPP',
  '.............UUSSSSSSS.....KKWPW',
  '.............UUSSSSK.......KWPWW',
  '................DSS.......KKWPWW',
  '..............KBBXBBBBBXBKKWPWWK',
  '.............KKKBBXBXBRKKKKWPWWK',
  '.............KBKKBXXBXKBKKWPWWKK',
  '.............KKBKBBXBXKKKKWPWWK.',
  '..............KBKKBXBXRKKWPWWKK.',
  '..............KKBKKBXBBBKWWWWK..',
  '..............KKKBKBBBBBKWWWKK..',
  '..............KDKBKKBBBBKKKKK...',
  '..............KDKKSKBBBBBK......',
  '..............KDDKKKBBBBBK......',
  '..............KDBBBBBBBBBK......',
  '..............KAAAAAAAAAAX......',
  '..............KAAAAAAAAAAA......',
  '.............KQQQQQQQK..........',
  '.............KQBQQQBQK..........',
  '.............KQBQQQBQBR.........',
  '.............KQBQQQBQB..........',
  '............KQQBQQQBQBK.........',
  '............KQQBQQQBQBK.........',
  '............KQQBQQQBQBR.........',
  '............KQQBQQQBQBK.........',
  '............KQQBQQQBQBK.........',
  '............KQQBQQQBQBK.........',
  '............KQQBQQQBQBR.........',
  '............KQQBQQQBQBK.........',
  '...........KKKKBQQKKKKQK........',
  '.......KKKKKQQKBQQKQQKKK........',
  '.....KKKQQQQKKKBQQKKKQQKKK......',
  '..FFFFFQKKKKKQQQQQQQKKKQQKK.....',
  '..KKKKKKK.............KKKFFFFR..',
  '........................KKKKKK..',
  '................................',
];

export const SAMURAI_HEAVY = [
  '...............KHK.....KKKWPPPWW',
  '.............KHHHHHKKKKKWPPWWWWW',
  '...........KHHHHHHKKKWPPPWWWWPWK',
  '.........KHNNNNNNNKWPPWWWWPWKKKK',
  '........KHHHHHHKKKKWWWWWRWKKK...',
  '........KNNNNNKKSKKWWWWKKKK.....',
  '............UUKBKKKKKKKKK.......',
  '............UKKBKSKKRKBK........',
  '............UKBKKSSERBKK........',
  '............KKBKSSSKKBK.........',
  '............KBKKSSKKBKK.........',
  '...........KKBKDSSKKBK..........',
  '...........KBKKXBBKBKKBK........',
  '...........KBKBBXBKBKRBK........',
  '...........KKKDBXXKKKBBK........',
  '............KDDBBXBXBBBK........',
  '............KDDBBXBXBRBK........',
  '............KDDBBBXBBBBK........',
  '............KDDBDBBBBBBK........',
  '............KDDBDBBBBBBK........',
  '............KDDBDBBBBBBK........',
  '............KDDBDBBBBBBK........',
  '............KDBBBBBBBBBK........',
  '............KAAAAAAAAAAX........',
  '............KAAAAAAAAAAA........',
  '............KQQQQQQQK...........',
  '............KQBQQQBQK...........',
  '............KQBQQQBQBR..........',
  '............KQBQQQBQB...........',
  '............KQBQQQBQB...........',
  '............KQBQQQBQB...........',
  '............KQBQQQBQBR..........',
  '............KQBQQQBQB...........',
  '...........KQQBQQQBQBK..........',
  '...........KQQBQQQBQBK..........',
  '...........KQQBQQQBQBR..........',
  '...........KQQBQQQBQBK..........',
  '...........KKKKQKKKQBK..........',
  '..........KKKQKQKQKKKK..........',
  '........KKKQQKKQKKQQKKK.........',
  '.......KKQQKKKQQQKKKQQKK........',
  '....FFFFFKKK.......KKKFFFFR.....',
  '....KKKKKK...........KKKKKK.....',
  '................................',
];

export const SAMURAI_HURT = [
  '.........KHHHHHK................',
  '.......KHHHHHHHHHX..............',
  '.....KHNNNNNNNNNNNXK............',
  '....KHHHHHHHHHHHHHHHR...........',
  '....KNNNNNNNSNNNNNNNK...........',
  '........UUSSSSS.................',
  '....KKK.UUSSSKKKR...............',
  '....KSKKUUSSSSEER...............',
  '....KKBKUUSSSSSSS...............',
  '.....KBKKUSSSSK.................',
  '.....KKBK..DSS..................',
  '......KBKK......................',
  '.....KKKBKBBBBXBKR..............',
  '.....KDKBKBXKKKBK...............',
  '.....KDKKKXKKBKBK...............',
  '.....KDDBBXKBKKBK...............',
  '.....KDDBBKKBKBBKR..............',
  '.....KDDBKKBKKBBK...............',
  '.....KDDBKBKKBBBK...............',
  '.....KDDKKBKBBBBK...............',
  '.....KDDUXUKBBBBK...............',
  '.....KDDUXUBBBBBK...............',
  '.....KDKKKKBBBBBK...............',
  '.....KKKKGKAAAAAX...............',
  '.....KKUKKKAAAAAA...............',
  '....KKUUKQQQQQQQK...............',
  '...KKUUUKQBQQQBQK...............',
  '..KKUUUKKQBQQQBQBR..............',
  '.KKUUGKKKQBQQQBQB...............',
  'KKUUGKKKQQBQQQBQBK..............',
  'KUUUKK.KQQBQQQBQBK..............',
  'UUUKK..KQQBQQQBQBR..............',
  'UUKK...KQQBQQQBQBK..............',
  'KKK....KQQBQQQBQBK..............',
  '.......KQQBQQQBQBK..............',
  '.......KQQBQQQBQBR..............',
  '.......KQQBQQQBQBK..............',
  '......KKKKKKQKKKBQK.............',
  '....KKKKQQQKQKQKKKK.............',
  '.FFFFFQQKKKKQKKQQKK.............',
  '.KKKKKKKKQQQQQKKKQKK............',
  '................KKFFFFR.........',
  '.................KKKKKK.........',
  '................................',
];

// ---------------------------------------------------------------- RAIJU (56x40)
// The thunder kaiju, facing left toward the samurai, as ONE connected
// silhouette: horns, head with glowing eye and teeth, spiked mane,
// belly, legs with claws, and a tail sweeping up from the rear. One matrix
// means the parts can never drift apart.
export const RAIJU_CLOSED = [
  '.............................O..........................',
  '.............................O...O...O..................',
  '.............Z.......O...O..KMK..O...O..................',
  '.................Z.R.O...O..KMK.KMK.KMK..O..............',
  '......R...Z.......OKKMK.KMK.MMM.KMK.KMK..O..............',
  '......OK.........OO.KMK.KMK.MMM.MMM.MMM.KMK............R',
  '......OOK.......OOK.MMM.MMR.MMR.MMR.MMM.KMK..O.........O',
  '......KOO.....OOOOK.MMR.MMMKMMMKMMMKMMR.MMM..O........OO',
  '......KOOOKKKOOOKMK.MMMKMMMKMMMKMMMKMMMKMMR.KMK.......OO',
  '.....KKKKKKMKKKKMMRKMMMKMMMMMMMMMMMKMMMKMMMKMMM.......OO',
  '.....KMMMMKKKKKKMMMKMMMMMMKMMMMMMMMMMMMKMMMKMMMK.....KYO',
  '....KKKKKTKK2YYYMMMMMMMMMMKMMMKMMMKMMMMMMMMMMMMM...KKIYY',
  '..IIIIIIK2222YYKMMKMMMKMMMKKKKKKKKKMMMMMMMMKMMKMKK.MKYYY',
  'KKLLLLLLLLLKYYYKMMKMMMKKKKKKK.I..TKKKKKMMMMKMMMMMMKKMMYY',
  'KJLLLLLLLLLKYYYMMMKKKKKKKIIIIIIIIIZIIIKKKKKMMMMMKMKRKYYY',
  '.KLLTLLTLLTKYYKMMMMMTIIIIIIIIIIIIIIZIIIII.KMMKMMMMMYYYYK',
  '..KKKKKKKKKKKKKKKKKKKZIIIIIIIIIIIIIIZIIKIIKKKKKKMMMYYYYY',
  '...TKKTKKTKKTKKIYYYYKIZKKIIIIIIIIIIIKZKIKKK....KRMMKYYYK',
  '...KKYYYYYYYKKKYYYYKIIIZYKIIIIIIIIIKZIIIIIYKKKKKKKKKYYYK',
  '...KYYYYYYYYYKMYYYYKIIIIZYKYYYIYYYKZIIIIIIIYKYYYKYYYYYK.',
  '....KYYYYYYYKYYYYYKKIIIZIIKYYYYYYYZIIIIIIIIIKRYYYYYYYK..',
  '.....KKMKKKKKKKYKKKIIIZIIYKYYYYYYYKYIIIIIIIYKYYYYYYYYK..',
  '.......MMK.....KYYYIIZIIYYYKYYYYYKYYYIIIIIYYYKYYYYYYK...',
  '......KMK.......KYYYYIZZYYKYYYLYYYKYYYYIYYYYKYYYYYYK....',
  '......K.........KYYYYYYYZYKLLLLLLLKYYYYYYYYYKYYYYYYK....',
  '................KYYYYYYYYYKLLLLLLLKYYYYYYYYYKYYYYYKK....',
  '.................KYYYYYYYKLLLLLLLLLKYYYYYYYKYYYYKKK.....',
  '................KYYYYYKKKLLLLLLLLLLLKYYYYYKYYYYYK.......',
  '................KIIYYYKLLLLLLLLLLLLLKIIYYYKYYYYKK.......',
  '................KIIYYYKKKKKKKKLKKKKKKIIYYYKKYKKK........',
  '................KIIYYYKVVVK...K..KVVKIIYYYK.K...........',
  '................KIIYYYKVVVK......KVVKIIYYYK.............',
  '................KYYYYYKVVVK......KVVKYYYYYK.............',
  '................KYYYYYKVVVK......KVVKYYYYYK.............',
  '................KYYYYYKVVVK......KVVKYYYYYK.............',
  '................KYYYYYKVVVK......KVVKYYYYYK.............',
  '................KYYYYYK.............KYYYYYK.............',
  '...............KYYYYYYYK...........KYYYYYYYK............',
  '...............CCCCCCCCC...........CCCCCCCCC............',
  '................C.KCK.C.............C.KCK.C.............',
];

// The same beast with its maw open, for the telegraph and the recover.
export const RAIJU_OPEN = [
  '.............................O..........................',
  '.............................O...O...O..................',
  '.............Z.......O...O..KMK..O...O..................',
  '.................Z.R.O...O..KMK.KMK.KMK..O..............',
  '......R...Z.......OKKMK.KMK.MMM.KMK.KMK..O..............',
  '......OK.........OO.KMK.KMK.MMM.MMM.MMM.KMK............R',
  '......OOK.......OOK.MMM.MMR.MMR.MMR.MMM.KMK..O.........O',
  '......KOO.....OOOOK.MMR.MMMKMMMKMMMKMMR.MMM..O........OO',
  '......KOOOKKKOOOKMK.MMMKMMMKMMMKMMMKMMMKMMR.KMK.......OO',
  '.....KKKKKKMKKKKMMRKMMMKMMMMMMMMMMMKMMMKMMMKMMM.......OO',
  '.....KMMMMKKKKKKMMMKMMMMMMKMMMMMMMMMMMMKMMMKMMMK.....KYO',
  '....KKKKKTKK2YYYMMMMMMMMMMKMMMKMMMKMMMMMMMMMMMMM...KKIYY',
  '..KKKKKKKKKKKYYKMMKMMMKMMMKKKKKKKKKMMMMMMMMKMMKMKK.MKYYY',
  'KKKLLLLLLLLLKYYKMMKMMMKKKKKKK.I..TKKKKKMMMMKMMMMMMKKMMYY',
  'KKLLLLLLLLLLKYYMMMKKKKKKKIIIIIIIIIZIIIKKKKKMMMMMKMKRKYYY',
  '.KLLLLLLLLLLKYKMMMMMTIIIIIIIIIIIIIIZIIIII.KMMKMMMMMYYYYK',
  '..KKKKKKKKKKJYKKKKKKKZIIIIIIIIIIIIIIZIIKIIKKKKKKMMMYYYYY',
  '..TJJTJJTJJTJJKIYYYYKIZKKIIIIIIIIIIIKZKIKKK....KRMMKYYYK',
  '..TJJTJJTJJTJJKYYYYKIIIZYKIIIIIIIIIKZIIIIIYKKKKKKKKKYYYK',
  '..JJJJJJJJJ22JJYYYYKIIIIZYKYYYIYYYKZIIIIIIIYKYYYKYYYYYK.',
  '...JJJJJJJJ2JJYYYYKKIIIZIIKYYYYYYYZIIIIIIIIIKRYYYYYYYK..',
  '...JTJJTJJTJJJKYKKKIIIZIIYKYYYYYYYKYIIIIIIIYKYYYYYYYYK..',
  '....TJJTJJTJJ..KYYYIIZIIYYYKYYYYYKYYYIIIIIYYYKYYYYYYK...',
  '....KKKKKKKKK...KYYYYIZZYYKYYYLYYYKYYYYIYYYYKYYYYYYK....',
  '...KKYYYYYYYKK..KYYYYYYYZYKLLLLLLLKYYYYYYYYYKYYYYYYK....',
  '...KYYYYYYYYYK..KYYYYYYYYYKLLLLLLLKYYYYYYYYYKYYYYYKK....',
  '....KKKMKKKKK....KYYYYYYYKLLLLLLLLLKYYYYYYYKYYYYKKK.....',
  '.......MMK......KYYYYYKKKLLLLLLLLLLLKYYYYYKYYYYYK.......',
  '......KMK.......KIIYYYKLLLLLLLLLLLLLKIIYYYKYYYYKK.......',
  '......K.........KIIYYYKKKKKKKKLKKKKKKIIYYYKKYKKK........',
  '................KIIYYYKVVVK...K..KVVKIIYYYK.K...........',
  '................KIIYYYKVVVK......KVVKIIYYYK.............',
  '................KYYYYYKVVVK......KVVKYYYYYK.............',
  '................KYYYYYKVVVK......KVVKYYYYYK.............',
  '................KYYYYYKVVVK......KVVKYYYYYK.............',
  '................KYYYYYKVVVK......KVVKYYYYYK.............',
  '................KYYYYYK.............KYYYYYK.............',
  '...............KYYYYYYYK...........KYYYYYYYK............',
  '...............CCCCCCCCC...........CCCCCCCCC............',
  '................C.KCK.C.............C.KCK.C.............',
];

// ---------------------------------------------------------------- PORTRAITS (16x16)
// Front-facing HUD portraits: the samurai and Raiju.
export const HERO_PORTRAIT = [
  '.......KHK......',
  '......KHHHK.....',
  '....KNNNNNNNK...',
  '..KHHHHHHHHHHR..',
  '..KNNNNNNNNNNK..',
  '.....USSSSU.....',
  '.....USSSSU.....',
  '.....UKSSKU.....',
  '.....UESSEU.....',
  '.....USSDSU.....',
  '.....KSDSSK.....',
  '.....KSKKKK.....',
  '................',
  '...KBBBXXBBBK...',
  '...KBBBBBBBBK...',
  '...KBBBBBBBBK...',
];

export const KAIJU_PORTRAIT = [
  'KKK.K..M..K...KK',
  'KRKKMK.MM.MK.KKR',
  'KKOKKMKKKKMMKKOK',
  '.KKOKKKMMMKKKOKK',
  '..KKOKMMKMMKOKK.',
  '..KKKKKKYKKKKKK.',
  '..KMKKYYYYYKKMK.',
  '..KMKKYYYYYKKMK.',
  '.KMMKT2KYT2KKMMK',
  '..KKK22YY22KYKK.',
  '..KMKYYYYYYYKMK.',
  '..KMKYKKKKYYKMK.',
  '...KKKKLLKYKKK..',
  '....KKTLLTKKK...',
  '.....KTKKTKK....',
  '........K.......',
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
  samurai: {
    idle: [SAMURAI_IDLE_A, SAMURAI_IDLE_B],
    run: [SAMURAI_RUN_A, SAMURAI_RUN_B],
    jump: SAMURAI_JUMP,
    slash: SAMURAI_SLASH,
    heavy: SAMURAI_HEAVY,
    hurt: SAMURAI_HURT,
  },
  raiju: {
    closed: RAIJU_CLOSED,
    open: RAIJU_OPEN,
  },
  portraits: {
    hero: HERO_PORTRAIT,
    kaiju: KAIJU_PORTRAIT,
  },
  lantern: LANTERN,
};

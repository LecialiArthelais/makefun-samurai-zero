// Raster art assets: the two GPT-generated samurai (blue AO, red AKA),
// their HUD portraits, the four attack-effect sheets (slash arc,
// fireball, lightning, dash), and the three generated kaiju (fire
// KAGUTSUCHI, sea UMIBOZU, dragon SANRYU). All live under game/assets/,
// so they pass the kit's references gate (files inside game/ only, no
// network). Each entry is an HTMLImageElement, or null when the file
// failed to load — the renderer falls back to the code-drawn pixel
// sprites in that case, so the game never depends on an asset being present.
const FILES = {
  samuraiBlue: 'assets/samurai-blue.png',
  samuraiRed: 'assets/samurai-red.png',
  portraitBlue: 'assets/portrait-blue.png',
  portraitRed: 'assets/portrait-red.png',
  fxSlash: 'assets/fx-slash.png',
  fxFireball: 'assets/fx-fireball.png',
  fxLightning: 'assets/fx-lightning.png',
  fxDash: 'assets/fx-dash.png',
  kaijuFire: 'assets/kaiju-fire.png',
  kaijuSea: 'assets/kaiju-sea.png',
  kaijuDragon: 'assets/kaiju-dragon.png',
};

const TIMEOUT_MS = 5000;

function loadOne(src) {
  return new Promise((resolve) => {
    const img = new Image();
    let done = false;
    const finish = (value) => {
      if (!done) {
        done = true;
        resolve(value);
      }
    };
    const timer = window.setTimeout(() => finish(null), TIMEOUT_MS);
    img.onload = () => {
      window.clearTimeout(timer);
      finish(img);
    };
    img.onerror = () => {
      window.clearTimeout(timer);
      finish(null);
    };
    img.src = src;
  });
}

/** Load every asset in parallel; never rejects. */
export async function loadAssets() {
  const entries = await Promise.all(
    Object.entries(FILES).map(async ([key, src]) => [key, await loadOne(src)]),
  );
  return Object.fromEntries(entries);
}

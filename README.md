# SAMURAI ZERO

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/LecialiArthelais/makefun-samurai-zero/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/LecialiArthelais/makefun-samurai-zero/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

A lone samurai — a ronin with nothing left to lose — duels **a kaiju**, in a burning castle town at
dusk. Three minutes on the clock, three boss phases, one blade. Named for the moment after ruin, when a fighter starts from zero.

A make.fun **best-game-01** entry. The game is plain static files — no
library, no network request. The two samurai, the three kaiju, the four
attack effects and the Edo dusk backdrop are raster art in `game/assets/`;
every sound is synthesised with Web Audio. If a raster asset fails to load,
the game falls back to the code-drawn pixel sprites.

## Choose your samurai, your kaiju, your difficulty

- **Hayate, the Blue Samurai** — calm as the moon, a blade of light. (Hayate 疾風 = swift wind, gale)
- **Enjin, the Red Samurai** — burning like fire, a blade of embers. (Enjin 炎刃 = flame blade)
- **Pick your kaiju** (W / S): **KAGUTSUCHI, the Fire Kaiju** (claws and
  fireballs), **UMIBOZU, the Sea Kaiju** (rams and tsunamis), or **SANRYU,
  the Three-Headed Dragon** (bites and gales). No longer random — the duel
  is the one you choose.
- **Pick your difficulty** (1 / 2 / 3): **Easy** (65% win chance — learn the
  duel), **Medium** (45% — a fair duel), **Hard** (35% — no mercy). Each
  scales the ronin's HP, the kaiju's HP and damage, how fast it attacks,
  and how fast it moves.

## Play

Serve it and open http://localhost:8080:

```sh
node serve.ts
```

| Key | Action |
| --- | ------ |
| A / D or ← / → | Move (smooth acceleration — the ronin has weight) |
| Space / W / ↑ | Jump (coyote time + input buffer; release early for a short hop) |
| J | Katana slash |
| K | Heavy iaido draw (slower, harder) |
| L | Fireball (costs 1 energy cell; landing hits charge cells) |
| Shift / S | Dash (brief invulnerability) |
| Esc / P | Pause |
| Enter | Start / restart |
| M | Mute |

On the select screen: **A / D** chooses the samurai, **W / S** chooses the
kaiju, **1 / 2 / 3** chooses the difficulty, **Enter** starts the fight.

## The duel

- **The boss, phase 1** — claw swipes, telegraphed lightning strikes, stomp
  shockwaves you jump over. Each kaiju fights with its own attack set.
- **Phase 2** (below 800 HP) — faster, double lightning, leap slams.
- **Phase 3** (below 400 HP) — the storm rages: five-bolt storm calls, swipe
  combos, a crackling aura.
- **Win** by felling Raiju before the 3:00 clock runs out. **Lose** if your HP
  reaches 0 or time runs out. Score is damage dealt, plus a time bonus and an
  untouched bonus on victory.
- **Combo** — consecutive hits within 2.5 seconds build a chain: every 5 hits
  raises the score multiplier (up to x3). Getting hit, or letting the chain
  run out, breaks it. The HUD shows the combo and the time left to keep it.
- **Two samurai, two rhythms** — Hayate (blue) is swift: fast slashes (7 dmg,
  0.26s), lighter heavy (20). Enjin (red) is mighty: slow slashes (10 dmg,
  0.38s), heavier heavy (26). Slash DPS is near-equal, so the choice is
  about feel, not power.
- Every attack is telegraphed — ground markers before lightning, a rearing
  head before the swipe, a crouch before the leap — so every hit is dodgeable.

## Structure

```
game/
  index.html        the page: a full-screen canvas
  assets/           raster art: the two samurai, their portraits, the three
                    kaiju (fire KAGUTSUCHI, sea UMIBOZU, dragon SANRYU),
                    the four attack effects (slash arc, fireball, lightning,
                    dash); all PNG with transparency, white background removed
  src/
    config.js       every tuning number and colour
    random.js       one seeded generator (SplitMix64) for all gameplay chance
    sprites.js      pixel-art matrices: the kaiju, lanterns, HUD portraits
                    (fallback when a raster asset is missing)
    assets.js       loads the raster art before the first frame
    world.js        the rules: samurai, the boss machine, lightning,
                    shockwaves, particles, score, the clock
    input.js        named keyboard actions, edges, held state
    audio.js        synthesised SFX + a taiko-and-pluck music loop (Web Audio)
    render.js       the Edo dusk, the actors, combat feedback, HUD, screens
    shots.js        screenshot scenes: the autopilot plays the real rules
    main.js         boot, the fixed-step loop, hit-stop, screens
main.ts             the entrypoint: copies game/ + screenshots/ and writes
                    the dossier with the vendored make.fun library
shots.json          the four screenshots (fight, select, victory, defeat)
```

## Screenshots

The four screenshots are real renders of the game's own code, staged by the
autopilot in `shots.js` (`?shot=fight|select|victory|defeat&seed=1`).

## License

MIT. See [LICENSE](LICENSE).

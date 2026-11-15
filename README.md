# SAMURAI ZERO

A lone samurai — a ronin with nothing left to lose — duels **Raiju, the thunder kaiju**, in a burning castle town at
dusk. Three minutes on the clock, three boss phases, one blade. Named for the moment after ruin, when a fighter starts from zero.

A make.fun **best-game-01** entry. The game is plain static files — no
library, no network request, no assets: every sprite is pixel art drawn in
code, every sound is synthesised with Web Audio.

## Play

Serve it and open http://localhost:8080:

```sh
node serve.ts
```

| Key | Action |
| --- | ------ |
| A / D or ← / → | Move |
| Space / W / ↑ | Jump (coyote time + input buffer) |
| J | Katana slash |
| K | Heavy iaido draw (slower, harder) |
| L | Moonlight Wave — a screen-wide blade of light (costs 1 energy cell; landing hits charge cells) |
| Shift / S | Dash (brief invulnerability) |
| Esc / P | Pause |
| Enter | Start / restart |
| M | Mute |

## The duel

- **Raiju, phase 1** — claw swipes, telegraphed lightning strikes, stomp
  shockwaves you jump over.
- **Phase 2** (below 700 HP) — faster, double lightning, leap slams.
- **Phase 3** (below 350 HP) — the storm rages: five-bolt storm calls, swipe
  combos, a crackling aura.
- **Win** by felling Raiju before the 3:00 clock runs out. **Lose** if your HP
  reaches 0 or time runs out. Score is damage dealt, plus a time bonus and an
  untouched bonus on victory.
- Every attack is telegraphed — ground markers before lightning, a rearing
  head before the swipe, a crouch before the leap — so every hit is dodgeable.

## Structure

```
game/
  index.html        the page: a full-screen canvas
  src/
    config.js       every tuning number and colour
    random.js       one seeded generator (SplitMix64) for all gameplay chance
    sprites.js      pixel-art matrices: the samurai, Raiju, lanterns
    world.js        the rules: samurai, Raiju's boss machine, lightning,
                    shockwaves, particles, score, the clock
    input.js        named keyboard actions, edges, held state
    audio.js        synthesised SFX + a taiko-and-pluck music loop (Web Audio)
    render.js       the Edo dusk, the actors, combat feedback, HUD, screens
    shots.js        screenshot scenes: the autopilot plays the real rules
    main.js         boot, the fixed-step loop, hit-stop, screens
main.ts             the entrypoint: copies game/ + screenshots/ and writes
                    the dossier with the vendored make.fun library
shots.json          the four screenshots (fight, title, victory, defeat)
```

## Screenshots

The four screenshots are real renders of the game's own code, staged by the
autopilot in `shots.js` (`?shot=fight|title|victory|defeat&seed=1`).

## License

MIT. See [LICENSE](LICENSE).

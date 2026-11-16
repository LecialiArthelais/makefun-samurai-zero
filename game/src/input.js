// Named actions over the keyboard (see input-systems skill): every control is
// one action, edges are true only on the frame the key went down, and held
// state is separate from pressed state, so the world never has to guess.
//   A / D or Left / Right — move      Space / W / Up — jump
//   J — katana slash                  K — heavy iaido draw
//   L — Moonlight Wave (special)      Shift / S — dash
//   Esc / P — pause                   Enter — confirm / restart
//   M — mute
// Mouse: clicking a menu button counts as confirm. The canvas also takes focus
// on click so the keys always land here.

const KEYMAP = {
  KeyA: 'left', ArrowLeft: 'left',
  KeyD: 'right', ArrowRight: 'right',
  Space: 'jump', KeyW: 'jump', ArrowUp: 'jump',
  KeyJ: 'slash',
  KeyK: 'heavy',
  KeyL: 'special',
  ShiftLeft: 'dash', ShiftRight: 'dash', KeyS: 'dash',
  Escape: 'pause', KeyP: 'pause',
  Enter: 'confirm',
  KeyM: 'mute',
  Digit1: 'diff1', Digit2: 'diff2', Digit3: 'diff3',
};

export function createInput(canvas, onFirstGesture) {
  const held = { left: false, right: false, jump: false };
  const pressed = { jump: false, slash: false, heavy: false, special: false, dash: false, pause: false, confirm: false, mute: false, diff1: false, diff2: false, diff3: false };
  let gestured = false;

  function gesture() {
    if (gestured) return;
    gestured = true;
    if (onFirstGesture) onFirstGesture();
  }

  function keyDown(event) {
    const action = KEYMAP[event.code];
    if (!action) return;
    if (event.code === 'Space' || event.code === 'ArrowUp' || event.code === 'ArrowDown') event.preventDefault();
    gesture();
    if (action === 'left' || action === 'right' || action === 'jump') {
      if (!held[action]) held[action] = true;
      if (action === 'jump' && !event.repeat) pressed.jump = true;
      return;
    }
    if (!event.repeat) pressed[action] = true;
  }

  function keyUp(event) {
    const action = KEYMAP[event.code];
    if (!action) return;
    if (action === 'left' || action === 'right' || action === 'jump') held[action] = false;
  }

  function pointerDown() {
    gesture();
    canvas.focus();
  }

  window.addEventListener('keydown', keyDown);
  window.addEventListener('keyup', keyUp);
  canvas.addEventListener('pointerdown', pointerDown);
  canvas.tabIndex = 0;

  /** The frame's input for the world. Edges are consumed: each is true once.
   * `jumpHeld` stays true while the jump key is down (variable jump height). */
  function read() {
    const move = (held.right ? 1 : 0) - (held.left ? 1 : 0);
    const out = {
      move,
      jump: pressed.jump, jumpHeld: held.jump,
      slash: pressed.slash, heavy: pressed.heavy,
      special: pressed.special, dash: pressed.dash,
      pause: pressed.pause, confirm: pressed.confirm, mute: pressed.mute,
      diff1: pressed.diff1, diff2: pressed.diff2, diff3: pressed.diff3,
    };
    for (const key of Object.keys(pressed)) pressed[key] = false;
    return out;
  }

  /** Peek at confirm/pause without consuming the rest (for menus). */
  function peek() {
    return { pause: pressed.pause, confirm: pressed.confirm, mute: pressed.mute };
  }

  function destroy() {
    window.removeEventListener('keydown', keyDown);
    window.removeEventListener('keyup', keyUp);
    canvas.removeEventListener('pointerdown', pointerDown);
  }

  return { read, peek, destroy };
}

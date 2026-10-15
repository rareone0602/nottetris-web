/* Keyboard and touch input for the browser game. Held keys, held touch zones and short taps from
   keyboard-activated buttons are merged into one set of actions, which the simulation reads as its controls. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.NotTetrisInput = factory();
})(typeof globalThis === 'object' ? globalThis : this, function () {
  'use strict';

  const KEY_ACTIONS = {
    ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
    ArrowDown: 'down', KeyS: 'down', Space: 'down',
    ArrowUp: 'clockwise', KeyX: 'clockwise', KeyZ: 'counterclockwise', KeyW: 'counterclockwise'
  };
  const TAP_MILLISECONDS = 150;

  class Controls {
    constructor({ onChange = () => {}, schedule = (callback, delay) => setTimeout(callback, delay) } = {}) {
      this.onChange = onChange;
      this.schedule = schedule;
      this.keys = new Set();
      this.pointers = new Map();
      this.taps = new Set();
      this.tapTokens = new Map();
    }

    static actionForKey(code) {
      return KEY_ACTIONS[code] || null;
    }

    actions() {
      return new Set([...Array.from(this.keys, code => KEY_ACTIONS[code]), ...this.pointers.values(), ...this.taps]);
    }

    pressKey(code) {
      if (!KEY_ACTIONS[code] || this.keys.has(code)) return Boolean(KEY_ACTIONS[code]);
      this.keys.add(code);
      this.changed();
      return true;
    }

    releaseKey(code) {
      if (this.keys.delete(code)) this.changed();
    }

    /* A pointer holds one action at a time. Moving a held pointer onto another zone switches its action, so a
       thumb can roll from one control to the next without lifting. A null action holds nothing. */
    holdPointer(pointerId, action) {
      if (!action) return this.releasePointer(pointerId);
      if (this.pointers.get(pointerId) === action) return;
      this.pointers.set(pointerId, action);
      this.changed();
    }

    releasePointer(pointerId) {
      if (this.pointers.delete(pointerId)) this.changed();
    }

    /* Holds an action briefly. A later tap of the same action restarts its time rather than sharing it. */
    tap(action) {
      const token = {};
      this.tapTokens.set(action, token);
      this.taps.add(action);
      this.changed();
      this.schedule(() => {
        if (this.tapTokens.get(action) !== token) return;
        this.tapTokens.delete(action);
        if (this.taps.delete(action)) this.changed();
      }, TAP_MILLISECONDS);
    }

    releaseAll() {
      this.keys.clear();
      this.pointers.clear();
      this.taps.clear();
      this.tapTokens.clear();
      this.changed();
    }

    changed() {
      this.onChange(this.actions());
    }
  }

  return { Controls, KEY_ACTIONS, TAP_MILLISECONDS };
});

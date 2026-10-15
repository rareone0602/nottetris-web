const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const Core = require('./core.js');
const Matter = require('./vendor/matter.min.js');

function eventTarget(properties = {}) {
  const listeners = new Map();
  return Object.assign({
    addEventListener(type, listener) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(listener);
    },
    dispatch(type, properties = {}) {
      const event = Object.assign({
        target: this,
        button: 0,
        pointerType: 'touch',
        detail: 1,
        repeat: false,
        defaultPrevented: false,
        preventDefault() { this.defaultPrevented = true; }
      }, properties);
      for (const listener of listeners.get(type) || []) listener(event);
      return event;
    }
  }, properties);
}

function loadInterface({ storage = {}, storageDisabled = false, mobile = false, pixelRatio = 1 } = {}) {
  const elements = new Map();
  const canvasCalls = [];
  let focused = null;
  let scrolls = 0;
  const scrolledElements = [];
  let now = 0;
  let timerId = 0;
  const timers = new Map();
  const frames = [];
  const values = new Map(Object.entries(storage));
  const games = [];
  const drawingContext = new Proxy({}, {
    get(target, name) {
      if (!(name in target)) target[name] = (...args) => { canvasCalls.push({ name, args }); };
      return target[name];
    },
    set(target, name, value) { target[name] = value; return true; }
  });

  function element(id) {
    if (elements.has(id)) return elements.get(id);
    const attributes = new Map();
    const classes = new Set();
    const item = eventTarget({
      id,
      tagName: id === 'pace' ? 'SELECT' : ['sound', 'patterns'].includes(id) ? 'INPUT' : 'DIV',
      dataset: {},
      style: {},
      hidden: id === 'settings',
      checked: false,
      disabled: false,
      value: '',
      classList: {
        toggle(name, enabled) { if (enabled) classes.add(name); else classes.delete(name); },
        contains(name) { return classes.has(name); }
      },
      setAttribute(name, value) { attributes.set(name, String(value)); },
      getAttribute(name) { return attributes.get(name) ?? null; },
      focus() { focused = id; },
      scrollIntoView() { scrolls++; scrolledElements.push(id); },
      setPointerCapture(pointerId) { this.capturedPointer = pointerId; },
      getContext() { return drawingContext; }
    });
    let content = '';
    Object.defineProperty(item, 'textContent', { get: () => content, set: value => { content = String(value); } });
    elements.set(id, item);
    return item;
  }

  const actions = ['left', 'down', 'right', 'counterclockwise', 'clockwise'];
  const controls = actions.map(action => {
    const button = element('control-' + action);
    button.tagName = 'BUTTON';
    button.dataset.action = action;
    return button;
  });
  const document = eventTarget({
    hidden: false,
    getElementById: element,
    querySelectorAll: selector => selector === '[data-action]' ? controls : [],
    querySelector: selector => element(selector),
  });
  const window = eventTarget({
    devicePixelRatio: pixelRatio,
    matchMedia: () => ({ matches: mobile }),
    requestAnimationFrame: callback => { frames.push(callback); },
    NotTetris: {
      ...Core,
      Game: class extends Core.Game {
        constructor(options) { super(options); games.push(this); }
      }
    }
  });
  const localStorage = {
    getItem(key) {
      if (storageDisabled) throw new Error('Storage is disabled.');
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      if (storageDisabled) throw new Error('Storage is disabled.');
      values.set(key, String(value));
    }
  };
  const sandbox = {
    window, document, localStorage, Matter,
    setTimeout(callback, delay = 0) {
      const id = ++timerId;
      timers.set(id, { callback, time: now + delay });
      return id;
    },
    clearTimeout(id) { timers.delete(id); }
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'game.js'), 'utf8'), sandbox, { filename: 'game.js' });
  return {
    game: games[0], window, document, element, controls, values, canvasCalls, scrolledElements,
    get focused() { return focused; },
    get scrolls() { return scrolls; },
    button(action) { return controls.find(button => button.dataset.action === action); },
    key(type, code, properties = {}) {
      return document.dispatch(type, { code, target: element('board-wrap'), ...properties });
    },
    frame(time) {
      assert.ok(frames.length, 'The animation loop should schedule its next frame.');
      frames.shift()(time);
    },
    advanceTimers(milliseconds) {
      now += milliseconds;
      for (const [id, timer] of timers) {
        if (timer.time <= now) { timers.delete(id); timer.callback(); }
      }
    },
    start() { element('play').dispatch('click'); }
  };
}

test('the UI initializes a ready game, draws canvases, and starts a playable game', () => {
  const ui = loadInterface({ mobile: true, pixelRatio: 4 });
  assert.equal(ui.game.state, 'ready');
  assert.equal(ui.element('play').textContent, 'play');
  assert.equal(ui.element('board').width, 1008);
  assert.equal(ui.element('board').height, 1800);
  assert.match(ui.element('next').getAttribute('aria-label'), /^next piece: [IJLOSTZ]$/);
  assert.ok(ui.canvasCalls.some(call => call.name === 'fill'));
  assert.ok(ui.controls.every(button => button.disabled));
  ui.start();
  assert.equal(ui.game.state, 'playing');
  assert.ok(ui.game.active);
  assert.equal(ui.element('play').textContent, 'pause');
  assert.equal(ui.element('board-message').hidden, true);
  assert.equal(ui.element('restart').hidden, false);
  assert.ok(ui.controls.every(button => !button.disabled));
  assert.equal(ui.focused, 'board-wrap');
  assert.equal(ui.scrolls, 1);
  ui.frame(100);
  ui.frame(116.7);
  assert.ok(ui.game.seconds > 0);
});

test('keyboard aliases stay held until all corresponding keys are released', () => {
  const ui = loadInterface();
  ui.start();
  const left = ui.key('keydown', 'ArrowLeft');
  assert.equal(left.defaultPrevented, true);
  ui.key('keydown', 'KeyA');
  ui.key('keydown', 'KeyX');
  assert.equal(ui.game.controls.left, true);
  assert.equal(ui.game.controls.clockwise, true);
  ui.key('keyup', 'ArrowLeft');
  assert.equal(ui.game.controls.left, true);
  ui.key('keyup', 'KeyA');
  assert.equal(ui.game.controls.left, undefined);
  ui.key('keyup', 'KeyX');
  assert.deepEqual(Object.keys(ui.game.controls), []);
});

test('keyboard input leaves form fields, modifier shortcuts, and focused buttons available', () => {
  const ui = loadInterface();
  ui.start();
  const ignored = [
    ui.key('keydown', 'ArrowLeft', { target: { tagName: 'SELECT' } }),
    ui.key('keydown', 'ArrowRight', { target: { tagName: 'INPUT' } }),
    ui.key('keydown', 'KeyX', { target: { tagName: 'TEXTAREA' } }),
    ui.key('keydown', 'KeyA', { ctrlKey: true }),
    ui.key('keydown', 'KeyD', { metaKey: true }),
    ui.key('keydown', 'KeyZ', { altKey: true }),
    ui.key('keydown', 'Space', { target: { tagName: 'BUTTON' } }),
    ui.key('keydown', 'Space', { target: { tagName: 'A' } })
  ];
  assert.ok(ignored.every(event => !event.defaultPrevented));
  assert.deepEqual(Object.keys(ui.game.controls), []);
});

test('two touch pointers combine actions and cancellation releases only its own pointer', () => {
  const ui = loadInterface();
  ui.start();
  const left = ui.button('left');
  const turn = ui.button('clockwise');
  const event = left.dispatch('pointerdown', { pointerId: 1 });
  turn.dispatch('pointerdown', { pointerId: 2 });
  assert.equal(event.defaultPrevented, true);
  assert.equal(left.capturedPointer, 1);
  assert.equal(ui.game.controls.left, true);
  assert.equal(ui.game.controls.clockwise, true);
  assert.equal(left.getAttribute('aria-pressed'), 'true');
  assert.equal(turn.classList.contains('is-held'), true);
  left.dispatch('pointercancel', { pointerId: 1 });
  assert.equal(ui.game.controls.left, undefined);
  assert.equal(ui.game.controls.clockwise, true);
  turn.dispatch('lostpointercapture', { pointerId: 2 });
  assert.deepEqual(Object.keys(ui.game.controls), []);
  assert.equal(turn.getAttribute('aria-pressed'), 'false');
  assert.equal(turn.classList.contains('is-held'), false);
});

test('keyboard and touch may hold the same action independently', () => {
  const ui = loadInterface();
  ui.start();
  ui.key('keydown', 'ArrowDown');
  ui.button('down').dispatch('pointerdown', { pointerId: 1 });
  ui.key('keyup', 'ArrowDown');
  assert.equal(ui.game.controls.down, true);
  ui.button('down').dispatch('pointerup', { pointerId: 1 });
  assert.deepEqual(Object.keys(ui.game.controls), []);
  const rightClick = ui.button('left').dispatch('pointerdown', { pointerId: 2, pointerType: 'mouse', button: 2 });
  assert.equal(rightClick.defaultPrevented, false);
  assert.deepEqual(Object.keys(ui.game.controls), []);
});

test('keyboard-activated control buttons produce a short action and physical clicks do not repeat it', () => {
  const ui = loadInterface();
  ui.start();
  ui.button('counterclockwise').dispatch('click', { detail: 0 });
  assert.equal(ui.game.controls.counterclockwise, true);
  ui.advanceTimers(149);
  assert.equal(ui.game.controls.counterclockwise, true);
  ui.advanceTimers(1);
  assert.equal(ui.game.controls.counterclockwise, undefined);
  ui.button('counterclockwise').dispatch('click', { detail: 1 });
  assert.deepEqual(Object.keys(ui.game.controls), []);
});

test('pause and resume clear keyboard and touch input without restarting the current game', () => {
  const ui = loadInterface();
  ui.start();
  const active = ui.game.active;
  ui.key('keydown', 'ArrowLeft');
  ui.button('down').dispatch('pointerdown', { pointerId: 1 });
  ui.key('keydown', 'KeyP');
  assert.equal(ui.game.state, 'paused');
  assert.deepEqual(Object.keys(ui.game.controls), []);
  assert.equal(ui.element('play').textContent, 'resume');
  assert.equal(ui.element('message-title').textContent, 'paused');
  ui.key('keydown', 'KeyP', { repeat: true });
  assert.equal(ui.game.state, 'paused');
  ui.key('keydown', 'Escape');
  assert.equal(ui.game.state, 'playing');
  assert.equal(ui.game.active, active);
  ui.key('keyup', 'ArrowDown');
  assert.deepEqual(Object.keys(ui.game.controls), []);
  ui.key('keydown', 'KeyX');
  assert.deepEqual(Object.keys(ui.game.controls), ['clockwise']);
  ui.key('keyup', 'KeyX');
  assert.deepEqual(Object.keys(ui.game.controls), []);
});

test('blur and hiding the document pause play and discard held input', () => {
  const ui = loadInterface();
  ui.start();
  ui.key('keydown', 'ArrowRight');
  ui.window.dispatch('blur');
  assert.equal(ui.game.state, 'paused');
  assert.deepEqual(Object.keys(ui.game.controls), []);
  ui.element('play').dispatch('click');
  ui.button('left').dispatch('pointerdown', { pointerId: 2 });
  ui.document.hidden = true;
  ui.document.dispatch('visibilitychange');
  assert.equal(ui.game.state, 'paused');
  assert.deepEqual(Object.keys(ui.game.controls), []);
  ui.document.hidden = false;
  ui.document.dispatch('visibilitychange');
  assert.equal(ui.game.state, 'paused');
});

test('settings pause play and speed applies on restart while display preferences save immediately', () => {
  const ui = loadInterface();
  ui.start();
  const originalPiece = ui.game.active;
  ui.key('keydown', 'ArrowLeft');
  ui.element('settings-button').dispatch('click');
  assert.equal(ui.game.state, 'paused');
  assert.deepEqual(Object.keys(ui.game.controls), []);
  assert.equal(ui.element('settings').hidden, false);
  assert.equal(ui.element('settings-button').getAttribute('aria-expanded'), 'true');
  ui.element('pace').value = 'gentle';
  ui.element('pace').dispatch('change');
  assert.equal(ui.game.pace, 'original');
  assert.equal(ui.game.active, originalPiece);
  ui.element('patterns').checked = true;
  ui.element('patterns').dispatch('change');
  ui.element('sound').checked = true;
  ui.element('sound').dispatch('change');
  assert.equal(ui.values.get('not-tetris.patterns'), 'true');
  assert.equal(ui.values.get('not-tetris.sound'), 'true');
  ui.element('restart').dispatch('click');
  assert.equal(ui.game.state, 'playing');
  assert.equal(ui.game.pace, 'gentle');
  assert.notEqual(ui.game.active, originalPiece);
  assert.equal(ui.element('settings').hidden, true);
  assert.equal(ui.element('settings-button').getAttribute('aria-expanded'), 'false');
  assert.equal(ui.element('pace-note').textContent, 'clear lines · gentle');
});

test('saved settings initialize the game and ready-state speed changes apply immediately', () => {
  const ui = loadInterface({ storage: {
    'not-tetris.pace': 'gentle',
    'not-tetris.patterns': 'true',
    'not-tetris.best.gentle': '1234'
  } });
  assert.equal(ui.game.pace, 'gentle');
  assert.equal(ui.element('patterns').checked, true);
  assert.equal(ui.element('best').textContent, '1,234');
  ui.element('pace').value = 'original';
  ui.element('pace').dispatch('change');
  assert.equal(ui.game.state, 'ready');
  assert.equal(ui.game.pace, 'original');
  assert.equal(ui.element('pace-note').textContent, 'clear lines · original');
  assert.equal(ui.values.get('not-tetris.pace'), 'original');
});

test('blocked storage and malformed saved values leave the game playable', () => {
  const ui = loadInterface({ storageDisabled: true });
  ui.start();
  ui.element('patterns').checked = true;
  ui.element('patterns').dispatch('change');
  ui.game.score = 300;
  ui.game.onEvent({ type: 'clear', count: 2, points: 300 });
  assert.equal(ui.game.state, 'playing');
  assert.equal(ui.element('score').textContent, '300');
  assert.equal(ui.element('best').textContent, '300');
  assert.match(ui.element('announcer').textContent, /2 rows cleared\. 300 points/);
  ui.advanceTimers(2400);
  assert.equal(ui.element('score-note').textContent, '');
  const invalid = loadInterface({ storage: {
    'not-tetris.pace': 'invalid',
    'not-tetris.best.original': 'NaN'
  } });
  assert.equal(invalid.game.pace, 'original');
  assert.equal(invalid.element('best').textContent, '0');
});

test('game over releases every input and presents the replay action', () => {
  const ui = loadInterface();
  ui.start();
  ui.key('keydown', 'ArrowLeft');
  ui.button('down').dispatch('pointerdown', { pointerId: 1 });
  ui.game.state = 'over';
  ui.game.score = 200;
  ui.game.onEvent({ type: 'over', score: 200 });
  assert.deepEqual(Object.keys(ui.game.controls), []);
  assert.equal(ui.element('play').textContent, 'play again');
  assert.ok(ui.controls.every(button => button.disabled));
  assert.match(ui.element('announcer').textContent, /no room left\. score 200/);
  ui.key('keydown', 'Enter');
  assert.equal(ui.game.state, 'playing');
  assert.equal(ui.game.score, 0);
});

test('the mobile pause button starts, pauses, resumes and replays beside the touch controls', () => {
  const ui = loadInterface({ mobile: true });
  const pause = ui.element('touch-pause');
  assert.equal(pause.textContent, 'play');
  pause.dispatch('click');
  const active = ui.game.active;
  assert.equal(ui.game.state, 'playing');
  assert.equal(pause.textContent, 'pause');
  assert.equal(ui.scrolledElements.at(-1), '.play-layout');
  ui.button('left').dispatch('pointerdown', { pointerId: 1 });
  pause.dispatch('click');
  assert.equal(ui.game.state, 'paused');
  assert.equal(pause.textContent, 'resume');
  assert.deepEqual(Object.keys(ui.game.controls), []);
  pause.dispatch('click');
  assert.equal(ui.game.state, 'playing');
  assert.equal(ui.game.active, active);
  assert.equal(pause.textContent, 'pause');
  ui.game.state = 'over';
  ui.game.score = 100;
  ui.game.onEvent({ type: 'over', score: 100 });
  assert.equal(pause.textContent, 'play again');
  pause.dispatch('click');
  assert.equal(ui.game.state, 'playing');
  assert.notEqual(ui.game.active, active);
  assert.equal(ui.game.score, 0);
  assert.equal(pause.textContent, 'pause');
});

// These tests exercise event wiring and drawing calls in a Node VM. They do not verify browser rendering.

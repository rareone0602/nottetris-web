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
  if (mobile) element('html').classList.add('touch');
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
      tagName: id === 'pace' ? 'SELECT' : ['sound', 'letters'].includes(id) ? 'INPUT' : 'DIV',
      dataset: {},
      style: {},
      hidden: id === 'settings',
      checked: false,
      disabled: false,
      value: '',
      classList: {
        add(name) { classes.add(name); },
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
    documentElement: element('html'),
    getElementById: element,
    querySelectorAll: selector => selector === '[data-action]' ? controls : [],
    querySelector: selector => element(selector),
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
  const window = vm.createContext(eventTarget({
    document, localStorage, Matter,
    devicePixelRatio: pixelRatio,
    matchMedia: query => ({ matches: mobile && !query.includes('reduced-motion') }),
    requestAnimationFrame: callback => { frames.push(callback); },
    NotTetris: {
      ...Core,
      Game: class extends Core.Game {
        constructor(options) { super(options); games.push(this); }
      }
    },
    setTimeout(callback, delay = 0) {
      const id = ++timerId;
      timers.set(id, { callback, time: now + delay });
      return id;
    },
    clearTimeout(id) { timers.delete(id); }
  }));
  window.window = window;
  for (const filename of ['input.js', 'render.js', 'app.js']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, filename), 'utf8'), window, { filename });
  }
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
  assert.equal(ui.element('restart').hidden, true);
  assert.equal(ui.element('pause').hidden, false);
  assert.equal(ui.element('game').classList.contains('is-playing'), true);
  assert.ok(ui.controls.every(button => !button.disabled));
  assert.equal(ui.focused, 'board-wrap');
  assert.equal(ui.scrolls, 1);
  assert.equal(ui.scrolledElements.at(-1), 'board-wrap');
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
  ui.element('letters').checked = true;
  ui.element('letters').dispatch('change');
  ui.element('sound').checked = true;
  ui.element('sound').dispatch('change');
  assert.equal(ui.values.get('not-tetris.letters'), 'true');
  assert.equal(ui.values.get('not-tetris.sound'), 'true');
  ui.element('restart').dispatch('click');
  assert.equal(ui.game.state, 'playing');
  assert.equal(ui.game.pace, 'gentle');
  assert.notEqual(ui.game.active, originalPiece);
  assert.equal(ui.element('settings').hidden, true);
  assert.equal(ui.element('settings-button').getAttribute('aria-expanded'), 'false');
  assert.equal(ui.element('best-label').textContent, 'best, gentle');
});

test('saved settings initialize the game and ready-state speed changes apply immediately', () => {
  const ui = loadInterface({ storage: {
    'not-tetris.pace': 'gentle',
    'not-tetris.letters': 'true',
    'not-tetris.best.gentle': '1234'
  } });
  assert.equal(ui.game.pace, 'gentle');
  assert.equal(ui.element('letters').checked, true);
  assert.equal(ui.element('best').textContent, '1,234');
  assert.equal(ui.element('best-label').textContent, 'best, gentle');
  ui.element('pace').value = 'original';
  ui.element('pace').dispatch('change');
  assert.equal(ui.game.state, 'ready');
  assert.equal(ui.game.pace, 'original');
  assert.equal(ui.element('best-label').textContent, 'best');
  assert.equal(ui.element('best').textContent, '0');
  assert.equal(ui.values.get('not-tetris.pace'), 'original');
});

test('blocked storage and malformed saved values leave the game playable', () => {
  const ui = loadInterface({ storageDisabled: true });
  ui.start();
  ui.element('letters').checked = true;
  ui.element('letters').dispatch('change');
  ui.game.score = 300;
  ui.game.onEvent({ type: 'clear', count: 2, points: 300, rows: [16, 17], level: 0, levelUp: false });
  assert.equal(ui.game.state, 'playing');
  assert.equal(ui.element('score').textContent, '300');
  assert.equal(ui.element('best').textContent, '300');
  assert.match(ui.element('announcer').textContent, /2 rows cleared\. 300 points/);
  assert.equal(ui.element('board-note').hidden, false);
  assert.equal(ui.element('board-note').textContent, '+300\ntwo rows');
  ui.advanceTimers(1800);
  assert.equal(ui.element('board-note').hidden, true);
  assert.equal(ui.element('board-note').textContent, '');
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
  assert.equal(ui.element('message-result').textContent, '200');
  assert.equal(ui.element('message-text').textContent, 'a new best.');
  assert.equal(ui.element('play').disabled, true);
  ui.key('keydown', 'Enter');
  ui.element('play').dispatch('click');
  assert.equal(ui.game.state, 'over');
  ui.advanceTimers(700);
  assert.equal(ui.element('play').disabled, false);
  ui.key('keydown', 'Enter');
  assert.equal(ui.game.state, 'playing');
  assert.equal(ui.game.score, 0);
});

test('Enter on a focused link or button keeps its own meaning', () => {
  const ui = loadInterface();
  const link = ui.key('keydown', 'Enter', { target: { tagName: 'A' } });
  const button = ui.key('keydown', 'Enter', { target: { tagName: 'BUTTON' } });
  assert.equal(link.defaultPrevented, false);
  assert.equal(button.defaultPrevented, false);
  assert.equal(ui.game.state, 'ready');
});

test('a held touch can slide from one control zone to another without lifting', () => {
  const ui = loadInterface({ mobile: true });
  ui.start();
  const nothing = { closest: () => null };
  ui.document.elementFromPoint = x => (x < 50 ? ui.button('left') : x < 100 ? ui.button('right') : nothing);
  ui.button('left').closest = function () { return this; };
  ui.button('right').closest = function () { return this; };
  ui.button('left').dispatch('pointerdown', { pointerId: 3 });
  assert.deepEqual(Object.keys(ui.game.controls), ['left']);
  ui.button('left').dispatch('pointermove', { pointerId: 3, clientX: 75, clientY: 10 });
  assert.deepEqual(Object.keys(ui.game.controls), ['right']);
  ui.button('left').dispatch('pointermove', { pointerId: 3, clientX: 140, clientY: 10 });
  assert.deepEqual(Object.keys(ui.game.controls), ['right']);
  ui.button('left').dispatch('pointermove', { pointerId: 9, clientX: 20, clientY: 10 });
  assert.deepEqual(Object.keys(ui.game.controls), ['right']);
  ui.button('left').dispatch('pointerup', { pointerId: 3 });
  assert.deepEqual(Object.keys(ui.game.controls), []);
});

test('the first touch on a fine-pointer device shows the touch controls', () => {
  const ui = loadInterface();
  const html = ui.element('html');
  assert.equal(ui.element('message-hint').textContent, '← → move · Z X turn · ↓ faster');
  ui.document.dispatch('pointerdown', { pointerType: 'mouse' });
  assert.equal(html.classList.contains('touch'), false);
  ui.document.dispatch('pointerdown', { pointerType: 'touch' });
  assert.equal(html.classList.contains('touch'), true);
  assert.equal(ui.element('message-hint').textContent, 'hold the words by the board.');
});

test('the message on the board plays, resumes and replays, and the pause on the board pauses', () => {
  const ui = loadInterface({ mobile: true });
  const play = ui.element('play');
  const pause = ui.element('pause');
  assert.equal(play.textContent, 'play');
  assert.equal(pause.hidden, true);
  assert.equal(ui.element('message-hint').textContent, 'hold the words by the board.');
  play.dispatch('click');
  const active = ui.game.active;
  assert.equal(ui.game.state, 'playing');
  assert.equal(pause.hidden, false);
  ui.button('left').dispatch('pointerdown', { pointerId: 1 });
  pause.dispatch('click');
  assert.equal(ui.game.state, 'paused');
  assert.equal(play.textContent, 'resume');
  assert.equal(ui.element('restart').hidden, false);
  assert.equal(ui.element('message-title').textContent, 'paused');
  assert.deepEqual(Object.keys(ui.game.controls), []);
  play.dispatch('click');
  assert.equal(ui.game.state, 'playing');
  assert.equal(ui.game.active, active);
  ui.game.state = 'over';
  ui.game.score = 100;
  ui.game.onEvent({ type: 'over', score: 100 });
  assert.equal(play.textContent, 'play again');
  assert.equal(pause.hidden, true);
  ui.advanceTimers(700);
  play.dispatch('click');
  assert.equal(ui.game.state, 'playing');
  assert.notEqual(ui.game.active, active);
  assert.equal(ui.game.score, 0);
});

test('the paused message offers a fresh start, and Escape closes settings before it resumes', () => {
  const ui = loadInterface();
  ui.start();
  ui.game.score = 50;
  ui.element('settings-button').dispatch('click');
  assert.equal(ui.element('settings').hidden, false);
  ui.key('keydown', 'Escape');
  assert.equal(ui.element('settings').hidden, true);
  assert.equal(ui.game.state, 'paused');
  ui.element('restart').dispatch('click');
  assert.equal(ui.game.state, 'playing');
  assert.equal(ui.game.score, 0);
});

test('the loop stops drawing once play stops and restarts when play resumes', () => {
  const ui = loadInterface();
  ui.frame(0);
  assert.throws(() => ui.frame(16), /schedule its next frame/);
  ui.start();
  ui.frame(100);
  ui.frame(117);
  ui.key('keydown', 'KeyP');
  ui.frame(134);
  const seconds = ui.game.seconds;
  assert.throws(() => ui.frame(151), /schedule its next frame/);
  ui.key('keydown', 'KeyP');
  ui.frame(5000);
  assert.equal(ui.game.seconds, seconds);
  ui.frame(5017);
  assert.ok(ui.game.seconds > seconds && ui.game.seconds < seconds + 0.02);
});

test('without storage, best scores last the session and a lower score is not a new best', () => {
  const ui = loadInterface({ storageDisabled: true });
  ui.start();
  ui.game.score = 500;
  ui.game.state = 'over';
  ui.game.onEvent({ type: 'over', score: 500 });
  assert.equal(ui.element('message-result').textContent, '500');
  assert.equal(ui.element('message-text').textContent, 'a new best.');
  ui.advanceTimers(700);
  ui.start();
  ui.game.score = 100;
  ui.game.state = 'over';
  ui.game.onEvent({ type: 'over', score: 100 });
  assert.equal(ui.element('message-result').textContent, '100');
  assert.equal(ui.element('message-text').textContent, 'best 500');
  assert.equal(ui.element('best').textContent, '500');
});

test('Escape closes settings from inside a settings control, and resuming closes them too', () => {
  const ui = loadInterface();
  ui.start();
  ui.element('settings-button').dispatch('click');
  ui.key('keydown', 'Escape', { target: ui.element('pace') });
  assert.equal(ui.element('settings').hidden, true);
  assert.equal(ui.game.state, 'paused');
  ui.element('settings-button').dispatch('click');
  assert.equal(ui.element('settings').hidden, false);
  ui.element('play').dispatch('click');
  assert.equal(ui.game.state, 'playing');
  assert.equal(ui.element('settings').hidden, true);
});

test('pausing from the pause button hands focus to the resume button', () => {
  const ui = loadInterface();
  ui.start();
  ui.document.activeElement = ui.element('pause');
  ui.element('pause').dispatch('click');
  assert.equal(ui.game.state, 'paused');
  assert.equal(ui.focused, 'play');
});

test('a repeated keyboard tap on a control holds for its own full time', () => {
  const ui = loadInterface();
  ui.start();
  const turn = ui.button('clockwise');
  turn.dispatch('click', { detail: 0 });
  ui.advanceTimers(100);
  turn.dispatch('click', { detail: 0 });
  ui.advanceTimers(60);
  assert.equal(ui.game.controls.clockwise, true);
  ui.advanceTimers(90);
  assert.equal(ui.game.controls.clockwise, undefined);
});

// These tests exercise event wiring and drawing calls in a Node VM. They do not verify browser rendering.

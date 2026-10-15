const test = require('node:test');
const assert = require('node:assert/strict');
const Matter = require('./vendor/matter.min.js');
const { Game, SHAPES, CELL, WIDTH, HEIGHT, STEP, THRESHOLD, area, clip, polygons, makePiece } = require('./core.js');
const { Bodies, Body, Composite } = Matter;

function seededRandom(seed) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function near(actual, expected, tolerance = 0.001) {
  assert.ok(Math.abs(actual - expected) < tolerance, `${actual} differs from ${expected}`);
}

function addRectangle(game, x, y, width, height) {
  const body = Bodies.rectangle(x, y, width, height);
  body.plugin = { piece: true, kind: 0 };
  Composite.add(game.engine.world, body);
  return body;
}

function placeActive(game, x = WIDTH / 2, y = HEIGHT / 3) {
  Body.setPosition(game.active, { x, y });
  Body.setVelocity(game.active, { x: 0, y: 0 });
}

test('each seven-piece bag contains every tetromino, with a drought of at most 12 pieces', () => {
  const game = new Game({ random: seededRandom(4321) });
  const sequence = [game.next];
  for (let i = 1; i < 7000; i++) sequence.push(game.drawKind());
  const counts = Array(SHAPES.length).fill(0);
  const last = Array(SHAPES.length).fill(-1);
  for (let i = 0; i < sequence.length; i++) {
    const kind = sequence[i];
    counts[kind]++;
    if (last[kind] !== -1) assert.ok(i - last[kind] - 1 <= 12);
    last[kind] = i;
    if (i % SHAPES.length === 0) {
      assert.deepEqual([...sequence.slice(i, i + SHAPES.length)].sort(), [0, 1, 2, 3, 4, 5, 6]);
    }
  }
  assert.deepEqual(counts, Array(SHAPES.length).fill(1000));
});

test('Fisher-Yates uses six independent draws for a bag and permits repeat pieces across bags', () => {
  let calls = 0;
  const game = new Game({ random: () => { calls++; return 0; } });
  assert.equal(calls, 6);
  assert.equal(game.next, 0);
  for (let i = 0; i < 6; i++) game.drawKind();
  assert.equal(calls, 6);
  game.random = () => { calls++; return 0.999999; };
  assert.equal(game.drawKind(), 6);
  assert.equal(calls, 12);
  const sequence = [game.next];
  const repeatGame = new Game({ random: seededRandom(55) });
  sequence[0] = repeatGame.next;
  for (let i = 1; i < 700; i++) sequence.push(repeatGame.drawKind());
  assert.ok(sequence.some((kind, i) => i > 0 && sequence[i - 1] === kind));
});

test('next preview always becomes the next active piece, including bag boundaries', () => {
  const game = new Game({ random: seededRandom(71) });
  game.start();
  const sequence = [game.active.plugin.kind];
  for (let i = 1; i < 70; i++) {
    const preview = game.next;
    Composite.remove(game.engine.world, game.active);
    game.spawn();
    assert.equal(game.active.plugin.kind, preview);
    sequence.push(game.active.plugin.kind);
  }
  for (let i = 0; i < sequence.length; i += 7) assert.equal(new Set(sequence.slice(i, i + 7)).size, 7);
});

test('a new game discards the old partial bag and all physics and input state', () => {
  const game = new Game({ random: () => 0 });
  game.start();
  game.drawKind();
  game.drawKind();
  game.controls = { down: true, left: true, clockwise: true };
  game.dropHeld = true;
  game.clearing = [17];
  game.score = 100;
  game.random = () => 0.999999;
  game.start({ pace: 'gentle' });
  assert.equal(game.active.plugin.kind, 6);
  assert.equal(game.next, 5);
  assert.deepEqual(game.bag, [0, 1, 2, 3, 4]);
  assert.deepEqual(game.controls, {});
  assert.equal(game.dropHeld, false);
  assert.equal(game.score, 0);
  assert.equal(game.pace, 'gentle');
  assert.equal(game.pieces().length, 1);
  assert.equal(Composite.allBodies(game.engine.world).length, 4);
  assert.deepEqual(game.clearing, []);
  assert.equal(game.state, 'playing');
});

test('pieces fall and land on the floor, and side walls do not lock them', () => {
  const events = [];
  const game = new Game({ random: () => 0, onEvent: event => events.push(event) });
  game.start();
  const falling = game.active;
  for (let i = 0; i < 60; i++) {
    game.controls.left = true;
    game.step();
  }
  assert.equal(game.active, falling);
  assert.equal(game.placed, 0);
  game.controls = {};
  for (let i = 0; i < 1200 && game.placed === 0; i++) game.step();
  assert.equal(game.placed, 1);
  assert.equal(game.score, 0);
  assert.ok(falling.bounds.max.y <= HEIGHT + 1);
  assert.ok(events.some(event => event.type === 'land'));
  for (let i = 0; i < 50 && game.active === null; i++) game.step();
  assert.ok(game.active);
  assert.notEqual(game.active, falling);
});

test('free rotation remains continuous rather than snapping to grid angles', () => {
  const game = new Game({ random: () => 0 });
  game.start();
  game.engine.gravity.y = 0;
  placeActive(game);
  game.controls.clockwise = true;
  for (let i = 0; i < 240; i++) game.step();
  assert.ok(game.active.angle > Math.PI);
  assert.ok(Math.abs(game.active.angle / (Math.PI / 2) - Math.round(game.active.angle / (Math.PI / 2))) > 0.01);
  assert.equal(game.placed, 0);
});

test('rows measure occupied area, ignore the active piece, and clear only above the threshold', () => {
  const events = [];
  const game = new Game({ onEvent: event => events.push(event) });
  addRectangle(game, WIDTH / 2, HEIGHT - CELL / 2, WIDTH * THRESHOLD, CELL);
  near(game.measureRows()[17], THRESHOLD);
  assert.equal(game.checkLines(), false);
  addRectangle(game, WIDTH / 2, HEIGHT - CELL * 1.5, WIDTH, CELL);
  assert.equal(game.checkLines(), true);
  assert.deepEqual(game.clearing, [16]);
  assert.equal(game.lines, 1);
  assert.equal(game.score, 100);
  assert.deepEqual(events.at(-1), { type: 'clear', count: 1, points: 100, rows: [16], level: 0, levelUp: false });
  const active = makePiece(0, WIDTH / 2, HEIGHT - CELL * 2.5);
  game.active = active;
  Composite.add(game.engine.world, active);
  near(game.measureRows()[15], 0);
});

test('a line clear removes the band, updates the level, and resumes spawning', () => {
  const game = new Game();
  game.state = 'playing';
  game.lines = 9;
  addRectangle(game, WIDTH / 2, HEIGHT - CELL / 2, WIDTH, CELL);
  const events = [];
  game.onEvent = event => events.push(event);
  assert.equal(game.checkLines(), true);
  assert.equal(game.level, 1);
  assert.equal(events.at(-1).levelUp, true);
  assert.equal(game.lines, 10);
  for (let i = 0; i < 100 && !game.active; i++) game.step();
  assert.ok(game.active);
  assert.equal(game.pieces().length, 1);
  assert.deepEqual(game.clearing, []);
});

test('cutting a rotated compound removes only the selected band and separates disconnected fragments', () => {
  const game = new Game();
  const original = makePiece(3, WIDTH / 2, 285, Math.PI / 4);
  Body.setVelocity(original, { x: 2, y: 3 });
  Body.setAngularVelocity(original, 0.02);
  Composite.add(game.engine.world, original);
  const before = polygons(original);
  const retainedArea = before.reduce((total, polygon) => total + area(clip(polygon, 'y', 270, false)) + area(clip(polygon, 'y', 300, true)), 0);
  const center = { ...original.position };
  game.cutRows([9]);
  const fragments = game.pieces();
  assert.equal(fragments.length, 2);
  near(fragments.reduce((total, body) => total + polygons(body).reduce((sum, polygon) => sum + area(polygon), 0), 0), retainedArea);
  for (const fragment of fragments) {
    assert.ok(fragment.bounds.max.y <= 270.001 || fragment.bounds.min.y >= 299.999);
    assert.equal(fragment.plugin.kind, 3);
    near(fragment.velocity.x, 2 - 0.02 * (fragment.position.y - center.y));
    near(fragment.velocity.y, 3 + 0.02 * (fragment.position.x - center.x));
    near(fragment.angularVelocity, 0.02);
    assert.equal(fragment.isSleeping, false);
  }
});

test('multiple cut bands preserve intermediate fragments and remove a fully filled body', () => {
  const game = new Game();
  addRectangle(game, WIDTH / 2, 285, CELL, 150);
  addRectangle(game, 60, 285, CELL, CELL);
  game.cutRows([7, 9, 11]);
  assert.equal(game.pieces().length, 2);
  near(game.pieces().reduce((total, body) => total + body.area, 0), 1800);
  for (const body of game.pieces()) {
    assert.ok(body.bounds.min.y >= 240 - 0.001);
    assert.ok(body.bounds.max.y <= 330 + 0.001);
  }
});

test('top-out ends the game and stops stepping', () => {
  const events = [];
  const game = new Game({ random: () => 0, onEvent: event => events.push(event) });
  game.start();
  Body.setStatic(addRectangle(game, WIDTH / 2, 15, WIDTH, CELL), true);
  for (let i = 0; i < 200 && game.state === 'playing'; i++) game.step();
  assert.equal(game.state, 'over');
  assert.equal(game.active, null);
  assert.equal(game.placed, 0);
  assert.deepEqual(game.controls, {});
  assert.equal(events.at(-1).type, 'over');
  const elapsed = game.seconds;
  game.step();
  assert.equal(game.seconds, elapsed);
});

test('holding drop cannot carry into another piece until release', () => {
  const game = new Game();
  game.start();
  game.controls.down = true;
  Composite.remove(game.engine.world, game.active);
  game.spawn();
  placeActive(game);
  assert.equal(game.dropHeld, true);
  Body.setVelocity(game.active, { x: 0, y: 20 });
  game.step();
  assert.ok(game.active.velocity.y < 2);
  game.controls.down = false;
  game.step();
  assert.equal(game.dropHeld, false);
  game.controls.down = true;
  Body.setVelocity(game.active, { x: 0, y: 20 });
  game.step();
  assert.ok(game.active.velocity.y > 7);
});

test('pause freezes physics and clears controls and the drop latch for fresh input after resume', () => {
  const game = new Game();
  game.start();
  placeActive(game);
  game.dropHeld = true;
  game.controls = { down: true, clockwise: true, left: true };
  game.pause();
  const position = { ...game.active.position };
  const seconds = game.seconds;
  game.step(1000);
  assert.equal(game.state, 'paused');
  assert.deepEqual(game.active.position, position);
  assert.equal(game.seconds, seconds);
  assert.deepEqual(game.controls, {});
  assert.equal(game.dropHeld, false);
  game.resume();
  game.controls.down = true;
  Body.setVelocity(game.active, { x: 0, y: 20 });
  game.step(STEP);
  assert.ok(game.active.velocity.y > 7);
});

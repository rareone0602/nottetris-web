/* Browser adaptation of Not Tetris 2 by Stabyourself. See README.md for credits. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./vendor/matter.min.js'));
  else root.NotTetris = factory(root.Matter);
})(typeof globalThis === 'object' ? globalThis : this, function (Matter) {
  'use strict';

  const CELL = 30;
  const COLS = 10;
  const ROWS = 18;
  const WIDTH = CELL * COLS;
  const HEIGHT = CELL * ROWS;
  const THRESHOLD = 0.81;
  const STEP = 1000 / 120;
  const SHAPES = [
    { name: 'I', color: '#7fb9be', cells: [[-1.5, 0], [-0.5, 0], [0.5, 0], [1.5, 0]] },
    { name: 'L', color: '#d5ab72', cells: [[-1, -0.5], [0, -0.5], [1, -0.5], [1, 0.5]] },
    { name: 'J', color: '#8a9cbb', cells: [[-1, -0.5], [0, -0.5], [1, -0.5], [-1, 0.5]] },
    { name: 'O', color: '#d4c37d', cells: [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]] },
    { name: 'T', color: '#b0a0be', cells: [[-1, -0.5], [0, -0.5], [1, -0.5], [0, 0.5]] },
    { name: 'S', color: '#a5b68a', cells: [[-1, 0.5], [0, 0.5], [0, -0.5], [1, -0.5]] },
    { name: 'Z', color: '#c6a293', cells: [[-1, -0.5], [0, -0.5], [0, 0.5], [1, 0.5]] }
  ];
  const { Engine, Bodies, Body, Composite, Events, Sleeping, Vertices } = Matter;
  const material = { friction: 0.42, frictionStatic: 0.65, frictionAir: 0.012,
    restitution: 0.08, density: 0.002, slop: 0.025, sleepThreshold: 90 };
  const clamp = (value, low, high) => Math.min(high, Math.max(low, value));

  function area(polygon) {
    let sum = 0;
    for (let i = 0; i < polygon.length; i++) {
      const next = polygon[(i + 1) % polygon.length];
      sum += polygon[i].x * next.y - next.x * polygon[i].y;
    }
    return Math.abs(sum) / 2;
  }

  function cleanPolygon(polygon) {
    return polygon.filter((point, i) => {
      const previous = polygon[(i + polygon.length - 1) % polygon.length];
      return Math.hypot(point.x - previous.x, point.y - previous.y) > 0.001;
    });
  }

  function clip(polygon, axis, boundary, keepGreater) {
    const output = [];
    if (!polygon.length) return output;
    const inside = point => keepGreater ? point[axis] >= boundary : point[axis] <= boundary;
    for (let i = 0; i < polygon.length; i++) {
      const start = polygon[i];
      const end = polygon[(i + 1) % polygon.length];
      const startInside = inside(start);
      const endInside = inside(end);
      if (startInside) output.push({ x: start.x, y: start.y });
      if (startInside !== endInside) {
        const ratio = (boundary - start[axis]) / (end[axis] - start[axis]);
        output.push({ x: start.x + ratio * (end.x - start.x), y: start.y + ratio * (end.y - start.y) });
      }
    }
    return cleanPolygon(output);
  }

  function band(polygon, top, bottom) {
    return clip(clip(polygon, 'y', top, true), 'y', bottom, false);
  }

  function polygons(body) {
    return (body.parts.length > 1 ? body.parts.slice(1) : [body]).map(part =>
      part.vertices.map(point => ({ x: point.x, y: point.y })));
  }

  function pointDistance(point, start, end) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const denominator = dx * dx + dy * dy;
    const ratio = denominator ? clamp(((point.x - start.x) * dx + (point.y - start.y) * dy) / denominator, 0, 1) : 0;
    return Math.hypot(point.x - start.x - ratio * dx, point.y - start.y - ratio * dy);
  }

  function touching(first, second) {
    return first.some(point => second.some((start, i) =>
      pointDistance(point, start, second[(i + 1) % second.length]) < 0.1));
  }

  function connectedGroups(parts) {
    const remaining = parts.slice();
    const groups = [];
    while (remaining.length) {
      const group = [remaining.pop()];
      for (let i = 0; i < group.length; i++) {
        for (let j = remaining.length - 1; j >= 0; j--) {
          if (touching(group[i], remaining[j]) || touching(remaining[j], group[i])) group.push(remaining.splice(j, 1)[0]);
        }
      }
      groups.push(group);
    }
    return groups;
  }

  function makePiece(kind, x, y, angle = 0) {
    const parts = SHAPES[kind].cells.map(([column, row]) =>
      Bodies.rectangle(x + column * CELL, y + row * CELL, CELL, CELL, material));
    const body = Body.create({ ...material, parts });
    Body.setPosition(body, { x, y });
    Body.setAngle(body, angle);
    body.plugin = { piece: true, kind };
    return body;
  }

  class Game {
    constructor({ random = Math.random, onEvent = () => {} } = {}) {
      this.random = random;
      this.onEvent = onEvent;
      this.engine = Engine.create({ enableSleeping: true, positionIterations: 8, velocityIterations: 8 });
      this.engine.gravity.y = 0.8;
      Events.on(this.engine, 'collisionStart collisionActive', event => {
        if (!this.active || this.landing || this.state !== 'playing') return;
        for (const pair of event.pairs) {
          const first = pair.bodyA.parent;
          const second = pair.bodyB.parent;
          const other = first === this.active ? second : second === this.active ? first : null;
          if (other && other.label !== 'side') { this.landing = this.active; break; }
        }
      });
      this.reset();
    }

    reset({ pace = 'original' } = {}) {
      Composite.clear(this.engine.world, false);
      Engine.clear(this.engine);
      this.engine.timing.timestamp = 0;
      this.pace = pace;
      this.state = 'ready';
      this.active = null;
      this.landing = null;
      this.bag = [];
      this.next = this.drawKind();
      this.score = 0;
      this.lines = 0;
      this.level = 0;
      this.placed = 0;
      this.seconds = 0;
      this.clearTimer = 0;
      this.spawnTimer = 0;
      this.clearing = [];
      this.densities = Array(ROWS).fill(0);
      this.densityTimer = 0;
      this.dropHeld = false;
      this.controls = {};
      const sides = [Bodies.rectangle(-20, HEIGHT / 2 - 70, 40, HEIGHT + 300, { isStatic: true, label: 'side', friction: 0 }),
        Bodies.rectangle(WIDTH + 20, HEIGHT / 2 - 70, 40, HEIGHT + 300, { isStatic: true, label: 'side', friction: 0 })];
      const floor = Bodies.rectangle(WIDTH / 2, HEIGHT + 20, WIDTH + 80, 40, { isStatic: true, label: 'floor', friction: 0.6 });
      Composite.add(this.engine.world, [...sides, floor]);
    }

    start(options) {
      this.reset(options);
      this.state = 'playing';
      this.spawn();
      this.onEvent({ type: 'start' });
    }

    pause() {
      if (this.state !== 'playing') return;
      this.state = 'paused';
      this.controls = {};
      this.dropHeld = false;
      this.onEvent({ type: 'pause' });
    }

    resume() {
      if (this.state !== 'paused') return;
      this.state = 'playing';
      this.controls = {};
      this.dropHeld = false;
      this.onEvent({ type: 'resume' });
    }

    pieces() {
      return Composite.allBodies(this.engine.world).filter(body => body.plugin.piece);
    }

    drawKind() {
      if (!this.bag.length) {
        this.bag = SHAPES.map((shape, kind) => kind);
        for (let i = this.bag.length - 1; i > 0; i--) {
          const j = Math.floor(this.random() * (i + 1));
          [this.bag[i], this.bag[j]] = [this.bag[j], this.bag[i]];
        }
      }
      return this.bag.pop();
    }

    spawn() {
      this.active = makePiece(this.next, WIDTH / 2, -CELL);
      Body.setVelocity(this.active, { x: 0, y: this.fallSpeed() });
      Composite.add(this.engine.world, this.active);
      this.next = this.drawKind();
      this.dropHeld = Boolean(this.controls.down);
      this.onEvent({ type: 'spawn', kind: this.active.plugin.kind });
    }

    fallSpeed() {
      return (1.55 + this.level * 0.11) * (this.pace === 'gentle' ? 0.65 : 1);
    }

    measureRows() {
      const densities = Array(ROWS).fill(0);
      for (const body of this.pieces()) {
        if (body === this.active) continue;
        for (let polygon of polygons(body)) {
          polygon = clip(clip(polygon, 'x', 0, true), 'x', WIDTH, false);
          if (polygon.length < 3) continue;
          const first = clamp(Math.floor(Math.min(...polygon.map(point => point.y)) / CELL), 0, ROWS - 1);
          const last = clamp(Math.floor(Math.max(...polygon.map(point => point.y)) / CELL), 0, ROWS - 1);
          for (let row = first; row <= last; row++) densities[row] += area(band(polygon, row * CELL, (row + 1) * CELL)) / (WIDTH * CELL);
        }
      }
      this.densities = densities;
      return densities;
    }

    checkLines() {
      this.measureRows();
      const rows = this.densities.flatMap((density, row) => density > THRESHOLD ? [row] : []);
      if (!rows.length) return false;
      const count = rows.length;
      const average = rows.reduce((sum, row) => sum + this.densities[row], 0) / count;
      const points = Math.ceil(Math.pow(count * 3, Math.pow(Math.min(average, 1), 10)) * 20 + count * count * 40);
      this.score += points;
      this.lines += count;
      this.level = Math.floor(this.lines / 10);
      this.clearing = rows;
      this.clearTimer = 0.42;
      this.onEvent({ type: 'clear', count, points });
      return true;
    }

    cutRows(rows) {
      for (const body of this.pieces()) {
        if (body === this.active) continue;
        if (!rows.some(row => body.bounds.max.y > row * CELL && body.bounds.min.y < (row + 1) * CELL)) continue;
        let fragments = polygons(body);
        for (const row of rows) {
          fragments = fragments.flatMap(polygon => [clip(polygon, 'y', row * CELL, false),
            clip(polygon, 'y', (row + 1) * CELL, true)]).filter(polygon => polygon.length >= 3 && area(polygon) > 4);
        }
        const velocity = { ...body.velocity };
        const angularVelocity = body.angularVelocity;
        const center = { ...body.position };
        Composite.remove(this.engine.world, body);
        for (const group of connectedGroups(fragments)) {
          const parts = group.map(polygon => {
            const centroid = Vertices.centre(polygon);
            return Bodies.fromVertices(centroid.x, centroid.y, [polygon], material, true, 0.001, 1, 0.001);
          }).filter(Boolean);
          if (!parts.length) continue;
          const fragment = parts.length === 1 ? parts[0] : Body.create({ ...material, parts });
          fragment.plugin = { ...body.plugin };
          Body.setVelocity(fragment, { x: velocity.x - angularVelocity * (fragment.position.y - center.y),
            y: velocity.y + angularVelocity * (fragment.position.x - center.x) });
          Body.setAngularVelocity(fragment, angularVelocity);
          Composite.add(this.engine.world, fragment);
        }
      }
      for (const body of this.pieces()) Sleeping.set(body, false);
      this.measureRows();
    }

    land() {
      const body = this.active;
      this.landing = null;
      this.active = null;
      if (body.position.y < 0) {
        this.state = 'over';
        this.controls = {};
        this.onEvent({ type: 'over', score: this.score });
        return;
      }
      this.placed++;
      body.frictionAir = 0.018;
      this.onEvent({ type: 'land', placed: this.placed });
      if (!this.checkLines()) this.spawnTimer = 0.26;
    }

    step(delta = STEP) {
      if (this.state !== 'playing') return;
      const seconds = delta / 1000;
      this.seconds += seconds;
      if (this.clearTimer > 0) {
        this.clearTimer -= seconds;
        if (this.clearTimer <= 0) {
          this.cutRows(this.clearing);
          this.clearing = [];
          this.spawnTimer = 0.24;
        }
        return;
      }
      if (this.active) {
        const body = this.active;
        const scale = delta / (1000 / 60);
        const direction = Number(Boolean(this.controls.right)) - Number(Boolean(this.controls.left));
        const turn = Number(Boolean(this.controls.clockwise)) - Number(Boolean(this.controls.counterclockwise));
        const speed = clamp(body.velocity.x + direction * 0.5 * scale, -3.8, 3.8);
        const down = this.controls.down && !this.dropHeld;
        const fall = down ? 7.5 : this.fallSpeed();
        Body.setVelocity(body, { x: speed, y: Math.min(body.velocity.y, fall) });
        Body.setAngularVelocity(body, clamp(body.angularVelocity + turn * 0.009 * scale, -0.055, 0.055));
        if (!this.controls.down) this.dropHeld = false;
        if (body.isSleeping) Sleeping.set(body, false);
      }
      Engine.update(this.engine, delta);
      if (this.active && this.landing === this.active) this.land();
      if (!this.active && !this.clearing.length && this.spawnTimer > 0) {
        this.spawnTimer -= seconds;
        if (this.spawnTimer <= 0) this.spawn();
      }
      this.densityTimer += seconds;
      if (this.densityTimer >= 0.12) { this.measureRows(); this.densityTimer = 0; }
    }
  }

  return { Game, CELL, COLS, ROWS, WIDTH, HEIGHT, THRESHOLD, STEP, SHAPES, area, clip, band, polygons, connectedGroups, makePiece };
});

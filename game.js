(function () {
  'use strict';

  const N = window.NotTetris;
  const byId = id => document.getElementById(id);
  const board = byId('board');
  const context = board.getContext('2d');
  const nextCanvas = byId('next');
  const nextContext = nextCanvas.getContext('2d');
  const playButton = byId('play');
  const pace = byId('pace');
  const sound = byId('sound');
  const patterns = byId('patterns');
  const controlButtons = Array.from(document.querySelectorAll('[data-action]'));
  const keys = new Set();
  const heldCodes = new Set();
  const pointers = new Map();
  const tapped = new Set();
  const INK = '#3d3c39';
  const SECONDARY = '#6d6a63';
  const PAPER = '#fbf9f3';
  const OFFSET_X = 6;
  const OFFSET_Y = 54;
  let audio = null;
  let noteTimer;
  let previousTime = 0;
  let accumulator = 0;
  let pixelRatio = 1;

  function readSetting(key, fallback) {
    try { return localStorage.getItem('not-tetris.' + key) ?? fallback; }
    catch (_) { return fallback; }
  }

  function saveSetting(key, value) {
    try { localStorage.setItem('not-tetris.' + key, String(value)); }
    catch (_) { /* Play remains available when browser storage is disabled. */ }
  }

  sound.checked = readSetting('sound', 'false') === 'true';
  patterns.checked = readSetting('patterns', 'false') === 'true';
  pace.value = readSetting('pace', 'original') === 'gentle' ? 'gentle' : 'original';

  function primeAudio() {
    if (!sound.checked) return;
    try {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) return;
      audio = audio || new Audio();
      if (audio.state === 'suspended') audio.resume().catch(() => {});
    } catch (_) { audio = null; }
  }

  function tone(frequency, duration, delay = 0) {
    if (!sound.checked || !audio || audio.state !== 'running') return;
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    const start = audio.currentTime + delay;
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.055, start + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    oscillator.connect(gain);
    gain.connect(audio.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.01);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
  }

  function announce(message) { byId('announcer').textContent = message; }

  function onGameEvent(event) {
    if (event.type === 'clear') {
      const rows = event.count === 1 ? 'one row cleared' : event.count + ' rows cleared';
      byId('score-note').textContent = '+' + event.points;
      clearTimeout(noteTimer);
      noteTimer = setTimeout(() => { byId('score-note').textContent = ''; }, 2400);
      announce(rows + '. ' + event.points + ' points.');
      [330, 440, 550].forEach((frequency, index) => tone(frequency, 0.16, index * 0.07));
    } else if (event.type === 'land') {
      tone(145, 0.05);
    } else if (event.type === 'over') {
      releaseInputs();
      announce('no room left. score ' + event.score + '. choose play again for another game.');
      tone(180, 0.22);
      tone(120, 0.26, 0.15);
    } else if (event.type === 'pause') {
      announce('paused. choose resume, or press P.');
    } else if (event.type === 'resume') {
      announce('playing.');
    } else if (event.type === 'start') {
      announce('playing. hold left or right to move, and turn left or turn right to rotate.');
    }
    updateInterface();
  }

  const game = new N.Game({ onEvent: onGameEvent });
  game.reset({ pace: pace.value });

  function bestKey() { return 'best.' + game.pace; }

  function bestScore() {
    const best = Number(readSetting(bestKey(), '0'));
    return Number.isFinite(best) && best >= 0 ? Math.floor(best) : 0;
  }

  function updateInterface() {
    const state = game.state;
    const best = Math.max(bestScore(), game.score);
    if (game.score > bestScore()) saveSetting(bestKey(), best);
    byId('score').textContent = game.score.toLocaleString('en-GB');
    byId('count').textContent = game.lines;
    byId('count-label').textContent = 'lines';
    byId('level').textContent = game.level;
    byId('best').textContent = best.toLocaleString('en-GB');
    byId('pace-note').textContent = 'clear lines · ' + game.pace;
    byId('restart').hidden = state === 'ready';
    playButton.textContent = { ready: 'play', playing: 'pause', paused: 'resume', over: 'play again' }[state];
    byId('touch-pause').textContent = playButton.textContent;
    byId('board-message').hidden = state === 'playing';
    if (state !== 'playing') {
      byId('message-title').textContent = { ready: 'a loose arrangement', paused: 'paused', over: 'no room left' }[state];
      byId('message-text').textContent = state === 'over' ? 'score ' + game.score.toLocaleString('en-GB') + ' · play again above' :
        state === 'paused' ? 'resume above, or press P.' : 'fill a row. mind the gaps.';
    }
    byId('game-status').textContent = state === 'playing' ? 'hold to move or turn. release down for the next piece.' :
      state === 'paused' ? 'your pile can wait.' : state === 'over' ? 'play again above for a fresh sheet.' : 'hold a word to move or turn. two thumbs work.';
    controlButtons.forEach(button => { button.disabled = state !== 'playing'; });
    drawNext();
  }

  function syncInputs() {
    const actions = new Set([...keys, ...pointers.values(), ...tapped]);
    game.controls = Object.fromEntries(Array.from(actions, action => [action, true]));
    controlButtons.forEach(button => {
      const pressed = actions.has(button.dataset.action);
      button.classList.toggle('is-held', pressed);
      button.setAttribute('aria-pressed', String(pressed));
    });
  }

  function releaseInputs() {
    heldCodes.clear();
    keys.clear();
    pointers.clear();
    tapped.clear();
    if (typeof game !== 'undefined') syncInputs();
  }

  function bringGameIntoView() {
    if (window.matchMedia('(max-width: 600px), (max-height: 500px)').matches) {
      document.querySelector('.play-layout').scrollIntoView({ block: 'start', behavior: 'instant' });
    }
  }

  function startGame() {
    releaseInputs();
    clearTimeout(noteTimer);
    byId('score-note').textContent = '';
    primeAudio();
    byId('settings').hidden = true;
    byId('settings-button').setAttribute('aria-expanded', 'false');
    game.start({ pace: pace.value });
    accumulator = 0;
    previousTime = 0;
    byId('board-wrap').focus({ preventScroll: true });
    bringGameIntoView();
  }

  function togglePlay() {
    primeAudio();
    releaseInputs();
    if (game.state === 'playing') game.pause();
    else if (game.state === 'paused') {
      game.resume();
      byId('board-wrap').focus({ preventScroll: true });
      bringGameIntoView();
    } else startGame();
  }

  playButton.addEventListener('click', togglePlay);
  byId('touch-pause').addEventListener('click', togglePlay);
  document.querySelector('.help-link').addEventListener('click', () => {
    releaseInputs();
    game.pause();
  });
  byId('restart').addEventListener('click', startGame);
  byId('settings-button').addEventListener('click', () => {
    releaseInputs();
    if (game.state === 'playing') game.pause();
    const open = byId('settings').hidden;
    byId('settings').hidden = !open;
    byId('settings-button').setAttribute('aria-expanded', String(open));
  });
  pace.addEventListener('change', () => {
    saveSetting('pace', pace.value);
    if (game.state === 'ready') {
      game.reset({ pace: pace.value });
      updateInterface();
    }
  });
  sound.addEventListener('change', () => { saveSetting('sound', sound.checked); primeAudio(); });
  patterns.addEventListener('change', () => { saveSetting('patterns', patterns.checked); drawNext(); });
  for (const button of controlButtons) {
    button.addEventListener('pointerdown', event => {
      if (game.state !== 'playing' || (event.pointerType === 'mouse' && event.button !== 0)) return;
      event.preventDefault();
      primeAudio();
      button.setPointerCapture(event.pointerId);
      pointers.set(event.pointerId, button.dataset.action);
      syncInputs();
    });
    const release = event => { pointers.delete(event.pointerId); syncInputs(); };
    button.addEventListener('pointerup', release);
    button.addEventListener('pointercancel', release);
    button.addEventListener('lostpointercapture', release);
    button.addEventListener('contextmenu', event => event.preventDefault());
    button.addEventListener('click', event => {
      if (event.detail !== 0 || game.state !== 'playing') return;
      tapped.add(button.dataset.action);
      syncInputs();
      setTimeout(() => { tapped.delete(button.dataset.action); syncInputs(); }, 150);
    });
  }

  const keyboard = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
    ArrowDown: 'down', KeyS: 'down', Space: 'down', ArrowUp: 'clockwise', KeyX: 'clockwise',
    KeyZ: 'counterclockwise', KeyW: 'counterclockwise' };
  document.addEventListener('keydown', event => {
    if (event.ctrlKey || event.metaKey || event.altKey || ['INPUT', 'SELECT', 'TEXTAREA'].includes(event.target.tagName)) return;
    if (event.code === 'KeyP' || event.code === 'Escape') {
      if (!event.repeat && ['playing', 'paused'].includes(game.state)) { event.preventDefault(); togglePlay(); }
      return;
    }
    if (event.code === 'Enter' && event.target.tagName !== 'BUTTON' && game.state !== 'playing') {
      event.preventDefault();
      if (!event.repeat) togglePlay();
      return;
    }
    if (game.state !== 'playing' || !keyboard[event.code]) return;
    if (event.code === 'Space' && ['BUTTON', 'A'].includes(event.target.tagName)) return;
    event.preventDefault();
    heldCodes.add(event.code);
    keys.add(keyboard[event.code]);
    syncInputs();
  });
  document.addEventListener('keyup', event => {
    heldCodes.delete(event.code);
    keys.clear();
    heldCodes.forEach(code => keys.add(keyboard[code]));
    syncInputs();
  });
  function pauseOnLeave() {
    heldCodes.clear();
    releaseInputs();
    game.pause();
  }
  window.addEventListener('blur', pauseOnLeave);
  document.addEventListener('visibilitychange', () => { if (document.hidden) pauseOnLeave(); });

  function polygonPath(ctx, polygon) {
    ctx.beginPath();
    polygon.forEach((point, i) => { if (i) ctx.lineTo(point.x, point.y); else ctx.moveTo(point.x, point.y); });
    ctx.closePath();
  }

  function drawPolygon(ctx, polygon, kind, active) {
    const shape = N.SHAPES[kind];
    const left = Math.min(...polygon.map(point => point.x));
    const right = Math.max(...polygon.map(point => point.x));
    const top = Math.min(...polygon.map(point => point.y));
    const bottom = Math.max(...polygon.map(point => point.y));
    ctx.save();
    polygonPath(ctx, polygon);
    ctx.fillStyle = shape.color;
    ctx.fill();
    ctx.clip();
    ctx.strokeStyle = PAPER;
    ctx.globalAlpha = 0.43;
    ctx.lineWidth = 0.65;
    for (let y = top - (right - left); y < bottom + right - left; y += 4.5) {
      ctx.beginPath();
      ctx.moveTo(left, y);
      ctx.lineTo(right, y + (right - left) * 0.68);
      ctx.stroke();
    }
    ctx.restore();
    polygonPath(ctx, polygon);
    ctx.strokeStyle = active ? INK : SECONDARY;
    ctx.lineWidth = active ? 1.35 : 0.8;
    ctx.lineJoin = 'round';
    ctx.stroke();
    if (patterns.checked && N.area(polygon) > 180) {
      const center = Matter.Vertices.centre(polygon);
      ctx.fillStyle = INK;
      ctx.font = '300 14px "Shantell Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(shape.name, center.x, center.y);
    }
  }

  function drawBody(ctx, body, active = false) {
    N.polygons(body).forEach(polygon => drawPolygon(ctx, polygon, body.plugin.kind, active));
  }

  function pencilLine(ctx, startX, startY, endX, endY, ink = INK) {
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.bezierCurveTo(startX + (endX - startX) * 0.34 + 0.35, startY + (endY - startY) * 0.34 - 0.45,
      startX + (endX - startX) * 0.68 - 0.4, startY + (endY - startY) * 0.68 + 0.5, endX, endY);
    ctx.strokeStyle = ink;
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }

  const sample = [[0, 73, 519, -0.03], [3, 165, 510, 0.02], [1, 254, 509, -0.1],
    [5, 90, 474, -0.2], [4, 200, 468, 0.13], [2, 150, 416, -0.3]].map(args => N.makePiece(...args));

  function drawBoard() {
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.clearRect(0, 0, 336, 600);
    context.fillStyle = PAPER;
    context.fillRect(OFFSET_X, 0, N.WIDTH, 598);
    context.save();
    context.translate(OFFSET_X, OFFSET_Y);
    context.beginPath();
    context.rect(0, -OFFSET_Y, N.WIDTH, N.HEIGHT + OFFSET_Y);
    context.clip();
    context.strokeStyle = '#97938a';
    context.globalAlpha = 0.22;
    context.lineWidth = 0.6;
    for (let row = 1; row < N.ROWS; row++) {
      context.beginPath(); context.moveTo(0, row * N.CELL); context.lineTo(N.WIDTH, row * N.CELL); context.stroke();
    }
    context.setLineDash([1, 7]);
    for (let column = 1; column < N.COLS; column++) {
      context.beginPath(); context.moveTo(column * N.CELL, 0); context.lineTo(column * N.CELL, N.HEIGHT); context.stroke();
    }
    context.setLineDash([]);
    context.globalAlpha = 1;
    (game.state === 'ready' ? sample : game.pieces()).forEach(body => drawBody(context, body, body === game.active));
    for (const row of game.clearing) {
      context.fillStyle = PAPER;
      context.globalAlpha = 0.8;
      context.fillRect(0, row * N.CELL, N.WIDTH, N.CELL);
      context.globalAlpha = 1;
      pencilLine(context, 0, (row + 0.5) * N.CELL, N.WIDTH, (row + 0.5) * N.CELL, SECONDARY);
    }
    context.restore();
    pencilLine(context, OFFSET_X - 1, 0, OFFSET_X - 1, 595);
    pencilLine(context, OFFSET_X + N.WIDTH + 1, 0, OFFSET_X + N.WIDTH + 1, 595);
    pencilLine(context, OFFSET_X - 2, 595, OFFSET_X + N.WIDTH + 2, 595);
    context.setLineDash([5, 5]);
    pencilLine(context, OFFSET_X, OFFSET_Y, OFFSET_X + N.WIDTH, OFFSET_Y, SECONDARY);
    context.setLineDash([]);
    for (let row = 0; row < N.ROWS; row++) {
        const y = OFFSET_Y + (row + 0.5) * N.CELL;
        context.strokeStyle = SECONDARY;
        context.lineWidth = 0.6;
        context.globalAlpha = 0.4;
        context.beginPath(); context.moveTo(315, y); context.lineTo(332, y); context.stroke();
        context.globalAlpha = 1;
        context.lineWidth = 2;
        context.beginPath(); context.moveTo(315, y); context.lineTo(315 + Math.min(1, game.densities[row] / N.THRESHOLD) * 17, y); context.stroke();
    }
  }

  function drawNext() {
    nextContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    nextContext.clearRect(0, 0, 136, 76);
    const body = N.makePiece(game.next, 68, 38);
    drawBody(nextContext, body);
    nextCanvas.setAttribute('aria-label', 'next piece: ' + N.SHAPES[game.next].name);
  }

  function resizeCanvases() {
    pixelRatio = Math.min(window.devicePixelRatio || 1, 3);
    board.width = Math.round(336 * pixelRatio);
    board.height = Math.round(600 * pixelRatio);
    nextCanvas.width = Math.round(136 * pixelRatio);
    nextCanvas.height = Math.round(76 * pixelRatio);
    drawNext();
    drawBoard();
  }

  function frame(time) {
    const elapsed = previousTime ? Math.min(time - previousTime, 100) : 0;
    previousTime = time;
    if (game.state === 'playing') {
      accumulator += elapsed;
      let steps = 0;
      while (accumulator >= N.STEP && steps < 12) {
        game.step();
        accumulator -= N.STEP;
        steps++;
      }
    } else accumulator = 0;
    drawBoard();
    window.requestAnimationFrame(frame);
  }

  window.addEventListener('resize', resizeCanvases);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { drawNext(); drawBoard(); });
  resizeCanvases();
  updateInterface();
  window.requestAnimationFrame(frame);
})();

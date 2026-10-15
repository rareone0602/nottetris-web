/* Page wiring for the browser game: settings, sound, the words around the board and the animation loop. The
   simulation is in core.js, drawing in render.js and input handling in input.js. */
(function () {
  'use strict';

  const Core = window.NotTetris;
  const Render = window.NotTetrisRender;
  const { Controls } = window.NotTetrisInput;
  const byId = id => document.getElementById(id);
  const root = document.documentElement;
  const section = byId('game');
  const board = byId('board');
  const boardContext = board.getContext('2d');
  const preview = byId('next');
  const previewContext = preview.getContext('2d');
  const boardWrap = byId('board-wrap');
  const settings = byId('settings');
  const settingsButton = byId('settings-button');
  const pace = byId('pace');
  const sound = byId('sound');
  const letters = byId('letters');
  const playButton = byId('play');
  const restartButton = byId('restart');
  const pauseButton = byId('pause');
  const note = byId('board-note');
  const controlButtons = Array.from(document.querySelectorAll('[data-action]'));
  const touchQuery = window.matchMedia('(any-pointer: coarse)');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const ACTION_LABELS = { ready: 'play', playing: 'pause', paused: 'resume', over: 'play again' };
  const NUMBER_WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
  const GAME_OVER_LOCK_MILLISECONDS = 700;
  const NOTE_MILLISECONDS = 1800;
  const format = value => value.toLocaleString('en-GB');
  let audio = null;
  let noteTimer;
  let frameRequested = false;
  let previousTime = 0;
  let accumulator = 0;
  let bestBefore = 0;
  let actionsLocked = false;

  /* Settings and best scores are kept in browser storage. When storage is disabled, they last until the page
     closes. */
  const unsaved = new Map();

  function readSetting(key, fallback) {
    try { return localStorage.getItem('not-tetris.' + key) ?? fallback; }
    catch (_) { return unsaved.get(key) ?? fallback; }
  }

  function saveSetting(key, value) {
    unsaved.set(key, String(value));
    try { localStorage.setItem('not-tetris.' + key, String(value)); }
    catch (_) { /* Play remains available when browser storage is disabled. */ }
  }

  sound.checked = readSetting('sound', 'false') === 'true';
  letters.checked = readSetting('letters', 'false') === 'true';
  pace.value = readSetting('pace', 'original') === 'gentle' ? 'gentle' : 'original';

  function usesTouch() {
    return touchQuery.matches || Boolean(root && root.classList.contains('touch'));
  }

  function primeAudio() {
    if (!sound.checked) return;
    try {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) return;
      audio = audio || new Audio();
      if (audio.state === 'suspended') audio.resume().catch(() => {});
    } catch (_) { audio = null; }
  }

  /* Plays a short sine tone. Frequencies stay above 250 Hz so that a phone's speaker can reproduce them. */
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

  function showNote({ rows, count, points, level, levelUp }) {
    const lines = ['+' + format(points) + (count > 1 ? ', ' + (NUMBER_WORDS[count] || count) + ' rows' : '')];
    if (levelUp) lines.push('level ' + level);
    note.textContent = lines.join('\n');
    note.style.top = (Render.rowTop(Math.min(...rows)) * 100).toFixed(2) + '%';
    note.hidden = false;
    clearTimeout(noteTimer);
    noteTimer = setTimeout(hideNote, NOTE_MILLISECONDS);
  }

  function hideNote() {
    clearTimeout(noteTimer);
    note.hidden = true;
    note.textContent = '';
  }

  function onGameEvent(event) {
    if (event.type === 'clear') {
      showNote(event);
      announce((event.count === 1 ? 'one row' : event.count + ' rows') + ' cleared. ' + event.points + ' points.' +
        (event.levelUp ? ' level ' + event.level + '.' : ''));
      [523, 659, 784].forEach((frequency, index) => tone(frequency, 0.16, index * 0.07));
      if (event.levelUp) tone(1047, 0.22, 0.24);
    } else if (event.type === 'land') {
      tone(262, 0.05);
    } else if (event.type === 'over') {
      input.releaseAll();
      lockActions();
      announce('no room left. score ' + event.score + '. choose play again for another game.');
      tone(330, 0.22);
      tone(247, 0.3, 0.16);
    } else if (event.type === 'pause') {
      announce('paused. choose resume, or press P.');
    } else if (event.type === 'resume') {
      announce('playing.');
    } else if (event.type === 'start') {
      announce('playing. hold left or right to move, and turn left or turn right to rotate.');
    }
    updateInterface();
  }

  const input = new Controls({
    onChange: actions => {
      game.controls = Object.fromEntries(Array.from(actions, action => [action, true]));
      for (const button of controlButtons) {
        const held = actions.has(button.dataset.action);
        button.classList.toggle('is-held', held);
        button.setAttribute('aria-pressed', String(held));
      }
    },
    schedule: (callback, delay) => setTimeout(callback, delay)
  });
  const game = new Core.Game({ onEvent: onGameEvent });

  function bestKey() { return 'best.' + game.pace; }

  function bestScore() {
    const best = Number(readSetting(bestKey(), '0'));
    return Number.isFinite(best) && best >= 0 ? Math.floor(best) : 0;
  }

  /* After a game ends, the replay actions wait briefly, so that a thumb still pressing a control does not start
     the next game by accident. */
  function lockActions() {
    actionsLocked = true;
    setTimeout(() => { actionsLocked = false; updateInterface(); }, GAME_OVER_LOCK_MILLISECONDS);
  }

  function messageFor(state) {
    const touch = usesTouch();
    if (state === 'ready') {
      return { title: 'fill a row', text: '81% will do, at any angle.',
        hint: touch ? 'hold the words below.' : '← → move · Z X turn · ↓ faster' };
    }
    if (state === 'paused') return { title: 'paused', text: touch ? 'the pile will keep.' : 'P or Esc carries on.', hint: '' };
    const best = bestScore();
    return { title: 'no room left', hint: '',
      text: game.score > bestBefore && game.score > 0 ? 'score ' + format(game.score) + ': a new best.' :
        'score ' + format(game.score) + ' · best ' + format(best) };
  }

  function updateInterface() {
    const state = game.state;
    const best = Math.max(bestScore(), game.score);
    if (game.score > bestScore()) saveSetting(bestKey(), best);
    byId('score').textContent = format(game.score);
    byId('lines').textContent = game.lines;
    byId('level').textContent = game.level;
    byId('best').textContent = format(best);
    byId('best-label').textContent = game.pace === 'gentle' ? 'best, gentle' : 'best';
    section.classList.toggle('is-playing', state === 'playing');
    pauseButton.hidden = state !== 'playing';
    byId('board-message').hidden = state === 'playing';
    playButton.textContent = ACTION_LABELS[state];
    playButton.disabled = actionsLocked;
    restartButton.hidden = state !== 'paused';
    if (state !== 'playing') {
      const message = messageFor(state);
      byId('message-title').textContent = message.title;
      byId('message-text').textContent = message.text;
      byId('message-hint').textContent = message.hint;
      byId('message-hint').hidden = !message.hint;
    }
    for (const button of controlButtons) button.disabled = state !== 'playing';
    drawPreview();
    requestDraw();
  }

  function bringBoardIntoView() {
    if (typeof boardWrap.scrollIntoView === 'function') {
      boardWrap.scrollIntoView({ block: 'nearest', behavior: reducedMotion.matches ? 'auto' : 'smooth' });
    }
  }

  function focusBoard() {
    boardWrap.focus({ preventScroll: true });
    bringBoardIntoView();
  }

  function setSettingsOpen(open) {
    settings.hidden = !open;
    settingsButton.setAttribute('aria-expanded', String(open));
  }

  function startGame() {
    if (actionsLocked) return;
    input.releaseAll();
    hideNote();
    primeAudio();
    setSettingsOpen(false);
    game.start({ pace: pace.value });
    bestBefore = bestScore();
    accumulator = 0;
    previousTime = 0;
    focusBoard();
  }

  /* The primary action: play, pause, resume or play again, depending on the state. Pausing from the pause
     button, which then hides, moves focus to the resume button in its place. */
  function togglePlay() {
    if (actionsLocked) return;
    primeAudio();
    input.releaseAll();
    if (game.state === 'playing') {
      const fromPauseButton = document.activeElement === pauseButton;
      game.pause();
      if (fromPauseButton) playButton.focus({ preventScroll: true });
    } else if (game.state === 'paused') {
      setSettingsOpen(false);
      game.resume();
      focusBoard();
    } else startGame();
  }

  playButton.addEventListener('click', togglePlay);
  pauseButton.addEventListener('click', togglePlay);
  restartButton.addEventListener('click', startGame);
  byId('help-link').addEventListener('click', () => {
    input.releaseAll();
    game.pause();
  });
  settingsButton.addEventListener('click', () => {
    input.releaseAll();
    game.pause();
    setSettingsOpen(settings.hidden);
  });
  pace.addEventListener('change', () => {
    saveSetting('pace', pace.value);
    if (game.state === 'ready') {
      game.reset({ pace: pace.value });
      updateInterface();
    }
  });
  sound.addEventListener('change', () => { saveSetting('sound', sound.checked); primeAudio(); });
  letters.addEventListener('change', () => { saveSetting('letters', letters.checked); drawPreview(); requestDraw(); });

  /* Touch controls are zones that a held pointer can slide between: the pointer is captured by the zone it
     first pressed, and each move asks which zone is under it now. Over the gap between zones, it keeps its
     action. */
  function zoneAt(event) {
    if (typeof document.elementFromPoint !== 'function') return null;
    const target = document.elementFromPoint(event.clientX, event.clientY);
    const zone = target && target.closest ? target.closest('[data-action]') : null;
    return zone && !zone.disabled ? zone : null;
  }

  for (const button of controlButtons) {
    button.addEventListener('pointerdown', event => {
      if (game.state !== 'playing' || (event.pointerType === 'mouse' && event.button !== 0)) return;
      event.preventDefault();
      primeAudio();
      button.setPointerCapture(event.pointerId);
      input.holdPointer(event.pointerId, button.dataset.action);
    });
    button.addEventListener('pointermove', event => {
      const zone = zoneAt(event);
      if (zone && input.pointers.has(event.pointerId)) input.holdPointer(event.pointerId, zone.dataset.action);
    });
    const release = event => input.releasePointer(event.pointerId);
    button.addEventListener('pointerup', release);
    button.addEventListener('pointercancel', release);
    button.addEventListener('lostpointercapture', release);
    button.addEventListener('contextmenu', event => event.preventDefault());
    button.addEventListener('click', event => {
      if (event.detail !== 0 || game.state !== 'playing') return;
      input.tap(button.dataset.action);
    });
  }

  /* A device that reports only a fine pointer may still have a touch screen; the first touch shows the controls. */
  document.addEventListener('pointerdown', event => {
    if (event.pointerType === 'touch' && root && !root.classList.contains('touch')) {
      root.classList.add('touch');
      updateInterface();
    }
  });

  function isFormField(target) {
    return ['INPUT', 'SELECT', 'TEXTAREA'].includes(target && target.tagName);
  }

  function isPage(target) {
    return !target || target === boardWrap || target === document.body || target === root;
  }

  document.addEventListener('keydown', event => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (isFormField(event.target) && !(event.code === 'Escape' && !settings.hidden)) return;
    if (event.code === 'Escape' && !settings.hidden) {
      event.preventDefault();
      setSettingsOpen(false);
      settingsButton.focus();
      return;
    }
    if (event.code === 'KeyP' || event.code === 'Escape') {
      if (!event.repeat && ['playing', 'paused'].includes(game.state)) { event.preventDefault(); togglePlay(); }
      return;
    }
    if (event.code === 'Enter' && game.state !== 'playing' && isPage(event.target)) {
      event.preventDefault();
      if (!event.repeat) togglePlay();
      return;
    }
    if (game.state !== 'playing' || !Controls.actionForKey(event.code)) return;
    if (event.code === 'Space' && ['BUTTON', 'A'].includes(event.target && event.target.tagName)) return;
    event.preventDefault();
    input.pressKey(event.code);
  });
  document.addEventListener('keyup', event => input.releaseKey(event.code));

  function pauseOnLeave() {
    input.releaseAll();
    game.pause();
  }
  window.addEventListener('blur', pauseOnLeave);
  document.addEventListener('visibilitychange', () => { if (document.hidden) pauseOnLeave(); });

  const sample = [[0, 73, 519, -0.03], [3, 165, 510, 0.02], [1, 254, 509, -0.1],
    [5, 90, 474, -0.2], [4, 200, 468, 0.13], [2, 150, 416, -0.3]].map(args => Core.makePiece(...args));

  function drawBoard() {
    const ready = game.state === 'ready';
    Render.drawBoard(boardContext, board, {
      pieces: ready ? sample : game.pieces(),
      active: game.active,
      clearing: game.clearing,
      clearProgress: reducedMotion.matches ? 1 : 1 - Math.max(0, game.clearTimer) / Core.CLEAR_SECONDS,
      densities: game.densities,
      danger: !ready && Render.inDanger(game.pileTop()),
      letters: letters.checked
    });
  }

  function drawPreview() {
    Render.drawPreview(previewContext, preview, game.next, letters.checked);
    preview.setAttribute('aria-label', 'next piece: ' + Core.SHAPES[game.next].name);
  }

  /* The loop runs only while there is something to animate: during play it steps the simulation at a fixed rate
     and draws every frame; otherwise one frame is drawn after each change. */
  function requestDraw() {
    if (frameRequested) return;
    frameRequested = true;
    window.requestAnimationFrame(frame);
  }

  function frame(time) {
    frameRequested = false;
    const playing = game.state === 'playing';
    if (playing) {
      accumulator += previousTime ? Math.min(time - previousTime, 100) : 0;
      previousTime = time;
      let steps = 0;
      while (accumulator >= Core.STEP && steps < 12 && game.state === 'playing') {
        game.step();
        accumulator -= Core.STEP;
        steps++;
      }
    }
    drawBoard();
    if (game.state === 'playing') requestDraw();
    else {
      previousTime = 0;
      accumulator = 0;
    }
  }

  function resize() {
    const ratio = Math.min(window.devicePixelRatio || 1, 3);
    Render.fitCanvas(board, Render.VIEW.width, Render.VIEW.height, ratio);
    Render.fitCanvas(preview, Render.PREVIEW.width, Render.PREVIEW.height, ratio);
    drawPreview();
    drawBoard();
  }

  if (typeof window.ResizeObserver === 'function') {
    const observer = new window.ResizeObserver(resize);
    observer.observe(board);
    observer.observe(preview);
  }
  window.addEventListener('resize', resize);

  /* Moving the window to a screen with another pixel ratio changes no CSS size, so it is watched separately. */
  function watchPixelRatio() {
    const query = window.matchMedia('(resolution: ' + (window.devicePixelRatio || 1) + 'dppx)');
    if (typeof query.addEventListener === 'function') {
      query.addEventListener('change', () => { resize(); watchPixelRatio(); }, { once: true });
    }
  }
  watchPixelRatio();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(resize);
  game.reset({ pace: pace.value });
  resize();
  updateInterface();
})();

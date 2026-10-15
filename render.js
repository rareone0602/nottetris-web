/* Canvas drawing for the browser game: the well, its pieces, the row meters and the next piece. Each drawing
   uses a fixed logical coordinate space that is scaled to the canvas's backing store. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./core.js'));
  else root.NotTetrisRender = factory(root.NotTetris);
})(typeof globalThis === 'object' ? globalThis : this, function (Core) {
  'use strict';

  const INK = '#3d3c39';
  const INK_2 = '#6d6a63';
  const INK_3 = '#97938a';
  const PAPER = '#fbf9f3';

  /* The board canvas is 336 by 600 units. The simulation's origin is drawn at ORIGIN, so that its floor lands one
     unit above the bottom edge and the two rows above the top line hold the incoming piece. */
  const VIEW = { width: 336, height: 600 };
  const ORIGIN = { x: 6, y: VIEW.height - 1 - Core.HEIGHT };
  const METER = { x: ORIGIN.x + Core.WIDTH + 10, length: 16 };
  const PREVIEW = { width: 128, height: 64, scale: 0.72 };
  const HATCH = { spacing: 4.5, slope: 0.68 };
  const DANGER_ROWS = 3;

  /* Returns the top of a board row as a fraction of the canvas height. */
  function rowTop(row) {
    return (ORIGIN.y + row * Core.CELL) / VIEW.height;
  }

  /* Sizes a canvas's backing store to its displayed size, and returns whether the size changed. Setting the size
     clears the canvas, so it is only set when it differs. */
  function fitCanvas(canvas, width, height, pixelRatio) {
    const backingWidth = Math.max(1, Math.round((canvas.clientWidth || width) * pixelRatio));
    const backingHeight = Math.max(1, Math.round((canvas.clientHeight || height) * pixelRatio));
    if (canvas.width === backingWidth && canvas.height === backingHeight) return false;
    canvas.width = backingWidth;
    canvas.height = backingHeight;
    return true;
  }

  function scaleTo(context, canvas, width, height) {
    context.setTransform(canvas.width / width, 0, 0, canvas.height / height, 0, 0);
  }

  function trace(context, polygon) {
    context.beginPath();
    polygon.forEach((point, i) => { if (i) context.lineTo(point.x, point.y); else context.moveTo(point.x, point.y); });
    context.closePath();
  }

  function boundsOf(polygon) {
    let left = Infinity, right = -Infinity, top = Infinity, bottom = -Infinity;
    for (const point of polygon) {
      left = Math.min(left, point.x); right = Math.max(right, point.x);
      top = Math.min(top, point.y); bottom = Math.max(bottom, point.y);
    }
    return { left, right, top, bottom };
  }

  /* Hatches a polygon with strokes rising to the right, each on the line y = c - slope * x. The family of lines is
     anchored to the body's position, so the hatching travels with a piece but keeps its direction as the piece
     turns. All strokes share one path. */
  function hatch(context, polygon, anchor) {
    const { left, right, top, bottom } = boundsOf(polygon);
    const { spacing, slope } = HATCH;
    const origin = anchor.y + slope * anchor.x;
    const last = bottom + slope * right;
    context.beginPath();
    for (let c = origin + Math.ceil((top + slope * left - origin) / spacing) * spacing; c <= last; c += spacing) {
      context.moveTo(left, c - slope * left);
      context.lineTo(right, c - slope * right);
    }
    context.stroke();
  }

  function drawPiece(context, body, { active = false, letters = false } = {}) {
    const shape = Core.SHAPES[body.plugin.kind];
    for (const polygon of Core.polygons(body)) {
      context.save();
      trace(context, polygon);
      context.fillStyle = shape.color;
      context.fill();
      context.clip();
      context.strokeStyle = PAPER;
      context.globalAlpha = 0.43;
      context.lineWidth = 0.65;
      hatch(context, polygon, body.position);
      context.restore();
      trace(context, polygon);
      context.strokeStyle = active ? INK : INK_2;
      context.lineWidth = active ? 1.35 : 0.8;
      context.lineJoin = 'round';
      context.stroke();
      if (letters && Core.area(polygon) > 180) {
        const { left, right, top, bottom } = boundsOf(polygon);
        context.fillStyle = INK;
        context.font = '300 14px "Shantell Sans", sans-serif';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(shape.name, (left + right) / 2, (top + bottom) / 2);
      }
    }
  }

  /* A pencil stroke: a slightly bowed line with round caps. */
  function pencilLine(context, startX, startY, endX, endY, ink = INK, width = 1.2) {
    context.beginPath();
    context.moveTo(startX, startY);
    context.bezierCurveTo(startX + (endX - startX) * 0.34 + 0.35, startY + (endY - startY) * 0.34 - 0.45,
      startX + (endX - startX) * 0.68 - 0.4, startY + (endY - startY) * 0.68 + 0.5, endX, endY);
    context.strokeStyle = ink;
    context.lineWidth = width;
    context.lineCap = 'round';
    context.stroke();
  }

  /* The house tick (site/pencil.css, --mark-tick), drawn into a box of the given size. */
  function tick(context, x, y, size) {
    const scale = size / 22;
    context.beginPath();
    context.moveTo(x + 5.2 * scale, y + 10.6 * scale);
    context.bezierCurveTo(x + 6.8 * scale, y + 11.8 * scale, x + 8 * scale, y + 13.4 * scale, x + 8.9 * scale, y + 15.5 * scale);
    context.bezierCurveTo(x + 11.4 * scale, y + 9.6 * scale, x + 15 * scale, y + 4.6 * scale, x + 21 * scale, y + 0.8 * scale);
    context.strokeStyle = INK;
    context.lineWidth = 1.4;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.stroke();
  }

  function drawGrid(context) {
    context.strokeStyle = INK_3;
    context.globalAlpha = 0.22;
    context.lineWidth = 0.6;
    context.beginPath();
    for (let row = 1; row < Core.ROWS; row++) {
      context.moveTo(0, row * Core.CELL);
      context.lineTo(Core.WIDTH, row * Core.CELL);
    }
    context.stroke();
    context.setLineDash([1, 7]);
    context.beginPath();
    for (let column = 1; column < Core.COLS; column++) {
      context.moveTo(column * Core.CELL, 0);
      context.lineTo(column * Core.CELL, Core.HEIGHT);
    }
    context.stroke();
    context.setLineDash([]);
    context.globalAlpha = 1;
  }

  /* A row being cleared is washed out and crossed through from left to right as `progress` runs from 0 to 1. */
  function drawStrike(context, row, progress) {
    const top = row * Core.CELL;
    context.globalAlpha = 0.8;
    context.fillStyle = PAPER;
    context.fillRect(0, top, Core.WIDTH, Core.CELL);
    context.globalAlpha = 1;
    context.save();
    context.beginPath();
    context.rect(-2, top - 2, (Core.WIDTH + 4) * progress, Core.CELL + 4);
    context.clip();
    pencilLine(context, 2, top + Core.CELL / 2, Core.WIDTH - 2, top + Core.CELL / 2, INK, 1.5);
    context.restore();
  }

  function drawWell(context, danger) {
    const left = ORIGIN.x - 1;
    const right = ORIGIN.x + Core.WIDTH + 1;
    const floor = ORIGIN.y + Core.HEIGHT;
    pencilLine(context, left, 0, left, floor);
    pencilLine(context, right, 0, right, floor);
    pencilLine(context, left - 1, floor, right + 1, floor);
    /* The top line stops just short of the walls, so the message over the board covers all of it. */
    const start = ORIGIN.x + 4;
    const end = ORIGIN.x + Core.WIDTH - 4;
    if (danger) {
      pencilLine(context, start, ORIGIN.y, end, ORIGIN.y, INK, 1.6);
    } else {
      context.setLineDash([5, 5]);
      pencilLine(context, start, ORIGIN.y, end, ORIGIN.y, INK_2);
      context.setLineDash([]);
    }
  }

  /* Each row's meter grows with the row's filled area. Near the threshold it darkens, and a row past the
     threshold, which clears at the next landing, gets a tick instead. */
  function drawMeters(context, densities) {
    context.lineCap = 'round';
    densities.forEach((density, row) => {
      const y = ORIGIN.y + (row + 0.5) * Core.CELL;
      const fill = density / Core.THRESHOLD;
      if (fill > 1) {
        tick(context, METER.x - 1, y - 9, 18);
        return;
      }
      context.strokeStyle = INK_3;
      context.globalAlpha = 0.5;
      context.lineWidth = 0.6;
      context.beginPath();
      context.moveTo(METER.x, y);
      context.lineTo(METER.x + METER.length, y);
      context.stroke();
      context.globalAlpha = 1;
      if (fill < 0.04) return;
      context.strokeStyle = fill >= 0.9 ? INK : INK_2;
      context.lineWidth = fill >= 0.9 ? 2.4 : 2;
      context.beginPath();
      context.moveTo(METER.x, y);
      context.lineTo(METER.x + fill * METER.length, y);
      context.stroke();
    });
    context.globalAlpha = 1;
  }

  /* Draws the board. The scene holds `pieces`, the `active` piece, the `clearing` rows and their `clearProgress`,
     the row `densities`, whether the pile is in `danger` of reaching the top line, and whether to draw `letters`. */
  function drawBoard(context, canvas, scene) {
    scaleTo(context, canvas, VIEW.width, VIEW.height);
    context.fillStyle = PAPER;
    context.fillRect(0, 0, VIEW.width, VIEW.height);
    context.save();
    context.translate(ORIGIN.x, ORIGIN.y);
    context.beginPath();
    context.rect(0, -ORIGIN.y, Core.WIDTH, Core.HEIGHT + ORIGIN.y);
    context.clip();
    drawGrid(context);
    for (const body of scene.pieces) drawPiece(context, body, { active: body === scene.active, letters: scene.letters });
    for (const row of scene.clearing) drawStrike(context, row, scene.clearProgress);
    context.restore();
    drawWell(context, scene.danger);
    drawMeters(context, scene.densities);
  }

  function drawPreview(context, canvas, kind, letters) {
    scaleTo(context, canvas, PREVIEW.width, PREVIEW.height);
    context.clearRect(0, 0, PREVIEW.width, PREVIEW.height);
    context.translate(PREVIEW.width / 2, PREVIEW.height / 2);
    context.scale(PREVIEW.scale, PREVIEW.scale);
    drawPiece(context, Core.makePiece(kind, 0, 0), { letters });
  }

  /* Returns whether the settled pile has come within DANGER_ROWS rows of the top line. */
  function inDanger(pileTop) {
    return pileTop < DANGER_ROWS * Core.CELL;
  }

  return { VIEW, ORIGIN, PREVIEW, rowTop, fitCanvas, drawBoard, drawPreview, inDanger };
});

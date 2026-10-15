# Not Tetris in the browser

A browser adaptation of [Not Tetris 2](https://stabyourself.net/nottetris2/)
by [Stabyourself](https://stabyourself.net/), written in HTML, CSS and JavaScript.
The original [Lua source](https://github.com/Stabyourself/nottetris2) supplied
the mechanics: free rotation, moving piles, area-based line clearing and
polygon cutting. Original authorship is credited above the board and in the
page's credits. Its WTFPL version 2 text is preserved in `LICENSE-original.txt`.

The browser implementation and page use the AGPL-3.0-only licence in
`LICENSE`. Vendored Matter.js 0.20.0 is MIT-licensed; its notice
is in `vendor/MATTER-LICENSE.txt`. The original music and artwork are not
copied. The favicon belongs to phy and is not covered by the software licence.
Shantell Sans is loaded from Google Fonts under the SIL Open Font License.
The copied style kit and its source revision are recorded in `NOTICE.md`.

## Play

Open `index.html` in a modern browser. There is no build step or remote
game service. This is an independent repository intended to be served at
`https://rareone0602.github.io/nottetris-web/`. The page styles and icon are
included here; the game does not load scripts or styles from `phy_friends`.

- Left/right arrows or A/D move the current piece.
- Z and X turn it continuously; W also turns anticlockwise and up clockwise.
- Down, S or space accelerates the fall. Release it before accelerating the
  next piece.
- P or Escape pauses, and Enter starts. Leaving the tab also pauses.
- On a touch screen, the left thumb's controls move and the right thumb's turn.
  A held thumb can slide from one control to the next. Pause is in the board's
  top corner. Held sideways, the two sets of controls sit either side of the
  board.

The game cuts any row with more than 81% of its area filled. Remnants
retain their geometry and motion, and disconnected remnants become separate
bodies. The level increases every ten lines. A collision with the pile while
the active piece's centre is above the top line ends the game.

The piece order uses shuffled seven-piece bags, as requested for this browser
version. Every bag includes each tetromino once; no shape can be absent for
more than twelve intervening pieces. This deliberately replaces the original
game's independent random draws. Physics parameters are tuned for this port
rather than a frame-exact emulation of the Lua/Box2D implementation. Local
multiplayer is not included.

Gentle speed, optional sound, letters on blocks and local best scores are
available in settings. No gameplay or input is uploaded.

## Files and checks

`core.js` contains the simulation and exact polygon clipping. `input.js` turns
held keys and touches into actions, `render.js` draws the board and the next
piece on canvas, and `app.js` wires them to the page: settings, sound, storage,
the words around the board and the animation loop, which runs only during play.
`game.css` adds layout on top of the copied notebook and pencil styles. The
board is a whole number of rules tall, as many as the window leaves free, and
the page scrolls it into view when play starts.
The game and tests live at the repository root. Shantell Sans uses the house
informality setting of 100: running text has `INFM 100` and `BNCE 0`; headings
and other hand text have `INFM 100` and `BNCE 50`, following `STYLE.md` §5.

Run the tests with Node.js:

```sh
node --test core.test.cjs ui.test.cjs
```

The physics tests exercise real Matter.js, including transformed cuts and
fragment motion. UI tests use DOM and canvas stubs to check event wiring,
simultaneous and sliding touch input, focus, pausing, the idle loop and
storage failure. Those tests do
not establish browser rendering or performance on a physical phone.

`python3 build-preview.py` creates a single-file review copy at
`out/nottetris-preview.html`, inlining the scripts, styles and favicon.
The font is fetched from Google Fonts when a connection is available;
otherwise the page uses its system-font fallback. Game logic is included in
the file and works without a connection.

## GitHub Pages

Create a public repository named `nottetris-web`, commit these files to `main`,
then choose **Settings → Pages → Deploy from a branch → main → /(root)**.
The `.nojekyll` file keeps this a plain static website. No build workflow,
server, package installation or secret is needed.

This project is independent of `phy_friends`. It does not add files or change
hosting settings in that repository.

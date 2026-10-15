# phy's style guide

This is phy's house style: one voice and one look for everything phy makes,
from pages, slides and posters to READMEs, hobby projects and code. Hand it
to anyone, or any agent, making something for phy. A paper's text has its
own guide; from a paper, this one covers only the main diagram (§8).

The idea behind all of it is to **work in pencil**: graphite on paper, drawn
rather than designed, and as easy to erase and redraw as a pencil line.
Colour belongs only to what the work is about.

**This guide is the standard.** Where anything else disagrees with it, the
guide wins; where the guide is wrong, it is corrected here. The source is
`STYLE.md` in [rareone0602/phy_friends](https://github.com/rareone0602/phy_friends),
also at [its raw address](https://raw.githubusercontent.com/rareone0602/phy_friends/main/STYLE.md)
for an agent to read. Other projects copy the kit (§7) from the same commit
and point to the source; a copy does not update itself. §2 is the guide in
short, for a brief with no room for the rest.

---

## 1. who phy is

- **phy**, always lower case, even at the start of a sentence. The handle is
  `rareone0602` on GitHub and X; a credit to phy links to
  [LinkedIn](https://www.linkedin.com/in/po-hung-yeh-6a8134116).
- **The avatar is phy**, phy's fursona: an Eevee in the colours of phy's
  tuxedo cat, with Oreo crumbs on the ruff and tail (§9).
- **Draws with code.** phy noticed that
  [Grokbot Icon](https://grokbot-icon-studio.serio-ai.chatgpt.site/)'s
  character icons have a low Kolmogorov complexity: a few ellipses, some
  tufts, two pill eyes and a blush. So phy's characters are made by a small
  program, not stored as pixels.

## 2. principles

1. **Work in pencil.** Keep the source (a spec, a script, a Markdown file)
   and the command that builds from it. Each thing has one folder, with its
   examples beside it; working output goes in a git-ignored `out/`, and a
   built file is committed only where publishing needs it, never edited by
   hand. When something goes, all of it goes: no leftover references, no
   half-renamed words, no commented-out code; git remembers. Candidates that
   lose are set aside in a `backup/` folder until phy says otherwise. A first
   version is a sketch, to be redrawn once phy has looked.
2. **Few rules (low Kolmogorov complexity).** Derive values rather than pick
   them: shades from colours, every vertical measure from the rule spacing.
   When matching something, name the one reference and what is matched, and
   measure the difference at the size people will see. If special cases pile
   up, the rule is wrong.
3. **Don't make it too artificial.** Drawn, not designed: honest and quiet,
   with lines that wobble and spacing a little uneven (§6). No gradients,
   glows, glass, drop shadows, emoji, stock icons, hero copy or template
   layouts such as a grid of cards.
4. **Graphite on paper; colour for the subject.** Everything is in paper and
   ink tones (§4), graphite rather than black, except what the work is
   about: the characters on a page, the data in a figure, the things and
   places in a film. Red is only for an error.
5. **One layer.** Colour goes on in one layer: flat in a chart, in coloured
   pencil on a character or a thing (§9). Each colour has at most one shade,
   the house step darker: CIELAB L* `−10` and chroma `×1.2` at the same hue,
   with a near-grey leaning to lavender, as `shadeOf` in `src/phyfriends.js`
   computes it. The shade only parts two neighbours of the same colour, such
   as a character's body under its head. No lighting, highlights or second
   steps, and nothing copied from a reference's light and shade. The pencil's
   texture is paper, and a scale of data values (§8) is data: neither is
   shading.
6. **Keep the set aligned.** Within a set (a family of characters, a figure
   series, a deck), anything new matches what is there in look, size and
   structure, and in code where the set is code. When a rule changes, it
   changes everywhere at once.
7. **Tell things apart first.** If two parts can't be told apart, fix that
   before matching a reference any closer. Simplify only down to what makes a
   thing itself, never past it.
8. **The owner decides.** People and their characters appear only with their
   owners' say-so, and as the owners give them: the name in the owner's
   capitalisation, the species, colours and pronoun, and a credit linking to
   the owner. An owner's wish beats a house rule.
9. **Make it cute.** Characters are soft and round, with a big head on a small
   body. Cute comes before literal, but never at the cost of principle 7.
10. **Not the mode.** The most likely choice (the template, the stock phrase,
    the default chart, the formal tone put on for show) is the boring one;
    look for the way that fits this idea. phy's work stays consistent through
    its rules, not through sameness: inside them each piece is a fresh draw,
    as the face's letters are, though principle 6 still holds within a set.

And the particulars:
- **One hand on one dial:** everything is in Shantell Sans, set by one
  number, `0` for a paper's diagram, `50` for a site, `100` for a hobby
  project (§5). Code is in the system monospace.
- **British English, as The Economist writes it** (§3); code in American
  English, formal and clean (§10).
- **Show phy first**, and keep private things private (§11).
- **A film is cut to its music**, chosen first and free to set to pictures
  (§12).

## 3. words

The model is The Economist: opinionated, analytical and dry. Words are few,
exact and honest, like a note in the margin.
- **British English, all the way down.** The spelling (colour, centre, grey,
  programme, -ise), and the vocabulary, grammar and idiom as well: "at the
  weekend", "in hospital", "a fortnight", "take a decision", "have got", "sort
  it out". American prose in British spelling is not British English.
- **Take a view, and show the working.** Say which is better and why, with
  the evidence or the mechanism. Hedging everything is ceremony of another
  kind.
- **The exact word, in a short sentence.** A long word is welcome when it is
  the precise one ("orthogonal", "idiosyncratic", "a trade-off"), never to
  sound clever. Say how a thing is made ("each one drawn from a hundred-odd
  lines of code") rather than how good it is: numbers and names, not
  adjectives.
- **No hype and no ceremony.** No "magical", "seamless", "powerful", "novel",
  "revolutionary", "leverage" or "unlock"; no "welcome" and no calls to action
  ("get started", "learn more"): when the reader can do something, say what,
  plainly. Lead with the work and end without a sign-off. Full stops and
  colons; no exclamation marks and no emoji.
- **English only.** Another script appears only inside someone's own name or
  a quote of theirs.
- **Case follows the dial** (§5). From `50` up, the chrome (titles, headings,
  intros, nav, labels, notes, captions, buttons and footers) is lower case,
  and running prose is in sentence case. Below `50`, and in plain text the
  face can't reach (READMEs, email), it is sentence case throughout. A chart
  takes the case of the work it sits in. People's and characters' names keep
  their owner's case; other names go lower case in lower-case chrome and keep
  their capitals in prose.
- **Person.** A page talks about the work. Where phy speaks for themself, as
  in a credit line, it says "me". The reader is "you", told the one thing
  they can do.
- **Humour is dark and dry**, and phy's own: understatement, irony, puns and
  self-deprecation; the grim or absurd thing said in the flattest official
  voice, like a mock disclaimer or a solemn footnote. Never explain the joke.
  A formal piece is the same voice with the jokes taken out: none at `0`;
  from `50` up, a line or two per page, in the corners (a note, a caption,
  the footer), never in what the reader came for. Dark about the world, the
  work and the machine; never at the expense of a real person, their
  character or the reader. Never baby talk.
- **Credit** the owner, linked; name an artist only when you know who drew
  the picture. **Dates** go in full in prose (28 September 2026) and short in
  a date line (28 sep 2026).

| do | don't |
|---|---|
| that's me | Meet phy, the creator behind it all! |
| nothing saved yet. | Oops! Looks like there's nothing here yet! |
| the second method is better: it halves the build time. | Both approaches have their merits. |
| one script redraws every figure in about 40 seconds | Blazing-fast, seamless figure generation |

## 4. paper and ink

The page is a sheet of **lined notebook paper**: pale blue rules, a faded
red margin line on the left, and a little paper tooth. **Everything is
written on the rules:** every vertical measure is a whole number of rules,
and text sits on them. The values are tokens in `site/notebook.css`:

| token | value | use it for |
|---|---|---|
| `--paper` | `#fbf9f3` | the sheet |
| `--rule` | `#cfdbe8` | the pale blue rules, `--L` apart: `32px`, `30px` on phones, with `--band`, 4 blank rules, above the first |
| `--margin` | `#e6aaa3` | the faded red margin line, `--margin-x` in: `88px`, `22px` on phones |
| `--ink` | `#3d3c39` | graphite, `10.5:1`: anything, titles, names and body text |
| `--ink-2` | `#6d6a63` | `5.1:1`: quieter words (intros, small print, notes, captions, table heads, code), the lines of controls, focus |
| `--ink-3` | `#97938a` | `2.9:1`: marks only (dashes, squiggles, the quote line, disabled controls); never words someone needs to read |
| `--red` | `#a64a3f` | `5.4:1`: errors, and nothing else; the margin's red, pressed harder |

- The rules and the margin line are decoration: nothing that carries meaning
  is drawn in them.
- The paper tooth is a fine fractal noise at `40%`, multiplied over
  everything.
- There is no dark theme: the page is paper
  (`<meta name="color-scheme" content="light">`). On a dark host, a slide
  say, lay a sheet of paper on it rather than inverting the inks.

## 5. type

**One hand on one dial.** Everything is written in one face, **Shantell
Sans**: a hand drawn with one even line, like a fine pen held lightly. The
pencil is in the rest: the ink, the paper, the marks and the filter over the
title. The face's informality axis lets the same hand be neat in a diagram
and loose in a toy, so formality is a setting of the one voice, never another
voice; above the neat end, a letter that repeats comes out a little
differently each time. Only code (the system monospace) and words in a host
that sets its own type (a paper's text and maths, a README on GitHub) are in
anything else.

**The dial.** Each work has one number, `--informal`, set by what the work
is, not where it appears: `0` for a paper's diagram and for charts
(matplotlib can't turn it), `50` for a site, notes, slides and posters, and
`100` for a hobby project, its site included. A work may sit anywhere
between; these are the usual stops.

**The print and the hand.** Running words, the print, sit at the work's
number `d` (`INFM d`) and never bounce. The few words written rather than
set, the hand (titles, headings, notes, captions, table heads and names), are
never neater than `50` and bounce in the top half: `INFM max(d, 50)`,
`BNCE max(d − 50, 0)`. A chart's words are all at `0` (§8).
- Past `50` a lower-case s grows towards a capital. A site stops there, so
  "saved" still reads as "saved"; a hobby project goes all the way.
- Bounce stops at `50`: any more lifts a p or an s to capital height, and
  "phy" reads "Phy".

**Weight is pressure.** Everything is Light (`300`); bold is `600`, the
pencil pressed harder. There are no other weights and no italics, not even
for the title of a book.

**Sizes** step by `1.2` from the `18px` print. On a phone the hand and the
intro step down one (in brackets); the rest of the print keeps its size.

| in the hand | size | rules |
|---|---|---|
| title | `64px` (`54px`) | 3 (2) |
| part title | `54px` (`45px`) | 3 (2) |
| h2 | `37px` (`31px`) | 2 |
| h3, a result | `26px` (`22px`) | 1 |
| note, caption, table head | `22px` (`18px`) | 1 |

| in the print | size | rules |
|---|---|---|
| intro | `22px` (`18px`) | 1 (2) |
| body | `18px` | 1 |
| small print, code | `15px` | 1 |

- The line height is a whole number of rules. A line moves down by `--sit`
  so its baseline lands on its rule: half a rule, less the rule's 1px, less
  `0.35em` (half the face's ascent, `1.02em`, minus its descent, `0.32em`).
  No nudge is picked by eye.
- **The hand is for a few words**; anything longer than a line goes in the
  print. A title is about 12 letters, what fits on a phone's line. It sits on
  the first rule, with the rule under it left blank for its tails; too long
  for a phone, it shrinks rather than wraps.
- **Loading it:**
  `https://fonts.googleapis.com/css2?family=Shantell+Sans:wght,BNCE,INFM@300..800,-100..100,0..100&display=swap`,
  about 170 KB for Latin. `site/notebook.css` sets the dial; a page changes
  only `--informal`, and marks its hand text with `.hand`. Files for LaTeX,
  matplotlib or a design tool are in `figures/fonts/`. The SIL Open Font
  License allows any use, embedding in a PDF included; keep the licence file
  beside any copy of the font.
- **CJK text** adds `'LXGW WenKai TC'` (Google Fonts, a pencil-like hand)
  after the face, loaded only on pages that need it, with the text marked by
  `lang`.

## 6. hand-drawn marks

Every mark is a single pencil stroke: an SVG path with round caps, `1.1–1.5px`
wide, in an ink, never filled. There are nine:
- a **ground line** along a rule, for a character to stand on, or in
  `--ink-2` going over a rule (under a table's head, under a field);
- a **ring**, one loose loop that doesn't quite close, round "this one": the
  current page, or the one thing that matters;
- an **arrow** from a note to what it's about;
- a **squiggle** for a break, or while loading; in red, the wave under a
  field in error;
- a **side line** down a quote;
- a **box** round the one primary button;
- a **tick**;
- a **cross**, in red, for errors;
- a **caret** on a select.

If something needs a tenth mark, write a word instead. A mark may turn to
point somewhere or grow to hold its own; it is still the same mark.

- **Focus** is a dashed pencil outline, `1.5px` in `--ink-2`, `3–4px` clear of
  the thing.
- **Tilts** are anticlockwise and never more than `2°`: the title `−1°`, a
  margin note `−2°`, the button's box `−0.8°`.
- **The graphite filter** goes over the title, the ground line and the arrow,
  never over small text or a figure. Paste it once into each page:

```
<svg width="0" height="0" style="position:absolute" aria-hidden="true">
  <filter id="graphite" x="-2%" y="-20%" width="104%" height="140%">
    <feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="2" seed="7" result="n"/>
    <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.4 2.1" result="grain"/>
    <feComposite in="SourceGraphic" in2="grain" operator="in" result="g"/>
    <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="1" seed="2" result="w"/>
    <feDisplacementMap in="g" in2="w" scale="1.5" xChannelSelector="R" yChannelSelector="G"/>
  </filter>
</svg>
```

## 7. parts of a page

**The kit**, to copy from rareone0602/phy_friends: `site/notebook.css` (the
paper), `site/pencil.css` (everything drawn on it; its opening comment lists
the classes), `site/icon.svg` (the favicon), `figures/` (§8) and the graphite
filter (§6). `specimen.html` shows every part below at work, on the rules,
with the dial to turn. A page is put together as the specimen is:
`<html lang="en-GB">` with the colour-scheme meta (§4); in the head the face,
then `notebook.css`, then `pencil.css`, and `--informal` on `:root` where the
work is not at `50`; the graphite filter first in the body; and a `main`
holding a `header` (the title, the intro and any nav), the writing inside
`.doc`, and a `footer`.

**Layout.** One column, `42em` at most, left-aligned against the margin
line: a title in the hand, one line of intro, the content and a small
footer. Nothing else is required.

**Small print**, in `--ink-2`: the nav, a date line, a contents line and the
footer.
- The nav sits on the rule under the intro: plain words spaced apart,
  underlined only while hovered, with the ring round the current page. No
  menus and no hamburgers; a page in one part needs no nav.
- A date line, a contents line and the footer split their items with middle
  dots: "28 sep 2026 · pencils · paper". Tags are plain words: no pills and
  no #. A long page opens its writing with a contents line of its headings,
  each a link.

**Links** are the text itself, underlined like a pencil line (`1px`, `3px`
below), darkening to `--ink` when hovered.

**Lists, quotes and code.** A list item starts with a dash in `--ink-3`, and
a numbered one with its number in the hand. A quote is indented, in
`--ink-2`, with the side line. Code is one line to a rule; a block is
indented like a list, with no box, and wraps rather than scrolls.

**Pictures** are a whole number of rules tall, with top and bottom on rules,
no frame, no rounded corners and no shadow, and are scaled to fit, never
cut: a chart loses nothing on a phone. A photo stays a photo. A scan or a
line drawing on white is laid in with `multiply`, so its white becomes the
paper; a character or a chart is drawn on paper or on nothing. The caption is
a note on the next rule. Never put words over a photo.

**Tables.** The rules are the rows: no borders, stripes or vertical lines.
The head is in the hand in `--ink-2`, with the rule under it gone over in
pencil, and a cell that wraps takes whole rules. A phone fits three columns:
fold the rest into a label, or split the table.

**Controls:**
- **One primary button per view:** the word in the pencil box. Hovering goes
  over the box again, and pressing moves it down `1px`. Every other button is
  quiet: the word alone, underlined like a link.
- **A text field** has its label on its own rule, in `--ink-2`, and the field
  on the next, with no box: the rule under it is gone over in `--ink-2`. No
  placeholders: put an example in the label. **A select** is the same, with
  the caret; its open list is the system's.
- **A checkbox** is a pencil box with a tick that overshoots it. There are no
  switches. **Disabled** things are in `--ink-3`.

**States:**
- **An error** turns the field's line into a red wave, and a red note on the
  next rule says what to do: "that needs to be a number, like 250".
- **A result** is written in the hand with the arrow pointing at it, numbers
  and all.
- **Loading** shows the squiggle drawing itself and one plain word:
  "counting…". Under reduced motion it stays still.
- **An empty state** is one note, "nothing saved yet.", then a few blank
  rules. No picture, no "oops".

**A portrait.** An about page may have one character standing beside the
title, a rule taller than it. It stands on the title's rule, reaches up into
the blank band, and may watch the cursor.

**Other places:**
- **Favicon:** phy's head on everything phy makes, unless the work is about
  another character.
- **Link preview:** the page itself, photographed at `1200×630`; not a
  designed card, with no extra text and no logo.
- **README:** GitHub strips CSS, so the style lives in the words, in
  sentence case (§3): a title, one honest line, the preview picture and short
  plain sections. No badges, no emoji and no feature lists.
- **Print:** plain paper. The rules, margin line, tooth, nav and portrait
  drop out; the ink stays.

## 8. charts, slides and a paper's diagram

Charts and diagrams wear the same pencil, and the data plays the characters'
part as the only saturated thing (principle 4). The matplotlib styles in
`figures/` carry these rules; stack an overlay for the medium:

```
plt.style.use(['phy.mplstyle', 'phy-slides.mplstyle'])  # Slides and the web.
plt.style.use(['phy.mplstyle', 'phy-print.mplstyle'])   # Print: white, in the host document's typeface.
```

**Data colours** come from phy's characters: each is a character's colour
taken down in the house shade step (principle 5) until it holds `3:1` on the
paper, and where two still sat too close, one took another step.
`python3 figures/palette.py` derives them again and prints the tests.

| series | colour | shade |
|---|---|---|
| 1, blue | `#1092ca` | `#1777a4` |
| 2, red | `#a74126` | `#931800` |
| 3, slate | `#4d6295` | `#284a85` |
| 4, ochre | `#a98f12` | `#8c7609` |
| 5, pink | `#d56b75` | `#c34758` |

- Every pair stays apart under protanopia, deuteranopia and tritanopia
  (CIEDE2000 `13.9` at the closest), but the five fall into only two tiers of
  grey: a figure that may be printed in grey needs direct labels or marker
  shapes as well.
- **Five at most.** Fold the rest into "other" in `--ink-3`, or split the
  figure into small panels. Take the colours in order; a series keeps its
  colour from figure to figure, never its rank.
- **Data on a scale** takes the blue in steps: `#e4f3ff` `#abdafe` `#83c0ea`
  `#55a6d7` `#0c8dc3` `#09729f` `#06587c`. The lightest four fall short of
  `3:1` on the paper, so they are for fills only; a line or a small mark takes
  one of the last three. **Data either side of a middle** takes the blue and
  the red, with the paper in the middle.

**Charts:**
- Words are in `--ink`; axes, ticks and numbers in `--ink-2`.
- Two spines, short ticks, no box and no grid. Where a grid helps, pale rules
  (`#cfdbe8`, `0.6pt`) run across y only, under the data.
- Lines are `1.2pt` with round caps. Fills are flat, and a band of spread is
  the series colour at `16%`.
- Label lines at their ends. A legend goes only where labels would collide,
  and has no frame.
- The face is at `0`, which is the font file's default, so matplotlib needs
  no dial; but register it before plotting, or matplotlib falls back to
  Helvetica Neue without a word:
  `font_manager.fontManager.addfont('figures/fonts/ShantellSans-Variable.ttf')`.
  A chart inside a document with its own typeface takes that typeface
  instead (the print overlay).
- No wobble and no graphite filter: on a chart they look bent, not drawn.
- A caption says what is shown, then what it shows: "build time for four
  versions: the last one halves it". Never just "results".

**Slides.** A slide is the notebook page `×1.5`: at `1280×720` the rules are
`48px` apart, 15 to a slide, and the title is `96px`. A chart on a slide takes
the slides overlay's sizes instead.
- The title states the point, not the topic.
- A chart sits on blank paper, since rules behind it would read as gridlines;
  the overlay's paper-toned figure covers them.
- One note with an arrow may point at the one thing to see.
- The bottom line, in small print, gives the source and what is missing:
  "one run each; no error bars".

**A paper's main diagram**, the teaser or method overview that people
remember the paper by and redraw in their own talks, is where the pencil
shows; the paper's text keeps the venue's type. `figures/phy-diagram.sty`
carries it for TikZ, and `figures/diagram.tex` is an example.
- Build it as its own file with `lualatex diagram.tex` and include the PDF,
  so the paper builds as usual, arXiv included, without the font. Only
  LuaLaTeX can turn the dial; XeLaTeX stops with a message.
- It sits on white, with no title: the caption carries it. Its words are in
  the face at `0`, in sentence case; a box holds a noun or two, and the
  caption does the explaining. A diagram for a site or slides takes that
  work's number: `\usepackage[informal=50]{phy-diagram}`.
- Symbols and values are maths in the paper's own type, so the `z_t` in the
  diagram is the `z_t` in the text: load the paper's text and maths packages
  (`newtxtext` and `newtxmath` for Times) before `phy-diagram`.
- One note in the hand, at `50`, with an arrow, may point at the new part.
- Draw it at the size it prints, `6.75in` across both columns or `3.3in` in
  one, so words come out at `8pt` and none is smaller than `7pt`.
- Lines are graphite, `0.7pt`, with round caps and open arrowheads, and
  wobble a little from a fixed seed, so a rebuild draws the same lines.
- Boxes are outlined, not filled. Colour goes only to the new part, or to the
  few things the reader must follow: a data colour on the line and at `16%`
  inside, the same in every figure of the paper.

## 9. the avatar and characters

- **phy's mark is phy** (§1): the head alone for a favicon or avatar, the
  whole character where there is room. It is drawn by `src/phyfriends.js`
  from `characters/phy/phy.js`, never by hand, so every copy matches.
- Every character is a small spec, about 100 lines, that a factory draws
  **in coloured pencil**: soft round shapes coloured in without an outline,
  pill eyes in the character's own eye colour, a soft blush, and no nose and
  no mouth by default. Each has exactly one shade layer (principle 5), which
  its body, under the head, always wears. The rules for drawing one, and the
  references a reviewer needs, are in `FWIENDS.md`, next to the factory.
- **The pencil is one texture over the whole character**: strokes rising to
  the right, the paper's tooth, and patches where the hand pressed more
  lightly, with the paper, rules and all, showing through. The texture
  belongs to the paper: it stays put while the character breathes, turns or
  hops on the spot, and travels with it about a page, as a figure cut out of
  paper would. On a background of its own, such as a dark close-up, a
  character is drawn on paper cut to its outline, so the pencil shows paper,
  never the background. An icon too small to hold the texture, such as a
  favicon, is drawn flat.
- **Motion** is calm and alive: eyes that follow the pointer, smoothed so
  they never jitter, over breathing, irregular blinks and a slow sway.
  Nothing bounces all the time. Under `prefers-reduced-motion` only the eyes
  move, and a page whose characters move of their own accord offers the same
  as a checkbox, "keep still".

## 10. code

Code is a language of its own: American English, formal, and clean in the
sense of Robert C. Martin's Clean Code. The dial, the lower-case chrome and
the humour stop at its edge.
- **American English** in identifiers, comments, docstrings and commit
  messages: `color`, `center`, `gray`, `normalize`, `behavior`, `license`,
  `labeled`, `toward`. Words the code puts in front of people (a page's text,
  a label, an error message) are copy, and follow §3.
- **Formal.** Comments and docstrings are full sentences in sentence case,
  plain and precise: no jokes, no asides and no metaphors.
- **Plain names:** no cute names, no puns, and no abbreviations beyond the
  field's own (`rgb`, `L*`).

## 11. working with phy

- **Discuss before building** anything big: say what you'll make and wait
  for a yes.
- **Show, don't describe.** Render the options and put them side by side.
  Looks are settled by looking; once one is settled, write it down here, at
  the source.
- **phy reviews before anything is published.** Pushing, posting and sharing
  are phy's call, each time.
- **Fanning out is welcome:** a big job may go to several agents in
  parallel. Visual work then goes to an adversarial reviewer who knows the
  references. A review, whoever writes it, is a reference rather than an
  order: check each finding against the work, adopt what holds, and say what
  was rejected and why.
- **Ideas before the guide.** For a film, a game or anything made to delight,
  think first of what the viewer will enjoy, without this guide in mind
  (brief an ideas agent without it), then draw the idea in the house style.
  Where a rule blocks a good idea, propose changing the rule rather than
  dropping the idea. The owners' say (principle 8) is not style, and always
  holds.
- **Private stays private.** Personal references (photos of a real pet, say)
  live in a git-ignored folder and never reach a public page. Quote phy's own
  words only where a piece needs them.

## 12. films and sound

A film is a page that moves, so everything above holds; this adds the sound
and the pace.
- **Music first.** Choose the track before the story. Measure it once, into
  data beside the film (its bars and beats, or, where the tempo is free, its
  moments), and write every cue against that data, never by ear.
- **The pace is the music's.** Motion lands on phrases, not on every beat,
  and a film may cut, pan and push in on the music's lifts, where a page
  stays calm (§9).
- **Whose music.** Never music that the agent making the film composes or
  generates; music someone else made with AI only where it is good. The
  licence must let a hobby film set it to pictures: public domain in the US,
  where the site is served (the recording as well as the score), CC0, CC BY
  or CC BY-NC. CC BY-SA only where phy alone is on screen, since the other
  characters are not phy's to license; never ND. Credit the composer even
  where nothing requires it. A commercial song goes only through a
  platform's own library, never on a page.
- **Credits once, large.** A link in a picture cannot be clicked, so a video
  names the people and characters in it once, written large, and the post
  that carries it links them.


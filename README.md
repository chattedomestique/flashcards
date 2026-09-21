# Shapes

Twelve shapes on an endless carousel. Swipe through them, tap to see the name.
That's the whole app.

No build step, no dependencies, no framework — open `index.html` and it runs.

```
index.html   the shell
styles.css   design tokens and motion
decks.js     the twelve shapes
app.js       deck, flip, gestures
```

## Controls

Touch only, and there is nothing on screen but the card.

|                 |              |
| --------------- | ------------ |
| See the name    | Tap the card |
| Next / previous | Swipe        |

The carousel wraps in both directions, so there is no first or last shape.
<kbd>←</kbd> <kbd>→</kbd> and <kbd>Space</kbd> also work if a keyboard is attached.

## Two rules the motion depends on

**The deck is one horizontal strip.** Card N sits N widths to the right of the
current one, so moving is a single translation and the whole strip follows your
finger 1:1. Forward and backward are the same motion mirrored. Nothing ever
fades in or out on top of anything else — an earlier build cross-faded going
forward and slid going back, which is why the two directions felt like different
apps.

Every card is built once and never re-rendered; moving rewrites one `--offset`
custom property. Cards more than one step away sit off screen, and because the
carousel wraps they occasionally jump the long way round, so their transition is
switched off before they move.

**Reduced motion means gentler, not instant.** Setting every duration to `0.01ms`
— the usual snippet — turns an app into jump cuts for exactly the people who
asked for calm, and that is what it did here. The carousel now slides under
`prefers-reduced-motion` too, because a horizontal move is mild and a
cross-fade is what read as broken; what goes is the overshoot.

The flip is deliberately left alone under that setting. It is the point of the
app, and a dissolve made the card appear to ghost rather than turn.

## The flip

Three things have to be true or it is not a flip:

- **`perspective` belongs on `.card`**, the flip's direct parent — not on
  `.deck`. `.card` sits between them with its own transform and a flat
  `transform-style`, which flattens the 3D away: the card then squashes
  horizontally instead of turning. Measured at 45°, a face is 484px tall
  flattened and 524px tall with perspective, because the near edge is
  magnified.
- **`backface-visibility: hidden`** on both faces hands over at exactly 90°.
  Verified by pixel count: the shape side is still painting at 89° and gone at
  91°, and the two are never both on screen.
- **The easing is `cubic-bezier(0.83, 0, 0.17, 1)`** — a pronounced ease in and
  out. A spring is wrong here: the overshoot rotates past 180° and comes back.

## Adding a shape

`decks.js` is the only file to touch:

```js
{ id: "kite", name: "Kite", tone: 3, path: "M50 4L88 50…", scale: 1.04, dy: 2 }
```

`path` is drawn on a `0 0 100 100` viewBox. `scale`, `dx` and `dy` are optional
optical corrections — measured, not guessed. Each shape was rasterised and its
filled area and bounding box compared against the set: a triangle inscribed in
the same box as a square carries 39% of its ink and sits high on its centroid,
so without a correction it reads as a smaller shape floating above the others.
The stroke width is divided back out by `scale` so every outline keeps one
weight. `tone` is a palette slot, 1–6.

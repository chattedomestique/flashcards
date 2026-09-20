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

|                   | Pointer      | Keyboard                  |
| ----------------- | ------------ | ------------------------- |
| See the name      | Tap the card | <kbd>Space</kbd>          |
| Next / previous   | Swipe        | <kbd>←</kbd> <kbd>→</kbd> |
| Back to the first | —            | <kbd>Home</kbd>           |

The carousel wraps in both directions, so there is no first or last shape.

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
asked for calm, and that is what it did here. Under `prefers-reduced-motion` the
carousel still slides, because a horizontal move is mild and a cross-fade is
what read as broken; what goes is the overshoot. The flip has no non-3D
equivalent, so it becomes a sequenced dissolve — the outgoing face reaching zero
before the incoming one starts, so the two are never both on screen at once.

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

# Shapes

Twelve shapes. Swipe through them, tap to see the name. That's the whole app.

No build step, no dependencies, no framework — open `index.html` and it runs.

```
index.html   the shell
styles.css   design tokens and motion
decks.js     the twelve shapes
app.js       deck, flip, gestures
```

## Controls

|                 | Pointer                     | Keyboard                       |
| --------------- | --------------------------- | ------------------------------ |
| See the name    | Tap the card                | <kbd>Space</kbd>               |
| Next / previous | Swipe, or the arrow buttons | <kbd>←</kbd> <kbd>→</kbd>      |
| First / last    | —                           | <kbd>Home</kbd> <kbd>End</kbd> |

## Two rules the motion depends on

**Only transform and opacity animate.** Every card is built once at startup and
never re-rendered. Moving through the deck rewrites one `data-pos` attribute and
nothing else, so the browser interpolates compositor properties and never
repaints content mid-transition. Re-rendering one shared card on every change is
what made an earlier build flash.

**Reduced motion means gentler, not instant.** Setting every duration to `0.01ms`
— the usual snippet — turns an app into jump cuts for exactly the people who
asked for calm, and that is what it did here. Under `prefers-reduced-motion` the
choreography survives at the same timings and easing; what goes is the travel,
the rotation and the 3D. The flip becomes a sequenced dissolve, the outgoing
face finishing before the incoming one starts, so the two are never both on
screen at once.

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

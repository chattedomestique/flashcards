# Flashcards

A small, multi-modal flashcard app for learning shapes. No build step, no
dependencies, no framework — open `index.html` and it runs.

## Multi-modal by default

Every card is available through four channels at once, and none of them is
load-bearing on its own:

| Channel  | How                                                                                                                                                                                                    |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **See**  | The shape is drawn as inline SVG, so it stays sharp at any size and inherits the theme's colours.                                                                                                      |
| **Hear** | The answer is spoken with the Web Speech API, and "Hear it again" repeats it as often as you like. In the quiz, "find this shape" questions read the prompt aloud, so the word itself is the question. |
| **Read** | Each card carries fact chips (sides, corners, a defining trait), a plain-language definition, and something from the real world with that shape.                                                       |
| **Feel** | Short vibration ticks confirm a flip and mark an answer right or wrong, where the device supports it.                                                                                                  |

Turn sound and vibration off with the speaker button and nothing is lost —
every fact is still on the card. Turn on `prefers-reduced-motion` and the
card cross-fades instead of rotating; no content and no state disappears.

## Studying

**Learn** deals the deck weakest-first — shapes you have not got right yet come
before ones you have — so a session spends its time where it is needed. Reveal
the answer, then say whether you got it. **Quiz** alternates direction question
by question: name the shape you see, then find the shape you hear, exercising
recognition and recall both ways.

A shape counts as learned after two correct answers in a row. Progress is kept
in `localStorage` and survives a reload; if storage is unavailable the app still
runs, it just forgets.

Two deliberate choices about honesty:

- **Colour never identifies a shape.** Every option in a quiz question is drawn
  in the same colour. Otherwise a learner can answer on palette memory and never
  look at the geometry.
- **Learn does not show a percentage.** A score computed from self-reports is a
  number nobody earned, so Learn reports plain counts and the gauge is reserved
  for the quiz, where the answer was actually checked.

### Controls

| Action               | Pointer                            | Keyboard                       |
| -------------------- | ---------------------------------- | ------------------------------ |
| Reveal the answer    | Tap the card, or **Reveal answer** | <kbd>Space</kbd>               |
| Hear it again        | **Hear it again**                  | <kbd>Space</kbd> on the button |
| Mark for another try | Swipe left                         | <kbd>1</kbd>                   |
| Mark as known        | Swipe right                        | <kbd>2</kbd>                   |
| Move between cards   | —                                  | <kbd>←</kbd> <kbd>→</kbd>      |
| Leave the session    | Back button                        | <kbd>Esc</kbd>                 |

Every rating can be undone from the toast that follows it, and so can resetting
your progress.

Rating a card that is still face down turns it over first and waits a beat, so
the answer is always seen. Turn it over yourself and the rating is immediate —
there is no penalty for already knowing it.

## Adding a deck

`decks.js` is the only file to touch. Append to `FLASHCARD_DECKS`:

```js
{
  id: "colours",              // stable; saved progress is keyed off card ids
  name: "Colours",
  blurb: "Shown on the home screen.",
  cards: [
    {
      id: "red",              // never rename or reuse — it is the progress key
      name: "Red",
      tone: 3,                // palette slot 1-6
      art: { path: "M10 10..." },  // SVG path on a 0 0 100 100 viewBox
                                   // optional: scale, dx, dy (see below)
      facts: ["warm", "primary", "long wavelength"],
      definition: "One plain sentence.",
      example: "a fire engine",
    },
  ],
}
```

Shape art is drawn on a `0 0 100 100` viewBox and rendered into a padded
`-8 -8 116 116` frame so the stroke never clips. Fill and stroke come from the
theme, so a new card works in light and dark mode without extra work.

`scale`, `dx` and `dy` are optional optical corrections, and they are measured
rather than guessed: each shape is rasterised, and its filled area and bounding
box are compared against the deck. A triangle inscribed in the same box as a
square carries 39% of its ink and sits high on its centroid, so without a
correction it reads as a smaller shape floating above the others. The correction
is deliberately partial — equalising area outright overflows the frame, and a
circle should read slightly larger than a square to look the same size. The
stroke width is divided back out by `scale` so every outline keeps one weight.

## Layout

```
index.html   semantic shell; every screen is a <section> toggled with [hidden]
styles.css   design tokens and components
decks.js     content — the only file you need for a new deck
app.js       state, routing, gestures, speech, persistence
```

## Two rules worth keeping

1. **A 3D transform never goes on an ancestor of the thing being transformed,
   and nothing between `.card` and `.card-inner` may clip, filter or contain.**
   The flip lives on `.card-inner`; `.card` owns the `perspective`; nothing
   above either rotates. That second clause is the subtle one — any `overflow`
   other than `visible`, plus `filter`, `mask`, `opacity < 1` or `contain`,
   silently forces `transform-style` to `flat` while `getComputedStyle` still
   cheerfully reports `preserve-3d`. An earlier build hit this on two elements
   at once and spent eight commits retuning the easing. A test asserts the whole
   chain.
2. **No transition may gate input.** There is no "is animating" flag for a
   dropped `animationend` to strand — the deck advances on a timeout that
   fires whether or not the animation does.

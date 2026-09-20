# Flashcards

A small, multi-modal flashcard app for learning shapes. No build step, no
dependencies, no framework — open `index.html` and it runs.

## Multi-modal by default

Every card is available through four channels at once, and none of them is
load-bearing on its own:

| Channel | How |
| --- | --- |
| **See** | The shape is drawn as inline SVG, so it stays sharp at any size and inherits the theme's colours. |
| **Hear** | The answer is spoken with the Web Speech API. In the quiz, "find this shape" questions read the prompt aloud, so the word itself is the question. |
| **Read** | Each card carries fact chips (sides, corners, a defining trait), a plain-language definition, and something from the real world with that shape. |
| **Feel** | Short vibration ticks confirm a flip and mark an answer right or wrong, where the device supports it. |

Turn sound and vibration off with the speaker button and nothing is lost —
every fact is still on the card. Turn on `prefers-reduced-motion` and the
card cross-fades instead of rotating; no content and no state disappears.

## Studying

**Learn** walks the shuffled deck one card at a time. Reveal the answer, then
say whether you got it. **Quiz** alternates direction question by question —
name the shape you see, then find the shape you hear — so recognition and
recall both get exercised.

A shape counts as learned after two correct answers in a row. Progress is kept
in `localStorage` and survives a reload; if storage is unavailable the app
still runs, it just forgets.

### Controls

| Action | Pointer | Keyboard |
| --- | --- | --- |
| Reveal / hide | Tap the card | <kbd>Space</kbd> or <kbd>Enter</kbd> |
| Mark for another try | Swipe left | <kbd>1</kbd> |
| Mark as known | Swipe right | <kbd>2</kbd> |
| Move between cards | — | <kbd>←</kbd> <kbd>→</kbd> |
| Leave the session | Back button | <kbd>Esc</kbd> |

Every rating can be undone from the toast that follows it.

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
      facts: ["warm", "primary", "long wavelength"],
      definition: "One plain sentence.",
      example: "a fire engine",
    },
  ],
}
```

Shape art is drawn on a `0 0 100 100` viewBox and rendered into a padded
`-5 -5 110 110` frame so the stroke never clips. Fill and stroke come from the
theme, so a new card works in light and dark mode without extra work.

## Layout

```
index.html   semantic shell; every screen is a <section> toggled with [hidden]
styles.css   design tokens and components
decks.js     content — the only file you need for a new deck
app.js       state, routing, gestures, speech, persistence
```

## Two rules worth keeping

1. **A 3D transform never goes on an ancestor of the thing being transformed.**
   The flip lives on `.card-inner`; nothing above it rotates. An earlier build
   animated a wrapper and left the whole screen facing away from the viewer.
2. **No transition may gate input.** There is no "is animating" flag for a
   dropped `animationend` to strand — the deck advances on a timeout that
   fires whether or not the animation does.

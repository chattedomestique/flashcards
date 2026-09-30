# Flashcards style sheet

v0.1 · wireframe stage · first element: **Cards** · 2026-09-30

The same sheet, two ways. **`index.html`** is the one to look at: live specimens, every
state, the markup read straight off the page. **This file** is the one to build from: exact
values, class names, and the reasons. If the two ever disagree, the CSS in `css/` wins and
the disagreement is a bug in whichever one is wrong. `node tools/check.mjs` catches the
mechanical kind.

> **For a coding agent.** Read this before touching UI. Use the classes and tokens named
> here; don't invent new ones. Components read *roles* (`--paper`, `--ink`, `--tone-3`),
> never a hex. Run `node design/tools/check.mjs` before you finish. If something you need
> isn't here, it belongs to an element that hasn't been through the pipeline yet: say so
> instead of improvising it.

---

## 1. What this is

Minimal, brutalist, friendly, and not AI-looking. Each word is a constraint you can check,
not a mood:

| Word | What it means here | How it's enforced |
| --- | --- | --- |
| Minimal | One type family. Two line weights. Nothing decorative. | Rules 1, 4, 7 |
| Brutalist | Visible structure. Hard 2px frames, hard shadows, big flat type, no softening effects. | Rules 1, 2 |
| Friendly | Circles and pills for everything you can act on. Large, relaxed type. Copy that talks like a person. | Rules 3, 5 |
| Not AI-looking | No gradients, blur, glass, tinted-circle icons, accent stripes, one-radius-for-everything, or copy that fits any product. | `check.mjs` bans the mechanical ones; rule 5 covers the rest |

### The seven rules

1. **Two line weights.** `--bw` 2px frames what you press or what contains. `--bw-thin` 1px
   only divides. `--bw-heavy` 4px exists for forced-colours mode and nothing else.
2. **Flat.** No gradients, no blur, no translucency. A shadow is hard-edged (zero blur) and
   means "you can press this". Nothing else gets one.
3. **Rectangles hold, circles act.** Containers are rectangles, square or soft (still an open
   decision). Buttons, handles and action slots are circles or pills.
4. **Uppercase is structure.** Bar labels, index numbers, the display line. Everything you
   read is sentence case.
5. **Say something real.** No lorem ipsum, no "John Doe", no "seamless". Copy comes from the
   app: shapes, decks, cards known, streaks.
6. **Colour is a swap.** Components read roles. Only `tokens/color.*.css` contains a hex.
7. **No decoration.** If it carries no information and offers no action, it goes. No dotted
   backgrounds, no icons in tinted circles.

### The test

Run it on any screen before calling it done.

- **Squint.** Blur your eyes or the screenshot. Does the structure survive with colour
  removed? If it only works in colour, colour is hiding a layout problem.
- **Cover the logo.** Could this be any product's card? Then the copy or the shape isn't
  doing its job.
- **Count.** Line weights: two. Type families: one. Gradients: zero. Blurred shadows: zero.
  Shadows on things you can't press: zero.
- **Read it out loud.** If it sounds like a landing page, rewrite it.

---

## 2. Foundations

Everything is a custom property. Sizes are `rem` so they follow the reader's text size; line
weights are `px` so a 2px rule stays 2px.

### Files and layers

```
css/flashcards.css        the one file an app links. Declares the layer order.
  fonts.css               @font-face for Archivo (variable: wght 100–900, wdth 62–125%)
  tokens/foundation.css   type, space, line, shape, hit, motion  (layer: tokens)
  tokens/color.wire.css   grey ramp → roles → six tone slots     (layer: tokens)
  base.css                reset, element defaults, .t-* styles, [data-tone]   (layer: base)
  icons.css               five masked glyphs                     (layer: base)
  components/card.css     the card                               (layer: components)
  wire.css                wireframe placeholders, .wf-*          (layer: wire)
css/sheet.css             the style-sheet page's own chrome, .sg-*  (not shipped)
```

Layer order is `tokens, base, components, wire, sheet`. Later wins, so nothing needs a
specificity fight to override something beneath it.

### Type

One family, three widths. Archivo's width axis does the job a second typeface normally
does: expanded for posters, normal for reading, condensed for labels. Fallback stack:
`"Archivo", "Helvetica Neue", Helvetica, Arial, sans-serif`. Self-hosted, latin subset,
SIL OFL 1.1 (`fonts/OFL.txt`).

Each style is a whole `font` shorthand, so weight, width, size, line-height and family
travel together. `expanded` and `condensed` are the keyword forms of `font-stretch`
(125% and 75%).

| Token | Weight · width | Size | Line | Tracking | Use |
| --- | --- | --- | --- | --- | --- |
| `--type-display` | 900 · 125% | `--text-4xl` 68–240px | 0.85 | −0.035em | `.t-display`. Uppercase. One per page. |
| `--type-title` | 500 · 100% | `--text-xl` 24–32px | 1.1 | −0.015em | `.t-title`. Card and section titles. Balanced. |
| `--type-body` | 400 · 100% | `--text-md` 16px | 1.5 | 0 | `.t-body`. Pretty-wrapped. |
| `--type-meta` | 400 · 100% | `--text-sm` 14px | 1.3 | 0 | `.t-meta`. Tabular figures. Soft ink. |
| `--type-label` | 700 · 75% | `--text-xs` 13px | 1 | +0.08em | `.t-label`. Uppercase. Structure only. |
| `--type-figure` | 600 · 112.5% | `--text-3xl` 48–104px | 0.85 | −0.03em | `.t-figure`. Tabular, lining. |

Size scale: `--text-xs` 0.8125rem · `--text-sm` 0.875rem · `--text-md` 1rem · `--text-lg`
1.25rem · `--text-xl` `clamp(1.5rem, 1.3rem + 0.9vw, 2rem)` · `--text-2xl`
`clamp(2rem, 1.5rem + 2.2vw, 3.25rem)` · `--text-3xl` `clamp(3rem, 1.6rem + 5.6vw, 6.5rem)` ·
`--text-4xl` `clamp(4.25rem, 1rem + 15vw, 15rem)`.

Inside a card, title and figure sizes come from the card's own width (`cqi`), not the
viewport. See §3.

### Space

A 4px grid. `--space-N`: 1 = 4px · 2 = 8 · 3 = 12 · 4 = 16 · 5 = 24 · 6 = 32 · 7 = 48 ·
8 = 64 · 9 = 96 (`--space-0` is 0). `--gutter` `clamp(1rem, 0.6rem + 1.6vw, 1.75rem)` is the
gap between cards. `--measure` 62ch is the widest a paragraph gets.

### Line

`--bw-thin` 1px (divides: foot rules, list rows) · `--bw` 2px (frames: cards, controls, tiles) ·
`--bw-heavy` 4px (forced-colours only).

### Shape

Circles and pills are always `--radius-pill` (999px). Everything else reads exactly three
roles, which are the only radii a component may use:

| Role | Square | Soft | Used by |
| --- | --- | --- | --- |
| `--radius-card` | 0 | `--radius-3` 24px | the card frame |
| `--radius-tile` | 0 | `--radius-2` 12px | icon tiles, media inset |
| `--radius-ctl` | 0 | `--radius-1` 6px | the square bar control |

**Open decision: square or soft.** Both are implemented; the switch at the top of
`index.html` flips them. To commit, set the three roles in `tokens/foundation.css` and delete
the loser from `sheet.css`. Nothing in `components/` changes.

One shape gesture per card: round it **or** notch it, never both. The notch card stays
square in both modes; its cut is the gesture.

### Hit targets and focus

`--hit` 2.75rem (44px). The drawn thing may be smaller; the target is not. A 20px box is
fine inside a 44px control. `--ring` 3px, `--ring-offset` 3px, colour `--focus`. Inside a
card the ring's offset drops to 2px (or goes negative on a bar or a list row), because the
card clips its contents; and its colour follows the surface it lands on.

### Tone (colour, at the wireframe stage)

Colour is deliberately absent. `tokens/color.wire.css` holds greys only. The file has two
halves, and only the second half is the contract.

**Primitives** (the only hex values in the system):

| Token | Hex | | Token | Hex |
| --- | --- | --- | --- | --- |
| `--grey-0` | `#ffffff` | | `--grey-6` | `#bbbbbb` |
| `--grey-1` | `#f4f4f4` | | `--grey-7` | `#afafaf` |
| `--grey-2` | `#ebebeb` | | `--grey-8` | `#8a8a8a` |
| `--grey-3` | `#dfdfdf` | | `--grey-9` | `#505050` |
| `--grey-4` | `#d3d3d3` | | `--grey-10` | `#141414` |
| `--grey-5` | `#c7c7c7` | | | |

**Roles** (what components read):

| Role | Now | Means |
| --- | --- | --- |
| `--canvas` | grey-1 | the page behind everything |
| `--paper` | grey-0 | a card's default fill |
| `--ink` | grey-10 | text and frames |
| `--ink-soft` | grey-9 | secondary text on canvas or paper |
| `--ink-faint` | grey-8 | disabled, quiet decoration |
| `--line` | `--ink` | frames |
| `--line-soft` | grey-8 | decoration that must stay quiet |
| `--focus` | `--ink` | focus ring |
| `--accent` / `--on-accent` | `--ink` / `--paper` | the one "press this" colour; ink until gate 3 |
| `--tone-1` … `--tone-6` | grey-2 … grey-7 | six fill slots: the future palette |
| `--on-tone-1` … `--on-tone-6` | `--ink` | text that sits on each slot |

**Tones.** Put `data-tone="1"` … `"6"` or `"ink"` on any element. `base.css` turns that into
`--tone-bg` and `--tone-ink` *for that element only* (both are registered with
`inherits: false`, so a toned card never paints its toned-less children). A component decides
what to do with them. `ink` is the inverted tone: ink fill, paper text.

**Contrast**, ink on each fill (the index page reads these live from the tokens, so they
stay true when the colours change):

| Fill | Ratio | | Fill | Ratio |
| --- | --- | --- | --- | --- |
| paper | 18.4 : 1 | | tone-4 | 10.9 : 1 |
| canvas | 16.7 : 1 | | tone-5 | 9.6 : 1 |
| tone-1 | 15.5 : 1 | | tone-6 | 8.4 : 1 |
| tone-2 | 13.8 : 1 | | ink (paper on it) | 18.4 : 1 |
| tone-3 | 12.3 : 1 | | | |

Soft ink inside a card is `color-mix(in srgb, var(--card-ink) 72%, var(--card-bg))`. The
worst case, on tone-6, is 4.8 : 1, which still clears AA for body text.

### Motion

Declared, not used. Every state in this stage changes instantly, which is also the honest
brutalist default. Gate 4 decides transitions. The tokens are there so it doesn't have to
invent them: `--dur-press` 130ms · `--dur-hover` 200ms · `--dur-move` 520ms ·
`--ease-out` `cubic-bezier(0.22, 1, 0.36, 1)` · `--ease-flip` `cubic-bezier(0.83, 0, 0.17, 1)`.

The app's existing motion rules carry over unchanged when the time comes: only transform
and opacity animate; reduced motion means gentler, not instant; `perspective` belongs on
the flip's direct parent.

### Icons, v0

Five glyphs in `icons.css`, drawn on a 24 grid with a 2px square-cap stroke (the frame's
weight, so an icon reads as line work and not as a sticker). They are CSS masks, so they take
`currentColor`:

```html
<span class="ic ic--arrow" aria-hidden="true"></span>
```

`ic--arrow` (↗) · `ic--plus` · `ic--minus` · `ic--close` · `ic--check`. Size with
`--ic-size` (default 1.25rem). Decorative by default: when an icon is a control's only
content, the *control* gets the `aria-label`.

---

## 3. Card

A card holds one idea. It is a frame with slots; what goes in a slot is another element's
business. The slots `.card__ctl` and `.card__action` are where the Button element will land.

### House rules

- Reads roles only. No colour literals.
- One shape gesture per card: round it or notch it.
- A hard shadow means "you can press this".
- **Never put `cqi` on `.card` itself.** A card is a container, but a container's own
  `cqi` resolves against *its parent*. Sizes that use `cqi` live on the parts, where the
  container is the card.
- **A card needs a width from its parent** (a grid cell, a block). `container-type:
  inline-size` means it has no intrinsic width, so it will collapse inside a shrink-wrapping
  flex row.
- States change instantly (gate 4 owns transitions).

### Anatomy

Nine parts, all optional except the frame. A card is whichever of them it needs.

| # | Part | Class | Spec |
| --- | --- | --- | --- |
| 1 | Frame | `.card` | `display: flex; flex-direction: column`; `border: 2px solid var(--card-line)`; `border-radius: var(--card-radius)`; `overflow: clip`; `container: card / inline-size`. |
| 2 | Bar | `.card__bar` | The frame made thicker. `min-block-size: 44px`; ink fill, paper text; label left, control right. Flips to paper-on-ink for `data-tone="ink"`. |
| | Label | `.card__label` | `--type-label`, uppercase. |
| | Control | `.card__ctl` | 44×44 hit area around a 20×20 box (`2px currentColor`, `--radius-ctl`); glyph 12px. |
| 3 | Media | `.card__media` | `aspect-ratio: var(--ratio, 4 / 3)`; edge to edge; closed by a 2px rule; `img`/`video` are `object-fit: cover`; fill is the element's tone or `--tone-1`. |
| 4 | Body | `.card__body` | `padding: clamp(1rem, 5cqi, 1.5rem)`; flex column, `gap: 8px`; grows to fill. |
| | Head | `.card__head` | Same padding as the body. Used by notch and study cards for their top strip. |
| 5 | Eyebrow | `.card__eyebrow` | `--type-meta`, soft ink. What kind of thing this is. |
| 6 | Title | `.card__title` | `--type-title` at `clamp(1.375rem, 8cqi, 2rem)` (22–32px); balanced; breaks long words. |
| 7 | Text | `.card__text` | `--type-body`, 40ch max, pretty-wrapped. |
| | Meta | `.card__meta` | `--type-meta`, tabular, soft ink. |
| | Figure | `.card__figure` | `--type-figure` at `clamp(3rem, 27cqi, 6.5rem)`; tabular, lining. A `<small>` inside is 0.42em, weight 500, soft ink. |
| 8 | Foot | `.card__foot` | `min-block-size: 44px`; `padding: 8px var(--card-pad)`; 1px rule above; `margin-block-start: auto`, so cards in a row end on one line. |
| 9 | Action | `.card__action` | 44px circle, `2px var(--card-ink)`. Fills with `--accent` when `--fill` is 1. |

Helpers: `.card__row` (flex, space-between, top-aligned), `.card__group` (flex column, 4px
gap), `.card__list` (ruled rows, 44px each, 1px rules).

### Variants

Class names are the API. Each is shown live, with its markup, in `index.html` §3.

| Variant | Modifier / recipe | Use | Notes |
| --- | --- | --- | --- |
| Plain | `.card` + `.card__body` (+ `.card__foot`) | The default. | |
| Panel | `.card__bar` (+ `.card__list`) | A titled card that folds away: lists, settings. | `data-tone="ink"` flips the bar to paper. |
| Media | `.card__media` | Picture first. | `--ratio` overrides 4 / 3. |
| Stat | recipe: eyebrow, `.card__figure`, optional meter, meta | One number. | Add `.card--square` for a grid of stats. |
| Row | `.card--row` + `.card__tile`, `.card__main`, `.card__trail` | A thing in a list. | Below 18rem the trail drops under the title (children move between grid cells; the card can't re-template itself). |
| Link | `.card--link` + `.card__link` in the title | The whole card goes somewhere. | See below. |
| Notch | `.card--notch` + `.card__head`, `.card__action` (a `<button>`) | One action that matters. | Square only. Not a link card. |
| Stack | `.card--stack` | A deck, not a card. | Two sheets via `box-shadow`; the margin reserves their room. |
| Ghost | `.card--ghost` (the card is the `<a>` or `<button>`) | An empty slot that asks to be filled. | Dashed; firms up on hover and focus. |
| Study | `.card--study` + `.card__stage`, `.card__answer` | The flashcard. 5 / 7. | Static faces; the flip is gate 4. |
| Square | `.card--square` | A modifier for any card. | `aspect-ratio: 1 / 1`; body spaces its first and last children apart. |

**Link card.** One anchor, inside the title; its `::after` is stretched over the whole card
(`inset: -2px`, so it covers the border too), so there is exactly one tab stop, one
accessible name, and the whole card is the target. The card wears the focus ring, not the
anchor (`:has(.card__link:focus-visible)`; the anchor keeps its own ring where `:has` is
unsupported). Anything else clickable inside the card must sit above the link
(`position: relative; z-index: 1`).

**Notch card.** The silhouette is *painted*, not clipped: four flat background layers (two
ink, two inset fills), so the line turns the corner at exactly `--bw` and needs no wrapper.
`--notch-w` and `--notch-h` (default 4.5rem) size the cut. The round control sits centred in
the cut, out on the page. It is not a whole-card link, because the button in the notch is the
control. Selected and lift states are not defined for it.

**Stack card.** `--stack` (default 6px) is the offset of each sheet; the margin
`calc(var(--stack) * 2 + var(--bw))` reserves room for both. Because the sheets are
`box-shadow`, they follow `--card-radius` for free.

### States

Two registered numbers drive the interaction: `--lift` (0 flat, 1 raised) and `--fill`
(0 outline, 1 filled). Every state just sets them, so hover, focus and pressed share one
definition, and gate 4 can animate both with a single `transition`.

| State | Trigger | `--lift` | `--fill` | Also |
| --- | --- | --- | --- | --- |
| Rest | none | 0 | 0 | Flat. No shadow. |
| Hover | `:hover`, only where `(hover: hover)` | 1 | 1 | Card moves −2px, −2px; `4px 4px 0` hard shadow in `--card-line`; `z-index: 1`; action fills; title underlines. |
| Focus | `.card--link:has(.card__link:focus-visible)`, or `:focus-visible` on a ghost | 1 | 1 | `3px solid var(--focus)`, offset 3px. Same lift as hover, so keyboard and pointer match. |
| Pressed | `:active` | 0 | 1 | Back onto the surface; the fill stays. |
| Selected | `[aria-selected="true"]`, `[aria-current="true"]` | | | `--shadow-select: 0 0 0 2px var(--card-line)`: a ring that doubles the frame, so nothing shifts. |
| Disabled | `[aria-disabled="true"]` | | | Dashed border, `--ink-faint`, hatch (from `wire.css`), `pointer-events: none`. Not an anchor. |
| Forced colours | `(forced-colors: active)` | | | Shadows and fills vanish there, so hover/focus get a 4px `Highlight` outline and selected gets a 4px border. |

The `.is-hover`, `.is-focus`, `.is-active`, `.is-selected` and `.is-disabled` classes force a
state for documentation and tests. They are not API.

### Layout

| Class | Does |
| --- | --- |
| `.card-grid` | `grid-template-columns: repeat(auto-fill, minmax(min(100%, var(--card-min, 16rem)), 1fr))`; `gap: var(--gutter)`. Places cards; never styles them. |
| `.card-grid--tiled` | `gap: 0`. Negative start margins overlap each frame onto its neighbour's, so two frames read as one 2px line, and a short last row still closes. Corners go square in either mode. |

### Responsive behaviour

Cards answer to their own width, not the window:

- Padding: `clamp(1rem, 5cqi, 1.5rem)`.
- Title: `clamp(1.375rem, 8cqi, 2rem)`. Figure: `clamp(3rem, 27cqi, 6.5rem)`.
- Row: `@container card (max-width: 18rem)` moves the trail to row 2, column 2.
- Holds from 320px up with no horizontal scroll.

### Accessibility

- One tab stop per link card. Its accessible name is the title text.
- Every target is at least 44px: the action circle, the bar control, list rows, the foot.
  Inline links inside the foot are at least 24px tall.
- The focus ring is always visible: outside the frame on the card itself; inset on the bar
  and on list rows; in `--card-ink` on an inverted card (an ink ring on an ink card would
  vanish).
- Contrast is at least 8.4 : 1 for ink on any tone and at least 4.8 : 1 for soft ink.
- Meters use `role="meter"` with `aria-valuemin`, `aria-valuemax`, `aria-valuenow`.
- Decorative icons are `aria-hidden="true"`. A control whose only content is an icon gets an
  `aria-label`.
- Reset lists keep `role="list"` so Safari keeps the semantics that `list-style: none`
  would drop.
- Use the heading level that fits the page. A card title is not always an `h3`.
- A disabled card is not an anchor. `aria-disabled="true"` plus the class; remove the `href`.
- Forced-colours mode is handled (see States).

### Do and don't

- **Do** give each card one idea and one place to go.
- **Do** use tones for rhythm across a grid, never to carry meaning. Colour is not state.
- **Do** let the grid place cards and the card style itself.
- **Don't** nest cards, or put two competing actions in one link card.
- **Don't** add a shadow at rest, a stripe down one edge, or a gradient.
- **Don't** fake "disabled" with opacity. Use the state.
- **Don't** centre-align body text. Titles and answers may centre; paragraphs don't.
- **Don't** pad `.card` itself. Padding goes on the parts.

### Known limits

- The notch is square only. The upgrade path is `corner-shape: scoop` as progressive
  enhancement once it's supported everywhere that matters.
- The stretched link's border band needs `overflow-clip-margin`. Safari ignores it, leaving a
  2px band at the very edge of a link card where a click does nothing.
- Text inside a link card can't be selected by dragging, because the stretched link sits on top.
- The study card has static faces only. The flip is gate 4.
- No dark mode yet. It arrives with colour, at gate 3.
- Needs a 2024-era browser: container queries, `:has()`, `@property`, `color-mix()`, cascade
  layers. Chrome/Edge 114+, Safari 16.4+, Firefox 128+. `text-wrap: balance | pretty` and
  `overflow-clip-margin` degrade gracefully.
- **`.card` collides with the app's current `styles.css`.** See `README.md`.

---

## 4. Wireframe kit

`wire.css` holds placeholders for things that don't exist yet. Each `.wf-*` class is deleted
the day its real element ships, and nothing in `components/` may depend on it.

| Class | Stands in for | Replaced by |
| --- | --- | --- |
| `.wf-media` (+ `.wf-tag`) | an image or illustration: a box with an X | real media |
| `.wf-shape` | one of the app's shape drawings | the deck's SVG |
| `.wf-meter` | progress | the Meter element |
| `.wf-pill` | a status tag | the Tag element |
| disabled hatch | the disabled look | gate 3 |

How to read a wireframe: a box with an X is an image; flat grey is a tone slot; black is the
inverted tone; dashed is empty or unavailable; hatch is disabled.

---

## 5. Changelog

- **0.1.0** · 2026-09-30 · Foundations (type, space, line, shape, hit, motion). Wireframe
  colour layer with six tone slots. Card: ten variants, six states, two grids. Gates 0–2
  closed for Cards.

/**
 * Deck registry.
 *
 * On `art`: `path` is drawn on a 0 0 100 100 viewBox. `scale`, `dx` and `dy`
 * are optical corrections, measured rather than guessed — each shape's filled
 * area and bounding box were rasterised, then scaled a quarter-power toward
 * the deck median and re-centred on that box. A triangle inscribed in a square
 * carries 39% of its ink and sits high on its centroid; without this it reads
 * as a smaller shape floating above the others. The correction is deliberately
 * partial: full area equalisation overflows the frame and a circle should read
 * a little larger than a square to look the same size.
 *
 * This is the only file you need to touch to add a deck. Drop another object
 * into FLASHCARD_DECKS and it shows up on the home screen automatically.
 *
 * A card needs:
 *   id          stable key, used for saved progress — never reuse or rename
 *   name        the answer
 *   art         { path } SVG path data drawn on a 0 0 100 100 viewBox
 *   tone        palette slot 1-6, drives the accent colour
 *   facts       short chips, shown under the name
 *   definition  one plain-language sentence
 *   example     a thing from the real world with this shape
 */
(function (global) {
  "use strict";

  const shapes = [
    {
      id: "circle",
      name: "Circle",
      tone: 1,
      art: {
        path: "M 6 50 a 44 44 0 1 0 88 0 a 44 44 0 1 0 -88 0 Z",
        scale: 0.931,
      },
      facts: ["0 sides", "0 corners", "curved"],
      definition:
        "A round shape with no sides and no corners. Every point on the edge sits the same distance from the middle.",
      example: "a clock face",
    },
    {
      id: "square",
      name: "Square",
      tone: 2,
      art: { path: "M10 10L90 10L90 90L10 90Z", scale: 0.92 },
      facts: ["4 sides", "4 corners", "all sides equal"],
      definition:
        "Four straight sides that are all exactly the same length, joined by four square corners.",
      example: "a window pane",
    },
    {
      id: "triangle",
      name: "Triangle",
      tone: 3,
      art: { path: "M50 6L88.11 72L11.89 72Z", scale: 1.16, dy: 11 },
      facts: ["3 sides", "3 corners", "three points"],
      definition:
        "Three straight sides meeting at three corners — the simplest shape you can draw with straight lines.",
      example: "a slice of pizza",
    },
    {
      id: "rectangle",
      name: "Rectangle",
      tone: 4,
      art: { path: "M6 24L94 24L94 76L6 76Z" },
      facts: ["4 sides", "4 corners", "two long, two short"],
      definition:
        "Four straight sides and four square corners. The two long sides match each other, and so do the two short ones.",
      example: "a door",
    },
    {
      id: "star",
      name: "Star",
      tone: 5,
      art: {
        path: "M50 6L60.86 35.05L91.85 36.4L67.58 55.71L75.86 85.6L50 68.48L24.14 85.6L32.42 55.71L8.15 36.4L39.14 35.05Z",
        scale: 1.16,
        dy: 4.25,
      },
      facts: ["10 sides", "10 corners", "five points"],
      definition:
        "Five sharp points reaching out from the middle, with a valley tucked between each pair.",
      example: "a gold star sticker",
    },
    {
      id: "heart",
      name: "Heart",
      tone: 6,
      art: {
        path: "M 50 90 C 4 58 8 26 28 18 C 40 13 48 20 50 28 C 52 20 60 13 72 18 C 92 26 96 58 50 90 Z",
        scale: 1.048,
        dy: -3.13,
      },
      facts: ["0 sides", "1 point", "curved"],
      definition:
        "Two round humps at the top that curve down and meet at a single point below.",
      example: "a valentine card",
    },
    {
      id: "diamond",
      name: "Diamond",
      tone: 1,
      // Deliberately taller than it is wide. A diamond drawn with equal
      // diagonals is just a rotated square, and teaching it as a separate
      // shape is how learners end up believing orientation changes identity.
      art: { path: "M50 4L88 50L50 96L12 50Z", scale: 1.07 },
      facts: ["4 sides", "4 corners", "balances on a point"],
      definition:
        "Four equal straight sides that lean, so it stands on a point and is taller than it is wide.",
      example: "a kite in the sky",
    },
    {
      id: "oval",
      name: "Oval",
      tone: 2,
      art: {
        path: "M 6 50 a 44 30 0 1 0 88 0 a 44 30 0 1 0 -88 0 Z",
        scale: 1.025,
      },
      facts: ["0 sides", "0 corners", "a stretched circle"],
      definition:
        "A smooth curved shape like a circle that has been gently stretched out sideways.",
      example: "an egg",
    },
    {
      id: "pentagon",
      name: "Pentagon",
      tone: 3,
      art: {
        path: "M50 6L91.85 36.4L75.86 85.6L24.14 85.6L8.15 36.4Z",
        dy: 4.25,
      },
      facts: ["5 sides", "5 corners", "penta means five"],
      definition:
        "Five straight sides of equal length meeting at five corners.",
      example: "home plate on a baseball field",
    },
    {
      id: "hexagon",
      name: "Hexagon",
      tone: 4,
      art: {
        path: "M94 50L72 88.11L28 88.11L6 50L28 11.89L72 11.89Z",
        scale: 0.977,
      },
      facts: ["6 sides", "6 corners", "hexa means six"],
      definition:
        "Six equal straight sides and six corners, packing together without leaving any gaps.",
      example: "a honeycomb cell",
    },
    {
      id: "octagon",
      name: "Octagon",
      tone: 5,
      art: {
        path: "M90.65 33.16L90.65 66.84L66.84 90.65L33.16 90.65L9.35 66.84L9.35 33.16L33.16 9.35L66.84 9.35Z",
        scale: 0.956,
      },
      facts: ["8 sides", "8 corners", "octa means eight"],
      definition:
        "Eight equal straight sides and eight corners, making an almost-round shape out of flat edges.",
      example: "a stop sign",
    },
    {
      id: "crescent",
      name: "Crescent",
      tone: 6,
      art: {
        path: "M 64 7 a 44 44 0 1 0 0 86 a 35 43 0 1 1 0 -86 Z",
        scale: 1.16,
        dx: 12.94,
      },
      facts: ["0 sides", "2 points", "curved"],
      definition:
        "A curved sliver with a sharp point at each end, left behind where one round edge cuts into another.",
      example: "the moon",
    },
  ];

  global.FLASHCARD_DECKS = [
    {
      id: "shapes",
      name: "Shapes",
      blurb: "Twelve shapes, from circle to crescent.",
      cards: shapes,
    },
  ];
})(window);

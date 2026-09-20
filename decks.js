/**
 * The shapes.
 *
 * `path` is drawn on a 0 0 100 100 viewBox. `scale`, `dx` and `dy` are optical
 * corrections, measured rather than guessed: each shape was rasterised and its
 * filled area and bounding box compared against the set. A triangle inscribed
 * in the same box as a square carries 39% of its ink and sits high on its
 * centroid, so without a correction it reads as a smaller shape floating above
 * the others. The correction is partial on purpose — equalising area outright
 * overflows the frame, and a circle should read a little larger than a square
 * to look the same size.
 */
window.SHAPES = [
  {
    id: "circle",
    name: "Circle",
    tone: 1,
    path: "M 6 50 a 44 44 0 1 0 88 0 a 44 44 0 1 0 -88 0 Z",
    scale: 0.931,
  },

  {
    id: "square",
    name: "Square",
    tone: 2,
    path: "M10 10L90 10L90 90L10 90Z",
    scale: 0.92,
  },

  {
    id: "triangle",
    name: "Triangle",
    tone: 3,
    path: "M50 6L88.11 72L11.89 72Z",
    scale: 1.16,
    dy: 11,
  },

  {
    id: "rectangle",
    name: "Rectangle",
    tone: 4,
    path: "M6 24L94 24L94 76L6 76Z",
  },

  {
    id: "star",
    name: "Star",
    tone: 5,
    path: "M50 6L60.86 35.05L91.85 36.4L67.58 55.71L75.86 85.6L50 68.48L24.14 85.6L32.42 55.71L8.15 36.4L39.14 35.05Z",
    scale: 1.16,
    dy: 4.25,
  },

  {
    id: "heart",
    name: "Heart",
    tone: 6,
    path: "M 50 90 C 4 58 8 26 28 18 C 40 13 48 20 50 28 C 52 20 60 13 72 18 C 92 26 96 58 50 90 Z",
    scale: 1.048,
    dy: -3.13,
  },

  // Taller than it is wide on purpose. A diamond with equal diagonals is just a
  // rotated square, and teaching it as a separate shape is how learners come to
  // believe orientation changes identity.
  {
    id: "diamond",
    name: "Diamond",
    tone: 1,
    path: "M50 4L88 50L50 96L12 50Z",
    scale: 1.07,
  },

  {
    id: "oval",
    name: "Oval",
    tone: 2,
    path: "M 6 50 a 44 30 0 1 0 88 0 a 44 30 0 1 0 -88 0 Z",
    scale: 1.025,
  },

  {
    id: "pentagon",
    name: "Pentagon",
    tone: 3,
    path: "M50 6L91.85 36.4L75.86 85.6L24.14 85.6L8.15 36.4Z",
    dy: 4.25,
  },

  {
    id: "hexagon",
    name: "Hexagon",
    tone: 4,
    path: "M94 50L72 88.11L28 88.11L6 50L28 11.89L72 11.89Z",
    scale: 0.977,
  },

  {
    id: "octagon",
    name: "Octagon",
    tone: 5,
    path: "M90.65 33.16L90.65 66.84L66.84 90.65L33.16 90.65L9.35 66.84L9.35 33.16L33.16 9.35L66.84 9.35Z",
    scale: 0.956,
  },

  {
    id: "crescent",
    name: "Crescent",
    tone: 6,
    path: "M 64 7 a 44 44 0 1 0 0 86 a 35 43 0 1 1 0 -86 Z",
    scale: 1.16,
    dx: 12.94,
  },
];

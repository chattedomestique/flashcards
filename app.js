/**
 * Shapes.
 *
 * Twelve cards. Swipe or use the arrows to move through them, tap to see the
 * name. That is the whole app.
 *
 * The thing worth knowing about the implementation: every card is built once
 * at startup and never re-rendered. Moving through the deck only rewrites a
 * `data-pos` attribute, so the browser interpolates transform and opacity and
 * nothing swaps content underneath the animation. Re-rendering a single shared
 * card on every change is what made the previous build flash.
 */
(function () {
  "use strict";

  var SVG_NS = "http://www.w3.org/2000/svg";
  var SLOP = 4; // px of travel before a press counts as a drag
  var COMMIT_RATIO = 0.13; // of card width
  var COMMIT_MAX = 48; // px — a wide card shouldn't demand a long haul
  var FLICK = 0.15; // px/ms
  var FLICK_MIN = 10; // px
  var FACE_RESET_MS = 600; // after a move, once the old card is out of sight

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  var deck = document.getElementById("deck");
  var dots = document.getElementById("dots");
  var live = document.getElementById("live");
  var flipBtn = document.querySelector("[data-flip]");
  var flipLabel = document.querySelector("[data-flip-label]");

  var shapes = window.SHAPES || [];
  var cards = [];
  var index = 0;
  var faceResetTimer = 0;

  /* ------------------------------------------------------------------ build */

  function shapeSVG(shape) {
    var svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("viewBox", "-8 -8 116 116");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");

    var path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("d", shape.path);
    path.setAttribute("stroke-linejoin", "round");

    // Optical correction, measured per shape. The stroke is divided back out
    // so every outline lands at the same weight whatever the scale.
    var s = shape.scale || 1;
    var dx = shape.dx || 0;
    var dy = shape.dy || 0;
    if (s !== 1 || dx || dy) {
      path.setAttribute(
        "transform",
        "translate(" +
          dx +
          " " +
          dy +
          ") translate(50 50) scale(" +
          s +
          ") translate(-50 -50)",
      );
    }
    path.setAttribute("stroke-width", String(3.5 / s));
    path.style.fill = "var(--t" + shape.tone + ")";
    path.style.stroke = "var(--ink)";

    svg.appendChild(path);
    return svg;
  }

  function buildCard(shape) {
    var card = document.createElement("article");
    card.className = "card";
    card.dataset.face = "front";

    var inner = document.createElement("div");
    inner.className = "card-inner";

    var front = document.createElement("div");
    front.className = "card-face card-front";
    front.appendChild(shapeSVG(shape));

    var back = document.createElement("div");
    back.className = "card-face card-back";
    var name = document.createElement("p");
    name.className = "shape-name";
    name.textContent = shape.name;
    back.appendChild(name);

    inner.appendChild(front);
    inner.appendChild(back);
    card.appendChild(inner);

    card.__front = front;
    card.__back = back;
    card.__shape = shape;
    return card;
  }

  function build() {
    shapes.forEach(function (shape, i) {
      var card = buildCard(shape);
      cards.push(card);
      deck.appendChild(card);

      var dot = document.createElement("li");
      if (i === 0) dot.setAttribute("data-on", "");
      dots.appendChild(dot);
    });
  }

  /* ---------------------------------------------------------------- render */

  /** Shortest signed distance from the current card, wrapping both ways — this
      is what makes the carousel endless: card 0 is one step after card 11. */
  function offsetOf(i) {
    var n = cards.length;
    var off = (((i - index) % n) + n) % n; // 0 .. n-1
    if (off > n / 2) off -= n; // -n/2 .. n/2
    return off;
  }

  /** Position every card relative to the current one. This is the only thing
      that changes when you move through the deck. */
  function place() {
    // Mark the far cards and flush first, so the ones about to wrap the long
    // way round have their transition switched off BEFORE they move.
    cards.forEach(function (card, i) {
      var off = offsetOf(i);
      card.dataset.far = Math.abs(off) >= 2 ? "1" : "0";
      card.dataset.near = Math.abs(off) <= 1 ? "1" : "0";
    });
    void deck.offsetWidth;

    cards.forEach(function (card, i) {
      var off = offsetOf(i);
      var isCurrent = off === 0;
      card.style.setProperty("--offset", String(off));
      syncFaces(card);
      card.setAttribute("aria-hidden", isCurrent ? "false" : "true");
      card.inert = !isCurrent;
    });

    Array.prototype.forEach.call(dots.children, function (dot, i) {
      if (i === index) dot.setAttribute("data-on", "");
      else dot.removeAttribute("data-on");
    });

    syncFlipButton();
  }

  function syncFaces(card) {
    var showingBack = card.dataset.face === "back";
    card.__front.inert = showingBack;
    card.__back.inert = !showingBack;
  }

  function syncFlipButton() {
    var showingBack = current().dataset.face === "back";
    flipBtn.setAttribute("aria-expanded", showingBack ? "true" : "false");
    flipLabel.textContent = showingBack ? "Show shape" : "Show name";
  }

  function current() {
    return cards[index];
  }

  function announce(message) {
    live.textContent = "";
    window.requestAnimationFrame(function () {
      live.textContent = message;
    });
  }

  /* ------------------------------------------------------------- behaviour */

  function go(delta) {
    var n = cards.length;
    index = (((index + delta) % n) + n) % n; // wraps in both directions
    place();
    announce("Shape " + (index + 1) + " of " + cards.length + ".");

    // Turn the cards you have left back over, but only once they are out of
    // sight — flipping them where you can still see them reads as a glitch.
    window.clearTimeout(faceResetTimer);
    faceResetTimer = window.setTimeout(resetOtherFaces, FACE_RESET_MS);
    return true;
  }

  function resetOtherFaces() {
    cards.forEach(function (card, i) {
      if (i !== index && card.dataset.face !== "front") {
        card.dataset.face = "front";
        syncFaces(card);
      }
    });
  }

  function flip() {
    var card = current();
    var toBack = card.dataset.face === "front";
    card.dataset.face = toBack ? "back" : "front";
    syncFaces(card);
    syncFlipButton();
    announce(
      toBack
        ? card.__shape.name
        : "Shape " + (index + 1) + " of " + cards.length + ".",
    );
  }

  /* ------------------------------------------------------------------ drag */

  var drag = {
    id: null,
    startX: 0,
    startY: 0,
    dx: 0,
    active: false,
    moved: false,
    lastX: 0,
    lastT: 0,
    vx: 0,
  };

  function commitDistance() {
    return Math.min((current().offsetWidth || 320) * COMMIT_RATIO, COMMIT_MAX);
  }

  function onPointerDown(event) {
    if (!event.isPrimary) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    // Anywhere in the deck counts. Requiring the press to land on the current
    // card rejects a touch that catches a neighbour's sliver mid-slide.
    if (!event.target.closest || !event.target.closest(".deck")) return;

    drag.id = event.pointerId;
    drag.startX = drag.lastX = event.clientX;
    drag.startY = event.clientY;
    drag.lastT = event.timeStamp;
    drag.dx = 0;
    drag.vx = 0;
    drag.active = false;
    drag.moved = false;
    current().classList.add("is-pressed");
  }

  function onPointerMove(event) {
    if (drag.id !== event.pointerId) return;
    var dx = event.clientX - drag.startX;
    var dy = event.clientY - drag.startY;

    if (!drag.active) {
      // Mostly-horizontal is enough. Demanding dx > dy outright rejects the
      // slight diagonal that a real thumb actually draws.
      if (Math.abs(dx) < SLOP || Math.abs(dx) < Math.abs(dy) * 0.6) return;
      drag.active = true;
      drag.moved = true;
      deck.classList.add("is-dragging");
      current().classList.remove("is-pressed");
      try {
        current().setPointerCapture(event.pointerId);
      } catch (err) {}
    }

    // Velocity from the last sample only — it is what the release should match.
    var dt = event.timeStamp - drag.lastT;
    if (dt > 0) drag.vx = (event.clientX - drag.lastX) / dt;
    drag.lastX = event.clientX;
    drag.lastT = event.timeStamp;

    // The carousel is endless, so there is no end to resist against: the whole
    // strip simply follows the finger.
    drag.dx = dx;
    deck.style.setProperty("--dx", drag.dx + "px");
  }

  function endDrag(event) {
    if (drag.id !== event.pointerId) return;
    var card = current();
    card.classList.remove("is-pressed");
    try {
      if (card.hasPointerCapture(event.pointerId))
        card.releasePointerCapture(event.pointerId);
    } catch (err) {}

    var wasActive = drag.active;
    var dx = drag.dx;
    var vx = drag.vx;
    drag.id = null;
    drag.active = false;

    deck.classList.remove("is-dragging");
    deck.style.setProperty("--dx", "0px");

    if (!wasActive) {
      if (event.type === "pointerup") flip();
      return;
    }

    var far = Math.abs(dx) > commitDistance();
    var flick = Math.abs(vx) > FLICK && Math.abs(dx) > FLICK_MIN;
    if (event.type === "pointerup" && (far || flick)) {
      go(dx < 0 ? 1 : -1);
    }
  }

  /* -------------------------------------------------------------- controls */

  function onClick(event) {
    if (event.target.closest && event.target.closest("[data-flip]")) flip();
  }

  function onKeyDown(event) {
    if (
      event.defaultPrevented ||
      event.metaKey ||
      event.ctrlKey ||
      event.altKey
    )
      return;
    var onButton =
      document.activeElement && document.activeElement.tagName === "BUTTON";

    switch (event.key) {
      case "ArrowRight":
        event.preventDefault();
        go(1);
        break;
      case "ArrowLeft":
        event.preventDefault();
        go(-1);
        break;
      case " ":
      case "Enter":
        if (onButton) return; // let the focused button act for itself
        event.preventDefault();
        flip();
        break;
      case "Home":
        event.preventDefault();
        go(-index);
        break;
      default:
        break;
    }
  }

  function bindPress() {
    document.addEventListener("pointerdown", function (event) {
      var btn = event.target.closest ? event.target.closest(".btn") : null;
      if (!btn) return;
      btn.classList.add("is-pressed");
      var release = function () {
        btn.classList.remove("is-pressed");
        ["pointerup", "pointercancel", "pointerleave"].forEach(function (t) {
          btn.removeEventListener(t, release);
        });
      };
      ["pointerup", "pointercancel", "pointerleave"].forEach(function (t) {
        btn.addEventListener(t, release);
      });
    });
  }

  /* ------------------------------------------------------------------ init */

  function init() {
    if (!deck || !shapes.length) {
      if (deck)
        deck.textContent =
          "Could not load the shapes. Check that decks.js is present.";
      return;
    }

    // Place everything before the first paint can animate it.
    deck.classList.add("is-booting");
    build();
    place();
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () {
        deck.classList.remove("is-booting");
      });
    });

    deck.addEventListener("pointerdown", onPointerDown);
    deck.addEventListener("pointermove", onPointerMove);
    deck.addEventListener("pointerup", endDrag);
    deck.addEventListener("pointercancel", endDrag);
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKeyDown);
    bindPress();

    // Nothing here depends on it, but a card mid-flight when the setting
    // changes should land under the new rules.
    if (reduceMotion.addEventListener) {
      reduceMotion.addEventListener("change", place);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

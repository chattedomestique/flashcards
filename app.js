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
  var SLOP = 8; // px of travel before a press counts as a drag
  var COMMIT_RATIO = 0.28; // of card width
  var COMMIT_MAX = 120; // px — a wide card shouldn't demand a long haul
  var FLICK = 0.45; // px/ms
  var FLICK_MIN = 40; // px — a flick still has to be a deliberate one
  var RUBBER = 0.32; // resistance when pulling past either end
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
    path.setAttribute("stroke-width", String(7 / s));
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

  /** Position every card relative to the current one. This is the only thing
      that changes when you move through the deck. */
  function place() {
    cards.forEach(function (card, i) {
      var offset = i - index;
      var pos =
        offset === 0
          ? "current"
          : offset === 1
            ? "next"
            : offset > 1
              ? "behind"
              : "past";
      if (card.dataset.pos !== pos) card.dataset.pos = pos;

      var isCurrent = offset === 0;
      // Only the side you are looking at belongs in the accessibility tree,
      // or the name is readable before the card is ever turned.
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
    var next = index + delta;
    if (next < 0 || next >= cards.length) return false;
    index = next;
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
    var card = event.target.closest ? event.target.closest(".card") : null;
    if (!card || card !== current()) return;

    drag.id = event.pointerId;
    drag.startX = drag.lastX = event.clientX;
    drag.startY = event.clientY;
    drag.lastT = event.timeStamp;
    drag.dx = 0;
    drag.vx = 0;
    drag.active = false;
    drag.moved = false;
    card.classList.add("is-pressed");
  }

  function onPointerMove(event) {
    if (drag.id !== event.pointerId) return;
    var dx = event.clientX - drag.startX;
    var dy = event.clientY - drag.startY;

    if (!drag.active) {
      // Claim the gesture only once it is clearly horizontal, so the page can
      // still be scrolled vertically.
      if (Math.abs(dx) < SLOP || Math.abs(dx) <= Math.abs(dy)) return;
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

    // Resist past either end so the deck feels finite rather than broken.
    var atEnd =
      (dx < 0 && index === cards.length - 1) || (dx > 0 && index === 0);
    drag.dx = atEnd ? dx * RUBBER : dx;

    current().style.transform =
      "translate3d(" + drag.dx + "px, 0, 0) rotate(" + drag.dx / 28 + "deg)";
    deck.style.setProperty(
      "--drag",
      String(Math.min(Math.max(-drag.dx / commitDistance(), 0), 1)),
    );
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
    card.style.transform = "";
    deck.style.setProperty("--drag", "0");

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
    var target = event.target.closest
      ? event.target.closest("[data-go], [data-flip]")
      : null;
    if (!target) return;
    if (target.hasAttribute("data-flip")) flip();
    else go(Number(target.getAttribute("data-go")));
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
      case "End":
        event.preventDefault();
        go(cards.length - 1 - index);
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

    build();
    place();

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

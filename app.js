/**
 * Flashcards
 *
 * Multi-modal study app. Every card is available four ways at once — you can
 * see the shape, hear its name, read what makes it that shape, and feel a tick
 * when you answer. None of those channels is load-bearing on its own, so the
 * app works with the sound off, with motion off, or with a screen reader.
 *
 * Two structural rules, both learned from the build this replaced:
 *
 *   1. A 3D transform NEVER goes on an ancestor of the thing being transformed.
 *      The flip lives on .card-inner and nothing above it rotates, so nothing
 *      can end up mirrored or facing away from the viewer.
 *
 *   2. No transition is allowed to gate input. There is no "is animating" flag
 *      that a dropped animationend event can strand — every interaction is
 *      answerable from state that is already committed.
 */
(function () {
  "use strict";

  var SVG_NS = "http://www.w3.org/2000/svg";
  var STORE_KEY = "flashcards.v1";
  var SWIPE_DISTANCE = 0.28; // fraction of card width
  var SWIPE_VELOCITY = 0.45; // px per ms
  var DRAG_SLOP = 8; // px before a press becomes a drag

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  /* ---------------------------------------------------------------- helpers */

  function $(id) {
    return document.getElementById(id);
  }

  function shuffle(list) {
    var out = list.slice();
    for (var i = out.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = out[i];
      out[i] = out[j];
      out[j] = t;
    }
    return out;
  }

  function clear(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  /** Draw a card's shape. viewBox is padded so the stroke never clips. */
  function shapeSVG(card, strokeWidth) {
    var svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("viewBox", "-5 -5 110 110");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    var path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("d", card.art.path);
    path.setAttribute("stroke-linejoin", "round");
    path.setAttribute("stroke-width", String(strokeWidth || 6));
    // Set through style, not presentation attributes: var() is reliable there
    // in every engine.
    path.style.fill = "var(--t" + card.tone + ")";
    path.style.stroke = "var(--ink)";
    svg.appendChild(path);
    return svg;
  }

  /* ------------------------------------------------------------------ store */

  var store = {
    sound: true,
    progress: {}, // cardId -> { seen, correct, streak }

    load: function () {
      try {
        var raw = window.localStorage.getItem(STORE_KEY);
        if (!raw) return;
        var data = JSON.parse(raw);
        if (data && typeof data === "object") {
          if (typeof data.sound === "boolean") this.sound = data.sound;
          if (data.progress && typeof data.progress === "object")
            this.progress = data.progress;
        }
      } catch (err) {
        /* private mode, disabled storage, corrupt JSON — defaults are fine */
      }
    },

    save: function () {
      try {
        window.localStorage.setItem(
          STORE_KEY,
          JSON.stringify({ sound: this.sound, progress: this.progress }),
        );
      } catch (err) {
        /* nothing we can do, and nothing the user needs to hear about */
      }
    },

    stats: function (cardId) {
      return this.progress[cardId] || { seen: 0, correct: 0, streak: 0 };
    },

    record: function (cardId, gotIt) {
      var s = this.stats(cardId);
      var next = {
        seen: s.seen + 1,
        correct: s.correct + (gotIt ? 1 : 0),
        streak: gotIt ? s.streak + 1 : 0,
      };
      this.progress[cardId] = next;
      this.save();
      return s; // the previous value, so an undo can restore it
    },

    restore: function (cardId, prev) {
      if (prev && prev.seen === 0 && prev.correct === 0 && prev.streak === 0) {
        delete this.progress[cardId];
      } else {
        this.progress[cardId] = prev;
      }
      this.save();
    },

    reset: function () {
      this.progress = {};
      this.save();
    },

    /** Two correct answers in a row without a miss counts as learned. */
    isMastered: function (cardId) {
      return this.stats(cardId).streak >= 2;
    },
  };

  /* ------------------------------------------------- speech, haptics, toast */

  var speech = {
    supported: typeof window.speechSynthesis !== "undefined",
    say: function (text) {
      if (!store.sound || !this.supported || !text) return;
      try {
        window.speechSynthesis.cancel();
        var u = new window.SpeechSynthesisUtterance(text);
        u.rate = 0.92;
        u.pitch = 1.05;
        u.lang = document.documentElement.lang || "en";
        window.speechSynthesis.speak(u);
      } catch (err) {
        /* some browsers throw when no voices are installed */
      }
    },
    stop: function () {
      if (this.supported) {
        try {
          window.speechSynthesis.cancel();
        } catch (err) {}
      }
    },
  };

  function buzz(pattern) {
    if (!store.sound) return;
    if (typeof navigator.vibrate !== "function") return;
    try {
      navigator.vibrate(pattern);
    } catch (err) {}
  }

  function announce(message) {
    var live = $("live");
    live.textContent = "";
    // Re-setting on the next frame makes repeat messages announce again.
    window.requestAnimationFrame(function () {
      live.textContent = message;
    });
  }

  var toast = {
    timer: 0,
    action: null,
    show: function (text, onUndo) {
      var node = $("toast");
      $("toast-text").textContent = text;
      this.action = onUndo || null;
      $("toast-undo").hidden = !onUndo;
      node.hidden = false;
      window.requestAnimationFrame(function () {
        node.classList.add("is-open");
      });
      window.clearTimeout(this.timer);
      this.timer = window.setTimeout(this.hide.bind(this), 4000);
    },
    hide: function () {
      var node = $("toast");
      window.clearTimeout(this.timer);
      node.classList.remove("is-open");
      this.action = null;
      // Keep it out of the a11y tree once it has slid away.
      this.timer = window.setTimeout(function () {
        node.hidden = true;
      }, 360);
    },
  };

  /* --------------------------------------------------------------- routing  */

  var SCREENS = {
    home: { node: "screen-home", title: "", focus: null },
    study: { node: "screen-study", title: "Learning", focus: "card" },
    quiz: { node: "screen-quiz", title: "Quiz", focus: null },
    summary: {
      node: "screen-summary",
      title: "Results",
      focus: "summary-heading",
    },
  };

  var current = "home";

  function navigate(name, push) {
    if (!SCREENS[name]) name = "home";
    speech.stop();
    toast.hide();
    current = name;

    Object.keys(SCREENS).forEach(function (key) {
      // `hidden` removes the panel from the accessibility tree AND the tab
      // order. aria-hidden alone would leave its buttons focusable.
      $(SCREENS[key].node).hidden = key !== name;
    });

    $("screen-title").textContent = SCREENS[name].title;
    $("back-btn").hidden = name === "home";

    if (push !== false) {
      try {
        window.history.pushState({ screen: name }, "");
      } catch (err) {}
    }

    var focusId = SCREENS[name].focus;
    var target = focusId
      ? $(focusId)
      : $(SCREENS[name].node).querySelector("h1, h2, button");
    if (target) {
      if (!target.hasAttribute("tabindex"))
        target.setAttribute("tabindex", "-1");
      target.focus({ preventScroll: true });
    }
  }

  /* ------------------------------------------------------------------ home  */

  var deck = null;

  function renderHome() {
    var panel = $("deck-panel");
    clear(panel);

    var mastered = deck.cards.filter(function (c) {
      return store.isMastered(c.id);
    }).length;
    var pct = Math.round((mastered / deck.cards.length) * 100);

    var head = document.createElement("div");
    head.className = "deck-tile-head";
    var name = document.createElement("p");
    name.className = "deck-tile-name";
    name.textContent = deck.name;
    var count = document.createElement("p");
    count.className = "deck-tile-count";
    count.textContent = deck.cards.length + " cards";
    head.appendChild(name);
    head.appendChild(count);

    var blurb = document.createElement("p");
    blurb.className = "deck-tile-blurb";
    blurb.textContent = deck.blurb;

    var preview = document.createElement("div");
    preview.className = "deck-preview";
    deck.cards.slice(0, 6).forEach(function (c) {
      preview.appendChild(shapeSVG(c, 8));
    });

    var meter = document.createElement("div");
    meter.className = "meter";
    var fill = document.createElement("div");
    fill.className = "meter-fill";
    fill.style.width = pct + "%";
    meter.appendChild(fill);

    var label = document.createElement("p");
    label.className = "meter-label";
    var left = document.createElement("span");
    left.textContent = mastered + " of " + deck.cards.length + " learned";
    var right = document.createElement("span");
    if (mastered > 0) {
      var reset = document.createElement("button");
      reset.type = "button";
      reset.textContent = "Reset";
      reset.className = "linkbtn";
      reset.setAttribute("data-action", "reset");
      right.appendChild(reset);
    } else {
      right.textContent = "start anywhere";
    }
    label.appendChild(left);
    label.appendChild(right);

    panel.appendChild(head);
    panel.appendChild(blurb);
    panel.appendChild(preview);
    panel.appendChild(meter);
    panel.appendChild(label);
  }

  /* ----------------------------------------------------------------- study  */

  var study = {
    queue: [],
    index: 0,
    results: [],
    lastAction: null,
    // Set only while a rated card is flying off screen, and cleared by the very
    // same timer that advances the deck. Nothing sets it without scheduling the
    // clear, so it cannot strand the way an animationend flag can.
    advancing: false,

    start: function (cards) {
      this.queue = shuffle(cards);
      this.index = 0;
      this.results = [];
      this.lastAction = null;
      this.advancing = false;
      navigate("study");
      this.render(false);
    },

    card: function () {
      return this.queue[this.index];
    },

    render: function (animate) {
      var card = this.card();
      if (!card) return;

      var node = $("card");
      node.dataset.face = "front";
      node.style.transform = "";
      node.classList.remove("is-settling", "is-leaving");
      setBadges(0);

      var shape = $("card-shape");
      clear(shape);
      shape.appendChild(shapeSVG(card));

      $("card-name").textContent = card.name;
      $("card-def").textContent = card.definition;

      var example = $("card-example");
      clear(example);
      example.appendChild(document.createTextNode("Like "));
      var strong = document.createElement("b");
      strong.textContent = card.example;
      example.appendChild(strong);

      var facts = $("card-facts");
      clear(facts);
      card.facts.forEach(function (text) {
        var li = document.createElement("li");
        li.textContent = text;
        li.style.setProperty("--tone", "var(--t" + card.tone + ")");
        facts.appendChild(li);
      });

      node.setAttribute(
        "aria-label",
        "Card " +
          (this.index + 1) +
          " of " +
          this.queue.length +
          ", hidden. Activate to reveal the answer.",
      );

      var pct = (this.index / this.queue.length) * 100;
      $("study-meter").style.width = pct + "%";
      $("study-count").textContent =
        "Card " + (this.index + 1) + " of " + this.queue.length;
      $("study-remaining").textContent =
        this.queue.length - this.index + " to go";

      if (animate && !reduceMotion.matches) {
        node.classList.remove("is-entering");
        void node.offsetWidth; // restart the entry animation
        node.classList.add("is-entering");
      }

      announce("Card " + (this.index + 1) + " of " + this.queue.length + ".");
    },

    flip: function () {
      var node = $("card");
      var card = this.card();
      if (!card) return;
      var toBack = node.dataset.face === "front";
      node.dataset.face = toBack ? "back" : "front";
      buzz(8);

      if (toBack) {
        node.setAttribute(
          "aria-label",
          card.name + ". Activate to hide the answer.",
        );
        speech.say(card.name);
        announce(
          card.name + ". " + card.definition + " Like " + card.example + ".",
        );
      } else {
        node.setAttribute(
          "aria-label",
          "Card " +
            (this.index + 1) +
            " of " +
            this.queue.length +
            ", hidden. Activate to reveal the answer.",
        );
      }
    },

    /** Record an answer and move on. */
    rate: function (gotIt) {
      var card = this.card();
      // Without this, mashing the button rates the same card repeatedly and
      // skips the ones behind it, because the index only moves on the timer.
      if (!card || this.advancing) return;

      var prev = store.record(card.id, gotIt);
      this.results.push({ card: card, gotIt: gotIt });
      this.lastAction = { index: this.index, card: card, prev: prev };
      buzz(gotIt ? 12 : [24, 40, 24]);

      var self = this;
      toast.show(gotIt ? "Marked “Got it”" : "Marked “Again”", function () {
        self.undo();
      });

      var node = $("card");
      var done = function () {
        try {
          self.index += 1;
          if (self.index >= self.queue.length) {
            summary.fromStudy(self.results);
          } else {
            self.render(true);
          }
        } finally {
          self.advancing = false;
        }
      };

      if (reduceMotion.matches) {
        done();
        return;
      }

      this.advancing = true;
      node.classList.remove("is-settling", "is-entering");
      node.classList.add("is-leaving");
      node.style.transform =
        "translateX(" +
        (gotIt ? 120 : -120) +
        "%) rotate(" +
        (gotIt ? 16 : -16) +
        "deg)";
      // A timeout, not transitionend: if the transition is dropped for any
      // reason the deck still advances instead of freezing forever.
      window.setTimeout(done, 300);
    },

    undo: function () {
      var action = this.lastAction;
      if (!action) return;
      store.restore(action.card.id, action.prev);
      this.results.pop();
      this.index = action.index;
      this.lastAction = null;
      this.advancing = false;
      toast.hide();
      navigate("study", false);
      this.render(true);
      announce("Undone. Back to " + action.card.name + ".");
    },

    move: function (delta) {
      if (this.advancing) return;
      var next = this.index + delta;
      if (next < 0 || next >= this.queue.length) return;
      this.index = next;
      this.lastAction = null;
      this.render(true);
    },
  };

  function setBadges(dx) {
    var width = $("card").offsetWidth || 1;
    var ratio = Math.min(Math.abs(dx) / (width * SWIPE_DISTANCE), 1);
    $("badge-got").style.opacity = dx > 0 ? String(ratio) : "0";
    $("badge-again").style.opacity = dx < 0 ? String(ratio) : "0";
  }

  /* ------------------------------------------------------ pointer dragging  */

  var drag = {
    active: false,
    pointerId: null,
    startX: 0,
    startY: 0,
    startTime: 0,
    dx: 0,
    suppressClick: false,
  };

  function onPointerDown(event) {
    if (!event.isPrimary || current !== "study" || study.advancing) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    drag.pointerId = event.pointerId;
    drag.startX = event.clientX;
    drag.startY = event.clientY;
    drag.startTime = event.timeStamp;
    drag.dx = 0;
    drag.active = false;
    $("card").classList.remove("is-settling");
  }

  function onPointerMove(event) {
    if (drag.pointerId !== event.pointerId) return;
    var dx = event.clientX - drag.startX;
    var dy = event.clientY - drag.startY;

    if (!drag.active) {
      // Only claim the gesture once it is clearly horizontal, so vertical
      // scrolling still belongs to the page.
      if (Math.abs(dx) < DRAG_SLOP || Math.abs(dx) <= Math.abs(dy)) return;
      drag.active = true;
      drag.suppressClick = true;
      try {
        $("card").setPointerCapture(event.pointerId);
      } catch (err) {}
    }

    drag.dx = dx;
    $("card").style.transform =
      "translateX(" + dx + "px) rotate(" + dx / 22 + "deg)";
    setBadges(dx);
  }

  function endDrag(commit, event) {
    if (drag.pointerId === null) return;
    var node = $("card");
    try {
      if (event && node.hasPointerCapture(event.pointerId))
        node.releasePointerCapture(event.pointerId);
    } catch (err) {}

    var wasActive = drag.active;
    var dx = drag.dx;
    var elapsed = event ? Math.max(event.timeStamp - drag.startTime, 1) : 1;
    drag.pointerId = null;
    drag.active = false;
    drag.dx = 0;

    if (!wasActive) return;

    var width = node.offsetWidth || 1;
    var far = Math.abs(dx) > width * SWIPE_DISTANCE;
    var fast =
      Math.abs(dx) / elapsed > SWIPE_VELOCITY && Math.abs(dx) > DRAG_SLOP * 3;

    if (commit && (far || fast)) {
      setBadges(0);
      study.rate(dx > 0);
      return;
    }

    // Under threshold: spring back to centre.
    node.classList.add("is-settling");
    node.style.transform = "";
    setBadges(0);
    window.setTimeout(function () {
      node.classList.remove("is-settling");
    }, 340);
  }

  /* ------------------------------------------------------------------ quiz  */

  var quiz = {
    questions: [],
    index: 0,
    results: [],
    locked: false,
    timer: 0,

    start: function (cards) {
      var pool = cards.length >= 4 ? cards : deck.cards;
      this.questions = shuffle(cards).map(function (card, i) {
        var others = shuffle(
          pool.filter(function (c) {
            return c.id !== card.id;
          }),
        ).slice(0, 3);
        return {
          card: card,
          // Alternate the direction so both recall paths get exercised:
          // see the shape and name it, then hear the name and find the shape.
          mode: i % 2 === 0 ? "name" : "shape",
          options: shuffle(others.concat([card])),
        };
      });
      this.index = 0;
      this.results = [];
      this.locked = false;
      window.clearTimeout(this.timer);
      navigate("quiz");
      this.render();
    },

    render: function () {
      var q = this.questions[this.index];
      if (!q) return;
      this.locked = false;

      var promptBox = $("quiz-prompt");
      clear(promptBox);
      var heading = document.createElement("p");
      heading.className = "card-kicker";
      heading.id = "quiz-question";

      if (q.mode === "name") {
        heading.textContent = "Which shape is this?";
        promptBox.appendChild(heading);
        promptBox.appendChild(shapeSVG(q.card));
      } else {
        heading.textContent = "Find this shape";
        var word = document.createElement("p");
        word.className = "quiz-prompt-word";
        word.textContent = q.card.name;
        promptBox.appendChild(heading);
        promptBox.appendChild(word);
        speech.say(q.card.name);
      }

      var box = $("quiz-options");
      clear(box);
      box.dataset.kind = q.mode === "name" ? "word" : "shape";

      var self = this;
      q.options.forEach(function (option) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "press option";
        btn.dataset.id = option.id;
        if (q.mode === "name") {
          btn.textContent = option.name;
        } else {
          btn.appendChild(shapeSVG(option, 7));
          btn.setAttribute("aria-label", option.name);
        }
        btn.addEventListener("click", function () {
          self.answer(option, btn);
        });
        box.appendChild(btn);
      });

      $("quiz-feedback").textContent = "";
      $("quiz-meter").style.width =
        (this.index / this.questions.length) * 100 + "%";
      $("quiz-count").textContent =
        "Question " + (this.index + 1) + " of " + this.questions.length;
      var right = this.results.filter(function (r) {
        return r.gotIt;
      }).length;
      $("quiz-score").textContent = right + " correct";

      announce(
        heading.textContent +
          (q.mode === "shape" ? " " + q.card.name + "." : "") +
          " Question " +
          (this.index + 1) +
          " of " +
          this.questions.length +
          ".",
      );
    },

    answer: function (option, button) {
      if (this.locked) return;
      this.locked = true;

      var q = this.questions[this.index];
      var right = option.id === q.card.id;
      store.record(q.card.id, right);
      this.results.push({ card: q.card, gotIt: right });
      buzz(right ? 12 : [24, 40, 24]);

      var buttons = $("quiz-options").querySelectorAll("button");
      Array.prototype.forEach.call(buttons, function (btn) {
        btn.disabled = true;
        if (btn.dataset.id === q.card.id) btn.dataset.result = "correct";
      });
      if (!right) button.dataset.result = "wrong";

      $("quiz-feedback").textContent = right
        ? "Yes — " + q.card.name + "!"
        : "That one is the " + q.card.name + ".";
      speech.say(right ? "Yes. " + q.card.name : q.card.name);
      announce(
        right
          ? "Correct. " + q.card.name + "."
          : "Not quite. The answer is " + q.card.name + ".",
      );

      var self = this;
      window.clearTimeout(this.timer);
      this.timer = window.setTimeout(
        function () {
          self.index += 1;
          if (self.index >= self.questions.length) {
            summary.fromQuiz(self.results);
          } else {
            self.render();
          }
        },
        right ? 850 : 1600,
      );
    },
  };

  /* --------------------------------------------------------------- summary  */

  var summary = {
    missed: [],

    fromStudy: function (results) {
      this.show(results, "study");
    },

    fromQuiz: function (results) {
      this.show(results, "quiz");
    },

    show: function (results, origin) {
      var total = results.length || 1;
      var right = results.filter(function (r) {
        return r.gotIt;
      }).length;
      var pct = Math.round((right / total) * 100);

      // De-duplicate: a shape you missed twice is still one shape to practise.
      var seen = {};
      this.missed = results
        .filter(function (r) {
          if (r.gotIt || seen[r.card.id]) return false;
          seen[r.card.id] = true;
          return true;
        })
        .map(function (r) {
          return r.card;
        });

      var ring = document.querySelector(".score-ring");
      ring.style.setProperty("--score", String(pct));
      ring.style.setProperty(
        "--score-tone",
        pct >= 80 ? "var(--t4)" : pct >= 50 ? "var(--t1)" : "var(--t6)",
      );
      $("score-value").textContent = pct + "%";
      $("summary-heading").textContent =
        pct === 100 ? "Perfect run!" : pct >= 70 ? "Nice work." : "Good start.";
      $("summary-detail").textContent =
        right +
        " of " +
        results.length +
        (origin === "quiz" ? " answered correctly" : " marked as known");

      var list = $("missed-list");
      clear(list);
      this.missed.forEach(function (card) {
        var li = document.createElement("li");
        li.appendChild(shapeSVG(card, 8));
        li.appendChild(document.createTextNode(card.name));
        list.appendChild(li);
      });

      var actions = $("summary-actions");
      clear(actions);
      var self = this;

      if (this.missed.length) {
        actions.appendChild(
          button(
            "Practise these " + this.missed.length,
            "btn-lg btn-primary",
            function () {
              study.start(self.missed);
            },
          ),
        );
      }
      actions.appendChild(
        button(
          origin === "quiz" ? "Quiz again" : "Study again",
          "btn-lg" + (this.missed.length ? "" : " btn-primary"),
          function () {
            if (origin === "quiz") quiz.start(deck.cards);
            else study.start(deck.cards);
          },
        ),
      );
      actions.appendChild(
        button("Home", "", function () {
          renderHome();
          navigate("home");
        }),
      );

      navigate("summary");
      announce(
        "Session complete. " +
          pct +
          " percent. " +
          (this.missed.length
            ? this.missed.length + " shapes to practise."
            : "Nothing left to practise."),
      );
    },
  };

  function button(text, extra, onClick) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "press btn " + (extra || "");
    btn.textContent = text;
    btn.addEventListener("click", onClick);
    return btn;
  }

  /* -------------------------------------------------------------- controls  */

  function setSound(on) {
    store.sound = on;
    store.save();
    var btn = $("sound-btn");
    btn.setAttribute("aria-pressed", on ? "true" : "false");
    btn.querySelector(".icon-sound-on").hidden = !on;
    btn.querySelector(".icon-sound-off").hidden = on;
    $("sound-label").textContent = on
      ? "Sound on. Turn sound off."
      : "Sound off. Turn sound on.";
    if (!on) speech.stop();
  }

  var ACTIONS = {
    back: function () {
      renderHome();
      navigate("home");
    },
    "toggle-sound": function () {
      setSound(!store.sound);
      if (store.sound) speech.say("Sound on");
      announce(
        store.sound ? "Sound and vibration on." : "Sound and vibration off.",
      );
    },
    "start-learn": function () {
      study.start(deck.cards);
    },
    "start-quiz": function () {
      quiz.start(deck.cards);
    },
    reset: function () {
      store.reset();
      renderHome();
      announce("Progress reset.");
      toast.show("Progress reset", null);
    },
    "rate-again": function () {
      if (current === "study") study.rate(false);
    },
    "rate-got": function () {
      if (current === "study") study.rate(true);
    },
  };

  function onDocumentClick(event) {
    var target = event.target.closest && event.target.closest("[data-action]");
    if (!target) return;
    var action = ACTIONS[target.dataset.action];
    if (action) action();
  }

  /* Give touch devices a press state without waiting for :active to resolve. */
  function bindPressFeedback() {
    document.addEventListener("pointerdown", function (event) {
      var node = event.target.closest && event.target.closest(".press");
      if (node) node.classList.add("is-pressed");
    });
    ["pointerup", "pointercancel", "pointerleave"].forEach(function (type) {
      document.addEventListener(type, function () {
        var pressed = document.querySelectorAll(".is-pressed");
        Array.prototype.forEach.call(pressed, function (node) {
          node.classList.remove("is-pressed");
        });
      });
    });
  }

  function onKeyDown(event) {
    if (
      event.defaultPrevented ||
      event.metaKey ||
      event.ctrlKey ||
      event.altKey
    )
      return;

    if (event.key === "Escape" && current !== "home") {
      event.preventDefault();
      renderHome();
      navigate("home");
      return;
    }

    if (current !== "study") return;

    var tag = document.activeElement ? document.activeElement.tagName : "";
    var onCard = document.activeElement === $("card");

    switch (event.key) {
      case " ":
      case "Enter":
        // Let real buttons do their own thing.
        if (tag === "BUTTON" && !onCard) return;
        event.preventDefault();
        study.flip();
        break;
      case "1":
        event.preventDefault();
        study.rate(false);
        break;
      case "2":
        event.preventDefault();
        study.rate(true);
        break;
      case "ArrowLeft":
        event.preventDefault();
        study.move(-1);
        break;
      case "ArrowRight":
        event.preventDefault();
        study.move(1);
        break;
      default:
        break;
    }
  }

  /* ------------------------------------------------------------------ init  */

  function init() {
    var decks = window.FLASHCARD_DECKS;
    if (!decks || !decks.length) return;
    deck = decks[0];

    store.load();
    setSound(store.sound);
    renderHome();

    document.addEventListener("click", onDocumentClick);
    document.addEventListener("keydown", onKeyDown);
    bindPressFeedback();

    var card = $("card");
    card.addEventListener("pointerdown", onPointerDown);
    card.addEventListener("pointermove", onPointerMove);
    card.addEventListener("pointerup", function (e) {
      endDrag(true, e);
    });
    card.addEventListener("pointercancel", function (e) {
      endDrag(false, e);
    });
    card.addEventListener("click", function () {
      // A drag already handled this gesture; don't also flip.
      if (drag.suppressClick) {
        drag.suppressClick = false;
        return;
      }
      study.flip();
    });

    $("toast-undo").addEventListener("click", function () {
      if (toast.action) toast.action();
      else toast.hide();
    });

    window.addEventListener("popstate", function (event) {
      var name =
        event.state && event.state.screen ? event.state.screen : "home";
      if (name === "home") renderHome();
      navigate(name, false);
    });

    // Stop speech if the tab goes away mid-sentence.
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) speech.stop();
    });

    try {
      window.history.replaceState({ screen: "home" }, "");
    } catch (err) {}
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

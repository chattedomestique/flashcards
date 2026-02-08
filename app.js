const app = document.querySelector(".app");
const menuPanel = document.querySelector(".menu-panel");
const deckPanel = document.querySelector(".deck-panel");
const cardRotator = document.querySelector(".card-rotator");
const menuItems = document.querySelectorAll(".menu-item");
const flashcard = document.querySelector(".flashcard");
const flashcardLabel = document.querySelector(".flashcard-label");
const flashcardBack = document.querySelector(".flashcard-back p");
const flashcardShape = document.querySelector(".shape");
const deckLabel = document.querySelector(".deck-label");
const backButton = document.querySelector(".back-btn");
const toneToggle = document.querySelector(".toggle-btn");

const sets = {
  shapes: {
    title: "shapes",
    cardFront: "Square",
    cardBack: "Four equal sides, four right angles.",
    shapeClass: "square",
  },
  numbers: {
    title: "numbers",
    cardFront: "1",
    cardBack: "One. Start here.",
    shapeClass: "circle",
  },
  letters: {
    title: "letters",
    cardFront: "A",
    cardBack: "First letter of the alphabet.",
    shapeClass: "diamond",
  },
};

let isTransitioning = false;
let audioContext = null;
let toneInterval = null;
const TONE_FREQUENCY = 440;
const TONE_DURATION = 0.1;
const TONE_INTERVAL = 0.3;

const setActiveMenu = (selected) => {
  menuItems.forEach((item) => {
    item.classList.toggle("is-active", item === selected);
  });
};

const showMenu = () => {
  app.dataset.state = "menu";
  menuPanel.setAttribute("aria-hidden", "false");
  deckPanel.setAttribute("aria-hidden", "true");
  cardRotator.classList.remove("is-spinning");
};

const updateCardContent = (setKey) => {
  const set = sets[setKey] || sets.shapes;
  deckLabel.textContent = `${set.title} deck`;
  flashcardLabel.textContent = set.cardFront;
  flashcardBack.textContent = set.cardBack;
  flashcardShape.className = `shape ${set.shapeClass}`;
  flashcard.classList.remove("is-flipped");
};

const startDeck = (setKey, target) => {
  if (isTransitioning) return;
  isTransitioning = true;
  setActiveMenu(target);
  updateCardContent(setKey);
  app.dataset.state = "card";
  menuPanel.setAttribute("aria-hidden", "true");
  deckPanel.setAttribute("aria-hidden", "false");

  cardRotator.classList.remove("is-spinning");
  void cardRotator.offsetWidth;
  cardRotator.classList.add("is-spinning");
};

menuItems.forEach((item) => {
  item.addEventListener("pointerdown", () => {
    item.classList.add("is-pressed");
  });

  item.addEventListener("pointerup", () => {
    item.classList.remove("is-pressed");
  });

  item.addEventListener("pointerleave", () => {
    item.classList.remove("is-pressed");
  });

  item.addEventListener("click", () => {
    startDeck(item.dataset.set, item);
  });
});

flashcard.addEventListener("click", () => {
  flashcard.classList.toggle("is-flipped");
});

flashcard.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    flashcard.classList.toggle("is-flipped");
  }
});

backButton.addEventListener("click", () => {
  showMenu();
  isTransitioning = false;
});

cardRotator.addEventListener("animationend", (event) => {
  if (event.animationName !== "cardFlip") return;
  cardRotator.classList.remove("is-spinning");
  isTransitioning = false;
});

const ensureAudioContext = () => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioContext.state === "suspended") {
    audioContext.resume();
  }
};

const playTone = () => {
  if (!audioContext) return;
  const now = audioContext.currentTime;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();

  oscillator.type = "sine";
  oscillator.frequency.value = TONE_FREQUENCY;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(0.3, now + 0.01);
  gain.gain.linearRampToValueAtTime(0.0001, now + TONE_DURATION);

  oscillator.connect(gain);
  gain.connect(audioContext.destination);

  oscillator.start(now);
  oscillator.stop(now + TONE_DURATION + 0.02);
};

const startToneLoop = () => {
  if (toneInterval) return;
  playTone();
  toneInterval = window.setInterval(playTone, TONE_INTERVAL * 1000);
};

const stopToneLoop = () => {
  if (!toneInterval) return;
  window.clearInterval(toneInterval);
  toneInterval = null;
};

const setToneState = (isOn) => {
  toneToggle.classList.toggle("is-on", isOn);
  toneToggle.setAttribute("aria-pressed", String(isOn));
  toneToggle.textContent = isOn ? "tone: on" : "tone: off";

  if (isOn) {
    ensureAudioContext();
    startToneLoop();
  } else {
    stopToneLoop();
  }
};

if (toneToggle) {
  toneToggle.addEventListener("click", () => {
    const nextState = !toneToggle.classList.contains("is-on");
    setToneState(nextState);
  });
}

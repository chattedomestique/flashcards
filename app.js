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
  if (event.animationName !== "cardSpin") return;
  cardRotator.classList.remove("is-spinning");
  isTransitioning = false;
});

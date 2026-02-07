const app = document.querySelector(".app");
const menuScreen = document.querySelector(".menu-screen");
const cardScreen = document.querySelector(".card-screen");
const loadingScreen = document.querySelector(".loading-screen");
const loadingCard = document.querySelector(".loading-card");
const loadingSet = document.querySelector(".loading-set");
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
let loadingTimer = null;
const LOADER_DURATION = 2400;

const setActiveMenu = (selected) => {
  menuItems.forEach((item) => {
    item.classList.toggle("is-active", item === selected);
  });
};

const showMenu = () => {
  app.dataset.state = "menu";
  cardScreen.setAttribute("aria-hidden", "true");
  menuScreen.removeAttribute("aria-hidden");
  loadingScreen.setAttribute("aria-hidden", "true");
  loadingCard.classList.remove("is-flipped");
};

const showCard = (setKey) => {
  const set = sets[setKey] || sets.shapes;
  deckLabel.textContent = `${set.title} deck`;
  flashcardLabel.textContent = set.cardFront;
  flashcardBack.textContent = set.cardBack;
  flashcardShape.className = `shape ${set.shapeClass}`;
  flashcard.classList.remove("is-flipped");

  app.dataset.state = "card";
  menuScreen.setAttribute("aria-hidden", "true");
  loadingScreen.setAttribute("aria-hidden", "true");
  cardScreen.removeAttribute("aria-hidden");
  loadingCard.classList.remove("is-flipped");
  isTransitioning = false;
};

const startLoading = (setKey, target) => {
  if (isTransitioning) return;
  isTransitioning = true;
  setActiveMenu(target);
  app.dataset.state = "loading";
  menuScreen.setAttribute("aria-hidden", "true");
  cardScreen.setAttribute("aria-hidden", "true");
  loadingScreen.removeAttribute("aria-hidden");
  loadingSet.textContent = setKey;
  loadingCard.classList.remove("is-flipped");

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      loadingCard.classList.add("is-flipped");
    });
  });

  clearTimeout(loadingTimer);
  loadingTimer = window.setTimeout(() => {
    showCard(setKey);
  }, LOADER_DURATION);
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
    startLoading(item.dataset.set, item);
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

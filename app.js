const sets = {
  Shapes: {
    title: "Shapes",
    description:
      "Train recognition for core geometry. Tap a card to flip it, then move to the next.",
    cardFront: "Square",
    cardBack: "Four equal sides, four right angles.",
    shapeClass: "square",
    meta: "12 cards · Visual basics",
    available: true,
  },
  Colors: {
    title: "Colors",
    description: "Build your color vocabulary with quick visual recall.",
    meta: "Coming soon",
    available: false,
  },
  Textures: {
    title: "Textures",
    description: "Practice identifying surfaces and material cues.",
    meta: "Coming soon",
    available: false,
  },
  Motion: {
    title: "Motion",
    description: "Read movement and timing with kinetic prompts.",
    meta: "Coming soon",
    available: false,
  },
};

const setButtons = document.querySelectorAll(".set-card");
const previewTitle = document.querySelector("#preview-title");
const previewCopy = document.querySelector(".preview .intro-copy");
const flashcard = document.querySelector(".flashcard");
const flashcardLabel = document.querySelector(".flashcard-label");
const flashcardBack = document.querySelector(".flashcard-back p");
const flashcardShape = document.querySelector(".shape");
const startButton = document.querySelector(".primary-btn");
const shuffleButton = document.querySelector(".secondary-btn");

const updatePreview = (setName) => {
  const info = sets[setName];
  if (!info) return;

  previewTitle.textContent = info.title;
  previewCopy.textContent = info.description;

  if (info.available) {
    flashcardLabel.textContent = info.cardFront;
    flashcardBack.textContent = info.cardBack;
    flashcardShape.className = `shape ${info.shapeClass}`;
    startButton.disabled = false;
    shuffleButton.disabled = false;
    startButton.textContent = "Start deck";
    shuffleButton.textContent = "Shuffle";
  } else {
    flashcardLabel.textContent = "Locked";
    flashcardBack.textContent = "This deck is not ready yet.";
    flashcardShape.className = "shape";
    startButton.disabled = true;
    shuffleButton.disabled = true;
    startButton.textContent = "Coming soon";
    shuffleButton.textContent = "Waitlist";
  }

  flashcard.classList.remove("is-flipped");
};

setButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setButtons.forEach((btn) => btn.classList.remove("is-active"));
    button.classList.add("is-active");
    updatePreview(button.dataset.set);
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

shuffleButton.addEventListener("click", () => {
  if (shuffleButton.disabled) return;
  const animationClass = "is-flipped";
  flashcard.classList.remove(animationClass);
});

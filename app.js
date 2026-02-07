const app = document.querySelector(".app");
const menuScreen = document.querySelector(".menu-screen");
const cardScreen = document.querySelector(".card-screen");
const loadingScreen = document.querySelector(".loading-screen");
const loadingCard = document.querySelector(".loading-card");
const loadingSet = document.querySelector(".loading-set");
const loaderPath = document.querySelector(".loader-path");
const loaderSvg = document.querySelector(".loader-svg");
const loaderRotator = document.querySelector(".loader-rotator");
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
const LOADER_SEGMENT = 1200;
const LOADER_PAUSE = 300;
const LOADER_STEPS = 3;
const LOADER_DURATION = LOADER_SEGMENT * LOADER_STEPS + LOADER_PAUSE * (LOADER_STEPS - 1);
let loaderTimeline = null;
const LOADER_EASE = "easeInOutSine";

const SHAPES = {
  blob:
    "M 7.7423617,6.5524041 C 0.14213171,13.241204 -0.28352929,25.218399 6.5488487,32.446038 13.237649,40.04627 24.578354,40.568996 32.442483,33.639553 39.813699,26.434583 40.216105,14.96193 33.635997,7.7459191 26.935569,0.39795815 15.101951,-0.40029585 7.7423617,6.5524041 Z",
  square:
    "M 1.4639006,1.6816009 C 1.4129866,11.374999 1.1386316,31.038516 1.2037966,39.132841 10.361482,39.005187 29.91693,39.467197 38.833611,39.035804 39.621131,30.764045 38.910573,9.4542879 39.093715,1.2274189 30.247144,1.2462399 8.8125376,1.8724369 1.4639006,1.6816009 Z",
  wedge:
    "M 19.499615,1.5030295 C 15.341558,11.017856 5.4243459,31.217087 1.2037966,39.132841 10.361482,39.005187 29.91693,39.467197 38.833611,39.035804 34.978274,30.942616 24.624859,11.418574 20.165144,1.5845618 18.73688,1.6665173 20.913606,1.4728946 19.499615,1.5030295 Z",
};

const SHAPE_COLORS = ["#2d7dff", "#7ef9c8", "#ff6b6b"];

const playLoaderAnimation = () => {
  if (!window.anime || !loaderPath || !loaderSvg || !loaderRotator) return;

  if (loaderTimeline) {
    loaderTimeline.pause();
    loaderTimeline = null;
  }

  loaderSvg.style.fill = SHAPE_COLORS[0];
  loaderRotator.style.transform = "rotate(0deg)";

  const segment = LOADER_SEGMENT;
  const pause = LOADER_PAUSE;
  const step = segment + pause;

  loaderTimeline = window.anime
    .timeline({
      autoplay: false,
      easing: LOADER_EASE,
    })
    .add(
      {
        targets: loaderPath,
        d: [{ value: SHAPES.square }],
        duration: segment,
      },
      0
    )
    .add(
      {
        targets: loaderRotator,
        rotate: [0, 120],
        duration: segment,
      },
      0
    )
    .add(
      {
        targets: loaderSvg,
        fill: [{ value: SHAPE_COLORS[1] }],
        duration: segment,
      },
      0
    )
    .add(
      {
        targets: loaderPath,
        d: [{ value: SHAPES.wedge }],
        duration: segment,
      },
      step
    )
    .add(
      {
        targets: loaderRotator,
        rotate: [120, 240],
        duration: segment,
      },
      step
    )
    .add(
      {
        targets: loaderSvg,
        fill: [{ value: SHAPE_COLORS[2] }],
        duration: segment,
      },
      step
    )
    .add(
      {
        targets: loaderPath,
        d: [{ value: SHAPES.blob }],
        duration: segment,
      },
      step * 2
    )
    .add(
      {
        targets: loaderRotator,
        rotate: [240, 360],
        duration: segment,
      },
      step * 2
    );

  loaderTimeline.add(
    {
      targets: loaderSvg,
      fill: [{ value: SHAPE_COLORS[0] }],
      duration: segment,
    },
    step * 2
  );

  loaderTimeline.play();
};

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

  playLoaderAnimation();

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

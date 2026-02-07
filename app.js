const menuItems = document.querySelectorAll(".menu-item");

menuItems.forEach((item) => {
  item.addEventListener("click", () => {
    menuItems.forEach((button) => button.classList.remove("is-active"));
    item.classList.add("is-active");
  });
});

document.addEventListener(
  "touchmove",
  (event) => {
    if (event.cancelable) {
      event.preventDefault();
    }
  },
  { passive: false }
);

document.addEventListener(
  "wheel",
  (event) => {
    if (event.cancelable) {
      event.preventDefault();
    }
  },
  { passive: false }
);

const preventGesture = (event) => {
  if (event.cancelable) {
    event.preventDefault();
  }
};

document.addEventListener("gesturestart", preventGesture, { passive: false });
document.addEventListener("gesturechange", preventGesture, { passive: false });
document.addEventListener("gestureend", preventGesture, { passive: false });

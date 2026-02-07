const menuItems = document.querySelectorAll(".menu-item");

menuItems.forEach((item) => {
  item.addEventListener("click", () => {
    menuItems.forEach((button) => button.classList.remove("is-active"));
    item.classList.add("is-active");
  });
});

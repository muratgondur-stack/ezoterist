const button = document.getElementById("pulseButton");

button?.addEventListener("click", () => {
  button.classList.remove("pulse");
  void button.offsetWidth;
  button.classList.add("pulse");
});

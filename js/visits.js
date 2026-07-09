// Simple, transparent visit counter.
// This only counts page loads on this browser using localStorage —
// it does not collect IP addresses or any personal data, and it's
// shown openly to visitors rather than hidden.
(function () {
  const KEY = "mini-gallery-visit-count";
  let count = parseInt(localStorage.getItem(KEY) || "0", 10) + 1;
  localStorage.setItem(KEY, count);

  const el = document.getElementById("visit-counter");
  if (el) {
    el.textContent = `You've viewed this site ${count} time${count === 1 ? "" : "s"} on this browser.`;
  }
})();

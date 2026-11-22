/* ============================================================
   泡泡屋 2.0 — atmos.js
   场景开关 / 滚动入场。没有它页面也完整可读，只是少了这两层。
   ============================================================ */
(function () {
  "use strict";

  /* ---------- 场景：壁纸 / 余白 ---------- */
  const toggle = document.getElementById("scene-toggle");
  const sync = () => {
    const on = document.documentElement.classList.contains("scene-wall");
    if (toggle) {
      toggle.setAttribute("aria-pressed", on ? "true" : "false");
      const label = toggle.querySelector("span");
      if (label) label.textContent = on ? "场景 · 壁纸" : "场景 · 余白";
      toggle.title = on ? "切成纯色余白场景" : "用今日壁纸当场景";
    }
  };
  if (toggle) {
    toggle.addEventListener("click", () => {
      const on = document.documentElement.classList.toggle("scene-wall");
      try { localStorage.setItem("scene_mode", on ? "wall" : "ink"); } catch (e) {}
      sync();
    });
  }
  sync();

  /* ---------- 滚动入场 ---------- */
  const targets = document.querySelectorAll(".reveal");
  if (!targets.length) return;

  if (!("IntersectionObserver" in window)) {
    targets.forEach((el) => el.classList.add("in"));
    return;
  }

  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("in");
      io.unobserve(entry.target);
    });
  }, { rootMargin: "0px 0px -12% 0px", threshold: 0.08 });

  targets.forEach((el, i) => {
    el.style.transitionDelay = (Math.min(i, 6) * 60) + "ms";
    io.observe(el);
  });
})();

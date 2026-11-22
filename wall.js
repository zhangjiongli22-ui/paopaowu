/* 每日背景：从 Wallpaper Engine 壁纸库里按日期轮换，每个页面不同 */
(function () {
  const PAGES = ["index", "kira", "records", "chat", "gallery", "record", "timeline", "about", "legal", "login"];
  const page = (location.pathname.split("/").pop() || "index.html").replace(".html", "") || "index";
  const offset = Math.max(0, PAGES.indexOf(page));

  function apply(list) {
    if (!list || !list.length) return;
    const day = Math.floor(Date.now() / 86400000);
    const pick = list[(day + offset) % list.length];
    const next = list[(day + offset + 1) % list.length];
    const probe = new Image();
    probe.onload = () => document.documentElement.style.setProperty("--page-bg", `url("${pick}")`);
    probe.onerror = () => {}; // 加载失败就保留 CSS 里的兜底背景
    probe.src = pick;
    // 预加载明天的图，切日不闪
    const img = new Image();
    img.src = next;
  }

  function run() {
    try {
      const cached = sessionStorage.getItem("wallpapers");
      if (cached) {
        apply(JSON.parse(cached));
        return;
      }
    } catch (e) {}
    fetch("data/wallpapers.json", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        const list = data.items || [];
        try { sessionStorage.setItem("wallpapers", JSON.stringify(list)); } catch (e) {}
        apply(list);
      })
      .catch(() => {});
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run);
  else run();
})();

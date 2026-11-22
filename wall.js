/* 每日背景：全站统一一张，按日期轮换；首帧用缓存避免闪烁 */
(function () {
  function apply(list) {
    if (!list || !list.length) return;
    const day = Math.floor(Date.now() / 86400000);
    const pick = list[day % list.length];
    document.documentElement.style.setProperty("--page-bg", 'url("' + pick + '")');
    try { localStorage.setItem("page_bg", pick); } catch (e) {}
    const probe = new Image();
    probe.src = list[(day + 1) % list.length];
  }

  function run() {
    try {
      const cached = sessionStorage.getItem("wallpapers");
      if (cached) { apply(JSON.parse(cached)); return; }
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

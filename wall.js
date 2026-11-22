/* 登录态兜底：cookie 有、localStorage 没，就补回来 */
(function () {
  try {
    function getCookie(n) {
      var m = document.cookie.match(new RegExp("(?:^|; )" + n + "=([^;]*)"));
      return m ? decodeURIComponent(m[1]) : "";
    }
    if (!localStorage.getItem("paopaowu_admin")) {
      var a = getCookie("paopaowu_admin");
      if (a) localStorage.setItem("paopaowu_admin", a);
    }
    if (!localStorage.getItem("paopaowu_pass")) {
      var p = getCookie("paopaowu_pass");
      if (p) localStorage.setItem("paopaowu_pass", p);
    }
  } catch (e) {}
})();
/* 每日背景：全站统一一张，按日期轮换；首帧用缓存避免闪烁 */
(function () {
  function apply(list) {
    if (!list || !list.length) return;
    const day = Math.floor(Date.now() / 86400000);
    const pick = list[day % list.length];
    document.documentElement.style.setProperty("--page-bg", 'url("' + pick + '")');
    try { localStorage.setItem("page_bg", pick); } catch (e) {}
    const probe = new Image();
    probe.onerror = () => document.documentElement.style.setProperty("--page-bg", 'url("assets/wall.jpg")');
    probe.src = pick;
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

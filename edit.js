/* Kira page: each block edits only itself; buttons are static in the HTML. */
(function () {
  var isLocal = /^(127\.0\.0\.1|localhost)$/.test(location.hostname);
  var isAdmin = false;
  try { isAdmin = !!localStorage.getItem("paopaowu_admin"); } catch (e) {}
  if (!isAdmin && !isLocal) return;

  var SEL = "p, dd, dt, .v, .k, .tk";
  var page = location.pathname.split("/").pop() || "index";

  [].slice.call(document.querySelectorAll("[data-edit-block]")).forEach(function (btn) {
    var host = document.getElementById(btn.getAttribute("data-edit-block"));
    if (!host) return;
    var key = "edits_" + btn.getAttribute("data-edit-block") + "_" + page;
    var on = false;

    function items() { return [].slice.call(host.querySelectorAll(SEL)); }

    try {
      var saved = JSON.parse(localStorage.getItem(key) || "{}");
      items().forEach(function (el, i) { if (saved[i] != null) el.innerHTML = saved[i]; });
    } catch (e) {}

    btn.addEventListener("click", function () {
      on = !on;
      btn.textContent = on ? "\u5b8c\u6210" : "\u7f16\u8f91";
      btn.classList.toggle("on", on);
      items().forEach(function (el) { el.contentEditable = on ? "true" : "false"; });
      if (!on) {
        var out = {};
        items().forEach(function (el, i) { out[i] = el.innerHTML; });
        try { localStorage.setItem(key, JSON.stringify(out)); } catch (e) {}
      }
    });
  });
})();

/* 页面文字编辑：点右上角「编辑文字」，页面上所有文字直接改，改完点「完成」存下来。
   改动存在本机浏览器（localStorage），同一台电脑刷新后照旧；换设备看不到。 */
(function () {
  var isLocal = /^(127\.0\.0\.1|localhost)$/.test(location.hostname);
  var isAdmin = false;
  try { isAdmin = !!localStorage.getItem("paopaowu_admin"); } catch (e) {}
  if (!isAdmin && !isLocal) return;

  var page = (location.pathname.split("/").pop() || "index.html");
  var KEY = "pageText_" + page;
  var SKIP_TAGS = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, INPUT: 1, SELECT: 1, OPTION: 1, BR: 1, IMG: 1, SVG: 1, PATH: 1, CIRCLE: 1, I: 1, EM: 0 };

  function pathOf(el) {
    var parts = [];
    while (el && el !== document.body && el.parentElement) {
      var i = 1, p = el;
      while ((p = p.previousElementSibling)) if (p.tagName === el.tagName) i++;
      parts.unshift(el.tagName.toLowerCase() + ":" + i);
      el = el.parentElement;
    }
    return parts.join(">");
  }

  function editableNodes() {
    var out = [];
    var all = document.body.querySelectorAll("*");
    for (var i = 0; i < all.length; i++) {
      var el = all[i];
      if (SKIP_TAGS[el.tagName] === 1) continue;
      if (el.closest(".page-edit-bar")) continue;
      if (el.classList.contains("dawn-tag")) continue;
      var hasText = false;
      for (var j = 0; j < el.childNodes.length; j++) {
        var n = el.childNodes[j];
        if (n.nodeType === 3 && n.nodeValue.replace(/\s+/g, "")) { hasText = true; break; }
      }
      if (hasText) out.push(el);
    }
    return out;
  }

  function applySaved() {
    var saved = {};
    try { saved = JSON.parse(localStorage.getItem(KEY) || "{}"); } catch (e) {}
    if (!saved || !Object.keys(saved).length) return 0;
    var nodes = editableNodes();
    var hits = 0;
    nodes.forEach(function (el) {
      var k = pathOf(el);
      if (saved[k] != null) { el.innerHTML = saved[k]; hits++; }
    });
    return hits;
  }

  var bar = document.createElement("div");
  bar.className = "page-edit-bar";
  var btn = document.createElement("button");
  btn.type = "button";
  btn.className = "page-edit-btn";
  btn.textContent = "编辑文字";
  var reset = document.createElement("button");
  reset.type = "button";
  reset.className = "page-edit-reset";
  reset.textContent = "还原";
  reset.hidden = true;
  bar.appendChild(btn);
  bar.appendChild(reset);
  document.body.appendChild(bar);

  var on = false;
  var nodes = [];

  function collect() { return editableNodes(); }

  function enter() {
    on = true;
    btn.textContent = "完成";
    btn.classList.add("on");
    reset.hidden = false;
    document.body.classList.add("text-editing");
    nodes = collect();
    nodes.forEach(function (el) {
      el.setAttribute("contenteditable", "true");
      el.dataset.xk = pathOf(el);
    });
  }

  function save() {
    var out = {};
    nodes.forEach(function (el) {
      if (el.dataset && el.dataset.xk) out[el.dataset.xk] = el.innerHTML;
    });
    try { localStorage.setItem(KEY, JSON.stringify(out)); } catch (e) {}
  }

  function leave() {
    on = false;
    btn.textContent = "编辑文字";
    btn.classList.remove("on");
    document.body.classList.remove("text-editing");
    nodes.forEach(function (el) { el.removeAttribute("contenteditable"); });
    save();
    reset.hidden = false;
  }

  var hits = applySaved();
  if (hits > 0) reset.hidden = false;

  btn.addEventListener("click", function () {
    if (on) leave(); else enter();
  });

  reset.addEventListener("click", function () {
    try { localStorage.removeItem(KEY); } catch (e) {}
    location.reload();
  });

  document.addEventListener("keydown", function (e) {
    if (on && (e.key === "Escape")) leave();
  });
})();

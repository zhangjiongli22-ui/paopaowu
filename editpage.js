/* 页面文字编辑：点右上角「编辑文字」，页面上所有文字直接改，边改边存。
   改动存在本机浏览器（localStorage），同一台电脑刷新后照旧；换设备看不到。
   存档按「标签 + 改之前的文字 + 同名序号」认人，页面结构挪动也不会认错、不会丢。 */
(function () {
  var isLocal = /^(127\.0\.0\.1|localhost)$/.test(location.hostname);
  var isAdmin = false;
  try { isAdmin = !!localStorage.getItem("paopaowu_admin"); } catch (e) {}
  var canEdit = isAdmin || isLocal;

  var page = (location.pathname.split("/").pop() || "index.html");
  var KEY = "pageText_v3_" + page;
  var SKIP_TAGS = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, INPUT: 1, SELECT: 1, OPTION: 1, BR: 1, IMG: 1, SVG: 1, PATH: 1, CIRCLE: 1, I: 1, EM: 0 };

  function textOf(el) {
    return (el.textContent || "").replace(/\s+/g, "");
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

  // 认人规则：标签 + 前 40 字的原文 + 同标签同原文里的第几个
  function keyFor(el, nodes) {
    var t = textOf(el).slice(0, 40);
    var idx = 0;
    for (var i = 0; i < nodes.length; i++) {
      if (nodes[i] === el) break;
      if (nodes[i].tagName === el.tagName && textOf(nodes[i]).slice(0, 40) === t) idx++;
    }
    return el.tagName + "|" + t + "|" + idx;
  }

  function readStore() {
    try { return JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) { return {}; }
  }

  function applySaved() {
    var saved = readStore();
    if (!Object.keys(saved).length) return 0;
    var nodes = editableNodes();
    var hits = 0;
    nodes.forEach(function (el) {
      var k = keyFor(el, nodes);
      var rec = saved[k];
      if (!rec || typeof rec !== "object" || typeof rec.h !== "string") return;
      el.innerHTML = rec.h;
      hits++;
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
  var saveTimer = 0;

  function save() {
    var out = {};
    nodes.forEach(function (el) {
      if (!el.dataset.xk) return;
      out[el.dataset.xk] = { s: el.dataset.xs || "", h: el.innerHTML };
    });
    try { localStorage.setItem(KEY, JSON.stringify(out)); } catch (e) {}
  }

  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(save, 600);
  }

  function enter() {
    on = true;
    btn.textContent = "完成";
    btn.classList.add("on");
    reset.hidden = false;
    document.body.classList.add("text-editing");
    nodes = editableNodes();
    nodes.forEach(function (el) {
      el.dataset.xk = keyFor(el, nodes);
      el.dataset.xs = textOf(el).slice(0, 40);
      el.setAttribute("contenteditable", "true");
      el.addEventListener("input", scheduleSave);
    });
  }

  function leave() {
    on = false;
    btn.textContent = "编辑文字";
    btn.classList.remove("on");
    document.body.classList.remove("text-editing");
    nodes.forEach(function (el) {
      el.removeAttribute("contenteditable");
      el.removeEventListener("input", scheduleSave);
    });
    save();
    reset.hidden = false;
  }

  var hits = applySaved();
  if (hits > 0) reset.hidden = false;

  btn.addEventListener("click", function () {
    if (!canEdit) { location.href = "login.html"; return; }
    if (on) leave(); else enter();
  });

  reset.addEventListener("click", function () {
    try { localStorage.removeItem(KEY); } catch (e) {}
    location.reload();
  });

  // 编辑状态点链接只改字，不跳走
  document.addEventListener("click", function (e) {
    if (on && e.target && e.target.closest && e.target.closest("a")) { e.preventDefault(); }
  }, true);

  document.addEventListener("keydown", function (e) {
    if (on && e.key === "Escape") leave();
  });

  window.addEventListener("beforeunload", function () {
    if (on) save();
  });
})();

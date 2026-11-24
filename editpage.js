/* 页面文字编辑：点右上角「编辑文字」，页面上所有文字直接改，边改边存。
   改动存在本机浏览器（localStorage），同一台电脑刷新后照旧；换设备看不到。
   存档格式：路径 → { s: 改之前的文字特征, h: 改后的 HTML }
   套用规则：路径和原文都对得上才套；路径挪了，就按原文找唯一对得上的那一个。 */
(function () {
  var isLocal = /^(127\.0\.0\.1|localhost)$/.test(location.hostname);
  var isAdmin = false;
  try { isAdmin = !!localStorage.getItem("paopaowu_admin"); } catch (e) {}
  var canEdit = isAdmin || isLocal;

  var page = (location.pathname.split("/").pop() || "index.html");
  var KEY = "pageText_v2_" + page;
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

  function sigOf(el) {
    return (el.textContent || "").replace(/\s+/g, "").slice(0, 40);
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

  function readStore() {
    try { return JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) { return {}; }
  }

  function applySaved() {
    var saved = readStore();
    var keys = Object.keys(saved);
    if (!keys.length) return 0;
    var nodes = editableNodes();
    var byPath = {}, bySig = {};
    nodes.forEach(function (el) {
      byPath[pathOf(el)] = el;
      var s = sigOf(el);
      (bySig[s] = bySig[s] || []).push(el);
    });
    var hits = 0;
    keys.forEach(function (k) {
      var rec = saved[k];
      if (!rec || typeof rec !== "object" || typeof rec.h !== "string") return; // 旧格式不用，避免串位
      var el = byPath[k];
      if (el && (!rec.s || rec.s === sigOf(el))) { el.innerHTML = rec.h; hits++; return; }
      // 页面结构挪过：按改之前的原文找唯一对得上的那个元素
      if (rec.s && bySig[rec.s] && bySig[rec.s].length === 1) {
        bySig[rec.s][0].innerHTML = rec.h;
        hits++;
      }
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
    var prev = readStore();
    var out = {};
    // 先把这一轮没动过的旧记录留在原地（按原文特征去重）
    var keep = Object.keys(prev).filter(function (k) {
      var r = prev[k];
      return r && typeof r === "object" && typeof r.h === "string";
    });
    keep.forEach(function (k) { out[k] = prev[k]; });
    nodes.forEach(function (el) {
      var k = el.dataset.xk || pathOf(el);
      var s = el.dataset.xs || sigOf(el);
      out[k] = { s: s, h: el.innerHTML };
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
      el.dataset.xk = pathOf(el);
      el.dataset.xs = sigOf(el); // 改之前的文字特征
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

  document.addEventListener("keydown", function (e) {
    if (on && e.key === "Escape") leave();
  });

  window.addEventListener("beforeunload", function () {
    if (on) save();
  });
})();

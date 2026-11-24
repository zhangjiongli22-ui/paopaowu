/* 页面文字编辑：点右上角「编辑文字」，页面上所有文字直接改，边改边存。
   改动存在本机浏览器（localStorage），同一台电脑刷新后照旧；换设备看不到。
   存档按「结构路径」认人：普通文字认它所在的元素，混排里的零散文字（比如数据后面那句）
   单独包一层 pe-run 再认，页面结构挪动也不会认错、不会把里面的东西吃掉。 */
(function () {
  var isLocal = /^(127\.0\.0\.1|localhost)$/.test(location.hostname);
  var isAdmin = false;
  try { isAdmin = !!localStorage.getItem("paopaowu_admin"); } catch (e) {}
  var canEdit = isAdmin || isLocal;

  var page = (location.pathname.split("/").pop() || "index.html");
  var KEY = "pageText_v3_" + page;
  var SKIP_TAGS = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, INPUT: 1, SELECT: 1, OPTION: 1, BR: 1, IMG: 1, SVG: 1, PATH: 1, CIRCLE: 1, I: 1, EM: 0 };
  var RUN_TAG = "pe-run";

  var DECO = /^(latin|ch-sub|en|n|pf-yomi|go|role|ds|duo-name|adv-name|k)$/;

  function norm(s) { return (s || "").replace(/\s+/g, ""); }

  function textOf(el) { return norm(el.textContent); }

  function ownText(el) {
    var t = "";
    for (var i = 0; i < el.childNodes.length; i++) {
      var n = el.childNodes[i];
      if (n.nodeType === 3) t += n.nodeValue;
    }
    return norm(t);
  }

  function isRun(el) { return el.tagName && el.tagName.toLowerCase() === RUN_TAG; }

  // 结构路径：body 下的 tag:序号 链。pe-run 是编辑时自己加的，不算进序号里，保证老存档还认得上。
  function pathOf(el) {
    var parts = [];
    while (el && el !== document.body && el.parentElement) {
      var i = 1, p = el;
      while ((p = p.previousElementSibling)) {
        if (isRun(p)) continue;
        if (p.tagName === el.tagName) i++;
      }
      parts.unshift(el.tagName.toLowerCase() + ":" + i);
      el = el.parentElement;
    }
    return parts.join(">");
  }

  function elementByPath(path) {
    var parts = String(path || "").split(">");
    var el = document.body;
    for (var k = 0; k < parts.length; k++) {
      var m = /^([a-z0-9-]+):(\d+)$/.exec(parts[k]);
      if (!m) return null;
      var tag = m[1].toUpperCase(), want = Number(m[2]), idx = 0, found = null;
      for (var c = el.firstElementChild; c; c = c.nextElementSibling) {
        if (isRun(c)) continue;
        if (c.tagName !== tag) continue;
        idx++;
        if (idx === want) { found = c; break; }
      }
      if (!found) return null;
      el = found;
    }
    return el;
  }

  function skipped(el) {
    if (SKIP_TAGS[el.tagName] === 1) return true;
    if (el.closest && el.closest(".page-edit-bar")) return true;
    if (el.classList.contains("dawn-tag")) return true;
    if (el.classList.contains(RUN_TAG)) return false;
    if (DECO.test(el.getAttribute("class") || "")) return true;
    return false;
  }

  // 混排元素（自己带文字、里面又有元素）里那几段零散文字，单独包一层，不然点不到。
  // 用自定义标签 pe-run，避免蹭到 span / em 的样式。
  function wrapRuns() {
    var all = document.body.querySelectorAll("*");
    for (var i = 0; i < all.length; i++) {
      var el = all[i];
      if (isRun(el)) continue;
      if (skipped(el)) continue;
      if (!ownText(el)) continue;
      var hasChildText = false;
      for (var c = el.firstElementChild; c; c = c.nextElementSibling) {
        if (isRun(c)) continue;
        if (textOf(c)) { hasChildText = true; break; }
      }
      if (!hasChildText) continue;

      var tn = [], before = 0;
      for (var j = 0; j < el.childNodes.length; j++) {
        var n = el.childNodes[j];
        if (n.nodeType !== 3) continue;
        if (!norm(n.nodeValue)) continue;
        tn.push({ node: n, idx: before });
        before++;
      }
      for (var k = 0; k < tn.length; k++) {
        var run = document.createElement(RUN_TAG);
        run.className = "pe-run";
        run.setAttribute("data-pe", pathOf(el) + "#t" + tn[k].idx);
        el.replaceChild(run, tn[k].node);
        run.appendChild(tn[k].node);
      }
    }
  }

  function editableNodes() {
    var out = [];
    var all = document.body.querySelectorAll("*");
    for (var i = 0; i < all.length; i++) {
      var el = all[i];
      if (skipped(el)) continue;
      if (!ownText(el)) continue;
      out.push(el);
    }
    // 只让最里层的文字可编辑：父元素一起变成可编辑的话，打字会把子结构吃掉
    return out.filter(function (el) {
      return !out.some(function (other) { return other !== el && el.contains(other); });
    });
  }

  function keyFor(el) { return el.getAttribute("data-pe") || pathOf(el); }

  function readStore() {
    try { return JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) { return {}; }
  }

  function writeStore(obj) {
    try { localStorage.setItem(KEY, JSON.stringify(obj)); } catch (e) {}
  }

  var busy = false;

  // 老版本的存档记在容器（比如「在玩」那一整行）上，先把它套回去，再拆成新格式，免得丢。
  function migrateLegacy(saved) {
    var moved = [];
    Object.keys(saved).forEach(function (k) {
      if (k.indexOf("#t") >= 0) return;
      var rec = saved[k];
      if (!rec || typeof rec !== "object" || typeof rec.h !== "string") return;
      var el = elementByPath(k);
      if (!el) return;
      if (!el.children.length) return;         // 叶子元素交给正常流程
      el.innerHTML = rec.h;
      delete saved[k];
      moved.push(el);
    });
    return moved;
  }

  function applySaved() {
    if (on) return 0;
    var saved = readStore();
    if (!Object.keys(saved).length) return 0;
    busy = true;
    var moved = migrateLegacy(saved);
    wrapRuns();
    var nodes = editableNodes();
    var hits = 0;
    nodes.forEach(function (el) {
      var key = keyFor(el);
      var rec = saved[key];
      if (!rec || typeof rec !== "object" || typeof rec.h !== "string") return;
      if (el.children.length) return; // 只改最里层，别把子结构吃掉
      if (el.innerHTML !== rec.h) { el.innerHTML = rec.h; hits++; }
    });
    if (moved.length) {
      // 迁移过的容器：只给它里面那几段文字补新格式的存档，别把整页文字都冻住
      moved.forEach(function (host) {
        var runs = host.querySelectorAll("[data-pe]");
        for (var i = 0; i < runs.length; i++) {
          var key = runs[i].getAttribute("data-pe");
          if (!saved[key]) saved[key] = { s: textOf(runs[i]).slice(0, 40), h: runs[i].innerHTML };
        }
      });
      writeStore(saved);
    }
    busy = false;
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
  var dirty = [];
  var saveTimer = 0;

  function save() {
    var out = readStore();
    var changed = dirty.filter(function (el) { return el.dataset && el.dataset.xk; });
    changed.forEach(function (el) {
      // 父元素只是因为包含子元素才“变了”，这种不存，只存最里面真正改的那个
      var hasChangedChild = changed.some(function (other) {
        return other !== el && el.contains(other);
      });
      if (hasChangedChild) return;
      out[el.dataset.xk] = { s: el.dataset.xs || "", h: el.innerHTML };
    });
    writeStore(out);
  }

  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(save, 600);
  }

  function mark(el, applyValues) {
    if (el.hasAttribute("contenteditable")) return;
    el.dataset.xk = keyFor(el);
    el.dataset.xs = textOf(el).slice(0, 40);
    el.setAttribute("contenteditable", "true");
    if (!el.dataset.peBound) {
      el.dataset.peBound = "1";
      el.addEventListener("input", function () {
        if (dirty.indexOf(el) < 0) dirty.push(el);
        scheduleSave();
      });
    }
    if (applyValues) {
      var rec = readStore()[el.dataset.xk];
      if (rec && typeof rec.h === "string" && !el.children.length && el.innerHTML !== rec.h) el.innerHTML = rec.h;
    }
  }

  function markAll(applyValues) {
    nodes = editableNodes();
    nodes.forEach(function (el) {
      if (document.activeElement && el.contains(document.activeElement)) return;
      mark(el, applyValues);
    });
  }

  function enter() {
    on = true;
    btn.textContent = "完成";
    btn.classList.add("on");
    reset.hidden = false;
    document.body.classList.add("text-editing");
    busy = true;
    wrapRuns();
    markAll(false);
    busy = false;
    watch();
  }

  function leave() {
    on = false;
    btn.textContent = "编辑文字";
    btn.classList.remove("on");
    document.body.classList.remove("text-editing");
    nodes.forEach(function (el) { el.removeAttribute("contenteditable"); });
    save();
    reset.hidden = false;
    stopWatch();
  }

  // 有些字是数据加载完才填进来的，填进来以后补标一次，否则刚填的那段点不动
  var mo = null;
  var moTimer = 0;

  function watch() {
    if (!mo) {
      mo = new MutationObserver(function () {
        if (!on || busy) return;
        clearTimeout(moTimer);
        moTimer = setTimeout(refresh, 120);
      });
    }
    mo.observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  function stopWatch() {
    if (mo) { mo.disconnect(); }
    clearTimeout(moTimer);
  }

  function refresh() {
    if (!on) return;
    busy = true;
    wrapRuns();
    markAll(true);
    busy = false;
  }

  var hits = applySaved();
  if (hits > 0) reset.hidden = false;
  window.addEventListener("load", function () {
    var n = applySaved();
    if (n > 0) reset.hidden = false;
    setTimeout(function () { if (applySaved() > 0) reset.hidden = false; }, 600);
    setTimeout(function () { if (applySaved() > 0) reset.hidden = false; }, 1800);
    setTimeout(function () { if (applySaved() > 0) reset.hidden = false; }, 3500);
  });
  setTimeout(function () { if (applySaved() > 0) reset.hidden = false; }, 1200);

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
    if (on) { on = false; save(); }
  });
})();

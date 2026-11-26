(function () {
  "use strict";

  var MAX_BYTES = 22 * 1024 * 1024;
  var MAX_SHOTS = 30;

  function getPass() {
    try { return localStorage.getItem("paopaowu_pass") || ""; } catch (e) { return ""; }
  }

  var CATS = [
    { id: "game", name: "游戏", statuses: ["在玩", "玩过", "想玩"] },
    { id: "anime", name: "动画", statuses: ["在看", "看过", "想看"] },
    { id: "tv", name: "剧集", statuses: ["在看", "看过", "想看"] },
    { id: "film", name: "电影", statuses: ["在看", "看过", "想看"] },
    { id: "book", name: "读书", statuses: ["在读", "读过", "想读"] }
  ];

  var state = {
    data: null,
    loaded: false,
    cat: "game",
    cover: "",
    shots: [],
    picked: null,
    editCover: "",
    editShots: []
  };

  function $(s, r) { return (r || document).querySelector(s); }
  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }
  function esc(t) {
    return String(t == null ? "" : t).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function pad(n) { return String(n).padStart(2, "0"); }
  function today() {
    var d = new Date();
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }
  function mb(bytes) { return (bytes / 1048576).toFixed(2) + " MB"; }
  function catName(id) {
    for (var i = 0; i < CATS.length; i++) if (CATS[i].id === id) return CATS[i].name;
    return id;
  }

  /* ---------------- 读取 / 保存 ---------------- */

  function cleanData(raw) {
    var data = {
      cats: (raw && raw.cats) || ["idea", "movie", "game", "book", "fitness"],
      items: []
    };
    var items = (raw && raw.items) || [];
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if (!it || !it.id) continue;
      if (String(it.id).indexOf("cr-") === 0) continue;
      data.items.push(it);
    }
    return data;
  }

  function refreshStatus() {
    var box = $("#add-status");
    if (!state.loaded) {
      box.className = "add-status";
      box.innerHTML = "读不到数据（好像是本地打开的）。上线以后再用这页添加。";
      return;
    }
    var bytes = new Blob([JSON.stringify(state.data)]).size;
    var heavy = bytes > MAX_BYTES * 0.55;
    box.className = "add-status" + (heavy ? " warn" : "");
    var login = "";
    if (!getPass()) login = ' · <a href="login.html">先登录</a>才能存';
    box.innerHTML = "现在 <b>" + state.data.items.length + "</b> 条 · <b>" + mb(bytes) + "</b> / " + mb(MAX_BYTES) + login;
  }

  async function loadData() {
    try {
      var res = await fetch("/data/records.json", { cache: "no-store" });
      if (!res.ok) throw new Error("读取失败 " + res.status);
      var raw = await res.json();
      state.data = cleanData(raw);
      state.loaded = true;
    } catch (e) {
      state.data = null;
      state.loaded = false;
    }
    refreshStatus();
    renderPickList();
    if (wantTab === "shots" || wantId) activateTab(tabs[1]);
    if (wantId && state.loaded) {
      for (var i = 0; i < state.data.items.length; i++) {
        if (String(state.data.items[i].id) === wantId) { pickItem(state.data.items[i]); break; }
      }
    }
  }

  async function saveData(data) {
    var pass = getPass();
    if (!pass) throw new Error("还没登录，先去登录页登一下再来。");
    var blob = JSON.stringify(data);
    if (blob.length > MAX_BYTES) {
      throw new Error("数据已经 " + mb(blob.length) + "，超过上限了。先删掉一些带图的旧条目再加。");
    }
    var res = await fetch("/api/data", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ pass: pass, data: data })
    });
    var out = await res.json().catch(function () { return {}; });
    if (!res.ok || !out.ok) throw new Error(out.error || "保存失败 " + res.status);
    return out;
  }

  /* ---------------- 图片压缩 ---------------- */

  function draw(bmp, w, h, q) {
    var c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(w));
    c.height = Math.max(1, Math.round(h));
    var ctx = c.getContext("2d");
    ctx.fillStyle = "#0a1119";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(bmp, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", q);
  }

  function compress(file, maxSide, maxBytes) {
    return createImageBitmap(file).then(function (bmp) {
      var w = bmp.width, h = bmp.height;
      var scale = Math.min(1, maxSide / Math.max(w, h));
      var q = 0.82;
      var url = draw(bmp, w * scale, h * scale, q);
      var guard = 0;
      while (url.length * 0.75 > maxBytes && q > 0.42 && guard < 10) {
        q -= 0.06;
        guard++;
        url = draw(bmp, w * scale, h * scale, q);
      }
      if (url.length * 0.75 > maxBytes) {
        scale = Math.min(1, maxSide * 0.72 / Math.max(w, h));
        url = draw(bmp, w * scale, h * scale, 0.72);
      }
      try { bmp.close(); } catch (e) {}
      return url;
    });
  }

  /* ---------------- 预览 ---------------- */

  function renderPrev(box, list, onRemove, wide) {
    box.innerHTML = "";
    if (!list.length) {
      box.appendChild(el("span", "prev-empty", "还没选图"));
      return;
    }
    list.forEach(function (src, i) {
      var item = el("div", "prev-item" + (wide ? " wide" : ""));
      var img = el("img");
      img.src = src;
      img.alt = "";
      item.appendChild(img);
      if (onRemove) {
        var btn = el("button", null, "×");
        btn.type = "button";
        btn.title = "移除";
        btn.setAttribute("aria-label", "移除这张图");
        btn.addEventListener("click", function () { onRemove(i); });
        item.appendChild(btn);
      }
      box.appendChild(item);
    });
  }

  /* ---------------- 新增 ---------------- */

  function statusOptions(catId, selected) {
    var cat = CATS.filter(function (c) { return c.id === catId; })[0] || CATS[0];
    var sel = $("#f-status");
    sel.innerHTML = "";
    cat.statuses.forEach(function (s) {
      var o = el("option", null, s);
      o.value = s;
      if (s === selected) o.selected = true;
      sel.appendChild(o);
    });
  }

  function setCat(catId) {
    state.cat = catId;
    Array.prototype.forEach.call(document.querySelectorAll("#cat-chips .chip"), function (b) {
      b.setAttribute("aria-pressed", b.getAttribute("data-cat") === catId ? "true" : "false");
    });
    statusOptions(catId);
  }

  document.querySelectorAll("#cat-chips .chip").forEach(function (b) {
    b.addEventListener("click", function () { setCat(b.getAttribute("data-cat")); });
  });

  $("#cover-file").addEventListener("change", function (e) {
    var f = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!f) return;
    var hint = $("#cover-hint");
    hint.textContent = "压小中…";
    compress(f, 800, 110 * 1024).then(function (url) {
      state.cover = url;
      renderPrev($("#cover-prev"), [url], function () {
        state.cover = "";
        renderPrev($("#cover-prev"), []);
      }, true);
      hint.textContent = "已选，约 " + Math.round(url.length * 0.75 / 1024) + " KB";
    }).catch(function (err) {
      hint.textContent = "这张读不了：" + err.message;
    });
  });

  $("#shots-file").addEventListener("change", function (e) {
    var files = Array.prototype.slice.call(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;
    var room = MAX_SHOTS - state.shots.length;
    if (room <= 0) {
      $("#new-msg").textContent = "截图最多 " + MAX_SHOTS + " 张。";
      return;
    }
    files = files.slice(0, room);
    Promise.all(files.map(function (f) {
      return compress(f, 1280, 150 * 1024).catch(function () { return ""; });
    })).then(function (urls) {
      urls.forEach(function (u) { if (u) state.shots.push(u); });
      renderNewShots();
    });
  });

  function renderNewShots() {
    renderPrev($("#shots-prev"), state.shots, function (i) {
      state.shots.splice(i, 1);
      renderNewShots();
    });
  }

  $("#new-form").addEventListener("submit", async function (e) {
    e.preventDefault();
    var msg = $("#new-msg");
    var btn = $("#new-save");
    if (!state.loaded) {
      msg.className = "add-msg err";
      msg.textContent = "数据没读到，先别存。";
      return;
    }
    var title = $("#f-title").value.trim();
    if (!title) {
      msg.className = "add-msg err";
      msg.textContent = "标题得填一个。";
      $("#f-title").focus();
      return;
    }
    msg.className = "add-msg";
    msg.textContent = "存中…";
    btn.disabled = true;

    var item = {
      id: "u-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 4),
      cat: state.cat,
      title: title,
      status: $("#f-status").value,
      date: $("#f-date").value || today()
    };
    var nameCn = $("#f-name").value.trim();
    if (nameCn) item.name_cn = nameCn;
    var rating = $("#f-rating").value;
    if (rating !== "") item.rating = Number(rating);
    var desc = $("#f-desc").value.trim();
    if (desc) item.desc = desc;
    var note = $("#f-note").value.trim();
    if (note) item.note = note;
    if (state.cover) item.cover = state.cover;
    if (state.shots.length) item.shots = state.shots.slice();
    if ($("#f-pinned").checked) item.pinned = true;
    if (state.cat === "game" && item.status === "在玩") item.play_since = item.date;

    try {
      state.data.items.unshift(item);
      await saveData(state.data);
      msg.className = "add-msg ok";
      msg.innerHTML = '存好了，<a href="record.html?id=' + encodeURIComponent(item.id) + '">去详情页看看</a>，' +
        '<a href="records.html">回精神宇宙</a>';
      $("#f-title").value = "";
      $("#f-name").value = "";
      $("#f-rating").value = "";
      $("#f-desc").value = "";
      $("#f-note").value = "";
      $("#f-pinned").checked = false;
      state.cover = "";
      state.shots = [];
      renderPrev($("#cover-prev"), []);
      renderNewShots();
      $("#cover-hint").textContent = "不选就只有文字，卡片会空一块。";
      refreshStatus();
      renderPickList();
    } catch (err) {
      state.data.items.shift();
      msg.className = "add-msg err";
      msg.textContent = err.message;
    } finally {
      btn.disabled = false;
    }
  });

  /* ---------------- 给已有的加图 ---------------- */

  function renderPickList() {
    var list = $("#pick-list");
    list.innerHTML = "";
    if (!state.loaded) return;
    var q = $("#pick-search").value.trim().toLowerCase();
    var rows = state.data.items.filter(function (it) {
      if (it.cat === "log" || it.cat === "idea" || it.cat === "issue" || it.cat === "critique") return false;
      if (!q) return true;
      return String(it.title || "").toLowerCase().indexOf(q) >= 0 ||
        String(it.name_cn || "").toLowerCase().indexOf(q) >= 0;
    }).slice(0, 120);

    if (!rows.length) {
      list.appendChild(el("p", "prev-empty", "没搜到。"));
      return;
    }
    rows.forEach(function (it) {
      var row = el("button", "pick-row");
      row.type = "button";
      var pic = el("img");
      if (it.cover) pic.src = it.cover;
      pic.alt = "";
      pic.loading = "lazy";
      row.appendChild(pic);
      var t = el("span", "t", esc(it.title || "(无标题)") +
        "<small>" + esc(catName(it.cat)) + " · " + esc(it.status || "") +
        (it.date ? " · " + esc(it.date) : "") + "</small>");
      row.appendChild(t);
      row.addEventListener("click", function () { pickItem(it); });
      list.appendChild(row);
    });
  }

  $("#pick-search").addEventListener("input", renderPickList);

  function pickItem(it) {
    state.picked = it;
    state.editCover = "";
    state.editShots = (it.shots || []).slice();
    $("#pick-panel").hidden = false;
    $("#pick-title").textContent = it.title + "（" + catName(it.cat) + "）";
    renderPrev($("#edit-cover-prev"), it.cover ? [it.cover] : []);
    renderEditShots();
    $("#edit-msg").textContent = "";
    $("#pick-panel").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function renderEditShots() {
    renderPrev($("#edit-shots-prev"), state.editShots, function (i) {
      state.editShots.splice(i, 1);
      renderEditShots();
    });
  }

  $("#edit-cover-file").addEventListener("change", function (e) {
    var f = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!f) return;
    var msg = $("#edit-msg");
    msg.className = "add-msg";
    msg.textContent = "压小中…";
    compress(f, 800, 110 * 1024).then(function (url) {
      state.editCover = url;
      renderPrev($("#edit-cover-prev"), [url], function () {
        state.editCover = "";
        renderPrev($("#edit-cover-prev"), []);
      }, true);
      msg.textContent = "新封面约 " + Math.round(url.length * 0.75 / 1024) + " KB";
    }).catch(function (err) {
      msg.className = "add-msg err";
      msg.textContent = "这张读不了：" + err.message;
    });
  });

  $("#edit-shots-file").addEventListener("change", function (e) {
    var files = Array.prototype.slice.call(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;
    var msg = $("#edit-msg");
    var room = MAX_SHOTS - state.editShots.length;
    if (room <= 0) {
      msg.className = "add-msg err";
      msg.textContent = "截图最多 " + MAX_SHOTS + " 张，先删几张再加。";
      return;
    }
    files = files.slice(0, room);
    msg.className = "add-msg";
    msg.textContent = "压小中…";
    Promise.all(files.map(function (f) {
      return compress(f, 1280, 150 * 1024).catch(function () { return ""; });
    })).then(function (urls) {
      urls.forEach(function (u) { if (u) state.editShots.push(u); });
      renderEditShots();
      msg.textContent = "共 " + state.editShots.length + " 张，记得保存。";
    });
  });

  $("#edit-save").addEventListener("click", async function () {
    var msg = $("#edit-msg");
    if (!state.picked) return;
    msg.className = "add-msg";
    msg.textContent = "保存中…";
    var btn = $("#edit-save");
    btn.disabled = true;
    try {
      var target = null;
      for (var i = 0; i < state.data.items.length; i++) {
        if (String(state.data.items[i].id) === String(state.picked.id)) { target = state.data.items[i]; break; }
      }
      if (!target) throw new Error("这条已经不在数据里了，刷新一下。");
      if (state.editCover) target.cover = state.editCover;
      if (state.editShots.length) target.shots = state.editShots.slice();
      else delete target.shots;
      await saveData(state.data);
      state.picked = target;
      msg.className = "add-msg ok";
      msg.innerHTML = '保存了，<a href="record.html?id=' + encodeURIComponent(target.id) + '">去详情页看看</a>';
      refreshStatus();
      renderPickList();
    } catch (err) {
      msg.className = "add-msg err";
      msg.textContent = err.message;
    } finally {
      btn.disabled = false;
    }
  });

  /* ---------------- tab ---------------- */

  var tabs = [
    { btn: $("#tab-new"), panel: $("#panel-new") },
    { btn: $("#tab-shots"), panel: $("#panel-shots") }
  ];

  function activateTab(which) {
    tabs.forEach(function (o) {
      var on = o === which;
      o.btn.setAttribute("aria-selected", on ? "true" : "false");
      o.panel.hidden = !on;
    });
  }

  tabs.forEach(function (t) {
    t.btn.addEventListener("click", function () { activateTab(t); });
  });

  var wantId = "";
  var wantTab = "";
  try {
    var sp = new URLSearchParams(location.search);
    wantId = sp.get("id") || "";
    wantTab = sp.get("tab") || "";
  } catch (e) {}

  /* ---------------- 初始化 ---------------- */

  $("#f-date").value = today();
  statusOptions("game");
  renderPrev($("#cover-prev"), []);
  renderNewShots();
  loadData();

  if (!getPass()) {
    $("#new-save").disabled = true;
    $("#edit-save").disabled = true;
    $("#new-msg").textContent = "没登录，先去登录再来。";
  }

  try {
    if (localStorage.getItem("paopaowu_admin")) {
      document.querySelectorAll('footer a[href="login.html"]').forEach(function (a) { a.remove(); });
    }
  } catch (e) {}
})();

const CATS = {
  all:     { name: "全部" },
  idea:    { name: "计划" },
  issue:   { name: "未解决" },
  anime:   { name: "动画" },
  tv:      { name: "剧集" },
  film:    { name: "电影" },
  game:    { name: "游戏" },
  book:    { name: "读书" },
  fitness: { name: "健身" },
  plan:    { name: "每日计划" },
  log:     { name: "日志" }
};

const GROUPS = {
  hobby: { name: "精神食粮", cats: ["anime", "tv", "film", "game", "book"] },
  idea:  { name: "计划列表", cats: ["idea", "issue"] },
  plan:  { name: "每日内容", cats: ["log"] },
  stats: { name: "统计", cats: [] }
};

const main = document.getElementById("rec-main");
const groupRow = document.getElementById("group-row");
const catRow = document.getElementById("cat-row");
const viewRow = document.getElementById("view-row");

let items = [];
let group = "hobby";
let cat = "all";
let view = "summary";
let issueView = false;

function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

// 凌晨 4 点前算前一天
function dayOf(dateStr, timeStr) {
  if (!dateStr) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateStr).trim());
  if (!m) return String(dateStr);
  const hh = parseInt(String(timeStr || "12:00").slice(0, 2), 10);
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (!isNaN(hh) && hh < 4) d.setDate(d.getDate() - 1);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function stars(r) {
  if (!r) return "";
  const n = Math.max(0, Math.min(5, Math.round(r / 2)));
  return "★".repeat(n);
}

function card(r, mode) {
  const a = el("a", "poster");
  a.href = "record.html?id=" + encodeURIComponent(r.id);
  a.addEventListener("click", () => {
    try {
      sessionStorage.setItem("listState", JSON.stringify({ group, cat, y: window.scrollY }));
    } catch (e) {}
  });
  const box = el("div", "poster-box");
  if (r.cover) {
    const img = el("img");
    img.src = r.cover;
    img.alt = r.title || "";
    img.loading = "lazy";
    img.onerror = () => { img.remove(); box.appendChild(el("div", "poster-fallback", (r.title || "?").slice(0, 1))); };
    box.appendChild(img);
  } else {
    box.appendChild(el("div", "poster-fallback", (r.title || "?").slice(0, 1)));
  }
  if (r.status) {
    const st = el("span", "poster-status", r.status);
    if (["在看", "在玩"].includes(r.status)) st.classList.add("inprogress");
    box.appendChild(st);
  }
  if (r.rating || (r.note || "").trim()) box.appendChild(el("span", "poster-badge", "已评价"));
  a.appendChild(box);
  a.appendChild(el("p", "poster-title", r.title || "（没写标题）"));
  let start = r.play_since || r.date || "";
  if (/^\d{4}-\d{2}$/.test(start)) start += "-01";
  let subText = start || "未记";
  if (mode === "timeline") {
    const md = /^\d{4}-\d{2}-\d{2}$/.test(start) ? start.slice(5) : start;
    subText = (md + " " + (r.time || "")).trim() || "未记";
  }
  if (r.rating) {
    const row = el("p", "poster-stars");
    const v = Math.max(0, Math.min(10, Math.round(r.rating)));
    let html = "";
    for (let i = 1; i <= 5; i++) {
      if (v >= i * 2) html += '<span class="st on">★</span>';
      else if (v === i * 2 - 1) html += '<span class="st half">★</span>';
      else html += '<span class="st off">★</span>';
    }
    row.innerHTML = html;
    a.appendChild(row);
  }
  a.appendChild(el("p", "poster-sub", subText));
  return a;
}

function gridOf(rows) {
  const g = el("div", "rec-grid");
  if (!rows.length) g.appendChild(el("p", "detail-empty", "还没有。"));
  rows.forEach((r) => g.appendChild(card(r)));
  return g;
}

function summarised(rows) {
  const map = new Map();
  rows.forEach((r) => {
    const key = (r.title || "").trim() || "(没写标题)";
    if (!map.has(key)) map.set(key, { ...r, count: 0 });
    const g = map.get(key);
    g.count += 1;
    if (r.date && (!g.last || r.date > g.last)) g.last = r.date;
    if (r.status) g.status = r.status;
    if (r.rating) g.rating = r.rating;
    if (r.note) g.note = r.note;
    if (r.rated_on) g.rated_on = r.rated_on;
    if (!g.cover && r.cover) g.cover = r.cover;
  });
  return [...map.values()].sort((a, b) => (b.last || "").localeCompare(a.last || ""));
}

const KINDS = { fitness: "健身", game: "游戏", piano: "钢琴", study: "学习", media: "影视", work: "工作" };

function fmtMin(m) {
  m = Number(m) || 0;
  const h = Math.floor(m / 60), mm = m % 60;
  return h ? (mm ? h + "h" + mm + "m" : h + "h") : mm + "m";
}

function drawLog(pool) {
  main.innerHTML = "";
  if (!pool.length) {
    main.innerHTML = '<p class="detail-empty">还没有记录。</p>';
    return;
  }
  const byDate = new Map();
  pool.slice().sort((a, b) => String(b.date || "").localeCompare(String(a.date || ""))).forEach((r) => {
    const d = r.date || "未记日期";
    if (!byDate.has(d)) byDate.set(d, []);
    byDate.get(d).push(r);
  });
  for (const [d, rows] of byDate) {
    const totals = {};
    rows.forEach((r) => { totals[r.kind] = (totals[r.kind] || 0) + (Number(r.minutes) || 0); });
    const sum = Object.values(totals).reduce((a, b) => a + b, 0);
    const head = el("div", "day-block");
    head.id = "log-" + d;
    head.innerHTML = `<h2 class="log-date">${esc(d)}</h2>
      <p class="log-sum">${Object.keys(KINDS).filter((k) => totals[k]).map((k) => `${KINDS[k]} ${fmtMin(totals[k])}`).join(" · ")}${sum ? ` · 共 ${fmtMin(sum)}` : ""}</p>`;
    main.appendChild(head);
    const list = el("ul", "log-list");
    rows.slice().sort((a, b) => String(a.time || "").localeCompare(String(b.time || ""))).forEach((r) => {
      const li = el("li", "log-row");
      li.innerHTML = `<span class="log-time">${esc(r.time || "")}</span>
        <span class="log-kind k-${esc(r.kind || "")}">${esc(KINDS[r.kind] || r.kind || "")}</span>
        <span class="log-text">${esc(r.text || r.title || "")}</span>
        <span class="log-min">${r.minutes ? fmtMin(r.minutes) : ""}</span>`;
      list.appendChild(li);
    });
    main.appendChild(list);
  }
  buildLogToc([...byDate.keys()]);
}

function buildLogToc(dates) {
  const old = document.querySelector(".side-toc");
  if (old) old.remove();
  if (!dates.length) return;
  const nav = document.createElement("nav");
  nav.className = "side-toc";
  const head = document.createElement("span");
  head.className = "side-toc-title";
  head.textContent = "日期";
  nav.appendChild(head);
  dates.forEach((d) => {
    const a = document.createElement("a");
    a.href = "#log-" + d;
    a.textContent = String(d).slice(5) || d;
    a.addEventListener("click", (e) => {
      e.preventDefault();
      const target = document.getElementById("log-" + d);
      if (!target) return;
      const y = target.getBoundingClientRect().top + window.scrollY - 28;
      window.scrollTo({ top: y, behavior: "smooth" });
      a.classList.add("on");
      setTimeout(() => a.classList.remove("on"), 1400);
    });
    nav.appendChild(a);
  });
  document.body.appendChild(nav);
  const first = document.getElementById("log-" + dates[0]);
  if (first) {
    const rect = first.getBoundingClientRect();
    nav.style.top = Math.max(88, rect.top) + "px";
    const pageBox = (main.parentElement || main).getBoundingClientRect();
    const w = nav.getBoundingClientRect().width || 96;
    nav.style.left = Math.max(12, pageBox.left - w - 18) + "px";
  }
}


function dateOf(x) {
  return String(x.rated_on || x.play_since || x.date || "");
}

function drawTimeline(pool) {
  const rows = pool.filter((x) => dateOf(x)).sort((a, b) => (dateOf(b) + (b.time || "")).localeCompare(dateOf(a) + (a.time || "")));
  if (!rows.length) {
    main.insertAdjacentHTML("beforeend", '<p class="detail-empty">还没有内容。</p>');
    return;
  }
  const byMonth = new Map();
  rows.forEach((x) => {
    const m = dateOf(x).slice(0, 7);
    if (!byMonth.has(m)) byMonth.set(m, new Map());
    const days = byMonth.get(m);
    const d = dateOf(x);
    if (!days.has(d)) days.set(d, []);
    days.get(d).push(x);
  });
  for (const [m, days] of byMonth) {
    main.appendChild(el("h2", "sec-title date", m.slice(0, 4) + " 年 " + Number(m.slice(5)) + " 月"));
    for (const [d, list] of days) {
      main.appendChild(el("h3", "tl-date", d.slice(5) + " " + (list[0].time || "")));
      main.appendChild(gridOf(list));
    }
  }
}

function drawMain(pool) {
  main.innerHTML = "";
  const staleToc = document.querySelector(".side-toc");
  if (staleToc) staleToc.remove();
  if (group === "plan") { drawLog(pool); return; }
  if (group === "idea") {
    if (issueView) {
      const rows = pool.filter((x) => x.cat === "issue" || x.status === "未解决").sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
      main.appendChild(el("h2", "sec-title", "未解决"));
      if (!rows.length) {
        main.insertAdjacentHTML("beforeend", '<p class="detail-empty">没有未解决的问题。</p>');
      } else {
        main.insertAdjacentHTML("beforeend", '<ul class="todo-list unresolved">' + rows.map((x) => `<li class="todo-item"><span class="todo-mark">○</span><span class="todo-body"><span class="todo-title">${esc(x.title)}</span>${x.note ? `<span class="todo-note">${esc(x.note)}</span>` : ""}</span></li>`).join("") + "</ul>");
      }
      return;
    }
    pool = pool.filter((x) => x.cat === "idea");
    const unresolved = pool.filter((x) => x.status === "未解决").sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
    const planning = pool.filter((x) => x.status !== "已达成" && x.status !== "未解决").sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
    const done = pool.filter((x) => x.status === "已达成").sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));

    const row = (x, isDone) => `<li class="todo-item${isDone ? " done" : ""}">
      <span class="todo-mark">${isDone ? "✓" : "○"}</span>
      <span class="todo-body"><span class="todo-title">${esc(x.title)}</span>${x.note ? `<span class="todo-note">${esc(x.note)}</span>` : ""}</span>
    </li>`;

    if (unresolved.length) {
      main.appendChild(el("h2", "sec-title", "未解决"));
      main.insertAdjacentHTML("beforeend", '<ul class="todo-list unresolved">' + unresolved.map((x) => row(x, false)).join("") + "</ul>");
    }
    main.appendChild(el("h2", "sec-title", "计划中"));
    main.insertAdjacentHTML("beforeend", planning.length ? '<ul class="todo-list">' + planning.map((x) => row(x, false)).join("") + "</ul>" : '<p class="detail-empty">还没有计划。</p>');

    main.appendChild(el("h2", "sec-title", "已达成"));
    if (!done.length) {
      main.insertAdjacentHTML("beforeend", '<p class="detail-empty">还没有。</p>');
    } else {
      const byDate = new Map();
      done.forEach((x) => {
        const d = x.date || "未记日期";
        if (!byDate.has(d)) byDate.set(d, []);
        byDate.get(d).push(x);
      });
      for (const [d, list] of byDate) {
        main.appendChild(el("h3", "todo-date-head", d));
        main.insertAdjacentHTML("beforeend", '<ul class="todo-list">' + list.map((x) => row(x, true)).join("") + "</ul>");
      }
    }
    return;
  }
  const isWish = (x) => WISH.includes(x.status);
  if (view === "timeline") {
    drawTimeline(pool.filter((x) => !isWish(x)));
    return;
  }
  const pinnedRows = (cat && cat !== "all" ? pool : items).filter((x) => x.pinned).sort((a, b) => {
    const rank = (x) => (["在玩", "在看"].includes(x.status) ? 0 : 1);
    return rank(a) - rank(b) || String(b.date || "").localeCompare(String(a.date || ""));
  });
  {
    const fav = document.createElement("details");
    fav.className = "fav-fold";
    fav.dataset.toc = "我的最爱";
    fav.id = "sec-fav";
    fav.open = true;
    const sum = document.createElement("summary");
    sum.className = "sec-fold-head";
    sum.textContent = "我的最爱 · " + pinnedRows.length;
    fav.appendChild(sum);
    const rank = (x) => (["在玩", "在看"].includes(x.status) ? 0 : ["想玩", "想看"].includes(x.status) ? 1 : 2);
    const favRows = summarised(pinnedRows).sort((a, b) => rank(a) - rank(b) || String(b.last || b.date || "").localeCompare(String(a.last || a.date || "")));
    if (favRows.length) fav.appendChild(gridOf(favRows));
    else fav.insertAdjacentHTML("beforeend", '<p class="detail-empty">还没有收藏，点开条目后按「☆ 收藏」加进来。</p>');
    main.appendChild(fav);
  }
  const inprogRows = pool.filter((x) => INP.includes(x.status));
  if (inprogRows.length) {
    const ip = document.createElement("details");
    ip.className = "fav-fold";
    ip.id = "sec-inprog";
    ip.open = true;
    const ipLabel = cat === "game" ? "在玩" : (cat === "anime" || cat === "tv" || cat === "film") ? "在看" : "进行中";
    ip.dataset.toc = ipLabel;
    const ipSum = document.createElement("summary");
    ipSum.className = "sec-fold-head";
    ipSum.textContent = ipLabel + " · " + inprogRows.length;
    ip.appendChild(ipSum);
    ip.appendChild(gridOf(summarised(inprogRows)));
    main.appendChild(ip);
  }
  const wishRows = pool.filter(isWish).sort((a, b) => {
    const rank = (x) => (["在玩", "在看"].includes(x.status) ? 0 : 1);
    return rank(a) - rank(b) || String(b.date || "").localeCompare(String(a.date || ""));
  });
  const seenRows = pool.filter((x) => !isWish(x) && !INP.includes(x.status));
  const section = (title, rows, open, tocName, key) => {
    if (!rows.length) return;
    const box = document.createElement("details");
    box.className = "sec-fold";
    if (tocName) { box.dataset.toc = tocName; box.id = "sec-" + (key || tocName); }
    if (open) box.open = true;
    const sum = document.createElement("summary");
    sum.className = "sec-fold-head";
    sum.textContent = `${title} · ${rows.length}`;
    box.appendChild(sum);
    box.appendChild(gridOf(summarised(rows)));
    main.appendChild(box);
  };
  const LABEL = {
    game: ["想玩", "玩过"],
    anime: ["想看", "看过"],
    tv: ["想看", "看过"],
    film: ["想看", "看过"],
    book: ["想读", "读过"],
    all: ["心愿单", "已完成"],
  };
  const [wLabel, sLabel] = LABEL[group === "hobby" && cat !== "all" ? cat : "all"] || ["心愿单", "已完成"];
  section(wLabel, wishRows, true, wLabel, "wish");
  section(sLabel, seenRows, true, sLabel, "seen");
  buildToc();
  if (typeof window.__pendingY === "number") {
    const y = window.__pendingY;
    window.__pendingY = undefined;
    const root = document.documentElement;
    root.style.scrollBehavior = "auto";
    window.scrollTo(0, y);
    requestAnimationFrame(() => window.scrollTo(0, y));
    setTimeout(() => { root.style.scrollBehavior = ""; }, 60);
  } else if (!window.__firstDrawDone) {
    // 刷新进入时回到页面顶部（分级/分类由 URL 保持）
    const root = document.documentElement;
    root.style.scrollBehavior = "auto";
    window.scrollTo(0, 0);
    window.dispatchEvent(new Event("scroll"));
    setTimeout(() => {
      root.style.scrollBehavior = "";
      window.scrollTo(0, 0);
      window.dispatchEvent(new Event("scroll"));
    }, 120);
  }
  window.__firstDrawDone = true;
  ensureTopBtn();
}

function ensureTopBtn() {
  if (document.getElementById("to-top")) return;
  const btn = document.createElement("button");
  btn.id = "to-top";
  btn.type = "button";
  btn.textContent = "回到顶部";
  btn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  document.body.appendChild(btn);
  const onScroll = () => btn.classList.toggle("show", window.scrollY > 360);
  window.addEventListener("scroll", onScroll, { passive: true });
  // 记录滚动位置，详情页返回时直接定位
  let saveTimer = null;
  window.addEventListener("scroll", () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try { sessionStorage.setItem("listScroll", String(window.scrollY)); } catch (e) {}
    }, 150);
  }, { passive: true });
  onScroll();
}

function buildToc() {
  const old = document.querySelector(".side-toc");
  if (old) old.remove();
  const rows = [...main.querySelectorAll("[data-toc]")];
  if (!rows.length) return;
  const nav = document.createElement("nav");
  nav.className = "side-toc";
  const head = document.createElement("span");
  head.className = "side-toc-title";
  head.textContent = "目录";
  nav.appendChild(head);
  rows.forEach((box) => {
    const a = document.createElement("a");
    a.href = "#" + box.id;
    a.textContent = box.dataset.toc;
    a.addEventListener("click", (e) => {
      e.preventDefault();
      if (box.tagName === "DETAILS") box.open = true;
      spyLockUntil = Date.now() + 1200;
      setActive(rows.indexOf(box));
      const head = box.querySelector(".sec-fold-head");
      const navTop = nav.getBoundingClientRect().top;
      const headBottom = (head || box).getBoundingClientRect().bottom;
      const idx = rows.indexOf(box);
      // 平滑滚动，但滚动期间冻结高亮，结束后再锁定到目标区块
      spyLockUntil = Date.now() + 2000;
      setActive(idx);
      window.scrollBy({ top: headBottom - navTop, behavior: "smooth" });
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        setActive(idx);
        spyLockUntil = Date.now() + 250;
        window.removeEventListener("scrollend", finish);
      };
      window.addEventListener("scrollend", finish);
      setTimeout(finish, 1300);
    });
    nav.appendChild(a);
  });
  document.body.appendChild(nav);

  // 滚动到哪个区块，目录对应项常驻高亮
  const links = [...nav.querySelectorAll("a")];
  const targets = rows.map((box) => ({ box, link: links[rows.indexOf(box)] })).filter((x) => x.link);
  let spyLockUntil = 0;
  const setActive = (idx) => links.forEach((a, i) => a.classList.toggle("on", i === idx));
  // 滚动停止后才重新判定，滚动过程中保持当前高亮不动
  let spyTimer = null;
  const onScroll = () => {
    if (Date.now() < spyLockUntil) return;
    clearTimeout(spyTimer);
    spyTimer = setTimeout(runSpy, 160);
  };
  const runSpy = () => {
    if (Date.now() < spyLockUntil) return;
    const navTop = nav.getBoundingClientRect().top;
    if (!navTop) return;
    const probe = navTop + 6;
    let current = -1;
    targets.forEach(({ box }, i) => {
      const rect = box.getBoundingClientRect();
      // 探针线落在哪个区块的范围内，就是当前区块
      if (rect.top <= probe && rect.bottom > probe) current = i;
    });
    if (current < 0) {
      // 探针线落在区块空隙：选离探针线最近的区块，避免误跳到最后一个
      let best = 0;
      let bestDist = Infinity;
      targets.forEach(({ box }, i) => {
        const r = box.getBoundingClientRect();
        const dist = Math.min(Math.abs(r.top - probe), Math.abs(r.bottom - probe));
        if (dist < bestDist) {
          bestDist = dist;
          best = i;
        }
      });
      current = best;
    }
    setActive(current);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  // 记录滚动位置，详情页返回时直接定位
  let saveTimer = null;
  window.addEventListener("scroll", () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try { sessionStorage.setItem("listScroll", String(window.scrollY)); } catch (e) {}
    }, 150);
  }, { passive: true });
  onScroll();


  let scrollAnimToken = 0;
  function animateTo(targetY, idx) {
    const token = ++scrollAnimToken;
    const root = document.documentElement;
    // 先打断浏览器的旧滚动，再发起一次原生平滑滚动
    root.style.scrollBehavior = "auto";
    window.scrollTo(0, window.scrollY);
    root.style.scrollBehavior = "";
    window.scrollTo({ top: targetY, behavior: "smooth" });

    let done = false;
    const finish = () => {
      if (done || token !== scrollAnimToken) return;
      done = true;
      setActive(idx);
      spyLockUntil = Date.now() + 300;
    };
    window.addEventListener("scrollend", finish, { once: true });
    setTimeout(finish, 1200);
  }

  const anchor = document.getElementById("sec-fav") || rows[0];
  if (anchor) {
    const headEl = anchor.querySelector(".sec-fold-head");
    const headRect = (headEl || anchor).getBoundingClientRect();
    nav.style.top = Math.max(88, headRect.bottom) + "px";
    const box = (main.parentElement || main).getBoundingClientRect();
    const w = nav.getBoundingClientRect().width || 110;
    nav.style.left = Math.max(12, box.left - w - 18) + "px";
  }
}

const WISH = ["想看", "待看", "想玩", "想读"];
const INP = ["在看", "在玩"];

function addWish(wish) {
  if (!wish || !wish.length) return;
  const box = document.createElement("details");
  box.className = "wish";
  box.open = true;
  box.innerHTML = `<summary class="wish-head">待看 · ${wish.length}</summary>`;
  const chips = el("div", "cat-row wish-cats");
  const list = el("div", "wish-list");
  let active = "all";
  const render = () => {
    const rows = wish.filter((x) => active === "all" || x.cat === active);
    list.innerHTML = rows.length
      ? rows.map((x) => `<a class="wish-row" href="record.html?id=${encodeURIComponent(x.id)}">
          <span class="wish-tag">${esc((CATS[x.cat] || {}).name || x.cat)}</span>
          <span class="wish-title">${esc(x.title)}</span>
          <span class="wish-status">${esc(x.status || "")}</span>
        </a>`).join("")
      : '<p class="detail-empty">这一类还没有。</p>';
  };
  ["all", ...GROUPS.hobby.cats].forEach((k) => {
    const n = k === "all" ? wish.length : wish.filter((x) => x.cat === k).length;
    if (k !== "all" && !n) return;
    const b = el("button", "cat-bubble", null);
    b.innerHTML = `<span class="cat-name">${k === "all" ? "全部" : (CATS[k] || {}).name}</span><span class="cat-n">${n}</span>`;
    b.classList.toggle("on", k === active);
    b.addEventListener("click", () => {
      active = k;
      [...chips.children].forEach((x) => x.classList.toggle("on", x === b));
      render();
    });
    chips.appendChild(b);
  });
  box.appendChild(chips);
  box.appendChild(list);
  render();
  main.appendChild(box);
}

function drawStats() {
  const all = items;
  const hobby = all.filter((x) => ["anime", "tv", "film", "game", "book"].includes(x.cat));
  const logs = all.filter((x) => x.cat === "log");
  const ideas = all.filter((x) => x.cat === "idea" || x.cat === "issue");
  const rated = hobby.filter((x) => Number(x.rating) > 0);
  const avg = rated.length ? (rated.reduce((a, x) => a + Number(x.rating), 0) / rated.length / 2).toFixed(2) : "—";
  const KIND = { work: "工作", game: "游戏", fitness: "健身", piano: "练琴", study: "学习", media: "看片" };
  const byKind = {};
  logs.forEach((x) => { byKind[x.kind] = (byKind[x.kind] || 0) + (Number(x.minutes) || 0); });
  const totalMin = logs.reduce((a, x) => a + (Number(x.minutes) || 0), 0);
  const fmt = (m) => (m >= 60 ? Math.floor(m / 60) + "h" + (m % 60 ? (m % 60) + "m" : "") : (m || 0) + "m");
  const maxKind = Math.max(1, ...Object.values(byKind));

  // 先按主题归拢，只展示耗时最大的那一类工作流
  const FLOWS = [
    { name: "网站建设", re: /网站|站点|页面|封面|部署|推送|改版|上线|统计|锐评|档案|首页/ },
    { name: "视频剪辑", re: /剪辑|片子|视频|素材管理/ },
    { name: "练习与训练", re: /练琴|钢琴|健身|跑步|训练/ }
  ];
  const flowStats = FLOWS.map((f) => {
    const rows = logs
      .filter((x) => f.re.test(x.text || ""))
      .sort((a, b) => ((a.date || "") + (a.time || "")).localeCompare((b.date || "") + (b.time || "")));
    return { name: f.name, rows, mins: rows.reduce((a, x) => a + (Number(x.minutes) || 0), 0) };
  }).sort((a, b) => b.mins - a.mins);
  const mainFlow = flowStats[0];
  const site = mainFlow.rows;
  const siteMin = mainFlow.mins;

  const catRowData = [
    ["动画", hobby.filter((x) => x.cat === "anime").length],
    ["剧集", hobby.filter((x) => x.cat === "tv").length],
    ["电影", hobby.filter((x) => x.cat === "film").length],
    ["游戏", hobby.filter((x) => x.cat === "game").length],
    ["读书", hobby.filter((x) => x.cat === "book").length],
    ["计划", ideas.length],
    ["日志", logs.length]
  ];

  main.innerHTML = `
    <section class="stat-wrap">
      <div class="stat-hero">
        <div class="stat-big"><b>${all.length}</b><span>全部条目</span></div>
        <div class="stat-big"><b>${rated.length}</b><span>已评分</span></div>
        <div class="stat-big"><b>${avg}</b><span>平均分 / 5</span></div>
        <div class="stat-big"><b>${fmt(totalMin)}</b><span>累计记录时长</span></div>
      </div>

      <h3 class="stat-h">时间都花在</h3>
      <div class="stat-bars">
        ${Object.keys(KIND).map((k) => `<div class="stat-bar"><span class="k">${KIND[k]}</span><span class="bar"><i style="width:${Math.round(((byKind[k] || 0) / maxKind) * 100)}%"></i></span><span class="v">${fmt(byKind[k] || 0)}</span></div>`).join("")}
      </div>

      <h3 class="stat-h">条目分布</h3>
      <div class="stat-chips">
        ${catRowData.map(([k, v]) => `<span class="stat-chip"><b>${v}</b>${k}</span>`).join("")}
      </div>

      <h3 class="stat-h">工作流时间统计<span class="stat-sub">${esc(mainFlow.name)} · 共 ${fmt(siteMin)} · 按时间顺序</span></h3>
      <ol class="flow">
        ${site.map((x) => `
          <li class="flow-row">
            <span class="flow-when">${esc(x.date || "")}<i>${esc(x.time || "")}</i></span>
            <span class="flow-what">${esc(x.text || "")}</span>
            <span class="flow-dur">${fmt(Number(x.minutes) || 0)}</span>
          </li>`).join("")}
      </ol>
    </section>`;
}

function draw() {
  if (group === "stats") {
    const t = document.querySelector(".side-toc");
    if (t) t.remove();
    drawStats();
    return;
  }
  const poolAll = items.filter((x) => GROUPS[group].cats.includes(x.cat));
  const pool = cat === "all" ? poolAll : poolAll.filter((x) => x.cat === cat);

  catRow.innerHTML = "";
  if (group === "hobby") {
    const counts = {};
    poolAll.forEach((x) => (counts[x.cat] = (counts[x.cat] || 0) + 1));
    ["all", ...GROUPS[group].cats].forEach((k) => {
      const n = k === "all" ? poolAll.length : counts[k] || 0;
      const b = el("button", "cat-bubble", null);
      b.innerHTML = `<span class="cat-name">${(CATS[k] && CATS[k].name) || k}</span><span class="cat-n">${n}</span>`;
      b.classList.toggle("on", k === cat);
      b.addEventListener("click", () => {
        cat = k;
        const u = new URL(location.href);
        u.searchParams.set("group", group);
        if (k && k !== "all") u.searchParams.set("cat", k); else u.searchParams.delete("cat");
        u.searchParams.delete("y");
        history.replaceState(null, "", u);
        draw();
        const root = document.documentElement;
        root.style.scrollBehavior = "auto";
        window.scrollTo(0, 0);
        setTimeout(() => {
          root.style.scrollBehavior = "";
          window.scrollTo(0, 0);
          window.dispatchEvent(new Event("scroll"));
        }, 60);
      });
      catRow.appendChild(b);
    });
  }
  drawMain(pool);
}

if ("scrollRestoration" in history) history.scrollRestoration = "manual";

(async () => {
  try {
    const res = await fetch("data/records.json", { cache: "no-store" });
    items = (await res.json()).items || [];
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const hhmm = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    items.forEach((it) => {
      if (!it.date) it.date = today;
      if (!it.time) it.time = hhmm;
      if (it.cat === "game" && !it.play_since) it.play_since = it.date;
    });
  } catch (e) {
    main.innerHTML = '<p class="loading-bar">还没连上记录。</p>';
    return;
  }

  window.addEventListener("pageshow", async (e) => {
    if (!e.persisted) return;
    try {
      const res = await fetch("data/records.json", { cache: "no-store" });
      items = (await res.json()).items || [];
      draw();
    } catch (err) {}
  });

  const params = new URLSearchParams(location.search);
  const cameWithY = params.has("y");
  const gp = params.get("group") || location.hash.replace("#", "");
  if (gp && GROUPS[gp]) group = gp;
  const cp = params.get("cat");
  if (cp) cat = cp;
  if (!cameWithY) {
    // 普通刷新：浏览器可能恢复旧滚动位置，这里强制回顶
    const forceTop = () => {
      const root = document.documentElement;
      root.style.scrollBehavior = "auto";
      window.scrollTo(0, 0);
      setTimeout(() => {
        root.style.scrollBehavior = "";
        window.scrollTo(0, 0);
        window.dispatchEvent(new Event("scroll"));
      }, 100);
    };
    window.addEventListener("load", forceTop);
    setTimeout(forceTop, 400);
  }

  const restoreY = params.get("y");
  if (restoreY) {
    window.__pendingY = Number(restoreY) || 0;
    const y = Number(restoreY) || 0;
    const root = document.documentElement;
    root.style.scrollBehavior = "auto";
    window.scrollTo(0, y);
    requestAnimationFrame(() => {
      window.scrollTo(0, y);
      root.style.scrollBehavior = "";
    });
    const u = new URL(location.href);
    u.searchParams.delete("y");
    history.replaceState(null, "", u);
  }

  // 小字视图切换，靠最右
  const drawViews = () => {
    viewRow.innerHTML = "";
    const b = el("button", "view-link", view === "summary" ? "时间线" : "返回");
    b.addEventListener("click", () => {
      view = view === "summary" ? "timeline" : "summary";
      drawViews();
      draw();
    });
    viewRow.appendChild(b);
  };
  const syncViewRow = () => {
    if (group === "hobby") {
      view = "summary";
      viewRow.style.display = "";
      drawViews();
      return;
    }
    viewRow.innerHTML = "";
    if (group === "idea") {
      viewRow.style.display = "";
      const b = el("button", "view-link", issueView ? "返回计划" : "未解决");
      b.addEventListener("click", () => {
        issueView = !issueView;
        syncViewRow();
        draw();
      });
      viewRow.appendChild(b);
    } else {
      viewRow.style.display = "none";
    }
  };
  syncViewRow();

  Object.keys(GROUPS).forEach((k) => {
    const b = el("button", "group-btn" + (k === group ? " on" : ""), GROUPS[k].name);
    b.addEventListener("click", () => {
      group = k;
      cat = "all";
      issueView = false;
      syncViewRow();
      const u = new URL(location.href);
      u.searchParams.set("group", k);
      history.replaceState(null, "", u);
      [...groupRow.children].forEach((x) => x.classList.toggle("on", x === b));
      draw();
    });
    groupRow.appendChild(b);
  });
  draw();
})();

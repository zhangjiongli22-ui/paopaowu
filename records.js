const CATS = {
  all:     { name: "全部" },
  idea:    { name: "巧思" },
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
  idea:  { name: "有一些小巧思", cats: ["idea"] },
  plan:  { name: "每日统计", cats: ["log"] }
};

const main = document.getElementById("rec-main");
const groupRow = document.getElementById("group-row");
const catRow = document.getElementById("cat-row");
const viewRow = document.getElementById("view-row");

let items = [];
let group = "hobby";
let cat = "all";
let view = "summary";

function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

function stars(r) {
  if (!r) return "";
  const n = Math.max(0, Math.min(5, Math.round(r / 2)));
  return "★".repeat(n);
}

function card(r, mode) {
  const a = el("a", "poster");
  a.href = "record.html?id=" + encodeURIComponent(r.id);
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
  if (r.status) box.appendChild(el("span", "poster-status", r.status));
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
  if (group === "plan") { drawLog(pool); return; }
  if (group === "idea") {
    const planning = pool.filter((x) => x.status !== "已达成").sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
    const done = pool.filter((x) => x.status === "已达成").sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));

    const row = (x, isDone) => `<li class="todo-item${isDone ? " done" : ""}">
      <span class="todo-mark">${isDone ? "✓" : "○"}</span>
      <span class="todo-body"><span class="todo-title">${esc(x.title)}</span>${x.note ? `<span class="todo-note">${esc(x.note)}</span>` : ""}</span>
    </li>`;

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
  const wishRows = pool.filter(isWish);
  const seenRows = pool.filter((x) => !isWish(x));
  const section = (title, rows, open) => {
    if (!rows.length) return;
    const box = document.createElement("details");
    box.className = "sec-fold";
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
  section(wLabel, wishRows, true);
  section(sLabel, seenRows, true);
}

const WISH = ["想看", "待看", "想玩", "想读"];

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

function draw() {
  const poolAll = items.filter((x) => GROUPS[group].cats.includes(x.cat));
  const pool = cat === "all" ? poolAll : poolAll.filter((x) => x.cat === cat);

  catRow.innerHTML = "";
  if (group === "hobby") {
    const counts = {};
    poolAll.forEach((x) => (counts[x.cat] = (counts[x.cat] || 0) + 1));
    ["all", ...GROUPS.hobby.cats].forEach((k) => {
      const n = k === "all" ? poolAll.length : counts[k] || 0;
      const b = el("button", "cat-bubble", null);
      b.innerHTML = `<span class="cat-name">${CATS[k].name}</span><span class="cat-n">${n}</span>`;
      b.classList.toggle("on", k === cat);
      b.addEventListener("click", () => { cat = k; draw(); });
      catRow.appendChild(b);
    });
  }
  drawMain(pool);
}

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

  const gp = new URLSearchParams(location.search).get("group") || location.hash.replace("#", "");
  if (gp && GROUPS[gp]) group = gp;

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
  drawViews();

  Object.keys(GROUPS).forEach((k) => {
    const b = el("button", "group-btn" + (k === group ? " on" : ""), GROUPS[k].name);
    b.addEventListener("click", () => {
      group = k;
      cat = "all";
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

const CATS = {
  all:     { name: "全部" },
  idea:    { name: "巧思" },
  movie:   { name: "影视" },
  game:    { name: "游戏" },
  book:    { name: "读书" },
  fitness: { name: "健身" },
  plan:    { name: "每日计划" }
};

const GROUPS = {
  hobby: { name: "爱好", cats: ["movie", "game", "book", "fitness"] },
  idea:  { name: "巧思", cats: ["idea"] },
  plan:  { name: "每日计划", cats: ["plan"] }
};

const main = document.getElementById("rec-main");
const groupRow = document.getElementById("group-row");
const catRow = document.getElementById("cat-row");
const viewRow = document.getElementById("view-row");

let items = [];
let group = "hobby";
let cat = "all";
let view = "summary";

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
  if (r.rating) box.appendChild(el("span", "poster-rating", stars(r.rating)));
  if (r.status) box.appendChild(el("span", "poster-status", r.status));
  a.appendChild(box);
  a.appendChild(el("p", "poster-title", r.title || "（没写标题）"));
  const start = r.play_since || r.date || "";
  let subText = start || "未记";
  if (mode === "timeline") {
    const md = /^\d{4}-\d{2}-\d{2}$/.test(start) ? start.slice(5) : start;
    subText = (md + " " + (r.time || "")).trim() || "未记";
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
    if (!g.cover && r.cover) g.cover = r.cover;
  });
  return [...map.values()].sort((a, b) => (b.last || "").localeCompare(a.last || ""));
}

function drawMain(pool) {
  main.innerHTML = "";
  if (group === "idea") {
    const planning = pool.filter((x) => x.status !== "已达成");
    const done = pool.filter((x) => x.status === "已达成");
    main.appendChild(el("h2", "sec-title", "计划中"));
    main.appendChild(gridOf(planning));
    main.appendChild(el("h2", "sec-title", "已达成"));
    main.appendChild(gridOf(done));
    return;
  }
  if (view === "timeline") {
    const byMonth = new Map();
    pool
      .slice()
      .sort((a, b) => ((b.play_since || b.date || "") + (b.time || "")).localeCompare((a.play_since || a.date || "") + (a.time || "")))
      .forEach((r) => {
        const d = r.play_since || r.date || "未记日期";
        const m = /^\d{4}-\d{2}/.test(d) ? d.slice(0, 7) : "未记日期";
        if (!byMonth.has(m)) byMonth.set(m, []);
        byMonth.get(m).push({ r, d });
      });
    for (const [m, rows] of byMonth) {
      const label = /^\d{4}-\d{2}$/.test(m) ? m.slice(0, 4) + " 年 " + Number(m.slice(5)) + " 月" : m;
      main.appendChild(el("h2", "sec-title date", label));
      const g = el("div", "rec-grid");
      rows.forEach(({ r }) => g.appendChild(card(r, "timeline")));
      main.appendChild(g);
    }
    return;
  }
  main.appendChild(gridOf(summarised(pool)));
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
      if (k !== "all" && !n) return;
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
  } catch (e) {
    main.innerHTML = '<p class="loading-bar">还没连上记录。</p>';
    return;
  }

  const gp = new URLSearchParams(location.search).get("group");
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
      [...groupRow.children].forEach((x) => x.classList.toggle("on", x === b));
      draw();
    });
    groupRow.appendChild(b);
  });
  draw();
})();

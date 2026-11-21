const CATS = {
  all:     { name: "全部" },
  idea:    { name: "巧思" },
  movie:   { name: "影视" },
  game:    { name: "游戏" },
  book:    { name: "读书" },
  fitness: { name: "健身" }
};

const list = document.getElementById("rec-list");
const row = document.getElementById("rec-row");
const hint = document.getElementById("rec-hint");

let items = [];
let active = "all";
let view = "timeline"; // timeline | summary

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

function stamp(r) {
  return (r.date || "") + (r.time ? " " + r.time : "");
}

function timeline(rows) {
  list.innerHTML = "";
  if (!rows.length) {
    list.appendChild(el("li", "loading", "这一类还没有记录。"));
    return;
  }
  const byDate = new Map();
  rows.slice().sort((a, b) => (b.date || "").localeCompare(a.date || "")).forEach((r) => {
    const d = r.date || "未记日期";
    if (!byDate.has(d)) byDate.set(d, []);
    byDate.get(d).push(r);
  });
  for (const [d, group] of byDate) {
    const head = el("li", "day", d);
    list.appendChild(head);
    group.forEach((r) => {
      const li = el("li", "rec-card");
      const h = el("div", "rec-head");
      h.appendChild(el("span", "chip " + r.cat, (CATS[r.cat] || {}).name || r.cat));
      if (r.time) h.appendChild(el("span", "rec-date", r.time));
      if (r.rating) h.appendChild(el("span", "rec-rating", "★".repeat(Math.max(0, Math.min(5, Math.round(r.rating / 2))))));
      li.appendChild(h);
      li.appendChild(el("h3", "rec-title", r.title || "（没写标题）"));
      if (r.note) li.appendChild(el("p", "rec-note", r.note));
      if (r.why) li.appendChild(el("p", "rec-why", "为什么记： " + r.why));
      if (r.status) li.appendChild(el("span", "rec-status", r.status));
      list.appendChild(li);
    });
  }
}

function summary(rows) {
  list.innerHTML = "";
  if (!rows.length) {
    list.appendChild(el("li", "loading", "这一类还没有记录。"));
    return;
  }
  const map = new Map();
  rows.forEach((r) => {
    const key = (r.title || "").trim() || "(没写标题)";
    if (!map.has(key)) map.set(key, { title: key, cat: r.cat, count: 0, first: r.date || "", last: r.date || "", status: r.status || "", rating: r.rating || "" });
    const g = map.get(key);
    g.count += 1;
    if (r.date && (!g.first || r.date < g.first)) g.first = r.date;
    if (r.date && (!g.last || r.date > g.last)) g.last = r.date;
    if (r.status) g.status = r.status;
    if (r.rating) g.rating = r.rating;
  });
  const groups = [...map.values()].sort((a, b) => (b.last || "").localeCompare(a.last || ""));
  groups.forEach((g) => {
    const li = el("li", "rec-card sum");
    const h = el("div", "rec-head");
    h.appendChild(el("span", "chip " + g.cat, (CATS[g.cat] || {}).name || g.cat));
    if (g.last) h.appendChild(el("span", "rec-date", g.last));
    if (g.rating) h.appendChild(el("span", "rec-rating", "★".repeat(Math.max(0, Math.min(5, Math.round(g.rating / 2))))));
    li.appendChild(h);
    li.appendChild(el("h3", "rec-title", g.title));
    li.appendChild(el("p", "rec-note", g.count > 1 ? `记了 ${g.count} 次，${g.first} 到 ${g.last}` : `${g.first}`));
    if (g.status) li.appendChild(el("span", "rec-status", g.status));
    list.appendChild(li);
  });
}

function draw() {
  const rows = active === "all" ? items : items.filter((x) => x.cat === active);
  if (view === "timeline") timeline(rows); else summary(rows);
  if (hint) hint.textContent = view === "timeline" ? "按日期排，看到每一天做了什么。" : "按条目合并，看总共做过什么。";
  document.querySelectorAll(".view-btn").forEach((b) => b.classList.toggle("on", b.dataset.view === view));
}

(async () => {
  try {
    const res = await fetch("data/records.json", { cache: "no-store" });
    const data = await res.json();
    items = data.items || [];
  } catch (e) {
    list.innerHTML = "";
    list.appendChild(el("li", "loading", "还没连上记录，等一下。"));
    return;
  }

  // 视图切换
  const views = el("div", "view-row");
  [["timeline", "时间线"], ["summary", "汇总"]].forEach(([k, name]) => {
    const b = el("button", "view-btn" + (k === view ? " on" : ""), name);
    b.dataset.view = k;
    b.addEventListener("click", () => { view = k; draw(); });
    views.appendChild(b);
  });
  row.parentNode.insertBefore(views, row);

  const counts = { all: items.length };
  items.forEach((x) => (counts[x.cat] = (counts[x.cat] || 0) + 1));

  Object.keys(CATS).forEach((k) => {
    const n = counts[k] || 0;
    if (k !== "all" && n === 0) return;
    const b = el("button", "cat-bubble", null);
    b.dataset.cat = k;
    b.innerHTML = `<span class="cat-name">${CATS[k].name}</span><span class="cat-n">${n}</span>`;
    b.addEventListener("click", () => {
      active = k;
      [...row.children].forEach((c) => c.classList.toggle("on", c.dataset.cat === k));
      draw();
    });
    row.appendChild(b);
  });
  [...row.children].forEach((c) => c.classList.toggle("on", c.dataset.cat === "all"));
  draw();
})();

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
let view = "timeline";

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

function card(r) {
  const a = el("a", "poster");
  a.href = "javascript:void(0)";
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
  a.appendChild(el("p", "poster-sub", r.cat && CATS[r.cat] ? CATS[r.cat].name : ""));
  return a;
}

function grid(rows) {
  const g = el("div", "rec-grid");
  rows.forEach((r) => g.appendChild(card(r)));
  return g;
}

function timeline(rows) {
  list.innerHTML = "";
  if (!rows.length) { list.appendChild(el("li", "loading", "这一类还没有记录。")); return; }
  const byDate = new Map();
  rows.slice()
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
    .forEach((r) => {
      const d = r.date || "未记日期";
      if (!byDate.has(d)) byDate.set(d, []);
      byDate.get(d).push(r);
    });
  for (const [d, group] of byDate) {
    const head = el("li", "day", d);
    list.appendChild(head);
    const li = el("li", "grid-row");
    li.appendChild(grid(group));
    list.appendChild(li);
  }
}

function summary(rows) {
  list.innerHTML = "";
  if (!rows.length) { list.appendChild(el("li", "loading", "这一类还没有记录。")); return; }
  const map = new Map();
  rows.forEach((r) => {
    const key = (r.title || "").trim() || "(没写标题)";
    if (!map.has(key)) map.set(key, { ...r, count: 0, last: r.date || "" });
    const g = map.get(key);
    g.count += 1;
    if (r.date && r.date > g.last) g.last = r.date;
    if (r.status) g.status = r.status;
    if (r.rating) g.rating = r.rating;
    if (!g.cover && r.cover) g.cover = r.cover;
  });
  const groups = [...map.values()].sort((a, b) => (b.last || "").localeCompare(a.last || ""));
  const li = el("li", "grid-row");
  li.appendChild(grid(groups));
  list.appendChild(li);
}

function draw() {
  const rows = active === "all" ? items : items.filter((x) => x.cat === active);
  if (view === "timeline") timeline(rows); else summary(rows);
  if (hint) hint.textContent = view === "timeline" ? "按日期排，看到每天做了什么。" : "按条目合并，看总共做过什么。";
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

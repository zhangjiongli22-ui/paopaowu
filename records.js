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

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

let items = [];
let active = "all";

function draw() {
  list.innerHTML = "";
  const rows = active === "all" ? items : items.filter((x) => x.cat === active);
  if (!rows.length) {
    list.appendChild(el("li", "loading", "这一类还没有记录。"));
    return;
  }
  rows.slice().reverse().forEach((r) => {
    const li = el("li", "rec-card");
    const head = el("div", "rec-head");
    head.appendChild(el("span", "chip " + r.cat, (CATS[r.cat] || {}).name || r.cat));
    if (r.date) head.appendChild(el("span", "rec-date", r.date));
    if (r.rating) head.appendChild(el("span", "rec-rating", "★".repeat(Math.max(0, Math.min(5, Math.round(r.rating / 2))))));
    li.appendChild(head);
    li.appendChild(el("h3", "rec-title", r.title || "（没写标题）"));
    if (r.note) li.appendChild(el("p", "rec-note", r.note));
    if (r.why) li.appendChild(el("p", "rec-why", "为什么记： " + r.why));
    if (r.status) li.appendChild(el("span", "rec-status", r.status));
    list.appendChild(li);
  });
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
      if (hint) hint.textContent = k === "all" ? "" : "";
      draw();
    });
    row.appendChild(b);
  });
  [...row.children].forEach((c) => c.classList.toggle("on", c.dataset.cat === "all"));
  draw();
})();

const CATS = { idea: "巧思", movie: "影视", game: "游戏", book: "读书", fitness: "健身", plan: "计划" };

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

(async () => {
  const root = document.getElementById("tl");
  let items = [];
  try {
    const res = await fetch("data/records.json", { cache: "no-store" });
    items = (await res.json()).items || [];
  } catch (e) {
    root.appendChild(el("p", "loading-bar", "还没连上记录。"));
    return;
  }
  if (!items.length) {
    root.appendChild(el("p", "loading-bar", "还没有记录。"));
    return;
  }

  const byDate = new Map();
  items
    .slice()
    .sort((a, b) => ((b.date || "") + (b.time || "")).localeCompare((a.date || "") + (a.time || "")))
    .forEach((r) => {
      const d = r.date || "未记日期";
      if (!byDate.has(d)) byDate.set(d, []);
      byDate.get(d).push(r);
    });

  for (const [d, rows] of byDate) {
    root.appendChild(el("h2", "tl-date", d));
    const wrap = el("div", "tl-rows");
    rows.forEach((r) => {
      const a = el("a", "tl-row");
      a.href = "record.html?id=" + encodeURIComponent(r.id);
      const thumb = el("div", "tl-thumb");
      if (r.cover) {
        const img = el("img");
        img.src = r.cover;
        img.loading = "lazy";
        img.alt = "";
        thumb.appendChild(img);
      } else {
        thumb.appendChild(el("span", "poster-fallback", (r.title || "?")[0]));
      }
      a.appendChild(thumb);
      const body = el("div", "tl-body");
      const head = el("div", "tl-head");
      head.appendChild(el("span", "chip " + r.cat, CATS[r.cat] || r.cat));
      if (r.time) head.appendChild(el("span", "tl-time", r.time));
      if (r.rating) head.appendChild(el("span", "poster-rating", "★".repeat(Math.max(0, Math.min(5, Math.round(r.rating / 2))))));
      body.appendChild(head);
      body.appendChild(el("p", "tl-title", r.title || "（没写标题）"));
      if (r.note) body.appendChild(el("p", "tl-note", r.note));
      a.appendChild(body);
      wrap.appendChild(a);
    });
    root.appendChild(wrap);
  }
})();

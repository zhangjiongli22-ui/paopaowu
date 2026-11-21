const CATS = { anime: "动画", tv: "剧集", film: "电影", game: "游戏", book: "读书", idea: "巧思" };

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

function card(r) {
  const a = el("a", "poster");
  a.href = "record.html?id=" + encodeURIComponent(r.id);
  const box = el("div", "poster-box");
  if (r.cover) {
    const img = el("img");
    img.src = r.cover;
    img.loading = "lazy";
    img.alt = "";
    img.onerror = () => { img.remove(); box.appendChild(el("div", "poster-fallback", (r.title || "?")[0])); };
    box.appendChild(img);
  } else {
    box.appendChild(el("div", "poster-fallback", (r.title || "?")[0]));
  }
  if (r.rating) box.appendChild(el("span", "poster-rating", "★".repeat(Math.max(0, Math.min(5, Math.round(r.rating / 2))))));
  a.appendChild(box);
  a.appendChild(el("p", "poster-title", r.title || ""));
  a.appendChild(el("p", "poster-sub", ((r.play_since || r.date || "").slice(5) + " " + (r.time || "")).trim()));
  return a;
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

  const rows = items
    .filter((x) => x.cat !== "log" && (x.play_since || x.date))
    .sort((a, b) => ((b.play_since || b.date || "") + (b.time || "")).localeCompare((a.play_since || a.date || "") + (a.time || "")));

  const byMonth = new Map();
  rows.forEach((r) => {
    const d = r.play_since || r.date;
    const m = String(d).slice(0, 7);
    if (!byMonth.has(m)) byMonth.set(m, []);
    byMonth.get(m).push(r);
  });

  for (const [m, list] of byMonth) {
    root.appendChild(el("h2", "sec-title date", m.slice(0, 4) + " 年 " + Number(m.slice(5)) + " 月"));
    const g = el("div", "rec-grid");
    list.forEach((r) => g.appendChild(card(r)));
    root.appendChild(g);
  }
})();

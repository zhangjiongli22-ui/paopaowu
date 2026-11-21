const CATS = { anime: "动画", tv: "剧集", film: "电影", game: "游戏", book: "读书", log: "日志", idea: "巧思" };
const KINDS = { fitness: "健身", game: "游戏", piano: "钢琴", study: "学习", media: "影视", work: "工作" };

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

(async () => {
  const root = document.getElementById("tl");
  const filterRow = document.getElementById("tl-filter");
  let items = [];
  try {
    const res = await fetch("data/records.json", { cache: "no-store" });
    items = (await res.json()).items || [];
  } catch (e) {
    root.appendChild(el("p", "loading-bar", "还没连上记录。"));
    return;
  }

  // 统一成「时间线事件」
  const events = [];
  items.forEach((it) => {
    if (it.cat === "log") {
      events.push({ date: it.date, time: it.time, cat: "log", kind: it.kind, title: (KINDS[it.kind] || "") + " · " + (it.text || ""), link: null });
    } else if (it.cat === "idea") {
      events.push({ date: it.date, time: it.time, cat: "idea", status: it.status, title: it.title, link: null });
    } else {
      events.push({ date: it.play_since || it.date, time: it.time, cat: it.cat, title: it.title, link: "record.html?id=" + encodeURIComponent(it.id) });
    }
  });

  const filters = ["all", "game", "anime", "tv", "film", "log", "idea"];
  let active = "all";
  const draw = () => {
    root.innerHTML = "";
    const rows = events
      .filter((e) => e.date)
      .filter((e) => active === "all" || e.cat === active)
      .sort((a, b) => ((b.date || "") + (b.time || "")).localeCompare((a.date || "") + (a.time || "")));

    let lastMonth = "";
    let line = el("div", "tl-wrap");
    rows.forEach((e) => {
      const month = String(e.date).slice(0, 7);
      if (month !== lastMonth) {
        lastMonth = month;
        line.appendChild(el("h2", "tl-month", month.replace("-", " 年 ") + " 月"));
      }
      const row = el(e.link ? "a" : "div", "tl-event");
      if (e.link) row.href = e.link;
      row.innerHTML = `<span class="tl-dot"></span>
        <span class="tl-day">${String(e.date).slice(5)}</span>
        <span class="tl-tag t-${e.cat}">${CATS[e.cat] || e.cat}</span>
        <span class="tl-title">${e.title || ""}</span>
        <span class="tl-time">${e.time || ""}</span>`;
      line.appendChild(row);
    });
    root.appendChild(line);
    [...filterRow.children].forEach((b) => b.classList.toggle("on", b.dataset.k === active));
  };

  filters.forEach((k) => {
    const n = k === "all" ? events.length : events.filter((e) => e.cat === k).length;
    if (k !== "all" && !n) return;
    const b = el("button", "cat-bubble", null);
    b.dataset.k = k;
    b.innerHTML = `<span class="cat-name">${k === "all" ? "全部" : CATS[k]}</span><span class="cat-n">${n}</span>`;
    b.addEventListener("click", () => { active = k; draw(); });
    filterRow.appendChild(b);
  });
  draw();
})();

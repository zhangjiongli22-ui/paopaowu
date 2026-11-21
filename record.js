const CATS = { idea: "巧思", movie: "影视", game: "游戏", book: "读书", fitness: "健身" };

function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

function stars(n) {
  const v = Math.max(0, Math.min(5, Math.round((n || 0) / 2)));
  return "★".repeat(v) + "☆".repeat(5 - v);
}

function metaRow(k, v) {
  if (!v) return "";
  return `<div class="meta-row"><span class="meta-k">${esc(k)}</span><span class="meta-v">${esc(v)}</span></div>`;
}

(async () => {
  const root = document.getElementById("detail");
  const id = new URLSearchParams(location.search).get("id");
  let item = null;
  try {
    const res = await fetch("data/records.json", { cache: "no-store" });
    const data = await res.json();
    item = (data.items || []).find((x) => String(x.id) === String(id));
  } catch (e) {}

  if (!item) {
    root.innerHTML = '<p class="loading-bar">没找到这条记录，<a href="records.html">回去吧</a>。</p>';
    return;
  }

  document.title = (item.title || "记录") + " · 大肥鱼的泡泡屋";
  const shots = (item.shots || []).map((u) => `<figure class="shot"><img src="${esc(u)}" alt="" loading="lazy"></figure>`).join("");

  root.innerHTML = `
    <div class="subject-grid">
      <aside class="subject-side">
        <div class="subject-cover">
          ${item.cover ? `<img src="${esc(item.cover)}" alt="">` : `<div class="poster-fallback">${esc((item.title || "?")[0])}</div>`}
        </div>
        <div class="subject-meta">
          <div class="meta-row"><span class="meta-k">分类</span><span class="meta-v">${esc(CATS[item.cat] || item.cat || "")}</span></div>
          ${metaRow("中文名", item.name_cn)}
          ${metaRow("话数", item.eps)}
          ${metaRow("开始", item.air)}
          ${metaRow("导演/开发", item.director)}
          ${metaRow("制作", item.staff)}
          ${metaRow("Bangumi 评分", item.bgm_rating)}
        </div>
      </aside>
      <section class="subject-main">
        <h1 class="subject-title">${esc(item.title)}</h1>
        <div class="kira-score">
          <span class="score-label">Kira 评分</span>
          <span class="score-stars">${item.rating ? stars(item.rating) : "还没评分"}</span>
          ${item.rating ? `<span class="score-num">${esc(item.rating)}/10</span>` : ""}
          ${item.status ? `<span class="rec-status">${esc(item.status)}</span>` : ""}
        </div>
        ${item.desc ? `<div class="subject-desc">${esc(item.desc).replace(/\n/g, "<br>")}</div>` : ""}
        ${item.note ? `<p class="subject-note">${esc(item.note)}</p>` : ""}
        ${item.why ? `<p class="subject-why">为什么记：${esc(item.why)}</p>` : ""}
        <h2 class="shots-head">截图</h2>
        ${shots ? `<div class="shots">${shots}</div>` : `<p class="detail-empty">还没有截图。</p>`}
      </section>
    </div>
  `;
})();

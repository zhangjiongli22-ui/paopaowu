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
          ${metaRow(item.cat === "game" ? "发售" : "开始", item.air)}
          ${metaRow("开始玩", item.play_since)}
          ${metaRow("导演/开发", item.director)}
          ${metaRow("制作", item.staff)}
          ${metaRow("Bangumi 评分", item.bgm_rating)}
        </div>
        ${item.desc ? `<div class="subject-desc">${esc(item.desc).replace(/\n/g, "<br>")}</div>` : ""}
      </aside>
      <section class="subject-main">
        <h1 class="subject-title">${esc(item.title)}</h1>
        <div class="kira-score">
          <span class="score-label">Kira 评分</span>
          <span class="score-stars" id="score-stars">${item.rating ? stars(item.rating) : "还没评分"}</span>
          <span class="score-num" id="score-num">${item.rating ? esc(item.rating) + "/10" : ""}</span>
          ${item.status ? `<span class="rec-status">${esc(item.status)}</span>` : ""}
        </div>
        <div class="rate-box">
          <div class="rate-stars" id="rate-stars">${[1,2,3,4,5,6,7,8,9,10].map((n) => `<button type="button" data-v="${n}">★</button>`).join("")}</div>
          <textarea id="rate-note" class="rate-note" placeholder="写点评价…">${esc(item.note || "")}</textarea>
          <div class="rate-actions">
            <button type="button" id="rate-save" class="lb-btn">保存</button>
            <span id="rate-msg" class="rate-msg"></span>
            <a href="#" id="set-token" class="rate-token">设置保存权限</a>
          </div>
        </div>
        <h2 class="shots-head">截图</h2>
        ${shots ? `<div class="shots">${shots}</div>` : `<p class="detail-empty">还没有截图。</p>`}
        <h2 class="shots-head">游玩录屏</h2>
        ${(item.videos && item.videos.length)
          ? `<div class="video-list">${item.videos.slice().sort((a, b) => String(a.label || "").localeCompare(String(b.label || ""))).map((v) => `<figure class="video-item"><figcaption>${esc(v.label || "")}</figcaption><video src="${esc(v.src)}" controls preload="metadata"></video></figure>`).join("")}</div>`
          : (item.video ? `<div class="video-wrap"><video src="${esc(item.video)}" controls preload="metadata"></video></div>` : `<p class="detail-empty">还没有录屏。</p>`)}
      </section>
    </div>
  `;
  bindShots();
  // single-play: 同一时间只播一个视频
  const vids = [...document.querySelectorAll(".video-list video, .video-wrap video")];
  vids.forEach((v) => {
    v.setAttribute("playsinline", "");
    v.addEventListener("play", () => {
      vids.forEach((o) => { if (o !== v && !o.paused) o.pause(); });
    });
  });
  // 截图太多时折叠
  const shotBox = document.querySelector(".shots");
  if (shotBox && shotBox.children.length > 12) {
    const items = [...shotBox.children];
    let expanded = false;
    const apply = () => {
      items.forEach((el, i) => el.classList.toggle("shot-hidden", !expanded && i >= 12));
    };
    apply();
    const btn = document.createElement("button");
    btn.className = "shots-more";
    const label = () => (expanded ? "收起" : "显示全部（" + items.length + " 张）");
    btn.textContent = label();
    btn.addEventListener("click", () => {
      expanded = !expanded;
      apply();
      btn.textContent = label();
    });
    shotBox.after(btn);
  }


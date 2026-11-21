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
          <span class="score-stars" id="score-stars">${item.rating ? stars(item.rating) : "还没评分"}</span>
          <span class="score-num" id="score-num">${item.rating ? esc(item.rating) + "/10" : ""}</span>
          ${item.status ? `<span class="rec-status">${esc(item.status)}</span>` : ""}
        </div>
        <div class="rate-box">
          <div class="rate-stars" id="rate-stars">${[1,2,3,4,5,6,7,8,9,10].map((n) => `<button type="button" data-v="${n}">★</button>`).join("")}</div>
          <textarea id="rate-note" class="rate-note" placeholder="写点感想…">${esc(item.note || "")}</textarea>
          <div class="rate-actions">
            <button type="button" id="rate-save" class="lb-btn">保存</button>
            <span id="rate-msg" class="rate-msg"></span>
            <a href="#" id="set-token" class="rate-token">设置保存权限</a>
          </div>
        </div>
        ${item.desc ? `<div class="subject-desc">${esc(item.desc).replace(/\n/g, "<br>")}</div>` : ""}
        ${item.note ? `<p class="subject-note">${esc(item.note)}</p>` : ""}
        ${item.why ? `<p class="subject-why">为什么记：${esc(item.why)}</p>` : ""}
        ${item.video ? `<h2 class="shots-head">片段</h2><div class="shots"><video src="${esc(item.video)}" controls preload="metadata"></video></div>` : ""}
        <h2 class="shots-head">截图</h2>
        ${shots ? `<div class="shots">${shots}</div>` : `<p class="detail-empty">还没有截图。</p>`}
      </section>
    </div>
  `;
  bindShots();
})();


// ---- 评分 & 保存 ----
(() => {
  const starsBox = document.getElementById("rate-stars");
  const note = document.getElementById("rate-note");
  const save = document.getElementById("rate-save");
  const msg = document.getElementById("rate-msg");
  const tokenLink = document.getElementById("set-token");
  if (!starsBox) return;

  let value = 0;
  const id = new URLSearchParams(location.search).get("id");
  const KEY = "paopaowu_token";
  const API = "https://api.github.com/repos/zhangjiongli22-ui/paopaowu/contents/data/records.json";

  starsBox.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-v]");
    if (!b) return;
    value = Number(b.dataset.v);
    [...starsBox.children].forEach((x) => x.classList.toggle("on", Number(x.dataset.v) <= value));
    msg.textContent = value + "/10";
  });

  tokenLink.addEventListener("click", (e) => {
    e.preventDefault();
    const t = prompt("粘贴 GitHub token（只存在这台设备的浏览器里）");
    if (t) { localStorage.setItem(KEY, t.trim()); msg.textContent = "token 已保存"; }
  });

  save.addEventListener("click", async () => {
    const token = localStorage.getItem(KEY);
    if (!token) { msg.textContent = "先设置保存权限（右上角链接）"; return; }
    if (!value && !note.value.trim()) { msg.textContent = "先打个分或写点感想"; return; }
    msg.textContent = "保存中…";
    try {
      const get = await fetch(API + "?ref=main&t=" + Date.now(), {
        headers: { Authorization: "token " + token, Accept: "application/vnd.github+json" },
      });
      if (!get.ok) throw new Error("读不到数据 " + get.status);
      const file = await get.json();
      const json = JSON.parse(decodeURIComponent(escape(atob(file.content.replace(/\n/g, "")))));
      const item = (json.items || []).find((x) => String(x.id) === String(id));
      if (!item) throw new Error("找不到这条记录");
      if (value) item.rating = value;
      item.note = note.value.trim();
      item.updated = new Date().toISOString().slice(0, 10);
      const content = btoa(unescape(encodeURIComponent(JSON.stringify(json, null, 1))));
      const put = await fetch(API, {
        method: "PUT",
        headers: { Authorization: "token " + token, Accept: "application/vnd.github+json", "Content-Type": "application/json" },
        body: JSON.stringify({ message: "rate: " + (item.title || id), content, sha: file.sha, branch: "main" }),
      });
      if (!put.ok) throw new Error("写入失败 " + put.status);
      msg.textContent = "保存好了，一分钟左右刷新可见";
      document.getElementById("score-num").textContent = value ? value + "/10" : "";
      document.getElementById("score-stars").textContent = value >= 9 ? "★★★★★" : value >= 7 ? "★★★★☆" : value >= 5 ? "★★★☆☆" : value >= 3 ? "★★☆☆☆" : value ? "★☆☆☆☆" : "还没评分";
    } catch (err) {
      msg.textContent = "没保存成功：" + err.message;
    }
  });
})();


// 截图点开大图
function bindShots() {
  const shots = document.querySelector(".shots");
  if (!shots) return;
  let box = document.querySelector(".lightbox.shotbox");
  if (!box) {
    box = document.createElement("div");
    box.className = "lightbox shotbox";
    box.hidden = true;
    box.innerHTML = '<img alt=""><div class="lb-bar"><a class="lb-btn" download>下载原图</a><button class="lb-btn lb-close" type="button">关闭</button></div>';
    document.body.appendChild(box);
    box.querySelector(".lb-close").addEventListener("click", () => { box.hidden = true; });
    box.addEventListener("click", (e) => { if (e.target === box) box.hidden = true; });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") box.hidden = true; });
  }
  const big = box.querySelector("img");
  const dl = box.querySelector("a");
  shots.querySelectorAll("img").forEach((img) => {
    img.addEventListener("click", () => {
      big.src = img.src;
      dl.href = img.src;
      dl.setAttribute("download", img.src.split("/").pop() || "shot.jpg");
      box.hidden = false;
    });
  });
}

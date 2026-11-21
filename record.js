const CATS = { idea: "巧思", anime: "动画", tv: "剧集", film: "电影", game: "游戏", book: "读书", fitness: "健身", plan: "计划" };

function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

function stars(n) {
  const v = Math.max(0, Math.min(5, Math.round((n || 0) / 2)));
  return "★".repeat(v) + "☆".repeat(5 - v);
}

function five(n) {
  return (Math.round((n || 0) / 2 * 10) / 10).toString();
}

function metaRow(k, v) {
  if (!v) return "";
  return `<div class="meta-row"><span class="meta-k">${esc(k)}</span><span class="meta-v">${esc(v)}</span></div>`;
}

function bindShots() {
  const shots = document.querySelector(".shots");
  if (!shots) return;
  const imgs = [...shots.querySelectorAll("img")];
  if (!imgs.length) return;

  let box = document.querySelector(".lightbox.shotbox");
  if (!box) {
    box = document.createElement("div");
    box.className = "lightbox shotbox";
    box.hidden = true;
    box.innerHTML = '<div class="lb-zone left"></div><div class="lb-zone right"></div><button class="lb-nav prev" type="button">‹</button><img alt=""><button class="lb-nav next" type="button">›</button><button class="lb-close" type="button">关闭</button><a class="lb-dl" download>下载原图</a>';
    document.body.appendChild(box);
    box.addEventListener("click", (e) => { if (e.target === box) { box.hidden = true; document.body.classList.remove("lb-open"); } });
    document.addEventListener("keydown", (e) => {
      if (box.hidden) return;
      if (e.key === "Escape") { box.hidden = true; document.body.classList.remove("lb-open"); }
      if (e.key === "ArrowLeft") box.querySelector(".lb-nav.prev").click();
      if (e.key === "ArrowRight") box.querySelector(".lb-nav.next").click();
    });
    box.querySelector(".lb-close").addEventListener("click", () => { box.hidden = true; document.body.classList.remove("lb-open"); });
  }

  const big = box.querySelector("img");
  const dl = box.querySelector("a");
  let idx = 0;
  const show = (i) => {
    idx = (i + imgs.length) % imgs.length;
    const src = imgs[idx].src;
    big.src = src;
    dl.href = src;
    dl.setAttribute("download", src.split("/").pop() || "shot.jpg");
  };
  const openAt = (i) => {
    show(i);
    box.hidden = false;
    document.body.classList.add("lb-open");
  };

  box.querySelector(".lb-nav.prev").onclick = (e) => { e.stopPropagation(); show(idx - 1); };
  box.querySelector(".lb-nav.next").onclick = (e) => { e.stopPropagation(); show(idx + 1); };
  const zL = box.querySelector(".lb-zone.left");
  const zR = box.querySelector(".lb-zone.right");
  if (zL) zL.onclick = (e) => { e.stopPropagation(); show(idx - 1); };
  if (zR) zR.onclick = (e) => { e.stopPropagation(); show(idx + 1); };

  imgs.forEach((img, i) => img.addEventListener("click", () => openAt(i)));

  let lastWheel = 0;
  window.addEventListener("wheel", (e) => {
    if (box.hidden) return;
    e.preventDefault();
    const now = Date.now();
    if (now - lastWheel < 260 || Math.abs(e.deltaY) < 6) return;
    lastWheel = now;
    show(idx + (e.deltaY > 0 ? 1 : -1));
  }, { passive: false });

  let sx = 0;
  box.addEventListener("touchstart", (e) => { sx = e.touches[0].clientX; }, { passive: true });
  box.addEventListener("touchend", (e) => {
    const dx = e.changedTouches[0].clientX - sx;
    if (Math.abs(dx) > 60) show(idx + (dx < 0 ? 1 : -1));
  }, { passive: true });
}

(async () => {
  const root = document.getElementById("detail");
  const id = new URLSearchParams(location.search).get("id");
  let item = null;
  try {
    const res = await fetch("data/records.json", { cache: "no-store" });
    item = ((await res.json()).items || []).find((x) => String(x.id) === String(id));
  } catch (e) {}
  if (!item) {
    root.innerHTML = '<p class="loading-bar">没找到这条记录，<a href="records.html">回去吧</a>。</p>';
    return;
  }

  document.title = (item.title || "记录") + " · 大肥鱼的泡泡屋";
  const hasReview = !!(item.rating || (item.note || "").trim());
  const shots = (item.shots || []).map((u) => `<figure class="shot"><img src="${esc(u)}" alt="" loading="lazy"></figure>`).join("");

  root.innerHTML = `
    <div class="subject-grid">
      <aside class="subject-side">
        <div class="subject-cover">
          ${item.cover ? `<img src="${esc(item.cover)}" alt="">` : `<div class="poster-fallback">${esc((item.title || "?")[0])}</div>`}
        </div>
        <div class="subject-meta">
          <div class="meta-row"><span class="meta-k">分类</span><span class="meta-v">${esc(CATS[item.cat] || item.cat || "")}</span></div>
          ${metaRow(item.cat === "game" ? "发售" : "开始", item.air)}
          ${metaRow("开始玩", item.play_since)}
          ${metaRow("中文名", item.name_cn)}
          ${metaRow("话数", item.eps)}
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
          <span class="score-num" id="score-num">${item.rating ? esc(five(item.rating)) + "/5" : ""}</span>
          ${item.status ? `<span class="rec-status">${esc(item.status)}</span>` : ""}
        </div>
        <div class="rate-box${hasReview ? " reviewed" : ""}">
          <div class="review-view"${hasReview ? "" : " hidden"}>
            ${item.note ? `<blockquote class="review-quote">${esc(item.note)}</blockquote>` : '<p class="review-empty">只打了分，还没写评价。</p>'}
            <div class="review-foot">
              <span class="review-when">${item.rated_on ? esc(item.rated_on) + " 评价" : ""}</span>
              <button type="button" class="review-edit" id="review-edit">修改评价</button>
            </div>
          </div>
          <div class="review-form"${hasReview ? " hidden" : ""}>
            <div class="rate-stars" id="rate-stars">${[1,2,3,4,5].map((n) => `<button type="button" data-v="${n * 2}">★</button>`).join("")}</div>
            <textarea id="rate-note" class="rate-note" placeholder="写点评价…">${esc(item.note || "")}</textarea>
            <div class="rate-time">
              <span class="rate-time-label">${item.cat === "game" ? "游玩时间" : "观看时间"}</span>
              <input type="date" id="rate-date" value="${["想看","待看","想玩","想读"].includes(item.status) ? "" : esc(item.rated_on || item.date || "")}">
              <input type="time" id="rate-time" value="${esc(item.time || "")}">
            </div>
            <div class="rate-actions">
              <button type="button" id="rate-save" class="lb-btn">保存</button>
              <span id="rate-msg" class="rate-msg"></span>
            </div>
          </div>
        </div>
        <h2 class="shots-head">截图</h2>
        ${shots ? `<div class="shots">${shots}</div>` : `<p class="detail-empty">还没有截图。</p>`}
      </section>
    </div>
  `;

  bindShots();

  const isAdmin = !!localStorage.getItem("paopaowu_admin");
  const rateBox = document.querySelector(".rate-box");
  const scoreBox = document.querySelector(".kira-score");
  if (rateBox && !isAdmin) {
    const form = rateBox.querySelector(".review-form");
    if (form) form.hidden = true;
    const edit = rateBox.querySelector("#review-edit");
    if (edit) edit.hidden = true;
    const tip = document.createElement("p");
    tip.className = "rate-locked";
    tip.innerHTML = '登录后才能改评分和评价 · <a href="login.html">去登录</a>';
    rateBox.after(tip);
  }
  if (scoreBox) scoreBox.hidden = false;

  // 截图折叠
  const shotBox = document.querySelector(".shots");
  if (shotBox && shotBox.children.length > 12) {
    const items = [...shotBox.children];
    let expanded = false;
    const apply = () => items.forEach((el, i) => el.classList.toggle("shot-hidden", !expanded && i >= 12));
    apply();
    const btn = document.createElement("button");
    btn.className = "shots-more";
    const label = () => (expanded ? "收起" : "显示全部（" + items.length + " 张）");
    btn.textContent = label();
    btn.addEventListener("click", () => { expanded = !expanded; apply(); btn.textContent = label(); });
    shotBox.after(btn);
  }

  // 评分保存
  const editBtn = document.getElementById("review-edit");
  if (editBtn) {
    editBtn.addEventListener("click", () => {
      const view = document.querySelector(".review-view");
      const form = document.querySelector(".review-form");
      if (view) view.hidden = true;
      if (form) form.hidden = false;
    });
  }
  const starsBox = document.getElementById("rate-stars");
  const note = document.getElementById("rate-note");
  const dateInput = document.getElementById("rate-date");
  const timeInput = document.getElementById("rate-time");
  const save = document.getElementById("rate-save");
  const msg = document.getElementById("rate-msg");
  const API = "https://api.github.com/repos/zhangjiongli22-ui/paopaowu/contents/data/records.json";
  let value = 0;

  starsBox.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-v]");
    if (!b) return;
    value = Number(b.dataset.v);
    [...starsBox.children].forEach((x) => x.classList.toggle("on", Number(x.dataset.v) <= value));
    msg.textContent = value / 2 + "/5";
  });

  const BLOB = "CgEbKgF3f2EiMw4BZF4OVT8ZLEZlW2lKGAApRkUMQA8UAFk7U0p8DA==";
  const PASS = "miku1998";

  function unlock() {
    try {
      const raw = atob(BLOB);
      let out = "";
      for (let i = 0; i < raw.length; i++) {
        out += String.fromCharCode(raw.charCodeAt(i) ^ PASS.charCodeAt(i % PASS.length));
      }
      return out;
    } catch (e) {
      return null;
    }
  }

  let token = sessionStorage.getItem("paopaowu_sess");

  function ensureToken() {
    if (token) return true;
    token = unlock();
    if (!token) return false;
    sessionStorage.setItem("paopaowu_sess", token);
    return true;
  }

  save.addEventListener("click", async () => {
    if (!ensureToken()) { msg.textContent = "打不开保存权限，稍后再试"; return; }
    msg.textContent = "保存中…";
    try {
      const get = await fetch(API + "?ref=main&t=" + Date.now(), {
        headers: { Authorization: "token " + token, Accept: "application/vnd.github+json" },
      });
      if (!get.ok) throw new Error("读不到数据 " + get.status);
      const file = await get.json();
      const json = JSON.parse(decodeURIComponent(escape(atob(file.content.replace(/\n/g, "")))));
      const it = (json.items || []).find((x) => String(x.id) === String(id));
      if (!it) throw new Error("找不到这条记录");
      if (value) it.rating = value;
      it.note = note.value.trim();
      const pad = (n) => String(n).padStart(2, "0");
      const now = new Date();
      const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
      const nowTime = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
      const ymd = dateInput && dateInput.value ? dateInput.value : today;
      const hhmm = timeInput && timeInput.value ? timeInput.value : nowTime;
      const filledDate = !!(dateInput && dateInput.value);
      const finished = value > 0 || filledDate;
      if (finished) it.status = it.cat === "game" ? "玩过" : "看过";
      if (!it.added) it.added = it.date || "";
      it.date = ymd;
      it.time = hhmm;
      if (finished) it.rated_on = ymd;
      it.updated = today;
      const content = btoa(unescape(encodeURIComponent(JSON.stringify(json, null, 1))));
      const put = await fetch(API, {
        method: "PUT",
        headers: { Authorization: "token " + token, Accept: "application/vnd.github+json", "Content-Type": "application/json" },
        body: JSON.stringify({ message: "rate: " + (it.title || id), content, sha: file.sha, branch: "main" }),
      });
      if (!put.ok) throw new Error("写入失败 " + put.status);
      const scoreStars = document.getElementById("score-stars");
      const scoreNum = document.getElementById("score-num");
      if (scoreStars) scoreStars.textContent = it.rating ? stars(it.rating) : "还没评分";
      if (scoreNum) scoreNum.textContent = it.rating ? five(it.rating) + "/5" : "";
      [...starsBox.children].forEach((x) => x.classList.toggle("on", Number(x.dataset.v) <= (it.rating || 0)));
      const statusEl = document.querySelector(".rec-status");
      if (statusEl) statusEl.textContent = it.status;
      const view = document.querySelector(".review-view");
      const form = document.querySelector(".review-form");
      if (view) {
        const q = view.querySelector(".review-quote");
        if (q) q.textContent = it.note || "";
        const when = view.querySelector(".review-when");
        if (when) when.textContent = it.rated_on ? it.rated_on + " 评价" : "";
        view.hidden = false;
      }
      if (form) form.hidden = true;
      msg.textContent = "已保存（线上同步约一分钟）";
    } catch (err) {
      msg.textContent = "没保存成功：" + err.message;
    }
  });
})();

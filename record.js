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
    const all = (await res.json()).items || [];
    item = all.find((x) => String(x.id) === String(id));
    window.__allItems = all;
  } catch (e) {}
  if (!item) {
    root.innerHTML = '<p class="loading-bar">没找到这条记录，<a href="records.html">回去吧</a>。</p>';
    return;
  }

  document.title = (item.title || "记录") + " · 大肥鱼的泡泡屋";
  const hasReview = !!(item.rating || (item.note || "").trim());
  const shots = (item.shots || []).map((u) => `<figure class="shot"><img src="${esc(u)}" alt="" loading="lazy"></figure>`).join("");

  let backHref = "records.html";
  try {
    const st = JSON.parse(sessionStorage.getItem("listState") || "{}");
    const q = new URLSearchParams();
    if (st.group) q.set("group", st.group);
    if (st.cat && st.cat !== "all") q.set("cat", st.cat);
    const savedY = st.y || sessionStorage.getItem("listScroll");
    if (savedY) q.set("y", savedY);
    if ([...q].length) backHref = "records.html?" + q.toString();
  } catch (e) {}

  root.innerHTML = `
    ${item.cover ? `<div class="rd-hero" style="--cover:url('${esc(item.cover)}')" aria-hidden="true"></div>` : ""}
    <a class="back-link" href="${backHref}">← Kira的精神宇宙</a>
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
          ${item.status ? `<button type="button" class="rec-status${["在看","在玩"].includes(item.status) ? " inprogress" : ""}" id="status-toggle" title="点一下切换">${esc(item.status)}</button>` : ""}
          <button type="button" class="rec-status" id="fav-toggle" hidden>${item.pinned ? "★ 已收藏" : "☆ 收藏"}</button>
        </div>
        <div class="rate-box${hasReview ? " reviewed" : ""}">
          <div class="review-view">
            ${item.note ? `<blockquote class="review-quote">${esc(item.note)}</blockquote>` : `<p class="review-empty">${hasReview ? "只打了分，还没写评价。" : "还没有评分与评价。"}</p>`}
            ${hasReview ? `<div class="review-foot">
              <span class="review-when">${item.rated_on ? esc(item.rated_on) + " 评价" : ""}</span>
              <span class="review-acts">
                <button type="button" class="review-edit" id="review-edit">${item.note ? "修改评价" : "修改评分"}</button>
                <button type="button" class="review-edit" id="review-clear">${item.note ? "删除评价" : "删除评分"}</button>
              </span>
            </div>` : ""}
          </div>
          <div class="review-form"${hasReview ? " hidden" : ""}>
            <div class="rate-stars" id="rate-stars">${[1,2,3,4,5].map((n) => `<button type="button" class="star-btn" data-n="${n}"><span class="half-hit l" data-v="${n * 2 - 1}"></span><span class="half-hit r" data-v="${n * 2}"></span><span class="star-glyph">★</span></button>`).join("")}</div>
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

  // 同系列其他季
  (function () {
    const all = window.__allItems || [];
    const toBase = (t) => String(t || "").replace(/\s*(第[一二三四五六七八九十0-9]+季|Season\s*\d+|第\d+季)$/i, "").trim();
    const baseName = toBase(item.title);
    const others = all.filter((x) =>
      x.id !== item.id &&
      ((item.series && x.series === item.series) || (toBase(x.title) === baseName && baseName && x.title !== baseName))
    );
    if (!others.length) return;
    const box = document.createElement("section");
    box.className = "series-box";
    box.innerHTML = '<h2 class="shots-head">同系列</h2><div class="series-list">' +
      others.map((x) => `<a class="series-link" href="record.html?id=${encodeURIComponent(x.id)}">${x.title}<span>${x.status || ""}</span></a>`).join("") + "</div>";
    const host = document.getElementById("detail");
    if (host) host.appendChild(box);
  })();

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
  const clearBtn = document.getElementById("review-clear");
  if (clearBtn) {
    clearBtn.addEventListener("click", async () => {
      if (!confirm("删掉这条评价？")) return;
      value = 0;
      note.value = "";
      document.getElementById("rate-save").click();
    });
  }
  const favBtn = document.getElementById("fav-toggle");
  if (favBtn) {
    favBtn.hidden = !isAdmin;
    favBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const next = favBtn.textContent.indexOf("已收藏") === -1;
      favBtn.textContent = next ? "★ 已收藏" : "☆ 收藏";
      msg.textContent = next ? "已加入我的最爱" : "已取消收藏";
      apiRate({ id, pinned: next })
        .then((saved) => {
          it = { ...item, ...saved };
          favBtn.textContent = saved.pinned ? "★ 已收藏" : "☆ 收藏";
        })
        .catch((err) => {
          favBtn.textContent = next ? "☆ 收藏" : "★ 已收藏";
          msg.textContent = "没保存成功：" + err.message;
        });
    });
  }
  const statusBtn = document.getElementById("status-toggle");
  if (statusBtn) {
    statusBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const cur = statusBtn.textContent.trim();
      const fmt = item.cat === "game" ? ["想玩", "在玩", "玩过"] : ["想看", "在看", "看过"];
      const i = fmt.indexOf(cur);
      const next = fmt[(i + 1) % fmt.length];
      statusBtn.textContent = next;
      statusBtn.classList.toggle("inprogress", next === fmt[1]);
      statusBtn.disabled = true;
      msg.textContent = "切换中…";
      try {
        const payload = { id, status: next };
        if (next === fmt[1]) payload.rated_on = null;
        const saved = await apiRate(payload);
        it = { ...item, ...saved };
        statusBtn.textContent = saved.status || next;
        msg.textContent = "已切换为「" + (saved.status || next) + "」";
      } catch (err) {
        msg.textContent = "切换失败：" + err.message;
      } finally {
        statusBtn.disabled = false;
      }
    });
  }

  const starsBox = document.getElementById("rate-stars");
  const save = document.getElementById("rate-save");
  const note = document.getElementById("rate-note");
  const msg = document.getElementById("rate-msg");
  const dateInput = document.getElementById("rate-date");
  const timeInput = document.getElementById("rate-time");
  let value = item.rating || 0;
  let it = { ...item };

  function paintStars() {
    [...starsBox.querySelectorAll(".star-btn")].forEach((btn) => {
      const n = Number(btn.dataset.n);
      btn.classList.toggle("on", value >= n * 2);
      btn.classList.toggle("half", value === n * 2 - 1);
    });
  }
  paintStars();

  starsBox.addEventListener("click", (e) => {
    const hit = e.target.closest("[data-v]");
    if (!hit) return;
    value = Number(hit.dataset.v);
    paintStars();
    msg.textContent = value / 2 + "/5";
  });

  const __rateQueues = new Map();
  async function apiRate(payload) {
    // 同一条目的写入按顺序排队，避免连点导致先后错乱
    const key = String(payload.id || "");
    const prev = __rateQueues.get(key) || Promise.resolve();
    const task = prev.catch(() => {}).then(() => rawRate(payload));
    __rateQueues.set(key, task);
    task.finally(() => {
      if (__rateQueues.get(key) === task) __rateQueues.delete(key);
    });
    return task;
  }

  async function rawRate(payload) {
    const res = await fetch("/api/rate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...payload, pass: "kira:miku1998:paopaowu" }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) throw new Error(data.error || "保存失败 " + res.status);
    return data.item;
  }

  save.addEventListener("click", async () => {
    msg.textContent = "保存中…";
    try {
      const noteText = note.value.trim();
      const pad = (n) => String(n).padStart(2, "0");
      const now = new Date();
      const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
      const nowTime = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
      const ymd = dateInput && dateInput.value ? dateInput.value : today;
      const hhmm = timeInput && timeInput.value ? timeInput.value : nowTime;
      const cleared = !value && !noteText;
      const filledDate = !!(dateInput && dateInput.value);
      const finished = !cleared && (value > 0 || !!noteText || filledDate);
      const payload = { id, rating: value || null, note: noteText, date: ymd, time: hhmm };
      const keepStatus = ["在玩", "在看"].includes(item.status);
      if (cleared) {
        if (!keepStatus) payload.status = item.cat === "game" ? "想玩" : "想看";
        payload.rated_on = null;
      } else if (finished) {
        if (!keepStatus) payload.status = item.cat === "game" ? "玩过" : "看过";
        payload.rated_on = ymd;
      }
      const saved = await apiRate(payload);
      it = { ...item, ...saved };
      const scoreStars = document.getElementById("score-stars");
      const scoreNum = document.getElementById("score-num");
      if (scoreStars) scoreStars.textContent = saved.rating ? stars(saved.rating) : "还没评分";
      if (scoreNum) scoreNum.textContent = saved.rating ? five(saved.rating) + "/5" : "";
      const statusEl = document.querySelector(".rec-status");
      if (statusEl) statusEl.textContent = saved.status || item.status;
      const view = document.querySelector(".review-view");
      const form = document.querySelector(".review-form");
      if (view) {
        const q = view.querySelector(".review-quote");
        if (q) q.textContent = saved.note || "";
        const when = view.querySelector(".review-when");
        if (when) when.textContent = saved.rated_on ? saved.rated_on + " 评价" : "";
      }
      const editBtn = document.getElementById("review-edit");
      const clearBtn = document.getElementById("review-clear");
      if (editBtn) editBtn.textContent = saved.note ? "修改评价" : "修改评分";
      if (clearBtn) clearBtn.textContent = saved.note ? "删除评价" : "删除评分";
      if (cleared) {
        if (view) view.hidden = true;
        if (form) form.hidden = false;
      } else if (form) {
        form.hidden = true;
        if (view) view.hidden = false;
      }
      msg.textContent = cleared ? "已删除评价" : "已保存，刷新立刻可见";
    } catch (err) {
      msg.textContent = "没保存成功：" + err.message;
    }
  });
})();

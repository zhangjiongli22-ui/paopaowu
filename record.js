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
        <div class="rate-box">
          <div class="rate-stars" id="rate-stars">${[1,2,3,4,5].map((n) => `<button type="button" data-v="${n * 2}">★</button>`).join("")}</div>
          <textarea id="rate-note" class="rate-note" placeholder="写点评价…">${esc(item.note || "")}</textarea>
          <div class="rate-time">
            <span class="rate-time-label">${item.cat === "game" ? "游玩时间" : "观看时间"}</span>
            <input type="date" id="rate-date" value="${["想看","待看","想玩","想读"].includes(item.status) ? "" : esc(item.rated_on || item.date || "")}">
            <input type="time" id="rate-time" value="${esc(item.time || "")}">
          </div>
          <div class="rate-pass-row">
            <input type="password" id="rate-pass" class="rate-pass" placeholder="保存密码（设置过一次就只输这个）" autocomplete="current-password">
          </div>
          <details class="pass-setup">
            <summary>第一次用？在这里设置</summary>
            <div class="pass-setup-body">
              <input type="password" id="setup-token" class="rate-pass" placeholder="粘贴 GitHub token">
              <input type="password" id="setup-pass" class="rate-pass" placeholder="设一个保存密码">
              <button type="button" id="setup-save" class="lb-btn">保存设置</button>
              <span id="setup-msg" class="rate-msg"></span>
            </div>
          </details>
          <div class="rate-actions">
            <button type="button" id="rate-save" class="lb-btn">保存</button>
            <span id="rate-msg" class="rate-msg"></span>
            <a href="#" id="set-token" class="rate-token">设置保存密码</a>
          </div>
        </div>
        <h2 class="shots-head">截图</h2>
        ${shots ? `<div class="shots">${shots}</div>` : `<p class="detail-empty">还没有截图。</p>`}
      </section>
    </div>
  `;

  bindShots();

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
  const starsBox = document.getElementById("rate-stars");
  const note = document.getElementById("rate-note");
  const passInput = document.getElementById("rate-pass");
  const dateInput = document.getElementById("rate-date");
  const timeInput = document.getElementById("rate-time");
  const save = document.getElementById("rate-save");
  const msg = document.getElementById("rate-msg");
  const tokenLink = document.getElementById("set-token");
  const API = "https://api.github.com/repos/zhangjiongli22-ui/paopaowu/contents/data/records.json";
  let value = 0;

  starsBox.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-v]");
    if (!b) return;
    value = Number(b.dataset.v);
    [...starsBox.children].forEach((x) => x.classList.toggle("on", Number(x.dataset.v) <= value));
    msg.textContent = value / 2 + "/5";
  });

  const KEY = "paopaowu_pass";
  const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
  const unb64 = (str) => Uint8Array.from(atob(str), (c) => c.charCodeAt(0));
  const enc = new TextEncoder();

  async function deriveKey(pass, salt) {
    const base = await crypto.subtle.importKey("raw", enc.encode(pass), "PBKDF2", false, ["deriveKey"]);
    return crypto.subtle.deriveKey(
      { name: "PBKDF2", salt, iterations: 150000, hash: "SHA-256" },
      base,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
  }

  async function savePassword(token, pass) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveKey(pass, salt);
    const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(token));
    localStorage.setItem(KEY, JSON.stringify({ salt: b64(salt), iv: b64(iv), ct: b64(ct) }));
  }

  async function tokenFromPassword(pass) {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    try {
      const { salt, iv, ct } = JSON.parse(raw);
      const key = await deriveKey(pass, unb64(salt));
      const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(iv) }, key, unb64(ct));
      return new TextDecoder().decode(pt);
    } catch (e) {
      return null;
    }
  }

  let token = sessionStorage.getItem("paopaowu_sess");

  const setupBtn = document.getElementById("setup-save");
  if (setupBtn) {
    setupBtn.addEventListener("click", async () => {
      const t = (document.getElementById("setup-token").value || "").trim();
      const p1 = (document.getElementById("setup-pass").value || "").trim();
      const box = document.getElementById("setup-msg");
      if (!t || !p1) { box.textContent = "两项都要填"; return; }
      await savePassword(t, p1);
      token = t;
      sessionStorage.setItem("paopaowu_sess", token);
      box.textContent = "设好了，以后只输密码";
    });
  }

  tokenLink.addEventListener("click", async (e) => {
    e.preventDefault();
    const t = prompt("先粘贴一次 GitHub token（只会加密存在这台设备）");
    if (!t) return;
    const p1 = prompt("给这个网站设一个保存密码，以后输它就行");
    if (!p1) return;
    await savePassword(t.trim(), p1);
    token = t.trim();
    sessionStorage.setItem("paopaowu_sess", token);
    msg.textContent = "密码设好了，以后用密码保存";
  });
  save.addEventListener("click", async () => {
    if (!token) {
      if (!localStorage.getItem(KEY)) { msg.textContent = "先点下面的「设置保存密码」"; return; }
      const pass = (passInput && passInput.value || "").trim();
      if (!pass) { msg.textContent = "先输保存密码"; passInput && passInput.focus(); return; }
      token = await tokenFromPassword(pass);
      if (!token) { msg.textContent = "密码不对"; return; }
      sessionStorage.setItem("paopaowu_sess", token);
      if (passInput) passInput.value = "";
    }
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
      msg.textContent = "保存好了，一分钟左右刷新可见";
    } catch (err) {
      msg.textContent = "没保存成功：" + err.message;
    }
  });
})();

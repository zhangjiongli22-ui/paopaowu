const lines = [
  "今天也在任务栏上发呆。",
  "饿了，想吃饭。",
  "你来了？才没有在等你。",
  "水里很安静，你的电脑有点吵。"
];

const el = document.getElementById("typing");
if (el) {
  let li = 0, ci = 0, deleting = false;
  const tick = () => {
    const text = lines[li];
    if (!deleting) {
      ci++;
      el.textContent = text.slice(0, ci);
      if (ci === text.length) { deleting = true; setTimeout(tick, 1800); return; }
      setTimeout(tick, 110);
    } else {
      ci--;
      el.textContent = text.slice(0, ci);
      if (ci === 0) { deleting = false; li = (li + 1) % lines.length; setTimeout(tick, 350); return; }
      setTimeout(tick, 45);
    }
  };
  tick();
}

const CAT_META = {
  all:   { name: "全部",     hint: "每一段都是真实的一段对话，各段之间不是连着发生的。" },
  cute:  { name: "甜甜的",   hint: "真的甜、真的可爱的那几段。" },
  daily: { name: "日常",     hint: "就是普通的一天，不甜也没关系。" },
  mushy: { name: "肉麻的",   hint: "看完起鸡皮疙瘩那种。" },
  scold: { name: "骂大笨鱼", hint: "她嫌弃主人的时候。" },
  food:  { name: "干饭",     hint: "token 就是饭。" }
};

function hmText(b) {
  return b.d + " " + (b.hm || "");
}

function renderBlocks(list, blocks) {
  list.innerHTML = "";
  if (!blocks.length) {
    list.innerHTML = '<li class="loading">这一类还没攒下什么，等她说。</li>';
    return;
  }
  for (const b of blocks) {
    const li = document.createElement("li");
    li.className = "block";
    const head = document.createElement("div");
    head.className = "block-head";
    head.innerHTML = `<span class="block-time">${hmText(b)}</span><span class="chip ${b.cat}">${(CAT_META[b.cat] || CAT_META.cute).name}</span>`;
    li.appendChild(head);
    const wrap = document.createElement("div");
    wrap.className = "turns";
    for (const t of b.turns) {
      const row = document.createElement("div");
      row.className = "turn " + (t.role === "user" ? "me" : "her");
      const who = document.createElement("span");
      who.className = "who";
      who.textContent = t.role === "user" ? "主人" : "大肥鱼";
      const body = document.createElement("span");
      body.className = "body";
      body.textContent = t.text;
      const time = document.createElement("span");
      time.className = "hm";
      time.textContent = t.hm || "";
      row.appendChild(who);
      row.appendChild(body);
      row.appendChild(time);
      wrap.appendChild(row);
    }
    li.appendChild(wrap);
    list.appendChild(li);
  }
}

async function loadData() {
  const res = await fetch("data/chat.json", { cache: "no-store" });
  if (!res.ok) throw new Error("no data");
  return res.json();
}

(async () => {
  const full = document.getElementById("chat-list");
  const preview = document.getElementById("chat-preview");
  const catRow = document.getElementById("cat-row");
  const hint = document.getElementById("cat-hint");
  if (!full && !preview) return;

  let blocks = [];
  try {
    const data = await loadData();
    blocks = data.blocks || [];
  } catch (e) {
    const t = full || preview;
    if (t) t.innerHTML = '<li class="loading">今天还没留下什么，明天再来看看。</li>';
    return;
  }

  if (preview) {
    preview.innerHTML = "";
    const last = blocks.slice(-1)[0];
    if (last) for (const t of last.turns) {
      const li = document.createElement("li");
      li.className = "mini " + (t.role === "user" ? "me" : "her");
      li.textContent = t.text;
      preview.appendChild(li);
    }
  }

  if (!full) return;

  const counts = { all: blocks.length };
  for (const b of blocks) counts[b.cat] = (counts[b.cat] || 0) + 1;

  let active = "all";
  const draw = () => {
    const list = active === "all" ? blocks : blocks.filter((b) => b.cat === active);
    renderBlocks(full, list.slice(-40));
    if (hint) hint.textContent = (CAT_META[active] || {}).hint || "";
    for (const x of catRow.children) x.classList.toggle("on", x.dataset.cat === active);
  };

  if (catRow) {
    catRow.innerHTML = "";
    for (const key of Object.keys(CAT_META)) {
      const n = counts[key] || 0;
      if (key !== "all" && n === 0) continue;
      const b = document.createElement("button");
      b.className = "cat-bubble";
      b.dataset.cat = key;
      b.innerHTML = `<span class="cat-name">${CAT_META[key].name}</span><span class="cat-n">${n}</span>`;
      b.addEventListener("click", () => { active = key; draw(); });
      catRow.appendChild(b);
    }
  }
  draw();
})();

// 图集：点击放大 + 左右切换 + 下载
(() => {
  const grid = document.querySelector(".gallery-grid");
  if (!grid) return;
  const imgs = [...grid.querySelectorAll("figure img")];
  if (!imgs.length) return;

  const box = document.createElement("div");
  box.className = "lightbox";
  box.hidden = true;
  box.innerHTML = '<div class="lb-zone left"></div><div class="lb-zone right"></div><button class="lb-nav prev" type="button">‹</button><img alt=""><button class="lb-nav next" type="button">›</button><div class="lb-bar"><a class="lb-btn" download>下载原图</a><button class="lb-btn lb-close" type="button">关闭</button></div>';
  document.body.appendChild(box);

  const big = box.querySelector("img");
  const dl = box.querySelector("a");
  let idx = 0;
  const show = (i) => {
    idx = (i + imgs.length) % imgs.length;
    const src = imgs[idx].currentSrc || imgs[idx].src;
    big.src = src;
    dl.href = src;
    dl.setAttribute("download", src.split("/").pop() || "image");
  };

  const hide = () => { box.hidden = true; };
  box.querySelector(".lb-close").addEventListener("click", hide);
  box.querySelector(".lb-nav.prev").addEventListener("click", (e) => { e.stopPropagation(); show(idx - 1); });
  box.querySelector(".lb-nav.next").addEventListener("click", (e) => { e.stopPropagation(); show(idx + 1); });
  const zL = box.querySelector(".lb-zone.left");
  const zR = box.querySelector(".lb-zone.right");
  if (zL) zL.addEventListener("click", (e) => { e.stopPropagation(); show(idx - 1); });
  if (zR) zR.addEventListener("click", (e) => { e.stopPropagation(); show(idx + 1); });
  box.addEventListener("click", (e) => { if (e.target === box) hide(); });
  document.addEventListener("keydown", (e) => {
    if (box.hidden) return;
    if (e.key === "Escape") hide();
    if (e.key === "ArrowLeft") show(idx - 1);
    if (e.key === "ArrowRight") show(idx + 1);
  });

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

  imgs.forEach((img, i) => {
    img.classList.add("zoomable");
    img.addEventListener("click", () => { show(i); box.hidden = false; });
  });
})();

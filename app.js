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

const DAY_NAMES = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

function dayLabel(d) {
  const today = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
  if (d === todayStr) return "今天";
  const y = new Date(today.getTime() - 86400000);
  const yStr = `${y.getFullYear()}-${pad(y.getMonth() + 1)}-${pad(y.getDate())}`;
  if (d === yStr) return "昨天";
  const dt = new Date(d + "T00:00:00");
  return `${d.slice(5)} ${DAY_NAMES[dt.getDay()] || ""}`;
}

function bubble(r, mini = false) {
  const li = document.createElement("li");
  li.className = (r.role === "user" ? "me" : "her") + (mini ? " mini" : "");
  if (!mini) {
    const who = document.createElement("span");
    who.className = "who";
    who.textContent = r.role === "user" ? "主人" : "大肥鱼";
    li.appendChild(who);
  }
  const body = document.createElement("span");
  body.className = "body";
  body.textContent = r.text;
  li.appendChild(body);
  return li;
}

async function loadChats() {
  const res = await fetch("data/chat.json", { cache: "no-store" });
  if (!res.ok) throw new Error("no data");
  const data = await res.json();
  return (data.chats || []).slice();
}

function renderGrouped(list, rows) {
  list.innerHTML = "";
  const days = new Map();
  for (const r of rows) {
    if (!days.has(r.d)) days.set(r.d, []);
    days.get(r.d).push(r);
  }
  for (const [d, items] of days) {
    const head = document.createElement("li");
    head.className = "day";
    head.textContent = dayLabel(d);
    list.appendChild(head);
    for (const r of items) list.appendChild(bubble(r));
  }
}

(async () => {
  const full = document.getElementById("chat-list");
  const preview = document.getElementById("chat-preview");
  if (!full && !preview) return;
  try {
    const rows = await loadChats();
    if (full) {
      if (!rows.length) throw new Error("empty");
      renderGrouped(full, rows.slice(-80));
    }
    if (preview) {
      preview.innerHTML = "";
      for (const r of rows.slice(-4)) preview.appendChild(bubble(r, true));
    }
  } catch (e) {
    const t = full || preview;
    t.innerHTML = '<li class="loading">今天还没留下什么，明天再来看看。</li>';
  }
})();

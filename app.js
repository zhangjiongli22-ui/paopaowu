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

async function loadChats() {
  const res = await fetch("data/chat.json", { cache: "no-store" });
  if (!res.ok) throw new Error("no data");
  const data = await res.json();
  return (data.chats || []).slice();
}

function render(list, rows) {
  list.innerHTML = "";
  for (const r of rows) {
    const li = document.createElement("li");
    if (r.role === "user") li.className = "me";
    const who = document.createElement("span");
    who.className = "who";
    who.textContent = r.role === "user" ? "主人" : "大肥鱼";
    li.appendChild(who);
    li.appendChild(document.createTextNode(r.text));
    list.appendChild(li);
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
      render(full, rows.slice(-60));
    }
    if (preview) render(preview, rows.slice(-4));
  } catch (e) {
    const t = full || preview;
    t.innerHTML = '<li class="loading">今天还没留下什么，明天再来看看。</li>';
  }
})();

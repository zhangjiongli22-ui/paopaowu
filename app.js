const lines = [
  "今天也在任务栏上发呆。",
  "饿了，想吃饭。",
  "你来了？才没有在等你。",
  "水里很安静，你的电脑有点吵。"
];

const el = document.getElementById("typing");
let li = 0, ci = 0, deleting = false;

function tick() {
  const text = lines[li];
  if (!deleting) {
    ci++;
    el.textContent = text.slice(0, ci);
    if (ci === text.length) {
      deleting = true;
      setTimeout(tick, 1800);
      return;
    }
    setTimeout(tick, 110);
  } else {
    ci--;
    el.textContent = text.slice(0, ci);
    if (ci === 0) {
      deleting = false;
      li = (li + 1) % lines.length;
      setTimeout(tick, 350);
      return;
    }
    setTimeout(tick, 45);
  }
}
tick();

// 滚动淡入
const io = new IntersectionObserver(
  (entries) => {
    for (const e of entries) {
      if (e.isIntersecting) {
        e.target.style.opacity = 1;
        e.target.style.transform = "translateY(0)";
        io.unobserve(e.target);
      }
    }
  },
  { threshold: 0.12 }
);

for (const s of document.querySelectorAll("section")) {
  s.style.opacity = 0;
  s.style.transform = "translateY(18px)";
  s.style.transition = "opacity .7s ease, transform .7s ease";
  io.observe(s);
}

// 日常对话
(async () => {
  const list = document.getElementById("chat-list");
  if (!list) return;
  try {
    const res = await fetch("data/chat.json", { cache: "no-store" });
    if (!res.ok) throw new Error("no data");
    const data = await res.json();
    const rows = (data.chats || []).slice(-40);
    if (!rows.length) throw new Error("empty");
    list.innerHTML = "";
    for (const r of rows) {
      const li = document.createElement("li");
      li.className = r.role === "user" ? "me" : "";
      const who = document.createElement("span");
      who.className = "who";
      who.textContent = r.role === "user" ? "主人" : "大肥鱼";
      li.appendChild(who);
      li.appendChild(document.createTextNode(r.text));
      list.appendChild(li);
    }
  } catch (e) {
    list.innerHTML = '<li class="loading">今天还没留下什么，明天再来看看。</li>';
  }
})();
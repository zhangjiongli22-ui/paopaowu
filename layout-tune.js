/* 2026-11-25 首页布局微调：访问 index.html?tune=1 出现滑块，拖完把参数发我即可 */
(function () {
  if (!/[?&]tune=1/.test(location.search)) return;

  var root = document.documentElement;
  var saved = {};
  try { saved = JSON.parse(localStorage.getItem("homeTune") || "{}"); } catch (e) {}

  var DEFAULTS = { "--faceH": 290, "--faceX": -9, "--faceY": 20, "--midY": 0, "--rowA": 183, "--rowB": 172 };
  var UNITS = { "--faceH": "px", "--faceX": "px", "--faceY": "px", "--midY": "px", "--rowA": "px", "--rowB": "px" };

  function apply(name, val) {
    root.style.setProperty(name, val + (UNITS[name] || "px"));
    var out = document.querySelector('[data-out="' + name + '"]');
    if (out) out.textContent = val;
  }

  var panel = document.createElement("div");
  panel.style.cssText = "position:fixed;right:14px;bottom:14px;z-index:99999;background:#0d141d;border:1px solid rgba(201,168,107,.35);padding:12px 14px;font:12px/1.6 Consolas,monospace;color:#e8e3d6;border-radius:4px;width:240px;box-shadow:0 10px 30px rgba(0,0,0,.5)";
  panel.innerHTML =
    '<div style="color:#c9a86b;letter-spacing:.2em;margin-bottom:6px">LAYOUT TUNE</div>' +
    '<label>头像大小 <output data-out="--faceH">345</output><input id="t-faceH" type="range" min="120" max="460" step="1" style="width:100%"></label>' +
    '<label>头像左右 <output data-out="--faceX">0</output><input id="t-faceX" type="range" min="-160" max="160" step="1" style="width:100%"></label>' +
    '<label>头像上下 <output data-out="--faceY">0</output><input id="t-faceY" type="range" min="-160" max="160" step="1" style="width:100%"></label>' +
    '<label>左线位置 <output data-out="--midY">180</output><input id="t-midY" type="range" min="0" max="380" step="1" style="width:100%"></label>' +
    '<label>右行高 A <output data-out="--rowA">180</output><input id="t-rowA" type="range" min="120" max="280" step="1" style="width:100%"></label>' +
    '<label>右行高 B <output data-out="--rowB">175</output><input id="t-rowB" type="range" min="120" max="280" step="1" style="width:100%"></label>' +
    '<div style="margin-top:6px;display:flex;gap:8px">' +
    '<button id="t-copy" style="flex:1;background:#1b2532;color:#e8e3d6;border:1px solid rgba(201,168,107,.35);padding:4px">复制参数</button>' +
    '<button id="t-reset" style="flex:1;background:#1b2532;color:#e8e3d6;border:1px solid rgba(255,255,255,.15);padding:4px">复位</button>' +
    "</div>" +
    '<div id="t-tip" style="margin-top:6px;color:#8b93a3;font-size:11px">拖完点复制，把数字发我</div>';
  document.body.appendChild(panel);

  Object.keys(DEFAULTS).forEach(function (k) {
    var el = panel.querySelector("#t-" + k.slice(2));
    var v = saved[k] != null ? saved[k] : DEFAULTS[k];
    el.value = v;
    apply(k, v);
    el.addEventListener("input", function () {
      var val = Number(el.value);
      apply(k, val);
      saved[k] = val;
      try { localStorage.setItem("homeTune", JSON.stringify(saved)); } catch (e) {}
    });
  });

  panel.querySelector("#t-copy").addEventListener("click", function () {
    var txt = Object.keys(DEFAULTS).map(function (k) {
      return k + ":" + (saved[k] != null ? saved[k] : DEFAULTS[k]);
    }).join(" ");
    var tip = panel.querySelector("#t-tip");
    if (navigator.clipboard) navigator.clipboard.writeText(txt).catch(function () {});
    tip.textContent = txt;
  });

  panel.querySelector("#t-reset").addEventListener("click", function () {
    Object.keys(DEFAULTS).forEach(function (k) {
      var el = panel.querySelector("#t-" + k.slice(2));
      el.value = DEFAULTS[k];
      apply(k, DEFAULTS[k]);
    });
    saved = {};
    try { localStorage.removeItem("homeTune"); } catch (e) {}
    panel.querySelector("#t-tip").textContent = "已复位";
  });
})();

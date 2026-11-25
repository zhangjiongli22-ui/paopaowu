/* 2026-11-25 首页布局微调：访问 index.html?tune=1 出现滑块，拖完把参数发我即可 */
(function () {
  if (!/[?&]tune=1/.test(location.search)) return;

  var root = document.documentElement;
  var saved = {};
  try { saved = JSON.parse(localStorage.getItem("homeTune") || "{}"); } catch (e) {}

  function apply(name, val, unit) {
    root.style.setProperty(name, val + (unit || "px"));
    var out = document.querySelector('[data-out="' + name + '"]');
    if (out) out.textContent = val;
  }

  var panel = document.createElement("div");
  panel.style.cssText = "position:fixed;right:14px;bottom:14px;z-index:99999;background:#0d141d;border:1px solid rgba(201,168,107,.35);padding:12px 14px;font:12px/1.7 Consolas,monospace;color:#e8e3d6;border-radius:4px;min-width:230px;box-shadow:0 10px 30px rgba(0,0,0,.5)";
  panel.innerHTML =
    '<div style="color:#c9a86b;letter-spacing:.2em;margin-bottom:8px">LAYOUT TUNE</div>' +
    '<label>头像大小 <output data-out="--faceH">345</output><br><input id="t-face" type="range" min="120" max="460" step="1" style="width:100%"></label>' +
    '<label>左线位置 <output data-out="--midY">180</output><br><input id="t-mid" type="range" min="0" max="360" step="1" style="width:100%"></label>' +
    '<label>右行高 A <output data-out="--rowA">180</output><br><input id="t-ra" type="range" min="120" max="260" step="1" style="width:100%"></label>' +
    '<label>右行高 B <output data-out="--rowB">175</output><br><input id="t-rb" type="range" min="120" max="260" step="1" style="width:100%"></label>' +
    '<div style="margin-top:8px;display:flex;gap:8px">' +
    '<button id="t-copy" style="flex:1;background:#1b2532;color:#e8e3d6;border:1px solid rgba(201,168,107,.35);padding:4px">复制参数</button>' +
    '<button id="t-reset" style="flex:1;background:#1b2532;color:#e8e3d6;border:1px solid rgba(255,255,255,.15);padding:4px">复位</button>' +
    "</div>" +
    '<div id="t-tip" style="margin-top:6px;color:#8b93a3;font-size:11px">拖完点复制，把数字发我</div>';
  document.body.appendChild(panel);

  var inputs = {
    "--faceH": { el: panel.querySelector("#t-face"), unit: "px" },
    "--midY": { el: panel.querySelector("#t-mid"), unit: "px" },
    "--rowA": { el: panel.querySelector("#t-ra"), unit: "px" },
    "--rowB": { el: panel.querySelector("#t-rb"), unit: "px" },
  };
  var defaults = { "--faceH": 345, "--midY": 180, "--rowA": 180, "--rowB": 175 };

  Object.keys(inputs).forEach(function (k) {
    var item = inputs[k];
    var v = saved[k] != null ? saved[k] : defaults[k];
    item.el.value = v;
    apply(k, v, item.unit);
    item.el.addEventListener("input", function () {
      var val = Number(item.el.value);
      apply(k, val, item.unit);
      saved[k] = val;
      try { localStorage.setItem("homeTune", JSON.stringify(saved)); } catch (e) {}
    });
  });

  panel.querySelector("#t-copy").addEventListener("click", function () {
    var txt = Object.keys(inputs).map(function (k) { return k + ":" + inputs[k].el.value; }).join(" ");
    var tip = panel.querySelector("#t-tip");
    if (navigator.clipboard) navigator.clipboard.writeText(txt).catch(function () {});
    tip.textContent = "已复制：" + txt;
  });

  panel.querySelector("#t-reset").addEventListener("click", function () {
    Object.keys(inputs).forEach(function (k) {
      inputs[k].el.value = defaults[k];
      apply(k, defaults[k], "px");
    });
    saved = {};
    try { localStorage.removeItem("homeTune"); } catch (e) {}
    panel.querySelector("#t-tip").textContent = "已复位";
  });
})();

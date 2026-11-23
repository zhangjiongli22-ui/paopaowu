/* 评分星：records 里 rating 是 0–10 的整数，2 = 一星，1 = 半星。
   页面统一用 starRow() 生成，样式在 style.css 的 .stars5。 */
(function () {
  var GLYPH = "\u2605"; // ★

  function starRow(rating, extraClass) {
    var v = Math.max(0, Math.min(10, Math.round(Number(rating) || 0)));
    var score = v / 2;
    var label = (Number.isInteger(score) ? String(score) : score.toFixed(1)) + " 分，满分 5 分";
    var html =
      '<span class="stars5' + (extraClass ? " " + extraClass : "") + '" role="img" aria-label="' + label + '">';
    for (var i = 1; i <= 5; i++) {
      var fill = Math.max(0, Math.min(1, (v - (i - 1) * 2) / 2));
      html +=
        '<span class="s5" aria-hidden="true" style="--fill:' +
        Math.round(fill * 100) +
        '%">' +
        GLYPH +
        "</span>";
    }
    return html + "</span>";
  }

  window.starRow = starRow;
})();

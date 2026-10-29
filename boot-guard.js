// boot-guard.js —— bundle 加载前的兜底：任何脚本错误糊一张红条（iPad / Quest 无 devtools）。原是 index.html 的内联脚本，2026-10-29 上 CSP（不放行内联脚本）搬成文件；SW 预缓存。Claude Fable 5.1
// bundle 加载前的兜底：任何脚本错误糊一张红条（iPad/Quest 无 devtools）。
(function () {
  function show(text) {
    var bar = document.getElementById("errBanner");
    if (!bar) {
      bar = document.createElement("div");
      bar.id = "errBanner"; bar.className = "err-banner";
      bar.addEventListener("click", function () { bar.hidden = true; });
      (document.body || document.documentElement).appendChild(bar);
    }
    bar.hidden = false;
    bar.textContent = text + "  (点击关闭)";
  }
  window.addEventListener("error", function (e) { show("脚本错误：" + (e.message || e.error || e)); });
  window.addEventListener("unhandledrejection", function (e) { show("未处理的 Promise 错误：" + (e.reason && (e.reason.message || e.reason))); });
})();


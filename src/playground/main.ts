// playground —— 薄 canvas 壳（vibe 载体 + 调试可视化）。M0 占位：画布自适应 + hello 标记。
const canvas = document.getElementById("board") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;

function resize(): void {
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth, h = canvas.clientHeight;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  draw();
}

function draw(): void {
  ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
  ctx.fillStyle = "#999";
  ctx.font = "14px system-ui";
  ctx.fillText("CatsUp playground（M0 占位）", 16, 28);
}

window.addEventListener("resize", resize);
resize();

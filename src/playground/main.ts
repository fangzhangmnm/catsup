// playground —— 薄 canvas 壳（vibe 载体 + 调试可视化）。
// 与 golden 测试同源：右栏事件日志显示的就是 FaceEvent 流。
// 端点吸附（≤8px）是**输入拐杖**，不是 inference 引擎——inference 是后续纪元的独立层。

import { Kernel } from "../kernel/kernel.ts";
import type { FaceEvent, Pt } from "../kernel/kernel.ts";

const canvas = document.getElementById("board") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const logEl = document.getElementById("log")!;

const kernel = new Kernel();

type Tool = "line" | "erase" | "eraseFace";
let tool: Tool = "line";
let dragStart: Pt | null = null;
let dragCur: Pt | null = null;

const SNAP = 8;      // 端点吸附半径（px）
const HIT = 6;       // 命中容差（px）

// ---------- 工具切换 ----------
const toolButtons: Record<Tool, HTMLButtonElement> = {
  line: document.getElementById("toolLine") as HTMLButtonElement,
  erase: document.getElementById("toolErase") as HTMLButtonElement,
  eraseFace: document.getElementById("toolEraseFace") as HTMLButtonElement,
};
function setTool(t: Tool): void {
  tool = t;
  for (const [name, btn] of Object.entries(toolButtons)) btn.classList.toggle("active", name === t);
}
toolButtons.line.addEventListener("click", () => setTool("line"));
toolButtons.erase.addEventListener("click", () => setTool("erase"));
toolButtons.eraseFace.addEventListener("click", () => setTool("eraseFace"));
setTool("line");

// ---------- 事件日志 ----------
function describeEvent(ev: FaceEvent): string {
  switch (ev.type) {
    case "BIRTH": return `诞生 面#${ev.face}`;
    case "DIVIDE": return `分割 面#${ev.from} → ${ev.into.map((i) => `#${i}`).join(" + ")}`;
    case "MERGE": return `合并 ${ev.from.map((i) => `#${i}`).join("+")} → 面#${ev.into}`;
    case "ABSORB": return `吞洞 面#${ev.from} → 面#${ev.into}`;
    case "BURST": return `破膜 面#${ev.face}`;
    case "STRETCH": return `拉伸 ${ev.faces.map((i) => `面#${i}`).join(" ")}`;
    case "FACE_ERASED": return `删膜 面#${ev.face}`;
  }
}
function appendLog(events: FaceEvent[]): void {
  for (const ev of events) {
    const div = document.createElement("div");
    div.className = "ev";
    div.textContent = describeEvent(ev);
    logEl.prepend(div); // 最新在上
  }
}

// ---------- 渲染 ----------
const FACE_FILLS = ["#7fb06955", "#5b8dbb55", "#c2984e55", "#a06fb055", "#bb6b6b55", "#58a89a55"];

function draw(): void {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  ctx.clearRect(0, 0, w, h);

  // 面（半透明填充，洞走 evenodd）
  for (const f of kernel.faces()) {
    ctx.beginPath();
    tracePath(f.outer.pts);
    for (const hole of f.holes) tracePath(hole.pts);
    ctx.fillStyle = FACE_FILLS[f.id % FACE_FILLS.length];
    ctx.fill("evenodd");
  }
  // 边：wire（无面）加粗——SU 的悬挂边 affordance（drill L403）
  for (const e of kernel.edges()) {
    const a = kernel.graph.pt(e.a), b = kernel.graph.pt(e.b);
    const isWire = e.faceLinks.length === 0;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.lineWidth = isWire ? 3 : 1.2;
    ctx.strokeStyle = isWire ? "#1a1a1a" : "#444";
    ctx.stroke();
  }
  // 顶点
  ctx.fillStyle = "#222";
  for (const v of kernel.vertices()) {
    ctx.beginPath();
    ctx.arc(v.x, v.y, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  // 画线预览
  if (tool === "line" && dragStart && dragCur) {
    ctx.beginPath();
    ctx.moveTo(dragStart.x, dragStart.y);
    ctx.lineTo(dragCur.x, dragCur.y);
    ctx.lineWidth = 1;
    ctx.strokeStyle = "#2b6cb0";
    ctx.setLineDash([4, 3]);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}
function tracePath(pts: readonly Pt[]): void {
  if (!pts.length) return;
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
}

// ---------- 输入 ----------
function canvasPt(ev: PointerEvent): Pt {
  const r = canvas.getBoundingClientRect();
  return { x: ev.clientX - r.left, y: ev.clientY - r.top };
}
/** 输入拐杖：吸到最近端点（≤SNAP px），让 retrace/重合场景手画得出来。 */
function snap(p: Pt): Pt {
  let best: Pt | null = null, bestD = SNAP;
  for (const v of kernel.vertices()) {
    const d = Math.hypot(v.x - p.x, v.y - p.y);
    if (d <= bestD) { bestD = d; best = { x: v.x, y: v.y }; }
  }
  return best ?? p;
}

canvas.addEventListener("pointerdown", (ev) => {
  canvas.setPointerCapture(ev.pointerId);
  const p = canvasPt(ev);
  if (tool === "line") {
    dragStart = snap(p);
    dragCur = p;
  }
});
canvas.addEventListener("pointermove", (ev) => {
  if (tool === "line" && dragStart) {
    dragCur = snap(canvasPt(ev));
    draw();
  }
});
canvas.addEventListener("pointerup", (ev) => {
  const p = canvasPt(ev);
  if (tool === "line" && dragStart) {
    const a = dragStart, b = snap(p);
    dragStart = dragCur = null;
    if (Math.hypot(b.x - a.x, b.y - a.y) >= 2) {
      appendLog(kernel.addEdges([[a, b]]));
    }
  } else if (tool === "erase") {
    const hit = kernel.hitTest(p, HIT);
    if (hit.edge !== undefined) appendLog(kernel.eraseEdges([hit.edge]));
    else if (hit.vertex !== undefined) {
      // 点在顶点上：擦它的全部 incident 边（批量语义）
      const star = [...kernel.graph.vertex(hit.vertex).edges];
      appendLog(kernel.eraseEdges(star));
    }
  } else if (tool === "eraseFace") {
    const hit = kernel.hitTest(p, HIT);
    if (hit.face !== undefined) appendLog(kernel.eraseFaces([hit.face]));
  }
  draw();
});

// ---------- 画布尺寸 ----------
function resize(): void {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(canvas.clientWidth * dpr);
  canvas.height = Math.round(canvas.clientHeight * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  draw();
}
window.addEventListener("resize", resize);
resize();

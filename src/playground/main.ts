// playground main.ts —— 指针事件接线层（纯逻辑在 tools.ts / inference.ts，那边有 node 测试）。
// M2 六工具：选择 / 画线 / 矩形 / 移动 / 橡皮 / 删面。
// 所有取点动作统一走 inferPoint（inference = 输入前置层，不是工具内部特性——验收③的门）。
// 吸附指示配色抄 SU 约定：endpoint 绿、midpoint 青、on-edge 红、轴向 X 红 / Y 绿虚线。

import { Kernel } from "../kernel/kernel.ts";
import type { EdgeId, FaceEvent, Pt, VertexId } from "../kernel/kernel.ts";
import { inferPoint, type SnapResult } from "./inference.ts";
import {
  type Selection,
  emptySelection,
  marqueeOf,
  marqueePick,
  moveTargets,
  rectSegments,
  scrubHits,
  translateMoves,
} from "./tools.ts";

const canvas = document.getElementById("board") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const logEl = document.getElementById("log")!;

const kernel = new Kernel();

const SNAP = 8;   // 吸附容差（px）
const HIT = 6;    // 命中容差（px）

type Tool = "select" | "line" | "rect" | "move" | "erase" | "eraseFace";
let tool: Tool = "line";

// ---- 各工具瞬态 ----
let anchor: Pt | null = null;          // line/rect 起点、move 抓取点、select 框选起点
let cursor: Pt | null = null;          // 当前（已推断）光标
let snapInfo: SnapResult | null = null;
let moveVids: VertexId[] = [];         // move 工具抓住的顶点集
let moveExclude: VertexId | null = null; // 单顶点移动时吸附排除自己
let scrubAcc = new Set<EdgeId>();      // 橡皮已扫中的边
let scrubPrev: Pt | null = null;
let selection: Selection = emptySelection();
let marqueeDrag = false;

// ---------- 工具切换 ----------
const toolButtons: Record<Tool, HTMLButtonElement> = {
  select: document.getElementById("toolSelect") as HTMLButtonElement,
  line: document.getElementById("toolLine") as HTMLButtonElement,
  rect: document.getElementById("toolRect") as HTMLButtonElement,
  move: document.getElementById("toolMove") as HTMLButtonElement,
  erase: document.getElementById("toolErase") as HTMLButtonElement,
  eraseFace: document.getElementById("toolEraseFace") as HTMLButtonElement,
};
function setTool(t: Tool): void {
  tool = t;
  cancelGesture();
  for (const [name, btn] of Object.entries(toolButtons)) btn.classList.toggle("active", name === t);
  draw();
}
for (const [name, btn] of Object.entries(toolButtons)) btn.addEventListener("click", () => setTool(name as Tool));
setTool("line");

function cancelGesture(): void {
  anchor = null;
  cursor = null;
  snapInfo = null;
  moveVids = [];
  moveExclude = null;
  scrubAcc = new Set();
  scrubPrev = null;
  marqueeDrag = false;
}

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
    logEl.prepend(div);
  }
}

// ---------- 渲染 ----------
const FACE_FILLS = ["#7fb06955", "#5b8dbb55", "#c2984e55", "#a06fb055", "#bb6b6b55", "#58a89a55"];
const SNAP_COLORS: Record<string, string> = {
  endpoint: "#2e8b57",
  midpoint: "#00a5a5",
  "on-edge": "#cc3333",
  "axis-x": "#cc3333",
  "axis-y": "#2e8b57",
};

function draw(): void {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  ctx.clearRect(0, 0, w, h);

  // 面（半透明填充，洞走 evenodd；选中面加蓝描边）
  for (const f of kernel.faces()) {
    ctx.beginPath();
    tracePath(f.outer.pts);
    for (const hole of f.holes) tracePath(hole.pts);
    ctx.fillStyle = FACE_FILLS[f.id % FACE_FILLS.length];
    ctx.fill("evenodd");
    if (selection.faces.has(f.id)) {
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#2b6cb0";
      ctx.stroke();
    }
  }
  // 边：wire 加粗（SU 悬挂边 affordance）；选中蓝；橡皮扫中红
  for (const e of kernel.edges()) {
    const a = kernel.graph.pt(e.a), b = kernel.graph.pt(e.b);
    const isWire = e.faceLinks.length === 0;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    if (scrubAcc.has(e.id)) { ctx.lineWidth = 3; ctx.strokeStyle = "#cc3333"; }
    else if (selection.edges.has(e.id)) { ctx.lineWidth = 3; ctx.strokeStyle = "#2b6cb0"; }
    else { ctx.lineWidth = isWire ? 3 : 1.2; ctx.strokeStyle = isWire ? "#1a1a1a" : "#444"; }
    ctx.stroke();
  }
  // 顶点
  ctx.fillStyle = "#222";
  for (const v of kernel.vertices()) {
    ctx.beginPath();
    ctx.arc(v.x, v.y, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // ---- 工具预览 ----
  if (anchor && cursor) {
    if (tool === "line") dashedLine(anchor, cursor, "#2b6cb0");
    if (tool === "rect") dashedRect(anchor, cursor, "#2b6cb0");
    if (tool === "select" && marqueeDrag) dashedRect(anchor, cursor, "#666");
    if (tool === "move" && moveVids.length) {
      dashedLine(anchor, cursor, "#b0592b");
      const dx = cursor.x - anchor.x, dy = cursor.y - anchor.y;
      ctx.fillStyle = "#b0592b88";
      for (const vid of moveVids) {
        if (!kernel.graph.hasVertex(vid)) continue;
        const p = kernel.graph.pt(vid);
        ctx.beginPath();
        ctx.arc(p.x + dx, p.y + dy, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  // ---- 吸附指示 ----
  if (snapInfo?.kind && cursor) {
    const color = SNAP_COLORS[snapInfo.kind];
    if (snapInfo.kind === "axis-x" || snapInfo.kind === "axis-y") {
      if (anchor) dashedLine(anchor, cursor, color);
    } else {
      ctx.beginPath();
      ctx.arc(snapInfo.pt.x, snapInfo.pt.y, 5, 0, Math.PI * 2);
      ctx.lineWidth = 2;
      ctx.strokeStyle = color;
      ctx.stroke();
    }
  }
}
function tracePath(pts: readonly Pt[]): void {
  if (!pts.length) return;
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
}
function dashedLine(a: Pt, b: Pt, color: string): void {
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.lineWidth = 1;
  ctx.strokeStyle = color;
  ctx.setLineDash([4, 3]);
  ctx.stroke();
  ctx.setLineDash([]);
}
function dashedRect(a: Pt, b: Pt, color: string): void {
  ctx.beginPath();
  ctx.rect(Math.min(a.x, b.x), Math.min(a.y, b.y), Math.abs(b.x - a.x), Math.abs(b.y - a.y));
  ctx.lineWidth = 1;
  ctx.strokeStyle = color;
  ctx.setLineDash([4, 3]);
  ctx.stroke();
  ctx.setLineDash([]);
}

// ---------- 输入 ----------
function canvasPt(ev: PointerEvent): Pt {
  const r = canvas.getBoundingClientRect();
  return { x: ev.clientX - r.left, y: ev.clientY - r.top };
}
/** 统一取点：所有工具的点都过 inference（useAxis=false 时不做轴锁，如矩形对角）。 */
function inferred(raw: Pt, withAnchor: Pt | null, exclude: VertexId | null = null): Pt {
  snapInfo = inferPoint(kernel, raw, withAnchor, SNAP, exclude);
  return snapInfo.pt;
}

canvas.addEventListener("pointerdown", (ev) => {
  canvas.setPointerCapture(ev.pointerId);
  const raw = canvasPt(ev);
  switch (tool) {
    case "line":
      anchor = inferred(raw, null);
      cursor = anchor;
      break;
    case "rect":
      anchor = inferred(raw, null);
      cursor = anchor;
      break;
    case "move": {
      const hit = kernel.hitTest(raw, HIT);
      moveVids = moveTargets(kernel, hit);
      moveExclude = moveVids.length === 1 ? moveVids[0] : null;
      anchor = hit.vertex !== undefined ? kernel.graph.pt(hit.vertex) : raw;
      cursor = anchor;
      break;
    }
    case "erase":
      scrubAcc = new Set();
      scrubPrev = raw;
      scrubHits(kernel, raw, raw, HIT, scrubAcc);
      break;
    case "select":
      anchor = raw;
      cursor = raw;
      marqueeDrag = false;
      break;
    case "eraseFace":
      break;
  }
  draw();
});

canvas.addEventListener("pointermove", (ev) => {
  const raw = canvasPt(ev);
  switch (tool) {
    case "line":
      if (anchor) { cursor = inferred(raw, anchor); draw(); }
      break;
    case "rect":
      if (anchor) { cursor = inferred(raw, null); draw(); } // 矩形对角不做轴锁（锁了就退化成线）
      break;
    case "move":
      if (moveVids.length && anchor) { cursor = inferred(raw, anchor, moveExclude); draw(); }
      break;
    case "erase":
      if (scrubPrev) {
        scrubHits(kernel, scrubPrev, raw, HIT, scrubAcc);
        scrubPrev = raw;
        draw();
      }
      break;
    case "select":
      if (anchor) {
        cursor = raw;
        if (Math.hypot(raw.x - anchor.x, raw.y - anchor.y) > 4) marqueeDrag = true;
        draw();
      }
      break;
    case "eraseFace":
      break;
  }
});

canvas.addEventListener("pointerup", (ev) => {
  const raw = canvasPt(ev);
  switch (tool) {
    case "line": {
      if (!anchor) break;
      const b = inferred(raw, anchor);
      const a = anchor;
      cancelGesture();
      if (Math.hypot(b.x - a.x, b.y - a.y) >= 2) appendLog(kernel.addEdges([[a, b]]));
      break;
    }
    case "rect": {
      if (!anchor) break;
      const b = inferred(raw, null);
      const segs = rectSegments(anchor, b);
      cancelGesture();
      if (segs.length) appendLog(kernel.addEdges(segs));
      break;
    }
    case "move": {
      if (!moveVids.length || !anchor) { cancelGesture(); break; }
      const target = inferred(raw, anchor, moveExclude);
      const delta = { x: target.x - anchor.x, y: target.y - anchor.y };
      const moves = translateMoves(kernel, moveVids, delta);
      cancelGesture();
      if (Math.hypot(delta.x, delta.y) >= 0.5) appendLog(kernel.moveVertices(moves));
      break;
    }
    case "erase": {
      const ids = [...scrubAcc];
      cancelGesture();
      if (ids.length) appendLog(kernel.eraseEdges(ids));
      break;
    }
    case "select": {
      if (!anchor) break;
      const additive = ev.shiftKey;
      let picked: Selection;
      if (marqueeDrag && cursor) {
        picked = marqueePick(kernel, marqueeOf(anchor, cursor));
      } else {
        picked = emptySelection();
        const hit = kernel.hitTest(raw, HIT);
        if (hit.edge !== undefined) picked.edges.add(hit.edge);
        else if (hit.face !== undefined) picked.faces.add(hit.face);
      }
      if (additive) {
        for (const e of picked.edges) selection.edges.add(e);
        for (const f of picked.faces) selection.faces.add(f);
      } else {
        selection = picked;
      }
      anchor = cursor = null;
      marqueeDrag = false;
      break;
    }
    case "eraseFace": {
      const hit = kernel.hitTest(raw, HIT);
      if (hit.face !== undefined) appendLog(kernel.eraseFaces([hit.face]));
      break;
    }
  }
  draw();
});

// ---------- 键盘 ----------
window.addEventListener("keydown", (ev) => {
  if (ev.key === "Delete" || ev.key === "Backspace") {
    if (selection.faces.size || selection.edges.size) {
      // 一次批：面先删膜、边再擦（各自批量收口）
      if (selection.faces.size) appendLog(kernel.eraseFaces([...selection.faces]));
      if (selection.edges.size) appendLog(kernel.eraseEdges([...selection.edges]));
      selection = emptySelection();
      draw();
    }
  } else if (ev.key === "Escape") {
    selection = emptySelection();
    cancelGesture();
    draw();
  }
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

// playground main.ts —— 指针事件接线层（纯逻辑在 tools.ts / inference.ts，node 有测试）。
// M2 六工具：选择 / 画线 / 矩形 / 移动 / 橡皮 / 删面。
// 取点统一走 inferPoint（inference = 输入前置层）；hover 阶段即显示吸附指示 + 中文 tooltip。
// preview = 影子副本预演（kernel.clone() 上跑同一套 mutation，渲染 diff，松手对真身重放）——
// 预览事件与提交事件逐字相同（test/preview.test.ts 钉死），预览不许撒谎。

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
const hintEl = document.getElementById("hint")!;
const HINT_DEFAULT = "框选后 Delete 删除；Esc 取消";

const kernel = new Kernel();

const SNAP = 8;
const HIT = 6;

type Tool = "select" | "line" | "rect" | "move" | "erase" | "eraseFace";
let tool: Tool = "line";

// ---- 瞬态 ----
let anchor: Pt | null = null;            // line/rect 起点、move 抓取点、select 框选起点
let cursor: Pt | null = null;
let snapInfo: SnapResult | null = null;  // hover 与拖拽共用
let moveVids: VertexId[] = [];
let moveExclude: VertexId | null = null;
let scrubAcc = new Set<EdgeId>();
let scrubPrev: Pt | null = null;
let selection: Selection = emptySelection();
let marqueeDrag = false;
let hoverEdge: EdgeId | null = null;     // 橡皮 hover 高亮
let hoverFace: number | null = null;     // 删面 hover 高亮
let preview: { k: Kernel; events: FaceEvent[] } | null = null;

const gestureActive = (): boolean => anchor !== null || moveVids.length > 0 || scrubPrev !== null;

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
  hoverEdge = null;
  preview = null;
  hintEl.textContent = HINT_DEFAULT;
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

// ---------- preview（影子副本预演） ----------
function computePreview(): void {
  const shadowRun = (fn: (c: Kernel) => FaceEvent[]): { k: Kernel; events: FaceEvent[] } => {
    const c = kernel.clone();
    return { k: c, events: fn(c) };
  };
  let next: { k: Kernel; events: FaceEvent[] } | null = null;
  if (tool === "line" && anchor && cursor) {
    const a = anchor, b = cursor;
    if (Math.hypot(b.x - a.x, b.y - a.y) >= 2) next = shadowRun((c) => c.addEdges([[a, b]]));
  } else if (tool === "rect" && anchor && cursor) {
    const segs = rectSegments(anchor, cursor);
    if (segs.length) next = shadowRun((c) => c.addEdges(segs));
  } else if (tool === "move" && moveVids.length && anchor && cursor) {
    const delta = { x: cursor.x - anchor.x, y: cursor.y - anchor.y };
    if (Math.hypot(delta.x, delta.y) >= 0.5) {
      const moves = translateMoves(kernel, moveVids, delta);
      next = shadowRun((c) => c.moveVertices(moves));
    }
  } else if (tool === "erase" && scrubPrev && scrubAcc.size) {
    const ids = [...scrubAcc];
    next = shadowRun((c) => c.eraseEdges(ids));
  } else if (tool === "eraseFace" && hoverFace !== null) {
    const id = hoverFace;
    next = shadowRun((c) => c.eraseFaces([id]));
  }
  preview = next;
  hintEl.textContent = next
    ? next.events.length
      ? `预览：${next.events.map(describeEvent).join("；")}`
      : "预览：无膜变化"
    : HINT_DEFAULT;
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
const SNAP_LABELS: Record<string, string> = {
  endpoint: "端点",
  midpoint: "中点",
  "on-edge": "边上",
  "axis-x": "水平",
  "axis-y": "垂直",
};

function draw(): void {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  ctx.clearRect(0, 0, w, h);

  // ---- 底层：真身 ----
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
  for (const e of kernel.edges()) {
    const a = kernel.graph.pt(e.a), b = kernel.graph.pt(e.b);
    const isWire = e.faceLinks.length === 0;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    if (scrubAcc.has(e.id) || hoverEdge === e.id) { ctx.lineWidth = 3; ctx.strokeStyle = "#cc3333"; }
    else if (selection.edges.has(e.id)) { ctx.lineWidth = 3; ctx.strokeStyle = "#2b6cb0"; }
    else { ctx.lineWidth = isWire ? 3 : 1.2; ctx.strokeStyle = isWire ? "#1a1a1a" : "#444"; }
    ctx.stroke();
  }
  ctx.fillStyle = "#222";
  for (const v of kernel.vertices()) {
    ctx.beginPath();
    ctx.arc(v.x, v.y, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // ---- 预览层：与真身 diff ----
  if (preview) {
    const pk = preview.k;
    // 会死的面：灰罩
    for (const f of kernel.faces()) {
      if (!pk.face(f.id)) {
        ctx.beginPath();
        tracePath(f.outer.pts);
        for (const hole of f.holes) tracePath(hole.pts);
        ctx.fillStyle = "#00000022";
        ctx.fill("evenodd");
      }
    }
    // 新生/变形的面：蓝虚线轮廓 + 淡蓝填充
    for (const f of pk.faces()) {
      const rf = kernel.face(f.id);
      if (rf && ringsEq(rf.outer.pts, f.outer.pts) && rf.holes.length === f.holes.length) continue;
      ctx.beginPath();
      tracePath(f.outer.pts);
      for (const hole of f.holes) tracePath(hole.pts);
      ctx.fillStyle = "#2b6cb01a";
      ctx.fill("evenodd");
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = "#2b6cb0";
      ctx.setLineDash([5, 3]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    // 新增/移位的边：蓝虚线 ghost
    const realEdges = new Map(kernel.edges().map((e) => [e.id, e]));
    for (const e of pk.edges()) {
      const a = pk.graph.pt(e.a), b = pk.graph.pt(e.b);
      const re = realEdges.get(e.id);
      if (re) {
        const ra = kernel.graph.pt(re.a), rb = kernel.graph.pt(re.b);
        if (ra.x === a.x && ra.y === a.y && rb.x === b.x && rb.y === b.y) continue;
      }
      dashedLine(a, b, "#2b6cb0");
    }
  }

  // ---- 框选矩形 ----
  if (tool === "select" && marqueeDrag && anchor && cursor) dashedRect(anchor, cursor, "#666");

  // ---- 吸附指示 + tooltip（hover 与拖拽都显示） ----
  if (snapInfo?.kind) {
    const color = SNAP_COLORS[snapInfo.kind];
    const isAxis = snapInfo.kind === "axis-x" || snapInfo.kind === "axis-y";
    if (isAxis) {
      if (anchor && cursor) dashedLine(anchor, cursor, color);
    } else {
      ctx.beginPath();
      ctx.arc(snapInfo.pt.x, snapInfo.pt.y, 5, 0, Math.PI * 2);
      ctx.lineWidth = 2;
      ctx.strokeStyle = color;
      ctx.stroke();
    }
    tooltip(SNAP_LABELS[snapInfo.kind], snapInfo.pt, color);
  }
}
function ringsEq(a: readonly Pt[], b: readonly Pt[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i].x !== b[i].x || a[i].y !== b[i].y) return false;
  return true;
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
/** 光标旁小标签（白底圆角 pill）。 */
function tooltip(text: string, at: Pt, color: string): void {
  ctx.font = "12px system-ui";
  const pad = 4;
  const tw = ctx.measureText(text).width;
  const x = at.x + 10, y = at.y - 22;
  ctx.beginPath();
  ctx.roundRect(x, y, tw + pad * 2, 18, 4);
  ctx.fillStyle = "#ffffffee";
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = color;
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.fillText(text, x + pad, y + 13);
}

// ---------- 输入 ----------
function canvasPt(ev: PointerEvent): Pt {
  const r = canvas.getBoundingClientRect();
  return { x: ev.clientX - r.left, y: ev.clientY - r.top };
}
function inferred(raw: Pt, withAnchor: Pt | null, exclude: VertexId | null = null): Pt {
  snapInfo = inferPoint(kernel, raw, withAnchor, SNAP, exclude);
  return snapInfo.pt;
}

canvas.addEventListener("pointerdown", (ev) => {
  canvas.setPointerCapture(ev.pointerId);
  const raw = canvasPt(ev);
  switch (tool) {
    case "line":
    case "rect":
      anchor = inferred(raw, null);
      cursor = anchor;
      break;
    case "move": {
      const hit = kernel.hitTest(raw, HIT);
      moveVids = moveTargets(kernel, hit);
      if (moveVids.length) {
        moveExclude = moveVids.length === 1 ? moveVids[0] : null;
        anchor = hit.vertex !== undefined ? kernel.graph.pt(hit.vertex) : raw;
        cursor = anchor;
      }
      break;
    }
    case "erase":
      scrubAcc = new Set();
      scrubPrev = raw;
      hoverEdge = null;
      scrubHits(kernel, raw, raw, HIT, scrubAcc);
      computePreview();
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
  if (!gestureActive()) {
    // ---- hover：按下之前就给 inference / 命中反馈 ----
    snapInfo = null;
    hoverEdge = null;
    hoverFace = null;
    if (tool === "line" || tool === "rect" || tool === "move") {
      snapInfo = inferPoint(kernel, raw, null, SNAP, null);
    } else if (tool === "erase") {
      hoverEdge = kernel.hitTest(raw, HIT).edge ?? null;
    } else if (tool === "eraseFace") {
      hoverFace = kernel.hitTest(raw, HIT).face ?? null;
      computePreview(); // hover 即预览会死的面
    }
    draw();
    return;
  }
  switch (tool) {
    case "line":
      if (anchor) cursor = inferred(raw, anchor);
      break;
    case "rect":
      if (anchor) cursor = inferred(raw, null); // 对角不做轴锁（锁了退化成线）
      break;
    case "move":
      if (moveVids.length && anchor) cursor = inferred(raw, anchor, moveExclude);
      break;
    case "erase":
      if (scrubPrev) {
        scrubHits(kernel, scrubPrev, raw, HIT, scrubAcc);
        scrubPrev = raw;
      }
      break;
    case "select":
      if (anchor) {
        cursor = raw;
        if (Math.hypot(raw.x - anchor.x, raw.y - anchor.y) > 4) marqueeDrag = true;
      }
      break;
    case "eraseFace":
      break;
  }
  if (tool !== "select") computePreview();
  draw();
});

canvas.addEventListener("pointerup", (ev) => {
  const raw = canvasPt(ev);
  switch (tool) {
    case "line": {
      if (!anchor) break;
      const a = anchor, b = inferred(raw, anchor);
      cancelGesture();
      if (Math.hypot(b.x - a.x, b.y - a.y) >= 2) appendLog(kernel.addEdges([[a, b]]));
      break;
    }
    case "rect": {
      if (!anchor) break;
      const segs = rectSegments(anchor, inferred(raw, null));
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
      cancelGesture();
      if (hit.face !== undefined) appendLog(kernel.eraseFaces([hit.face]));
      break;
    }
  }
  draw();
});

canvas.addEventListener("pointerleave", () => {
  if (!gestureActive()) {
    snapInfo = null;
    hoverEdge = null;
    hoverFace = null;
    preview = null;
    hintEl.textContent = HINT_DEFAULT;
    draw();
  }
});

// ---------- 键盘 ----------
window.addEventListener("keydown", (ev) => {
  if (ev.key === "Delete" || ev.key === "Backspace") {
    if (selection.faces.size || selection.edges.size) {
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

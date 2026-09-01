// lab main.ts —— 2D 肥皂膜 lab 指针接线（playground 减法版 + 预置面板）。
// created by Claude Fable 5, 2026-09-01
// 与 playground 的关系：同一颗内核、同一套 pick/render 模块；这里是 drill 仪器——
// 相机锁死顶视（2D=视角限制不是代码回滚）、无 move（parked，等人类口述 spec）、
// snap 仅脚手架三件套（endpoint/on-edge/轴锁；体系本体 parked）、事件日志 C 位、场景预置一键摆。

import { Kernel } from "../kernel/kernel.ts";
import type { EdgeId, FaceEvent, FaceId, Pt3 } from "../kernel/kernel.ts";
import { OrbitCamera, type Viewport } from "../playground/camera.ts";
import { type DrawPlane, type Snap3, GROUND, drawPlaneAt, marqueeScreen, pickEntity, snapPoint } from "../playground/pick.ts";
import { type Selection, emptySelection, rectSegmentsOnPlane } from "../playground/tools.ts";
import { Renderer3 } from "../playground/render3.ts";
import { PRESETS, applyPreset } from "./presets.ts";

const canvas = document.getElementById("board") as HTMLCanvasElement;
const logEl = document.getElementById("log")!;
const hintEl = document.getElementById("hint")!;
const tipEl = document.getElementById("tip")!;
const marqueeEl = document.getElementById("marquee")!;
const HINT_DEFAULT = "顶视 2D：右/中键拖=平移 滚轮=缩放；框选后 Delete 删除；Esc 取消";

let kernel = new Kernel();
const cam = new OrbitCamera();
// 顶视锁死：yaw=-π/2 → 世界 X=屏幕右、Y=屏幕上；pitch 差 1e-4 到 π/2，防 right() 叉积退化。
cam.yaw = -Math.PI / 2;
cam.pitch = 1.5707;
cam.halfH = 220;
const r3 = new Renderer3(canvas);

const SNAP = 8;
const HIT = 6;

type Tool = "select" | "line" | "rect" | "erase" | "eraseFace";
let tool: Tool = "line";

// ---- 瞬态 ----
let anchor3: Pt3 | null = null;
let gesturePlane: DrawPlane = GROUND;
let cursor3: Pt3 | null = null;
let snapInfo: Snap3 | null = null;
let scrubAcc = new Set<EdgeId>();
let scrubbing = false;
let selection: Selection = emptySelection();
let marqueeStart: { x: number; y: number } | null = null;
let marqueeCur: { x: number; y: number } | null = null;
let hoverEdge: EdgeId | null = null;
let hoverFace: FaceId | null = null;
let preview: Kernel | null = null;
let previewEvents: FaceEvent[] = [];
let camDrag: { x: number; y: number } | null = null;

const vp = (): Viewport => ({ w: canvas.clientWidth, h: canvas.clientHeight });
const gestureActive = (): boolean => anchor3 !== null || scrubbing || marqueeStart !== null;

// ---------- 工具切换 ----------
const toolButtons: Record<Tool, HTMLButtonElement> = {
  select: document.getElementById("toolSelect") as HTMLButtonElement,
  line: document.getElementById("toolLine") as HTMLButtonElement,
  rect: document.getElementById("toolRect") as HTMLButtonElement,
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

function cancelGesture(): void {
  anchor3 = null;
  cursor3 = null;
  snapInfo = null;
  scrubAcc = new Set();
  scrubbing = false;
  marqueeStart = marqueeCur = null;
  hoverEdge = null;
  hoverFace = null;
  preview = null;
  previewEvents = [];
  marqueeEl.style.display = "none";
  tipEl.style.display = "none";
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
function appendSep(text: string): void {
  const div = document.createElement("div");
  div.className = "sep";
  div.textContent = `── ${text} ──`;
  logEl.prepend(div);
}

// ---------- 预置面板 ----------
const presetsEl = document.getElementById("presets")!;
for (const preset of PRESETS) {
  const btn = document.createElement("button");
  btn.textContent = preset.name;
  btn.title = preset.note;
  btn.addEventListener("click", () => {
    kernel = new Kernel();
    cancelGesture();
    selection = emptySelection();
    appendSep(`预置：${preset.name}（${preset.note}）`);
    for (const events of applyPreset(kernel, preset)) appendLog(events);
    draw();
  });
  presetsEl.appendChild(btn);
}
(document.getElementById("clearAll") as HTMLButtonElement).addEventListener("click", () => {
  kernel = new Kernel();
  cancelGesture();
  selection = emptySelection();
  appendSep("清空");
  draw();
});
(document.getElementById("clearLog") as HTMLButtonElement).addEventListener("click", () => {
  logEl.textContent = "";
});

// ---------- preview（影子副本预演，机制原样） ----------
function computePreview(): void {
  preview = null;
  previewEvents = [];
  const run = (fn: (c: Kernel) => FaceEvent[]): void => {
    const c = kernel.clone();
    previewEvents = fn(c);
    preview = c;
  };
  if (tool === "line" && anchor3 && cursor3) {
    const a = anchor3, b = cursor3;
    if (dist(a, b) >= 1) run((c) => c.addEdges([[a, b]]));
  } else if (tool === "rect" && anchor3 && cursor3) {
    const segs = rectSegmentsOnPlane(gesturePlane.plane, gesturePlane.basis, anchor3, cursor3);
    if (segs.length) run((c) => c.addEdges(segs));
  } else if (tool === "erase" && scrubbing && scrubAcc.size) {
    const ids = [...scrubAcc];
    run((c) => c.eraseEdges(ids));
  } else if (tool === "eraseFace" && hoverFace !== null) {
    const id = hoverFace;
    run((c) => c.eraseFaces([id]));
  }
  hintEl.textContent = preview
    ? previewEvents.length
      ? `预览：${previewEvents.map(describeEvent).join("；")}`
      : "预览：无膜变化"
    : HINT_DEFAULT;
}
const dist = (a: Pt3, b: Pt3): number => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

// ---------- 渲染 ----------
function draw(): void {
  r3.render(kernel, cam, vp(), {
    selectionEdges: selection.edges,
    selectionFaces: selection.faces,
    scrubEdges: scrubAcc,
    hoverEdge,
    hoverFace,
    preview,
    snap: snapInfo,
    snapAnchor: anchor3,
  });
}

const SNAP_LABELS: Record<string, string> = {
  endpoint: "端点", midpoint: "中点", "on-edge": "边上", "axis-x": "X 轴", "axis-y": "Y 轴", "axis-z": "Z 轴",
};
function updateTip(clientX: number, clientY: number): void {
  if (snapInfo?.kind) {
    tipEl.textContent = SNAP_LABELS[snapInfo.kind];
    tipEl.style.display = "block";
    tipEl.style.left = `${clientX + 14}px`;
    tipEl.style.top = `${clientY - 26}px`;
  } else {
    tipEl.style.display = "none";
  }
}

// ---------- 输入 ----------
function localPt(ev: PointerEvent): { x: number; y: number } {
  const r = canvas.getBoundingClientRect();
  return { x: ev.clientX - r.left, y: ev.clientY - r.top };
}

canvas.addEventListener("contextmenu", (e) => e.preventDefault());
canvas.addEventListener("wheel", (ev) => {
  ev.preventDefault();
  cam.zoomBy(ev.deltaY > 0 ? 1.1 : 1 / 1.1);
  draw();
}, { passive: false });

canvas.addEventListener("pointerdown", (ev) => {
  canvas.setPointerCapture(ev.pointerId);
  const s = localPt(ev);
  if (ev.button === 1 || ev.button === 2) {
    camDrag = { x: s.x, y: s.y };  // 顶视锁定：右/中键一律平移，无环绕
    return;
  }
  if (ev.button !== 0) return;
  switch (tool) {
    case "line":
    case "rect": {
      gesturePlane = drawPlaneAt(kernel, cam, vp(), s.x, s.y);
      snapInfo = snapPoint(kernel, cam, vp(), s.x, s.y, SNAP, gesturePlane);
      anchor3 = snapInfo.p;
      cursor3 = anchor3;
      break;
    }
    case "erase": {
      scrubbing = true;
      scrubAcc = new Set();
      hoverEdge = null;
      const hit = pickEntity(kernel, cam, vp(), s.x, s.y, HIT);
      if (hit.edge !== undefined) scrubAcc.add(hit.edge);
      computePreview();
      break;
    }
    case "select":
      marqueeStart = s;
      marqueeCur = s;
      break;
    case "eraseFace":
      break;
  }
  draw();
});

canvas.addEventListener("pointermove", (ev) => {
  const s = localPt(ev);
  if (camDrag) {
    cam.pan(s.x - camDrag.x, s.y - camDrag.y, vp());
    camDrag = { x: s.x, y: s.y };
    draw();
    return;
  }
  if (!gestureActive()) {
    snapInfo = null;
    hoverEdge = null;
    hoverFace = null;
    if (tool === "line" || tool === "rect") {
      const plane = drawPlaneAt(kernel, cam, vp(), s.x, s.y);
      snapInfo = snapPoint(kernel, cam, vp(), s.x, s.y, SNAP, plane);
    } else if (tool === "erase") {
      hoverEdge = pickEntity(kernel, cam, vp(), s.x, s.y, HIT).edge ?? null;
    } else if (tool === "eraseFace") {
      hoverFace = pickEntity(kernel, cam, vp(), s.x, s.y, HIT).face ?? null;
      computePreview();
    }
    updateTip(ev.clientX, ev.clientY);
    draw();
    return;
  }
  switch (tool) {
    case "line":
    case "rect":
      if (anchor3) {
        snapInfo = snapPoint(kernel, cam, vp(), s.x, s.y, SNAP, gesturePlane, tool === "line" ? anchor3 : null);
        cursor3 = snapInfo.p;
      }
      break;
    case "erase": {
      const hit = pickEntity(kernel, cam, vp(), s.x, s.y, HIT);
      if (hit.edge !== undefined) scrubAcc.add(hit.edge);
      break;
    }
    case "select":
      if (marqueeStart) {
        marqueeCur = s;
        const r = canvas.getBoundingClientRect();
        const minX = Math.min(marqueeStart.x, s.x), maxX = Math.max(marqueeStart.x, s.x);
        const minY = Math.min(marqueeStart.y, s.y), maxY = Math.max(marqueeStart.y, s.y);
        Object.assign(marqueeEl.style, {
          display: "block",
          left: `${r.left + minX}px`,
          top: `${r.top + minY}px`,
          width: `${maxX - minX}px`,
          height: `${maxY - minY}px`,
        });
      }
      break;
    case "eraseFace":
      break;
  }
  if (tool !== "select") computePreview();
  updateTip(ev.clientX, ev.clientY);
  draw();
});

canvas.addEventListener("pointerup", (ev) => {
  if (camDrag) { camDrag = null; return; }
  if (ev.button !== 0) return;
  const s = localPt(ev);
  switch (tool) {
    case "line": {
      if (!anchor3) break;
      const a = anchor3;
      const b = snapPoint(kernel, cam, vp(), s.x, s.y, SNAP, gesturePlane, anchor3).p;
      cancelGesture();
      if (dist(a, b) >= 1) appendLog(kernel.addEdges([[a, b]]));
      break;
    }
    case "rect": {
      if (!anchor3) break;
      const b = snapPoint(kernel, cam, vp(), s.x, s.y, SNAP, gesturePlane).p;
      const segs = rectSegmentsOnPlane(gesturePlane.plane, gesturePlane.basis, anchor3, b);
      cancelGesture();
      if (segs.length) appendLog(kernel.addEdges(segs));
      break;
    }
    case "erase": {
      const ids = [...scrubAcc];
      cancelGesture();
      if (ids.length) appendLog(kernel.eraseEdges(ids));
      break;
    }
    case "select": {
      if (!marqueeStart || !marqueeCur) { cancelGesture(); break; }
      const additive = ev.shiftKey;
      const wasDrag = Math.hypot(marqueeCur.x - marqueeStart.x, marqueeCur.y - marqueeStart.y) > 4;
      let picked: Selection;
      if (wasDrag) {
        picked = marqueeScreen(kernel, cam, vp(), {
          minX: Math.min(marqueeStart.x, marqueeCur.x), maxX: Math.max(marqueeStart.x, marqueeCur.x),
          minY: Math.min(marqueeStart.y, marqueeCur.y), maxY: Math.max(marqueeStart.y, marqueeCur.y),
        });
      } else {
        picked = emptySelection();
        const hit = pickEntity(kernel, cam, vp(), s.x, s.y, HIT);
        if (hit.edge !== undefined) picked.edges.add(hit.edge);
        else if (hit.face !== undefined) picked.faces.add(hit.face);
      }
      if (additive) {
        for (const e of picked.edges) selection.edges.add(e);
        for (const f of picked.faces) selection.faces.add(f);
      } else {
        selection = picked;
      }
      marqueeStart = marqueeCur = null;
      marqueeEl.style.display = "none";
      break;
    }
    case "eraseFace": {
      const hit = pickEntity(kernel, cam, vp(), s.x, s.y, HIT);
      cancelGesture();
      if (hit.face !== undefined) appendLog(kernel.eraseFaces([hit.face]));
      break;
    }
  }
  draw();
});

canvas.addEventListener("pointerleave", () => {
  if (!gestureActive() && !camDrag) {
    snapInfo = null;
    hoverEdge = null;
    hoverFace = null;
    preview = null;
    tipEl.style.display = "none";
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
  r3.resize(vp(), window.devicePixelRatio || 1);
  draw();
}
window.addEventListener("resize", resize);
setTool("line");
resize();

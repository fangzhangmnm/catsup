// playground main.ts —— 3D 指针接线层（M3 升维版）。
// 分工：相机数学 camera.ts / 拾取吸附 pick.ts / three 适配 render3.ts / 工具纯逻辑 tools.ts。
// 相机操作：中键或右键拖 = 环绕；Shift+拖 = 平移；滚轮 = 缩放。左键 = 工具。
// 画线平面：手势按下时锁定（光标下的面 → 该面平面；否则地面）——吸附产出的点精确在平面上。
// preview 仍是影子副本预演（clone → 同套 mutation → diff 渲染 → 松手对真身重放）。

import { Kernel } from "../kernel/kernel.ts";
import type { EdgeId, FaceEvent, FaceId, Pt3, VertexId } from "../kernel/kernel.ts";
import { OrbitCamera, type Viewport } from "./camera.ts";
import { type DrawPlane, type Snap3, GROUND, drawPlaneAt, marqueeScreen, pickEntity, snapPoint } from "./pick.ts";
import { type Selection, emptySelection, moveTargets, rectSegmentsOnPlane, translateMoves } from "./tools.ts";
import { Renderer3 } from "./render3.ts";

const canvas = document.getElementById("board") as HTMLCanvasElement;
const logEl = document.getElementById("log")!;
const hintEl = document.getElementById("hint")!;
const tipEl = document.getElementById("tip")!;
const marqueeEl = document.getElementById("marquee")!;
const HINT_DEFAULT = "中/右键拖=环绕 Shift+拖=平移 滚轮=缩放；框选后 Delete 删除；Esc 取消";

const kernel = new Kernel();
const cam = new OrbitCamera();
const r3 = new Renderer3(canvas);

const SNAP = 8;
const HIT = 6;

type Tool = "select" | "line" | "rect" | "move" | "erase" | "eraseFace";
let tool: Tool = "line";

// ---- 瞬态 ----
let anchor3: Pt3 | null = null;          // line/rect/move 起点（世界坐标）
let gesturePlane: DrawPlane = GROUND;    // 手势按下时锁定的画线平面
let cursor3: Pt3 | null = null;
let snapInfo: Snap3 | null = null;
let moveVids: VertexId[] = [];
let moveExclude: VertexId | null = null;
let scrubAcc = new Set<EdgeId>();
let scrubbing = false;
let selection: Selection = emptySelection();
let marqueeStart: { x: number; y: number } | null = null;
let marqueeCur: { x: number; y: number } | null = null;
let hoverEdge: EdgeId | null = null;
let hoverFace: FaceId | null = null;
let preview: Kernel | null = null;
let previewEvents: FaceEvent[] = [];
let camDrag: { mode: "orbit" | "pan"; x: number; y: number } | null = null;

const vp = (): Viewport => ({ w: canvas.clientWidth, h: canvas.clientHeight });
const gestureActive = (): boolean => anchor3 !== null || moveVids.length > 0 || scrubbing || marqueeStart !== null;

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

function cancelGesture(): void {
  anchor3 = null;
  cursor3 = null;
  snapInfo = null;
  moveVids = [];
  moveExclude = null;
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

// ---------- preview ----------
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
  } else if (tool === "move" && moveVids.length && anchor3 && cursor3) {
    const delta = { x: cursor3.x - anchor3.x, y: cursor3.y - anchor3.y, z: cursor3.z - anchor3.z };
    if (dist(anchor3, cursor3) >= 0.3) {
      const moves = translateMoves(kernel, moveVids, delta);
      run((c) => c.moveVertices(moves));
    }
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
  endpoint: "端点", midpoint: "中点", "on-edge": "边上", origin: "原点",
  "axis-x": "X 轴", "axis-y": "Y 轴", "axis-z": "Z 轴",
  align: "共轴", "align-combo": "共轴角点",
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
    camDrag = { mode: ev.shiftKey ? "pan" : "orbit", x: s.x, y: s.y };
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
    case "move": {
      const hit = pickEntity(kernel, cam, vp(), s.x, s.y, HIT);
      moveVids = moveTargets(kernel, hit);
      if (moveVids.length) {
        moveExclude = moveVids.length === 1 ? moveVids[0] : null;
        gesturePlane = drawPlaneAt(kernel, cam, vp(), s.x, s.y);
        anchor3 = hit.vertex !== undefined ? kernel.graph.pt(hit.vertex)
          : snapPoint(kernel, cam, vp(), s.x, s.y, 0, gesturePlane).p;
        cursor3 = anchor3;
      }
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
    const dx = s.x - camDrag.x, dy = s.y - camDrag.y;
    if (camDrag.mode === "orbit") cam.orbit(dx, dy);
    else cam.pan(dx, dy, vp());
    camDrag = { ...camDrag, x: s.x, y: s.y };
    draw();
    return;
  }
  if (!gestureActive()) {
    // ---- hover：按下前的即时反馈 ----
    snapInfo = null;
    hoverEdge = null;
    hoverFace = null;
    if (tool === "line" || tool === "rect" || tool === "move") {
      const plane = drawPlaneAt(kernel, cam, vp(), s.x, s.y);
      snapInfo = snapPoint(kernel, cam, vp(), s.x, s.y, SNAP, plane);
      if (snapInfo.kind === null) snapInfo = { ...snapInfo, kind: null };
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
    case "move":
      if (moveVids.length && anchor3) {
        snapInfo = snapPoint(kernel, cam, vp(), s.x, s.y, SNAP, gesturePlane, anchor3, moveExclude);
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
    case "move": {
      if (!moveVids.length || !anchor3) { cancelGesture(); break; }
      const target = snapPoint(kernel, cam, vp(), s.x, s.y, SNAP, gesturePlane, anchor3, moveExclude).p;
      const delta = { x: target.x - anchor3.x, y: target.y - anchor3.y, z: target.z - anchor3.z };
      const moves = translateMoves(kernel, moveVids, delta);
      const d = Math.hypot(delta.x, delta.y, delta.z);
      cancelGesture();
      if (d >= 0.3) appendLog(kernel.moveVertices(moves));
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

// 临时 debug 钩子（诊断用，勿依赖）
(window as any).__dbg = () => ({ tool, anchor3, cursor3, snapInfo, faces: kernel.faces().length, edges: kernel.edges().length, previewOn: !!preview });
(window as any).__dbg2 = () => kernel.vertices().map((v) => {
  const s = cam.worldToScreen({ x: v.x, y: v.y, z: v.z }, vp());
  const sUp = cam.worldToScreen({ x: v.x, y: v.y, z: v.z + 60 }, vp());
  return { id: v.id, x: v.x, y: v.y, z: v.z, sx: s.x, sy: s.y, upx: sUp.x, upy: sUp.y };
});

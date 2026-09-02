// lab main.ts —— 2D 肥皂膜 lab 指针接线（playground 减法版 + 预置面板）。
// created by Claude Fable 5, 2026-09-01
// 与 playground 的关系：同一颗内核、同一套 pick/render 模块；这里是 drill 仪器——
// 相机锁死顶视（2D=视角限制不是代码回滚）、snap 仅脚手架三件套（体系本体 parked）、
// 事件日志 C 位、场景预置一键摆。move = sticky geometry 协议（spec=ai-docs/20260901-move-spec.md）：
// 拖拽纯 ghost 零裁决，松手 moveVertices 结算；选区（线面混选）优先，否则移动命中实体。
// edited by Claude Fable 5 2026-09-01（move 接入）

import { Kernel } from "../kernel/kernel.ts";
import type { EdgeId, FaceEvent, FaceId, Pt3, VertexId } from "../kernel/kernel.ts";
import { OrbitCamera, type Viewport } from "../playground/camera.ts";
import { type DrawPlane, type Snap3, GROUND, axisPlane, cameraPlane, drawPlaneAt, marqueeScreen, pickEntity, rectFirstPlane, resolveRectPlane, snapPoint } from "../playground/pick.ts";
import { type Selection, emptySelection, moveTargets, moveTargetsSelection, rectSegmentsOnPlane, translateMoves } from "../playground/tools.ts";
import { Renderer3 } from "../playground/render3.ts";
import { PRESETS } from "./presets.ts";
import { type LabOp, Journal } from "./journal.ts";
import { closestOnAxis, rayPlane } from "../playground/camera.ts";
import { add3, dot3, scale3, sub3 } from "../kernel/geom.ts";

const canvas = document.getElementById("board") as HTMLCanvasElement;
const logEl = document.getElementById("log")!;
const hintEl = document.getElementById("hint")!;
const tipEl = document.getElementById("tip")!;
const marqueeEl = document.getElementById("marquee")!;
const HINT_DEFAULT = "快捷键 Space/L/R/M/P/E；右/中键拖=环绕 Shift=平移 滚轮=缩放；Ctrl+Z/Y 撤销重做；Delete 删除；Esc 取消";

let kernel = new Kernel();
const journal = new Journal();
/** 所有改内核的用户手势走这里：记账（undo 日志）+ 应用。 */
function commitOp(op: LabOp): FaceEvent[] {
  const r = journal.commit(kernel, op);
  kernel = r.kernel;
  return r.events;
}
const cam = new OrbitCamera();
// 默认三维（user 2026-09-02 拍板：二维模式删除）——SU 式舒适初始 3/4 视角；
// 俯角抬到 35° 避开兜底阈值边界（30° 曾撞 sin=0.4999… 翻车）。
cam.pitch = 0.61;
cam.halfH = 220;
const r3 = new Renderer3(canvas);

const SNAP = 8;
const HIT = 6;

type Tool = "select" | "line" | "rect" | "move" | "pp" | "erase" | "eraseFace";
let tool: Tool = "line";

// ---- 瞬态 ----
let anchor3: Pt3 | null = null;
let gesturePlane: DrawPlane = GROUND;
let rectFixed: DrawPlane | null = null;   // 矩形首点在面上 → 与面平行锁死；否则动态（看第二点）
let cursor3: Pt3 | null = null;
let snapInfo: Snap3 | null = null;
let moveVids: VertexId[] = [];
let ppFace: FaceId | null = null;      // 推拉：被抓的膜
let ppNormal: Pt3 | null = null;
let ppH = 0;
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
let armed = false;                     // 点两下模式：第一击已落 anchor，等第二击
let canArm = false;                    // 只有鼠标解锁点两下（数位笔 tap 误触发意外连线）
let downScreen: { x: number; y: number } | null = null;
let justCommitted = false;             // 第二击 down 已落笔，紧随的 up 不再处理
// 充能制（from-point 源点登记）：hover 端点/中点停留 ≥300ms 充能，LRU 3；紫点反馈
const charged = new Map<string, Pt3>();
let dwell: { key: string; since: number } | null = null;
const alignSrcs = (): Pt3[] => [...charged.values()];
// 磁滞（防边界闪烁）：已吸住的目标，光标在其 1.5×ε 圈内不放手（只防脱出，不裁竞争切换）
const EPS_OF: Record<string, number> = {
  endpoint: 10, origin: 10, midpoint: 10, "on-edge": 7,
  "edge-align": 12, "align-combo": 12, align: 5, "axis-x": 5, "axis-y": 5, "axis-z": 5,
};
let lastSnap: Snap3 | null = null;
function applyHysteresis(sn: Snap3, sx: number, sy: number): Snap3 {
  if (sn.kind !== null) { lastSnap = sn; return sn; }
  if (lastSnap?.kind) {
    const sp = cam.worldToScreen(lastSnap.p, vp());
    if (Math.hypot(sx - sp.x, sy - sp.y) <= (EPS_OF[lastSnap.kind] ?? 8) * 1.5) return lastSnap;
  }
  lastSnap = null;
  return sn;
}
function chargePt(p: Pt3): void {
  const key = `${p.x},${p.y},${p.z}`;
  charged.delete(key);
  charged.set(key, { ...p });
  while (charged.size > 3) charged.delete(charged.keys().next().value!);
}
/** dwellMs：hover=300ms；拖动中=120ms（user 2026-09-01 拍板：无悬停设备〔如部分笔/S Pen 场景〕
 *  靠手势中路过充能兜底）。 */
function trackCharge(sn: Snap3 | null, dwellMs = 300): void {
  if (!sn || (sn.kind !== "endpoint" && sn.kind !== "midpoint")) { dwell = null; return; }
  const key = `${sn.p.x},${sn.p.y},${sn.p.z}`;
  if (charged.has(key)) { dwell = null; return; }
  const now = performance.now();
  if (!dwell || dwell.key !== key) { dwell = { key, since: now }; return; }
  if (now - dwell.since >= dwellMs) {
    chargePt(sn.p);
    dwell = null;
  }
}

const vp = (): Viewport => ({ w: canvas.clientWidth, h: canvas.clientHeight });
const gestureActive = (): boolean => anchor3 !== null || moveVids.length > 0 || scrubbing || marqueeStart !== null;

// ---------- 工具切换 ----------
const toolButtons: Record<Tool, HTMLButtonElement> = {
  select: document.getElementById("toolSelect") as HTMLButtonElement,
  line: document.getElementById("toolLine") as HTMLButtonElement,
  rect: document.getElementById("toolRect") as HTMLButtonElement,
  move: document.getElementById("toolMove") as HTMLButtonElement,
  pp: document.getElementById("toolPP") as HTMLButtonElement,
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
  moveVids = [];
  ppFace = null;
  ppNormal = null;
  ppH = 0;
  rectFixed = null;
  lastSnap = null;
  armed = false;
  canArm = false;
  downScreen = null;
  justCommitted = false;
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
    cancelGesture();
    selection = emptySelection();
    clearCharged();   // 预置=换世界，旧充能源作废
    appendSep(`预置：${preset.name}（${preset.note}）`);
    appendLog(commitOp({ op: "preset", name: preset.name }));
    draw();
  });
  presetsEl.appendChild(btn);
}
function clearCharged(): void {
  charged.clear();
  dwell = null;
  lastSnap = null;
}
(document.getElementById("clearAll") as HTMLButtonElement).addEventListener("click", () => {
  cancelGesture();
  selection = emptySelection();
  clearCharged();   // 充能点随世界一起清（2026-09-02 修：清空后紫点残留）
  appendSep("清空");
  commitOp({ op: "clear" });
  draw();
});
function doUndo(): void {
  const k2 = journal.undo();
  if (!k2) return;
  kernel = k2;
  cancelGesture();
  selection = emptySelection();
  appendSep("撤销");
  draw();
}
function doRedo(): void {
  const r = journal.redo(kernel);
  if (!r) return;
  kernel = r.kernel;
  cancelGesture();
  selection = emptySelection();
  appendSep("重做");
  appendLog(r.events);
  draw();
}
(document.getElementById("undoBtn") as HTMLButtonElement).addEventListener("click", doUndo);
(document.getElementById("redoBtn") as HTMLButtonElement).addEventListener("click", doRedo);
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

/** 矩形第二点：固定面 → 面内吸附；动态 → 平面被第二点拉动（resolveRectPlane）。 */
function rectPlaneSnap(sx: number, sy: number): Pt3 {
  if (rectFixed) {
    snapInfo = snapPoint(kernel, cam, vp(), sx, sy, SNAP, gesturePlane, null, null, alignSrcs());
    return snapInfo.p;
  }
  const r = resolveRectPlane(kernel, cam, vp(), anchor3!, sx, sy, SNAP, alignSrcs());
  gesturePlane = r.plane;
  snapInfo = r.snap;
  return r.snap.p;
}

// ---------- 渲染 ----------
/** move 拖拽纯 ghost：受牵连边按 delta 映射端点（零拓扑裁决——松手才结算）。 */
function ghostSegs(): [Pt3, Pt3][] | null {
  if (tool === "pp" && ppFace !== null && ppNormal && Math.abs(ppH) >= 0.3) {
    const rings = kernel.faceRings3(ppFace);
    if (!rings) return null;
    const d = scale3(ppNormal, ppH);
    const segs: [Pt3, Pt3][] = [];
    for (const ring of [rings.outer, ...rings.holes]) {
      for (let i = 0; i < ring.length; i++) {
        const a = ring[i], b = ring[(i + 1) % ring.length];
        segs.push([add3(a, d), add3(b, d)]);   // 顶环 ghost
        segs.push([a, add3(a, d)]);            // 竖棱 ghost
      }
    }
    return segs;
  }
  if (tool !== "move" || !moveVids.length || !anchor3 || !cursor3) return null;
  const d = { x: cursor3.x - anchor3.x, y: cursor3.y - anchor3.y, z: cursor3.z - anchor3.z };
  if (Math.hypot(d.x, d.y, d.z) < 0.3) return null;
  const moved = new Set(moveVids);
  const segs: [Pt3, Pt3][] = [];
  for (const e of kernel.edges()) {
    const inA = moved.has(e.a), inB = moved.has(e.b);
    if (!inA && !inB) continue;
    const pa = kernel.graph.pt(e.a), pb = kernel.graph.pt(e.b);
    segs.push([
      inA ? { x: pa.x + d.x, y: pa.y + d.y, z: pa.z + d.z } : pa,
      inB ? { x: pb.x + d.x, y: pb.y + d.y, z: pb.z + d.z } : pb,
    ]);
  }
  return segs;
}

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
    ghostSegs: ghostSegs(),
    charged: alignSrcs(),
  });
}

const SNAP_LABELS: Record<string, string> = {
  endpoint: "端点", midpoint: "中点", "on-edge": "边上", origin: "原点",
  "axis-x": "X 轴", "axis-y": "Y 轴", "axis-z": "Z 轴",
  align: "共轴", "align-combo": "共轴角点", "edge-align": "边上·共轴", intersection: "交点", "cross-line": "交线",
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
      if (armed && anchor3) {
        // 点两下模式第二击 = 落笔（SU 同款；线工具链式连画）
        justCommitted = true;
        if (tool === "line") {
          // 连画+出膜停（user 终裁回 SU 方案）：出膜事件（BIRTH/DIVIDE…）=铅笔自动抬起；
          // 逃生=Esc（SU 官方口径）/原地点击
          const a = anchor3;
          const b = snapPoint(kernel, cam, vp(), s.x, s.y, SNAP, gesturePlane, a, null, alignSrcs()).p;
          if (dist(a, b) < 1) { cancelGesture(); break; }
          const evs = commitOp({ op: "addEdges", segs: [[a, b]] });
          appendLog(evs);
          chargePt(a); chargePt(b);   // 落笔点自动充能（通用兜底）
          if (evs.length > 0) { cancelGesture(); break; }
          cancelGesture();
          anchor3 = b;
          cursor3 = b;
          armed = true;
          hintEl.textContent = "连画中：点下一点；出膜自动停；Esc 收笔";
        } else {
          const b = rectPlaneSnap(s.x, s.y);
          const segs = rectSegmentsOnPlane(gesturePlane.plane, gesturePlane.basis, anchor3, b);
          cancelGesture();
          if (segs.length) appendLog(commitOp({ op: "addEdges", segs }));
        }
        break;
      }
      if (tool === "rect") {
        // 元逻辑：首点被低维吸附赢走（角/边/轴）→ 平面延迟给第二点；裸落面内才锁面平行
        const r = rectFirstPlane(kernel, cam, vp(), s.x, s.y, SNAP, alignSrcs());
        rectFixed = r.fixed;
        // 自由落点=轴系统平面本体（d=0）；锚定在几何上=过锚点的轴向平面
        gesturePlane = r.fixed ?? (r.snap.kind === null ? axisPlane(cam) : cameraPlane(cam, r.snap.p));
        snapInfo = r.snap;
      } else {
        // 线的空落点兜底=学矩形（user 2026-09-01 裁决）：面上锁面；空处=摄像机挑最面向的轴平面
        const r0 = rectFirstPlane(kernel, cam, vp(), s.x, s.y, SNAP, alignSrcs());
        gesturePlane = r0.fixed ?? (r0.snap.kind === null ? axisPlane(cam) : cameraPlane(cam, r0.snap.p));
        snapInfo = r0.snap;
      }
      anchor3 = snapInfo.p;
      cursor3 = anchor3;
      armed = false;
      canArm = ev.pointerType === "mouse";
      downScreen = s;
      break;
    }
    case "pp": {
      if (armed && ppFace !== null && anchor3) {
        justCommitted = true;
        const h = ppH;
        const fid = ppFace;
        cancelGesture();
        if (Math.abs(h) >= 0.3) appendLog(commitOp({ op: "pushpull", face: fid, dist: h }));
        break;
      }
      const hit = pickEntity(kernel, cam, vp(), s.x, s.y, HIT);
      if (hit.face !== undefined) {
        const rec = kernel.planeOf(hit.face)!;
        ppFace = hit.face;
        ppNormal = rec.plane.n;
        gesturePlane = { plane: rec.plane, basis: rec.basis };
        const ray0 = cam.screenRay(s.x, s.y, vp());
        const grab = rayPlane(ray0.origin, ray0.dir, rec.plane.n, rec.plane.d);
        anchor3 = grab ?? kernel.faceRings3(hit.face)!.outer[0];
        cursor3 = anchor3;
        ppH = 0;
        armed = false;
        canArm = ev.pointerType === "mouse";
        downScreen = s;
        hintEl.textContent = "推拉中：沿法向拖或点两下落定（吸到任意点=取其高度）";
      }
      break;
    }
    case "move": {
      if (armed && moveVids.length && anchor3) {
        // 点两下模式第二击 = 放置（SU move 就是点起-移动-点放）
        justCommitted = true;
        const excl = moveVids.length === 1 ? moveVids[0] : null;
        const target = snapPoint(kernel, cam, vp(), s.x, s.y, SNAP, gesturePlane, anchor3, excl, alignSrcs()).p;
        const delta = { x: target.x - anchor3.x, y: target.y - anchor3.y, z: target.z - anchor3.z };
        const vids = moveVids;
        const d = Math.hypot(delta.x, delta.y, delta.z);
        cancelGesture();
        if (d >= 0.3) appendLog(commitOp({ op: "move", moves: translateMoves(kernel, vids, delta) }));
        break;
      }
      const hit = pickEntity(kernel, cam, vp(), s.x, s.y, HIT);
      const hasSel = selection.edges.size > 0 || selection.faces.size > 0;
      // SU 语义（user 2026-09-01）：有选区时 move 作用于选区，拾取点可以点任何地方当参考点
      moveVids = hasSel ? moveTargetsSelection(kernel, selection) : moveTargets(kernel, hit);
      if (moveVids.length) {
        gesturePlane = drawPlaneAt(kernel, cam, vp(), s.x, s.y);
        anchor3 = hit.vertex !== undefined
          ? kernel.graph.pt(hit.vertex)
          : snapPoint(kernel, cam, vp(), s.x, s.y, SNAP, gesturePlane, null, null, alignSrcs()).p;
        cursor3 = anchor3;
        armed = false;
        canArm = ev.pointerType === "mouse";
        downScreen = s;
        hintEl.textContent = hasSel ? "移动选区：参考点已拾取，拖拽或点两下放置" : "移动中…拖拽或点两下放置（纯 ghost，落点才结算）";
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
    snapInfo = null;
    hoverEdge = null;
    hoverFace = null;
    if (tool === "line" || tool === "rect" || tool === "move") {
      const plane = drawPlaneAt(kernel, cam, vp(), s.x, s.y);
      snapInfo = applyHysteresis(snapPoint(kernel, cam, vp(), s.x, s.y, SNAP, plane, null, null, alignSrcs()), s.x, s.y);
      trackCharge(snapInfo);
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
      if (anchor3) {
        snapInfo = applyHysteresis(snapPoint(kernel, cam, vp(), s.x, s.y, SNAP, gesturePlane, anchor3, null, alignSrcs()), s.x, s.y);
        trackCharge(snapInfo, 120);
        cursor3 = snapInfo.p;
      }
      break;
    case "rect":
      if (anchor3) cursor3 = rectPlaneSnap(s.x, s.y);
      break;
    case "pp":
      if (ppFace !== null && anchor3 && ppNormal) {
        const sn = snapPoint(kernel, cam, vp(), s.x, s.y, SNAP, gesturePlane, anchor3, null, alignSrcs());
        hoverFace = null;
        let ref = "";
        // 自平面滤除（user 2026-09-02：被推面自身的 rim/顶点会把 h 吸死在 0=推不动）：
        // 高度参考只收**离开原平面**的点线目标；同平面目标一律忽略走轴滑
        const offPlane = sn.kind !== null && Math.abs(dot3(sub3(sn.p, anchor3), ppNormal)) > 1e-3;
        if (offPlane) {
          snapInfo = sn;
          ppH = dot3(sub3(sn.p, anchor3), ppNormal);   // 点/线/合成目标 → 投影到法向取高
        } else {
          snapInfo = null;
          const ray1 = cam.screenRay(s.x, s.y, vp());
          const hitF = pickEntity(kernel, cam, vp(), s.x, s.y, 0.5).face;
          if (hitF !== undefined && hitF !== ppFace) {
            // 吸附到面：光标射线∩该面 → 投影法向（平行面=精确同面高度，SU 同款）
            const rec = kernel.planeOf(hitF)!;
            const q = rayPlane(ray1.origin, ray1.dir, rec.plane.n, rec.plane.d);
            if (q) {
              ppH = dot3(sub3(q, anchor3), ppNormal);
              hoverFace = hitF;
              ref = "｜取面#" + hitF + " 高度";
            }
          } else {
            const q = closestOnAxis(anchor3, ppNormal, ray1.origin, ray1.dir);
            ppH = q ? dot3(sub3(q, anchor3), ppNormal) : ppH;
          }
        }
        cursor3 = add3(anchor3, scale3(ppNormal, ppH));
        hintEl.textContent = `推拉 h = ${ppH.toFixed(1)}${ref}（松手/再点落定；Esc 取消）`;
      }
      break;
    case "move":
      if (moveVids.length && anchor3) {
        const excl = moveVids.length === 1 ? moveVids[0] : null;
        snapInfo = applyHysteresis(snapPoint(kernel, cam, vp(), s.x, s.y, SNAP, gesturePlane, anchor3, excl, alignSrcs()), s.x, s.y);
        trackCharge(snapInfo, 120);
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
  if (tool !== "select" && tool !== "move") computePreview();
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
      if (justCommitted) { justCommitted = false; break; }
      if (canArm && downScreen && Math.hypot(s.x - downScreen.x, s.y - downScreen.y) <= 4) {
        armed = true;   // 第一击是点击不是拖 → 进点两下模式
        hintEl.textContent = "移动预览，再点一下落笔；Esc 取消";
        break;
      }
      const a = anchor3;
      const b = snapPoint(kernel, cam, vp(), s.x, s.y, SNAP, gesturePlane, anchor3, null, alignSrcs()).p;
      if (dist(a, b) < 1) { cancelGesture(); break; }
      const evs = commitOp({ op: "addEdges", segs: [[a, b]] });
      appendLog(evs);
      chargePt(a); chargePt(b);   // 落笔点自动充能（通用兜底）
      if (evs.length > 0) { cancelGesture(); break; }
      cancelGesture();
      anchor3 = b;
      cursor3 = b;
      armed = true;
      hintEl.textContent = "连画中：点下一点；出膜自动停；Esc 收笔";
      break;
    }
    case "rect": {
      if (!anchor3) break;
      if (justCommitted) { justCommitted = false; break; }
      if (canArm && downScreen && Math.hypot(s.x - downScreen.x, s.y - downScreen.y) <= 4) {
        armed = true;
        hintEl.textContent = "移动预览，再点一下落矩形；Esc 取消";
        break;
      }
      const b = rectPlaneSnap(s.x, s.y);
      const segs = rectSegmentsOnPlane(gesturePlane.plane, gesturePlane.basis, anchor3, b);
      cancelGesture();
      if (segs.length) appendLog(commitOp({ op: "addEdges", segs }));
      break;
    }
    case "pp": {
      if (ppFace === null || !anchor3) { cancelGesture(); break; }
      if (justCommitted) { justCommitted = false; break; }
      if (canArm && downScreen && Math.hypot(s.x - downScreen.x, s.y - downScreen.y) <= 4) {
        armed = true;
        hintEl.textContent = "推拉中：移动定高度，再点一下落定；Esc 取消";
        break;
      }
      const h = ppH;
      const fid = ppFace;
      cancelGesture();
      if (Math.abs(h) >= 0.3) appendLog(commitOp({ op: "pushpull", face: fid, dist: h }));
      break;
    }
    case "move": {
      if (!moveVids.length || !anchor3) { cancelGesture(); break; }
      if (justCommitted) { justCommitted = false; break; }
      if (canArm && downScreen && Math.hypot(s.x - downScreen.x, s.y - downScreen.y) <= 4) {
        armed = true;   // 点起 → 移动预览 → 再点放置
        hintEl.textContent = "移动中：移动预览，再点一下放置；Esc 取消";
        break;
      }
      const excl = moveVids.length === 1 ? moveVids[0] : null;
      const target = snapPoint(kernel, cam, vp(), s.x, s.y, SNAP, gesturePlane, anchor3, excl, alignSrcs()).p;
      const delta = { x: target.x - anchor3.x, y: target.y - anchor3.y, z: target.z - anchor3.z };
      const vids = moveVids;
      const d = Math.hypot(delta.x, delta.y, delta.z);
      cancelGesture();
      if (d >= 0.3) appendLog(commitOp({ op: "move", moves: translateMoves(kernel, vids, delta) }));
      break;
    }
    case "erase": {
      const ids = [...scrubAcc];
      cancelGesture();
      if (ids.length) appendLog(commitOp({ op: "eraseEdges", ids }));
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
      if (hit.face !== undefined) appendLog(commitOp({ op: "eraseFaces", ids: [hit.face] }));
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
  if (!ev.ctrlKey && !ev.metaKey && !ev.altKey) {
    // SU 对齐（user 2026-09-02：默认对齐 SU，确实不爽再挪；WASD 留给未来 fly cam）
    const map: Record<string, Tool> = { " ": "select", l: "line", r: "rect", m: "move", p: "pp", e: "erase" };
    const t = map[ev.key.toLowerCase()];
    if (t) {
      ev.preventDefault();
      setTool(t);
      return;
    }
  }
  if ((ev.ctrlKey || ev.metaKey) && (ev.key === "z" || ev.key === "Z")) {
    ev.preventDefault();
    if (ev.shiftKey) doRedo(); else doUndo();
    return;
  }
  if ((ev.ctrlKey || ev.metaKey) && (ev.key === "y" || ev.key === "Y")) {
    ev.preventDefault();
    doRedo();
    return;
  }
  if (ev.key === "Delete" || ev.key === "Backspace") {
    if (selection.faces.size || selection.edges.size) {
      appendLog(commitOp({ op: "eraseSelection", faces: [...selection.faces], edges: [...selection.edges] }));
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

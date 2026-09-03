// lab main.ts —— 2D 肥皂膜 lab 指针接线（playground 减法版 + 预置面板）。
// created by Claude Fable 5, 2026-09-01
// 与 playground 的关系：同一颗内核、同一套 pick/render 模块；这里是 drill 仪器——
// 相机锁死顶视（2D=视角限制不是代码回滚）、snap 仅脚手架三件套（体系本体 parked）、
// 事件日志 C 位、场景预置一键摆。move = sticky geometry 协议（spec=ai-docs/20260901-move-spec.md）：
// 拖拽纯 ghost 零裁决，松手 moveVertices 结算；选区（线面混选）优先，否则移动命中实体。
// edited by Claude Fable 5 2026-09-01（move 接入）

import { Kernel } from "../kernel/kernel.ts";
import { ringVidsTolerant } from "../kernel/face-lifecycle.ts";
import type { EdgeId, FaceEvent, FaceId, Pt3, VertexId } from "../kernel/kernel.ts";
import { OrbitCamera, type Viewport } from "../playground/camera.ts";
import { type AlignHand, type DrawPlane, type Snap3, GROUND, drawPlaneAt, marqueeScreen, pickEntity, rectFirstPlane, resolveRectPlane, snapPoint } from "../playground/pick.ts";
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

let checkpoint = new Kernel();
const journal = new Journal();
/** 所有改内核的用户手势走这里：记账（undo 日志）+ 应用。 */
function commitOp(op: LabOp): FaceEvent[] {
  const r = journal.commit(checkpoint, op);
  checkpoint = r.kernel;
  revalidateCharged();
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
let live: Kernel | null = null;
let liveEvents: FaceEvent[] = [];
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

/**
 * 对齐引擎唯一世界源（user 2026-09-03 立法：**旧 snapshot 禁入对齐引擎**——push 到一半的才是真相，
 * WYSIWYG；checkpoint 只是 commit 基底/cancel 归宿）。手势中=live（中间态真相）；平时=checkpoint（即现实）。
 * 悬停预告（eraseFace hover 的 live）不算手势现实——预告吃掉自己=拾取振荡，故以 gestureActive 为界。
 * build lint 把门：src/lab 禁「对齐入口(checkpoint」旧鬼模式（字面量见 scripts/build.sh）。
 */
const liveWorld = (): Kernel => (gestureActive() ? (live ?? checkpoint) : checkpoint);
/** 基线手：checkpoint 之外的新生 vid（wip 线端/planarize 切点——追光标者）+ 工具自报的移动集。 */
function freshHand(extra?: (vid: VertexId) => boolean, opaque = false): AlignHand {
  const known = new Set(checkpoint.vertices().map((v) => v.id));
  return { has: (vid) => !known.has(vid) || (extra?.(vid) ?? false), opaque };
}

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
  ppShellVids = new Set();
  ppKnownVids = new Set();
  ppStops = [];
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
  live = null;
  liveEvents = [];
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
/** 结算后重验充能点：锚定几何（顶点/边中点）已被搬走/消灭的幽灵源自动消（2026-09-02）。 */
function revalidateCharged(): void {
  if (!charged.size) return;
  const live = new Set<string>();
  for (const v of checkpoint.vertices()) live.add(`${v.x},${v.y},${v.z}`);
  for (const e of checkpoint.edges()) {
    const a = checkpoint.graph.pt(e.a), b = checkpoint.graph.pt(e.b);
    live.add(`${(a.x + b.x) / 2},${(a.y + b.y) / 2},${(a.z + b.z) / 2}`);
  }
  for (const key of [...charged.keys()]) if (!live.has(key)) charged.delete(key);
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
  checkpoint = k2;
  revalidateCharged();
  cancelGesture();
  selection = emptySelection();
  appendSep("撤销");
  draw();
}
function doRedo(): void {
  const r = journal.redo(checkpoint);
  if (!r) return;
  checkpoint = r.kernel;
  revalidateCharged();
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

/**
 * 拖拽中的吸附世界 = **旧核 − 手中集**（2026-09-03 pp 抖动破案 v2）。
 * 铁律：吸附世界不得是 h/delta 的函数——用 live 当世界时，目标的存亡随手势参数变
 * （推到底=湮灭→高度参考消失→掉回轴滑→h 回来→目标复活→再吸…），snap(world(h))→h′
 * 无不动点=逐帧振荡（探针 P1-P3 实锤）。旧核是静态不动点；live 的静态部分与它恒等
 * （预演不新增静态几何），动态部分（手中几何+其旧位残影）由排除谓词剔除——user
 * 「不吸旧残影」的语义完整保留。手中集在落笔时从旧核拓扑一次性取，整个手势不变。
 */

/**
 * pp 双通道吸附（2026-09-03 user 拍板终形，对齐 SU）：
 * - 光标通道：世界=**中间态**（WYSIWYG 无鬼：湮灭的吸不到、切出来的吸得到），排除=落笔壳集
 *   （帽环+一步邻域=被推体自己）∪ 贴移动帽平面的点（COPY 新生帽环通吃）；不吸轴/共轴。
 * - 高度通道：h 标量对静态高度集吸附（落笔取全场景顶点沿 n 投影；杀不死→无回路）。
 * - 遮挡世界=旧核（静态面+旧位手中体，h 无关）。不动点定理见 snap-model SSoT。
 */
let ppShellVids: ReadonlySet<VertexId> = new Set();
let ppKnownVids: ReadonlySet<VertexId> = new Set();   // 落笔时旧核全体 vid（新生判定基准）
let ppStops: number[] = [];

// ---------- live（影子副本预演，机制原样） ----------
function computeLive(): void {
  live = null;
  liveEvents = [];
  const run = (fn: (c: Kernel) => FaceEvent[]): void => {
    const c = checkpoint.clone();
    liveEvents = fn(c);
    live = c;
  };
  if (tool === "line" && anchor3 && cursor3) {
    const a = anchor3, b = cursor3;
    if (dist(a, b) >= 1) run((c) => c.addEdges([[a, b]]));
  } else if (tool === "rect" && anchor3 && cursor3) {
    const segs = rectSegmentsOnPlane(gesturePlane.plane, gesturePlane.basis, anchor3, cursor3);
    if (segs.length) run((c) => c.addEdges(segs));
  } else if (tool === "move" && moveVids.length && anchor3 && cursor3) {
    const delta = { x: cursor3.x - anchor3.x, y: cursor3.y - anchor3.y, z: cursor3.z - anchor3.z };
    const vids = moveVids;
    if (Math.hypot(delta.x, delta.y, delta.z) >= 0.3) run((c) => c.moveVertices(translateMoves(checkpoint, vids, delta)));
  } else if (tool === "pp" && ppFace !== null && Math.abs(ppH) >= 0.3) {
    const fid = ppFace, h = ppH;
    run((c) => c.pushPull(fid, h));
  } else if (tool === "erase" && scrubbing && scrubAcc.size) {
    const ids = [...scrubAcc];
    run((c) => c.eraseEdges(ids));
  } else if (tool === "eraseFace" && hoverFace !== null) {
    const id = hoverFace;
    run((c) => c.eraseFaces([id]));
  }
  hintEl.textContent = live
    ? liveEvents.length
      ? `预览：${liveEvents.map(describeEvent).join("；")}`
      : "预览：无膜变化"
    : HINT_DEFAULT;
}
const dist = (a: Pt3, b: Pt3): number => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

/** 矩形第二点：固定面 → 面内吸附；动态 → 平面被第二点拉动（resolveRectPlane）。 */
function rectPlaneSnap(sx: number, sy: number): Pt3 {
  if (rectFixed) {
    snapInfo = snapPoint(liveWorld(), cam, vp(), sx, sy, SNAP, { plane: gesturePlane, alignSources: alignSrcs(), hand: freshHand() });
    return snapInfo.p;
  }
  const r = resolveRectPlane(liveWorld(), cam, vp(), anchor3!, sx, sy, SNAP, alignSrcs());
  gesturePlane = r.plane;
  snapInfo = r.snap;
  return r.snap.p;
}

// ---------- 渲染 ----------
function draw(): void {
  r3.render(checkpoint, cam, vp(), {
    selectionEdges: selection.edges,
    selectionFaces: selection.faces,
    scrubEdges: scrubAcc,
    hoverEdge,
    hoverFace,
    preview: live,
    snap: snapInfo,
    snapAnchor: anchor3,
    charged: alignSrcs(),
  });
}

const SNAP_LABELS: Record<string, string> = {
  endpoint: "端点", midpoint: "中点", "on-edge": "边上", origin: "原点",
  "axis-x": "X 轴", "axis-y": "Y 轴", "axis-z": "Z 轴",
  align: "共轴", "align-combo": "共轴角点", "edge-align": "边上·共轴", intersection: "交点", "cross-line": "交线",
  "h-stop": "高度咬合",
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
          const b = snapPoint(liveWorld(), cam, vp(), s.x, s.y, SNAP, { plane: gesturePlane, anchor: a, alignSources: alignSrcs(), hand: freshHand() }).p;
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
        const r = rectFirstPlane(liveWorld(), cam, vp(), s.x, s.y, SNAP, alignSrcs());
        rectFixed = r.fixed;
        gesturePlane = r.plane;   // 平面求解器统一出口（收敛手术 2026-09-02）
        snapInfo = r.snap;
      } else {
        // 线的空落点兜底=学矩形（user 2026-09-01 裁决）：面上锁面；空处=摄像机挑最面向的轴平面
        const r0 = rectFirstPlane(liveWorld(), cam, vp(), s.x, s.y, SNAP, alignSrcs());
        gesturePlane = r0.plane;
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
      const hit = pickEntity(liveWorld(), cam, vp(), s.x, s.y, HIT);
      if (hit.face !== undefined) {
        const rec = checkpoint.planeOf(hit.face)!;
        ppFace = hit.face;
        const fRec = checkpoint.face(hit.face)!;
        const rim = new Set([
          ...ringVidsTolerant(checkpoint.graph, fRec.outer),
          ...fRec.holes.flatMap((hh) => ringVidsTolerant(checkpoint.graph, hh)),
        ]);
        const shell = new Set(rim);
        for (const e of checkpoint.edges()) {   // 一步邻域=井壁另一端 → 被推体整只不参赛（相连邻居远端保留）
          if (rim.has(e.a)) shell.add(e.b);
          if (rim.has(e.b)) shell.add(e.a);
        }
        ppShellVids = shell;
        ppKnownVids = new Set(checkpoint.vertices().map((v) => v.id));
        ppNormal = rec.plane.n;
        gesturePlane = { plane: rec.plane, basis: rec.basis };
        const ray0 = cam.screenRay(s.x, s.y, vp());
        const grab = rayPlane(ray0.origin, ray0.dir, rec.plane.n, rec.plane.d);
        anchor3 = grab ?? checkpoint.faceRings3(hit.face)!.outer[0];
        {   // 高度通道停靠集：全场景静态顶点沿 n 的投影高度（含底环/邻面高/0；user 拍板 A 案）
          const hs = new Set<number>();
          hs.add(0);
          for (const v of checkpoint.vertices()) hs.add(Math.round(dot3(sub3(v, anchor3), rec.plane.n) * 1e6) / 1e6);
          ppStops = [...hs].sort((a, b) => a - b);
        }
        cursor3 = anchor3;
        ppH = 0;
        armed = false;
        canArm = ev.pointerType === "mouse";
        downScreen = s;
        hintEl.textContent = "推拉中：沿法向拖或点两下落定（所见即所得；吸点线=取其高度）";
      }
      break;
    }
    case "move": {
      if (armed && moveVids.length && anchor3) {
        // 点两下模式第二击 = 放置（SU move 就是点起-移动-点放）
        justCommitted = true;
        const mv = new Set(moveVids);
        const target = snapPoint(liveWorld(), cam, vp(), s.x, s.y, SNAP, { plane: gesturePlane, anchor: anchor3, alignSources: alignSrcs(), hand: freshHand((vid) => mv.has(vid)) }).p;
        const delta = { x: target.x - anchor3.x, y: target.y - anchor3.y, z: target.z - anchor3.z };
        const vids = moveVids;
        const d = Math.hypot(delta.x, delta.y, delta.z);
        cancelGesture();
        if (d >= 0.3) appendLog(commitOp({ op: "move", moves: translateMoves(checkpoint, vids, delta) }));
        break;
      }
      const hit = pickEntity(liveWorld(), cam, vp(), s.x, s.y, HIT);
      const hasSel = selection.edges.size > 0 || selection.faces.size > 0;
      // SU 语义（user 2026-09-01）：有选区时 move 作用于选区，拾取点可以点任何地方当参考点
      moveVids = hasSel ? moveTargetsSelection(checkpoint, selection) : moveTargets(checkpoint, hit);
      if (moveVids.length) {
        gesturePlane = drawPlaneAt(liveWorld(), cam, vp(), s.x, s.y);
        anchor3 = hit.vertex !== undefined
          ? checkpoint.graph.pt(hit.vertex)
          : snapPoint(liveWorld(), cam, vp(), s.x, s.y, SNAP, { plane: gesturePlane, alignSources: alignSrcs(), hand: freshHand() }).p;
        cursor3 = anchor3;
        armed = false;
        canArm = ev.pointerType === "mouse";
        downScreen = s;
        hintEl.textContent = hasSel ? "移动选区：参考点已拾取，拖拽或点两下放置" : "移动中…拖拽或点两下放置（所见即所得）";
      }
      break;
    }
    case "erase": {
      scrubbing = true;
      scrubAcc = new Set();
      hoverEdge = null;
      const hit = pickEntity(liveWorld(), cam, vp(), s.x, s.y, HIT);
      if (hit.edge !== undefined) scrubAcc.add(hit.edge);
      computeLive();
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
      const plane = drawPlaneAt(liveWorld(), cam, vp(), s.x, s.y);
      snapInfo = applyHysteresis(snapPoint(liveWorld(), cam, vp(), s.x, s.y, SNAP, { plane, alignSources: alignSrcs(), hand: freshHand() }), s.x, s.y);
      trackCharge(snapInfo);
    } else if (tool === "erase") {
      hoverEdge = pickEntity(liveWorld(), cam, vp(), s.x, s.y, HIT).edge ?? null;
    } else if (tool === "eraseFace") {
      hoverFace = pickEntity(liveWorld(), cam, vp(), s.x, s.y, HIT).face ?? null;
      computeLive();
    }
    updateTip(ev.clientX, ev.clientY);
    draw();
    return;
  }
  switch (tool) {
    case "line":
      if (anchor3) {
        snapInfo = applyHysteresis(snapPoint(liveWorld(), cam, vp(), s.x, s.y, SNAP, { plane: gesturePlane, anchor: anchor3, alignSources: alignSrcs(), hand: freshHand() }), s.x, s.y);
        trackCharge(snapInfo, 120);
        cursor3 = snapInfo.p;
      }
      break;
    case "rect":
      if (anchor3) cursor3 = rectPlaneSnap(s.x, s.y);
      break;
    case "pp":
      if (ppFace !== null && anchor3 && ppNormal) {
        const anc = anchor3, n = ppNormal;
        // 光标通道：世界=中间态（WYSIWYG 无鬼），排除=壳集∪贴移动帽平面（COPY 新生帽环通吃）；
        // 遮挡世界=旧核（静态面+旧位手中体，h 无关）；不吸轴/共轴（user：pp 不吸 xyz 轴）
        const wk = liveWorld();
        const hNow = ppH;   // live 由它而建 → 谓词与世界同代
        // pp 手（opaque=帽挡背后=SU 连续）：壳集 ∪（**新生 vid** ∧ 贴移动帽平面——COPY 帽环通吃）。
        // 静态老 vid 永不按 h 排除（恰在 h 高度的静态目标吸到即被排=回路复发，探针 P5）；切环=新生但静态高度 → 保留
        const hand: AlignHand = {
          has: (vid) => ppShellVids.has(vid) ||
            (!ppKnownVids.has(vid) && Math.abs(dot3(sub3(wk.graph.pt(vid), anc), n) - hNow) < 0.01),
          opaque: true,
        };
        const sn = applyHysteresis(
          snapPoint(wk, cam, vp(), s.x, s.y, SNAP, { plane: gesturePlane, anchor: anc, lines: false, hand }),
          s.x, s.y);
        hoverFace = null;
        let ref = "";
        if (sn.kind !== null) {
          snapInfo = sn;
          ppH = dot3(sub3(sn.p, anc), n);   // 光标目标 → 投影法向取高
          ref = `｜取${SNAP_LABELS[sn.kind] ?? sn.kind}高度`;
        } else {
          snapInfo = null;
          const ray1 = cam.screenRay(s.x, s.y, vp());
          // 取面高度也查现实 SSoT（user 2026-09-03 立法「遮挡必须用现实的 SSoT，不要用旧鬼」）：
          // 旧核在下推时「新帽↔旧帽之间的空气带」里还有鬼墙鬼帽=push 吸鬼案真身。
          // 现实世界拾取 + 手中膜跳过 + ∥推向的面拒收（其"高度"随光标漂=垃圾）
          const hitF = pickEntity(wk, cam, vp(), s.x, s.y, 0.5).face;
          const hitRec = hitF !== undefined ? wk.planeOf(hitF) : undefined;
          const hitHand = hitF !== undefined && (() => {
            const f = wk.face(hitF);
            if (!f) return true;
            return [...ringVidsTolerant(wk.graph, f.outer), ...f.holes.flatMap((hh) => ringVidsTolerant(wk.graph, hh))].some(hand.has);
          })();
          if (hitF !== undefined && hitF !== ppFace && !hitHand && hitRec && Math.abs(dot3(hitRec.plane.n, n)) > 0.05) {
            const q = rayPlane(ray1.origin, ray1.dir, hitRec.plane.n, hitRec.plane.d);
            if (q) {
              ppH = dot3(sub3(q, anc), n);
              hoverFace = hitF;
              ref = "｜取面#" + hitF + " 高度";
            }
          } else {
            const q = closestOnAxis(anc, n, ray1.origin, ray1.dir);
            if (q) ppH = dot3(sub3(q, anc), n);
            // 高度通道：h 标量对静态高度集咬合（ε=7px 折算世界单位；底面/邻面/0 全在停靠集里）
            const sc0 = cam.worldToScreen(anc, vp());
            const sc1 = cam.worldToScreen(add3(anc, n), vp());
            const pxPerUnit = Math.max(Math.hypot(sc1.x - sc0.x, sc1.y - sc0.y), 0.5);
            const epsH = 7 / pxPerUnit;
            let best: number | null = null;
            for (const st of ppStops) if (Math.abs(st - ppH) <= epsH && (best === null || Math.abs(st - ppH) < Math.abs(best - ppH))) best = st;
            if (best !== null) {
              ppH = best;
              ref = `｜高度咬合 ${best.toFixed(1)}`;
              snapInfo = { p: add3(anc, scale3(n, ppH)), kind: "h-stop" };
            }
          }
        }
        cursor3 = add3(anc, scale3(n, ppH));
        hintEl.textContent = `推拉 h = ${ppH.toFixed(1)}${ref}（松手/再点落定；Esc 取消）`;
      }
      break;
    case "move":
      if (moveVids.length && anchor3) {
        const mv = new Set(moveVids);
        snapInfo = applyHysteresis(snapPoint(liveWorld(), cam, vp(), s.x, s.y, SNAP, { plane: gesturePlane, anchor: anchor3, alignSources: alignSrcs(), hand: freshHand((vid) => mv.has(vid)) }), s.x, s.y);
        trackCharge(snapInfo, 120);
        cursor3 = snapInfo.p;
      }
      break;
    case "erase": {
      const hit = pickEntity(liveWorld(), cam, vp(), s.x, s.y, HIT);
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
  if (tool !== "select") computeLive();
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
      const b = snapPoint(liveWorld(), cam, vp(), s.x, s.y, SNAP, { plane: gesturePlane, anchor: anchor3, alignSources: alignSrcs(), hand: freshHand() }).p;
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
        hintEl.textContent = "移动中：所见即所得预览，再点一下放置；Esc 取消";
        break;
      }
      const mv = new Set(moveVids);
      const target = snapPoint(liveWorld(), cam, vp(), s.x, s.y, SNAP, { plane: gesturePlane, anchor: anchor3, alignSources: alignSrcs(), hand: freshHand((vid) => mv.has(vid)) }).p;
      const delta = { x: target.x - anchor3.x, y: target.y - anchor3.y, z: target.z - anchor3.z };
      const vids = moveVids;
      const d = Math.hypot(delta.x, delta.y, delta.z);
      cancelGesture();
      if (d >= 0.3) appendLog(commitOp({ op: "move", moves: translateMoves(checkpoint, vids, delta) }));
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
        picked = marqueeScreen(checkpoint, cam, vp(), {
          minX: Math.min(marqueeStart.x, marqueeCur.x), maxX: Math.max(marqueeStart.x, marqueeCur.x),
          minY: Math.min(marqueeStart.y, marqueeCur.y), maxY: Math.max(marqueeStart.y, marqueeCur.y),
        });
      } else {
        picked = emptySelection();
        const hit = pickEntity(liveWorld(), cam, vp(), s.x, s.y, HIT);
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
      const hit = pickEntity(liveWorld(), cam, vp(), s.x, s.y, HIT);
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
    live = null;
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

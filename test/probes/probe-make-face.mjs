// 造面（Blender F；统筹插队单 11-13，user 重做小屋子卡在 F）。created 2026-11-13 by Claude Opus 5.5
// 自由建模里的网格体，键盘 F（和右键「造面（F）」同一条命令）：
// ① 去掉顶面的盒子选那一圈点 → 补一张 ② 顶上三个点（沿边的链）→ 接上两头 ③ 两条不相邻的边 → 四边形 ④ 散的点 → 一圈 ⑤ 两个点 → 一条边
//   每格：自检干净、一步撤销回到原样
// 拒绝：点不够 / 会挂三张面 / 共线——说了原因、历史一步不多（「不在同一个网格体里」碰不到：自由建模进的是一个网格体，选区只在这一个里）
// 画过的方块删一张面再 F 补上 = 新面没有画、别的面的角上的值一格不变
// 强行对称开着：补右半边的洞 = 左半边跟着补
// 右键菜单里有「造面（F）」
// 跑法：python3 -m http.server 8765 后 node test/probes/probe-make-face.mjs [url]
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 1000, height: 800 } });
page.setDefaultTimeout(4000);
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(process.argv.slice(2).find((a) => a.startsWith("http")) ?? "http://127.0.0.1:8765/", { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1200);
const res = await page.evaluate(async () => {
  const e = globalThis.__catsup.editor, hud = globalThis.__catsup.hud, P = (x, y, z = 0) => ({ x, y, z }), sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const key = (k, code, more = {}) => window.dispatchEvent(new KeyboardEvent("keydown", { key: k, code, bubbles: true, cancelable: true, ...more }));
  const S = () => e.scene, out = {};
  e.setGrid({ ...e.grid, on: false });
  const box = (x0, y0, z0, x1, y1, z1) => { const B = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], segs = []; for (let i = 0; i < 4; i++) { const a = B[i], d = B[(i + 1) % 4]; segs.push([P(a[0], a[1], z0), P(d[0], d[1], z0)]); segs.push([P(a[0], a[1], z1), P(d[0], d[1], z1)]); segs.push([P(a[0], a[1], z0), P(a[0], a[1], z1)]); } e.addSegments(segs, "box"); };
  box(0, 0, 0, 1, 1, 1); e.selectAll(); e.runAction("brep.orientOutward", { curvature: 3 }); e.makeComponent("块"); e.runAction("object.toMesh"); await sleep(20);
  const inst = [...S().def(S().root).instances.values()][0], def = inst.def, m = () => S().mesh(def).kernel;
  e.cam.setView("iso"); e.zoomExtents(); e.draw();
  e.selectedPools.clear(); e.selectedPools.set(`i${inst.id}`, { kind: "instance", instance: inst.id }); e.enterSelected(); await sleep(20);
  hud.pick("select"); await sleep(10);
  const near = (p, q) => Math.abs(p.x - q.x) < 1e-6 && Math.abs(p.y - q.y) < 1e-6 && Math.abs(p.z - q.z) < 1e-6;
  const vAt = (q) => m().verts().find((v) => near(m().pt(v), q));
  const faceAt = (z) => m().faces().find((f) => m().faceVerts(f).every((v) => Math.abs(m().pt(v).z - z) < 1e-6));
  const snap = () => JSON.stringify({ v: m().verts().map((v) => m().pt(v)), f: m().faces().map((f) => m().faceVerts(f)), w: m().edges().filter((x) => m().isWire(x)) });
  const sel = (o) => { e.deselectAll(); const z = e.selection; for (const v of o.verts ?? []) z.verts.add(v); for (const x of o.edges ?? []) z.edges.add(x); e.draw(); };
  const F = async () => { key("f", "KeyF"); await sleep(40); };
  const hint = () => hud.status?.() ?? document.getElementById("hint")?.textContent ?? "";
  // 拿掉顶面（一步），后面每格都从这里开始
  e.commitOp({ op: "meshDelete", def, faces: [faceAt(1)] }); await sleep(20);
  const T = [P(0, 0, 1), P(1, 0, 1), P(1, 1, 1), P(0, 1, 1)].map(vAt);   // 本地坐标：盒子造在 0..1，转网格体时原点可能挪到中心 → 下面按本地坐标重新找
  const L = m().verts().map((v) => m().pt(v)), cx = (Math.min(...L.map((p) => p.x)) + Math.max(...L.map((p) => p.x))) / 2, cy = (Math.min(...L.map((p) => p.y)) + Math.max(...L.map((p) => p.y))) / 2, zt = Math.max(...L.map((p) => p.z));
  const top = [P(cx - 0.5, cy - 0.5, zt), P(cx + 0.5, cy - 0.5, zt), P(cx + 0.5, cy + 0.5, zt), P(cx - 0.5, cy + 0.5, zt)].map(vAt);
  out.setup = { top, T };
  const cell = async (name, select, extra) => {
    const before = snap(), f0 = m().faceCount();
    sel(select); const steps = e.history.steps(); await F();   // 步数从选好之后数（前面的「取消选择」是它自己的一步）
    const r = { dSteps: e.history.steps() - steps, dFaces: m().faceCount() - f0, check: m().check().join(";"), hint: hint() };
    if (extra) Object.assign(r, extra());
    e.undo(); await sleep(20); r.undone = snap() === before;
    out[name] = r;
  };
  await cell("fill", { verts: top });
  await cell("chain", { verts: top.slice(0, 3) });
  await cell("quad", { edges: [m().edgeOf(top[0], top[1]), m().edgeOf(top[2], top[3])] });
  // 散的点：盒子旁边加四个点（一步），选它们
  { const zb = Math.min(...L.map((p) => p.z)), src = m().verts().filter((v) => Math.abs(m().pt(v).z - zb) < 1e-6).slice(0, 4), v0 = new Set(m().verts());
    e.commitOp({ op: "meshDuplicate", def, verts: src });   // 底下四个点各复制一份（散点，叠在原处）→ 挪到盒子旁边、打乱顺序
    const fresh = m().verts().filter((v) => !v0.has(v)), spots = [P(cx + 2, cy, zb), P(cx + 3, cy + 1, zb), P(cx + 2, cy + 1, zb), P(cx + 3, cy, zb)];
    e.commitOp({ op: "meshMove", def, moves: fresh.map((v, i) => ({ v, to: spots[i] })) }); await sleep(10); }
  out.pointsSetup = m().verts().length;
  const loose = m().verts().filter((v) => !m().vEdges(v).length);
  if (loose.length >= 3) await cell("points", { verts: loose });
  else out.points = { skipped: `没加成散点（${loose.length}）` };
  await cell("edge", { verts: [top[0], top[2]] }, () => ({ wire: m().edgeOf(top[0], top[2]) >= 0 && m().isWire(m().edgeOf(top[0], top[2])) }));
  // 拒绝
  const refuse = async (name, select) => { const before = snap(); sel(select); const steps = e.history.steps(); await F(); out[name] = { dSteps: e.history.steps() - steps, same: snap() === before, hint: hint() }; };
  { const zb = Math.min(...L.map((p) => p.z)), bc = vAt(P(cx - 0.5, cy - 0.5, zb)); await refuse("few", { verts: [bc] }); }   // 底角的点：周围全是两边有面的边 = 不在洞边上（顶上开口那一圈的点现在 = 顺着填拐角三角，v0.19.107）
  const bot = m().verts().filter((v) => Math.abs(m().pt(v).z - Math.min(...L.map((p) => p.z))) < 1e-6);
  await refuse("three", { verts: [bot[0], bot[1], top[2]].filter((x) => x !== undefined) });
  // 共线：一条边的两端 + 边中点（劈出来）
  { const ed = m().edgeOf(top[0], top[1]); e.commitOp({ op: "meshLoopCut", def, edge: m().edges().find((x) => Math.abs(m().pt(m().edgeA[x]).z - m().pt(m().edgeB[x]).z) > 0.5), t: 0.5 }); await sleep(10);
    const mid = m().verts().find((v) => Math.abs(m().pt(v).z - (zt + Math.min(...L.map((p) => p.z))) / 2) < 1e-6 && Math.abs(m().pt(v).x - (cx - 0.5)) < 1e-6 && Math.abs(m().pt(v).y - (cy - 0.5)) < 1e-6);
    const lowA = m().verts().find((v) => near(m().pt(v), P(cx - 0.5, cy - 0.5, Math.min(...L.map((p) => p.z)))));
    await refuse("collinear", { verts: [top[0], mid, lowA].filter((x) => x !== undefined) }); e.undo(); await sleep(10); void ed; }
  // 右键菜单里有「造面（F）」
  { sel({ verts: top.slice(0, 3) }); const items = e.commandMenu?.("contextBar")?.map?.((x) => x.label ?? x.id) ?? null; out.menu = items; }
  // 画过：所有面开始画 → 删一张侧面 → 选那一圈 F → 新面没有画、别的面角上的值一格不变
  { for (let i = 0; i < 3; i++) { e.undo(); await sleep(10); }   // 退掉挪散点、复制散点、拿顶面这三步：盒子封闭
    const g = () => crypto.randomUUID();
    e.commitOp({ op: "startPaint", def, faces: m().faces(), uvSet: g(), textureGuid: g(), materialGuid: g(), names: { uvSet: "UV", paint: "画", material: "画" }, color: [0.3, 0.5, 0.7], density: 100 }); await sleep(20);
    const mat = (f) => m().column("material_index")?.data[f];
    const corners = (f) => m().cornerCols.map((c) => Array.from(m().cornerValues(f, c.id) ?? []).map((x) => (Number.isNaN(x) ? "nan" : x.toFixed(6))).join(",")).join("|");
    const side = m().faces().find((f) => m().faceVerts(f).some((v) => Math.abs(m().pt(v).z - zt) < 1e-6) && !m().faceVerts(f).every((v) => Math.abs(m().pt(v).z - zt) < 1e-6));
    const ring = m().faceVerts(side), paintedMat = mat(side);
    e.commitOp({ op: "meshDelete", def, faces: [side] }); await sleep(10);
    const others = new Map(m().faces().map((f) => [f, corners(f)]));
    sel({ verts: [...ring] }); const steps = e.history.steps(); await F();
    const nf = m().faces().find((f) => !others.has(f));
    out.paint = { dSteps: e.history.steps() - steps, newFace: nf !== undefined, newMat: nf !== undefined ? mat(nf) : null, paintedMat, othersSame: [...others].every(([f, c]) => corners(f) === c), check: m().check().join(";"), hint: hint() };
  }
  // 强行对称：开着（X 轴），右半边挖一个洞（删右侧面）→ 选那一圈 F → 两边都补上
  { const steps0 = e.history.steps(); e.setMirror("force", 0); await sleep(20);
    const right = m().faces().find((f) => m().faceVerts(f).every((v) => m().pt(v).x > cx + 0.49)), left = () => m().faces().find((f) => m().faceVerts(f).every((v) => m().pt(v).x < cx - 0.49));
    const ringR = right !== undefined ? m().faceVerts(right) : [];
    e.commitOp({ op: "meshDelete", def, faces: [right] }); await sleep(20);
    const leftGone = left() === undefined;
    sel({ verts: [...ringR] }); await F();
    out.mirror = { leftGoneAfterDelete: leftGone, rightBack: m().faces().some((f) => m().faceVerts(f).every((v) => m().pt(v).x > cx + 0.49)), leftBack: left() !== undefined, check: m().check().join(";"), steps: e.history.steps() - steps0, hint: hint() };
  }
  return out;
});
await b.close();
const ok = [], bad = [], chk = (n, c, d) => (c ? ok : bad).push(`${n}${c ? "" : "  ← " + JSON.stringify(d)}`);
const R = res;
for (const [k, label] of [["fill", "① 一圈点 = 补一张"], ["chain", "② 沿边的三个点 = 接上两头"], ["quad", "③ 两条不相邻的边 = 四边形"], ["points", "④ 散的点 = 一圈"]]) {
  const r = R[k]; chk(`${label}：多一张面、自检干净、一步、撤销回原样`, r && r.dFaces === 1 && r.check === "" && r.dSteps === 1 && r.undone, r);
}
chk("⑤ 两个点 = 一条裸线、一步、撤销回原样", R.edge && R.edge.wire && R.edge.dSteps === 1 && R.edge.dFaces === 0 && R.edge.undone, R.edge);
chk("拒绝：只选一个不在洞边上的点（说了「不在洞边上」、一步不多、没动；v0.19.107 起不再只说「点不够」）", R.few.dSteps === 0 && R.few.same && /不在洞边上/.test(R.few.hint), R.few);
chk("拒绝：会挂三张面", R.three.dSteps === 0 && R.three.same && /三张面/.test(R.three.hint), R.three);
chk("拒绝：共线", R.collinear.dSteps === 0 && R.collinear.same && /一条线上/.test(R.collinear.hint), R.collinear);
chk("右键菜单里有「造面（F）」", Array.isArray(R.menu) && R.menu.some((x) => String(x).includes("造面")), R.menu);
chk("画过的盒子删面再 F：一步、新面没有画、别的面角上的值一格不变、自检干净", R.paint.dSteps === 1 && R.paint.newFace && R.paint.newMat !== R.paint.paintedMat && R.paint.othersSame && R.paint.check === "", R.paint);
chk("强行对称：右边补上、左边跟着补", R.mirror.leftGoneAfterDelete && R.mirror.rightBack && R.mirror.leftBack && R.mirror.check === "", R.mirror);
chk("没有脚本错误", errs.length === 0, errs);
for (const s of ok) console.log("✓", s);
for (const s of bad) console.log("✗", s);
process.exit(bad.length ? 1 : 0);

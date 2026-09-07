// created by Claude Fable 5, 2026-09-03
// 2026-09-06 进仓（由 tools/ gitignored 区搬来）；用法：node --experimental-strip-types test/probes/probe-snap-jitter.mts
// 探针（临时，不进 test 套件）：逐 px 步进光标，抓吸附 kind/p 的 A→B→A 翻转与跳变
import { Kernel } from "../../src/kernel/kernel.ts";
import { OrbitCamera } from "../../src/editor/camera.ts";
import { GROUND, snapPoint } from "../../src/editor/pick.ts";
import { ringVidsTolerant } from "../../src/kernel/face-lifecycle.ts";
import type { Pt3 } from "../../src/kernel/kernel.ts";

const VP = { w: 800, h: 600 };
const TOL = 8;
function box(k: Kernel, x0: number, y0: number, w: number, d: number, h: number): number {
  const pts = [{x:x0,y:y0,z:0},{x:x0+w,y:y0,z:0},{x:x0+w,y:y0+d,z:0},{x:x0,y:y0+d,z:0}];
  const ev = k.addEdges([0,1,2,3].map(i=>[pts[i],pts[(i+1)%4]] as [Pt3,Pt3]));
  const fid = k.faces().find(f=>true)!.id;   // 单面场景
  k.pushPull(fid, h);
  return fid;
}
function march(label: string, k: Kernel, cam: OrbitCamera, from: Pt3, to: Pt3, n: number,
               anchor: Pt3|null, excl: ((v:number)=>boolean)|null, aligns: Pt3[]|null): void {
  let prev = ""; const seq: {i:number,kind:string,p:Pt3}[] = [];
  for (let i=0;i<=n;i++) {
    const t=i/n;
    const wpt = { x: from.x+(to.x-from.x)*t, y: from.y+(to.y-from.y)*t, z: from.z+(to.z-from.z)*t };
    const s = cam.worldToScreen(wpt, VP);
    const r = snapPoint(k, cam, VP, s.x, s.y, TOL, { plane: GROUND, anchor, hand: excl ? { has: excl, opaque: false } : null, alignSources: aligns ?? undefined });
    const kk = r.kind ?? "·";
    if (kk !== prev) { seq.push({i, kind: kk, p: r.p}); prev = kk; }
  }
  const kinds = seq.map(x=>x.kind);
  // 真抖检测：同 kind 且同目标点（p 相近）在 ≤6 步窗口内 A→B→A
  const near=(a:Pt3,b:Pt3)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z)<2;
  const flips: string[] = [];
  for (let i=2;i<kinds.length;i++)
    if (kinds[i]===kinds[i-2] && kinds[i]!==kinds[i-1] && near(seq[i].p,seq[i-2].p) && seq[i].i-seq[i-2].i<=6)
      flips.push(`${kinds[i-2]}→${kinds[i-1]}→${kinds[i]}@${seq[i].i}`);
  console.log(`\n== ${label} ==`);
  console.log("序列:", seq.map(x=>`${x.kind}@${x.i}(${x.p.x.toFixed(0)},${x.p.y.toFixed(0)},${x.p.z.toFixed(0)})`).join(" "));
  console.log(flips.length ? "⚡真抖: "+flips.join(", ") : "无同目标短窗横跳");
}

// S1: hover 沿世界 X 轴，从盒子前方横穿盒子背后区域
{
  const k = new Kernel();
  box(k, 40, 20, 30, 30, 25);   // 盒子挡住 X 轴一段（默认视角从 -y 侧看，轴 y=0 在盒子(y:20..50)前面? 试深一点）
  const cam = new OrbitCamera(); cam.target = {x:50,y:20,z:10}; cam.halfH = 80;
  // 世界 X 轴 y=0：默认视角 eyeDir 有 -y 分量 → 轴在盒子前 → 不被挡。改成从 +y 侧看：yaw 反转
  cam.yaw = cam.yaw + Math.PI;   // 从背面看 → 世界 X 轴(y=0) 被盒子(y:20..50)挡住 x:40..70 段
  march("S1 hover 沿世界X轴（背面视角，轴被盒子挡40..70段）", k, cam,
    {x:10,y:0,z:0},{x:100,y:0,z:0}, 180, null, null, null);
}

// S2: pp 拖拽中，邻居盒子在旁边，沿推拉方向(Z)推顶面；光标沿邻居盒子边缘扫
{
  const k = new Kernel();
  const fid = box(k, 0, 0, 40, 40, 30);            // 被推的盒子（顶面 z=30）
  box2(k);                                          // 邻居
  function box2(k: Kernel){ const pts=[{x:80,y:0,z:0},{x:120,y:0,z:0},{x:120,y:40,z:0},{x:80,y:40,z:0}];
    k.addEdges([0,1,2,3].map(i=>[pts[i],pts[(i+1)%4]] as [Pt3,Pt3]));
    const f=k.faces().find(f=>{const r=k.faceRings3(f.id)!;return r.outer.every(p=>p.x>=79);})!.id; k.pushPull(f,50); }
  const top = k.faces().find(f=>{const r=k.faceRings3(f.id)!;return r.outer.every(p=>Math.abs(p.z-30)<1e-6);})!.id;
  // 影子副本：pp 到 h=10
  const pv = k.clone(); pv.pushPull(top, 10);
  const f2 = pv.faces().find(f=>{const r=pv.faceRings3(f.id)!;return r.outer.every(p=>Math.abs(p.z-40)<1e-6);});
  const hand = new Set<number>();
  if (f2) { const fr = pv.faces().find(x=>x.id===f2.id)!; /* ring vids via graph */ }
  // 手中集=z=40 的顶点
  for (const v of pv.vertices()) if (Math.abs(v.z-40)<1e-6) hand.add(v.id);
  const known = new Set(k.vertices().map(v=>v.id));
  const excl = (vid:number)=> hand.has(vid) || !known.has(vid);
  const cam = new OrbitCamera(); cam.target = {x:60,y:20,z:25}; cam.halfH = 90;
  const anchor = {x:20,y:20,z:30};
  // 光标沿 Z 从 25 扫到 55（推拉取高参考路径），x 固定在邻居盒子左棱附近
  march("S2 pp拖拽 光标沿邻居盒左棱竖扫（影子世界+手中集）", pv, cam,
    {x:80,y:0,z:20},{x:80,y:0,z:55}, 140, anchor, excl, null);
  // S2b: 光标横扫过邻居盒子顶棱高度（z=50），看 endpoint/edge/axis 竞争
  march("S2b pp拖拽 光标沿 z=50 横扫（邻居顶棱高度）", pv, cam,
    {x:70,y:0,z:50},{x:130,y:0,z:50}, 120, anchor, excl, null);
}

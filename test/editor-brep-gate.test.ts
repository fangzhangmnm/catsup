// 编辑器本体的「两种身体」路由守卫（周账 F-126 第一刀；设计 ai-docs/20261029-editor-split-design.md §2）。created 2026-10-29 by Claude Fable 5.1
// ① 直读硬表面内核（this.kernel）只准出现在**登记过**的 brep 专属方法里（每条带一句为什么它只会在硬表面池里跑）；新冒出来的 = 红，逼人想一下：
//    这个方法在网格体池里会不会被调到？会 → 读显示契约（activeView / KernelView），别读内核（v0.16.24 selectionWorldPoints 的坑）。
// ② 体重棘轮：editor.ts 的行数只准降（切出去一块就把 PIN 调低；要往里加大东西先想想该不该住别处）。
import { describe, it, eq, assert } from "./runner.mjs";
const fs = (await import("node:fs" as string)) as { readFileSync(p: string, enc: string): string }, url = (await import("node:url" as string)) as { fileURLToPath(u: URL): string };
const src = fs.readFileSync(url.fileURLToPath(new URL("../src/editor/editor.ts", import.meta.url)), "utf8");

/** brep 专属方法登记表：方法名 → 为什么它只会在硬表面池里跑（守门在哪）。 */
const BREP_ONLY: Readonly<Record<string, string>> = {
  selectExpandIn: "进来先 activeKind() !== brep → selectExpandView（显示契约那条路）",
  selectionInfo: "曲线 / 曲面是 brep 的概念：activeKind() !== brep 先返 null",
  weldSelection: "requireBrep(「焊接」)",
  explodeCurveSelection: "requireBrep(「炸开曲线」)",
  deleteSelectionStep: "网格体分支先走 mesh.delete；几何分支 requireBrep(「删除几何」)",
  makeGroup: "requireBrep(「建组 / 建组件」)",
  makeComponentStep: "网格体分支先走 makeMeshComponentStep；剩下 requireBrep",
  hideSelectionStep: "if (activeKind() === brep) 里面才读；实例的藏走注册表 object.hide（两种身体）",
  paintFaces: "油漆桶只在硬表面 / 表面工作台（modes 表：自由建模没有 paint）",
  pickMaterialOf: "同上（吸色是油漆桶的 Alt）",
  softenEdges: "平滑组 = 硬表面边层（自由建模的平滑归 mesh/edge-smooth.ts）",
  softenByAngle: "同上",
  softenSelection: "同上",
  beginMirror: "requireBrep(「镜像」)（网格体的镜像走 mesh/mirror.ts + 物件窗口）",
  freshHand: "硬表面工具的推断之手（求解器）；网格体工具不推断（stance snap: off）、不叫它",
  computeLive: "预演失败的黑匣子一行：activeKind() === brep 才带 brep 快照（网格体池不带——以前在 catch 里再抛一次，真错误进不了黑匣子）",
  shadowKernel: "影子内核 = 硬表面拖动预演「拷一次 + 每帧倒回」；previewApply 只在硬表面池调它，网格体每帧拷一份",
  previewXform: "硬表面移动 / 旋转 / 缩放的预演；网格体的在 tools/mesh-transform.ts",
  readoutText: "进来先 activeKind() !== brep → 显示契约那条路（数面 / 点、量边长）",
  makeToolCtx: "ctx.kernel() 给硬表面工具（modes/geometry.ts）；自由建模工具用 ctx.mesh()",
  copyPayload: "硬表面移动 + Ctrl 复制的载荷（tools/move.ts 那条）",
  xformMoveOp: "硬表面移动 / 旋转 / 缩放的 move op（commitXform 和预演共用；网格体走 meshMove）",
};
/** 体重棘轮（行数）：切出去一块就往下调；只准降。 */
const LINE_PIN = 4060;   // 2026-11-13 第 1 版第五节第 5 条：进一层的那一段并成 enterIn、加 newChild（−2）→ 4060；2026-11-13 锁的一轮第二步：先锁（armLock、选择上的锁交给下一把）拿掉、轴键接线放进现有行 → 4062；2026-11-13：一步全有或全无（锁着的拒绝也回滚、收尾写原因、docRevision、重做停放）+18，修复 / 擦线的话搬去 repair-say.ts −10 → 4066（按这条测试的数法）；v0.19.50：抬笔结算搬去 controller/lift-settle.ts、加事件时间（−24）→ 4070；v0.19.47：setTool 不再自己换工作台、找工作台搬去 modes/index.ts workbenchOf（加 ownerModeOf、setTool 那一段变短，净 0）；施工单十六：上下文人话 / 面包屑搬去 context-crumbs.ts（−15）、加 selectedMeshFaces（+2）、setMirror 查轴（+1）→ 4094；1-7 工作台的登记挪去 modes/index.ts（−3）、画画的口（+0：并进原来那几行）→ 4107；1-8a 复现包「上一步」搬去 last-step.ts（−14）、画的撤销接线（两个宿主钩子、登记 / 挂记录 / 只有记录的一步 / 摘记录 / 没做成的提示，+13）→ 4110；1-4b 选择中心的算法搬去 point-center.ts（−7）、加「准备」那一步的钩子（+3）→ 4111；v0.19.4 蘸材质搬去 paint-material.ts（贴图主线 1-0½）→ 4114；v0.18.45 强行对称第 1–5 层（+）、强行对称编排搬去 mirror-force.ts、吸附放手容差表搬去 snap-hysteresis.ts、trySymmetrize 搬去 mesh/mirror.ts（−）→ 4121；v0.18.42 选中参考几何搬出选区（+）、describeEvent 搬去 describe-event.ts（−）→ 4139（含末尾空行）；v0.16.57 = 4183；v0.17.44 X 光面点的画法删了 → 4157；v0.17.46 网格开关搬去 grid-state.ts + 删三个没人调的私有方法 → 4154；v0.17.3 断口刻度切去 break-ticks.ts + 流提供者接线 → 4170；v0.17.9 叠加层回调不再手递 → 4168（含末尾空行）；切一刀调低一次

describe("编辑器本体：两种身体的路由（F-126 第一刀）", () => {
  it("this.kernel 只出现在登记过的 brep 专属方法里；登记表里的方法都还在", () => {
    const lines = src.split("\n");
    const hdr = /^  (?:private |async |get |set )*([A-Za-z_][A-Za-z0-9_]*)\s*(?:<[^>]*>)?\(.*\{\s*$/;
    let cur = "", bad: string[] = []; const seen = new Set<string>();
    lines.forEach((l, i) => {
      const m = hdr.exec(l); if (m) cur = m[1];
      const code = l.replace(/\/\/.*$/, "");   // 行尾注释里提到它不算
      if (!/this\.kernel\b/.test(code) || /^  get kernel\(\)/.test(l)) return;
      seen.add(cur);
      if (!(cur in BREP_ONLY)) bad.push(`${i + 1}: ${cur || "?"} — ${l.trim().slice(0, 80)}`);
    });
    eq(bad.join("\n"), "", "没登记的 this.kernel 直读（登记到 test/editor-brep-gate.test.ts BREP_ONLY，写清为什么它只在硬表面池里跑；会进网格体池的改读显示契约）");
    for (const name of Object.keys(BREP_ONLY)) assert(seen.has(name), `登记表里的 ${name} 已经不读内核了（或改名了）：把它从表里删掉`);
  });
  it("没有 pointerType 冒充起手方式的残留；requireBrep 还是那个守门", () => {
    assert(!/pointerType\s*[!=]==?\s*"keyboard"/.test(src), "起手方式走 ToolPointer.start（F-125）");
    assert(/private requireBrep\(verb: string\): boolean/.test(src));
  });
  it(`体重棘轮：editor.ts ≤ ${LINE_PIN} 行（切出去一块就把 PIN 调低；只准降）`, () => {
    const n = src.split("\n").length;
    assert(n <= LINE_PIN, `editor.ts 现在 ${n} 行 > ${LINE_PIN}：别往本体里加，住到该住的模块去（设计稿 §3 切法）`);
  });
});

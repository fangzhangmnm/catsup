// 三维能碰画画内核的哪些口：机器查的白名单（贴图主线 1-4b，统筹 11-11：「把『三维能碰画画内核的哪些口』做成机器查的白名单……表外的 = 红……以后只许我点头才加」）。
// src/paint/kernel 以外的代码（src/ 和 test/）从内核 import 的每一个模块和名字都要在下面的表里。表就是「画画内核对宿主的口」那张清单的机器版。
// 依赖只有一个方向：三维用内核，内核不知道三维（内核那边的守卫 = paint-kernel-guard.test.ts 拦手改、画画仓 kernel-boundary.test.mjs 拦内核往外 import）。
// PENDING = 现在用着、但不在统筹列的那几类里的：照样放行，但每次跑都点名，等统筹定删 / 搬 / 留（清单在施工单（十一）的施工记录里）。
// created 2026-11-11 by Claude Opus 5.5
import { describe, it, eq } from "./runner.mjs";
const fs = (await import("node:fs" as string)) as { readFileSync(p: string, enc: string): string; readdirSync(p: string): string[]; statSync(p: string): { isDirectory(): boolean } };
const path = (await import("node:path" as string)) as { join(...p: string[]): string; dirname(p: string): string; resolve(...p: string[]): string; relative(a: string, b: string): string; sep: string };

const KERNEL = "src/paint/kernel/";
/** 统筹列的那几类（11-11）：模块（相对 src/paint/kernel/）→ 名字。 */
const ALLOWED: Readonly<Record<string, readonly string[]>> = {
  // 一笔的手感（0-6）
  "src/backend/stroke-core.ts": ["StrokeCore", "PathPlacer", "StrokePath"],
  "src/common/resolved-brush.ts": ["ResolvedBrush", "resolveBrush"],
  // 档口和薄层的输入（0-5）
  "src/backend/stroke-session.ts": ["StrokeSession", "StrokeSessionDeps", "HostLayerInput"],
  "src/backend/gl/gl-room.ts": ["HostOverlayInput"],
  // 只合成（0-5）
  "src/shell/gl-board.ts": ["GLBoard"],
  "src/backend/gl/gl-doc-bridge.ts": ["DocNode"],
  // 撤销步（0-2）
  "src/backend/workpiece/undo-stack.ts": ["StepSink", "UndoStack"],
  "src/backend/workpiece/hosted-steps.ts": ["HostedSteps", "StepHost"],
  // 建在别人的画面上 / 交出贴图句柄 / 外面的图进内核的门（0-4、v0.14.75）
  "src/shell/browser-gl2-port.ts": ["BrowserGl2Port"],
  "src/common/gl2-port.ts": ["Gl2Port", "PooledFBO", "ExternalImage", "ExternalTexture"],
  // 公式的文本（笔尖边缘的曲线：GLSL 片段和同一算式的 JavaScript）
  "src/backend/gl/stamp-falloff.ts": ["stampFalloff", "STAMP_FALLOFF_GLSL"],
};
/** 待定：现在用着、不在上面那几类里的（统筹定删 / 搬 / 留之前照样放行，跑的时候点名）。 */
const PENDING: Readonly<Record<string, readonly string[]>> = {
  "src/backend/workpiece/painting-workpiece.ts": ["PaintingWorkpiece", "PaintingData"],   // 画板 = 内核的一份作品（1-3c 施工单定的）
  "src/backend/workpiece/layer-tree.ts": ["isGroupNode", "TreeNode"],   // 画板把作品的树转成合成器那棵（可以改成内核给一个「作品 → 合成输入」）
  "src/backend/gl/gl-room.ts": ["poolCapacityForBudget"],   // 图块池的预算换算（内核内部的；可以删，三维给一个数）
  "src/backend/soft-gl2-port.ts": ["SoftGl2Port"],   // 只在测试里：不带浏览器时交薄层、走预览 / 落层 / 撤销
  "src/backend/workpiece/painting-view.ts": ["PaintingView"],   // 档口要的叶（ViewLeaf）从它拿（1-4b 画板开档口）
  "src/backend/tiles/tile-layer.ts": ["LayerPixels"],   // 档口落层回调里那一层的像素（类型）
  "src/backend/gl/gl-stamp.ts": ["GLStampRasterizer"],   // 只在对拍测试里（space-vs-kernel2d：三维的薄层 vs 内核二维的笔尖）
};

const walk = (dir: string): string[] => fs.readdirSync(dir).flatMap((n) => { const p = path.join(dir, n); return fs.statSync(p).isDirectory() ? (p.replace(/\\/g, "/").startsWith(KERNEL.slice(0, -1)) || n === "node_modules" || n === "vendor" ? [] : walk(p)) : /\.(ts|mts|mjs)$/.test(n) ? [p] : []; });
const strip = (s: string): string => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");

/** 每一处从内核 import 的：文件、模块（相对 src/paint/kernel/）、名字。 */
function kernelImports(): { file: string; mod: string; names: string[] }[] {
  const out: { file: string; mod: string; names: string[] }[] = [];
  for (const f of [...walk("src"), ...walk("test")]) {
    const src = strip(fs.readFileSync(f, "utf8"));
    for (const m of src.matchAll(/import\(\s*["']([^"']+)["']\s*\)/g)) { const abs = path.relative(".", path.resolve(path.dirname(f), m[1])).replace(/\\/g, "/"); if (abs.startsWith(KERNEL)) out.push({ file: f.replace(/\\/g, "/"), mod: abs.slice(KERNEL.length), names: ["import(…)"] }); }   // 写在类型里的 import("…") 也算：表里没有「import(…)」这个名字 = 红
    for (const m of src.matchAll(/import\s+(type\s+)?(\{[^}]*\}|\*\s+as\s+\w+|\w+)?\s*(?:,\s*(\{[^}]*\}))?\s*from\s*["']([^"']+)["']/g)) {
      const spec = m[4];
      if (!spec.startsWith(".")) continue;
      const abs = path.relative(".", path.resolve(path.dirname(f), spec)).replace(/\\/g, "/");
      if (!abs.startsWith(KERNEL)) continue;
      const names = [m[2], m[3]].filter(Boolean).flatMap((g) => (g!.startsWith("{") ? g!.slice(1, -1).split(",").map((x) => x.trim().replace(/^type\s+/, "").split(/\s+as\s+/)[0]).filter(Boolean) : [g!.trim()]));
      out.push({ file: f.replace(/\\/g, "/"), mod: abs.slice(KERNEL.length), names });
    }
  }
  return out;
}

describe("三维能碰画画内核的哪些口（白名单）", () => {
  it("src/paint/kernel 以外从内核 import 的每个模块和名字都在表里（表外的 = 红）", () => {
    const bad: string[] = [], pending = new Set<string>();
    for (const { file, mod, names } of kernelImports()) for (const n of names) {
      if (ALLOWED[mod]?.includes(n)) continue;
      if (PENDING[mod]?.includes(n)) { pending.add(`${mod} ${n}`); continue; }
      bad.push(`${file}: ${mod} → ${n}`);
    }
    if (pending.size) console.log(`  待定（在用、等统筹定）：${[...pending].sort().join("；")}`);
    eq(bad.join("\n"), "", "表外的口");
  });
  it("表里的模块都存在、名字都真的从那个模块导出（表不许烂）", () => {
    const missing: string[] = [];
    for (const [mod, names] of Object.entries({ ...PENDING, ...ALLOWED })) {
      let src = "";
      try { src = fs.readFileSync(KERNEL + mod, "utf8"); } catch { missing.push(`${mod}（文件没了）`); continue; }
      for (const n of names) if (!new RegExp(`export\\s+(?:declare\\s+)?(?:abstract\\s+)?(?:class|function|const|let|interface|type|enum)\\s+${n}\\b|export\\s*\\{[^}]*\\b${n}\\b`).test(src)) missing.push(`${mod} ${n}`);
    }
    for (const [mod, names] of Object.entries(PENDING)) if (ALLOWED[mod]) for (const n of names) if (ALLOWED[mod].includes(n)) missing.push(`${mod} ${n}（两张表都有）`);
    eq(missing.join("；"), "");
  });
});

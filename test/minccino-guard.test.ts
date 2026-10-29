// Minccino 引擎的边界守卫（骨架稿 v2 §6 步 2；src/minccino/README.md 的四条，机械执法）。created 2026-10-29 by Claude Fable 5.1
// ① three 围栏（棘轮）：仓里 import three 的文件只准在 src/minccino/backend/three/ 或登记在册的旧漏点里；名单只准变短、登记了却不再漏 = 红。
// ② 引擎零 three：src/minccino/ 里 backend/three/ 之外不出现 three 的 import / `THREE.`。
// ③ 引擎不认识编辑器：src/minccino/ 不 import ../editor ../scene ../kernel ../mesh ../app ../format ../player ../controller；backend/ 之外零 DOM。
// ④ pass 代码不判设备：graph/ overlay/ material/ backend/ 里不出现 userAgent / 平台名 / 机型名（设备只以代价表 + 能力位进来；量设备以后住 device.ts）。
// ⑤ frame graph 规划器：拓扑排序 + 没人要的剪掉 + 环 / 双写者抛。
// ⑥ 轮廓线 shader 源 = vendored LineMaterial 顶点着色器 + PROFILE_PATCHES（逐字；升级 three 漂了立刻红）。
// ③′ 过渡期棘轮：backend/three/render3.ts 还 import 内容层（编辑器 / 场景 / 内核），条数只准降，步 6 叠加层契约落地后清零。
import { describe, it, eq, assert } from "./runner.mjs";
import { planFrame } from "../src/minccino/graph/frame-graph.ts";
import { PROFILE_LINE_VERTEX, applyProfilePatches } from "../src/minccino/backend/three/profile-line-shader.ts";
const fs = (await import("node:fs" as string)) as { readdirSync(u: URL, o: { withFileTypes: true }): { name: string; isDirectory(): boolean }[]; readFileSync(u: URL, enc: "utf8"): string };

const SRC = new URL("../src/", import.meta.url);
function* walk(dir: URL): Generator<{ rel: string; text: string }> {
  for (const d of fs.readdirSync(dir, { withFileTypes: true })) {
    const u = new URL(d.isDirectory() ? `${d.name}/` : d.name, dir);
    if (d.isDirectory()) { if (d.name !== "vendor") yield* walk(u); }
    else if (/\.ts$/.test(d.name) && !/\.d\.ts$/.test(d.name)) yield { rel: u.href.slice(SRC.href.length), text: fs.readFileSync(u, "utf8") };
  }
}
const files = [...walk(SRC)];
/** 去掉注释再查（注释里提到 iPad / three 不算）。 */
const code = (t: string): string => t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "").replace(/\s\/\/(?![^"'`\n]*["'`]).*$/gm, "");
const engine = files.filter((f) => f.rel.startsWith("minccino/"));
const IMPORTS_THREE = /^import[^;]*from\s+["'](three|\.\.?\/.*vendor\/three)/m;

/** ① 登记在册的旧漏点（步 5 把 render3 搬进 backend/three/ 后清零；只准变短）。 */
const THREE_LEAKS: readonly string[] = [];

describe("minccino 守卫 ① three 围栏（棘轮）", () => {
  const leakers = files.filter((f) => IMPORTS_THREE.test(f.text)).map((f) => f.rel);
  it("import three 的文件 ⊆ backend/three/ ∪ 名单", () => {
    const bad = leakers.filter((r) => !r.startsWith("minccino/backend/three/") && !THREE_LEAKS.includes(r));
    assert(bad.length === 0, `three 越界：${bad.join(", ")}（three 只准在 src/minccino/backend/three/；旧漏点名单在 test/minccino-guard.test.ts）`);
  });
  it("名单不发霉：登记了的还在漏", () => {
    const stale = THREE_LEAKS.filter((r) => !leakers.includes(r));
    assert(stale.length === 0, `这些文件已经不 import three 了，从 THREE_LEAKS 划掉：${stale.join(", ")}`);
  });
});

describe("minccino 守卫 ② 引擎零 three", () => {
  it("backend/three/ 之外没有 three", () => {
    const bad = engine.filter((f) => !f.rel.startsWith("minccino/backend/three/") && (IMPORTS_THREE.test(f.text) || /\bTHREE\./.test(f.text))).map((f) => f.rel);
    assert(bad.length === 0, `引擎里出现 three：${bad.join(", ")}`);
  });
});

describe("minccino 守卫 ③ 引擎不认识编辑器、零 DOM", () => {
  const FORBIDDEN = /^import[^;]*from\s+["']\.\.?\/(\.\.\/)*(editor|scene|kernel|mesh|app|format|player|controller)\//gm;
  /** ③′ 过渡期棘轮：搬进来的 render3 还 import 内容层的条数（只准降，步 6 做完清零）。 */
  const TRANSITIONAL: Readonly<Record<string, number>> = { "minccino/backend/three/render3.ts": 18 };   // 步 5 = 19 → 6a = 18（guide-pick 走了）
  it("不 import 编辑器 / 场景 / 内核 / app（过渡期名单除外）", () => {
    const bad = engine.filter((f) => !(f.rel in TRANSITIONAL) && FORBIDDEN.test(f.text)).map((f) => f.rel);
    assert(bad.length === 0, `引擎 import 了仓里的内容层：${bad.join(", ")}（引擎只认 contract/ 里自己的同形类型）`);
  });
  it("③′ 过渡期名单：内容层 import 条数只准降", () => {
    for (const [rel, pin] of Object.entries(TRANSITIONAL)) {
      const f = engine.find((x) => x.rel === rel);
      assert(!!f, `${rel} 不在了，把它从 TRANSITIONAL 划掉`);
      const n = (f!.text.match(FORBIDDEN) ?? []).length;
      assert(n <= pin, `${rel} import 内容层 ${n} 条 > 棘轮 ${pin}：别往后端里加编辑器 / 场景的依赖`);
      eq(n, pin, `${rel} 内容层 import 降到 ${n} 条了，把棘轮调到 ${n}`);
    }
  });
  it("backend/ 之外零 DOM", () => {
    const bad = engine.filter((f) => !f.rel.startsWith("minccino/backend/") && /\b(document|window|navigator)\./.test(code(f.text))).map((f) => f.rel);
    assert(bad.length === 0, `引擎碰了 DOM：${bad.join(", ")}`);
  });
});

describe("minccino 守卫 ④ pass 代码不判设备", () => {
  const DEVICE = /navigator\.(userAgent|platform|maxTouchPoints|deviceMemory|hardwareConcurrency|getBattery)|\b(iPad|iPhone|Android|Quest|Macintosh|Windows NT|Safari|Chrome)\b/;
  it("graph/ overlay/ material/ backend/ 里没有设备判断", () => {
    const bad = engine.filter((f) => /^minccino\/(graph|overlay|material|backend)\//.test(f.rel) && DEVICE.test(code(f.text))).map((f) => f.rel);
    assert(bad.length === 0, `pass 代码判了设备：${bad.join(", ")}（代价表是数据，不是 if；量设备住 minccino/device.ts）`);
  });
});

describe("minccino 守卫 ⑥ 轮廓线 shader 源逐字 = vendored LineMaterial + PROFILE_PATCHES", () => {
  it("字面量没漂（改了 PROFILE_PATCHES 或升级 three 后跑 scripts/gen-profile-line-shader.mjs）", () => {
    const lm = fs.readFileSync(new URL("vendor/three/addons/lines/LineMaterial.js", SRC), "utf8");
    const m = /vertexShader:\s*\/\* glsl \*\/`([\s\S]*?)`,\s*\n\s*fragmentShader:/.exec(lm);
    assert(!!m, "LineMaterial.js: vertexShader literal not found");
    eq(PROFILE_LINE_VERTEX === applyProfilePatches(m![1]), true, "profile-line-shader.ts 的 PROFILE_LINE_VERTEX 和 vendored 源 + 替换不一样");
    assert(PROFILE_LINE_VERTEX.includes("float lw = linewidth + ( isProfile ? profileAdd : 0.0 );"), "轮廓加粗那行不在 shader 里");
  });
});

describe("minccino ⑤ frame graph 规划器", () => {
  const passes = [
    { id: "geom", reads: ["stream"], writes: ["color", "depth"] },
    { id: "edges", reads: ["stream", "depth"], writes: ["edges"] },
    { id: "bloom", reads: ["color"], writes: ["bloom"] },
    { id: "composite", reads: ["color", "edges", "bloom"], writes: ["frame"] },
    { id: "overlay", reads: ["frame", "depth"], writes: ["final"] },
  ];
  it("要 final = 全跑，依赖在前", () => {
    const p = planFrame(passes, ["final"]);
    eq(p.pruned.length, 0);
    const at = (id: string) => p.order.indexOf(id);
    assert(at("geom") < at("edges") && at("geom") < at("bloom") && at("edges") < at("composite") && at("bloom") < at("composite") && at("composite") < at("overlay"), p.order.join(" → "));
  });
  it("只要 edges = bloom / composite / overlay 剪掉（没人要的产物不产）", () => {
    const p = planFrame(passes, ["edges"]);
    eq([...p.order].sort().join(), "edges,geom");
    eq([...p.pruned].sort().join(), "bloom,composite,overlay");
  });
  it("要一个外部输入 = 什么都不跑", () => { eq(planFrame(passes, ["stream"]).order.length, 0); });
  it("追加画：要 frame = 写者 + 全部追加者，追加者按声明顺序排在写者后；不在列表里的（X 光关着）就不存在", () => {
    const P = (xray: boolean) => [
      { id: "scene", reads: ["stream"], writes: ["frame"] },
      { id: "grid", appends: ["frame"] },
      { id: "overlay", reads: ["stream", "editor"], appends: ["frame"] },
      ...(xray ? [{ id: "xray", reads: ["stream"], appends: ["frame"] }] : []),
      { id: "thumb", reads: ["frame"], writes: ["thumbnail"] },
    ];
    const a = planFrame(P(true), ["frame"]);
    eq(a.order.join(">"), "scene>grid>overlay>xray"); eq(a.pruned.join(), "thumb");
    const b = planFrame(P(false), ["frame"]);
    eq(b.order.join(">"), "scene>grid>overlay");
    eq(planFrame(P(true), ["thumbnail"]).order.join(">"), "scene>grid>overlay>xray>thumb");   // 读 frame = 先把追加者都跑完
    eq(planFrame([{ id: "hud", appends: ["canvas"] }], ["canvas"]).order.join(), "hud");   // 往外部目标（画布）上追加也行
  });
  it("环 = 抛；双写者 = 抛", () => {
    let threw = false; try { planFrame([{ id: "a", reads: ["y"], writes: ["x"] }, { id: "b", reads: ["x"], writes: ["y"] }], ["x"]); } catch { threw = true; }
    assert(threw, "环没抛");
    threw = false; try { planFrame([{ id: "a", writes: ["x"] }, { id: "b", writes: ["x"] }], ["x"]); } catch { threw = true; }
    assert(threw, "双写者没抛");
  });
});

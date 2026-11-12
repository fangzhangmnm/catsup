// 工具里不许再有写死的世界长度门槛（统筹 11-12 定的规矩，B；起因 = user 做 3D 打印小零件，写死的 1 厘米让 1 厘米以下的东西画不出、拖不动）。created 2026-11-12 by Claude Opus 5.5
// 规矩：拖出来的东西「动没动」按屏幕像素判（gesture-consts.ts gestureMinLen）；吸到的、取整出来的、键入的数只要几何上成立（GEOM_MIN_LEN = 内核身份分辨率 3 µm）。
// 白名单：gesture-consts.ts 里 gestureMinLen 在没有屏幕投影的帧（VR）退回 MIN_GESTURE_LEN——没有屏幕就没有像素可按。
import { describe, it, eq, assert } from "./runner.mjs";
import { GEOM_MIN_LEN, longEnough } from "../src/editor/gesture-consts.ts";
import { STICKY_R } from "../src/kernel/subdivide.ts";
const fs = (await import("node:fs" as string)) as { readFileSync(u: URL, enc: "utf8"): string; readdirSync(u: URL, o: { recursive: boolean }): string[] };
const ROOT = new URL("../src/editor/", import.meta.url);
const code = (src: string): string => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");   // 去掉注释（注释里提到旧名字没事）
const files = fs.readdirSync(ROOT, { recursive: true }).filter((f) => f.endsWith(".ts"));

describe("工具里没有写死的世界长度门槛", () => {
  it("src/editor 下（除 gesture-consts.ts）不出现 MIN_GESTURE_LEN / TAPE_MIN / AXES_MIN", () => {
    const bad = files.filter((f) => f !== "gesture-consts.ts" && /\b(MIN_GESTURE_LEN|TAPE_MIN|AXES_MIN)\b/.test(code(fs.readFileSync(new URL(f, ROOT), "utf8"))));
    eq(bad.join(", "), "", "这些文件还在用写死的门槛");
  });
  it("工具里也不许另起一个「XXX_MIN = 0.0…」这种写死的世界长度门槛（要用就问 gestureMinLen / GEOM_MIN_LEN）", () => {
    // 只管工具（tools/ 和工具的纯几何 *-geom.ts）：修复窗的参数默认值（如 repairs/cleanup 的「短于 1 毫米的边并成点」）是人在面板里改的数，不是手势门槛
    const bad: string[] = [];
    for (const f of files) {
      if (f === "gesture-consts.ts" || !(f.startsWith("tools/") || f.endsWith("-geom.ts"))) continue;
      for (const m of code(fs.readFileSync(new URL(f, ROOT), "utf8")).matchAll(/\b(?:const|let)\s+([A-Z][A-Z0-9_]*_(?:MIN|LEN))\s*=\s*0?\.0\d/g)) bad.push(`${f}: ${m[1]}`);
    }
    eq(bad.join("；"), "");
  });
  it("gesture-consts.ts 里 MIN_GESTURE_LEN 只在 gestureMinLen 的 VR 退路用（白名单，理由写在注释里）", () => {
    const src = code(fs.readFileSync(new URL("gesture-consts.ts", ROOT), "utf8"));
    const uses = [...src.matchAll(/MIN_GESTURE_LEN/g)].length;
    eq(uses, 2, "定义一处 + gestureMinLen 里退回一处");
    assert(/return w === null \? MIN_GESTURE_LEN : ctx\.eps\(\)\.drag \* w;/.test(src), "退路的写法");
  });
  it("几何容差 = 内核身份分辨率；吸到的只看它", () => {
    eq(GEOM_MIN_LEN, STICKY_R);
    const ctx = { frame: () => ({}) as never, vp: () => ({}) as never, eps: () => ({ drag: 4 }) as never, currentSnap: () => ({ kind: "endpoint" }) };
    eq(longEnough(ctx, { x: 0, y: 0, z: 0 }, 1e-5), true, "吸到的 10 µm = 够");
    eq(longEnough(ctx, { x: 0, y: 0, z: 0 }, 1e-6), false, "1 µm = 不成立");
  });
});

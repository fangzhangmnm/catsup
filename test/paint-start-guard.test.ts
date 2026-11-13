// 「开始画」那一张的守卫（贴图主线 1-3b 第七节第 9 条 + 总规矩「存盘落地之前是抛」）。读仓里的源码。created 2026-11-10 by Claude Opus 5.5
//   ① 读贴图 layout 的只有一处（format/document.ts paintIn；读写文件的 texture-table.ts 只是原样搬运）。
//   ② uvSets 只经这一张的两条指令加和改（editor/paint-ops.ts：startPaint 加、meshLayoutPaint 换高）。
//   ③ 「带着画的面现在还搬不了」的判断只有一个函数（scene/paint.ts paintMoveBlocked），第六节那几处 + 统筹 11-10 加的两处都调它。
//   ④ 写盘：贴图坐标 1-2½ 起真的写（内核里有一列、贴图坐标表里没有那一行 = 内部出了错，整份写盘抛）；分层的贴图没有字节照旧抛（1-8 换成真的写之前不许悄悄丢）。
//   ⑤ 收尾只有一条路：编辑器 commitIn 用 upkeepRewrite / upkeepSnapshot / upkeepAfter，不再直接调 forceSnapshot / forceAfter。
//   ⑦ 贴图坐标只经 scene/uv.ts（施工单十八第 1½ 刀）：内核问列 / 取值 / 写值的口（cornerValues / faceValue / setCornerValues / setFaceValue / hasColumn / columnDef）在 src 里只有 src/mesh/ 和 scene/uv.ts 调（整张面搬到别的内核时整列照搬的 columnDefs / columnsOf / ensureColumns 不认意思，不在此列）；
//      那两列的名字只在 scene/uv.ts 出现。起因：拿排法的 GUID 当列名去问内核类型上过得去、永远拿到 null（第 1½ 刀施工时抓到渲染那边一处、测试里一处）。
import { describe, it, eq, assert } from "./runner.mjs";
const { readdirSync, readFileSync, statSync } = (await import("node:fs" as string)) as { readdirSync(p: string): string[]; readFileSync(p: string, enc: string): string; statSync(p: string): { isDirectory(): boolean } };
const { join } = (await import("node:path" as string)) as { join(...p: string[]): string };

const files = (() => { const out: string[] = []; const walk = (d: string): void => { for (const n of readdirSync(d)) { const p = join(d, n); if (statSync(p).isDirectory()) { if (p !== join("src", "paint", "kernel")) walk(p); } else if (/\.ts$/.test(n)) out.push(p); } }; walk("src"); return out.sort(); })();
const code = (f: string): string => readFileSync(f, "utf8").split("\n").map((l: string) => l.replace(/(^|[^:"'`])\/\/.*$/, "$1")).join("\n");
const hitsOf = (re: RegExp): string[] => files.flatMap((f) => ((code(f).match(re) ?? []).length ? [f] : []));
/** ops.ts 里某一条 case 的正文（截到下一条 case）。 */
const caseBody = (src: string, name: string): string => { const i = src.indexOf(`case "${name}":`); assert(i >= 0, `ops.ts 里有 case "${name}"`); const j = src.indexOf("\n    case \"", i + 10); return src.slice(i, j < 0 ? undefined : j); };

describe("开始画：守卫（1-3b）", () => {
  it("① 读贴图 layout 的只有 paintIn（document.ts）；texture-table.ts 只原样搬运；只看在不在（=== / !== undefined：一行上 sizeM 和 layout 正好一个、三个问法对称，施工单二十一第 3 刀）不算读", () => {
    // 第一步（宽）：出现 .layout 的文件——连只看在不在的写法也算——只许是这两个（别处写 `t.layout !== undefined` 当「是不是画」用 = 红：全仓只有一个问法）
    eq(hitsOf(/\.layout\b(?!\s*\()/g).join(","), [join("src", "format", "document.ts"), join("src", "format", "texture-table.ts")].sort().join(","), "出现 .layout 的文件");
    // 第二步（窄）：document.ts 里每一处真读（不只是看在不在）都在 paintIn 里
    const READ = /\.layout\b(?!\s*\(|\s*[!=]==\s*undefined)/g;
    const doc = code(join("src", "format", "document.ts")), ats = [...doc.matchAll(READ)].map((m) => m.index!);
    assert(ats.length >= 1, "document.ts 里至少一处（paintIn）");
    // 施工单十八：layout 的形状只在 document.ts 这三个口里读（paintIn = 「这个材质是不是画」、paintUvSetOfRow = 「这一行挂在哪套排法上」、isOldPaintRow = 「是不是旧存法的画」）
    for (const at of ats) { const fn = Math.max(...["export function paintIn(", "export function paintUvSetOfRow(", "export function isOldPaintRow("].map((h) => doc.lastIndexOf(h, at))); assert(fn > 0 && !doc.slice(fn, at).includes("\n}\n"), `document.ts 第 ${doc.slice(0, at).split("\n").length} 行那一处在那三个口里`); }
  });
  it("② 场景的排法表只在 paint-ops.ts 里加和改（startPaint 加一行、meshLayoutPaint 换高）；src/format/ 是读写文件那一层（读文件时建、粘贴落地时新建），scene.ts 只有两处克隆整张拷，不算", () => {
    const sc = code(join("src", "scene", "scene.ts"));
    eq([...sc.matchAll(/\.uvSets\.(set|delete|clear)\(|\.uvSets\s*=[^=]/g)].length, [...sc.matchAll(/\.uvSets = new Map\(this\.uvSets\)/g)].length, "scene.ts 里写排法表的只有整张拷（两处克隆）");
    eq([...sc.matchAll(/\.uvSets = new Map\(this\.uvSets\)/g)].length, 2, "两处：骨架克隆、整份克隆");
    eq(hitsOf(/\.uvSets\.(set|delete|clear)\(|\.uvSets\s*=[^=]/g).filter((f) => !f.startsWith(join("src", "format") + "/") && f !== join("src", "scene", "scene.ts")).join(","), join("src", "editor", "paint-ops.ts"), "写 uvSets 的文件");
    const src = code(join("src", "editor", "paint-ops.ts")), writes = [...src.matchAll(/\.uvSets\.set\(/g)].length;
    eq(writes, 2, "两处：startPaint、meshLayoutPaint");
  });
  it("③ 拒绝的判断只有一个函数；第六节那几处（并物件 / 分成新物件 / 变成独立的 / 粘贴）+ 炸开网格体组件 + 网格体转硬表面 + 拷贝都调它", () => {
    eq(hitsOf(/export function paintMoveBlocked\(/g).join(","), join("src", "scene", "paint.ts"));
    eq(hitsOf(/带着画的面现在还不能/g).join(","), join("src", "scene", "paint.ts"), "原因的字只在那一处");   // 1-7 起说人话：「这些面上有画：带着画的面现在还不能……（这个功能还没做）」
    const ops = code(join("src", "editor", "ops.ts"));
    for (const c of ["mergeObject", "separateObject", "makeUnique", "explode", "castDefinition", "paste"]) assert(/refusePaintMove\(s, /.test(caseBody(ops, c)), `case "${c}" 调了 refusePaintMove`);
    assert(/paintMoveBlocked\(s, /.test(code(join("src", "editor", "transfer.ts"))), "拷贝（transfer.ts extractForCopy）调了 paintMoveBlocked");
    assert(/extractForCopy as transferExtract/.test(code(join("src", "editor", "editor.ts"))), "编辑器拷贝走 extractForCopy");
  });
  it("④ 写盘：贴图坐标真的写（documentFromScene 不再对 uvSets 抛，只对「内核里有、表里没有的列」抛）；分层的贴图没有字节照旧抛（writeTextureRow）", () => {
    const sd = code(join("src", "format", "scene-doc.ts")), fn = sd.indexOf("export function documentFromScene(");
    assert(fn > 0 && !/uvSets\.size\) throw new Error\(/.test(sd.slice(fn, fn + 1200)), "documentFromScene 不再对 uvSets 抛（1-2½）");
    assert(/for \(const g of d\.body\.uvSetSlots\) if \(!scene\.uvSets\.has\(g\)\) throw new Error\(/.test(sd.slice(fn, fn + 1200)), "documentFromScene 开头对「网格体在某套排法上、场景的排法表里没有那一行」抛（施工单十八第 1½ 刀：看速查表）");
    assert(/kind === "layered" && c\.ora === null\) throw new Error\(/.test(code(join("src", "format", "texture-table.ts"))), "writeTextureRow 对没有字节的画抛");
  });
  it("⑥ definitionToDoc 的调用点是一张白名单（1-2½ 起它带着贴图坐标，但贴图坐标跟着定义搬到别处要铸新身份、把画的 layout 对上，那是 1-3d：新加调用点的人先想清楚这条路会不会把同一套坐标的身份复制一份——1-3b 审后补）", () => {
    // 整份写盘（1-2½ 起真的写）· 条目仓库按引用取一条定义（拷贝的闭包 / 粘贴对账；搬过去要建 / 更新的那一贴在 paste 里过 paintMoveBlocked）· 变成独立的（makeUnique 先过 paintMoveBlocked）
    const ALLOW = [`${join("src", "format", "scene-doc.ts")}:documentFromScene`, `${join("src", "format", "scene-store.ts")}:docOf`, `${join("src", "format", "scene-store.ts")}:uniqueCopy`].sort();
    const got: string[] = [];
    for (const f of files) {
      const lines = code(f).split("\n");
      lines.forEach((l, i) => {
        if (!/definitionToDoc\(/.test(l) || /export function definitionToDoc\(/.test(l)) return;
        let j = i, who = "?";
        for (; j >= 0; j--) { const m = /(?:export function |function |^\s{4})(\w+)\(/.exec(lines[j]) ?? /^export function (\w+)/.exec(lines[j]); if (m && m[1] !== "definitionToDoc") { who = m[1]; break; } }
        got.push(`${f}:${who}`);
      });
    }
    eq(got.sort().join(", "), ALLOW.join(", "), "definitionToDoc 的调用点");
    const ops = code(join("src", "editor", "ops.ts"));
    assert(/refusePaintMove\(s, \{ def: inst\.def \}\);\s*\n\s*inst\.def = uniqueCopy\(/.test(ops), "makeUnique 先过拒绝函数再 uniqueCopy");
  });
  it("⑤ 编辑器的收尾只走 paint-upkeep（强行对称在它里面），不再直接调 forceSnapshot / forceAfter", () => {
    const ed = code(join("src", "editor", "editor.ts"));
    for (const w of ["upkeepRewrite(", "upkeepSnapshot(", "upkeepAfter("]) assert(ed.includes(w), `editor.ts 用 ${w}`);
    for (const w of ["forceSnapshot(", "forceAfter("]) assert(!ed.includes(w), `editor.ts 不直接用 ${w}`);
  });
  it("⑦ 贴图坐标只经 scene/uv.ts：内核取值 / 写值的口在 src 里只有 src/mesh/ 和 scene/uv.ts 调；那两列的名字只在 scene/uv.ts 出现", () => {
    const uv = join("src", "scene", "uv.ts"), mesh = join("src", "mesh") + "/";
    const hits: string[] = [], names: string[] = [];
    for (const f of files) {
      if (f === uv) continue;
      const c = code(f);
      if (!f.startsWith(mesh) && /\.(cornerValues|faceValue|setCornerValues|setFaceValue|hasColumn|columnDef)\(/.test(c)) hits.push(f);
      if (/["'`]uv-(set|at)["'`]/.test(c)) names.push(f);
    }
    eq(hits.join(" | "), "", "src/mesh/ 和 scene/uv.ts 之外问了内核的列");
    eq(names.join(" | "), "", "那两列的名字出现在 scene/uv.ts 之外");
    // 读坐标的那几种接口（TargetMesh / PaintMesh / PickMesh / LayoutMesh / AtlasMesh / UvMesh）不许强转出来：只能是 uvMesh 给的视图（以前 paint-targets / 画画工作台强转内核，类型上过得去、跑起来没有 uvAt）
    const casts = files.filter((f) => /as (unknown as|never)[^;\n]*\b(TargetMesh|PaintMesh|PickMesh|LayoutMesh|AtlasMesh|UvMesh)\b|\b(TargetMesh|PaintMesh|PickMesh|LayoutMesh|AtlasMesh|UvMesh)\b[^;\n]*\bas (unknown as|never)\b/.test(code(f)));
    eq(casts.join(" | "), "", "强转出了读坐标的接口");
  });
});

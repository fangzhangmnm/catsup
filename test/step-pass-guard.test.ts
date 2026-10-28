// 「一步」的通行证守卫（2026-10-28 Claude Fable 5.1；设计稿 ai-docs/20261028-undo-step-regime.md §3 层 1）。
// 不变量：改场景的提交只能带着 step() 发的通行证进 commitIn；通行证本身（STEP_PASS）全文件只有两处碰得到：step() 发它、toolPass() 在工具边界按运行时发。
// 编辑器内部不许调对外的 commitOp(op)（它每次调用自成一步，内部一个动作里的几条 op 会被拆成好几步撤销）。
// 这是静态执法：源码按字面查，漏包的入口写出来就红。
import { describe, it, assert, eq } from "./runner.mjs";
const fs = (await import("node:fs" as string)) as { readFileSync(u: URL, enc: "utf8"): string };   // 同 repairs-modular.test.ts：tsconfig 没装 Node 类型，动态引

const src = fs.readFileSync(new URL("../src/editor/editor.ts", import.meta.url), "utf8");
const lines = src.split("\n");
const hits = (re: RegExp): number[] => lines.flatMap((l: string, i: number) => (re.test(l) ? [i + 1] : []));

describe("撤销一步的通行证（静态守卫）", () => {
  it("STEP_PASS 只在 step() 和 toolPass() 里出现（定义行除外）", () => {
    const uses = hits(/\bSTEP_PASS\b/).filter((n) => !/^const STEP_PASS = /.test(lines[n - 1]) && !/^\s*(\/\/|\/\*|\*)/.test(lines[n - 1]));   // 注释里提到它不算
    const where = uses.map((n) => lines[n - 1].trim().slice(0, 60));
    eq(uses.length, 2, `STEP_PASS 出现在：\n${uses.map((n, i) => `  ${n}: ${where[i]}`).join("\n")}`);
    assert(where.some((l) => l.includes("fn(STEP_PASS)")), "step() 发通行证");
    assert(where.some((l) => l.includes("toolPass()")), "toolPass() 是工具边界唯一的运行时发证口");
  });
  it("编辑器内部不调对外的 commitOp(op)：内部提交一律 commitIn(pass, …)", () => {
    const internal = hits(/this\.commitOp\(/);
    eq(internal.length, 0, `内部调了 commitOp：${internal.join(", ")}`);
    const bare = hits(/this\.commitIn\(/).filter((n) => !/this\.commitIn\((pass|p|this\.toolPass\(\))[,)]/.test(lines[n - 1]));
    eq(bare.length, 0, `commitIn 没带通行证：${bare.join(", ")}`);
  });
  it("会话的写（selection / selectedPools 整体赋值、ctx 赋值）只在写口和装场景路径里（设计稿 §2 I4）", () => {
    const hdr = /^  (?:private |public |protected )?(?:async |get )?([a-zA-Z_][a-zA-Z0-9_]*)\s*(?:<[^>]*>)?\(/;
    const writers = new Set(["clearSel", "setCtx", "selRestore", "sessionRestore", "bump", "pruneSelection", "loadScene"]);   // 写口 + 装场景路径（不是用户的写）
    const bad: string[] = [];
    let meth = "?";
    lines.forEach((l: string, i: number) => {
      const m = hdr.exec(l);
      if (m && !/^\s*(if|for|while|switch|return|else|catch)\b/.test(l)) meth = m[1];
      if (!/this\.(selection|selectedPools|ctx) = /.test(l) && !/this\.selectedPools\.clear\(\)/.test(l)) return;
      if (writers.has(meth) || l.includes("写口已标过")) return;   // 「写口已标过」= 同一步里前面已经调过 clearSel / setCtx（上下文定了再造选区）
      bad.push(`${i + 1} (${meth}): ${l.trim().slice(0, 80)}`);
    });
    eq(bad.length, 0, `会话写绕过了写口：\n${bad.join("\n")}`);
  });
  it("工作台跟着物体（不变量 I5，2026-10-28）：写 this.ctx / this.scene 的函数必须在同一个函数里调 this.syncModeToKind()", () => {
    // user 10-28 黑匣子「definition 1 body is "brep", not mesh」：打开模型的写口漏了对工作台。「人在哪」一变工作台就得跟上——写在写口里面，漏了这里红。
    const hdr = /^  (?:private |public |protected )?(?:async |get )?([a-zA-Z_][a-zA-Z0-9_]*)\s*(?:<[^>]*>)?\(/;
    const bodies = new Map<string, string[]>();
    let meth = "?";
    lines.forEach((l: string) => {
      const m = hdr.exec(l);
      if (m && !/^\s*(if|for|while|switch|return|else|catch)\b/.test(l)) meth = m[1];
      (bodies.get(meth) ?? bodies.set(meth, []).get(meth)!).push(l);
    });
    const bad: string[] = [];
    for (const [name, ls] of bodies) {
      const code = ls.filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join("\n");
      if (/this\.(ctx|scene) = /.test(code) && !/this\.syncModeToKind\(\)/.test(code)) bad.push(name);
    }
    eq(bad.length, 0, `改了「人在哪 / 场景」却没对工作台：${bad.join(", ")}`);
    assert(bodies.has("syncModeToKind") && bodies.has("checkModeFits"), "写口里的同步 + 画之前的核对都在");
  });
  it("history.commit / commitSession 只有 commitIn 和 closeStep 碰（撤销栈只有这两个入口）", () => {
    const commits = hits(/this\.history\.commit\(/), sessions = hits(/this\.history\.commitSession\(/);
    eq(commits.length, 1, `history.commit 调用处：${commits.join(", ")}`);
    eq(sessions.length, 1, `history.commitSession 调用处：${sessions.join(", ")}`);
  });
});

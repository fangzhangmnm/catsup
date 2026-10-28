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
  it("history.commit / commitSession 只有 commitIn 和 recordSession 碰（撤销栈只有这两个入口）", () => {
    const commits = hits(/this\.history\.commit\(/), sessions = hits(/this\.history\.commitSession\(/);
    eq(commits.length, 1, `history.commit 调用处：${commits.join(", ")}`);
    eq(sessions.length, 1, `history.commitSession 调用处：${sessions.join(", ")}`);
  });
});

// 仓里不许有符号链接（2026-11-11 统筹定，Claude Opus 5.5 写）：工作副本（.claude/worktrees/）里的 node_modules 是指回主目录的链接，
// 曾经被 git add -A 收进仓；主目录快进合并时 git 把被忽略的真 node_modules 文件夹当成可以覆盖的、换成了这个链接。查的是索引（暂存了没提交的也算）。
import { describe, it, eq } from "./runner.mjs";
// 仓里的测试没有 node 的类型声明：照 paint-kernel-guard 的写法动态 import、自己写个窄类型
const cp = (await import("node:child_process" as string)) as { execFileSync(cmd: string, args: string[], o: { cwd: string; encoding: "utf8"; maxBuffer: number }): string };
const root = decodeURIComponent(new URL("..", import.meta.url).pathname);

describe("仓里不许有符号链接", () => {
  it("git ls-files -s 里没有 120000（符号链接）", () => {
    const out = cp.execFileSync("git", ["ls-files", "-s"], { cwd: root, encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
    const links = out.split("\n").filter((l: string) => l.startsWith("120000")).map((l: string) => l.split("\t")[1]);
    eq(links.join(", "), "", "这些是符号链接，从仓里撤掉（git rm --cached）");
  });
});

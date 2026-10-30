// 右键兜底（user 10-30「没有右键的ui能不能统一拦截兜底一下右键……深模块窄接口的统一拦截吗，而不是得一个一个写？」）：
// 结构守卫——兜底只在一个模块里、main.ts 装一次；放行规则在 wantsNativeMenu（行为由探针 probe-context-guard 在真页面上验）。created 2026-10-30 by Claude Opus 5.5
import { describe, it, assert, eq } from "./runner.mjs";

const read = async (p: string): Promise<string> => { const fs = await import("node:fs" as string) as { readFileSync(p: string | URL, e: string): string }; return fs.readFileSync(new URL(`../${p}`, import.meta.url), "utf8"); };

describe("context-menu-guard: 浏览器右键菜单统一兜底", () => {
  it("main.ts 装一次兜底；兜底模块是唯一在 window 上拦 contextmenu 的地方", async () => {
    const main = await read("src/app/main.ts");
    eq((main.match(/installContextMenuGuard\(\)/g) ?? []).length, 1, "main.ts 装一次");
    const guard = await read("src/app/ui/context-menu-guard.ts");
    assert(/defaultPrevented/.test(guard) && /wantsNativeMenu/.test(guard), "兜底只拦没人处理过的、放行能打字的地方");
    assert(!/window\.addEventListener\("contextmenu"/.test(main), "main.ts 不再自己在 window 上拦右键（归兜底模块）");
  });
});

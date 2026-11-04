// 切走也推 / 点更新先推 / 没推成的重试（工单 C3；Fable 11-03 裁定 A B D，周账 F-137 ⑫）。created 2026-11-03 by Claude Opus 5.5
//   真浏览器那一半 = test/probes/probe-update-conflict.mjs c3。
import { describe, it, eq, assert } from "./runner.mjs";
import { shouldRetryPush, PUSH_RETRY_MS, type PushRetryFacts } from "../src/app/push-retry.ts";

const { readFileSync } = (await import("node:fs" as string)) as { readFileSync: (p: string, e: string) => string };
const NOW = 1_000_000;
const base: PushRetryFacts = { pushPending: true, attention: false, saving: false, gesture: false, visible: true, online: true, signedIn: true, lastTryAt: NOW - PUSH_RETRY_MS, now: NOW };

describe("pushPending 重试（C3 D）", () => {
  it("落了本地没推上去、页面在前台、在线登录、过了节奏 → 再推", () => { assert(shouldRetryPush(base)); });
  it("上次是推成的 / 刚回线（lastTryAt = 0）：第一个 tick 就补", () => { assert(shouldRetryPush({ ...base, lastTryAt: 0 })); });
  it("接线：只有试了没成才进节奏；回线清零（曾经推成也算「刚试过」，断网回线要多等 30 s）", () => {
    const src = readFileSync("src/app/session.ts", "utf8");
    assert(/if \(tryPush\) this\.lastPushTryAt = r\.pushed \? 0 : Date\.now\(\);/.test(src), "结果决定节奏");
    assert(/if \(online && !this\.wasOnline\) this\.lastPushTryAt = 0;/.test(src), "回线清零");
  });
  it("节奏：刚试过不重试（网络抖时不一秒一次重新编码）", () => {
    assert(!shouldRetryPush({ ...base, lastTryAt: NOW - PUSH_RETRY_MS + 1 }));
  });
  it("没有待推的 / 有真分叉等人处理 / 正在保存 / 手势按着 / 页面不可见 / 没网 / 没登录：都不推", () => {
    for (const k of [{ pushPending: false }, { attention: true }, { saving: true }, { gesture: true }, { visible: false }, { online: false }, { signedIn: false }]) assert(!shouldRetryPush({ ...base, ...k }), JSON.stringify(k));
  });
  it("节奏 = 自动保存的空闲时间", () => { eq(PUSH_RETRY_MS, 30_000); });
});

describe("守卫：页面要走的路上不许推（C3 A）", () => {
  const session = readFileSync("src/app/session.ts", "utf8"), main = readFileSync("src/app/main.ts", "utf8");
  const bodyOf = (src: string, head: string): string => {
    const i = src.indexOf(head); assert(i >= 0, head);
    let d = 0, j = src.indexOf("{", i);
    for (let k = j; k < src.length; k++) { if (src[k] === "{") d++; else if (src[k] === "}" && --d === 0) return src.slice(j, k + 1); }
    throw new Error("没配平：" + head);
  };
  it("pagehide 监听只走 flushForPageHide，不走会推的 flushForHide", () => {
    const m = /addEventListener\("pagehide", \(e\) => \{([\s\S]*?)\n\}\);/.exec(main); assert(m, "pagehide 监听");
    assert(/flushForPageHide\(\)/.test(m![1]), "走 flushForPageHide");
    assert(!/flushForHide\(\)|\.save\(|pushAll|tryPush/.test(m![1]), "这条路上不许有推");
  });
  it("flushForPageHide 的每个 save 都带 localOnly", () => {
    const b = bodyOf(session, "flushForPageHide(): void");
    const saves = b.match(/this\.save\([^)]*\)/g) ?? []; eq(saves.length, 1);
    for (const x of saves) assert(/localOnly: true/.test(x), x);
    assert(!/tryPush|pushAll|flushForHide/.test(b), "不许别的推");
  });
  it("beforeunload 只落本地", () => {
    const m = /addEventListener\("beforeunload", \(e\) => \{([\s\S]*?)\n\}\);/.exec(main); assert(m, "beforeunload 监听");
    for (const x of m![1].match(/\.save\([^)]*\)/g) ?? []) assert(/localOnly: true/.test(x), x);
  });
  it("blur / 切后台走 flushForHide（页面没走，落本地 + 在线就推）", () => {
    assert(/addEventListener\("blur", \(\) => session\.flushForHide\(\)\)/.test(main), "blur");
    assert(/visibilityState === "hidden"\) session\.flushForHide\(\)/.test(main), "hidden");
    assert(/void this\.save\(\{ implicit: true \}\)/.test(bodyOf(session, "flushForHide(): void")), "带推的 implicit 保存（撞上不弹面）");
  });
});

describe("守卫：点更新前（C3 B）", () => {
  const session = readFileSync("src/app/session.ts", "utf8"), main = readFileSync("src/app/main.ts", "utf8");
  it("onBeforeReload 走 flushBeforeReload；干净的模型不写（曾经无条件 save = 一更新就标脏的直接触发点）", () => {
    assert(/onBeforeReload: async \(\) => \{[^\n]*flushBeforeReload\(\)/.test(main), "接线");
    assert(!/onBeforeReload:[^\n]*\.save\(/.test(main), "不直接 save");
    const i = session.indexOf("async flushBeforeReload()"); assert(i > 0);
    const body = session.slice(i, session.indexOf("\n  }\n", i));
    assert(/if \(this\.dirty\(\)\) await this\.save\(\{ implicit: true, localOnly: true \}\)/.test(body), "脏了才落本地，且这步不设时限");
    assert(/const push = this\.save\(\{ implicit: true \}\);/.test(body) && /await Promise\.race\(\[push, new Promise\(\(r\) => setTimeout\(r, waitMs\)\)\]\);/.test(body), "推有时限");
    assert(/RELOAD_PUSH_WAIT_MS/.test(body), "时限是常量");
  });
  it("等 5 s", () => { assert(/export const RELOAD_PUSH_WAIT_MS = 5000;/.test(readFileSync("src/config.ts", "utf8"))); });
});

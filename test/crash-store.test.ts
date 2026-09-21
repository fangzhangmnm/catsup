// crash-store 契约（Map 假件；WeebPaint 同形）：单帧覆盖 / 正常关闭即删但 pending 拒删 / discard 全删 / 领养只一次 / boot 列表新→旧。
// created 2026-09-20 by Claude Fable 5.1
import { describe, it, eq, assert } from "./runner.mjs";
import { createCrashStore, type CrashKV, type CrashRecord } from "../src/app/crash-store.ts";

function mapKV(): CrashKV & { m: Map<string, CrashRecord> } {
  const m = new Map<string, CrashRecord>();
  return {
    m,
    async put(r) { m.set(r.tag, r); },
    async get(t) { return m.get(t) ?? null; },
    async take(t) { const r = m.get(t) ?? null; if (r) m.delete(t); return r; },
    async delete(t) { m.delete(t); },
    async list() { return [...m.values()]; },
  };
}
const blob = (s: string) => new Blob([s]);

describe("crash-store 契约", () => {
  it("同 tag 覆盖写单帧；listAtBoot 只出 meta、新→旧", async () => {
    const kv = mapKV(); const cs = createCrashStore(kv);
    await cs.put("a", blob("v1"), { state: "crash", name: "房子", at: 100, homeKind: "transient" });
    await cs.put("a", blob("v2"), { state: "crash", name: "房子", at: 200, homeKind: "transient" });
    await cs.put("b", blob("x"), { state: "crash", name: "桥", at: 300, homeKind: "file" });
    eq(kv.m.size, 2);
    const l = await cs.listAtBoot();
    eq(l.map((m) => m.tag).join(","), "b,a");
    eq((l[1] as unknown as { bytes?: unknown }).bytes, undefined, "meta 不带字节");
    eq(await (await cs.adopt("a"))!.text(), "v2", "覆盖后是最后一帧");
  });
  it("dropOnCleanClose：crash 帧删；pending-adoption 拒删（unload ≠ 关闭）；discard 两种都删", async () => {
    const kv = mapKV(); const cs = createCrashStore(kv);
    await cs.put("c", blob("c"), { state: "crash", name: "c", at: 1, homeKind: "transient" });
    await cs.put("p", blob("p"), { state: "pending-adoption", name: "p", at: 2, homeKind: "transient" });
    await cs.dropOnCleanClose("c"); await cs.dropOnCleanClose("p"); await cs.dropOnCleanClose("nope");
    eq(kv.m.has("c"), false); eq(kv.m.has("p"), true, "pending 幸存");
    await cs.discard("p"); eq(kv.m.has("p"), false, "显式丢弃 → pending 也删");
  });
  it("adopt 事务化取删：第二次 null；领养流产可 put 回同 tag", async () => {
    const kv = mapKV(); const cs = createCrashStore(kv);
    await cs.put("t", blob("bytes"), { state: "crash", name: "t", at: 1, homeKind: "file" });
    const b = await cs.adopt("t"); assert(!!b); eq(await cs.adopt("t"), null, "双领养只有一个拿到");
    await cs.put("t", b!, { state: "crash", name: "t", at: 1, homeKind: "file" });
    eq((await cs.listAtBoot()).length, 1, "放回后 boot 还能看到");
  });
});

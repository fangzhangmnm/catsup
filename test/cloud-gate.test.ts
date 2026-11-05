// 同步闸门 + 掉登录 / 没网闸门（工单 C；设计稿 ai-docs/20261103-cloud-gate-design.md §7 验收 / §8 守卫）。created 2026-11-03 by Claude Opus 5.5
//   状态机用假端口（src/app/cloud-gate.ts 零 DOM）；「超时 / 逃生之后谱系不动」用真库 + 假云盘（@internal/store/testing）；真浏览器那一半 = test/probes/probe-cloud-gate.mjs。
import { describe, it, eq, assert } from "./runner.mjs";
import { CloudGate, GATE_COPY, parseRenewFailure, reasonOf, type GateReason, type RenewResult } from "../src/app/cloud-gate.ts";
import { createGateStack } from "../src/app/ui/gate-stack.ts";
import { createStore } from "@internal/store";
import { createMockEncryption, createMockLocal, createMockProvider } from "@internal/store/testing";

const { readFileSync, readdirSync, statSync } = (await import("node:fs" as string)) as { readFileSync(p: string, enc: "utf8"): string; readdirSync(p: string): string[]; statSync(p: string): { isDirectory(): boolean } };
const join = (a: string, b: string): string => `${a}/${b}`;
const tick = (ms = 5): Promise<void> => new Promise((r) => setTimeout(r, ms));
const deferred = <T>() => { let resolve!: (v: T) => void; const promise = new Promise<T>((r) => { resolve = r; }); return { promise, resolve }; };

function rig(over: Partial<{ reachable: () => Promise<void>; pageVisible: () => boolean; every: (ms: number, fn: () => void) => () => void; attached: boolean; online: boolean; renew: () => Promise<RenewResult>; check: (g: { abandoned: () => boolean; onLongWait: () => void }) => Promise<void>; hardTimeoutMs: number; recheckMs: number }> = {}) {
  const log: string[] = [];
  const st = { online: over.online ?? true, attached: over.attached ?? true, offline: false, cover: null as null | "checking" | GateReason, escape: null as null | (() => void), signIn: null as null | (() => void), goOffline: null as null | (() => void), bar: "none", signIns: 0, catchUps: 0, afterPass: 0, renews: 0, checks: 0 };
  const gate = new CloudGate({
    attached: () => st.attached,
    browserOnline: () => st.online,
    renew: async () => { st.renews++; return over.renew ? over.renew() : { kind: "ok" }; },
    check: async (g) => { st.checks++; if (over.check) await over.check(g); },
    signInInteractive: () => { st.signIns++; },
    ui: {
      showChecking: (onEscape) => { st.cover = "checking"; st.escape = onEscape; },
      showBlocked: (reason, h) => { st.cover = reason; st.signIn = h.signIn; st.goOffline = h.offline; },
      hide: () => { st.cover = null; },
    },
    bar: { show: () => { st.bar = "offline"; }, reconnecting: () => { st.bar = "reconnecting"; }, hide: () => { st.bar = "none"; } },
    setUserOffline: (v) => { st.offline = v; },
    userOffline: () => st.offline,
    catchUp: async () => { st.catchUps++; },
    afterPass: () => { st.afterPass++; },
    note: (m) => { log.push(m); },
    reachable: over.reachable, pageVisible: over.pageVisible, every: over.every,
    hardTimeoutMs: over.hardTimeoutMs ?? 40,
    recheckMs: over.recheckMs ?? 0,
  });
  return { gate, st, log };
}

describe("闸门状态机（设计稿 §7）", () => {
  it("① 没挂库：开机 / 醒来零闸，罩子从没出现；本地那段照跑", async () => {
    const { gate, st } = rig({ attached: false });
    let shown = false, ran = false;
    const orig = st;
    const o = await gate.run("boot", { before: async () => { ran = true; shown = orig.cover !== null; } });
    eq(o, "no-gate"); assert(ran, "本地恢复照跑"); assert(!shown, "没罩"); eq(st.cover, null); eq(st.renews, 0, "不续签");
    eq(await gate.run("wake"), "no-gate");
  });
  it("② 登录好 + 云端没动：罩一下就放行，没有面、没有条；本地恢复跑在罩子底下、在问云端之前", async () => {
    const order: string[] = [];
    const { gate, st } = rig({ renew: async () => { order.push("renew"); return { kind: "ok" }; }, check: async () => { order.push("check"); } });
    const o = await gate.run("boot", { before: async () => { assert(st.cover === "checking", "本地恢复时已经罩着"); order.push("restore"); } });
    eq(o, "pass"); eq(order.join(), "restore,renew,check"); eq(st.cover, null); eq(st.bar, "none"); eq(st.afterPass, 1);
  });
  it("这台设备上没账号（退出登录过 / 从没登录）：不当登录墙，放行、不弹闸（§9）", async () => {
    const { gate, st } = rig({ renew: async () => ({ kind: "no-account" }) });
    eq(await gate.run("boot"), "no-login"); eq(st.cover, null); eq(st.bar, "none"); assert(!st.offline, "不算离线");
  });
  it("③ 续签失败（要人交互）：闸「登录过期了」两个钮；点离线继续 → 放行、常驻条、之后没有登录 / 云端请求；online + 续签成功 → 条收掉、补传", async () => {
    let renewOk = false;
    const { gate, st } = rig({ renew: async () => (renewOk ? { kind: "ok" } : { kind: "failed", code: "login_required" }) });
    const p = gate.run("boot");
    await tick(); eq(st.cover, "expired", "闸");
    assert(st.signIn && st.goOffline, "两个钮");
    const renewsAtGate = st.renews;
    st.goOffline!(); eq(await p, "offline");
    eq(st.cover, null, "放行"); eq(st.bar, "offline", "常驻条"); assert(st.offline, "userOffline");
    eq(st.renews, renewsAtGate, "离线继续之后没有再续签"); eq(st.checks, 0, "没有问云端");
    renewOk = true; st.offline = true;
    gate.onCloudMaybeBack(); await tick();
    assert(!st.offline, "回来了"); eq(st.catchUps, 1, "补传"); eq(st.bar, "none", "条收掉");
  });
  it("③′「重新登录」= 交互登录；跳走前闸门留着（不放输入）", async () => {
    const { gate, st } = rig({ renew: async () => ({ kind: "failed", code: "interaction_required" }) });
    void gate.run("boot"); await tick();
    st.signIn!(); eq(st.signIns, 1); eq(st.cover, "expired", "还罩着");
    assert(gate.isRunning(), "这一轮没结束");
    st.goOffline!(); await tick();
  });
  it("④ 没网：直接进闸，不等超时、不续签", async () => {
    const { gate, st } = rig({ online: false, hardTimeoutMs: 100000 });
    void gate.run("boot"); await tick();
    eq(st.cover, "no-network"); eq(st.renews, 0);
    // 没网时点「重新登录」= 再核一次（不去跳一个注定失败的页）
    st.signIn!(); await tick(); eq(st.signIns, 0); eq(st.cover, "no-network");
    // 网回来了：闸开着 = 自己重新核，通过就放行
    st.online = true; gate.onCloudMaybeBack(); await tick(); eq(st.cover, null, "放行"); eq(st.afterPass, 1);
  });
  it("⑤ 云端慢：点「先离线用」立刻放行（不等）；迟到的结果作废（abandoned = true，库不换字节）", async () => {
    const hang = deferred<void>();
    let abandoned: () => boolean = () => false;
    const { gate, st } = rig({ hardTimeoutMs: 100000, check: async (g) => { abandoned = g.abandoned; await hang.promise; } });
    const p = gate.run("boot");
    await tick(); eq(st.cover, "checking"); assert(!abandoned(), "还没作废");
    st.escape!();
    eq(await p, "offline"); eq(st.cover, null); assert(st.offline, "离线"); eq(st.bar, "offline");
    assert(abandoned(), "迟到的结果作废");
    hang.resolve(); await tick();
    eq(st.afterPass, 0, "迟到的结果不会算放行");
  });
  it("⑤′ 云端慢：不点，到硬超时自动进闸「网盘没有回应」；迟到的结果作废", async () => {
    const hang = deferred<void>();
    let abandoned: () => boolean = () => false;
    const { gate, st } = rig({ hardTimeoutMs: 30, check: async (g) => { abandoned = g.abandoned; await hang.promise; } });
    void gate.run("boot");
    await tick(60); eq(st.cover, "no-response"); assert(abandoned(), "作废");
    st.goOffline!(); await tick();
  });
  it("硬超时默认 8 s（设计稿 §4，艺术类 app 不要更短）；拉取 / 面开始之后不再计时（它们有自己的出口）", async () => {
    assert(/const HARD_TIMEOUT_MS = 8000;/.test(readFileSync("src/app/cloud-gate.ts", "utf8")), "8 s");
    const hang = deferred<void>();
    const { gate, st } = rig({ hardTimeoutMs: 20, check: async (g) => { g.onLongWait(); await hang.promise; } });
    const p = gate.run("boot");
    await tick(60); eq(st.cover, "checking", "超时停了，没进闸");
    hang.resolve(); eq(await p, "pass");
  });
  const clock = () => { const c = { ms: 0, fn: null as null | (() => void), stopped: false, every: (m: number, f: () => void) => { c.ms = m; c.fn = f; return () => { c.stopped = true; c.fn = null; }; }, fire: async () => { c.fn?.(); await tick(); await tick(); } }; return c; };
  const goOff = async (over: Parameters<typeof rig>[0]) => { const c = clock(); const r = rig({ ...over, every: c.every }); void r.gate.run("boot"); await tick(); r.st.goOffline?.(); r.st.escape?.(); await tick(); return { ...r, c }; };
  const failing = { renew: async () => ({ kind: "failed" as const, code: "timed_out" }) };
  const st0 = { ok: false };
  it("离线态（设计稿 §3 硬要求）：每 60 s 静默试一次；通了就清离线、补传、收条，定时器停", async () => {
    let fail = true, reachCalls = 0;
    const { gate: _g, st, c } = await goOff({ renew: async () => (fail ? { kind: "failed" as const, code: "timed_out" } : { kind: "ok" as const }), reachable: async () => { reachCalls++; } });
    assert(st.offline, "选了离线"); eq(c.ms, 60000, "60 s"); const r0 = st.renews;
    await c.fire();
    eq(st.renews, r0 + 1, "到点试了一次"); assert(st.offline, "没通：还是离线"); eq(st.cover, null, "失败不弹闸"); eq(st.bar, "offline", "条还在"); eq(st.catchUps, 0);
    fail = false;
    await c.fire();
    assert(!st.offline, "通了：清离线"); eq(reachCalls, 1, "问了云端"); eq(st.catchUps, 1, "补传"); eq(st.bar, "none", "收条"); assert(c.stopped, "定时器停"); eq(st.cover, null);
  });
    it("离线态：令牌还在但云端不答（慢网）= 没回来，不清离线、不弹", async () => {
    let up = false;
    const { st, c } = await goOff({ renew: async () => (st0.ok ? { kind: "ok" as const } : { kind: "failed" as const, code: "x" }), reachable: async () => { if (!up) throw new Error("net"); } });
    st0.ok = true;
    await c.fire();
    assert(st.offline, "还是离线"); eq(st.catchUps, 0, "不补传"); eq(st.cover, null, "不弹"); eq(st.bar, "offline");
    up = true;
    await c.fire();
    assert(!st.offline, "下一拍通了"); eq(st.catchUps, 1);
    st0.ok = false;
  });
    it("离线态：云端一直不答也不挂住（硬超时之后下一拍还能再试）", async () => {
    const hang = deferred<void>();
    let calls = 0;
    const { st, c } = await goOff({ hardTimeoutMs: 10, renew: async () => (st0.ok ? { kind: "ok" as const } : { kind: "failed" as const, code: "x" }), reachable: async () => { calls++; await hang.promise; } });
    st0.ok = true;
    await c.fire(); await tick(30);
    assert(st.offline, "超时 = 没回来"); eq(calls, 1);
    await c.fire(); await tick(30);
    eq(calls, 2, "下一拍再试，没被上一次卡住");
    hang.resolve(undefined); st0.ok = false;
  });
    it("离线态：后台不试、没网不试（回前台 run(wake) 那一下试）", async () => {
    let visible = false;
    const { gate, st, c } = await goOff({ ...failing, pageVisible: () => visible });
    const r0 = st.renews;
    await c.fire(); eq(st.renews, r0, "后台不试");
    visible = true; st.online = false;
    await c.fire(); eq(st.renews, r0, "没网不试");
    st.online = true;
    eq(await gate.run("wake"), "offline-kept"); await tick(); eq(st.renews, r0 + 1, "回前台试一次"); eq(st.cover, null, "回前台也不弹");
  });
  it("⑥ 醒来走同一套；已选离线且仍没网 → 不再弹闸（条还在）", async () => {
    const { gate, st } = rig({ online: false });
    void gate.run("boot"); await tick(); st.goOffline!(); await tick();
    eq(st.bar, "offline");
    const r = st.renews;
    eq(await gate.run("wake"), "offline-kept"); eq(st.cover, null, "没闸"); eq(st.bar, "offline", "条还在"); eq(st.renews, r, "没网不续签");
  });
  it("⑥′ 已选离线、有网但续签还是不行：醒来不弹闸，条留着", async () => {
    const { gate, st } = rig({ renew: async () => ({ kind: "failed", code: "login_required" }) });
    void gate.run("boot"); await tick(); st.goOffline!(); await tick();
    eq(await gate.run("wake"), "offline-kept"); await tick();
    eq(st.cover, null); assert(st.offline); eq(st.bar, "offline");
  });
  it("醒来：同一套（罩 → 续签 → 问云端）；刚核对过不再罩（切个标签回来不吃第一下点击）", async () => {
    const { gate, st } = rig({ recheckMs: 100000 });
    eq(await gate.run("boot"), "pass"); const c = st.checks;
    eq(await gate.run("wake"), "recent"); eq(st.checks, c, "不重复问");
    const r2 = rig({ recheckMs: 0 });
    await r2.gate.run("boot"); const c2 = r2.st.checks;
    eq(await r2.gate.run("wake"), "pass"); eq(r2.st.checks, c2 + 1, "过了窗口照走一遍");
  });
  it("单飞：这一轮没走完再来一次，共用同一轮", async () => {
    const hang = deferred<void>();
    const { gate, st } = rig({ hardTimeoutMs: 100000, check: async () => { await hang.promise; } });
    const a = gate.run("boot"); await tick();
    const b = gate.run("wake"); await tick();
    eq(st.checks, 1); hang.resolve(); eq(await a, "pass"); eq(await b, "pass");
  });
  it("库的 offlineEscape 接缝：闸门这一轮拿到同一个逃生信号；轮外 = null（走库默认那条通知）", async () => {
    const hang = deferred<void>();
    const { gate, st } = rig({ hardTimeoutMs: 100000, check: async () => { await hang.promise; } });
    eq(gate.escapeProbe(), null);
    void gate.run("boot"); await tick();
    const probe = gate.escapeProbe(); assert(probe, "有信号");
    let fired = false; void probe!.then(() => { fired = true; });
    st.escape!(); await tick(); assert(fired, "同一个信号"); hang.resolve();
  });
  it("闸门外点「先离线用」（比如回前台的快进正在拉）= 离线继续", async () => {
    const { gate, st } = rig();
    gate.escape(); assert(st.offline); eq(st.bar, "offline");
  });
  it("⑧ 原因分类：interaction 码 → 登录过期了；别的 → 网盘没有回应；没网优先", () => {
    eq(reasonOf("login_required", true), "expired"); eq(reasonOf("interaction_required", true), "expired"); eq(reasonOf("consent_required", true), "expired");
    eq(reasonOf("monitor_window_timeout", true), "no-response"); eq(reasonOf("no_network_connectivity", true), "no-response"); eq(reasonOf(null, true), "no-response");
    eq(reasonOf("login_required", false), "no-network");
  });
  it("⑧ 原因码：解析库的日志行；库的格式变了这里红（库零改，读的是它写进 ui.reportError 的那一行）", () => {
    const f = parseRenewFailure("[auth] silent token renewal failed (boot-probe): name=InteractionRequiredAuthError code=login_required sub=  msg=x\n  account=…");
    eq(f?.where, "boot-probe"); eq(f?.code, "login_required"); eq(f?.name, "InteractionRequiredAuthError");
    eq(parseRenewFailure("[auth] init: redirectResponse=no"), null);
    const lib = readFileSync("node_modules/@internal/store/dist/base/providers/auth.js", "utf8");
    assert(lib.includes("[auth] silent token renewal failed (${where}): name=${") && lib.includes("} code=${") && lib.includes("} sub=${"), "库里的日志行还是这个形状");
  });
});

describe("闸门栈（同步闸门的形状，WeebPaint lockSyncGate）", () => {
  const views = () => { const seen: (string | null)[] = []; const s = createGateStack((t) => { seen.push(t?.title ?? null); }); return { s, seen }; };
  it("开着 = 输入锁着；点按钮 = 那个值、收掉", async () => {
    const { s, seen } = views();
    assert(!s.isUp());
    const h = s.open<"a">({ title: "T", actions: [{ label: "A", value: "a" }] });
    assert(s.isUp()); eq(seen.at(-1), "T");
    s.pick(0); eq(await h.result, "a"); assert(!s.isUp()); eq(seen.at(-1), null); assert(!h.isOpen());
  });
  it("按钮的 onPick 在点击的同步栈里（pick 返回前），resolve 在它之后（iOS 红线）", async () => {
    const { s } = views();
    const order: string[] = [];
    const h = s.open<"a">({ title: "T", actions: [{ label: "A", value: "a", onPick: () => { order.push("pick"); } }] });
    void h.result.then(() => { order.push("then"); });
    s.pick(0);
    eq(order.join(), "pick", "同步栈里只有 pick");
    await h.result; await tick();
    eq(order.join(), "pick,then");
  });
  it("外面收掉（settleSyncGate）= null，不是点的", async () => {
    const { s } = views();
    const h = s.open({ title: "T", actions: [] });
    s.settleTop(); eq(await h.result, null); assert(!s.isUp());
  });
  it("能叠：核对罩子上面顶一张拉取罩子；收掉上面那张，下面那张还在、输入还锁着（WeebPaint 单槽版第一张会永远不回）", async () => {
    const { s, seen } = views();
    const a = s.open<string>({ title: "核对", actions: [] }), b = s.open<string>({ title: "拉取", actions: [] });
    eq(seen.at(-1), "拉取");
    b.close(); assert(s.isUp(), "还锁着"); eq(seen.at(-1), "核对");
    a.close("x"); eq(await a.result, "x"); assert(!s.isUp());
    a.close("y"); eq(await a.result, "x", "只结一次");
  });
  it("闸门进输入闸的名册（吞不吞的规则在 input-gate.test.ts）；门口在 window 捕获阶段吞键盘和按下，不吞 pointerup（手势正按着时别卡死）", () => {
    const sheets = readFileSync("src/app/ui/sheets.ts", "utf8"), dom = readFileSync("src/app/input-dom.ts", "utf8");
    assert(/label: "同步闸门", rank: 450, root: "#syncGate", up: \(\) => _gate\.isUp\(\)/.test(sheets), "闸门在名册上");
    const m = /GUARDED: [^=]*= \{([^}]*)\}/.exec(dom); assert(m, "清单");
    for (const t of ["keydown", "pointerdown", "wheel", "contextmenu"]) assert(m![1].includes(`${t}:`), t);
    assert(!m![1].includes("pointerup"), "pointerup 不吞");
    assert(/capture: true/.test(dom) && /stopImmediatePropagation/.test(dom), "捕获阶段");
  });
});

// ---- 真库 + 假云盘：闸门超时 / 逃生之后谱系不动（工单 C 验收「闸门必有出口」）----
const enc = (s: string): Uint8Array => new TextEncoder().encode(s);
const KINDS = [{ kind: "glb", suffix: ".catsup", container: "raw" as const }];
const kvRaw = () => { const m = new Map<string, string>(); return { get: (k: string) => m.get(k) ?? null, set: (k: string, v: string) => { m.set(k, String(v)); }, remove: (k: string) => { m.delete(k); }, keys: () => [...m.keys()] }; };
const UI = { busy: <T>(_l: string, fn: () => Promise<T>) => fn(), resolveConflict: async () => "cancel" as const, reportError: () => {} };
async function device() {
  const provider = createMockProvider(); const local = createMockLocal(); const kv = kvRaw();
  const store = createStore({ docKinds: KINDS, reconcilePolicy: "app-driven", encryption: createMockEncryption(), persistence: "none", appId: "t", provider, ui: UI, validateAdopt: () => true, kv, local, isOnline: () => true, signedIn: () => true, skipMigration: true } as never);
  const f = store.file("猫.catsup", { mode: "existing" });
  eq((await f.save(enc("V1"), { tryPush: true })).pushed, true);
  provider._seed("猫.catsup", "V2-cloud");   // 别的设备推了新版
  const localText = async () => { const b = await local.get("猫.catsup") as unknown; return b == null ? null : b instanceof Blob ? b.text() : new TextDecoder().decode(b as Uint8Array); };
  const etags = () => JSON.stringify([...kv.keys()].filter((k) => /etag/i.test(k)).sort().map((k) => [k, kv.get(k)]));
  return { provider, store, f, localText, etags };
}
describe("闸门 × 库：出口 = 离线读本机，谱系不动", () => {
  it("问云端的时候点了「先离线用」/ 超时（abandoned）：迟到的云端结果不换本机字节，谱系不动", async () => {
    const d = await device();
    const before = await d.localText(), etagsBefore = d.etags();
    let abandoned = false;
    const realMeta = d.provider.getItemByPath.bind(d.provider);
    const gate = deferred<void>();
    d.provider.getItemByPath = async (n: string) => { const m = await realMeta(n); await gate.promise; return m; };
    const pulling = d.f.pullIfClean({ localDirty: () => abandoned, trustHints: false, onReplaceStart: () => { throw new Error("不该开始换字节"); } });
    await tick();
    abandoned = true;   // 人点了逃生口 / 硬超时
    gate.resolve();
    const r = await pulling;
    eq(r.status, "dirty-skip", "当脏处理 = 这次不换");
    eq(await d.localText(), before, "本机字节没动"); eq(d.etags(), etagsBefore, "谱系没动");
    assert((await d.f.open()) != null, "离线读本机照样读得到");
    await d.store.dispose();
  });
  it("没人逃走：干净 + 云端新 → 快进（闸门不挡正常的路）", async () => {
    const d = await device();
    const r = await d.f.pullIfClean({ localDirty: () => false, trustHints: false });
    eq(r.status, "fast-forwarded"); eq(await d.localText(), "V2-cloud");
    await d.store.dispose();
  });
  it("拉取已经开始才逃走：库回 escaped、不等它拉完（session 把画布改挂分叉，绝不再对着原名字存）", async () => {
    const d = await device();
    const realDownload = d.provider.download.bind(d.provider);
    const slow = deferred<void>();
    d.provider.download = async (ref: string) => { await slow.promise; return realDownload(ref); };
    let skip!: () => void; const probe = new Promise<void>((res) => { skip = res; });
    let started = false;
    const pulling = d.f.pullIfClean({ localDirty: () => false, trustHints: false, probe, onReplaceStart: () => { started = true; skip(); } });
    const r = await pulling;
    assert(started, "开始了"); eq(r.status, "escaped");
    slow.resolve(); await tick(20);
    await d.store.dispose();
  });
});

describe("回来问一次（规则书 §1 第 15 条；工单 C4）", () => {
  function* walk(dir: string): Generator<string> { for (const f of readdirSync(dir)) { const p = join(dir, f); if (statSync(p).isDirectory()) yield* walk(p); else if (/\.ts$/.test(f)) yield p; } }
  const strip = (x: string): string => x.replace(/\/\*[\s\S]*?\*\//g, "").split("\n").map((l) => l.replace(/(^|\s)\/\/.*$/, "")).join("\n");
  const src = readFileSync("src/app/main.ts", "utf8");
  it("dirty.pushAll 全仓只有一个调用点，在「现在传」的分支里", () => {
    const hits: string[] = [];
    for (const p of walk("src")) for (const line of strip(readFileSync(p, "utf8")).split("\n")) if (/\.pushAll\(\)/.test(line)) hits.push(`${p}: ${line.trim().slice(0, 60)}`);
    eq(hits.length, 1, hits.join(" | "));
    assert(hits[0]!.startsWith("src/app/main.ts"), hits[0]!);
    const body = src.slice(src.indexOf("async function offerPushLocalOnly"), src.indexOf("// ---- 编辑器横幅"));
    assert(body.indexOf("lockSyncGate") >= 0 && body.indexOf("lockSyncGate") < body.indexOf(".pushAll()"), "先问");
    assert(/if \(v !== "now"\) \{ inList\(await count\(\)\); return; \}/.test(body), "不点就不推");
    assert(/if \(plan\.kind === "list"\) \{ inList\(plan\.total\); return; \}/.test(body), "说过稍后的页：不问不推");
    assert(body.indexOf("planReturn(") < body.indexOf(".pushAll()"), "推之前先分类：有从没传过的要先问");
  });
  it("面：只问从没传过的，两键，Esc = 稍后；一页只问一次；没传成的带名单带钮（规则书第 15 条，11-03 夜改写）", () => {
    const body = src.slice(src.indexOf("async function offerPushLocalOnly"), src.indexOf("// ---- 编辑器横幅"));
    assert(/title: `有 \$\{plan\.neverUploaded\} 份只在这台设备，现在传上去？`/.test(body));
    assert(/label: "现在传", value: "now", primary: true \}, \{ label: "稍后", value: "later" \}/.test(body));
    assert(/escValue: "later"/.test(body));
    assert(/askedPushLocalOnly = true;/.test(body) && /saidLater: askedPushLocalOnly && !force/.test(body));
    assert(/label: "去处理", primary: true, onClick: openList/.test(body) && /names/.test(body));
  });
  it("开着的这份归心跳：先推它再数（不然面说「有 1 份」，心跳一下就推完，面就是假的）", () => {
    const body = src.slice(src.indexOf("async function offerPushLocalOnly"), src.indexOf("// ---- 编辑器横幅"));
    const push = body.indexOf("session.pushOpenDocIfPending()"), plan = body.indexOf("planReturn("), face = body.indexOf("lockSyncGate");
    assert(push > 0 && push < plan && plan < face, "先推、再数、再问");
    assert(/session\.openDocNeedsAttention\(\) \? 1 : 0/.test(body), "真分叉归横幅，不算进来");
  });
  it("从没传过的：人答应之前心跳不推；人按存不受管；库不再自己问一遍", () => {
    const body = src.slice(src.indexOf("async function offerPushLocalOnly"), src.indexOf("// ---- 编辑器横幅"));
    assert(/if \(!pushConsented\) for \(const id of never\) heldNeverUploaded\.add\(id\);/.test(body), "数到的先压住");
    assert(/pushConsented = true;\s*\n\s*heldNeverUploaded\.clear\(\);/.test(body), "点了现在传才放开");
    assert(/pushHeld: \(path\) => pushHoldAll \|\| heldNeverUploaded\.has\(path\)/.test(src));
    const se = readFileSync("src/app/session.ts", "utf8");
    assert(/const held = !!opts\.implicit && !!this\.d\.pushHeld\?\.\(home\.path\);/.test(se), "只压隐式保存");
    assert(/const tryPush = !opts\.localOnly && !held && /.test(se));
    assert(/if \(!opts\.implicit\) this\.d\.onExplicitSave\?\.\(home\.path\);/.test(se), "人按存 = 同意");
    assert(/offlineUploadReplay: "manual"/.test(readFileSync("src/app-store.ts", "utf8")));
  });
  it("从离线回来也走这张面，不直接推", () => {
    const i = src.indexOf("catchUp: async () => {"); const body = src.slice(i, src.indexOf("\n  },\n", i));
    assert(/await afterCloudReachable\("online"\)/.test(body) && !/pushAll/.test(body));
  });
});

describe("闸门守卫（设计稿 §8）", () => {
  function* walk(dir: string): Generator<string> { for (const f of readdirSync(dir)) { const p = join(dir, f); if (statSync(p).isDirectory()) yield* walk(p); else if (/\.ts$/.test(f)) yield p.replace(/\\/g, "/"); } }
  const strip = (s: string): string => s.replace(/\/\*[\s\S]*?\*\//g, "").split("\n").map((l) => l.replace(/(^|\s)\/\/.*$/, "")).join("\n");
  const main = strip(readFileSync("src/app/main.ts", "utf8"));
  it("① 开机路径上 await 云端都带出口：initAuth 只在闸门的 renew 和没挂库那条分支；挂了库的开机走 cloudGate.run", () => {
    eq((main.match(/auth\.initAuth\(\)/g) ?? []).length, 2, "renewSilently + 没挂库分支");
    assert(/cloudGate\.run\("boot", \{ before: localBoot \}\)/.test(main), "挂了库 = 闸门");
    assert(/Promise\.race<Raced>\(\[/.test(readFileSync("src/app/cloud-gate.ts", "utf8")), "闸门里问云端和逃生、超时赛跑");
    const session = strip(readFileSync("src/app/session.ts", "utf8"));
    assert(/localDirty: \(\) => this\.dirty\(\) \|\| !!this\.refreshGuard\?\.abandoned\(\)/.test(session) && /probe,/.test(session), "快进带 probe，迟到的结果作废");
    assert(/if \(this\.refreshRun\) \{ if \(g\) this\.refreshGuard = g; return g \? this\.refreshRun/.test(session), "闸门加入在途的那一趟、等它（不是看见在途就当没事）");
    assert(/offlineEscape:[\s\S]*conflictGate\.escapeProbe/.test(strip(readFileSync("src/store-ui.ts", "utf8"))), "库的 open 走同一个逃生信号");
  });
  it("③ 文案：原因三句分开；不拿「失败 / 错误」当标题；不含指挥句（10-23：只给信息不指挥）", () => {
    const rs = Object.values(GATE_COPY.reason); eq(new Set(rs).size, 3, "三句分开");
    const all = [GATE_COPY.checkingTitle, GATE_COPY.pullingTitle, GATE_COPY.blockedTitle, ...rs, GATE_COPY.signIn, GATE_COPY.offline, GATE_COPY.escape, GATE_COPY.bar(3), GATE_COPY.barReconnecting];
    for (const t of all) assert(!/失败|错误|请检查|请确认|请先/.test(t), t);
    eq(GATE_COPY.bar(0), "离线"); eq(GATE_COPY.bar(3), "离线 · 还有 3 份没传上去");
  });
  it("④ userOffline 不落盘：只住 user-offline.ts 的内存变量；持久层文件不 import 它", () => {
    const leaf = strip(readFileSync("src/app/user-offline.ts", "utf8"));
    assert(!/localStorage|indexedDB|deviceKv/.test(leaf), "叶子不碰存储");
    const persist = ["src/app/device-kv.ts", "src/app/crash-store.ts", "src/app/debug-log.ts"];
    for (const p of persist) assert(!/user-offline/.test(readFileSync(p, "utf8")), p);
    for (const p of walk("src")) assert(!/deviceKvSet(Json)?\([^)]*[Oo]ffline/.test(strip(readFileSync(p, "utf8"))), p);
  });
  it("bug (a) 不许回来：回线 / 回前台会静默补登（CatsUp 曾经全仓零调用 retrySilentSignIn，开机探测一失败就只能手动登录）", () => {
    assert(/auth\.retrySilentSignIn\(\)/.test(main), "调了");
    assert(/onForeground: \(\) => \{ retrySilentQuietly\(/.test(main), "回前台");
    assert(/addEventListener\("online", \(\) => \{[^\n]*retrySilentQuietly\(/.test(main), "回线");
  });
  it("app 里问「能不能上云」问 cloudOnline，不直接看 navigator.onLine（离线继续也算离线）", () => {
    const bad = [...walk("src/app")].filter((p) => !["src/app/user-offline.ts", "src/app/factory-reset.ts"].includes(p) && /navigator\.onLine/.test(strip(readFileSync(p, "utf8"))));
    // main.ts 黑匣子那一行只读不判；其余不许有
    eq(bad.filter((p) => p !== "src/app/main.ts").join(), "");
    const mainHits = main.split("\n").filter((l) => /navigator\.onLine/.test(l));
    assert(mainHits.every((l) => /note\("auth", `sign-in click/.test(l)), "main.ts 只在黑匣子那一行读：" + mainHits.join(" | "));
    assert(/isOnline: cloudOnline/.test(readFileSync("src/app-store.ts", "utf8")), "接进库");
  });
});

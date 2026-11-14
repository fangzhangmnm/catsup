// 输入闸探针（headless）：设计 = ai-docs/20261105-input-gate-design.md。created 2026-11-05 by Claude Opus 5.5
// A. 每种面开着：Ctrl+Z / L / G / 滚轮 / 拖画布 → 模型 / 工具 / 相机都不动；Esc 只关最上面那个面，不把人从组件里退出来。
// B. 菜单开着：快捷键吞掉（工具不换、菜单还开着）、Esc 只关菜单、外点关菜单。
// B2. 菜单的元素被别处删了 / 关菜单半路抛错：键盘照常进编辑器、按在画布上的那一下照常进工具（v0.19.50）。
// C. 第二层：绕过门口的程序事件（isTrusted = false）也进不了编辑器。
// D. 第三层：面开着时编辑器的人口自己也拒；程序提交（导入 / 粘贴等面关了才落定那条路）照走。
// E. 走路键盘：面 / 文本框开着不进走路。
// F. 演示锁：只读工具全部能用（走路真能进、选择真能选、卷尺有读数不留线），改模型的工具拿不起来且说明原因；Editor 每个公开方法枚举调一遍，模型不变。
// 用法：python3 -m http.server 8765 --bind 127.0.0.1 后 `node test/probes/probe-input-gate.mjs [url]`。
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const url = process.argv[2] ?? "http://127.0.0.1:8765/";
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 1000, height: 800 } }); page.setDefaultTimeout(4000);
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 400)));
await page.goto(url, { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1500);
const out = {}, ok = (k, v) => { out[k] = !!v; if (!v) process.exitCode = 1; };
const wait = (ms = 70) => page.waitForTimeout(ms);
const st = () => page.evaluate(() => { const e = globalThis.__catsup.editor, c = e.cam; return { rev: e.revision, tool: e.tool, depth: e.contextDepth(), gesture: e.isGestureActive(), cam: [c.yaw, c.pitch, c.halfH].map((v) => +v.toFixed(5)).join(",") }; });
const box = await page.evaluate(() => { const r = document.getElementById("board").getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
const mid = (fx = 0.5, fy = 0.5) => [box.x + box.w * fx, box.y + box.h * fy];

// 有内容（一个组件，进到它里面：Esc 穿透的话会退出来），能撤销
await page.evaluate(() => { const e = globalThis.__catsup.editor, P = (x, y, z = 0) => ({ x, y, z }); e.setGrid({ ...e.grid, on: false });
  const B = [[0, 0], [2, 0], [2, 2], [0, 2]], segs = []; for (let i = 0; i < 4; i++) { const a = B[i], d = B[(i + 1) % 4]; segs.push([P(a[0], a[1], 0), P(d[0], d[1], 0)]); segs.push([P(a[0], a[1], 1), P(d[0], d[1], 1)]); }
  e.commitOp({ op: "addEdges", at: e.activePool(), segs }); e.selectAll(); e.makeComponent("块"); e.deselectAll();
  const s = e.scene, inst = [...s.def(s.root).instances.values()][0]; e.selectedPools.clear(); e.selectedPools.set(`i${inst.id}`, { kind: "instance", instance: inst.id }); e.enterSelected(); e.deselectAll(); e.zoomExtents(); e.draw(); });
const base = await st(); ok("setup.inComponent", base.depth === 1 && base.rev > 0);

// ---------- A. 每种面 ----------
const FACES = {
  sheet: { open: async () => { await page.evaluate(() => { void globalThis.__catsup.test.openConfirmSheet("探针", "问一句"); }); }, up: "#sheet" },
  input: { open: async () => { await page.evaluate(() => { void globalThis.__catsup.test.openInputSheet("探针", { defaultValue: "x" }); }); }, up: "#sheet" },
  help: { open: async () => { await page.evaluate(() => globalThis.__catsup.test.toggleHelp(true)); }, up: "#helpSheet" },
  mat: { open: async () => { await page.evaluate(() => globalThis.__catsup.test.toggleMatSheet(true)); }, up: "#matSheet" },
  debugLog: { open: async () => { await page.evaluate(() => globalThis.__catsup.test.openDebugLogSheet()); }, up: "#debugLog" },
};
const hidden = (sel) => page.evaluate((s) => document.querySelector(s).hidden, sel);
const pokeScene = async () => {   // 能想到的都戳一遍
  await page.keyboard.press("Control+z"); await wait(30);
  await page.keyboard.press("l"); await wait(30);
  await page.keyboard.press("Delete"); await wait(30);
  await page.mouse.move(...mid()); await page.mouse.wheel(0, 240); await wait(40);
  await page.mouse.move(...mid(0.4, 0.4)); await page.mouse.down({ button: "middle" }); await page.mouse.move(...mid(0.6, 0.6)); await page.mouse.up({ button: "middle" }); await wait(40);
};
for (const [name, f] of Object.entries(FACES)) {
  await f.open(); await wait(120);
  ok(`A.${name}.opened`, !(await hidden(f.up)));
  await pokeScene();
  const s = await st();
  ok(`A.${name}.sceneUntouched`, s.rev === base.rev && s.tool === base.tool && s.cam === base.cam);
  await page.keyboard.press("Escape"); await wait(120);
  const s2 = await st();
  ok(`A.${name}.escClosesFace`, await hidden(f.up));
  ok(`A.${name}.escStaysInComponent`, s2.depth === 1 && !s2.gesture);
}
// 同步闸门：没声明 Esc 值 = Esc 吞掉、关不掉；声明了 = 接
{ await page.evaluate(() => { globalThis.__gate = globalThis.__catsup.test.openSyncGate({ title: "探针闸门", actions: [{ label: "好", value: 1 }] }); }); await wait(80);
  await pokeScene(); const s = await st();
  ok("A.gate.sceneUntouched", s.rev === base.rev && s.tool === base.tool && s.cam === base.cam);
  await page.keyboard.press("Escape"); await wait(60);
  ok("A.gate.escSwallowedNoValue", !(await hidden("#syncGate")) && (await st()).depth === 1);
  await page.evaluate(() => globalThis.__gate.close()); await wait(60);
  await page.evaluate(() => { globalThis.__gate = globalThis.__catsup.test.openSyncGate({ title: "探针闸门", escValue: 7, actions: [{ label: "好", value: 1 }] }); }); await wait(80);
  await page.keyboard.press("Escape"); await wait(60);
  ok("A.gate.escValueTaken", (await hidden("#syncGate")) && (await page.evaluate(() => globalThis.__gate.result)) === 7);
}
// 处理中遮罩：Esc 吞掉，遮罩底下 Ctrl+Z 不撤销（设计稿核查的漏洞 F3）
{ await page.evaluate(() => { globalThis.__busyEnd = null; void globalThis.__catsup.test.withBusy("探针处理中", () => new Promise((r) => { globalThis.__busyEnd = r; })); }); await wait(80);
  await pokeScene(); const s = await st();
  ok("A.busy.sceneUntouched", s.rev === base.rev && s.tool === base.tool && s.cam === base.cam);
  await page.keyboard.press("Escape"); await wait(60);
  ok("A.busy.escNoEffect", !(await hidden("#busyOverlay")) && (await st()).depth === 1);
  await page.evaluate(() => globalThis.__busyEnd()); await wait(80);
  ok("A.busy.closed", await hidden("#busyOverlay"));
}
// 下面这段证明上面没把键盘弄死：面都关了，快捷键回来了
await page.keyboard.press("k"); await wait(60);   // 硬表面画线 = K（v0.19.104 起 L = 选连着的一块；这里只要证明快捷键能到编辑器）
ok("A.keysBack", (await st()).tool === "line");
await page.keyboard.press("Escape"); await wait(40);
await page.evaluate(() => globalThis.__catsup.editor.setTool("select")); await wait(40);

// 图库全屏（读码说没挡）：键盘 / 滚轮不进编辑器；通知还能点、关得掉
{ await page.evaluate(async () => { await globalThis.__catsup.galleryHost.open(); }); await wait(250);
  const before = await st();
  await page.keyboard.press("Control+z"); await page.keyboard.press("l"); await page.mouse.move(...mid()); await page.mouse.wheel(0, 240); await wait(60);
  const s = await st();
  ok("A.gallery.sceneUntouched", s.rev === before.rev && s.tool === before.tool && s.cam === before.cam);
  await page.evaluate(() => globalThis.__catsup.galleryHost.close()); await wait(100);
}

// ---------- B. 菜单 ----------
{ const before = await st();
  await page.click("#btnMenu"); await wait(120);
  ok("B.menu.opened", (await page.locator(".popup-menu").count()) >= 1);
  await page.keyboard.press("l"); await page.keyboard.press("Control+z"); await wait(60);
  const s = await st();
  ok("B.menu.keysSwallowed", s.tool === before.tool && s.rev === before.rev);
  ok("B.menu.staysOpen", (await page.locator(".popup-menu").count()) >= 1);
  await page.keyboard.press("Escape"); await wait(80);
  const s2 = await st();
  ok("B.menu.escClosesOnlyMenu", (await page.locator(".popup-menu").count()) === 0 && s2.depth === before.depth && s2.tool === before.tool);
  await page.evaluate(() => globalThis.__catsup.editor.setTool("line")); await wait(40);
  await page.click("#btnMenu"); await wait(120);
  await page.mouse.click(...mid(0.7, 0.7)); await wait(100);
  ok("B.menu.outsideCloses", (await page.locator(".popup-menu").count()) === 0);
  ok("B.menu.outsidePressDoesNotDraw", !(await st()).gesture);   // 关菜单的那一下不穿到工具
  await page.mouse.click(...mid(0.7, 0.7)); await wait(100);
  ok("B.menu.nextPressDraws", (await st()).gesture);
  await page.keyboard.press("Escape"); await wait(40);
  await page.evaluate(() => globalThis.__catsup.editor.setTool("select")); await wait(30);
  await page.click("#btnMenu"); await wait(120);
  await page.click("#btnUndo", { force: true }).catch(() => {}); await wait(100);
  ok("B.menu.otherButtonStillWorksThrough", (await page.locator(".popup-menu").count()) === 0);
  await page.evaluate(() => { const e = globalThis.__catsup.editor; e.deselectAll(); }); await wait(30);
}

// ---------- B2. 菜单那张面的账（v0.19.50，名册审计 = 设计稿第 8 节）：菜单的元素被别处删了 / 关菜单半路抛错，键盘和画布都照常 ----------
{ await page.evaluate(() => globalThis.__catsup.editor.setTool("select")); await wait(30);
  await page.click("#btnMenu"); await wait(120);
  await page.evaluate(() => document.querySelector(".popup-menu").remove()); await wait(30);   // 别处直接删了菜单的元素（以前 probe-new-primitive 就这么关菜单）
  await page.keyboard.press("k"); await wait(60);   // 硬表面画线 = K（v0.19.104 起 L = 选连着的一块；这里只要证明快捷键能到编辑器）
  ok("B2.menuElRemoved.keysWork", (await st()).tool === "line");
  await page.keyboard.press("Escape"); await wait(40);
  await page.evaluate(() => globalThis.__catsup.editor.setTool("select")); await wait(30);
  await page.click("#btnMenu"); await wait(120);
  // 关菜单半路抛错：删菜单元素那一下抛一次（只抛这一次，抛完自己换回去）
  await page.evaluate(() => { const orig = Element.prototype.remove; Element.prototype.remove = function () { if (this.classList?.contains("popup-menu")) { Element.prototype.remove = orig; throw new Error("INJECTED close throw (probe-input-gate B2)"); } return orig.call(this); }; });
  await page.keyboard.press("Escape"); await wait(80);
  ok("B2.closeThrow.injected", errs.some((e) => e.includes("INJECTED close throw")));
  await page.keyboard.press("k"); await wait(60);   // 硬表面画线 = K（v0.19.104 起 L = 选连着的一块；这里只要证明快捷键能到编辑器）
  ok("B2.closeThrow.keysWork", (await st()).tool === "line");
  await page.mouse.click(...mid(0.7, 0.7)); await wait(100);
  ok("B2.closeThrow.boardPressNotSwallowed", (await st()).gesture);   // 按在画布上的那一下进了画线工具（以前外点监听留着，每一下都被吞）
  await page.keyboard.press("Escape"); await wait(40);
  await page.evaluate(() => { document.querySelectorAll(".popup-menu").forEach((n) => n.remove()); globalThis.__catsup.editor.setTool("select"); }); await wait(30);
}

// ---------- 文本框 ----------
{ const before = await st();
  await page.evaluate(() => { const i = document.createElement("input"); i.id = "__probeInput"; i.style.cssText = "position:fixed;left:300px;top:10px;z-index:9"; document.body.appendChild(i); i.focus(); }); await wait(30);
  await page.keyboard.type("lg"); await wait(40);
  const s = await st();
  ok("text.keysGoToField", (await page.inputValue("#__probeInput")) === "lg" && s.tool === before.tool);
  await page.evaluate(() => document.getElementById("__probeInput").remove()); await wait(30);
}

// ---------- C. 第二层：绕过门口的程序事件 ----------
{ await page.evaluate(() => { void globalThis.__catsup.test.openConfirmSheet("探针", "问一句"); }); await wait(100);
  const before = await st();
  await page.evaluate(([x, y]) => { const c = document.getElementById("board");
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "z", code: "KeyZ", ctrlKey: true, bubbles: true }));
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "l", code: "KeyL", bubbles: true }));
    c.dispatchEvent(new WheelEvent("wheel", { deltaY: 240, clientX: x, clientY: y, bubbles: true, cancelable: true }));
    c.dispatchEvent(new PointerEvent("pointerdown", { pointerId: 9, pointerType: "mouse", button: 1, buttons: 4, clientX: x, clientY: y, bubbles: true }));
    c.dispatchEvent(new PointerEvent("pointermove", { pointerId: 9, pointerType: "mouse", buttons: 4, clientX: x + 80, clientY: y + 40, bubbles: true }));
    c.dispatchEvent(new PointerEvent("pointerup", { pointerId: 9, pointerType: "mouse", button: 1, clientX: x + 80, clientY: y + 40, bubbles: true }));
  }, mid()); await wait(80);
  const s = await st();
  ok("C.syntheticStopped", s.rev === before.rev && s.tool === before.tool && s.cam === before.cam);

  // ---------- D. 第三层：编辑器的人口自己也拒；程序提交照走 ----------
  const r = await page.evaluate(() => { const e = globalThis.__catsup.editor, r0 = e.revision;
    e.undo(); const afterUndo = e.revision;
    const modal = e.startModal("move");
    const committed = e.commitOp({ op: "addEdges", at: e.activePool(), segs: [[{ x: 5, y: 5, z: 0 }, { x: 6, y: 5, z: 0 }]] });
    return { undoRefused: afterUndo === r0, modalRefused: modal === true && !e.isGestureActive(), programCommitPasses: Array.isArray(committed) && e.revision !== r0 }; });
  ok("D.undoRefused", r.undoRefused); ok("D.modalRefused", r.modalRefused); ok("D.programCommitPasses", r.programCommitPasses);
  await page.keyboard.press("Escape"); await wait(100);
  const afterCommit = (await st()).rev;
  await page.keyboard.press("Control+z"); await wait(80);   // 面关了：撤销回来（第二层没把人卡死）
  ok("D.undoBackAfterClose", (await st()).rev !== afterCommit);
}

// ---------- E. 走路键盘 ----------
{ const r = await page.evaluate(async () => { const { locomotion, test } = globalThis.__catsup, f = locomotion.flat, was = f._enabled; f.setEnabled(true);
    const press = async (code, key) => { window.dispatchEvent(new KeyboardEvent("keydown", { code, key, bubbles: true })); await new Promise((r) => setTimeout(r, 10)); const d = f.isDown(code); window.dispatchEvent(new KeyboardEvent("keyup", { code, key, bubbles: true })); return d; };
    const free = await press("KeyW", "w");
    void test.openConfirmSheet("探针", "问一句"); await new Promise((r) => setTimeout(r, 60));
    const underFace = await press("KeyW", "w");
    document.getElementById("sheetCancel").click(); await new Promise((r) => setTimeout(r, 40));
    const inp = document.createElement("input"); document.body.appendChild(inp); inp.focus();
    const underText = await press("KeyW", "w"); inp.remove();
    f.setEnabled(was);
    return { free, underFace, underText }; });
  ok("E.walkKeysFree", r.free); ok("E.walkKeysStoppedByFace", !r.underFace); ok("E.walkKeysStoppedByText", !r.underText);
}

// ---------- F. 演示锁 ----------
await page.evaluate(() => globalThis.__catsup.editor.exitContext()); await wait(40);
await page.evaluate(async () => { const e = globalThis.__catsup.editor; e.setTool("line"); await globalThis.__catsup.session.setLocked(true); }); await wait(100);
{ const r0 = (await st()).rev;
  ok("F.lockDropsEditTool", (await st()).tool === "select");
  // 改模型的工具：拿不起来，说明原因；左柱那一格是灰的、不是死的
  const held = await page.evaluate(() => [...document.querySelectorAll("#toolbar .tool")].map((b) => ({ held: b.classList.contains("held"), label: b.querySelector(".tool-label")?.textContent ?? "" })));
  ok("F.railEditToolsGrey", held.some((x) => x.held) && held.some((x) => !x.held && x.label === "选择"));
  await page.keyboard.press("l"); await wait(50);
  ok("F.keyToolRefused", (await st()).tool === "select");
  ok("F.keyToolSaysWhy", await page.evaluate(() => /锁/.test(document.getElementById("hint").textContent)));
  await page.locator("#toolbar .tool.held").first().click(); await wait(60);
  ok("F.railClickRefused", (await st()).tool === "select");
  ok("F.railClickSaysWhy", await page.evaluate(() => /锁/.test(document.getElementById("hint").textContent)));

  // 只读 ①：选择工具真能选（选中 = 看读数，不改模型）
  await page.evaluate(() => { const e = globalThis.__catsup.editor; e.deselectAll(); e.zoomExtents(); e.draw(); }); await wait(50);
  await page.mouse.click(...mid()); await wait(80);
  ok("F.selectWorks", await page.evaluate(() => globalThis.__catsup.editor.hasAnySelection()));
  ok("F.selectNoRevision", (await st()).rev === r0);
  await page.evaluate(() => globalThis.__catsup.editor.deselectAll());

  // 只读 ②：卷尺有读数，落定不留线
  await page.evaluate(() => { const e = globalThis.__catsup.editor; e.setMode("geometry"); e.setTool("tape"); }); await wait(50);
  ok("F.tapePickedUp", (await st()).tool === "tape");
  await page.mouse.click(...mid(0.45, 0.5)); await wait(60);
  ok("F.tapeGestureRuns", (await st()).gesture);
  await page.mouse.move(...mid(0.6, 0.5)); await wait(60);
  await page.mouse.click(...mid(0.6, 0.5)); await wait(80);
  ok("F.tapeLeavesNoGuide", (await st()).rev === r0 && !(await st()).gesture);
  ok("F.tapeSaysNoGuide", await page.evaluate(() => /不留参考线/.test(document.getElementById("hint").textContent)));   // 没留就不许说「参考线 · 偏移」
  await page.evaluate(() => globalThis.__catsup.editor.setTool("select")); await wait(30);

  // 只读 ③：走路真能进（验证工作台 → 步行 → 点地放人 → FPS），WASD 进得去
  await page.evaluate(() => globalThis.__catsup.editor.setMode("verify")); await wait(80);
  const railWalk = page.locator("#toolbar .tool", { hasText: "步行" });
  ok("F.walkOnRailNotGrey", (await railWalk.count()) === 1 && !(await railWalk.evaluate((b) => b.classList.contains("held"))));
  await railWalk.click(); await wait(100);
  ok("F.walkPlacing", await page.evaluate(() => globalThis.__catsup.locomotion.isPlacing()));
  for (const [fx, fy] of [[0.5, 0.62], [0.3, 0.7], [0.7, 0.7], [0.5, 0.85]]) {   // 红 = 站不下（点在模型里）：换一处地面
    if (await page.evaluate(() => globalThis.__catsup.locomotion.isWalking())) break;
    await page.mouse.move(...mid(fx, fy)); await wait(60); await page.mouse.down(); await wait(30); await page.mouse.up(); await wait(250);
  }
  ok("F.walkEntered", await page.evaluate(() => globalThis.__catsup.locomotion.isWalking()));
  ok("F.walkNoRevision", (await st()).rev === r0);
  // 走路时右键 = 转视角，不出菜单（菜单开着键盘归菜单，人就走不动了；Linux 的 contextmenu 在按下时就来，Windows 在抬起时）
  await page.mouse.move(...mid()); await page.mouse.click(...mid(), { button: "right" }); await wait(120);
  ok("F.walkRightClickNoMenu", (await page.locator(".popup-menu").count()) === 0);
  await page.keyboard.down("w"); await wait(60);
  ok("F.walkKeysReachWalk", await page.evaluate(() => globalThis.__catsup.locomotion.flat.isDown("KeyW")));
  await page.keyboard.up("w"); await wait(30);
  await page.evaluate(() => globalThis.__catsup.locomotion.exitWalk()); await wait(100);
  await page.evaluate(() => globalThis.__catsup.editor.setMode("geometry")); await wait(60);

  // 枚举：Editor 每个公开方法无参调一遍（有选区、在手势外），模型不许变。名单现读源码（行首两格 + 名字 + 括号 = 公开方法；private 的调用者都在口后面），新加的方法自动进来。
  const editorSrc = readFileSync(new URL("../../src/editor/editor.ts", import.meta.url), "utf8");
  const publicNames = [...new Set([...editorSrc.matchAll(/^  (?:async )?([a-zA-Z]\w*)\(/gm)].map((m) => m[1]))];
  const swept = await page.evaluate((names0) => { const e = globalThis.__catsup.editor; e.selectAll();
    const SKIP = new Set(["constructor", "dispose", "resize", "draw", "loadScene", "loadKernel", "holdChanged", "setTool", "setMode", "beginComponentOrigin"]);   // 换文件 / 拿工具 = 合法，另外测过
    const proto = Object.getPrototypeOf(e), names = names0.filter((n) => !SKIP.has(n) && typeof Object.getOwnPropertyDescriptor(proto, n)?.value === "function");
    const r = e.revision, moved = [];
    for (const n of names) { const before = e.revision; try { const v = e[n](); if (v && typeof v.catch === "function") v.catch(() => {}); } catch { /* 没给参数抛了 = 没改 */ } if (e.revision !== before) moved.push(n); }
    return { n: names.length, moved, same: e.revision === r }; }, publicNames);
  await wait(250);
  ok("F.sweepEnough", swept.n > 100);
  ok("F.sweepNoMethodEdits", swept.moved.length === 0);
  if (swept.moved.length) console.log("这些方法锁着还改了模型：", swept.moved);
  console.log(`枚举了 ${swept.n} 个方法`);
  ok("F.sweepRevisionAfterAsync", (await st()).rev === r0);
}

console.log(JSON.stringify(out, null, 1));
const realErrs = errs.filter((e) => !e.includes("INJECTED close throw"));   // B2 故意抛的那一个不算
console.log(realErrs.length ? "PAGEERRORS:\n" + realErrs.join("\n") : "(no page errors)");
if (realErrs.length) process.exitCode = 1;
await b.close();

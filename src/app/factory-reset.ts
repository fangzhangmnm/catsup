// factory-reset.ts —— 还原出厂设置（家族 CLAUDE.md「命名与共享规矩」2½：全家一个语义、放开发者菜单、二次确认护栏、不硬拦——user 2026-10-21「全家swipe的语义统一，
//   然后full swipe应该有二次确定护栏，而且是开发者菜单里面」；形状抄 JRB src/factory-reset.ts）。created 2026-10-25 by Claude Fable 5.1（周账 F-76 CatsUp 那半的第二件）
//
// 范围 = 这台设备上本 app 的全部足迹：store 命名空间（IDB `catsup.defaultStore` + store 2.2.0 的 `.staging` 分库 + 同前缀全部 localStorage 键——库内 typed-consent 口子 wipeAppNamespace）
//   + device-kv 键（`catsup-<guid>:*`：UI 偏好 / 回执条 / 黑匣子 / 工具选项）+ 自家三个派生 IDB（`catsup-<guid>.thumbs` 缩略图 / `.crash` 崩溃影子 / `.gallery-registry` 图库名册）
//   + 本 app 的壳缓存（`catsup-` 前缀）+ 注销管着当前页面的那一个 SW → 带 `?factory=<时间戳>` reload 成新装。
// **不碰**：云端（正本在 OneDrive；还原出厂 ≠ 删模型）；Cache Storage `pwa-models`（家族共享；CatsUp 本来也没用）；兄弟 app 的任何东西（同域名下只动自己前缀）。
// 护栏两步、不硬拦（家规：app 不许硬拦，上限 = 警告可取消）：① 说明 sheet——有 N 个模型只在本机会一起删、不造逃生副本（可取消）；② 逐字确认（库内再比一次）。
// 被占着的库：gallery 包的缩略图库（idbThumbStore）没有 versionchange 自关，本页开过图库 → deleteDatabase 在本页等不到（onblocked）；崩溃影子库会自关但 boot 扫描后也开着。
//   所以不在本页硬等：reload 带 `?factory=<ts>`，开机第一件事（任何人开那些库之前）再删一遍 = finishFactoryResetAtBoot；时间戳 2 分钟内才认，免得旧书签把真崩溃影子删了。
// 持久层白名单：本文件允许 indexedDB.deleteDatabase（只删上面三个自家 GUID 库；test/redline-guard.test.mjs allow 登记）。
import { wipeAppNamespace, scanAppNamespace, disposeStore, hasStore, requireStore } from "../app-store.ts";
import { deviceKvWipeAll, deviceKvCount } from "./device-kv.ts";
import { openConfirmSheet, openInputSheet } from "./ui/sheets.ts";
import { reportError } from "./error-funnel.ts";
import { note } from "./debug-log.ts";
import { APP_ID, CRASH_DB_NAME, GALLERY_REGISTRY_DB, REMEMBER_DB, THUMB_DB_NAME } from "../config.ts";
import { APP_VERSION } from "../version.ts";

/** 自家三个派生库（都全删无损：缩略图可再生、崩溃影子是附加层、名册 CatsUp 单库几乎空）。store 自己的库归 wipeAppNamespace。 */
const OWN_DBS: readonly string[] = [THUMB_DB_NAME, CRASH_DB_NAME, GALLERY_REGISTRY_DB, REMEMBER_DB];   // + 记住的口令（2026-10-29；没勾过的设备没有这个库，删不存在的 = no-op）
const PHRASE = "还原出厂";
const MARKER = "factory";
const MARKER_MAX_AGE_MS = 2 * 60_000;
const BLOCKED_TIMEOUT_MS = 2000;

function deleteDbOrBlocked(name: string): Promise<"deleted" | "blocked"> {
  return new Promise((resolve) => {
    let settled = false;
    const done = (r: "deleted" | "blocked") => { if (!settled) { settled = true; resolve(r); } };
    const timer = setTimeout(() => done("blocked"), BLOCKED_TIMEOUT_MS);
    try {
      const req = indexedDB.deleteDatabase(name);
      req.onsuccess = () => { clearTimeout(timer); done("deleted"); };
      req.onerror = () => { clearTimeout(timer); done("blocked"); };
    } catch { clearTimeout(timer); done("deleted"); }   // 没有 indexedDB 的环境：没东西可删
  });
}

export interface FactoryResetDeps {
  setStatus: (msg: string, error?: boolean) => void;
  /** wipe 前收口：停自动保存 / 盲快照、家置空（之后 store 就 dispose 了，谁再写谁吃 StoreDisposedError）。 */
  beforeWipe: () => Promise<void> | void;
  /** 只注销管着当前页面的 SW + 只删 `catsup-` 前缀的缓存（pwa-shell 的那一步，不 reload）。 */
  clearOwnShell: () => Promise<void>;
}

/** 还原出厂主流程（☰ → 设置 →「开发者」→「还原出厂设置…」）。全程 in-app sheet；成功 = 带标记 reload，不在本页报成功。 */
export async function runFactoryReset(d: FactoryResetDeps): Promise<void> {
  if (typeof navigator !== "undefined" && navigator.onLine === false) { d.setStatus("还原出厂要联网（清掉缓存后需要重新下载 app）。", true); return; }   // 清壳后 reload 要联网，不然白屏
  const unsynced = hasStore() ? await requireStore().files.dirty.count().catch((e) => { reportError(e, "log"); return 0; }) : 0;
  const intro = "这台设备上本 app 的全部数据会被清掉，变成刚安装的样子。OneDrive 上的模型不受影响，重新登录就回来。"
    + (unsynced > 0 ? `⚠ 有 ${unsynced} 个模型还没传上去——会一起删掉，不会另存副本。想留的话先取消，去图库点那个模型的「处理…」传上去。` : "现在没有只在本机的模型。");
  if (!(await openConfirmSheet("还原出厂设置", intro, { danger: true, okLabel: "继续" }))) return;
  const typed = await openInputSheet("还原出厂设置", { placeholder: PHRASE, message: `输入「${PHRASE}」确认。`, okLabel: "还原出厂设置" });
  if (typed == null) return;
  if (typed.trim() !== PHRASE) { d.setStatus("输入不一致，什么都没动。", true); return; }   // 库内还会再比一次；先挡省一次 dispose
  note("app", `factory reset: start unsynced=${unsynced} store=${hasStore()}`);
  try {
    await d.beforeWipe();
    await disposeStore();
    const storeReport = await wipeAppNamespace({ appId: APP_ID, consent: { expected: PHRASE, typed: typed.trim() } });
    const own = await Promise.all(OWN_DBS.map(deleteDbOrBlocked));
    const lsRemoved = deviceKvWipeAll();
    try { await d.clearOwnShell(); } catch (e) { reportError(e, "log"); }
    // 被占着的（本页开过图库 → 缩略图库连接还在）不在这里硬等：带标记 reload，开机第一件事再删一遍（finishFactoryResetAtBoot）。
    console.info(`[factory-reset] store dbs deleted=${storeReport.deletedDatabases.length} blocked=${storeReport.blockedDatabases.length} keys=${storeReport.localStorageKeysRemoved}; own=[${own.join(",")}]; device-kv keys=${lsRemoved}`);
    const target = `${location.pathname}?${MARKER}=${Date.now()}`;
    setTimeout(() => location.replace(target), 150);
    setTimeout(() => { location.href = target; }, 2500);   // 看门狗（pwa-shell forceReset 同款：第一脚没走再踢一次）
  } catch (e) {
    if ((e as { name?: string } | null)?.name === "WipeConsentError") { d.setStatus("输入不一致，什么都没动。", true); return; }
    reportError(e instanceof Error ? e : new Error(String(e)));
    setTimeout(() => location.reload(), 1500);   // store 可能已 dispose，留在页面上只会一路 StoreDisposedError
  }
}

/** 开机：URL 带 `?factory=<ts>` 且 2 分钟内 = 上一页刚还原出厂。 */
export function hasFactoryResetMarker(): boolean {
  const v = new URLSearchParams(location.search).get(MARKER);
  const ts = v ? Number(v) : NaN;
  return Number.isFinite(ts) && Math.abs(Date.now() - ts) < MARKER_MAX_AGE_MS;
}
/** 开机收尾（在任何人开这些库之前调）：再删一遍自家三个库 + 扫 store 命名空间，报一行结果，把标记从地址栏拿掉。 */
export async function finishFactoryResetAtBoot(setStatus: (msg: string, error?: boolean) => void): Promise<void> {
  const own = await Promise.all(OWN_DBS.map(deleteDbOrBlocked));
  const scan = await scanAppNamespace(APP_ID).catch(() => null);
  const residue = (scan ? scan.databases.length + scan.localStorageKeys : 0) + own.filter((r) => r === "blocked").length;
  note("app", `factory reset: boot finish own=[${own.join(",")}] storeDbs=${scan?.databases.length ?? "?"} storeKeys=${scan?.localStorageKeys ?? "?"} deviceKv=${deviceKvCount()}`);
  setStatus(residue === 0 ? `已还原出厂设置 · ${APP_VERSION}` : `还原出厂做完，但本机还剩 ${residue} 项没清干净（可能被别的标签页占着）；关掉本 app 的其他标签页再做一次。`, residue !== 0);
  try { history.replaceState(null, "", location.pathname); } catch { /* 地址栏留着标记也无妨 */ }
}

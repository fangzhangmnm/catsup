// crash-store.ts —— T-crash 灾难恢复库（WeebPaint src/crash-store.ts 同形，2026-08-26 verdicts §2.2 奶酪令；user 2026-09-20「234批准」开建）。
// created 2026-09-20 by Claude Fable 5.1
//
// 奶酪令：本库永远是**附加层**——dirty 徽章 + 挽留 sheet + beforeunload 是承重层，设计假设本库不存在。
//   app 自己的 IDB、不走 store（家规：T-crash 影子不是文档字节的家；图库家的影子 = store 本地副本，不进本库）。
// 形状（Blockbench 式）：30 s 空闲**盲快照**（与保存同一 writeCatsup 字节）、同一张**行李牌**覆盖写单帧、**正常关闭即删**、boot 非模态通知叠画布。
// 行李牌 = 每次打开现铸、只活在 RAM + 本库、正常关闭即焚、永不写进文件、永不参与匹配（非身份，只是快照的收件人地址）。
// 两种记录态：crash | pending-adoption（登录 redirect 前的留声：页面将死但不是关闭）；**pending 在场时 dropOnCleanClose 必须拒绝**——契约测试钉死。
// 已知失败（诚实账）：整源驱逐无解（best-effort）；Chromium file:// 共桶内快照对任何本地 html 可读；Safari file:// 存储 SecurityError → 调用方 try/catch 降级纯内存。
// 结构：契约逻辑（拒删 / 原子领养 / 单帧覆盖）走 CrashKV port → node 可测（Map 假件）；IDB 适配器只做搬运，原子性落在 port 的 take（get+delete 同事务，防双领养）。
import { CRASH_DB_NAME } from "../config.ts";

export type LuggageTag = string;
export type CrashRecordState = "crash" | "pending-adoption";

export interface CrashRecordMeta {
  tag: LuggageTag;
  state: CrashRecordState;
  name: string;                       // 展示名——给恢复通知看，不是身份
  at: number;                         // 快照时刻（ms）
  homeKind: "file" | "transient";     // 家提示（恢复文案用；gallery 家不进本库）
}
export interface CrashRecord extends CrashRecordMeta { bytes: Blob }

/** 存储 port。原子性责任在 port：take = 取 + 删同一事务（防双领养）。 */
export interface CrashKV {
  put(rec: CrashRecord): Promise<void>;
  get(tag: LuggageTag): Promise<CrashRecord | null>;
  take(tag: LuggageTag): Promise<CrashRecord | null>;
  delete(tag: LuggageTag): Promise<void>;
  list(): Promise<CrashRecord[]>;
}

export function mintLuggageTag(): LuggageTag {
  return "tag-" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export interface CrashStore {
  /** 盲快照：同 tag 覆盖写单帧（与保存同一 writeCatsup 字节）。 */
  put(tag: LuggageTag, bytes: Blob, meta: Omit<CrashRecordMeta, "tag">): Promise<void>;
  /** 正常关闭即删（含显式写回成功后清旧帧）。⚠ pending-adoption 必须拒绝（unload ≠ 关闭，契约钉）。 */
  dropOnCleanClose(tag: LuggageTag): Promise<void>;
  /** 显式丢弃（恢复通知的「丢弃」按钮）：用户明确决定 → pending 也删。 */
  discard(tag: LuggageTag): Promise<void>;
  /** boot 扫描：只出 meta（不搬字节），新→旧。crash → 恢复通知；pending-adoption → 自动领养。 */
  listAtBoot(): Promise<CrashRecordMeta[]>;
  /** 领养：事务化取 + 删（防双领养）。已被领 / 不存在 → null；领养出的 doc 视为 dirty 直到首次真保存（Blockbench #2684/#2003 两坑，由 session.adoptRecovered 保证）。 */
  adopt(tag: LuggageTag): Promise<Blob | null>;
}

export function createCrashStore(kv: CrashKV): CrashStore {
  return {
    async put(tag, bytes, meta) { await kv.put({ ...meta, tag, bytes }); },
    async dropOnCleanClose(tag) {
      const r = await kv.get(tag);
      if (!r) return;
      if (r.state === "pending-adoption") return;   // ★ 拒绝：redirect 期的 unload 不是关闭
      await kv.delete(tag);
    },
    async discard(tag) { await kv.delete(tag); },
    async listAtBoot() {
      const all = await kv.list();
      return all.map(({ tag, state, name, at, homeKind }) => ({ tag, state, name, at, homeKind })).sort((a, b) => b.at - a.at);
    },
    async adopt(tag) { const r = await kv.take(tag); return r?.bytes ?? null; },
  };
}

// ─── IDB 适配器（浏览器；node 测试用 Map 假件替代本段）────────────────────
// 库名带 GUID 命名空间前缀（config.ts CRASH_DB_NAME；纪律：永不枚举非自己前缀的库）。
const STORE = "records";   // key = 行李牌 tag

let _dbPromise: Promise<IDBDatabase> | null = null;
function _openDB(): Promise<IDBDatabase> {
  if (_dbPromise) return _dbPromise;
  _dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(CRASH_DB_NAME, 1);
    req.onupgradeneeded = () => { const db = req.result; if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE); };
    req.onsuccess = () => { req.result.onversionchange = () => { req.result.close(); _dbPromise = null; }; resolve(req.result); };
    req.onerror = () => { _dbPromise = null; reject(req.error); };
    req.onblocked = () => reject(new Error("crash db upgrade blocked"));
  });
  return _dbPromise;
}
function _tx<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T> | void): Promise<T> {
  return _openDB().then((db) => new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    let out: IDBRequest<T> | void;
    try { out = run(tx.objectStore(STORE)); } catch (e) { reject(e); return; }
    tx.oncomplete = () => resolve(out ? out.result : (undefined as T));
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error("crash db tx aborted"));
  }));
}

export function idbCrashKV(): CrashKV {
  return {
    put: (rec) => _tx("readwrite", (s) => { s.put(rec, rec.tag); }),
    get: async (tag) => (await _tx<CrashRecord | undefined>("readonly", (s) => s.get(tag))) ?? null,
    // 原子领养：get + delete 同一 readwrite 事务——两个 tab 同时 adopt，事务序列化保证只有一个拿到。
    take: async (tag) => {
      let got: CrashRecord | null = null;
      await _tx("readwrite", (s) => {
        const g = s.get(tag);
        g.onsuccess = () => { got = (g.result as CrashRecord | undefined) ?? null; if (got) s.delete(tag); };
      });
      return got;
    },
    delete: (tag) => _tx("readwrite", (s) => { s.delete(tag); }),
    list: async (): Promise<CrashRecord[]> => (await _tx<CrashRecord[]>("readonly", (s) => s.getAll())) ?? [],
  };
}

/** 浏览器单例（懒开库：import 本身零 IDB 访问，node 测试 import 安全）。 */
export const crashStore: CrashStore = createCrashStore(idbCrashKV());

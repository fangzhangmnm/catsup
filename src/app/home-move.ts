// home-move.ts —— 把只在浏览器里的模型搬进新家（家族 ai-docs/20261103-library-needs-a-home.md §4 第 3 步；工单 F-153）；「放回图库（还是加密的）」共用同一条写路。
// created 2026-11-04 by Claude Opus 5.5
//
// 不变量（顺序不能反）：读源 → 写新家（只新建，撞名换名，绝不覆盖）→ **从新家读回、逐字节比** → 相等才从旧库移走（进旧库回收站，不硬删）。
//   任何一步不成：源那份原样留着，新家写坏的那份收走，名字进失败名单。加密件全程是容器字节，这里不碰口令、不解开。
// 纯函数 + 注入：node 直测（test/home-move.test.ts 用真库 + 假云盘）。

/** 两段字节一样吗（先比大小，再逐块比；不把整份留在内存里比字符串）。 */
export async function sameBytes(a: Blob, b: Blob): Promise<boolean> {
  if (a.size !== b.size) return false;
  const CHUNK = 4 * 1024 * 1024;
  for (let at = 0; at < a.size; at += CHUNK) {
    const [x, y] = await Promise.all([a.slice(at, at + CHUNK).arrayBuffer(), b.slice(at, at + CHUNK).arrayBuffer()]);
    const ax = new Uint8Array(x), ay = new Uint8Array(y);
    for (let i = 0; i < ax.length; i++) if (ax[i] !== ay[i]) return false;
  }
  return true;
}

export interface VerifiedWritePorts {
  /** 只新建（store mode:"new"）；撞名抛 name = "CloudNameCollisionError"。没落进新家（pushed:false）也要抛。 */
  writeNew(identifier: string, bytes: Blob): Promise<void>;
  /** 从新家真正的落点读回 at-rest 字节（文件夹 = 夹里那个文件，不是缓存）；读不到 = null。 */
  readBack(identifier: string): Promise<Blob | null>;
  /** 写坏了：把新家这份收走。 */
  discard(identifier: string): Promise<void>;
  /** 第 n 次撞名换的名字（主干后面加 (n)，后缀不动）。 */
  renamed(identifier: string, n: number): string;
}
const MAX_RENAMES = 50;
const isCollision = (e: unknown): boolean => (e as { name?: string } | null)?.name === "CloudNameCollisionError";

/** 写进新家并读回比过。返回最后用的名字；不成就抛（新家不留坏的那份）。 */
export async function writeNewVerified(identifier: string, bytes: Blob, p: VerifiedWritePorts): Promise<string> {
  let name = identifier;
  for (let n = 2; ; n++) {
    try { await p.writeNew(name, bytes); break; }
    catch (e) {
      if (!isCollision(e) || n > MAX_RENAMES) throw e;
      name = p.renamed(identifier, n);
    }
  }
  const back = await p.readBack(name);
  if (!back || !(await sameBytes(bytes, back))) {
    await p.discard(name).catch(() => {});
    throw new Error("written bytes differ on read-back");
  }
  return name;
}

export interface HomeMovePorts extends VerifiedWritePorts {
  /** 源里的 at-rest 字节：加密件 = 容器，明文 = 原文。读不到 = null。 */
  read(identifier: string): Promise<Blob | null>;
  /** 比过字节之后从旧库移走（进旧库回收站）。 */
  removeFromSource(identifier: string): Promise<void>;
  onProgress?(done: number, total: number): void;
}
export interface HomeMoveResult {
  moved: { from: string; to: string }[];
  failed: { identifier: string; reason: string }[];
  /** 新家有了、字节比过，但旧库那份没移走（不丢，只是还占着）。 */
  leftInSource: string[];
}

export async function moveToHome(ids: readonly string[], p: HomeMovePorts): Promise<HomeMoveResult> {
  const r: HomeMoveResult = { moved: [], failed: [], leftInSource: [] };
  let done = 0;
  for (const id of ids) {
    p.onProgress?.(done++, ids.length);
    try {
      const bytes = await p.read(id);
      if (!bytes) { r.failed.push({ identifier: id, reason: "读不到这份的字节" }); continue; }
      const to = await writeNewVerified(id, bytes, p);
      r.moved.push({ from: id, to });
      try { await p.removeFromSource(id); }
      catch { r.leftInSource.push(id); }
    } catch (e) { r.failed.push({ identifier: id, reason: (e as Error)?.message ?? String(e) }); }
  }
  p.onProgress?.(ids.length, ids.length);
  return r;
}

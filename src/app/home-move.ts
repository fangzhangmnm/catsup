// home-move.ts —— 把只在浏览器里的模型搬进新家（家族 ai-docs/20261103-library-needs-a-home.md §4 第 3 步；工单 F-153）；「放回图库（还是加密的）」共用同一条写路。
// created 2026-11-04 by Claude Opus 5.5（被杀会话的半成品；同日接手的 Opus 5.5 补上「两类」「已经在了不重写」「写没落地才收走」，照 MoonSinger src/app/move-songs.ts）
//
// 不变量（顺序不能反）：读源 → 写新家（只新建，撞名换名，绝不覆盖）→ **从新家真的落点读回、逐字节比** → 相等才动旧库（进旧库回收站，不硬删）。
//   任何一步不成：源那份原样留着，名字进失败名单，接着搬下一份。加密件全程是容器字节，这里不碰口令、不解开。
// 两类（看库的列举状态 syncState）：
//   move = 从没同步过（float / local-only）：世界上只有浏览器这一份 → 核过字节后从旧库移走。
//   copy = 连着网盘的谱系、这台有没传上去的改动（unpushed / conflict / ghost）→ 拷一份进新家，**旧的不动**：
//          从旧库移走它 = 库在离线时排一条云端删除（store works/delete.js：有 base etag 就排队），回线就把网盘上那份也删了。
//   其余（synced 等）= 正本在网盘上，不算「只在浏览器里」，不碰。
// 已经在了：新家同名那份字节一模一样 = 算写好了（上次搬到一半 / 拷过一次），不重写、不加编号。
// 纯函数 + 注入：node 直测（test/home-move.test.ts 用真库 + 假云盘）；真 FSA + 真 store = test/probes/probe-folder-home.mjs。

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

/** 写口说「落了本机、没落进新家」（store save 返 pushed:false）。只有这种才把新家这份收走：它确实是我们刚写的。 */
export class NotLandedError extends Error {
  constructor(identifier: string, reason?: string) { super(`not landed in the new home: ${identifier}${reason ? ` (${reason})` : ""}`); this.name = "NotLandedError"; }
}

export interface VerifiedWritePorts {
  /** 只新建（store mode:"new"）；撞名抛 name = "CloudNameCollisionError"；落了本机没落进新家抛 NotLandedError。 */
  writeNew(identifier: string, bytes: Blob): Promise<void>;
  /** 从新家真正的落点读 at-rest 字节（文件夹 = 夹里那个文件，不是缓存）；没有 = null。 */
  readBack(identifier: string): Promise<Blob | null>;
  /** 写坏了 / 没落地：把新家这份收走（进新家的回收站）。 */
  discard(identifier: string): Promise<void>;
  /** 第 n 次撞名换的名字（主干后面加 (n)，后缀不动）。 */
  renamed(identifier: string, n: number): string;
}
const MAX_RENAMES = 50;
const isCollision = (e: unknown): boolean => (e as { name?: string } | null)?.name === "CloudNameCollisionError";

/** 写进新家并读回比过。返回最后用的身份（wrote = false：同名那份本来就一模一样，没重写）。不成就抛；新家只留比过的。 */
export async function writeNewVerified(identifier: string, bytes: Blob, p: VerifiedWritePorts): Promise<{ identifier: string; wrote: boolean }> {
  let name = identifier;
  for (let n = 2; ; n++) {
    const there = await p.readBack(name);
    if (there && (await sameBytes(bytes, there))) return { identifier: name, wrote: false };
    if (!there) {
      try { await p.writeNew(name, bytes); break; }
      catch (e) {
        if (e instanceof NotLandedError) { await p.discard(name).catch(() => {}); throw e; }
        if (!isCollision(e)) throw e;   // 别的错：不乱换名字、不碰新家（那个名字下可能是别人的东西）
      }
    }
    if (n > MAX_RENAMES) throw new Error(`too many name collisions for ${identifier}`);
    name = p.renamed(identifier, n);
  }
  const back = await p.readBack(name);
  if (!back || !(await sameBytes(bytes, back))) {
    await p.discard(name).catch(() => {});
    throw new Error(back ? "written bytes differ on read-back" : "not found in the new home after writing");
  }
  return { identifier: name, wrote: true };
}

export type MoveKind = "move" | "copy";
export interface ModelToMove { identifier: string; kind: MoveKind }
/** 这份该怎么搬（syncState = 库的列举状态）。null = 不归搬家管。 */
export function moveKindOf(syncState: string | null | undefined): MoveKind | null {
  if (syncState === "float" || syncState === "local-only") return "move";
  if (syncState === "unpushed" || syncState === "conflict" || syncState === "ghost") return "copy";
  return null;
}

export interface HomeMovePorts extends VerifiedWritePorts {
  /** 源里的 at-rest 字节：加密件 = 容器，明文 = 原文。读不到 = null。 */
  read(identifier: string): Promise<Blob | null>;
  /** 比过字节之后从旧库移走（进旧库回收站）。只会对 kind = move 调。没进回收站要抛。 */
  removeFromSource(identifier: string): Promise<void>;
  onProgress?(done: number, total: number): void;
}
export interface HomeMoveResult {
  /** 字节核过、旧库已移走。 */
  moved: { from: string; to: string }[];
  /** 字节核过、旧的留着（连着网盘的）。 */
  copied: { from: string; to: string }[];
  /** 没搬成：旧库里那份一个字节没动。 */
  failed: { identifier: string; reason: string }[];
  /** 新家里有了（字节核过），但旧库那份没移走：不丢，只是旧库还没空。 */
  stuck: { identifier: string; reason: string }[];
}
const why = (e: unknown): string => (e instanceof Error ? e.message : String(e));

export async function moveToHome(items: readonly ModelToMove[], p: HomeMovePorts): Promise<HomeMoveResult> {
  const r: HomeMoveResult = { moved: [], copied: [], failed: [], stuck: [] };
  let done = 0;
  for (const it of items) {
    p.onProgress?.(done++, items.length);
    let to: string;
    try {
      const bytes = await p.read(it.identifier);
      if (!bytes) { r.failed.push({ identifier: it.identifier, reason: "这台设备上读不到它的字节" }); continue; }
      to = (await writeNewVerified(it.identifier, bytes, p)).identifier;
    } catch (e) { r.failed.push({ identifier: it.identifier, reason: why(e) }); continue; }
    if (it.kind === "copy") { r.copied.push({ from: it.identifier, to }); continue; }
    try { await p.removeFromSource(it.identifier); r.moved.push({ from: it.identifier, to }); }
    catch (e) { r.stuck.push({ identifier: it.identifier, reason: why(e) }); }
  }
  p.onProgress?.(items.length, items.length);
  return r;
}

// ---- 口令验证器跟着搬（Fable 11-04 裁定）----
//   只在「这趟搬进去的里面有加密件 ∧ 新家还没有验证器」时，把源库 app-state 的验证器**原样**拷过去（它本来就是 store 的 collection，不是新持久层）。
//   新家已有 → 一个字不动（搬进去的加密件用原口令开）。「还没有」要和新家对过一次才算：对不上 = 不拷——collection 按条目比时间戳，拷过去的戳新，会盖掉夹里已有的那个。
export type VerifierCarry = "copied" | "dest-has-own" | "source-has-none" | "dest-unknown" | "not-needed";
export interface VerifierCarryPorts {
  /** 源库的验证器（没有 = null）。 */
  source(): Promise<unknown | null>;
  /** 新家的验证器；known = 和新家真的对过一次（没对上 = 不知道）。 */
  dest(): Promise<{ known: boolean; record: unknown | null }>;
  /** 原样写进新家。 */
  write(record: unknown): Promise<void>;
}
export async function carryVerifier(movedEncrypted: boolean, p: VerifierCarryPorts): Promise<VerifierCarry> {
  if (!movedEncrypted) return "not-needed";
  const src = await p.source();
  if (src == null) return "source-has-none";
  const d = await p.dest();
  if (!d.known) return "dest-unknown";
  if (d.record != null) return "dest-has-own";
  await p.write(src);
  return "copied";
}
/** 结果那句话后面接的一句（没事可说 = 空）。 */
export function verifierSay(c: VerifierCarry, home: string): string {
  if (c === "copied") return `图库口令也一起搬进「${home}」了，加密的用原来的口令开`;
  if (c === "dest-has-own") return `文件夹已有自己的口令，搬进去的加密件用原口令开`;
  if (c === "dest-unknown") return `没对上「${home}」里有没有口令，口令没搬；搬进去的加密件用原口令开`;
  return "";
}

/** 这趟搬完，旧库算不算空了（全部搬成 / 拷成才算；拷过去的旧的留着不影响：它们的正本谱系在网盘）。 */
export const moveFinished = (r: HomeMoveResult): boolean => r.failed.length === 0 && r.stuck.length === 0;

/** 结果说一句人话（带名单：UX 误导 = 数据安全缺陷，家族 10-26）。 */
export function moveSay(r: HomeMoveResult, home: string, nameOf: (identifier: string) => string): { text: string; bad: boolean } {
  const names = (l: readonly { identifier: string }[]): string => l.slice(0, 5).map((x) => nameOf(x.identifier)).join("、") + (l.length > 5 ? ` 等 ${l.length} 份` : "");
  const renamed = [...r.moved, ...r.copied].filter((m) => m.from !== m.to).length;
  const parts: string[] = [];
  if (r.moved.length) parts.push(`${r.moved.length} 份搬进了「${home}」${renamed ? `（${renamed} 份撞名，加了编号）` : ""}，浏览器里的移进了浏览器的回收站`);
  if (r.copied.length) parts.push(`${r.copied.length} 份连着网盘的拷了一份过去，浏览器里那份留着（登录网盘后照常同步）`);
  if (r.stuck.length) parts.push(`${r.stuck.length} 份已经在「${home}」里了，但浏览器里的旧的没移走：${names(r.stuck)}`);
  if (r.failed.length) parts.push(`${r.failed.length} 份没搬成，还在浏览器里，一个字节没动：${names(r.failed)}`);
  if (!parts.length) parts.push("没有要搬的模型");
  return { text: parts.join("；"), bad: r.failed.length > 0 || r.stuck.length > 0 };
}

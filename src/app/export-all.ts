// export-all.ts —— 图库「全部导出」（家族 ai-docs/20261103-library-needs-a-home.md §4 第 1 步；created 2026-11-03 by Claude Opus 5.5，工单 C2 ④）。
//   没登录时图库里的模型只在这台设备的浏览器里：先给一个把它们全部拿走的出口，再谈以后收入口（「先保住已有的作品，再收入口」）。
//   打成一个 zip：一次下几十个单文件会被浏览器拦 / iPad 上弹几十次分享。文件夹结构跟图库走。
//   **加密件原样搬密文**（RawFile.getEncryptedBlob），绝不 open() 解开再存（规则书 §1 第 5 条）；这里也用不着口令。
//   一份拿不到不算全部成功：结果带名单，宿主如实说（UX 误导 = 数据安全缺陷）。
// 纯函数 + 注入：node 直测。

export interface ExportEntry { identifier: string; encrypted: boolean }
export interface ExportAllPorts {
  /** 一个文件夹的一帧本地列举（直属文件 + 子夹全路径）。 */
  listFolder(folder: string): Promise<{ identifiers: string[]; folders: string[] }>;
  /** 加密件 = 容器字节；不是加密件 = null。 */
  encryptedBytes(identifier: string): Promise<Blob | null>;
  /** 明文件的字节；拿不到 = null。 */
  plainBytes(identifier: string): Promise<Blob | null>;
  pack(entries: { path: string; data: Uint8Array }[]): Promise<Blob>;
}
export interface ExportAllResult { zip: Blob | null; plain: number; encrypted: number; failed: string[] }

/** 容器在 zip 里叫 `<名>.zip`：7-Zip 输口令可恢复；CatsUp 打开时靠字节认容器（session.openLocalBytes），不靠后缀。 */
const entryPath = (identifier: string, encrypted: boolean): string => (encrypted ? `${identifier}.zip` : identifier);

export async function exportAll(p: ExportAllPorts): Promise<ExportAllResult> {
  const ids: string[] = [];
  const failed: string[] = [];
  const queue = [""];
  while (queue.length) {
    const dir = queue.shift()!;
    try { const f = await p.listFolder(dir); ids.push(...f.identifiers); queue.push(...f.folders); }
    catch { failed.push(dir ? `${dir}/（整个文件夹）` : "（根文件夹）"); }
  }
  const entries: { path: string; data: Uint8Array }[] = [];
  let plain = 0, encrypted = 0;
  for (const id of ids) {
    try {
      const enc = await p.encryptedBytes(id);
      const blob = enc ?? await p.plainBytes(id);
      if (!blob) { failed.push(id); continue; }
      entries.push({ path: entryPath(id, !!enc), data: new Uint8Array(await blob.arrayBuffer()) });
      if (enc) encrypted++; else plain++;
    } catch { failed.push(id); }
  }
  return { zip: entries.length ? await p.pack(entries) : null, plain, encrypted, failed };
}

/** 导出结果说一句人话。 */
export function exportAllSay(r: ExportAllResult, fileName: string): { text: string; bad: boolean } {
  const n = r.plain + r.encrypted;
  if (!n && !r.failed.length) return { text: "图库里还没有模型", bad: false };
  const enc = r.encrypted ? `（其中 ${r.encrypted} 份是加密的，导出的还是加密的，要用原口令才打得开）` : "";
  if (!r.failed.length) return { text: `已导出 ${n} 份模型到 ${fileName}${enc}`, bad: false };
  const names = r.failed.slice(0, 5).join("、") + (r.failed.length > 5 ? ` 等 ${r.failed.length} 项` : "");
  return { text: n ? `只导出了 ${n} 份到 ${fileName}${enc}。这些没拿到：${names}` : `没能导出：${names}`, bad: true };
}

// Slice B 测试基建：让真 cloud.js 跑在 MockCloudProvider 上。

// 内存 localStorage —— cloud.js 的 etag/dirty 缓存读全局 localStorage（node 无）。
export function memLS() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
    clear: () => m.clear(),
    _map: m,
  };
}

// graph 表面适配器：把 clean CloudProvider 包成 graph.js 的接口形态，注入未重构的 cloud.js。
// 这是 strangler 期的临时桥（cloud.js 仍调 graph 表面）；cloud.js 逻辑搬进 Store 后会反向
// 重构成直接消费 clean provider，届时此桥退役。
// 关键映射：clean item.isFolder ↔ graph item.file/.folder（cloud.js 读 it.file / it.folder）。
export function graphFromProvider(provider) {
  const toGraphItem = (it) => it && ({
    ...it,
    file: it.isFolder ? undefined : {},
    folder: it.isFolder ? {} : undefined,
  });
  return {
    listChildren: async (sub = "") => (await provider.list(sub)).map(toGraphItem),
    getItemByPath: async (path) => toGraphItem(await provider.getItemByPath(path)),
    downloadItemBlob: (id) => provider.download(id),
    downloadItemRange: (id, offset, length) => provider.downloadRange(id, offset, length),
    uploadFileToApproot: (path, blob, ct, opts = {}) =>
      provider.upload(path, blob, { contentType: ct, ...opts }).then(toGraphItem),
    deleteItem: (id) => provider.delete(id),
    ensureSubfolder: (name) => provider.ensureFolder(name),
    moveItemToFolder: (id, folderId, opts) => provider.move(id, folderId, opts).then(toGraphItem),
    renameItem: (id, newName, eTag) => provider.rename(id, newName, eTag).then(toGraphItem),
    getApprootId: () => provider.getApprootId(),
  };
}

export async function blobText(blob) {
  return new TextDecoder().decode(new Uint8Array(await blob.arrayBuffer()));
}

// C7 无令牌像素写硬化（census §3.6）后的测试种子口：灌「不进 undo 的初态」必须走显式声明态
// （collector suspend 窗——与 load 灌入同一白名单）。接受 ViewLeaf 或 LayerPixels。
// ⚠ 只准在令牌外用（令牌内包它会吞掉写时扣押的记账）。
export function seedWrite(leafOrLp, fn) {
  const lp = leafOrLp.pixels ?? leafOrLp;
  const owner = lp._collectorOwner;   // LayerTiles 所有权戳（无主 scratch 本就放行，owner 为空是合法态）
  owner?._suspendCollect(true);
  try { return fn(); } finally { owner?._suspendCollect(false); }
}

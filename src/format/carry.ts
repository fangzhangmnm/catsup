// carry.ts —— round-trip 保真的二进制半边：未知 JSON 里凡是 `{ bufferView: N }`（glTF 生态的约定字段名，gltf-transform 同法）
// 读时把它引用的字节拷出来，写时重新落 BIN 并把 N 改成新索引。纯函数。created 2026-09-20 by Claude Fable 5.1

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null && !Array.isArray(x);

/** 收集 json 树里所有 bufferView 引用（去重）。 */
export function collectBufferViewRefs(json: unknown, out = new Set<number>()): Set<number> {
  if (Array.isArray(json)) { for (const x of json) collectBufferViewRefs(x, out); return out; }
  if (!isObj(json)) return out;
  for (const [k, v] of Object.entries(json)) {
    if (k === "bufferView" && typeof v === "number") out.add(v);
    else collectBufferViewRefs(v, out);
  }
  return out;
}

/** 深拷贝并按 map 重写 bufferView 索引（缺映射 = 引用了没携带的视图，报错不猜）。 */
export function remapBufferViewRefs<T>(json: T, map: (old: number) => number): T {
  if (Array.isArray(json)) return json.map((x) => remapBufferViewRefs(x, map)) as unknown as T;
  if (!isObj(json)) return json;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(json)) out[k] = k === "bufferView" && typeof v === "number" ? map(v) : remapBufferViewRefs(v, map);
  return out as T;
}

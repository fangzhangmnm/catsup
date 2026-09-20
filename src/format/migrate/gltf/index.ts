// migrate/gltf —— 跨 glTF 版本的兼容（契约 §7 第 10 款）：2.x 之间的改名 / 废弃在这里承接；写入目标 = three/Blender 已支持的最高版本。
// v1：读任何 asset.version 2.x，无需改写。created 2026-09-20 by Claude Fable 5.1
export const WRITE_GLTF_VERSION = "2.1";
export const MIN_GLTF_VERSION = "2.0";

export function assertReadableGltfVersion(version: unknown): void {
  if (typeof version !== "string" || !/^2\.\d+$/.test(version)) throw new Error(`glTF asset.version ${String(version)} unsupported (need 2.x)`);
}

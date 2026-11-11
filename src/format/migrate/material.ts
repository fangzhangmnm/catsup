// migrate/material.ts —— 材质色的读法按拍子分（立宪 §7：迁移住本文件夹）。created 2026-10-30 by Claude Opus 5.5
// CATSUP_material 1.1 起（2026-10-30）baseColorFactor 按 glTF 规定存线性值（color-space.ts；user「文件边界换算 同意」）；
// 1.0 及以前、以及没挂 CATSUP_material 的纯色材质（1.1 之前只有带贴图的材质才挂）存的是 sRGB 的数 → 原样读。
// （user 说过「老文件我们现在真的不用念旧」；留这一步是因为老样本「打开语义不变」的立宪守卫——要拿掉得先改那条守卫。）
import { linearToSrgb } from "../color-space.ts";
import { readStamp } from "./index.ts";
import { COLOR_VALUE, type TextureDoc } from "../document.ts";
import { mintGuid } from "../guid.ts";

/** 文件里的 baseColorFactor（前三个分量）→ app 里的 sRGB 材质色。ext = 这个材质的 CATSUP_material 原样（没有 = null）。 */
export function materialColorFromFile(bc: readonly (number | undefined)[], ext: Record<string, unknown> | null): [number, number, number] {
  const c: [number, number, number] = [bc[0] ?? 0.8, bc[1] ?? 0.8, bc[2] ?? 0.8];
  const linear = ext !== null && readStamp(ext).minor >= 1;
  return linear ? [linearToSrgb(c[0]), linearToSrgb(c[1]), linearToSrgb(c[2])] : c;
}

// ---- 图搬进贴图表（CATSUP_material 1.3 / CATSUP_textures 1.0，2026-11-10 Claude Opus 5.5；贴图主线 1-0½，施工单 ai-docs/20261110-paint-workorders-2.md 第二节）----
// 老文件（材质扩展没有 channels、标准那一半 baseColorTexture 有图：1.2 和更老，或者被老版本存过一遍的新文件）：现铸一个 GUID，贴图表加一行，材质的 channels.color 指它。
// 名字 = 材质的名字；value = 颜色；尺寸 = 材质扩展里的 sizeM（老读者的回声），没有 = 一米。两个材质各有各的图 = 两行，不按内容合并（内容哈希当身份全家族否决过）。
// 已知的代价（写进 migrate/index.ts 头注释）：被老版本存过一遍的新文件，这里会给材质一张新身份的贴图，表里原来那一行变成没人用的孤儿；图不丢。
// 原来两个材质共用一张图的，老版本各写了一份 → 这里各铸一行（共用关系丢了、字节多一份）；不按内容合并。

const legacySize = (x: unknown): [number, number] => (Array.isArray(x) && x.length === 2 && x.every((v) => typeof v === "number" && Number.isFinite(v) && v > 0) ? [x[0] as number, x[1] as number] : [1, 1]);
/** 嵌在材质里的一张图 → 贴图表的一行（现铸身份）。 */
export function textureFromLegacyMaterial(materialName: string, image: { readonly mimeType: string; readonly bytes: Uint8Array }, extSizeM: unknown): TextureDoc {
  return { guid: mintGuid(), name: materialName, value: COLOR_VALUE, content: { kind: "image", mimeType: image.mimeType, bytes: image.bytes }, sizeM: legacySize(extSizeM) };
}

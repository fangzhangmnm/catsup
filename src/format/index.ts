// src/format —— CatsUp 文件格式（.glb，glTF 2.1 语义 + CATSUP_* authoring 扩展）的唯一出入口。纯模块：零 DOM / 零 three / node 可跑。
// 契约 = ai-docs/20260919-persistence-data-contract.md；立宪 §7 = 向后兼容第一天设计（migrate/）。created 2026-09-20 by Claude Fable 5.1
export { writeCatsup } from "./write.ts";
export { readCatsup, isCatsupGltf } from "./read.ts";
export { newDocument, type CatsupDocument, type DocumentSettings, type BakeMode } from "./document.ts";
export { canonicalize } from "./brep-codec.ts";
export { isGlb, decodeGlb } from "./glb.ts";
export { EXTENSION_VERSIONS, FormatTooNewError } from "./migrate/index.ts";

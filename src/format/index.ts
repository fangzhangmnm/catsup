// src/format —— CatsUp 文件格式（.glb，glTF 2.1 语义 + CATSUP_* authoring 扩展）的唯一出入口。纯模块：零 DOM / 零 three / node 可跑。
// 契约 = ai-docs/20260919-persistence-data-contract.md；立宪 §7 = 向后兼容第一天设计（migrate/）。created 2026-09-20 by Claude Fable 5.1
export { writeCatsup, writeGltfModel, type ModelExportOpts } from "./write.ts";
export { readCatsup, isCatsupGltf } from "./read.ts";
export { newDocument, defaultDesk, emptyReferences, type CatsupDocument, type DeskDoc, type RefPanelDoc, type ReferencesDoc, type RefFileDoc, type DocumentSettings, type BakeMode, type DefinitionDoc, type GroupDoc, type InstanceDoc } from "./document.ts";
export { sceneFromDocument, documentFromScene } from "./scene-doc.ts";
export { canonicalize } from "./brep-codec.ts";
export { isGlb, decodeGlb } from "./glb.ts";
export { EXTENSION_VERSIONS, FORMAT, formatTag, fmtStamp, compareStamp, readStamp, FormatTooNewError, type Stamp, type StampVerdict, type FormatReadNotes } from "./migrate/index.ts";

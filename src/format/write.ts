// write.ts —— CatsupDocument → .glb 字节（glTF 2.1 语义、minVersion 2.0；契约 §3）。
// 布局：BIN[0] = 缩略图（头片 peek 用），随后 bake accessor、B-rep 流。created 2026-09-20 by Claude Fable 5.1

import { APP_VERSION } from "../version.ts";
import { BinBuilder } from "./binary.ts";
import { encodeGlb } from "./glb.ts";
import { canonicalize, encodeBrep, type CatsupBrepJson, type ViewSink } from "./brep-codec.ts";
import { bakeDefinition } from "./bake.ts";
import type { CatsupDocument } from "./document.ts";
import { EXTENSION_VERSIONS } from "./migrate/index.ts";
import { MIN_GLTF_VERSION, WRITE_GLTF_VERSION } from "./migrate/gltf/index.ts";

export const CATSUP_EXTENSIONS = ["CATSUP_document", "CATSUP_definitions", "CATSUP_brep", "CATSUP_instance"] as const;

export function writeCatsup(doc: CatsupDocument): Uint8Array {
  const bin = new BinBuilder();
  const bufferViews: Record<string, unknown>[] = [];
  const sink: ViewSink = {
    add(bytes) {
      const span = bin.push(bytes);
      bufferViews.push({ buffer: 0, byteOffset: span.byteOffset, byteLength: span.byteLength });
      return bufferViews.length - 1;
    },
  };
  const images: Record<string, unknown>[] = [];
  let thumbnail: number | undefined;
  if (doc.thumbnail) {
    const v = sink.add(doc.thumbnail.bytes);
    images.push({ bufferView: v, mimeType: doc.thumbnail.mimeType, name: "thumbnail" });
    thumbnail = 0;
  }
  // 规范序只做一次：bake 与 B-rep 流共用同一份顶点顺序（三方读 bake 的第 i 个顶点 = brep 第 i 个；两次写逐字节一致）
  const brep = canonicalize(doc.root.brep);
  const baked = bakeDefinition(brep, sink, 0);
  for (const [i, t] of baked.bufferViewTargets) bufferViews[i] = { ...bufferViews[i], target: t };
  const brepJson: CatsupBrepJson = encodeBrep(brep, sink, doc.carry.brepKeep as never);

  const json: Record<string, unknown> = {
    ...doc.carry.topLevel,
    asset: { version: WRITE_GLTF_VERSION, minVersion: MIN_GLTF_VERSION, generator: `CatsUp ${APP_VERSION}`, ...(thumbnail !== undefined ? { thumbnail } : {}) },
    extensionsUsed: [...CATSUP_EXTENSIONS],
    extensionsRequired: [],
    buffers: [{ byteLength: 0 }],
    bufferViews,
    accessors: baked.accessors,
    ...(images.length ? { images } : {}),
    meshes: [{ name: doc.root.name, ...baked.mesh }],
    nodes: [{ name: doc.root.name, mesh: 0, extensions: { CATSUP_instance: { version: EXTENSION_VERSIONS.CATSUP_instance, definition: 0, overrides: {} } } }],
    scenes: [{ nodes: [0] }],
    scene: 0,
    extensions: {
      ...doc.carry.extensions,
      CATSUP_document: {
        version: EXTENSION_VERSIONS.CATSUP_document,
        formatVersion: 1,
        settings: doc.settings,
        bake: { mode: doc.bakeMode, generator: `CatsUp ${APP_VERSION}` },
        ...(doc.lastView !== undefined ? { lastView: doc.lastView } : {}),
        ...doc.carry.documentExtra,
      },
      CATSUP_definitions: {
        version: EXTENSION_VERSIONS.CATSUP_definitions,
        root: 0,
        list: [{ name: doc.root.name, axes: { origin: [0, 0, 0], x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] }, materialSlots: [], nodes: [], brep: brepJson, ...(doc.root.extras ? { extras: doc.root.extras } : {}) }],
        ...doc.carry.definitionsExtra,
      },
    },
  };
  const binBytes = bin.finish();
  (json.buffers as Record<string, unknown>[])[0] = { byteLength: binBytes.byteLength };
  return encodeGlb(json, binBytes);
}

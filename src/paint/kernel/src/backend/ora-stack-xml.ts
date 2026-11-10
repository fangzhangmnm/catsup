// OpenRaster stack.xml 序列化 —— **纯** 图层树 ↔ XML（无 canvas / 无 zip / 无 PNG）。
// C7：版本戳（wrote-with）改参数传入——backend 不 import src/version.ts（壳知识；bump.sh sed 目标不动）。
//
// 从 ora.js 抽出（batch 2）：buildStackXml / parseStackXml 只处理结构（嵌套组 + id + 属性），
// 不碰像素。好处：① 可纯 node 测（无 OffscreenCanvas 依赖，不毒 OSC-stub 测试生态）；
// ② 把「树→XML」这件单一职责的事打包成深模块，与 PNG/zip 的 codec（ora.js）解耦。
//
// 节点形状（与 doc.js 的 Layer / LayerGroup 对齐，但本模块不 import doc.js —— 只读字段）：
//   叶 Layer：{ isGroup:false, id, name, visible, opacity, mode, clippingMask, lockAlpha, bboxX, bboxY }
//   组 LayerGroup：{ isGroup:true, id, name, visible, opacity, mode, clippingMask, children:[] }
// 写入端额外读 doc.activeId / doc.referenceLayerId 决定 active / reference 标记。

import { FORMAT, readOraStamp, type Stamp } from "./format/migrate.ts";   // 格式版本纪律：ora 的拍子 SSoT

// 写入端读到的节点 / doc 的最小结构（doc.js 本体仍未类型化）。
export interface OraNode {
  id: number;
  name: string;
  visible: boolean;
  opacity?: number;
  mode?: string;
  clippingMask?: boolean;
  isGroup: boolean;
  children?: OraNode[];
  bboxX?: number;
  bboxY?: number;
  lockAlpha?: boolean;
}
export interface OraDoc {
  layers: readonly OraNode[];
  width: number;
  height: number;
  activeId?: number | null;
  referenceLayerId?: number | null;
}

// 读取端产出的 spec 节点（id 可能为 null：旧 .ora 无 weebpaint:id，decode 时再发新 id）。
interface ParsedCommon {
  id: number | null;
  name: string;
  opacity: number;
  visible: boolean;
  mode: string;
  clippingMask: boolean;
  isActive: boolean;
}
export type ParsedNode =
  | (ParsedCommon & { isGroup: true; children: ParsedNode[] })
  | (ParsedCommon & { isGroup: false; src: string; x: number; y: number; lockAlpha: boolean; isReference: boolean });

const XML_ENT: Record<string, string> = {
  "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;",
};
function escapeXml(s: string): string {
  return String(s).replace(/[<>&"']/g, (c) => XML_ENT[c]);
}

// ---- canvas composite mode ↔ ORA composite-op ----

const MODE_TO_ORA: Record<string, string> = {
  "source-over": "svg:src-over",
  "multiply":    "svg:multiply",
  "screen":      "svg:screen",
  "overlay":     "svg:overlay",
  "darken":      "svg:darken",
  "lighten":     "svg:lighten",
  "color-dodge": "svg:color-dodge",
  "color-burn":  "svg:color-burn",
  "hard-light":  "svg:hard-light",
  "soft-light":  "svg:soft-light",
  "difference":  "svg:difference",
  "exclusion":   "svg:exclusion",
};
export function oraCompositeOp(canvasMode: string): string {
  return MODE_TO_ORA[canvasMode] || "svg:src-over";
}
const ORA_TO_MODE: Record<string, string> = Object.fromEntries(
  Object.entries(MODE_TO_ORA).map(([k, v]) => [v, k]),
);
export function canvasModeFromOra(op: string): string {
  return ORA_TO_MODE[op] || "source-over";
}

// 私有扩展 schema 版本（0.10.0 起写入 weebpaint:format；与 app 版本解耦，只在**格式**变更时 bump）：
//   1 = 首个显式版本（= 改名前隐式格式：id/clipping/active/lock-alpha/reference/wrote-with + sidecar 三件）。
//   2 = reference 整改批（2026-08-30 spec，user 拍板）：多参考 `.weebpaint/references/` + refPanels
//       manifest；timelapse.mp4 迁 `.weebpaint/`；非点 `weebpaint/` 停写。读端零迁移（兜底链见 ora.ts）。
//   3 = 持久化立宪（2026-09-29，user「weebpaint升级同意」）：参考清单从 editor-state.json 的 refPanels 独立成
//       `.weebpaint/references/manifest.json`（契约归 @internal/reference-window）；desk 带 version 戳；
//       读端布局归一化（backend/format/layout.ts）取代散落的兜底链。
//   旧文件无此属性 → 读端按 0 处理（完全可读）。
// 2026-10-21 起三级拍子（家族格式版本纪律，F-69）：weebpaint:format 照旧是 major（老读者只认它），另加 weebpaint:format-minor /
//   weebpaint:format-patch（缺 = 0）。SSoT = backend/format/migrate.ts FORMAT.ora；判决（major 新 → 整张只读、minor 新 → 提示一次）在 session-state。
//   嵌在 stack.xml 已知元素里的未知属性 / 子元素**不直通**（读一次写一次就没了；test/format-stack-xml-unknown.test.mjs 钉住）——
//   同 major 内不准往这里加新东西，新东西请放 `.weebpaint/` 下的新 entry（那里直通）；兜底 = session-state「较新 app 写的画 → 覆盖前确认」。
export const ORA_FORMAT_VERSION = FORMAT.ora.major;

// ---- 写：doc 树 → stack.xml 字符串 ----

// 单节点 → XML（递归）。indent = 缩进层级（root stack 的直接子 = 2）。
//   Layer → 自闭合 <layer ... />；LayerGroup → <stack ...>children</stack>。
//   组与叶共享 name/opacity/visibility/composite-op/weebpaint:id/clipping/active；
//   叶独有 src/x/y/lock-alpha/reference。
function nodeToXml(node: OraNode, doc: OraDoc, indent: number): string {
  const pad = "  ".repeat(indent);
  const common = [
    `name="${escapeXml(node.name)}"`,
    `opacity="${(node.opacity ?? 1).toFixed(4)}"`,
    `visibility="${node.visible ? "visible" : "hidden"}"`,
    `composite-op="${oraCompositeOp(node.mode || "source-over")}"`,
    `weebpaint:id="${node.id}"`,
    ...(node.clippingMask ? [`weebpaint:clipping="true"`] : []),
    ...(doc.activeId === node.id ? [`weebpaint:active="true"`] : []),
  ];
  if (node.isGroup) {
    // ORA baseline 组隔离模型（与我们 layer-composite.groupNeedsIsolation 一致，故用**标准** isolation 属性，
    //   不用私有扩展 → 全合规 + 和 Krita/GIMP/MyPaint 互通）：
    //   隔离 ⟺ isolation="isolate" ‖ opacity<1 ‖ composite-op≠svg:src-over；非隔离时 composite-op 被忽略。
    //   映射：穿透 → src-over + isolation="auto"；正常(隔离) → src-over + isolation="isolate"；其它混合模式 → svg:<mode>。
    const groupAttrs = [
      ...common,
      `isolation="${node.mode === "pass-through" ? "auto" : "isolate"}"`,
    ];
    // children top-first（与 spec 一致）：同级倒序输出。
    const ch = node.children || [];
    const kids: string[] = [];
    for (let i = ch.length - 1; i >= 0; i--) {
      kids.push(nodeToXml(ch[i], doc, indent + 1));
    }
    const inner = kids.length ? `\n${kids.join("\n")}\n${pad}` : "";
    return `${pad}<stack ${groupAttrs.join(" ")}>${inner}</stack>`;
  }
  const attrs = [
    common[0],                                  // name
    `src="data/layer${node.id}.png"`,
    `x="${node.bboxX}"`,
    `y="${node.bboxY}"`,
    ...common.slice(1),                          // opacity/visibility/composite-op/id/clipping/active
    ...(node.lockAlpha ? [`weebpaint:lock-alpha="true"`] : []),
    ...(doc.referenceLayerId === node.id ? [`weebpaint:reference="true"`] : []),
  ];
  return `${pad}<layer ${attrs.join(" ")} />`;
}

export function buildStackXml(doc: OraDoc, wroteWithVersion = ""): string {
  // OpenRaster spec：layer 顺序 = top first（top of stack 在 XML 前）。
  // doc.layers[0] 是 bottom，所以同级倒序输出（递归在 nodeToXml 内）。
  const nodes: string[] = [];
  for (let i = doc.layers.length - 1; i >= 0; i--) {
    nodes.push(nodeToXml(doc.layers[i], doc, 2));
  }
  // wrote-with：记录写入这份 .ora 时的 WeebPaint 版本号（调用方传入；encodeDocToOra 必填透传）。
  // 用途：读取端若发现比自己版本高 → 警告（避免旧版客户端静默吃掉新版图层属性）
  // 论证见 conversation v71→v72。
  const wroteWith = wroteWithVersion;
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<image version="0.0.3" w="${doc.width}" h="${doc.height}" xres="72" yres="72" xmlns:weebpaint="https://github.com/fangzhangmnm/weebpaint/ns" weebpaint:format="${FORMAT.ora.major}" weebpaint:format-minor="${FORMAT.ora.minor}" weebpaint:format-patch="${FORMAT.ora.patch}" weebpaint:wrote-with="${escapeXml(wroteWith)}">
  <stack name="root">
${nodes.join("\n")}
  </stack>
</image>
`;
  return xml;
}

// ---- 读：stack.xml 字符串 → spec 树（bottom-first）----

// 元素标签（去命名空间前缀、小写）。
function elemTag(el: Element): string {
  return (el.tagName || el.nodeName || "").toLowerCase().replace(/^.*:/, "");
}
// 私有属性双读（2026-08-20 WebPaint→WeebPaint 改名，user 拍板「新写旧读」）：
//   写端只写 weebpaint:*；读端 weebpaint:* 优先、旧 webpaint:* 兜底——存量 .ora 的
//   id/clipping/active/lock-alpha/reference/wrote-with 全部保读，打开保存即自动升级。
function wpAttr(el: Element, name: string): string | null {
  return el.getAttribute(`weebpaint:${name}`) ?? el.getAttribute(`webpaint:${name}`);
}
// 单 DOM 元素 → spec（递归）。<layer> → 叶 spec；<stack> → 组 spec（含 children）。
//   id 解析自 weebpaint:id（旧 .ora 无此属性 → null，decode 时发新 id）。
function parseNode(el: Element): ParsedNode {
  const idAttr = wpAttr(el, "id");
  const common: ParsedCommon = {
    id: idAttr != null && idAttr !== "" ? parseInt(idAttr, 10) : null,
    name: el.getAttribute("name") || "Layer",   // 无名层的兜底名（写回文件的数据）
    opacity: parseFloat(el.getAttribute("opacity") || "1"),
    visible: (el.getAttribute("visibility") || "visible") === "visible",
    mode: canvasModeFromOra(el.getAttribute("composite-op") || "svg:src-over"),
    clippingMask: wpAttr(el, "clipping") === "true",
    isActive: wpAttr(el, "active") === "true",
  };
  if (elemTag(el) === "stack") {
    // 组 mode 按 ORA baseline 隔离规则反推（standard isolation 属性）：
    //   composite-op≠src-over → 该混合模式（本就隔离）；src-over 时 isolation=isolate→正常(隔离)、auto/缺→穿透。
    const compositeOp = el.getAttribute("composite-op") || "svg:src-over";
    const isolation = el.getAttribute("isolation") || "auto";
    const mode = compositeOp !== "svg:src-over"
      ? canvasModeFromOra(compositeOp)
      : (isolation === "isolate" ? "source-over" : "pass-through");
    return { ...common, mode, isGroup: true, children: parseChildren(el) };
  }
  return {
    ...common,
    isGroup: false,
    src: el.getAttribute("src") || "",
    x: parseInt(el.getAttribute("x") || "0", 10),
    y: parseInt(el.getAttribute("y") || "0", 10),
    lockAlpha: wpAttr(el, "lock-alpha") === "true",
    isReference: wpAttr(el, "reference") === "true",
  };
}
// 一个 stack 的直接子节点 → bottom-first spec 数组。
//   XML 是 top-first（spec 顺序），doc 内部 [0]=bottom，所以 reverse。
function parseChildren(stackEl: Element): ParsedNode[] {
  const kids = [...stackEl.children].filter((c) => {
    const t = elemTag(c);
    return t === "layer" || t === "stack";
  });
  kids.reverse();
  return kids.map(parseNode);
}

export function parseStackXml(xmlText: string): { w: number; h: number; nodes: ParsedNode[]; wroteWith: string | null; formatVersion: number; formatStamp: Stamp } {
  const dom = new DOMParser().parseFromString(xmlText, "application/xml");
  const err = dom.querySelector("parsererror");
  if (err) throw new Error("stack.xml parse failed: " + err.textContent);
  const image = dom.querySelector("image");
  if (!image) throw new Error("stack.xml missing <image>");
  const w = parseInt(image.getAttribute("w") || "0", 10);
  const h = parseInt(image.getAttribute("h") || "0", 10);
  if (!w || !h) throw new Error("stack.xml <image> w/h invalid");
  // root <stack>（image 的直接子 stack）。递归建树。
  const rootStack = [...image.children].find((c) => elemTag(c) === "stack");
  const nodes = rootStack ? parseChildren(rootStack) : [];
  const wroteWith = wpAttr(image, "wrote-with") || null;
  const formatStamp = readOraStamp({ format: wpAttr(image, "format"), minor: wpAttr(image, "format-minor"), patch: wpAttr(image, "format-patch") });   // 无戳（改名前存量）= 0.0.0
  return { w, h, nodes, wroteWith, formatVersion: formatStamp.major, formatStamp };
}

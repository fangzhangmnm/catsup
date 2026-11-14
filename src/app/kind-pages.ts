// kind-pages.ts —— 物体窗口里「每个种类自己的那一块」（第 1 版第五节第 1 条；物体种类施工稿第四节；created 2026-11-13 by Claude Opus 5.5）。
// 窗口（object-window.ts）不认识种类：它只问这里「这个物体的种类报哪几行字段、元素页有什么」，照着画。加一个种类 = 这张表加一条
// （Record<BodyKind, …>：少一条编译不过）；窗口那一层不许出现种类的名字（守卫 test/kind-pages.test.ts）。
// 第一步只搬家：网格体的「对称 / 镜像面」两行、元素页的两套列表和名字从窗口里搬到这里，看得见的一样不变（选项 id 照旧 mirror:mode:… / mirror:axis:…）。
// 和施工稿第四节提案的两处不同（交统筹过目）：
//   ① 住 app 层，不住 scene/kinds.ts：字段形状（editor/param-panel.ts）和名字表（app/attribute-names.ts）都在上面几层，scene 层不往上引用；
//   ② 字段的 set 直接调编辑器的动词、不返回一条指令：开「强行对称」= 设置 + 马上对称一次，同一步撤销（editor.setMirror），一条指令装不下。
//   「指令」那几行照旧走放置表（editor.commandMenu("objectWindow")），这里不重复。
import type { Editor } from "../editor/editor.ts";
import type { BodyKind } from "../scene/body-kind.ts";
import type { ParamFieldDef, ParamValue } from "../editor/param-panel.ts";
import type { MirrorAxis, MirrorMode } from "../mesh/mirror.ts";
import { brepAttributeList, meshAttributeList, type AttributeList, type AttributeRow } from "../scene/attribute-list.ts";
import { brepAttrName, meshAttrName } from "./attribute-names.ts";

export interface KindPageCtx { readonly editor: Editor; readonly def: number }
/** 物体页上的一行：字段（枚举 / 开关 / 数值，形状 = 参数小窗那三种）或一句说明。off = 灰掉的原因。 */
export type KindPageRow =
  | { readonly kind: "field"; readonly key: string; readonly icon: string; readonly def: ParamFieldDef; readonly value: ParamValue; readonly off?: string; set(v: ParamValue): void }
  | { readonly kind: "note"; readonly text: string };
/** 元素页：身上有哪些元素属性 + 每一列叫什么；none = 这个种类没有元素（说一句为什么）。 */
export type KindElements = { readonly list: AttributeList; nameOf(r: AttributeRow): { readonly label: string; readonly code: string | null } } | { readonly none: string };
export interface KindPage {
  /** 物体页：第一行「设置的是谁」之后、物件级动词之前的那几行。 */
  fields(ctx: KindPageCtx): readonly KindPageRow[];
  elements(ctx: KindPageCtx): KindElements;
}

// 强行对称排第一 = 主入口（user 10-28「就是水杉和blender那种啊，强行对称」）；镜像编辑 = 只挪点的那种（Blender 编辑模式的 X 镜像）
const MIRROR_MODES: readonly { id: "off" | MirrorMode; label: string; hint: string }[] = [
  { id: "off", label: "关", hint: "不镜" },
  { id: "force", label: "强行对称", hint: "沿镜像面切开、另一半镜过来，每一步都镜" },
  { id: "edit", label: "镜像编辑", hint: "只挪点：对面的点一起改" },
];

/** 网格体：对称 + 镜像面（对称是网格体的属性；镜像面只能选不能拖，拖的是工具「镜像…」的那张面）。 */
const MESH_PAGE: KindPage = {
  fields({ editor, def }) {
    const ms = editor.mirrorOf(def);
    const rows: KindPageRow[] = [{ kind: "field", key: "mirror:mode", icon: "axes", def: { kind: "enum", label: "对称", values: MIRROR_MODES }, value: ms?.mode ?? "off",
      set: (v) => editor.setMirror(v === "off" ? null : (v as MirrorMode), undefined, def) }];
    if (ms) rows.push({ kind: "field", key: "mirror:axis", icon: "axes", def: { kind: "enum", label: "镜像面", values: ([0, 1, 2] as const).map((a) => ({ id: String(a), label: "XYZ"[a], hint: `物件自己的 ${"XYZ"[a]} = 0 这一面` })) }, value: String(ms.axis),
      set: (v) => editor.setMirror(editor.mirrorOf(def)?.mode ?? "edit", Number(v) as MirrorAxis, def) });
    return rows;
  },
  elements: ({ editor, def }) => ({ list: meshAttributeList(editor.sceneRef.mesh(def).kernel), nameOf: (r) => meshAttrName(r.id) }),   // 网格体的行带小灰字原名（名字就是键）
};
/** 硬表面体：没有自己的字段（对称要转成网格体之后才有）；元素页的层是稀疏存的、不带原名（那套还没搬上属性表）。 */
const BREP_PAGE: KindPage = {
  fields: () => [],
  elements: ({ editor, def }) => ({ list: brepAttributeList(editor.sceneRef.brep(def).kernel), nameOf: (r) => ({ label: brepAttrName(r.on as "edge" | "face", r.id), code: null }) }),
};
/** 空物体：只装子物体，没有几何也没有元素（第 1 版第四节）。 */
const EMPTY_PAGE: KindPage = {
  fields: () => [],
  elements: () => ({ none: "空物体只装子物体，没有几何，也就没有元素属性" }),
};

export const KIND_PAGES: Readonly<Record<BodyKind, KindPage>> = { brep: BREP_PAGE, mesh: MESH_PAGE, empty: EMPTY_PAGE };
export const kindPageOf = (editor: Editor, def: number): KindPage => KIND_PAGES[editor.kindOfDef(def)];

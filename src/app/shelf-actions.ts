// app/shelf-actions.ts —— 素材架的动作层：起名、挑文件、问挑哪些（指令本身在 editor/ops.ts，机械）。created 2026-11-04 by Claude Opus 5.5（身份地基 ID-3，计划书 §15.1-D / E）。
// · 进架必须命名（user 10-30「只放标记进来的组件、进架必须命名、可重名、不同文件夹」）：放在这一层——没起名的先问名字，起名和上架同一步撤销；取消 = 都不做。指令不管名字。
// · 「从别的模型导入素材」= 读那份文件（加密的先解锁、外来 glb 按内容拒）→ 列组件 → 撞上内容不一样的问一次（和粘贴同一弹窗同一默认，user 11-04「4 用」）→ 纯合并的 paste + 上架，一步撤销（paste-plan.ts shelfImportOp）。只读那份文件，不碰它。
//   第一版只从本机文件选；图库里直接挑 = 图库今天没有「只挑不打开」的界面，记在素材抽屉那张单上。
import type { Editor } from "../editor/editor.ts";
import { isHex4 } from "../editor/object-tree.ts";
import { KEEP, pasteBefore, pasteConflict, pasteReport, payloadFromDocument, importCandidates, shelfImportOp } from "../editor/paste-plan.ts";
import { resolvePasteConflict } from "./paste-actions.ts";
import { readCatsup } from "../format/index.ts";
import { isForeignGlb } from "../format/gltf-import.ts";
import { mintGuid, type Guid } from "../format/guid.ts";
import type { DefId } from "../scene/scene.ts";
import { openFormSheet, openInputSheet } from "./ui/sheets.ts";

export interface ShelfActionsDeps {
  readonly editor: Editor;
  notify(o: { text: string; level?: "info" | "warning" | "error" }): void;
  isEncrypted(bytes: Uint8Array): Promise<boolean>;
  unlock(blob: Blob): Promise<{ plain: Blob } | null>;
  after(): void;
}
export interface ShelfActions {
  /** 物件菜单「放上素材架」：选中的物件的组件。 */
  putSelected(): Promise<void>;
  /** 资源页的「上架」：一个组件。 */
  putDef(def: DefId): Promise<void>;
  /** 资源页的「上架」：一个材质（材质面板起的名本来就有）。 */
  putMaterial(guid: Guid): void;
  /** 资源页的「从别的模型导入素材…」：弹文件选择器（要在用户点按的同一拍里调）。 */
  pickImport(): void;
  /** 选好文件之后（测试 / 拖放也走这里）。 */
  importFile(file: File): Promise<void>;
}

export function createShelfActions(d: ShelfActionsDeps): ShelfActions {
  const { editor } = d;
  /** 没起名的组件挨个问名字；取消 = null（都不做）。 */
  const askNames = async (defs: readonly DefId[]): Promise<Map<DefId, string> | null> => {
    const names = new Map<DefId, string>();
    for (const id of defs) {
      const s = editor.sceneRef, code = s.def(id).name;
      if (!isHex4(code)) continue;
      const v = await openInputSheet("素材架上的东西要有名字", { defaultValue: "", placeholder: code, okLabel: "起名并上架", message: `这个组件还没起名（四位码 ${code}）。名字可以和别的重复。`, validate: (x) => (x.trim() ? null : "名字不能为空") });
      if (v === null) return null;
      names.set(id, v.trim());
    }
    return names;
  };
  const rename = (names: ReadonlyMap<DefId, string>): void => { for (const [id, name] of names) editor.commitOp({ op: "rename", at: { def: editor.sceneRef.root, group: null }, def: id, name }); };
  /** 选中的物件的组件（去重）。 */
  const selectedDefs = (): DefId[] => {
    const s = editor.sceneRef, here = s.def(s.defOfContext(editor.context));
    return [...new Set(editor.selectedPoolKeys().filter((k) => k.startsWith("i")).map((k) => here.instances.get(Number(k.slice(1)))?.def).filter((x): x is DefId => x !== undefined))];
  };
  const fileInput = document.createElement("input");
  fileInput.type = "file"; fileInput.id = "shelfImportFile"; fileInput.accept = ".catsup,.glb"; fileInput.hidden = true;
  document.body.appendChild(fileInput);
  fileInput.addEventListener("change", () => { const f = fileInput.files?.[0]; fileInput.value = ""; if (f) void api.importFile(f); });

  const api: ShelfActions = {
    async putSelected() {
      const names = await askNames(selectedDefs());
      if (!names) return;
      editor.oneStep(() => { rename(names); editor.runAction("shelve"); }, { title: "放上素材架" });
      d.after();
    },
    async putDef(def) {
      const names = await askNames([def]);
      if (!names) return;
      editor.oneStep(() => { rename(names); editor.commitOp({ op: "shelfPut", kind: "definition", ref: editor.sceneRef.def(def).guid, folder: null, guid: mintGuid() }); }, { title: "放上素材架" });
      d.after();
    },
    putMaterial(guid) { editor.commitOp({ op: "shelfPut", kind: "material", ref: guid, folder: null, guid: mintGuid() }); d.after(); },
    pickImport() { fileInput.click(); },
    async importFile(file) {
      const fail = (text: string, level: "warning" | "error" = "warning"): void => d.notify({ text, level });
      try {
        let bytes = new Uint8Array(await file.arrayBuffer());
        if (await d.isEncrypted(bytes)) {
          const r = await d.unlock(new Blob([bytes as BlobPart]));
          if (!r) return;   // 取消解锁 = 不导入
          bytes = new Uint8Array(await r.plain.arrayBuffer());
        }
        if (isForeignGlb(bytes)) { fail(`「${file.name}」是别的软件导出的模型，不是 CatsUp 工程：要放进场景请用「导入 glb」`); return; }
        const doc = readCatsup(bytes), { rows, unnamed } = importCandidates(doc), more = unnamed ? `另有 ${unnamed} 个没起名的组件没列（素材架上的东西要有名字，先在那份模型里起名）` : "";
        if (!rows.length) { fail(`「${file.name}」里没有能上架的组件${more ? `：${more}` : ""}`); return; }
        const v = await openFormSheet(`从「${file.name}」导入素材`, rows.map((r) => ({ key: r.guid, label: `${r.name}（${r.kind === "mesh" ? "网格体" : "硬表面体"}，摆了 ${r.placed} 份）`, options: [{ value: "yes", label: "上架" }, { value: "no", label: "不要" }], value: "yes" })), {
          okLabel: "放上素材架",
          note: () => `挑中的组件连同它们里面的组件、材质、层一起带进这份模型，放上素材架，不摆进场景；这份模型已有同一个组件、内容又不一样时，下一步问你。那份文件不会被改动。${more ? `\n${more}` : ""}`,
        });
        if (!v) return;
        const picks = rows.filter((r) => v[r.guid] === "yes").map((r) => r.guid);
        if (!picks.length) return;
        const s0 = editor.sceneRef, rows2 = pasteConflict(s0, payloadFromDocument(doc, picks)), decision = rows2 ? await resolvePasteConflict(rows2) : KEEP;
        if (!decision) return;   // 取消 = 不导入
        const { op, payload, already } = shelfImportOp(s0, doc, picks, decision), before = pasteBefore(s0, payload, decision), onShelf = s0.shelf.items.length;
        editor.oneStep(() => { editor.commitOp(op); }, { title: "导入素材" });
        const s1 = editor.sceneRef;
        if (s1.shelf.items.length - onShelf !== picks.length - already) return;   // 没成：提示行已经说了为什么（锁着 / 架子太新）。断开的是新身份，不能按挑中的 GUID 认
        const r = pasteReport(before, s1), newOnes = picks.filter((g) => !before.defs.has(g)).length;
        const bits = [`上架 ${picks.length - already} 个组件（新建 ${newOnes} 个、本文件已有 ${picks.length - newOnes} 个${already ? `，其中 ${already} 个本来就在架上` : ""}）`];
        if (r.updatedDefs.length) bits.push(`更新了组件${r.updatedDefs.map((n) => `「${n}」`).join("、")}（摆着的每一份都跟上了）`);
        if (r.detachedDefs.length) bits.push(`断开：${r.detachedDefs.length} 个组件贴成了新的，原来的不动`);
        if (r.updatedMaterials.length) bits.push(`更新了 ${r.updatedMaterials.length} 个材质`);
        if (r.createdDefs.length > newOnes) bits.push(`它们里面的组件新建了 ${r.createdDefs.length - newOnes} 个`);
        if (r.createdMaterials.length) bits.push(`带进 ${r.createdMaterials.length} 个材质`);
        if (r.createdLayers.length) bits.push(`带进 ${r.createdLayers.length} 个层`);
        d.notify({ text: bits.join("；") });
        d.after();
      } catch (err) {
        fail(`导入素材失败：${(err as Error).message}`, "error");
      }
    },
  };
  return api;
}

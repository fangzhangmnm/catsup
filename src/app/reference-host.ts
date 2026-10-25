// 参考窗的宿主适配层。created 2026-10-25 by Claude Opus 5.5（user「咱们是不忘了接reference window. 先看懂我们的文件规范，然后这个算视图，应该放右边汉堡」）
// 参考窗本体 = 家族共享库 @internal/reference-window 0.5.0（牌组模型 + 默认视图 <wp-reference-window>）。**本文件是 CatsUp 里唯一认识那个库的地方**
//   （test/reference-guard.test.ts 守着），样板 = MoonSinger src/app/reference-host.ts：
//   · 卡：图片 / 文字 / 音频 / 视频整包收；live（场景相机预览 = 总账 E16）这一版不接，别的种类库原样带着
//   · 存：`.catsup/references/` 整个目录（manifest.json + 每张卡）经库的 encodeDeck / decodeDeck 进出，本文件只搬字节；
//     住 glb 的 `CATSUP_references`（契约 §5.8，format 层不懂清单）；窗开着没有 / 在哪 = desk.refPanel（视图态）。不进撤销、不进定稿指纹
//   · 脏：加 / 删 / 挪卡 = 正经改动（字节编好之后 rev +1、onCards() 通知 Session）；开关窗 / 挪窗 / 翻卡 = 视图态（存时顺手捞，不标脏）
//   · 太新：CatsUp 那层（CATSUP_references major 新）或库那层（清单 major 新）→ 目录原样带着、存的时候原样写回、明说；这边先不显示，不吞不猜
//   · 字节原样存（家规「字节进出不走 canvas」；CatsUp 没有转码器）；超过 4 MB 先问「存进模型 / 只放内存 / 算了」（家族批过的提醒线）；
//     音频 / 视频照库 0.5.0 默认只放内存（当次有效：存档不带字节，下次是空位，同名文件拖回来补上）
//   · 粘贴看焦点：窗有焦点 = 贴进窗；没有 = 不管。窗有焦点时 CatsUp 的工具快捷键让路（main.ts keydown 看 hasFocus）
import "@internal/reference-window";
import type { WpReferenceWindow, RefMenuPort, RefMenuOpts, RefPanelRect, RefImportQuestion, RefImportChoice } from "@internal/reference-window";
import { encodeDeck, decodeDeck, mimeForName, DeckManifestTooNewError } from "@internal/reference-window/deck";
import type { RefFileDoc, RefPanelDoc, ReferencesDoc } from "../format/document.ts";
import { togglePopupMenu } from "./ui/popup-menu.ts";

const APP = "catsup";                                   // 目录 = .catsup/references/（库按 app 名算）
const KINDS = ["image", "text", "audio", "video"] as const;
export const ASK_ABOVE = 4 * 1024 * 1024;               // 单张超过 4 MB 先问（家族提醒线；没有转码器 = 不压，只有 存 / 只放内存 / 算了）

export interface ReferenceHostDeps {
  info(text: string): void;
  error(text: string): void;
  /** 浮窗不往上越过的线。 */
  topFloor(): number;
  /** 这个文件里第一次开窗放哪（没开过窗的文件；库的缺省在左上，会压住 CatsUp 的左柱工具）。 */
  defaultRect(): RefPanelRect;
  /** 超过 4 MB：问 存进模型 / 只放内存 / 算了（应用内 sheet，不用系统对话框）。 */
  askImport(q: RefImportQuestion): Promise<RefImportChoice>;
  /** 卡片变了、字节已经编好（files() / rev() 已是新的）：Session 标脏、记一笔编辑时间。 */
  onCards(): void;
  /** 关窗 / Esc 之后焦点还给画布。 */
  focusCanvas(): void;
}

/** 库的菜单端口 → CatsUp 自己的弹出菜单（toggle 语义同；句柄 isOpen 是方法 → getter；align 用 start / end；没有 danger 位，删卡靠库的「再点一次」）。 */
const menuPort: RefMenuPort = (o: RefMenuOpts) => {
  const h = togglePopupMenu<string>({
    anchor: o.anchor, align: o.align === "right" ? "end" : "start", onPick: o.onPick, ...(o.onClose ? { onClose: o.onClose } : {}),
    items: () => o.items().filter((it) => !it.hidden).map((it) => ({ id: it.id, label: it.label, ...(it.icon ? { icon: it.icon } : {}), ...(it.separatorBefore ? { separatorBefore: true } : {}) })),
  });
  return h ? { close: () => h.close(), refresh: () => h.refresh(), get isOpen() { return h.isOpen(); } } : null;
};

export function createReferenceHost(d: ReferenceHostDeps) {
  const el = document.createElement("wp-reference-window") as WpReferenceWindow;
  el.className = "ref-window";
  const fileInput = document.createElement("input");
  fileInput.type = "file"; fileInput.multiple = true; fileInput.hidden = true; fileInput.accept = "image/*,audio/*,video/*,.txt,.md,text/plain,text/markdown";
  document.body.append(el, fileInput);

  let encoded: RefFileDoc[] = [];   // 现在要存的那份目录（路径都在 .catsup/references/ 下；太新时 = 原样带着的那份）
  let rev = 0;                      // 卡片改动的修订号（Session 拿它判脏）
  let encSeq = 0;                   // 编码排队：后来的赢（载入也会作废在飞的编码——换了文件，旧牌组的字节不许落进新文件）
  let loadSeq = 0;                  // 载入排队：读的期间又换了文件 = 作废（只有 apply 动它；加卡不作废载入，否则载入中的那副牌会丢）
  let carried = false;              // 太新：encoded 是原样带着的，不从牌组重编、窗先不显示
  let applying = false;             // apply 期间牌组的 reset 不算用户改动
  let placed = false;               // 这个文件里开过窗（没开过 = desk 里不写 refPanel）
  let pending: Promise<void> = Promise.resolve();   // 编码在飞
  let loading: Promise<void> = Promise.resolve();   // 载入在飞：导入 / 粘贴先等它（往载入一半的牌组里加卡 = 载入回来把它冲掉）

  // ── 注入 ──
  el.menuPort = menuPort;
  el.setAttribute("no-cloud", "");   // 不从云盘选图（图库是模型库不是图库；iPad 的「文件」已经能挑相册 / OneDrive）
  el.labels = {
    load: "导入图片 / 文字 / 视频 / 音频…", paste: "粘贴", oneToOne: "原尺寸", del: "删掉这张", delConfirm: "再点一次删掉", closeWin: "收起参考窗",
    prev: "上一张", next: "下一张", menu: "参考窗菜单", move: "点一下缩成小图标，按住拖动挪位置", resize: "改大小", resizeAria: "改大小",
    moveEarlier: "往前挪", moveLater: "往后挪", jump: "跳到…", kindNames: { image: "图片", text: "文字", audio: "音频", video: "视频" }, linkMissing: "内容不在了",
    play: "播放", pause: "暂停", loop: "循环", rate: "速度", prevFrame: "上一帧", nextFrame: "下一帧",   // 逐帧钮图标 = 库里的 skip-prev / skip-next
    ram: "只放内存（不存进模型）", ramMissing: "只在内存里，没存进模型——把这个文件拖进来，或者点 ＋ 重新导入，就补回这里",
    minimize: "缩成小图标", restore: "点一下恢复，按住拖动挪位置",
  };
  const syncFloor = (): void => { el.topFloor = d.topFloor(); el.bottomFloor = 0; if (el.open) el.reclamp(); };
  window.addEventListener("resize", syncFloor);

  // ── 牌组变化 → 编字节 → 脏 ──
  const reencode = (): void => {
    const my = ++encSeq;
    pending = (async () => {
      const out: RefFileDoc[] = [];
      for (const [path, blob] of encodeDeck(el.deck.snapshot(), { app: APP })) out.push({ path, mimeType: blob.type || mimeForName(path), bytes: new Uint8Array(await blob.arrayBuffer()) });
      if (my !== encSeq) return;   // 又改过了 / 换了文件：让后来的那次落
      encoded = out; carried = false; rev++;
      d.onCards();
    })();
  };
  el.deck.onChange((what) => { if (!applying && what.type === "cards") reencode(); });
  el.addEventListener("openchange", () => { if (el.open) { placed = true; syncFloor(); } else d.focusCanvas(); });
  el.addEventListener("rectchange", () => { if (el.open) placed = true; });   // 只认开着时的（库挂上文档时自己落出生位置也发一次——那不是用户摆的）

  // ── ＋ 菜单 / 粘贴 / 拖放 ──
  el.addEventListener("requestload", () => { fileInput.value = ""; fileInput.click(); });
  fileInput.addEventListener("change", () => { const files = [...(fileInput.files ?? [])]; if (files.length) void importFiles(files); });
  el.addEventListener("requestpaste", () => { void pasteFromClipboard(); });
  window.addEventListener("paste", (e) => {   // 粘贴看焦点（库 0.3.1）：窗有焦点 → 文件 / 文字进窗；没有 → 不管
    if (!el.hasFocus) return;
    const cd = e.clipboardData; if (!cd) return;
    e.preventDefault(); e.stopPropagation();
    const files = [...cd.files];
    if (files.length) { void importFiles(files); return; }
    const text = cd.getData("text/plain");
    if (text.trim()) { void addText(text); return; }
    d.error("剪贴板里没有图片或文字");
  }, true);
  el.addEventListener("dragover", (e) => { if (e.dataTransfer && Array.from(e.dataTransfer.types).includes("Files")) { e.preventDefault(); e.stopPropagation(); e.dataTransfer.dropEffect = "copy"; } });
  el.addEventListener("drop", (e) => { const files = [...(e.dataTransfer?.files ?? [])]; if (!files.length) return; e.preventDefault(); e.stopPropagation(); void importFiles(files); });
  el.addEventListener("notice", (e) => {
    const n = (e as CustomEvent).detail as { level: string; code: string; name?: string; message: string };
    d.error(n.code === "decode-failed" ? `这个浏览器打不开这张${n.name ? `：${n.name}` : ""}` : `参考窗：${n.message}`);
  });
  el.addEventListener("keydown", (e) => { if (e.key === "Escape") { e.preventDefault(); el.blur(); d.focusCanvas(); } });   // Esc = 焦点回画布（窗留着）

  /** 导入（菜单 / 拖放 / 粘贴文件）：库的漏斗（嗅种类 → 超过 4 MB 问 → 原样 / 只放内存 / 不要），结果如实说。 */
  async function importFiles(files: File[]): Promise<void> {
    await loading;
    if (carried) { d.error("这个模型的参考窗是更新版本的 CatsUp 存的：原样留着，这一版先不显示、也不往里加"); return; }
    const r = await el.importFiles(files, { kinds: KINDS, ask: (q) => d.askImport(q), askAbove: { image: ASK_ABOVE, text: ASK_ABOVE, audio: ASK_ABOVE, video: ASK_ABOVE }, ramAbove: ASK_ABOVE });   // defaultRam 不传 = 库 0.5.0 默认：音视频只放内存
    for (const k of r.skipped) {
      if (k.why === "unsupported") d.error(`认不出：${k.name}（参考窗收图片、文字、视频和音频）`);
      else if (k.why === "failed") d.error(`没加上：${k.name}（${k.message ?? "出错了"}）`);
    }
    const said = [r.added.length ? `加了 ${r.added.length} 张` : "", r.filled.length ? `补回 ${r.filled.length} 张（只放内存的空位）` : "", ...r.notes].filter(Boolean);
    if (r.added.length || r.filled.length) { el.focus({ preventScroll: true }); d.info(`参考窗：${said.join("；")}`); }
  }
  async function addText(text: string): Promise<void> {
    await loading;
    if (carried) { d.error("这个模型的参考窗是更新版本的 CatsUp 存的：原样留着，这一版先不显示、也不往里加"); return; }
    el.addText(text, { name: "" }); el.open = true;
  }
  async function pasteFromClipboard(): Promise<void> {
    try {
      for (const it of await navigator.clipboard.read()) {
        const img = it.types.find((x) => x.startsWith("image/"));
        if (img) { await importFiles([new File([await it.getType(img)], `粘贴.${img.split("/")[1] ?? "png"}`, { type: img })]); return; }
        if (it.types.includes("text/plain")) { const text = await (await it.getType("text/plain")).text(); if (text.trim()) { await addText(text); return; } }
      }
      d.error("剪贴板里没有图片或文字");
    } catch {
      try { const text = await navigator.clipboard.readText(); if (text.trim()) { await addText(text); return; } } catch { /* 浏览器不给读 */ }
      d.error("读不了剪贴板：点一下参考窗，再按 Ctrl / ⌘+V");
    }
  }

  return {
    /** 现在要存的目录（编码还在跑的话先 await settled()）。 */
    files: (): RefFileDoc[] => encoded,
    /** 卡片改动的修订号。 */
    rev: () => rev,
    /** 载入 / 编码还在跑的话等它（存之前调，免得刚加的卡没赶上）。 */
    settled: async (): Promise<void> => { await loading; await pending; },
    /** 开一个文件（新建 = 空目录 + 没有窗）：目录交给库读；tooNew = CatsUp 那层太新（原样带着，这边不显示）。 */
    apply(refs: ReferencesDoc, panel: RefPanelDoc | null, opts: { tooNew?: boolean } = {}): void {
      const my = ++loadSeq; encSeq++;   // 作废在飞的编码（它编的是上一个文件的牌组）
      applying = true; carried = !!opts.tooNew; encoded = carried ? [] : refs.files; placed = !!panel;
      el.deck.clear();
      applying = false;
      if (panel) el.rect = { left: panel.left, top: panel.top, width: panel.width, height: panel.height };
      el.open = false;
      if (carried) { d.error("这个模型的参考窗是更新版本的 CatsUp 存的：原样留着、保存时原样写回，这一版先不显示"); return; }
      if (!refs.files.length) { el.open = !!panel?.open; if (el.open) syncFloor(); return; }
      const byPath = new Map(refs.files.map((f) => [f.path, f]));
      loading = (async () => {
        try {
          const decoded = await decodeDeck({ app: APP, knownKinds: KINDS, getFile: (p) => { const f = byPath.get(p); return f ? new Blob([f.bytes as BlobPart], { type: f.mimeType || mimeForName(p) }) : null; } });
          if (my !== loadSeq) return;   // 读的期间又换了文件
          applying = true;
          try { el.deck.restore(decoded); } finally { applying = false; }
          // 库 0.5.0 清单拍子：minor 比这版新 = 照样读写，告诉用户一次（不弹窗不拦）；patch 新 = 静默；major 新 = 下面的 DeckManifestTooNewError
          if (decoded.verdict === "newer-minor") d.info("这个模型的参考窗是更新版本的 CatsUp 存的：这版没有的功能保存时不丢，只是看不到");
          el.open = !!panel?.open;
          if (el.open) syncFloor();
        } catch (e) {
          if (my !== loadSeq) return;
          carried = true;   // encoded 还是文件里那份 = 原样写回
          if (e instanceof DeckManifestTooNewError) d.error(`这个模型的参考窗是更新版本存的（参考清单第 ${e.fileVersion} 版，这一版认到第 ${e.libVersion} 版）：原样留着、保存时原样写回，这里先不显示`);
          else d.error(`参考窗读不出来：${(e as Error).message}（字节原样留着、保存时原样写回）`);
        }
      })();
    },
    /** 视图态：开过窗才有（存进 desk.refPanel）。 */
    panel(): RefPanelDoc | null { if (!placed) return null; const r: RefPanelRect = el.rect; return { open: el.open, left: Math.round(r.left), top: Math.round(r.top), width: Math.round(r.width), height: Math.round(r.height) }; },
    /** 视图 ☰ 入口：开 = 顺手给焦点（开窗 → Ctrl+V 一步到位）；关 = 焦点回画布。 */
    toggle(): void {
      if (carried) { d.error("这个模型的参考窗是更新版本的 CatsUp 存的，这一版先不显示（原样留着）"); return; }
      if (!el.open && !placed) el.rect = d.defaultRect();
      el.open = !el.open;
      if (el.open) { placed = true; syncFloor(); el.focus({ preventScroll: true }); } else d.focusCanvas();
    },
    isOpen: () => el.open,
    hasFocus: () => el.hasFocus,
    count: () => (carried ? 0 : el.deck.size),
    carried: () => carried,
    relayout: syncFloor,
    /** 测试 / 探针用：导入（同菜单那条路）。 */
    importFiles,
    el,
  };
}
export type ReferenceHost = ReturnType<typeof createReferenceHost>;

// 测试入口：node test/run.mjs（node 24 strip-types 直跑导入的 .ts）。
// 加新测试文件：在下面 import 一行即可。这里是唯一的登记处：并行运行器 test/par.mjs（npm test）也从这些 import 行读名单。
import "./smoke.test.ts";
import "./page-title.test.ts";   // 网页标题只是 CatsUp（user 2026-10-14）
import "./i18n.test.ts";   // UI translation layer (src/i18n)
import "./no-symlinks.test.ts";   // 仓里不许有符号链接（2026-11-11：工作副本的 node_modules 链接被收进仓、主目录的真文件夹被换掉过）
import "./moved-notice.test.ts";   // 旧地址的搬家一行（2026-11-03）
import "./subdivide.test.ts";
import "./subdivide-nearmiss.test.ts";
import "./xr-pointer-frame.test.ts";
import "./kernel-fuzz.test.ts";
import "./tau-flatten.test.ts";   // EGC 期 3b：τ 带投影一致性（2026-10-24）
import "./units.test.ts";   // 单位深模块（2026-10-24 Opus）
import "./no-native-select.test.ts";   // 下拉标准件守卫（2026-10-24 Opus）
import "./page-ids.test.ts";   // 页面不许重复 id（2026-10-25：手册面板与图标撞名）
import "./scale-ref.test.ts";   // B43 尺度参考适配层（2026-10-25 Opus）
import "./paint-kernel-guard.test.ts";   // 画画内核拷贝：哈希对清单、src/paint/ 以外不直接 import（贴图主线 0-1，2026-11-10 Opus）
import "./tap-train.test.ts";   // 点按族：笔双击三击偏向点（2026-10-25 Opus）
import "./format-stamps.test.ts";   // 三级拍子 + 直通顺序（F-69，2026-10-25 Fable）
import "./desk.test.ts";   // CATSUP_desk 桌面态：☰ 停在哪页跟文件走、太新不拒开（2026-10-25 Fable）
import "./snap-default.test.ts";   // 新文件默认开吸附（user 2026-10-25「新文件一定要默认开吸附」）
import "./snap-center.test.ts";   // DT15 圆心 + 选中组件轴原点透视吸附（2026-10-25 Opus）
import "./copy-preview.test.ts";   // DT14 移动复制预演：副本槽（2026-10-25 Opus）
import "./merge-reversed.test.ts";   // 修复：合并重合反向面（2026-11-06 Opus）
import "./mirror.test.ts";   // DT23 镜像指令（2026-10-25 Opus）
import "./plane-gizmo.test.ts";   // 镜像面把手大小只看屏幕像素（2026-10-28 Opus）
import "./select-loop.test.ts";   // Alt 点边 = 环 / 洞（2026-10-28 Opus）
import "./stance.test.ts";   // 立场表守卫 + 控制器文件夹无头（2026-10-28 Fable）
import "./app-mode-branch-ratchet.test.ts";   // app 层按工作台分叉只准降（T102，2026-10-29 Fable）
import "./feel.test.ts";   // 手感表守卫（2026-10-28 Fable）
import "./keymap.test.ts";   // 分层键表（2026-10-28 Fable）
import "./pick-kinds.test.ts";   // 拾取范围 1 / 2 / 3（2026-10-29 Opus）
import "./style-colors.test.ts";   // 画风四色 → 标记色 + 日夜判据（2026-10-30 Opus）
import "./instance-ids.test.ts";   // 读文件实例 id 有空缺不再重复（2026-10-25 Opus）
import "./identity-guard.test.ts";   // 身份地基守卫（计划书 §4，2026-11-04 Opus）：文件里只有 GUID、读写和撤销不重铸、老文件迁移
import "./group-ids.test.ts";   // 组 id 有空缺读回来变两份 + 网格体里的隐藏实例（2026-11-04 Opus，身份地基 ID-0 清点实测）
import "./param-panel.test.ts";   // 参数小窗马后炮会话（2026-10-25 Opus）
import "./scale-handle.test.ts";   // 缩放柄透视拾、叠在一起近的赢（2026-10-25 Opus）
import "./isolate.test.ts";   // DT44 只看这个（2026-10-25 Opus）
import "./hide.test.ts";   // DT49 隐藏 / 全部显示（2026-10-25 Opus）
import "./references.test.ts";
import "./reference-guard.test.ts";   // 参考窗单一接缝 + 图标（2026-10-25 Opus）   // CATSUP_references 参考窗牌组 + desk refPanel（2026-10-25 Opus）
import "./facefind-hole-probe.test.ts";   // 挂洞探针不许用壳环顶点（2026-10-24，800 件场景第 379 步）
import "./kernel-rev.test.ts";
import "./settle-differential.test.ts";
import "./autofold.test.ts";   // 自动折面 rev2（K3，2026-10-27 Fable）
import "./cdt.test.ts";   // 约束 Delaunay 翻边（2026-10-27 Fable）
import "./erase-differential.test.ts";   // 擦边局部化差分 oracle（T2，2026-10-27 Fable）
import "./self-check.test.ts";   // 公理自检（FM83，2026-10-27 Fable）
import "./loaded-differential.test.ts";   // 从装载态起步的差分（K4，2026-10-27 Fable）
import "./soft-flat-merge.test.ts";   // 软边两侧变 180° 自动并（FM80，2026-10-27 Fable）
import "./no-self-snap.test.ts";   // 拖着的东西不吸自己：对齐引擎层性质（A5 / F-89，2026-10-27 Fable）
import "./mesh-kernel.test.ts";
import "./corner-columns.test.ts";
import "./mesh-view.test.ts";
import "./mesh-format.test.ts";   // CATSUP_mesh 1.0.0 多边形载荷（2026-10-27 Fable M3）
import "./uv-format.test.ts";   // CATSUP_mesh 2.0 贴图坐标进文件（2026-11-11 贴图主线 1-2½）
import "./format-notes-guard.test.ts";   // 读入时记下的每一种都要说出来（2026-11-11 贴图主线 1-2½ 审过时补）
import "./object-commands.test.ts";
import "./id-table.test.ts";   // 内核表的数组制度 IdMap / IdSet（2026-10-27 Fable O3）
import "./preview-rewind.test.ts";   // 拖动预演「拷一次 + 每帧退回」差分（2026-10-27 Fable O1）   // 物件族：转成网格体 / 转回 SU 体 + 导入直接成网格体（2026-10-27 Fable）   // mesh 显示视图 + 场景 / 渲染缓存接网格体（2026-10-27 Fable M2）   // mesh 内核 M1：不变量 + 算子 + 随机串（2026-10-27 Fable）
import "./registry-seams.test.ts";   // (接缝)
import "./mesh-extrude.test.ts";
import "./mesh-inset.test.ts";
import "./step-pass-guard.test.ts";   // 撤销一步的通行证：静态守卫（2026-10-28 Fable）
import "./mesh-winding.test.ts";   // 网格体三角化保持面的绕向，导出不再一半反面（FM130，2026-10-28 Opus）
import "./mesh-edge-marks.test.ts";   // 网格体手标 + 默认平滑：指令、继承、自由建模里平滑边点得中（FM129 / FM138，2026-10-28 Opus）
import "./marquee-visible.test.ts";   // 框选只框看得见的（X 光关）+ 自由建模框点（FM44 / FM139，2026-10-28 Opus）
import "./mesh-bevel.test.ts";   // 网格体倒角：倒边 / 倒点，封闭、朝向一致、宽度、夹宽、确定性（FM152，2026-10-28 Opus）
import "./export-naming.test.ts";   // 导出名带导出时间（WeebPaint 同款，2026-10-28 Opus）
import "./mesh-mirror.test.ts";   // 网格体镜像：配对 / 镜像编辑 / 强行对称 / 对称对齐（FM134 / FM136，2026-10-28 Opus）
import "./mirror-ops.test.ts";   // 镜像分类表守卫（F-113 审计，2026-10-28 晚）
import "./mirror-force-symmetric.test.ts";   // 强行对称的定理（第 0 层：空的那半不当准；计划书 20261109-audit-fixes-plan §3，2026-11-09 Opus）
import "./guide-selection.test.ts";   // 选中的参考几何住编辑器、不进选区类型（计划书 20261109-audit-fixes-plan 工单 1，2026-11-09 Opus）
import "./key-mentions.test.ts";   // 界面文字里手写的组合键必须真绑着（计划书 20261109-audit-fixes-plan 工单 4，2026-11-09 Opus）
import "./export-model.test.ts";   // 导出模型 = 只写 glTF core 的交付物（导出设计稿 §5，2026-10-28 Opus）
import "./doc-names.test.ts";   // 工程文件名字：.catsup 新、.glb 老；改名保留后缀；云库种类表两行（2026-10-28 Opus）
import "./placement.test.ts";   // 放置表的 app 那半：左柱 / ☰ / 放置面渲染器登记（接线清单第 1 条，2026-10-28 Opus）
import "./marquee-area.test.ts";   // 屏幕区域：框 / 套索（UX5，2026-10-28 Opus）
import "./orphan-defs.test.ts";   // 孤儿森林：零实例的定义存读往返不丢（UX26，2026-10-28 Opus）
import "./chips.test.ts";   // 键名芯片（MFD）的数据：固定槽位、字 = 键表 / 立场表（UX19，2026-10-28 Opus）
import "./tool-tips.test.ts";   // 工具提示 = 键表生成（不手抄键名、按工作台；2026-10-28 晚 Opus）
import "./lock-guide.test.ts";   // 锁看得见：轴线放哪、只有一处画（2026-10-28 晚 Opus）
import "./rail-face.test.ts";   // 左柱换脸：有选区时删除 = 垃圾桶（2026-10-28 晚 Opus；周账 F-121）
import "./second-mode.test.ts";   // 再点拿着的工具 = 换另一种做法 + 修饰键临时换回（2026-10-30 Opus）
import "./object-tree.test.ts";   // 层级窗的物件树：只有物件进树、四位码没起名、在哪一层、小眼睛（0.18 I1，2026-10-30 Opus）
import "./resources.test.ts";   // 资源清点：活着 = 从模型根够得着、孤儿链、材质只数活着的、清理只删孤儿（0.18 I10，2026-10-30 Opus）
import "./tree-drag.test.ts";   // 通用树拖拽落点：放进去 / 缝里横向定深度 / 不能放进自己（0.18 I3，2026-10-30 Opus）
import "./identity-id3.test.ts";   // 身份地基 ID-3：跨文件粘贴闭包 / 素材架 / 素材导入（2026-11-04 Opus）
import "./identity-layer.test.ts";   // 身份层深模块（ID-4，设计书 §9）：只 import 自己、玩具种类、场景店 = 声明的图（2026-11-04 Opus）
import "./identity-merge.test.ts";   // 粘贴撞上内容不一样：比内容 / 更新 / 留这里的 / 断开 / 导入同一条路（ID-4b，2026-11-04 Opus）
import "./identity-id2.test.ts";   // 身份地基 ID-2：moveInstance 保 GUID / 同级排序 / 清理材质 / 粘贴材质表 / 单面双面规矩（2026-11-04 Opus）
import "./face-sides.test.ts";   // 单面 / 双面第四版（ID-2b，2026-11-04）
import "./preview-op-guard.test.ts";   // 预演 = 同一条指令在影子场景上跑（ID-2c，2026-11-04）
import "./context-menu-guard.test.ts";   // 右键兜底：一个模块、main 装一次（2026-10-30 Opus）
import "./texture-basis.test.ts";   // 贴图默认铺法：上 = 上、不镜像（2026-10-30 Opus）
import "./material-color-space.test.ts";   // 材质色文件边界换算 + 老文件原样（2026-10-30 Opus）
import "./soft-select.test.ts";   // 软选择权重（2026-10-28 夜 Opus）
import "./mesh-fill.test.ts";   // 复制 / 补洞 / 桥接（2026-10-28 夜 Opus）
import "./select-grow.test.ts";   // 扩 / 缩选区（2026-10-28 夜 Opus）
import "./object-ops-kinds.test.ts";   // 物件级 op × 身体种类组合矩阵（2026-10-28 夜 Opus）
import "./mesh-subdivide.test.ts";   // 细分（Catmull-Clark，破坏性）：教科书值 / 折痕 / 裸线拒 / op + 撤销（FM133，2026-10-28 Opus）
import "./flatten.test.ts";   // 压平的纯函数：scaleAlong / 压到镜像面正好是 0 / 定不出朝向 / 斜圈对 Jacobi 严格解 ≤ 0.01°（白模 W-5 补丁，2026-11-10 Opus）
import "./textures-table.test.ts";   // 贴图成为独立的条目：老样本搬表 / 写两遍一样 / 导出不变 / 共用一张图 / 不认识的种类 / 清理 / 跨文件粘贴 / 撤销 / 守卫（贴图主线 1-0½，2026-11-10 Opus）
import "./touch-stick.test.ts";   // 吃鸡式虚拟摇杆的数学：死区 / 冲刺 / 浮动底座（FM142，2026-10-28 Opus）
import "./pick-nonplanar.test.ts";   // 网格体面不平时角点不被自己的邻面挡住（user 10-27「有些侧面的点选不中」，2026-10-27 Opus）
import "./mesh-primitives.test.ts";   // 右键新建的基本体 + addMeshObject（2026-10-27 Opus）   // 插入：面内插一圈 + op 撤销（2026-10-27 Opus）   // 拉：边 / 点挤出 + meshExtrude op + 撤销（2026-10-27 Opus）   // 注册表两道接缝：三种单位 + 路由型动作「挪」+ meshMove 撤销记录（2026-10-27 Fable）
import "./kernel-delta.test.ts";   // 内核差量：提交 = 影子换真身、applyDelta 自反（2026-10-27 Fable A3）
import "./draw-frame.test.ts";   // DT86 坐标架 / 组件原点拆开（2026-10-26 Opus）
import "./fold.test.ts";   // DT87 折线底子（2026-10-26 Opus）
import "./change-log.test.ts";   // DT96 内核改动日志：变了的都记、没变的不记（2026-10-26 Opus）
import "./pool-mesh.test.ts";   // DT96 池网格：增量同步 = 全量重建（原件 / 预演副本 / 撤销快照三种族谱）（2026-10-26 Opus）
import "./snap-grid.test.ts";   // T8 / DT4 吸到格点：验收 ③ 挪 1 mm 吸回邻居不动、圆整条平移、斜坐标架、零破面（2026-10-26 Opus）
import "./segment-ref.test.ts";   // DT95 段数参考：弦高 ↔ 段数、数据文件、说明行（2026-10-26 Opus）
import "./import-glb.test.ts";   // T11 导入外来 glb + 三角 → 膜 + 多级空间网格（2026-10-26 Opus）
import "./two-sides.test.ts";   // DT8 两个表面 + 按侧灌（2026-10-26 Opus，周二 Fable 审）
import "./smooth-normals.test.ts";   // DT11 平滑边法向（2026-10-26 Opus）
import "./profile-edges.test.ts";   // F-87 轮廓线判定（2026-10-26 Opus）
import "./retrace-harden.test.ts";   // 画线描过软边 = 变硬（2026-10-26 Opus）
import "./curves.test.ts";   // 曲线实体（0.10，2026-10-24）
import "./guides.test.ts";   // 参考几何 + 上下文帧（0.11 尺规纪元，2026-10-24）
import "./guide-curves.test.ts";   // 参考圆 / 参考球（圆规 / 球规 DT50，2026-10-26）
import "./tape.test.ts";     // 卷尺（0.11 尺规纪元 ③）
import "./axes.test.ts";     // 轴工具（0.11 尺规纪元 ④）
import "./protractor.test.ts";   // 量角器（0.11 尺规纪元 ⑥）
import "./grid.test.ts";         // 绝对网格 + 整数长度 + 轴向咬合（0.11 尺规纪元 ⑤）
import "./repro-box.test.ts";    // 复现包黑匣子
import "./pp-stops.test.ts";     // 推拉停靠集（退役清单④）
import "./tier.test.ts";         // #30 层级档加权
import "./weld.test.ts";         // B19 焊接（边链 → 曲线）
import "./erasers.test.ts";      // 橡皮家族：溶解 / 断口 / 焊边 / 软边 / batch（v0.13.16）
import "./shapes.test.ts";       // 形状批：旋转矩形 / 四种弧 / 矩形从中心 / VCB（v0.13.17）
import "./exact-geometry.test.ts";   // EGC 期 1：精确谓词 + snap rounding（2026-10-24）
import "./object-model.test.ts";    // 0.14 物件模型契约守卫（2026-10-24）
import "./lock.test.ts";         // A27 锁定（对象层属性；0.13）
import "./typed-input.test.ts";       // 正在打的字的唯一主人（周账 F-125，2026-10-29）
import "./editor-brep-gate.test.ts";  // 编辑器两种身体路由：this.kernel 登记制 + 体重棘轮（周账 F-126，2026-10-29）
import "./minccino-guard.test.ts";  // Minccino 引擎边界：three 围栏棘轮 / 引擎零 three 零 DOM 不认识编辑器 / pass 不判设备 / frame graph 规划器（Tron 第一刀步 2，2026-10-29 Fable）
import "./minccino-material.test.ts";  // Minccino 材质模块接口（开放槽表 / 翻译只写一次 / 管线 reads 守卫）+ 预算核对（步 7 / 8，2026-10-29 Fable）
import "./minccino-preset.test.ts";
import "./minccino-vocabulary.test.ts";
import "./aux-look-guard.test.ts";   // 画风翻译器守卫：编辑器里没有 GL 量和颜色值（2026-10-29 Opus，设计稿 §7.1）
import "./overlay-pass-guard.test.ts";   // 瑞士奶酪：点线面不走叠加层（2026-10-29 Opus）   // 引擎词汇守卫：代码里不出现编辑器的词（刀 g，2026-10-29 Fable）
import "./budget-notice.test.ts";       // 血槽位披露：连续超才说一次、回到预算内重新计（Tron 清单第 9 步；2026-10-29 Opus）    // Minccino 预设 = 数据（Tron 第 1 步：每个预设的 pass 声明排得出一帧、白模走原来那条；2026-10-29 Opus）
import "./crypto-state.test.ts";      // 口令状态（周账 F-123，2026-10-29）
import "./password-verifier.test.ts"; // 图库口令验证器
import "./remember-password.test.ts"; // 在这台设备上记住口令（≤ 30 天）
import "./body-kind.test.ts";    // 门 1：definition 身体 brep | card（0.13 刀 ①）
import "./present-lock.test.ts"; // 演示锁（desk.locked 往返 + 老定稿记录照读照写；周账 F-124）
import "./input-gate.test.ts"; // 演示锁（desk.locked 往返 + 老定稿记录照读照写；周账 F-124）
import "./hand-busy.test.ts"; // 手上还有没有一下没收的名册 + 会话只问它（统筹 11-11）
import "./workbench-tools.test.ts"; // 工作台只发自己的工具：setTool 不换工作台、工具键只按跳转表明着跨、画画不在表里（统筹 11-11）
import "./tool-targets.test.ts"; // 工具自带目标（B22：正方形 / 黄金分割 / 半圆）   // 局部性定理差分 oracle：局部结算 = 全局结算（#26，2026-10-23）    // 池版本号：每个改写动词 +1（#22 池级局部性缓存键）
import "./move-inference.test.ts";
import "./facefind.test.ts";
import "./face-lifecycle.test.ts";
import "./golden.test.ts";
import "./golden3d.test.ts";
import "./tools.test.ts";
import "./pick.test.ts";
import "./preview.test.ts";
import "./lab-presets.test.ts";
import "./move-spec.test.ts";
import "./history.test.ts";
import "./history-transaction.test.ts";   // 撤销栈的整步事务 + 摘记录（2026-11-11 贴图主线 1-8a）
import "./paint-undo.test.ts";   // 画的每一步进三维的撤销栈（2026-11-11 贴图主线 1-8a）
import "./paint-undo-random.test.ts";   // 同上：混着来回逐字节对（拆开跑）
import "./paint-undo-leak.test.ts";   // 同上：画板的图块不漏（截断 / 驱逐 / 删物件 / 换文件之后图块池回到开始之前）
import "./paint-memory.test.ts";   // 画的内存额度（0-3a）：图块池接上压缩、撤销栈对「画」现问字节；压缩之后撤销逐字节对
import "./paint-memory-undo.test.ts";   // 同上之二：压缩之后撤销逐字节对；歇着的画板被压下去、撤回来画还在（拆开跑）
import "./paint-composite-format.test.ts";   // 画的合成图进文件（textures 1.1，1-8b）：来回、形状不对原样带回、记号对不上 = 当没有
import "./paint-save.test.ts";   // 画存进文件（1-8b）：来回一格不差、没动过逐字节相同、钉在同一刻、编码抛 = 整轮失败、撤销栈不动、裁高、空白、快照不现编
import "./paint-cold.test.ts";   // 冷的画、变热（1-8b）：不建画板显示合成图、绝不建空白画板、变热逐字节、只能看不能画、底色变了自己热、换文件作废
import "./paint-zip-guard.test.ts";   // zip.js 在内核之前备好（1-8b）：index.html 顺序、内核那份 = vendor 那份、存盘先查
import "./scene-ops.test.ts";
import "./offset.test.ts";   // offset 几何（0.8，2026-10-21）
import "./followme.test.ts";   // follow-me 扫掠 + 像表 XOR（0.8，2026-10-21）
import "./tool-config.test.ts";   // 工具配置深模块（0.9，2026-10-21）
import "./paint-modes.test.ts";   // 油漆桶模式面集（0.9，2026-10-21）
import "./flood.test.ts";   // 灌的纯函数模块（T5，2026-10-26）
import "./planar.test.ts";   // 拍平（T9，2026-10-26）
import "./hierarchy.test.ts";   // 恢复层级（DT99，2026-10-26）
import "./repairs-modular.test.ts";   // 修复指令可整个扔（2026-10-26）
import "./fill-holes.test.ts";   // 补洞（DT103，2026-10-26）
import "./cleanup.test.ts";   // 清理碎渣（DT102，2026-10-26）
import "./resegment.test.ts";   // 改段数（回转体，DT94，2026-10-26）
import "./intent.test.ts";   // 意图门：反方向的吸附不合法（0.9，2026-10-21）
import "./vcb.test.ts";   // 数值小窗解析 + 阵列（0.9 #11，2026-10-21）
import "./snap-align.test.ts";
import "./solver.test.ts";
import "./pushpull.test.ts";
import "./settle-images.test.ts";   // 像表结算机 golden（2026-10-21）：09-23 两案 + 规则
import "./camera-persp.test.ts";
import "./obj-io.test.ts";
import "./eps-scale.test.ts";
import "./plane-second-point.test.ts";
import "./on-face.test.ts";
import "./player.test.ts";
import "./collision-world.test.ts";
import "./xr-frames.test.ts";
import "./format-binary.test.ts";
import "./kernel-brep.test.ts";
import "./format.test.ts";
import "./format-jpeg.test.ts";
import "./crash-store.test.ts";
import "./cloud-gate.test.ts";   // 同步闸门 + 掉登录 / 没网闸门（工单 C，2026-11-03 Opus）
import "./cloud-return.test.ts";   // 回来时没传的分两类（2026-11-04 Opus）
import "./gallery-home.test.ts";   // 图库必须有家：一处判定 + 接线守卫（工单 F-152 / F-153，2026-11-04 Opus）
import "./home-move.test.ts";
import "./sw-cache-scope.test.ts";   // 正式版 / 开发版的壳缓存互不相删（2026-11-04 Opus）   // 搬家 / 放回图库（工单 F-153 / C5，2026-11-04 Opus）
import "./push-on-leave.test.ts";   // 切走也推 / 点更新先推 / 没推成的重试（工单 C3，2026-11-03 Opus）
import "./encrypted-byproducts.test.ts";   // 加密件副产品只存密文 + 全部导出（工单 C2，2026-11-03 Opus）
import "./debug-lines.test.ts";   // 黑匣子文本行（实验台 sunset → 调试日志，2026-09-20）
import "./object-verbs.test.ts";   // 物件层动词 = 注册表物件族（2026-10-28 Fable 加的，漏登记到 10-29 才补上）
import "./mesh-nonmanifold.test.ts";
import "./mesh-subdivide-golden.test.ts";
import "./loop-cut-slide.test.ts";
import "./mesh-adjacency-golden.test.ts";
import "./paint-one-triangulation.test.ts";
import "./paint-layout.test.ts";
import "./paint-start.test.ts";
import "./paint-start-guard.test.ts";
import "./mesh-bucket.test.ts";
import "./lock-drag.test.ts";
import "./paint-space-path.test.ts";
import "./paint-space-reach.test.ts";
import "./paint-space-truth.test.ts";
import "./paint-space-guard.test.ts";
import "./paint-space-limits.test.ts";   // 1-4c：画画路径上的容量上限，每个一条顶到它的测试（2026-11-11 Opus）
import "./paint-space-prep.test.ts";   // 1-4c：画画的准备（整份几何 + 每格的表）缓存、过期、放（2026-11-11 Opus）
import "./paint-workbench-say.test.ts";   // 1-7：画画工作台一笔开不了时说的话（准备没好 / 容量上限 / 别的）（2026-11-11 Opus）
import "./paint-board.test.ts";
import "./paint-lock.test.ts"; // 画画这一层自己问锁：开一笔、落层（v0.19.48）
import "./paint-pixel-writes.test.ts"; // 画画这一层每个公开的口对改像素表态 + 锁递到底（v0.19.48）
import "./paint-display-uv.test.ts";
import "./paint-kernel-surface.test.ts";
import "./brush-kinds.test.ts";
import "./space-layer.test.ts";
import "./space-vs-kernel2d.test.ts";
import "./space-stroke-kernel.test.ts";
import "./paint-texel-table.test.ts";
import "./paint-layout-patches.test.ts";   // 施工单十五：按朝向连成片 + 留的格数跟着画布走 + 块挨得近时的归属表（2026-11-11 Opus）
import "./atlas-outline.test.ts";   // 施工单十六第二节：画布小窗的数据（片里的边细 / 外沿粗、第几片、盖住 / 共用、一点落在哪）（2026-11-11 Opus）
import "./paint-surface-pick.test.ts";   // 贴图主线 1-3a 第四节：落点（2026-11-10 Opus）   // 贴图主线 1-3a 第三节：格子归属表和位置公式（2026-11-10 Opus）   // 贴图主线 1-3a 第二节：最笨的铺法（2026-11-10 Opus）   // 贴图主线 1-3a 第一节：网格体的三角形只从一个地方来（2026-11-10 Opus）   // W-11 邻接表增量维护：样本 + 主门（2026-11-10 Opus）   // W-8 环切能滑、能切几圈（2026-11-10 Opus）   // W-10 细分结果冻成样本 + 不随面数平方涨（2026-11-10 Opus）   // 非流形 / 重复面护栏（2026-10-29）
import "./lift-settle.test.ts";   // 抬笔结算按事件自己的时间（A21 时钟，统筹 11-11 v0.19.50）
import "./test-tiers-guard.test.ts";   // 测试分档守卫：没登记的、测试之间互相 import、探针表（2026-11-10 Opus）
import { run } from "./runner.mjs";
// 漏登记守卫挪进了 test/test-tiers-guard.test.ts（2026-11-10 Opus，测试分档：串跑和并行都当一条测试跑）。

await run();

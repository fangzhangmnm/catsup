// migrate/index.ts —— 持久化立宪（契约 §7）：每个 CATSUP_* 子结构独立拍子（major.minor.patch，见下）；迁移 = 纯函数，全住本文件夹
// （小步直接登记在 STEPS 里）；读取器链式升到当前版，写入器只写当前版；比 app 新 → 拒开报版本（不降级不猜）。
// 语料 = test/fixtures/format/v<N>/（每发过一版冻结一份）。created 2026-09-20 by Claude Fable 5.1
//
// 版本史：
//   CATSUP_brep        v1 → v2（2026-10-21）：去掉 v1 的占位 `groups`（group 搬到 definition 层）；新增属性层 attributes.edge.soft（软边，每边 1 字节）。
//   CATSUP_definitions v1 → v2（2026-10-21）：list[i] 新增 `groups`（各自 B-rep + 轴框 + 父）与 `instances`（definition 索引 + 3×4 变换 + 父 group）。
//   CATSUP_brep        v2 → v3（2026-10-21 贴图纪元）：属性层 attributes.face.material（u16x2：[+n 侧槽, −n 侧槽]，0xFFFF = 无）本版读写。
//   CATSUP_definitions v2 → v3（2026-10-21 贴图纪元）：list[i].materialSlots 生效（槽号 → glTF core materials 索引；v2 一直写空表）。
//   CATSUP_material    v1（2026-10-21）：挂在 glTF core material 上的 authoring 补充 { sizeM:[w,h] }（贴图物理尺寸，米）。
//   CATSUP_material    1.1（2026-10-30，Claude Opus 5.5；user「文件边界换算 同意」）：baseColorFactor 按 glTF 规定存线性值（以前存 sRGB 的数）；每个材质都挂本扩展的拍子（纯色的以前不挂），
//                      读的时候靠它认新旧（migrate/material.ts：没拍子 / 1.0 = 老文件原样读）。老读者读新文件 = 颜色偏深 + minor 提示一次。
//   CATSUP_brep        v3 → v4（2026-10-24 曲线与曲面纪元）：curves[] 本版读写（有序边链 + 种类 + 闭合 + 圆弧参数，契约 §5）；v3 文件的 curves 一直是空表 = 无曲线。
//   CATSUP_brep        4.1（2026-10-26 DT8 两个表面，Claude Opus 5.5，周二 Fable 审）：attributes.face.material 的两槽开始写不同值（[+n 侧, −n 侧]；4.0 及以前两槽同值）。
//   CATSUP_brep        4.2（2026-10-26 DT87 折线，Claude Opus 5.5）：边层多一个知名名字 fold（attributes.edge.fold，u8；只在有折线时写）——面内部的折痕：
//                      两侧是同一个多边形的两块平面片。老读者照编码规则原样带着这一层（边层是开放集），但不认它的意思 = 折线画成普通边、两块分开选（minor 语义）。
//                      minor：老读者只取 +n 侧——能开能存，背面单独涂的颜色会变成正面那份（提示一次）。
//   CATSUP_definitions v3 → v4（2026-10-24 尺规纪元）：list[i].guides 与 groups[j].guides（参考线 / 参考点，池本地坐标）；缺 = 空。
//   CATSUP_document    v1 → v2（2026-10-24 尺规纪元）：axes（绘图轴，世界坐标 Frame）；缺 = 世界帧。
//   CATSUP_document    v2 → v3（2026-10-24 0.14 物体模型）：layers（层表；缺 = 只有默认层 {id 0}）。minor：加可选键。
//   CATSUP_definitions v4 → v5（2026-10-24 0.14 物体模型）：instances[j].layer（缺 = 继承）；list[i].kind = card 时 list[i].card{image 索引, sizeM, anchor, billboard}、= mesh 时 list[i].mesh{positions/indices/… bufferView}；
//   CATSUP_definitions v5 → v6（2026-10-24 深夜 CardBody sunset，user「cardbody需要sunset」「拆」）：list[i].kind = card 的定义降成**空 brep 定义**（name / instances / 空 brep 占位留，card 载荷丢；dev 里从没有文件存过 card，拆在零成本窗口里）。
//                      groups[j].locked **丢弃**（组不是物体，user 2026-10-24）。minor：老读者只是少看见一个可选键 / 不认的 kind 本来就拒开。

//   CATSUP_definitions 6.4（2026-10-27 M3，Claude Fable 5.1）：mesh 项换成 CATSUP_mesh 1.0.0 多边形载荷（faceStart / faceLen / loopVert / faceMat / faceFlags / edgePairs / edgeFlags，f64 坐标）；
//                      三角形不再存（bake 的派生物）。老读者（0.14 / 0.15.9 以前的 dev）看不见多边形键、也没有 positions / indices 三角汤 = 读不到网格体几何（它们本来就不画 mesh），提示一次；存回去会丢网格体 → 那是 minor 语义的边界，
//                      但那些版本没有任何造 mesh 身体的入口，实际没有这种文件。
//   CATSUP_document    3.1（2026-10-25 追认）：settings 里 10-24/25 加的可选键 gridPlane / gridPreset / scaleRefs（老读者原样带回、minor 提示一次）。
//   CATSUP_document    3.2（2026-10-29，Claude Opus 5.5；Tron 账本 T120 user「snapping的substep应该除了5 10 还有2 20 50 100」）：settings.gridSubdiv 的取值从 5 / 10 放宽到
//                      2 / 5 / 10 / 20 / 50 / 100（键不变、类型不变）。老读者读到不认识的值退回 5（minor：吸附细分不一样，内容一字不少；提示一次）。
//   CATSUP_document    3.3（2026-10-30，Claude Opus 5.5；Tron 账本 T175 user「吸附细分还有1/1」）：settings.gridSubdiv 多一档 1（= 只吸整格；键不变、类型不变）。
//                      老读者读到 1 退回 5（minor，同 3.2）。
//   CATSUP_document    3.4（2026-10-30，Claude Opus 5.5；Tron 账本 T173 / T181 user「把显示长度单位，grid制式，格距收成一个东西。就是单位」「文件格式存同意」）：
//                      settings 加可选键 unitSystem（metric / imperial / dnd）；snapIncrement 从「写入时派生」变成主的（吸附长度，英制可以是 1/16 in 这种不是格距 ÷ 细分的数）。
//                      给老读者照写 displayUnit / gridPreset / gridStep = 吸附长度 / gridSubdiv = 1：3.3 读者吸附逐字一样，更老的读者退回 1/5（minor 提示一次）；模型一字不少。
//   CATSUP_desk        1.0（2026-10-25，Claude Fable 5.1）：桌面态子结构 = WeebPaint `.weebpaint/editor-state.json` 在 glb 里的镜像（user「不是应该跟文件吗，看一下weebpaint…」）：
//                      menuTabs（两个 ☰ 停在哪页）、lastView（相机；从 CATSUP_document 搬来 = 契约 §7.2「保留读、停止写」）。不进定稿指纹、不标脏、新建必 reset；
//                      **major 比本版新 → 不拒开**：原字节带回、桌面用默认（只有 document / brep / definitions 太新才拒开）。
//   CATSUP_definitions 6.1（2026-10-25，Claude Opus 5.5；DT49 隐藏）：可选键 instances[j].hidden（只写 true）；同时 glTF 节点带 Khronos KHR_node_visibility { visible: false }
//                      （契约 §5 早定的「hide = KHR_node_visibility」；extensionsUsed 只在有隐藏时列）。老读者少看见一个键 = 藏起来的会显示出来、存回去会丢掉隐藏（minor 语义）。
//   CATSUP_definitions 6.2（2026-10-26，Claude Opus 5.5；DT86 坐标架 / 组件原点拆开）：可选键 list[i].drawFrame { origin, x, y, z }（进这个组件画图用的坐标架，定义坐标；
//                      只在摆过时写，根定义不写——根的在 document.axes）。老读者少看见它 = 进组件时坐标架回到组件原点（minor 语义：能开能存，丢的是画图辅助）。
//   CATSUP_definitions 6.3（2026-10-26，Claude Opus 5.5；DT50 圆规 / 球规）：可选键 guides.circles[{ id, c, n, r }]（参考圆：圆心 / 法向 / 半径，池本地坐标）、
//                      guides.spheres[{ id, c, r }]（参考球）；只在有时写（老文件字节 / 定稿指纹不变）。老读者看不见它们 = 参考圆 / 球不显示也不参与吸附（minor 语义：能开能存，
//                      存回去时丢的是画图辅助——参考几何本来就是辅助线）。
//   CATSUP_desk        1.1（2026-10-25，Claude Opus 5.5）：可选键 refPanel { open, left, top, width, height }（参考窗开着没有 + 在哪；视图态，同 MoonSinger view.ref）。
//   CATSUP_desk        1.2（2026-10-29，Claude Fable 5.1；周账 F-124 定稿 → 演示锁）：可选键 locked（只写 true）= 这份文件打开就是锁着的：改模型的一切都拒、看 / 进去玩照旧。
//                      老读者少看见它 = 打开不锁（minor 语义：防误触的开关丢了，内容一字不少）。老定稿记录 CATSUP_document.final / finalRev 照读照写、不再起作用。
//   CATSUP_desk        1.3（2026-10-29，Claude Opus 5.5；Tron 账本 T86 user「记账，风格跟着文件走」）：可选键 style / screen（视图 ☰「风格」「屏幕」选过才写；
//                      不透明字符串，format 层不认识预设 id）。老读者少看见它 = 用自己的默认风格打开（minor 语义：看法丢了，内容一字不少）。
//   CATSUP_definitions 7.0 语义补一行（2026-11-04，Claude Opus 5.5；计划书 §9.2-B，7.0 还没推出去，不动拍子）：materialSlots 的值可以是内置默认背面的 GUID（00000000-0000-4000-8000-000000000002；不进材质表）。
//                      默认正面的唯一表示 = 槽缺。本地老 7.0 读者读到内置 GUID = 没材质（默认正面），无害。
//   CATSUP_desk        1.4（2026-11-04，Claude Opus 5.5；计划书 §9.2½ ②，user「我建议文件workbench而不是workpiece记住」）：可选键 exportModel（导出表单上次的选择，字符串键值）。
//                      老读者少看见它 = 导出表单用默认（minor 语义：习惯丢了，内容一字不少）。
//   CATSUP_desk        1.5（2026-11-11，Claude Opus 5.5；user「笔的设置记在哪 学weebpaint」= 跟文件走、设备上不记，画画软件 v406 起同款）：可选键 paint
//                      { color?: "#rrggbb", tools: { <工具名>: { size?, opacity?, hardness? } } }（字段名照画画软件的 dial）。改过才写；工具名本层不解释，
//                      不认识的工具名和键原样带回（tools 不是对象也原样带回）。size 的含义和单位由工具自己定：这一版的笔和橡皮 = 直径、屏幕上的 CSS 像素（不是空间长度，
//                      不换国际单位；以后的像素笔 = 画布上的格数）。color 原样存。hardness 以后归「笔」（笔架来了它属于那支笔，到时候这个键保留读、停止写）；
//                      activeBrushId 留给笔架、现在不写。这一层收任何有限的数，app 套上时夹到滑条的范围。老读者少看见它 = 笔用默认（minor：习惯丢了，内容一字不少）。
//   CATSUP_desk        1.6（2026-11-12，Claude Opus 5.5；施工单二十 1b，笔的模型第五节）：paint 里加两个可选键（改过才写）——brushes { <笔的 id>: { size?, opacity?, hardness? } }、
//                      active { <tool 的取值>: <笔的 id> }；不认识的笔 id、键原样带回，active 指着本版没有的笔 = app 用这种 tool 默认的那支、原样带回。
//                      1.5 的 tools 保留读、停止写：paintPen → pen、paintEraser → eraser（只有 ≤ 1.5 的版本会写 tools，它在就以它为准）；tools 里不认识的工具名原样带回。
//   CATSUP_references  1.0（2026-10-25，Claude Opus 5.5；契约 §5.8）：参考窗牌组 = @internal/reference-window 的目录 `.catsup/references/`（manifest.json + 每张卡）原样进 glb：
//                      files[] = { path, mimeType, bufferView }；**本层不懂清单**（清单的拍子 / 迁移归库）。空牌组不写这个扩展（抠）。不进定稿指纹、不进撤销；
//                      **major 比本版新 → 不拒开**（同 desk）：原字节带回、参考窗先不显示、提示一次。user 2026-10-25「咱们是不忘了接reference window. 先看懂我们的文件规范」。
//
// 三级拍子（家族纪律 ai-docs/20261021-format-version-discipline.md；user 2026-10-21「三级语义 同意」；CatsUp 2026-10-25 补齐，Claude Fable 5.1）：
//   每个 CATSUP_* 一个拍子 major.minor.patch，互不联动。物理形状 = 整数键 `version` 原地当 major（已发出去的老读者只认它，它们的 too-new 逻辑继续有效）
//   + 两个可选整数键 `minor` / `patch`（缺 = 0）。写入器只写当前拍（FORMAT）；读取器：
//   · major 比本版大 = 不可兼容 → FormatTooNewError 拒开（desk 例外，见上）；比本版小 = STEPS 链式升级。
//   · minor 比本版大 = 缺功能 / 行为变化 → 能开能存，未知键直通，readNotes.newerMinor 记一笔 → 宿主提示一次。
//   · patch 比本版大 = 可无脑降 → 静默。
//   改格式 = ① FORMAT 对应子结构 +1（major 变了在 STEPS 登记一条）② `node scripts/freeze-format-fixtures.mjs` 冻样本（目录名 = 全部拍子的签名 formatTag）③ 本头注释记一笔。
//   少一样守卫红（test/format.test.ts「冻结样本语料」）。
import { definitionsV6toV7, type MigrationCtx } from "./definitions.ts";

//
// 身份地基（2026-11-04，Claude Opus 5.5；计划书 ai-docs/20261104-identity-foundation-plan.md §2.10，清点 ai-docs/20261104-identity-id0-inventory.md §5）：
//   CATSUP_definitions 6 → 7（major，user「大版本同意」）：条目之间的引用从序号换成 GUID，迁移在 migrate/definitions.ts。老读者拒开（原文报版本）。
//   CATSUP_instance    1 → 2（major）：glTF 节点上的 definition 从下标换成 GUID。这个键只写不读，老读者不看，不影响打开；打开被拒是 definitions 7 拒的。
//   CATSUP_material    1.2（minor）：每条材质带 guid；老文件读时现铸。老读者原样带不回（它重建材质扩展）= 存一次换一批，但它打不开 definitions 7，碰不到。
//   CATSUP_document    3.5（minor）：layers[].guid；默认层是全家一个常量（guid.ts），别的层读时现铸。
//   CATSUP_brep        不动（4.2）。11-04 一度加了 4.3「面层 0xFFFE = 这一侧没有表面」，门审时 user 撤回：硬表面里对象是片不是体，单面 / 双面跟身体种类和导出规矩走，不进膜的数据（计划书 §2.9；Claude Fable 5.1）。
//   CATSUP_shelf       1.0（新，可选）：素材架。空 = 不写这个扩展。major 比本版新 → 不拒开（同 desk）：原字节带回、架子先空。
//
// 贴图成为独立的条目（2026-11-10，Claude Opus 5.5；贴图主线 1-0½，施工单 ai-docs/20261110-paint-workorders-2.md，Fable 定的形状）：
//   CATSUP_textures    1.0（新，可选顶层扩展）：贴图表，一行 = { guid, name, value, content, sizeM | layout, …不认识的键 }。表空 = 不写这个扩展。
//                      1.1（2026-11-11，贴图主线 1-8b）：行上可选键 composite = { png: { bufferView }, of: { bytes, sum }, base: [r, g, b] }——分层的画存盘时另存的合成图
//                      （底色上、不透明）；of = 照哪份分层字节做的（长度 + FNV-1a 32 位 十六进制）；对不上 / 底色变了 = 当它没有（document.ts compositeFits）。形状不认识 = 当不认识的键带回。
//                      content.kind = image（{ mimeType, bytes: { bufferView } }）/ layered（{ ora: { bufferView } }，这一版不解释）/ 不认识的（整行和字节原样带回，readNotes 记一笔）。
//                      字节一律写成 `{ "bufferView": N }`（不许写图片下标）：老版本不认识这个扩展、原样带回时只会改 bufferView 的号（carry.ts）。
//                      sizeM（自由的图，两个数 > 0）和 layout（单品的画）正好有一个，否则读取失败、报哪一行。行里不认识的键原样带回；表里的先后没有意思。
//                      **major 比本版新 → 不拒开**（同 desk / 参考窗 / 素材架）：扩展原样带回，材质的 channels 原样带回、先按底色显示，readNotes 记一笔；标准那一半这次不写这些材质的图。
//   CATSUP_material    1.3（minor）：材质不装图了，channels { 通道名: [贴图 GUID…] }（这一版只写 color、一摞一张；不认识的名字原样带；一摞空 = 不写那个名字，都空 = 不写 channels）。
//                      **材质扩展里的 sizeM 只是回声**：老读者（1.2）从这里读贴图尺寸，读不到当一米，所以照写 = 颜色那一槽最上面那张自由的图的 sizeM；本版读的时候有 channels 就不看它。
//                      标准那一半（pbrMetallicRoughness.baseColorTexture → textures → images）照写，images 那一条和贴图表那一行指同一个 bufferView（字节只存一份）。
//                      读老文件（没有 channels、标准那一半有图 = 1.2 和更老，或者被老版本存过一遍的新文件）：现铸 GUID、贴图表加一行（名字 = 材质名，尺寸 = 材质扩展的 sizeM，没有 = 一米），
//                      材质的 channels.color 指它；两个材质各有各的图 = 两行，不按内容合并（migrate/material.ts）。
//                      **已知的代价**：新文件被老版本打开再存一遍，老版本重写材质扩展、丢掉 channels，贴图表它原样带着 → 再用本版打开，材质得到一张新身份的贴图，表里原来那一行
//                      变成没人用的孤儿（资源页能清）。图不丢，身份号换了，多一行孤儿。不按内容认图（内容哈希当身份，全家族否决过）。
//                      同一条路上还有一处（门 6 拿 v0.18.50 的真代码跑出来的，2026-11-10；Fable 同意记成已知代价）：① 只在「新文件被老版本打开再存一遍」这条路上发生；
//                      ② 两个材质原来共用一张贴图的话，老版本给每个材质各写一份图 → 本版再打开铸出两张新贴图（各叫各自材质的名字）：图一个字节不丢，丢的是「共用」这层关系，
//                      文件里多一份同样的字节，原来那一行变孤儿；③ 不为它按内容认图。
//                      规矩（Fable 11-10 审 1-0½）：**channels 一摞里的每一项永远是一个 GUID 字符串**——这一版的读者会丢掉不是 GUID 的项和不是数组的值。
//                      以后要给槽加用法参数，用材质扩展里新的键，不许改一摞里项的形状；改了就是大版本。
//                      从 1.3 的读者起，材质扩展里不认识的键（连同它们引用的字节）原样带回（MaterialDoc.extra）；更老的读者是读时重建扩展，存一次会丢。
//
// 贴图坐标进文件（2026-11-11，Claude Opus 5.5；贴图主线 1-2½，契约 ai-docs/20261110-painting-data-contract.md 第五、六节，统筹 11-11 定的几条）：
//   CATSUP_mesh        2.0（major，user 同意「大版本号可以」）：网格体多一个键 uvSets[]（每套 { guid, name, width, height, pxPerM, loopUv: { bufferView, count } }；
//                      loopUv = 每个角一对 32 位浮点，单位 = 格，和 loopVert 同序，这一套不管的面的角写 NaN）。旧版本读到 2.0 = FormatTooNewError 拒开、明说要更新（不许悄悄打开：
//                      它在里面切一刀，角上那一列还是旧的，存回去画和模型就对不上了，而且是悄悄坏的）。
//                      **「写入器只写当前拍」的例外**：只有带贴图坐标的网格体才盖 2.0；不带的照旧盖 1.2（MESH_STAMP_NO_UV），写出来和以前逐字节一样——
//                      没画过的文件旧版本照常打开。1.x → 2.0 是一条空迁移（1.2 的形状是 2.0 的子集）。
//   CATSUP_mesh        2.1（2026-11-11，Claude Opus 5.5；施工单十六第四节，user「如果是指定贴图大小的话，后面自动涨也不好」）：一套贴图坐标上可选键 fit = "density"
//                      （按一格多大开的：加面放不下时画布照规矩长大）；缺 = 按总大小开的（画布不自己变大）。同一个例外：只有带 fit 的网格体盖 2.1，别的照旧盖 2.0 / 1.2
//                      （MESH_STAMP_UV_NO_FIT），写出来和以前逐字节一样。老读者（2.0）碰到 2.1 = minor 新：能开能存、提示一次；它不认识 fit、存回去会丢掉
//                      （贴图坐标那一行只认识的键才读进来）= 那张画变回「按总大小」：画布从此不自己长大，不坏数据。
//
// 排法表搬到场景这一层（2026-11-13，Claude Opus 5.5；施工单 ai-docs/20261111-paint-workorders-18.md 第三、五节，统筹定的格式）：
//   CATSUP_uvsets      1.0（新的顶层扩展，可选；表空 = 不写）：{ version, list: [ { guid, name, width, height, pxPerM, fit, freed?, …别的键 } ] }（format/uvset-table.ts）。
//                      major 比本版新 = 拒开（不学桌面态那几个例外：建模的每一步都要碰它）。
//   CATSUP_mesh        3.0（major）：uvSets 键没了，换成 columns[ … ]（mesh-payload.ts 头注释是全文）。kind = uv 的一项 = 一个通道
//                      { kind, arity: 2, sets: [排法 GUID…], faceSet（每面一个下标，−1 = 没有）, data（每角两个 32 位有符号整数、1/1024 格、没有 = 两个 −2147483648） }，
//                      通道数 = 一张面同时在几套排法上的最大值（统筹 11-13 改，原来是一套排法一列）；别的 kind：{ guid, kind, arity, data（每角 arity 个 32 位浮点、NaN = 没有）, …别的键 }。
//                      照旧的例外：不带列的网格体盖 1.2（MESH_STAMP_NO_UV），逐字节不变 = 没画过的文件旧版本照常开；带列的盖 3.0；2.0 / 2.1 不再写。
//                      **不做迁移**（第五节，user 11-13「舍去历史包袱」）：现行格式只有「排法表 + 列」一种。读到 2.x 的网格体：链上那一步 2 → 3 只改版本号（链式升级的机制
//                      要求每个 major 有一步；它不碰内容，和 1 → 2 一样）；载荷里的 uvSets 键现行格式里没有 = 读的门口不带回 + 记一笔（mesh-payload.ts），没有「2.x 按老的算」。
//   CATSUP_textures    1.3：画的那一行 layout = { uvSet: GUID }（正好这一个键；document.ts paintLayoutUvSet）。按内容盖：有这种行盖 1.3；只有平铺的画盖 1.2；都没有盖 1.1。
//                      以前的 { definition, uvSet } 这一版不当画（原样带回、按底色、不能画；打开时说一句，保存之后它们在面上的位置不再保留）。

export interface Stamp { readonly major: number; readonly minor: number; readonly patch: number }
/** 本版写出的拍子（SSoT）。 */
export const FORMAT = {
  CATSUP_document: { major: 3, minor: 5, patch: 0 },   // 3.5（2026-11-04）：layers[].guid   // 3.4（2026-10-30）：unitSystem + 吸附长度为主   // 3.2（2026-10-29）：settings.gridSubdiv 多四档 2 / 20 / 50 / 100；3.3（2026-10-30）：再多一档 1
  CATSUP_brep: { major: 4, minor: 2, patch: 0 },
  CATSUP_definitions: { major: 7, minor: 0, patch: 0 },   // 7.0（2026-11-04）：引用换 GUID
  CATSUP_instance: { major: 2, minor: 0, patch: 0 },   // 2.0（2026-11-04）：节点 definition 换 GUID（只写不读）
  CATSUP_material: { major: 1, minor: 3, patch: 0 },   // 1.3（2026-11-10）：channels（图搬进贴图表，sizeM 只是给老版本的回声）   // 1.2（2026-11-04）：guid   // 1.1（2026-10-30）：材质的 baseColorFactor 按 glTF 规定存线性值（以前存 sRGB 的数；color-space.ts）；老文件不迁移（user「老文件我们现在真的不用念旧」）
  CATSUP_desk: { major: 1, minor: 6, patch: 0 },   // 1.6（2026-11-12）：paint 按笔记（brushes / active），1.5 的 tools 保留读停止写；1.5（2026-11-11）：可选键 paint（画画工作台的笔）；1.4（2026-11-04）：可选键 exportModel；1.3（2026-10-29，风格 / 屏幕跟文件走）：可选键 style / screen
  CATSUP_references: { major: 1, minor: 0, patch: 0 },
  /** 网格身体载荷（住在 CATSUP_definitions 的 mesh 项里，不是顶层扩展；mesh-payload.ts）：1.0.0 = 多边形形（2026-10-27 M3）。没拍子、没 faceStart 的 = 0.14 三角汤最小形（migrate/mesh.ts 读成每三角一面）。 */
  CATSUP_mesh: { major: 3, minor: 0, patch: 0 },   // 3.0（2026-11-13，施工单十八）：columns 取代 uvSets（排法表搬到顶层 CATSUP_uvsets）   // 2.1（2026-11-11，施工单十六）：贴图坐标的一套上可选键 fit（只有带它的网格体盖 2.1，见 MESH_STAMP_UV_NO_FIT）；2.0（2026-11-11，1-2½）：uvSets 贴图坐标（只有带它的网格体盖 2.0，见 MESH_STAMP_NO_UV）；1.1（2026-10-28 FM129）：smoothDefault 默认平滑 + 边标记位 32 = 手标硬；1.2（2026-10-28 晚，镜像重做第二刀）：mirror { mode, axis } 对称属性（缺 = 关）
  CATSUP_shelf: { major: 1, minor: 0, patch: 0 },   // 1.0（2026-11-04）：素材架（可选扩展）
  CATSUP_textures: { major: 1, minor: 3, patch: 0 },   // 1.3（2026-11-13，施工单十八）：画的 layout = { uvSet }   // 1.0（2026-11-10）：贴图表（可选扩展）；1.1（2026-11-11，贴图主线 1-8b）：行上可选键 composite = 画的合成图（PNG + 照哪份分层字节做的 + 底色），旧读者当不认识的键原样带回；1.2（2026-11-12，施工单二十一第 3 刀）：「分层内容 + sizeM（没有 layout）」有了意思 = 平铺的画（document.ts tiledPaintIn），形状没变，1.1 的读者读到它 = 不是画也不是原图、按底色显示、原样带回；**按内容盖**：表里有平铺的画才盖 1.2，没有的照旧盖 1.1（TEXTURES_STAMP_NO_TILED），写出来和以前逐字节一样
  CATSUP_uvsets: { major: 1, minor: 0, patch: 0 },   // 1.0（2026-11-13，施工单十八）：排法表（可选的顶层扩展）
} as const satisfies Record<string, Stamp>;
export type CatsupExtension = keyof typeof FORMAT;
export const CATSUP_EXTENSION_ORDER: readonly CatsupExtension[] = ["CATSUP_document", "CATSUP_brep", "CATSUP_definitions", "CATSUP_instance", "CATSUP_material", "CATSUP_desk", "CATSUP_references", "CATSUP_mesh", "CATSUP_shelf", "CATSUP_textures", "CATSUP_uvsets"];
/** 不带贴图坐标的网格体照旧盖的拍子（「只写当前拍」的例外，见头注释 1-2½ 那一节）：和 2.0 之前写出来的逐字节一样。 */
export const MESH_STAMP_NO_UV: Stamp = { major: 1, minor: 2, patch: 0 };
/** 贴图表里没有平铺的画（document.ts isTiledRow）照旧盖的拍子（施工单二十一第 3 刀，统筹审格式时定 A）：和 1.2 之前写出来的逐字节一样——
 *  文件里没有旧版本不认识的东西，旧版本就不该提示「这是更新版写的」（不然提示成了狼来了）。 */
export const TEXTURES_STAMP_NO_TILED: Stamp = { major: 1, minor: 1, patch: 0 };
/** 贴图表里有平铺的画、没有挂在排法上的画（layout = { uvSet }）照旧盖的拍子（施工单十八，同一条「按内容盖」）。 */
export const TEXTURES_STAMP_TILED: Stamp = { major: 1, minor: 2, patch: 0 };
/** 各子结构的 major（老名字，读写两端的 too-new 判定与 STEPS 索引都用它）。 */
export const EXTENSION_VERSIONS: Readonly<Record<CatsupExtension, number>> = Object.fromEntries(CATSUP_EXTENSION_ORDER.map((k) => [k, FORMAT[k].major])) as Record<CatsupExtension, number>;
/** 写入器盖拍子：`version` 必写；`minor` / `patch` 是可选键（缺 = 0），为 0 时不写——省字节（§3.2「抠」），字节照样确定。 */
export const stampOf = (ext: CatsupExtension): { version: number; minor?: number; patch?: number } => stampFields(FORMAT[ext]);
/** 一个拍子写进文件的样子（stampOf 的通用版：按内容盖例外拍子的地方用）。 */
export const stampFields = (f: Stamp): { version: number; minor?: number; patch?: number } => ({ version: f.major, ...(f.minor ? { minor: f.minor } : {}), ...(f.patch ? { patch: f.patch } : {}) });
export const fmtStamp = (s: Stamp): string => `${s.major}.${s.minor}.${s.patch}`;
/** 全部拍子的签名（冻结样本目录名 `v<签名>`；任何一个拍子动了 = 新目录 = 新语料，机械执法）。 */
export const formatTag = (f: Readonly<Record<CatsupExtension, Stamp>> = FORMAT): string => CATSUP_EXTENSION_ORDER.map((k) => fmtStamp(f[k])).join("-");
/** 文件里的拍子：缺 version = 1（首版），缺 minor / patch = 0；非整数当 0 / 1（不猜更多）。 */
export function readStamp(json: Record<string, unknown>): Stamp {
  const int = (v: unknown, dflt: number): number => (typeof v === "number" && Number.isInteger(v) && v >= 0 ? v : dflt);
  return { major: int(json.version, 1), minor: int(json.minor, 0), patch: int(json.patch, 0) };
}
export type StampVerdict = "same" | "older" | "newer-minor" | "newer-patch";
/** 同 major 下文件拍子 vs 本版：minor 大 = newer-minor（提示一次），patch 大 = newer-patch（静默），其余 older / same。 */
export function compareStamp(file: Stamp, mine: Stamp): StampVerdict {
  if (file.minor > mine.minor) return "newer-minor";
  if (file.minor < mine.minor) return "older";
  if (file.patch > mine.patch) return "newer-patch";
  if (file.patch < mine.patch) return "older";
  return "same";
}
/** 读取时攒的判决（不持久化）：newerMinor = 哪些子结构比本版新一个 minor（宿主提示一次）；deskTooNew = 桌面态 major 比本版新（原字节带回、用默认）；
 *  referencesTooNew = 参考窗牌组 major 比本版新（原字节带回、参考窗先不显示）；shelfTooNew 同理；danglingShelfRefs = 架子上有几格指向的东西已经不在文件里（读时丢掉，不猜、不造）。 */
export interface FormatReadNotes { /** 文件里写了身份、但重复或不合法，这次打开换了新身份（ID-4c；手改过的文件才有）。 */ remintedGuids?: number; newerMinor: { ext: CatsupExtension; file: Stamp; mine: Stamp }[]; newerPatch: { ext: CatsupExtension; file: Stamp; mine: Stamp }[]; deskTooNew?: Stamp; /** 槽表里写了内置默认正面 GUID 的格数（默认正面的唯一表示是槽缺，读成没有；手改过的文件才有）。 */ builtinFrontSlots?: number; referencesTooNew?: Stamp; shelfTooNew?: Stamp; danglingShelfRefs?: number; /** 材质槽指着的材质不在材质表里（也不是内置背面）：这次打开那几格读成默认正面（槽缺）；存回去原来的值就没了（统筹 11-12，存盘忠实度清点 R1）。 */ danglingMaterialSlots?: number; /** 组 / 实例的上一层指着不存在的组：这次打开放到所在定义的最外层；存回去原来的值就没了（同上 R2）。 */ danglingParents?: number; /** 贴图表是更新版写的（major 比本版新）：原样带回、材质先按底色显示。 */ texturesTooNew?: Stamp; /** 材质的 channels 指着贴图表里没有的 GUID：那一格当空的（不猜、不造）。 */ danglingTextureRefs?: number; /** 贴图表里有本版不认识的 content 种类（整行原样带回、显示成灰色占位）。 */ unknownTextureKinds?: number;
  /** 贴图坐标坏了、这次打开按「没有」处理的地方（1-2½，契约第五节：贴图坐标是模型的附属数据，坏了模型照开）：哪个定义、哪一套（整套不认、连身份号都坏了 = null）、几张面、为什么。再存盘会把它们去掉。 */
  uvDropped?: UvDropNote[];
  /** 走画的面在那一套上没有位置（照材质的底色显示）：哪个定义、哪一套、几张面。 */
  paintUnplaced?: { def: { guid: string; name: string }; uvSet: { guid: string; name: string }; faces: number }[];
  /** 画挂的排法不在排法表里：这张贴图当孤儿留着（几张）。 */
  orphanPaintTextures?: number;
  /** 排法表（CATSUP_uvsets）里这一版读不了的行：不认（挂在上面的画按底色、指着它的列按没有）；再存盘会去掉。 */
  uvSetRowsDropped?: { guid: string | null; name: string; why: UvRowWhy }[];
  /** 旧存法的画（施工单十八第五节：不做迁移）：贴图行的 layout 还是以前的 { definition, uvSet }（几张）。这一版不当画、按底色显示；行原样带回，存了不丢。 */
  oldPaintFormat?: number;
  /** 网格体载荷里还带着以前的 uvSets 键（几个网格体）：画在面上的位置，旧存法。读的门口不带回 = 保存之后不再保留（算会丢的）。
   *  和上一条分开记：存过一次再打开，网格体上已经没有它了，这时只剩上一条、再存什么都不丢。 */
  oldUvColumns?: number }
/** 排法表的一行读不了的原因。 */
export type UvRowWhy = "not-a-list" | "not-an-object" | "bad-guid" | "bad-size" | "bad-density" | "bad-fit" | "duplicate-guid";
/** 角上的列坏了的一处（施工单十八：为什么 = 整个 columns 不是列表 / 这一列的身份号、种类、角上的数那一段不对 / 几列同一个身份号 / uv 列的号在排法表里没有 / 面的角一半有数一半没有、不是有限数、落在画布外面）。 */
export type UvDropWhy = "not-a-list" | "not-an-object" | "bad-guid" | "bad-kind" | "no-data" | "bad-length" | "duplicate-guid" | "no-row" | "partial-corners" | "non-finite-corners" | "off-canvas-corners"
  | "bad-sets" | "bad-face-set" | "face-set-mismatch" | "extra-channel";   // 后四种 = uv 通道（mesh-payload.ts readColumns / readUvChannel；extra-channel = 第二个起的通道，施工单十八第 1½ 刀起只认第一个）
export interface UvDropNote { readonly def: { readonly guid: string; readonly name: string }; readonly uvSet: { readonly guid: string; readonly name: string } | null; readonly faces: number; readonly why: UvDropWhy }
export const emptyReadNotes = (): FormatReadNotes => ({ newerMinor: [], newerPatch: [] });

export type MigrationStep = (json: Record<string, unknown>, ctx?: MigrationCtx) => Record<string, unknown>;
/** STEPS[ext][fromVersion] = 升到 fromVersion+1 的纯函数。加迁移 = 在这里登记一条 + 冻结样本。 */
const NO_GUIDES = (): Record<string, unknown> => ({ lines: [], points: [] });
const STEPS: { [K in CatsupExtension]?: Record<number, MigrationStep> } = {
  CATSUP_document: {
    1: (j) => ({ ...j, version: 2, axes: isPlainObject(j.axes) ? j.axes : { origin: [0, 0, 0], x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] } }),
    2: (j) => ({ ...j, version: 3, layers: Array.isArray(j.layers) ? j.layers : [{ id: 0, name: "默认", visible: true }] }),
  },
  CATSUP_brep: {
    1: (j) => { const { groups: _groups, ...rest } = j; void _groups; return { ...rest, version: 2 }; },
    2: (j) => ({ ...j, version: 3 }),   // v2 文件没有 face.material 层 = 全默认；层本身是可选的
    3: (j) => ({ ...j, version: 4, curves: Array.isArray(j.curves) ? j.curves : [] }),   // v3 的 curves 是空占位 = 无曲线
  },
  CATSUP_definitions: {
    1: (j) => ({
      ...j,
      version: 2,
      list: Array.isArray(j.list) ? (j.list as Record<string, unknown>[]).map((d) => ({ ...d, groups: Array.isArray(d.groups) ? d.groups : [], instances: Array.isArray(d.instances) ? d.instances : [] })) : j.list,
    }),
    2: (j) => ({ ...j, version: 3, list: Array.isArray(j.list) ? (j.list as Record<string, unknown>[]).map((d) => ({ ...d, materialSlots: Array.isArray(d.materialSlots) ? d.materialSlots : [] })) : j.list }),
    3: (j) => ({
      ...j,
      version: 4,
      list: Array.isArray(j.list) ? (j.list as Record<string, unknown>[]).map((d) => ({
        ...d,
        guides: isPlainObject(d.guides) ? d.guides : NO_GUIDES(),
        groups: Array.isArray(d.groups) ? (d.groups as Record<string, unknown>[]).map((g) => ({ ...g, guides: isPlainObject(g.guides) ? g.guides : NO_GUIDES() })) : d.groups,
      })) : j.list,
    }),
    4: (j) => ({
      ...j,
      version: 5,
      list: Array.isArray(j.list) ? (j.list as Record<string, unknown>[]).map((d) => ({
        ...d,
        groups: Array.isArray(d.groups) ? (d.groups as Record<string, unknown>[]).map((g) => { const { locked: _l, ...rest } = g; void _l; return rest; }) : d.groups,   // 组不是物体：锁丢弃
      })) : j.list,
    }),
    5: (j) => ({
      ...j,
      version: 6,
      list: Array.isArray(j.list) ? (j.list as Record<string, unknown>[]).map((d) => { if (d.kind !== "card") return d; const { card: _c, kind: _k, ...rest } = d; void _c; void _k; return rest; }) : j.list,   // CardBody sunset：card → 空 brep 定义
    }),
    6: definitionsV6toV7,   // 引用从序号换成 GUID（2026-11-04；先去重再铸，见 definitions.ts）
  },
  CATSUP_mesh: {
    1: (j) => ({ ...j, version: 2 }),   // 1.x 的形状是 2.0 的子集（没有 uvSets = 没有贴图坐标）：空迁移（1-2½）
    2: (j) => ({ ...j, version: 3 }),   // 只改版本号（施工单十八：不做迁移；链式升级的机制要求每个 major 有一步）。2.x 的 uvSets 键现行格式里没有：读的门口不带回 + 记一笔（mesh-payload.ts）
  },
};
const isPlainObject = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null && !Array.isArray(x);

export class FormatTooNewError extends Error {
  readonly extension: string;
  readonly fileVersion: number;
  readonly appVersion: number;
  constructor(extension: string, fileVersion: number, appVersion: number) {   // 不用参数属性：node strip-types 不支持
    super(`${extension} version ${fileVersion} is newer than this app supports (${appVersion}); refusing to open (never downgrade or guess)`);
    this.name = "FormatTooNewError";
    this.extension = extension; this.fileVersion = fileVersion; this.appVersion = appVersion;
  }
}

/** 把一个扩展的 JSON 从文件 major 链式升到当前版；缺 version 视为 1（首版）。同 major 下 minor / patch 比本版新 → 记进 notes（有的话），不改 JSON。ctx = 跨子结构的迁移要的东西（定义 6→7 要材质的 GUID）；没传就由需要它的那一步抛错，不许默认成空表（空表 = 老文件的材质槽静默清空）。 */
export function migrateExtension(ext: CatsupExtension, json: Record<string, unknown>, notes?: FormatReadNotes, ctx?: MigrationCtx): Record<string, unknown> {
  const target = EXTENSION_VERSIONS[ext];
  const file = readStamp(json);
  let v = file.major;
  if (v > target) throw new FormatTooNewError(ext, v, target);
  if (notes && v === target) {
    const verdict = compareStamp(file, FORMAT[ext]);
    const seen = (arr: { ext: CatsupExtension }[]): boolean => arr.some((n) => n.ext === ext);   // brep / material 一个文件里出现多次：同一子结构只记一笔
    if (verdict === "newer-minor" && !seen(notes.newerMinor)) notes.newerMinor.push({ ext, file, mine: FORMAT[ext] });
    else if (verdict === "newer-patch" && !seen(notes.newerPatch)) notes.newerPatch.push({ ext, file, mine: FORMAT[ext] });
  }
  let cur = json;
  while (v < target) {
    const step = STEPS[ext]?.[v];
    if (!step) throw new Error(`migrate: no step registered for ${ext} v${v} → v${v + 1} (constitution §7 violated)`);
    cur = step(cur, ctx);
    v++;
    if (cur.version !== v) throw new Error(`migrate: step ${ext} v${v - 1}→v${v} did not set version`);
  }
  return cur;
}

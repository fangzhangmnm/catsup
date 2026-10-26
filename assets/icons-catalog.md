# 本 app 的图标

85 icons · 提取自家族图标库 `../20260708 SVG Icons/icons.svg` · 由 `extract-icons.py` 生成，别手改。

用法：把 sprite 整段内联到 `<body>` 顶部，然后按 id 引用；
⚠ sprite 根自带的隐藏样式（1×1 + `opacity:0`）别换成 `display:none`——
不渲染的子树里 `<mask>`/`<clipPath>` 不生效，靠遮罩留白的图标会静默糊掉；
颜色跟随 CSS `color`（全部 `currentColor`）：

```html
<!-- 内联 icons.svg -->
<svg width="24" height="24"><use href="#blur"/></svg>
```

> 👁 **待过目**（AI 自画、未经人类审阅，`data-review="pending"`）：`blur`、`sharpen`、`rotated-rectangle`、`push-pull`、`eraser-weld`、`eraser-soft`、`chevron-left`、`chevron-right`、`forward`、`zoom`、`one-to-one`、`help`、`settings`
> 见库 `index.html` 的「待过目」栏；过目后进库/打回归库 session。


## drawing-tool

| name | 说明 |
|------|------|
| `blur` 👁待过目 | 模糊:实心点 + 两圈虚化环(外圈更淡)=低通扩散；与 sharpen(硬边菱形)成对【WeebPaint 手指位长按菜单「模糊（笔刷）」+ 钮面；fable 自画未过目】 |
| `eraser` | 橡皮:18x11 圆角矩形斜置 -45°, 一道分割线在自下端 30% 处(下段=擦头) |
| `paint-bucket` | 线描桶+实心水滴 (定稿:把手弧高≈4.9=原 -3) |
| `pencil` | 铅笔 Bootstrap Icons MIT |
| `sharpen` 👁待过目 | 锐化:硬边菱形 + 十字棱线(淡)=切面/刃口；与 blur 成对(一软一硬)【WeebPaint 手指位长按菜单「锐化（笔刷）」+ 钮面；fable 自画未过目】 |

## tool

| name | 说明 |
|------|------|
| `hand` | 手/抓取:食指左线裁到与拇指指尖弧交点 y=11.44,不再穿出 |
| `move` | 四向移动箭头 (move tool, for SketchUp-clone) |
| `rotate` | 3D 旋转:双弧+直角括号箭头·逆时针(同 rotate-ccw 画法) |
| `select` | 鼠标指针·空心 |

## shapes

| name | 说明 |
|------|------|
| `circle` | 圆(shapes 基本图元,无圆心点) |
| `line` | 直线(shapes 基本图元):斜线+两端点, 与 arc 同族(同点径 1.2), 29° 防端点顶角; 20260725 入库 |
| `rectangle` | 矩形(shapes 基本图元) |
| `arc` | 圆弧:升弧+两端点(shapes 基本图元) |
| `rotated-rectangle` 👁待过目 | 旋转矩形:rectangle 同体量的圆角矩形整体转 -22° + 左下角外侧一道基线 + 一小段角度弧(=先拉第一边、再转角度；SU Rotated Rectangle 图标同一语义)；与 rectangle(正放)分工【CatsUp 左柱形状格小三角里的「旋转矩形」；2026-10-24 Claude Fable 5.1 自画未过目】 |

## perspective-reference

| name | 说明 |
|------|------|
| `persp-iso` | 等轴测模式·iso 3x3 顶满:hw10.2/hh5.1(x1.8-22.2, 含描边到 0.95/23.05 —— 比库内惯例更满, 看是否可接受); 20260728 候选 3 号入库(顶满版; 2x2 与常规 3x3 落选) |

## 3d-modeling

| name | 说明 |
|------|------|
| `axes` | 3D 坐标轴:等距三轴(三箭头臂长/张角统一) |
| `push-pull` 👁待过目 | 推拉(push/pull):等距薄板(顶面菱形+三条竖棱+底沿)+从顶面后角竖直向上的箭头=把面拉出体；与 move 十字箭头不撞【CatsUp 左侧工具条「推拉」钮（默认可见）；2026-09-06 fable 自画未过目】 |
| `dimensions` | 更紧:track-2.4(墨迹 11.30->10.10) |
| `eraser-weld` 👁待过目 | 焊边橡皮:eraser 本体缩 0.8 挪到左上(旋 -45 围绕 9.6,9.6) + 右下一条短横线中间一粒实心焊点(=两段边在接点处焊成一条)；与 eraser(擦)/ eraser-soft(软)同族靠右下徽记分辨【CatsUp 左柱橡皮格小三角里的「焊边橡皮」（刮两条相邻的边 → 接点共轴真合并 / 护栏角内焊成一条曲线）；2026-10-24 Claude Fable 5.1 自画未过目】 |
| `eraser-soft` 👁待过目 | 软边橡皮:eraser 本体同 eraser-weld 缩放挪位 + 右下一道正弦小波(=两膜之间的边变软、连成曲面)【CatsUp 左柱橡皮格小三角里的「软边橡皮」（刮两膜之间的边 → 共面删边并面 / 护栏角内软化 + 平滑）；2026-10-24 Claude Fable 5.1 自画未过目】 |

## image-processing

| name | 说明 |
|------|------|
| `color` | 三色文氏图(弱半透明填充,重叠处自然叠深) |

## transform

| name | 说明 |
|------|------|
| `flip-horizontal` | 水平翻转(尖端朝内):左空心 右实心+圆角描边。实心那个按 0.88 缩放 —— 外轮廓一致时实心墨迹 41.4(空心 40.2), 视觉上更重, 故需略缩。此处外宽 6.4(空心 7.03) |
| `free-transform` | 自由变换·中心加 move 四向箭头:虚框放大到 4-20(原 6-18 里十字挤成一坨)+手柄缩到 2.9 挪到框角外, 十字臂长 4.6(move 同画法 ×0.51); 20260725 甲方定稿入库(原纯虚框+四手柄版退役) |
| `scale-uniform` | 等比缩放(正方框+小方虚线) |

## selection

| name | 说明 |
|------|------|
| `selection-expand` | 编辑选区:虚线外框 + 内部实线小方框 |
| `selection-invert` | 反选:圆角方框沿对角线切开, 一半填实一半留空 —— 选区与非选区对调 |

## edit

| name | 说明 |
|------|------|
| `arrow-redo` | 重做:arrow-undo 的水平镜像 |
| `arrow-undo` | 撤销:向左的直角回勾箭头 |
| `copy` | 两个文件叠放 |
| `paste` | 粘贴:剪贴板不缩(库尺寸)+文档探出右下角, 按 copy 的前后件比例 |

## media

| name | 说明 |
|------|------|
| `play` | 播放:实心右向三角 ▶(IEC 60417 磁带机惯例统一实心, 描边同色叠加得圆角); 20260819 media 批入库 |
| `pause` | 暂停:双竖杠 ⏸(粗 3.2 圆帽, brush-width 同款加粗手法); 20260819 media 批入库 |
| `skip-prev` | 上一曲 ⏮: skip-next 的精确镜像(translate+scale(-1,1), 同 replay 画法)。20260821 入库 |
| `skip-next` | 下一曲 ⏭(BR 播放器): 实心右三角+竖杠(stroke 2.8 圆帽), 体量对齐 fast-forward; 与 fast-forward(双三角=快进)分工。20260821 甲方拍板候选1号入库(实心 rect 杠版/轻量版落选) |

## file

| name | 说明 |
|------|------|
| `export` | 导出:向上箭头离开托盘(import 的上下镜像) |
| `file` | 文档:单张纸+折角(copy/paste/clear-canvas 共用母题) |
| `floppy-disk` | 软盘/保存:滑盖左右对称(7/17)且两竖线顶到顶边 + 防呆角 k=3 |
| `folder` | 文件夹:左边 tab + 矩形主体 |
| `folder-open` | 打开的文件夹:背板止于盖顶 T 接,不再互相压线 |
| `gallery` | 图库入口:图片堆叠(沿用 image 的太阳+山母题) |
| `import` | 导入:向下箭头落进托盘(托盘=开口朝上的 U) |
| `new` | 新建:纯加号(等长十字线) |
| `rename` | 重命名:文字光标+铅笔 |
| `restore-trash` | 同上但盖只掀 -16° |
| `save-as` | 另存为(floppy-disk=保存 的配对键):双软盘叠放(copy 的前后件语法), 后盘右上探出, 前盘遮罩留白; 20260724 候选 3 号入库 |
| `trash-can` | 垃圾桶:桶身收口(feather 是直筒);与 fluent(圆提手/更低)、heroicons(弧形透视)亦不同 — own |

## hierarchy

| name | 说明 |
|------|------|
| `collection` | 收纳箱 (Blender collection · copy of archive-box) |
| `explode-folder` | 解散文件夹:虚线 folder 残影 + 内容三方块排成一行落在下方 |
| `lock` | 锁:体 13x11+锁梁抬高(腿3.5),整体居中 |
| `move-to-folder` | 移入文件夹(定 2 号):小 folder + 弧箭头, 箭头头部在 folder 内 · 尾巴在外 |
| `object` | 对象:等距 cube(Unity GameObject 式) |
| `unlock` | 开锁:同 lock 体型+锁梁弹开 |
| `visibility-hide` | 隐藏:同 show 撑高版+斜杠(mask 留 gap) |
| `visibility-show` | 可见:撑高眼裂+瞳孔 r4.3(甲方实测原版太小) |

## common

| name | 说明 |
|------|------|
| `back` | 返回:左向整箭头(带杆;裸 chevron-left 曾因小尺寸渲染差被 sunset) |
| `check` | 勾 |
| `chevron-down` | 下移:竖线 + 底端 ∨ 箭头 |
| `x` | 叉 |
| `chevron-left` 👁待过目 | ‹ 小尺寸优化裸 chevron:描边 2.4、臂短(14px chip 用)；库里带杆的 back 是另一语义【WeebPaint 参考窗多图时窗底翻页 chip；fable 自画未过目】 |
| `chevron-right` 👁待过目 | › chevron-left 的精确镜像【WeebPaint 参考窗翻页 chip；fable 自画未过目】 |
| `forward` 👁待过目 | 前进:back 的精确镜像(右向整箭头带杆;与 chevron-right 裸 chevron 分工)【WebXiaoHeiWu 侧栏页头「回退」右邻的「前进」钮（回退之后再回去）；2026-09-10 fable 自画未过目】 |

## cloud

| name | 说明 |
|------|------|
| `cloud` | 云 |
| `cloud-conflict` | 云+感叹号(2.4 描边整体收在云内不破轮廓, 点半径=描边半宽; 与 cloud-pending 问号云成对但云为实线); WeebPaint gallery 同步徽章 conflict, 12px 用量 (甲方 20260825 拍板候选 5 号=大号收内) |
| `cloud-download` | 云+下载箭头:cloud-upload 的精确上下镜像(箭头绕 y=14 翻转); WeebPaint gallery 同步徽章 newer-on-cloud, 12px 用量 (甲方 20260825 拍板候选 1 号) |
| `cloud-pending` | 待判定:虚线云 + 云内问号(加粗 2.4, 遮罩描边留白与云脱开;问号下点的半径=描边半宽) |
| `cloud-synced` | 云+勾 |
| `cloud-unavailable` | — |
| `cloud-upload` | 云+上传箭头 (云形统一为 feather 的) |
| `download` | 下载 |
| `local-cache` | 本地缓存副本:database(=本地已缓存, 与 unload-local-cache 同形去掉删除线) |
| `refresh` | 刷新:顺时针 3/4 圆 + 箭头(从 12 点绕到 9 点, 箭头尖在右上) |
| `unload-local-cache` | 卸载本地副本:database(=本地) + 斜删除线(mask 留 gap)【非垃圾桶, 云端仍保留】 |
| `upload` | 上传 |

## viewport

| name | 说明 |
|------|------|
| `grid` | 网格:直角外框 1.2 与内网格线同宽(20260725 甲方定稿; 原 rx1.6 圆角粗框版退役), 内部 4x4 细网格 |
| `maximize-viewport` | 适配视口:四角向外的箭头(reset-transform=同形别名 id, 改动保持同几何) |
| `zoom` 👁待过目 | 放大镜:左上圆镜片(r6) + 右下短柄(粗 2 圆帽)；与 maximize-viewport(四角取景框=缩放到全部)/ hand(平移)分工【CatsUp 右上角视图 gizmo 下的「缩放」拖柄（按住上下拖）；2026-10-21 fable 自画未过目】 |
| `snap-grid` | 主栅格/对齐网格(WeebPaint ☰「主栅格(对齐网格)」): **实线**外框(1.7, 与 grid-border 同重)+**虚线**十字(1.2, dash 2.25/2.0)。三件并置可辨: grid=实线密 4x4 / grid-border=虚框+实十字 / snap-grid=实框+虚十字。20260821 甲方拍板候选1号入库(全虚线版、3x3 虚线版、细框 1.2 版落选); 原与像素栅格/主栅格尺寸三条菜单同挂 #grid, 本轮分家 |
| `picture-in-picture` | 画中画:大框(主画布) + 右下角内嵌小窗(参考小窗自己) |
| `one-to-one` 👁待过目 | 1:1 像素:四角括号 + 中心一颗实心像素=「一图像素对一屏像素」(不写 1:1 文字)【WeebPaint 参考窗 ＋ 菜单「1:1 像素」项；fable 自画未过目】 |

## ui

| name | 说明 |
|------|------|
| `help` 👁待过目 | 帮助:圆 + 路径画的问号(不用 text)【WeebPaint ☰ 设置菜单「帮助」= in-app 说明书入口；fable 自画未过目】 |
| `keyboard` | 键盘:圆点加大收紧+空格上移不压框(与 shortcut 不同语义) |
| `menu` | 汉堡菜单:三条等长横线(y=7/12/17) |
| `more` | 溢出菜单:横向三点(原 ⋯ 字符跨平台字形不一) |
| `settings` 👁待过目 | 设置:齿轮=内圆+外圆+8 根短齿(圆帽)；家族里 sliders 是「调整」别撞【WebXiaoHeiWu 抽屉底栏「设置」入口；fable 自画未过目】 |
| `wrench` | 扳手:斜置组合扳手轮廓(feather:wrench 衍生), 20260724 候选 1 号入库 |

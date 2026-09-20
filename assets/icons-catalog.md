# 本 app 的图标

54 icons · 提取自家族图标库 `../20260708 SVG Icons/icons.svg` · 由 `extract-icons.py` 生成，别手改。

用法：把 sprite 整段内联到 `<body>` 顶部，然后按 id 引用；
⚠ sprite 根自带的隐藏样式（1×1 + `opacity:0`）别换成 `display:none`——
不渲染的子树里 `<mask>`/`<clipPath>` 不生效，靠遮罩留白的图标会静默糊掉；
颜色跟随 CSS `color`（全部 `currentColor`）：

```html
<!-- 内联 icons.svg -->
<svg width="24" height="24"><use href="#eraser"/></svg>
```

> 👁 **待过目**（AI 自画、未经人类审阅，`data-review="pending"`）：`push-pull`、`help`、`settings`
> 见库 `index.html` 的「待过目」栏；过目后进库/打回归库 session。


## drawing-tool

| name | 说明 |
|------|------|
| `eraser` | 橡皮:18x11 圆角矩形斜置 -45°, 一道分割线在自下端 30% 处(下段=擦头) |
| `pencil` | 铅笔 Bootstrap Icons MIT |

## tool

| name | 说明 |
|------|------|
| `select` | 鼠标指针·空心 |
| `move` | 四向移动箭头 (move tool, for SketchUp-clone) |
| `hand` | 手/抓取:食指左线裁到与拇指指尖弧交点 y=11.44,不再穿出 |
| `rotate` | 3D 旋转:双弧+直角括号箭头·逆时针(同 rotate-ccw 画法) |

## shapes

| name | 说明 |
|------|------|
| `line` | 直线(shapes 基本图元):斜线+两端点, 与 arc 同族(同点径 1.2), 29° 防端点顶角; 20260725 入库 |
| `rectangle` | 矩形(shapes 基本图元) |

## perspective-reference

| name | 说明 |
|------|------|
| `persp-iso` | 等轴测模式·iso 3x3 顶满:hw10.2/hh5.1(x1.8-22.2, 含描边到 0.95/23.05 —— 比库内惯例更满, 看是否可接受); 20260728 候选 3 号入库(顶满版; 2x2 与常规 3x3 落选) |

## 3d-modeling

| name | 说明 |
|------|------|
| `axes` | 3D 坐标轴:等距三轴(三箭头臂长/张角统一) |
| `push-pull` 👁待过目 | 推拉(push/pull):等距薄板(顶面菱形+三条竖棱+底沿)+从顶面后角竖直向上的箭头=把面拉出体；与 move 十字箭头不撞【CatsUp 左侧工具条「推拉」钮（默认可见）；2026-09-06 fable 自画未过目】 |

## edit

| name | 说明 |
|------|------|
| `arrow-undo` | 撤销:向左的直角回勾箭头 |
| `arrow-redo` | 重做:arrow-undo 的水平镜像 |
| `copy` | 两个文件叠放 |

## file

| name | 说明 |
|------|------|
| `import` | 导入:向下箭头落进托盘(托盘=开口朝上的 U) |
| `export` | 导出:向上箭头离开托盘(import 的上下镜像) |
| `trash-can` | 垃圾桶:桶身收口(feather 是直筒);与 fluent(圆提手/更低)、heroicons(弧形透视)亦不同 — own |
| `new` | 新建:纯加号(等长十字线) |
| `floppy-disk` | 软盘/保存:滑盖左右对称(7/17)且两竖线顶到顶边 + 防呆角 k=3 |
| `save-as` | 另存为(floppy-disk=保存 的配对键):双软盘叠放(copy 的前后件语法), 后盘右上探出, 前盘遮罩留白; 20260724 候选 3 号入库 |
| `folder` | 文件夹:左边 tab + 矩形主体 |
| `folder-open` | 打开的文件夹:背板止于盖顶 T 接,不再互相压线 |
| `gallery` | 图库入口:图片堆叠(沿用 image 的太阳+山母题) |
| `rename` | 重命名:文字光标+铅笔 |
| `restore-trash` | 同上但盖只掀 -16° |
| `file` | 文档:单张纸+折角(copy/paste/clear-canvas 共用母题) |

## hierarchy

| name | 说明 |
|------|------|
| `object` | 对象:等距 cube(Unity GameObject 式) |
| `lock` | 锁:体 13x11+锁梁抬高(腿3.5),整体居中 |
| `unlock` | 开锁:同 lock 体型+锁梁弹开 |
| `move-to-folder` | 移入文件夹(定 2 号):小 folder + 弧箭头, 箭头头部在 folder 内 · 尾巴在外 |

## common

| name | 说明 |
|------|------|
| `x` | 叉 |
| `check` | 勾 |
| `chevron-down` | 下移:竖线 + 底端 ∨ 箭头 |
| `back` | 返回:左向整箭头(带杆;裸 chevron-left 曾因小尺寸渲染差被 sunset) |

## cloud

| name | 说明 |
|------|------|
| `refresh` | 刷新:顺时针 3/4 圆 + 箭头(从 12 点绕到 9 点, 箭头尖在右上) |
| `download` | 下载 |
| `upload` | 上传 |
| `cloud` | 云 |
| `cloud-upload` | 云+上传箭头 (云形统一为 feather 的) |
| `cloud-download` | 云+下载箭头:cloud-upload 的精确上下镜像(箭头绕 y=14 翻转); WeebPaint gallery 同步徽章 newer-on-cloud, 12px 用量 (甲方 20260825 拍板候选 1 号) |
| `cloud-synced` | 云+勾 |
| `cloud-pending` | 待判定:虚线云 + 云内问号(加粗 2.4, 遮罩描边留白与云脱开;问号下点的半径=描边半宽) |
| `cloud-conflict` | 云+感叹号(2.4 描边整体收在云内不破轮廓, 点半径=描边半宽; 与 cloud-pending 问号云成对但云为实线); WeebPaint gallery 同步徽章 conflict, 12px 用量 (甲方 20260825 拍板候选 5 号=大号收内) |
| `cloud-unavailable` | — |
| `local-cache` | 本地缓存副本:database(=本地已缓存, 与 unload-local-cache 同形去掉删除线) |
| `unload-local-cache` | 卸载本地副本:database(=本地) + 斜删除线(mask 留 gap)【非垃圾桶, 云端仍保留】 |

## viewport

| name | 说明 |
|------|------|
| `maximize-viewport` | 适配视口:四角向外的箭头(reset-transform=同形别名 id, 改动保持同几何) |
| `grid` | 网格:直角外框 1.2 与内网格线同宽(20260725 甲方定稿; 原 rx1.6 圆角粗框版退役), 内部 4x4 细网格 |

## ui

| name | 说明 |
|------|------|
| `menu` | 汉堡菜单:三条等长横线(y=7/12/17) |
| `more` | 溢出菜单:横向三点(原 ⋯ 字符跨平台字形不一) |
| `help` 👁待过目 | 帮助:圆 + 路径画的问号(不用 text)【WeebPaint ☰ 设置菜单「帮助」= in-app 说明书入口；fable 自画未过目】 |
| `keyboard` | 键盘:圆点加大收紧+空格上移不压框(与 shortcut 不同语义) |
| `settings` 👁待过目 | 设置:齿轮=内圆+外圆+8 根短齿(圆帽)；家族里 sliders 是「调整」别撞【WebXiaoHeiWu 抽屉底栏「设置」入口；fable 自画未过目】 |
| `wrench` | 扳手:斜置组合扳手轮廓(feather:wrench 衍生), 20260724 候选 1 号入库 |

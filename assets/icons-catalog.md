# 本 app 的图标

27 icons · 提取自家族图标库 `../20260708 SVG Icons/icons.svg` · 由 `extract-icons.py` 生成，别手改。

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

## file

| name | 说明 |
|------|------|
| `import` | 导入:向下箭头落进托盘(托盘=开口朝上的 U) |
| `export` | 导出:向上箭头离开托盘(import 的上下镜像) |
| `trash-can` | 垃圾桶:桶身收口(feather 是直筒);与 fluent(圆提手/更低)、heroicons(弧形透视)亦不同 — own |

## common

| name | 说明 |
|------|------|
| `x` | 叉 |
| `check` | 勾 |
| `chevron-down` | 下移:竖线 + 底端 ∨ 箭头 |

## cloud

| name | 说明 |
|------|------|
| `refresh` | 刷新:顺时针 3/4 圆 + 箭头(从 12 点绕到 9 点, 箭头尖在右上) |

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

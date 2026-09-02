# SU 早期开发史考古（@Last Software 1999-2006）

> as-of 2026-09-02（创建日）· created by Claude Fable 5 · 网上核过的事实附来源；
> 版本级工具清单公开资料很薄，未核到的不编（诚实缺口见文末）。

## 时间线（已核）

- **1999**：@Last Software 于 Boulder, Colorado 成立。两位创始人：**Brad Schell（建筑工程师）+
  Joe Esch（软件工程师）**——产品基于 **Schell 多年的手写笔记**孵化。
- **2000-08**：SketchUp 1.0 发布，定位「general-purpose 3D content creation」，愿景原文：
  「让设计专业者以他们想要的方式画图——模拟纸笔的手感与自由，界面简单优雅、好玩易学」。
  tagline =「3D for Everyone」。**首个 tradeshow 即拿 Community Choice Award**。
- **2000-11**：push/pull 专利申请（**US 6,628,279**，2003-09 授予，2021 过期）——发布仅三个月后
  递交，说明团队清楚自己的发明本体是什么。
- **2004**：年销售额 ~$5.5M（Schell 口径）。
- **2006-03-14**：Google 收购（估 $15-45M）——吸引点=@Last 做的 **Google Earth 插件**。
  （2012 转手 Trimble。）

## 对 CatsUp 的开发经历教训

1. **手写笔记→两人→约一年出 1.0**：内核愿景先于代码多年成熟；落地时极小团队极快。
   我们的对应物=drill journal（几何公理考古）+ lab 快迭代。
2. **专利=manifesto**：他们没把 pp 当 feature 之一，当作「the invention」单独立宪——与我们
  「pp=覆盖代数动词」的立宪化路线同构。
3. **首展获奖=demo 的猎奇度是真实资产**（user 的 WP 引流视频直觉有先例背书）。
4. **生态接口是被收购的杠杆**（Earth 插件）——远期 BTP/Blender 通道的战略地位类似。

## 逐版本工具时间表（2026-09-02 二次考古；主源=SU 官方论坛社区整理帖 + Macworld 当年评测 + SketchUcation）

- **1.0（2000-08）**：老用户口径「**version 1 就有了大部分工具**」——核心原子日一到位。
  由后续版本的「新增」反推 1.0 **没有**的：autofold、剖切面、平滑曲线渲染、标注、场景页、
  切线类推断、方向锁、Follow Me、Intersect、sandbox、Ruby、实体布尔。
  即 1.0 ≈ 画线/矩形/圆/弧、橡皮、移动/旋转/缩放、**push/pull**、卷尺、油漆桶、选择、
  轨道相机 + 基础 inference（推断项 1.0 版所列不全，此行为反推，标注存疑）。
  **1.0 的全部设计与编码 = Joe Esch 一人**（SketchUcation 老人证词）。
- **2.0（2002）**：剖切面（Cutting Plane）、**autofold（！2 年后才有）**、component 与对齐选项、
  首个 Mac 版、3DS 导出、位图导入。
- **3.0（2003）**：曲线平滑渲染、柔化线工具、透明材质、标注/尺寸工具、**inference 增强
  （切线与等距识别）**、场景（当时叫 pages）、EPS/PDF/VRML 导出。
- **4.0（2004）**：**Follow Me**、**Intersect（首个类布尔）**、sandbox 地形工具、贴图投影、
  face-me 组件、**inference 方向锁（箭头键锁轴）**、**Ruby 脚本**。
- **5（2005）**：性能 ×2、walk 碰撞、**pp 的 Ctrl 修饰**（复制拉伸）、Outliner、Google Earth 扩展。
- **6（2007）**：LayOut、Photo Match、3D 文字、Styles、3D Warehouse。
- **7（2008）/7.1（2009）**：动态组件、报表、新 3D 引擎、Collada/KMZ。
- **8（2011）**：**实体概念+布尔运算——发布十一年后才有 solid**。
- （存疑：sandbox 另有来源称 v6 引入；以论坛整理帖 v4 为主、标注冲突。）

## 对 CatsUp 的参考结论（user：参考价值极高）

1. **立宪核=1.0 全量**：draw/erase/move/pp/基础 inference 日一到位——和我们「pull 之后皆 feature」
   的立宪审视互为印证。**我们现在的内核 ≈ SU 1.0~2.0 区间**（autofold 我们已有=SU v2 项）。
2. **feature 是按年长的**：切线推断 3 年、Follow Me/Intersect/方向锁 4 年、布尔 11 年——
   0.3 壳的工具清单参考系=1.0 集合（补圆/弧/旋转/缩放/卷尺即齐），别被今日全量吓到。
3. **inference 也是逐版进化的**（1.0 基础集→3.0 切线→4.0 锁）——我们 snap 体系 parked 分级推进
   与史实同构。

## 来源

- <https://en.wikipedia.org/wiki/SketchUp> · <https://mastersketchup.com/history-of-sketchup/>
- <https://blog.cadsoftwaredirect.com/history-of-sketchup/> · <https://www.iqt.org/library/google-acquires-last-software>
- 专利原文：<https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/6628279>
- 逐版本表：<https://forums.sketchup.com/t/sketchup-features-by-version/128615>（社区整理）
- SketchUp 4 当年评测：<https://www.macworld.com/article/171266/sketchup-5.html>
- 1.0 单人编码证词：<https://community.sketchucation.com/topic/144643/atlast-sketchup-1-0>

# 0.3 app 壳纪元开工落地（2026-09-06）

> as-of v0.3.0 / 2026-09-06 · created by Claude Fable 5.1
> user 当日口径：「今天的目标是 dev 上线。离开 lab 变成一个 prototypical 但是正经的东西。先做无地骑士，无 store 无导入导出（现在定文件格式还太早），去掉那些很 lab 的东西，好好做 ui，可以留一个 gltf 或者 obj 的 io 逃生口」；
> win condition：①「我想看 app 的时候可以直接公网，不用求你起服务器」②「没事可以开始画几笔了（也许需要开始考虑 iPad as first class citizen）」；
> 追加：「多用 weebpaint 正在孵化的 ui 控件…共同出一个 internal 模块」「做 perspective camera 吧，然后所有的面同一层灰色。好看一点。以及线之间的 z fighting 和有时候有些线看不见…现在需要好好处理…可以开始做 workbench(blender renderer) 雏形。以及 expect rapid refactor」。

## 1. 落了什么

| 件 | 位置 | 说明 |
|---|---|---|
| 正式 app 入口 | `index.html` + `styles.css` + `src/app/main.ts` | 顶栏（菜单/撤销重做/删除选区/缩放到全部/视图）+ 左侧工具条六件（选择/画线/矩形/移动/推拉/橡皮，44px 触控级）+ 状态行（提示 + 版本水印）+ 帮助 sheet |
| 手势状态机 | `src/editor/editor.ts` | **从 lab main.ts 原样搬入**（点两下/充能制/磁滞/WYSIWYG 预演/pp 双通道/连画出膜停，一字未动），DOM 经 `EditorHost` 回调 |
| 指针路由 | `src/app/gestures.ts` | mouse 左=工具、中右=环绕/Shift 平移、滚轮朝光标缩放；pen=工具（悬停吸附预告）；touch 单指=环绕、双指=平移+捏合、双指轻点=撤销、三指=重做、单指轻点=取消；见过 pen 后手指永久降级为相机（=手掌拒绝，WeebPaint 教义）；菜单「手指也能画」开关 |
| 透视相机 | `src/editor/camera.ts` | `projection: "ortho"｜"persp"`，默认 ortho（测试/探针数值不变），app 开 persp；`zoomAt` 朝光标缩放两制同式；`viewDirAt(p)` 给遮挡（solver 两处已改 per-point）；`setView`/`fitPoints` |
| Workbench 雏形 | `src/editor/render3.ts` | 统一灰、不透明、**相机系 key light 手算平光**（three r155+ 物理光强下 Lambert 一片黑，手算可预测）；边=three addons **粗线**（`src/vendor/three/addons/lines/`，1.6 CSS px，DPR 无关）；**面 polygonOffset +1/+1、线 −1/−2** = z-fight 结构性修法；正交/透视两台 three 相机按 `cam.projection` 切；顶点点不再常显 |
| OBJ 逃生口 | `src/editor/obj-io.ts` | 导出：无洞面 n-gon、带洞面注入 earcut（`faceTriangles` 出自 render3，three 不出该文件）、裸边 `l`；导入：多边形边→`addEdges`（面靠内核长回来），>3000 边拒收；文件边界 Z-up↔Y-up 互换 |
| UI 替身 | `src/app/ui/{popup-menu,notice,icon}.ts` | 签名照抄 WeebPaint `src/ui/`；已向 WeebPaint agent 提 `@internal/ui` 抽包提案（对方同意 API 形状、立户由其 escalate 给 user），包出来换 import |
| PWA 壳 | `service-worker.js` / `manifest.webmanifest` / `src/app/pwa-shell.ts` / `src/version.ts` / `bump.sh` / icons | 抄 WebXiaoHeiWu（`xiaoheiwu-`→`catsup-` 三处），dev=network-first、prod=cache-first；4 路更新检测→toast「刷新」；菜单「强制更新」=清缓存重启 |
| 构建 | `scripts/build.sh` | tsc 门 + 四道 lint（experiments 隔离 / 对齐引擎无旧鬼 / three 只在 render3 / sprite 内联对账）+ esbuild → `dist/catsup-<hash>.mjs` + sed index.html；**dist 进 git** |
| 部署 | `.github/workflows/deploy.yml`（+ 过渡期 `scripts/push-dist.sh`） | **公开工坊道**（user 同日改口：「上线就是和 weebpaint 一样，源码和 ai docs 应该也有」；此前误走 site 仓道、`catsup-site` 作废 user 手删）：源仓公开于 `fangzhangmnm/catsup`；deploy.yml 抄 WXHW（main→/dev/，prod→/，无 prod 时根占位页），落地等本机 gh `workflow` scope；过渡期 push-dist.sh 拼 `gh-pages` 分支。dev → https://fangzhangmnm.github.io/catsup/dev/ |
| 自测 | `scripts/probe-boot.mjs` | headless（借 WeebPaint playwright）：开机无错 → 矩形 1 面 → 推拉 6 面 → 菜单开合 → 撤销回 1 面 + 截图 |
| 测试 | `test/camera-persp.test.ts` `test/obj-io.test.ts` | 146 绿（+12） |
| 图标 | `assets/icons.svg`（27 枚）| `push-pull` = fable 自画进图标库 **PENDING 待过目层**（TODO.md 已登记） |

退役：`src/lab/`、`src/playground/` 两个入口整目录删除（深模块 camera/pick/solver/tools/render3/journal/presets 迁 `src/editor/`）；lab 面板变成菜单「实验台」抽屉。`tools/probe-*.mts` 是 gitignored 本地件，import 路径已 sed 到 `src/editor/`。

## 2. 上次的 bug 尾巴盘点（user 问「推了之后的各种退化」）

按 commit 史与 grill 单核对，pp 侧 v0.2.17–0.2.26 已收的：抖动三修 / 1-D 遮挡区间 / 不动点铁律 / 双通道 / 尖刺守卫 / 扰动相 / 开区间样本。**仍开着的**：
- **湮灭疑案六变体**：commit 层全对，等 user 精确复现（grill 单 §v3.1 附近）。
- **悬置判据**（⊥邻面伸缩 vs 留守，盒墙 vs 铰链地板）：等 SU 实验。
- **F4 park**、**多选 pull park**、**VCB 数值输入 park**、**pp「挡」(Offset-limited) 未做**（backlog 索引）。
- 本轮新增未验：透视下 `occludedSpansOnLine` 取线段中点视向作常向量（近似，正交精确）；粗线 polygonOffset 数值 (−1/−2) 只在 headless 截图验过，真机 iPad 未验。

## 3. 没做 / 待 user

- **源仓公开**（真史 + ai-docs，公开工坊道）；隐私分拣：journals 从未入史、作者邮箱与 WeebPaint 公仓同、无密钥/绝对路径；ai-docs 含大量 user 原话（工坊道本意，user 知情）。
- prod 道未推（无 prod）；push prod 时再抄 WeebPaint `kick-pages.sh`（去重坑只在 workflow 道存在，classic Pages 从分支服务不需要）。
- `@internal/ui` 立户等 user 拍板；立户前三件替身各 ~80 行，别在里面长功能。
- 持久化：零，刷新即丢。**user 2026-09-06 拍板：「数据结构都没定持久化个屁」「宣发前不用考虑 backward compatibility」「把 sketchup 1.0 做完之后，component group 摸清楚之后再定，这个我有想法，你不要擅自做决定」**——持久化/文件格式归 user，AI 不提案不预留。
- 公仓命名：user 拍板 **`catsup`**（「site 是错语义。weebpaint-site 可能是站点的营销推广网站，weebpaint 是 the app」）；AI 原先留名给源仓的理由作废——毕业时同名替换即可。旧 `catsup-site` user 手删。
- 远景剧透与黄金格式判断另立 `ai-docs/20260906-far-horizon-golden-format-and-ontology.md`。
- UI 控件抽包：user 拍板抽，**包名不许叫 `ui`**（之前 scope bleeding 的教训）；**定名 `@internal/workbench-elements`（user 同意）；由 CatsUp session 抽**（user：「第二个用户第三个用户才长抽象，所以你来更适合。不过确实不急今天」）。起手形状=兄弟目录 `20260906 internal-workbench-elements`、tgz 走 vendor-pkgs + pull-package.sh、测试期 0.0.0、源 WET 拷 WeebPaint `src/ui/{popup-menu,anchored-popup,notice,icon}.ts` 不改语义、顶栏下缘 getter 注入、sprite 归宿主、CSS 进包而 --z-*/--ink 等 token 由宿主 :root 提供；发版后 WeebPaint session 收货换 import。WeebPaint agent 钉子：签名以 WeebPaint `api/src/ui/{popup-menu,anchored-popup,notice,icon}.d.ts`（v0.13.15）为准、别参照更早的；包仓测试覆盖「anchored-popup 钳视口 + 顶栏下缘 getter」，收货日它跑 `tools/probes/{context-toolbar,verb-toolbar,pick-once}.mjs` 做回归门。**未开工。**
- iPad 真机：手掌拒绝 / Pencil hover / 双指手势 / 安全区 只按 WeebPaint 教义写，未真机验。
- Blender 往返单位：OBJ 按世界单位原样写（1 单位 = 1 m 进 Blender）；VCB 立项时再定尺度。

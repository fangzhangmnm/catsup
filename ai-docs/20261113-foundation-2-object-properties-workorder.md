# 筑基第二步：物体属性的制度（施工单）

> created 2026-11-13 by Claude Fable 5.2（统筹；读了代码，没跑）
> as-of 分支 `objects-wave1` 27f9bd52 / 2026-11-13
> 上位文档：[物体数据登记册](20261113-object-data-registry.md)（规矩、登记表、user 的原话都在那里；这一页只写怎么做）。前一张：[筑基第一步](20261113-foundation-1-brep-attributes-workorder.md)。

## 一、做完是什么样

- 物体（定义）上除了头（身份、名字、种类、子物体）和几何，只有一个装物体属性的容器。对称设置、默认平滑、材质槽表、贴图坐标的表、参考线、坐标架都住在里面。身体上只剩几何。
- 全仓读写它们只有一个入口。程序里有一张登记表，每种物体属性一行。
- 换种类不碰物体属性：新种类用不上的留着、不起作用，转回来还在。
- 文件里一个定义 = 头 + `props` + 这个种类的几何。`props` 照登记表从头列到尾写，不一个字段一个字段手写。
- 不认识的、读不懂的物体属性是看得见的一项：物体窗口里列出来、灰着、能删。
- 物体窗口多一块「物体属性」：有哪些、是什么值或多大。只看和删。

## 二、现状（统筹读的，没跑）

| 数据 | 现在住在哪 | 谁在写 | 撤销靠什么 |
|---|---|---|---|
| 坐标架 | `Definition.frame`（`Scene.frameOf` / `setFrame`） | 指令 `setDrawFrame`、换原点、读文件 | 骨架 |
| 对称设置 | `Scene.meshMirrors`（场景上按定义记的表） | 指令 `setMeshMirror`；`castDefinition` 离开网格体时删 | 骨架 |
| 默认平滑 | `MeshKernel.smoothDefault`（内核上的字段；`clone` / `swapWith` 带着它） | 指令 `meshSmoothDefault`；`edge-smooth.ts` 第 77 行；`tri-soup.ts` 导入；`mesh-doc.ts` 读文件；分离物体时照抄 | 网格内核整表互换 |
| 材质槽表 | 三种身体各一份 `materialSlots: number[]`，值是材质表的**下标**（−1 = 空，−2 = 内置背面） | `Scene.slotFor` 原地 push；`purgeMaterials` 同一步把所有槽表的下标重排 | 骨架 |
| 贴图坐标的表 | `MeshBody.uvSetSlots: Guid[]`，值是排法的**身份** | `scene/uv.ts` 的 `placeFace`、`mergeUvSlots` 原地改 | 骨架 |
| 参考线 | `BrepBody.guides`（根池的）；组的在 `Group.guides` | 指令 `addGuide` / `eraseGuides` / `clearGuides`，原地改 | 骨架（`cloneGuides`） |
| 不认识的键 | 文件里定义的 `extras` | — | — |

- 几何级的指令（硬表面池的差量、网格内核的互换）也同时记一份骨架（`history.ts` 第 245、253 行），所以搬进容器之后，任何指令里顺带改物体属性都撤得回。
- 两张对照表的合并和重新对号各写了一套：材质槽在 `ops.ts` 第 572、892、1123、1246 行附近和 `transfer.ts`、`scene.ts` 的 `snapshotLayerPayload` / `remapSnapshotMaterial`；贴图坐标在 `scene/uv.ts` 的 `mergeUvSlots` / `remapUvCode`。
- 一处老毛病，记一行、不单独修：读文件时每个定义的 `extras` 都读进来，存盘时只有打开时的那个根的写回去（`scene-doc.ts` 第 177–180 行），别的定义的不写。现在没有哪个版本往里面写东西。第 5 刀之后这个口袋没有了。

## 三、设计

### 3.1 两个模块

- `src/props/` = 框架。不认识任何一种具体的物体属性，不 import `scene/`、`mesh/`、`kernel/` 里具体的东西。和第一步的 `src/attr/` 是一对；字段的类型词用 `src/attr/` 的那一套。
- `src/scene/props/` = 登记表。每种物体属性一个文件，`index.ts` 把它们列成一张表。
- `src/mesh/`、`src/kernel/` 不 import 这两个文件夹（内核不认识物体属性）。
- 给人看的名字不在声明里，在 `src/app/prop-names.ts`（和图元属性的名字表同一个做法）。

### 3.2 声明（提案的接口，pin 住；实现中形状变了回写这里）

```ts
// src/props/decl.ts
/** 定长记录里的一个字段。只有数；枚举 = 小整数 + 名字表。 */
export interface PropField { readonly name: string; readonly type: "f64" | "i32" | "u8"; readonly count: number; readonly names?: readonly string[] }

export interface PropDecl<T> {
  readonly id: string;                      // 类型名 = 文件里的键，全仓唯一（规矩第 10 条：一个意思只登记一次）
  readonly host: "definition" | "instance"; // 挂在定义上，还是只管这一份摆放
  readonly shape: "record" | "blob";        // 定长记录（C struct）／不定长的一块
  readonly usedBy: readonly BodyKind[];     // 哪几个种类用得上；别的种类上留着、不起作用
  readonly removable: boolean;              // 面板上能不能手动删
  readonly dflt: T;                         // 缺 = 它（冻结的；可以是 null，意思是「没有这一项」）
  equals(a: T, b: T): boolean;
  check?(v: T): string | null;              // 不合法 → 原因（英文）；指令那一步抛
  toFile(v: T): unknown;                    // JSON，名字和程序里一样；枚举写名字不写编号
  fromFile(j: unknown): T;                  // 读不懂 = 抛，门口接住，变成「读不懂的一项」
  // shape = "record" 才有：
  readonly fields?: readonly PropField[];
  pack?(v: T): number[];
  unpack?(n: readonly number[]): T;
  // 是对照表才有：
  readonly table?: { readonly column: string; readonly on: Domain };   // 它的代号列（规矩第 4 条）
  readonly columns?: readonly string[];     // 它按名字引用的别的图元属性
  refs?(v: T): Iterable<Guid>;              // 它引用的文件里别的条目（身份层的图靠它）
  // host = "instance" 才有：
  readonly field?: string;                  // 存法 = Instance 上的同名字段（3.9）
}
```

- 值一律不可变：改 = 换一个对象。克隆、撤销、预演的影子都是把容器浅拷一份。
- 定长记录今天在内存里还是一个普通对象；`fields` / `pack` / `unpack` 是给以后搬进跨物体大数组留的口子（登记册第五¼节，user 同意的四个口子）。守卫：`unpack(pack(v))` 等于 `v`，长度等于 `fields` 加起来。
- 「定长的只放数」说的是 `pack` 出来的那一份。文件里枚举写名字（`"mode": "force"`），不写编号——文件要自己说得清意思。这一条是统筹对口子第 2 条的细化，文件新格式定稿时一起给 user 看。

### 3.3 容器和唯一的入口

```ts
// Definition 上：props: Map<string, unknown>（认识的 = 值；不认识的 / 读不懂的 = RawProp）
// src/props/access.ts —— 全仓只有这个文件碰 Definition.props
export function getProp<T>(s: Scene, def: DefId, d: PropDecl<T>): T;          // 起作用的值：物体上有、而且这个种类用得上 → 它；否则默认
export function storedProp<T>(s: Scene, def: DefId, d: PropDecl<T>): T | undefined;   // 物体上存着的，不管用不用得上（面板、文件用）
export function setProp<T>(s: Scene, def: DefId, d: PropDecl<T>, v: T | null): void;  // null 或等于默认 = 删；check 不过 = 抛
export function removeProp(s: Scene, def: DefId, id: string): void;           // 按名字删（不认识的也能删）
export function eachProp<T>(s: Scene, d: PropDecl<T>): Iterable<readonly [DefId, T]>; // 所有带这一项的物体（成批的口子）
export function listProps(s: Scene, def: DefId): readonly PropEntry[];        // 认识的照登记表的顺序，后面是不认识的
export type PropEntry =
  | { readonly id: string; readonly decl: PropDecl<unknown>; readonly value: unknown; readonly active: boolean }
  | { readonly id: string; readonly decl: null; readonly raw: CarriedJson; readonly why: "unknown" | "unreadable"; readonly detail?: string };
```

- 「起不起作用」只在 `getProp` 里判一次（登记表里这一项 × 这个种类）。干活的代码一律用 `getProp`，不用自己问种类。
- 等于默认的不存（规矩第 7 条）。`setFrame` 里「恒等 = 缺」那段逻辑由这里接手，`Scene.setFrame` 删掉。
- 热路径先把值拿在手里再循环（规矩第 11 条）。例：按面找材质，先把这个物体的槽表解成 `(Material | null)[]`，再走面。
- `Scene.frameOf`、`Scene.slotFor`、`Scene.materialOfSlot`、`Scene.guidesOf` 可以留着当薄壳（里面只调上面这几个函数），调用的地方少改。不许再有别的路摸到这些数据。

### 3.4 对照表的共用模块

```ts
// src/props/table.ts
export type Table<R> = readonly (R | null)[];                       // 第几行 = 代号几；null = 这一行空着（占位，不压紧）
export function codeFor<R>(t: Table<R>, row: R, same: (a: R, b: R) => boolean): { table: Table<R>; code: number };   // 找代号，没有就在末尾开一行
export function mergeTable<R>(target: Table<R>, source: Table<R>, used: Iterable<number>, same: (a: R, b: R) => boolean): { table: Table<R>; remap: (code: number) => number };   // 只并 used 里的行
export function unusedRows<R>(t: Table<R>, usedCodes: ReadonlySet<number>): number[];   // 给以后的清理窗口；这一步只做函数和测试
export function dropRows<R>(t: Table<R>, rows: ReadonlySet<number>): { table: Table<R>; remap: (code: number) => number };   // 删行并压紧；调用的人同一步把代号列重新对上
```

- 把一列代号照 `remap` 重新对上，走第一步的 `AttributeHost`，两个内核同一份代码。
- 第二节列的那两套合并和对号全部换成这一份，旧函数删掉。
- 分离物体、跨物体粘贴、炸开、合并是同一条路：`mergeTable` 只并搬过去的图元用到的行。所以分离出来的物体的表里只有它用到的行（第 1 版记账的「槽表不裁」在这里了结），不另做「裁表」的动词。

### 3.5 六项各自怎么搬

| 类型名 | 形状 | 用得上的种类 | 值 | 默认 | 要点 |
|---|---|---|---|---|---|
| `frame` | 定长：原点和三根轴，12 个 f64 | 三种 | `Frame` | 世界帧 | 从 `Definition.frame` 搬进容器；`document.axes` 不再有，根的坐标架就是根这个物体的 `frame` |
| `mirror` | 定长：`mode`（edit / force）、`axis`（x / y / z） | 网格体 | `MirrorSetting \| null` | `null` = 没开 | `Scene.meshMirrors` 删掉；`castDefinition` 里那句删对称的拿掉 |
| `smooth_default` | 定长：`mode`（angle / smooth / hard）、`deg` | 网格体 | `SmoothDefault` | 全是棱、30° | **离开内核**：`MeshKernel.smoothDefault` / `setSmoothDefault` 删掉，`clone` / `swapWith` 不再带它；`edge-smooth.ts` 里读它的函数改成把它当参数传进来；显示那一层认它变了的办法见下 |
| `material_slots` | 对照表，代号列 = `material_index` | 硬表面、网格体 | `Table<Guid>` | 空表 | **值从下标改成材质的身份**（内置背面 = `BUILTIN_BACK_GUID`，空 = null）；`purgeMaterials` 不再重排下标，改成同一步把各表里指着被删材质的行置成 null（行不删，代号不动）；`Scene` 上配一张身份 → 材质的索引 |
| `uv_set_slots` | 对照表，代号列 = `uv-set`（连带角上的 `uv-at`） | 网格体 | `Table<Guid>` | 空表 | 第一步里贴图坐标的列转硬表面时还是丢，所以这张表在那一下跟着它的列一起丢、照旧报数（规矩第 4 条：表和它的列一起生一起删）。收口放开列的时候把硬表面加进「用得上」 |
| `guides` | 不定长 | 硬表面 | `Guides`（不可变） | 空 | 只搬根池的那一份；组的留在组上（组等硬表面归一那一轮）。`addGuideLine` 这些原地改的函数改成返回新的一份 |

- 默认平滑离开内核之后，「改了它 = 这个物体的显示法向全部重算」要照旧成立。做法：显示那一层给每个定义算的签名里加上它（和槽表的签名同一处，`stream-provider.ts` 的 `slotsSig` 附近）；内核的改动日志不再为它记。`meshViewOf` 这类从内核派生显示数据的函数，把默认平滑当输入。
- 往内核里设默认平滑的三处（导入、`edge-smooth.ts` 第 77 行、硬表面转网格体）改成把值交给调用的人，由指令那一层 `setProp`。
- 身体变成：`BrepBody = { kind, kernel, groups, nextGroup }`、`MeshBody = { kind, kernel }`、`EmptyBody = { kind }`。

### 3.6 指令和撤销

- 新指令一条：`{ op: "setProp"; def; prop: string; value: unknown | null }`。`value` 是文件里的那种写法（`toFile` 的结果），落的时候 `fromFile` → `check` → `setProp`；`null` = 删。骨架级。
- 物体的种类用不上这一项时，`setProp` 指令只许删、不许设（登记册第八节第 4 条的提案：灰着的只能看和删）。
- 退役：`setMeshMirror`、`meshSmoothDefault`、`setDrawFrame` 里管定义的那一半。组的坐标架照旧。
- 「开强行对称 = 设置 + 马上对称一次、同一步撤销」照旧是编辑器那一层把两条指令放进同一步。
- 参考线的三条指令、开槽、贴图坐标占位这些「读出来、改、写回去」的，留着各自的指令，里面改走 `getProp` / `setProp`。
- 修改锁：`setProp` 算改内容。三条旧指令在锁的那张表里原来是哪一类，开工前核（第五节第 3 条）；不一样就停下来报。

### 3.7 换种类

- `castBody` 只换算几何和它的图元属性，不再收、也不再交出槽表、贴图坐标的表、参考线；`opts.mirrored` 拿掉。
- 损失清单里拿掉：对称、默认平滑、材质槽表、根池的参考线。留着：组里的参考线（跟着组一起没的，数照旧报）、贴图坐标（这一步还丢）。
- 唯一一处明着写：硬表面 → 网格体，物体上没有 `smooth_default` 时写成「按角度 30°」（新建网格体的默认是全是棱，从硬表面转过来该是按角度；登记册第五节第 9 条）。已经有的不动。
- 转空物体：物体属性全留着。

### 3.8 文件

- 一个定义 = 头（`guid`、`name`、`kind`、`instances`）+ `props`（一个对象：键 = 类型名，值 = `toFile` 的结果；不认识的原样）+ 这个种类的几何载荷。
- 写：`listProps` 从头列到尾。读：每个键查登记表——认识的 `fromFile`；抛了的变成「读不懂的一项」，原样留着、记下原因；不认识的原样留着。读的门口不补默认、不改写。
- 从旧位置拿走：定义上的 `materialSlots`、`guides`、`drawFrame`、`extras`；网格载荷里的 `mirror`、`smoothDefault`、贴图坐标里速查表那一半（两列还在原处）；`CATSUP_document.axes`。
- 不认识的一项里引用的二进制块，照现在 `carry.ts` 的办法跟着走，这一步不动那个机制。
- 身份层（`scene-store.ts`、`entry-kinds.ts`、`entry-canon.ts`）问「这个定义引用了哪些材质、排法」改走声明的 `refs`；比较两份定义内容一不一样时 `props` 算内容。
- 刀 0 那个转换函数（第一步的）同一个提交跟上：老文件的那几个旧键 → `props`；老文件 `extras` 里的每个键 → 一项不认识的物体属性。
- 摆放那几个键（`matrix`、`name`、`locked`、`layer`、`hidden`）这一步不改名；定义头上多余的 `axes`（恒等）和 `nodes`（空）也先不动。都留给文件新格式定稿。

### 3.9 摆放上的

`xform`、`name`、`locked`、`hidden`、`layer` 登记进表（`host: "instance"`，存法 = 同名字段）。这一步只做三件：登记；进字段清单的守卫；写只走一个函数、`Instance` 的字面量只在 `scene.ts` 里造、拷贝只走一个函数。读照旧读接口上的属性——以后换存法时把 `Instance` 做成视图，读的人不用改。写的地方超过四十处先报数，不硬做。

### 3.10 面板

物体窗口加「物体属性」一块，排在图元那一块后面：

- 一项一行：名字、一句话的值（定长的列出字段和值；表写几行、几行在用；别的写多大）。这个种类用不上的灰着。
- 能删的行尾有删（走 `setProp` 指令）。对照表这一步不给删（它的代号列还在用）；定长的删 = 回到默认；参考线删 = 清空。
- 不认识的、读不懂的：名字用文件里的键，写明「不认识」或「读不懂」和原因、多大，能删。
- 只看和删，不做逐项改的界面。对称、默认平滑现在那几行能改的字段照旧在原处，只是读写改走新入口。
- 窗口不认识具体的物体属性：`object-window.ts` 里不出现具体的类型名（照 `kind-pages` 那条守卫的做法）。

### 3.11 守卫

1. **字段清单**：对一份什么都填了的样本，`Scene`、`Definition`、`Instance`、三种身体、`Kernel`、`MeshKernel` 各自有哪些字段，逐个落到：头／几何／图元属性的列／登记了的物体属性／派生的索引和改动日志／白名单。白名单每一条写退场条件（`groups`、`nextGroup`、组上的 `axes` 和 `guides` → 硬表面归一；场景上的材质表、贴图表、排法表、层、素材架 → 文档层，不归这套）。多一个没分类的字段 = 红。
2. **源码**：`.props` 只在 `src/props/` 和 `scene.ts` 的两处克隆里出现；3.1 的 import 方向。
3. **文件**：一个定义写出去，头的键就是那几个；`props` 的键都在登记表里或者是这个物体带着的不认识的；几何载荷里不出现任何一项的旧键。每一项写出去再读回来相等。
4. **换种类**：能转的每一对种类，转过去再转回来，`listProps` 逐项相等（`uv_set_slots` 除外，它这一步跟着列丢、有数）。转过去之后用不上的那些 `active` 是假、`getProp` 给的是默认。
5. **存盘重开**：硬表面物体带着对称设置（灰着的）存盘重开还在。
6. 登记表每个类型名在 `prop-names.ts` 有名字。

## 四、刀

每刀一个或几个提交，在筑基的分支上，不推开发版。每刀报四个数。

| 刀 | 做什么 | 验收 | 等不等第一步 |
|---|---|---|---|
| 1 | 框架：`src/props/`（声明、容器、入口、定长的打包、对照表模块）；`Definition.props` 和两处克隆。还没有任何一项搬进来 | 新模块的单元测试；现有测试全绿；写出来的文件逐字节不变 | 不等 |
| 2 | 文件的管道：读写 `props`；不认识的和读不懂的一项；老 `extras` 进来；转换函数；守卫 3 的架子 | 一个带着不认识的物体属性的文件（每个定义各一项、其中一项引用二进制块）读进来存出去，一项不少、引用的二进制块内容相同；再读再存一遍，和上一遍逐字节相同 | 不等 |
| 3 | 定长的三项：`frame`、`mirror`、`smooth_default`；`setProp` 指令，三条旧指令退役；默认平滑离开内核；换种类不再碰它们 | 守卫 4、5；改默认平滑之后显示的法向照旧全部重算（现成的探针）；撤销每一项回得去 | 不等 |
| 4 | 参考线 | 现成的参考线测试全绿；转网格体再转回来参考线还在 | 不等 |
| 5 | 两张对照表：值改成身份、搬家、合并和对号改走共用模块、分离走合并 | 现成的粘贴、炸开、合并、分离、清理材质测试全绿；分离出来的物体的表里只有用到的行；全仓不再有 `mergeUvSlots`、`remapUvCode`、`remapSnapshotMaterial` 和槽表的手写重排 | 等第一步的刀 2（硬表面的列） |
| 6 | 面板那一块；字段清单的守卫；摆放上的登记 | 守卫 1、2、6；无头截图一张（一个带着灰着的对称设置和一项不认识的物体属性的硬表面物体） | 不等 |

刀 1 到 4、刀 6 不依赖第一步，也不依赖 user 还没定的那几件（内核和表谁是真相、图元属性挂在哪、一个物体几份几何）。第一步在等的时候可以先做它们。

## 五、开工前先核（一条消息报统筹；和上面写的不一样，统筹改设计）

1. 显示那一层现在靠什么知道默认平滑变了（内核的改动日志，还是别的）；`slotsSig` 是不是每个定义一份、默认平滑加进去合不合适。
2. `setAxes` 和 `setDrawFrame` 现在各管什么（定义、组、根各走哪条）。
3. `setMeshMirror`、`meshSmoothDefault`、`setDrawFrame` 在修改锁的那张表里各是哪一类。
4. 材质槽表的值从下标改成身份，要改的地方列个数（指令里的 `material: number` 这一层不动，只动表里存的值）；按面找材质的热路径有哪几处。
5. 直接给 `Instance` 的字段赋值的地方、造 `Instance` 字面量的地方各有多少。
6. 预演的影子（`shadowOf`）里有没有原地改槽表、参考线的路——值改成不可变之后那些地方要换成 `setProp`。

## 六、不在这一步

- 硬表面的组落成「一项物体属性 + 一列代号」（等硬表面归一）。
- 清理窗口（登记册第六½节）和它的三个新来源；孤儿列的显示和删除（收口）。
- 贴图坐标的列和表转硬表面时照带（收口）。
- 跨物体的大数组、内存排布（今天不做）。
- 文档层的东西（材质表、贴图、排法表、素材架、桌面状态）的口袋（愿望单）。
- 文件新格式的定稿和转换的对话框（筑基收尾，user 点头）。

## 七、停下来问统筹的

- 有一样数据放不进「头／几何／图元属性／物体属性」任何一格。
- 想给框架加第二个读写入口，或者想让内核读物体属性。
- 修改锁的分类和原来不一样；撤销有一项回不去。
- 材质槽表改成身份牵出指令那一层的句柄也要动。
- 文件里想偏离「头 + `props` + 几何」。

别的顾虑记在这一页末尾，这一步做完一起看。

## 施工记录

（小弟每刀做完在这里记：提交、四个数、和这一页不一样的地方。）

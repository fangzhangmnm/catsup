#!/usr/bin/env python3
# 抄自 WebXiaoHeiWu tools/inline-sprites.py（Claude Fable 5.1 2026-09-03）；进 CatsUp 2026-09-06 by Claude Fable 5.1
"""把 assets/icons.svg 贴进 index.html 的标记区。就这一件事。

为什么内联而不是 <use href="assets/icons.svg#id">：
  file:// 下外部 use 被跨域规则挡死（PWA 要能当裸静态页打开）。且内联零 JS、零请求。

为什么要脚本而不是手贴：
  手贴一次之后，改了 assets/icons.svg 就得记得再贴一遍，没有任何机制会提醒。
  这个脚本让「重新贴」变成一条命令，--check 让「忘了贴」变成一个非零退出码。

assets/icons.svg 由 extract-icons.py 从共享库（20260708 SVG Icons）提取（见该文件头部注释）。
本脚本不认识上游共享库，也不做子集挑选——那是改图标时的手工步骤。

本地补丁（stopgap 自愈机制）：assets/icons-local.svg 若存在，其 symbol 会被并进内联区——
但 assets/icons.svg 里已有同名 symbol 的**自动让位**（打印提示，可据此从补丁里删掉该条）。
即：库里画好真图标 → 重跑 extract + 本脚本 → stopgap 字形自动被真图标顶掉，宿主 <use> 一字不改。

用法：
  python3 scripts/inline-sprites.py            # 贴
  python3 scripts/inline-sprites.py --check    # 只检查是否最新，不写文件
"""

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
HTML = ROOT / "index.html"
SPRITE = ROOT / "assets" / "icons.svg"
LOCAL = ROOT / "assets" / "icons-local.svg"

BEGIN = "<!-- ICON-SPRITE:BEGIN — 由 scripts/inline-sprites.py 生成，勿手改 -->"
END = "<!-- ICON-SPRITE:END -->"


def main() -> int:
    sprite = SPRITE.read_text(encoding="utf-8").strip()
    if LOCAL.exists():
        # id 可能不在 <symbol 后第一个属性（extract-icons 的 data-missing 占位是 <symbol data-missing="1" id=…>）；
        # 占位不算「主库已有」——stopgap 必须顶掉它，否则 <use> 按文档序取到虚线方框（审计 UI-1）。
        missing_ids = set(re.findall(r'<symbol data-missing="1"[^>]*\bid="([^"]+)"', sprite))
        main_ids = set(re.findall(r'<symbol[^>]*\bid="([^"]+)"', sprite)) - missing_ids
        patches, dropped = [], []
        for m in re.finditer(r'<symbol[^>]*\bid="([^"]+)".*?</symbol>', LOCAL.read_text(encoding="utf-8"), re.S):
            (dropped if m.group(1) in main_ids else patches).append((m.group(1), m.group(0)))
        # stopgap 顶位的 id：把主库里的 data-missing 占位剔掉（不然两个同 id 的 symbol 并存）
        for pid, _ in patches:
            if pid in missing_ids:
                sprite = re.sub(r'\s*<!--[^>]*-->\s*<symbol data-missing="1"[^>]*\bid="' + re.escape(pid) + r'".*?</symbol>', "", sprite, count=1, flags=re.S)
        for sid, _ in dropped:
            print(f"·  icons-local.svg 的 {sid} 已被库真图标顶掉（自愈）——可从补丁文件删掉该条")
        if patches:
            body = "\n".join("  " + s for _, s in patches)
            sprite = sprite.replace("</svg>", f"<!-- 本地 stopgap 补丁（assets/icons-local.svg，待真图标） -->\n{body}\n</svg>")
    html = HTML.read_text(encoding="utf-8")

    if BEGIN not in html or END not in html:
        print(f"✗ index.html 里找不到标记区，请先插入：\n  {BEGIN}\n  {END}")
        return 2

    head, rest = html.split(BEGIN, 1)
    _, tail = rest.split(END, 1)
    new = head + BEGIN + "\n" + sprite + "\n" + END + tail
    n = sprite.count("<symbol")

    if new == html:
        print(f"✓ index.html 已是最新（{n} 个 symbol）")
    elif "--check" in sys.argv:
        print("✗ index.html 的 sprite 已陈旧，请跑 python3 scripts/inline-sprites.py")
        return 1
    else:
        HTML.write_text(new, encoding="utf-8")
        print(f"✓ index.html ← {n} 个 symbol")
    return 0


if __name__ == "__main__":
    sys.exit(main())

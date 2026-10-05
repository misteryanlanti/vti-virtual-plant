# -*- coding: utf-8 -*-
"""
把 06_三维虚拟工厂Web版 打包成一个自包含的单文件 HTML。
所有 <script src="..."> 内联为 <script>...</script>，
双击即可用浏览器打开（file:// 协议），无需启动本地服务器。
"""
import os
import re
import io

BASE = os.path.dirname(os.path.abspath(__file__))
SRC_HTML = os.path.join(BASE, "index.html")
OUT_HTML = os.path.join(BASE, "钒渣提钒虚拟工厂_单文件版.html")

# 需要内联的脚本（按 index.html 中的加载顺序）
SCRIPTS = [
    "lib/three.min.js",
    "lib/OrbitControls.js",
    "equipment_data.js",
    "instrument_data.js",
    "lib/equip_builders.js",
    "lib/pipes.js",              # 必须先于仪表：PIPE_ROUTES 供管道仪表取点
    "lib/instrument_builders.js",
    "lib/scene_env.js",
    "lib/player.js",
    "lib/hmi.js",
    "factory.js",
]

def read_text(path):
    with io.open(path, "r", encoding="utf-8", errors="strict") as f:
        return f.read()

def main():
    html = read_text(SRC_HTML)

    total_inline = 0
    missing = []

    for rel in SCRIPTS:
        p = os.path.join(BASE, rel)
        if not os.path.isfile(p):
            missing.append(rel)
            continue
        js = read_text(p)
        # 防止 JS 内部出现 </script> 提前闭合标签
        js = js.replace("</script", "<\\/script")
        total_inline += len(js.encode("utf-8"))

        # 把 <script src="rel"></script> 替换为内联块
        pattern = r'<script\s+src=["\']' + re.escape(rel) + r'["\']\s*>\s*</script>'
        replacement = ("<script>\n/* ===== 内联: %s ===== */\n" % rel) + js + "\n</script>"
        # 注意：用 lambda 返回替换串，避免 re 把 JS 里的 \w \d 等当成模板转义
        new_html, n = re.subn(pattern, lambda m, _r=replacement: _r, html)
        if n == 0:
            missing.append(rel + " (未匹配到 script 标签)")
        else:
            html = new_html

    if missing:
        print("[警告] 以下资源未内联：")
        for m in missing:
            print("   -", m)

    # 校验：不应再残留任何外部 script src 引用
    left = re.findall(r'<script\s+src=["\']([^"\']+)["\']', html)
    if left:
        print("[警告] 仍残留外部脚本引用:", left)
    else:
        print("[OK] 所有脚本已内联，无外部依赖")

    with io.open(OUT_HTML, "w", encoding="utf-8", newline="\n") as f:
        f.write(html)

    size = os.path.getsize(OUT_HTML)
    print("[完成] 输出: %s" % OUT_HTML)
    print("[完成] 体积: %.1f KB (内联脚本 %.1f KB)" % (size / 1024.0, total_inline / 1024.0))

if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
将工作目录下的 center.png 编码为 data URL，并把占位符替换到单文件 HTML 中。
用法:
  python embed_image.py --src center.png --html 天策模拟器1.0.html --out tiance_single_embedded.html

如果不指定参数，默认使用以上文件名。
"""
import base64
import argparse
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--src', default='center.png', help='要嵌入的图片文件（相对或绝对路径）')
parser.add_argument('--html', default='天策模拟器1.0.html', help='含占位符的单文件 HTML 模板')
parser.add_argument('--out', default='tiance_single_embedded.html', help='输出的嵌入后 HTML 文件')
args = parser.parse_args()

src = Path(args.src)
html = Path(args.html)
out = Path(args.out)

if not src.exists():
    print(f"错误：找不到图片文件 {src}. 请把图片保存为 {src} 后重试。")
    raise SystemExit(1)
if not html.exists():
    print(f"错误：找不到 HTML 模板文件 {html}.")
    raise SystemExit(1)

b = src.read_bytes()
enc = base64.b64encode(b).decode('ascii')
# 尝试根据后缀推断 mime type（仅支持常见 png/jpg/gif）
suffix = src.suffix.lower()
if suffix in ('.png',):
    mime = 'image/png'
elif suffix in ('.jpg', '.jpeg'):
    mime = 'image/jpeg'
elif suffix in ('.gif',):
    mime = 'image/gif'
else:
    mime = 'application/octet-stream'

data_url = f"data:{mime};base64,{enc}"

content = html.read_text(encoding='utf-8')
if '__CENTER_IMAGE_DATA_URL__' not in content:
    print('警告：模板中未找到占位符 "__CENTER_IMAGE_DATA_URL__"，将在文件末尾追加脚本变量定义。')
    content += f"\n<script>const CENTER_DATA_URL = '{data_url}';</script>\n"
else:
    content = content.replace("'__CENTER_IMAGE_DATA_URL__'", f"'{data_url}'")
    content = content.replace('__CENTER_IMAGE_DATA_URL__', data_url)

out.write_text(content, encoding='utf-8')
print(f'已生成嵌入文件：{out} （大小 {out.stat().st_size} 字节）')
print('你可以将此文件直接发送给他人，对方在浏览器中打开即可。')

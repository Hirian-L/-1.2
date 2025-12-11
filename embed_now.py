import base64
from pathlib import Path

src = Path('center.png')
html = Path('天策模拟器1.1.html')
out = Path('天策模拟器1.1_embedded.html')

if not src.exists():
    print('center.png not found')
    raise SystemExit(1)
if not html.exists():
    print('template not found')
    raise SystemExit(1)

data = src.read_bytes()
enc = base64.b64encode(data).decode('ascii')
data_url = 'data:image/png;base64,' + enc

content = html.read_text(encoding='utf-8')
if '__CENTER_IMAGE_DATA_URL__' not in content:
    print('placeholder not found in template')
    raise SystemExit(1)

content = content.replace("'__CENTER_IMAGE_DATA_URL__'", f"'{data_url}'")
content = content.replace('__CENTER_IMAGE_DATA_URL__', data_url)

out.write_text(content, encoding='utf-8')
print('wrote', out)
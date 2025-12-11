import base64
with open('center.png','rb') as f:
    b = f.read()
enc = base64.b64encode(b).decode('ascii')
with open('center_b64.txt','w',encoding='ascii') as out:
    out.write(enc)
print('wrote', len(enc), 'chars')

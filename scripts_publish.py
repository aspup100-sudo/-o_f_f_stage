# dist/index.html을 Artifact 게시용 조각으로 변환
import re, sys
s = open('dist/index.html', encoding='utf-8').read()
head = re.search(r'<head>(.*)</head>', s, re.S).group(1)
body = re.search(r'<body>(.*)</body>', s, re.S).group(1)
head = re.sub(r'<meta charset[^>]*>|<meta name="viewport"[^>]*>', '', head)
out = '<title>팝스팟 프로토타입</title>\n' + head.replace('<title>팝스팟 프로토타입</title>', '') + body
open(sys.argv[1], 'w', encoding='utf-8').write(out)

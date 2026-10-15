#!/usr/bin/env python3
"""Inline the standalone game and copied style kit into a portable review file."""
from pathlib import Path
import base64
import re

ROOT = Path(__file__).resolve().parent
GAME = ROOT
BASE = 'https://rareone0602.github.io/nottetris-web/'


def main():
    html = (GAME / 'index.html').read_text()

    def stylesheet(match):
        if match.group(1).startswith(('https:', 'http:')):
            return match.group(0)
        path = (GAME / match.group(1)).resolve()
        content = path.read_text()
        content = re.sub(r'</style', '%3C/style', content, flags=re.IGNORECASE)
        return '<style>\n' + content + '\n</style>'

    def script(match):
        content = (GAME / match.group(1)).read_text()
        return '<script>\n' + content.replace('</script', '<\\/script') + '\n</script>'

    html = re.sub(r'<link rel="stylesheet" href="([^"]+)">', stylesheet, html)
    scripts = re.findall(r'<script defer src="([^"]+)"></script>', html)
    html = re.sub(r'\s*<script defer src="[^"]+"></script>', '', html)
    inline = '\n'.join(script(re.match(r'(.*)', name)) for name in scripts)
    html = html.replace('</body>', inline + '\n</body>')
    icon = base64.b64encode((ROOT / 'site/icon.svg').read_bytes()).decode()
    html = html.replace('href="site/icon.svg"', 'href="data:image/svg+xml;base64,' + icon + '"')
    for local, remote in {
        'LICENSE-original.txt': BASE + 'LICENSE-original.txt',
        'vendor/MATTER-LICENSE.txt': 'https://github.com/liabru/matter-js/blob/0.20.0/LICENSE',
    }.items():
        html = html.replace('href="' + local + '"', 'href="' + remote + '"')
    notices = '\n\n'.join((GAME / filename).read_text() for filename in
                          ['LICENSE-original.txt', 'vendor/MATTER-LICENSE.txt'])
    html = html.replace('</html>', '<!-- Third-party licence notices\n' + notices + '\n-->\n</html>')
    destination = ROOT / 'out' / 'nottetris-preview.html'
    destination.parent.mkdir(exist_ok=True)
    destination.write_text(html)
    print(destination)


if __name__ == '__main__':
    main()
